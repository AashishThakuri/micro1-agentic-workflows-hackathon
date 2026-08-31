# Ocular backend

This folder contains Ocular's deterministic subject-aware renderer. The web route in `frontend/app/api/lesson/route.ts` asks Gemini for a typed lesson plan; this service turns eligible scenes into verified animated media with Manim and subject libraries.

Local credentials also belong in this folder:

1. Copy `.env.example` to `.env`.
2. Add a Gemini API key.
3. Never commit `.env`; it is ignored by Git.

The local frontend runtime reads this server-only environment file through `vite.config.ts`. Browser code cannot access the key.

Run tests with:

```bash
uv sync
uv run pytest -q
```

Run only the renderer service with:

```bash
uv run python server.py
```

The combined `pnpm dev` command in `frontend/` starts both the renderer and the web application.
