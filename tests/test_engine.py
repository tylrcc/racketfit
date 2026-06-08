"""Tests for the RacketFit recommendation engine."""

import pytest

from racketfit import (
    PlayerProfile,
    build_ideal_spec,
    load_rackets,
    recommend,
)
from racketfit.engine import recommend_with_ideal
from racketfit.models import SpecTarget
from racketfit.survey import survey_keys


def test_database_loads():
    rackets = load_rackets()
    assert len(rackets) >= 20
    for r in rackets:
        assert r.head_size_sqin > 0
        assert r.strung_weight_g > 0
        assert "x" in r.string_pattern


def test_profile_validation_rejects_bad_values():
    with pytest.raises(ValueError):
        PlayerProfile(skill_level="pro").validate()
    with pytest.raises(ValueError):
        PlayerProfile.from_dict({"spin_priority": "insane"})


def test_profile_from_dict_ignores_extras():
    p = PlayerProfile.from_dict({"skill_level": "advanced", "nonsense": 1})
    assert p.skill_level == "advanced"


def test_spec_target_scoring_monotonic():
    t = SpecTarget(ideal=100, lo=98, hi=102, tolerance=4, weight=1, label="x")
    assert t.score(100) == pytest.approx(1.0)
    assert t.score(100) > t.score(104) > t.score(112)
    assert t.score(1000) == 0.0  # far away clamps to zero


def test_recommend_returns_sorted_scores():
    profile = PlayerProfile(skill_level="intermediate")
    recs = recommend(profile, top_n=5)
    assert len(recs) == 5
    scores = [r.score for r in recs]
    assert scores == sorted(scores, reverse=True)
    assert 0 <= scores[0] <= 100


def test_beginner_gets_lighter_bigger_than_advanced():
    beginner = build_ideal_spec(PlayerProfile(skill_level="beginner"))
    advanced = build_ideal_spec(PlayerProfile(skill_level="advanced"))
    assert beginner.targets["head_size_sqin"].ideal > advanced.targets["head_size_sqin"].ideal
    assert beginner.targets["strung_weight_g"].ideal < advanced.targets["strung_weight_g"].ideal


def test_arm_sensitive_lowers_stiffness_target():
    normal = build_ideal_spec(PlayerProfile(arm_sensitive=False))
    sensitive = build_ideal_spec(PlayerProfile(arm_sensitive=True))
    assert sensitive.targets["stiffness_ra"].ideal < normal.targets["stiffness_ra"].ideal
    # and it should weight stiffness more heavily
    assert sensitive.targets["stiffness_ra"].weight > normal.targets["stiffness_ra"].weight


def test_arm_sensitive_surfaces_flexible_frame():
    """A comfort-seeking player should get a notably flexible top pick."""
    profile = PlayerProfile(
        skill_level="intermediate",
        arm_sensitive=True,
        power_source="generates_own_power",
    )
    recs = recommend(profile, top_n=3)
    # The best match should be on the softer end of the lineup.
    assert recs[0].racket.stiffness_ra <= 64


def test_high_spin_prefers_open_pattern():
    ideal = build_ideal_spec(PlayerProfile(spin_priority="high"))
    assert ideal.prefer_open_pattern is True
    profile = PlayerProfile(spin_priority="high")
    recs = recommend(profile, top_n=3)
    assert recs[0].racket.is_open_pattern


def test_budget_filter_excludes_pricey_rackets():
    profile = PlayerProfile(skill_level="intermediate", budget_usd=200)
    recs = recommend(profile, top_n=30)
    assert recs, "budget should still leave some rackets"
    assert all(r.racket.msrp_usd is None or r.racket.msrp_usd <= 200 for r in recs)


def test_recommendation_serializes():
    recs = recommend(PlayerProfile(), top_n=1)
    d = recs[0].to_dict()
    assert "score" in d and "racket" in d and "reasons" in d
    assert isinstance(d["spec_matches"], list)


def test_ideal_and_recs_together():
    ideal, recs = recommend_with_ideal(PlayerProfile(), top_n=2)
    assert ideal.targets
    assert len(recs) == 2


def test_survey_keys_match_profile_fields():
    keys = set(survey_keys())
    profile_fields = set(PlayerProfile().to_dict().keys())
    assert keys == profile_fields, "survey questions must map 1:1 to profile fields"
