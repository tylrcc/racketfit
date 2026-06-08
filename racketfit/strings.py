"""String matching: pick the strings that fit a player, plus a tension range.

Same transparent approach as the racket engine: derive how much the player
values each attribute (power, control, spin, comfort, durability, feel), score
every string against those weights, then apply a few common-sense bonuses
(arm-friendliness for sensitive arms, easier strings for beginners).
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, List

from .models import (
    PlayerProfile,
    StringRecommendation,
    TennisString,
    TensionRecommendation,
)

_DATA_PATH = Path(__file__).parent / "data" / "strings.json"

_ATTRS = ("power", "control", "spin", "comfort", "durability", "feel")


@lru_cache(maxsize=1)
def load_strings(path: str | None = None) -> List[TennisString]:
    data_path = Path(path) if path else _DATA_PATH
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    return [TennisString.from_dict(s) for s in raw["strings"]]


def _attribute_weights(profile: PlayerProfile) -> Dict[str, float]:
    """How much this player cares about each string attribute."""
    w = {"power": 1.0, "control": 1.0, "spin": 1.0, "comfort": 1.0, "durability": 0.6, "feel": 0.6}

    if profile.arm_sensitive:
        w["comfort"] += 2.6
        w["feel"] += 0.6
        w["power"] += 0.3

    if profile.spin_priority == "high":
        w["spin"] += 1.8
    elif profile.spin_priority == "low":
        w["spin"] -= 0.4
        w["control"] += 0.4

    if profile.power_source == "needs_power":
        w["power"] += 1.5
        w["control"] -= 0.3
    elif profile.power_source == "generates_own_power":
        w["control"] += 1.4
        w["power"] -= 0.5

    if profile.skill_level == "beginner":
        w["comfort"] += 1.0
        w["power"] += 0.8
        w["durability"] -= 0.3
    elif profile.skill_level == "advanced":
        w["control"] += 0.9
        w["spin"] += 0.4
        w["durability"] += 0.3

    if profile.play_style in ("counterpuncher", "serve_and_volley"):
        w["control"] += 0.4

    # No negative weights.
    return {k: max(v, 0.0) for k, v in w.items()}


def _score_string(s: TennisString, weights: Dict[str, float], profile: PlayerProfile) -> float:
    total_w = sum(weights.values()) or 1.0
    raw = sum(getattr(s, attr) * weights[attr] for attr in _ATTRS) / (total_w * 10.0)
    score = raw * 100.0

    # Common-sense modifiers.
    if profile.arm_sensitive:
        score *= 1.25 if s.arm_friendly else 0.72
    if profile.skill_level == "beginner" and not profile.arm_sensitive:
        # Beginners are usually better off on softer strings than firm full poly.
        if s.type in ("Multifilament", "Synthetic Gut", "Natural Gut"):
            score *= 1.12
        elif s.type == "Polyester" and not s.arm_friendly:
            score *= 0.85
    if profile.spin_priority == "high" and not profile.arm_sensitive:
        # Spin seekers want poly that grabs and snaps back, not smooth gut/multi.
        if s.type == "Polyester":
            score *= 1.08
        elif s.type in ("Natural Gut", "Multifilament"):
            score *= 0.9

    return min(score, 100.0)


def _string_reasons(s: TennisString, profile: PlayerProfile) -> List[str]:
    reasons: List[str] = []
    if profile.arm_sensitive and s.arm_friendly:
        reasons.append(f"Arm-friendly {s.type.lower()} (comfort {s.comfort}/10) to protect your arm.")
    if profile.spin_priority == "high" and s.spin >= 8:
        reasons.append(f"High spin rating ({s.spin}/10){' from its shaped profile' if s.shape not in ('round',) else ''}.")
    if profile.power_source == "needs_power" and s.power >= 7:
        reasons.append(f"Adds free power and depth (power {s.power}/10).")
    if profile.power_source == "generates_own_power" and s.control >= 8:
        reasons.append(f"Tight control (control {s.control}/10) to harness your own pace.")
    if profile.skill_level == "beginner" and s.type in ("Multifilament", "Synthetic Gut"):
        reasons.append("Soft, forgiving, and easy on developing technique.")
    if not reasons and s.best_for:
        reasons.append(s.best_for)
    return reasons[:3]


def recommend_strings(profile: PlayerProfile, top_n: int = 3) -> List[StringRecommendation]:
    profile.validate()
    weights = _attribute_weights(profile)
    strings = load_strings()
    recs = [
        StringRecommendation(
            string=s,
            score=_score_string(s, weights, profile),
            reasons=_string_reasons(s, profile),
        )
        for s in strings
    ]
    recs.sort(key=lambda r: r.score, reverse=True)
    return recs[: max(top_n, 0)]


def recommend_tension(profile: PlayerProfile, string: TennisString) -> TensionRecommendation:
    """A tension range tuned to the player, inside the string's normal range."""
    lo, hi = string.tension_lo, string.tension_hi
    mid = (lo + hi) / 2.0
    notes: List[str] = []

    adjust = 0.0
    if profile.power_source == "needs_power":
        adjust -= 2
        notes.append("Strung a bit lower for more power and a softer feel.")
    elif profile.power_source == "generates_own_power":
        adjust += 2
        notes.append("Strung a bit higher for more control over your own pace.")
    if profile.arm_sensitive:
        adjust -= 2
        notes.append("Lower tension reduces impact shock for arm comfort.")
    if profile.spin_priority == "high":
        adjust -= 1
        notes.append("Slightly lower tension lets the strings snap back for spin.")
    if profile.spin_priority == "low" and profile.play_style in ("counterpuncher", "serve_and_volley"):
        adjust += 1

    ideal = round(max(lo - 2, min(hi, mid + adjust)))
    rec_lo = max(lo - 2, ideal - 2)
    rec_hi = min(hi, ideal + 2)
    if not notes:
        notes.append("A balanced starting tension. Lower for power, higher for control.")
    return TensionRecommendation(lo=int(rec_lo), hi=int(rec_hi), ideal=int(ideal), notes=notes)
