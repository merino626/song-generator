# Vira Canção

[🇺🇸 Read in English](README.md)

**Conta uma história, recebe de volta uma música original de verdade — com voz, instrumentação e um checkout real.** Um produto full-stack construído sozinho, de ponta a ponta: wizard → letra por IA → produção musical por IA → pagamento → entrega, tudo realmente funcionando, não é uma maquete.

> ⚠️ **Este deploy processa pagamentos reais** pela API da Stripe. Concluir o checkout cobra um cartão de verdade e gera uma música de verdade. Não precisa pagar pra ver o produto funcionando — a letra é gerada e pode ser editada livremente antes de qualquer cobrança.

---

## Por que esse projeto existe

Isso começou como uma ideia comercial de verdade — um concorrente brasileiro de um serviço existente de "música personalizada por IA" — e eu construí tudo sozinho: decisões de produto, backend, frontend, pagamentos e o pipeline de IA que transforma a história de um estranho numa faixa pronta. Hoje é apresentado como projeto de portfólio em vez de negócio, mas nada foi simplificado pra chegar até aqui — mesmo código, mesmas integrações, mesmo processamento real de pagamento que um cliente pagante encontraria.

## O que ele realmente faz

1. Um wizard curto coleta a ocasião, o destinatário, uma história em texto livre e um estilo musical (14 gêneros, do sertanejo romântico ao rap de "zoeira").
2. Uma LLM (Claude Haiku, via um agregador de IA) escreve **duas** versões diferentes da letra em paralelo, transmitidas pra tela conforme cada uma termina — não é uma única chamada bloqueante.
3. O cliente edita a letra escolhida palavra por palavra, depois paga com cartão de crédito ou débito pelo Stripe Elements, embutido direto na página.
4. A confirmação do pagamento dispara a produção musical: um motor baseado em Suno (pelo mesmo agregador) grava a música com a letra editada e o vocabulário/tom do estilo escolhido.
5. Se o motor automático falhar por qualquer motivo, o pedido cai silenciosamente numa fila manual em vez de falhar pro cliente — um operador termina o trabalho na mão e o cliente nunca percebe a diferença.
6. A música pronta (as duas versões, com capa incluída) aparece sozinha na página do pedido, sem precisar recarregar.

Tudo é bilíngue (inglês por padrão, português trocável) por um sistema de dicionário feito do zero, e o idioma da interface é independente do idioma da música — as músicas são sempre escritas e cantadas em português do Brasil, já que é isso que os gêneros do seletor de estilo realmente são.

---

## Stack

| | |
|---|---|
| **Next.js 15 (App Router)** | Front-end e back-end no mesmo deploy — as rotas de API são funções serverless. |
| **Supabase (Postgres)** | Banco relacional, acessado só pelo servidor via service role key. |
| **Stripe** | Pagamento com cartão via Stripe Elements e a API de PaymentIntents — o cartão é tokenizado no navegador, o servidor nunca vê o número e só confia no que ele mesmo reconfere na API da própria Stripe. |
| **Cloudflare R2** | Armazenamento de áudio e imagem, servido por URLs assinadas de curta duração. |
| **crun.ai** | Agregador de IA: Suno pra geração musical, Claude Haiku pras letras, Nano Banana pra capa/fotos de demonstração. |
| **Cloudflare Turnstile** | Verificação de humanidade antes de qualquer geração que custa dinheiro. |

Sem ORM, sem SDK pesado onde um `fetch` resolve — o cliente do crun.ai e o do R2 são wrappers feitos à mão, com política explícita de retry/tratamento de erro, de propósito; a Stripe é a exceção, porque reimplementar verificação de assinatura de webhook/PaymentIntent na mão seria só reinventar uma roda crítica de segurança.

---

## Decisões de engenharia que valem a pena mencionar

