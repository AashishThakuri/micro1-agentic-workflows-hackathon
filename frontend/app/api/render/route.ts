const DEFAULT_RENDERER_URL = "http://127.0.0.1:8789";

function rendererUrl(path: string) {
  const base = (process.env.OCULAR_RENDERER_URL || DEFAULT_RENDERER_URL).replace(/\/$/, "");
  return `${base}${path}`;
}

export async function GET() {
  try {
    const response = await fetch(rendererUrl("/health"), { signal: AbortSignal.timeout(5_000) });
    const payload = await response.json();
    return Response.json(payload, { status: response.status });
  } catch {
    return Response.json({ status: "offline" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let scene: unknown;
  try {
    scene = await request.json();
  } catch {
    return Response.json({ error: "The animation scene could not be read." }, { status: 400 });
  }

  try {
    const response = await fetch(rendererUrl("/render"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scene),
      signal: AbortSignal.timeout(180_000),
    });
    const payload = await response.json();
    return Response.json(payload, { status: response.status });
  } catch (error) {
    console.error("Ocular precision renderer unavailable", error);
    return Response.json(
      { error: "The precision renderer is unavailable. Ocular will use its live sketch renderer." },
      { status: 503 },
    );
  }
}
