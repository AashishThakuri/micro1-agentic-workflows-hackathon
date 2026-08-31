import { readFile } from "node:fs/promises";
import process from "node:process";
import { resolve } from "node:path";

const artifactPath = resolve(
  process.cwd(),
  process.argv[2] || "evaluation/artifacts/run-2026-08-31.json",
);
const artifact = JSON.parse(await readFile(artifactPath, "utf8"));

function keywordCoverage(text, keywords) {
  const normalized = String(text || "").toLowerCase();
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length / keywords.length;
}

function inspectLesson(lesson) {
  const scenes = Array.isArray(lesson?.scenes) ? lesson.scenes : [];
  const structureChecks = {
    atLeastTwoScenes: scenes.length >= 2,
    narration: scenes.length > 0 && scenes.every((scene) => String(scene.narration || "").length >= 60),
    visualObjects: scenes.length > 0 && scenes.every((scene) => scene.visualElements?.length >= 2),
    animationTimeline: scenes.length > 0 && scenes.every((scene) => scene.animationBeats?.length >= 4),
    directManipulation: scenes.length > 0 && scenes.every((scene) => Boolean(scene.interaction?.label)),
    rendererPlan: scenes.length > 0 && scenes.every((scene) => Boolean(scene.renderSpec?.engine && scene.renderSpec?.template)),
  };
  return {
    structureChecks,
    runnable: Object.values(structureChecks).every(Boolean),
    sceneCount: scenes.length,
  };
}

const cases = JSON.parse(
  await readFile(new URL("./cases.json", import.meta.url), "utf8"),
);
const caseById = new Map(cases.map((item) => [item.id, item]));
const recomputed = artifact.results.map((result) => {
  const evaluationCase = caseById.get(result.id);
  if (!evaluationCase) throw new Error(`Unknown evaluation case: ${result.id}`);
  const baselineInspected = inspectLesson(result.baseline.lesson);
  const inspected = inspectLesson(result.ocular.lesson);
  return {
    id: result.id,
    baselineKeywordCoverage: keywordCoverage(result.baseline.text, evaluationCase.keywords),
    ocularKeywordCoverage: keywordCoverage(JSON.stringify(result.ocular.lesson), evaluationCase.keywords),
    baselineRunnable: baselineInspected.runnable,
    baselineStructureChecks: baselineInspected.structureChecks,
    ocularRunnable: inspected.runnable,
    structureChecks: inspected.structureChecks,
  };
});

const average = (values) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
const median = (values) => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[middle]
    : Math.round((ordered[middle - 1] + ordered[middle]) / 2);
};
const verified = {
  cases: recomputed.length,
  baselineRunnable: recomputed.filter((result) => result.baselineRunnable).length,
  ocularRunnable: recomputed.filter((result) => result.ocularRunnable).length,
  baselineKeywordCoveragePercent: average(recomputed.map((result) => result.baselineKeywordCoverage * 100)),
  ocularKeywordCoveragePercent: average(recomputed.map((result) => result.ocularKeywordCoverage * 100)),
  baselineMedianLatencyMs: median(artifact.results.map((result) => result.baseline.latencyMs)),
  ocularMedianLatencyMs: median(artifact.results.map((result) => result.ocular.latencyMs)),
  fallbackCases: artifact.results
    .filter((result) => result.ocular.generation !== "agent")
    .map((result) => result.id),
  baselineEstimatedPlanningCostUsd: Number(artifact.results.reduce((sum, result) => sum + (result.baseline.estimatedCostUsd || 0), 0).toFixed(6)),
  ocularEstimatedPlanningCostUsd: Number(artifact.results.reduce((sum, result) => sum + (result.ocular.estimatedCostUsd || 0), 0).toFixed(6)),
};
const expected = artifact.summary;
const mismatches = Object.entries(verified).filter(
  ([key, value]) => JSON.stringify(expected[key]) !== JSON.stringify(value),
);

console.log(JSON.stringify({ artifact: artifactPath, verified, mismatches, cases: recomputed }, null, 2));
if (mismatches.length) process.exitCode = 1;
