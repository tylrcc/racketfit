#!/usr/bin/env python3
"""Generate the comprehensive RacketFit racket database (2016-2026).

This encodes the major brands' main racket lines and their year variants in a
compact table, then writes ``racketfit/data/rackets.json`` plus a copy into
``public/data/`` for the static web build.

Specs are approximate manufacturer/strung values, consistent within each line
and rounded for comparison. They are meant to build a shortlist, not to be a
lab reference. Re-run this script after editing the table:

    python scripts/build_dataset.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

URLS = {
    "Babolat": "https://www.babolat.com",
    "Wilson": "https://www.wilson.com",
    "Head": "https://www.head.com",
    "Yonex": "https://www.yonex.com",
    "Tecnifibre": "https://www.tecnifibre.com",
    "Prince": "https://www.princetennis.com",
    "Dunlop": "https://www.dunlopsports.com",
    "Volkl": "https://www.volkl-tennis.com",
    "Solinco": "https://www.solinco.com",
}

# Columns: brand, model, year, head, strung_weight_g, balance_pts_hl,
#          swingweight, stiffness_ra, beam_mm, pattern, category, msrp
R = [
    # ---------------- Babolat: Pure Aero (spin/power) ----------------
    ("Babolat", "Pure Aero 2016", 2016, 100, 318, 4, 322, 67, 23, "16x19", "Power / Spin", 199),
    ("Babolat", "Pure Aero 2019", 2019, 100, 318, 4, 323, 67, 23, "16x19", "Power / Spin", 229),
    ("Babolat", "Pure Aero 2023", 2023, 100, 318, 4, 324, 67, 24, "16x19", "Power / Spin", 279),
    ("Babolat", "Pure Aero 2026", 2026, 100, 318, 4, 324, 67, 24, "16x19", "Power / Spin", 289),
    ("Babolat", "Pure Aero 98 2023", 2023, 98, 322, 6, 322, 66, 22, "16x19", "Control / Spin", 279),
    ("Babolat", "Pure Aero 98 2026", 2026, 98, 322, 6, 322, 66, 22, "16x19", "Control / Spin", 289),
    ("Babolat", "Pure Aero Plus 2023", 2023, 100, 320, 2, 332, 67, 24, "16x19", "Power / Spin", 279),
    ("Babolat", "Pure Aero Tour 2019", 2019, 100, 333, 2, 333, 68, 23, "16x19", "Power / Spin", 239),
    ("Babolat", "Pure Aero VS 2020", 2020, 98, 322, 6, 320, 65, 22, "16x20", "Control / Spin", 239),
    ("Babolat", "Pure Aero Rafa 2023", 2023, 100, 333, 2, 332, 69, 24, "16x19", "Power / Spin", 289),
    ("Babolat", "Pure Aero Lite 2023", 2023, 100, 300, 0, 308, 66, 24, "16x19", "Lightweight Power", 229),
    ("Babolat", "Pure Aero Team 2023", 2023, 100, 305, 2, 312, 66, 24, "16x19", "Lightweight Power", 229),
    # ---------------- Babolat: Pure Drive (power) ----------------
    ("Babolat", "Pure Drive 2018", 2018, 100, 318, 4, 318, 71, 24, "16x19", "Power", 219),
    ("Babolat", "Pure Drive 2021", 2021, 100, 318, 4, 318, 71, 25, "16x19", "Power", 249),
    ("Babolat", "Pure Drive 2025", 2025, 100, 318, 4, 320, 70, 24, "16x19", "Power", 279),
    ("Babolat", "Pure Drive 98 2025", 2025, 98, 322, 6, 320, 68, 23, "16x19", "Control / Power", 279),
    ("Babolat", "Pure Drive Tour 2021", 2021, 100, 333, 3, 330, 72, 23, "16x19", "Power", 249),
    ("Babolat", "Pure Drive Plus 2021", 2021, 100, 320, 2, 330, 72, 25, "16x19", "Power", 249),
    ("Babolat", "Pure Drive Team 2021", 2021, 100, 305, 2, 312, 70, 25, "16x19", "Lightweight Power", 219),
    ("Babolat", "Pure Drive Lite 2021", 2021, 100, 285, 0, 300, 68, 24, "16x19", "Lightweight Power", 199),
    ("Babolat", "Pure Drive 107 2021", 2021, 107, 300, -2, 318, 70, 26, "16x19", "Power / Beginner", 219),
    # ---------------- Babolat: Pure Strike (control/spin) ----------------
    ("Babolat", "Pure Strike 16x19 2017", 2017, 98, 322, 6, 322, 66, 22, "16x19", "Control / Spin", 219),
    ("Babolat", "Pure Strike 16x19 2020", 2020, 98, 322, 6, 322, 67, 22, "16x19", "Control / Spin", 249),
    ("Babolat", "Pure Strike 16x19 2024", 2024, 98, 322, 6, 323, 65, 22, "16x19", "Control / Spin", 259),
    ("Babolat", "Pure Strike 18x20 2020", 2020, 98, 324, 6, 322, 66, 21, "18x20", "Control", 249),
    ("Babolat", "Pure Strike 18x20 2024", 2024, 98, 324, 6, 323, 64, 21, "18x20", "Control", 259),
    ("Babolat", "Pure Strike 100 2024", 2024, 100, 318, 4, 320, 67, 23, "16x19", "Control / Power", 259),
    ("Babolat", "Pure Strike 97 2024", 2024, 97, 330, 7, 326, 64, 21, "18x20", "Control", 259),
    ("Babolat", "Pure Strike Tour 2020", 2020, 98, 332, 7, 328, 65, 21, "18x20", "Control", 249),
    # ---------------- Babolat: beginner ----------------
    ("Babolat", "Boost Drive", 2021, 105, 275, -2, 300, 69, 25, "16x19", "Beginner / Power", 99),
    ("Babolat", "Evo Drive", 2021, 102, 280, 0, 308, 67, 25, "16x19", "Lightweight Power", 139),

    # ---------------- Wilson: Blade (control) ----------------
    ("Wilson", "Blade 98 16x19 2017 CV", 2017, 98, 322, 7, 327, 62, 21, "16x19", "Control", 219),
    ("Wilson", "Blade 98 16x19 v7", 2019, 98, 322, 7, 328, 62, 21, "16x19", "Control", 229),
    ("Wilson", "Blade 98 16x19 v8", 2021, 98, 322, 7, 328, 62, 21, "16x19", "Control", 259),
    ("Wilson", "Blade 98 16x19 v9", 2024, 98, 322, 7, 330, 62, 21, "16x19", "Control", 259),
    ("Wilson", "Blade 98 16x19 v10 2026", 2026, 98, 322, 7, 328, 61, 21, "16x19", "Control", 269),
    ("Wilson", "Blade 98 18x20 v8", 2021, 98, 322, 7, 325, 63, 21, "18x20", "Control", 259),
    ("Wilson", "Blade 98 18x20 v9", 2024, 98, 322, 7, 326, 62, 21, "18x20", "Control", 259),
    ("Wilson", "Blade 100 v7", 2019, 100, 312, 5, 316, 65, 22, "16x19", "All-Court", 219),
    ("Wilson", "Blade 100 v8", 2021, 100, 312, 5, 316, 64, 22, "16x19", "All-Court", 229),
    ("Wilson", "Blade 100L v8", 2021, 100, 300, 4, 305, 63, 22, "16x19", "Lightweight Control", 209),
    ("Wilson", "Blade 104 v8", 2021, 104, 309, 1, 320, 64, 22, "16x19", "All-Court", 229),
    # ---------------- Wilson: Pro Staff (control/feel) ----------------
    ("Wilson", "Pro Staff RF97 Autograph", 2018, 97, 357, 9, 335, 68, 21, "16x19", "Control", 249),
    ("Wilson", "Pro Staff 97 v13", 2020, 97, 332, 9, 320, 66, 21, "16x19", "Control", 249),
    ("Wilson", "Pro Staff 97 v14", 2023, 97, 332, 9, 320, 66, 21, "16x19", "Control", 259),
    ("Wilson", "Pro Staff 97L v13", 2020, 97, 311, 6, 312, 66, 22, "16x19", "Lightweight Control", 219),
    ("Wilson", "Pro Staff 100 v14", 2023, 100, 320, 7, 318, 64, 23, "16x19", "Control / Power", 259),
    ("Wilson", "Pro Staff Six.One 95", 2016, 95, 350, 8, 330, 67, 21, "18x20", "Control", 219),
    # ---------------- Wilson: Clash (comfort) ----------------
    ("Wilson", "Clash 100 v1", 2019, 100, 312, 7, 312, 55, 24, "16x19", "Comfort / Power", 249),
    ("Wilson", "Clash 100 v2", 2022, 100, 312, 7, 312, 55, 24, "16x19", "Comfort / Power", 249),
    ("Wilson", "Clash 100 Pro v2", 2022, 100, 322, 8, 318, 57, 23, "16x20", "Comfort / Control", 259),
    ("Wilson", "Clash 98 v2", 2022, 98, 318, 8, 315, 58, 23, "16x20", "Comfort / Control", 249),
    ("Wilson", "Clash 108 v2", 2022, 108, 297, 1, 312, 56, 25, "16x19", "Comfort / Beginner", 249),
    # ---------------- Wilson: Ultra / Burn / Shift ----------------
    ("Wilson", "Ultra 100 v3", 2020, 100, 318, 5, 322, 72, 25, "16x19", "Power", 219),
    ("Wilson", "Ultra 100 v4", 2022, 100, 318, 5, 322, 73, 25, "16x19", "Power", 249),
    ("Wilson", "Ultra Tour 95 v4", 2022, 95, 332, 8, 322, 64, 21, "18x20", "Control", 249),
    ("Wilson", "Ultra 108 v4", 2022, 108, 295, 0, 318, 72, 26, "16x19", "Power / Beginner", 219),
    ("Wilson", "Burn 100 v4", 2021, 100, 318, 4, 322, 70, 24, "16x19", "Power / Spin", 219),
    ("Wilson", "Burn 100 v5", 2023, 100, 318, 4, 322, 69, 24, "16x18", "Power / Spin", 219),
    ("Wilson", "Shift 99 v1", 2024, 99, 322, 6, 320, 61, 23, "16x20", "Control / Spin", 259),
    ("Wilson", "Shift 99 Pro v1", 2024, 99, 332, 7, 326, 62, 22, "16x20", "Control", 269),
    ("Wilson", "Python 98 2026", 2026, 98, 320, 6, 322, 66, 23, "16x18", "Spin / Power", 269),
    ("Wilson", "Hyper Hammer 5.3", 2016, 110, 270, -4, 315, 70, 27, "16x20", "Beginner / Power", 109),

    # ---------------- Head: Speed ----------------
    ("Head", "Speed MP 2016", 2016, 100, 318, 5, 320, 64, 23, "16x19", "All-Court", 219),
    ("Head", "Speed MP 2018", 2018, 100, 318, 5, 320, 63, 23, "16x19", "All-Court", 229),
    ("Head", "Speed MP 2020", 2020, 100, 318, 5, 320, 63, 23, "16x19", "All-Court", 239),
    ("Head", "Speed MP 2022", 2022, 100, 318, 5, 320, 62, 23, "16x19", "All-Court", 259),
    ("Head", "Speed MP 2024", 2024, 100, 318, 5, 320, 62, 23, "16x19", "All-Court", 269),
    ("Head", "Speed MP 2026", 2026, 100, 318, 5, 320, 62, 23, "16x19", "All-Court", 269),
    ("Head", "Speed Pro 2022", 2022, 100, 328, 8, 330, 64, 23, "18x20", "Control / All-Court", 269),
    ("Head", "Speed Pro 2024", 2024, 100, 328, 8, 330, 63, 23, "18x20", "Control / All-Court", 269),
    ("Head", "Speed Tour 97 2026", 2026, 97, 322, 8, 320, 63, 22, "16x19", "Control / All-Court", 269),
    ("Head", "Speed MP L 2022", 2022, 100, 300, 3, 308, 62, 23, "16x19", "Lightweight All-Court", 219),
    # ---------------- Head: Radical ----------------
    ("Head", "Radical MP 2016", 2016, 98, 318, 6, 322, 64, 22, "16x19", "All-Court", 219),
    ("Head", "Radical MP 2018", 2018, 98, 318, 6, 322, 63, 22, "16x19", "All-Court", 229),
    ("Head", "Radical MP 2021", 2021, 98, 318, 7, 322, 62, 22, "16x19", "All-Court", 239),
    ("Head", "Radical MP 2023", 2023, 98, 318, 7, 322, 62, 22, "16x19", "All-Court", 259),
    ("Head", "Radical Pro 2023", 2023, 98, 333, 8, 332, 63, 23, "16x19", "Control / Power", 269),
    # ---------------- Head: Prestige ----------------
    ("Head", "Prestige MP 2018", 2018, 99, 332, 8, 330, 62, 21, "18x20", "Control", 229),
    ("Head", "Prestige MP 2021", 2021, 99, 320, 8, 322, 61, 21, "18x20", "Control", 239),
    ("Head", "Prestige MP 2023", 2023, 98, 335, 8, 332, 61, 21, "18x20", "Control", 269),
    ("Head", "Prestige Pro 2023", 2023, 98, 345, 9, 338, 62, 20, "18x20", "Control", 279),
    ("Head", "Prestige Tour 2021", 2021, 95, 345, 8, 335, 60, 20, "18x20", "Control", 239),
    ("Head", "Prestige Mid 2021", 2021, 93, 345, 7, 330, 59, 20, "18x20", "Control", 239),
    # ---------------- Head: Extreme / Gravity / Boom / Instinct ----------------
    ("Head", "Extreme MP 2018", 2018, 100, 318, 4, 322, 64, 23, "16x19", "Spin", 219),
    ("Head", "Extreme MP 2021", 2021, 100, 318, 4, 322, 63, 23, "16x19", "Spin", 229),
    ("Head", "Extreme MP 2022", 2022, 100, 318, 5, 324, 63, 23, "16x19", "Spin", 229),
    ("Head", "Extreme Tour 2022", 2022, 98, 322, 6, 322, 62, 22, "16x19", "Spin / Control", 239),
    ("Head", "Gravity MP 2019", 2019, 100, 318, 6, 322, 62, 22, "16x20", "All-Court / Control", 229),
    ("Head", "Gravity MP 2021", 2021, 100, 318, 6, 322, 62, 22, "16x20", "All-Court / Control", 239),
    ("Head", "Gravity MP 2023", 2023, 100, 318, 6, 322, 61, 23, "16x20", "All-Court / Control", 259),
    ("Head", "Gravity Pro 2023", 2023, 100, 332, 8, 330, 61, 21, "18x20", "Control", 269),
    ("Head", "Gravity Tour 2023", 2023, 100, 322, 7, 324, 62, 22, "16x20", "All-Court / Control", 259),
    ("Head", "Boom MP 2022", 2022, 100, 313, 3, 315, 60, 24, "16x19", "Comfort / Power", 229),
    ("Head", "Boom Pro 2022", 2022, 100, 322, 5, 322, 62, 23, "16x19", "Power / Control", 239),
    ("Head", "Boom MP 2024", 2024, 100, 313, 3, 316, 60, 24, "16x19", "Comfort / Power", 239),
    ("Head", "Instinct MP 2019", 2019, 100, 300, 3, 312, 66, 24, "16x19", "Lightweight Power", 219),
    ("Head", "Instinct MP 2022", 2022, 100, 300, 3, 312, 65, 24, "16x19", "Lightweight Power", 229),
    ("Head", "Ti.S6", 2016, 115, 252, -2, 300, 72, 28, "16x19", "Beginner / Power", 99),

    # ---------------- Yonex: EZONE ----------------
    ("Yonex", "EZONE 98 2017", 2017, 98, 322, 7, 318, 65, 23, "16x19", "All-Court / Power", 219),
    ("Yonex", "EZONE 98 2020", 2020, 98, 322, 7, 320, 65, 23, "16x19", "All-Court / Power", 239),
    ("Yonex", "EZONE 98 2022", 2022, 98, 322, 7, 320, 65, 23, "16x19", "All-Court / Power", 259),
    ("Yonex", "EZONE 98 2025", 2025, 98, 322, 7, 320, 64, 23, "16x19", "All-Court / Power", 269),
    ("Yonex", "EZONE 98 Tour 2022", 2022, 98, 330, 8, 324, 62, 22, "16x19", "Control", 269),
    ("Yonex", "EZONE 100 2020", 2020, 100, 318, 4, 318, 70, 24, "16x19", "Power", 239),
    ("Yonex", "EZONE 100 2022", 2022, 100, 318, 4, 318, 70, 24, "16x19", "Power", 259),
    ("Yonex", "EZONE 100 2025", 2025, 100, 318, 4, 320, 69, 24, "16x19", "Power", 269),
    ("Yonex", "EZONE 100L 2022", 2022, 100, 300, 2, 308, 69, 25, "16x19", "Lightweight Power", 229),
    ("Yonex", "EZONE 105 2022", 2022, 105, 292, 0, 312, 70, 25, "16x19", "Lightweight Power", 239),
    # ---------------- Yonex: VCORE ----------------
    ("Yonex", "VCORE 98 2018", 2018, 98, 322, 6, 320, 64, 22, "16x19", "Spin / Control", 219),
    ("Yonex", "VCORE 98 2021", 2021, 98, 322, 6, 320, 64, 22, "16x19", "Spin / Control", 239),
    ("Yonex", "VCORE 98 2023", 2023, 98, 322, 6, 320, 64, 22, "16x19", "Spin / Control", 259),
    ("Yonex", "VCORE 98 (V8) 2026", 2026, 98, 322, 7, 318, 64, 22, "16x19", "Spin / Control", 279),
    ("Yonex", "VCORE 98 Tour (V8) 2026", 2026, 98, 330, 8, 324, 63, 22, "16x19", "Control / Spin", 289),
    ("Yonex", "VCORE 100 2021", 2021, 100, 318, 4, 320, 67, 24, "16x19", "Power / Spin", 239),
    ("Yonex", "VCORE 100 2023", 2023, 100, 318, 4, 320, 67, 24, "16x19", "Power / Spin", 259),
    ("Yonex", "VCORE 100 (V8) 2026", 2026, 100, 318, 4, 320, 67, 24, "16x19", "Power / Spin", 279),
    ("Yonex", "VCORE 95 2023", 2023, 95, 332, 8, 322, 62, 21, "16x20", "Control / Spin", 259),
    # ---------------- Yonex: VCORE Pro / Percept ----------------
    ("Yonex", "VCORE Pro 97 2019", 2019, 97, 327, 8, 320, 62, 21, "16x19", "Control", 229),
    ("Yonex", "VCORE Pro 97 2021", 2021, 97, 327, 8, 320, 61, 21, "16x19", "Control", 239),
    ("Yonex", "Percept 97 2023", 2023, 97, 327, 8, 322, 60, 21, "16x19", "Control / Comfort", 259),
    ("Yonex", "Percept 97D 2023", 2023, 97, 330, 8, 324, 61, 21, "18x20", "Control", 259),
    ("Yonex", "Percept 100 2023", 2023, 100, 318, 5, 320, 62, 23, "16x19", "All-Court / Control", 259),
    ("Yonex", "Percept 100D 2023", 2023, 100, 323, 6, 324, 63, 23, "18x20", "Control", 259),

    # ---------------- Tecnifibre ----------------
    ("Tecnifibre", "TFight 300 2020", 2020, 98, 318, 5, 318, 66, 22, "16x19", "Control / Power", 219),
    ("Tecnifibre", "TFight 305 2020", 2020, 98, 323, 6, 322, 65, 22, "16x19", "Control / Spin", 229),
    ("Tecnifibre", "TFight 305 2023", 2023, 98, 323, 6, 322, 65, 22, "16x19", "Control / Spin", 249),
    ("Tecnifibre", "TFight 315 2023", 2023, 98, 333, 7, 328, 64, 21, "18x20", "Control", 249),
    ("Tecnifibre", "TFight 295 2023", 2023, 98, 312, 4, 314, 66, 22, "16x19", "Lightweight Control", 229),
    ("Tecnifibre", "TF40 305 18x20 2022", 2022, 98, 323, 7, 326, 64, 22, "18x20", "Control", 259),
    ("Tecnifibre", "TF40 315 16x19 2022", 2022, 98, 333, 7, 330, 64, 22, "16x19", "Control", 259),
    ("Tecnifibre", "TF40 305 2025", 2025, 98, 323, 7, 326, 63, 22, "18x20", "Control", 269),
    ("Tecnifibre", "Tempo 298", 2021, 98, 311, 5, 315, 65, 23, "16x19", "Lightweight Control", 199),

    # ---------------- Prince ----------------
    ("Prince", "Phantom 100P 2022", 2022, 100, 323, 7, 320, 58, 20, "18x20", "Comfort / Control", 229),
    ("Prince", "Phantom 100X 2021", 2021, 100, 318, 6, 320, 63, 21, "16x18", "All-Court / Control", 219),
    ("Prince", "Phantom 93P 2021", 2021, 93, 332, 7, 322, 60, 18, "18x20", "Control", 229),
    ("Prince", "Textreme Tour 100P 2019", 2019, 100, 322, 7, 322, 63, 21, "18x20", "Control", 209),
    ("Prince", "Textreme Tour 95 2019", 2019, 95, 332, 8, 324, 62, 20, "18x20", "Control", 209),
    ("Prince", "Ripstick 100 2020", 2020, 100, 318, 4, 322, 67, 23, "16x19", "Spin / Power", 199),
    ("Prince", "Beast 100 2021", 2021, 100, 318, 4, 322, 68, 24, "16x19", "Power", 189),
    ("Prince", "Beast 98 2021", 2021, 98, 322, 6, 322, 66, 23, "16x19", "Power / Control", 189),

    # ---------------- Dunlop ----------------
    ("Dunlop", "CX 200 2019", 2019, 98, 322, 7, 320, 64, 21, "16x19", "Control", 199),
    ("Dunlop", "CX 200 2021", 2021, 98, 322, 7, 320, 64, 21, "16x19", "Control", 209),
    ("Dunlop", "CX 200 2024", 2024, 98, 322, 7, 320, 64, 21, "16x19", "Control", 219),
    ("Dunlop", "CX 200 Tour 18x20 2024", 2024, 95, 332, 8, 326, 63, 20, "18x20", "Control", 229),
    ("Dunlop", "CX 400 2024", 2024, 100, 312, 5, 318, 66, 23, "16x19", "All-Court", 179),
    ("Dunlop", "SX 300 2020", 2020, 100, 318, 4, 322, 67, 25, "16x19", "Spin", 199),
    ("Dunlop", "SX 300 2022", 2022, 100, 318, 4, 322, 67, 25, "16x19", "Spin", 209),
    ("Dunlop", "SX 300 Tour 2022", 2022, 100, 332, 6, 330, 66, 24, "16x19", "Spin / Control", 219),
    ("Dunlop", "FX 500 2020", 2020, 100, 318, 4, 320, 70, 25, "16x19", "Power", 199),
    ("Dunlop", "FX 500 2023", 2023, 100, 318, 4, 320, 70, 25, "16x19", "Power", 219),
    ("Dunlop", "FX 500 Tour 2023", 2023, 100, 332, 6, 330, 69, 24, "16x19", "Power / Control", 229),

    # ---------------- Volkl ----------------
    ("Volkl", "V-Cell 8 300g", 2019, 100, 318, 5, 320, 66, 23, "16x19", "All-Court", 179),
    ("Volkl", "V-Feel 8 300g", 2018, 100, 318, 5, 320, 62, 23, "16x19", "Comfort / All-Court", 159),
    ("Volkl", "C10 Pro", 2020, 98, 350, 6, 330, 58, 21, "18x20", "Comfort / Control", 219),

    # ---------------- Solinco ----------------
    ("Solinco", "Whiteout 98 16x19 2022", 2022, 98, 322, 7, 326, 64, 21, "16x19", "Control / Spin", 219),
    ("Solinco", "Whiteout 305 2022", 2022, 98, 322, 7, 328, 64, 22, "16x19", "Control / Spin", 219),
    ("Solinco", "Blackout 300 2021", 2021, 100, 318, 4, 320, 66, 23, "16x19", "Spin / Power", 199),

    # ================================================================
    # Classic era, 2005-2015. Approximate strung specs for the era's
    # most widely played frames. Older MSRPs reflect their launch price.
    # ================================================================
    # ---------------- Babolat (2005-2015) ----------------
    ("Babolat", "Pure Drive 2005", 2005, 100, 318, 4, 320, 72, 23, "16x19", "Power", 180),
    ("Babolat", "Pure Drive 2009", 2009, 100, 318, 4, 320, 72, 23, "16x19", "Power", 189),
    ("Babolat", "Pure Drive 2012", 2012, 100, 318, 4, 320, 72, 23, "16x19", "Power", 199),
    ("Babolat", "Pure Drive 2015", 2015, 100, 318, 4, 320, 72, 23, "16x19", "Power", 199),
    ("Babolat", "Pure Drive Roddick 2010", 2010, 100, 332, 2, 332, 72, 23, "16x19", "Power", 199),
    ("Babolat", "AeroPro Drive 2007", 2007, 100, 318, 4, 322, 67, 23, "16x19", "Power / Spin", 189),
    ("Babolat", "AeroPro Drive 2010", 2010, 100, 318, 4, 322, 67, 23, "16x19", "Power / Spin", 189),
    ("Babolat", "AeroPro Drive GT 2013", 2013, 100, 318, 4, 324, 67, 23, "16x19", "Power / Spin", 199),
    ("Babolat", "Pure Storm 2008", 2008, 98, 320, 4, 320, 66, 22, "16x19", "Control", 189),
    ("Babolat", "Pure Storm GT 2011", 2011, 98, 320, 4, 320, 67, 22, "16x19", "Control", 199),
    ("Babolat", "Aero Storm Tour 2010", 2010, 98, 320, 4, 322, 68, 22, "16x19", "Control / Spin", 199),
    ("Babolat", "Pure Control 95 2014", 2014, 95, 330, 8, 322, 64, 21, "18x20", "Control", 199),

    # ---------------- Wilson (2005-2015) ----------------
    ("Wilson", "nCode n6.1 95", 2005, 95, 345, 8, 325, 65, 18, "18x20", "Control", 179),
    ("Wilson", "nCode nBlade 98", 2006, 98, 325, 7, 322, 64, 21, "18x20", "Control", 169),
    ("Wilson", "[K]Six.One 95", 2007, 95, 349, 8, 328, 66, 21, "16x18", "Control", 189),
    ("Wilson", "BLX Six.One 95", 2010, 95, 349, 8, 330, 67, 21, "16x18", "Control", 199),
    ("Wilson", "Pro Staff Six.One 95 2014", 2014, 95, 349, 8, 330, 67, 21, "16x18", "Control", 199),
    ("Wilson", "Pro Staff Six.One 90 2012", 2012, 90, 364, 9, 332, 67, 17, "16x19", "Control", 199),
    ("Wilson", "Blade 98 BLX 2013", 2013, 98, 326, 7, 327, 65, 21, "18x20", "Control", 189),
    ("Wilson", "Blade 98 2015", 2015, 98, 326, 7, 328, 62, 21, "16x19", "Control", 199),
    ("Wilson", "Juice 100 BLX 2013", 2013, 100, 318, 4, 320, 70, 23, "16x19", "Power", 189),
    ("Wilson", "Steam 99 2013", 2013, 99, 332, 6, 325, 70, 22, "18x20", "Control / Power", 189),
    ("Wilson", "Steam 99S 2013", 2013, 99, 332, 6, 322, 71, 22, "16x15", "Spin", 199),
    ("Wilson", "Pro Open BLX 2011", 2011, 100, 309, 3, 325, 71, 25, "16x19", "Power / Spin", 179),

    # ---------------- Head (2005-2015) ----------------
    ("Head", "Liquidmetal Radical 2005", 2005, 102, 320, 4, 325, 66, 23, "16x19", "All-Court", 179),
    ("Head", "Flexpoint Radical 2006", 2006, 98, 320, 5, 322, 65, 22, "16x19", "All-Court", 179),
    ("Head", "MicroGel Radical MP 2008", 2008, 98, 320, 5, 322, 64, 22, "16x19", "All-Court", 179),
    ("Head", "YouTek Radical Pro 2010", 2010, 98, 339, 8, 330, 64, 22, "16x19", "Control", 189),
    ("Head", "YouTek IG Radical Pro 2012", 2012, 98, 339, 8, 330, 64, 22, "16x19", "Control", 199),
    ("Head", "Graphene Radical Pro 2014", 2014, 98, 332, 8, 330, 64, 22, "16x19", "Control", 199),
    ("Head", "Liquidmetal Prestige MP 2005", 2005, 98, 344, 8, 330, 63, 20, "18x20", "Control", 189),
    ("Head", "YouTek Prestige MP 2010", 2010, 98, 335, 8, 330, 62, 21, "18x20", "Control", 199),
    ("Head", "YouTek IG Prestige MP 2012", 2012, 98, 335, 8, 330, 62, 20, "18x20", "Control", 199),
    ("Head", "Graphene Prestige MP 2014", 2014, 98, 335, 8, 330, 61, 21, "18x20", "Control", 199),
    ("Head", "YouTek Speed Pro 2010", 2010, 100, 339, 8, 330, 63, 23, "18x20", "Control / All-Court", 199),
    ("Head", "Graphene Speed Pro 2013", 2013, 100, 340, 8, 332, 64, 23, "18x20", "Control / All-Court", 219),
    ("Head", "Graphene Speed MP 2013", 2013, 100, 315, 5, 320, 62, 23, "16x19", "All-Court", 199),
    ("Head", "Graphene XT Speed MP 2015", 2015, 100, 315, 5, 320, 62, 23, "16x19", "All-Court", 219),
    ("Head", "YouTek IG Extreme MP 2012", 2012, 100, 315, 4, 320, 66, 24, "16x19", "Spin", 189),

    # ---------------- Yonex (2005-2015) ----------------
    ("Yonex", "RDS 001 MP 2007", 2007, 98, 320, 5, 320, 66, 22, "16x19", "Control", 179),
    ("Yonex", "RDiS 100 MP 2009", 2009, 98, 325, 5, 322, 65, 22, "16x19", "Control", 189),
    ("Yonex", "VCORE 98D 2012", 2012, 98, 325, 5, 322, 64, 22, "18x20", "Control", 199),
    ("Yonex", "VCORE Tour G 97 2015", 2015, 97, 330, 8, 322, 62, 21, "16x19", "Control", 199),
    ("Yonex", "EZONE Ai 98 2014", 2014, 98, 320, 5, 318, 65, 23, "16x19", "All-Court", 199),
    ("Yonex", "EZONE Ai 100 2014", 2014, 100, 314, 3, 318, 69, 24, "16x19", "Power", 199),

    # ---------------- Prince (2005-2015) ----------------
    ("Prince", "O3 White 2006", 2006, 100, 320, 4, 320, 67, 24, "16x19", "Power", 179),
    ("Prince", "O3 Speedport Black 2008", 2008, 100, 320, 4, 322, 66, 24, "16x18", "Power / Spin", 179),
    ("Prince", "EXO3 Tour 100 2009", 2009, 100, 320, 6, 320, 63, 22, "16x18", "Control", 179),
    ("Prince", "EXO3 Rebel 95 2010", 2010, 95, 339, 8, 322, 60, 20, "14x18", "Control", 189),
    ("Prince", "Tour 98 ESP 2012", 2012, 98, 320, 6, 320, 65, 22, "16x18", "Control / Spin", 179),

    # ---------------- Dunlop (2005-2015) ----------------
    ("Dunlop", "Aerogel 4D 300 2009", 2009, 98, 320, 4, 320, 66, 22, "16x19", "Control / Power", 159),
    ("Dunlop", "Aerogel 4D 200 2009", 2009, 95, 339, 8, 325, 64, 20, "18x20", "Control", 169),
    ("Dunlop", "Biomimetic 300 2011", 2011, 98, 320, 4, 320, 66, 22, "16x19", "Control / Power", 159),
    ("Dunlop", "Biomimetic F3.0 Tour 2013", 2013, 98, 320, 5, 320, 66, 22, "16x19", "All-Court", 169),
    ("Dunlop", "Srixon Revo CX 2.0 Tour 2015", 2015, 98, 320, 7, 322, 64, 21, "16x19", "Control", 179),

    # ---------------- Volkl & Tecnifibre (2005-2015) ----------------
    ("Volkl", "DNX 9 2006", 2006, 100, 320, 5, 320, 64, 22, "16x19", "All-Court", 179),
    ("Volkl", "Powerbridge 10 Mid 2009", 2009, 93, 335, 7, 320, 62, 19, "16x19", "Control", 189),
    ("Volkl", "Organix 10 325g 2012", 2012, 98, 343, 6, 328, 60, 21, "18x20", "Control / Comfort", 199),
    ("Tecnifibre", "TFight 320 2010", 2010, 98, 339, 6, 328, 66, 22, "16x19", "Control", 189),
    ("Tecnifibre", "TFight 315 Ltd 2013", 2013, 98, 333, 7, 326, 65, 22, "18x20", "Control", 199),
]


def slug(brand: str, model: str) -> str:
    s = f"{brand} {model}".lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


def _load_images() -> dict:
    p = ROOT / "scripts" / "racket_images.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {}


def build_rackets() -> list[dict]:
    images = _load_images()
    out = []
    seen = set()
    for (brand, model, year, head, wt, bal, sw, ra, beam, pat, cat, msrp) in R:
        rid = slug(brand, model)
        if rid in seen:
            raise SystemExit(f"duplicate id: {rid}")
        seen.add(rid)
        entry = {
            "id": rid, "brand": brand, "model": model, "year": year,
            "head_size_sqin": head, "length_in": 27.0, "strung_weight_g": wt,
            "balance_pts_hl": bal, "swingweight": sw, "stiffness_ra": ra,
            "beam_mm": beam, "string_pattern": pat, "category": cat,
            "msrp_usd": msrp, "url": URLS.get(brand),
        }
        # A racket is "in stock / buyable" when we have a live retail photo for
        # it AND it is a current-era frame (older year-variants share a line's
        # photo but are discontinued). Recommendations use only these; browse
        # still shows the whole database.
        entry["in_stock"] = (rid in images) and year >= 2022
        if rid in images:
            entry["image"] = images[rid]
        out.append(entry)
    out.sort(key=lambda r: (r["brand"], -r["year"], r["model"]))
    return out


def main() -> None:
    rackets = build_rackets()
    payload = {
        "_meta": {
            "note": "Comprehensive coverage of major brands' main racket lines, 2005-2026. "
                    "Specs are approximate strung manufacturer values, consistent within each "
                    "line and rounded for comparison. Build a shortlist, then demo before buying. "
                    "Some specs for very recent 2026 frames are projected.",
            "count": len(rackets),
            "generated_by": "scripts/build_dataset.py",
        },
        "rackets": rackets,
    }
    targets = [
        ROOT / "racketfit" / "data" / "rackets.json",
        ROOT / "public" / "data" / "rackets.json",
    ]
    for t in targets:
        t.parent.mkdir(parents=True, exist_ok=True)
        t.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rackets)} rackets to {len(targets)} files.")


if __name__ == "__main__":
    main()
