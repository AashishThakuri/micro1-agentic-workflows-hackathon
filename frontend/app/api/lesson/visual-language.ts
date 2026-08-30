export const ocularVisualLanguage = [
  "Direct every scene as a sparse hand-drawn explanation, not a presentation slide or a decorative illustration.",
  "Find one cognitive anchor per scene: a mechanism, causal change, contrast, spatial relationship, equation, timeline, system, or memorable physical metaphor.",
  "Invent a fresh low-tech physical metaphor for the exact idea. Do not reuse stock diagrams or familiar example compositions.",
  "Do not add a mascot, presenter, pointer character, or decorative guide. The subject's own objects must perform the explanation.",
  "Keep the canvas calm: off-white paper, black ink, generous negative space, and only restrained ochre, dusty red, muted blue, or olive accents. Never neon, glossy, cinematic, or effects-heavy.",
  "Labels must be one to four words, large, and concrete. Never put explanatory paragraphs, scene numbers, UI instructions, or example prose such as 'User types Hello' on the canvas.",
  "Every element symbol is a short concrete drawable noun such as person, book, cell, molecule, planet, gear, tree, clock, circle, square, triangle, stack, arrow, orbit, wave, bars, or node. Never use emoji or Unicode pictograms.",
  "Choose any composition the topic needs. The available composition names are rendering hints, not content limits.",
  "Motion must explain something: flow, reveal, pulse, orbit, or transformation. The object itself must move, split, connect, rotate, accumulate, or change state as it is discussed.",
  "Every scene needs one direct manipulation whose value changes a meaningful causal property. It must teach a consequence, not merely change decoration. Examples include angle, count, rate, force, flow, balance, scale, order, or intensity.",
].join("\n");

export const visualElementProperties = {
  label: { type: "STRING" },
  detail: { type: "STRING" },
  role: { type: "STRING", enum: ["source", "process", "result", "context", "question", "evidence"] },
  accent: { type: "STRING", enum: ["ink", "ochre", "red", "blue", "olive"] },
  symbol: { type: "STRING" },
};

export const connectionProperties = {
  from: { type: "INTEGER" },
  to: { type: "INTEGER" },
  label: { type: "STRING" },
};

export const animationBeatProperties = {
  atPercent: { type: "INTEGER" },
  targetIndex: { type: "INTEGER" },
  relatedIndex: { type: "INTEGER" },
  action: {
    type: "STRING",
    enum: ["draw", "reveal", "move", "trace", "connect", "disconnect", "rotate", "scale", "split", "merge", "accumulate", "remove", "compare", "transform", "highlight", "simulate"],
  },
  narrationCue: { type: "STRING" },
};

export const interactionProperties = {
  label: { type: "STRING" },
  targetIndex: { type: "INTEGER" },
  kind: { type: "STRING", enum: ["slider", "toggle", "stepper"] },
  effect: { type: "STRING", enum: ["rotate", "scale", "translate", "flow", "count", "intensity"] },
  min: { type: "INTEGER" },
  max: { type: "INTEGER" },
  step: { type: "INTEGER" },
  defaultValue: { type: "INTEGER" },
  unit: { type: "STRING" },
  lowState: { type: "STRING" },
  highState: { type: "STRING" },
  prompt: { type: "STRING" },
};

export const sceneProperties = {
  title: { type: "STRING" },
  objective: { type: "STRING" },
  narration: { type: "STRING" },
  durationSeconds: { type: "INTEGER" },
  visualType: {
    type: "STRING",
    enum: ["metaphor", "process", "comparison", "system", "timeline", "cycle", "hierarchy", "spatial", "equation", "story"],
  },
  visualTitle: { type: "STRING" },
  visualMetaphor: { type: "STRING" },
  motion: { type: "STRING", enum: ["none", "flow", "reveal", "pulse", "orbit", "transform"] },
  visualElements: {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: visualElementProperties,
      required: Object.keys(visualElementProperties),
    },
  },
  connections: {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: connectionProperties,
      required: Object.keys(connectionProperties),
    },
  },
  animationBeats: {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: animationBeatProperties,
      required: Object.keys(animationBeatProperties),
    },
  },
  interaction: {
    type: "OBJECT",
    properties: interactionProperties,
    required: Object.keys(interactionProperties),
  },
  interactionPrompt: { type: "STRING" },
};

export function removeNarrationDashes<T>(value: T): T {
  if (typeof value === "string") return value.replace(/[—–]/g, ",") as T;
  if (Array.isArray(value)) return value.map(removeNarrationDashes) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, removeNarrationDashes(item)]),
    ) as T;
  }
  return value;
}
