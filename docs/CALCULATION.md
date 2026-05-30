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
BMI = weightKg/(heightM * heightM)
```

If body-fat percentage is supplied, it estimates fat mass and lean body mass:

```text
fatMassKg = weightKg * (bodyFatPercent/100)
leanBodyMassKg = weightKg - fatMassKg
```

If a user supplies a known lean body mass or fat-free mass value from a body-composition assessment, the calculator uses that value before the body-fat-percentage estimate for lean-mass-adjusted calculations:

```text
leanBodyMassKg = suppliedLeanBodyMassKg
fatMassKg = weightKg - suppliedLeanBodyMassKg
bodyFatPercentUsed = fatMassKg/weightKg * 100
```

The supplied value must be lower than current body weight and must imply a body-fat percentage between 3% and 70%. If both body-fat percentage and known lean body mass are supplied and they differ materially, the calculator warns the user and uses the supplied lean-mass value for adjusted calculations.

For fat-loss and recomposition goals only, if target body-fat percentage is supplied, the calculator estimates a goal weight assuming lean mass is preserved:

```text
goalWeightKg = leanBodyMassKg/(1 - targetBodyFatPercent/100)
```

This goal-weight estimate is not a prediction. It is only a simplified way to ask what body weight would correspond to the target body-fat percentage if lean mass stayed the same.

For fat loss, target body-fat percentage must be lower than current body-fat percentage. For recomposition, a target body-fat percentage that is equal to or higher than current body-fat percentage is not used for the goal-weight branch; the calculator falls back to the lean-mass-adjusted recomposition basis.

Version 1 does not use target body-fat percentage for maintenance or muscle gain. For maintenance, a different target body-fat percentage implies a body-composition change rather than weight maintenance. For muscle gain/bulking, target body fat alone is not enough because bulking changes lean mass and usually some fat mass. A bulk-planning model would also need target body weight, projected lean-mass gain, or an expected fat:lean gain split before target body fat could be used in a protein calculation.

## Protein Recommendation Model

The calculator produces multiple estimates when the inputs allow it, then selects a recommendation basis. Protein values are rounded to the nearest 5 grams for practical use.

The default target is calculated from the midpoint of the raw practical range first, then rounded to the nearest 5 grams.

The result view also reports method sensitivity. This compares the rounded midpoint targets from the available current-weight, lean-mass, and goal-weight estimates. If only one estimate is available, no sensitivity comparison is shown beyond that limitation. If multiple estimates are available, a 0 g/day spread means the methods produce the same practical target, 5-20 g/day is labeled a small practical difference, 25-40 g/day is labeled a moderate difference, and more than 40 g/day is labeled a large difference. This does not change the recommendation; it shows how much the answer depends on body-composition and goal-weight assumptions.

### Maintenance While Resistance Training

Maintenance uses current body weight as the main basis:

```text
minimum = weightKg * 1.4
rangeLow = weightKg * 1.6
rangeHigh = weightKg * 2.0
```

This reflects the commonly cited sports-nutrition range of about 1.4-2.0 g/kg/day for exercising individuals.

If body-fat percentage is supplied, the calculator still estimates fat mass and lean body mass and may show lean-mass context. The selected maintenance target remains current-body-weight based because the main evidence range is expressed that way for most exercising individuals.

Target body-fat percentage is not shown or used for maintenance. If a user wants a lower or higher body-fat percentage, that is a recomposition, fat-loss, or gain-phase planning problem rather than a maintenance-only protein estimate.

### Muscle Gain/Hypertrophy

Muscle gain uses current body weight as the main basis:

```text
minimum = weightKg * 1.6
rangeLow = weightKg * 1.6
rangeHigh = weightKg * 2.2
```

The lower anchor is based on evidence around resistance-training adaptation, including a meta-analysis breakpoint near 1.6 g/kg/day. The upper boundary is a practical ceiling used for the calculator rather than a claim that every user benefits from higher intake.

If body-fat percentage is supplied, the calculator shows lean-mass context for interpretation. The selected hypertrophy target remains current-body-weight based because the strongest hypertrophy anchor used here is a total daily intake range relative to body weight, not an automatic lean-mass-only formula.

Target body-fat percentage is not used for muscle gain in version 1. Bulking can include fat gain, but a target body-fat percentage by itself does not say how much lean mass will be gained or what the final body weight will be. Off-season/bodybuilding guidance commonly frames bulking around a modest surplus, controlled weekly weight gain, and body-composition monitoring rather than a protein formula driven by target body fat alone.

### Fat Loss And Recomposition

Fat-loss and recomposition goals use both goal and diet phase intensity. Fat loss is modeled with a stronger lean-retention bias. Recomposition is modeled slightly lower because the goal includes resistance-training adaptation and is usually closer to maintenance or a smaller deficit.

If body-fat percentage is supplied, these modes use lean-mass and adjusted-weight logic rather than relying only on total current body weight.

If known lean body mass is supplied, it is used as the lean-mass basis for these modes. This is useful when the user has a recent DXA/DXA, bioelectrical impedance, skinfold/caliper, or other body-composition assessment, but the number is still treated as an estimate because body-composition methods differ and are sensitive to measurement protocol, hydration, recent training, and device equations.

The optional lean-mass source selector is for reporting and interpretation only. It records whether the supplied value came from DXA/DXA, BIA, skinfold/caliper assessment, or another method. If "other measured estimate" is selected, the user can optionally enter a custom name for that source. The source label and custom name do not change the formula or multipliers. Only the supplied lean-mass number changes the calculation.

If target body-fat percentage is supplied for a valid fat-loss or recomposition goal-weight estimate:

```text
adjustedBasisKg = goalWeightKg
```

If target body-fat percentage is not supplied:

```text
adjustedBasisKg = leanBodyMassKg
```

#### Fat Loss

For **moderate deficit**:

```text
minimum = max(leanBodyMassKg * 2.0, adjustedBasisKg * 1.6)
rangeLow = max(leanBodyMassKg * 2.1, adjustedBasisKg * 1.8)
rangeHigh = max(leanBodyMassKg * 2.3, adjustedBasisKg * 2.0)
```

For **aggressive cut/lean athlete context**:

```text
minimum = max(leanBodyMassKg * 2.3, adjustedBasisKg * 1.8)
rangeLow = max(leanBodyMassKg * 2.3, adjustedBasisKg * 2.0)
rangeHigh = max(leanBodyMassKg * 3.1, adjustedBasisKg * 2.2)
```

#### Recomposition

For **maintenance/slight deficit**:

```text
minimum = max(leanBodyMassKg * 1.8, adjustedBasisKg * 1.5)
rangeLow = max(leanBodyMassKg * 1.9, adjustedBasisKg * 1.6)
rangeHigh = max(leanBodyMassKg * 2.2, adjustedBasisKg * 1.8)
```

For **moderate deficit**:

```text
minimum = max(leanBodyMassKg * 1.9, adjustedBasisKg * 1.6)
rangeLow = max(leanBodyMassKg * 2.0, adjustedBasisKg * 1.7)
rangeHigh = max(leanBodyMassKg * 2.3, adjustedBasisKg * 1.9)
```

Aggressive cut/lean athlete context is intentionally not a recomposition option in the interface. That context belongs under fat loss because substantial energy restriction is not classic recomp framing.

If neither body-fat percentage nor known lean body mass is supplied, the calculator falls back to a reduced-precision current-weight estimate:

```text
fat loss, moderate deficit:
minimum = weightKg * 1.6
rangeLow = weightKg * 1.7
rangeHigh = weightKg * 2.0

