"use strict";

const VALID_GOALS = ["maintenance", "muscle_gain", "fat_loss", "recomposition"];
const VALID_TRAINING_DAYS = ["0-2", "3-4", "5+"];
const VALID_DIET_PHASES = ["recomposition_slight_deficit", "moderate_deficit", "aggressive_cut"];
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

const DIET_PHASE_LABELS = {
  recomposition_slight_deficit: "Maintenance/slight deficit",
  moderate_deficit: "Moderate deficit",
  aggressive_cut: "Aggressive cut/lean athlete context",
};

const LEAN_MASS_METHOD_LABELS = {
  dxa: "DEXA/DXA scan",
  bia: "Bioelectrical impedance analysis",
  skinfold: "Skinfold/caliper estimate",
  other: "Other measured estimate",
};

const VALID_LEAN_MASS_METHODS = Object.keys(LEAN_MASS_METHOD_LABELS);
const LEAN_MASS_CONFLICT_MIN_KG = 3;
const LEAN_MASS_CONFLICT_BODY_WEIGHT_FRACTION = 0.03;

const DIET_PHASES_BY_GOAL = {
  fat_loss: ["moderate_deficit", "aggressive_cut"],
  recomposition: ["recomposition_slight_deficit", "moderate_deficit"],
};

const DIET_PHASE_MODELS_BY_GOAL = {
  fat_loss: {
    moderate_deficit: {
      label: DIET_PHASE_LABELS.moderate_deficit,
      basisLabelWithoutGoalWeight: "Lean-mass-adjusted fat-loss basis",
      basisLabelWithGoalWeight: "Composite lean-mass/goal-weight fat-loss basis",
      knownBasisLabelWithoutGoalWeight: "User-provided lean-mass fat-loss basis",
      knownBasisLabelWithGoalWeight: "User-provided lean-mass/goal-weight fat-loss basis",
      lean: {
        minimum: 2.0,
        rangeLow: 2.1,
        rangeHigh: 2.3,
      },
      adjusted: {
        minimum: 1.6,
        rangeLow: 1.8,
        rangeHigh: 2.0,
      },
      currentWeightFallback: {
        minimum: 1.6,
        rangeLow: 1.7,
        rangeHigh: 2.0,
      },
      evidenceSummary: "This phase keeps the original fat-loss model for users in a meaningful but not contest-prep-style deficit.",
      multiplierSummary: "The practical range branches use 2.1-2.3 g/kg/day of lean mass and 1.8-2.0 g/kg/day of adjusted body weight.",
    },
    aggressive_cut: {
      label: DIET_PHASE_LABELS.aggressive_cut,
      basisLabelWithoutGoalWeight: "Lean-athlete aggressive-cut basis",
      basisLabelWithGoalWeight: "Composite lean-athlete/goal-weight aggressive-cut basis",
      knownBasisLabelWithoutGoalWeight: "User-provided lean-mass aggressive-cut basis",
      knownBasisLabelWithGoalWeight: "User-provided lean-mass/goal-weight aggressive-cut basis",
      lean: {
        minimum: 2.3,
        rangeLow: 2.3,
        rangeHigh: 3.1,
      },
      adjusted: {
        minimum: 1.8,
        rangeLow: 2.0,
        rangeHigh: 2.2,
      },
      currentWeightFallback: {
        minimum: 1.8,
        rangeLow: 2.0,
        rangeHigh: 2.4,
      },
      evidenceSummary: "This phase is reserved for substantial energy restriction or lean resistance-trained users, reflecting physique-sport and lean-athlete literature rather than ordinary dieting.",
      multiplierSummary: "The practical range branches use 2.3-3.1 g/kg/day of lean mass and 2.0-2.2 g/kg/day of adjusted body weight.",
    },
  },
  recomposition: {
    recomposition_slight_deficit: {
      label: DIET_PHASE_LABELS.recomposition_slight_deficit,
      basisLabelWithoutGoalWeight: "Lean-mass-adjusted recomposition basis",
      basisLabelWithGoalWeight: "Composite lean-mass/goal-weight recomposition basis",
      knownBasisLabelWithoutGoalWeight: "User-provided lean-mass recomposition basis",
      knownBasisLabelWithGoalWeight: "User-provided lean-mass/goal-weight recomposition basis",
      lean: {
        minimum: 1.8,
        rangeLow: 1.9,
        rangeHigh: 2.2,
      },
      adjusted: {
        minimum: 1.5,
        rangeLow: 1.6,
        rangeHigh: 1.8,
      },
      currentWeightFallback: {
        minimum: 1.5,
        rangeLow: 1.6,
        rangeHigh: 2.0,
      },
      evidenceSummary: "This phase uses a lower recomposition-oriented model anchored near the resistance-training hypertrophy range, with a modest increase for lean-mass support.",
      multiplierSummary: "The practical range branches use 1.9-2.2 g/kg/day of lean mass and 1.6-1.8 g/kg/day of adjusted body weight.",
    },
    moderate_deficit: {
      label: DIET_PHASE_LABELS.moderate_deficit,
      basisLabelWithoutGoalWeight: "Lean-mass-adjusted deficit recomposition basis",
      basisLabelWithGoalWeight: "Composite lean-mass/goal-weight deficit recomposition basis",
      knownBasisLabelWithoutGoalWeight: "User-provided lean-mass deficit recomposition basis",
      knownBasisLabelWithGoalWeight: "User-provided lean-mass/goal-weight deficit recomposition basis",
      lean: {
        minimum: 1.9,
        rangeLow: 2.0,
        rangeHigh: 2.3,
      },
      adjusted: {
        minimum: 1.6,
        rangeLow: 1.7,
        rangeHigh: 1.9,
      },
      currentWeightFallback: {
        minimum: 1.6,
        rangeLow: 1.7,
        rangeHigh: 2.0,
      },
      evidenceSummary: "This phase allows a moderate deficit while keeping the model slightly below the dedicated fat-loss model because the selected goal still includes resistance-training adaptation.",
      multiplierSummary: "The practical range branches use 2.0-2.3 g/kg/day of lean mass and 1.7-1.9 g/kg/day of adjusted body weight.",
    },
  },
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

function parseOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).replace(/\s+/g, " ").trim();
  return normalized === "" ? null : normalized;
}

