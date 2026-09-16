"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { OCCASIONS, getOccasion } from "@/lib/occasions";
import { MUSIC_STYLES, VOCALS, getStyle, type VocalGender } from "@/lib/music-styles";
import { useDraft } from "@/lib/draft";
import { getFingerprint } from "@/lib/fingerprint";
import { WizardShell } from "./WizardShell";
import { OptionCard, PillOption } from "./OptionCard";
import { Turnstile, turnstileAtivo, type TurnstileHandle } from "@/components/Turnstile";
import { useDict } from "@/components/LocaleProvider";
import { locOccasion, locStyle, locVocal, locGroup } from "@/lib/dict";
import { fmt } from "@/lib/i18n";

/**
 * 5 passos. Era 7 — encurtamos depois de ver que o concorrente mais afiado
 * (cantiga.ia.br) faz em 4: cada passo a mais é gente desistindo no meio.
 * Fundimos "quem envia + história" e "estilo + voz".
 */
const TOTAL = 5;

/**
 * Mínimo da história. Subiu de 25 para 120: com 25 a letra saía de UMA frase
 * ("nos conhecemos na praia") e ficava genérica — a reclamação nº 1 sobre o
 * produto era exatamente essa. 120 caracteres ≈ 2–3 frases com um detalhe
 * concreto, que é o que o gerador precisa para escrever algo único.
 */
const MIN_HISTORIA = 120;

