"""The recommendation engine: score every racket against an ideal spec."""

from __future__ import annotations

from typing import List, Optional

from .database import load_rackets
from .models import (
    IdealSpec,
    PlayerProfile,
    Racket,
    Recommendation,
    SpecMatch,
)
from .profile import build_ideal_spec


def _score_racket(racket: Racket, ideal: IdealSpec) -> Recommendation:
    spec_matches: List[SpecMatch] = []
    weighted_sum = 0.0
    total_weight = 0.0

    for key, target in ideal.targets.items():
        value = float(getattr(racket, key))
        s = target.score(value)
        in_range = target.lo <= value <= target.hi
        spec_matches.append(
            SpecMatch(
                key=key,
                label=target.label,
                value=value,
                unit=target.unit,
                score=s,
                target_ideal=target.ideal,
                target_lo=target.lo,
                target_hi=target.hi,
                in_range=in_range,
            )
        )
        weighted_sum += s * target.weight
        total_weight += target.weight

    # String pattern is categorical, handled separately.
    if ideal.prefer_open_pattern is not None:
        if racket.is_open_pattern == ideal.prefer_open_pattern:
            pattern_score = 1.0
        else:
            pattern_score = 0.25
        weighted_sum += pattern_score * ideal.pattern_weight
        total_weight += ideal.pattern_weight

    score = (weighted_sum / total_weight) * 100 if total_weight else 0.0

    reasons, cautions = _explain(racket, ideal, spec_matches)
    return Recommendation(
        racket=racket,
        score=score,
        spec_matches=spec_matches,
        reasons=reasons,
        cautions=cautions,
    )


def _explain(
    racket: Racket,
    ideal: IdealSpec,
    matches: List[SpecMatch],
) -> tuple[List[str], List[str]]:
    """Generate plain-English reasons (strong fits) and cautions (weak fits)."""
    reasons: List[str] = []
    cautions: List[str] = []

    def fmt(value: float, unit: str) -> str:
        v = int(value) if float(value).is_integer() else round(value, 1)
        return f"{v}{unit}"

    for m in sorted(matches, key=lambda x: x.score, reverse=True):
        text = f"{m.label} of {fmt(m.value, m.unit)} matches your target of about {fmt(m.target_ideal, m.unit)}."
        if m.score >= 0.8:
            reasons.append(text)
        elif m.score < 0.45:
            direction = "higher" if m.value > m.target_ideal else "lower"
            cautions.append(
                f"{m.label} ({fmt(m.value, m.unit)}) is {direction} than your ideal "
                f"of about {fmt(m.target_ideal, m.unit)}."
            )

    # String pattern note
    if ideal.prefer_open_pattern is not None:
        if racket.is_open_pattern == ideal.prefer_open_pattern:
            if ideal.prefer_open_pattern:
                reasons.append(f"Open {racket.string_pattern} string bed helps you generate spin.")
            else:
                reasons.append(f"Denser {racket.string_pattern} string bed gives you control and consistency.")
        else:
            if ideal.prefer_open_pattern:
                cautions.append(f"{racket.string_pattern} pattern is tighter than ideal for maximum spin.")
            else:
                cautions.append(f"{racket.string_pattern} pattern is more open than ideal for maximum control.")

    # Keep the output focused.
    return reasons[:4], cautions[:3]


def recommend(
    profile: PlayerProfile,
    rackets: Optional[List[Racket]] = None,
    top_n: int = 5,
) -> List[Recommendation]:
    """Return the ``top_n`` best-matching rackets for ``profile``, best first."""
    profile.validate()
    ideal = build_ideal_spec(profile)
    pool = rackets if rackets is not None else load_rackets()

    if profile.budget_usd is not None:
        pool = [
            r
            for r in pool
            if r.msrp_usd is None or r.msrp_usd <= profile.budget_usd
        ]

    scored = [_score_racket(r, ideal) for r in pool]
    scored.sort(key=lambda rec: rec.score, reverse=True)
    return scored[: max(top_n, 0)]


def recommend_with_ideal(
    profile: PlayerProfile,
    rackets: Optional[List[Racket]] = None,
    top_n: int = 5,
) -> tuple[IdealSpec, List[Recommendation]]:
    """Like :func:`recommend` but also return the derived ideal spec."""
    ideal = build_ideal_spec(profile)
    return ideal, recommend(profile, rackets=rackets, top_n=top_n)
