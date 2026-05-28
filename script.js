"use strict";

const VALID_GOALS = ["maintenance", "muscle_gain", "fat_loss", "recomposition"];
const VALID_TRAINING_DAYS = ["0-2", "3-4", "5+"];
const THEME_STORAGE_KEY = "proteinCalculatorTheme";
const THEME_MODES = ["light", "dark"];

const THEME_LABELS = {
  light: "Theme: Light",
  dark: "Theme: Dark",
};

const GOAL_LABELS = {
  maintenance: "Maintenance while resistance training",
  muscle_gain: "Muscle gain/hypertrophy",
  fat_loss: "Fat loss while resistance training",
  recomposition: "Body recomposition",
};

const DISCLAIMER_TEXT = "This calculator is for educational purposes only. It is intended for generally healthy adults who perform resistance training. It is not medical advice and is not designed for kidney disease, pregnancy, adolescents, eating disorders, clinical nutrition, diagnosed medical conditions, or medically supervised weight loss. Consult a qualified clinician or registered dietitian for personal medical guidance.";

let latestResult = null;

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }

  const normalized = String(value).trim().replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function roundToNearestFive(value) {
  return Math.round(value / 5) * 5;
}

function roundToOne(value) {
  return Math.round(value * 10) / 10;
}

function kgToLb(value) {
  return value * 2.20462;
}

function describeCurrentWeightBasis(unitSystem) {
  if (unitSystem === "imperial") {
    return "current body weight in pounds as entered, converted internally to kilograms";
  }

  return "current body weight in kilograms";
}

function describeAdjustedBasis(unitSystem) {
  if (unitSystem === "imperial") {
    return "lean-body-mass and adjusted body-weight estimates shown with pounds first";
  }

  return "lean-body-mass and adjusted body-weight estimates in kilograms";
}

function describeEvidenceUnitHandling(unitSystem) {
  if (unitSystem === "imperial") {
    return "For imperial users, the 1.4-2.0 g/kg/day source range is equivalent to about 0.64-0.91 g/lb/day after conversion.";
  }

  return "The published evidence range is expressed as grams per kilogram per day, matching the metric calculation basis.";
}

function describeHypertrophyMultiplierHandling(unitSystem) {
  if (unitSystem === "imperial") {
    return "The central lower anchor is about 0.73 g/lb/day after converting the 1.6 g/kg/day evidence anchor, with a practical upper boundary of about 1.00 g/lb/day.";
  }

  return "The central lower anchor is 1.6 g/kg/day, with a practical upper boundary of 2.2 g/kg/day.";
}

function describeAdjustedMultiplierHandling(unitSystem) {
  if (unitSystem === "imperial") {
    return "For imperial interpretation, the practical range branches are roughly 0.95-1.04 g/lb/day of lean mass and 0.82-0.91 g/lb/day of adjusted body weight after conversion from the source g/kg/day multipliers.";
  }

  return "The practical range branches use 2.1-2.3 g/kg/day of lean mass and 1.8-2.0 g/kg/day of adjusted body weight.";
}

function buildEstimate(label, basisKg, minimumMultiplier, lowMultiplier, highMultiplier) {
  const minimumRaw = basisKg * minimumMultiplier;
  const rangeLowRaw = basisKg * lowMultiplier;
  const rangeHighRaw = basisKg * highMultiplier;
  const defaultRaw = (rangeLowRaw + rangeHighRaw) / 2;

  return {
    label,
    basisKg,
    multipliers: {
      minimum: minimumMultiplier,
      rangeLow: lowMultiplier,
      rangeHigh: highMultiplier,
    },
    raw: {
      minimum: minimumRaw,
      rangeLow: rangeLowRaw,
      rangeHigh: rangeHighRaw,
      defaultTarget: defaultRaw,
    },
    display: {
      minimum: roundToNearestFive(minimumRaw),
      rangeLow: roundToNearestFive(rangeLowRaw),
      rangeHigh: roundToNearestFive(rangeHighRaw),
      defaultTarget: roundToNearestFive(defaultRaw),
    },
  };
}

