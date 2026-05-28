# Evidence-Based Resistance Training Protein Intake Calculator

A small static calculator for estimating daily protein intake for generally healthy adults who perform resistance training and have body-composition goals.

The calculator is intentionally narrow: it is not a full macro calculator, meal planner, clinical nutrition tool, or general sedentary-population protein calculator. It shows the calculation basis so users can see whether the estimate came from current body weight, lean-mass adjustment, or target-body-fat context.

## Live Demo

GitHub Pages URL: _to be added after deployment_

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

## Calculation Summary

Scientific multipliers use kilograms internally because the literature is expressed in grams per kilogram per day. Displayed body weights use the selected unit system first and show the alternate unit in parentheses.

- Maintenance: current body weight, using 1.4 g/kg/day minimum and a 1.6-2.0 g/kg/day practical range.
- Muscle gain/hypertrophy: current body weight, using 1.6 g/kg/day minimum and a 1.6-2.2 g/kg/day practical range.
- Fat loss and recomposition: lean-mass-adjusted logic when body-fat percentage is supplied, with optional goal-weight adjustment if target body-fat percentage is supplied.
- If body-fat percentage is missing, the calculator falls back to current body weight and shows a reduced-precision warning.
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

## Deployment on GitHub Pages

1. Push the repository to GitHub.
2. In the repository settings, open **Pages**.
3. Set the source to deploy from the default branch root.
4. Save and wait for GitHub Pages to publish the site.

Because this is a static site, it does not require a backend, database, login system, or server-side build process.

## Disclaimer

This calculator is for educational purposes only. It is intended for generally healthy adults who perform resistance training. It is not medical advice and is not designed for kidney disease, pregnancy, adolescents, eating disorders, clinical nutrition, diagnosed medical conditions, or medically supervised weight loss. Consult a qualified clinician or registered dietitian for personal medical guidance.

## License

MIT License. See [LICENSE](LICENSE).
