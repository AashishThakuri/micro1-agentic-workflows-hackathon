# Evaluation

## Primary metric

**Runnable visual lesson completion** is the percentage of fixed cases that produce:

1. at least two scenes;
2. meaningful narration in every scene;
3. at least two selectable visual objects per scene;
4. at least four synchronized animation beats per scene;
5. a direct manipulation per scene; and
6. a valid renderer engine and template per scene.

This reflects the learner's actual outcome. A fluent paragraph is useful, but it is not the interactive visual lesson Ocular promises.

## Fair baseline

The baseline is one direct prompt to the selected provider: `Explain this clearly to a beginner: <case>`. It receives the same topic and keyword rubric as Ocular, but no typed schema, renderer, narration workflow, interaction contract, verification, or clarification agent. The frozen submitted artifact used Gemini; new runs may use OpenAI or Gemini, but baseline and Ocular always use the same selected provider.

The comparison reports the baseline's advantage in latency instead of hiding it. Both systems are scored for concept-keyword coverage, but only a complete playable artifact can pass the primary metric.

## Cases

Ten fixed cases span machine learning, biology, calculus, statistics, differential equations, computing, environmental science, economics, geology, and genetics. Transfer learning is the challenging case because a good result must explain reuse, freezing, fine-tuning, small-data value, and domain mismatch.

## Run

Start Ocular locally, then from the repository root:

```bash
node evaluation/run.mjs --output evaluation/artifacts/reproduction.json
```

Environment variables:

- `GEMINI_API_KEY` - optional override; otherwise loaded from `backend/.env`.
- `OPENAI_API_KEY` - optional official OpenAI key; otherwise loaded from `backend/.env`.
- `OPENAI_MODEL` - optional OpenAI text model; defaults to `gpt-5.2`.
- `OCULAR_AI_PROVIDER` - `openai`, `gemini`, or `auto`; `auto` prefers OpenAI when both keys exist.
- `OCULAR_URL` - optional application origin; defaults to `http://localhost:3000`.

The harness prints every case, saves the complete baseline text and Ocular lesson output, and does not discard failures. A nonzero exit code means at least one Ocular case failed the runnable-lesson rubric.

Recompute the submitted scores directly from the frozen raw outputs:

```bash
node evaluation/verify.mjs evaluation/artifacts/run-2026-08-31.json
```

This verifier requires no API key. It recomputes keyword coverage and every runnable-lesson structure check, compares the result with the embedded summary, and exits nonzero on a mismatch.

## Limitations

- Keyword coverage is a transparent proxy for concept inclusion, not a test of student learning.
- The same model family may be used by baseline and solution, so the evaluation measures workflow quality rather than provider quality.
- Renderer correctness is tested separately by the 21-template backend suite.
- A future study should measure learner recall and misconception correction with human participants.