function buildCompositeSelection(label, basisLabel, explanation, leanBodyMassKg, adjustedBasisKg) {
  const minimumRaw = Math.max(leanBodyMassKg * 2.0, adjustedBasisKg * 1.6);
  const rangeLowRaw = Math.max(leanBodyMassKg * 2.1, adjustedBasisKg * 1.8);
  const rangeHighRaw = Math.max(leanBodyMassKg * 2.3, adjustedBasisKg * 2.0);
  const defaultRaw = (rangeLowRaw + rangeHighRaw) / 2;

  return {
    label,
    basisLabel,
    explanation,
    basisKg: adjustedBasisKg,
    raw: {
      minimum: minimumRaw,
      rangeLow: rangeLowRaw,
      rangeHigh: rangeHighRaw,
      defaultTarget: defaultRaw,
    },
    display: {
      minimum: roundToNearestFive(minimumRaw),
      rangeLow: roundToNearestFive(rangeLowRaw),
      rangeHigh: roundToNearestFive(rangeHighRaw),
      defaultTarget: roundToNearestFive(defaultRaw),
    },
  };
}

function calculateProtein(input) {
  const errors = [];
  const warnings = [];

  const unitSystem = input.unitSystem;
  const goal = input.goal;
  const trainingDays = input.trainingDays;

  if (unitSystem !== "metric" && unitSystem !== "imperial") {
    errors.push("Choose metric or imperial units.");
  }

  if (!VALID_GOALS.includes(goal)) {
    errors.push("Choose a goal.");
  }

  if (!VALID_TRAINING_DAYS.includes(trainingDays)) {
    errors.push("Choose resistance-training frequency.");
  }

  let heightM = null;
  let weightKg = null;
  let sourceHeight = {};
  let sourceWeight = {};

  if (unitSystem === "metric") {
    const heightCm = parseOptionalNumber(input.heightCm);
    const metricWeightKg = parseOptionalNumber(input.weightKg);

    if (heightCm === null) {
      errors.push("Enter height in centimetres.");
    } else if (Number.isNaN(heightCm) || heightCm < 100 || heightCm > 250) {
      errors.push("Height must be between 100 and 250 cm.");
    } else {
      heightM = heightCm / 100;
      sourceHeight = { cm: heightCm };
    }

    if (metricWeightKg === null) {
      errors.push("Enter current body weight in kilograms.");
    } else if (Number.isNaN(metricWeightKg) || metricWeightKg < 30 || metricWeightKg > 300) {
      errors.push("Body weight must be between 30 and 300 kg.");
    } else {
      weightKg = metricWeightKg;
      sourceWeight = { kg: metricWeightKg };
    }
  }

  if (unitSystem === "imperial") {
    const feet = parseOptionalNumber(input.feet);
    const inchesInput = parseOptionalNumber(input.inches);
    const weightLb = parseOptionalNumber(input.weightLb);
    const inches = inchesInput === null ? 0 : inchesInput;

    if (feet === null) {
      errors.push("Enter height in feet.");
    } else if (Number.isNaN(feet) || feet < 3 || feet > 8) {
      errors.push("Feet must be between 3 and 8.");
    }

    if (Number.isNaN(inches) || inches < 0 || inches > 11) {
      errors.push("Inches must be between 0 and 11.");
    }

    if (weightLb === null) {
      errors.push("Enter current body weight in pounds.");
    } else if (Number.isNaN(weightLb) || weightLb < 66 || weightLb > 660) {
      errors.push("Body weight must be between 66 and 660 lb.");
    }

    if (errors.length === 0 || (feet !== null && !Number.isNaN(feet) && inches !== null && !Number.isNaN(inches))) {
      if (feet !== null && !Number.isNaN(feet) && inches !== null && !Number.isNaN(inches)) {
        heightM = ((feet * 12) + inches) * 0.0254;
        sourceHeight = { feet, inches };
      }
    }

    if (weightLb !== null && !Number.isNaN(weightLb)) {
      weightKg = weightLb / 2.20462;
      sourceWeight = { lb: weightLb };
    }
  }

  const bodyFatPercent = parseOptionalNumber(input.bodyFatPercent);
  const hasBodyFatPercent = bodyFatPercent !== null && !Number.isNaN(bodyFatPercent);

  if (bodyFatPercent !== null) {
    if (Number.isNaN(bodyFatPercent) || bodyFatPercent < 3 || bodyFatPercent > 70) {
      errors.push("Body-fat percentage must be between 3 and 70.");
    }
  } else {
    warnings.push("Body-fat percentage was not supplied. Lean-mass and adjusted-goal estimates are unavailable, so the result uses a reduced-precision current-weight basis.");
  }

  const targetBodyFatPercent = parseOptionalNumber(input.targetBodyFatPercent);
  const hasTargetBodyFatPercent = targetBodyFatPercent !== null && !Number.isNaN(targetBodyFatPercent);

  if (targetBodyFatPercent !== null) {
    if (Number.isNaN(targetBodyFatPercent) || targetBodyFatPercent < 3 || targetBodyFatPercent > 60) {
      errors.push("Target body-fat percentage must be between 3 and 60.");
    } else if (targetBodyFatPercent < 8) {
      warnings.push("The supplied target body-fat percentage is very low. Treat any goal-weight estimate as contextual, not as a recommended target.");
    }
  }

  const mealsPerDay = parseOptionalNumber(input.mealsPerDay);
  const hasMealsPerDay = mealsPerDay !== null && !Number.isNaN(mealsPerDay);

  if (mealsPerDay !== null) {
    if (Number.isNaN(mealsPerDay) || !Number.isInteger(mealsPerDay) || mealsPerDay < 1 || mealsPerDay > 8) {
      errors.push("Meals per day must be a whole number from 1 to 8.");
    }
  }

  if (trainingDays === "0-2") {
    warnings.push("Training frequency is 0-2 days/week. The calculator can still estimate protein, but confidence is lower because it is designed primarily for consistent resistance training.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
    };
  }

  const bmiRaw = weightKg / (heightM * heightM);
  let fatMassKg = null;
  let leanBodyMassKg = null;
  let goalWeightKg = null;

  if (hasBodyFatPercent) {
    fatMassKg = weightKg * (bodyFatPercent / 100);
    leanBodyMassKg = weightKg - fatMassKg;
  }

  if (hasTargetBodyFatPercent && hasBodyFatPercent) {
    goalWeightKg = leanBodyMassKg / (1 - (targetBodyFatPercent / 100));

    if ((goal === "fat_loss" || goal === "recomposition") && targetBodyFatPercent >= bodyFatPercent) {
      warnings.push("The target body-fat percentage is equal to or higher than the current body-fat percentage, so the goal-weight calculation may not represent fat-loss progress.");
    }
  } else if (hasTargetBodyFatPercent && !hasBodyFatPercent) {
    warnings.push("Target body-fat percentage was supplied, but current body-fat percentage is needed to estimate goal weight.");
  }

  const estimates = {
    currentWeight: null,
    leanMass: null,
    goalWeight: null,
  };

  if (goal === "maintenance") {
    estimates.currentWeight = buildEstimate("Current body weight estimate", weightKg, 1.4, 1.6, 2.0);

    if (hasBodyFatPercent) {
      estimates.leanMass = buildEstimate("Lean-mass context estimate", leanBodyMassKg, 1.4, 1.6, 2.0);
    }

    if (goalWeightKg !== null) {
      estimates.goalWeight = buildEstimate("Goal-weight context estimate", goalWeightKg, 1.4, 1.6, 2.0);
    }
  }

  if (goal === "muscle_gain") {
    estimates.currentWeight = buildEstimate("Current body weight estimate", weightKg, 1.6, 1.6, 2.2);

    if (hasBodyFatPercent) {
      estimates.leanMass = buildEstimate("Lean-mass context estimate", leanBodyMassKg, 1.6, 1.6, 2.2);
    }

    if (goalWeightKg !== null) {
      estimates.goalWeight = buildEstimate("Goal-weight context estimate", goalWeightKg, 1.6, 1.6, 2.2);
    }
  }

  if (goal === "fat_loss" || goal === "recomposition") {
    estimates.currentWeight = buildEstimate("Reduced-precision current-weight estimate", weightKg, 1.6, 1.6, 2.0);

    if (hasBodyFatPercent) {
      estimates.leanMass = buildEstimate("Lean-mass adjusted estimate", leanBodyMassKg, 2.0, 2.1, 2.3);
    }

    if (goalWeightKg !== null) {
      estimates.goalWeight = buildEstimate("Goal-weight adjusted estimate", goalWeightKg, 1.6, 1.8, 2.0);
    }
  }

  let selected = null;
  const currentWeightBasisDescription = describeCurrentWeightBasis(unitSystem);
  const adjustedBasisDescription = describeAdjustedBasis(unitSystem);
  const evidenceUnitDescription = describeEvidenceUnitHandling(unitSystem);
  const hypertrophyMultiplierDescription = describeHypertrophyMultiplierHandling(unitSystem);
  const adjustedMultiplierDescription = describeAdjustedMultiplierHandling(unitSystem);

  if (goal === "maintenance") {
    selected = {
      ...estimates.currentWeight,
      basisLabel: "Current body weight basis",
      explanation: `Maintenance mode uses ${currentWeightBasisDescription}. ${evidenceUnitDescription}`,
    };
  }

  if (goal === "muscle_gain") {
    selected = {
      ...estimates.currentWeight,
      basisLabel: "Current body weight basis",
      explanation: `Hypertrophy mode uses ${currentWeightBasisDescription}. ${hypertrophyMultiplierDescription}`,
    };
  }

  if (goal === "fat_loss" || goal === "recomposition") {
    if (hasBodyFatPercent) {
      const adjustedBasisKg = goalWeightKg === null ? leanBodyMassKg : goalWeightKg;
      const basisLabel = goalWeightKg === null
        ? "Lean-mass-adjusted basis"
        : "Composite lean-mass / goal-weight adjusted basis";
      const explanation = goalWeightKg === null
        ? `Because body-fat percentage was supplied, this calculator avoids relying only on total current body weight and uses ${adjustedBasisDescription}. ${adjustedMultiplierDescription}`
        : `Because a target body-fat percentage was supplied, this calculator compares ${adjustedBasisDescription} to avoid inflating protein targets from fat mass. ${adjustedMultiplierDescription}`;

      selected = buildCompositeSelection(
        goal === "fat_loss" ? "Selected fat-loss estimate" : "Selected recomposition estimate",
        basisLabel,
        explanation,
        leanBodyMassKg,
        adjustedBasisKg
      );
    } else {
      selected = {
        ...estimates.currentWeight,
        basisLabel: "Reduced-precision current-weight basis, because body-fat percentage was not supplied",
        explanation: `Without body-fat percentage, lean-mass and adjusted-goal calculations are unavailable. The calculator falls back to a conservative range based on ${currentWeightBasisDescription}.`,
      };
    }
  }

  if (hasMealsPerDay) {
    selected.perMeal = {
      rawDefault: selected.raw.defaultTarget / mealsPerDay,
      rawRangeLow: selected.raw.rangeLow / mealsPerDay,
      rawRangeHigh: selected.raw.rangeHigh / mealsPerDay,
      displayDefault: roundToNearestFive(selected.raw.defaultTarget / mealsPerDay),
      displayRangeLow: roundToNearestFive(selected.raw.rangeLow / mealsPerDay),
      displayRangeHigh: roundToNearestFive(selected.raw.rangeHigh / mealsPerDay),
      mealsPerDay,
    };
  }

  return {
    ok: true,
    errors,
    warnings,
    input: {
      unitSystem,
      goal,
      goalLabel: GOAL_LABELS[goal],
      trainingDays,
      bodyFatPercent: hasBodyFatPercent ? bodyFatPercent : null,
      targetBodyFatPercent: hasTargetBodyFatPercent ? targetBodyFatPercent : null,
      mealsPerDay: hasMealsPerDay ? mealsPerDay : null,
      sourceHeight,
      sourceWeight,
    },
    body: {
      heightM,
      weightKg,
      weightLb: kgToLb(weightKg),
      bmiRaw,
      bmi: roundToOne(bmiRaw),
      fatMassKg: fatMassKg === null ? null : roundToOne(fatMassKg),
      leanBodyMassKg: leanBodyMassKg === null ? null : roundToOne(leanBodyMassKg),
      goalWeightKg: goalWeightKg === null ? null : roundToOne(goalWeightKg),
      goalWeightLb: goalWeightKg === null ? null : roundToOne(kgToLb(goalWeightKg)),
    },
    estimates,
    selected,
  };
}

