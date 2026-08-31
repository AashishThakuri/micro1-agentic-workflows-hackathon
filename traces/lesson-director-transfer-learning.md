# Lesson Director trajectory: transfer learning

## Agent instruction

Turn the learner's source into a complete scene-by-scene visual lesson. Teach one idea per scene, map meaningful narration phrases to animation beats, choose a direct manipulation, and select a deterministic renderer through a typed `renderSpec`. Do not fetch internet images.

## Learner input

Explain transfer learning to a beginner using an everyday-object model reused for plant-disease classification. Contrast frozen features with fine-tuning and explain when reuse helps or fails.

## Representative trajectory

| Step | Agent or tool action | Observable result | Next decision |
| --- | --- | --- | --- |
| 1 | Lesson Director reads the topic and typed scene schema. | Identifies feature extraction, knowledge reuse, freezing, fine-tuning, and domain mismatch as required concepts. | Split the mechanism and strategy comparison into separate scenes. |
| 2 | `gemini-3.1-flash-lite` structured generation receives the source, visual language, renderer grammar, and JSON schema. | HTTP 200 with `Transfer Learning Explained` and two scenes: `The Pre-trained Feature Extractor` and `Transferring Knowledge`. | Validate and normalize every scene. |
| 3 | Scene normalization checks indexes, animation beats, interaction bounds, and renderer fields. | Each scene has narration, visual objects, animation cues, an interaction, and a renderer plan. | Route network scenes to the local precision renderer. |
| 4 | Renderer tool receives the typed scene plan. | Network scenes are converted into deterministic animated video; illustration scenes retain the prepared local visual fallback if precision rendering is unnecessary or unavailable. | Prepare all required visuals before exposing the lesson. |
| 5 | Narration tool receives one scene title and exact narration at a time. | `gemini-3.1-flash-tts-preview` with the `Kore` voice returns WAV audio; requests are serialized to respect quota. | Cache scene audio and synchronize playback progress to subtitles and animation. |
| 6 | Playback verification checks prepared scene status. | The lesson becomes playable with pause, seek, speed, next/previous, subtitles, and direct manipulation. | Present the lesson to the learner. |

## Retry and fallback behavior

- Invalid structured JSON is repaired or retried against the fallback model list.
- A model 429 or 503 tries another configured text model; if generation still fails, Ocular returns one honest local fallback scene rather than a blank screen.
- Precision-renderer failure is shown as a prepared local diagram instead of blocking the lesson.
- Narration 429 responses provide retry timing and never expose the API key.

## Human checkpoint

The learner controls playback and can select any visual object or write an exact doubt. Ocular does not alter the original lesson until the learner explicitly submits that question.

## Final result

A two-scene transfer-learning lesson with typed evidence for every stage: structured plan, renderer selection, visual objects, animation beats, direct manipulation, narration, and playback controls. The complete raw response is stored in `evaluation/artifacts/run-2026-08-31.json`.
