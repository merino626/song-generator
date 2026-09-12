/**
 * Gerador de letra.
 *
 * `generateLyrics` escreve com LLM (Claude Haiku 4.5 via crun.ai) e, se algo
 * der errado — chave ausente, timeout, resposta inválida —, cai no molde
 * determinístico de `mockLyrics`. Mesma regra do resto do sistema: falha de
 * robô não pode derrubar o funil, o cliente sempre recebe alguma coisa.
 *
 * A diferença entre os dois é o produto inteiro: o molde encaixa a história
 * em versos prontos e sai genérico; o LLM usa os detalhes concretos (o lugar,
 * a data, a mania) — que é justamente o que o concorrente não faz.
 */

import { getOccasion } from "./occasions";
import { getStyle } from "./music-styles";
import { chat, llmConfigured, LLMError } from "./llm";

export type LyricsInput = {
  occasion?: string;
  recipientName?: string;
  /** "f" | "m" | "n" — concordância de gênero na letra (PT-BR) */
  recipientGender?: string;
  relationship?: string;
  senderName?: string;
  story?: string;
  styleId?: string;
  vocal?: string;
};

export type LyricsVariant = { title: string; lyrics: string };

/**
 * Frases da história — matéria-prima dos versos.
 * Cada frase precisa funcionar sozinha como um verso, então nunca são
 * concatenadas depois de uma oração incompleta (senão sai "A pessoa que Ele é...").
 */
function storyBits(story: string): string[] {
  return story
    .split(/[.;\n!?]+/)
    .map((s) => s.trim().replace(/\s+/g, " ").replace(/,$/, ""))
    .filter((s) => s.length > 3)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 6);
}

function firstName(name?: string): string {
  return (name || "você").trim().split(/\s+/)[0];
}

