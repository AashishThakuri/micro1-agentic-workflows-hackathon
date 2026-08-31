export const ocularVisualLanguage = [
  "Direct every scene as a sparse hand-drawn explanation, not a presentation slide or a decorative illustration.",
  "Find one cognitive anchor per scene: a mechanism, causal change, contrast, spatial relationship, equation, timeline, system, or memorable physical metaphor.",
  "Invent a fresh low-tech physical metaphor for the exact idea. Do not reuse stock diagrams or familiar example compositions.",
  "Do not add a mascot, presenter, pointer character, or decorative guide. The subject's own objects must perform the explanation.",
  "Keep the canvas calm: off-white paper, black ink, generous negative space, and only restrained ochre, dusty red, muted blue, or olive accents. Never neon, glossy, cinematic, or effects-heavy.",
  "Labels must be one to four words, large, and concrete. Never put explanatory paragraphs, scene numbers, UI instructions, or example prose such as 'User types Hello' on the canvas.",
  "Every element symbol is a short concrete drawable noun such as person, book, cell, molecule, planet, gear, tree, clock, circle, square, triangle, stack, arrow, orbit, wave, bars, or node. Never use emoji or Unicode pictograms.",
  "Never fetch an internet image. Every visual must be generated locally by the matching subject renderer. For a real organism, organ, person, place, artifact, machine, specimen, or physical object, use concrete drawable nouns and the illustration renderer so it constructs a recognizable animated object from local primitives.",
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

export const renderSpecProperties = {
  domain: {
    type: "STRING",
    enum: ["mathematics", "physics", "chemistry", "biology", "astronomy", "geography", "computing", "economics", "history", "general"],
  },
  engine: {
    type: "STRING",
    enum: ["manim", "scientific", "network", "simulation", "molecule", "biology", "astronomy", "map", "illustration", "sketch"],
  },
  template: {
    type: "STRING",
    enum: ["function_graph", "derivative", "integral", "differential_equation", "distribution", "vector_field", "geometry", "matrix", "scientific_plot", "network", "process", "molecule", "phylogeny", "cell_division", "orbit", "map", "timeline", "illustration", "concept"],
  },
  expression: { type: "STRING" },
  secondaryExpression: { type: "STRING" },
  parameter: { type: "STRING" },
  parameterMin: { type: "NUMBER" },
  parameterMax: { type: "NUMBER" },
  xMin: { type: "NUMBER" },
  xMax: { type: "NUMBER" },
  yMin: { type: "NUMBER" },
  yMax: { type: "NUMBER" },
  moleculeSmiles: { type: "STRING" },
  latitude: { type: "NUMBER" },
  longitude: { type: "NUMBER" },
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
  renderSpec: {
    type: "OBJECT",
    properties: renderSpecProperties,
    required: Object.keys(renderSpecProperties),
  },
};

type LooseAnimationBeat = {
  atPercent?: unknown;
  targetIndex?: unknown;
  relatedIndex?: unknown;
  action?: unknown;
  narrationCue?: unknown;
};

type LooseScene = {
  narration?: unknown;
  visualElements?: unknown;
  animationBeats?: unknown;
};

const fallbackBeatActions = ["draw", "highlight", "connect", "transform", "compare", "reveal"] as const;

function narrationCueAt(words: string[], index: number, count: number) {
  if (!words.length) return "the visual changes";
  const start = Math.min(words.length - 1, Math.floor((index / Math.max(1, count)) * words.length));
  return words.slice(start, Math.min(words.length, start + 5)).join(" ");
}

export function ensureSceneAnimationCoverage<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  const scene = value as LooseScene;
  const elements = Array.isArray(scene.visualElements) ? scene.visualElements : [];
  const elementCount = Math.max(1, elements.length);
  const existing = Array.isArray(scene.animationBeats)
    ? (scene.animationBeats.filter((beat) => beat && typeof beat === "object") as LooseAnimationBeat[])
    : [];
  const targetCount = Math.max(4, Math.min(12, elementCount * 2));
  if (existing.length >= targetCount) return value;

  const narration = typeof scene.narration === "string" ? scene.narration : "";
  const words = narration.replace(/[^\p{L}\p{N}'-]+/gu, " ").trim().split(/\s+/).filter(Boolean);
  const beats = [...existing];
  while (beats.length < targetCount) {
    const index = beats.length;
    const action = fallbackBeatActions[index % fallbackBeatActions.length];
    const targetIndex = index % elementCount;
    const relational = action === "connect" || action === "transform" || action === "compare";
    beats.push({
      atPercent: Math.round(8 + (index * 84) / Math.max(1, targetCount - 1)),
      targetIndex,
      relatedIndex: relational && elementCount > 1 ? (targetIndex + 1) % elementCount : -1,
      action,
      narrationCue: narrationCueAt(words, index, targetCount),
    });
  }

  return { ...(value as Record<string, unknown>), animationBeats: beats } as T;
}

export function ensureLessonAnimationCoverage<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  const lesson = value as { scenes?: unknown };
  if (!Array.isArray(lesson.scenes)) return value;
  return {
    ...(value as Record<string, unknown>),
    scenes: lesson.scenes.map((scene) => ensureSceneAnimationCoverage(scene)),
  } as T;
}

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
