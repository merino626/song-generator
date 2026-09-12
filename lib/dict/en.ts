import type { Dict } from "./pt";

/**
 * English dictionary. `Dict = typeof pt` força paridade de chaves: se uma
 * string nova entrar no PT e não ganhar tradução aqui, o build quebra.
 *
 * Os overlays sobrepõem só os campos de EXIBIÇÃO dos dados-base (ocasiões,
 * estilos, vozes, planos). Campos de máquina — o `prompt` de áudio e o
 * `lyricGuidance` — ficam como estão: quem os lê é o motor e o LLM, e a letra
 * em inglês é pedida por instrução própria em `lib/lyrics.ts`.
 */
export const en: Dict = {
  meta: {
    title: "Vira Canção — your story becomes a song",
    description:
      "Personalized songs written from your story: love declarations, birthdays, tributes — even roasts. Lyrics on the spot, finished song in minutes.",
  },

  nav: {
    comoFunciona: "How it works",
    ocasioes: "Occasions",
    exemplos: "Examples",
    precos: "Pricing",
    meusPedidos: "My orders",
    criar: "Create my song",
  },

  footer: {
    tagline: "Personalized songs written from your story. Emotion, celebration — and a good laugh too.",
    produto: "Product",
    ajuda: "Help",
    criarMusica: "Create a song",
    meusPedidos: "My orders",
    precos: "Pricing",
    faq: "FAQ",
    exemplos: "Listen to examples",
    feito: "Made with care in Brazil",
    selo: "Secure payment · Lyrics revision guarantee",
  },

  landing: {
    badge: "🎁 The gift nobody else will ever have",
    h1Pre: "Your story",
    h1Destaque: "becomes a song",
    sub: "Tell us what you feel — we turn it into an original song, truly sung, made for that one person. To move, to celebrate, or to roast: you choose.",
    ctaCriar: "Create my song",
    ctaOuvir: "▶ Listen to examples",
    nota1: "See the ",
    notaStrong: "lyrics for free",
    nota2: " before deciding · No sign-up",
    altFotos: {
      casal: "Couple listening to music together",
      aniversario: "Woman moved to tears at a birthday party",
      familia: "Mother and daughter listening to music in the kitchen",
      amigos: "Friends laughing around a table",
      surpresa: "Man surprised while listening to a song on his phone",
    },
    difs: [
      { t: "You edit the lyrics", x: "Word by word, before recording. Nobody else lets you do this." },
      { t: "Two versions to choose from", x: "Listen to both and keep the one that moves you more." },
      { t: "Free revision or refund", x: "Not what you imagined? We redo it — or give your money back." },
    ],
    como: {
      eyebrow: "How it works",
      titulo: "Three steps to your song",
      passos: [
        {
          t: "Tell the story",
          x: "Answer a few quick questions: who the person is, what you've lived together, the mood you want. Takes 2 minutes.",
        },
        {
          t: "See the lyrics instantly",
          x: "We write two lyric versions from your story. You read them, pick your favorite and edit anything — for free.",
        },
        {
          t: "Get the finished song",
          x: "Your song is recorded with vocals and instruments and shows up on your order page within minutes — just keep it open.",
        },
      ],
    },
    ocasioes: {
      eyebrow: "For every occasion",
      titulo: "Not just love songs",
      sub: "Birthdays, graduations, tributes, Mother's Day — and even that roast song that will make everyone cry laughing.",
    },
    exemplos: {
      eyebrow: "Examples",
      titulo: "Hear how it sounds",
      sub: "Real songs generated on the platform, each from a different story. Yours will carry your story — and their name in the lyrics. (Songs are always written and sung in Brazilian Portuguese, in the styles below.)",
      itens: [
        { titulo: "Guarda-chuva Furado", legenda: "Love declaration · Romantic sertanejo" },
        { titulo: "Oitenta Anos de Xote", legenda: "Birthday · Forró" },
        { titulo: "Pula Pro Lado Errado", legenda: "Roast · Rap" },
      ],
    },
    precos: {
      eyebrow: "Pricing",
      titulo: "Choose when you want it",
      sub: "You only pay after reading the lyrics and loving them. No subscription, no catch.",
    },
    faq: { eyebrow: "Questions", titulo: "Frequently asked questions" },
    cta: {
      titulo: "Which story do you want to turn into a song?",
      sub: "Start now and read the lyrics for free. You only decide after seeing your story become a song.",
      botao: "Create my song",
    },
  },

  faqItens: [
    {
      q: "How long until I get the song?",
      a: "A few minutes. The song appears on your order page by itself — keep the tab open and it shows up right there. Save the link: that's how you access and download your song anytime, with no expiration. On the priority plan you also get a guaranteed 1-hour deadline and front-of-the-line treatment if anything goes off script.",
    },
    {
      q: "Can I see the lyrics before paying?",
      a: "Yes — for free. After you tell your story, we write two lyric versions on the spot. You pick the one you like best, edit anything you want, and only then decide if you want it sung.",
    },
    {
      q: "What if I want to change something in the lyrics?",
      a: "You edit the lyrics yourself, before placing the order — word by word if you like. It's our biggest differentiator: elsewhere you get whatever comes out, with no say.",
    },
    {
      q: "What if I don't like the result?",
      a: "We redo it at no cost. If it's still not what you imagined, we refund you — no arguing, no fine print.",
    },
    {
      q: "How does payment work?",
      a: "Credit or debit card. All payments are processed securely by Stripe — we never store your card details.",
    },
    {
      q: "Is the song really mine?",
      a: "Yes. It's composed from your story and delivered only to you, with personal usage rights — post it, gift it, play it anywhere.",
    },
    {
      q: "Can you really make a roast song?",
      a: "We can, and it's one of our most requested. You tell us the quirks, the nicknames and the legendary blunders, and we turn it into a funny song — with a warm twist at the end, the kind that makes everyone laugh and tear up at once.",
    },
    {
      q: "What formats do I get?",
      a: "The song as high-quality MP3, with the cover art, in the two versions we recorded. Just download from your order page — the link never expires.",
    },
  ],

  planCards: {
    ctaPrioridade: "I want priority",
    ctaPadrao: "Choose standard delivery",
    selo: "Credit or debit card · Automatic confirmation · Lyrics revision guarantee",
  },

  comecar: "Start →",

  occasionOv: {
    declaracao: {
      label: "Love declaration",
      tagline: "Say what the heart can't put into words",
      recipientLabel: "Who is this declaration for?",
      storyPrompt: "Tell us your story together",
      storyPlaceholder:
        "How you met, what you love most about them, a moment you'll never forget, that special nickname, a song or place that's yours...",
      storyHints: ["How you met", "What you love most", "A defining moment", "A sweet nickname"],
      relationships: ["Girlfriend/Boyfriend", "Wife/Husband", "Partner", "Crush", "Ex (getting back together)"],
    },
    aniversario: {
      label: "Birthday",
      tagline: "A happy-birthday nobody's ever heard before",
      recipientLabel: "Who's the birthday person?",
      storyPrompt: "Tell us about them",
      storyPlaceholder:
        "How old they're turning, what they're like, what you do together, a funny story, what you wish for them...",
      storyHints: ["Their age", "Their way", "A memorable story", "Your wish for them"],
      relationships: ["Son/Daughter", "Mom", "Dad", "Friend", "Girlfriend/Boyfriend", "Wife/Husband", "Sibling", "Grandparent"],
    },
    zoacao: {
      label: "Roast / Funny",
      tagline: "Roast with love — and a killer beat",
      recipientLabel: "Who's the victim?",
      storyPrompt: "What are we roasting?",
      storyPlaceholder:
        "The quirks, the nicknames, the legendary blunder, the team that always loses, the friend who vanishes when the bill comes... the more detail, the funnier it gets!",
      storyHints: ["Quirks and nicknames", "The legendary blunder", "Their team", "What everyone teases about"],
      relationships: ["Best friend", "Sibling", "Coworker", "Boss", "The crew", "Girlfriend/Boyfriend"],
    },
    casamento: {
      label: "Wedding / Anniversary",
      tagline: "The song of a lifetime together",
      recipientLabel: "Who is this song for?",
      storyPrompt: "Tell us the couple's story",
      storyPlaceholder:
        "How long you've been together, how you met, the proposal, what you've built, the kids, the plans ahead...",
      storyHints: ["How you met", "The proposal", "Time together", "What you've built"],
      relationships: ["Fiancé(e)", "Wife/Husband", "The newlyweds", "Anniversary couple"],
    },
    "pedido-namoro": {
      label: "Asking them out",
      tagline: "A question they'll never forget",
      recipientLabel: "Who are you asking?",
      storyPrompt: "Tell us how you got here",
      storyPlaceholder:
        "How you met, how long you've been seeing each other, what makes you sure, how you picture the big question...",
      storyHints: ["How you met", "How long it's been", "Why it's them", "How you'll ask"],
      relationships: ["Crush", "Someone I'm seeing", "A special friend", "Making it official"],
    },
    maes: {
      label: "Mother's Day",
      tagline: "The present she'll cry to (happy tears)",
      recipientLabel: "Who is she?",
      storyPrompt: "Tell us about her",
      storyPlaceholder:
        "What she's done for you, her cooking, the way she cares, a phrase she always says, what you never told her but wish you had...",
      storyHints: ["What she did for you", "Her cooking", "A phrase she always says", "What you never said"],
      relationships: ["My mom", "My grandma", "Mother of my kids", "Mother-in-law", "Stepmom", "The aunt who raised me"],
    },
    pais: {
      label: "Father's Day",
      tagline: "For the man of few words and big deeds",
      recipientLabel: "Who is he?",
      storyPrompt: "Tell us about him",
      storyPlaceholder:
        "His work, his advice, the team he roots for, that Sunday ritual, what he taught you without saying a word...",
      storyHints: ["What he taught you", "His team", "A moment of yours", "His way"],
      relationships: ["My dad", "My grandpa", "Father of my kids", "Father-in-law", "Stepdad", "The uncle who raised me"],
    },
    nascimento: {
      label: "New baby",
      tagline: "A lullaby for the newest love of your life",
      recipientLabel: "Who just arrived?",
      storyPrompt: "Tell us about this arrival",
      storyPlaceholder:
        "The wait, the day of the birth, who they look like, what you dream for this child, the meaning of the name...",
      storyHints: ["The wait", "The birth day", "Who they look like", "Your dream for them"],
      relationships: ["My son", "My daughter", "My grandchild", "My godchild"],
    },
    amizade: {
      label: "Friendship",
      tagline: "For the ones who never left",
      recipientLabel: "Who's the friend?",
      storyPrompt: "Tell us this friendship's story",
      storyPlaceholder:
        "How you met, the adventures, the hard times you got through together, that disaster that became a running joke, what this person means...",
      storyHints: ["How you met", "The disaster turned joke", "Hard times together", "What they mean"],
      relationships: ["Best friend", "Childhood friends", "The whole crew", "Work friend", "Godparent"],
    },
    formatura: {
      label: "Graduation",
      tagline: "The soundtrack of a conquest",
      recipientLabel: "Who's graduating?",
      storyPrompt: "Tell us about this achievement",
      storyPlaceholder:
        "The degree, how long it took, the sacrifices along the way, who supported them, the plans now...",
      storyHints: ["The degree", "The sacrifices", "Who supported", "The plans now"],
      relationships: ["Son/Daughter", "Girlfriend/Boyfriend", "Friend", "Sibling", "Myself", "The whole class"],
    },
    homenagem: {
      label: "Tribute",
      tagline: "Make a memory eternal",
      recipientLabel: "Who is this tribute for?",
      storyPrompt: "Tell us this person's story",
      storyPlaceholder:
        "Who they are (or were), what they represent, a memory you keep, what you'd like to tell them...",
      storyHints: ["Who they are", "What they represent", "A treasured memory", "What you want to say"],
      relationships: ["Family member", "Friend", "Someone who passed", "A teacher", "Someone I admire"],
    },
    outra: {
      label: "Something else",
      tagline: "Tell us the occasion — we'll make it sing",
      recipientLabel: "Who is the song for?",
      storyPrompt: "Tell us what you want turned into a song",
      storyPlaceholder:
        "Describe the occasion, who it's for, what must be in the lyrics and the mood you imagine...",
      storyHints: ["The occasion", "Who it's for", "What can't be missing", "The mood"],
      relationships: [],
    },
  },

  styleOv: {
    "sertanejo-romantico": { label: "Romantic sertanejo", description: "Brazilian country: guitars, heart and a chorus that sticks" },
    "sertanejo-animado": { label: "Party sertanejo", description: "Upbeat Brazilian country, made for singing along" },
    "mpb-acustico": { label: "Acoustic MPB", description: "Brazilian songwriting: guitar, voice and lyrics that cut deep" },
    "pop-romantico": { label: "Romantic pop", description: "Modern, radio-ready and moving" },
    "pop-alegre": { label: "Upbeat pop", description: "Bright and festive, made to celebrate" },
    "pagode-romantico": { label: "Pagode", description: "Cavaquinho, swing and romance, Rio style" },
    samba: { label: "Samba", description: "Brazilian groove from start to finish" },
    forro: { label: "Forró", description: "Accordion, zabumba and northeastern joy" },
    "rock-classico": { label: "Rock", description: "Guitars and a chorus to shout out loud" },
    "rock-comico": { label: "Comedy rock", description: "Heavy guitar with a tongue-in-cheek lyric" },
    "funk-zoeira": { label: "Funk (roast)", description: "A catchy Brazilian funk beat to roast someone with love" },
    "rap-roast": { label: "Rap / Roast", description: "Sharp rhymes, exactly as playful as you need" },
    gospel: { label: "Gospel", description: "Faith, gratitude and emotion" },
    "cancao-de-ninar": { label: "Lullaby", description: "Soft and delicate, for rocking to sleep" },
  },

  vocalOv: {
    feminino: { label: "Female voice", description: "Soft and striking" },
    masculino: { label: "Male voice", description: "Deep and warm" },
    dueto: { label: "Duet", description: "Both voices together" },
  },

  planOv: {
    priority: {
      name: "Priority",
      deliveryLabel: "Ready in minutes, with a guaranteed deadline",
      highlight: "Most chosen",
      benefits: [
        "Ready in just a few minutes",
        "Guaranteed 1-hour deadline, even if something breaks",
        "Front of the line in any hiccup",
        "Lyrics revision included",
      ],
      footnote: "Ideal for last-minute surprises and dates that are today.",
    },
    standard: {
      name: "Standard",
      deliveryLabel: "Ready in minutes",
      benefits: ["Ready in just a few minutes", "Full personalized production", "Lyrics revision included"],
      footnote: "The same song and the same quality — without a written deadline guarantee.",
    },
  },

  groupOv: { amor: "Love", familia: "Family", celebracao: "Celebration", diversao: "Fun" },

  wizard: {
    carregando: "Loading…",
    passo: "Step {n} of {total}",
    voltar: "← Back",
    continuar: "Continue",
    s0: { eyebrow: "Occasion", titulo: "What's the occasion?", sub: "This sets the tone of the lyrics and the styles that fit best." },
    s1: {
      sub: "The name will be sung in the song — double-check the spelling.",
      nome: "Name",
      nomePh: "e.g. Sarah",
      generoPergunta: "This person is… (so the lyrics get pronouns right)",
      generoF: "A girl / woman",
      generoM: "A boy / man",
      generoN: "Rather not say",
      relacao: "What's your relationship?",
      opcional: "(optional)",
      outro: "Other",
      outroPh: "Describe the relationship (e.g. my godmother)",
    },
    s2: {
      sub: "This is the most important part: the more real details, the more unique the song becomes.",
      quemEnvia: "Who is sending it?",
      quemEnviaPh: "e.g. John (or 'the whole family')",
      historia: "The story",
      caracteres: "characters",
      nudge: "Names, nicknames and dates make the lyrics much better",
      escrevaMais: "Write a bit more ({n}/{min})",
    },
    s3: {
      titulo: "How should it sound?",
      sub: "We've marked the styles that best fit {ocasiao}.",
      combina: "Great fit",
      escolha: "Pick a style and a voice",
    },
    s4: {
      eyebrow: "Almost there",
      titulo: "Just your e-mail left",
      sub: "Your lyrics appear on the next screen, for free. The e-mail is how you find your orders again later.",
      email: "Your e-mail",
      emailPh: "you@email.com",
      resumo: "Summary",
      resumoPara: "For {para}, from {de}",
      cta: "See my lyrics for free",
      abrindo: "Opening…",
      semCobranca: "No charge now. You only decide after reading the lyrics.",
    },
  },

  escrevendo: {
    etapas: ["Reading your story…", "Finding the right tone…", "Writing the verses…", "Building the chorus…", "Polishing the rhymes…"],
    titulo: "Writing your lyrics",
    sub: "Two different takes on your story. The first appears here in a few seconds.",
    erroTitulo: "We couldn't write it right now",
    tentarDeNovo: "Try again",
    naoPagou: "You haven't paid anything yet.",
  },

  letra: {
    badge: "✨ Your lyrics are ready — and they're free",
    titulo: "Pick the version that feels most like you",
    sub: "We wrote two versions from your story. Read them calmly, pick one and edit anything you like — only then do you decide if you want to hear it sung.",
    subGerando: "You can read this one while we finish the second version. Then just pick and edit as you like.",
    erroSegunda: "The second version didn't arrive ({erro}) — but the one above is ready to use.",
    versao: "Version {n}",
    escrevendo: "writing…",
    escolhida: "Chosen",
    editar: "✏️ Edit lyrics",
    concluirEdicao: "✓ Done editing",
    editarDica: "Change names, swap lines, cut what doesn't fit. It's your song.",
    restaurar: "Restore original",
    cta: "I love it — I want to hear it sung 🎧",
    ajustar: "← Adjust my answers",
    naoPagou: "You haven't paid anything yet",
    cards: [
      { t: "Original composition", x: "Melody and arrangement made for these lyrics." },
      { t: "Ready in minutes", x: "Appears on your order page by itself." },
      { t: "Revision guarantee", x: "Not good enough? We redo it." },
    ],
  },

  checkout: {
    ultimoPasso: "Last step · Confirm",
    titulo: "When do you want it?",
    sub: "Your lyrics are approved and in the production queue. Pick the deadline that fits your surprise.",
    resumo: "Order summary",
    musicaPara: "Song for {nome}",
    total: "Total",
    irPagamento: "Go to payment · {total}",
    preparando: "Preparing…",
    selo: "Credit or debit card · Secure payment · Lyrics revision guarantee",
    voltarLetra: "← Back to the lyrics",
    cards: [
      { t: "Satisfaction guarantee", x: "We revise the lyrics until they're what you imagined." },
      { t: "Fast delivery", x: "Ready in a few minutes, on your order page." },
      { t: "Made only for you", x: "Every song is unique and never repeats." },
    ],
  },

  pagamento: {
    titulo: "Payment",
    sub: "As soon as it's confirmed, your song goes into production immediately.",
    totalPagar: "Total to pay",
    naoConfigurado: "Payment not configured yet.",
    naoConfiguradoDetalhe: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (and STRIPE_SECRET_KEY on the server) still need to be set.",
    processando: "Processing your payment… this can take a few moments.",
    pagar: "Pay",
    voltarResumo: "← Back to summary",
    erroGenerico: "We couldn't process the payment",
    recusado: "Payment declined. Check your details or try another method.",
  },

  pedido: {
    tituloPagina: "Your song",
    slaPrioridade: "⚡ Priority delivery",
    slaPadrao: "🕒 Standard delivery",
    etapas: ["Composing the arrangement", "Recording the vocals", "Adjusting the mix", "Mastering and finishing"],
    produzindoTitulo: "We're recording your song",
    produzindoSub: "{para}'s song is in production. Keep this page open — it appears here by itself, no reloading needed.",
    paraDe: "For {para}, from {de}",
    prazoNormal: "Usually ready in about 2 minutes",
    prazoFinal: "Final touches now — almost there",
    haPoucosSegundos: "a few seconds ago",
    haMin: "{n} min ago",
    garantia: "Guaranteed ready within {h}h — most are done far earlier.",
    copiarLink: "Copy this order's link",
    linkCopiado: "✓ Link copied",
    guardeLink: "Save the link: it's how you'll access your song later.",
    faltaPouco: "Almost there",
    aguardandoSub: "Your order is reserved, but payment hasn't been confirmed yet. The moment it clears, we start recording.",
    concluirPagamento: "Complete payment",
    reembolsado: "Order refunded",
    reembolsadoSub: "This order was cancelled and the amount returned.",
    prontaBadge: "🎉 Your song is ready",
    paraDeStrong: "For {para}, from {de}",
    duasVersoes: "We recorded two versions of your song. Listen to both and keep the one that moves you more.",
    baixar: "⬇ Download MP3",
    enviarWhatsApp: "Send on WhatsApp",
    compartilharTexto: "I made a song for you 🎵 {link}",
    copiar: "Copy link",
    verLetra: "See the lyrics",
    naoFicou: "Not what you imagined?",
    refazemos: "We redo it at no cost — or refund you.",
    falarWhatsApp: "Talk to us on WhatsApp",
    falar: "Talk to us",
    suporteMsg: "Hi! It's about my order {id} at Vira Canção.",
    suporteAssunto: "Order {id}",
    guardeEste: "Save this link: it's how you access your song whenever you want.",
    versaoRotulo: "Version {n}",
  },

  meusPedidos: {
    titulo: "My orders",
    sub: "Enter the e-mail you used at purchase to find your songs again.",
    email: "Your e-mail",
    emailPh: "you@email.com",
    cta: "See my songs",
    procurando: "Searching…",
    nada: "We couldn't find any order for",
    nadaDica: "Check that this is the e-mail used at purchase. If the payment just went through, it can take a few moments to show up here.",
    encontrada1: "song found",
    encontradaN: "songs found",
    pronta: "✓ ready",
    emProducao: "in production",
    para: "for",
    ouvir: "Listen and download →",
    acompanhar: "Track production →",
  },
};
