"use client";

import Link from "next/link";
import {
  ChangeEvent,
  SyntheticEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type SourceMode = "topic" | "notes" | "pdf";
type WorkState = "idle" | "building" | "ready" | "error";
type RefineState = "idle" | "working" | "done" | "error";
type AudioState = "idle" | "loading" | "playing" | "error";
type VisualType = "metaphor" | "process" | "comparison" | "system" | "timeline" | "cycle" | "hierarchy" | "spatial" | "equation" | "story";
type VisualAccent = "ink" | "ochre" | "red" | "blue" | "olive";
type VisualElement = {
  label: string;
  detail: string;
  role: "source" | "process" | "result" | "context" | "question" | "evidence";
  accent: VisualAccent;
  symbol: string;
};
type AnimationBeat = {
  atPercent: number;
  targetIndex: number;
  relatedIndex: number;
  action: "draw" | "reveal" | "move" | "trace" | "connect" | "disconnect" | "rotate" | "scale" | "split" | "merge" | "accumulate" | "remove" | "compare" | "transform" | "highlight" | "simulate";
  narrationCue: string;
};
type SceneInteraction = {
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

type RenderSpec = {
  domain: "mathematics" | "physics" | "chemistry" | "biology" | "astronomy" | "geography" | "computing" | "economics" | "history" | "general";
  engine: "manim" | "scientific" | "network" | "simulation" | "molecule" | "biology" | "astronomy" | "map" | "illustration" | "sketch";
  template: "function_graph" | "derivative" | "integral" | "differential_equation" | "distribution" | "vector_field" | "geometry" | "matrix" | "scientific_plot" | "network" | "process" | "molecule" | "phylogeny" | "cell_division" | "orbit" | "map" | "timeline" | "illustration" | "concept";
  expression: string;
  secondaryExpression: string;
  parameter: string;
  parameterMin: number;
  parameterMax: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  moleculeSmiles: string;
  latitude: number;
  longitude: number;
};

type PrecisionRender = {
  status: "rendering" | "ready" | "error";
  engine?: string;
  template?: string;
  videoUrl?: string;
};

type VideoCommentPin = {
  x: number;
  y: number;
  label: string;
  timestamp: number;
};

type Scene = {
  id: string;
  title: string;
  objective: string;
  narration: string;
  durationSeconds: number;
  visualType: VisualType;
  visualTitle: string;
  visualMetaphor: string;
  motion: "none" | "flow" | "reveal" | "pulse" | "orbit" | "transform";
  visualElements: VisualElement[];
  connections: Array<{ from: number; to: number; label: string }>;
  animationBeats: AnimationBeat[];
  interaction: SceneInteraction;
  interactionPrompt: string;
  renderSpec: RenderSpec;
  revision?: string;
};

type Lesson = {
  title: string;
  summary: string;
  scenes: Scene[];
};

const sourceModes: Array<{ id: SourceMode; label: string }> = [
  { id: "topic", label: "Topic" },
  { id: "notes", label: "Notes" },
  { id: "pdf", label: "PDF" },
];

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("The selected PDF could not be read."));
        return;
      }
      resolve(reader.result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function visualShape(value: string, index: number) {
  const normalized = value.trim().toLowerCase();
  const subjectShapes: Array<[string[], string]> = [
    [["person", "human", "learner", "worker", "character"], "person"],
    [["book", "document", "paper", "page", "text"], "book"],
    [["cell", "nucleus", "bacteria", "microbe"], "cell"],
    [["molecule", "atom", "chemical", "bond"], "molecule"],
    [["planet", "moon", "sun", "orbit", "space"], "orbit"],
    [["gear", "engine", "machine", "mechanism"], "gear"],
    [["tree", "branch", "taxonomy", "family"], "tree"],
    [["clock", "time", "history", "timeline"], "clock"],
    [["distribution", "density", "bell curve", "curve", "probability"], "curve"],
    [["chart", "graph", "data", "bar", "histogram", "axis"], "bars"],
    [["signal", "sound", "wave", "frequency"], "wave"],
    [["path", "flow", "direction", "arrow"], "arrow"],
    [["layer", "stack", "queue", "pile"], "stack"],
    [["triangle", "angle", "delta"], "triangle"],
    [["square", "box", "block"], "square"],
    [["circle", "node", "point"], "circle"],
  ];
  return subjectShapes.find(([keywords]) => keywords.some((keyword) => normalized.includes(keyword)))?.[1]
    || ["circle", "square", "triangle", "stack", "arrow", "orbit", "wave", "bars", "node"][index % 9];
}

type DiagramKind = "distribution" | "graph" | "wave" | "timeline" | "cycle" | "hierarchy" | "network" | "comparison";

function sceneLanguage(scene: Scene) {
  const elements = Array.isArray(scene.visualElements) ? scene.visualElements : [];
  return [
    scene.title,
    scene.objective,
    scene.visualTitle,
    scene.visualMetaphor,
    ...elements.flatMap((item) => [item.label, item.detail, item.symbol]),
  ].join(" ").toLowerCase();
}

function inferDiagramKind(scene: Scene): DiagramKind {
  const language = sceneLanguage(scene);
  if (/normal distribution|bell curve|gaussian|probability density|distribution/.test(language)) return "distribution";
  if (/wave|frequency|signal|sound|oscillat/.test(language)) return "wave";
  if (/graph|chart|plot|axis|function|coordinate|slope|rate|data/.test(language) || scene.visualType === "equation") return "graph";
  if (scene.visualType === "timeline") return "timeline";
  if (scene.visualType === "cycle") return "cycle";
  if (scene.visualType === "hierarchy") return "hierarchy";
  if (scene.visualType === "comparison") return "comparison";
  return "network";
}

function needsPrecisionRender(scene: Scene) {
  return scene.renderSpec.template !== "concept";
}

function fallbackRenderSpec(scene: Pick<Scene, "title" | "objective" | "visualTitle" | "visualMetaphor" | "visualType">): RenderSpec {
  const language = [scene.title, scene.objective, scene.visualTitle, scene.visualMetaphor].join(" ").toLowerCase();
  let domain: RenderSpec["domain"] = "general";
  let engine: RenderSpec["engine"] = "sketch";
  let template: RenderSpec["template"] = "concept";

  if (/derivative|slope|rate of change|differenti/.test(language)) [domain, engine, template] = ["mathematics", "manim", "derivative"];
  else if (/integral|area under|accumulat|antiderivative/.test(language)) [domain, engine, template] = ["mathematics", "manim", "integral"];
  else if (/differential equation|ode|rate law/.test(language)) [domain, engine, template] = ["mathematics", "manim", "differential_equation"];
  else if (/normal distribution|gaussian|probability|statistics|histogram/.test(language)) [domain, engine, template] = ["mathematics", "manim", "distribution"];
  else if (/vector field|gradient|divergence|curl/.test(language)) [domain, engine, template] = ["mathematics", "manim", "vector_field"];
  else if (/matrix|linear transform|eigen|basis/.test(language)) [domain, engine, template] = ["mathematics", "manim", "matrix"];
  else if (/geometry|triangle|angle|circle|polygon|theorem/.test(language)) [domain, engine, template] = ["mathematics", "manim", "geometry"];
  else if (/function|equation|graph|plot|curve|algebra|calculus/.test(language) || scene.visualType === "equation") [domain, engine, template] = ["mathematics", "manim", "function_graph"];
  else if (/molecule|chemical|atom|bond|reaction/.test(language)) [domain, engine, template] = ["chemistry", "molecule", "molecule"];
  else if (/mitosis|meiosis|cell division|chromosome|spindle fiber|cytokinesis/.test(language)) [domain, engine, template] = ["biology", "biology", "cell_division"];
  else if (/evolution|phylogen|species|taxonomy|common ancestor/.test(language)) [domain, engine, template] = ["biology", "biology", "phylogeny"];
  else if (/planet|orbit|star|galaxy|astronom/.test(language)) [domain, engine, template] = ["astronomy", "astronomy", "orbit"];
  else if (/network|graph algorithm|node|edge|internet/.test(language)) [domain, engine, template] = ["computing", "network", "network"];
  else if (/queue|event|pipeline|process|workflow/.test(language)) [domain, engine, template] = ["computing", "simulation", "process"];
  else if (/map|geograph|country|migration|route/.test(language)) [domain, engine, template] = ["geography", "map", "map"];
  else if (scene.visualType === "timeline") [domain, engine, template] = ["history", "sketch", "timeline"];
  else if (/anatomy|organ|disease|organism|ecosystem|historical|artwork|artifact|machine|place|literature|author/.test(language)) [domain, engine, template] = ["general", "illustration", "illustration"];

  return {
    domain,
    engine,
    template,
    expression: template === "distribution" ? "exp(-x**2/2)" : template === "derivative" ? "x**2" : "x",
    secondaryExpression: "",
    parameter: "a",
    parameterMin: -2,
    parameterMax: 2,
    xMin: template === "differential_equation" ? 0 : -5,
    xMax: 5,
    yMin: -3,
    yMax: 3,
    moleculeSmiles: template === "molecule" ? "CCO" : "",
    latitude: 0,
    longitude: 0,
  };
}

function SemanticDiagram({ scene, progress, isPlaying }: { scene: Scene; progress: number; isPlaying: boolean }) {
  const kind = inferDiagramKind(scene);
  const reveal = Math.max(0.08, Math.min(1, progress / 100));
  const style = { "--diagram-progress": reveal } as React.CSSProperties;
  const labels = scene.visualElements.slice(0, 4).map((item) => item.label.replace(/^Action\s*\d+\s*:\s*/i, ""));

  if (kind === "distribution") {
    return (
      <div className={`semantic-diagram diagram-distribution ${isPlaying ? "is-running" : ""}`} style={style} aria-label="Animated distribution graph">
        <svg viewBox="0 0 820 280" aria-label="A bell curve building from accumulating observations">
          <path className="diagram-axis" d="M62 238 H780 M410 248 V30" />
          <path className="diagram-fill" d="M70 238 C190 236 250 222 305 170 C350 126 370 55 410 42 C450 55 470 126 515 170 C570 222 630 236 750 238 L750 238 L70 238 Z" />
          <path className="diagram-line" d="M70 238 C190 236 250 222 305 170 C350 126 370 55 410 42 C450 55 470 126 515 170 C570 222 630 236 750 238" pathLength="1" />
          {Array.from({ length: 18 }, (_, index) => {
            const x = 150 + ((index * 83) % 520);
            const y = 225 - Math.max(8, 155 - Math.abs(410 - x) * 0.55) * (0.42 + (index % 4) * 0.12);
            return <circle className="distribution-dot" cx={x} cy={y} key={index} r="5" style={{ "--dot-index": index } as React.CSSProperties} />;
          })}
          <text x="410" y="270" textAnchor="middle">observed value</text>
          <text x="426" y="54">center</text>
        </svg>
      </div>
    );
  }

  if (kind === "graph" || kind === "wave") {
    const curve = kind === "wave"
      ? "M70 145 C120 55 170 235 220 145 S320 55 370 145 S470 235 520 145 S620 55 750 145"
      : "M70 225 C150 220 205 195 270 170 C335 145 385 148 440 118 C510 82 590 70 750 48";
    return (
      <div className={`semantic-diagram diagram-${kind} ${isPlaying ? "is-running" : ""}`} style={style} aria-label="Animated graph">
        <svg viewBox="0 0 820 280" aria-label="A graph changing as the narration progresses">
          <path className="diagram-axis" d="M62 238 H780 M62 238 V25" />
          <path className="diagram-line" d={curve} pathLength="1" />
          {[0, 1, 2, 3].map((index) => <circle className="graph-point" cx={150 + index * 165} cy={205 - index * 42} key={index} r="7" />)}
        </svg>
      </div>
    );
  }

  const points = kind === "timeline"
    ? [[115, 145], [310, 145], [505, 145], [700, 145]]
    : kind === "cycle"
      ? [[410, 42], [650, 145], [410, 244], [170, 145]]
      : kind === "hierarchy"
        ? [[410, 45], [245, 145], [575, 145], [145, 238], [345, 238], [475, 238], [675, 238]]
        : [[130, 145], [330, 70], [500, 205], [690, 115]];
  const edges = kind === "hierarchy"
    ? [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]]
    : kind === "cycle"
      ? [[0, 1], [1, 2], [2, 3], [3, 0]]
      : points.slice(1).map((_, index) => [index, index + 1]);

  return (
    <div className={`semantic-diagram diagram-${kind} ${isPlaying ? "is-running" : ""}`} style={style} aria-label="Animated relationship diagram">
      <svg viewBox="0 0 820 280" aria-label="Objects and connections changing with the explanation">
        {edges.map(([from, to], index) => (
          <line className="diagram-edge" key={`${from}-${to}`} x1={points[from][0]} y1={points[from][1]} x2={points[to][0]} y2={points[to][1]} pathLength="1" style={{ "--edge-index": index } as React.CSSProperties} />
        ))}
        {points.map(([x, y], index) => (
          <g className="diagram-node" key={`${x}-${y}`} style={{ "--node-index": index } as React.CSSProperties}>
            <circle cx={x} cy={y} r={index === 0 ? 29 : 23} />
            <text x={x} y={y + 48} textAnchor="middle">{labels[index] || `part ${index + 1}`}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function cleanNarration(value: string) {
  return value.replace(/[—–]/g, ",").replace(/\s+/g, " ").trim();
}

function normalizeAnimationBeats(beats: AnimationBeat[] | undefined, elementCount: number): AnimationBeat[] {
  if (!Array.isArray(beats)) return [];
  const finalIndex = Math.max(0, elementCount - 1);
  return beats
    .map((beat) => {
      const relatedIndex = Number(beat.relatedIndex);
      return {
        ...beat,
        atPercent: Math.min(100, Math.max(0, Number(beat.atPercent) || 0)),
        targetIndex: Math.min(finalIndex, Math.max(0, Number(beat.targetIndex) || 0)),
        relatedIndex: Number.isFinite(relatedIndex) && relatedIndex >= 0 && relatedIndex < elementCount ? relatedIndex : -1,
      };
    })
    .sort((a, b) => a.atPercent - b.atPercent);
}

function subtitleAtProgress(value: string, progress: number) {
  if (progress <= 0 || progress >= 100) return null;
  const words = cleanNarration(value).split(" ").filter(Boolean);
  const wordsPerSubtitle = 6;
  const chunkCount = Math.ceil(words.length / wordsPerSubtitle);
  if (!chunkCount) return null;
  const spokenWordIndex = Math.min(words.length - 1, Math.floor((progress / 100) * words.length));
  const chunkIndex = Math.floor(spokenWordIndex / wordsPerSubtitle);
  const chunkStart = chunkIndex * wordsPerSubtitle;
  return {
    words: words.slice(chunkStart, chunkStart + wordsPerSubtitle),
    activeWordIndex: spokenWordIndex - chunkStart,
  };
}

function fallbackInteraction(elementCount: number): SceneInteraction {
  return {
    label: "Change the system",
    targetIndex: Math.max(0, Math.min(elementCount - 1, 0)),
    kind: "slider",
    effect: "intensity",
    min: 0,
    max: 100,
    step: 10,
    defaultValue: 50,
    unit: "%",
    lowState: "Less influence",
    highState: "More influence",
    prompt: "Move the control and watch the relationship change.",
  };
}

function normalizeInteraction(value: Partial<SceneInteraction> | undefined, elementCount: number): SceneInteraction {
  const fallback = fallbackInteraction(elementCount);
  const min = Number.isFinite(Number(value?.min)) ? Number(value?.min) : fallback.min;
  const candidateMax = Number.isFinite(Number(value?.max)) ? Number(value?.max) : fallback.max;
  const max = candidateMax > min ? candidateMax : min + 100;
  return {
    ...fallback,
    ...value,
    targetIndex: Math.min(Math.max(0, Number(value?.targetIndex) || 0), Math.max(0, elementCount - 1)),
    min,
    max,
    step: Math.max(1, Number(value?.step) || fallback.step),
    defaultValue: Math.min(max, Math.max(min, Number(value?.defaultValue) || fallback.defaultValue)),
  };
}

function normalizeLesson(value: Omit<Lesson, "scenes"> & { scenes: Array<Omit<Scene, "id">> }): Lesson {
  return {
    ...value,
    scenes: value.scenes.map((scene, index) => {
      const visualElements = Array.isArray(scene.visualElements) ? scene.visualElements : [];
      const inferredRenderSpec = fallbackRenderSpec(scene);
      const requestedRenderSpec = scene.renderSpec;
      const renderSpec = !requestedRenderSpec
        || inferredRenderSpec.template === "cell_division"
        || (requestedRenderSpec.template === "concept" && inferredRenderSpec.template !== "concept")
        ? inferredRenderSpec
        : requestedRenderSpec;
      return {
        ...scene,
        id: `scene-${Date.now()}-${index}`,
        narration: cleanNarration(scene.narration),
        durationSeconds: Math.max(8, Number(scene.durationSeconds) || 20),
        visualElements,
        connections: Array.isArray(scene.connections) ? scene.connections : [],
        animationBeats: normalizeAnimationBeats(scene.animationBeats, visualElements.length),
        interaction: normalizeInteraction(scene.interaction, visualElements.length),
        renderSpec,
      };
    }),
  };
}

function PrecisionAnimation({
  source,
  progress,
  isPlaying,
  sceneDuration,
  fallback,
}: {
  source: string;
  progress: number;
  isPlaying: boolean;
  sceneDuration: number;
  fallback: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isReady || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const target = video.duration * Math.min(1, Math.max(0, progress / 100));
    video.playbackRate = Math.min(16, Math.max(0.0625, video.duration / Math.max(1, sceneDuration)));
    if (isPlaying) {
      if (Math.abs(video.currentTime - target) > 1.4) video.currentTime = target;
      void video.play().catch(() => undefined);
    } else {
      video.pause();
      if (Math.abs(video.currentTime - target) > 0.08) video.currentTime = target;
    }
  }, [isPlaying, isReady, progress, sceneDuration]);

  return (
    <div className={`precision-animation-shell ${isReady ? "is-ready" : "is-loading"}`}>
      <div className="precision-animation-fallback">{fallback}</div>
      <video
        aria-label="Precision animated explanation"
        className="precision-animation"
        muted
        onCanPlay={() => {
          const video = videoRef.current;
          if (!video || !Number.isFinite(video.duration)) return;
          video.currentTime = video.duration * Math.min(1, Math.max(0, progress / 100));
          setIsReady(true);
        }}
        playsInline
        preload="auto"
        ref={videoRef}
        src={source}
      />
    </div>
  );
}

function SceneVisual({
  scene,
  selectedItem,
  onSelectItem,
  isPlaying,
  progress,
  interactionValue,
  precisionRender,
  commentPin,
  comment,
  onCommentChange,
  onPinComment,
  onInteractionChange,
}: {
  scene: Scene;
  selectedItem: string;
  onSelectItem: (item: string) => void;
  isPlaying: boolean;
  progress: number;
  interactionValue: number;
  precisionRender?: PrecisionRender;
  commentPin?: VideoCommentPin;
  comment: string;
  onCommentChange: (value: string) => void;
  onPinComment: (item: string, x: number, y: number) => void;
  onInteractionChange: (value: number) => void;
}) {
  const inlineCommentRef = useRef<HTMLInputElement>(null);
  const legacyItems = (scene as Scene & { visualItems?: string[] }).visualItems;
  const visualElements = Array.isArray(scene.visualElements)
    ? scene.visualElements
    : (legacyItems || []).map((label) => ({
        label,
        detail: "",
        role: "context" as const,
        accent: "ink" as const,
        symbol: "node",
      }));
  const animationBeats = Array.isArray(scene.animationBeats) ? scene.animationBeats : [];
  const connections = Array.isArray(scene.connections) ? scene.connections : [];
  const activeBeat = animationBeats.reduce<AnimationBeat | null>(
    (current, beat) => beat.atPercent <= progress ? beat : current,
    null,
  );
  const hasTimeline = animationBeats.length > 0;
  const visibleIndexes = new Set<number>();
  if (hasTimeline) {
    animationBeats.forEach((beat) => {
      if (beat.atPercent > progress) return;
      if (beat.action === "remove" && beat !== activeBeat) visibleIndexes.delete(beat.targetIndex);
      else visibleIndexes.add(beat.targetIndex);
      if (beat.relatedIndex >= 0) visibleIndexes.add(beat.relatedIndex);
    });
  }
  if (visibleIndexes.size === 0 && visualElements.length > 0) {
    visibleIndexes.add(animationBeats[0]?.targetIndex ?? 0);
    if (animationBeats[0]?.relatedIndex >= 0) visibleIndexes.add(animationBeats[0].relatedIndex);
  }

  const interaction = normalizeInteraction(scene.interaction, visualElements.length);
  const range = Math.max(1, interaction.max - interaction.min);
  const interactionRatio = (interactionValue - interaction.min) / range;
  const countMarks = Math.max(1, Math.min(6, Math.round(1 + interactionRatio * 5)));
  const precisionSource = precisionRender?.status === "ready" ? precisionRender.videoUrl : undefined;
  const fallbackVisual = <SemanticDiagram scene={scene} progress={progress} isPlaying={isPlaying} />;
  const hasPrimaryVisual = Boolean(precisionSource);

  useEffect(() => {
    if (commentPin) inlineCommentRef.current?.focus();
  }, [commentPin]);

  function manipulationStyle(index: number): React.CSSProperties {
    if (index !== interaction.targetIndex) return {};
    const relative = interactionValue - interaction.defaultValue;
    const styles: Record<string, string | number> = {
      "--direct-rotate": "0deg",
      "--direct-scale": 1,
      "--direct-shift": "0rem",
      "--direct-opacity": 1,
    };
    if (interaction.effect === "rotate") styles["--direct-rotate"] = `${relative}deg`;
    if (interaction.effect === "scale") styles["--direct-scale"] = 0.72 + interactionRatio * 0.65;
    if (interaction.effect === "translate" || interaction.effect === "flow") styles["--direct-shift"] = `${(interactionRatio - 0.5) * 3}rem`;
    if (interaction.effect === "intensity") styles["--direct-opacity"] = 0.35 + interactionRatio * 0.65;
    return styles as React.CSSProperties;
  }

  return (
    <div className={`scene-visual scene-${scene.visualType} motion-${scene.motion} ${isPlaying ? "is-animating" : ""}`}>
      <p className="scene-visual-title">{scene.visualTitle}</p>
      <div className="scene-sketch">
        {precisionSource
          ? (
              <PrecisionAnimation
                fallback={fallbackVisual}
                isPlaying={isPlaying}
                key={precisionSource}
                progress={progress}
                sceneDuration={scene.durationSeconds}
                source={precisionSource}
              />
            )
          : fallbackVisual}
        {precisionSource && (
          <div className="video-interaction-layer">
            <button
              aria-label="Click anywhere in the animation to pin a question"
              className="video-comment-surface"
              onClick={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                const x = Math.min(96, Math.max(4, ((event.clientX - bounds.left) / bounds.width) * 100));
                const y = Math.min(90, Math.max(8, ((event.clientY - bounds.top) / bounds.height) * 100));
                const itemIndex = Math.min(
                  Math.max(0, visualElements.length - 1),
                  Math.floor((x / 100) * Math.max(1, visualElements.length)),
                );
                const item = visualElements[itemIndex]?.label || scene.visualTitle || scene.title;
                onPinComment(item, x, y);
              }}
              type="button"
            >
              <span className="video-interaction-hint">Click the animation to ask here</span>
            </button>
            {commentPin && (
              <div
                className={`video-comment-pin ${commentPin.x > 66 ? "opens-left" : ""} ${commentPin.y > 65 ? "opens-up" : ""}`}
                style={{ left: `${commentPin.x}%`, top: `${commentPin.y}%` }}
              >
                <i aria-hidden="true" />
                <div>
                  <strong>{formatTime(commentPin.timestamp)} · {commentPin.label}</strong>
                  <input
                    aria-label={`Question about ${commentPin.label}`}
                    form="scene-comment-form"
                    onChange={(event) => onCommentChange(event.target.value)}
                    placeholder="What is unclear here?"
                    ref={inlineCommentRef}
                    value={comment}
                  />
                </div>
              </div>
            )}
            <div className="video-direct-control">
              <label htmlFor={`scene-control-${scene.id}`}>{interaction.label}</label>
              <input
                id={`scene-control-${scene.id}`}
                max={interaction.max}
                min={interaction.min}
                onChange={(event) => onInteractionChange(Number(event.target.value))}
                step={interaction.step}
                type="range"
                value={interactionValue}
              />
              <output>{interactionValue}{interaction.unit}</output>
            </div>
          </div>
        )}
        {!hasPrimaryVisual && <div className="scene-items">
          {visualElements.map((item, index) => (
            <button
              className={`accent-${item.accent} role-${item.role} ${!hasTimeline || visibleIndexes.has(index) ? "is-visible" : "is-waiting"} ${activeBeat?.targetIndex === index ? `is-current action-${activeBeat.action}` : ""} ${activeBeat?.relatedIndex === index ? `is-related related-${activeBeat.action}` : ""} ${selectedItem === item.label ? "is-selected" : ""}`}
              key={`${item.label}-${index}`}
              onClick={() => onSelectItem(item.label)}
              style={{ "--item-index": index, ...manipulationStyle(index) } as React.CSSProperties}
              type="button"
            >
              <span className={`scene-item-symbol shape-${visualShape(item.symbol, index)}`} aria-hidden="true">
                {interaction.effect === "count" && index === interaction.targetIndex
                  ? Array.from({ length: countMarks }, (_, mark) => <i key={mark} />)
                  : visualShape(item.symbol, index) === "bars"
                    ? Array.from({ length: 7 }, (_, mark) => <i key={mark} />)
                    : <i />}
              </span>
              <strong>{item.label.replace(/^Action\s*\d+\s*:\s*/i, "")}</strong>
            </button>
          ))}
        </div>}
        {!hasPrimaryVisual && connections.length > 0 && (
          <div className="scene-connections" aria-label="Visual relationships">
            {connections.map((connection, index) => {
              const from = visualElements[connection.from]?.label;
              const to = visualElements[connection.to]?.label;
              if (!from || !to) return null;
              const isVisible = !hasTimeline || (visibleIndexes.has(connection.from) && visibleIndexes.has(connection.to));
              return <span aria-label={`${from} ${connection.label} ${to}`} className={isVisible ? "is-visible" : "is-waiting"} key={`${from}-${to}-${index}`}><i /></span>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function LearningStudio() {
  const [mode, setMode] = useState<SourceMode>("topic");
  const [source, setSource] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [workState, setWorkState] = useState<WorkState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);
  const [selectedItem, setSelectedItem] = useState("");
  const [comment, setComment] = useState("");
  const [refineState, setRefineState] = useState<RefineState>("idle");
  const [audioState, setAudioState] = useState<AudioState>("idle");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [interactionValues, setInteractionValues] = useState<Record<string, number>>({});
  const [precisionRenders, setPrecisionRenders] = useState<Record<string, PrecisionRender>>({});
  const [commentPins, setCommentPins] = useState<Record<string, VideoCommentPin>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef(new Map<string, string>());
  const audioRequestRef = useRef(new Map<string, Promise<string>>());
  const audioDurationRef = useRef(new Map<string, number>());
  const pendingSeekRef = useRef(new Map<string, number>());
  const audioUnavailableRef = useRef(new Set<string>());
  const loadedSceneIdRef = useRef("");
  const precisionRequestRef = useRef(new Set<string>());
  const lessonRef = useRef<Lesson | null>(null);
  const activeSceneIndexRef = useRef(0);
  const startSceneAudioRef = useRef<(index: number) => Promise<void>>(async () => {});
  const chooseSceneRef = useRef<(index: number) => void>(() => {});

  const activeScene = lesson?.scenes[activeSceneIndex] ?? null;
  const activeInteraction = activeScene ? normalizeInteraction(activeScene.interaction, activeScene.visualElements.length) : null;
  const activeInteractionValue = activeScene && activeInteraction
    ? interactionValues[activeScene.id] ?? activeInteraction.defaultValue
    : 0;
  const activeSubtitle = activeScene ? subtitleAtProgress(activeScene.narration, sceneProgress) : null;
  const totalDuration = useMemo(
    () => lesson?.scenes.reduce((total, scene) => total + scene.durationSeconds, 0) ?? 0,
    [lesson],
  );
  const elapsedBeforeScene = useMemo(
    () => lesson?.scenes.slice(0, activeSceneIndex).reduce((total, scene) => total + scene.durationSeconds, 0) ?? 0,
    [activeSceneIndex, lesson],
  );

  useEffect(() => {
    lessonRef.current = lesson;
    activeSceneIndexRef.current = activeSceneIndex;
  }, [activeSceneIndex, lesson]);

  useEffect(() => {
    const audio = new Audio();
    const audioCache = audioCacheRef.current;
    const audioRequests = audioRequestRef.current;
    audio.preload = "auto";
    audioRef.current = audio;

    const updateProgress = () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      setSceneProgress(Math.min(100, (audio.currentTime / audio.duration) * 100));
    };
    const finishScene = () => {
      const currentLesson = lessonRef.current;
      const currentIndex = activeSceneIndexRef.current;
      if (currentLesson && currentIndex < currentLesson.scenes.length - 1) {
        const nextIndex = currentIndex + 1;
        setActiveSceneIndex(nextIndex);
        activeSceneIndexRef.current = nextIndex;
        setSceneProgress(0);
        setSelectedItem("");
        setComment("");
        void startSceneAudioRef.current(nextIndex);
      } else {
        setSceneProgress(100);
        setIsPlaying(false);
        setAudioState("idle");
      }
    };
    const syncDuration = () => {
      const currentIndex = activeSceneIndexRef.current;
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      setLesson((current) => {
        if (!current?.scenes[currentIndex]) return current;
        const roundedDuration = Math.ceil(audio.duration);
        if (current.scenes[currentIndex].durationSeconds === roundedDuration) return current;
        const scenes = [...current.scenes];
        scenes[currentIndex] = { ...scenes[currentIndex], durationSeconds: roundedDuration };
        return { ...current, scenes };
      });
    };

    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("ended", finishScene);
    audio.addEventListener("loadedmetadata", syncDuration);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("ended", finishScene);
      audio.removeEventListener("loadedmetadata", syncDuration);
      audioCache.forEach((url) => URL.revokeObjectURL(url));
      audioCache.clear();
      audioRequests.clear();
    };
  }, []);

  async function getSceneAudioUrl(scene: Scene, silent = false) {
    const cached = audioCacheRef.current.get(scene.id);
    if (cached) return cached;
    const pending = audioRequestRef.current.get(scene.id);
    if (pending) return pending;
    if (audioUnavailableRef.current.has(scene.id)) throw new Error("Narration is unavailable.");

    const request = (async () => {
      let response: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: scene.title, text: scene.narration }),
        });
        if (response.ok) break;

        const payload = await response.clone().json().catch(() => ({})) as {
          error?: string;
          retryAfterSeconds?: number;
        };
        const retryable = response.status === 429 || response.status === 503;
        if (!retryable || attempt === 1) {
          audioUnavailableRef.current.add(scene.id);
          throw new Error(payload.error || "Narration could not be generated.");
        }
        const headerDelay = Number(response.headers.get("Retry-After"));
        const retryAfter = Math.max(
          2,
          Math.min(59, Number(payload.retryAfterSeconds) || (Number.isFinite(headerDelay) ? headerDelay : 7)),
        );
        if (!silent) setStatusMessage(`Gemini voice quota reached. Retrying this scene in ${retryAfter}s…`);
        await wait(retryAfter * 1000);
      }
      if (!response?.ok) throw new Error("Narration could not be generated.");
      const duration = Number(response.headers.get("X-Audio-Duration"));
      if (Number.isFinite(duration) && duration > 0) audioDurationRef.current.set(scene.id, duration);
      const url = URL.createObjectURL(await response.blob());
      audioCacheRef.current.set(scene.id, url);
      return url;
    })();
    audioRequestRef.current.set(scene.id, request);
    try {
      return await request;
    } finally {
      audioRequestRef.current.delete(scene.id);
    }
  }

  async function startSceneAudio(index: number) {
    const currentLesson = lessonRef.current;
    const scene = currentLesson?.scenes[index];
    const audio = audioRef.current;
    if (!scene || !audio) return;

    setAudioState("loading");
    setIsPlaying(false);
    try {
      const url = await getSceneAudioUrl(scene);
      if (activeSceneIndexRef.current !== index) return;
      if (loadedSceneIdRef.current !== scene.id) {
        audio.src = url;
        loadedSceneIdRef.current = scene.id;
        audio.currentTime = pendingSeekRef.current.get(scene.id) ?? 0;
      }
      audio.playbackRate = playbackRate;
      await audio.play();
      setAudioState("playing");
      setIsPlaying(true);
      const nextScene = currentLesson.scenes[index + 1];
      if (nextScene) void getSceneAudioUrl(nextScene, true).catch(() => undefined);
    } catch {
      setAudioState("error");
      setIsPlaying(false);
    }
  }

  useEffect(() => {
    startSceneAudioRef.current = startSceneAudio;
  });

  function togglePlayback() {
    const audio = audioRef.current;
    if (!activeScene || !audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      setAudioState("idle");
      return;
    }

    if (sceneProgress >= 100 && activeSceneIndex === (lesson?.scenes.length ?? 1) - 1) {
      setActiveSceneIndex(0);
      activeSceneIndexRef.current = 0;
      setSceneProgress(0);
      void startSceneAudio(0);
      return;
    }

    void startSceneAudio(activeSceneIndex);
  }

  function jumpSeconds(delta: number) {
    const audio = audioRef.current;
    if (!activeScene || !audio) return;
    const currentTime = loadedSceneIdRef.current === activeScene.id
      ? audio.currentTime
      : activeScene.durationSeconds * (sceneProgress / 100);
    const target = currentTime + delta;

    if (target < 0 && activeSceneIndex > 0) {
      const wasPlaying = isPlaying;
      chooseSceneRef.current(activeSceneIndex - 1);
      if (wasPlaying) void startSceneAudio(activeSceneIndex - 1);
      return;
    }
    if (target > activeScene.durationSeconds && lesson && activeSceneIndex < lesson.scenes.length - 1) {
      const wasPlaying = isPlaying;
      chooseSceneRef.current(activeSceneIndex + 1);
      if (wasPlaying) void startSceneAudio(activeSceneIndex + 1);
      return;
    }

    const nextTime = Math.min(activeScene.durationSeconds, Math.max(0, target));
    pendingSeekRef.current.set(activeScene.id, nextTime);
    if (loadedSceneIdRef.current === activeScene.id && Number.isFinite(audio.duration)) {
      audio.currentTime = Math.min(audio.duration, nextTime);
    }
    setSceneProgress((nextTime / activeScene.durationSeconds) * 100);
  }

  function moveScene(delta: number) {
    if (!lesson) return;
    const nextIndex = Math.min(lesson.scenes.length - 1, Math.max(0, activeSceneIndex + delta));
    if (nextIndex === activeSceneIndex) return;
    const wasPlaying = isPlaying;
    chooseSceneRef.current(nextIndex);
    if (wasPlaying) void startSceneAudio(nextIndex);
  }

  function cyclePlaybackRate() {
    const rates = [1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) audioRef.current.playbackRate = nextRate;
  }

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePlayback();
      } else if (event.key === "ArrowLeft" || event.key.toLowerCase() === "j") {
        event.preventDefault();
        if (event.shiftKey) moveScene(-1);
        else jumpSeconds(-10);
      } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "l") {
        event.preventDefault();
        if (event.shiftKey) moveScene(1);
        else jumpSeconds(10);
      } else if (event.key === ">") {
        event.preventDefault();
        cyclePlaybackRate();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  function selectMode(nextMode: SourceMode) {
    setMode(nextMode);
    setStatusMessage("");
    if (nextMode === "pdf") fileInputRef.current?.click();
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setMode("pdf");
    setStatusMessage("");
  }

  async function preparePrecisionScene(scene: Scene) {
    if (!needsPrecisionRender(scene)) return true;
    if (precisionRequestRef.current.has(scene.id)) return true;
    precisionRequestRef.current.add(scene.id);
    setPrecisionRenders((current) => ({ ...current, [scene.id]: { status: "rendering" } }));
    try {
      const response = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scene),
      });
      const result = await response.json() as PrecisionRender & { error?: string };
      if (!response.ok || !result.videoUrl) throw new Error(result.error || "Precision render failed.");
      setPrecisionRenders((current) => ({
        ...current,
        [scene.id]: {
          status: "ready",
          engine: result.engine,
          template: result.template,
          videoUrl: result.videoUrl,
        },
      }));
      return true;
    } catch {
      setPrecisionRenders((current) => ({ ...current, [scene.id]: { status: "error" } }));
      return false;
    }
  }

  async function preparePrecisionLesson(scenes: Scene[]) {
    const precisionScenes = scenes.filter(needsPrecisionRender);
    if (precisionScenes.length === 0) return;
    const health = await fetch("/api/render").catch(() => null);
    if (!health?.ok) {
      setStatusMessage("The precision renderer is offline, so prepared diagrams will cover those scenes.");
      return;
    }
    let completed = 0;
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < precisionScenes.length) {
        const scene = precisionScenes[nextIndex];
        nextIndex += 1;
        setStatusMessage(`Rendering precise animation ${Math.min(nextIndex, precisionScenes.length)} of ${precisionScenes.length}…`);
        if (await preparePrecisionScene(scene)) completed += 1;
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, precisionScenes.length) }, () => worker()));
    if (completed !== precisionScenes.length) {
      setStatusMessage(`${completed} of ${precisionScenes.length} precision animations are prepared. Diagrams cover the rest.`);
    }
  }

  async function buildLesson(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const hasSource = mode === "pdf" ? Boolean(selectedFile) : Boolean(source.trim());
    if (!hasSource) {
      setWorkState("error");
      setStatusMessage(mode === "pdf" ? "Choose a PDF first." : "Write a topic or paste your material first.");
      return;
    }
    if (selectedFile && selectedFile.size > 8 * 1024 * 1024) {
      setWorkState("error");
      setStatusMessage("Choose a PDF smaller than 8 MB for this version.");
      return;
    }

    setWorkState("building");
    setStatusMessage("Building the visual lesson…");
    setIsPlaying(false);
    setLesson(null);
    lessonRef.current = null;
    setInteractionValues({});
    setPrecisionRenders({});
    setCommentPins({});
    precisionRequestRef.current.clear();
    audioRef.current?.pause();

    try {
      const file = selectedFile
        ? {
            name: selectedFile.name,
            mimeType: selectedFile.type || "application/pdf",
            data: await fileToBase64(selectedFile),
          }
        : undefined;
      const response = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, source, file }),
      });
      const result = (await response.json()) as Omit<Lesson, "scenes"> & {
        scenes: Array<Omit<Scene, "id">>;
        error?: string;
      };
      if (!response.ok || result.error) throw new Error(result.error || "The lesson could not be built.");
      if (!result.scenes?.length) throw new Error("The lesson did not contain any scenes.");

      const nextLesson = normalizeLesson(result);
      audioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      audioCacheRef.current.clear();
      audioRequestRef.current.clear();
      audioDurationRef.current.clear();
      pendingSeekRef.current.clear();
      audioUnavailableRef.current.clear();
      loadedSceneIdRef.current = "";
      setActiveSceneIndex(0);
      activeSceneIndexRef.current = 0;
      setSceneProgress(0);
      setSelectedItem("");
      setComment("");
      setLesson(nextLesson);
      lessonRef.current = nextLesson;
      setInteractionValues(Object.fromEntries(nextLesson.scenes.map((scene) => [scene.id, scene.interaction.defaultValue])));
      setStatusMessage("Preparing every visual before playback…");
      await preparePrecisionLesson(nextLesson.scenes);
      setWorkState("ready");
      setStatusMessage("Lesson ready. Every visual is prepared.");
    } catch (error) {
      setWorkState("error");
      setStatusMessage(error instanceof Error ? error.message : "The lesson could not be built.");
    }
  }

  function chooseScene(index: number) {
    audioRef.current?.pause();
    setIsPlaying(false);
    setAudioState("idle");
    setActiveSceneIndex(index);
    activeSceneIndexRef.current = index;
    setSceneProgress(0);
    setSelectedItem("");
    setComment("");
    setRefineState("idle");
  }

  useEffect(() => {
    chooseSceneRef.current = chooseScene;
  });

  function selectVisualItem(item: string) {
    setSelectedItem(item);
    setComment(`I am unclear about “${item}”. Explain and redraw this part more precisely.`);
    window.requestAnimationFrame(() => commentRef.current?.focus());
  }

  function pinVideoComment(item: string, x: number, y: number) {
    if (!activeScene) return;
    audioRef.current?.pause();
    setIsPlaying(false);
    setAudioState("idle");
    const timestamp = activeScene.durationSeconds * (sceneProgress / 100);
    setSelectedItem(item);
    setCommentPins((current) => ({
      ...current,
      [activeScene.id]: { x, y, label: item, timestamp },
    }));
    setComment(`At ${formatTime(timestamp)}, about “${item}”: `);
  }

  function changeSceneInteraction(value: number) {
    if (!activeScene || !activeInteraction) return;
    audioRef.current?.pause();
    setIsPlaying(false);
    setAudioState("idle");
    setInteractionValues((current) => ({ ...current, [activeScene.id]: value }));
    const ratio = (value - activeInteraction.min) / Math.max(1, activeInteraction.max - activeInteraction.min);
    const nextProgress = Math.min(100, Math.max(0, ratio * 100));
    const targetSeconds = activeScene.durationSeconds * (nextProgress / 100);
    pendingSeekRef.current.set(activeScene.id, targetSeconds);
    if (loadedSceneIdRef.current === activeScene.id && audioRef.current && Number.isFinite(audioRef.current.duration)) {
      audioRef.current.currentTime = audioRef.current.duration * (nextProgress / 100);
    }
    setSceneProgress(nextProgress);
  }

  async function refineScene(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lesson || !activeScene || !comment.trim()) {
      setRefineState("error");
      return;
    }

    setRefineState("working");
    setIsPlaying(false);
    try {
      const response = await fetch("/api/lesson/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonTitle: lesson.title, scene: activeScene, comment }),
      });
      const result = (await response.json()) as Omit<Scene, "id"> & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || "This scene could not be revised.");

      const revisionAudioId = `${activeScene.id}-revision-${Date.now()}`;
      const inferredRevisionRenderSpec = fallbackRenderSpec(result);
      const revisionRenderSpec = !result.renderSpec
        || inferredRevisionRenderSpec.template === "cell_division"
        || (result.renderSpec.template === "concept" && inferredRevisionRenderSpec.template !== "concept")
        ? inferredRevisionRenderSpec
        : result.renderSpec;
      const revisionCandidate: Scene = {
        ...result,
        id: revisionAudioId,
        narration: cleanNarration(result.narration),
        durationSeconds: Math.max(8, Number(result.durationSeconds) || activeScene.durationSeconds),
        animationBeats: normalizeAnimationBeats(result.animationBeats, result.visualElements?.length || 0),
        interaction: normalizeInteraction(result.interaction, result.visualElements?.length || 0),
        renderSpec: revisionRenderSpec,
        revision: comment.trim(),
      };
      const revisionAudio = await getSceneAudioUrl(revisionCandidate);
      const revisedScene: Scene = {
        ...revisionCandidate,
        id: activeScene.id,
        durationSeconds: Math.max(
          8,
          Math.ceil(audioDurationRef.current.get(revisionAudioId) ?? revisionCandidate.durationSeconds),
        ),
      };

      const previousAudio = audioCacheRef.current.get(activeScene.id);
      if (previousAudio) URL.revokeObjectURL(previousAudio);
      audioCacheRef.current.delete(activeScene.id);
      audioCacheRef.current.delete(revisionAudioId);
      audioCacheRef.current.set(activeScene.id, revisionAudio);
      audioDurationRef.current.delete(activeScene.id);
      audioDurationRef.current.set(activeScene.id, revisedScene.durationSeconds);
      audioDurationRef.current.delete(revisionAudioId);
      audioUnavailableRef.current.delete(activeScene.id);
      audioUnavailableRef.current.delete(revisionAudioId);
      if (loadedSceneIdRef.current === activeScene.id) loadedSceneIdRef.current = "";

      setInteractionValues((current) => ({ ...current, [activeScene.id]: revisedScene.interaction.defaultValue }));
      setLesson((current) => {
        if (!current) return current;
        const scenes = [...current.scenes];
        scenes[activeSceneIndex] = revisedScene;
        return { ...current, scenes };
      });
      setComment("");
      setSelectedItem("");
      setCommentPins((current) => {
        const next = { ...current };
        delete next[activeScene.id];
        return next;
      });
      setSceneProgress(0);
      setRefineState("done");
      precisionRequestRef.current.delete(activeScene.id);
      setPrecisionRenders((current) => {
        const next = { ...current };
        delete next[activeScene.id];
        return next;
      });
      void preparePrecisionScene(revisedScene);
    } catch {
      setRefineState("error");
    }
  }

  return (
    <main className="workbench-shell">
      <header className="workbench-header">
        <Link className="workbench-brand" href="/" aria-label="Ocular home">Ocular</Link>
        <div className="workbench-header-status">
          <span className={workState === "building" ? "is-working" : ""} />
          {workState === "building" ? "Building lesson" : lesson ? "Lesson studio" : "New lesson"}
        </div>
        <Link className="workbench-home" href="/">Back home <span aria-hidden="true">↗</span></Link>
      </header>

      <div className="workbench-grid">
        <aside className="lesson-source-panel">
          <div className="source-panel-heading">
            <span>01 / Source</span>
            <h1>Make a visual lesson.</h1>
            <p>Give Ocular a question, rough notes, or a PDF. The lesson grows only as long as the material needs.</p>
          </div>

          <form onSubmit={buildLesson}>
            <fieldset className="workbench-source-tabs">
              <legend className="sr-only">Choose source type</legend>
              {sourceModes.map((item, index) => (
                <button
                  className={mode === item.id ? "is-active" : ""}
                  key={item.id}
                  onClick={() => selectMode(item.id)}
                  type="button"
                  aria-pressed={mode === item.id}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
                </button>
              ))}
            </fieldset>

            <input
              className="sr-only"
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFile}
              tabIndex={-1}
            />

            <div className="workbench-source-entry">
              {mode === "pdf" ? (
                <button className="workbench-pdf" type="button" onClick={() => fileInputRef.current?.click()}>
                  <span className="workbench-pdf-mark">PDF</span>
                  <span>
                    <strong>{selectedFile?.name || "Choose your PDF"}</strong>
                    <small>{selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB · ready` : "Up to 8 MB · click to browse"}</small>
                  </span>
                  <span aria-hidden="true">↗</span>
                </button>
              ) : (
                <label>
                  <span>{mode === "topic" ? "Your topic or question" : "Your notes or source text"}</span>
                  <textarea
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    placeholder={mode === "topic" ? "e.g. How does attention work in a transformer?" : "Paste the full material here. It does not need to be tidy."}
                    rows={8}
                  />
                </label>
              )}
            </div>

            <div className="adaptive-length-row">
              <span className="adaptive-mark" aria-hidden="true">↔</span>
              <span><strong>Adaptive length</strong><small>No fixed duration or scene limit</small></span>
            </div>

            <output className={`workbench-message is-${workState}`}>{statusMessage || "Your source stays private to this session."}</output>

            <button className="workbench-build" disabled={workState === "building"} type="submit">
              <span>{workState === "building" ? "Building every scene" : lesson ? "Create a new version" : "Create my lesson"}</span>
              <span aria-hidden="true">{workState === "building" ? "···" : "→"}</span>
            </button>
          </form>
        </aside>

        <section className="interactive-video-panel" aria-label="Interactive lesson video">
          <div className="video-panel-heading">
            <div>
              <span>02 / Interactive lesson</span>
              <h2>{lesson?.title || "Your finished lesson appears here."}</h2>
            </div>
            <div className="video-meta">
              <span>{lesson ? "Complete lesson" : "Preparing"}</span>
              <strong>{lesson ? formatTime(totalDuration) : "Any length"}</strong>
            </div>
          </div>

          <div className={`video-stage is-${workState}`}>
            {!activeScene && workState !== "building" && (
              <div className="video-empty">
                <div className="empty-storyboard" aria-hidden="true">
                  <span>01</span><i /><span>02</span><i /><span>…</span>
                </div>
                <h3>Source in. Understanding out.</h3>
                <p>The source controls are always visible on the left. The generated lesson will replace this canvas.</p>
              </div>
            )}

            {workState === "building" && (
              <div className="video-building">
                <div className="build-sketch" aria-hidden="true"><i /><i /><i /></div>
                <h3>Building the visual lesson.</h3>
                <p>Each scene uses the same narrator, prepared when you play that scene.</p>
              </div>
            )}

            {activeScene && workState !== "building" && (
              <>
                <SceneVisual
                  scene={activeScene}
                  selectedItem={selectedItem}
                  onSelectItem={selectVisualItem}
                  isPlaying={isPlaying}
                  progress={sceneProgress}
                  interactionValue={activeInteractionValue}
                  precisionRender={precisionRenders[activeScene.id]}
                  commentPin={commentPins[activeScene.id]}
                  comment={comment}
                  onCommentChange={setComment}
                  onPinComment={pinVideoComment}
                  onInteractionChange={changeSceneInteraction}
                />
                {activeSubtitle && (
                  <div className="scene-subtitle" aria-live="polite">
                    <p>
                      {activeSubtitle.words.map((word, index) => (
                        <span className={index === activeSubtitle.activeWordIndex ? "is-speaking" : ""} key={`${word}-${index}`}>
                          {word}{index < activeSubtitle.words.length - 1 ? " " : ""}
                        </span>
                      ))}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="video-controls">
            <button className="transport-button" disabled={!lesson || activeSceneIndex === 0} onClick={() => moveScene(-1)} type="button" aria-label="Previous scene">|←</button>
            <button className="transport-button" disabled={!activeScene} onClick={() => jumpSeconds(-10)} type="button" aria-label="Go back 10 seconds">−10</button>
            <button
              className="play-button"
              disabled={!activeScene}
              onClick={togglePlayback}
              type="button"
              aria-label={audioState === "loading" ? "Generating narration" : isPlaying ? "Pause lesson" : "Play lesson with narration"}
            >
              {audioState === "loading" ? "···" : isPlaying ? "Ⅱ" : "▶"}
            </button>
            <button className="transport-button" disabled={!activeScene} onClick={() => jumpSeconds(10)} type="button" aria-label="Go forward 10 seconds">+10</button>
            <button className="transport-button playback-rate" disabled={!activeScene} onClick={cyclePlaybackRate} type="button" aria-label={`Playback speed ${playbackRate} times`}>{playbackRate}×</button>
            <div className="video-time">
              <span>{formatTime(elapsedBeforeScene + (activeScene?.durationSeconds ?? 0) * (sceneProgress / 100))}</span>
              <div><i style={{ width: `${lesson ? ((elapsedBeforeScene + (activeScene?.durationSeconds ?? 0) * (sceneProgress / 100)) / totalDuration) * 100 : 0}%` }} /></div>
              <span>{formatTime(totalDuration)}</span>
            </div>
            <span className={`audio-status is-${audioState}`} aria-live="polite">
              {audioState === "loading" ? "Preparing voice" : audioState === "error" ? "Audio unavailable" : isPlaying ? "Narrating" : "Sound on play"}
            </span>
            <button
              className="next-scene"
              disabled={!lesson || activeSceneIndex >= lesson.scenes.length - 1}
              onClick={() => chooseScene(activeSceneIndex + 1)}
              type="button"
            >→|</button>
            <span className="keyboard-hint">Space pause · ←/→ 10s · Shift + ←/→ scene · &gt; speed</span>
          </div>

          <form className="scene-comment-panel" id="scene-comment-form" onSubmit={refineScene}>
            <div className="comment-heading">
              <span>04 / Ask this scene</span>
              <h3>{activeScene ? `Change “${activeScene.title}”` : "Select a scene to question it"}</h3>
            </div>
            <div className="comment-entry">
              <label htmlFor="scene-comment">Tell AI exactly what is unclear or click any visual item above.</label>
              <textarea
                id="scene-comment"
                ref={commentRef}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="e.g. I do not understand why this arrow changes direction. Redraw that relationship step by step."
                rows={3}
                disabled={!activeScene || refineState === "working"}
              />
            </div>
            <button disabled={!activeScene || !comment.trim() || refineState === "working"} type="submit">
              <span>{refineState === "working" ? "Rebuilding only this scene" : refineState === "done" ? "Scene rebuilt" : "Refine this scene"}</span>
              <span aria-hidden="true">{refineState === "working" ? "···" : "↻"}</span>
            </button>
            {refineState === "error" && <p className="comment-error">Add a precise doubt, then try again.</p>}
          </form>
        </section>
      </div>
    </main>
  );
}
