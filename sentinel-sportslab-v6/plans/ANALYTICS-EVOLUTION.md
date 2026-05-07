# Analytics Evolution Plan

> Saved 2026-03-30. User feedback: Performance Intelligence is the priority build. Baseline & Trend Analysis may be redundant with features already built elsewhere (ACWR Monitoring, Wellness Hub, Dashboard heatmap) — revisit whether it's worth building or should be consolidated.

---

## Performance Intelligence Terminal — BUILD PLAN

The current terminal shows 1RM/DSI/RSI/Nordic scores with basic trend percentages and a stub insights array. It should become the **"so what?" layer** — not just showing data but interpreting it and making actionable recommendations.

### Section 1: Strength & Power Profile
- **1RM dashboard** — latest values per exercise (Back Squat, Bench, Deadlift etc.) with trend arrows and % change from previous test. Already partially built
- **Relative strength** — 1RM divided by body weight. More meaningful than absolute numbers for comparing across athletes or tracking an athlete who's changing weight
- **Strength balance** — ratio of antagonist pairs (push:pull, quad:hamstring). Flag imbalances >15% as injury risk. For example if bench press is 100kg but barbell row is only 60kg, that's a 40% push:pull imbalance

### Section 2: Dynamic Performance Profile
- **DSI score** with classification — "Strength Deficit" (<0.6), "Well-Balanced" (0.6-0.8), "Reactive Strength Deficit" (>0.8). Each classification leads to a different training recommendation
- **RSI score** with normative bands by sport/position
- **Force-velocity profile** — if CMJ and IMTP data exist, plot the athlete on a force-velocity curve. This tells you whether they need to train more for maximal strength (force end) or speed/power (velocity end). This is gold for sport scientists

### Section 3: Injury Risk Profile
- **Hamstring assessment** — already built with left/right split, asymmetry %, relative strength, risk classification. Show as a body-map style visualisation with left/right comparison
- **Bilateral asymmetry index** — calculated from any test that has left/right components (single-leg CMJ, Nordic, single-leg hop). Flag >10% asymmetry
- **Movement quality flags** — if FMS, Y-Balance, or similar screening tests have been logged, show any scores below threshold (e.g. FMS <14, Y-Balance asymmetry >4cm)

### Section 4: Generated Insights (KEY MISSING PIECE)
An algorithm that runs across all available data for the selected athlete and produces prioritised, actionable insight cards. Each insight has:
- **Category** (Risk / Performance / Opportunity / Recovery)
- **Severity** (Critical / Warning / Info)
- **Message** (what was detected)
- **Recommendation** (what to do about it)

**The insight generation logic checks:**

1. **ACWR + Wellness cross-reference** — "ACWR is 1.4 AND sleep has been below 5 for 3 days -> HIGH RISK: compound fatigue. Recommend de-load tomorrow"
2. **Strength trends** — "1RM Back Squat dropped 8% since last test 6 weeks ago -> investigate: detraining, fatigue, or technique regression?"
3. **Asymmetry alerts** — "Left hamstring force is 22% weaker than right -> exceeds 15% threshold. Unilateral strengthening protocol recommended"
4. **DSI-directed training** — "DSI is 0.45 (Strength Deficit) -> athlete cannot express maximal strength explosively. Recommend ballistic/plyometric emphasis for next 4-week block"
5. **Load-performance coupling** — "Despite ACWR being optimal (1.05), 1RM has stagnated for 3 test cycles -> load is sufficient for health but may not be driving adaptation. Consider progressive overload"
6. **Test gaps** — "Last hamstring assessment was 87 days ago -> due for re-test. Last DSI was 120+ days ago -> overdue"
7. **Wellness patterns** — "Soreness has been above 6 for 5 consecutive days -> persistent complaint. Cross-reference with injury report system"
8. **Readiness composite** — combine ACWR status + wellness score + recent test performance into a single 0-100 "readiness score" with a traffic-light display

### Section 5: Team Intelligence (when team selected)
- **Squad performance matrix** — athletes ranked by composite readiness score
- **Training recommendations** — based on team-wide patterns. "6 of 20 athletes have ACWR >1.3 -> consider a team-wide recovery session"
- **Re-test schedule** — which athletes are overdue for which assessments, sorted by urgency

