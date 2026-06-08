"""RacketFit: find the tennis racket specs that fit your game.

A small, dependency-free recommendation engine. Take a short survey,
get a target spec profile and a ranked list of real rackets that match.
"""

from .models import PlayerProfile, Racket, IdealSpec, Recommendation
from .database import load_rackets
from .profile import build_ideal_spec
from .engine import recommend

__version__ = "1.0.0"

__all__ = [
    "PlayerProfile",
    "Racket",
    "IdealSpec",
    "Recommendation",
    "load_rackets",
    "build_ideal_spec",
    "recommend",
    "__version__",
]
