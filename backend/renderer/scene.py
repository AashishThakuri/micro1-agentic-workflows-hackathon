from __future__ import annotations

import math
import logging
import os
from pathlib import Path

import geopandas as gpd
import networkx as nx
import numpy as np
import simpy
import sympy as sp
from Bio.Phylo.BaseTree import Clade, Tree
from manim import (
    AnimationGroup,
    Arrow,
    Axes,
    BLUE_D,
    Circle,
    Create,
    DashedLine,
    Dot,
    DOWN,
    Ellipse,
    FadeIn,
    FadeOut,
    GREEN_D,
    GrowArrow,
    LaggedStart,
    LEFT,
    Line,
    ManimColor,
    ORIGIN,
    Polygon,
    Rectangle,
    RED_D,
    ReplacementTransform,
    RIGHT,
    Rotate,
    Scene,
    SVGMobject,
    Text,
    Transform,
    UP,
    ValueTracker,
    VGroup,
    WHITE,
    always_redraw,
    config,
    linear,
)
from rdkit import Chem
from rdkit.Chem.Draw import rdMolDraw2D
from scipy.integrate import solve_ivp
from scipy.stats import norm
from shapely.geometry import LineString as GeoLineString

from .models import RenderSceneRequest
from .safe_math import numeric_function, parse_ode_expression


PAPER = ManimColor("#f2eee4")
INK = ManimColor("#171716")
OCHRE = ManimColor("#d1a32d")
DUSTY_RED = ManimColor("#a95d55")
MUTED_BLUE = ManimColor("#55758d")
OLIVE = ManimColor("#687143")
ACCENTS = [OCHRE, DUSTY_RED, MUTED_BLUE, OLIVE]
LOGGER = logging.getLogger(__name__)


def short_label(value: str, fallback: str) -> str:
    words = (value or fallback).replace("_", " ").split()
    return " ".join(words[:5])[:36]


