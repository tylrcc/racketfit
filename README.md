# 🎾 RacketFit

**Take a quiz, get your complete 2026 tennis setup.** Answer a few questions and
RacketFit tells you everything you need in one place:

- a **target spec profile** (head size, weight, balance, stiffness, string pattern),
- your **top racket matches**, every 2026 release included, each with reasons,
- the **string** to put in it,
- the **tension** to string it at, and
- your **grip size**.

RacketFit has **zero runtime dependencies**, it runs on the Python standard
library alone. There is nothing to `pip install` for users, just run it.

---

## Why

Picking a racket by brand or by what a pro endorses is a trap. What actually
matters is the *spec sheet*: a heavier, head-light, flexible 98 plays nothing
like a light, stiff, head-heavy 105. RacketFit turns how you actually play into
the numbers you should be shopping for, then finds the closest real rackets.

## Quick start

```bash
# 1. Clone
git clone https://github.com/tylrcc/racketfit.git
cd racketfit

# 2a. Launch the web app (opens your browser)
python -m racketfit.web
#    -> http://127.0.0.1:8000

# 2b. ...or take the survey in your terminal
python -m racketfit
```

Optionally install it as a command:

```bash
pip install -e .
racketfit            # interactive survey
racketfit --web      # launch the web app
```

## The web app

A clean, mobile-friendly, one-question-per-screen quiz. Answer 9 questions, get:

- A **complete setup** headline: racket + string + tension + grip.
- **Your target spec profile** as a card of numbers to shop with.
- **Your top 5 racket matches**, each with a match %, the key specs, a `NEW 2026`
  badge where relevant, and why it fits (or where it deviates).
- **Recommended strings** with fit %, plus a personalized **tension** and **grip
  size**.
- **Browse all rackets** in a spec table.

```bash
python -m racketfit.web --port 8080            # custom port
python -m racketfit.web --no-browser           # don't auto-open a tab
```

## The CLI

```bash
# Interactive
racketfit

# Scriptable: answer with flags
racketfit --skill advanced --style aggressive_baseliner \
          --spin high --power generates_own_power --top 3

# Comfort-first with a budget cap
racketfit --skill intermediate --arm-sensitive --budget 230
```

Run `racketfit --help` for every option.

## Use it as a library

```python
from racketfit import PlayerProfile, build_report

profile = PlayerProfile(
    skill_level="intermediate",
    play_style="all_court",
    swing_length="full",
    power_source="balanced",
    spin_priority="high",
    maneuverability_priority="medium",
    arm_sensitive=False,
    hand_length_in=4.25,   # optional, for grip size
)

report = build_report(profile, top_n=3)
print(report["summary"])                  # "Racket + String @ N lbs, grip ..."
print(report["recommendations"][0]["name"])
print(report["string"]["name"], report["tension"]["ideal"], "lbs")
print(report["grip"]["label"])
```

Prefer just the rackets? `recommend(profile, top_n=3)` returns the racket
matches, and `recommend_with_ideal(profile)` adds the derived target spec.
`recommend_strings`, `recommend_tension`, and `recommend_grip` are available
individually too.

## How the matching works

1. **Survey → target spec.** Each answer nudges a baseline value for every spec
   up or down (e.g. *beginner* → bigger head + lighter weight; *arm sensitive* →
   lower stiffness, weighted more heavily). See `racketfit/profile.py`; every
   adjustment is a small, readable number, not a black box.
2. **Score each racket.** For every numeric spec, a racket scores `1.0` at your
   ideal and decays toward `0` as it moves outside your comfortable range
   (`racketfit/models.py:SpecTarget`). String pattern is matched categorically.
3. **Rank.** Scores are combined with per-spec weights into a 0–100 match, then
   sorted. The engine also generates the reasons and cautions you see.

## Project layout

```
racketfit/
  models.py        # dataclasses: PlayerProfile, Racket, TennisString, ...
  profile.py       # survey answers -> target spec
  engine.py        # racket scoring + ranking + explanations
  strings.py       # string matching + tension
  grip.py          # grip-size logic
  report.py        # composes the full report (racket+string+tension+grip)
  database.py      # loads the bundled racket data
  survey.py        # the questions (shared by web + CLI)
  cli.py           # terminal interface
  web.py           # zero-dependency web server + JSON API
  data/rackets.json
  data/strings.json
  web_static/      # index.html, styles.css, app.js
tests/
```

## Contributing

The most valuable contribution is **more gear**. Add rackets to
`racketfit/data/rackets.json` (schema in `_meta.schema`) or strings to
`racketfit/data/strings.json`, then run the tests:

```bash
pip install -e ".[dev]"
pytest
```

Pull requests welcome: new rackets, corrected specs, better matching heuristics,
or UI polish.

## A note on the data

Specs are **approximate** recent-retail manufacturer values, rounded for
comparison. They are a starting point for a shortlist, not gospel. Strings,
grip size, and your own swing change everything. **Always demo before you buy.**

## License

MIT © tylrcc. See [LICENSE](LICENSE).
