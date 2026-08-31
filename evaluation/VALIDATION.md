# Validation record

Validation date: 2026-08-31. Evaluated workflow commit: `70bf7048f4d2934fd10dff20d884728791e07130`.

| Check | Exact command | Observed output | Result |
| --- | --- | --- | --- |
| Frozen score verification | `node evaluation/verify.mjs evaluation/artifacts/run-2026-08-31.json` | 10 cases; baseline runnable 0; Ocular runnable 10; keyword coverage 95% vs 98%; median latency 4726 ms vs 7398 ms; no fallbacks; `mismatches: []` | Pass |
| Frontend lint | `cd frontend && pnpm lint` | `oxlint`, exit code 0 | Pass |
| Production build | `cd frontend && pnpm build` | Vinext built all five environments; `/`, `/learn`, `/api/lesson`, `/api/lesson/refine`, `/api/render`, `/api/tts`, and `/favicon.ico` were emitted | Pass |
| Renderer suite | `cd backend && uv run pytest -q` | `21 passed, 1 warning in 28.45s` | Pass |

The warning is a Python 3.13 deprecation notice emitted by `pydub`'s use of `audioop`; the tested renderer uses Python 3.12.12, so it does not change the result.

The browser verification helper was unavailable on this Windows host, so the validation claim is limited to HTTP/runtime, lint, production build, API evaluation, and renderer-test evidence. No visual browser-test score is claimed.
