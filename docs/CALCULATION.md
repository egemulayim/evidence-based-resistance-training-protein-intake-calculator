# Calculation Method

This document explains the public calculation model used by the Evidence-Based Resistance Training Protein Intake Calculator.

The calculator is an educational tool for generally healthy adults who perform resistance training. It estimates a daily protein intake range for maintenance, muscle gain, fat loss, or body recomposition. It is not medical advice, a clinical nutrition tool, or a full diet planner.

## Scope

The calculator is intended for:

- healthy adults;
- people doing resistance training;
- people with maintenance, hypertrophy, fat-loss, or recomposition goals;
- users who want a transparent estimate rather than a black-box macro target.

It is not intended for kidney disease, pregnancy, adolescents, eating disorders, clinical nutrition, diagnosed medical conditions, geriatric nutrition, medically supervised weight loss, or endurance-sport planning.

## Unit Handling

Protein research is usually expressed as grams of protein per kilogram of body weight per day. For that reason, the calculator converts all body-weight inputs to kilograms internally before applying the evidence-based multipliers.

Display units follow the user's input system:

- Metric users see kilograms first, with pounds in parentheses.
- Imperial users see pounds first, with kilograms in parentheses.

For imperial users, the calculator also gives gram-per-pound equivalents in some explanatory text. The calculation itself still uses the source gram-per-kilogram multipliers.

## Body-Composition Estimates

The calculator always estimates BMI:

```text
BMI = weightKg / (heightM * heightM)
```

If body-fat percentage is supplied, it estimates fat mass and lean body mass:

```text
fatMassKg = weightKg * (bodyFatPercent / 100)
leanBodyMassKg = weightKg - fatMassKg
```

If target body-fat percentage is supplied, it estimates a goal weight assuming lean mass is preserved:

```text
goalWeightKg = leanBodyMassKg / (1 - targetBodyFatPercent / 100)
```

This goal-weight estimate is not a prediction. It is only a simplified way to ask what body weight would correspond to the target body-fat percentage if lean mass stayed the same.

## Protein Recommendation Model

The calculator produces multiple estimates when the inputs allow it, then selects a recommendation basis. Protein values are rounded to the nearest 5 grams for practical use.

The default target is calculated from the midpoint of the raw practical range first, then rounded to the nearest 5 grams.

### Maintenance While Resistance Training

Maintenance uses current body weight as the main basis:

```text
minimum = weightKg * 1.4
rangeLow = weightKg * 1.6
rangeHigh = weightKg * 2.0
```

This reflects the commonly cited sports-nutrition range of about 1.4-2.0 g/kg/day for exercising individuals.

### Muscle Gain / Hypertrophy

Muscle gain uses current body weight as the main basis:

```text
minimum = weightKg * 1.6
rangeLow = weightKg * 1.6
rangeHigh = weightKg * 2.2
```

The lower anchor is based on evidence around resistance-training adaptation, including a meta-analysis breakpoint near 1.6 g/kg/day. The upper boundary is a practical ceiling used for the calculator rather than a claim that every user benefits from higher intake.

### Fat Loss While Resistance Training

If body-fat percentage is supplied, fat-loss mode uses lean-mass and adjusted-weight logic rather than relying only on total current body weight.

If target body-fat percentage is supplied:

```text
adjustedBasisKg = goalWeightKg
```

If target body-fat percentage is not supplied:

```text
adjustedBasisKg = leanBodyMassKg
```

The selected values are:

```text
minimum = max(leanBodyMassKg * 2.0, adjustedBasisKg * 1.6)
rangeLow = max(leanBodyMassKg * 2.1, adjustedBasisKg * 1.8)
rangeHigh = max(leanBodyMassKg * 2.3, adjustedBasisKg * 2.0)
```

This approach tries to support lean-mass retention during energy restriction without over-scaling protein targets from fat mass.

If body-fat percentage is not supplied, the calculator falls back to a current-weight estimate:

```text
minimum = weightKg * 1.6
rangeLow = weightKg * 1.6
rangeHigh = weightKg * 2.0
```

The result is marked as reduced precision.

### Body Recomposition

Recomposition uses the same numerical model as fat loss in Version 1, but the explanation is less aggressive. The goal is to support resistance-training adaptation while also accounting for body-composition change.

The calculator does not automatically apply contest-prep bodybuilding protein ranges to ordinary recomposition users.

## Per-Meal Distribution

If meals per day is supplied, the calculator divides the default daily target by the meal count:

```text
perMealProtein = defaultTarget / mealsPerDay
```

This is only a distribution aid. Total daily protein is the main recommendation.

## Rounding

Protein outputs are rounded to the nearest 5 grams:

```text
roundToNearestFive(value) = Math.round(value / 5) * 5
```

Body-composition outputs are rounded to one decimal place.

## Limits Of The Estimate

The output should be interpreted as an evidence-informed estimate, not a precise biological requirement.

Important limitations:

- body-fat percentage is often estimated imprecisely;
- lean body mass is estimated, not measured;
- goal-weight estimates assume lean mass is preserved;
- the calculator does not know actual calorie intake or deficit size;
- training frequency is a rough proxy for training volume and quality;
- protein quality, digestibility, leucine content, and dietary pattern are not directly modeled;
- medical conditions and clinical nutrition needs are outside the calculator's scope.

## Evidence Basis

The calculator is based on sports-nutrition position stands, systematic reviews, meta-analyses, and trials relevant to resistance training, lean-mass retention, and protein distribution.

Key sources include:

- **Citation:** Jäger, R., Kerksick, C. M., Campbell, B. I., Cribb, P. J., Wells, S. D., Skwiat, T. M., Purpura, M., Ziegenfuss, T. N., Ferrando, A. A., Arent, S. M., Smith-Ryan, A. E., Stout, J. R., Arciero, P. J., Ormsbee, M. J., Taylor, L. W., Wilborn, C. D., Kalman, D. S., Kreider, R. B., Willoughby, D. S., ... Antonio, J. (2017). *International Society of Sports Nutrition Position Stand: protein and exercise*. *Journal of the International Society of Sports Nutrition, 14*, Article 20. https://doi.org/10.1186/s12970-017-0177-8
  **Use in calculator:** Broad resistance-training protein range.
- **Citation:** Morton, R. W., Murphy, K. T., McKellar, S. R., Schoenfeld, B. J., Henselmans, M., Helms, E., Aragon, A. A., Devries, M. C., Banfield, L., Krieger, J. W., & Phillips, S. M. (2018). *A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults*. *British Journal of Sports Medicine, 52*(6), 376-384. https://doi.org/10.1136/bjsports-2017-097608
  **Use in calculator:** 1.6 g/kg/day hypertrophy anchor.
- **Citation:** Helms, E. R., Aragon, A. A., & Fitschen, P. J. (2014). *Evidence-based recommendations for natural bodybuilding contest preparation: nutrition and supplementation*. *Journal of the International Society of Sports Nutrition, 11*, Article 20. https://doi.org/10.1186/1550-2783-11-20
  **Use in calculator:** Lean-athlete cutting context, applied cautiously.
- **Citation:** Helms, E. R., Zinn, C., Rowlands, D. S., & Brown, S. R. (2014). *A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes*. *International Journal of Sport Nutrition and Exercise Metabolism, 24*(2), 127-138. https://doi.org/10.1123/ijsnem.2013-0054
  **Use in calculator:** Lean-mass scaling during caloric restriction.
- **Citation:** Mettler, S., Mitchell, N., & Tipton, K. D. (2010). *Increased protein intake reduces lean body mass loss during weight loss in athletes*. *Medicine & Science in Sports & Exercise, 42*(2), 326-337. https://doi.org/10.1249/MSS.0b013e3181b2ef8e
  **Use in calculator:** Higher protein during energy restriction.
- **Citation:** Longland, T. M., Oikawa, S. Y., Mitchell, C. J., Devries, M. C., & Phillips, S. M. (2016). *Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss: a randomized trial*. *American Journal of Clinical Nutrition, 103*(3), 738-746. https://doi.org/10.3945/ajcn.115.119339
  **Use in calculator:** Recomposition and fat-loss context.
- **Citation:** Schoenfeld, B. J., & Aragon, A. A. (2018). *How much protein can the body use in a single meal for muscle-building? Implications for daily protein distribution*. *Journal of the International Society of Sports Nutrition, 15*, Article 10. https://doi.org/10.1186/s12970-018-0215-1
  **Use in calculator:** Per-meal distribution context.

## Disclaimer

This calculator is for educational purposes only. It is intended for generally healthy adults who perform resistance training. It is not medical advice and is not designed for kidney disease, pregnancy, adolescents, eating disorders, clinical nutrition, diagnosed medical conditions, or medically supervised weight loss. Consult a qualified clinician or registered dietitian for personal medical guidance.