function formatProtein(value) {
  return `${value} g/day`;
}

function formatRange(low, high) {
  return low === high ? formatProtein(low) : `${low}-${high} g/day`;
}

function formatPerMealDefault(result) {
  const perMeal = result.selected.perMeal;
  if (!perMeal) {
    return "Not calculated";
  }

  return `${perMeal.displayDefault} g/meal`;
}

function formatPerMealRange(result) {
  const perMeal = result.selected.perMeal;
  if (!perMeal) {
    return "";
  }

  const range = perMeal.displayRangeLow === perMeal.displayRangeHigh
    ? `${perMeal.displayRangeLow} g/meal`
    : `${perMeal.displayRangeLow}-${perMeal.displayRangeHigh} g/meal`;

  return `Practical range: ${range} across ${perMeal.mealsPerDay} meals.`;
}

function formatFeetInchesFromMeters(heightM) {
  const totalInches = heightM / 0.0254;
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches - (feet * 12);
  return `${feet} ft ${roundToOne(inches)} in`;
}

function formatInputHeight(result) {
  const heightCm = result.body.heightM * 100;

  if (result.input.unitSystem === "metric") {
    return `${roundToOne(heightCm)} cm (${formatFeetInchesFromMeters(result.body.heightM)})`;
  }

  return `${formatFeetInchesFromMeters(result.body.heightM)} (${roundToOne(heightCm)} cm)`;
}

