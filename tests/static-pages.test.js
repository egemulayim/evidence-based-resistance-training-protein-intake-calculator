"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const zlib = require("node:zlib");

const repoRoot = path.resolve(__dirname, "..");
const repoHref = "https://github.com/egemulayim/evidence-based-resistance-training-protein-intake-calculator";

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function readBinary(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath));
}

function paethPredictor(left, up, upperLeft) {
  const prediction = left + up - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const upDistance = Math.abs(prediction - up);
  const upperLeftDistance = Math.abs(prediction - upperLeft);

  if (leftDistance <= upDistance && leftDistance <= upperLeftDistance) {
    return left;
  }

  if (upDistance <= upperLeftDistance) {
    return up;
  }

  return upperLeft;
}

function pngRgbaInfo(relativePath) {
  const contents = readBinary(relativePath);
  const signature = contents.subarray(0, 8).toString("hex");
  const idatChunks = [];
  let offset = 8;
  let width = null;
  let height = null;
  let colorType = null;

  assert.equal(signature, "89504e470d0a1a0a");

  while (offset < contents.length) {
    const length = contents.readUInt32BE(offset);
    const type = contents.toString("ascii", offset + 4, offset + 8);
    const data = contents.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
    }

    if (type === "IDAT") {
      idatChunks.push(data);
    }

    offset += length + 12;
  }

  assert.equal(colorType, 6);

  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const rowStride = width * 4;
  let inputOffset = 0;
  let previousRow = Buffer.alloc(rowStride);
  let minAlpha = 255;
  const corners = [];

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inputOffset];
    inputOffset += 1;
    const row = Buffer.alloc(rowStride);

    for (let x = 0; x < rowStride; x += 1) {
      const left = x >= 4 ? row[x - 4] : 0;
      const up = previousRow[x];
      const upperLeft = x >= 4 ? previousRow[x - 4] : 0;
      let value = inflated[inputOffset];
      inputOffset += 1;

      if (filter === 1) {
        value += left;
      } else if (filter === 2) {
        value += up;
      } else if (filter === 3) {
        value += Math.floor((left + up)/2);
      } else if (filter === 4) {
        value += paethPredictor(left, up, upperLeft);
      }

      row[x] = value & 255;
    }

    for (let x = 3; x < rowStride; x += 4) {
      minAlpha = Math.min(minAlpha, row[x]);
    }

    if (y === 0 || y === height - 1) {
      for (const x of [0, width - 1]) {
        const pixelOffset = x * 4;
        corners.push([
          row[pixelOffset],
          row[pixelOffset + 1],
          row[pixelOffset + 2],
          row[pixelOffset + 3],
        ]);
      }
    }

    previousRow = row;
  }

  return {
    width,
    height,
    minAlpha,
    corners,
  };
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

  assert.match(readme, /Status: Version 1\.0\.2 stable\./);
  assert.match(readme, /## Deployment/);
  assert.match(readme, /static files from the `main` branch root with GitHub Pages/i);
  assert.match(readme, /No build command/i);
  assert.match(readme, /without server-side routing/i);
});

test("static pages include favicon, home-screen icons, and share-preview metadata", () => {
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
    assert.match(html, /<link rel="apple-touch-icon" sizes="180x180" href="icons\/apple-touch-icon\.png">/);
    assert.match(html, /<link rel="manifest" href="site\.webmanifest">/);
    assert.match(html, /<meta name="apple-mobile-web-app-title" content="Protein Intake Calculator">/);
    assert.match(html, /<meta name="apple-mobile-web-app-capable" content="yes">/);
    assert.match(html, /<meta name="mobile-web-app-capable" content="yes">/);
    assert.match(html, /<meta name="application-name" content="Protein Intake Calculator">/);
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

test("web app manifest points at generated PNG home-screen icons", () => {
  const manifest = JSON.parse(read("site.webmanifest"));

  assert.equal(manifest.id, "./");
  assert.equal(manifest.name, "Protein Intake Calculator");
  assert.equal(manifest.short_name, "Protein Intake Calculator");
  assert.equal(manifest.start_url, "./");
  assert.equal(manifest.scope, "./");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.background_color, "#0b1110");
  assert.equal(manifest.theme_color, "#0b1110");
  assert.deepEqual(manifest.icons, [
    {
      src: "icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      src: "icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
  ]);

  for (const [iconPath, size] of [
    ["icons/apple-touch-icon.png", 180],
    ["icons/icon-192.png", 192],
    ["icons/icon-512.png", 512],
  ]) {
    const icon = pngRgbaInfo(iconPath);

    assert.equal(icon.width, size);
    assert.equal(icon.height, size);
    assert.equal(icon.minAlpha, 255);
    assert.deepEqual(icon.corners, [
      [16, 34, 30, 255],
      [16, 34, 30, 255],
      [16, 34, 30, 255],
      [16, 34, 30, 255],
    ]);
  }
});

test("public docs describe body-composition values as user-entered or externally estimated", () => {
  const publicDocs = read("docs/CALCULATION.md");
  const calculationPage = read("calculation.html");

  for (const contents of [publicDocs, calculationPage]) {
    assert.match(contents, /User-entered body-fat percentage may come from an imprecise external estimate/i);
    assert.match(contents, /not independently measured by this calculator/i);
  }
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
