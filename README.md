# Vira Canção

[🇧🇷 Ler em português](README.pt-BR.md)

**Tell a story, get back an original song — with real vocals, real instrumentation, and a real checkout.** A full-stack product built solo, end to end: wizard → AI lyrics → AI music production → payment → delivery, all actually running, not a mock-up.

> ⚠️ **This deployment processes real payments** through the Stripe API. Completing checkout charges a real card and generates a real song. You don't need to pay to see the product work — lyrics are generated and freely editable before any charge happens.

---

## Why this exists

This started as a real commercial idea — a Brazilian competitor to an existing "personalized AI song" service — and I built the whole thing solo: product decisions, backend, frontend, payments, and the AI pipeline that turns a stranger's story into a finished track. It's now presented as a portfolio piece rather than a business, but nothing was stripped down to get here — same codebase, same integrations, same real payment processing that a paying customer would hit.

## What it actually does

1. A short wizard collects the occasion, the recipient, a free-text story, and a music style (14 genres, from romantic sertanejo to comedic rap "roasts").
2. An LLM (Claude Haiku, via an AI aggregator) writes **two** different lyric takes in parallel, streamed to the screen as each finishes — not a single blocking request.
3. The customer edits the chosen lyrics word by word, then pays by credit or debit card through Stripe Elements, embedded directly in the page.
4. Payment confirmation kicks off music production: a Suno-backed engine (via the same aggregator) records the song with the edited lyrics and the chosen style's own vocabulary/tone.
5. If the automated engine fails for any reason, the order silently falls into a manual queue instead of failing the customer — an operator finishes the job by hand and the customer never sees the difference.
6. The finished song (two takes, cover art included) shows up on the order's page by itself, no reload needed.

The whole thing is bilingual (English default, Portuguese switchable) via a from-scratch dictionary system, and the interface language is independent from the song language — songs are always written and sung in Brazilian Portuguese, since that's what the genres in the style picker actually are.

---

## Stack

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

## Engineering decisions worth calling out

**Hybrid production: the robot goes first, a human is never far.** Songs are generated automatically through a job queue. If the provider fails — timeout, bad response, rate limit — the order silently drops into a manual-handling queue. The customer never sees the internal state; the order page just says "in production" until the song genuinely exists, whether a robot or a person made it happen.

**A race condition fixed with an atomic UPDATE, not a mutex.** Two concurrent calls to finalize the same job (e.g. two open tabs polling at once) used to insert duplicate tracks. The fix was turning "finalize this job" into a conditional `UPDATE ... WHERE status IN ('queued','running')`, which Postgres already serializes on its own — only the first caller to flip the status wins, the second sees zero rows affected and backs off.

**The charged amount never comes from the client.** At one point the payment route read the transaction amount from the payload the browser sent, falling back to the database value only if that field was missing. A tampered payload could pay a few cents for an order worth many times more. The fix: the server computes the price from the order row and uses *only* that to create the Stripe PaymentIntent — the client can send an `orderId` and nothing else, and adversarial testing confirms a spoofed amount field is silently ignored.

**Streamed lyrics, not a batch.** The two lyric versions used to come back from one blocking call. They're now generated in parallel from two differently-angled prompts and streamed to the client as NDJSON — the first version reaches the screen well before the second finishes, instead of the user staring at a spinner for both.

**Every music genre gets its own voice.** Early on, picking a style only changed the instrumentation tag sent to the audio engine — the lyrics themselves came out structurally identical whether the genre was forró, rap, or a lullaby. The fix was giving each of the 14 styles its own guidance on vocabulary, verse length, rhyme density and imagery, injected directly into the LLM's system prompt.

**i18n with no route prefix.** The interface language lives in a cookie, not the URL, so no `/order/<token>` link already handed to a customer ever breaks when the default language changes. The dictionary itself is two files (Portuguese as the source of truth, English as a parallel object) — `type Dict = typeof pt` means TypeScript's compiler refuses to build if the English file is missing a key the Portuguese one has.

**Payment invariants enforced twice.** Whether an order counts as "paid" is decided by a single shared predicate (`isPaidOrBeyond`), checked both by the endpoint that releases the finished song *and* independently inside the production-start function itself — so a future code path that forgets the check still can't ship a song for an order that was never actually paid for.

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

Built solo by [@merino626](https://github.com/merino626).