### How It Works
Data sources: `loadRecords` (ACWR/monotony/strain), `habitRecords` (wellness dimensions), `athleteAssessments` (1RM/DSI/RSI/Nordic from assessments table), and `getSmartRecommendation()` which already generates basic recommendations. The insight engine is a new function that loops through each data source, applies threshold checks, and produces an array of insight objects. The PerformanceIntelligenceTerminal already accepts an `insights` prop — it just needs to be populated.

---

## What Already Exists (data inventory)

### Calculation Functions (AppStateContext)
| Function | What it does |
|---|---|
| `calculateACWR(athleteId)` | Returns current EWMA-based ACWR ratio |
| `calculateMonotony(athleteId)` | 7-day load standard deviation / mean ratio |
| `calculateStrain(athleteId)` | Weekly load x monotony |
| `getSmartRecommendation(athleteId)` | Priority-based recommendation (de-load / warning / monotony / wellness / undertraining / stable) |
| `calculateZScore(metricName, value)` | Squad-relative z-score for any metric |
| `calculatePredictedACWR(athleteId, date)` | Forward-looking ACWR from planned sessions |
| `getAthleteAcwrOptions(athleteId)` | Resolves team/individual ACWR settings |

### ACWR_UTILS (constants.ts)
| Function | What it does |
|---|---|
| `calculateEWMA` | Exponential weighted moving average with rest-day freeze |
| `buildDailyLoads` | Aggregates records into gap-filled daily array |
| `calculateAthleteACWR` | Full EWMA pipeline returning acute/chronic/ratio + history |
| `calculateTeamACWR` | Team-average ACWR |
| `getRatioStatus` | 5-tier status classification |
| `getAthleteRiskReasoning` | Multi-factor risk analysis (spike, wellness, monotony, return-from-rest) |
| `solveLoadForTargetACWR` | Inverse: what load hits target ratio |
| `projectOptimalWeek` | N-day load projection maintaining target |
| `projectWithLoads` | What-if scenario with manual loads |

### Data Shapes Available
- **loadRecords**: athleteId, date, sRPE, value, metric_type, session_type
- **habitRecords**: athleteId, date, readiness, sleep, stress, soreness, energy
- **athleteAssessments**: athlete_id, test_type (1rm/dsi/rsi/nordic/hamstring), date, metrics object
- **kpiRecords**: athleteId, name, value, unit, date
- **gpsData / hrData**: imported telemetry
- **wellnessResponses**: questionnaire submissions per team

### Components Already Built
- `ACWRLineChart` — full SVG line chart with zone fills, rest markers, dual-axis
- `ACWRMetricCard` — single ACWR ratio card with status badge
- `DataHub` — master athlete table with 13+ sortable columns
- `TrendChart` — generic time-series chart for any test metric
- `ScenarioModellingTerminal` — EWMA-based load predictor with team/player drill-down

### Test Registry (67 tests across 8 categories)
- Musculoskeletal / Movement (~15 tests)
- Strength / Power (~20 tests including 1RM, CMJ, IMTP, Drop Jump)
- Speed / Agility (~15 tests)
- Flexibility / Mobility (~8 tests)
- Aerobic Capacity (~10 tests including VO2max, Beep, Yo-Yo)
- Anaerobic (~5 tests)
- Anthropometry (~9 tests)
- Sport-Specific (~3 tests)

---

## Performance Intelligence — FULL ENGINEERING DESIGN

### The Discovery Layer — "What do I have to work with?"

When a sport scientist opens Performance Intelligence for an athlete, the engine runs a discovery scan:

1. **Query all assessments for that athlete** — group by `test_type`, get the count and date range for each
2. **Cross-reference each `test_type` against the Test Registry** — this tells the engine the category (strength/speed/aerobic/etc.), what fields exist, what calculations are available, and whether norms are defined
3. **Check load records** — does this athlete have ACWR data? What metric type (sRPE, sprint distance, tonnage)?
4. **Check wellness/habit records** — does this athlete have wellness check-in history?
5. **Build a "data profile"** — a map of what's available, what's recent, what's stale, what's missing

