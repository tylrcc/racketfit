"""Grip size recommendation.

The reliable way to size a grip is to measure from the middle crease of your
palm to the tip of your ring finger, in inches. That measurement is, near
enough, your grip size. We snap it to the nearest standard size.
"""

from __future__ import annotations

from typing import List, Tuple

from .models import GripRecommendation, PlayerProfile

# (inches, US label / European Lx code)
GRIP_SIZES: List[Tuple[float, str]] = [
    (4.000, "4 (L0)"),
    (4.125, "4 1/8 (L1)"),
    (4.250, "4 1/4 (L2)"),
    (4.375, "4 3/8 (L3)"),
    (4.500, "4 1/2 (L4)"),
    (4.625, "4 5/8 (L5)"),
]

_OVERGRIP_TIP = (
    "When between sizes, pick the smaller one and add an overgrip. You can build "
    "a grip up, but you cannot shave one down."
)


def recommend_grip(profile: PlayerProfile) -> GripRecommendation:
    measure = profile.hand_length_in

    if measure is None:
        # No measurement: give the most common adult size with clear guidance.
        return GripRecommendation(
            label="4 3/8 (L3)",
            inches=4.375,
            confident=False,
            notes=[
                "No measurement given, so this is the most common adult size as a default.",
                "To size it properly: hold your hitting hand open and measure from the "
                "middle crease of your palm to the tip of your ring finger, in inches. "
                "That number is your grip size.",
                _OVERGRIP_TIP,
            ],
        )

    # Snap to nearest standard size.
    nearest = min(GRIP_SIZES, key=lambda g: abs(g[0] - measure))
    notes = [f"Based on your {measure:g} inch hand measurement."]

    # If the measurement sits clearly between two sizes, advise sizing down.
    lower = max((g for g in GRIP_SIZES if g[0] <= measure), default=GRIP_SIZES[0])
    if abs(measure - nearest[0]) > 0.04 and lower[0] != nearest[0]:
        notes.append(
            f"You are between {lower[1]} and {nearest[1]}. {_OVERGRIP_TIP}"
        )
        nearest = lower
    else:
        notes.append(_OVERGRIP_TIP)

    return GripRecommendation(
        label=nearest[1], inches=nearest[0], confident=True, notes=notes
    )