class OcularScene(Scene):
    request: RenderSceneRequest

    def setup(self):
        self.camera.background_color = PAPER

    def construct(self):
        spec = self.request.renderSpec
        builders = {
            "function_graph": self.function_graph,
            "derivative": self.derivative,
            "integral": self.integral,
            "differential_equation": self.differential_equation,
            "distribution": self.distribution,
            "vector_field": self.vector_field,
            "geometry": self.geometry,
            "matrix": self.matrix,
            "scientific_plot": self.scientific_plot,
            "network": self.network,
            "process": self.process,
            "molecule": self.molecule,
            "phylogeny": self.phylogeny,
            "cell_division": self.cell_division,
            "orbit": self.orbit,
            "timeline": self.timeline,
            "map": self.map_scene,
            "illustration": self.subject_illustration,
            "concept": self.concept,
        }
        builder = builders.get(spec.template, self.concept)
        try:
            builder()
        except Exception as error:
            LOGGER.exception("Renderer template %s failed", spec.template)
            if os.getenv("OCULAR_STRICT_RENDER") == "1":
                raise
            self.clear()
            self.concept()

    def heading(self, fallback: str) -> Text:
        title = Text(
            short_label(self.request.visualTitle or self.request.title, fallback),
            color=INK,
            font_size=34,
            weight="MEDIUM",
        ).to_edge(UP, buff=0.32)
        self.play(FadeIn(title, shift=DOWN * 0.08), run_time=0.35)
        return title

    def axes(self) -> Axes:
        spec = self.request.renderSpec
        axes = Axes(
            x_range=[spec.x_min, spec.x_max, max(1.0, (spec.x_max - spec.x_min) / 5)],
            y_range=[spec.y_min, spec.y_max, max(1.0, (spec.y_max - spec.y_min) / 4)],
            x_length=10.5,
            y_length=5.3,
            axis_config={"color": INK, "stroke_width": 2, "include_ticks": False},
            tips=False,
        ).shift(DOWN * 0.25)
        return axes

    def function_graph(self):
        self.heading("Function")
        axes = self.axes()
        expression, fn = numeric_function(self.request.renderSpec.expression)
        graph = axes.plot(fn, color=MUTED_BLUE, stroke_width=6, discontinuities=[])
        label = Text(str(expression)[:32], color=INK, font_size=27).next_to(axes, DOWN, buff=0.15)
        self.play(Create(axes), run_time=0.6)
        self.play(Create(graph), FadeIn(label), run_time=2.5, rate_func=linear)
        tracker = ValueTracker(self.request.renderSpec.x_min)
        marker = always_redraw(lambda: Dot(
            axes.c2p(tracker.get_value(), fn(tracker.get_value())),
            color=OCHRE,
            radius=0.11,
        ))
        guide = always_redraw(lambda: DashedLine(
            axes.c2p(tracker.get_value(), 0),
            axes.c2p(tracker.get_value(), fn(tracker.get_value())),
            color=OLIVE,
        ))
        self.add(marker, guide)
        self.play(tracker.animate.set_value(self.request.renderSpec.x_max), run_time=3.5, rate_func=linear)

    def derivative(self):
        self.heading("Derivative")
        axes = self.axes()
        expression, fn = numeric_function(self.request.renderSpec.expression or "x**2")
        derivative = sp.diff(expression, sp.Symbol("x", real=True))
        derivative_fn = sp.lambdify(sp.Symbol("x", real=True), derivative, modules=["numpy"])
        graph = axes.plot(fn, color=MUTED_BLUE, stroke_width=5)
        tracker = ValueTracker(max(self.request.renderSpec.x_min + 0.5, -2.0))

        def tangent():
            x = tracker.get_value()
            slope = float(derivative_fn(x))
            center = axes.c2p(x, fn(x))
            direction = np.array([1.7, slope * 1.7 * axes.y_length / axes.x_length, 0])
            return Line(center - direction, center + direction, color=DUSTY_RED, stroke_width=5)

        dot = always_redraw(lambda: Dot(axes.c2p(tracker.get_value(), fn(tracker.get_value())), color=OCHRE, radius=0.1))
        tangent_line = always_redraw(tangent)
        self.play(Create(axes), Create(graph), run_time=1.6)
        self.add(tangent_line, dot)
        self.play(tracker.animate.set_value(min(self.request.renderSpec.x_max - 0.5, 2.0)), run_time=4.5, rate_func=linear)

    def integral(self):
        self.heading("Accumulated area")
        axes = self.axes()
        _, fn = numeric_function(self.request.renderSpec.expression or "0.15*x**2 + 1")
        graph = axes.plot(fn, color=MUTED_BLUE, stroke_width=5)
        self.play(Create(axes), Create(graph), run_time=1.5)
        groups = []
        for count in (5, 10, 20):
            rectangles = axes.get_riemann_rectangles(
                graph,
                x_range=[max(self.request.renderSpec.x_min, -3), min(self.request.renderSpec.x_max, 3)],
                dx=6 / count,
                color=[OCHRE, OLIVE],
                fill_opacity=0.55,
                stroke_width=1,
            )
            groups.append(rectangles)
        self.play(FadeIn(groups[0]), run_time=0.8)
        self.play(ReplacementTransform(groups[0], groups[1]), run_time=1.3)
        self.play(ReplacementTransform(groups[1], groups[2]), run_time=1.6)

    def differential_equation(self):
        self.heading("Changing over time")
        spec = self.request.renderSpec
        axes = self.axes()
        expression = spec.expression or "-0.7*y"
        rhs, t_symbol, y_symbol = parse_ode_expression(expression)
        fn = sp.lambdify((t_symbol, y_symbol), rhs, modules=["numpy"])
        start, end = max(0, spec.x_min), max(max(0, spec.x_min) + 1, spec.x_max)
        solution = solve_ivp(lambda t, y: [float(fn(t, y[0]))], (start, end), [1.0], dense_output=True)
        plot = axes.plot(lambda x: float(solution.sol(x)[0]), x_range=[start, end], color=MUTED_BLUE, stroke_width=6)
        self.play(Create(axes), run_time=0.7)
        self.play(Create(plot), run_time=3.4, rate_func=linear)
        tracker = ValueTracker(start)
        dot = always_redraw(lambda: Dot(axes.c2p(tracker.get_value(), float(solution.sol(tracker.get_value())[0])), color=OCHRE, radius=0.12))
        self.add(dot)
        self.play(tracker.animate.set_value(end), run_time=2.8, rate_func=linear)

    def distribution(self):
        self.heading("Distribution")
        axes = Axes(
            x_range=[-4, 4, 1], y_range=[0, 0.55, 0.1], x_length=10.8, y_length=5.1,
            axis_config={"color": INK, "stroke_width": 2, "include_ticks": False}, tips=False,
        ).shift(DOWN * 0.3)
        sigma = ValueTracker(1.8)
        curve = always_redraw(lambda: axes.plot(
            lambda x: norm.pdf(x, loc=0, scale=sigma.get_value()),
            x_range=[-4, 4], color=MUTED_BLUE, stroke_width=7,
        ))
        center = DashedLine(axes.c2p(0, 0), axes.c2p(0, 0.48), color=OLIVE)
        dots = VGroup(*[
            Dot(axes.c2p(x, 0), color=OCHRE, radius=0.07)
            for x in np.linspace(-3.2, 3.2, 41)
        ])
        self.play(Create(axes), run_time=0.7)
        self.play(LaggedStart(*[FadeIn(dot, shift=UP * 0.15) for dot in dots], lag_ratio=0.025), run_time=1.7)
        self.add(curve)
        self.play(Create(center), sigma.animate.set_value(0.75), run_time=2.4)
        self.play(sigma.animate.set_value(1.25), run_time=1.7)

    def vector_field(self):
        self.heading("Vector field")
        arrows = VGroup()
        for x in np.linspace(-5, 5, 11):
            for y in np.linspace(-2.5, 2.5, 6):
                vector = np.array([-y, x * 0.45, 0.0])
                length = np.linalg.norm(vector[:2]) or 1.0
                vector = vector / length * min(0.55, 0.17 + length * 0.05)
                arrows.add(Arrow([x, y, 0], [x + vector[0], y + vector[1], 0], buff=0, color=MUTED_BLUE, stroke_width=2, max_tip_length_to_length_ratio=0.25))
        particle = Dot([2.8, 0, 0], color=OCHRE, radius=0.12)
        orbit = Circle(radius=2.8, color=OLIVE, stroke_opacity=0.35)
        self.play(LaggedStart(*[GrowArrow(arrow) for arrow in arrows], lag_ratio=0.01), run_time=2.4)
        self.play(Create(orbit), FadeIn(particle), run_time=0.5)
        self.play(Rotate(particle, angle=2 * math.pi, about_point=ORIGIN), run_time=3.6, rate_func=linear)

    def geometry(self):
        self.heading("Geometry")
        angle = ValueTracker(45)
        base = Line(LEFT * 3.5, RIGHT * 3.5, color=INK, stroke_width=4)
        ray = always_redraw(lambda: Line(
            ORIGIN,
            3.2 * np.array([math.cos(math.radians(angle.get_value())), math.sin(math.radians(angle.get_value())), 0]),
            color=MUTED_BLUE,
            stroke_width=6,
        ))
        arc = always_redraw(lambda: Circle(radius=1.0, color=OCHRE, stroke_width=6).pointwise_become_partial(
            Circle(radius=1.0), 0, angle.get_value() / 360,
        ))
        label = always_redraw(lambda: Text(f"{angle.get_value():.0f}°", color=INK, font_size=38).move_to([1.2, 0.75, 0]))
        self.play(Create(base), run_time=0.5)
        self.add(ray, arc, label)
        self.play(angle.animate.set_value(120), run_time=3.6)
        self.play(angle.animate.set_value(90), run_time=1.4)

    def matrix(self):
        self.heading("Transformation")
        grid = VGroup(*[
            Line([x, -2.7, 0], [x, 2.7, 0], color=MUTED_BLUE, stroke_opacity=0.28)
            for x in np.linspace(-5, 5, 11)
        ], *[
            Line([-5, y, 0], [5, y, 0], color=MUTED_BLUE, stroke_opacity=0.28)
            for y in np.linspace(-2.5, 2.5, 6)
        ])
        shape = Polygon([-1.5, -1, 0], [1.5, -1, 0], [1, 1.3, 0], [-1, 1.3, 0], color=OCHRE, fill_opacity=0.25)
        transformed = shape.copy().apply_matrix([[1.25, 0.75], [0.2, 0.85]]).set_color(DUSTY_RED)
        self.play(Create(grid), Create(shape), run_time=1.2)
        self.play(Transform(shape, transformed), run_time=3.0)

    def scientific_plot(self):
        self.function_graph()

    def network(self):
        self.heading("Connected system")
        count = max(4, min(10, len(self.request.visualElements) or 7))
        graph = nx.path_graph(count)
        if count > 4:
            graph.add_edge(0, count // 2)
            graph.add_edge(count // 2, count - 1)
        positions = nx.spring_layout(graph, seed=8)
        points = {node: np.array([positions[node][0] * 4.7, positions[node][1] * 2.3 - 0.2, 0]) for node in graph.nodes}
        edges = VGroup(*[Line(points[a], points[b], color=INK, stroke_width=3) for a, b in graph.edges])
        nodes = VGroup(*[Circle(radius=0.26, color=ACCENTS[node % len(ACCENTS)], fill_opacity=0.72).move_to(points[node]) for node in graph.nodes])
        pulse = nodes[0].copy().set_color(OCHRE).scale(1.35)
        self.play(Create(edges), LaggedStart(*[FadeIn(node, scale=0.5) for node in nodes], lag_ratio=0.08), run_time=1.8)
        self.play(FadeIn(pulse), run_time=0.25)
        for node in nodes[1:]:
            self.play(Transform(pulse, node.copy().set_color(OCHRE).scale(1.35)), run_time=0.34)

    def process(self):
        self.heading("Process")
        environment = simpy.Environment()
        events: list[tuple[float, str]] = []

        def pipeline(env):
            labels = [short_label(item.label, f"Step {index + 1}") for index, item in enumerate(self.request.visualElements[:6])]
            for label in labels or ["Input", "Change", "Result"]:
                events.append((env.now, label))
                yield env.timeout(1)

        environment.process(pipeline(environment))
        environment.run()
        boxes = VGroup()
        for index, (_, label) in enumerate(events):
            box = Rectangle(width=2.2, height=1.15, color=ACCENTS[index % len(ACCENTS)], fill_opacity=0.15)
            text = Text(label, color=INK, font_size=23).move_to(box)
            boxes.add(VGroup(box, text))
        boxes.arrange(RIGHT, buff=0.65).scale_to_fit_width(11)
        arrows = VGroup(*[
            Arrow(boxes[index].get_right(), boxes[index + 1].get_left(), color=INK, buff=0.12)
            for index in range(len(boxes) - 1)
        ])
        self.play(LaggedStart(*[FadeIn(box, shift=RIGHT * 0.25) for box in boxes], lag_ratio=0.25), run_time=2.3)
        if len(arrows):
            self.play(LaggedStart(*[GrowArrow(arrow) for arrow in arrows], lag_ratio=0.22), run_time=1.7)

    def molecule(self):
        self.heading("Molecule")
        smiles = self.request.renderSpec.molecule_smiles or "CCO"
        molecule = Chem.MolFromSmiles(smiles) or Chem.MolFromSmiles("CCO")
        drawer = rdMolDraw2D.MolDraw2DSVG(900, 500)
        options = drawer.drawOptions()
        options.clearBackground = False
        options.bondLineWidth = 4
        rdMolDraw2D.PrepareAndDrawMolecule(drawer, molecule)
        drawer.FinishDrawing()
        svg_path = Path(config.media_dir) / "molecule.svg"
        svg_path.parent.mkdir(parents=True, exist_ok=True)
        svg_path.write_text(drawer.GetDrawingText(), encoding="utf-8")
        drawing = SVGMobject(str(svg_path), color=INK).scale_to_fit_height(4.8).shift(DOWN * 0.25)
        atoms = VGroup(*[Dot(drawing.get_center() + np.array([math.cos(i) * 2, math.sin(i) * 1.3, 0]), color=ACCENTS[i % len(ACCENTS)], radius=0.09) for i in range(min(8, molecule.GetNumAtoms()))])
        self.play(Create(drawing), run_time=2.5)
        self.play(LaggedStart(*[FadeIn(atom, scale=1.8) for atom in atoms], lag_ratio=0.09), run_time=1.4)

    def phylogeny(self):
        self.heading("Shared ancestry")
        names = [short_label(item.label, f"Species {index + 1}") for index, item in enumerate(self.request.visualElements[:7])]
        if len(names) < 4:
            names = ["Ancestor A", "Ancestor B", "Branch C", "Branch D"]

        def build_clade(items: list[str]) -> Clade:
            if len(items) == 1:
                return Clade(name=items[0], branch_length=1)
            midpoint = max(1, len(items) // 2)
            return Clade(branch_length=1, clades=[build_clade(items[:midpoint]), build_clade(items[midpoint:])])

        tree = Tree(root=build_clade(names))
        depths = tree.depths(unit_branch_lengths=True)
        max_depth = max(depths.values()) or 1
        terminals = tree.get_terminals()
        terminal_y = {
            terminal: 2.35 - index * 4.7 / max(1, len(terminals) - 1)
            for index, terminal in enumerate(terminals)
        }

        positions: dict[Clade, np.ndarray] = {}

        def position(clade: Clade) -> np.ndarray:
            if clade in positions:
                return positions[clade]
            y = terminal_y[clade] if clade.is_terminal() else float(np.mean([position(child)[1] for child in clade.clades]))
            x = -4.6 + depths[clade] / max_depth * 7.8
            positions[clade] = np.array([x, y - 0.25, 0])
            return positions[clade]

        position(tree.root)
        branches = VGroup()
        nodes = VGroup()
        labels = VGroup()
        for parent in tree.find_clades(order="level"):
            parent_point = positions[parent]
            nodes.add(Dot(parent_point, color=OCHRE if parent.is_terminal() else MUTED_BLUE, radius=0.1 if parent.is_terminal() else 0.075))
            if parent.is_terminal():
                labels.add(Text(short_label(parent.name or "species", "species"), color=INK, font_size=20).next_to(parent_point, RIGHT, buff=0.18))
            for child in parent.clades:
                child_point = positions[child]
                elbow = np.array([child_point[0], parent_point[1], 0])
                branches.add(Line(parent_point, elbow, color=INK, stroke_width=3), Line(elbow, child_point, color=INK, stroke_width=3))

        self.play(LaggedStart(*[Create(branch) for branch in branches], lag_ratio=0.04), run_time=2.5)
        self.play(LaggedStart(*[FadeIn(node, scale=1.7) for node in nodes], lag_ratio=0.05), run_time=1.0)
        self.play(LaggedStart(*[FadeIn(label, shift=RIGHT * 0.15) for label in labels], lag_ratio=0.08), run_time=1.2)

    def cell_division(self):
        self.heading("Cell division")
        membrane = Ellipse(width=10.4, height=5.0, color=INK, stroke_width=4).shift(DOWN * 0.25)
        left_pole = Dot([-4.0, -0.25, 0], color=OCHRE, radius=0.14)
        right_pole = Dot([4.0, -0.25, 0], color=OCHRE, radius=0.14)

        left_chromatids = VGroup()
        right_chromatids = VGroup()
        spindle = VGroup()
        for index, y in enumerate((-1.3, -0.45, 0.45, 1.3)):
            color = ACCENTS[index % len(ACCENTS)]
            left = VGroup(
                Line([-0.12, y - 0.28, 0], [-0.5, y, 0], color=color, stroke_width=7),
                Line([-0.5, y, 0], [-0.12, y + 0.28, 0], color=color, stroke_width=7),
            )
            right = VGroup(
                Line([0.12, y - 0.28, 0], [0.5, y, 0], color=color, stroke_width=7),
                Line([0.5, y, 0], [0.12, y + 0.28, 0], color=color, stroke_width=7),
            )
            left_chromatids.add(left)
            right_chromatids.add(right)
            spindle.add(
                Line(left_pole.get_center(), [-0.5, y, 0], color=MUTED_BLUE, stroke_width=2, stroke_opacity=0.55),
                Line(right_pole.get_center(), [0.5, y, 0], color=MUTED_BLUE, stroke_width=2, stroke_opacity=0.55),
            )

        self.play(Create(membrane), FadeIn(left_pole), FadeIn(right_pole), run_time=1.0)
        self.play(
            LaggedStart(*[Create(line) for line in spindle], lag_ratio=0.05),
            LaggedStart(*[FadeIn(part, scale=0.65) for part in [*left_chromatids, *right_chromatids]], lag_ratio=0.07),
            run_time=1.8,
        )
        self.play(
            left_chromatids.animate.shift(LEFT * 2.5),
            right_chromatids.animate.shift(RIGHT * 2.5),
            spindle.animate.set_stroke(opacity=0.18),
            run_time=2.6,
        )

        daughter_cells = VGroup(
            Ellipse(width=4.8, height=4.7, color=INK, stroke_width=4).shift(LEFT * 2.55 + DOWN * 0.25),
            Ellipse(width=4.8, height=4.7, color=INK, stroke_width=4).shift(RIGHT * 2.55 + DOWN * 0.25),
        )
        nuclei = VGroup(
            Ellipse(width=2.6, height=3.5, color=OLIVE, stroke_width=3).shift(LEFT * 2.55 + DOWN * 0.25),
            Ellipse(width=2.6, height=3.5, color=OLIVE, stroke_width=3).shift(RIGHT * 2.55 + DOWN * 0.25),
        )
        self.play(FadeOut(spindle), FadeOut(left_pole), FadeOut(right_pole), ReplacementTransform(membrane, daughter_cells), run_time=1.4)
        self.play(Create(nuclei), run_time=1.0)

    def orbit(self):
        self.heading("Orbit")
        center = Circle(radius=0.42, color=OCHRE, fill_opacity=0.8)
        paths = VGroup(*[Circle(radius=radius, color=MUTED_BLUE, stroke_opacity=0.42).stretch(0.58, 1) for radius in (1.7, 2.7, 3.7)])
        bodies = VGroup(*[Dot(path.point_from_proportion(index / 3), color=ACCENTS[index], radius=0.14) for index, path in enumerate(paths)])
        self.play(FadeIn(center), LaggedStart(*[Create(path) for path in paths], lag_ratio=0.18), run_time=1.5)
        self.play(LaggedStart(*[FadeIn(body) for body in bodies], lag_ratio=0.15), run_time=0.7)
        self.play(*[body.animate.move_to(path.point_from_proportion((index / 3 + 0.65) % 1)) for index, (body, path) in enumerate(zip(bodies, paths))], run_time=3.5, rate_func=linear)

    def timeline(self):
        self.heading("Timeline")
        items = self.request.visualElements[:6] or []
        count = max(3, len(items))
        line = Line(LEFT * 5.2, RIGHT * 5.2, color=INK, stroke_width=4)
        dots = VGroup()
        labels = VGroup()
        for index in range(count):
            x = -5.0 + index * 10.0 / max(1, count - 1)
            dots.add(Dot([x, -0.2, 0], color=ACCENTS[index % len(ACCENTS)], radius=0.15))
            label = short_label(items[index].label if index < len(items) else f"Stage {index + 1}", f"Stage {index + 1}")
            labels.add(Text(label, color=INK, font_size=20).move_to([x, (-1) ** index * 0.85 - 0.2, 0]))
        self.play(Create(line), run_time=0.8)
        self.play(LaggedStart(*[AnimationGroup(FadeIn(dot, scale=1.8), FadeIn(label)) for dot, label in zip(dots, labels)], lag_ratio=0.22), run_time=2.8)

    def map_scene(self):
        self.heading("Place and movement")
        world = Rectangle(width=10.5, height=5.2, color=INK, fill_color=MUTED_BLUE, fill_opacity=0.08)
        latitude = self.request.renderSpec.latitude
        longitude = self.request.renderSpec.longitude
        geo_route = GeoLineString([
            (longitude - 8, latitude - 3),
            (longitude - 1, latitude + 4),
            (longitude + 9, latitude - 1),
        ])
        bounds = gpd.GeoSeries([geo_route], crs="EPSG:4326").total_bounds
        min_x, min_y, max_x, max_y = bounds

        def screen_point(x: float, y: float) -> np.ndarray:
            width = max(1e-6, max_x - min_x)
            height = max(1e-6, max_y - min_y)
            return np.array([-4.4 + (x - min_x) / width * 8.8, -2 + (y - min_y) / height * 4, 0])

        route_points = [screen_point(x, y) for x, y in geo_route.coords]
        route = VGroup(*[
            Dot(route_points[0], color=OCHRE, radius=0.14),
            Dot(route_points[1], color=DUSTY_RED, radius=0.14),
            Dot(route_points[2], color=OLIVE, radius=0.14),
        ])
        links = VGroup(Arrow(route[0].get_center(), route[1].get_center(), color=INK, buff=0.2), Arrow(route[1].get_center(), route[2].get_center(), color=INK, buff=0.2))
        self.play(Create(world), run_time=0.7)
        self.play(LaggedStart(FadeIn(route[0]), GrowArrow(links[0]), FadeIn(route[1]), GrowArrow(links[1]), FadeIn(route[2]), lag_ratio=0.2), run_time=3.2)

    def subject_icon(self, label: str, symbol: str, index: int) -> VGroup:
        language = f"{self.request.title} {self.request.objective} {self.request.visualTitle} {label} {symbol}".lower()
        color = ACCENTS[index % len(ACCENTS)]

        if any(word in language for word in ("cell", "nucleus", "chromosome", "bacteria", "microbe")):
            membrane = Ellipse(width=2.2, height=1.65, color=INK, stroke_width=4)
            nucleus = Circle(radius=0.38, color=color, fill_opacity=0.28).shift(LEFT * 0.25)
            organelles = VGroup(*[
                Ellipse(width=0.38, height=0.17, color=OLIVE, fill_opacity=0.35).move_to(point)
                for point in ([0.52, 0.38, 0], [0.58, -0.4, 0], [-0.65, -0.42, 0])
            ])
            return VGroup(membrane, nucleus, organelles)

        if any(word in language for word in ("person", "human", "worker", "learner", "author", "leader")):
            head = Circle(radius=0.34, color=INK, fill_color=color, fill_opacity=0.28).shift(UP * 0.72)
            torso = Line([0, 0.38, 0], [0, -0.75, 0], color=INK, stroke_width=6)
            limbs = VGroup(
                Line([0, 0.12, 0], [-0.72, -0.25, 0], color=INK, stroke_width=5),
                Line([0, 0.12, 0], [0.72, -0.25, 0], color=INK, stroke_width=5),
                Line([0, -0.75, 0], [-0.55, -1.38, 0], color=INK, stroke_width=5),
                Line([0, -0.75, 0], [0.55, -1.38, 0], color=INK, stroke_width=5),
            )
            return VGroup(head, torso, limbs)

        if any(word in language for word in ("book", "document", "paper", "literature", "page", "text")):
            left_page = Polygon([-1.15, 0.75, 0], [-0.05, 0.48, 0], [-0.05, -0.92, 0], [-1.15, -0.64, 0], color=INK, fill_color=PAPER, fill_opacity=1)
            right_page = Polygon([0.05, 0.48, 0], [1.15, 0.75, 0], [1.15, -0.64, 0], [0.05, -0.92, 0], color=INK, fill_color=PAPER, fill_opacity=1)
            writing = VGroup(*[
                Line([-0.92, y, 0], [-0.24, y - 0.08, 0], color=color, stroke_width=2)
                for y in (0.34, 0.02, -0.3)
            ], *[
                Line([0.24, y - 0.08, 0], [0.92, y, 0], color=color, stroke_width=2)
                for y in (0.34, 0.02, -0.3)
            ])
            return VGroup(left_page, right_page, writing)

        if any(word in language for word in ("tree", "plant", "forest", "ecosystem", "branch", "root")):
            trunk = Polygon([-0.18, -1.15, 0], [0.18, -1.15, 0], [0.11, 0.25, 0], [-0.11, 0.25, 0], color=INK, fill_color=OCHRE, fill_opacity=0.42)
            branches = VGroup(
                Line([0, 0.05, 0], [-0.65, 0.62, 0], color=INK, stroke_width=4),
                Line([0, 0.12, 0], [0.62, 0.72, 0], color=INK, stroke_width=4),
            )
            crown = VGroup(*[
                Circle(radius=0.52, color=OLIVE, fill_opacity=0.28).move_to(point)
                for point in ([-0.62, 0.72, 0], [0, 0.95, 0], [0.62, 0.72, 0])
            ])
            return VGroup(trunk, branches, crown)

        if any(word in language for word in ("planet", "earth", "world", "globe", "place", "country", "map")):
            globe = Circle(radius=1.05, color=INK, fill_color=MUTED_BLUE, fill_opacity=0.14)
            meridians = VGroup(
                Ellipse(width=0.82, height=2.08, color=color, stroke_width=3),
                Ellipse(width=2.08, height=0.82, color=color, stroke_width=3),
                Line([-1.0, 0, 0], [1.0, 0, 0], color=INK, stroke_width=2),
            )
            return VGroup(globe, meridians)

        if any(word in language for word in ("gear", "machine", "engine", "mechanism", "factory")):
            points = []
            for step in range(24):
                angle = math.tau * step / 24
                radius = 1.0 if step % 2 == 0 else 0.76
                points.append([math.cos(angle) * radius, math.sin(angle) * radius, 0])
            gear = Polygon(*points, color=INK, fill_color=color, fill_opacity=0.28)
            hub = Circle(radius=0.28, color=INK, fill_color=PAPER, fill_opacity=1)
            return VGroup(gear, hub)

        if any(word in language for word in ("money", "coin", "currency", "bank", "econom")):
            coin = Circle(radius=0.95, color=INK, fill_color=OCHRE, fill_opacity=0.32)
            mark = Text("$", color=INK, font_size=58, weight="MEDIUM").move_to(coin)
            rings = Circle(radius=0.72, color=color, stroke_width=2)
            return VGroup(coin, rings, mark)

        if any(word in language for word in ("atom", "molecule", "bond", "chemical")):
            nucleus = Circle(radius=0.28, color=INK, fill_color=color, fill_opacity=0.6)
            orbits = VGroup(*[
                Ellipse(width=2.2, height=0.82, color=INK, stroke_width=3).rotate(angle)
                for angle in (0, math.pi / 3, -math.pi / 3)
            ])
            electrons = VGroup(*[
                Dot([math.cos(angle) * 0.95, math.sin(angle) * 0.5, 0], color=ACCENTS[(index + step) % len(ACCENTS)], radius=0.1)
                for step, angle in enumerate((0.2, 2.25, 4.2))
            ])
            return VGroup(orbits, nucleus, electrons)

        if any(word in language for word in ("signal", "sound", "wave", "frequency")):
            wave = VGroup(*[
                Line(
                    [-1.2 + step * 0.15, math.sin(step * 0.72) * 0.62, 0],
                    [-1.05 + step * 0.15, math.sin((step + 1) * 0.72) * 0.62, 0],
                    color=color,
                    stroke_width=5,
                )
                for step in range(15)
            ])
            return VGroup(wave)

        bulb = Circle(radius=0.72, color=INK, fill_color=color, fill_opacity=0.24).shift(UP * 0.25)
        filament = VGroup(
            Line([-0.25, 0.25, 0], [0, -0.1, 0], color=INK, stroke_width=3),
            Line([0, -0.1, 0], [0.25, 0.25, 0], color=INK, stroke_width=3),
            Rectangle(width=0.72, height=0.38, color=INK, fill_color=INK, fill_opacity=0.15).shift(DOWN * 0.62),
        )
        rays = VGroup(*[
            Line(
                [math.cos(angle) * 0.92, math.sin(angle) * 0.92 + 0.25, 0],
                [math.cos(angle) * 1.25, math.sin(angle) * 1.25 + 0.25, 0],
                color=OCHRE,
                stroke_width=3,
            )
            for angle in np.linspace(0.1, math.pi - 0.1, 6)
        ])
        return VGroup(bulb, filament, rays)

    def heart_pump(self):
        self.heading("Blood flow through the heart")
        left_lobe = Circle(radius=1.12, color=INK, fill_color=DUSTY_RED, fill_opacity=0.22).shift(LEFT * 0.86 + UP * 0.55)
        right_lobe = Circle(radius=1.12, color=INK, fill_color=MUTED_BLUE, fill_opacity=0.22).shift(RIGHT * 0.86 + UP * 0.55)
        lower = Polygon([-1.85, 0.48, 0], [1.85, 0.48, 0], [0, -2.25, 0], color=INK, fill_color=DUSTY_RED, fill_opacity=0.12)
        septum = Line([0, 1.25, 0], [0, -1.72, 0], color=INK, stroke_width=4)
        chamber_lines = VGroup(
            Line([-1.55, 0.15, 0], [-0.15, 0.15, 0], color=INK, stroke_width=3),
            Line([0.15, 0.15, 0], [1.55, 0.15, 0], color=INK, stroke_width=3),
        )
        organ = VGroup(left_lobe, right_lobe, lower, septum, chamber_lines).shift(DOWN * 0.1)

        incoming = Arrow([-5.3, 0.8, 0], [-1.75, 0.8, 0], color=MUTED_BLUE, stroke_width=6, buff=0.12)
        lungs = VGroup(
            Ellipse(width=1.0, height=1.75, color=OLIVE, fill_opacity=0.14).shift(RIGHT * 4.65 + UP * 0.62),
            Ellipse(width=1.0, height=1.75, color=OLIVE, fill_opacity=0.14).shift(RIGHT * 3.55 + UP * 0.62),
        )
        to_lungs = Arrow([1.75, 0.75, 0], [3.25, 0.75, 0], color=MUTED_BLUE, stroke_width=5, buff=0.12)
        from_lungs = Arrow([3.25, -0.3, 0], [1.52, -0.3, 0], color=DUSTY_RED, stroke_width=5, buff=0.12)
        outgoing = Arrow([-1.42, -0.85, 0], [-5.2, -0.85, 0], color=DUSTY_RED, stroke_width=6, buff=0.12)
        labels = VGroup(
            Text("body", color=INK, font_size=24).move_to([-5.45, 0, 0]),
            Text("lungs", color=INK, font_size=24).next_to(lungs, DOWN, buff=0.12),
        )
        blue_blood = Dot(incoming.get_start(), color=MUTED_BLUE, radius=0.13)
        red_blood = Dot(from_lungs.get_start(), color=DUSTY_RED, radius=0.13)

        self.play(Create(organ), FadeIn(labels), run_time=1.2)
        self.play(GrowArrow(incoming), GrowArrow(to_lungs), FadeIn(lungs), run_time=1.2)
        self.play(blue_blood.animate.move_to(incoming.get_end()), run_time=0.8)
        self.play(blue_blood.animate.move_to(to_lungs.get_end()), run_time=1.0)
        self.play(GrowArrow(from_lungs), GrowArrow(outgoing), run_time=1.0)
        self.play(red_blood.animate.move_to(from_lungs.get_end()), run_time=0.8)
        self.play(red_blood.animate.move_to(outgoing.get_end()), run_time=1.0)

    def subject_illustration(self):
        language = f"{self.request.title} {self.request.objective} {self.request.visualTitle} {self.request.visualMetaphor}".lower()
        if any(word in language for word in ("heart", "cardiac", "atrium", "ventricle")):
            self.heart_pump()
            return
        self.heading("Subject")
        items = self.request.visualElements[:4]
        if not items:
            items = []
        icons = VGroup()
        labels = VGroup()
        for index in range(max(1, len(items))):
            item = items[index] if index < len(items) else None
            label = short_label(item.label if item else self.request.title, f"Part {index + 1}")
            symbol = item.symbol if item else self.request.renderSpec.domain
            icon = self.subject_icon(label, symbol, index).scale_to_fit_height(2.25)
            text = Text(label, color=INK, font_size=21).next_to(icon, DOWN, buff=0.18)
            icons.add(icon)
            labels.add(text)
        combined = VGroup(*[VGroup(icon, label) for icon, label in zip(icons, labels)])
        combined.arrange(RIGHT, buff=1.0).scale_to_fit_width(min(10.8, max(2.8, len(combined) * 2.7))).shift(DOWN * 0.2)
        arrows = VGroup(*[
            Arrow(combined[index].get_right(), combined[index + 1].get_left(), color=INK, buff=0.12, stroke_width=3)
            for index in range(len(combined) - 1)
        ])
        self.play(LaggedStart(*[FadeIn(group, shift=UP * 0.22) for group in combined], lag_ratio=0.28), run_time=2.5)
        if len(arrows):
            self.play(LaggedStart(*[GrowArrow(arrow) for arrow in arrows], lag_ratio=0.2), run_time=1.4)
        self.play(LaggedStart(*[group.animate.scale(1.08).set_color(ACCENTS[index % len(ACCENTS)]) for index, group in enumerate(combined)], lag_ratio=0.18), run_time=1.7)

    def concept(self):
        self.heading("Concept")
        items = self.request.visualElements[:6]
        labels = [short_label(item.label, f"Part {index + 1}") for index, item in enumerate(items)] or ["Cause", "Change", "Result"]
        boxes = VGroup(*[
            VGroup(
                Circle(radius=0.48, color=ACCENTS[index % len(ACCENTS)], fill_opacity=0.2),
                Text(label, color=INK, font_size=22),
            )
            for index, label in enumerate(labels)
        ])
        for group in boxes:
            group[1].next_to(group[0], DOWN, buff=0.22)
        boxes.arrange(RIGHT, buff=1.1).scale_to_fit_width(10.8).shift(DOWN * 0.25)
        arrows = VGroup(*[Arrow(boxes[index][0].get_right(), boxes[index + 1][0].get_left(), color=INK, buff=0.14) for index in range(len(boxes) - 1)])
        self.play(LaggedStart(*[FadeIn(group, scale=0.6) for group in boxes], lag_ratio=0.22), run_time=2.1)
        if len(arrows):
            self.play(LaggedStart(*[GrowArrow(arrow) for arrow in arrows], lag_ratio=0.2), run_time=1.5)
