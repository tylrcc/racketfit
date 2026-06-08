"""Compose the full gear report: racket + string + tension + grip in one place."""

from __future__ import annotations

from typing import Any, Dict

from .engine import recommend_with_ideal
from .grip import recommend_grip
from .models import PlayerProfile
from .strings import recommend_strings, recommend_tension


def build_report(profile: PlayerProfile, top_n: int = 5) -> Dict[str, Any]:
    """Return a fully serializable report covering everything a player needs."""
    profile.validate()

    ideal, rackets = recommend_with_ideal(profile, top_n=top_n)
    strings = recommend_strings(profile, top_n=3)
    top_string = strings[0].string if strings else None
    tension = recommend_tension(profile, top_string) if top_string else None
    grip = recommend_grip(profile)

    # A one-line "complete setup" headline.
    summary = None
    if rackets and top_string and tension:
        r = rackets[0].racket
        summary = (
            f"{r.name} + {top_string.name} @ {tension.ideal} lbs, grip {grip.label}"
        )

    return {
        "profile": profile.to_dict(),
        "ideal": ideal.to_dict(),
        "recommendations": [r.to_dict() for r in rackets],
        "strings": [s.to_dict() for s in strings],
        "string": strings[0].to_dict() if strings else None,
        "tension": tension.to_dict() if tension else None,
        "grip": grip.to_dict(),
        "summary": summary,
        "disclaimer": (
            "Specs and ratings are approximate and meant to build a shortlist. "
            "Strings, grip, and your own swing change everything. Demo before you buy."
        ),
    }
