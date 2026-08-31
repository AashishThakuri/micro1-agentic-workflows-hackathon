# Recorded evaluation results

Run date: 2026-08-31. Ten fixed cases, same learner-facing visual-lesson task, topics, Gemini model family, and computed rubric for both systems. No failed case was removed and baseline runnability is not hard-coded. The source of truth is the complete raw artifact at [`artifacts/run-2026-08-31.json`](artifacts/run-2026-08-31.json), produced from the workflow at code commit `f713cff8d3ec20050d829921e336853797639b3b`.

| Metric | Direct-prompt baseline | Ocular | Change |
| --- | ---: | ---: | ---: |
| Runnable visual lessons | 0/10 | 10/10 | +100 percentage points |
| Average concept-keyword coverage | 98% | 98% | No difference |
| Median planning latency | 4.02 s | 7.07 s | +3.05 s |
| Model fallback cases | N/A | 0/10 | All used the agent path |
| Submitted API cost | $0 | $0 | Gemini free tier |

The result is intentionally specific: both systems covered the concepts equally well and the direct response was faster. Ocular's improvement was the target learner outcome: converting the same subject coverage into a structured, playable artifact.

## Complete case results

| Case | Baseline keywords | Baseline runnable | Ocular keywords | Ocular runnable | Scenes | Ocular latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Transfer learning (challenging case) | 100% | No | 100% | Yes | 2 | 10.70 s |
| Mitosis | 100% | No | 100% | Yes | 2 | 7.09 s |
| Derivative | 100% | No | 100% | Yes | 2 | 9.78 s |
| Normal distribution | 100% | No | 100% | Yes | 3 | 7.82 s |
| Differential equation | 75% | No | 75% | Yes | 2 | 6.10 s |
| Breadth-first search | 100% | No | 100% | Yes | 2 | 6.47 s |
| Photosynthesis | 100% | No | 100% | Yes | 2 | 6.56 s |
| Supply and demand | 100% | No | 100% | Yes | 2 | 7.05 s |
| Plate tectonics | 100% | No | 100% | Yes | 2 | 6.86 s |
| DNA transcription | 100% | No | 100% | Yes | 2 | 10.50 s |

## Models and cost

- Baseline and Ocular planning: `gemini-3.1-flash-lite`.
- Narration: `gemini-3.1-flash-tts-preview`, `Kore` voice.
- Submitted billing tier: Gemini free tier.
- Recorded API cost: `$0`.
- Local deterministic rendering: no external generation API charge.

## What the challenging case revealed

The first transfer-learning run produced valid scenes, narration, objects, interactions, and renderer plans, but the model sometimes returned fewer animation beats than the prompt requested. The honest first score was therefore 0/10 on the strict runnable rubric because the same shortfall appeared across cases.

We documented that failure in the improvement changelog and changed the workflow: sparse timelines are now padded deterministically with narration-linked beats before the lesson reaches the client.

The later reproducibility audit found a second real failure: one differential-equation response contained only one scene, producing 9/10. That complete failed run is preserved at [`artifacts/failed-run-2026-08-31-before-minimum-scene-check.json`](artifacts/failed-run-2026-08-31-before-minimum-scene-check.json). Ocular now rejects and retries model output that violates the two-scene contract, while the local fallback also produces two complementary scenes. The same ten cases then passed 10/10 without relaxing the rubric.

## Independent renderer result

The deterministic backend suite passes **21/21 templates**, covering mathematics, science, biology, chemistry, networks, simulations, maps, timelines, and local subject illustration.

## Reproduce

Start Ocular, then run:

```bash
node evaluation/run.mjs --output evaluation/artifacts/reproduction.json
```

The command exits nonzero if any Ocular case fails the runnable-lesson requirements.

To rescore the submitted raw outputs without an API key:

```bash
node evaluation/verify.mjs evaluation/artifacts/run-2026-08-31.json
```
