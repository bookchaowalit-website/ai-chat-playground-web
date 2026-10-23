# Model Bench (chat playground) — Product truth

> Inferred from the code and copy (no user interview). Checked against the portfolio card claims review
> (`portfolio-site-web/docs/audits/CARD-CLAIMS-REVIEW-2026-10.md`, row `chat-playground`) on 2026-10-23.

## What it is

A bench that sends one prompt to up to three hosted model lanes (OpenAI, Anthropic, Google) and shows the answers
side by side. Without the access token it runs in demo mode and returns labelled sample text.

## Who it is for

The owner (live mode, with `COMPARE_ACCESS_TOKEN`) and portfolio visitors (demo mode) who want to see the same prompt
answered by different providers.

## What works today

1. Pick lanes, type a prompt (up to 4,000 characters, invisible-only prompts rejected) or use the sample, and read one
   answer per lane with its time or a truncated error.
2. Lanes are configured only by server env vars (key + model id per provider); an unset, malformed or retired model
   id marks the lane and it is never called.
3. Live calls need `Authorization: Bearer <COMPARE_ACCESS_TOKEN>` (entered on the page, kept in `sessionStorage`);
   everyone else gets demo lanes and no provider is called. Limits: 600 output tokens, 30 s timeout, 10 comparisons
   per client per minute, a fail-closed daily cap (default 500).
4. `/api/mcp` answers JSON-RPC with one read-only tool, `list_models` (lane status); it cannot run prompts.
5. Front-end and server errors go to Sentry (errors only; request data including prompts and the access header, user,
   breadcrumbs, extra context and stack frame variables stripped) when `NEXT_PUBLIC_SENTRY_DSN` is set.

## What does not work (and must not be claimed)

- No open-source or self-hosted models: only the three hosted providers above (claim flagged in the 2026-10 card
  review). No streaming, chat history, accounts or saved comparisons.
- Whether the live deployment has provider keys and an access token set is not verified here; visitors see demo mode.

## Live URL and deploy state

- Live: https://chat-playground.bookchaowalit.com (HTTP 200 on 2026-10-23).
- The Vercel project `bookchaowalit-chat-playground-frontend` is deployed only by CLI. Last production deployment:
  2026-10-23 11:44 ICT, CLI (the CVE patch). This L2 pass is not live yet: Vercel's daily deployment limit was reached
  on 2026-10-23 and the coordinator deploys the latest green `main` later. The Git link names the old repository
  `bookchaowalit/bookchaowalit-chat-playground-frontend`, so a push to `main` does not deploy (owner action D9).
- `NEXT_PUBLIC_SENTRY_DSN` is set on the Vercel project (Sentry project `ai-chat-playground-web`, org
  `personal-yu0`).

## Boundaries

- Stateless apart from the rate-limit counters (per instance, or Upstash/Vercel KV when configured). Prompts are sent
  only to the selected providers and are not stored.
