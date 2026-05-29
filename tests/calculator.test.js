"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildMarkdownReport,
  buildTextReport,
  calculateProtein,
  getTargetBodyFatRelationshipNotice,
  roundToNearestFive,
  roundToOne,
} = require("../script.js");

const baseMetricInput = Object.freeze({
  unitSystem: "metric",
  heightCm: "181",
  weightKg: "101",
  bodyFatPercent: "26",
  trainingDays: "5+",
});

function calculate(overrides = {}) {
  return calculateProtein({
    ...baseMetricInput,
    ...overrides,
  });
}

function assertOk(result) {
  assert.equal(result.ok, true, result.errors?.join("\n"));
}

function assertDisplay(actual, expected) {
  assert.deepEqual(actual, {
    minimum: expected.minimum,
    rangeLow: expected.rangeLow,
    rangeHigh: expected.rangeHigh,
    defaultTarget: expected.defaultTarget,
  });
}

test("rounding helpers use the calculator's practical display rules", () => {
  assert.equal(roundToNearestFive(162.4), 160);
  assert.equal(roundToNearestFive(162.5), 165);
  assert.equal(roundToNearestFive(0), 0);
  assert.equal(roundToOne(93.425), 93.4);
});

test("metric parsing accepts comma decimals and returns body-composition context", () => {
  const result = calculateProtein({
    unitSystem: "metric",
    heightCm: "181,5",
    weightKg: "101,5",
    bodyFatPercent: "26,5",
    goal: "maintenance",
    trainingDays: "3-4",
  });

  assertOk(result);
  assert.equal(result.body.bmi, 30.8);
  assert.equal(result.body.fatMassKg, 26.9);
  assert.equal(result.body.leanBodyMassKg, 74.6);
  assert.equal(result.input.bodyFatPercent, 26.5);
});

test("imperial inputs are converted internally to kilograms", () => {
  const result = calculateProtein({
    unitSystem: "imperial",
    feet: "5",
    inches: "10",
    weightLb: "180",
    bodyFatPercent: "20",
    goal: "muscle_gain",
    trainingDays: "3-4",
  });

  assertOk(result);
  assert.equal(result.body.weightLb, 180);
  assert.equal(result.body.weightKg.toFixed(1), "81.6");
  assert.equal(result.body.bmi, 25.8);
  assertDisplay(result.selected.display, {
    minimum: 130,
    rangeLow: 130,
    rangeHigh: 180,
    defaultTarget: 155,
  });
});

test("maintenance remains current-body-weight based and ignores target body fat", () => {
  const result = calculate({
    goal: "maintenance",
    targetBodyFatPercent: "20",
    dietPhase: "moderate_deficit",
  });

  assertOk(result);
  assert.equal(result.input.dietPhase, null);
  assert.equal(result.input.targetBodyFatPercent, null);
  assert.equal(result.body.goalWeightKg, null);
  assert.equal(result.estimates.goalWeight, null);
  assert.equal(result.selected.basisLabel, "Current body weight basis");
  assertDisplay(result.selected.display, {
    minimum: 140,
    rangeLow: 160,
    rangeHigh: 200,
    defaultTarget: 180,
  });
  assertDisplay(result.estimates.leanMass.display, {
    minimum: 105,
    rangeLow: 120,
    rangeHigh: 150,
    defaultTarget: 135,
  });
  assert.match(result.warnings.join("\n"), /not used for maintenance/i);
  assert.match(result.warnings.join("\n"), /Diet phase intensity is only used/i);
});

test("muscle gain remains current-body-weight based and does not treat target body fat as a bulk model", () => {
  const result = calculate({
    goal: "muscle_gain",
    targetBodyFatPercent: "20",
  });

  assertOk(result);
  assert.equal(result.input.targetBodyFatPercent, null);
  assert.equal(result.body.goalWeightKg, null);
  assert.equal(result.estimates.goalWeight, null);
  assert.equal(result.selected.basisLabel, "Current body weight basis");
  assertDisplay(result.selected.display, {
    minimum: 160,
    rangeLow: 160,
    rangeHigh: 220,
    defaultTarget: 190,
  });
  assertDisplay(result.estimates.leanMass.display, {
    minimum: 120,
    rangeLow: 120,
    rangeHigh: 165,
    defaultTarget: 140,
  });
  assert.match(result.warnings.join("\n"), /muscle gain\/bulking/i);
  assert.match(result.warnings.join("\n"), /target body weight/i);
});

