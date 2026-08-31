from pathlib import Path

import pytest

from renderer.models import RenderSceneRequest, RenderSpec, VisualElement
from renderer.render import OUTPUT_DIR, cache_key, render_scene
from renderer.safe_math import numeric_function, parse_expression


def scene(template: str, **values) -> RenderSceneRequest:
    spec_values = {"template": template, "engine": "manim", "domain": "mathematics", **values}
    spec = RenderSpec(**spec_values)
    return RenderSceneRequest(
        id=f"test-{template}",
        title=template.replace("_", " "),
        visualTitle=template.replace("_", " "),
        durationSeconds=8,
        visualElements=[
            VisualElement(label="input", symbol="node"),
            VisualElement(label="change", symbol="arrow"),
            VisualElement(label="result", symbol="node"),
        ],
        renderSpec=spec,
    )


def test_safe_expression_parser_rejects_code():
    with pytest.raises((ValueError, TypeError, SyntaxError)):
        parse_expression("__import__('os').system('whoami')")


def test_safe_expression_is_numeric():
    expression, function = numeric_function("sin(x) + x**2")
    assert str(expression) == "x**2 + sin(x)"
    assert function(2) > 4


@pytest.mark.parametrize(
    ("template", "values"),
    [
        ("function_graph", {"expression": "sin(x)"}),
        ("derivative", {"expression": "x**3 - 2*x"}),
        ("integral", {"expression": "0.2*x**2 + 0.5"}),
        ("differential_equation", {"expression": "-0.7*y", "x_min": 0, "x_max": 5}),
        ("distribution", {"engine": "scientific"}),
        ("vector_field", {"engine": "scientific"}),
        ("geometry", {}),
        ("matrix", {}),
        ("scientific_plot", {"domain": "physics", "engine": "scientific", "expression": "sin(x)"}),
        ("network", {"domain": "computing", "engine": "network"}),
        ("process", {"domain": "computing", "engine": "simulation"}),
        ("molecule", {"domain": "chemistry", "engine": "molecule", "molecule_smiles": "CC(=O)O"}),
        ("phylogeny", {"domain": "biology", "engine": "biology"}),
        ("cell_division", {"domain": "biology", "engine": "biology"}),
        ("orbit", {"domain": "astronomy", "engine": "astronomy"}),
        (
            "map",
            {
                "domain": "geography",
                "engine": "map",
                "latitude": 27.7172,
                "longitude": 85.324,
            },
        ),
        ("timeline", {"domain": "history", "engine": "sketch"}),
        ("illustration", {"domain": "general", "engine": "illustration"}),
        ("concept", {"domain": "general", "engine": "sketch"}),
    ],
)
def test_domain_template_renders_video(template: str, values: dict, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("OCULAR_STRICT_RENDER", "1")
    request = scene(template, **values)
    cached_output = OUTPUT_DIR / f"{cache_key(request)}.mp4"
    cached_output.unlink(missing_ok=True)
    output, _ = render_scene(request)
    assert isinstance(output, Path)
    assert output.suffix == ".mp4"
    assert output.stat().st_size > 10_000
