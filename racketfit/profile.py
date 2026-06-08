"""Translate a player's survey answers into a target ("ideal") racket spec.

The mapping is intentionally transparent: start from a sensible baseline for
each spec, then nudge it up or down based on each answer. Every nudge is a
small, explainable number rather than a black box, so the recommendations can
be justified in plain English.
"""

from __future__ import annotations

from typing import Dict

from .models import IdealSpec, PlayerProfile, SpecTarget


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def build_ideal_spec(profile: PlayerProfile) -> IdealSpec:
    """Derive an :class:`IdealSpec` from a validated :class:`PlayerProfile`."""
    profile.validate()

    notes: list[str] = []

    # --- Head size (sq in) -------------------------------------------------
    # Bigger heads = more power, more forgiveness, larger sweet spot.
    head = 98.0
    head += {"beginner": 8, "intermediate": 3, "advanced": -1}[profile.skill_level]
    head += {"needs_power": 4, "balanced": 0, "generates_own_power": -3}[profile.power_source]
    if profile.spin_priority == "high":
        head += 1
    if profile.arm_sensitive:
        head += 2  # larger sweet spot reduces off-center sting
    head = _clamp(head, 95, 110)

    # --- Strung weight (g) -------------------------------------------------
    # Heavier = more stability and plow-through but harder to swing.
    weight = 312.0
    weight += {"beginner": -22, "intermediate": -4, "advanced": 8}[profile.skill_level]
    weight += {"needs_power": -8, "balanced": 0, "generates_own_power": 8}[profile.power_source]
    weight += {"compact": -12, "moderate": 0, "full": 8}[profile.swing_length]
    if profile.maneuverability_priority == "high":
        weight -= 10
    elif profile.maneuverability_priority == "low":
        weight += 4
    weight = _clamp(weight, 270, 340)

    # --- Balance (points head-light) --------------------------------------
    # Lighter frames go head-heavy/even to keep mass behind the ball;
    # heavier player's frames go more head-light to stay maneuverable.
    balance = 5.0
    balance += {"beginner": -4, "intermediate": 0, "advanced": 2}[profile.skill_level]
    balance += {"needs_power": -3, "balanced": 0, "generates_own_power": 2}[profile.power_source]
    if profile.maneuverability_priority == "high":
        balance += 2
    elif profile.maneuverability_priority == "low":
        balance -= 1
    balance = _clamp(balance, -2, 10)

    # --- Swingweight -------------------------------------------------------
    swing = 318.0
    swing += {"beginner": -16, "intermediate": -2, "advanced": 8}[profile.skill_level]
    swing += {"compact": -12, "moderate": 0, "full": 8}[profile.swing_length]
    swing += {"needs_power": -2, "balanced": 0, "generates_own_power": 4}[profile.power_source]
    if profile.maneuverability_priority == "high":
        swing -= 10
    elif profile.maneuverability_priority == "low":
        swing += 4
    swing = _clamp(swing, 290, 340)

    # --- Stiffness (RA) ----------------------------------------------------
    # Stiffer = more power but harsher; flexible = more comfort/control feel.
    stiffness = 65.0
    stiffness += {"needs_power": 3, "balanced": 0, "generates_own_power": -2}[profile.power_source]
    stiffness += {"beginner": 1, "intermediate": 0, "advanced": -2}[profile.skill_level]
    stiffness_weight = 1.0
    if profile.arm_sensitive:
        stiffness -= 8  # steer toward flexible, arm-friendly frames
        stiffness_weight = 2.2
        notes.append("Prioritizing a flexible, arm-friendly frame (lower RA) for comfort.")
    stiffness = _clamp(stiffness, 55, 73)

    # --- String pattern preference ----------------------------------------
    prefer_open: bool | None = None
    pattern_weight = 0.7
    if profile.spin_priority == "high":
        prefer_open = True
        pattern_weight = 1.0
        notes.append("Leaning toward an open string pattern for extra spin and bite.")
    elif profile.spin_priority == "low" and profile.play_style in (
        "all_court",
        "serve_and_volley",
        "counterpuncher",
    ):
        prefer_open = False
        pattern_weight = 0.8
        notes.append("Leaning toward a denser string pattern for control and a predictable response.")

    # Play-style flavor notes (don't change numbers much, but explain intent)
    if profile.play_style == "aggressive_baseliner":
        notes.append("Built for an aggressive baseliner: enough mass to drive through the ball.")
    elif profile.play_style == "serve_and_volley":
        notes.append("Tuned for serve-and-volley: maneuverable and stable at the net.")
    elif profile.play_style == "counterpuncher":
        notes.append("Tuned for a counterpuncher: control and consistency over raw power.")

    targets: Dict[str, SpecTarget] = {
        "head_size_sqin": SpecTarget(
            ideal=head, lo=head - 2, hi=head + 2, tolerance=4,
            weight=1.4, label="Head size", unit=" sq in",
        ),
        "strung_weight_g": SpecTarget(
            ideal=weight, lo=weight - 8, hi=weight + 8, tolerance=14,
            weight=1.6, label="Weight", unit=" g",
        ),
        "balance_pts_hl": SpecTarget(
            ideal=balance, lo=balance - 1.5, hi=balance + 1.5, tolerance=3,
            weight=0.9, label="Balance", unit=" pts HL",
        ),
        "swingweight": SpecTarget(
            ideal=swing, lo=swing - 8, hi=swing + 8, tolerance=14,
            weight=1.3, label="Swingweight", unit="",
        ),
        "stiffness_ra": SpecTarget(
            ideal=stiffness, lo=stiffness - 2, hi=stiffness + 2, tolerance=4,
            weight=stiffness_weight, label="Stiffness", unit=" RA",
        ),
    }

    return IdealSpec(
        targets=targets,
        prefer_open_pattern=prefer_open,
        pattern_weight=pattern_weight,
        notes=notes,
    )