test("invalid target body fat is ignored for unsupported goals but rejected for fat loss/recomposition", () => {
  const maintenance = calculate({
    goal: "maintenance",
    targetBodyFatPercent: "abc",
  });
  assertOk(maintenance);
  assert.equal(maintenance.input.targetBodyFatPercent, null);
  assert.equal(maintenance.body.goalWeightKg, null);

  const fatLoss = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "abc",
  });
  assert.equal(fatLoss.ok, false);
  assert.deepEqual(fatLoss.errors, ["Target body-fat percentage must be between 3 and 60."]);
});

test("goal and phase gating rejects unsupported fat-loss/recomposition combinations", () => {
  const missingPhase = calculate({ goal: "fat_loss", dietPhase: "" });
  assert.equal(missingPhase.ok, false);
  assert.match(missingPhase.errors.join("\n"), /Choose diet phase intensity/);

  const fatLossMaintenancePhase = calculate({
    goal: "fat_loss",
    dietPhase: "recomposition_slight_deficit",
  });
  assert.equal(fatLossMaintenancePhase.ok, false);
  assert.match(fatLossMaintenancePhase.errors.join("\n"), /matches the selected goal/);

  const recompAggressiveCut = calculate({
    goal: "recomposition",
    dietPhase: "aggressive_cut",
  });
  assert.equal(recompAggressiveCut.ok, false);
  assert.match(recompAggressiveCut.errors.join("\n"), /matches the selected goal/);
});

test("fat-loss and recomposition phase models produce distinct selected outputs without target body fat", () => {
  const cases = [
    {
      input: { goal: "fat_loss", dietPhase: "moderate_deficit" },
      basis: "Lean-mass-adjusted fat-loss basis",
      display: { minimum: 150, rangeLow: 155, rangeHigh: 170, defaultTarget: 165 },
    },
    {
      input: { goal: "fat_loss", dietPhase: "aggressive_cut" },
      basis: "Lean-athlete aggressive-cut basis",
      display: { minimum: 170, rangeLow: 170, rangeHigh: 230, defaultTarget: 200 },
    },
    {
      input: { goal: "recomposition", dietPhase: "recomposition_slight_deficit" },
      basis: "Lean-mass-adjusted recomposition basis",
      display: { minimum: 135, rangeLow: 140, rangeHigh: 165, defaultTarget: 155 },
    },
    {
      input: { goal: "recomposition", dietPhase: "moderate_deficit" },
      basis: "Lean-mass-adjusted deficit recomposition basis",
      display: { minimum: 140, rangeLow: 150, rangeHigh: 170, defaultTarget: 160 },
    },
  ];

  for (const currentCase of cases) {
    const result = calculate(currentCase.input);
    assertOk(result);
    assert.equal(result.selected.basisLabel, currentCase.basis);
    assertDisplay(result.selected.display, currentCase.display);
    assert.equal(result.body.goalWeightKg, null);
    assert.equal(result.estimates.goalWeight, null);
  }

  const fatLossModerate = calculate({ goal: "fat_loss", dietPhase: "moderate_deficit" });
  const recompModerate = calculate({ goal: "recomposition", dietPhase: "moderate_deficit" });
  assert.notDeepEqual(fatLossModerate.selected.display, recompModerate.selected.display);
});

