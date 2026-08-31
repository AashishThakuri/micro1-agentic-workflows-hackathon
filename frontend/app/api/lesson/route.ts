import { ensureLessonAnimationCoverage, ocularVisualLanguage, removeNarrationDashes, sceneProperties } from "./visual-language";
import { GEMINI_TEXT_MODELS, parseGeminiJson } from "./gemini-json";

type LessonRequest = {
  mode?: "topic" | "notes" | "pdf";
  source?: string;
  file?: { name: string; mimeType: string; data: string };
};

const lessonSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    scenes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: sceneProperties,
        required: Object.keys(sceneProperties),
      },
    },
  },
  required: ["title", "summary", "scenes"],
};

async function generateWithFallback(apiKey: string, contents: Array<Record<string, unknown>>) {
  let lastStatus = 502;

  for (const model of GEMINI_TEXT_MODELS) {
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.4,
              maxOutputTokens: 16384,
              responseMimeType: "application/json",
              responseSchema: lessonSchema,
            },
          }),
          signal: AbortSignal.timeout(45_000),
        },
      );
    } catch (error) {
      console.error("Gemini lesson request did not complete", model, error);
      continue;
    }

    if (response.ok) {
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      try {
        const lesson = parseGeminiJson<{ scenes?: unknown }>(text);
        if (!Array.isArray(lesson?.scenes) || lesson.scenes.length < 2) {
          console.error("Gemini lesson did not satisfy the minimum two-scene contract", model);
          continue;
        }
        return lesson;
      } catch (error) {
        console.error("Gemini lesson JSON was invalid", model, error);
        continue;
      }
    } else {
      lastStatus = response.status;
      const errorBody = await response.text();
      console.error("Gemini lesson request failed", model, lastStatus, errorBody.slice(0, 240));
      if (lastStatus !== 429 && lastStatus !== 503) break;
    }
  }

  throw new Error(lastStatus === 429 ? "RATE_LIMIT" : "GENERATION_FAILED");
}

function localRenderSpec(source: string) {
  const subject = source.toLowerCase();
  const base = {
    domain: "general",
    engine: "sketch",
    template: "concept",
    expression: "x",
    secondaryExpression: "",
    parameter: "a",
    parameterMin: -2,
    parameterMax: 2,
    xMin: -5,
    xMax: 5,
    yMin: -3,
    yMax: 3,
    moleculeSmiles: "",
    latitude: 0,
    longitude: 0,
  };

  if (/normal distribution|probability|statistics|bell curve/.test(subject)) {
    return { ...base, domain: "mathematics", engine: "manim", template: "distribution", yMin: 0, yMax: 0.6 };
  }
  if (/derivative|slope|rate of change/.test(subject)) {
    return { ...base, domain: "mathematics", engine: "manim", template: "derivative", expression: "x**2" };
  }
  if (/integral|area under|accumulation/.test(subject)) {
    return { ...base, domain: "mathematics", engine: "manim", template: "integral", expression: "0.2*x**2 + 0.5" };
  }
  if (/differential equation|rate law/.test(subject)) {
    return { ...base, domain: "mathematics", engine: "manim", template: "differential_equation", expression: "-0.7*y", xMin: 0 };
  }
  if (/matrix|linear transformation/.test(subject)) {
    return { ...base, domain: "mathematics", engine: "manim", template: "matrix" };
  }
  if (/angle|triangle|geometry/.test(subject)) {
    return { ...base, domain: "mathematics", engine: "manim", template: "geometry" };
  }
  if (/molecule|chemical|chemistry|atom|bond/.test(subject)) {
    return { ...base, domain: "chemistry", engine: "molecule", template: "molecule", moleculeSmiles: "CCO" };
  }
  if (/evolution|phylogen|taxonomy|species/.test(subject)) {
    return { ...base, domain: "biology", engine: "biology", template: "phylogeny" };
  }
  if (/mitosis|meiosis|cell division|chromosome|spindle fiber/.test(subject)) {
    return { ...base, domain: "biology", engine: "biology", template: "cell_division" };
  }
  if (/orbit|planet|astronomy|solar system/.test(subject)) {
    return { ...base, domain: "astronomy", engine: "astronomy", template: "orbit" };
  }
  if (/network|graph theory|connected system/.test(subject)) {
    return { ...base, domain: "computing", engine: "network", template: "network" };
  }
  if (/algorithm|queue|stack|process|workflow/.test(subject)) {
    return { ...base, domain: "computing", engine: "simulation", template: "process" };
  }
  if (/history|timeline|chronology/.test(subject)) {
    return { ...base, domain: "history", engine: "sketch", template: "timeline" };
  }
  return base;
}

