"""Tests for strings, tension, grip, and the full report."""

import pytest

from racketfit import (
    PlayerProfile,
    build_report,
    load_strings,
    recommend_grip,
    recommend_strings,
    recommend_tension,
)
from racketfit.database import load_rackets


def test_strings_database_loads():
    strings = load_strings()
    assert len(strings) >= 15
    for s in strings:
        assert 1 <= s.comfort <= 10
        assert s.tension_lo < s.tension_hi
        assert s.type in ("Polyester", "Multifilament", "Synthetic Gut", "Natural Gut")


def test_2026_rackets_present():
    rackets = load_rackets()
    new = [r for r in rackets if r.year >= 2026]
    assert len(new) >= 8
    names = {r.model for r in new}
    assert any("VCORE" in n for n in names)
    assert any("Python" in n for n in names)


def test_arm_sensitive_gets_comfortable_string():
    recs = recommend_strings(PlayerProfile(arm_sensitive=True), top_n=3)
    assert recs[0].string.arm_friendly
    assert recs[0].string.comfort >= 7


def test_advanced_power_player_gets_control_poly():
    profile = PlayerProfile(
        skill_level="advanced",
        power_source="generates_own_power",
        spin_priority="high",
    )
    top = recommend_strings(profile, top_n=1)[0].string
    assert top.type == "Polyester"
    assert top.control >= 7


def test_beginner_avoids_firm_full_poly_at_top():
    profile = PlayerProfile(skill_level="beginner", power_source="needs_power")
    top = recommend_strings(profile, top_n=1)[0].string
    # A new player needing power should land on something soft/powerful.
    assert top.type in ("Multifilament", "Synthetic Gut", "Natural Gut") or top.arm_friendly


def test_tension_lowers_for_power_and_comfort():
    s = load_strings()[0]
    powerful = recommend_tension(PlayerProfile(power_source="needs_power", arm_sensitive=True), s)
    controlled = recommend_tension(PlayerProfile(power_source="generates_own_power"), s)
    assert powerful.ideal < controlled.ideal
    assert s.tension_lo - 2 <= powerful.ideal <= s.tension_hi


def test_grip_from_measurement_snaps_to_standard():
    g = recommend_grip(PlayerProfile(hand_length_in=4.25))
    assert g.confident
    assert g.label.startswith("4 1/4")
    assert g.inches == pytest.approx(4.25)


def test_grip_without_measurement_is_estimate():
    g = recommend_grip(PlayerProfile())
    assert not g.confident
    assert g.label  # still gives a usable default
    assert any("measure" in n.lower() for n in g.notes)


def test_grip_between_sizes_advises_sizing_down():
    g = recommend_grip(PlayerProfile(hand_length_in=4.31))
    # 4.31 is between 4 1/4 and 4 3/8 -> should size down to 4 1/4
    assert g.label.startswith("4 1/4")
    assert any("overgrip" in n.lower() for n in g.notes)


def test_build_report_is_complete_and_serializable():
    report = build_report(PlayerProfile(skill_level="intermediate", hand_length_in=4.375), top_n=3)
    for key in ("ideal", "recommendations", "strings", "string", "tension", "grip", "summary"):
        assert key in report
    assert len(report["recommendations"]) == 3
    assert report["string"] is not None
    assert report["summary"] and "lbs" in report["summary"]
    import json
    json.dumps(report)  # must be JSON-serializable