test("target body fat activates goal-weight composite estimates only for fat loss/recomposition", () => {
  const cases = [
    {
      input: { goal: "fat_loss", dietPhase: "moderate_deficit", targetBodyFatPercent: "20" },
      basis: "Composite lean-mass/goal-weight fat-loss basis",
      display: { minimum: 150, rangeLow: 170, rangeHigh: 185, defaultTarget: 180 },
      goalWeightDisplay: { minimum: 150, rangeLow: 170, rangeHigh: 185, defaultTarget: 180 },
    },
    {
      input: { goal: "fat_loss", dietPhase: "aggressive_cut", targetBodyFatPercent: "20" },
      basis: "Composite lean-athlete/goal-weight aggressive-cut basis",
      display: { minimum: 170, rangeLow: 185, rangeHigh: 230, defaultTarget: 210 },
      goalWeightDisplay: { minimum: 170, rangeLow: 185, rangeHigh: 205, defaultTarget: 195 },
    },
    {
      input: { goal: "recomposition", dietPhase: "recomposition_slight_deficit", targetBodyFatPercent: "20" },
      basis: "Composite lean-mass/goal-weight recomposition basis",
      display: { minimum: 140, rangeLow: 150, rangeHigh: 170, defaultTarget: 160 },
      goalWeightDisplay: { minimum: 140, rangeLow: 150, rangeHigh: 170, defaultTarget: 160 },
    },
    {
      input: { goal: "recomposition", dietPhase: "moderate_deficit", targetBodyFatPercent: "20" },
      basis: "Composite lean-mass/goal-weight deficit recomposition basis",
      display: { minimum: 150, rangeLow: 160, rangeHigh: 180, defaultTarget: 170 },
      goalWeightDisplay: { minimum: 150, rangeLow: 160, rangeHigh: 180, defaultTarget: 170 },
    },
  ];

  for (const currentCase of cases) {
    const result = calculate(currentCase.input);
    assertOk(result);
    assert.equal(result.input.targetBodyFatPercent, 20);
    assert.equal(result.body.goalWeightKg, 93.4);
    assert.equal(result.selected.basisLabel, currentCase.basis);
    assertDisplay(result.selected.display, currentCase.display);
    assertDisplay(result.estimates.goalWeight.display, currentCase.goalWeightDisplay);
  }
});

test("fat-loss/recomposition current-weight fallbacks are explicit when body fat is missing", () => {
  const noBodyFatBase = {
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    trainingDays: "5+",
  };
  const cases = [
    {
      input: { goal: "fat_loss", dietPhase: "moderate_deficit" },
      display: { minimum: 160, rangeLow: 170, rangeHigh: 200, defaultTarget: 185 },
      warning: /Lean-mass and adjusted-goal estimates are unavailable/,
    },
    {
      input: { goal: "fat_loss", dietPhase: "aggressive_cut" },
      display: { minimum: 180, rangeLow: 200, rangeHigh: 240, defaultTarget: 220 },
      warning: /Aggressive cut\/lean athlete context works best/,
    },
    {
      input: { goal: "recomposition", dietPhase: "recomposition_slight_deficit" },
      display: { minimum: 150, rangeLow: 160, rangeHigh: 200, defaultTarget: 180 },
      warning: /Lean-mass and adjusted-goal estimates are unavailable/,
    },
    {
      input: { goal: "recomposition", dietPhase: "moderate_deficit" },
      display: { minimum: 160, rangeLow: 170, rangeHigh: 200, defaultTarget: 185 },
      warning: /Lean-mass and adjusted-goal estimates are unavailable/,
    },
  ];

  for (const currentCase of cases) {
    const result = calculateProtein({
      ...noBodyFatBase,
      ...currentCase.input,
    });

    assertOk(result);
    assert.equal(result.selected.basisLabel, "Reduced-precision current-weight basis, because body-fat percentage was not supplied");
    assertDisplay(result.selected.display, currentCase.display);
    assert.equal(result.estimates.leanMass, null);
    assert.equal(result.estimates.goalWeight, null);
    assert.match(result.warnings.join("\n"), currentCase.warning);
  }
});

test("target body fat without current body fat does not invent a goal weight", () => {
  const result = calculateProtein({
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "20",
    trainingDays: "5+",
  });

  assertOk(result);
  assert.equal(result.input.targetBodyFatPercent, 20);
  assert.equal(result.body.goalWeightKg, null);
  assert.equal(result.estimates.goalWeight, null);
  assert.match(result.warnings.join("\n"), /current body-fat percentage is needed/);
});

