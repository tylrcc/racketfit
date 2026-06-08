"""Command-line interface for RacketFit.

Two modes:
  * ``racketfit`` (no args)  -> interactive survey in the terminal
  * ``racketfit --skill ...`` -> answer via flags, good for scripting
"""

from __future__ import annotations

import argparse
import sys
from typing import Optional

from . import __version__
from .report import build_report
from .models import (
    PRIORITIES,
    PLAY_STYLES,
    POWER_SOURCES,
    PlayerProfile,
    SKILL_LEVELS,
    SWING_LENGTHS,
)
from .survey import SURVEY


def _ask_interactive() -> PlayerProfile:
    print("\n  RacketFit — let's find your specs.\n")
    answers: dict = {}
    for q in SURVEY:
        print(f"\033[1m{q['title']}\033[0m")
        if q.get("help"):
            print(f"  \033[2m{q['help']}\033[0m")

        if q["type"] == "number":
            raw = input("  > ").strip()
            value = None
            if raw:
                try:
                    value = float(raw) if "." in raw else int(raw)
                except ValueError:
                    value = None
            answers[q["key"]] = value
            print()
            continue

        options = q["options"]
        for i, opt in enumerate(options, 1):
            print(f"  {i}. \033[1m{opt['label']}\033[0m — {opt['desc']}")
        while True:
            raw = input("  > ").strip()
            if raw.isdigit() and 1 <= int(raw) <= len(options):
                answers[q["key"]] = options[int(raw) - 1]["value"]
                break
            print("  Please enter a number from the list.")
        print()

    return PlayerProfile.from_dict(answers)


def _profile_from_args(args: argparse.Namespace) -> PlayerProfile:
    return PlayerProfile.from_dict(
        {
            "skill_level": args.skill,
            "play_style": args.style,
            "swing_length": args.swing,
            "power_source": args.power,
            "spin_priority": args.spin,
            "maneuverability_priority": args.maneuver,
            "arm_sensitive": args.arm_sensitive,
            "budget_usd": args.budget,
            "hand_length_in": args.hand,
        }
    )


def _bar(score: float, width: int = 24) -> str:
    filled = round(score / 100 * width)
    return "█" * filled + "░" * (width - filled)


def _print_results(profile: PlayerProfile, top_n: int) -> None:
    report = build_report(profile, top_n=top_n)
    ideal = report["ideal"]

    if report.get("summary"):
        print("\n\033[1m  YOUR COMPLETE SETUP\033[0m")
        print(f"  \033[32m{report['summary']}\033[0m")

    print("\n\033[1m  Your target spec profile\033[0m")
    for t in ideal["targets"].values():
        print(f"  {t['label']:<12} ~ {t['ideal']}{t['unit']}")
    if ideal["prefer_open_pattern"] is not None:
        pat = "open (more spin)" if ideal["prefer_open_pattern"] else "dense (more control)"
        print(f"  {'Pattern':<12} ~ {pat}")
    for note in ideal["notes"]:
        print(f"  \033[2m• {note}\033[0m")

    print("\n\033[1m  Top racket matches\033[0m\n")
    for rank, rec in enumerate(report["recommendations"], 1):
        r = rec["racket"]
        new = "  \033[33m[NEW 2026]\033[0m" if r.get("year", 0) >= 2026 else ""
        price = f"  ${r['msrp_usd']}" if r.get("msrp_usd") else ""
        print(f"  {rank}. \033[1m{rec['name']}\033[0m  ({r['category']}){price}{new}")
        print(f"     \033[32m{_bar(rec['score'])}\033[0m  {rec['score']:.0f}% match")
        print(
            f"     {int(r['head_size_sqin'])} sq in · {int(r['strung_weight_g'])} g · "
            f"{r['balance_pts_hl']:g} pts HL · RA {int(r['stiffness_ra'])} · {r['string_pattern']}"
        )
        for reason in rec["reasons"][:2]:
            print(f"     \033[32m✓\033[0m {reason}")
        for caution in rec["cautions"][:1]:
            print(f"     \033[33m!\033[0m {caution}")
        print()

    # Strings
    print("\033[1m  Recommended strings\033[0m\n")
    for rank, srec in enumerate(report["strings"], 1):
        s = srec["string"]
        price = f"  ${s['price_usd']}" if s.get("price_usd") else ""
        tag = " \033[32m(top pick)\033[0m" if rank == 1 else ""
        print(f"  {rank}. \033[1m{srec['name']}\033[0m  ({s['type']}, {s['gauge']} mm){price}{tag}")
        print(f"     \033[32m{_bar(srec['score'])}\033[0m  {srec['score']:.0f}% fit")
        for reason in srec["reasons"][:2]:
            print(f"     \033[32m✓\033[0m {reason}")
        print()

    # Tension
    t = report.get("tension")
    if t:
        print("\033[1m  Recommended tension\033[0m")
        print(f"  \033[32m{t['ideal']} lbs\033[0m  (range {t['lo']}-{t['hi']} lbs)")
        for note in t["notes"][:2]:
            print(f"  \033[2m• {note}\033[0m")
        print()

    # Grip
    g = report["grip"]
    print("\033[1m  Recommended grip size\033[0m")
    qualifier = "" if g["confident"] else " (estimate)"
    print(f"  \033[32m{g['label']}\033[0m{qualifier}")
    for note in g["notes"][:2]:
        print(f"  \033[2m• {note}\033[0m")

    print(f"\n  \033[2m{report['disclaimer']}\033[0m\n")


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="racketfit",
        description="Find tennis racket specs that fit your game.",
    )
    p.add_argument("--version", action="version", version=f"RacketFit {__version__}")
    p.add_argument("--top", type=int, default=5, help="how many rackets to show (default 5)")
    p.add_argument("--web", action="store_true", help="launch the web app instead")
    p.add_argument("--port", type=int, default=8000, help="port for --web (default 8000)")

    g = p.add_argument_group("answer via flags (skips the interactive survey)")
    g.add_argument("--skill", choices=SKILL_LEVELS)
    g.add_argument("--style", choices=PLAY_STYLES, default="all_court")
    g.add_argument("--swing", choices=SWING_LENGTHS, default="moderate")
    g.add_argument("--power", choices=POWER_SOURCES, default="balanced")
    g.add_argument("--spin", choices=PRIORITIES, default="medium")
    g.add_argument("--maneuver", choices=PRIORITIES, default="medium")
    g.add_argument("--arm-sensitive", action="store_true", help="prioritize arm comfort")
    g.add_argument("--budget", type=int, default=None, help="max MSRP in USD")
    g.add_argument("--hand", type=float, default=None, help="hand measurement in inches (for grip size)")
    return p


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)

    if args.web:
        from .web import serve

        serve(port=args.port)
        return 0

    try:
        if args.skill:  # non-interactive: at least skill provided
            profile = _profile_from_args(args)
        else:
            profile = _ask_interactive()
    except (KeyboardInterrupt, EOFError):
        print("\n  Cancelled.\n")
        return 130

    _print_results(profile, top_n=args.top)
    return 0


if __name__ == "__main__":
    sys.exit(main())
