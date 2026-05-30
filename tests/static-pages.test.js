"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repoRoot = path.resolve(__dirname, "..");
const repoHref = "https://github.com/egemulayim/evidence-based-resistance-training-protein-intake-calculator";

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function listProjectTextFiles(directory = repoRoot) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(repoRoot, fullPath);

    if (entry.isDirectory()) {
      if ([".git"].includes(entry.name) || relativePath === path.join("docs", "dev")) {
        continue;
      }

      files.push(...listProjectTextFiles(fullPath));
      continue;
    }

    if (
      [
        ".css",
        ".html",
        ".js",
        ".json",
        ".md",
        ".txt",
      ].includes(path.extname(entry.name))
    ) {
      files.push(relativePath);
    }
  }

  return files;
}

test("index page links GitHub and scopes target body fat to fat loss/recomp", () => {
  const html = read("index.html");

  assert.match(html, new RegExp(`<a class="back-link" href="${repoHref}" target="_blank" rel="noopener">GitHub</a>`));
  assert.match(html, /Switching units converts valid height, weight, and known lean-mass entries, while body-fat, goal, phase, and meal fields stay unchanged/);
  assert.match(html, /BMI depends on the height entered, so a 1 cm difference can slightly change the result/);
  assert.match(html, /BMI depends on the height entered, so a small height difference can slightly change the result/);
  assert.match(html, /<summary>Use known lean body mass<\/summary>/);
  assert.match(html, /Body-fat percentage or known lean body mass enables adjusted fat-loss and recomposition estimates/);
  assert.match(html, /Do not enter muscle mass here; lean\/fat-free mass includes all non-fat tissue, not just muscle/);
  assert.match(html, /name="knownLeanMassKg"/);
  assert.match(html, /name="knownLeanMassLb"/);
  assert.match(html, /name="knownLeanMassMethod"/);
  assert.match(html, /id="known-lean-mass-custom-method-field" hidden/);
  assert.match(html, /name="knownLeanMassCustomMethod"/);
  assert.match(html, /<span class="field-note">Report Only<\/span>/);
  assert.match(html, /It does not change the calculation/);
  assert.match(html, /<div class="field" id="target-body-fat-field" hidden>/);
  assert.match(html, /<span class="field-note">Fat Loss\/Recomp Only<\/span>/);
  assert.match(html, /id="target-body-fat"[^>]+disabled/);
  assert.match(html, /Fat loss requires a target below current body fat/);
  assert.match(html, /recomp ignores same-or-higher targets/);
  assert.match(html, /not a bulk-planning input/);
  assert.match(html, /href="calculation\.html" data-preserve-calculator-state/);
  assert.match(html, /type="button" data-reset-calculator>Reset<\/button>/);
  assert.match(read("script.js"), /data-result-action="summary"[^>]*>Summary<\/button>/);
  assert.match(read("script.js"), /data-result-action="report"[^>]*>Report<\/button>/);
  assert.match(read("script.js"), /data-result-action="share"[^>]*>Share<\/button>/);
});

test("calculation page links GitHub and explains why target body fat is not a bulk model", () => {
  const html = read("calculation.html");

  assert.match(html, new RegExp(`<a class="back-link" href="${repoHref}" target="_blank" rel="noopener">GitHub</a>`));
  assert.match(html, /href="index\.html" data-preserve-calculator-state/);
  assert.match(html, /Target body-fat percentage is not used for maintenance or muscle gain in version 1/);
  assert.match(html, /target body weight, projected lean-mass gain, or an expected fat:lean gain split/);
});

test("public docs document target-body-fat scope and bulk-model requirements", () => {
  const publicDocs = read("docs/CALCULATION.md");
  const calculationPage = read("calculation.html");

  for (const contents of [publicDocs, calculationPage]) {
    assert.match(contents, /target body fat alone/i);
    assert.match(contents, /target body weight/i);
    assert.match(contents, /projected lean-mass gain/i);
    assert.match(contents, /fat:lean gain split/i);
  }
});

test("public docs document unit-switch conversion behavior", () => {
  const publicDocs = read("docs/CALCULATION.md");
  const calculationPage = read("calculation.html");

  for (const contents of [publicDocs, calculationPage]) {
    assert.match(contents, /valid height, current body weight, and known lean body mass values are converted/i);
    assert.match(contents, /Body-fat percentage, target body-fat percentage, goal, diet phase, training frequency, meals per day, and lean-mass source labels are not changed/i);
    assert.match(contents, /preserves those values when switching back/i);
    assert.match(contents, /prevents visible round-trip drift/i);
  }
});

