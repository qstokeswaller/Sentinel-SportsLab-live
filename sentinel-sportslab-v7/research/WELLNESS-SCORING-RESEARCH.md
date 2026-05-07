# Wellness Scoring Algorithm — Research Summary

**Date:** 2026-04-11  
**Purpose:** Evidence base for the WellnessHeatmap composite readiness score and dashboard squad readiness dots.

---

## Problem With the Previous Algorithm

The original `computeComposite` had four compounding flaws:

1. **`sleep_hours` was ignored entirely** — raw hours don't fit the 0–10 scale, so it was silently dropped.
2. **Equal weighting** — fatigue, stress, soreness, mood, and sleep quality treated as equally important despite literature showing sleep dominates.
3. **No individual baseline normalization** — an athlete who always reports 6/10 on everything looks identical to one who has dropped from their normal 8/10 baseline. The drop is the clinical signal, not the absolute number.
4. **Non-numeric fields ignored** — `availability`, `health_complaint`, and `illness_severity` were never factored in, even though "unavailable" or "has illness" are the most direct readiness signals available.

---

## Validated Frameworks Referenced

### Hooper Index (Hooper & Mackinnon, 1995)
- 4 dimensions: fatigue, stress, muscle soreness, sleep quality — scored on 1–7 (lower = better).
- Most widely used daily monitoring tool in professional soccer (validated in Premier League, La Liga contexts).
- Limitation: equal weighting, does not include sleep hours or health status.
- **Use in platform**: our 5 core numeric dimensions (fatigue, soreness, stress, sleep_quality, mood) map directly to Hooper dimensions.
- Citation: Hooper SL, Mackinnon LT. Monitoring overtraining in athletes. Sports Med. 1995.

### RESTQ-Sport (Koch et al. 2006)
- 52-item instrument with 12 subscales. Too complex for daily athlete use.
- **Key finding**: Sleep quality and general well-being are the most predictive recovery subscales across athletes.
- Validated dose-response relationships with training load (ACWR integration recommended).
- Citation: Kellmann M, Kallus KW. Recovery-Stress Questionnaire for Athletes. 2001.

### Sleep Science (Mah et al. 2011, Fullagar et al. 2015)
- **Mah et al.**: Stanford basketball — sleep extension from ~6–9h to 10h improved sprint times by ~4.4%, shooting percentages significantly.
- **Fullagar et al.**: Sleep disruption raises cortisol and lowers testosterone — impairs recovery, increases perceived fatigue.
- **Consensus**: General adults 7–9h; elite athletes benefit from 8–9h optimal, 9–10h during heavy load blocks.
- Sleep quality (subjective) correlates with but is not equivalent to sleep quantity. Both should be tracked independently.
- **Non-linear relationship**: each hour below 7h has compounding negative effect. Getting 5h is not "two units worse" than 7h — it's categorically worse for recovery.
- Citation: Mah CD et al. The effects of sleep extension on the athletic performance. Sleep. 2011.

### ACWR + Wellness Integration (Gabbett et al., Thorpe et al. 2015)
- ACWR alone is insufficient — athletes with elevated ACWR but high wellness are at lower risk than ACWR alone suggests.
- Wellness composite should be plotted against ACWR for 2D risk matrix (future feature).
- Citation: Gabbett TJ. The training-injury prevention paradox. Br J Sports Med. 2016.

### Individual Z-Score Normalization
- Emerging best practice in elite sport monitoring (no single paper mandates this but consensus of sport science practice).
- Rationale: Athlete A who always reports 6/10 fatigue is not the same as Athlete B who normally reports 8/10 but today reports 6/10. The deviation from baseline is the signal.
- Requires minimum 3 data points to activate; falls back to weighted raw score.
- Z-score approach: `z = (value - athlete_mean) / athlete_SD`

---

## Implemented Algorithm

### Step 1 — Sleep Hours: Piecewise Curve (Evidence-Based)

```
< 5.0h  → 1.0   (severe deprivation)
5–6h    → linear 1→3   (insufficient)
6–7h    → linear 3→6   (sub-optimal)
7–8h    → linear 6→8   (adequate)
8–9h    → linear 8→10  (elite optimal zone)
9–10h   → linear 10→9  (slight diminishing returns)
> 10h   → 8.5          (compensatory — often sign of prior deprivation)
```

Justification: peaks at 8–9h per Mah/Fullagar elite athlete consensus. Non-linear to reflect compounding effect of severe deprivation.

### Step 2 — Per-Athlete Z-Score Baseline

Computed from the athlete's last 28 days of daily responses passed into the component.
- Minimum 3 responses to activate. Below that: raw weighted average used.
- For negative metrics (fatigue, soreness, stress): `z = (mean - value) / SD` (deviation above mean = worse = negative z)
- For positive metrics (sleep_quality, mood, sleep_hours_score): `z = (value - mean) / SD`

### Step 3 — Weighted Composite

```
composite_z = 0.25 × z_sleep_quality
            + 0.20 × z_fatigue_inv
            + 0.15 × z_soreness_inv
            + 0.15 × z_stress_inv
            + 0.15 × z_mood
            + 0.10 × z_sleep_hours

score_0_10 = clamp(5 + 2 × composite_z, 0, 10)
```

