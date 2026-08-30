# Ocular backend

Ocular's first server-side workflow lives in the frontend's Next-compatible API route at `frontend/app/api/lesson/route.ts`. It accepts topics, notes, and small PDFs, then asks Gemini for a structured visual lesson plan.

Local credentials belong in this folder:

1. Copy `.env.example` to `.env`.
2. Add a Gemini API key.
3. Never commit `.env`; it is ignored by Git.

The local frontend runtime reads this server-only environment file through `vite.config.ts`. Browser code cannot access the key. Future ingestion, retrieval, narration, and evaluation services can move into this backend as their contracts stabilize.
