"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildHrefWithShareHash,
  buildMarkdownReport,
  buildShareInputFromResult,
  buildShareUrl,
  buildSummaryReport,
  buildTextReport,
  calculateProtein,
  convertUnitInputValues,
  describeMethodSensitivity,
  describeMethodSensitivityShort,
  getDietPhaseOptionsForGoal,
  getTargetBodyFatRelationshipNotice,
  parseShareState,
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

test("diet phase options only include phases that match the selected goal", () => {
  assert.deepEqual(getDietPhaseOptionsForGoal("fat_loss"), [
    { value: "moderate_deficit", label: "Moderate deficit" },
    { value: "aggressive_cut", label: "Aggressive cut/lean athlete context" },
  ]);
  assert.deepEqual(getDietPhaseOptionsForGoal("recomposition"), [
    { value: "recomposition_slight_deficit", label: "Maintenance/slight deficit" },
    { value: "moderate_deficit", label: "Moderate deficit" },
  ]);
  assert.deepEqual(getDietPhaseOptionsForGoal("maintenance"), []);
  assert.deepEqual(getDietPhaseOptionsForGoal("muscle_gain"), []);
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

test("unit toggle conversion prepares the newly selected unit fields", () => {
  assert.deepEqual(convertUnitInputValues({
    heightCm: "181",
    weightKg: "101.2",
    knownLeanMassKg: "74.2",
  }, "metric", "imperial"), {
    feet: "5",
    inches: "11.26",
    weightLb: "223.11",
    knownLeanMassLb: "163.58",
  });

  assert.deepEqual(convertUnitInputValues({
    feet: "5",
    inches: "11.26",
    weightLb: "223.11",
    knownLeanMassLb: "163.58",
  }, "imperial", "metric"), {
    heightCm: "181",
    weightKg: "101.2",
    knownLeanMassKg: "74.2",
  });

  assert.deepEqual(convertUnitInputValues({
    heightCm: "100.4",
  }, "metric", "imperial"), {
    feet: "3",
    inches: "3.528",
  });

  assert.deepEqual(convertUnitInputValues({
    feet: "3",
    inches: "3.528",
  }, "imperial", "metric"), {
    heightCm: "100.4",
  });

  assert.deepEqual(convertUnitInputValues({
    feet: "5",
    inches: "11",
  }, "imperial", "metric"), {
    heightCm: "180.34",
  });

  assert.deepEqual(convertUnitInputValues({
    heightCm: "180.34",
  }, "metric", "imperial"), {
    feet: "5",
    inches: "11",
  });
});

test("unit toggle conversion preserves equivalent existing target fields", () => {
  assert.deepEqual(convertUnitInputValues({
    heightCm: "181",
    weightKg: "101.2",
    knownLeanMassKg: "74.2",
    feet: "5",
    inches: "11.26",
    weightLb: "223.11",
    knownLeanMassLb: "163.58",
  }, "imperial", "metric"), {});

  assert.deepEqual(convertUnitInputValues({
    heightCm: "180.34",
    weightKg: "36.29",
    knownLeanMassKg: "30",
    feet: "5",
    inches: "11",
    weightLb: "80",
    knownLeanMassLb: "66.14",
  }, "metric", "imperial"), {});

  assert.deepEqual(convertUnitInputValues({
    heightCm: "181",
    weightKg: "101.2",
    knownLeanMassKg: "74.2",
    feet: "5",
    inches: "11.3",
    weightLb: "223.11",
    knownLeanMassLb: "163.58",
  }, "imperial", "metric"), {
    heightCm: "181.1",
  });
});

test("unit toggle conversion ignores invalid source fields", () => {
  assert.deepEqual(convertUnitInputValues({
    heightCm: "99",
    weightKg: "abc",
    knownLeanMassKg: "",
  }, "metric", "imperial"), {});

  assert.deepEqual(convertUnitInputValues({
    feet: "2",
    inches: "12",
    weightLb: "50",
    knownLeanMassLb: "abc",
  }, "imperial", "metric"), {});
});

test("imperial decimal inches below twelve are valid", () => {
  const result = calculateProtein({
    unitSystem: "imperial",
    feet: "5",
    inches: "11.3",
    weightLb: "223.1",
    goal: "maintenance",
    trainingDays: "3-4",
  });

  assertOk(result);
  assert.equal(roundToOne(result.body.heightM * 100), 181.1);

  const invalid = calculateProtein({
    unitSystem: "imperial",
    feet: "5",
    inches: "12",
    weightLb: "223.1",
    goal: "maintenance",
    trainingDays: "3-4",
  });

  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join("\n"), /less than 12/);
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
    assert.equal(result.selected.basisLabel, "Reduced-precision current-weight basis, because neither body-fat percentage nor known lean body mass was supplied");
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
  assert.match(result.warnings.join("\n"), /current body-fat percentage or known lean body mass is needed/);
});

test("known lean body mass supplies the adjusted basis when body-fat percentage is missing", () => {
  const result = calculateProtein({
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    knownLeanMassKg: "80",
    knownLeanMassMethod: "dxa",
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "18",
    trainingDays: "5+",
  });

  assertOk(result);
  assert.equal(result.input.bodyFatPercent, null);
  assert.equal(result.input.knownLeanMassKg, 80);
  assert.equal(result.input.knownLeanMassMethod, "dxa");
  assert.equal(result.body.leanMassSource, "known_lean_mass");
  assert.equal(result.body.bodyFatPercentUsed, 20.8);
  assert.equal(result.body.fatMassKg, 21);
  assert.equal(result.body.leanBodyMassKg, 80);
  assert.equal(result.body.goalWeightKg, 97.6);
  assert.equal(result.selected.basisLabel, "User-provided lean-mass/goal-weight fat-loss basis");
  assertDisplay(result.selected.display, {
    minimum: 160,
    rangeLow: 175,
    rangeHigh: 195,
    defaultTarget: 185,
  });
  assertDisplay(result.estimates.leanMass.display, {
    minimum: 160,
    rangeLow: 170,
    rangeHigh: 185,
    defaultTarget: 175,
  });
  assertDisplay(result.estimates.goalWeight.display, {
    minimum: 155,
    rangeLow: 175,
    rangeHigh: 195,
    defaultTarget: 185,
  });
  assert.doesNotMatch(result.warnings.join("\n"), /Known lean body mass was supplied/);
});

test("custom other lean-mass source is report-only and does not change output", () => {
  const sourceOnly = calculateProtein({
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    knownLeanMassKg: "80",
    knownLeanMassMethod: "other",
    knownLeanMassCustomMethod: "Bod Pod",
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    trainingDays: "5+",
  });
  const noCustomSource = calculateProtein({
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    knownLeanMassKg: "80",
    knownLeanMassMethod: "other",
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    trainingDays: "5+",
  });

  assertOk(sourceOnly);
  assertOk(noCustomSource);
  assert.equal(sourceOnly.input.knownLeanMassMethod, "other");
  assert.equal(sourceOnly.input.knownLeanMassCustomMethod, "Bod Pod");
  assert.deepEqual(sourceOnly.selected.display, noCustomSource.selected.display);
  assert.match(buildTextReport(sourceOnly), /Known lean-mass source \(report only\): Other measured estimate: Bod Pod/);
  assert.match(buildMarkdownReport(sourceOnly), /Known lean-mass source \(report only\):\*\* Other measured estimate: Bod Pod/);
});

test("imperial known lean body mass is converted and used for recomposition", () => {
  const result = calculateProtein({
    unitSystem: "imperial",
    feet: "5",
    inches: "10",
    weightLb: "180",
    knownLeanMassLb: "140",
    knownLeanMassMethod: "bia",
    goal: "recomposition",
    dietPhase: "moderate_deficit",
    trainingDays: "3-4",
  });

  assertOk(result);
  assert.equal(result.input.knownLeanMassKg.toFixed(1), "63.5");
  assert.equal(result.input.knownLeanMassMethod, "bia");
  assert.deepEqual(result.input.sourceKnownLeanMass, { lb: 140 });
  assert.equal(result.body.bodyFatPercentUsed, 22.2);
  assert.equal(result.selected.basisLabel, "User-provided lean-mass deficit recomposition basis");
  assertDisplay(result.selected.display, {
    minimum: 120,
    rangeLow: 125,
    rangeHigh: 145,
    defaultTarget: 135,
  });
});

test("known lean body mass conflict warning prefers the supplied lean mass", () => {
  const result = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    knownLeanMassKg: "60",
  });

  assertOk(result);
  assert.equal(result.input.bodyFatPercent, 26);
  assert.equal(result.body.leanBodyMassKg, 60);
  assert.equal(result.body.bodyFatPercentUsed, 40.6);
  assert.equal(result.selected.basisLabel, "User-provided lean-mass fat-loss basis");
  assertDisplay(result.selected.display, {
    minimum: 120,
    rangeLow: 125,
    rangeHigh: 140,
    defaultTarget: 130,
  });
  assert.match(result.warnings.join("\n"), /differs from the body-fat-percentage estimate/);
  assert.match(result.warnings.join("\n"), /uses the known lean-mass value/);
});

