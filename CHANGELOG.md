# Changelog

All notable changes to RacketFit are documented here.

## [2.0.0] - 2026-06-07

From a racket finder to a complete gear advisor: one quiz now returns your
whole setup.

### Added
- **2026 rackets**: Yonex VCORE V8 (98, 98 Tour, 100), Head Speed MP 2026 and
  Speed Tour 97, Babolat Pure Aero 2026 (100, 98), Wilson Blade v10, and the new
  Wilson Python 98. Results badge new releases with `NEW 2026`.
- **String recommender**: 17-string database with a weighted-attribute matcher
  (power, control, spin, comfort, durability, feel) plus arm-friendly and
  skill-level logic. Endpoint `GET /api/strings`.
- **Tension recommender**: a personalized stringing tension range in pounds.
- **Grip size recommender**: snap a hand measurement to a standard size, with
  size-down/overgrip guidance (and a sensible default when unmeasured).
- **Unified report**: `build_report()` and the web `POST /api/recommend` now
  return racket + string + tension + grip + a one-line "complete setup" summary.
- Redesigned results page with a setup banner, string cards, and tension/grip
  cards. New optional grip-measurement survey question.

## [1.0.0] - 2026-06-07

Initial release.

### Added
- Recommendation engine that maps survey answers to a target spec profile
  (head size, weight, balance, swingweight, stiffness, string pattern) and
  ranks rackets by weighted spec fit, with plain-English reasons and cautions.
- Curated database of 30 current rackets across 6 brands.
- Zero-dependency web app (stdlib `http.server`): multi-step survey UI plus a
  JSON API (`/api/survey`, `/api/rackets`, `/api/recommend`).
- Interactive and flag-driven CLI (`racketfit`, `python -m racketfit`).
- Test suite covering scoring, profile logic, budget filtering, and the
  survey/profile contract.
