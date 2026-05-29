# Evidence-Based Resistance Training Protein Intake Calculator

A small static calculator for estimating daily protein intake for generally healthy adults who perform resistance training and have body-composition goals.

The interface starts from the user's system light or dark mode setting, with a persistent manual light/dark toggle.

The calculator is intentionally narrow: it is not a full macro calculator, meal planner, clinical nutrition tool, or general sedentary-population protein calculator. It shows the calculation basis so users can see whether the estimate came from current body weight, lean-mass adjustment, target-body-fat context, or diet phase intensity.

## Live Demo

GitHub Pages URL: https://egemulayim.github.io/evidence-based-resistance-training-protein-intake-calculator/

## Repository Layout

```text
.
+-- index.html
+-- calculation.html
+-- styles.css
+-- script.js
+-- README.md
+-- CHANGELOG.md
+-- LICENSE
+-- .gitignore
`-- docs/
    `-- CALCULATION.md
```

The public web app files live at the repository root so GitHub Pages can serve them directly. `calculation.html` is the user-facing explanation linked from the app, and `docs/CALCULATION.md` keeps the same method in Markdown form.

## Local Use

No build step is required.

Preview option 1: open `index.html` directly in a browser.

Preview option 2: serve the folder with any static file server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Testing

The repository uses Node's built-in test runner and has no test dependencies.

```bash
npm test
```

The regression suite covers calculation formulas, goal/phase gating, target-body-fat scoping, warnings, reports, static page links, and compact slash formatting.

## Calculation Summary

Scientific multipliers use kilograms internally because the literature is expressed in grams per kilogram per day. Displayed body weights use the selected unit system first and show the alternate unit in parentheses.

- Maintenance: current body weight, using 1.4 g/kg/day minimum and a 1.6-2.0 g/kg/day practical range.
- Muscle gain/hypertrophy: current body weight, using 1.6 g/kg/day minimum and a 1.6-2.2 g/kg/day practical range.
- Fat loss and recomposition: goal and diet phase intensity both control the multipliers.
- Diet phase is hidden for maintenance and muscle-gain goals.
- Diet phase options: fat loss uses moderate deficit or aggressive cut/lean athlete context; recomposition uses maintenance/slight deficit or moderate deficit.
- Body-fat percentage provides fat-mass and lean-mass context for every goal.
- Optional known lean body mass can be supplied from a body-composition assessment and is used before body-fat percentage for adjusted lean-mass calculations. The optional lean-mass source label, including a custom "other" source name, is report-only and does not change the formula.
- Body-fat percentage also enables lean-mass-adjusted logic for fat-loss and recomposition goals, with optional goal-weight adjustment if target body-fat percentage is supplied.
- For fat loss, target body-fat percentage must be lower than current body-fat percentage. For recomposition, same-or-higher target body fat is not allowed to drive the goal-weight branch.
- Target body-fat percentage is shown only for fat-loss and recomposition goals. It is not used for maintenance or muscle gain/bulking in version 1 because the current goal-weight equation assumes lean mass is preserved, while a bulk would also need target body weight, projected lean-mass gain, or an expected fat:lean gain split.
- If body-fat percentage is missing for fat-loss or recomposition goals, the calculator falls back to current body weight and shows a reduced-precision warning.
- Displayed protein values are rounded to the nearest 5 g.

For the public calculation rationale, see `calculation.html` in the static site or [docs/CALCULATION.md](docs/CALCULATION.md) in Markdown.

## Result Export

After calculating a result, the page can:

- copy a plain text summary to the clipboard;
- download a plain text report;
- download a Markdown report.

Exports are generated in the browser from the current calculation result. No data is sent to a server.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Disclaimer

This calculator is for educational purposes only. It is intended for generally healthy adults who perform resistance training. It is not medical advice and is not designed for kidney disease, pregnancy, adolescents, eating disorders, clinical nutrition, diagnosed medical conditions, or medically supervised weight loss. Consult a qualified clinician or registered dietitian for personal medical guidance.

## License

MIT License. See [LICENSE](LICENSE).