fat loss, aggressive cut/lean athlete:
minimum = weightKg * 1.8
rangeLow = weightKg * 2.0
rangeHigh = weightKg * 2.4

recomposition, maintenance/slight deficit:
minimum = weightKg * 1.5
rangeLow = weightKg * 1.6
rangeHigh = weightKg * 2.0

recomposition, moderate deficit:
minimum = weightKg * 1.6
rangeLow = weightKg * 1.7
rangeHigh = weightKg * 2.0
```

The result is marked as reduced precision. Body-fat percentage is especially important for the aggressive cut/lean athlete context because lean-mass scaling is central to that evidence base.

### Body Recomposition

Recomposition no longer uses the same numerical model as fat loss. A recomp-style phase should usually use **maintenance/slight deficit**. If the user is in a more obvious deficit, they can select **moderate deficit**. Aggressive cut/lean athlete context is not shown for recomposition users.

The calculator does not automatically apply contest-prep bodybuilding protein ranges to ordinary recomposition users.

## Per-Meal Distribution

If meals per day is supplied, the calculator divides the default daily target by the meal count:

```text
perMealProtein = defaultTarget/mealsPerDay
```

This is only a distribution aid. Total daily protein is the main recommendation.

## Rounding

Protein outputs are rounded to the nearest 5 grams:

```text
roundToNearestFive(value) = Math.round(value/5) * 5
```

Body-composition outputs are rounded to one decimal place.

## Limits Of The Estimate

The output should be interpreted as an evidence-informed estimate, not a precise biological requirement.

Important limitations:

- body-fat percentage is often estimated imprecisely;
- lean body mass is estimated, not measured;
- user-supplied lean body mass can differ across DXA, BIA, skinfold/caliper, and other methods;
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
- **Citation:** Iraki, J., Fitschen, P., Espinar, S., & Helms, E. (2019). *Nutrition recommendations for bodybuilders in the off-season: a narrative review*. *Sports, 7*(7), Article 154. https://doi.org/10.3390/sports7070154
  **Use in calculator:** Muscle-gain/bulking context, including controlled surplus, weight-gain rate, and body-composition monitoring.
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
- **Citation:** Refalo, M. C., Trexler, E. T., & Helms, E. R. (2025). *Effect of dietary protein on fat-free mass in energy restricted, resistance-trained individuals: An updated systematic review with meta-regression*. *Strength and Conditioning Journal*. https://doi.org/10.1519/SSC.0000000000000888
  **Use in calculator:** Supports fat-free-mass scaling as relevant during energy restriction in resistance-trained users, while noting substantial heterogeneity.
- **Citation:** Kasper, A. M., Langan-Evans, C., Hudson, J. F., et al. (2021). *Come back skinfolds, all is forgiven: A narrative review of the efficacy of common body composition methods in applied sports practice*. *Nutrients, 13*(4), 1075. https://doi.org/10.3390/nu13041075
  **Use in calculator:** Body-composition measurement-method caveats for DXA, BIA, and skinfold/caliper-derived estimates.

## Disclaimer

This calculator is for educational purposes only. It is intended for generally healthy adults who perform resistance training. It is not medical advice and is not designed for kidney disease, pregnancy, adolescents, eating disorders, clinical nutrition, diagnosed medical conditions, or medically supervised weight loss. Consult a qualified clinician or registered dietitian for personal medical guidance.
