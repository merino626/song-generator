/**
 * Dicionário PT-BR — a FONTE DA FORMA: `Dict = typeof pt`, e o `en.ts` é
 * obrigado pelo TypeScript a ter exatamente as mesmas chaves. Esqueceu uma
 * tradução? Não compila.
 *
 * Os overlays (`occasionOv`, `styleOv`, …) ficam vazios aqui de propósito:
 * em PT os dados-base de `lib/occasions.ts`/`lib/music-styles.ts`/`lib/pricing.ts`
 * JÁ são o texto certo. O inglês só sobrepõe os campos de exibição — os
 * campos de máquina (prompt de áudio, lyricGuidance) não são tocados.
 */

export const pt = {
  meta: {
    title: "Vira Canção — sua história vira música",
    description:
      "Músicas personalizadas feitas com a sua história: declaração, aniversário, homenagem — e até zoação. Letra na hora, música pronta em minutos.",
  },

  nav: {
    comoFunciona: "Como funciona",
    ocasioes: "Ocasiões",
    exemplos: "Exemplos",
    precos: "Preços",
    meusPedidos: "Meus pedidos",
    criar: "Criar minha música",
  },

  footer: {
    tagline: "Músicas personalizadas feitas a partir da sua história. Emoção, celebração — e boas risadas também.",
    produto: "Produto",
    ajuda: "Ajuda",
    criarMusica: "Criar música",
    meusPedidos: "Meus pedidos",
    precos: "Preços",
    faq: "Perguntas frequentes",
    exemplos: "Ouvir exemplos",
    feito: "Feito com carinho no Brasil",
    selo: "Pagamento seguro · Garantia de revisão da letra",
  },

  landing: {
    badge: "🎁 O presente que ninguém mais vai ter",
    h1Pre: "Sua história",
    h1Destaque: "vira canção",
    sub: "Conte o que você sente — a gente transforma numa música autoral, cantada de verdade, feita só para aquela pessoa. Emocionar, celebrar ou zoar: você escolhe.",
    ctaCriar: "Criar minha música",
    ctaOuvir: "▶ Ouvir exemplos",
    nota1: "Veja a ",
    notaStrong: "letra de graça",
    nota2: " antes de decidir · Sem cadastro",
    altFotos: {
      casal: "Casal ouvindo música juntos",
      aniversario: "Mulher se emocionando em uma festa de aniversário",
      familia: "Mãe e filha ouvindo música na cozinha",
      amigos: "Amigos rindo em volta da mesa",
      surpresa: "Homem surpreso ao ouvir a música no celular",
    },
    difs: [
      { t: "Você edita a letra", x: "Palavra por palavra, antes de gravar. Só aqui você faz isso." },
      { t: "Duas versões pra escolher", x: "Ouça as duas e fique com a que emocionar mais." },
      { t: "Revisão grátis ou reembolso", x: "Não ficou como imaginou? Refazemos — ou devolvemos." },
    ],
    como: {
      eyebrow: "Como funciona",
      titulo: "Três passos até a sua música",
      passos: [
        {
          t: "Conte a história",
          x: "Responde algumas perguntas rápidas: quem é a pessoa, o que vocês viveram, o clima que você quer. Leva 2 minutos.",
        },
        {
          t: "Veja a letra na hora",
          x: "A gente escreve duas versões de letra com a sua história. Você lê, escolhe a favorita e edita o que quiser — de graça.",
        },
        {
          t: "Receba a música pronta",
          x: "Sua canção é gravada com voz e instrumentos e aparece na página do seu pedido em poucos minutos — é só deixar aberta.",
        },
      ],
    },
    ocasioes: {
      eyebrow: "Para toda ocasião",
      titulo: "Não é só música de amor",
      sub: "Aniversário, formatura, homenagem, Dia das Mães — e até aquela música de zoação que vai fazer todo mundo chorar de rir.",
    },
    exemplos: {
      eyebrow: "Exemplos",
      titulo: "Ouça como fica",
      sub: "Músicas reais geradas na plataforma, cada uma de uma história diferente. A sua vai ter a sua — e o seu nome na letra.",
      itens: [
        { titulo: "Guarda-chuva Furado", legenda: "Declaração de amor · Sertanejo romântico" },
        { titulo: "Oitenta Anos de Xote", legenda: "Aniversário · Forró" },
        { titulo: "Pula Pro Lado Errado", legenda: "Zoação · Rap / Roast" },
      ],
    },
    precos: {
      eyebrow: "Preços",
      titulo: "Escolha quando quer receber",
      sub: "Você só paga depois de ler a letra e gostar dela. Sem assinatura, sem pegadinha.",
    },
    faq: { eyebrow: "Dúvidas", titulo: "Perguntas frequentes" },
    cta: {
      titulo: "Que história você quer transformar em música?",
      sub: "Comece agora e leia a letra de graça. Você só decide depois de ver a sua história virar canção.",
      botao: "Criar minha música",
    },
  },

  faqItens: [
    {
      q: "Em quanto tempo eu recebo a música?",
      a: "Poucos minutos. A música aparece sozinha na página do seu pedido — pode deixar a aba aberta que ela surge ali. Guarde o link: é por ele que você acessa e baixa sua música quando quiser, sem prazo para expirar. No plano prioritário você ainda tem prazo garantido de 1 hora e preferência na fila caso algo saia do previsto.",
    },
    {
      q: "Posso ver a letra antes de pagar?",
      a: "Pode — e é de graça. Depois de contar sua história, geramos duas versões de letra na hora. Você escolhe a que mais gostou, edita o que quiser e só então decide se quer a música cantada.",
    },
    {
      q: "E se eu quiser mudar alguma coisa na letra?",
      a: "Você edita a letra você mesmo, antes de fechar o pedido — palavra por palavra, se quiser. É o nosso maior diferencial: em outros serviços você recebe o que vier, sem poder mexer.",
    },
    {
      q: "E se eu não gostar do resultado?",
      a: "A gente refaz sem custo. Se ainda assim não ficar do jeito que você imaginou, devolvemos o valor — sem discussão e sem letra miúda.",
    },
    {
      q: "Como funciona o pagamento?",
      a: "Cartão de crédito ou débito. Todo o pagamento é processado com segurança pela Stripe — a gente não armazena os dados do seu cartão.",
    },
    {
      q: "A música é só minha?",
      a: "Sim. Ela é composta a partir da sua história e entregue só para você, com direito de uso pessoal — pode postar, presentear e tocar onde quiser.",
    },
    {
      q: "Dá pra fazer música de zoação mesmo?",
      a: "Dá, e é uma das nossas mais pedidas. Você conta as manias, os apelidos e as mancadas, e a gente transforma numa música engraçada — com uma virada carinhosa no final, do jeito que faz todo mundo rir e se emocionar junto.",
    },
    {
      q: "Em quais formatos eu recebo?",
      a: "A música em MP3 de alta qualidade, com a capa, nas duas versões que a gente gravou. É só baixar pela página do seu pedido — o link não expira.",
    },
  ],

  planCards: {
    ctaPrioridade: "Quero a prioritária",
    ctaPadrao: "Escolher entrega padrão",
    selo: "Cartão de crédito ou débito · Confirmação automática · Garantia de revisão da letra",
  },

  comecar: "Começar →",

  /**
   * Overlays de dados — vazios em PT (os dados-base já são PT).
   * Em EN, cada chave presente sobrepõe os campos de EXIBIÇÃO do item.
   */
  occasionOv: {} as Record<
    string,
    Partial<{
      label: string;
      tagline: string;
      recipientLabel: string;
      storyPrompt: string;
      storyPlaceholder: string;
      storyHints: string[];
      relationships: string[];
    }>
  >,
  styleOv: {} as Record<string, Partial<{ label: string; description: string }>>,
  vocalOv: {} as Record<string, Partial<{ label: string; description: string }>>,
  planOv: {} as Record<
    string,
    Partial<{ name: string; deliveryLabel: string; highlight: string; benefits: string[]; footnote: string }>
  >,
  groupOv: {} as Record<string, string>,

  wizard: {
    carregando: "Carregando…",
    passo: "Passo {n} de {total}",
    voltar: "← Voltar",
    continuar: "Continuar",
    s0: { eyebrow: "Ocasião", titulo: "Qual é a ocasião?", sub: "Isso define o tom da letra e os estilos que combinam melhor." },
    s1: {
      sub: "O nome vai aparecer cantado na música — capriche na grafia.",
      nome: "Nome",
      nomePh: "Ex.: Ângela",
      generoPergunta: "Essa pessoa é… (pra acertar a concordância na letra)",
      generoF: "Menina / Mulher",
      generoM: "Menino / Homem",
      generoN: "Prefiro não dizer",
      relacao: "Qual a relação de vocês?",
      opcional: "(opcional)",
      outro: "Outro",
      outroPh: "Descreva a relação (ex.: minha dinda)",
    },
    s2: {
      sub: "Esta é a parte mais importante: quanto mais detalhes de verdade, mais única fica a música.",
      quemEnvia: "Quem está enviando?",
      quemEnviaPh: "Ex.: João (ou 'a família toda')",
      historia: "A história",
      caracteres: "caracteres",
      nudge: "Nomes, apelidos e datas deixam a letra muito melhor",
      escrevaMais: "Escreva mais um pouco ({n}/{min})",
    },
    s3: {
      titulo: "Como você quer que soe?",
      sub: "Marcamos os estilos que mais combinam com {ocasiao}.",
      combina: "Combina",
      escolha: "Escolha o estilo e a voz",
    },
    s4: {
      eyebrow: "Quase lá",
      titulo: "Falta só o seu e-mail",
      sub: "Sua letra aparece na próxima tela, de graça. O e-mail serve para você reencontrar seus pedidos depois.",
      email: "Seu e-mail",
      emailPh: "voce@email.com",
      resumo: "Resumo",
      resumoPara: "Para {para}, de {de}",
      cta: "Ver minha letra grátis",
      abrindo: "Abrindo…",
      semCobranca: "Sem cobrança agora. Você só decide depois de ler a letra.",
    },
  },

  escrevendo: {
    etapas: [
      "Lendo a sua história…",
      "Encontrando o tom certo…",
      "Escrevendo os versos…",
      "Montando o refrão…",
      "Ajustando as rimas…",
    ],
    titulo: "Escrevendo a sua letra",
    sub: "São duas versões diferentes da sua história. A primeira aparece aqui em alguns segundos.",
    erroTitulo: "Não conseguimos escrever agora",
    tentarDeNovo: "Tentar de novo",
    naoPagou: "Você ainda não pagou nada.",
  },

  letra: {
    badge: "✨ Sua letra está pronta — e é de graça",
    titulo: "Escolha a versão que mais tem a sua cara",
    sub: "Escrevemos duas versões com a sua história. Leia com calma, escolha uma e edite o que quiser — só depois você decide se quer ouvir isso cantado.",
    subGerando: "Já pode ler esta enquanto terminamos a segunda versão. Depois é só escolher e editar o que quiser.",
    erroSegunda: "A segunda versão não veio ({erro}) — mas a de cima está pronta para usar.",
    versao: "Versão {n}",
    escrevendo: "escrevendo…",
    escolhida: "Escolhida",
    editar: "✏️ Editar letra",
    concluirEdicao: "✓ Concluir edição",
    editarDica: "Mude nomes, troque versos, tire o que não combina. É a sua música.",
    restaurar: "Restaurar original",
    cta: "Gostei — quero ouvir cantada 🎧",
    ajustar: "← Ajustar as respostas",
    naoPagou: "Você ainda não pagou nada",
    cards: [
      { t: "Composição autoral", x: "Melodia e arranjo feitos pra essa letra." },
      { t: "Pronta em minutos", x: "Aparece sozinha na página do seu pedido." },
      { t: "Garantia de revisão", x: "Não ficou bom? A gente refaz." },
    ],
  },

  checkout: {
    ultimoPasso: "Último passo · Confirmar",
    titulo: "Quando você quer receber?",
    sub: "Sua letra já está aprovada e na fila de produção. Escolha o prazo que combina com a sua surpresa.",
    resumo: "Resumo do pedido",
    musicaPara: "Música para {nome}",
    total: "Total",
    irPagamento: "Ir para o pagamento · {total}",
    preparando: "Preparando…",
    selo: "Cartão de crédito ou débito · Pagamento seguro · Garantia de revisão da letra",
    voltarLetra: "← Voltar para a letra",
    cards: [
      { t: "Garantia de satisfação", x: "Revisamos a letra até ficar do jeito que você imaginou." },
      { t: "Entrega rápida", x: "Pronta em poucos minutos, na página do pedido." },
      { t: "Feita só pra vocês", x: "Cada música é única e não se repete." },
    ],
  },

  pagamento: {
    titulo: "Pagamento",
    sub: "Assim que confirmar, sua música entra em produção na hora.",
    totalPagar: "Total a pagar",
    naoConfigurado: "Pagamento ainda não configurado.",
    naoConfiguradoDetalhe: "Falta definir NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (e STRIPE_SECRET_KEY no servidor).",
    processando: "Processando seu pagamento… isso pode levar alguns instantes.",
    pagar: "Pagar",
    voltarResumo: "← Voltar para o resumo",
    erroGenerico: "Não foi possível processar o pagamento",
    recusado: "Pagamento recusado. Confira os dados ou tente outro método.",
  },

  pedido: {
    tituloPagina: "Sua música",
    slaPrioridade: "⚡ Entrega prioritária",
    slaPadrao: "🕒 Entrega padrão",
    etapas: ["Compondo o arranjo", "Gravando os vocais", "Ajustando a mixagem", "Masterizando e finalizando"],
    produzindoTitulo: "Estamos gravando sua música",
    produzindoSub: "A canção de {para} está em produção. Pode deixar esta página aberta — ela aparece aqui sozinha, sem precisar recarregar.",
    paraDe: "Para {para}, de {de}",
    prazoNormal: "Costuma ficar pronta em cerca de 2 minutos",
    prazoFinal: "Já está nos ajustes finais — não vai demorar",
    haPoucosSegundos: "há poucos segundos",
    haMin: "há {n} min",
    garantia: "Garantida pronta em até {h}h — a maioria fica pronta bem antes disso.",
    copiarLink: "Copiar link deste pedido",
    linkCopiado: "✓ Link copiado",
    guardeLink: "Guarde o link: é por ele que você acessa sua música depois.",
    faltaPouco: "Falta pouco",
    aguardandoSub: "Seu pedido está reservado, mas o pagamento ainda não foi confirmado. Assim que confirmar, começamos a gravar na hora.",
    concluirPagamento: "Concluir pagamento",
    reembolsado: "Pedido reembolsado",
    reembolsadoSub: "Este pedido foi cancelado e o valor devolvido.",
    prontaBadge: "🎉 Sua música ficou pronta",
    paraDeStrong: "Para {para}, de {de}",
    duasVersoes: "Gravamos duas versões da sua canção. Ouça as duas e fique com a que mais tocar você.",
    baixar: "⬇ Baixar MP3",
    enviarWhatsApp: "Enviar no WhatsApp",
    compartilharTexto: "Fiz uma música pra você 🎵 {link}",
    copiar: "Copiar link",
    verLetra: "Ver a letra",
    naoFicou: "Não ficou como você imaginou?",
    refazemos: "A gente refaz sem custo — ou devolve o valor.",
    falarWhatsApp: "Falar com a gente no WhatsApp",
    falar: "Falar com a gente",
    suporteMsg: "Oi! É sobre o meu pedido {id} no Vira Canção.",
    suporteAssunto: "Pedido {id}",
    guardeEste: "Guarde este link: é por ele que você acessa sua música quando quiser.",
    versaoRotulo: "Versão {n}",
  },

  meusPedidos: {
    titulo: "Meus pedidos",
    sub: "Digite o e-mail que você usou na compra para reencontrar suas músicas.",
    email: "Seu e-mail",
    emailPh: "voce@email.com",
    cta: "Ver minhas músicas",
    procurando: "Procurando…",
    nada: "Não encontramos nenhum pedido para",
    nadaDica: "Confira se foi esse mesmo o e-mail usado na compra. Se o pagamento acabou de sair, pode levar alguns instantes para aparecer aqui.",
    encontrada1: "música encontrada",
    encontradaN: "músicas encontradas",
    pronta: "✓ pronta",
    emProducao: "em produção",
    para: "para",
    ouvir: "Ouvir e baixar →",
    acompanhar: "Acompanhar produção →",
  },
};

export type Dict = typeof pt;
