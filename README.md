# Model Bench — chat playground

Send one prompt to several configured AI models and read the answers in
parallel lanes. Provider keys live only in the deployment environment; models
without a key are shown as "needs key" and are never called.

## Configuration (server-side env vars)
| Provider | Key | Model id (required) |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL_ID` |
| Anthropic | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL_ID` |
| Google | `GOOGLE_GENERATIVE_AI_API_KEY` | `GOOGLE_MODEL_ID` |

A lane runs only when **both** its key and its model id are set. There are no
built-in default model ids (providers retire them); an unset, malformed, or
known-retired id (e.g. `claude-3-5-*`, `gemini-1.5-*`) marks the lane
"needs model id" / "invalid model id" with the reason, and it is never called.
`GET /api/compare` and the MCP `list_models` tool report each lane's status.

`NEXT_PUBLIC_SITE_URL` overrides the canonical origin used in metadata,
`robots.txt`, and `sitemap.xml`.

## Limits on `POST /api/compare`
- Prompt ≤ 4,000 characters, only known lane ids (`openai`, `anthropic`, `google`), duplicates removed.
- ≤ 600 output tokens per model, 30 s timeout, 1 retry.
- Best-effort in-memory rate limit: 10 comparisons per client per minute
  (per server instance).
- Provider error messages are truncated before being returned.

`/api/mcp` exposes a read-only `list_models` tool (no prompt execution).

## Run
```bash
npm ci
npm run dev
```

## Checks (same as CI)
```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Related
- **Mobile App:** [bookchaowalit-chat-playground-mobile](https://github.com/bookchaowalit-mobile/bookchaowalit-chat-playground-mobile)
- **Portfolio:** [bookchaowalit.com](https://bookchaowalit.com)
