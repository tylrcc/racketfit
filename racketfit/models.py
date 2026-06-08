"""Core data models for RacketFit.

Everything is a plain dataclass so the whole library stays dependency-free
and is trivial to serialize to/from JSON for the web API.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple


# --- Survey answer vocabularies -------------------------------------------
# These are the only valid values for each survey question. The web/CLI
# front-ends and the profile builder all share this single source of truth.

SKILL_LEVELS = ("beginner", "intermediate", "advanced")
PLAY_STYLES = ("aggressive_baseliner", "all_court", "counterpuncher", "serve_and_volley")
SWING_LENGTHS = ("compact", "moderate", "full")
POWER_SOURCES = ("needs_power", "balanced", "generates_own_power")
PRIORITIES = ("low", "medium", "high")  # used by spin / maneuverability


@dataclass
class PlayerProfile:
    """A player's survey answers."""

    skill_level: str = "intermediate"
    play_style: str = "all_court"
    swing_length: str = "moderate"
    power_source: str = "balanced"
    spin_priority: str = "medium"
    maneuverability_priority: str = "medium"
    arm_sensitive: bool = False  # tennis elbow / wants max comfort
    budget_usd: Optional[int] = None  # optional hard cap on MSRP

    def validate(self) -> None:
        """Raise ValueError if any answer is outside its vocabulary."""
        checks: List[Tuple[str, str, Tuple[str, ...]]] = [
            ("skill_level", self.skill_level, SKILL_LEVELS),
            ("play_style", self.play_style, PLAY_STYLES),
            ("swing_length", self.swing_length, SWING_LENGTHS),
            ("power_source", self.power_source, POWER_SOURCES),
            ("spin_priority", self.spin_priority, PRIORITIES),
            ("maneuverability_priority", self.maneuverability_priority, PRIORITIES),
        ]
        for name, value, allowed in checks:
            if value not in allowed:
                raise ValueError(
                    f"{name}={value!r} is invalid; expected one of {allowed}"
                )
        if not isinstance(self.arm_sensitive, bool):
            raise ValueError("arm_sensitive must be a boolean")
        if self.budget_usd is not None and self.budget_usd <= 0:
            raise ValueError("budget_usd must be a positive number or null")

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PlayerProfile":
        """Build a profile from a (possibly partial) dict, ignoring extras."""
        allowed = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        kwargs = {k: v for k, v in data.items() if k in allowed}
        profile = cls(**kwargs)
        profile.validate()
        return profile

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class Racket:
    """A racket and its (approximate) specs."""

    id: str
    brand: str
    model: str
    year: int
    head_size_sqin: float
    length_in: float
    strung_weight_g: float
    balance_pts_hl: float
    swingweight: float
    stiffness_ra: float
    beam_mm: float
    string_pattern: str
    category: str
    msrp_usd: Optional[int] = None
    url: Optional[str] = None

    @property
    def name(self) -> str:
        return f"{self.brand} {self.model}"

    @property
    def is_open_pattern(self) -> bool:
        """Open string beds (16 mains or fewer) spin and launch the ball more."""
        try:
            mains = int(self.string_pattern.lower().split("x")[0])
        except (ValueError, IndexError):
            return True
        return mains <= 16

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Racket":
        allowed = {f for f in cls.__dataclass_fields__}  # type: ignore[attr-defined]
        kwargs = {k: v for k, v in data.items() if k in allowed}
        return cls(**kwargs)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SpecTarget:
    """A target range for a single numeric spec.

    ``ideal`` is the bullseye; ``lo``/``hi`` mark the comfortable range; and
    ``tolerance`` controls how quickly the score decays once you leave it.
    """

    ideal: float
    lo: float
    hi: float
    tolerance: float
    weight: float
    label: str
    unit: str = ""

    def score(self, value: float) -> float:
        """Return a 0..1 fit score for ``value`` against this target."""
        half_range = max((self.hi - self.lo) / 2.0, 1e-6)
        span = half_range + max(self.tolerance, 1e-6)
        distance = abs(value - self.ideal)
        return max(0.0, 1.0 - distance / span)


@dataclass
class IdealSpec:
    """The full target spec derived from a player's survey answers."""

    targets: Dict[str, SpecTarget] = field(default_factory=dict)
    prefer_open_pattern: Optional[bool] = None  # None = no preference
    pattern_weight: float = 0.8
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "targets": {
                k: {
                    "ideal": round(t.ideal, 1),
                    "lo": round(t.lo, 1),
                    "hi": round(t.hi, 1),
                    "weight": t.weight,
                    "label": t.label,
                    "unit": t.unit,
                }
                for k, t in self.targets.items()
            },
            "prefer_open_pattern": self.prefer_open_pattern,
            "notes": self.notes,
        }


@dataclass
class SpecMatch:
    """How a single spec on a racket compares to the target."""

    key: str
    label: str
    value: float
    unit: str
    score: float  # 0..1
    target_ideal: float
    target_lo: float
    target_hi: float
    in_range: bool


@dataclass
class Recommendation:
    """A scored racket result with per-spec detail and plain-English reasons."""

    racket: Racket
    score: float  # 0..100
    spec_matches: List[SpecMatch] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)
    cautions: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "racket": self.racket.to_dict(),
            "name": self.racket.name,
            "score": round(self.score, 1),
            "spec_matches": [
                {
                    "key": m.key,
                    "label": m.label,
                    "value": m.value,
                    "unit": m.unit,
                    "score": round(m.score, 3),
                    "target_ideal": round(m.target_ideal, 1),
                    "target_lo": round(m.target_lo, 1),
                    "target_hi": round(m.target_hi, 1),
                    "in_range": m.in_range,
                }
                for m in self.spec_matches
            ],
            "reasons": self.reasons,
            "cautions": self.cautions,
        }
