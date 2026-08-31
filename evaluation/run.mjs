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
const geminiApiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const openAiApiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY;
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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function keywordCoverage(text, keywords) {
  const normalized = text.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length / keywords.length;
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
          contents: [{ role: "user", parts: [{ text: `Explain this clearly to a beginner: ${topic}` }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1200 },
        }),
        signal: AbortSignal.timeout(45000),
      },
    );

    if (response.ok) {
      const payload = await response.json();
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join(" ") || "";
      return { ok: Boolean(text), text, latencyMs: Math.round(performance.now() - started), model };
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
        input: `Explain this clearly to a beginner: ${topic}`,
        max_output_tokens: 1200,
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
    return {
      ok: Boolean(text),
      text,
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
  return {
    ok: response.ok,
    lesson,
    latencyMs: Math.round(performance.now() - started),
    generation: response.headers.get("X-Ocular-Generation") || "agent",
    provider: response.headers.get("X-Ocular-Provider") || evaluationProvider,
    model: response.headers.get("X-Ocular-Model") || null,
  };
}

const results = [];

for (const [index, evaluationCase] of cases.entries()) {
  const baseline = await directPrompt(evaluationCase.topic);
  await wait(6500);
  const solution = await ocularLesson(evaluationCase.topic);
  const inspected = inspectLesson(solution.lesson, evaluationCase.keywords);
  results.push({
    id: evaluationCase.id,
    baseline: {
      ok: baseline.ok,
      model: baseline.model || null,
      error: baseline.error || null,
      text: baseline.text,
      keywordCoverage: keywordCoverage(baseline.text, evaluationCase.keywords),
      runnable: false,
      latencyMs: baseline.latencyMs,
    },
    ocular: {
      ok: solution.ok,
      ...inspected,
      latencyMs: solution.latencyMs,
      generation: solution.generation,
      provider: solution.provider,
      model: solution.model,
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
};

const artifact = {
  schemaVersion: 1,
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
