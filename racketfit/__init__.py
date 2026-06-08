"""RacketFit: find the tennis gear that fits your game.

A small, dependency-free recommendation engine. Take a short survey and get a
complete 2026 setup: target spec profile, ranked rackets, a string, a stringing
tension, and a grip size, all in one report.
"""

from .models import (
    PlayerProfile,
    Racket,
    IdealSpec,
    Recommendation,
    TennisString,
    StringRecommendation,
    TensionRecommendation,
    GripRecommendation,
)
from .database import load_rackets
from .profile import build_ideal_spec
from .engine import recommend
from .strings import load_strings, recommend_strings, recommend_tension
from .grip import recommend_grip
from .report import build_report

__version__ = "2.0.0"

__all__ = [
    "PlayerProfile",
    "Racket",
    "IdealSpec",
    "Recommendation",
    "TennisString",
    "StringRecommendation",
    "TensionRecommendation",
    "GripRecommendation",
    "load_rackets",
    "load_strings",
    "build_ideal_spec",
    "recommend",
    "recommend_strings",
    "recommend_tension",
    "recommend_grip",
    "build_report",
    "__version__",
]
