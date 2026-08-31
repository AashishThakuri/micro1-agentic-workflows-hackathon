# Validation record

Validation date: 2026-08-31. Evaluated workflow commit: `70bf7048f4d2934fd10dff20d884728791e07130`.

| Check | Exact command | Observed output | Result |
| --- | --- | --- | --- |
| Frozen score verification | `node evaluation/verify.mjs evaluation/artifacts/run-2026-08-31.json` | 10 cases; baseline runnable 0; Ocular runnable 10; keyword coverage 95% vs 98%; median latency 4726 ms vs 7398 ms; no fallbacks; `mismatches: []` | Pass |
| Frontend lint | `cd frontend && pnpm lint` | `oxlint`, exit code 0 | Pass |
| Production build | `cd frontend && pnpm build` | Vinext built all five environments; `/`, `/learn`, `/api/lesson`, `/api/lesson/refine`, `/api/render`, `/api/tts`, and `/favicon.ico` were emitted | Pass |
| Renderer suite | `cd backend && uv run pytest -q` | `21 passed, 1 warning in 28.45s` | Pass |

The warning is a Python 3.13 deprecation notice emitted by `pydub`'s use of `audioop`; the tested renderer uses Python 3.12.12, so it does not change the result.

## Current provider and runtime checks

| Check | Observed output | Result |
| --- | --- | --- |
| Landing page | `GET /` returned 200 with rendered content | Pass |
| Learning studio | `GET /learn` returned 200 with rendered content | Pass |
| Renderer health | `GET http://127.0.0.1:8789/health` returned 200 and reported all scientific engines | Pass |
| Lesson Director | `POST /api/lesson` returned 200, `X-Ocular-Provider: gemini`, `X-Ocular-Generation: agent`, and two transfer-learning scenes | Pass |
| Clarification Agent | `POST /api/lesson/refine` returned 200 with provider/model headers and six animation beats | Pass |
| Narration | `POST /api/tts` returned 200, `audio/wav`, and 464,684 bytes | Pass |
| Precision rendering | `POST /api/render` returned 200 and a generated MP4 URL | Pass |
| Missing OpenAI credential | Forced `OCULAR_AI_PROVIDER=openai` with no `OPENAI_API_KEY`; lesson endpoint returned a controlled 503 configuration error | Pass |

The browser verification helper was unavailable on this Windows host, so the validation claim is limited to HTTP/runtime, lint, production build, API evaluation, and renderer-test evidence. No visual browser-test score is claimed.