The output is something like:
```
Athlete: Marcus Johnson
Load data: Yes (sRPE, 47 days of data)
Wellness data: Yes (38 check-ins)
Tests found:
  - rm_back_squat: 4 results (latest: 2026-03-15)
  - rm_bench_press: 3 results (latest: 2026-03-15)
  - nordic_hamstring: 2 results (latest: 2026-02-20) <- 38 days ago
  - cmj: 3 results (latest: 2026-03-01)
  - fms_total: 1 result (latest: 2025-12-10) <- 110 days ago
Tests NOT found: dsi, rsi, sprint_10m, yoyo, body_comp...
```

This profile drives everything downstream. A rugby player might have Nordic + sprint + CMJ data. A general population client might only have 1RM + body comp. The engine adapts to whatever exists.

### The Insight Engine — Rule Runner

Each rule is an independent function:
- **Input**: athlete data profile (assessments, load, wellness, team context)
- **Output**: array of insight objects (could be empty if insufficient data)

An insight object:
- **category**: Risk / Performance / Opportunity / Recovery
- **severity**: Critical / Warning / Info
- **title**: one-line summary
- **message**: what was detected and why it matters
- **recommendation**: what to do about it
- **dataSource**: which test/metric triggered this
- **confidence**: how much data backs this insight

