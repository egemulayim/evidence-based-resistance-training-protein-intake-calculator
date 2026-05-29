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
  assert.match(html, /<div class="field" id="target-body-fat-field" hidden>/);
  assert.match(html, /<span class="field-note">Fat Loss\/Recomp Only<\/span>/);
  assert.match(html, /id="target-body-fat"[^>]+disabled/);
  assert.match(html, /Fat loss requires a target below current body fat/);
  assert.match(html, /recomp ignores same-or-higher targets/);
  assert.match(html, /not a bulk-planning input/);
});

test("calculation page links GitHub and explains why target body fat is not a bulk model", () => {
  const html = read("calculation.html");

  assert.match(html, new RegExp(`<a class="back-link" href="${repoHref}" target="_blank" rel="noopener">GitHub</a>`));
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
