from __future__ import annotations

import ast
import math
import re

import numpy as np
import sympy as sp


ALLOWED_NAMES = {
    "x": sp.Symbol("x", real=True),
    "t": sp.Symbol("t", real=True),
    "y": sp.Symbol("y", real=True),
    "a": sp.Symbol("a", real=True),
    "pi": sp.pi,
    "e": sp.E,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "asin": sp.asin,
    "acos": sp.acos,
    "atan": sp.atan,
    "sinh": sp.sinh,
    "cosh": sp.cosh,
    "exp": sp.exp,
    "log": sp.log,
    "sqrt": sp.sqrt,
    "abs": sp.Abs,
}

ALLOWED_FUNCTIONS = {"sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "exp", "log", "sqrt", "abs"}
ALLOWED_AST_NODES = (
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Pow,
    ast.Mod,
    ast.USub,
    ast.UAdd,
    ast.Call,
    ast.Name,
    ast.Load,
    ast.Constant,
)


def validate_expression(source: str) -> None:
    if not re.fullmatch(r"[0-9A-Za-z_+\-*/().,\s]+", source):
        raise ValueError("Expression contains unsupported characters")
    tree = ast.parse(source, mode="eval")
    for node in ast.walk(tree):
        if not isinstance(node, ALLOWED_AST_NODES):
            raise ValueError("Expression contains an unsupported operation")
        if isinstance(node, ast.Name) and node.id not in ALLOWED_NAMES:
            raise ValueError("Expression contains an unsupported name")
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in ALLOWED_FUNCTIONS:
                raise ValueError("Expression contains an unsupported function")
            if node.keywords:
                raise ValueError("Keyword arguments are not supported")


def parse_expression(source: str, variable: str = "x") -> tuple[sp.Expr, sp.Symbol]:
    """Parse a small mathematical expression without evaluating arbitrary code."""
    symbol = ALLOWED_NAMES.get(variable, ALLOWED_NAMES["x"])
    cleaned = (source or variable).replace("^", "**").strip()
    if len(cleaned) > 240:
        raise ValueError("Expression is too long")
    validate_expression(cleaned)
    expr = sp.sympify(cleaned, locals=ALLOWED_NAMES, evaluate=True)
    if not isinstance(expr, sp.Expr):
        raise ValueError("Expression must be mathematical")
    if any(str(item) not in {variable, "a"} for item in expr.free_symbols):
        raise ValueError("Expression contains an unsupported variable")
    return expr, symbol


def parse_ode_expression(source: str) -> tuple[sp.Expr, sp.Symbol, sp.Symbol]:
    cleaned = (source or "-0.7*y").replace("^", "**").strip()
    if len(cleaned) > 240:
        raise ValueError("Expression is too long")
    validate_expression(cleaned)
    expression = sp.sympify(cleaned, locals=ALLOWED_NAMES, evaluate=True)
    if not isinstance(expression, sp.Expr) or any(str(item) not in {"t", "y", "a"} for item in expression.free_symbols):
        raise ValueError("Differential equation contains an unsupported variable")
    return expression, ALLOWED_NAMES["t"], ALLOWED_NAMES["y"]


def numeric_function(source: str, variable: str = "x"):
    expr, symbol = parse_expression(source, variable)
    fn = sp.lambdify(symbol, expr, modules=["numpy"])

    def safe(value: float) -> float:
        try:
            result = float(np.asarray(fn(value)).reshape(-1)[0])
            return result if math.isfinite(result) else 0.0
        except (TypeError, ValueError, ZeroDivisionError, OverflowError, IndexError):
            return 0.0

    return expr, safe
