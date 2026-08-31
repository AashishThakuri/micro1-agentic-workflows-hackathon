import { mkdir, readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const rootUrl = process.env.OCULAR_URL || "http://localhost:3000";
const cases = JSON.parse(await readFile(new URL("./cases.json", import.meta.url), "utf8"));
const envText = await readFile(new URL("../backend/.env", import.meta.url), "utf8").catch(() => "");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    }),
);
const configuredKey = (value) => {
  const key = String(value || "").trim();
  return key && !/^your_/i.test(key) ? key : undefined;
};
const geminiApiKey = configuredKey(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY);
const openAiApiKey = configuredKey(process.env.OPENAI_API_KEY || env.OPENAI_API_KEY);
const requestedProvider = (process.env.OCULAR_AI_PROVIDER || env.OCULAR_AI_PROVIDER || "auto").toLowerCase();
const evaluationProvider = requestedProvider === "openai"
  ? "openai"
  : requestedProvider === "gemini"
    ? "gemini"
    : openAiApiKey
      ? "openai"
      : "gemini";
const outputFlagIndex = process.argv.indexOf("--output");
const outputPath =
  outputFlagIndex >= 0 && process.argv[outputFlagIndex + 1]
    ? resolve(process.cwd(), process.argv[outputFlagIndex + 1])
    : null;
const codeCommit = (() => {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
})();

if (evaluationProvider === "openai" && !openAiApiKey) {
  throw new Error("OPENAI_API_KEY is required when OCULAR_AI_PROVIDER=openai.");
}
if (evaluationProvider === "gemini" && !geminiApiKey) {
  throw new Error("GEMINI_API_KEY is required when OCULAR_AI_PROVIDER=gemini.");
}

const baselineModels = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"];
const openAiModel = process.env.OPENAI_MODEL || env.OPENAI_MODEL || "gpt-5.2";
const baselinePrompt = (topic) => [
  "Create a complete beginner-friendly visual lesson for the following topic.",
  "The final response itself should help the learner see the mechanism unfold, follow narration, manipulate the explanation, and ask a follow-up question.",
  "Use only this one direct response. Do not call tools, use external assets, or rely on a separate application.",
  "Return the best complete artifact you can.",
  `Topic: ${topic}`,
].join("\n");

const modelPricesPerMillionTokens = {
  "gemini-3.1-flash-lite": { input: 0.25, output: 1.5 },
};

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function keywordCoverage(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length / keywords.length;
}

function estimatePlanningCostUsd(model, usage) {
  const price = modelPricesPerMillionTokens[model];
  if (!price || !usage) return null;
  return Number((((usage.inputTokens || 0) * price.input + (usage.outputTokens || 0) * price.output) / 1_000_000).toFixed(6));
}

function parseDirectLesson(text) {
  const clean = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const candidate = JSON.parse(clean.slice(start, end + 1));
    return Array.isArray(candidate?.scenes) ? candidate : null;
  } catch {
    return null;
  }
}

async function directGeminiPrompt(topic) {
  const started = performance.now();
  let lastError = "No baseline model completed.";

  for (const model of baselineModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": geminiApiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: baselinePrompt(topic) }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
        }),
        signal: AbortSignal.timeout(45000),
      },
    );

    if (response.ok) {
      const payload = await response.json();
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ") || "";
      const usage = {
        inputTokens: payload.usageMetadata?.promptTokenCount || 0,
        outputTokens: payload.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: payload.usageMetadata?.totalTokenCount || 0,
      };
      return {
        ok: Boolean(text),
        text,
        lesson: parseDirectLesson(text),
        usage,
        estimatedCostUsd: estimatePlanningCostUsd(model, usage),
        latencyMs: Math.round(performance.now() - started),
        model,
      };
    }

    lastError = `${model} returned ${response.status}`;
    if (![429, 503].includes(response.status)) break;
    const retryAfter = Number(response.headers.get("Retry-After")) || 7;
    await wait(Math.min(15000, retryAfter * 1000));
  }

  return { ok: false, text: "", latencyMs: Math.round(performance.now() - started), error: lastError };
}

async function directOpenAiPrompt(topic) {
  const started = performance.now();
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openAiModel,
        input: baselinePrompt(topic),
        max_output_tokens: 4096,
        store: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok) {
      return {
        ok: false,
        text: "",
        latencyMs: Math.round(performance.now() - started),
        model: openAiModel,
        error: `OpenAI returned ${response.status}`,
      };
    }
    const payload = await response.json();
    const text = payload.output_text || (payload.output || [])
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text || "")
      .join("");
    const usage = {
      inputTokens: payload.usage?.input_tokens || 0,
      outputTokens: payload.usage?.output_tokens || 0,
      totalTokens: payload.usage?.total_tokens || 0,
    };
    return {
      ok: Boolean(text),
      text,
      lesson: parseDirectLesson(text),
      usage,
      estimatedCostUsd: estimatePlanningCostUsd(openAiModel, usage),
      latencyMs: Math.round(performance.now() - started),
      model: openAiModel,
    };
  } catch (error) {
    return {
      ok: false,
      text: "",
      latencyMs: Math.round(performance.now() - started),
      model: openAiModel,
      error: error instanceof Error ? error.message : "OpenAI baseline request failed",
    };
  }
}

function directPrompt(topic) {
  return evaluationProvider === "openai" ? directOpenAiPrompt(topic) : directGeminiPrompt(topic);
}

