from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    head, *tail = value.split("_")
    return head + "".join(part.capitalize() for part in tail)


class OcularModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


RendererDomain = Literal[
    "mathematics",
    "physics",
    "chemistry",
    "biology",
    "astronomy",
    "geography",
    "computing",
    "economics",
    "history",
    "general",
]

RendererEngine = Literal[
    "manim",
    "scientific",
    "network",
    "simulation",
    "molecule",
    "biology",
    "astronomy",
    "map",
    "illustration",
    "sketch",
]

RendererTemplate = Literal[
    "function_graph",
    "derivative",
    "integral",
    "differential_equation",
    "distribution",
    "vector_field",
    "geometry",
    "matrix",
    "scientific_plot",
    "network",
    "process",
    "molecule",
    "phylogeny",
    "cell_division",
    "orbit",
    "map",
    "timeline",
    "illustration",
    "concept",
]


class RenderSpec(OcularModel):
    domain: RendererDomain = "general"
    engine: RendererEngine = "sketch"
    template: RendererTemplate = "concept"
    expression: str = "x"
    secondary_expression: str = ""
    parameter: str = "a"
    parameter_min: float = -2.0
    parameter_max: float = 2.0
    x_min: float = -5.0
    x_max: float = 5.0
    y_min: float = -3.0
    y_max: float = 3.0
    molecule_smiles: str = ""
    latitude: float = 0.0
    longitude: float = 0.0

    @field_validator("expression", "secondary_expression", "parameter", "molecule_smiles")
    @classmethod
    def limit_text(cls, value: str) -> str:
        return value.strip()[:240]

    @field_validator("x_max")
    @classmethod
    def valid_x_range(cls, value: float, info):
        x_min = info.data.get("x_min", -5.0)
        return value if value > x_min else x_min + 10.0

    @field_validator("y_max")
    @classmethod
    def valid_y_range(cls, value: float, info):
        y_min = info.data.get("y_min", -3.0)
        return value if value > y_min else y_min + 6.0


class VisualElement(OcularModel):
    label: str = "idea"
    detail: str = ""
    role: str = "context"
    accent: str = "ink"
    symbol: str = "node"


class Connection(OcularModel):
    from_index: int = Field(default=0, alias="from")
    to_index: int = Field(default=0, alias="to")
    label: str = ""


class RenderSceneRequest(OcularModel):
    id: str = "scene"
    title: str
    objective: str = ""
    narration: str = ""
    durationSeconds: int = 20
    visualTitle: str = ""
    visualMetaphor: str = ""
    visualElements: list[VisualElement] = Field(default_factory=list)
    connections: list[Connection] = Field(default_factory=list)
    renderSpec: RenderSpec = Field(default_factory=RenderSpec)

    @field_validator("title", "objective", "visualTitle", "visualMetaphor")
    @classmethod
    def limit_scene_text(cls, value: str) -> str:
        return value.strip()[:300]

    @field_validator("durationSeconds")
    @classmethod
    def limit_duration(cls, value: int) -> int:
        return max(6, min(180, value))


class RenderResult(OcularModel):
    id: str
    status: Literal["ready", "cached"]
    engine: str
    template: str
    videoUrl: str
    durationSeconds: float
