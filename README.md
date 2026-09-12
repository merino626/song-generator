<div align="center">

<img src="docs/screenshots/logo.png" alt="Vira Canção" height="40" />

# Vira Canção

**An AI song generator with a real payment flow — from a stranger's story to a finished, sung track.**

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-PaymentIntents-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare-R2%20%2F%20Turnstile-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**English** · [Português (BR)](README.pt-BR.md)

</div>

> ⚠️ **This deployment processes real payments** through the Stripe API. Completing checkout charges a real card and generates a real song. You don't need to pay to see the product work — lyrics are generated and freely editable before any charge happens.

---

## Table of contents

- [Screenshots](#screenshots)
- [Why I built this](#why-i-built-this)
- [What it actually does](#what-it-actually-does)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Engineering decisions worth calling out](#engineering-decisions-worth-calling-out)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Running it locally](#running-it-locally)
- [Roadmap](#roadmap)
- [License](#license)

---

## Screenshots

### Bilingual interface, no page reload

Switching languages rewrites the cookie and refreshes the server tree — no route change, no lost form state.

![Language switch](docs/screenshots/language-switch.gif)

### Custom audio player with a seek bar that's actually usable

Native `<audio>` controls didn't leave enough room to scrub a track on a narrow card — this is the fix, dragging through a real generated song.

![Audio seek](docs/screenshots/audio-seek.gif)

### The funnel

|                                          Landing page                                          |                                        Working examples                                        |
| :----------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------: |
| ![Landing](docs/screenshots/landing-hero.png)<br>_The pitch, in one screen_ | ![Examples](docs/screenshots/landing-examples.png)<br>_Real generated songs, playable inline_ |

|                                          Occasion picker                                          |                                        Lyrics, before any payment                                        |
| :----------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------: |
| ![Wizard](docs/screenshots/wizard-occasion.png)<br>_Step 1 of 5 — drives tone, prompt and suggested styles_ | ![Lyrics](docs/screenshots/letra-editing.png)<br>_Two AI-written versions, streamed in parallel and freely editable_ |

|                                          Checkout                                          |                                        Payment (Stripe Elements)                                        |
| :----------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------: |
| ![Checkout](docs/screenshots/checkout-plans.png)<br>_Server-computed price — the client never sends an amount_ | ![Payment](docs/screenshots/payment-stripe.png)<br>_Card element mounted directly from Stripe, tokenized in the browser_ |

### After payment

|                                          Delivered order                                          |                                        Your own songs, anytime                                        |
| :----------------------------------------------------------------------------------------------: | :------------------------------------------------------------------------------------------: |
| ![Delivered](docs/screenshots/order-delivered.png)<br>_Both takes, cover art, share and download — the moment the product is for_ | ![My orders](docs/screenshots/my-orders.png)<br>_Look up every song tied to an email, no login — mixed in-production/ready states_ |

_The interface switches between English and Portuguese; static screenshots above show the English version. Songs are always written and sung in Brazilian Portuguese._

---

## Why I built this

This started as a real commercial idea — a Brazilian competitor to an existing "personalized AI song" service — and I built the whole thing solo: product decisions, backend, frontend, payments, and the AI pipeline that turns a stranger's story into a finished track. It's now presented as a portfolio piece rather than a business, but nothing was stripped down to get here — same codebase, same integrations, same real payment processing a paying customer would hit.

It's also an end-to-end showcase of a production-shaped full-stack app: server-only price computation, a payment flow verified independently of what the client claims, a race condition fixed at the database level instead of with a mutex, and a hybrid production pipeline where a human silently backstops the AI when it fails.

## What it actually does

1. A short wizard collects the occasion, the recipient, a free-text story, and a music style (14 genres, from romantic sertanejo to comedic rap "roasts").
2. An LLM (Claude Haiku, via an AI aggregator) writes **two** different lyric takes in parallel, streamed to the screen as each finishes — not a single blocking request.
3. The customer edits the chosen lyrics word by word, then pays by credit or debit card through Stripe Elements, embedded directly in the page.
4. Payment confirmation kicks off music production: a Suno-backed engine (via the same aggregator) records the song with the edited lyrics and the chosen style's own vocabulary/tone.
5. If the automated engine fails for any reason, the order silently falls into a manual queue instead of failing the customer — an operator finishes the job by hand and the customer never sees the difference.
6. The finished song (two takes, cover art included) shows up on the order's page by itself, no reload needed.

---

## Features

### 🪄 Wizard & lyrics
- 5-step wizard covering occasion, recipient, relationship, free-text story and music style.
- Two lyric versions written in parallel from differently-angled prompts, streamed to the client as NDJSON instead of one blocking call.
- Each of the 14 music styles has its own vocabulary, verse length, rhyme density and imagery guidance injected into the LLM's system prompt — not just an instrumentation tag.
- Lyrics are free to generate and edit, word by word, before any payment exists.

### 💳 Payments
- Stripe Elements + the PaymentIntents API — card data is tokenized in the browser, the server never touches it.
- The charged amount is always computed server-side from the order row; the client can send an `orderId` and nothing else (proven with adversarial tests that spoof the amount and confirm it's ignored).
- PaymentIntents are reused across reloads instead of duplicated — an idempotency check by order.
- Payment truth is checked twice: once via Stripe webhook (`payment_intent.succeeded`), independently via client polling that re-reads the same PaymentIntent from Stripe's API — either path alone is enough to unlock the order.

### 🎵 Music production
- Suno-backed generation via the crun.ai aggregator, kicked off automatically on payment confirmation.
- Hybrid production: if the automated engine fails (timeout, bad response, rate limit), the order silently drops into a manual queue instead of failing the customer.
- A finalize-job race condition (two tabs polling at once) is closed with a single conditional `UPDATE ... WHERE status IN (...)`, not a mutex.
- Final audio and cover art are stored in Cloudflare R2 and served through short-lived signed URLs.

### 🌍 Bilingual by design
- Interface language lives in a cookie, not the URL — an already-shared `/order/<token>` link never breaks when the default language changes.
- The dictionary is two parallel files (Portuguese as source of truth, English as a mirror); `type Dict = typeof pt` makes the TypeScript compiler refuse to build if a key is missing from either one.
- Interface language and song language are independent — songs are always written and sung in Brazilian Portuguese regardless of UI language, since that's what the style picker's genres actually are.

### 🛡️ Abuse prevention
- Cloudflare Turnstile gates the (free) lyric-generation endpoint before it ever runs.
- Five layered rate limits stack from easiest to hardest to spoof: IP (loose, CGNAT-aware), device cookie, browser fingerprint, email, and an optional global daily cap — with a clean allowlist for testing that skips all of them.

---

## Tech stack

| | |
|---|---|
| **Next.js 15 (App Router)** | Front-end and back-end in the same deploy — API routes are serverless functions. |
| **Supabase (Postgres)** | Relational database, accessed only from the server via the service role key. |
| **Stripe** | Card payments via Stripe Elements and the PaymentIntents API — card data is tokenized in the browser, the server never sees it and only trusts what it independently re-reads back from Stripe's own API. |
| **Cloudflare R2** | Audio and image storage, served through short-lived signed URLs. |
| **crun.ai** | AI aggregator: Suno for music generation, Claude Haiku for lyrics, Nano Banana for cover art / demo photography. |
| **Cloudflare Turnstile** | Proof-of-humanity gate before any generation that costs money. |

No ORM, no heavy SDKs where a `fetch` call does the job — the crun.ai client and the R2 client are hand-rolled wrappers with explicit retry/error-handling policy, on purpose; Stripe is the one exception, since re-implementing PaymentIntent/webhook signature handling by hand would just be reinventing a security-critical wheel.

---

## Architecture

Everything ships as one Next.js deployment — no separate backend service. API routes are the backend; Supabase, Stripe and crun.ai are the only external systems.

```
                              BROWSER
                                 │
                       ┌─────────▼──────────┐
                       │     Next.js UI      │   wizard → lyrics → checkout → payment → order page
                       └─────────┬──────────┘
                                 │ fetch (API routes, same deploy — no separate backend)
                       ┌─────────▼──────────┐
              ┌────────┤     API routes      ├────────┐
              │        └─────────┬──────────┘        │
              ▼                  ▼                    ▼
      Claude Haiku          Stripe API          Supabase (Postgres)
   (lyrics, streamed as   (PaymentIntent +     orders · payments · jobs
      NDJSON, pre-pay)   webhook, post-pay)     rate limits · abuse log
                                 │
                     payment confirmed (webhook OR poll — either is enough)
                                 │
                       ┌─────────▼──────────┐
                       │  crun.ai / Suno     │   music production job
                       └─────────┬──────────┘
                                 │ provider callback, or cron sweep as a backstop
                       ┌─────────▼──────────┐
                       │   Cloudflare R2     │   final audio + cover art, signed URLs
                       └────────────────────┘
```

If the crun.ai callback never arrives (provider hiccup, network blip), a scheduled sweep (`/api/production/sweep`, `vercel.json` cron) re-checks in-flight jobs directly against the provider instead of trusting the callback alone.

---

## Engineering decisions worth calling out

**Hybrid production: the robot goes first, a human is never far.** Songs are generated automatically through a job queue. If the provider fails — timeout, bad response, rate limit — the order silently drops into a manual-handling queue. The customer never sees the internal state; the order page just says "in production" until the song genuinely exists, whether a robot or a person made it happen.

**A race condition fixed with an atomic UPDATE, not a mutex.** Two concurrent calls to finalize the same job (e.g. two open tabs polling at once) used to insert duplicate tracks. The fix was turning "finalize this job" into a conditional `UPDATE ... WHERE status IN ('queued','running')`, which Postgres already serializes on its own — only the first caller to flip the status wins, the second sees zero rows affected and backs off.

**The charged amount never comes from the client.** At one point the payment route read the transaction amount from the payload the browser sent, falling back to the database value only if that field was missing. A tampered payload could pay a few cents for an order worth many times more. The fix: the server computes the price from the order row and uses *only* that to create the Stripe PaymentIntent — the client can send an `orderId` and nothing else, and adversarial testing confirms a spoofed amount field is silently ignored.

**Streamed lyrics, not a batch.** The two lyric versions used to come back from one blocking call. They're now generated in parallel from two differently-angled prompts and streamed to the client as NDJSON — the first version reaches the screen well before the second finishes, instead of the user staring at a spinner for both.

**Every music genre gets its own voice.** Early on, picking a style only changed the instrumentation tag sent to the audio engine — the lyrics themselves came out structurally identical whether the genre was forró, rap, or a lullaby. The fix was giving each of the 14 styles its own guidance on vocabulary, verse length, rhyme density and imagery, injected directly into the LLM's system prompt.

**i18n with no route prefix.** The interface language lives in a cookie, not the URL, so no `/order/<token>` link already handed to a customer ever breaks when the default language changes. The dictionary itself is two files (Portuguese as the source of truth, English as a parallel object) — `type Dict = typeof pt` means TypeScript's compiler refuses to build if the English file is missing a key the Portuguese one has.

**Payment invariants enforced twice.** Whether an order counts as "paid" is decided by a single shared predicate (`isPaidOrBeyond`), checked both by the endpoint that releases the finished song *and* independently inside the production-start function itself — so a future code path that forgets the check still can't ship a song for an order that was never actually paid for.

---

## Security model

| Layer | How it's enforced |
|---|---|
| **Payment amount** | Computed server-side from the `orders` row; the client can only ever pass an `orderId`. Never trusted from request payloads. |
| **Payment truth** | Never taken at face value from the client or even from an unverified webhook — always independently re-read from Stripe's own PaymentIntents API before an order is marked paid. |
| **Webhook authenticity** | Signature-verified via `stripe.webhooks.constructEvent` against the raw request body; falls back to re-verifying against Stripe's API directly if no webhook secret is configured, so it fails safe rather than open. |
| **Bot/script abuse** | Cloudflare Turnstile in front of the (free, LLM-backed) lyric-generation endpoint. |
| **Rate limiting** | Five stacked layers — IP, device cookie, browser fingerprint, email, optional global daily cap — each harder to spoof than the last. |
| **Internal endpoints** | Production start/manual-override routes require a bearer `ADMIN_SECRET`; the cron sweep requires `CRON_SECRET`. Neither is reachable without it. |
| **Database access** | The Supabase service role key is used only in server-side code — it never reaches the browser. |

---

## Project structure

```
app/
├── api/                    # backend — every route below is a serverless function
│   ├── checkout/           # order creation, Stripe PaymentIntent, status polling
│   ├── webhooks/stripe/    # signature-verified payment confirmation
│   ├── generate-lyrics/    # streams NDJSON from the LLM
│   ├── production/         # start, manual override, provider callback, cron sweep
│   └── ...
├── criar/                  # the wizard: occasion → letra (lyrics) → checkout → pagamento
├── pedido/[token]/         # the customer-facing order/delivery page
└── admin/                  # manual queue + abuse review, ADMIN_SECRET-gated

components/
├── wizard/                 # one component per wizard step
└── AudioPlayer.tsx          # custom player — native controls didn't leave room to seek

lib/
├── music/                  # crun.ai client + production orchestrator
├── dict/{pt,en}.ts          # the whole bilingual dictionary, key-parity enforced by TypeScript
├── stripe.ts, r2.ts         # hand-rolled provider clients
├── rate-limit.ts, abuse.ts  # the 5-layer abuse defense
└── order-status.ts, payment-confirmed.ts   # the single shared "is this actually paid" predicate

supabase/migrations/         # applied with node scripts/migrate.js <file>
scripts/                     # e2e adversarial tests (payment amount tampering, dedup, etc.)
```

---

## Running it locally

```bash
npm install
cp .env.example .env.local   # fill in your own keys
npm run dev
```

Needs (at minimum) Supabase, Stripe **test-mode** credentials, and a crun.ai API key — the app degrades gracefully without most of these (payment and generation show a clear "not configured" state instead of crashing), but nothing meaningful works end to end without them. Database migrations live in `supabase/migrations/` and are applied with `node scripts/migrate.js <file>`.

Cloudflare Turnstile blocks headless/automated browsers by design (it's the whole point of the widget), which also means it blocks end-to-end testing tools like Playwright. Setting `NEXT_PUBLIC_TURNSTILE_TEST=1` swaps in Cloudflare's own always-pass demo keys — but only when `NEXT_PUBLIC_SITE_URL` points at `localhost`, so the flag can't accidentally disable the real gate in production.

---

## Roadmap

- [ ] Pix as a second payment method alongside card (Stripe supports it for BR-registered accounts; the webhook handler already needs no changes to support it)
- [ ] Automated end-to-end test suite wired into CI (the adversarial/e2e scripts in `scripts/` currently run by hand)
- [ ] Real admin authentication in place of a single shared `ADMIN_SECRET` bearer token
- [ ] More interface languages beyond English/Portuguese, reusing the existing `Dict = typeof pt` pattern

---

## License

Released under the [MIT License](LICENSE) — © 2026 Luis Eduardo.

<div align="center">

Built solo by [@merino626](https://github.com/merino626).

</div>