function goalUsesDietPhase(goal) {
  return goal === "fat_loss" || goal === "recomposition";
}

function goalUsesTargetBodyFat(goal) {
  return goal === "fat_loss" || goal === "recomposition";
}

function getDietPhaseOptionsForGoal(goal) {
  if (!goalUsesDietPhase(goal)) {
    return [];
  }

  return (DIET_PHASES_BY_GOAL[goal] || []).map((value) => ({
    value,
    label: DIET_PHASE_LABELS[value],
  }));
}

function buildDietPhaseSelect(goal, currentValue) {
  const select = document.createElement("select");
  select.id = "diet-phase";
  select.name = "dietPhase";
  select.disabled = !goalUsesDietPhase(goal);

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = "Select phase intensity";

  const phaseOptions = getDietPhaseOptionsForGoal(goal).map(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  });

  select.replaceChildren(placeholderOption, ...phaseOptions);

  if (phaseOptions.some((option) => option.value === currentValue)) {
    select.value = currentValue;
  }

  return select;
}

function replaceDietPhaseSelect(goal, currentValue) {
  const existingSelect = document.getElementById("diet-phase");

  if (!existingSelect) {
    return null;
  }

  const nextSelect = buildDietPhaseSelect(goal, currentValue);
  existingSelect.replaceWith(nextSelect);
  return nextSelect;
}

function getNoticeBodyFatPercent(input) {
  const unitSystem = input.unitSystem;
  let weightKg = null;
  let knownLeanMassKg = null;

  if (unitSystem === "metric") {
    const parsedWeightKg = parseOptionalNumber(input.weightKg);
    const parsedLeanMassKg = parseOptionalNumber(input.knownLeanMassKg);

    if (parsedWeightKg !== null && !Number.isNaN(parsedWeightKg)) {
      weightKg = parsedWeightKg;
    }

    if (parsedLeanMassKg !== null && !Number.isNaN(parsedLeanMassKg)) {
      knownLeanMassKg = parsedLeanMassKg;
    }
  }

  if (unitSystem === "imperial") {
    const parsedWeightLb = parseOptionalNumber(input.weightLb);
    const parsedLeanMassLb = parseOptionalNumber(input.knownLeanMassLb);

    if (parsedWeightLb !== null && !Number.isNaN(parsedWeightLb)) {
      weightKg = lbToKg(parsedWeightLb);
    }

    if (parsedLeanMassLb !== null && !Number.isNaN(parsedLeanMassLb)) {
      knownLeanMassKg = lbToKg(parsedLeanMassLb);
    }
  }

  if (weightKg !== null && knownLeanMassKg !== null && knownLeanMassKg > 0 && knownLeanMassKg < weightKg) {
    const impliedBodyFatPercent = calculateImpliedBodyFatPercent(weightKg, knownLeanMassKg);

    if (impliedBodyFatPercent >= 3 && impliedBodyFatPercent <= 70) {
      return impliedBodyFatPercent;
    }
  }

  const bodyFatPercent = parseOptionalNumber(input.bodyFatPercent);

  if (
    bodyFatPercent !== null
    && !Number.isNaN(bodyFatPercent)
    && bodyFatPercent >= 3
    && bodyFatPercent <= 70
  ) {
    return bodyFatPercent;
  }

  return null;
}

function getTargetBodyFatRelationshipNotice(input) {
  const goal = input.goal;

  if (!goalUsesTargetBodyFat(goal)) {
    return {
      errors: [],
      warnings: [],
      invalidTargetBodyFat: false,
    };
  }

  const bodyFatPercent = getNoticeBodyFatPercent(input);
  const targetBodyFatPercent = parseOptionalNumber(input.targetBodyFatPercent);

  if (
    bodyFatPercent === null
    || targetBodyFatPercent === null
    || Number.isNaN(bodyFatPercent)
    || Number.isNaN(targetBodyFatPercent)
    || bodyFatPercent < 3
    || bodyFatPercent > 70
    || targetBodyFatPercent < 3
    || targetBodyFatPercent > 60
    || targetBodyFatPercent < bodyFatPercent
  ) {
    return {
      errors: [],
      warnings: [],
      invalidTargetBodyFat: false,
    };
  }

  if (goal === "fat_loss") {
    return {
      errors: ["For fat loss, target body-fat percentage must be lower than current body-fat percentage."],
      warnings: [],
      invalidTargetBodyFat: true,
    };
  }

  return {
    errors: [],
    warnings: ["For recomposition, target body-fat percentage is equal to or higher than current body-fat percentage, so the goal-weight branch will be ignored."],
    invalidTargetBodyFat: false,
  };
}

function roundToNearestFive(value) {
  return Math.round(value/5) * 5;
}

function roundToOne(value) {
  return Math.round(value * 10)/10;
}

function kgToLb(value) {
  return value * 2.20462;
}

function lbToKg(value) {
  return value/2.20462;
}

function gPerKgToGPerLb(value) {
  return Math.round((value/2.20462) * 100)/100;
}

