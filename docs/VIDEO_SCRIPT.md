# Ocular hackathon video script

Target duration: **4 minutes 45 seconds**. Never exceed five minutes.

## 0:00-0:35 - Problem and user

**Visual:** Full-screen title card, then Ocular landing page. Briefly open and close the navbar without mentioning it.

**Narration:**

Most AI tutors can produce a confident paragraph in seconds. But when a learner needs to understand a mechanism, the words are often not enough. Relationships such as flow, transformation, scale, and cause remain invisible. Making a good animation manually takes subject knowledge, scripting, illustration, narration, and editing. Ocular is for students and self-directed learners who need a mental model, not just another answer.

## 0:35-1:02 - Baseline

**Visual:** Clean comparison card showing a one-prompt prose response on the left and the required learner outcome on the right.

**Narration:**

Our fair baseline is one general-purpose model with one direct instruction: explain the topic clearly to a beginner. It is fast and often accurate, but it returns static prose. Across our evaluation, the baseline cannot produce a runnable visual lesson with synchronized scenes, narration, manipulation, and verification. That gap defines the bottleneck Ocular solves.

## 1:02-2:55 - Realistic transfer-learning execution

**Visual:** Click Start Learning, enter the fixed transfer-learning prompt, submit, show preparation, then play the lesson. Move through the base-model, transfer, and freeze-versus-fine-tune scenes. Demonstrate one direct manipulation.

**Narration:**

Here is the same realistic case used in our evaluation. A learner wants to understand transfer learning: how a model trained on everyday objects can help classify plant diseases from a small labeled dataset.

Ocular's Lesson Director first decomposes the source into one teachable idea per scene. It produces typed narration, selectable subject objects, causal connections, animation cues, an interaction, and a renderer plan. The plan is verified before playback.

The first scene establishes the base model. Early layers learn reusable visual features such as edges, textures, and shapes. The next scene transfers those learned features to the smaller plant dataset. Instead of learning vision from zero, the new classifier begins with a useful visual vocabulary.

The final comparison makes the key decision visible. Freezing preserves the reusable feature extractor and trains only the new task head. Fine-tuning updates some pretrained layers when the target images differ enough to justify adaptation. Transfer learning helps when source and target share useful structure. It can fail when their visual domains are too different or fine-tuning overfits the small dataset.

The learner can pause, seek, change speed, inspect subtitles, and manipulate the mechanism directly. The result is not an illustration attached to an answer. It is an executable lesson.

## 2:55-3:28 - Learner doubt and agent follow-up

**Visual:** Select the feature extractor or enter the question: `Why can early visual features stay frozen, and when would I need to fine-tune them?` Submit and show the appended clarification scene.

**Narration:**

If one relationship is still unclear, the learner asks inside that exact scene. The Clarification Agent receives the current lesson, selected visual focus, and exact doubt. It does not erase the original explanation. It appends a simpler, question-specific scene, verifies it, prepares its voice and visual, and moves the learner directly to the follow-up.

## 3:28-4:05 - Engineering and biggest improvement

**Visual:** Architecture card: source to Lesson Director to typed plan to deterministic renderer and narration to verified lesson.

**Narration:**

The biggest improvement was separating creative planning from deterministic execution. Gemini decides what must be taught. Typed contracts route each scene to Manim, scientific plotting, NetworkX, SimPy, RDKit, biology, astronomy, geography, or local illustration. A strict renderer suite currently passes twenty-one of twenty-one templates. Visuals are prepared before the lesson appears, and failures degrade to usable local diagrams instead of blank output.

## 4:05-4:27 - Removed experiment and hot take

**Visual:** Changelog card highlighting the removed internet-image experiment.

**Narration:**

We also removed an experiment. Internet images made subjects recognizable, but they were inconsistent, hard to reproduce, and often showed a topic without explaining its mechanism. Our hot take is that a larger prompt is not the cure for unreliable educational visuals. Constrained plans plus specialized tools are.

## 4:27-4:45 - Measured result and close

**Visual:** Final evaluation table and GitHub/reproduction card, then return to the best transfer-learning frame.

**Narration:**

Ten fixed cases compare the direct-prompt baseline with Ocular on the same rubric. Keyword coverage was equal at ninety-five percent. The baseline produced zero runnable visual lessons; Ocular produced ten. That richer artifact added about four seconds of median planning time. The repository includes every result, the improvement changelog, exact setup commands, and sanitized trajectories for both agents. Ocular turns source material into understanding a learner can see, hear, test, and question.
