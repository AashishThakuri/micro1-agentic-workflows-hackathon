# Ocular backend

This folder contains Ocular's deterministic subject-aware renderer. The web route in `frontend/app/api/lesson/route.ts` asks the configured OpenAI or Gemini provider for a typed lesson plan; this service turns eligible scenes into verified animated media with Manim and subject libraries.

Local credentials also belong in this folder:

1. Copy `.env.example` to `.env`.
2. Add a Gemini API key for the submitted workflow. An official OpenAI API key is optional.
3. Never commit `.env`; it is ignored by Git.

The tested workflow uses `gemini-3.1-flash-lite` for lesson planning and clarification, and `gemini-3.1-flash-tts-preview` with the `Kore` voice for narration. The submitted run used the Gemini free tier and had `$0` billed API cost. OpenAI is retained as an optional provider for judges who supply their own key; no OpenAI key was used or committed.

The local frontend runtime reads this server-only environment file through `vite.config.ts`. Browser code cannot access the key.

Run tests with:

```bash
uv sync --frozen
uv run pytest -q
```

Run only the renderer service with:

```bash
uv run python server.py
```

The combined `pnpm dev` command in `frontend/` starts both the renderer and the web application.
