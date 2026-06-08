# Changelog

All notable changes to RacketFit are documented here.

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