test("fat loss rejects target body fat that is not lower than current body fat", () => {
  const result = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "30",
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, ["For fat loss, target body-fat percentage must be lower than current body-fat percentage."]);
});

test("target body-fat relationship notice supports immediate form feedback", () => {
  assert.deepEqual(getTargetBodyFatRelationshipNotice({
    goal: "fat_loss",
    bodyFatPercent: "26",
    targetBodyFatPercent: "26",
  }), {
    errors: ["For fat loss, target body-fat percentage must be lower than current body-fat percentage."],
    warnings: [],
    invalidTargetBodyFat: true,
  });

  assert.deepEqual(getTargetBodyFatRelationshipNotice({
    goal: "recomposition",
    bodyFatPercent: "26",
    targetBodyFatPercent: "30",
  }), {
    errors: [],
    warnings: ["For recomposition, target body-fat percentage is equal to or higher than current body-fat percentage, so the goal-weight branch will be ignored."],
    invalidTargetBodyFat: false,
  });

  assert.deepEqual(getTargetBodyFatRelationshipNotice({
    goal: "fat_loss",
    bodyFatPercent: "26",
    targetBodyFatPercent: "20",
  }), {
    errors: [],
    warnings: [],
    invalidTargetBodyFat: false,
  });
});

test("recomposition ignores target body fat that is not lower than current body fat", () => {
  const result = calculate({
    goal: "recomposition",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "30",
  });

  assertOk(result);
  assert.equal(result.input.targetBodyFatPercent, 30);
  assert.equal(result.body.goalWeightKg, null);
  assert.equal(result.estimates.goalWeight, null);
  assert.equal(result.selected.basisLabel, "Lean-mass-adjusted deficit recomposition basis");
  assertDisplay(result.selected.display, {
    minimum: 140,
    rangeLow: 150,
    rangeHigh: 170,
    defaultTarget: 160,
  });
  assert.match(result.warnings.join("\n"), /goal-weight branch was not used/);
});

test("meal distribution divides the selected raw target after the main calculation", () => {
  const result = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    mealsPerDay: "4",
  });

  assertOk(result);
  assert.deepEqual(result.selected.perMeal, {
    rawDefault: result.selected.raw.defaultTarget/4,
    rawRangeLow: result.selected.raw.rangeLow/4,
    rawRangeHigh: result.selected.raw.rangeHigh/4,
    displayDefault: 40,
    displayRangeLow: 40,
    displayRangeHigh: 45,
    mealsPerDay: 4,
  });

  const invalidMeals = calculate({
    goal: "maintenance",
    mealsPerDay: "2.5",
  });
  assert.equal(invalidMeals.ok, false);
  assert.deepEqual(invalidMeals.errors, ["Meals per day must be a whole number from 1 to 8."]);
});

test("low training frequency warning does not block calculation", () => {
  const result = calculate({
    goal: "maintenance",
    trainingDays: "0-2",
  });

  assertOk(result);
  assert.match(result.warnings.join("\n"), /Training frequency is 0-2 days\/week/);
});

test("reports do not claim target body fat was used for maintenance", () => {
  const result = calculate({
    goal: "maintenance",
    targetBodyFatPercent: "20",
  });
  const textReport = buildTextReport(result);
  const markdownReport = buildMarkdownReport(result);

  assert.match(textReport, /Target body-fat percentage: Not used for this goal/);
  assert.match(markdownReport, /Target body-fat percentage:\*\* Not used for this goal/);
  assert.doesNotMatch(textReport, /Goal-weight estimate:/);
  assert.doesNotMatch(markdownReport, /Goal-weight estimate:/);
});

test("reports include goal-weight context when target body fat is valid for fat loss", () => {
  const result = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "20",
  });
  const textReport = buildTextReport(result);
  const markdownReport = buildMarkdownReport(result);

  assert.match(textReport, /Target body-fat percentage: 20%/);
  assert.match(textReport, /Goal-weight estimate: 93.4 kg/);
  assert.match(markdownReport, /Target body-fat percentage:\*\* 20%/);
  assert.match(markdownReport, /Goal-weight estimate:\*\* 93.4 kg/);
});
