from __future__ import annotations

import asyncio
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from renderer.models import RenderResult, RenderSceneRequest
from renderer.render import OUTPUT_DIR, render_scene, versions


app = FastAPI(title="Ocular Renderer", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/renders", StaticFiles(directory=OUTPUT_DIR), name="renders")


@app.get("/health")
async def health():
    return {"status": "ok", "engines": versions()}


@app.post("/render", response_model=RenderResult)
async def render(request: Request, scene: RenderSceneRequest):
    try:
        path, cached = await asyncio.to_thread(render_scene, scene)
    except Exception as error:
        raise HTTPException(status_code=422, detail=f"Scene rendering failed: {error}") from error

    public_base = os.getenv("OCULAR_RENDERER_PUBLIC_URL", str(request.base_url).rstrip("/"))
    return RenderResult(
        id=scene.id,
        status="cached" if cached else "ready",
        engine=scene.renderSpec.engine,
        template=scene.renderSpec.template,
        videoUrl=f"{public_base}/renders/{path.name}",
        durationSeconds=scene.durationSeconds,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="127.0.0.1", port=8789, reload=False)