function formatInputWeight(result) {
  return formatWeightForUser(result, result.body.weightKg);
}

function formatUnitSystemLabel(result) {
  return result.input.unitSystem === "imperial" ? "Imperial" : "Metric";
}

function optionalPercent(value) {
  return value === null ? "Not supplied" : `${roundToOne(value)}%`;
}

function reportEstimateRows(result) {
  return [
    result.estimates.currentWeight,
    result.estimates.leanMass,
    result.estimates.goalWeight,
  ].filter(Boolean);
}

function buildTextReport(result) {
  const lines = [
    "Evidence-Based Resistance Training Protein Intake Calculator Results",
    "",
    "Inputs",
    `- Unit system: ${formatUnitSystemLabel(result)}`,
    `- Height: ${formatInputHeight(result)}`,
    `- Current body weight: ${formatInputWeight(result)}`,
    `- Body-fat percentage: ${optionalPercent(result.input.bodyFatPercent)}`,
    `- Goal: ${result.input.goalLabel}`,
    `- Resistance-training frequency: ${result.input.trainingDays} days/week`,
    `- Target body-fat percentage: ${optionalPercent(result.input.targetBodyFatPercent)}`,
    `- Meals per day: ${result.input.mealsPerDay === null ? "Not supplied" : result.input.mealsPerDay}`,
    "",
    "Protein recommendation",
    `- Protein basis: ${result.selected.basisLabel}`,
    `- Minimum: ${formatProtein(result.selected.display.minimum)}`,
    `- Practical range: ${formatRange(result.selected.display.rangeLow, result.selected.display.rangeHigh)}`,
    `- Default target: ${formatProtein(result.selected.display.defaultTarget)}`,
    "",
    "Body-composition context",
    `- BMI: ${result.body.bmi.toFixed(1)}`,
    `- Current body weight: ${formatWeightForUser(result, result.body.weightKg)}`,
  ];

  if (result.body.fatMassKg !== null) {
    lines.push(`- Estimated fat mass: ${formatWeightForUser(result, result.body.fatMassKg)}`);
    lines.push(`- Estimated lean body mass: ${formatWeightForUser(result, result.body.leanBodyMassKg)}`);
  }

  if (result.body.goalWeightKg !== null) {
    lines.push(`- Goal-weight estimate: ${formatWeightForUser(result, result.body.goalWeightKg)}`);
    lines.push("- Goal weight assumes lean mass is preserved. It is a simplified estimate, not a prediction.");
  }

  lines.push("", "Estimate comparison");
  reportEstimateRows(result).forEach((estimate) => {
    lines.push(`- ${estimate.label}: basis ${formatWeightForUser(result, estimate.basisKg)}, minimum ${formatProtein(estimate.display.minimum)}, range ${formatRange(estimate.display.rangeLow, estimate.display.rangeHigh)}`);
  });

  if (result.selected.perMeal) {
    lines.push(
      "",
      "Per-meal distribution",
      `- Per-meal default: ${formatPerMealDefault(result)}`,
      `- ${formatPerMealRange(result)}`,
      "- This is a distribution aid, not the main determinant of the recommendation."
    );
  }

  if (result.warnings.length > 0) {
    lines.push("", "Notes");
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push(
    "",
    "Calculation choice",
    result.selected.explanation,
    "The default target is the midpoint of the raw practical range, then rounded to the nearest 5 g. Range endpoints are also rounded to the nearest 5 g after the raw calculation."
  );

  lines.push(
    "",
    "Calculation method",
    "See calculation.html for the public calculation rationale and citations.",
    "",
    "Disclaimer",
    DISCLAIMER_TEXT
  );

  return `${lines.join("\n")}\n`;
}

function buildMarkdownReport(result) {
  const lines = [
    "# Evidence-Based Resistance Training Protein Intake Calculator Results",
    "",
    "## Inputs",
    "",
    `- **Unit system:** ${formatUnitSystemLabel(result)}`,
    `- **Height:** ${formatInputHeight(result)}`,
    `- **Current body weight:** ${formatInputWeight(result)}`,
    `- **Body-fat percentage:** ${optionalPercent(result.input.bodyFatPercent)}`,
    `- **Goal:** ${result.input.goalLabel}`,
    `- **Resistance-training frequency:** ${result.input.trainingDays} days/week`,
    `- **Target body-fat percentage:** ${optionalPercent(result.input.targetBodyFatPercent)}`,
    `- **Meals per day:** ${result.input.mealsPerDay === null ? "Not supplied" : result.input.mealsPerDay}`,
    "",
    "## Protein Recommendation",
    "",
    `- **Protein basis:** ${result.selected.basisLabel}`,
    `- **Minimum:** ${formatProtein(result.selected.display.minimum)}`,
    `- **Practical range:** ${formatRange(result.selected.display.rangeLow, result.selected.display.rangeHigh)}`,
    `- **Default target:** ${formatProtein(result.selected.display.defaultTarget)}`,
    "",
    "## Body-Composition Context",
    "",
    `- **BMI:** ${result.body.bmi.toFixed(1)}`,
    `- **Current body weight:** ${formatWeightForUser(result, result.body.weightKg)}`,
  ];

  if (result.body.fatMassKg !== null) {
    lines.push(`- **Estimated fat mass:** ${formatWeightForUser(result, result.body.fatMassKg)}`);
    lines.push(`- **Estimated lean body mass:** ${formatWeightForUser(result, result.body.leanBodyMassKg)}`);
  }

  if (result.body.goalWeightKg !== null) {
    lines.push(`- **Goal-weight estimate:** ${formatWeightForUser(result, result.body.goalWeightKg)}`);
    lines.push("");
    lines.push("Goal weight assumes lean mass is preserved. It is a simplified estimate, not a prediction.");
  }

  lines.push(
    "",
    "## Estimate Comparison",
    "",
    "| Basis | Basis weight | Minimum | Practical range |",
    "|---|---:|---:|---:|"
  );

  reportEstimateRows(result).forEach((estimate) => {
    lines.push(`| ${estimate.label} | ${formatWeightForUser(result, estimate.basisKg)} | ${formatProtein(estimate.display.minimum)} | ${formatRange(estimate.display.rangeLow, estimate.display.rangeHigh)} |`);
  });

  if (result.selected.perMeal) {
    lines.push(
      "",
      "## Per-Meal Distribution",
      "",
      `- **Per-meal default:** ${formatPerMealDefault(result)}`,
      `- **Per-meal range:** ${formatPerMealRange(result).replace("Practical range: ", "")}`,
      "- This is a distribution aid, not the main determinant of the recommendation."
    );
  }

  if (result.warnings.length > 0) {
    lines.push("", "## Notes", "");
    result.warnings.forEach((warning) => lines.push(`- ${warning}`));
  }

  lines.push(
    "",
    "## Calculation Choice",
    "",
    result.selected.explanation,
    "",
    "The default target is the midpoint of the raw practical range, then rounded to the nearest 5 g. Range endpoints are also rounded to the nearest 5 g after the raw calculation."
  );

  lines.push(
    "",
    "## Calculation Method",
    "",
    "See `calculation.html` for the public calculation rationale and citations.",
    "",
    "## Disclaimer",
    "",
    DISCLAIMER_TEXT,
    ""
  );

  return lines.join("\n");
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function downloadReport(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function setActionStatus(message) {
  const status = document.getElementById("action-status");
  if (status) {
    status.textContent = message;
  }
}

function formatWeightForUser(result, kg) {
  const kgValue = roundToOne(kg);
  const lbValue = roundToOne(kgToLb(kg));

  if (result.input.unitSystem === "imperial") {
    return `${lbValue} lb (${kgValue} kg)`;
  }

  return `${kgValue} kg (${lbValue} lb)`;
}

function renderMessages(container, errors, warnings) {
  container.innerHTML = "";

  if (errors.length > 0) {
    const errorBlock = document.createElement("div");
    errorBlock.className = "message-block error";
    errorBlock.innerHTML = `<strong>Fix these inputs:</strong><ul>${errors.map((error) => `<li>${error}</li>`).join("")}</ul>`;
    container.append(errorBlock);
  }

  if (warnings.length > 0) {
    const warningBlock = document.createElement("div");
    warningBlock.className = "message-block warning";
    warningBlock.innerHTML = `<strong>Notes:</strong><ul>${warnings.map((warning) => `<li>${warning}</li>`).join("")}</ul>`;
    container.append(warningBlock);
  }
}

function estimateRow(estimate, result) {
  if (!estimate) {
    return "";
  }

  return `
    <tr>
      <td>${estimate.label}</td>
      <td>${formatWeightForUser(result, estimate.basisKg)}</td>
      <td>${formatProtein(estimate.display.minimum)}</td>
      <td>${formatRange(estimate.display.rangeLow, estimate.display.rangeHigh)}</td>
    </tr>
  `;
}

function renderResults(result, container) {
  const bodyRows = [
    ["Current body weight", formatWeightForUser(result, result.body.weightKg)],
    ["BMI", result.body.bmi.toFixed(1)],
  ];

  if (result.body.fatMassKg !== null) {
    bodyRows.push(["Estimated fat mass", formatWeightForUser(result, result.body.fatMassKg)]);
    bodyRows.push(["Estimated lean body mass", formatWeightForUser(result, result.body.leanBodyMassKg)]);
  }

  if (result.body.goalWeightKg !== null) {
    bodyRows.push(["Goal-weight estimate", formatWeightForUser(result, result.body.goalWeightKg)]);
  }

  const perMealText = formatPerMealDefault(result);
  const perMealRangeText = formatPerMealRange(result);
  const estimateRows = [
    estimateRow(result.estimates.currentWeight, result),
    estimateRow(result.estimates.leanMass, result),
    estimateRow(result.estimates.goalWeight, result),
  ].join("");

  container.className = "";
  container.innerHTML = `
    <div class="result-highlight">
      <p>Default daily target</p>
      <strong>${formatProtein(result.selected.display.defaultTarget)}</strong>
      <span class="basis-badge">${result.selected.basisLabel}</span>
    </div>

    <div class="result-grid" aria-label="Protein recommendation summary">
      <div class="metric-box">
        <span>Minimum</span>
        <strong>${formatProtein(result.selected.display.minimum)}</strong>
      </div>
      <div class="metric-box">
        <span>Practical range</span>
        <strong>${formatRange(result.selected.display.rangeLow, result.selected.display.rangeHigh)}</strong>
      </div>
      <div class="metric-box">
        <span>Per meal</span>
        <strong>${perMealText}</strong>
      </div>
    </div>

    <div class="section-block">
      <h3>Body-composition context</h3>
      <dl class="definition-list">
        ${bodyRows.map(([term, value]) => `
          <div class="definition-row">
            <dt>${term}</dt>
            <dd>${value}</dd>
          </div>
        `).join("")}
      </dl>
      ${result.body.goalWeightKg !== null ? "<p>Goal weight assumes lean mass is preserved. It is a simplified estimate, not a prediction.</p>" : ""}
    </div>

    <div class="section-block">
      <h3>Protein estimate comparison</h3>
      <table class="estimate-table">
        <thead>
          <tr>
            <th>Basis</th>
            <th>Basis weight</th>
            <th>Minimum</th>
            <th>Practical range</th>
          </tr>
        </thead>
        <tbody>${estimateRows}</tbody>
      </table>
    </div>

    ${perMealRangeText ? `
      <div class="section-block">
        <h3>Per-meal distribution</h3>
        <p>${perMealRangeText} This is a distribution aid, not the main determinant of the recommendation.</p>
      </div>
    ` : ""}

    <div class="section-block">
      <h3>Calculation choice</h3>
      <p>${result.selected.explanation}</p>
      <p>The default target is the midpoint of the raw practical range, then rounded to the nearest 5 g. Range endpoints are also rounded to the nearest 5 g after the raw calculation.</p>
    </div>

    <div class="result-actions" aria-label="Result actions">
      <button class="secondary-button" type="button" data-result-action="copy">Copy</button>
      <button class="secondary-button" type="button" data-result-action="txt">Export TXT</button>
      <button class="secondary-button" type="button" data-result-action="markdown">Export Markdown</button>
      <p class="action-status" id="action-status" aria-live="polite"></p>
    </div>
  `;
}

function getFormInput(form) {
  const formData = new FormData(form);
  return {
    unitSystem: formData.get("unitSystem"),
    heightCm: formData.get("heightCm"),
    weightKg: formData.get("weightKg"),
    feet: formData.get("feet"),
    inches: formData.get("inches"),
    weightLb: formData.get("weightLb"),
    bodyFatPercent: formData.get("bodyFatPercent"),
    goal: formData.get("goal"),
    trainingDays: formData.get("trainingDays"),
    targetBodyFatPercent: formData.get("targetBodyFatPercent"),
    mealsPerDay: formData.get("mealsPerDay"),
  };
}

function setUnitVisibility(unitSystem) {
  const metricFields = document.getElementById("metric-fields");
  const imperialFields = document.getElementById("imperial-fields");
  const unitSystemNote = document.getElementById("unit-system-note");

  metricFields.hidden = unitSystem !== "metric";
  imperialFields.hidden = unitSystem !== "imperial";

  if (unitSystemNote) {
    unitSystemNote.textContent = unitSystem === "imperial"
      ? "Required fields are marked. Results show lb first; multipliers use kg internally."
      : "Required fields are marked. Results show kg first; multipliers use kg internally.";
  }
}

function getSystemTheme() {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return "light";
}

function readStoredTheme() {
  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

    if (THEME_MODES.includes(storedTheme)) {
      return storedTheme;
    }

    if (storedTheme) {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  } catch (error) {}

  return null;
}

function writeStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {}
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    button.textContent = THEME_LABELS[theme];
    button.setAttribute("aria-label", `${THEME_LABELS[theme]}. Activate to switch to ${nextTheme} mode.`);
    button.setAttribute("title", `${THEME_LABELS[theme]}. Click to switch to ${nextTheme} mode.`);
  });

  document.documentElement.dataset.themeControlsReady = "true";
}