export function mockLyrics(input: LyricsInput): LyricsVariant[] {
  const to = firstName(input.recipientName);
  const from = firstName(input.senderName);
  const bits = storyBits(input.story || "");
  const occasion = getOccasion(input.occasion);
  const style = getStyle(input.styleId);
  const isFunny = input.occasion === "zoacao";

  const b = (i: number, fallback: string) => bits[i] || fallback;

  /**
   * Concordância de gênero. `g("querida","querido","especial")` devolve a forma
   * certa — e quando a pessoa prefere não dizer, cai numa palavra neutra.
   */
  const g = (fem: string, masc: string, neutro: string) =>
    input.recipientGender === "f" ? fem : input.recipientGender === "m" ? masc : neutro;

  if (isFunny) {
    const v1: LyricsVariant = {
      title: `A Lenda de ${to}`,
      lyrics: [
        "[Verso 1]",
        `Senhoras e senhores, com vocês: ${to}`,
        `${b(0, "A pessoa que faz tudo do jeito mais difícil")}`,
        `${from} avisou, mas ninguém acreditou`,
        `Que existisse alguém assim no mundo`,
        "",
        "[Pré-refrão]",
        `E todo mundo já sabe de cor`,
        `A fama chegou antes de você`,
        "",
        "[Refrão]",
        `Ô ${to}, ô ${to}`,
        `${b(1, "Ninguém segura essa lenda")}`,
        `Ô ${to}, ô ${to}`,
        `A gente zoa porque ama você`,
        "",
        "[Verso 2]",
        `${b(2, "Dizem que some quando chega a conta")}`,
        `${b(3, "E ainda jura que a culpa não é sua")}`,
        `Mas na hora que o bicho pega`,
        `Não tem ninguém melhor pra chamar`,
        "",
        "[Ponte]",
        `Brincadeira à parte, ${to}`,
        `${from} queria mesmo era dizer`,
        `Que a vida é bem melhor com você por perto`,
        // o artigo entra no g() junto com o substantivo, senão sai "Nosso lenda querida"
        `${g("Nossa lenda querida", "Nosso lendário", "Nosso xodó")} de cada dia`,
        "",
        "[Refrão final]",
        `Ô ${to}, ô ${to}`,
        `Que venham muitos anos de zoeira`,
        `Ô ${to}, ô ${to}`,
        `A gente te ama do jeito que você é`,
      ].join("\n"),
    };

    const v2: LyricsVariant = {
      title: `Culpa do ${to}`,
      lyrics: [
        "[Verso 1]",
        `Toda turma tem aquele um`,
        `E o nosso, coitado, é o ${to}`,
        `${b(0, "Chega atrasado até no próprio aniversário")}`,
        `E ainda reclama que o mundo é injusto`,
        "",
        "[Refrão]",
        `A culpa é do ${to}! (é do ${to}!)`,
        `${b(1, "Sempre foi, sempre vai ser")}`,
        `A culpa é do ${to}! (é do ${to}!)`,
        `Mas sem ele não tem graça, tem que reconhecer`,
        "",
        "[Verso 2]",
        `${b(2, "Some do grupo, aparece na hora do rango")}`,
        `${b(3, "Some de novo quando é pra ajudar")}`,
        `E mesmo assim, olha só que absurdo`,
        `Todo mundo aqui gosta de você`,
        "",
        "[Ponte]",
        `${from} mandou essa música dizendo:`,
        `"Zoa, mas fala que a gente ama"`,
        "",
        "[Refrão final]",
        `A culpa é do ${to}! (é do ${to}!)`,
        `De cada risada que a gente deu`,
        `A culpa é do ${to}!`,
        `Parabéns, seu lendário — essa é sua`,
      ].join("\n"),
    };

    return [v1, v2];
  }

  // ----- Tom emocional (todas as outras ocasiões) -----
  const relation = input.relationship ? input.relationship.toLowerCase() : "";
  const dedicatoria = relation ? `pra ${relation}` : "pra você";

  const v1: LyricsVariant = {
    title: `${to}, Do Meu Jeito`,
    lyrics: [
      "[Verso 1]",
      `${to}, hoje eu vim cantar`,
      `O que o coração de ${from} não sabe explicar`,
      `${b(0, "Tem coisa que não cabe num abraço")}`,
      `Mas vira canção pra não se perder`,
      "",
      "[Pré-refrão]",
      `E quando eu penso em tudo que a gente viveu`,
      `${b(1, "Cada detalhe volta em mim")}`,
      "",
      "[Refrão]",
      `${to}, é sobre você`,
      `Sobre o jeito que você me faz ser`,
      `${to}, escuta essa canção`,
      `É ${from} falando com o coração`,
      "",
      "[Verso 2]",
      `${b(2, "Lembra daquele dia que a gente riu à toa")}`,
      `${b(3, "E o tempo parecia parar")}`,
      `Se eu pudesse guardar um momento`,
      `Guardaria esse pra sempre em mim`,
      "",
      "[Ponte]",
      `Que essa música fique ${dedicatoria}`,
      `Como quem guarda uma foto no bolso`,
      `Pra lembrar que você é ${g("única", "único", "insubstituível")}`,
      "",
      "[Refrão final]",
      `${to}, é sobre você`,
      `Sobre tudo que eu não soube dizer`,
      `${to}, essa é a nossa canção`,
      `Com todo carinho, de ${from}`,
    ].join("\n"),
  };

  const v2: LyricsVariant = {
    title: `Canção Para ${to}`,
    lyrics: [
      "[Verso 1]",
      `Se um dia me perguntarem o que é sorte`,
      `Eu respondo com o seu nome: ${to}`,
      `${b(0, "Você chegou e mudou tudo de lugar")}`,
      `E eu nem sei mais viver do jeito antigo`,
      "",
      "[Refrão]",
      `Por isso eu canto, ${to}`,
      `Do jeito simples que eu aprendi a amar`,
      `Não tem presente que caiba o que eu sinto`,
      `Então virou música pra você guardar`,
      "",
      "[Verso 2]",
      `${b(1, "A gente tem história pra contar")}`,
      `${b(2, "E tanta coisa ainda por viver")}`,
      `${b(3, "E em cada uma delas tem você")}`,
      `Do meu lado, do meu jeito, meu lugar`,
      "",
      "[Ponte]",
      `${from} escreveu essa canção`,
      `Pra dizer o que a pressa do dia esconde:`,
      `Obrigado por existir assim, ${to}`,
      "",
      "[Refrão final]",
      `Por isso eu canto, ${to}`,
      `E se um dia faltar palavra, é só ouvir`,
      `Essa música é o meu abraço em som`,
      `${occasion ? `Com todo amor — ${occasion.label.toLowerCase()}` : "Com todo amor"}, de ${from}`,
    ].join("\n"),
  };

  // Nota: `style` entra no prompt do motor de música (não na letra em si).
  void style;

  return [v1, v2];
}

