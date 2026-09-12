/**
 * Registry de ocasiões — o coração do produto.
 *
 * Cada ocasião dirige (a) as perguntas do wizard, (b) o tom/prompt da letra e
 * (c) os estilos musicais sugeridos. É o que nos deixa ir muito além do
 * "só romântico" do concorrente, incluindo a categoria Zoação.
 */

export type OccasionSlug =
  | "declaracao"
  | "aniversario"
  | "zoacao"
  | "casamento"
  | "pedido-namoro"
  | "maes"
  | "pais"
  | "nascimento"
  | "amizade"
  | "formatura"
  | "homenagem"
  | "outra";

export type Occasion = {
  slug: OccasionSlug;
  label: string;
  emoji: string;
  /** Frase curta no card de seleção */
  tagline: string;
  /** Agrupamento visual na landing/wizard */
  group: "amor" | "familia" | "celebracao" | "diversao";
  /** Como chamamos quem recebe a música (ex.: "Para quem é a homenagem?") */
  recipientLabel: string;
  /** Opções de relação — vazio = campo livre */
  relationships: string[];
  /** Pergunta da história */
  storyPrompt: string;
  storyPlaceholder: string;
  /** Chips que ajudam a pessoa a destravar o que escrever */
  storyHints: string[];
  /** Estilos sugeridos (ids de music-styles) — o 1º vira o default */
  suggestedStyles: string[];
  /** Tom que será passado ao gerador de letra */
  tone: string;
  /** Destaque na home */
  featured?: boolean;
};

