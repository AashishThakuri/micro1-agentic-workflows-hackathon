# Ocular

Ocular turns a topic, note, or PDF into an interactive visual lesson that learners can see, hear, manipulate, and question. Instead of answering a learner's doubt with another block of text, Ocular is intended to adapt the visual explanation around the exact point of confusion.

## Current status

This first public version contains the responsive Ocular homepage and establishes the project structure. The lesson-generation workflow and backend services are planned but not implemented yet.

## Project structure

- `frontend/` - React, TypeScript, Tailwind CSS, shadcn-compatible components, and the Ocular web experience.
- `backend/` - reserved for source ingestion, lesson planning, adaptive explanation services, and evaluation APIs.
- `IMPROVEMENT_CHANGELOG.md` - an evidence-oriented record of the project's baseline and later iterations.

## Run the frontend

Requirements: Node.js 22.13 or newer and pnpm.

```bash
cd frontend
pnpm install
pnpm dev
```

Then open `http://localhost:3000`.

## Product direction

The intended workflow is simple: provide learning material, generate a narrated and explorable lesson, ask questions directly in context, and let the lesson update its visuals rather than restarting as a generic chat response.

This README is intentionally brief while the product is in its foundation stage. Reproduction, evaluation, architecture, and complete product documentation will be added as the working system is built.