test("known lean body mass must be plausible relative to current body weight", () => {
  const tooHigh = calculateProtein({
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    knownLeanMassKg: "101",
    goal: "maintenance",
    trainingDays: "3-4",
  });

  assert.equal(tooHigh.ok, false);
  assert.match(tooHigh.errors.join("\n"), /lower than current body weight/);

  const implausible = calculateProtein({
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    knownLeanMassKg: "20",
    goal: "maintenance",
    trainingDays: "3-4",
  });

  assert.equal(implausible.ok, false);
  assert.match(implausible.errors.join("\n"), /imply a body-fat percentage between 3 and 70/);
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

  assert.deepEqual(getTargetBodyFatRelationshipNotice({
    unitSystem: "metric",
    weightKg: "101",
    knownLeanMassKg: "80",
    goal: "fat_loss",
    targetBodyFatPercent: "22",
  }), {
    errors: ["For fat loss, target body-fat percentage must be lower than current body-fat percentage."],
    warnings: [],
    invalidTargetBodyFat: true,
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

test("method sensitivity describes available estimate spread", () => {
  const oneMethod = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    bodyFatPercent: "",
  });
  assert.match(describeMethodSensitivity(oneMethod), /Only one estimate method is available/);

  const smallSpread = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "20",
  });
  assert.match(describeMethodSensitivity(smallSpread), /differ by 20 g\/day/);
  assert.match(describeMethodSensitivity(smallSpread), /small practical difference/);

  const largeSpread = calculate({
    goal: "maintenance",
  });
  assert.match(describeMethodSensitivity(largeSpread), /differ by 45 g\/day/);
  assert.match(describeMethodSensitivity(largeSpread), /large difference/);
});