function formatLeanMassMethod(method) {
  return LEAN_MASS_METHOD_LABELS[method] || "Not specified";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function calculateImpliedBodyFatPercent(weightKg, leanBodyMassKg) {
  return ((weightKg - leanBodyMassKg)/weightKg) * 100;
}

function getLeanMassConflictThreshold(weightKg) {
  return Math.max(
    LEAN_MASS_CONFLICT_MIN_KG,
    weightKg * LEAN_MASS_CONFLICT_BODY_WEIGHT_FRACTION
  );
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

function describeAdjustedMultiplierHandling(unitSystem, phaseModel) {
  if (unitSystem === "imperial") {
    const leanLow = gPerKgToGPerLb(phaseModel.lean.rangeLow).toFixed(2);
    const leanHigh = gPerKgToGPerLb(phaseModel.lean.rangeHigh).toFixed(2);
    const adjustedLow = gPerKgToGPerLb(phaseModel.adjusted.rangeLow).toFixed(2);
    const adjustedHigh = gPerKgToGPerLb(phaseModel.adjusted.rangeHigh).toFixed(2);

    return `For imperial interpretation, the practical range branches are roughly ${leanLow}-${leanHigh} g/lb/day of lean mass and ${adjustedLow}-${adjustedHigh} g/lb/day of adjusted body weight after conversion from the source g/kg/day multipliers.`;
  }

  return phaseModel.multiplierSummary;
}

function buildEstimate(label, basisKg, minimumMultiplier, lowMultiplier, highMultiplier) {
  const minimumRaw = basisKg * minimumMultiplier;
  const rangeLowRaw = basisKg * lowMultiplier;
  const rangeHighRaw = basisKg * highMultiplier;
  const defaultRaw = (rangeLowRaw + rangeHighRaw)/2;

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

function buildCompositeSelection(label, basisLabel, explanation, leanBodyMassKg, adjustedBasisKg, phaseModel) {
  const minimumRaw = Math.max(
    leanBodyMassKg * phaseModel.lean.minimum,
    adjustedBasisKg * phaseModel.adjusted.minimum
  );
  const rangeLowRaw = Math.max(
    leanBodyMassKg * phaseModel.lean.rangeLow,
    adjustedBasisKg * phaseModel.adjusted.rangeLow
  );
  const rangeHighRaw = Math.max(
    leanBodyMassKg * phaseModel.lean.rangeHigh,
    adjustedBasisKg * phaseModel.adjusted.rangeHigh
  );
  const defaultRaw = (rangeLowRaw + rangeHighRaw)/2;

  return {
    label,
    basisLabel,
    explanation,
    basisKg: adjustedBasisKg,
    phaseModel,
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
  const dietPhase = input.dietPhase;
  const usesDietPhase = goalUsesDietPhase(goal);
  const usesTargetBodyFat = goalUsesTargetBodyFat(goal);
  const hasValidDietPhase = VALID_DIET_PHASES.includes(dietPhase);
  const dietPhaseAllowedForGoal = usesDietPhase
    && hasValidDietPhase
    && DIET_PHASES_BY_GOAL[goal].includes(dietPhase);
  const phaseModel = dietPhaseAllowedForGoal ? DIET_PHASE_MODELS_BY_GOAL[goal][dietPhase] : null;

  if (unitSystem !== "metric" && unitSystem !== "imperial") {
    errors.push("Choose metric or imperial units.");
  }

  if (!VALID_GOALS.includes(goal)) {
    errors.push("Choose a goal.");
  }

  if (!VALID_TRAINING_DAYS.includes(trainingDays)) {
    errors.push("Choose resistance-training frequency.");
  }

  if (usesDietPhase && !hasValidDietPhase) {
    errors.push("Choose diet phase intensity for fat-loss or recomposition goals.");
  }

  if (usesDietPhase && hasValidDietPhase && !dietPhaseAllowedForGoal) {
    errors.push("Choose a diet phase intensity that matches the selected goal.");
  }

  if (!usesDietPhase && dietPhase && !hasValidDietPhase) {
    errors.push("Choose a valid diet phase intensity.");
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
      heightM = heightCm/100;
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
      weightKg = weightLb/2.20462;
      sourceWeight = { lb: weightLb };
    }
  }

  const bodyFatPercent = parseOptionalNumber(input.bodyFatPercent);
  const hasBodyFatPercent = bodyFatPercent !== null && !Number.isNaN(bodyFatPercent);

  if (bodyFatPercent !== null) {
    if (Number.isNaN(bodyFatPercent) || bodyFatPercent < 3 || bodyFatPercent > 70) {
      errors.push("Body-fat percentage must be between 3 and 70.");
    }
  }

  const knownLeanMassMethodInput = input.knownLeanMassMethod || "";
  const knownLeanMassMethod = VALID_LEAN_MASS_METHODS.includes(knownLeanMassMethodInput)
    ? knownLeanMassMethodInput
    : null;

  if (knownLeanMassMethodInput && !knownLeanMassMethod) {
    errors.push("Choose a valid known lean-mass source.");
  }

  const knownLeanMassCustomMethodInput = parseOptionalText(input.knownLeanMassCustomMethod);
  const knownLeanMassCustomMethod = knownLeanMassMethod === "other"
    ? knownLeanMassCustomMethodInput
    : null;

  if (knownLeanMassCustomMethod !== null && knownLeanMassCustomMethod.length > 80) {
    errors.push("Custom lean-mass source name must be 80 characters or fewer.");
  }

  const rawKnownLeanMass = unitSystem === "imperial"
    ? parseOptionalNumber(input.knownLeanMassLb)
    : parseOptionalNumber(input.knownLeanMassKg);
  let knownLeanMassKg = null;
  let knownLeanMassBodyFatPercent = null;
  let sourceKnownLeanMass = {};

  if (rawKnownLeanMass !== null) {
    if (Number.isNaN(rawKnownLeanMass) || rawKnownLeanMass <= 0) {
      errors.push("Known lean body mass must be a positive number.");
    } else {
      knownLeanMassKg = unitSystem === "imperial" ? lbToKg(rawKnownLeanMass) : rawKnownLeanMass;
      sourceKnownLeanMass = unitSystem === "imperial"
        ? { lb: rawKnownLeanMass }
        : { kg: rawKnownLeanMass };
    }
  }

  if (knownLeanMassKg !== null && weightKg !== null) {
    if (knownLeanMassKg >= weightKg) {
      errors.push("Known lean body mass must be lower than current body weight.");
    } else {
      knownLeanMassBodyFatPercent = calculateImpliedBodyFatPercent(weightKg, knownLeanMassKg);

      if (knownLeanMassBodyFatPercent < 3 || knownLeanMassBodyFatPercent > 70) {
        errors.push("Known lean body mass must imply a body-fat percentage between 3 and 70.");
      }
    }
  }

  const hasKnownLeanMass = (
    knownLeanMassKg !== null
    && knownLeanMassBodyFatPercent !== null
    && knownLeanMassBodyFatPercent >= 3
    && knownLeanMassBodyFatPercent <= 70
  );
  const currentBodyFatForTarget = hasKnownLeanMass
    ? knownLeanMassBodyFatPercent
    : (hasBodyFatPercent ? bodyFatPercent : null);

  if (!hasBodyFatPercent && !hasKnownLeanMass) {
    if (usesDietPhase) {
      warnings.push("Body-fat percentage or known lean body mass was not supplied. Lean-mass and adjusted-goal estimates are unavailable, so the result uses a reduced-precision current-weight basis.");
    } else {
      warnings.push("Body-fat percentage or known lean body mass was not supplied. Body-composition context and lean-mass comparison are unavailable; the selected recommendation still uses current body weight for this goal.");
    }
  }

  if (hasKnownLeanMass && hasBodyFatPercent) {
    const leanMassFromBodyFatKg = weightKg * (1 - (bodyFatPercent/100));
    const leanMassDifferenceKg = Math.abs(knownLeanMassKg - leanMassFromBodyFatKg);
    const conflictThresholdKg = getLeanMassConflictThreshold(weightKg);

    if (leanMassDifferenceKg > conflictThresholdKg) {
      warnings.push(`Known lean body mass differs from the body-fat-percentage estimate by about ${roundToOne(leanMassDifferenceKg)} kg. The calculator uses the known lean-mass value for adjusted calculations.`);
    }
  }

  const rawTargetBodyFatPercent = parseOptionalNumber(input.targetBodyFatPercent);
  const targetBodyFatPercent = usesTargetBodyFat ? rawTargetBodyFatPercent : null;
  const hasTargetBodyFatPercent = targetBodyFatPercent !== null && !Number.isNaN(targetBodyFatPercent);
  let targetBodyFatDrivesGoalWeight = hasTargetBodyFatPercent;

  if (!usesTargetBodyFat && rawTargetBodyFatPercent !== null) {
    if (goal === "maintenance") {
      warnings.push("Target body-fat percentage is not used for maintenance in version 1. Maintenance uses current body weight; a different target body fat implies a body-composition change rather than maintenance.");
    } else if (goal === "muscle_gain") {
      warnings.push("Target body-fat percentage is not used for muscle gain/bulking in version 1. A bulk model would also need target body weight, projected lean-mass gain, or an expected fat:lean gain split before target body fat could drive a protein estimate.");
    } else {
      warnings.push("Target body-fat percentage is only used for fat-loss and recomposition goals in version 1.");
    }
  }

  if (usesTargetBodyFat && targetBodyFatPercent !== null) {
    if (Number.isNaN(targetBodyFatPercent) || targetBodyFatPercent < 3 || targetBodyFatPercent > 60) {
      errors.push("Target body-fat percentage must be between 3 and 60.");
    } else if (targetBodyFatPercent < 8) {
      warnings.push("The supplied target body-fat percentage is very low. Treat any goal-weight estimate as contextual, not as a recommended target.");
    }
  }

  if (
    hasTargetBodyFatPercent
    && currentBodyFatForTarget !== null
    && targetBodyFatPercent >= currentBodyFatForTarget
  ) {
    if (goal === "fat_loss") {
      errors.push("For fat loss, target body-fat percentage must be lower than current body-fat percentage.");
    } else if (goal === "recomposition") {
      targetBodyFatDrivesGoalWeight = false;
      warnings.push("The target body-fat percentage is equal to or higher than the current body-fat percentage, so the goal-weight branch was not used for this recomposition estimate.");
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

  if (!usesDietPhase && hasValidDietPhase) {
    warnings.push("Diet phase intensity is only used for fat-loss and recomposition goals. The selected goal uses its own current-weight model.");
  }

  if (usesDietPhase && dietPhase === "aggressive_cut" && !hasBodyFatPercent && !hasKnownLeanMass) {
    warnings.push("Aggressive cut/lean athlete context works best with body-fat percentage or known lean body mass supplied, because lean-mass scaling is central to that evidence base.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings,
    };
  }

  const bmiRaw = weightKg/(heightM * heightM);
  let fatMassKg = null;
  let leanBodyMassKg = null;
  let goalWeightKg = null;
  let leanMassSource = null;
  let bodyFatPercentUsed = null;

  if (hasKnownLeanMass) {
    leanMassSource = "known_lean_mass";
    bodyFatPercentUsed = knownLeanMassBodyFatPercent;
    leanBodyMassKg = knownLeanMassKg;
    fatMassKg = weightKg - leanBodyMassKg;
  } else if (hasBodyFatPercent) {
    leanMassSource = "body_fat_percent";
    bodyFatPercentUsed = bodyFatPercent;
    fatMassKg = weightKg * (bodyFatPercent/100);
    leanBodyMassKg = weightKg - fatMassKg;
  }

  if (targetBodyFatDrivesGoalWeight && leanBodyMassKg !== null) {
    goalWeightKg = leanBodyMassKg/(1 - (targetBodyFatPercent/100));
  } else if (hasTargetBodyFatPercent && leanBodyMassKg === null) {
    warnings.push("Target body-fat percentage was supplied, but current body-fat percentage or known lean body mass is needed to estimate goal weight.");
  }

  const estimates = {
    currentWeight: null,
    leanMass: null,
    goalWeight: null,
  };

  if (goal === "maintenance") {
    estimates.currentWeight = buildEstimate("Current body weight estimate", weightKg, 1.4, 1.6, 2.0);

    if (leanBodyMassKg !== null) {
      estimates.leanMass = buildEstimate(
        hasKnownLeanMass ? "Known lean-mass context estimate" : "Lean-mass context estimate",
        leanBodyMassKg,
        1.4,
        1.6,
        2.0
      );
    }

    if (goalWeightKg !== null) {
      estimates.goalWeight = buildEstimate("Goal-weight context estimate", goalWeightKg, 1.4, 1.6, 2.0);
    }
  }

  if (goal === "muscle_gain") {
    estimates.currentWeight = buildEstimate("Current body weight estimate", weightKg, 1.6, 1.6, 2.2);

    if (leanBodyMassKg !== null) {
      estimates.leanMass = buildEstimate(
        hasKnownLeanMass ? "Known lean-mass context estimate" : "Lean-mass context estimate",
        leanBodyMassKg,
        1.6,
        1.6,
        2.2
      );
    }

    if (goalWeightKg !== null) {
      estimates.goalWeight = buildEstimate("Goal-weight context estimate", goalWeightKg, 1.6, 1.6, 2.2);
    }
  }

  if (goal === "fat_loss" || goal === "recomposition") {
    estimates.currentWeight = buildEstimate(
      "Reduced-precision current-weight estimate",
      weightKg,
      phaseModel.currentWeightFallback.minimum,
      phaseModel.currentWeightFallback.rangeLow,
      phaseModel.currentWeightFallback.rangeHigh
    );

    if (leanBodyMassKg !== null) {
      estimates.leanMass = buildEstimate(
        hasKnownLeanMass ? "Known lean-mass branch estimate" : "Lean-mass branch estimate",
        leanBodyMassKg,
        phaseModel.lean.minimum,
        phaseModel.lean.rangeLow,
        phaseModel.lean.rangeHigh
      );
    }

    if (goalWeightKg !== null) {
      estimates.goalWeight = buildEstimate(
        "Goal-weight branch estimate",
        goalWeightKg,
        phaseModel.adjusted.minimum,
        phaseModel.adjusted.rangeLow,
        phaseModel.adjusted.rangeHigh
      );
    }
  }

  let selected = null;
  const currentWeightBasisDescription = describeCurrentWeightBasis(unitSystem);
  const adjustedBasisDescription = describeAdjustedBasis(unitSystem);
  const evidenceUnitDescription = describeEvidenceUnitHandling(unitSystem);
  const hypertrophyMultiplierDescription = describeHypertrophyMultiplierHandling(unitSystem);
  const adjustedMultiplierDescription = phaseModel
    ? describeAdjustedMultiplierHandling(unitSystem, phaseModel)
    : "";

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
    if (leanBodyMassKg !== null) {
      const adjustedBasisKg = goalWeightKg === null ? leanBodyMassKg : goalWeightKg;
      const basisLabel = hasKnownLeanMass
        ? (goalWeightKg === null ? phaseModel.knownBasisLabelWithoutGoalWeight : phaseModel.knownBasisLabelWithGoalWeight)
        : (goalWeightKg === null ? phaseModel.basisLabelWithoutGoalWeight : phaseModel.basisLabelWithGoalWeight);
      const explanation = hasKnownLeanMass
        ? (
          goalWeightKg === null
            ? `Because known lean body mass was supplied, this calculator uses that lean-mass basis instead of relying only on total current body weight. ${phaseModel.evidenceSummary} ${adjustedMultiplierDescription}`
            : `Because known lean body mass and target body-fat percentage were supplied, this calculator compares the user-provided lean-mass and goal-weight branches to avoid inflating protein targets from fat mass. ${phaseModel.evidenceSummary} ${adjustedMultiplierDescription}`
        )
        : (
          goalWeightKg === null
            ? `Because body-fat percentage was supplied, this calculator avoids relying only on total current body weight and uses ${adjustedBasisDescription}. ${phaseModel.evidenceSummary} ${adjustedMultiplierDescription}`
            : `Because a target body-fat percentage was supplied, this calculator compares ${adjustedBasisDescription} to avoid inflating protein targets from fat mass. ${phaseModel.evidenceSummary} ${adjustedMultiplierDescription}`
        );

      selected = buildCompositeSelection(
        goal === "fat_loss" ? "Selected fat-loss estimate" : "Selected recomposition estimate",
        basisLabel,
        explanation,
        leanBodyMassKg,
        adjustedBasisKg,
        phaseModel
      );
    } else {
      selected = {
        ...estimates.currentWeight,
        basisLabel: "Reduced-precision current-weight basis, because neither body-fat percentage nor known lean body mass was supplied",
        phaseModel,
        explanation: `Without body-fat percentage or known lean body mass, lean-mass and adjusted-goal calculations are unavailable. The calculator falls back to a reduced-precision current-weight range based on ${currentWeightBasisDescription}. ${phaseModel.evidenceSummary}`,
      };
    }
  }

  if (hasMealsPerDay) {
    selected.perMeal = {
      rawDefault: selected.raw.defaultTarget/mealsPerDay,
      rawRangeLow: selected.raw.rangeLow/mealsPerDay,
      rawRangeHigh: selected.raw.rangeHigh/mealsPerDay,
      displayDefault: roundToNearestFive(selected.raw.defaultTarget/mealsPerDay),
      displayRangeLow: roundToNearestFive(selected.raw.rangeLow/mealsPerDay),
      displayRangeHigh: roundToNearestFive(selected.raw.rangeHigh/mealsPerDay),
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
      dietPhase: usesDietPhase ? dietPhase : null,
      dietPhaseLabel: usesDietPhase ? DIET_PHASE_LABELS[dietPhase] : null,
      trainingDays,
      bodyFatPercent: hasBodyFatPercent ? bodyFatPercent : null,
      knownLeanMassKg: hasKnownLeanMass ? knownLeanMassKg : null,
      knownLeanMassMethod: hasKnownLeanMass ? knownLeanMassMethod : null,
      knownLeanMassCustomMethod: hasKnownLeanMass ? knownLeanMassCustomMethod : null,
      targetBodyFatPercent: usesTargetBodyFat && hasTargetBodyFatPercent ? targetBodyFatPercent : null,
      mealsPerDay: hasMealsPerDay ? mealsPerDay : null,
      sourceHeight,
      sourceWeight,
      sourceKnownLeanMass,
    },
    body: {
      heightM,
      weightKg,
      weightLb: kgToLb(weightKg),
      bmiRaw,
      bmi: roundToOne(bmiRaw),
      fatMassKg: fatMassKg === null ? null : roundToOne(fatMassKg),
      leanBodyMassKg: leanBodyMassKg === null ? null : roundToOne(leanBodyMassKg),
      leanMassSource,
      bodyFatPercentUsed: bodyFatPercentUsed === null ? null : roundToOne(bodyFatPercentUsed),
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
  const totalInches = heightM/0.0254;
  const feet = Math.floor(totalInches/12);
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

function formatDietPhase(result) {
  return result.input.dietPhaseLabel || "Not used for this goal";
}

function optionalPercent(value) {
  return value === null ? "Not supplied" : `${roundToOne(value)}%`;
}

function formatTargetBodyFat(result) {
  if (!goalUsesTargetBodyFat(result.input.goal)) {
    return "Not used for this goal";
  }

  return optionalPercent(result.input.targetBodyFatPercent);
}

function formatKnownLeanMass(result) {
  if (result.input.knownLeanMassKg === null) {
    return "Not supplied";
  }

  return formatWeightForUser(result, result.input.knownLeanMassKg);
}

function formatKnownLeanMassMethod(result) {
  if (result.input.knownLeanMassKg === null) {
    return "Not supplied";
  }

  if (result.input.knownLeanMassMethod === "other" && result.input.knownLeanMassCustomMethod) {
    return `Other measured estimate: ${result.input.knownLeanMassCustomMethod}`;
  }

  return formatLeanMassMethod(result.input.knownLeanMassMethod);
}

function formatLeanMassSource(result) {
  if (result.body.leanMassSource === "known_lean_mass") {
    return "User-provided known lean body mass";
  }

  if (result.body.leanMassSource === "body_fat_percent") {
    return "Estimated from body-fat percentage";
  }

  return "Not available";
}

function reportEstimateRows(result) {
  return [
    result.estimates.currentWeight,
    result.estimates.leanMass,
    result.estimates.goalWeight,
  ].filter(Boolean);
}

function describeMethodSensitivity(result) {
  const estimates = reportEstimateRows(result);

  if (estimates.length < 2) {
    return "Only one estimate method is available for these inputs, so there is no method-sensitivity comparison. Add body-fat percentage or known lean body mass to compare current-weight and lean-mass bases.";
  }

  const defaultTargets = estimates.map((estimate) => estimate.display.defaultTarget);
  const spread = Math.max(...defaultTargets) - Math.min(...defaultTargets);

  if (spread === 0) {
    return "The available methods produce the same rounded default target. The chosen basis does not materially change the practical result for these inputs.";
  }

  if (spread <= 20) {
    return `The available methods differ by ${formatProtein(spread)} in rounded midpoint targets. That is a small practical difference, so the default target should be treated as a useful anchor rather than a precise threshold.`;
  }

  if (spread <= 40) {
    return `The available methods differ by ${formatProtein(spread)} in rounded midpoint targets. That is a moderate difference; body-composition assumptions affect the target, so the selected basis matters for interpretation.`;
  }

  return `The available methods differ by ${formatProtein(spread)} in rounded midpoint targets. That is a large difference; body-composition and goal-weight assumptions meaningfully affect the recommendation.`;
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
    `- Known lean body mass: ${formatKnownLeanMass(result)}`,
    `- Known lean-mass source (report only): ${formatKnownLeanMassMethod(result)}`,
    `- Goal: ${result.input.goalLabel}`,
    `- Diet phase intensity: ${formatDietPhase(result)}`,
    `- Resistance-training frequency: ${result.input.trainingDays} days/week`,
    `- Target body-fat percentage: ${formatTargetBodyFat(result)}`,
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
    lines.push(`- Body-fat percentage used: ${optionalPercent(result.body.bodyFatPercentUsed)}`);
    lines.push(`- Lean-mass source: ${formatLeanMassSource(result)}`);
    if (result.body.leanMassSource === "known_lean_mass") {
      lines.push(`- Known lean-mass source (report only): ${formatKnownLeanMassMethod(result)}`);
    }
    lines.push(`- ${result.body.leanMassSource === "known_lean_mass" ? "Derived fat mass" : "Estimated fat mass"}: ${formatWeightForUser(result, result.body.fatMassKg)}`);
    lines.push(`- ${result.body.leanMassSource === "known_lean_mass" ? "Known lean body mass" : "Estimated lean body mass"}: ${formatWeightForUser(result, result.body.leanBodyMassKg)}`);
  }

  if (result.body.goalWeightKg !== null) {
    lines.push(`- Goal-weight estimate: ${formatWeightForUser(result, result.body.goalWeightKg)}`);
    lines.push("- Goal weight assumes lean mass is preserved. It is a simplified estimate, not a prediction.");
  }

  lines.push("", "Estimate comparison");
  reportEstimateRows(result).forEach((estimate) => {
    lines.push(`- ${estimate.label}: basis ${formatWeightForUser(result, estimate.basisKg)}, minimum ${formatProtein(estimate.display.minimum)}, range ${formatRange(estimate.display.rangeLow, estimate.display.rangeHigh)}`);
  });
  lines.push("", "Method sensitivity", `- ${describeMethodSensitivity(result)}`);

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
    `- **Known lean body mass:** ${formatKnownLeanMass(result)}`,
    `- **Known lean-mass source (report only):** ${formatKnownLeanMassMethod(result)}`,
    `- **Goal:** ${result.input.goalLabel}`,
    `- **Diet phase intensity:** ${formatDietPhase(result)}`,
    `- **Resistance-training frequency:** ${result.input.trainingDays} days/week`,
    `- **Target body-fat percentage:** ${formatTargetBodyFat(result)}`,
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
    lines.push(`- **Body-fat percentage used:** ${optionalPercent(result.body.bodyFatPercentUsed)}`);
    lines.push(`- **Lean-mass source:** ${formatLeanMassSource(result)}`);
    if (result.body.leanMassSource === "known_lean_mass") {
      lines.push(`- **Known lean-mass source (report only):** ${formatKnownLeanMassMethod(result)}`);
    }
    lines.push(`- **${result.body.leanMassSource === "known_lean_mass" ? "Derived fat mass" : "Estimated fat mass"}:** ${formatWeightForUser(result, result.body.fatMassKg)}`);
    lines.push(`- **${result.body.leanMassSource === "known_lean_mass" ? "Known lean body mass" : "Estimated lean body mass"}:** ${formatWeightForUser(result, result.body.leanBodyMassKg)}`);
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

  lines.push(
    "",
    "### Method Sensitivity",
    "",
    describeMethodSensitivity(result)
  );

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

function renderImmediateInputMessages(form, messages) {
  const notice = getTargetBodyFatRelationshipNotice(getFormInput(form));
  const targetBodyFatInput = form.querySelector('[name="targetBodyFatPercent"]');

  if (targetBodyFatInput) {
    if (notice.invalidTargetBodyFat) {
      targetBodyFatInput.setAttribute("aria-invalid", "true");
      targetBodyFatInput.setCustomValidity(notice.errors[0]);
    } else {
      targetBodyFatInput.removeAttribute("aria-invalid");
      targetBodyFatInput.setCustomValidity("");
    }
  }

  renderMessages(messages, notice.errors, notice.warnings);
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
    bodyRows.push(["Body-fat percentage used", optionalPercent(result.body.bodyFatPercentUsed)]);
    bodyRows.push(["Lean-mass source", formatLeanMassSource(result)]);
    if (result.body.leanMassSource === "known_lean_mass") {
      bodyRows.push(["Known lean-mass source (report only)", formatKnownLeanMassMethod(result)]);
    }
    bodyRows.push([
      result.body.leanMassSource === "known_lean_mass" ? "Derived fat mass" : "Estimated fat mass",
      formatWeightForUser(result, result.body.fatMassKg),
    ]);
    bodyRows.push([
      result.body.leanMassSource === "known_lean_mass" ? "Known lean body mass" : "Estimated lean body mass",
      formatWeightForUser(result, result.body.leanBodyMassKg),
    ]);
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
  const methodSensitivity = describeMethodSensitivity(result);
  const phaseContext = result.input.dietPhaseLabel
    ? `<p><strong>Diet phase:</strong> ${result.input.dietPhaseLabel}</p>`
    : "";

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
            <dt>${escapeHtml(term)}</dt>
            <dd>${escapeHtml(value)}</dd>
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
      <div class="method-sensitivity">
        <h4>Method sensitivity</h4>
        <p>${escapeHtml(methodSensitivity)}</p>
      </div>
    </div>

    ${perMealRangeText ? `
      <div class="section-block">
        <h3>Per-meal distribution</h3>
        <p>${perMealRangeText} This is a distribution aid, not the main determinant of the recommendation.</p>
      </div>
    ` : ""}

    <div class="section-block">
      <h3>Calculation choice</h3>
      ${phaseContext}
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
    knownLeanMassKg: formData.get("knownLeanMassKg"),
    knownLeanMassLb: formData.get("knownLeanMassLb"),
    knownLeanMassMethod: formData.get("knownLeanMassMethod"),
    knownLeanMassCustomMethod: formData.get("knownLeanMassCustomMethod"),
    goal: formData.get("goal"),
    dietPhase: formData.get("dietPhase"),
    trainingDays: formData.get("trainingDays"),
    targetBodyFatPercent: formData.get("targetBodyFatPercent"),
    mealsPerDay: formData.get("mealsPerDay"),
  };
}

function setUnitVisibility(unitSystem) {
  const metricFields = document.getElementById("metric-fields");
  const imperialFields = document.getElementById("imperial-fields");
  const knownLeanMassMetricFields = document.getElementById("known-lean-mass-metric-fields");
  const knownLeanMassImperialFields = document.getElementById("known-lean-mass-imperial-fields");
  const unitSystemNote = document.getElementById("unit-system-note");

  metricFields.hidden = unitSystem !== "metric";
  imperialFields.hidden = unitSystem !== "imperial";

  if (knownLeanMassMetricFields && knownLeanMassImperialFields) {
    knownLeanMassMetricFields.hidden = unitSystem !== "metric";
    knownLeanMassImperialFields.hidden = unitSystem !== "imperial";
  }

  if (unitSystemNote) {
    unitSystemNote.textContent = unitSystem === "imperial"
      ? "Required fields are marked. Results show lb first; multipliers use kg internally."
      : "Required fields are marked. Results show kg first; multipliers use kg internally.";
  }
}

function setDietPhaseVisibility(goal) {
  const dietPhaseField = document.getElementById("diet-phase-field");
  const dietPhaseSelect = document.getElementById("diet-phase");

  if (!dietPhaseField || !dietPhaseSelect) {
    return;
  }

  const shouldShow = goalUsesDietPhase(goal);
  dietPhaseField.hidden = !shouldShow;
  const currentValue = dietPhaseSelect.value;
  replaceDietPhaseSelect(goal, currentValue);
}

function setTargetBodyFatVisibility(goal) {
  const targetBodyFatField = document.getElementById("target-body-fat-field");
  const targetBodyFatInput = document.getElementById("target-body-fat");

  if (!targetBodyFatField || !targetBodyFatInput) {
    return;
  }

  const shouldShow = goalUsesTargetBodyFat(goal);
  targetBodyFatField.hidden = !shouldShow;
  targetBodyFatInput.disabled = !shouldShow;

  if (!shouldShow) {
    targetBodyFatInput.value = "";
    targetBodyFatInput.removeAttribute("aria-invalid");
    targetBodyFatInput.setCustomValidity("");
  }
}

function setKnownLeanMassCustomMethodVisibility(method) {
  const customMethodField = document.getElementById("known-lean-mass-custom-method-field");
  const customMethodInput = document.getElementById("known-lean-mass-custom-method");

  if (!customMethodField || !customMethodInput) {
    return;
  }

  const shouldShow = method === "other";
  customMethodField.hidden = !shouldShow;
  customMethodInput.disabled = !shouldShow;

  if (!shouldShow) {
    customMethodInput.value = "";
  }
}

function scrollResultsIntoView(resultsPanel) {
  if (!resultsPanel || typeof window === "undefined") {
    return;
  }

  const shouldReduceMotion = window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const currentScrollTop = window.pageYOffset
    || document.documentElement.scrollTop
    || document.body.scrollTop
    || 0;
  const targetTop = Math.max(0, resultsPanel.getBoundingClientRect().top + currentScrollTop - 12);
  const resetHorizontalScroll = () => {
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  };

  try {
    window.scrollTo({
      top: targetTop,
      left: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  } catch (error) {
    window.scrollTo(0, targetTop);
  }

  resetHorizontalScroll();

  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(resetHorizontalScroll);
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
  const goalSelect = form.querySelector('select[name="goal"]');
  const knownLeanMassMethodSelect = form.querySelector('select[name="knownLeanMassMethod"]');
  const immediateValidationFields = form.querySelectorAll('select[name="goal"], select[name="knownLeanMassMethod"], input[name="weightKg"], input[name="weightLb"], input[name="bodyFatPercent"], input[name="knownLeanMassKg"], input[name="knownLeanMassLb"], input[name="knownLeanMassCustomMethod"], input[name="targetBodyFatPercent"]');

  unitInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setUnitVisibility(input.value);
      renderImmediateInputMessages(form, messages);
    });
  });

  if (goalSelect) {
    setDietPhaseVisibility(goalSelect.value);
    setTargetBodyFatVisibility(goalSelect.value);
    goalSelect.addEventListener("change", () => {
      setDietPhaseVisibility(goalSelect.value);
      setTargetBodyFatVisibility(goalSelect.value);
      renderImmediateInputMessages(form, messages);
    });
  }

  if (knownLeanMassMethodSelect) {
    setKnownLeanMassCustomMethodVisibility(knownLeanMassMethodSelect.value);
    knownLeanMassMethodSelect.addEventListener("change", () => {
      setKnownLeanMassCustomMethodVisibility(knownLeanMassMethodSelect.value);
      renderImmediateInputMessages(form, messages);
    });
  }

  immediateValidationFields.forEach((field) => {
    field.addEventListener("input", () => renderImmediateInputMessages(form, messages));
    field.addEventListener("change", () => renderImmediateInputMessages(form, messages));
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (document.activeElement && typeof document.activeElement.blur === "function") {
      document.activeElement.blur();
    }

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
    requestAnimationFrame(() => scrollResultsIntoView(resultsPanel));
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
        setActionStatus("Results copied to clipboard.");
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
    describeMethodSensitivity,
    getDietPhaseOptionsForGoal,
    getTargetBodyFatRelationshipNotice,
    roundToNearestFive,
    roundToOne,
  };
}
