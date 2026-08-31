# Recorded evaluation results

Run date: 2026-08-31. Ten fixed cases, same topics and keyword rubric for both systems. No failed case was removed. The source of truth is the complete raw artifact at [`artifacts/run-2026-08-31.json`](artifacts/run-2026-08-31.json), produced from the workflow at code commit `70bf7048f4d2934fd10dff20d884728791e07130`.

| Metric | Direct-prompt baseline | Ocular | Change |
| --- | ---: | ---: | ---: |
| Runnable visual lessons | 0/10 | 10/10 | +100 percentage points |
| Average concept-keyword coverage | 95% | 98% | +3 points |
| Median planning latency | 4.73 s | 7.40 s | +2.67 s |
| Model fallback cases | N/A | 0/10 | All used the agent path |

The result is intentionally specific: Ocular improved keyword inclusion by only three points and was slower. Its meaningful improvement was the target learner outcome: converting subject coverage into a structured, playable artifact.

## Complete case results

| Case | Baseline keywords | Baseline runnable | Ocular keywords | Ocular runnable | Scenes | Ocular latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Transfer learning (challenging case) | 100% | No | 100% | Yes | 2 | 6.06 s |
| Mitosis | 100% | No | 100% | Yes | 2 | 5.81 s |
| Derivative | 75% | No | 100% | Yes | 2 | 7.61 s |
| Normal distribution | 100% | No | 100% | Yes | 2 | 8.14 s |
| Differential equation | 75% | No | 100% | Yes | 2 | 8.95 s |
| Breadth-first search | 100% | No | 75% | Yes | 2 | 7.06 s |
| Photosynthesis | 100% | No | 100% | Yes | 2 | 7.19 s |
| Supply and demand | 100% | No | 100% | Yes | 2 | 7.60 s |
| Plate tectonics | 100% | No | 100% | Yes | 2 | 7.20 s |
| DNA transcription | 100% | No | 100% | Yes | 2 | 8.13 s |

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
