# Ocular

Ocular turns a topic, note, or PDF into an interactive visual lesson that learners can see, hear, manipulate, and question. Instead of answering a learner's doubt with another block of text, Ocular is intended to adapt the visual explanation around the exact point of confusion.

## Current status

The homepage and first lesson studio are working. A learner can provide a topic, notes, or a PDF; generate an adaptive scene sequence; hear narration; select visual ideas; and ask Ocular to rebuild only the scene that is unclear.

## Project structure

- `frontend/` - React, TypeScript, Tailwind CSS, shadcn-compatible components, and the Ocular web experience.
- `backend/` - local server configuration and the future home of source ingestion, retrieval, and evaluation services.
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

Ocular's visual direction uses sparse hand-drawn explanations: one cognitive action per scene, original physical metaphors, minimal annotation, and motion only when motion makes a relationship clearer. This direction is informed by the MIT-licensed [Ian Xiaohei Illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations) project; Ocular generates original compositions rather than copying its sample images.

This README is intentionally brief while the product is in its foundation stage. Reproduction, evaluation, architecture, and complete product documentation will be added as the working system is built.
