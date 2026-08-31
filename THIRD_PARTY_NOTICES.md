# Third-party notices

Ocular's original project code is covered by the repository [LICENSE](LICENSE). Third-party software retains its own license; this file is a practical index, not a replacement for upstream license text.

## Main runtime dependencies

| Component | License family |
| --- | --- |
| React, React DOM, Vinext, Vite, Oxlint, Manim, SimPy, FastAPI | MIT |
| TypeScript | Apache-2.0 |
| Wrangler | MIT OR Apache-2.0 |
| SymPy, SciPy, NetworkX, RDKit, Astropy, GeoPandas, Shapely, Uvicorn | BSD-family licenses; see each upstream package |
| Biopython | Biopython License Agreement |

The exact resolved JavaScript and Python dependency versions are frozen in `frontend/pnpm-lock.yaml` and `backend/uv.lock`. Those lockfiles are the authoritative package inventory for reproducing this submission. Transitive dependencies and bundled fonts remain governed by their respective upstream license files.

Gemini and optional OpenAI integrations are external API services governed by their providers' terms. No provider model weights or API credentials are included in this repository.
