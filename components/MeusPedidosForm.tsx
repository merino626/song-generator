"use client";

import { useState } from "react";
import { useDict } from "@/components/LocaleProvider";

type Pedido = {
  token: string;
  titulo: string;
  para: string;
  ocasiao: string;
  estado: string;
  pronta: boolean;
  criadoEm: string;
  prontoEm: string | null;
  url: string;
};

function data(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export function MeusPedidosForm() {
  const d = useDict();
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);

  async function consultar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    try {
      const res = await fetch("/api/meus-pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados.error || "Não foi possível consultar.");
      setPedidos(dados.pedidos);
    } catch (e) {
      setErro((e as Error).message);
      setPedidos(null);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <form onSubmit={consultar} className="card mt-8 space-y-4 p-6">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-ink">
            {d.meusPedidos.email}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            placeholder={d.meusPedidos.emailPh}
            autoComplete="email"
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={carregando}>
          {carregando ? d.meusPedidos.procurando : d.meusPedidos.cta}
        </button>

        {erro && <p className="text-center text-sm text-wine-600">{erro}</p>}
      </form>

      {pedidos && pedidos.length === 0 && (
        <div className="card mt-6 p-8 text-center">
          <p className="text-sm text-ink/60">
            {d.meusPedidos.nada} <strong className="text-ink">{email}</strong>.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink/45">
            {d.meusPedidos.nadaDica}
          </p>
        </div>
      )}

      {pedidos && pedidos.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="text-center text-xs text-ink/45">
            {pedidos.length} {pedidos.length === 1 ? d.meusPedidos.encontrada1 : d.meusPedidos.encontradaN}
          </p>
          {pedidos.map((p) => (
            <a key={p.token} href={p.url} className="card block p-5 transition hover:border-wine-300">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{p.titulo}</p>
                  <p className="mt-0.5 text-xs text-ink/50">
                    {p.ocasiao} · {d.meusPedidos.para} {p.para} · {data(p.criadoEm)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                    p.pronta ? "bg-emerald-600 text-white" : "bg-wine-50 text-wine-700"
                  }`}
                >
                  {p.pronta ? d.meusPedidos.pronta : d.meusPedidos.emProducao}
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-wine-600">
                {p.pronta ? d.meusPedidos.ouvir : d.meusPedidos.acompanhar}
              </p>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
