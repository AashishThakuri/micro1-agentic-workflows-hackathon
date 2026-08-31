# Improvement changelog

Every stage used the same target: convert a learner's source into a lesson they can see, hear, manipulate, and question.

| Stage | What we tried and why | Evidence | Decision / learning |
| --- | --- | --- | --- |
| Baseline | A responsive landing page and a one-prompt prose explanation. This established the simplest experience available before the agent workflow. | The landing page built successfully, but it produced no lesson, animation, narration, interaction, or follow-up. Runnable lesson completion: 0%. | Keep the visual identity. Replace the text-answer baseline with one narrow end-to-end learning workflow. |
| Iteration 1 | Added a structured lesson-planning agent with typed scenes so one source could become multiple teachable steps. | Topics, notes, and PDFs returned scene titles, narration, visual elements, connections, and interactions. Early visuals still resembled generic labeled boxes. | Keep typed planning. Improve the renderer rather than expanding the prompt alone. |
| Iteration 2 | Added browser-native animation, scene controls, synchronized subtitles, and Gemini narration. | The learner could play, pause, seek, change speed, manipulate a scene, and hear a consistent voice. Generic drawings still lacked subject fidelity. | Keep the interaction and playback model. Add subject-aware tools. |
| Removed experiment | Fetched internet images as supporting visual material. The goal was fast subject recognition. | External assets were inconsistent, introduced provenance and availability risk, and often illustrated a topic without demonstrating its mechanism. | Removed all internet image fetching. Generate every educational visual locally. |
| Iteration 3 | Routed typed scene plans into deterministic subject renderers: Manim, SymPy, SciPy, NetworkX, SimPy, RDKit, Astropy, Biopython, GeoPandas, Shapely, and local illustration. | Strict renderer suite passed 21 of 21 templates. Mitosis produced chromosomes, spindle fibers, separation, and daughter cells. Heart scenes produced chambers and blood flow. | Keep model creativity at the planning layer and deterministic tools at the execution layer. |
| Iteration 4 | Pre-rendered precision scenes before exposing the lesson, removed repeated video seeking, and added explicit renderer fallback. | Production build and lint passed. The lesson no longer flickered between incomplete states, and renderer outages degraded to prepared diagrams instead of blank output. | Keep verification before playback. Make partial failure visible but usable. |
| Iteration 5 | Changed clarification from destructive scene replacement to an appended follow-up scene based on the learner's exact doubt. | The original explanation remains available, narration introduces the clarification, and the new scene is rendered and voiced before playback. | Preserve learning history. A doubt should deepen the lesson, not erase it. |
| Final resilience check | Tested clarification while the narration quota was cooling down. The valid follow-up was incorrectly blocked by an unrelated audio failure. | Clarification now appends and renders even when voice is temporarily unavailable, with narration deferred until quota returns. | Keep independent tools independent: a voice outage must not discard valid teaching work. |
| Final | Combined full-screen authoring, structured planning, deterministic rendering, synchronized voice, direct manipulation, verification, and follow-up generation. | Ten fixed evaluation cases compare the direct-prompt baseline with Ocular. The complete results are stored in `evaluation/RESULTS.md`; renderer tests remain 21/21. | The main contribution is the verified handoff from creative agent planning to deterministic visual execution. |

## Main failure mode

A generic diagram can look convincing while teaching the wrong mechanism. This appeared in early cell and anatomy lessons where correct subject labels were paired with vague geometry.

## Hot take

Do not ask an educational agent to be the illustrator, animator, narrator, and verifier at once. Let the model decide what must be taught, then make typed plans executable by specialized deterministic tools. The constraint is what makes the creativity dependable.