export const OCCASIONS: Occasion[] = [
  {
    slug: "declaracao",
    label: "Declaração de amor",
    emoji: "❤️",
    tagline: "Diga o que o coração não consegue falar",
    group: "amor",
    recipientLabel: "Para quem é a declaração?",
    relationships: ["Namorado(a)", "Esposo(a)", "Companheiro(a)", "Crush", "Ex (reconciliação)"],
    storyPrompt: "Conte a história de vocês",
    storyPlaceholder:
      "Como se conheceram, o que você mais ama nessa pessoa, uma lembrança marcante, aquele apelido carinhoso, uma música ou lugar que é de vocês...",
    storyHints: ["Como se conheceram", "O que você mais ama", "Uma lembrança marcante", "Apelido carinhoso"],
    suggestedStyles: ["sertanejo-romantico", "mpb-acustico", "pop-romantico", "pagode-romantico"],
    tone: "romântico, sincero e emocionado, sem clichê",
    featured: true,
  },
  {
    slug: "aniversario",
    label: "Aniversário",
    emoji: "🎂",
    tagline: "Um parabéns que ninguém esquece",
    group: "celebracao",
    recipientLabel: "Quem está fazendo aniversário?",
    relationships: ["Filho(a)", "Mãe", "Pai", "Amigo(a)", "Namorado(a)", "Esposo(a)", "Irmão/Irmã", "Avô/Avó"],
    storyPrompt: "Conte sobre a pessoa aniversariante",
    storyPlaceholder:
      "Quantos anos faz, como é o jeito dela, o que vocês costumam fazer juntos, uma história engraçada, o que você deseja pra ela...",
    storyHints: ["Quantos anos faz", "O jeito dela", "História marcante", "Seu desejo pra ela"],
    suggestedStyles: ["pop-alegre", "sertanejo-animado", "samba", "forro"],
    tone: "alegre, caloroso e celebrativo",
    featured: true,
  },
  {
    slug: "zoacao",
    label: "Zoação / Engraçada",
    emoji: "😂",
    tagline: "Pra rir muito — e ainda emocionar no final",
    group: "diversao",
    recipientLabel: "Quem é a vítima?",
    relationships: ["Amigo(a)", "Irmão/Irmã", "Colega de trabalho", "Chefe", "Time/Turma", "Namorado(a)"],
    storyPrompt: "O que a gente vai zoar?",
    storyPlaceholder:
      "As manias, os apelidos, a mancada histórica, o time que ele perde sempre, que é pão-duro, que dorme cedo, que some do rolê... quanto mais detalhe, mais engraçado fica!",
    storyHints: ["Manias e apelidos", "A mancada histórica", "Time do coração", "O que todo mundo zoa"],
    suggestedStyles: ["rock-comico", "funk-zoeira", "forro", "sertanejo-animado", "rap-roast"],
    tone: "bem-humorado e debochado, zoando com carinho — sem ofensa pesada, com uma virada afetuosa no final",
    featured: true,
  },
  {
    slug: "casamento",
    label: "Casamento / Bodas",
    emoji: "💍",
    tagline: "A trilha sonora do grande dia",
    group: "amor",
    recipientLabel: "Para quem é a música?",
    relationships: ["Noivo(a)", "Esposo(a)", "Os noivos", "Casal de bodas"],
    storyPrompt: "Conte a história do casal",
    storyPlaceholder:
      "Há quanto tempo estão juntos, como se conheceram, o pedido, o que construíram, os filhos, os planos daqui pra frente...",
    storyHints: ["Como se conheceram", "O pedido", "Tempo juntos", "O que construíram"],
    suggestedStyles: ["mpb-acustico", "pop-romantico", "sertanejo-romantico", "gospel"],
    tone: "emocionante, elegante e celebrativo",
    featured: true,
  },
  {
    slug: "pedido-namoro",
    label: "Pedido de namoro",
    emoji: "💐",
    tagline: "Um pedido impossível de recusar",
    group: "amor",
    recipientLabel: "Para quem é o pedido?",
    relationships: ["Crush", "Ficante", "Amigo(a) especial", "Namorado(a) (oficializando)"],
    storyPrompt: "Conte como chegaram até aqui",
    storyPlaceholder:
      "Como se conheceram, há quanto tempo estão se vendo, o que te faz ter certeza, como você imagina o pedido...",
    storyHints: ["Como se conheceram", "Há quanto tempo", "Por que é ela/ele", "Como será o pedido"],
    suggestedStyles: ["pop-romantico", "sertanejo-romantico", "mpb-acustico", "pagode-romantico"],
    tone: "apaixonado, doce e cheio de expectativa",
  },
  {
    slug: "maes",
    label: "Dia das Mães",
    emoji: "🌷",
    tagline: "O presente que ela vai guardar pra sempre",
    group: "familia",
    recipientLabel: "Para qual mãe é a música?",
    relationships: ["Minha mãe", "Minha avó", "Mãe dos meus filhos", "Sogra", "Madrasta", "Tia que é mãe"],
    storyPrompt: "Conte sobre ela",
    storyPlaceholder:
      "O que ela fez por você, a comida dela, o jeito de cuidar, uma frase que ela sempre diz, o que você nunca disse mas queria...",
    storyHints: ["O que ela fez por você", "A comida dela", "Frase que ela sempre diz", "O que nunca disse"],
    suggestedStyles: ["mpb-acustico", "sertanejo-romantico", "gospel", "pop-romantico"],
    tone: "afetuoso, grato e emocionante",
  },
  {
    slug: "pais",
    label: "Dia dos Pais",
    emoji: "🎣",
    tagline: "Pra aquele que nunca pede nada",
    group: "familia",
    recipientLabel: "Para qual pai é a música?",
    relationships: ["Meu pai", "Meu avô", "Pai dos meus filhos", "Sogro", "Padrasto", "Tio que é pai"],
    storyPrompt: "Conte sobre ele",
    storyPlaceholder:
      "O trabalho dele, os conselhos, o time que ele torce, aquele passeio de domingo, o que ele te ensinou sem falar...",
    storyHints: ["O que ele te ensinou", "O time dele", "Um momento de vocês", "O jeito dele"],
    suggestedStyles: ["sertanejo-romantico", "mpb-acustico", "rock-classico", "gospel"],
    tone: "orgulhoso, afetuoso e sincero",
  },
  {
    slug: "nascimento",
    label: "Nascimento de filho(a)",
    emoji: "👶",
    tagline: "A primeira canção da vida dele(a)",
    group: "familia",
    recipientLabel: "Qual o nome do bebê?",
    relationships: ["Meu filho", "Minha filha", "Meu neto(a)", "Afilhado(a)"],
    storyPrompt: "Conte sobre essa chegada",
    storyPlaceholder:
      "A espera, o dia do nascimento, com quem ele(a) se parece, o que vocês sonham para essa criança, o significado do nome...",
    storyHints: ["A espera", "O dia do parto", "Com quem se parece", "O sonho de vocês"],
    suggestedStyles: ["mpb-acustico", "pop-romantico", "cancao-de-ninar", "gospel"],
    tone: "doce, esperançoso e cheio de ternura",
  },
  {
    slug: "amizade",
    label: "Amizade",
    emoji: "🤝",
    tagline: "Pra quem sempre esteve lá",
    group: "celebracao",
    recipientLabel: "Para qual amigo(a)?",
    relationships: ["Melhor amigo(a)", "Amigos de infância", "A turma", "Amigo(a) de trabalho", "Padrinho/Madrinha"],
    storyPrompt: "Conte a história dessa amizade",
    storyPlaceholder:
      "Como se conheceram, os rolês, as fases difíceis que passaram juntos, aquele perrengue que virou piada, o que essa pessoa significa...",
    storyHints: ["Como se conheceram", "O perrengue que virou piada", "Fase difícil juntos", "O que significa"],
    suggestedStyles: ["pagode-romantico", "rock-classico", "samba", "pop-alegre"],
    tone: "caloroso, leve e parceiro, com um toque de nostalgia",
  },
  {
    slug: "formatura",
    label: "Formatura",
    emoji: "🎓",
    tagline: "A conquista merece trilha sonora",
    group: "celebracao",
    recipientLabel: "Quem está se formando?",
    relationships: ["Filho(a)", "Namorado(a)", "Amigo(a)", "Irmão/Irmã", "Eu mesmo(a)", "A turma"],
    storyPrompt: "Conte sobre essa conquista",
    storyPlaceholder:
      "Qual curso, quanto tempo levou, os sacrifícios pelo caminho, quem apoiou, os planos agora...",
    storyHints: ["Qual curso", "Os sacrifícios", "Quem apoiou", "Os planos agora"],
    suggestedStyles: ["pop-alegre", "rock-classico", "sertanejo-animado", "gospel"],
    tone: "orgulhoso, vibrante e inspirador",
  },
  {
    slug: "homenagem",
    label: "Homenagem",
    emoji: "🕊️",
    tagline: "Eternize alguém especial em música",
    group: "familia",
    recipientLabel: "Quem você quer homenagear?",
    relationships: ["Familiar", "Amigo(a)", "Alguém que partiu", "Professor(a)", "Profissional que admiro"],
    storyPrompt: "Conte a história dessa pessoa",
    storyPlaceholder:
      "Quem ela é (ou foi), o que ela representa, uma lembrança que você guarda, o que você gostaria de dizer a ela...",
    storyHints: ["Quem ela é", "O que representa", "Lembrança marcante", "O que quer dizer"],
    suggestedStyles: ["mpb-acustico", "gospel", "sertanejo-romantico", "pop-romantico"],
    tone: "respeitoso, emocionante e profundo",
  },
  {
    slug: "outra",
    label: "Outra ocasião",
    emoji: "✨",
    tagline: "Conte a sua ideia — a gente compõe",
    group: "celebracao",
    recipientLabel: "Para quem é a música?",
    relationships: [],
    storyPrompt: "Conte o que você quer transformar em música",
    storyPlaceholder:
      "Descreva a ocasião, para quem é, o que precisa estar na letra e o clima que você imagina...",
    storyHints: ["Qual a ocasião", "Para quem é", "O que não pode faltar", "O clima"],
    suggestedStyles: ["mpb-acustico", "pop-romantico", "sertanejo-romantico", "rock-classico"],
    tone: "adequado ao que a pessoa descrever",
  },
];

export const GROUP_LABELS: Record<Occasion["group"], string> = {
  amor: "Amor",
  familia: "Família",
  celebracao: "Celebração",
  diversao: "Diversão",
};

export function getOccasion(slug: string | null | undefined): Occasion | undefined {
  return OCCASIONS.find((o) => o.slug === slug);
}
