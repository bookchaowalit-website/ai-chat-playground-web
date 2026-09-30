# Upgrade plan

## Current state: 7/10 (was 5/10)

Compare flow works when keys are set and is now bounded against cost abuse;
validated, tested, and covered by CI.

## Backlog

### P0
- Verify the default model ids are still served by each provider and set the
  `*_MODEL_ID` overrides in Vercel for any that are retired (no network
  check was possible in this pass).

### P1
- Durable rate limiting (Vercel KV / Upstash) instead of per-instance memory.
- Stream responses per lane (`streamText`) so slow models do not block others.
- Confirm canonical domain; set `NEXT_PUBLIC_SITE_URL`.

### P2
- Copy-to-clipboard per lane and token/latency summary row.
- Remove the `dangerouslySetInnerHTML` design-contract comment span.

## Done in this pass
- `lib/compare.ts`: request validation (prompt length, known/deduped model
  ids), rate limiter, error truncation; route adds output-token cap, timeout,
  retry cap, JSON parse guard. Unit-tested.
- Per-provider model id overrides via env (`lib/models.ts`), tested.
- Replaced stub `/api/mcp` with read-only `list_models`.
- CI (lint, typecheck, test, build); fixed lint errors; replaced
  create-next-app README; OG/Twitter metadata; robots/sitemap in-app.
- a11y: prompt counter linked to textarea, live status for comparisons.