#### Rule Group 1: Load & Recovery (only fire if loadRecords exist)
- ACWR threshold checks (>1.5 Critical, >1.3 Warning, <0.8 undertraining)
- ACWR + wellness compound (ACWR >1.3 AND sleep <5 AND soreness >6 = multiplied risk)
- Monotony alert (>2.0 threshold)
- Strain threshold (>150% of athlete's own 28-day average strain)
- Return-from-rest artifact detection

#### Rule Group 2: Strength & Power (only fire if relevant assessments exist)
- 1RM trend (>5% drop = Warning, >5% gain = Opportunity to update training %)
- Relative strength vs norms
- Strength balance (antagonist pair ratios, flag >15% imbalance)
- DSI classification (<0.6 Strength Deficit, 0.6-0.8 Balanced, >0.8 Reactive Deficit)
- RSI vs sport-relative norms

#### Rule Group 3: Injury Risk (only fire if bilateral or screening data exists)
- Bilateral asymmetry (>10% Info, >15% Warning)
- Hamstring relative strength (N/kg thresholds: <3.37 High Risk, 3.37-4.47 Moderate, >4.47 Low)
- Movement screen flags (FMS <14, individual score of 1 with pain = Critical)
- Y-Balance asymmetry (>4cm)

#### Rule Group 4: Cross-Domain Intelligence (fires when multiple data types coexist)
- **Nordic + ACWR combined**: If hamstring relative strength is <3.37 N/kg (High Risk) AND ACWR is >1.3, compound the severity: "HIGH RISK — weak hamstrings under elevated training load. Reduce high-speed running volume and prioritise Nordic protocol (48 reps/week per Mendiguchia et al.). Nordic programs reduce hamstring injury rate by 51%." If strength is adequate but ACWR is high, different message: "Hamstring capacity is sufficient but load is elevated — monitor sprint exposure rather than prescribe additional strength work."
- **Strength trend + load coupling**: If 1RM has stagnated across 3+ test cycles despite ACWR being in optimal zone, flag as Opportunity: "Load is maintaining health but not driving adaptation. Consider progressive overload."
- **Wellness pattern + test performance**: If wellness has been declining (3-day rolling sleep avg dropped >2 points) and the most recent test showed decline vs previous, link them: "Performance decline may be recovery-driven rather than fitness-driven. Address sleep/recovery before modifying training program."

#### Rule Group 5: Meta Rules (always fire)
- Test staleness per category (strength: 4-6 weeks, screening: 8-12 weeks, body comp: 4 weeks)
- Data gaps ("Wellness check-ins not found — insights limited without recovery context")
- New athlete notice (<7 days load data → "Insights improve after 28 days of tracking")

### How It Adapts to Different Sports and Users

Rules don't check sport codes — they check data availability. A rule looking for bilateral hamstring data doesn't care if the athlete plays rugby or does CrossFit. If the data exists, the rule fires. If not, the rule is invisible.

**Tier 1: Universal rules** — ACWR thresholds, bilateral asymmetry %, test staleness, wellness patterns, trend direction. Work for everyone.

**Tier 2: Norm-aware rules** — use the test registry's normative bands. Call `getNormBands(test.norms, gender, age)` and classify. No sport-specific code needed.

**Tier 3: Configurable thresholds** — per-team settings (same pattern as acwrSettings):
```
piSettings[teamId] = {
  testFrequency: { strength_power: 42, musculoskeletal: 84, aerobic: 56 },
  asymmetryThreshold: 15,
  strainMultiplier: 1.5,
}
```

### Team View vs Individual View

**Individual**: Run all rules for one athlete. Display sorted by severity.

**Team**: Run all rules for every athlete, then aggregate:
- Squad risk matrix (one row per athlete, severity columns)
- Common patterns (if >30% share same insight, surface team-level recommendation)
- Re-test schedule (aggregate staleness into calendar)
- Outlier flagging (>1.5 std dev from team mean via calculateZScore)

---

## Readiness Composite Score — RESEARCH & DESIGN

### Research Findings

**Composite Score of Readiness (CSR)** — published framework from football/ACL research (Taberner et al., 2021-2023). Uses z-score summation across multiple tests (Y-Balance, FMS, Tuck Jump, Isokinetic) to create a single unitless score. Key finding: "Because z-scores and SD are unitless, results can be summed across all tests" making it sport-agnostic. A 4-5 test battery best differentiates athletes with significant deficits.

**Traffic Light Systems (RAG)** — Robertson, Bartlett & Gastin (2017) established that colour-coded monitoring is the most common decision-support format in elite sport, but warned there is "a lack of standardization with respect to how traffic-light systems are operationalized." The value is in reducing complex multi-dimensional data into an actionable signal.

**ACWR + Wellness Coupling** — Research in premier league hockey (2023) found that "high ACWR was trivially associated with worse wellness, muscle soreness, and energy." The Journal of Strength & Conditioning Research (2019) found subjective wellness measures add predictive value beyond ACWR alone for injury risk.

**Decay and Data Maturation** — Systems like TritonWear use a maturation model: readiness scores start based only on volume; after 7 days they incorporate ACWR; after 28 days the full profile is active. This prevents unreliable scores from insufficient data.

**Missing Data in Sport** — Research specifically on missing data in sport science (2023) found that "most dashboards do not recognize the issues introduced by missing data, and practitioners are largely unaware that their displays are conveying biased information." Athletes who miss data collection often retrospectively enter data from memory, introducing further bias.

**Detraining Effects** — Short-term (2-week) in-season breaks cause measurable decline in repeated sprint ability but intermittent endurance (Yo-Yo) is more resilient. Two weeks of retraining is typically needed to return to baseline. This means comparing pre-break to post-break test scores directly is misleading — a re-baseline window is needed.

### Edge Cases That Must Be Handled

**1. Athlete hasn't been tested recently**
- Test performance trend component should NOT penalise an athlete simply because their last test was 3 months ago. The score for that component should be "neutral" (not contributing positively or negatively) rather than "declining."
- Show a separate "data freshness" indicator instead of baking staleness into the readiness number itself.
- Rule: if latest test >60 days old, exclude that test category from the performance trend component entirely. Flag it as a separate "re-test recommended" insight.

**2. Mid-season break / return from break**
- Post-break test scores will naturally be lower due to detraining (research shows RSA declines after 2-week break, 2 weeks of retraining needed to return to baseline).
- The system should detect a gap of >14 days with zero load data and flag it as a "break period."
- Post-break test results should be compared against the athlete's post-break baseline (first test after return), NOT pre-break peak. Until a post-break test exists, performance trend should be marked as "re-baselining" rather than "declining."
- ACWR will naturally show low ratios post-break (chronic load decayed). The readiness score should recognise this is expected, not flag it as "undertraining" in the same way it would flag mid-season undertraining.

**3. Athletes who miss team testing days**
- If a team batch test day happens and an athlete misses it, they should NOT inherit the team average or have a score imputed.
- Their individual score should reflect only their own actual data. The "data completeness" component drops, signalling to the sport scientist that this athlete has a gap.
- The re-test schedule (team view) should automatically flag: "Player X missed Nordic testing on 2026-03-15 — no replacement data logged."
- If the athlete was tested within 2 weeks either side of the team date, their score stands. If the gap is >4 weeks, their performance trend for that test becomes "insufficient recent data."

**4. Data completeness and what it means**
- Data completeness is NOT about penalising the athlete — it's about informing the sport scientist how much confidence to place in the readiness score.
- Display it as a separate "confidence level" badge: "Based on 4 of 5 data domains" or "Limited — only load data available."
- When data is incomplete, the readiness score should redistribute weight to available domains (not fill gaps with zeros).
- Show the sport scientist exactly what's missing: "No wellness data in last 14 days. No hamstring assessment in last 90 days."

**5. General population clients (limited data)**
- A personal trainer's client might only have 1RM data and body composition. No ACWR, no wellness check-ins.
- The score should still work — it just runs off fewer inputs at lower confidence. A client with one data domain gets a score based entirely on that domain, with the confidence badge showing "Limited — 1 data domain."
- This is honest rather than trying to manufacture a number from nothing.

### Readiness Score Architecture

**Philosophy**: The readiness score is NOT a single formula with fixed weights. It's a **domain-based composite** where each domain independently produces a 0-100 sub-score, and the final score is the weighted average of whichever domains have sufficient data.

**Domains:**

| Domain | Sub-score source | Minimum data needed | Weight (when available) |
|---|---|---|---|
| Load Status | ACWR ratio mapped to 0-100 | 7+ days of load records | 30% |
| Recovery State | Wellness dimensions (sleep, energy, soreness, stress) averaged and mapped to 0-100 | At least 1 check-in in last 7 days | 25% |
| Performance Trend | Direction of latest vs previous test results across all tested categories, mapped to 0-100 | At least 2 test results in any category within last 90 days | 20% |
| Injury Risk Flags | Inverse of highest-severity injury risk insight (no flags = 100, warning = 60, critical = 20) | At least 1 bilateral or screening test in last 90 days | 15% |
| Data Freshness | Percentage of expected data that is current (tests not stale, wellness recent, load current) | Always computable | 10% |

**Weight redistribution**: If a domain has insufficient data, its weight is redistributed proportionally to the remaining domains. For example, if no wellness data exists:
- Load Status: 30% -> 40%
- Performance Trend: 20% -> 27%
- Injury Risk: 15% -> 20%
- Data Freshness: 10% -> 13%
- Recovery State: excluded

**Sub-score calculations:**

Load Status (0-100):
- ACWR 0.8-1.3 = 100 (optimal sweet spot)
- ACWR 0.6-0.8 or 1.3-1.5 = linearly scaled 50-100
- ACWR <0.6 or >1.5 = linearly scaled 0-50
- Post-break detection: if break detected (>14 days zero load), score is "re-baselining" and treated as neutral (75) rather than penalised

Recovery State (0-100):
- Average of: (sleep/10 * 100), (energy/10 * 100), inverse(soreness/10 * 100), inverse(stress/10 * 100)
- Uses last 3-day rolling average, not single day (reduces noise)
- If latest check-in is >7 days old, domain becomes insufficient

Performance Trend (0-100):
- For each test category with 2+ results in 90 days, calculate % change between latest and previous
- Improving (>3% gain in "high" direction): 90
- Stable (-3% to +3%): 75
- Declining (>3% drop): 40
- Average across all measured categories
- Tests older than 90 days are excluded (not counted as "declining" — just excluded)
- Post-break adjustment: if a break was detected and latest test is the first post-break test, mark as "re-baselining" (75) not "declining"

Injury Risk (0-100):
- Start at 100 (no flags)
- Subtract based on highest-severity flag: Critical = -80, Warning = -40, Info = -15
- Nordic + ACWR compound: if hamstring risk is High AND ACWR >1.3, treat as Critical regardless of individual severities
- Cap at minimum 0

Data Freshness (0-100):
- Check 5 expected domains: load data current (within 7 days), wellness current (within 7 days), at least 1 strength test (within 60 days), at least 1 screening test (within 90 days), body comp (within 90 days)
- Each present = 20 points
- This is the "confidence" signal — a score of 40 means only 2 of 5 domains are current

**Display:**
- Score 80-100: Green badge
- Score 50-79: Amber badge
- Score 0-49: Red badge
- Always show: confidence level ("High — 5 data domains" / "Moderate — 3 data domains" / "Limited — 1 data domain")
- Always show: which domains contributed and which were excluded

### Workflow for Sport Scientists

1. Open Performance Intelligence for athlete or team
2. See readiness score badge immediately (the single number)
3. Below it, see the domain breakdown (which domains contributed, which are missing)
4. Below that, see the insight cards (the actionable recommendations)
5. Below that, see the detailed profiles (strength, injury risk, etc.)
6. For team view: see the squad matrix with all athletes ranked by readiness, with re-test schedule

The sport scientist's workflow is: **glance at the number -> understand why -> act on the recommendations**.

---

## Cross-Domain Load Intelligence — Research Findings

### Internal:External Load Ratio (Efficiency Index)

Research has established the "Efficiency Index" (Effindex) — the ratio of total distance to sRPE (TD:sRPE). This is a simple but valid fitness monitoring tool. When external load stays the same but internal load (perceived effort) increases, it suggests the athlete is fatiguing or losing fitness. When internal load decreases for the same external output, the athlete is adapting positively.

**PI Rule**: If the platform has both sRPE data and GPS total distance for an athlete, compute the efficiency ratio over time. A declining trend (same distance feels harder) = fatigue flag. An improving trend = positive adaptation.

### Gym Tonnage + Field Sprint Distance Interaction

Research in professional rugby league found that "strength and power training loads were significantly associated with the incidence of both contact and non-contact field training injuries" — meaning high gym tonnage can indirectly cause field injuries through residual fatigue. In Australian football, playing position impacted the internal:external load relationship, meaning the same external load produces different perceived effort depending on the athlete's physical capacity.

**PI Rules**:
- If tonnage ACWR is elevated AND sprint distance ACWR is also elevated in the same week = compound risk. "Both gym and field loads are elevated simultaneously — schedule recovery between gym and field sessions."
- If tonnage is high but sprint distance is low = the athlete is gym-heavy. Not necessarily bad, but flag if this persists >2 weeks during in-season: "Field exposure is low — risk of detraining sport-specific running capacity."
- If sprint distance is high but tonnage is zero = field-only block. Flag if >3 weeks: "No gym-based strength maintenance — monitor for strength decline."

### Multi-Metric ACWR (the real-world case)

Elite sport science teams don't track just one ACWR model — they track several simultaneously. Our platform already supports this (teams can configure sRPE, sprint distance, tonnage, total distance, TRIMP, PlayerLoad per team). The PI engine should cross-reference ALL configured metrics for a team.

**PI Rules**:
- If sRPE ACWR is optimal (1.0) but sprint distance ACWR is >1.5 = "Internal load is managed but high-speed running exposure has spiked. The athlete may not feel overloaded but musculoskeletal stress from sprinting is elevated."
- If all ACWR models are in the sweet spot = high confidence "green" status
- If models disagree (some optimal, some elevated) = "Mixed load profile — investigate which training domains are driving the spike"

### CMJ as Daily Readiness Proxy

Research meta-analysis found CMJ is a "strong predictor of neuromuscular fatigue" — 91% of elite practitioners use daily/weekly CMJ testing. Key metrics: jump height decline, increased time-to-takeoff, decreased rate of force development. Hawkin Dynamics recommends using IMTP for medium-to-long-term strength monitoring and CMJ for short-term readiness surveillance.

**PI Rule**: If CMJ test data exists and shows >10% decline from athlete's 28-day rolling average = "Neuromuscular fatigue detected. Consider reducing training intensity today." If CMJ is stable/improving despite high ACWR = "Athlete is coping well with current load — neuromuscular function preserved."

### Sport-Specific Cross-Reference Patterns

| Sport Context | Key Cross-References | What to Look For |
|---|---|---|
| **Football/Soccer** | Sprint distance ACWR + Nordic strength + sRPE | High sprint load + weak hamstrings = hamstring injury risk. Nordic <3.37 N/kg + sprint ACWR >1.3 = Critical |
| **Rugby** | Tonnage + total distance + sRPE + body mass | High contact sport — monitor gym tonnage residual fatigue effect on field performance. Body mass changes affect relative strength |
| **Athletics/Running** | Total distance ACWR + TRIMP + aerobic test trends | Endurance sport — TRIMP captures intensity better than distance alone. Declining Yo-Yo/beep test + high ACWR = overtraining |
| **Combat Sports** | sRPE + body mass trends + strength trends | Weight-making sports — declining 1RM during weight cut = expected, don't flag as performance decline |
| **General Population** | Tonnage + wellness + 1RM trends | Simple: is gym load progressing? Is wellness stable? Are 1RMs improving? |
| **Swimming** | Duration ACWR + TRIMP + wellness | No GPS — use duration and HR-based load. Wellness is critical indicator |

---

## Research Sources

- [Composite Score of Readiness (CSR) as Data Reduction for RTS in Footballers](https://www.mdpi.com/2073-8994/15/2/298) — Taberner et al., z-score summation approach
- [CSR as Holistic Profiling of Functional Deficits](https://pmc.ncbi.nlm.nih.gov/articles/PMC8397164/) — 4-5 test battery differentiates injury severity
- [Red, Amber or Green? Athlete Monitoring in Team Sport](https://pubmed.ncbi.nlm.nih.gov/27967289/) — Robertson, Bartlett & Gastin (2017), traffic light standardisation challenges
- [Monitoring Training Load to Understand Fatigue in Athletes](https://pmc.ncbi.nlm.nih.gov/articles/PMC4213373/) — Halson (2014), comprehensive monitoring framework
- [ACWR and Wellness in Premier League Hockey](https://pmc.ncbi.nlm.nih.gov/articles/PMC9924552/) — Wellness-ACWR association study
- [Subjective Wellness, ACWR, and Injury in Rugby](https://journals.lww.com/nsca-jscr/Fulltext/2019/12000/Subjective_Wellness,_Acute__Chronic_Workloads,_and.21.aspx) — J Strength Cond Res, combined predictive value
- [Missing Data in Sport Science: Wearables in American Football](https://pubmed.ncbi.nlm.nih.gov/37027076/) — Bias from incomplete monitoring dashboards
- [Monitoring Athletes Through Self-Report: Factors Influencing Implementation](https://pmc.ncbi.nlm.nih.gov/articles/PMC4306765/) — Saw et al., compliance and retrospective entry issues
- [Effect of In-Season Break Detraining on Repeated Sprint Ability](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0201111) — 2-week break performance decline + 2-week retraining recovery
- [Effects of Detraining and Retraining in Elite Soccer](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0196212) — Short-term detraining effects
- [Changes in RTS Test Performance During Collegiate Soccer Season](https://pmc.ncbi.nlm.nih.gov/articles/PMC10606967/) — Baseline testing timing implications
- [Nordic Hamstring Exercise Halves Hamstring Injury Rate](https://pubmed.ncbi.nlm.nih.gov/30808663/) — 51% reduction meta-analysis, 8459 athletes
- [NordBord Testing: Applications for Training and Monitoring](https://valdperformance.com/news/nordbord-testing-new-applications-training-monitoring-evaluation) — VALD practical protocols
- [Dr. Tom Comyns' Guide to Athlete Readiness](https://www.outputsports.com/blog/dr-tom-comyns-guide-to-athlete-readiness) — Practical readiness monitoring
- [Readiness Monitoring (Hawkin Dynamics)](https://www.hawkindynamics.com/blog/readiness-monitoring) — CMJ-based readiness, neuromuscular assessment
- [TritonWear Readiness Score Calculation](https://support.tritonwear.com/how-readiness-score-is-calculated) — Data maturation model (7-day, 28-day phases)
- [Monitoring Training Effects: Multidimensional Framework](https://link.springer.com/article/10.1007/s40279-026-02417-4) — Springer, decision-making framework
- [Developing Athlete Monitoring Systems in Team Sports](https://www.researchgate.net/publication/330293106_Developing_Athlete_Monitoring_Systems_in_Team_Sports_Data_Analysis_and_Visualization) — Coutts et al., data analysis and visualisation
- [Internal:External Load Ratio as Fitness Monitoring Tool](https://pmc.ncbi.nlm.nih.gov/articles/PMC9331329/) — Efficiency Index (TD:sRPE) for team sports
- [sRPE Strongly Correlated to GPS External Load](https://pmc.ncbi.nlm.nih.gov/articles/PMC8628997/) — NCAA soccer, acceleration load + total distance relationships
- [How to Use GPS Data in Elite Soccer](https://pmc.ncbi.nlm.nih.gov/articles/PMC7468376/) — Relevant GPS parameters for monitoring
- [Training Load Relationship with Injury in Rugby League](https://www.sciencedirect.com/science/article/abs/pii/S144024401000914X) — Gym tonnage associated with field injuries
- [Global Training Load Measure Predicting Match Performance](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2017.00930/full) — Multi-metric global load
- [Internal and External Loads in Adolescent Athletes](https://pmc.ncbi.nlm.nih.gov/articles/PMC10356657/) — Systematic review, combined monitoring
- [CMJ Meta-Analysis for Neuromuscular Monitoring](https://pubmed.ncbi.nlm.nih.gov/27663764/) — CMJ as fatigue predictor
- [CMJ Force-Time Signatures Distinguish Fatigue Types](https://pmc.ncbi.nlm.nih.gov/articles/PMC6619745/) — Neuromuscular vs metabolic fatigue via PCA
- [More Than a Metric: Training Load in Elite Sport](https://pubmed.ncbi.nlm.nih.gov/33075832/) — How load is used for athlete management
- [High-Speed Running Thresholds in Professional Soccer](https://pmc.ncbi.nlm.nih.gov/articles/PMC9968809/) — HSR and sprint distance monitoring

---

## Implementation Status

| Feature | Status | Work needed |
|---|---|---|
| Strength profile (1RM/DSI/RSI) | **Partially built** | Expand: add relative strength, balance ratios |
| Injury risk profile | **Hamstring done** | Expand: bilateral asymmetry from other tests |
| Insight generation engine | **Missing** | **New logic**: threshold-checking algorithm across all data |
| Readiness composite score | **Missing** | **New logic**: weighted formula combining ACWR + wellness + test data |
| Test gap detection | **Missing** | **New logic**: compare last test dates against recommended frequency |
| Squad performance matrix | **Partial** (DataHub exists) | Adapt: add composite ranking column |
| DSI/RSI normative bands | **Stubs only** | Define: populate DSI_NORMS and RSI_NORMS in constants.ts |

---

## Baseline & Trend Analysis — PARKED

> User feedback: Much of what this terminal would show already exists elsewhere:
> - ACWR monitoring lives in Wellness Hub
> - Squad readiness heatmap lives on Dashboard
> - Wellness dimension tracking lives in Wellness Hub questionnaire data
> - Load tracking lives in ACWR Monitoring log entry
>
> May be worth **consolidating** these into one place rather than rebuilding, or may not be worth building at all. Revisit later.

### What it would have added (for reference)
- Wellness-Load coupling chart (dual-axis: load vs readiness over time)
- Monotony & strain gauges
- Load distribution breakdown (training/match/gym/recovery/rest percentages)
- Weekly load totals (6-week bar chart)
- Individual wellness dimension sparklines (sleep, energy, stress, soreness separately)
- Squad outlier detection (>1.5 std dev from team mean)
