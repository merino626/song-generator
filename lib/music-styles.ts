import {
  Guitar,
  PartyPopper,
  Feather,
  Heart,
  Sun,
  Music2,
  Music3,
  Music4,
  Mic,
  Flame,
  Volume2,
  Headphones,
  Star,
  Moon,
  Venus,
  Mars,
  Users,
  type LucideIcon,
} from "lucide-react";

/** Estilos musicais oferecidos. `prompt` é o que vai pro gerador (tags da Suno). */

export type MusicStyle = {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Tags enviadas ao motor de música (instrumentação, andamento) */
  prompt: string;
  /**
   * Como a LETRA daquele gênero é escrita — vocabulário, tamanho de verso,
   * rima e imagens típicas.
   *
   * Existe separado do `prompt` porque os dois falam com coisas diferentes: o
   * `prompt` descreve o ARRANJO para o motor de áudio ("sanfona, zabumba"),
   * e isso não ensina nada a quem escreve o texto. Antes só o `prompt` era
   * injetado no prompt do LLM, então um forró e um rap recebiam exatamente as
   * mesmas regras de escrita e saíam com a mesma letra — mudava só o
   * instrumento por baixo. Era a queixa principal sobre o produto.
   */
  lyricGuidance: string;
};

export const MUSIC_STYLES: MusicStyle[] = [
  {
    id: "sertanejo-romantico",
    label: "Sertanejo romântico",
    icon: Guitar,
    description: "Viola, emoção e aquele refrão que gruda",
    prompt: "sertanejo romântico brasileiro, viola caipira, arranjo emotivo",
    lyricGuidance:
      "Fale DIRETO com a pessoa, na segunda pessoa. Versos curtos e cantáveis, rima simples e previsível (é qualidade aqui, não defeito). Vocabulário do dia a dia, nada rebuscado. Sofrência e entrega sem vergonha: saudade, o cheiro dela, o lado vazio da cama, a estrada, o telefone que não toca. O refrão repete o nome e é a frase que a pessoa vai cantar no carro.",
  },
  {
    id: "sertanejo-animado",
    label: "Sertanejo animado",
    icon: PartyPopper,
    description: "Modão de festa, pra cantar junto",
    prompt: "sertanejo universitário animado, festa, sanfona e guitarra",
    lyricGuidance:
      "Energia de bar cheio e brinde erguido. Versos curtos, refrão gritado em coro — pense no que a mesa inteira canta junto. Pode ter provocação leve e deboche alegre. Cenário: churrasco, sofá lotado, mesa de bar, buzina, playlist no talo. Evite melancolia; aqui é celebração.",
  },
  {
    id: "mpb-acustico",
    label: "MPB acústico",
    icon: Feather,
    description: "Violão, voz e letra que toca fundo",
    prompt: "MPB acústica, violão dedilhado, intimista, brasileira",
    lyricGuidance:
      "O estilo mais literário da lista. Versos mais longos e irregulares, rima discreta ou ausente — a beleza vem da imagem, não do encaixe sonoro. Use metáfora concreta e inesperada (uma janela, um trem, o café esfriando) em vez de dizer o sentimento com todas as letras. Repita pouco. Sugira mais do que afirme.",
  },
  {
    id: "pop-romantico",
    label: "Pop romântico",
    icon: Heart,
    description: "Moderno, radiofônico e emocionante",
    prompt: "pop romântico brasileiro, piano e cordas, produção moderna",
    lyricGuidance:
      "Linguagem limpa e contemporânea, como se fala hoje. Construção clara: verso conta, pré-refrão tensiona, refrão explode e é a parte mais simples de todas. O refrão precisa caber num respiro só. Detalhe específico nos versos, emoção universal no refrão.",
  },
  {
    id: "pop-alegre",
    label: "Pop alegre",
    icon: Sun,
    description: "Animado, pra celebrar em grande estilo",
    prompt: "pop brasileiro alegre e animado, palmas, energia de celebração",
    lyricGuidance:
      "Frases curtas e ritmadas, com gancho fácil. Pode usar 'ei', 'oh-oh', palmas marcadas no texto. Tom de festa surpresa, confete, todo mundo cantando. Presente e futuro, nunca lamento. O refrão é quase um grito de comemoração com o nome da pessoa dentro.",
  },
  {
    id: "pagode-romantico",
    label: "Pagode",
    icon: Music2,
    description: "Cavaquinho, suingue e romance",
    prompt: "pagode romântico, cavaquinho e percussão, suingue brasileiro",
    lyricGuidance:
      "Conversa, não declamação: jeito carioca, malandro e carinhoso ao mesmo tempo. Apelidos afetuosos, gíria leve, humor no meio do romance. Cenas do cotidiano — a laje, a mesa de bar, o churrasco de domingo, o telefone na madrugada. O suingue está no texto: versos com balanço, nunca quadrados demais.",
  },
  {
    id: "samba",
    label: "Samba",
    icon: Music3,
    description: "Ginga brasileira do começo ao fim",
    prompt: "samba brasileiro, cavaquinho, pandeiro, sopros",
    lyricGuidance:
      "Malícia e jogo de palavras. Mais sílabas por verso que os outros estilos — o samba comporta texto denso e cantado rápido. Rima interna é bem-vinda. Observação de vida com sabedoria e ironia, aquele fatalismo bem-humorado. Imagens de roda, morro, madrugada, cerveja, saudade que se dança.",
  },
  {
    id: "forro",
    label: "Forró",
    icon: Music4,
    description: "Sanfona, zabumba e pé de serra",
    prompt: "forró pé de serra, sanfona, zabumba e triângulo",
    lyricGuidance:
      "Fala nordestina de verdade, sem caricatura: 'oxente', 'arretado', 'véa', 'danado', 'cabra bom'. Versos CURTOS e martelados, rima forte e fácil — o forró é dançado, o texto precisa caber no passo. Imagens do interior: são João, fogueira, poeira, sanfona, xote agarradinho, milho verde. Alegria mesmo quando fala de saudade.",
  },
  {
    id: "rock-classico",
    label: "Rock",
    icon: Mic,
    description: "Guitarras e refrão pra cantar gritando",
    prompt: "rock brasileiro, guitarras marcantes, refrão anthem",
    lyricGuidance:
      "Versos secos e diretos, sem adjetivo sobrando. Intensidade e um quê de rebeldia ou urgência. O refrão é hino: poucas palavras, repetidas, feitas para serem gritadas por uma multidão. Imagens de estrada, cidade à noite, barulho, coragem. Nada de açúcar — a emoção aqui vem da força, não da delicadeza.",
  },
  {
    id: "rock-comico",
    label: "Rock cômico",
    icon: Flame,
    description: "Guitarra pesada com letra debochada",
    prompt: "rock cômico e debochado, guitarras, vocal teatral e caricato",
    lyricGuidance:
      "Exagero teatral e cara séria contando absurdo — a graça está em levar a bobagem a sério. Épico onde não cabe épico ('a lenda', 'o escolhido', 'o terror do churrasco'). Rima cômica, quanto mais inesperada melhor. Refrão gritado como se fosse hino de estádio, mas sobre algo ridículo.",
  },
  {
    id: "funk-zoeira",
    label: "Funk zoeira",
    icon: Volume2,
    description: "Batida chiclete pra zoar geral",
    prompt: "funk brasileiro divertido, batida marcante, refrão chiclete",
    lyricGuidance:
      "Versos MUITO curtos, quase falados, no ritmo da batida. Repetição é o motor: o refrão precisa grudar na primeira escuta e voltar sempre igual. Gíria atual, chamada direta pelo nome ('ó ela aí'), provocação de brincadeira. Frases de efeito curtas que viram bordão. Sem floreio nenhum.",
  },
  {
    id: "rap-roast",
    label: "Rap / Roast",
    icon: Headphones,
    description: "Rimas afiadas na medida da zoeira",
    prompt: "rap brasileiro bem-humorado, beat marcante, rimas afiadas",
    lyricGuidance:
      "O texto mais denso da lista. Versos longos, muitas sílabas, rima interna e multissílaba — não só no fim da linha. Cada estrofe fecha em punchline: a última frase é o soco. Jogo de palavras, trocadilho, comparação inesperada. O refrão é curto e serve de respiro entre as rajadas. Ataque o comportamento, nunca a aparência ou algo que a pessoa não escolheu.",
  },
  {
    id: "gospel",
    label: "Gospel",
    icon: Star,
    description: "Fé, gratidão e emoção",
    prompt: "gospel brasileiro, piano e coral, emocionante",
    lyricGuidance:
      "Estrutura de testemunho: onde eu estava, o que mudou, a quem eu agradeço. Vocabulário de fé — graça, bênção, altar, refúgio, propósito — usado com naturalidade, sem soar sermão. Gratidão no lugar de pedido. O refrão sobe junto com o coral e serve para ser cantado em pé, de olhos fechados. Emocione sem pregar.",
  },
  {
    id: "cancao-de-ninar",
    label: "Canção de ninar",
    icon: Moon,
    description: "Suave, delicada, pra embalar o sono",
    prompt: "canção de ninar suave, caixinha de música, delicada",
    lyricGuidance:
      "Vocabulário mínimo e doce, com diminutivos ('soninho', 'docinho', 'anjinho'). Versos muito curtos e muita repetição — a repetição é o que acalma. Sons suaves, evite palavras duras ou consoantes agressivas. Imagens de lua, estrela, colo, coberta, o barulho da chuva. Ritmo de balanço constante, como quem embala no colo.",
  },
];

export function getStyle(id: string | null | undefined): MusicStyle | undefined {
  return MUSIC_STYLES.find((s) => s.id === id);
}

export type VocalGender = "feminino" | "masculino" | "dueto";

export const VOCALS: { id: VocalGender; label: string; icon: LucideIcon; description: string }[] = [
  { id: "feminino", label: "Voz feminina", icon: Venus, description: "Suave e marcante" },
  { id: "masculino", label: "Voz masculina", icon: Mars, description: "Grave e envolvente" },
  { id: "dueto", label: "Dueto", icon: Users, description: "As duas vozes juntas" },
];