// ------------------------------------------------------------------ LLM

/**
 * Os dois ângulos. Existem para as versões serem DIFERENTES de verdade —
 * quando pedíamos "duas versões" numa chamada só, saíam parecidas demais e a
 * tela de escolha perdia o sentido. Separadas, cada uma tem uma instrução
 * própria e ainda geram em paralelo (a 1ª aparece na metade do tempo).
 */
const ANGULOS = [
  {
    nome: "história",
    instrucao:
      "Conte a história na ordem em que aconteceu: como começou, o que foi acontecendo, onde chegou hoje. O refrão amarra tudo. Tom caloroso e direto. No título, pode usar o lugar ou o objeto mais marcante da história.",
  },
  {
    nome: "momento",
    instrucao:
      "Escolha UM único momento ou sentimento da história e gire a música inteira em torno dele, como uma foto ampliada. Mais poético e intenso que cronológico — nada de linha do tempo. " +
      // As duas versões são escritas em paralelo, sem uma ver a outra, então
      // ambas tendem a cair no título óbvio (saíram "Fila da Padaria" e "Fila
      // de Padaria" no mesmo pedido). Proibir o óbvio aqui é o que faz a tela
      // de escolha ter sentido.
      "IMPORTANTE — o título NÃO pode citar o lugar, o objeto ou a cena mais óbvia da história: use uma imagem, um sentimento ou uma frase da própria letra. Comece a letra por um verso diferente do que seria o começo natural da narrativa.",
  },
];

const SISTEMA = `Você é um compositor brasileiro que escreve letras de música personalizadas sob encomenda. As pessoas te contam a história delas e você transforma em canção.

REGRA MAIS IMPORTANTE: use os detalhes CONCRETOS da história. Se a pessoa citou um lugar, uma data, uma comida, uma mania, um apelido, uma frase — isso PRECISA aparecer na letra. É o que separa uma música que faz chorar de um texto genérico que serve pra qualquer um.

SEGUNDA REGRA: a letra tem que SOAR como o gênero pedido. Um forró e um rap não se escrevem igual — muda o tamanho do verso, a densidade de rima, o vocabulário e as imagens. As instruções do gênero vêm no pedido e valem mais que o seu instinto de escrever "bonito".

Também obrigatório:
- Português do Brasil natural, do jeito que se fala. Nada de português de Portugal ou tradução.
- Estrutura marcada com colchetes: [Verso 1], [Pré-refrão], [Refrão], [Verso 2], [Ponte], [Refrão final]. Essas marcações são lidas pelo motor de áudio, então são obrigatórias.
- Refrão que gruda e repete o nome de quem recebe.
- Concordância de gênero correta.
- Rima natural. É melhor não rimar do que forçar uma palavra sem sentido só pela rima.

Proibido:
- Clichê vazio: "meu porto seguro", "minha metade", "você é meu tudo", "brilha como uma estrela".
- Falar da música dentro da música ("essa canção que eu fiz pra você") mais de uma vez.
- Inventar fatos que não estão na história.

Você devolve JSON válido, e NADA além do JSON:
{"titulo":"...","letra":"..."}

O título é curto (2 a 5 palavras) e não repete as palavras "música" nem "canção".`;

