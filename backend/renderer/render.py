from __future__ import annotations

import hashlib
import json
import shutil
import threading
from pathlib import Path

import manim
from manim import tempconfig

from .models import RenderSceneRequest
from .scene import OcularScene


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "generated"
CACHE_DIR = ROOT / ".renderer-cache"
RENDER_LOCK = threading.Lock()


def cache_key(request: RenderSceneRequest) -> str:
    payload = request.model_dump(mode="json", by_alias=True)
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:24]


def render_scene(request: RenderSceneRequest) -> tuple[Path, bool]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    identifier = cache_key(request)
    destination = OUTPUT_DIR / f"{identifier}.mp4"
    if destination.exists() and destination.stat().st_size > 10_000:
        return destination, True

    work_dir = CACHE_DIR / identifier
    if work_dir.exists():
        shutil.rmtree(work_dir)
    work_dir.mkdir(parents=True)

    with RENDER_LOCK:
        with tempconfig(
            {
                "media_dir": str(work_dir),
                "output_file": identifier,
                "format": "mp4",
                "pixel_width": 1280,
                "pixel_height": 720,
                "frame_rate": 30,
                "background_color": "#f2eee4",
                "disable_caching": True,
                "write_to_movie": True,
                "save_last_frame": False,
                "verbosity": "WARNING",
            }
        ):
            OcularScene.request = request
            scene = OcularScene()
            scene.render()
            movie_path = Path(scene.renderer.file_writer.movie_file_path)
            if not movie_path.exists():
                raise RuntimeError("Manim did not produce a movie")
            shutil.copy2(movie_path, destination)

    shutil.rmtree(work_dir, ignore_errors=True)
    return destination, False


def versions() -> dict[str, str]:
    import astropy
    import Bio
    import geopandas
    import matplotlib
    import networkx
    import rdkit
    import scipy
    import simpy
    import shapely
    import sympy

    return {
        "manim": manim.__version__,
        "sympy": sympy.__version__,
        "scipy": scipy.__version__,
        "matplotlib": matplotlib.__version__,
        "networkx": networkx.__version__,
        "simpy": simpy.__version__,
        "rdkit": rdkit.__version__,
        "astropy": astropy.__version__,
        "biopython": Bio.__version__,
        "geopandas": geopandas.__version__,
        "shapely": shapely.__version__,
    }
