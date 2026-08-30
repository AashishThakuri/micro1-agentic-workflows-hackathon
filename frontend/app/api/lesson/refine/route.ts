import { ocularVisualLanguage, removeNarrationDashes, sceneProperties } from "../visual-language";

type VisualElement = {
  label: string;
  detail: string;
  role: "source" | "process" | "result" | "context" | "question" | "evidence";
  accent: "ink" | "ochre" | "red" | "blue" | "olive";
  symbol: string;
};

type Scene = {
  title: string;
  objective: string;
  narration: string;
  durationSeconds: number;
  visualType: "metaphor" | "process" | "comparison" | "system" | "timeline" | "cycle" | "hierarchy" | "spatial" | "equation" | "story";
  visualTitle: string;
  visualMetaphor: string;
  motion: "none" | "flow" | "reveal" | "pulse" | "orbit" | "transform";
  visualElements: VisualElement[];
  connections: Array<{ from: number; to: number; label: string }>;
  animationBeats: Array<{
    atPercent: number;
    targetIndex: number;
    relatedIndex: number;
    action: "draw" | "reveal" | "move" | "trace" | "connect" | "disconnect" | "rotate" | "scale" | "split" | "merge" | "accumulate" | "remove" | "compare" | "transform" | "highlight" | "simulate";
    narrationCue: string;
  }>;
  interaction: {
    label: string;
    targetIndex: number;
    kind: "slider" | "toggle" | "stepper";
    effect: "rotate" | "scale" | "translate" | "flow" | "count" | "intensity";
    min: number;
    max: number;
    step: number;
    defaultValue: number;
    unit: string;
    lowState: string;
    highState: string;
    prompt: string;
  };
  interactionPrompt: string;
};

const sceneSchema = {
  type: "OBJECT",
  properties: sceneProperties,
  required: Object.keys(sceneProperties),
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "The lesson engine is not configured." }, { status: 503 });

  const input = (await request.json()) as { lessonTitle?: string; scene?: Scene; comment?: string };
  if (!input.scene || !input.comment?.trim()) {
    return Response.json({ error: "Describe what is unclear in this scene." }, { status: 400 });
  }

  const prompt = [
    "You revise one scene in an interactive Ocular visual lesson.",
    `Lesson: ${input.lessonTitle || "Untitled lesson"}`,
    `Current scene: ${JSON.stringify(input.scene)}`,
    `Learner's exact doubt or requested change: ${input.comment.trim()}`,
    "Rebuild only this scene so the learner's doubt is addressed directly and precisely.",
    "You may completely reinvent this scene's metaphor, composition, objects, connections, motion, narration, and duration. Do not alter the rest of the lesson.",
    "Make the revised visual directly resolve the learner's doubt instead of merely adding more words.",
    "Keep narration free of em dashes and en dashes. Use commas and short sentences.",
    "Create a meaningful direct manipulation that lets the learner change the mechanism and immediately see its consequence.",
    "Synchronize a topic-appropriate visual action to every meaningful narrated phrase. The action grammar is general and must be chosen from the learner's actual subject, never copied from an example topic.",
    ocularVisualLanguage,
  ].join("\n");

  for (const model of ["gemini-3.7-flash", "gemini-3.5-flash", "gemini-2.5-flash"]) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
            responseSchema: sceneSchema,
          },
        }),
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return Response.json(removeNarrationDashes(JSON.parse(text)));
    } else if (response.status !== 429 && response.status !== 503) {
      break;
    }
  }

  return Response.json({ error: "This scene could not be revised yet. Please try again." }, { status: 502 });
}
