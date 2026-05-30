# Changelog

All notable changes to this project will be documented in this file.

## [0.1.3] - 2026-05-30

### Added

- Added hash-based share links that restore form inputs, recalculate on load, and work on GitHub Pages without routing changes.
- Added method sensitivity text to the on-page results and exported reports.
- Added a reset button that clears all inputs, results, messages, and calculator share-link state.
- Added a compact summary-copy action with the share link included at the end.
- Added restorable calculation links to full TXT and Markdown reports.

## [0.1.2] - 2026-05-30

### Added

- Added optional known lean body mass input, with a report-only source selector and adjusted calculation support for fat-loss and recomposition goals.
- Added warnings for materially conflicting body-fat percentage and known lean body mass inputs.
- Added an optional custom source-name field for the report-only "other measured estimate" lean-mass source.

### Fixed

- Rebuilt diet phase options per selected goal so unsupported phases disappear from mobile native pickers instead of appearing disabled.
- Improved mobile result positioning by blurring the active control and scrolling the rendered results panel into view after calculation.
- Made the mobile methodology summary and disclaimer span the same content width as the calculator panels.
- Fixed invalid-input styling by replacing undefined danger color variables with the existing error color tokens.
- Removed the generic known-lean-mass estimate caveat from warning notes.

## [0.1.1] - 2026-05-29

### Changed

- Added diet phase intensity for fat-loss and recomposition goals, with the field hidden for goals that do not use it.
- Separated fat-loss and recomposition phase models so the same diet phase no longer produces identical results across those goals.
- Removed maintenance/slight deficit from fat-loss phase options.
- Fixed the conditional-field wiring so goal and body-fat percentage remain visible for all goals.
- Scoped target body-fat percentage to fat-loss and recomposition goals, with maintenance and muscle-gain/bulking treated as unsupported for that preserved-lean-mass equation in version 1.
- Rejected fat-loss target body-fat values that are not lower than current body fat, and prevented same-or-higher recomposition targets from driving the goal-weight branch.
- Added immediate target-body-fat feedback so fat-loss and recomposition users see target/current body-fat conflicts before submitting the form.
- Added GitHub repository links to the calculator and calculation pages.
- Added a dependency-free Node test suite covering formulas, goal/phase gating, target-body-fat behavior, warnings, reports, and static page invariants.
- Updated public calculation documentation to match the phase-based formulas.

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
