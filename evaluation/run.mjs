import { readFile } from "node:fs/promises";
import process from "node:process";

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
const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is required in the environment or backend/.env.");
}

const baselineModels = ["gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.5-flash"];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function keywordCoverage(text, keywords) {
  const normalized = text.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length / keywords.length;
}

async function directPrompt(topic) {
  const started = performance.now();
  let lastError = "No baseline model completed.";

  for (const model of baselineModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
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
      keywordCoverage: keywordCoverage(baseline.text, evaluationCase.keywords),
      runnable: false,
      latencyMs: baseline.latencyMs,
    },
    ocular: {
      ok: solution.ok,
      ...inspected,
      latencyMs: solution.latencyMs,
      generation: solution.generation,
    },
  });
  console.log(
    `${index + 1}/${cases.length} ${evaluationCase.id}: baseline keywords ${Math.round(results.at(-1).baseline.keywordCoverage * 100)}%, Ocular ${inspected.runnable ? "PASS" : "FAIL"} (${inspected.sceneCount} scenes, ${solution.latencyMs} ms)`,
  );
  if (index < cases.length - 1) await wait(6500);
}

const average = (values) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
const summary = {
  cases: results.length,
  baselineRunnable: results.filter((result) => result.baseline.runnable).length,
  ocularRunnable: results.filter((result) => result.ocular.runnable).length,
  baselineKeywordCoveragePercent: average(results.map((result) => result.baseline.keywordCoverage * 100)),
  ocularKeywordCoveragePercent: average(results.map((result) => result.ocular.keywordCoverage * 100)),
  baselineMedianLatencyMs: [...results].sort((a, b) => a.baseline.latencyMs - b.baseline.latencyMs)[Math.floor(results.length / 2)].baseline.latencyMs,
  ocularMedianLatencyMs: [...results].sort((a, b) => a.ocular.latencyMs - b.ocular.latencyMs)[Math.floor(results.length / 2)].ocular.latencyMs,
  fallbackCases: results.filter((result) => result.ocular.generation !== "agent").map((result) => result.id),
};

console.log("\nSUMMARY");
console.log(JSON.stringify(summary, null, 2));
console.log("\nDETAILS");
console.log(JSON.stringify(results, null, 2));

if (summary.ocularRunnable !== results.length) process.exitCode = 1;
