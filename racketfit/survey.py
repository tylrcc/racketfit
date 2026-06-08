"""The survey: a single source of truth for the questions, shared by the
web front-end (served as JSON) and the CLI.
"""

from __future__ import annotations

from typing import Any, Dict, List

SURVEY: List[Dict[str, Any]] = [
    {
        "key": "skill_level",
        "title": "How would you rate your level?",
        "help": "Be honest, it drives weight and head size more than anything.",
        "type": "single",
        "options": [
            {"value": "beginner", "label": "Beginner", "desc": "New, or play casually a few times a month."},
            {"value": "intermediate", "label": "Intermediate", "desc": "Solid rallies, league or regular play."},
            {"value": "advanced", "label": "Advanced", "desc": "Competitive, strong technique, full strokes."},
        ],
    },
    {
        "key": "play_style",
        "title": "What is your style of play?",
        "help": "How do you most like to win points?",
        "type": "single",
        "options": [
            {"value": "aggressive_baseliner", "label": "Aggressive baseliner", "desc": "Dictate with big groundstrokes."},
            {"value": "all_court", "label": "All-court", "desc": "Comfortable everywhere, adapt to the point."},
            {"value": "counterpuncher", "label": "Counterpuncher", "desc": "Defense, consistency, redirect pace."},
            {"value": "serve_and_volley", "label": "Serve & volley / net", "desc": "Get forward and finish at the net."},
        ],
    },
    {
        "key": "swing_length",
        "title": "How long is your swing?",
        "help": "Compact, controlled cuts vs. long, full follow-throughs.",
        "type": "single",
        "options": [
            {"value": "compact", "label": "Compact", "desc": "Short, quick swings. Blocks and punches."},
            {"value": "moderate", "label": "Moderate", "desc": "A balanced, repeatable swing."},
            {"value": "full", "label": "Full", "desc": "Long, fast, western-grip windshield wipers."},
        ],
    },
    {
        "key": "power_source",
        "title": "Where should the power come from?",
        "help": "Do you want the racket to add pop, or do you bring your own?",
        "type": "single",
        "options": [
            {"value": "needs_power", "label": "From the racket", "desc": "I want free depth and pop."},
            {"value": "balanced", "label": "A balance", "desc": "A bit of help, but I can hit."},
            {"value": "generates_own_power", "label": "From me", "desc": "I generate plenty, give me control."},
        ],
    },
    {
        "key": "spin_priority",
        "title": "How important is spin?",
        "help": "Heavy topspin and slice vs. flatter, more direct hitting.",
        "type": "single",
        "options": [
            {"value": "low", "label": "Low", "desc": "I hit fairly flat and direct."},
            {"value": "medium", "label": "Medium", "desc": "Normal amount of spin."},
            {"value": "high", "label": "High", "desc": "I live and die by heavy spin."},
        ],
    },
    {
        "key": "maneuverability_priority",
        "title": "How much do you value maneuverability?",
        "help": "Fast hands at the net and quick reactions vs. raw stability.",
        "type": "single",
        "options": [
            {"value": "low", "label": "Low", "desc": "I want stability and plow-through."},
            {"value": "medium", "label": "Medium", "desc": "A reasonable middle ground."},
            {"value": "high", "label": "High", "desc": "Whippy and quick is a must (e.g. doubles)."},
        ],
    },
    {
        "key": "arm_sensitive",
        "title": "Any arm, wrist, or elbow concerns?",
        "help": "Tennis elbow or a history of arm trouble steers us to softer frames.",
        "type": "boolean",
        "options": [
            {"value": True, "label": "Yes, prioritize comfort", "desc": "Softer, more flexible, arm-friendly frames."},
            {"value": False, "label": "No issues", "desc": "Comfort is nice but not the priority."},
        ],
    },
    {
        "key": "budget_usd",
        "title": "Any budget cap? (optional)",
        "help": "We will only show rackets at or under this MSRP. Leave blank for no limit.",
        "type": "number",
        "optional": True,
        "placeholder": "e.g. 220",
    },
]


def survey_keys() -> List[str]:
    return [q["key"] for q in SURVEY]