export function CriarWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const { draft, update, ready } = useDraft();
  const d = useDict();

  const [step, setStep] = useState(0);
  const [customRelationship, setCustomRelationship] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | undefined>();
  const captchaRef = useRef<TurnstileHandle>(null);
  const storyRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Ocasião pode vir da landing (?ocasiao=zoacao) — nesse caso já pulamos o passo 1.
  useEffect(() => {
    if (!ready) return;
    const fromUrl = params.get("ocasiao");
    if (fromUrl && getOccasion(fromUrl)) {
      update({ occasion: fromUrl });
      setStep((s) => (s === 0 ? 1 : s));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const occasionBase = getOccasion(draft.occasion);
  const occasion = occasionBase ? locOccasion(d, occasionBase) : undefined;

  // Estilos: os sugeridos da ocasião primeiro, o resto depois.
  const styles = useMemo(() => {
    const base = occasionBase
      ? [
          ...(occasionBase.suggestedStyles
            .map((id) => MUSIC_STYLES.find((s) => s.id === id))
            .filter(Boolean) as typeof MUSIC_STYLES),
          ...MUSIC_STYLES.filter((s) => !occasionBase.suggestedStyles.includes(s.id)),
        ]
      : MUSIC_STYLES;
    return base.map((s) => locStyle(d, s));
  }, [occasionBase, d]);

  const vocals = VOCALS.map((v) => locVocal(d, v));

  const storyLength = (draft.story || "").trim().length;

  const canAdvance = (() => {
    switch (step) {
      case 0:
        return !!draft.occasion;
      case 1:
        return !!draft.recipientName?.trim();
      case 2:
        return !!draft.senderName?.trim() && storyLength >= MIN_HISTORIA;
      case 3:
        return !!draft.styleId && !!draft.vocal;
      case 4:
        return /^\S+@\S+\.\S+$/.test(draft.email || "");
      default:
        return false;
    }
  })();

  const next = () => setStep((s) => Math.min(s + 1, TOTAL - 1));
  const back = () => (step === 0 ? router.push("/") : setStep((s) => Math.max(s - 1, 0)));

  /**
   * Dica clicável: insere um começo de frase no fim da história e devolve o
   * foco ao textarea. As dicas eram chips decorativos — a pessoa encarava um
   * textarea vazio tendo que lembrar tudo de cabeça. Assim viram um roteiro.
   */
  function usarDica(h: string) {
    const atual = (draft.story || "").replace(/\s+$/, "");
    update({ story: (atual ? atual + "\n" : "") + h + ": " });
    storyRef.current?.focus();
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);

    // Identifica o aparelho para o anti-abuso não precisar apertar no IP
    // (que é compartilhado e bloquearia cliente legítimo).
    const fingerprint = await getFingerprint().catch(() => undefined);

    // A escrita em si roda na tela da letra: ela recebe a 1ª versão em ~6s e
    // já mostra, enquanto a 2ª continua chegando pelo mesmo stream. Se
    // gerássemos aqui, a navegação cortaria a conexão no meio.
    update({
      captchaToken,
      fingerprint,
      lyricsVariants: undefined,
      chosenVariant: 0,
      editedLyrics: undefined,
    });
    router.push("/criar/letra");
  }

  if (!ready) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-20 text-center text-ink/40">
        <p>{d.wizard.carregando}</p>
      </main>
    );
  }

  // ---------- 1. OCASIÃO ----------
  if (step === 0) {
    const groups = ["amor", "familia", "celebracao", "diversao"] as const;
    return (
      <WizardShell
        step={0}
        total={TOTAL}
        eyebrow={d.wizard.s0.eyebrow}
        title={d.wizard.s0.titulo}
        subtitle={d.wizard.s0.sub}
        onBack={back}
        footer={
          <button className="btn-primary w-full" disabled={!canAdvance} onClick={next}>
            {d.wizard.continuar}
          </button>
        }
      >
        <div className="space-y-6">
          {groups.map((g) => {
            const items = OCCASIONS.filter((o) => o.group === g).map((o) => locOccasion(d, o));
            if (!items.length) return null;
            return (
              <div key={g}>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-ink/40">{locGroup(d, g)}</p>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {items.map((o) => (
                    <OptionCard
                      key={o.slug}
                      icon={o.icon}
                      label={o.label}
                      description={o.tagline}
                      active={draft.occasion === o.slug}
                      onClick={() => update({ occasion: o.slug, styleId: undefined })}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </WizardShell>
    );
  }

  if (!occasion) {
    setStep(0);
    return null;
  }

  // ---------- 2. PARA QUEM (nome + gênero + relação) ----------
  if (step === 1) {
    const genders = [
      { id: "f", label: d.wizard.s1.generoF },
      { id: "m", label: d.wizard.s1.generoM },
      { id: "n", label: d.wizard.s1.generoN },
    ] as const;

    return (
      <WizardShell
        step={1}
        total={TOTAL}
        eyebrow={occasion.label}
        title={occasion.recipientLabel}
        subtitle={d.wizard.s1.sub}
        onBack={back}
        footer={
          <button className="btn-primary w-full" disabled={!canAdvance} onClick={next}>
            {d.wizard.continuar}
          </button>
        }
      >
        <div className="space-y-6">
          <div>
            <label htmlFor="recipient" className="mb-2 block text-sm font-medium text-ink">
              {d.wizard.s1.nome}
            </label>
            <input
              id="recipient"
              className="field"
              placeholder={d.wizard.s1.nomePh}
              value={draft.recipientName || ""}
              onChange={(e) => update({ recipientName: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && canAdvance && next()}
              autoFocus
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">{d.wizard.s1.generoPergunta}</p>
            <div className="flex flex-wrap gap-2">
              {genders.map((g) => (
                <PillOption
                  key={g.id}
                  label={g.label}
                  active={draft.recipientGender === g.id}
                  onClick={() => update({ recipientGender: g.id })}
                />
              ))}
            </div>
          </div>

          {occasion.relationships.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium text-ink">
                {d.wizard.s1.relacao} <span className="font-normal text-ink/40">{d.wizard.s1.opcional}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {occasion.relationships.map((r) => (
                  <PillOption
                    key={r}
                    label={r}
                    active={draft.relationship === r}
                    onClick={() => {
                      setCustomRelationship(false);
                      update({ relationship: draft.relationship === r ? undefined : r });
                    }}
                  />
                ))}
                <PillOption
                  label={d.wizard.s1.outro}
                  active={customRelationship}
                  onClick={() => {
                    setCustomRelationship(true);
                    update({ relationship: "" });
                  }}
                />
              </div>
              {customRelationship && (
                <input
                  className="field mt-3"
                  placeholder={d.wizard.s1.outroPh}
                  value={draft.relationship || ""}
                  onChange={(e) => update({ relationship: e.target.value })}
                />
              )}
            </div>
          )}
        </div>
      </WizardShell>
    );
  }

  // ---------- 3. QUEM ENVIA + HISTÓRIA ----------
  if (step === 2) {
    return (
      <WizardShell
        step={2}
        total={TOTAL}
        eyebrow={occasion.label}
        title={occasion.storyPrompt}
        subtitle={d.wizard.s2.sub}
        onBack={back}
        footer={
          <button className="btn-primary w-full" disabled={!canAdvance} onClick={next}>
            {storyLength >= MIN_HISTORIA
              ? d.wizard.continuar
              : fmt(d.wizard.s2.escrevaMais, { n: storyLength, min: MIN_HISTORIA })}
          </button>
        }
      >
        <div className="space-y-5">
          <div>
            <label htmlFor="sender" className="mb-2 block text-sm font-medium text-ink">
              {d.wizard.s2.quemEnvia}
            </label>
            <input
              id="sender"
              className="field"
              placeholder={d.wizard.s2.quemEnviaPh}
              value={draft.senderName || ""}
              onChange={(e) => update({ senderName: e.target.value })}
              autoFocus
            />
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink">{d.wizard.s2.historia}</span>
              {occasion.storyHints.map((h) => (
                <button key={h} type="button" onClick={() => usarDica(h)} className="chip transition hover:border-wine-400 hover:text-wine-700">
                  + {h}
                </button>
              ))}
            </div>

            <textarea
              ref={storyRef}
              className="field min-h-[180px] resize-y"
              placeholder={occasion.storyPlaceholder}
              value={draft.story || ""}
              onChange={(e) => update({ story: e.target.value })}
            />

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className={storyLength >= MIN_HISTORIA ? "text-ink/45" : "text-wine-600"}>
                {storyLength} {d.wizard.s2.caracteres}
              </span>
              <span className="text-ink/40">{d.wizard.s2.nudge}</span>
            </div>
          </div>
        </div>
      </WizardShell>
    );
  }

  // ---------- 4. ESTILO + VOZ ----------
  if (step === 3) {
    return (
      <WizardShell
        step={3}
        total={TOTAL}
        eyebrow={occasion.label}
        title={d.wizard.s3.titulo}
        subtitle={fmt(d.wizard.s3.sub, { ocasiao: occasion.label.toLowerCase() })}
        onBack={back}
        footer={
          <button className="btn-primary w-full" disabled={!canAdvance} onClick={next}>
            {canAdvance ? d.wizard.continuar : d.wizard.s3.escolha}
          </button>
        }
      >
        <div className="space-y-7">
          <div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {styles.map((s, i) => (
                <div key={s.id} className="relative">
                  {occasionBase && i < occasionBase.suggestedStyles.length && (
                    <span className="absolute -top-1.5 right-2 z-10 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {d.wizard.s3.combina}
                    </span>
                  )}
                  <OptionCard
                    icon={s.icon}
                    label={s.label}
                    description={s.description}
                    active={draft.styleId === s.id}
                    onClick={() => update({ styleId: s.id })}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {vocals.map((v) => (
                <OptionCard
                  key={v.id}
                  icon={v.icon}
                  label={v.label}
                  description={v.description}
                  active={draft.vocal === v.id}
                  onClick={() => update({ vocal: v.id as VocalGender })}
                />
              ))}
            </div>
          </div>
        </div>
      </WizardShell>
    );
  }

  // ---------- 5. CONTATO + GERAR ----------
  const styleBase = getStyle(draft.styleId);
  const style = styleBase ? locStyle(d, styleBase) : undefined;
  return (
    <WizardShell
      step={4}
      total={TOTAL}
      eyebrow={d.wizard.s4.eyebrow}
      title={d.wizard.s4.titulo}
      subtitle={d.wizard.s4.sub}
      onBack={back}
      footer={
        <div className="space-y-3">
          <Turnstile ref={captchaRef} onToken={setCaptchaToken} />
          <button
            className="btn-primary w-full !py-4 text-base"
            // Só exige o captcha quando ele está configurado — sem chave, o
            // funil roda normalmente (dev e quem clona o repo).
            disabled={!canAdvance || generating || (turnstileAtivo() && !captchaToken)}
            onClick={handleGenerate}
          >
            {generating ? (
              <span className="inline-flex items-center gap-2.5">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {d.wizard.s4.abrindo}
              </span>
            ) : (
              d.wizard.s4.cta
            )}
          </button>
          {error && <p className="text-center text-sm text-wine-600">{error}</p>}
          <p className="text-center text-xs text-ink/45">{d.wizard.s4.semCobranca}</p>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
            {d.wizard.s4.email}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            className="field"
            placeholder={d.wizard.s4.emailPh}
            value={draft.email || ""}
            onChange={(e) => update({ email: e.target.value })}
            autoFocus
          />
        </div>

        {/* O campo de WhatsApp saiu: a entrega é pela página do pedido, então
            o telefone não teria uso nenhum — e pedir dado pessoal que não se
            usa é ruim para o cliente e para a LGPD. Volta junto com o envio,
            se um dia existir. */}

        <div className="rounded-2xl bg-wine-50/60 p-4 text-sm">
          <p className="mb-2 font-medium text-ink">{d.wizard.s4.resumo}</p>
          <ul className="space-y-1.5 text-ink/65">
            <li className="flex items-center gap-2">
              <occasion.icon className="h-4 w-4 shrink-0 text-wine-600" aria-hidden />
              {occasion.label}
              {draft.relationship ? ` · ${draft.relationship}` : ""}
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-wine-600" aria-hidden />
              {fmt(d.wizard.s4.resumoPara, {
                para: draft.recipientName || "—",
                de: draft.senderName || "—",
              })}
            </li>
            {style && (
              <li className="flex items-center gap-2">
                <style.icon className="h-4 w-4 shrink-0 text-wine-600" aria-hidden />
                {style.label} · {vocals.find((v) => v.id === draft.vocal)?.label}
              </li>
            )}
          </ul>
        </div>
      </div>
    </WizardShell>
  );
}
