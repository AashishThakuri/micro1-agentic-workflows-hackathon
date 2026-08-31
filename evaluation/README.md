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

The baseline is one direct Gemini prompt with basic instructions: `Explain this clearly to a beginner: <case>`. It receives the same topic and keyword rubric as Ocular, but no typed schema, renderer, narration workflow, interaction contract, verification, or clarification agent.

The comparison reports the baseline's advantage in latency instead of hiding it. Both systems are scored for concept-keyword coverage, but only a complete playable artifact can pass the primary metric.

## Cases

Ten fixed cases span machine learning, biology, calculus, statistics, differential equations, computing, environmental science, economics, geology, and genetics. Transfer learning is the challenging case because a good result must explain reuse, freezing, fine-tuning, small-data value, and domain mismatch.

## Run

Start Ocular locally, then from the repository root:

```bash
node evaluation/run.mjs
```

Environment variables:

- `GEMINI_API_KEY` - optional override; otherwise loaded from `backend/.env`.
- `OCULAR_URL` - optional application origin; defaults to `http://localhost:3000`.

The harness prints every case and does not discard failures. A nonzero exit code means at least one Ocular case failed the runnable-lesson rubric.

## Limitations

- Keyword coverage is a transparent proxy for concept inclusion, not a test of student learning.
- The same model family may be used by baseline and solution, so the evaluation measures workflow quality rather than provider quality.
- Renderer correctness is tested separately by the 21-template backend suite.
- A future study should measure learner recall and misconception correction with human participants.
