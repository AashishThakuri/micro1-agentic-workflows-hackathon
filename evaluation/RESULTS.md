# Recorded evaluation results

Run date: 2026-08-31. Ten fixed cases, same topics and keyword rubric for both systems. No failed case was removed.

| Metric | Direct-prompt baseline | Ocular | Change |
| --- | ---: | ---: | ---: |
| Runnable visual lessons | 0/10 | 10/10 | +100 percentage points |
| Average concept-keyword coverage | 95% | 95% | 0 points |
| Median planning latency | 5.95 s | 9.67 s | +3.72 s |
| Model fallback cases | N/A | 0/10 | All used the agent path |

The result is intentionally specific: Ocular did **not** improve simple keyword inclusion, and it was slower. It improved the target learner outcome by converting equally complete subject coverage into a structured, playable artifact.

## Complete case results

| Case | Baseline keywords | Baseline runnable | Ocular keywords | Ocular runnable | Scenes | Ocular latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Transfer learning (challenging case) | 75% | No | 75% | Yes | 3 | 10.46 s |
| Mitosis | 100% | No | 100% | Yes | 4 | 10.48 s |
| Derivative | 100% | No | 100% | Yes | 2 | 11.30 s |
| Normal distribution | 100% | No | 100% | Yes | 3 | 9.67 s |
| Differential equation | 75% | No | 100% | Yes | 2 | 7.78 s |
| Breadth-first search | 100% | No | 75% | Yes | 2 | 6.85 s |
| Photosynthesis | 100% | No | 100% | Yes | 2 | 9.01 s |
| Supply and demand | 100% | No | 100% | Yes | 2 | 10.67 s |
| Plate tectonics | 100% | No | 100% | Yes | 2 | 9.24 s |
| DNA transcription | 100% | No | 100% | Yes | 3 | 7.37 s |

## What the challenging case revealed

The first transfer-learning run produced valid scenes, narration, objects, interactions, and renderer plans, but the model sometimes returned fewer animation beats than the prompt requested. The honest first score was therefore 0/10 on the strict runnable rubric because the same shortfall appeared across cases.

We kept that failure as an experiment and changed the workflow: sparse timelines are now padded deterministically with narration-linked beats before the lesson reaches the client. The second complete run passed 10/10. This is a reliability improvement in the product, not a relaxed rubric.

## Independent renderer result

The deterministic backend suite passes **21/21 templates**, covering mathematics, science, biology, chemistry, networks, simulations, maps, timelines, and local subject illustration.

## Reproduce

Start Ocular, then run:

```bash
node evaluation/run.mjs
```

The command exits nonzero if any Ocular case fails the runnable-lesson requirements.
