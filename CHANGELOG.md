# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-29

### Added

- Initial plain HTML/CSS/JavaScript calculator for static GitHub Pages deployment.
- Isolated pure `calculateProtein(input)` function for future portability.
- Metric and imperial inputs with validation, comma-decimal parsing, and stable numeric entry without native number-input spinner behavior.
- System-aware light and dark color modes using `prefers-color-scheme`, plus a persistent manual theme toggle.
- Unit-aware result displays: metric users see kg with lb in parentheses, and imperial users see lb with kg in parentheses.
- Optional body-fat percentage, target body-fat percentage, and meals-per-day inputs.
- Required, optional, and strongly recommended field markers with keyboard-accessible help tooltips.
- BMI, fat mass, lean body mass, goal-weight estimate, protein basis, minimum target, practical range, default target, and per-meal distribution output.
- Reduced-precision warnings when body-fat percentage is omitted.
- Training-frequency caution for 0-2 resistance-training days per week.
- Calculation-choice explanations that account for selected unit system while preserving the scientific gram-per-kilogram basis.
- Copy-to-clipboard, plain text export, and Markdown export for calculated results, using the same section order as the on-page results.
- Compact methodology summary in the app, a public `calculation.html` method page with full citations and DOI links, and a Markdown calculation document in `docs/CALCULATION.md`.
- README, MIT license, changelog, public documentation structure, and published GitHub Pages URL.