test("reports include method sensitivity after estimate comparison", () => {
  const result = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "20",
  });
  const textReport = buildTextReport(
    result,
    "https://egemulayim.github.io/evidence-based-resistance-training-protein-intake-calculator/"
  );
  const markdownReport = buildMarkdownReport(
    result,
    "https://egemulayim.github.io/evidence-based-resistance-training-protein-intake-calculator/"
  );

  assert.match(textReport, /Method sensitivity\n- The available methods differ by 20 g\/day/);
  assert.match(markdownReport, /### Method Sensitivity\n\nThe available methods differ by 20 g\/day/);
  assert.match(textReport, /Open this calculation\nhttps:\/\/egemulayim\.github\.io\/evidence-based-resistance-training-protein-intake-calculator\/#pc=1&/);
  assert.match(textReport, /Body-composition context\n- Height: 181 cm \(5 ft 11\.26 in\)\n- Current body weight: 101 kg \(222\.67 lb\)\n- BMI: 30\.8/);
  assert.match(markdownReport, /## Open This Calculation\n\nhttps:\/\/egemulayim\.github\.io\/evidence-based-resistance-training-protein-intake-calculator\/#pc=1&/);
  assert.match(markdownReport, /## Body-Composition Context\n\n- \*\*Height:\*\* 181 cm \(5 ft 11\.26 in\)\n- \*\*Current body weight:\*\* 101 kg \(222\.67 lb\)\n- \*\*BMI:\*\* 30\.8/);
});

test("summary report includes compact result and share link", () => {
  const result = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "20",
  });
  const summary = buildSummaryReport(
    result,
    "https://egemulayim.github.io/evidence-based-resistance-training-protein-intake-calculator/"
  );

  assert.match(summary, /^Protein target summary/);
  assert.match(summary, /Default target: 180 g\/day/);
  assert.match(summary, /Practical range: 170-185 g\/day/);
  assert.match(summary, /Basis: Composite lean-mass\/goal-weight fat-loss basis/);
  assert.match(summary, /Goal: Fat loss while resistance training/);
  assert.match(summary, /Diet phase: Moderate deficit/);
  assert.match(summary, /Height: 181 cm \(5 ft 11\.26 in\)/);
  assert.match(summary, /Body weight: 101 kg \(222\.67 lb\)/);
  assert.match(summary, /BMI: 30\.8/);
  assert.match(summary, /Body-fat used: 26%/);
  assert.match(summary, /Goal-weight estimate: 93.4 kg/);
  assert.match(summary, /Method sensitivity: Available methods differ by 20 g\/day/);
  assert.match(summary, /Open this calculation:\nhttps:\/\/egemulayim\.github\.io\/evidence-based-resistance-training-protein-intake-calculator\/#pc=1&/);
  assert.match(summary, /Educational estimate only, not medical advice\./);
  assert.doesNotMatch(summary, /Calculation choice/);
});

test("short method sensitivity is concise for summary output", () => {
  const result = calculate({
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "20",
  });

  assert.equal(
    describeMethodSensitivityShort(result),
    "Available methods differ by 20 g/day in rounded midpoint targets. Small practical difference."
  );
});

test("share URLs use hash state for static hosting", () => {
  const shareUrl = buildShareUrl(
    {
      unitSystem: "imperial",
      feet: "6",
      inches: "1",
      weightLb: "200",
      bodyFatPercent: "26",
      knownLeanMassMethod: "other",
      knownLeanMassCustomMethod: "Bod Pod",
      goal: "fat_loss",
      dietPhase: "moderate_deficit",
      trainingDays: "5+",
      targetBodyFatPercent: "20",
      mealsPerDay: "3",
    },
    "https://egemulayim.github.io/evidence-based-resistance-training-protein-intake-calculator/?old=query"
  );
  const parsedUrl = new URL(shareUrl);

  assert.equal(parsedUrl.search, "");
  assert.match(parsedUrl.hash, /^#pc=1&/);
  assert.match(parsedUrl.hash, /feet=6/);
  assert.match(parsedUrl.hash, /inches=1/);
  assert.match(parsedUrl.hash, /trainingDays=5%2B/);
  assert.deepEqual(parseShareState(parsedUrl.hash), {
    unitSystem: "imperial",
    feet: "6",
    inches: "1",
    weightLb: "200",
    bodyFatPercent: "26",
    knownLeanMassMethod: "other",
    knownLeanMassCustomMethod: "Bod Pod",
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    trainingDays: "5+",
    targetBodyFatPercent: "20",
    mealsPerDay: "3",
  });
  assert.equal(parseShareState("#protein-model"), null);
});

test("state-preserving links only carry calculator share hashes", () => {
  const hash = "#pc=1&unitSystem=metric&heightCm=181&weightKg=101&goal=maintenance&trainingDays=3-4";

  assert.equal(
    buildHrefWithShareHash("calculation.html", hash),
    `calculation.html${hash}`
  );
  assert.equal(
    buildHrefWithShareHash("index.html#scope", hash),
    `index.html${hash}`
  );
  assert.equal(buildHrefWithShareHash("index.html", "#scope"), "index.html");
});

test("share input is derived from the latest calculated result", () => {
  const result = calculateProtein({
    unitSystem: "imperial",
    feet: "6",
    inches: "1",
    weightLb: "200",
    knownLeanMassLb: "148",
    knownLeanMassMethod: "other",
    knownLeanMassCustomMethod: "Bod Pod",
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    trainingDays: "5+",
    targetBodyFatPercent: "20",
    mealsPerDay: "3",
  });

  assertOk(result);
  assert.deepEqual(buildShareInputFromResult(result), {
    unitSystem: "imperial",
    goal: "fat_loss",
    trainingDays: "5+",
    feet: "6",
    inches: "1",
    weightLb: "200",
    knownLeanMassLb: "148",
    knownLeanMassMethod: "other",
    knownLeanMassCustomMethod: "Bod Pod",
    dietPhase: "moderate_deficit",
    targetBodyFatPercent: "20",
    mealsPerDay: "3",
  });
});

test("reports include known lean body mass context when supplied", () => {
  const result = calculateProtein({
    unitSystem: "metric",
    heightCm: "181",
    weightKg: "101",
    knownLeanMassKg: "80",
    knownLeanMassMethod: "dxa",
    goal: "fat_loss",
    dietPhase: "moderate_deficit",
    trainingDays: "5+",
  });
  const textReport = buildTextReport(result);
  const markdownReport = buildMarkdownReport(result);

  assert.match(textReport, /Known lean body mass: 80 kg/);
  assert.match(textReport, /Known lean-mass source \(report only\): DEXA\/DXA scan/);
  assert.match(textReport, /Lean-mass source: User-provided known lean body mass/);
  assert.match(markdownReport, /Known lean body mass:\*\* 80 kg/);
  assert.match(markdownReport, /Known lean-mass source \(report only\):\*\* DEXA\/DXA scan/);
});
