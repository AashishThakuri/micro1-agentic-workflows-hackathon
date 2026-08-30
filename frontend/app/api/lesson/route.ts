import { ocularVisualLanguage, removeNarrationDashes, sceneProperties } from "./visual-language";

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
  const models = ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-2.5-flash"];
  let lastStatus = 502;

  for (const model of models) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.45,
            maxOutputTokens: 16384,
            responseMimeType: "application/json",
            responseSchema: lessonSchema,
          },
        }),
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return JSON.parse(text) as unknown;
    } else {
      lastStatus = response.status;
      const errorBody = await response.text();
      console.error("Gemini lesson request failed", model, lastStatus, errorBody.slice(0, 240));
      if (lastStatus !== 429 && lastStatus !== 503) break;
    }
  }

  throw new Error(lastStatus === 429 ? "RATE_LIMIT" : "GENERATION_FAILED");
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
        "The lesson length must adapt to the source. Use as many scenes as the subject genuinely needs: short topics may need only a few; dense notes or PDFs should receive substantially more. Never pad and never omit an essential concept just to fit a preset duration.",
        "Each scene teaches exactly one idea and can stand alone when a learner later asks AI to revise it.",
        "Narration must sound natural when spoken aloud. Never use an em dash or en dash. Use commas and short sentences. Set a realistic durationSeconds for each scene based on its narration and interaction.",
        "Build a unique visual blueprint for every scene. visualElements are the selectable objects, ideas, evidence, or actions that make the explanation work; use exactly as many as clarity requires.",
        "For each visualElement, symbol is a short concrete drawable noun. Prefer a subject-specific noun such as person, book, cell, molecule, planet, gear, tree, clock, signal, stack, path, or graph. Never use an emoji.",
        "connections use zero-based visualElements indexes. Include only meaningful causal, temporal, spatial, or logical links.",
        "visualMetaphor describes the single physical idea organizing the shot. Do not create a presenter character. Animate the subject's own objects.",
        "animationBeats are a topic-agnostic directing timeline synchronized with narration. Use whichever actions genuinely explain this exact subject: draw, reveal, move, trace, connect, disconnect, rotate, scale, split, merge, accumulate, remove, compare, transform, highlight, or simulate.",
        "Map every meaningful spoken phrase to a beat. Create roughly one beat per 3 to 8 narrated words, normally 12 to 30 beats per scene depending on duration. Function words may share a beat, but no explained concept may remain visually static or unmapped.",
        "Each beat has a targetIndex and relatedIndex using zero-based visualElements indexes. Use relatedIndex for relationships, comparisons, transfers, splits, and merges; use -1 when no second object is needed. narrationCue quotes the exact short phrase that triggers the action.",
        "Do not reveal the complete diagram at the start. Build the explanation progressively so each object appears or changes when the narration reaches it.",
        "Do not treat any example topic as a visual template. Invent the mechanism, spatial model, and actions from the current source itself. The same directing grammar must work for mathematics, science, history, literature, software, economics, medicine, and any other subject.",
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
    return Response.json(removeNarrationDashes(lesson));
  } catch (error) {
    console.error("Lesson generation error", error);
    return Response.json(
      { error: "Ocular could not build this lesson yet. Please try again." },
      { status: error instanceof Error && error.message === "RATE_LIMIT" ? 429 : 502 },
    );
  }
}