**Produção híbrida: o robô vai primeiro, um humano nunca está longe.** As músicas são geradas automaticamente por uma fila de jobs. Se o provedor falha — timeout, resposta ruim, rate limit — o pedido cai silenciosamente numa fila de tratamento manual. O cliente nunca vê o estado interno; a página do pedido só diz "em produção" até a música existir de verdade, seja porque um robô ou uma pessoa fez acontecer.

**Uma condição de corrida corrigida com UPDATE atômico, não um mutex.** Duas chamadas concorrentes finalizando o mesmo job (ex.: duas abas abertas fazendo polling ao mesmo tempo) inseriam faixas duplicadas. A correção foi transformar "finalizar este job" num `UPDATE ... WHERE status IN ('queued','running')` condicional, que o Postgres já serializa sozinho — só quem chega primeiro consegue trocar o status, o segundo vê zero linhas afetadas e desiste.

**O valor cobrado nunca vem do cliente.** Em certo ponto, a rota de pagamento lia o valor da transação direto do payload que o navegador mandava, só caindo pro valor do banco se esse campo estivesse ausente. Um payload adulterado podia pagar centavos por um pedido que valia muito mais. A correção: o servidor calcula o preço a partir da linha do pedido e usa *só* isso pra criar o PaymentIntent da Stripe — o cliente manda um `orderId` e nada mais, e um teste adversarial confirma que um campo de valor forjado é simplesmente ignorado.

**Letra em streaming, não em lote.** As duas versões da letra costumavam vir de uma única chamada bloqueante. Agora são geradas em paralelo a partir de dois prompts com ângulos diferentes e transmitidas ao cliente como NDJSON — a primeira versão chega na tela bem antes da segunda terminar, em vez do usuário ficar olhando um spinner esperando as duas.

**Cada gênero musical tem a própria voz.** No início, escolher um estilo só mudava a tag de instrumentação mandada pro motor de áudio — a letra em si saía estruturalmente idêntica fosse forró, rap ou uma cantiga de ninar. A correção foi dar a cada um dos 14 estilos sua própria orientação de vocabulário, tamanho de verso, densidade de rima e imagens, injetada direto no system prompt da LLM.

**i18n sem prefixo de rota.** O idioma da interface vive num cookie, não na URL, então nenhum link `/pedido/<token>` já entregue a um cliente quebra quando o idioma padrão muda. O dicionário em si são dois arquivos (português como fonte da verdade, inglês como objeto paralelo) — `type Dict = typeof pt` faz o compilador do TypeScript recusar o build se o arquivo em inglês estiver faltando uma chave que o português tem.

**Invariante de pagamento verificado duas vezes.** Se um pedido conta como "pago" é decidido por um único predicado compartilhado (`isPaidOrBeyond`), checado tanto pelo endpoint que libera a música pronta *quanto* independentemente dentro da própria função que inicia a produção — assim, um futuro caminho de código que esquecer a checagem ainda assim não consegue entregar uma música de um pedido que nunca foi pago de verdade.

---

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com suas próprias chaves
npm run dev
```

Precisa (no mínimo) de credenciais do Supabase, da Stripe em **modo teste**, e de uma API key do crun.ai — o app degrada graciosamente sem a maioria delas (pagamento e geração mostram um estado claro de "não configurado" em vez de quebrar), mas nada funciona de ponta a ponta sem elas. As migrations do banco ficam em `supabase/migrations/` e são aplicadas com `node scripts/migrate.js <arquivo>`.

O Cloudflare Turnstile bloqueia navegadores headless/automatizados por design (é literalmente o propósito do widget), o que também bloqueia ferramentas de teste ponta a ponta como o Playwright. Definir `NEXT_PUBLIC_TURNSTILE_TEST=1` troca pelas chaves de demonstração da própria Cloudflare (sempre aprovam) — mas só quando `NEXT_PUBLIC_SITE_URL` aponta pra `localhost`, então a flag não tem como desligar a verificação de verdade em produção sem querer.

---

Construído sozinho por [@merino626](https://github.com/merino626).
