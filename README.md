# 🎾 RacketFit

**Find the tennis racket specs that fit your game.** Take a short survey, get a
personalized target spec profile (head size, weight, balance, stiffness, string
pattern) and a ranked list of real rackets that match, each with plain-English
reasons.

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

A clean, mobile-friendly multi-step survey. Answer 8 questions, get:

- **Your target spec profile** as a card of numbers to shop with.
- **Your top 5 matches**, each with a match %, the key specs, and why it fits
  (or where it deviates).
- **Browse all rackets** in a sortable spec table.

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
from racketfit import PlayerProfile, recommend

profile = PlayerProfile(
    skill_level="intermediate",
    play_style="all_court",
    swing_length="full",
    power_source="balanced",
    spin_priority="high",
    maneuverability_priority="medium",
    arm_sensitive=False,
)

for rec in recommend(profile, top_n=3):
    print(f"{rec.score:.0f}%  {rec.racket.name}")
    for reason in rec.reasons:
        print("   ✓", reason)
```

`recommend_with_ideal(profile)` also returns the derived target spec.

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
  models.py        # dataclasses: PlayerProfile, Racket, IdealSpec, ...
  profile.py       # survey answers -> target spec
  engine.py        # scoring + ranking + explanations
  database.py      # loads the bundled racket data
  survey.py        # the questions (shared by web + CLI)
  cli.py           # terminal interface
  web.py           # zero-dependency web server + JSON API
  data/rackets.json
  web_static/      # index.html, styles.css, app.js
tests/
```

## Contributing

The most valuable contribution is **more rackets**. Add entries to
`racketfit/data/rackets.json` following the documented schema (`_meta.schema`),
then run the tests:

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
