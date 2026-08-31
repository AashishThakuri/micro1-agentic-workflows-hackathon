# Clarification Agent trajectory: transfer learning

## Agent instruction

Create one follow-up clarification scene for the learner's exact doubt. Do not rewrite or summarize the original scene. Use a simpler visual model, demonstrate the answer, create a meaningful manipulation, and begin directly with the explanation because Ocular adds its own spoken transition.

## Human checkpoint and input

The learner selects the feature-extractor scene and asks:

> Why can early visual features stay frozen, and when would I need to fine-tune them?

No action occurs until the learner submits this question.

## Representative trajectory

| Step | Agent or tool action | Observable result | Next decision |
| --- | --- | --- | --- |
| 1 | Ocular captures the selected scene, selected visual object, and exact doubt. | The original transfer-learning lesson remains unchanged. | Ask the Clarification Agent for one appended scene. |
| 2 | `gemini-3.1-flash-lite` structured generation receives the lesson title, current scene, question, schema, and renderer grammar. | Returns a simpler comparison focused only on frozen reusable edges/textures versus updated task-specific layers. | Normalize and validate the follow-up. |
| 3 | Ocular adds a spoken transition that names the learner's focus. | The clarification begins naturally without changing the agent's factual content. | Generate audio and render the new scene. |
| 4 | `gemini-3.1-flash-tts-preview` with the `Kore` voice and the selected local renderer prepare the follow-up. | Audio duration, synchronized beats, renderer status, and direct manipulation are ready before navigation. | Append the scene and move playback to it. |
| 5 | Lesson state appends the validated scene. | The learner can compare the original explanation with the new clarification; neither is lost. | Return control to the learner. |

## Retry behavior

- Generation failure preserves the lesson and shows a retryable message.
- Renderer failure does not delete the original scene. A temporary narration failure no longer blocks the valid follow-up; audio is deferred until quota returns.
- The follow-up is appended only after its required assets are prepared.

## Final result

One additional, question-specific scene at the end of the lesson, with the original learning history preserved.