test("public docs document known lean-mass behavior and measurement caveats", () => {
  const publicDocs = read("docs/CALCULATION.md");
  const calculationPage = read("calculation.html");

  for (const contents of [publicDocs, calculationPage]) {
    assert.match(contents, /known lean body mass/i);
    assert.match(contents, /DXA/i);
    assert.match(contents, /BIA/i);
    assert.match(contents, /skinfold/i);
    assert.match(contents, /hydration/i);
    assert.match(contents, /reporting and interpretation only/i);
    assert.match(contents, /do not change the formula|does not change the formula/i);
    assert.match(contents, /custom name/i);
    assert.match(contents, /neither body-fat percentage nor known lean body mass/i);
  }
});

test("public docs document method sensitivity interpretation", () => {
  const publicDocs = read("docs/CALCULATION.md");
  const calculationPage = read("calculation.html");

  for (const contents of [publicDocs, calculationPage]) {
    assert.match(contents, /method sensitivity/i);
    assert.match(contents, /current-weight/i);
    assert.match(contents, /lean-mass/i);
    assert.match(contents, /goal-weight/i);
    assert.match(contents, /rounded midpoint targets/i);
  }
});

test("README documents static GitHub Pages deployment", () => {
  const readme = read("README.md");

  assert.match(readme, /Status: Version 1\.0\.0 stable\./);
  assert.match(readme, /## Deployment/);
  assert.match(readme, /static files from the `main` branch root with GitHub Pages/i);
  assert.match(readme, /No build command/i);
  assert.match(readme, /without server-side routing/i);
});

test("static pages include favicon and share-preview metadata", () => {
  const pages = [
    {
      file: "index.html",
      canonical: "https://egemulayim.github.io/evidence-based-resistance-training-protein-intake-calculator/",
      title: "Evidence-Based Resistance Training Protein Intake Calculator",
      description: "Estimate daily protein intake for resistance-training goals with transparent, client-side calculations.",
    },
    {
      file: "calculation.html",
      canonical: "https://egemulayim.github.io/evidence-based-resistance-training-protein-intake-calculator/calculation.html",
      title: "Calculation Method | Evidence-Based Resistance Training Protein Intake Calculator",
      description: "Review the assumptions, equations, evidence basis, and limits behind the resistance-training protein intake calculator.",
    },
  ];

  for (const page of pages) {
    const html = read(page.file);

    assert.ok(html.includes(`<link rel="canonical" href="${page.canonical}">`));
    assert.match(html, /<link rel="icon" href="favicon\.svg" type="image\/svg\+xml">/);
    assert.match(html, /<meta name="application-name" content="Evidence-Based Resistance Training Protein Intake Calculator">/);
    assert.match(html, /<meta property="og:type" content="website">/);
    assert.match(html, /<meta property="og:site_name" content="Evidence-Based Resistance Training Protein Intake Calculator">/);
    assert.ok(html.includes(`<meta property="og:title" content="${page.title}">`));
    assert.ok(html.includes(`<meta property="og:description" content="${page.description}">`));
    assert.ok(html.includes(`<meta property="og:url" content="${page.canonical}">`));
    assert.match(html, /<meta name="twitter:card" content="summary">/);
    assert.ok(html.includes(`<meta name="twitter:title" content="${page.title}">`));
    assert.ok(html.includes(`<meta name="twitter:description" content="${page.description}">`));
  }

  assert.match(read("favicon.svg"), /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 64 64">/);
});

test("mobile result styles avoid result-only horizontal overflow", () => {
  const styles = read("styles.css");

  assert.match(styles, /html\s*{[^}]*overflow-x:\s*hidden/s);
  assert.match(styles, /body\s*{[^}]*overflow-x:\s*hidden/s);
  assert.match(styles, /\.estimate-table\s*{[^}]*table-layout:\s*fixed/s);
  assert.doesNotMatch(styles, /\.estimate-table\s*{[^}]*white-space:\s*nowrap/s);
});

test("mobile result action buttons stay in one compact row", () => {
  const styles = read("styles.css");
  const mobileStyles = styles.match(/@media \(max-width: 620px\) \{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(mobileStyles, /\.result-actions\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.9fr\)[^}]*gap:\s*4px/s);
  assert.match(mobileStyles, /\.compact-button\s*{[^}]*padding-inline:\s*2px[^}]*font-size:\s*0\.68rem/s);
  assert.match(styles, /\.compact-button\s*{[^}]*white-space:\s*nowrap/s);
  assert.match(styles, /@media \(max-width: 360px\) \{[\s\S]*\.compact-button\s*{[^}]*font-size:\s*0\.64rem/s);
});

test("project text files keep compact slash formatting", () => {
  const offenders = [];
  const spacedSlash = ` ${"/"} `;

  for (const relativePath of listProjectTextFiles()) {
    const contents = read(relativePath);

    if (contents.includes(spacedSlash)) {
      offenders.push(relativePath);
    }
  }

  assert.deepEqual(offenders, []);
});