function buildLocalLesson(source: string) {
  const topic = source.replace(/\s+/g, " ").trim().slice(0, 120) || "the source material";
  const renderSpec = localRenderSpec(topic);
  return {
    title: topic.length > 72 ? `${topic.slice(0, 69)}...` : topic,
    summary: `A visual starting point for ${topic}.`,
    scenes: [
      {
        title: "See the core mechanism",
        objective: `Build a manipulable visual model of ${topic}.`,
        narration: `Let us build ${topic} from three visible parts. First we identify the starting state. Then we change the important quantity. Finally we watch the result and connect it back to the original question.`,
        durationSeconds: 28,
        visualType: "process",
        visualTitle: topic,
        visualMetaphor: "A starting state changes through one visible mechanism and produces an observable result.",
        motion: "transform",
        visualElements: [
          { label: "starting state", detail: "What exists before the change", role: "source", accent: "blue", symbol: "node" },
          { label: "key change", detail: "The quantity or action that drives the mechanism", role: "process", accent: "ochre", symbol: "arrow" },
          { label: "visible result", detail: "What changes and why it matters", role: "result", accent: "red", symbol: "graph" },
        ],
        connections: [
          { from: 0, to: 1, label: "changes" },
          { from: 1, to: 2, label: "produces" },
        ],
        animationBeats: [
          { atPercent: 5, targetIndex: 0, relatedIndex: -1, action: "draw", narrationCue: "build" },
          { atPercent: 18, targetIndex: 0, relatedIndex: -1, action: "highlight", narrationCue: "starting state" },
          { atPercent: 38, targetIndex: 1, relatedIndex: 0, action: "connect", narrationCue: "change" },
          { atPercent: 58, targetIndex: 1, relatedIndex: 2, action: "transform", narrationCue: "important quantity" },
          { atPercent: 76, targetIndex: 2, relatedIndex: -1, action: "reveal", narrationCue: "result" },
          { atPercent: 90, targetIndex: 2, relatedIndex: 0, action: "compare", narrationCue: "original question" },
        ],
        interaction: {
          label: "change intensity",
          targetIndex: 1,
          kind: "slider",
          effect: "intensity",
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 5,
          unit: "",
          lowState: "The mechanism has little effect.",
          highState: "The mechanism strongly changes the result.",
          prompt: "Move the value and watch the result respond.",
        },
        interactionPrompt: "Change the driving quantity and compare the result.",
        renderSpec,
      },
      {
        title: "Test the boundary",
        objective: `Compare when the core mechanism of ${topic} applies and when it changes.`,
        narration: `Now test the model instead of only watching it. Compare the ordinary case with a boundary case. Keep the cause visible, change one condition, and observe whether the same result still follows or whether the explanation needs a different rule.`,
        durationSeconds: 28,
        visualType: "comparison",
        visualTitle: `Boundary check for ${topic}`,
        visualMetaphor: "Two versions of the same system reveal which condition controls the outcome.",
        motion: "compare",
        visualElements: [
          { label: "ordinary case", detail: "The mechanism under its expected condition", role: "source", accent: "blue", symbol: "node" },
          { label: "changed condition", detail: "One boundary or assumption is varied", role: "process", accent: "ochre", symbol: "slider" },
          { label: "observed outcome", detail: "The resulting difference tests the explanation", role: "result", accent: "red", symbol: "graph" },
        ],
        connections: [
          { from: 0, to: 2, label: "normally produces" },
          { from: 1, to: 2, label: "changes" },
        ],
        animationBeats: [
          { atPercent: 5, targetIndex: 0, relatedIndex: -1, action: "draw", narrationCue: "test the model" },
          { atPercent: 22, targetIndex: 0, relatedIndex: 2, action: "connect", narrationCue: "ordinary case" },
          { atPercent: 40, targetIndex: 1, relatedIndex: 0, action: "compare", narrationCue: "boundary case" },
          { atPercent: 58, targetIndex: 1, relatedIndex: 2, action: "transform", narrationCue: "change one condition" },
          { atPercent: 76, targetIndex: 2, relatedIndex: -1, action: "reveal", narrationCue: "observe" },
          { atPercent: 92, targetIndex: 2, relatedIndex: 0, action: "compare", narrationCue: "different rule" },
        ],
        interaction: {
          label: "boundary condition",
          targetIndex: 1,
          kind: "toggle",
          effect: "intensity",
          min: 0,
          max: 1,
          step: 1,
          defaultValue: 0,
          unit: "state",
          lowState: "The ordinary condition holds.",
          highState: "The boundary condition changes the outcome.",
          prompt: "Toggle the condition and compare the outcome.",
        },
        interactionPrompt: "Change one assumption and test whether the explanation still holds.",
        renderSpec,
      },
    ],
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "The lesson engine is not configured." }, { status: 503 });
  }

  let input: LessonRequest;
  try {
    input = (await request.json()) as LessonRequest;
  } catch {
    return Response.json({ error: "The source could not be read." }, { status: 400 });
  }

  const sourceText = input.source?.trim();
  if (!sourceText && !input.file?.data) {
    return Response.json({ error: "Add a topic, notes, or PDF first." }, { status: 400 });
  }

  const parts: Array<Record<string, unknown>> = [
    {
      text: [
        "You are the lesson director for Ocular, an interactive visual learning studio.",
        "Turn the source into a complete scene-by-scene visual lesson, not a fixed-length summary.",
        "The lesson length must adapt to the source. Every lesson needs at least two complementary scenes: first establish the core mechanism, then test, compare, apply, or expose its boundary. Dense notes or PDFs should receive substantially more. Never omit an essential concept just to fit a preset duration.",
        "Each scene teaches exactly one idea and can stand alone when a learner later asks AI to revise it.",
        "Narration must sound natural when spoken aloud. Never use an em dash or en dash. Use commas and short sentences. Set a realistic durationSeconds for each scene based on its narration and interaction.",
        "Build a unique visual blueprint for every scene. visualElements are the selectable objects, ideas, evidence, or actions that make the explanation work; use exactly as many as clarity requires.",
        "For each visualElement, symbol is a short concrete drawable noun. Prefer a subject-specific noun such as person, book, cell, molecule, planet, gear, tree, clock, signal, stack, path, or graph. Never use an emoji.",
        "connections use zero-based visualElements indexes. Include only meaningful causal, temporal, spatial, or logical links.",
        "visualMetaphor describes the single physical idea organizing the shot. Do not create a presenter character. Animate the subject's own objects.",
        "Do not request or depend on internet images. Every subject must be drawn and animated by its matching local renderer.",
        "animationBeats are a topic-agnostic directing timeline synchronized with narration. Use whichever actions genuinely explain this exact subject: draw, reveal, move, trace, connect, disconnect, rotate, scale, split, merge, accumulate, remove, compare, transform, highlight, or simulate.",
        "Map every meaningful spoken phrase to a beat. Create roughly one beat per 3 to 8 narrated words, normally 12 to 30 beats per scene depending on duration. Function words may share a beat, but no explained concept may remain visually static or unmapped.",
        "Each beat has a targetIndex and relatedIndex using zero-based visualElements indexes. Use relatedIndex for relationships, comparisons, transfers, splits, and merges; use -1 when no second object is needed. narrationCue quotes the exact short phrase that triggers the action.",
        "Do not reveal the complete diagram at the start. Build the explanation progressively so each object appears or changes when the narration reaches it.",
        "Do not treat any example topic as a visual template. Invent the mechanism, spatial model, and actions from the current source itself. The same directing grammar must work for mathematics, science, history, literature, software, economics, medicine, and any other subject.",
        "renderSpec selects Ocular's deterministic precision renderer. It is a structured plan, never executable code.",
        "For every branch of mathematics, including algebra, geometry, trigonometry, calculus, differential equations, linear algebra, probability, statistics, discrete mathematics, numerical methods, and optimization, choose domain mathematics and engine manim. Pick the exact template that demonstrates the mechanism, not merely its name.",
        "Use derivative for changing slope, integral for accumulation, differential_equation for a state evolving from a rate law, distribution for probability or statistics, vector_field for multivariable flow, geometry for spatial proofs and angles, matrix for linear transformations, and function_graph for other plotted relationships.",
        "Use scientific for measured data and physical models, network for graph structures and connected systems, simulation for queues and discrete processes, molecule for chemistry with a valid simple SMILES string, biology with phylogeny for evolutionary or taxonomic branching, biology with cell_division for mitosis, meiosis, chromosome alignment, chromosome separation, and cytokinesis, astronomy for orbital relationships, and map for geographic movement.",
        "For anatomy, medicine, organisms, ecosystems, historical people and events, literature, artworks, artifacts, machines, places, and concrete real-world objects, use engine illustration with template illustration. Fill visualElements with precise concrete nouns so the local renderer constructs recognizable subject objects and animates their relationships. Use sketch with concept only when no quantitative or subject renderer fits.",
        "expression and secondaryExpression must be compact mathematical expressions using only x, t, a, numbers, parentheses, +, -, *, /, powers, sin, cos, tan, exp, log, sqrt, or abs. Do not put prose or Python in them. For a differential equation, expression is the right side using t and y, such as -0.7*y.",
        "Choose honest axis ranges around the phenomenon. moleculeSmiles must be empty unless a molecule is central. Latitude and longitude must be numeric and relevant only for a map scene.",
        ocularVisualLanguage,
        "interaction is a direct manipulation built into the scene. Choose a topic-specific value and effect. Changing it must immediately demonstrate what changes and why. For geometry use an angle or length; for data structures use count or order; for systems use flow, rate, balance, force, or intensity. Keep lowState and highState short and explanatory.",
        "interactionPrompt is one short invitation to manipulate the visual, not an instruction to ask AI.",
        sourceText ? `Source: ${sourceText}` : `Use the attached PDF named ${input.file?.name}.`,
      ].join("\n"),
    },
  ];

  if (input.file?.data) {
    parts.push({
      inlineData: {
        mimeType: input.file.mimeType || "application/pdf",
        data: input.file.data,
      },
    });
  }

  try {
    const lesson = await generateWithFallback(apiKey, [{ role: "user", parts }]);
    return Response.json(removeNarrationDashes(ensureLessonAnimationCoverage(lesson)));
  } catch (error) {
    console.error("Lesson generation error", error);
    const fallbackSource = sourceText || input.file?.name || "the source material";
    return Response.json(removeNarrationDashes(ensureLessonAnimationCoverage(buildLocalLesson(fallbackSource))), {
      headers: { "X-Ocular-Generation": "local-fallback" },
    });
  }
}
