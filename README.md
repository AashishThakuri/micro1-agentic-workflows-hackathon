# Ocular

Ocular turns a topic, rough notes, or a PDF into a narrated visual lesson that a learner can play, manipulate, and question. When a scene is unclear, Ocular creates a focused follow-up scene instead of replying with another wall of text.

## The problem

Learners regularly leave AI chats with a plausible explanation but no reliable mental model. The information is present, yet relationships such as flow, transformation, scale, and cause remain difficult to see. Creating a useful animation manually takes subject knowledge, scripting, illustration, narration, and editing, so most learners never receive one.

Ocular is for students and self-directed learners who need to understand a mechanism, not merely receive an answer.

## The agentic solution

One source moves through a purposeful workflow:

1. **Lesson Director** identifies the essential ideas and produces a typed scene plan.
2. **Visual routing** selects a deterministic subject renderer such as Manim, RDKit, NetworkX, SimPy, scientific plotting, biology, astronomy, geography, or local illustration.
3. **Verification** validates scene structure and rendering contracts before playback.
4. **Narration** gives each scene a consistent Kore voice and synchronizes visual beats to spoken cues.
5. **Clarification Agent** turns a learner's exact doubt into a new, simpler follow-up scene while preserving the original lesson.

The final learner experience is a single full-screen studio with source controls, playback, direct manipulation, subtitles, and scene-level questioning.

## Transfer-learning demo

Use this fixed evaluation prompt:

> Explain transfer learning to a beginner. Show how a neural network trained to recognize everyday objects can reuse learned visual features to classify plant diseases with only a small labeled dataset. Contrast freezing the feature extractor with fine-tuning, and explain when transfer learning helps or fails.

The expected lesson covers a reusable base model, knowledge transfer, frozen features, fine-tuning, and the limits of reuse when the source and target domains differ.

## Measured improvement

The primary metric is **runnable visual lesson completion**: the same case must produce structured scenes, narration, selectable visual objects, synchronized animation beats, a direct manipulation, and a renderer plan.

The repository includes a ten-case evaluation harness. It compares a one-prompt prose baseline with the complete Ocular workflow on the same topics, records latency and concept coverage, and checks every runnable-lesson requirement without hiding failures. The recorded run produced **0/10 runnable lessons for the baseline and 10/10 for Ocular**, with equal 95% average keyword coverage; Ocular's richer artifact added 3.72 seconds to median planning latency.

Run it with:

```bash
node evaluation/run.mjs
```

See [evaluation/README.md](evaluation/README.md) for the rubric and [evaluation/RESULTS.md](evaluation/RESULTS.md) for the recorded run.

Renderer verification is independent of the model evaluation:

```bash
cd backend
uv sync
uv run pytest -q
```

The current deterministic renderer suite covers 21 templates.

## Run from a clean environment

Requirements:

- Node.js 22.13 or newer
- pnpm 9 or newer
- Python 3.12
- uv
- FFmpeg and the system libraries required by Manim
- A Gemini API key

Setup:

```bash
git clone https://github.com/AashishThakuri/micro1-agentic-workflows-hackathon.git
cd micro1-agentic-workflows-hackathon
copy backend\.env.example backend\.env
```

Add `GEMINI_API_KEY` to `backend/.env`, then:

```bash
cd backend
uv sync
cd ..\frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The combined development command starts both the web app and the local precision renderer.

Expected first startup is several minutes because scientific and animation dependencies are installed. A typical lesson plan takes roughly 8 to 20 seconds before rendering and narration, depending on model availability and source length. Gemini usage and cost depend on the account and selected models; the project makes one lesson-planning request, renderer requests only for precision scenes, and narration requests when scenes are played.

## Reproduce the baseline and evaluation

1. Keep the application running at `http://localhost:3000`.
2. Confirm `backend/.env` contains `GEMINI_API_KEY`.
3. From the repository root, run `node evaluation/run.mjs`.
4. The harness uses all ten fixed cases for both systems.
5. It prints every case, including failures, plus aggregate completion, keyword coverage, and latency.

The baseline uses one direct Gemini prompt with basic instructions and no tools. Ocular receives the same case and may use its structured planning, verification, narration, interaction, and rendering workflow. This deliberately exposes the tradeoff: the baseline is faster, while Ocular is evaluated on whether it returns the richer result the learner can actually use.

## Submission evidence

- [Improvement changelog](IMPROVEMENT_CHANGELOG.md)
- [Evaluation rubric and cases](evaluation/README.md)
- [Recorded evaluation results](evaluation/RESULTS.md)
- [Agent trajectories](traces/README.md)
- [Five-minute video script](docs/VIDEO_SCRIPT.md)

## Project structure

- `frontend/` - Vinext, React, TypeScript, the Ocular experience, Gemini routes, and hosted-site configuration.
- `backend/` - FastAPI precision renderer, Manim and subject libraries, generated-media service, and tests.
- `evaluation/` - fixed cases, baseline comparison, executable rubric, and results.
- `traces/` - sanitized representative trajectories for every agent in the product.
- `docs/` - submission and video materials.

## Safety and privacy

- Credentials and `.env` files are ignored by Git.
- The browser never receives the Gemini key.
- Internet image fetching was removed; subject visuals are generated locally.
- Mathematical expressions are parsed through a restricted expression grammar.
- Ocular explains and teaches. It does not perform consequential actions on a learner's behalf.

## Main failure mode and hot take

The most important failure was generic visual confidence: an attractive diagram could still be wrong for the subject. The fix was not a larger prompt. It was to route typed scene plans into deterministic subject renderers and verify them before playback.

**Hot take:** a polished text answer is often the wrong success metric for an educational agent. Reliability improves when the model plans a constrained artifact and deterministic tools make the relationships visible.

## License

Hackathon submission by Aashish Thakuri. Third-party dependencies retain their respective licenses.