function inspectLesson(lesson, keywords) {
  const scenes = Array.isArray(lesson?.scenes) ? lesson.scenes : [];
  const searchable = JSON.stringify(lesson || {});
  const structureChecks = {
    atLeastTwoScenes: scenes.length >= 2,
    narration: scenes.length > 0 && scenes.every((scene) => String(scene.narration || "").length >= 60),
    visualObjects: scenes.length > 0 && scenes.every((scene) => scene.visualElements?.length >= 2),
    animationTimeline: scenes.length > 0 && scenes.every((scene) => scene.animationBeats?.length >= 4),
    directManipulation: scenes.length > 0 && scenes.every((scene) => Boolean(scene.interaction?.label)),
    rendererPlan: scenes.length > 0 && scenes.every((scene) => Boolean(scene.renderSpec?.engine && scene.renderSpec?.template)),
  };
  return {
    keywordCoverage: keywordCoverage(searchable, keywords),
    structureChecks,
    runnable: Object.values(structureChecks).every(Boolean),
    sceneCount: scenes.length,
  };
}

async function ocularLesson(topic) {
  const started = performance.now();
  const response = await fetch(`${rootUrl}/api/lesson`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "topic", source: topic }),
    signal: AbortSignal.timeout(90000),
  });
  const lesson = await response.json();
  const usage = {
    inputTokens: Number(response.headers.get("X-Ocular-Input-Tokens")) || 0,
    outputTokens: Number(response.headers.get("X-Ocular-Output-Tokens")) || 0,
    totalTokens: Number(response.headers.get("X-Ocular-Total-Tokens")) || 0,
  };
  const model = response.headers.get("X-Ocular-Model") || null;
  return {
    ok: response.ok,
    lesson,
    latencyMs: Math.round(performance.now() - started),
    generation: response.headers.get("X-Ocular-Generation") || "agent",
    provider: response.headers.get("X-Ocular-Provider") || evaluationProvider,
    model,
    usage,
    estimatedCostUsd: estimatePlanningCostUsd(model, usage),
  };
}

const results = [];

for (const [index, evaluationCase] of cases.entries()) {
  const baseline = await directPrompt(evaluationCase.topic);
  await wait(6500);
  const solution = await ocularLesson(evaluationCase.topic);
  const baselineInspected = inspectLesson(baseline.lesson, evaluationCase.keywords);
  const inspected = inspectLesson(solution.lesson, evaluationCase.keywords);
  results.push({
    id: evaluationCase.id,
    baseline: {
      ok: baseline.ok,
      model: baseline.model || null,
      error: baseline.error || null,
      text: baseline.text,
      lesson: baseline.lesson,
      keywordCoverage: keywordCoverage(baseline.text, evaluationCase.keywords),
      structureChecks: baselineInspected.structureChecks,
      runnable: baselineInspected.runnable,
      sceneCount: baselineInspected.sceneCount,
      usage: baseline.usage || { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      estimatedCostUsd: baseline.estimatedCostUsd ?? null,
      latencyMs: baseline.latencyMs,
    },
    ocular: {
      ok: solution.ok,
      ...inspected,
      latencyMs: solution.latencyMs,
      generation: solution.generation,
      provider: solution.provider,
      model: solution.model,
      usage: solution.usage,
      estimatedCostUsd: solution.estimatedCostUsd,
      lesson: solution.lesson,
    },
  });
  console.log(
    `${index + 1}/${cases.length} ${evaluationCase.id}: baseline keywords ${Math.round(results.at(-1).baseline.keywordCoverage * 100)}%, Ocular ${inspected.runnable ? "PASS" : "FAIL"} (${inspected.sceneCount} scenes, ${solution.latencyMs} ms)`,
  );
  if (index < cases.length - 1) await wait(6500);
}

const average = (values) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
};
const summary = {
  cases: results.length,
  baselineRunnable: results.filter((result) => result.baseline.runnable).length,
  ocularRunnable: results.filter((result) => result.ocular.runnable).length,
  baselineKeywordCoveragePercent: average(results.map((result) => result.baseline.keywordCoverage * 100)),
  ocularKeywordCoveragePercent: average(results.map((result) => result.ocular.keywordCoverage * 100)),
  baselineMedianLatencyMs: median(results.map((result) => result.baseline.latencyMs)),
  ocularMedianLatencyMs: median(results.map((result) => result.ocular.latencyMs)),
  fallbackCases: results.filter((result) => result.ocular.generation !== "agent").map((result) => result.id),
  baselineEstimatedPlanningCostUsd: Number(results.reduce((sum, result) => sum + (result.baseline.estimatedCostUsd || 0), 0).toFixed(6)),
  ocularEstimatedPlanningCostUsd: Number(results.reduce((sum, result) => sum + (result.ocular.estimatedCostUsd || 0), 0).toFixed(6)),
};

const artifact = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  codeCommit,
  command: outputPath
    ? `node evaluation/run.mjs --output ${process.argv[outputFlagIndex + 1]}`
    : "node evaluation/run.mjs",
  environment: {
    node: process.version,
    ocularUrl: rootUrl,
    provider: evaluationProvider,
    baselineModels: evaluationProvider === "openai" ? [openAiModel] : baselineModels,
  },
  rubric: {
    primaryMetric: "runnable visual lesson completion",
    requiredChecks: [
      "atLeastTwoScenes",
      "narration",
      "visualObjects",
      "animationTimeline",
      "directManipulation",
      "rendererPlan",
    ],
  },
  baseline: {
    task: "Create the same learner-facing visual lesson as Ocular",
    resources: "One direct model response with no schema, tools, renderer, application runtime, verification, memory, or clarification agent",
    promptTemplate: baselinePrompt("<case>"),
  },
  summary,
  results,
};

console.log("\nSUMMARY");
console.log(JSON.stringify(summary, null, 2));
console.log("\nDETAILS");
console.log(JSON.stringify(results, null, 2));

if (outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  console.log(`\nWROTE ${outputPath}`);
}

if (summary.ocularRunnable !== results.length) process.exitCode = 1;