function initThemeControls() {
  let activeTheme = readStoredTheme() || getSystemTheme();
  applyTheme(activeTheme);

  const systemThemeQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  if (systemThemeQuery) {
    systemThemeQuery.addEventListener("change", () => {
      if (readStoredTheme()) {
        return;
      }

      activeTheme = getSystemTheme();
      applyTheme(activeTheme);
    });
  }

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTheme = activeTheme === "dark" ? "light" : "dark";
      writeStoredTheme(activeTheme);
      applyTheme(activeTheme);
    });
  });
}

function initCalculator() {
  const form = document.getElementById("calculator-form");

  if (!form) {
    return;
  }
  const messages = document.getElementById("messages");
  const resultsContent = document.getElementById("results-content");
  const status = document.getElementById("results-status");
  const resultsPanel = document.querySelector(".results-panel");
  const unitInputs = form.querySelectorAll('input[name="unitSystem"]');

  unitInputs.forEach((input) => {
    input.addEventListener("change", () => setUnitVisibility(input.value));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const result = calculateProtein(getFormInput(form));
    renderMessages(messages, result.errors, result.warnings);

    if (!result.ok) {
      latestResult = null;
      status.textContent = "Some inputs need attention before a result can be calculated.";
      resultsContent.className = "results-placeholder";
      resultsContent.innerHTML = "<p>Correct the highlighted input issues and calculate again.</p>";
      return;
    }

    latestResult = result;
    status.textContent = "Protein estimate calculated.";
    renderResults(result, resultsContent);
  });

  resultsPanel.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-result-action]");
    if (!button || !latestResult) {
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const action = button.dataset.resultAction;

    try {
      if (action === "copy") {
        await copyTextToClipboard(buildTextReport(latestResult));
        setActionStatus("TXT results copied to clipboard.");
      }

      if (action === "txt") {
        downloadReport(buildTextReport(latestResult), `protein-results-${date}.txt`, "text/plain;charset=utf-8");
        setActionStatus("TXT export downloaded.");
      }

      if (action === "markdown") {
        downloadReport(buildMarkdownReport(latestResult), `protein-results-${date}.md`, "text/markdown;charset=utf-8");
        setActionStatus("Markdown export downloaded.");
      }
    } catch (error) {
      setActionStatus("Export action failed. Your browser may be blocking clipboard or download access.");
    }
  });
}

if (typeof window !== "undefined") {
  window.calculateProtein = calculateProtein;
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    initThemeControls();
    initCalculator();
  });
}

if (typeof module !== "undefined") {
  module.exports = {
    buildMarkdownReport,
    buildTextReport,
    calculateProtein,
    roundToNearestFive,
    roundToOne,
  };
}