function promptDoPedido(input: LyricsInput, angulo: (typeof ANGULOS)[number]): string {
  const occasion = getOccasion(input.occasion);
  const style = getStyle(input.styleId);
  const genero =
    input.recipientGender === "f" ? "feminino" : input.recipientGender === "m" ? "masculino" : "não informado (use construções neutras)";

  const linhas = [
    `Ocasião: ${occasion?.label ?? input.occasion ?? "homenagem"}`,
    occasion?.tone ? `Tom pedido: ${occasion.tone}` : null,
    `Para: ${input.recipientName || "(não informado)"} — gênero ${genero}`,
    input.relationship ? `Relação: ${input.relationship}` : null,
    `De: ${input.senderName || "(não informado)"}`,
    style ? `Estilo musical: ${style.label}` : null,
    "",
    "História contada por quem encomendou:",
    input.story || "(não contou nada específico — nesse caso escreva algo caloroso e universal, sem inventar fatos)",
  ];

  if (input.occasion === "zoacao") {
    linhas.push(
      "",
      "ATENÇÃO — esta é uma música de ZOAÇÃO: bem-humorada, exagerada, de rir junto. Zoa os defeitos citados com carinho, nunca com crueldade, e fecha com algo genuinamente afetuoso. Não é uma música romântica.",
    );
  }

  // Como se escreve letra NESTE gênero. Vem depois da história de propósito:
  // é a última instrução que o modelo lê antes de escrever, e a que mais
  // muda o resultado — sem ela, os 14 estilos saíam com a mesma letra.
  if (style?.lyricGuidance) {
    linhas.push("", `COMO SE ESCREVE UMA LETRA DE ${style.label.toUpperCase()}:`, style.lyricGuidance);
  }

  linhas.push("", `ABORDAGEM DESTA VERSÃO: ${angulo.instrucao}`);

  return linhas.filter((l) => l !== null).join("\n");
}

/** Extrai o JSON mesmo se o modelo embrulhar em ```json ou texto solto. */
function parseVariante(bruto: string): LyricsVariant {
  const semCerca = bruto.replace(/```json\s*/gi, "").replace(/```/g, "").trim();
  const inicio = semCerca.indexOf("{");
  const fim = semCerca.lastIndexOf("}");
  if (inicio === -1 || fim === -1) throw new LLMError("resposta sem JSON");

  const dados = JSON.parse(semCerca.slice(inicio, fim + 1));
  const v: LyricsVariant = {
    title: String(dados?.titulo ?? "").trim(),
    lyrics: String(dados?.letra ?? "").trim(),
  };
  // Letra curta demais quer dizer que o modelo devolveu um resumo ou se
  // perdeu — entregar isso ao cliente é pior que cair no molde.
  if (!v.title || v.lyrics.length < 150) throw new LLMError("variante curta demais ou sem título");
  return v;
}

/** Uma versão. Se o LLM falhar, devolve o molde daquele índice. */
async function gerarUma(input: LyricsInput, indice: number): Promise<LyricsVariant> {
  if (!llmConfigured()) return mockLyrics(input)[indice];
  try {
    const bruto = await chat({ system: SISTEMA, user: promptDoPedido(input, ANGULOS[indice]) });
    return parseVariante(bruto);
  } catch (e) {
    console.error(`[lyrics] versão ${indice + 1} falhou, usando molde:`, (e as Error).message);
    return mockLyrics(input)[indice];
  }
}

/**
 * Gera as duas versões EM PARALELO e entrega cada uma assim que fica pronta.
 *
 * Antes era uma chamada só devolvendo as duas: o cliente esperava ~11s olhando
 * um botão travado antes de ver qualquer coisa. Agora as duas partem juntas e a
 * primeira que chegar já vai para a tela (~6s) — a segunda preenche o lugar
 * dela depois. Menos gente desiste no meio.
 *
 * O `indice` vai junto porque a ordem de chegada não é garantida: quem chegar
 * primeiro pode ser a versão 2, e a tela precisa colocar cada uma no seu lugar.
 */
export async function* generateLyricsStream(
  input: LyricsInput,
): AsyncGenerator<{ indice: number; variante: LyricsVariant }> {
  const pendentes = new Map<number, Promise<{ indice: number; variante: LyricsVariant }>>();
  for (let i = 0; i < ANGULOS.length; i++) {
    pendentes.set(i, gerarUma(input, i).then((variante) => ({ indice: i, variante })));
  }

  while (pendentes.size) {
    const pronta = await Promise.race(pendentes.values());
    pendentes.delete(pronta.indice);
    yield pronta;
  }
}

/** Versão não-streaming (as duas de uma vez). Mantida para scripts e testes. */
export async function generateLyrics(input: LyricsInput): Promise<LyricsVariant[]> {
  const saida: LyricsVariant[] = [];
  for await (const { indice, variante } of generateLyricsStream(input)) saida[indice] = variante;
  return saida;
}