Weight justification:
- Sleep quality 25%: highest predictive validity in RESTQ-Sport and Fullagar review.
- Fatigue 20%: direct performance correlation, second most validated dimension.
- Soreness, stress, mood 15% each: well-validated but more individual-specific signal.
- Sleep hours 10%: important but partially captured by sleep quality (correlated); lower weight to avoid double-counting.

### Step 4 — Hard Modifiers (Applied After Composite)

```
availability = 'modified'              → cap score at 7.5
availability = 'unavailable_training'  → cap score at 4.5
availability = 'unavailable_match'     → cap score at 3.0
health_complaint = 'injury'            → subtract 0.5 (min 0)
health_complaint = 'illness' mild      → subtract 0.3
health_complaint = 'illness' moderate  → subtract 0.7
health_complaint = 'illness' severe    → subtract 1.2
health_complaint = 'both'              → subtract 1.5
```

Justification: these are direct clinical status signals. A physically unavailable athlete cannot be scored as "ready" regardless of their self-report metrics.

---

## Where the Research Was Weak

### 1. Mood (15% weight) — Weakest dimension
- **Problem**: Mood is highly state-dependent and influenced by events entirely unrelated to physical readiness (argument before training, bad news, etc.). In short high-performance windows it creates noise.
- **No validated weighting for mood specifically in soccer populations** — most papers include it but treat it as ancillary to fatigue and sleep.
- **Recommendation**: Consider reducing to 10% and adding 5% to sleep_quality or fatigue once athlete-specific regression data is available.

### 2. Sleep Hours Curve — Assumed Elite Athlete Baseline
- The 8–9h optimal zone is based on *elite* athlete research. For general-population users of the platform, 7–8h may be equally appropriate.
- **No sport-specific curve exists in literature** — football, basketball (Mah), swimming (Fullagar) all suggest slightly different optimal ranges.
- **Recommendation**: Make the curve configurable by athlete profile (elite/sub-elite/gen-pop) in a future iteration.

### 3. Soreness vs. Injury Pain — Not Distinguished
- The `soreness` question asks about *muscle soreness* (DOMS) — normal after training. But athletes sometimes rate injury pain on this scale.
- The `health_complaint` field partially captures this but a dedicated "is this normal DOMS or something else?" prompt would improve signal quality.
- **Recommendation**: Add a clarifying note to the soreness question if score ≥ 7 AND `health_complaint = 'no'`.

### 4. No Validation of Interaction Effects
- The algorithm treats metrics as independent. Research shows fatigue × sleep interact (poor sleep causes high fatigue — they're not additive signals, they're causally related).
- The z-score normalization partially addresses this (if athlete has high fatigue AND poor sleep, both will show negative z), but doesn't model the causal direction.
- **Recommendation**: Future enhancement — use partial correlation or regression weights derived from athlete's own data to account for inter-metric correlation.

### 5. Readiness Question Ignored
- `readiness` field ('ready'/'compromised'/'not_ready') is asked post-session, not pre-session, so it measures outcome perception rather than readiness prediction.
- Currently not included in composite — it shouldn't be for a *readiness* score, but it is a useful outcome variable to validate whether the composite is predicting correctly.
- **Recommendation**: Use `readiness` as a validation signal (compare composite prediction vs. reported outcome) once enough data accumulates.

---

## Colour Thresholds (0–10 Composite)

| Score | Color | Clinical Meaning |
|---|---|---|
| ≥ 8.5 | emerald-500 | Excellent — full training load appropriate |
| ≥ 7.0 | emerald-400 | Good — normal training |
| ≥ 6.0 | lime-300 | Adequate — monitor trends |
| ≥ 5.0 | yellow-300 | Suboptimal — consider modified load |
| ≥ 4.0 | amber-400 | Poor — reduced load recommended |
| ≥ 3.0 | orange-400 | Very poor — rest/investigation |
| < 3.0 | rose-500 | Critical — medical evaluation |

---

## Future Enhancements

1. **ACWR overlay** — 2D risk matrix: composite × ACWR plotted per athlete
2. **7-day rolling trend** — flag sustained drops (3+ consecutive days below athlete baseline)
3. **Athlete-specific regression weights** — after 8+ weeks of data, use each athlete's historical correlation between wellness and performance/injury to individualize weights
4. **Population profile settings** — elite/gen-pop sleep curve adjustment
5. **Illness composite** — URTI symptom scores (from deep check) should feed into the colour when illness_severity is reported

---

## References

- Hooper SL, Mackinnon LT. Monitoring overtraining in athletes. Sports Med. 1995;20(5):321–327.
- Mah CD et al. The effects of sleep extension on the athletic performance of collegiate basketball players. Sleep. 2011;34(7):943–950.
- Fullagar HH et al. Sleep and athletic performance. Sports Med. 2015;45(2):161–186.
- Fullagar HH et al. Sleep and recovery in team sport. Int J Sports Physiol Perform. 2015;10(3):274–281.
- Gabbett TJ. The training-injury prevention paradox. Br J Sports Med. 2016;50:273–280.
- Kellmann M, Kallus KW. Recovery-Stress Questionnaire for Athletes. 2001.
- Thorpe RT et al. Monitoring fatigue status in elite team-sport athletes. Int J Sports Physiol Perform. 2015.
- Single-Item Self-Report Measures of Team-Sport Athlete Wellbeing. PMC7534939. 2020.
- The relationship between wellness and training load in professional male soccer. PMC10389715. 2023.
