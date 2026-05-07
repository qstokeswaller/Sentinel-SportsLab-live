# ACWR Research & Implementation Reference

## What is ACWR?

The **Acute:Chronic Workload Ratio (ACWR)** compares an athlete's recent training load (acute, typically 7 days) against their longer-term baseline (chronic, typically 28 days). It is the primary tool sport scientists use to monitor injury risk from training load spikes.

```
ACWR = Acute Load / Chronic Load
```

### Risk Zones (Gabbett 2016)

| ACWR Range | Status | Meaning |
|------------|--------|---------|
| < 0.8 | Undertrained | Chronic fitness declining, detraining risk |
| 0.8 – 1.3 | Optimal / Sweet Spot | Training load is appropriate relative to fitness |
| 1.3 – 1.5 | Overreaching | Load ramping faster than adaptation, monitor closely |
| > 1.5 | Danger Zone | 2-4x injury risk, immediate de-load recommended |

---

## EWMA Method (Exponentially Weighted Moving Average)

We use EWMA rather than rolling averages because EWMA gives more weight to recent days while still considering historical load. This is the method recommended by Williams et al. (2017).

### Formula

```
λ (lambda) = 2 / (N + 1)

EWMA_today = (load_today × λ) + (EWMA_yesterday × (1 - λ))
```

Where N is the time constant:
- **Acute**: N = 7 → λ = 0.25 (recent load weighted heavily)
- **Chronic**: N = 28 → λ = 0.069 (load decays slowly)

Alternative window: N = 3/21 (more responsive, less stable — available as toggle in Settings)

### Rest Day Problem & Solution

**Problem**: On rest days (load = 0), the EWMA decays toward zero. After 2-3 rest days, the acute EWMA drops significantly. When the athlete returns to training, the acute load spikes relative to the decayed value, producing a false ACWR spike that doesn't reflect actual overload.

**Solution — Freeze approach (Menaspa 2017)**: When `load = 0` for a day, the EWMA holds at its previous value rather than decaying. This prevents artificial spikes on return from rest.

Both approaches (freeze vs decay) are available as a user preference in Settings.

---

## Training Load Metrics

### sRPE (Session RPE) — Universal Primary Metric

```
sRPE = RPE × Duration (minutes)
```

- **RPE** = Rate of Perceived Exertion on modified Borg 0-10 scale
- **Duration** = session length in minutes (NOT distance)
- Source: Foster et al. (1998)
- Works for ALL sports — no equipment needed
- Example: RPE 7 × 90 min session = 630 AU

**Important**: sRPE is RPE × Duration, NOT RPE × distance. This is a common misconception.

### Sprint Distance — GPS-Derived Metric

- Distance covered above a speed threshold (typically ≥25 km/h for elite football)
- Source: Bowen et al. (2017)
- Threshold is configurable in Settings (default 25 km/h)
- Sport-specific: football, rugby, hockey, AFL
- Not applicable to: swimming, combat sports, powerlifting

### Other Supported Metrics

| Metric | Unit | Formula | Best For |
|--------|------|---------|----------|
| **sRPE** | AU | RPE × Duration (min) | All sports (universal) |
| **Sprint Distance** | m | Metres ≥ speed threshold | Football, rugby, hockey, AFL |
| **Total Distance** | m | Total session metres | Running, football, rugby |
| **Tonnage** | kg | Sets × Reps × Weight | Powerlifting, weightlifting, gym |
| **Duration** | min | Session minutes | Swimming, combat, general |
| **TRIMP** | AU | HR-zone weighted duration | Endurance, cycling, rowing |
| **PlayerLoad** | AU | Tri-axial accelerometer | Football, rugby, basketball |

### Sport-Specific Recommendations

| Sport | Primary Metric | Secondary |
|-------|---------------|-----------|
| Football / Soccer | Sprint Distance + sRPE | Total Distance, PlayerLoad |
| Rugby | Sprint Distance + sRPE | Impacts, PlayerLoad |
| Swimming | sRPE + Duration | TRIMP |
| Powerlifting | Tonnage + sRPE | Duration |
| Running | Total Distance + sRPE | TRIMP |
| Combat Sports | sRPE + Duration | PlayerLoad |
| Cycling | TRIMP + sRPE | Duration, Power |
| Basketball | PlayerLoad + sRPE | Sprint Distance |

---

## Partner's Excel Sheet Analysis

### Sheet Structure (ACUTE CHRONIC TL.xlsm)

14 sheets total, key ones:

1. **DATABASE** — 1420 GPS session rows with raw telemetry per athlete per session
2. **DAILY LOAD INPUT** — Core EWMA calculation sheet with two window options:
   - 3/21 day window (columns for acute λ=0.5, chronic λ=0.091)
   - 7/28 day window (columns for acute λ=0.25, chronic λ=0.069)
3. **GAMES** — Match-day load tracking
4. **PIVOT TABLES** — Aggregated views by athlete/date
5. **Position dashboards** — Full Backs, Half Backs, Mid Field, Full Forward, Half Forward
6. **FATIGUE V FITNESS** — Chronic load vs acute load scatter
7. **ACWR DASHBOARD** — Visual overview of team ACWR status

### Key Formulas from the Excel

```
Exercise Load = Total Distance / 100
Speed Zone 5 (≥25 km/h) = Sprint Distance metric
ACWR = Acute EWMA / Chronic EWMA
```

### Charts in DAILY LOAD INPUT Sheet

8 charts total:
1. Daily load bar chart (raw values per day)
2. Acute EWMA line (7-day or 3-day)
3. Chronic EWMA line (28-day or 21-day)
4. ACWR ratio line with 0.8 and 1.3 threshold bands
5-8. Same pattern repeated for the alternative window

---

## Risk Reasoning Engine

When a coach clicks an at-risk athlete in the Morning Report, the InterventionModal shows detailed reasoning. The `getAthleteRiskReasoning()` function checks:

### 1. ACWR Analysis
- Ratio > 1.5 → Critical: "Exceeds danger threshold, immediate de-load needed"
- Ratio > 1.3 → Warning: "Above overreaching threshold, monitor closely"
- Ratio < 0.8 → Info: "Below undertraining threshold, chronic fitness declining"

### 2. Load Spike Detection
- Checks if ACWR ratio jumped >0.3 in the last 3 days
- "Rapid increases correlate with 2-4× injury risk (Gabbett 2016)"

### 3. Return from Rest Detection
- Checks if athlete had 2+ consecutive zero-load days followed by a training day
- Flags that the ACWR spike may be partly artifactual

### 4. Wellness Integration
- Energy < 3/10 → Critical: "Severe fatigue combined with load = high injury risk"
- Energy < 5/10 → Warning: "Below average, recovery may be compromised"
- Sleep < 5/10 → Warning: "Poor sleep impairs recovery"
- Stress > 8/10 → Warning: "High psychosocial stress compounds physiological load"
- Soreness > 7/10 → Warning: "Elevated musculoskeletal complaint"

### 5. Monotony Check
- Calculates training monotony over last 7 days: `monotony = mean / stdDev`
- Monotony > 2.0 → Warning: "Low load variation increases overtraining risk"

---

## Morning Performance Report

The Dashboard's Morning Report automatically screens all athletes and surfaces those at risk. The scoring system:

| Factor | Points | Threshold |
|--------|--------|-----------|
| ACWR > 1.5 | +50 | Critical spike |
| ACWR > 1.3 | +30 | Elevated |
| ACWR < 0.8 | +10 | Low chronic loading |
| Energy < 3 | +40 | Severe fatigue |
| Energy < 5 | +20 | Low energy |
| Stress > 8 | +30 | High stress |
| Sleep < 5 | +25 | Poor sleep |
| Acute pain event | +60 | Body map pain log in last 24h |

**Risk levels**:
- Score ≥ 50 → **Critical** (red)
- Score ≥ 20 → **Warning** (amber)
- Score < 20 → **Stable** (not shown)

Athletes are sorted by risk score (highest first) and displayed with their flags and ACWR value. Clicking "Intervene" opens the reasoning modal.

---

## Data Pipeline

### Input Sources
1. **Manual entry** — TrainingLoadEntry form in Analytics Hub (priority)
2. **GPS CSV import** — Auto-feeds from Reporting Hub GPS data (Phase 2)
3. **Wellness questionnaires** — Already flowing via WellnessHub

### Storage
- `training_loads` Supabase table with RLS
- Unique constraint: `(user_id, athlete_id, date, metric_type, session_type)`
- Supports upsert for re-imports without duplicates

### Calculation Flow
1. On app load, `AppStateContext` fetches `training_loads` from Supabase
2. Merges with any legacy local storage load records
3. `calculateACWR(athleteId, options)` calls `ACWR_UTILS.calculateAthleteACWR()`
4. Returns full history: `{ acute, chronic, ratio, dates, loads, acuteHistory, chronicHistory, ratioHistory }`
5. Morning Report uses this to score athletes
6. InterventionModal uses `getAthleteRiskReasoning()` for detailed analysis

### User Preferences (stored in Supabase user_metadata)
- `acwr_metrics`: string[] — which metric types to track
- `acwr_window`: '7_28' | '3_21' — EWMA window
- `rest_day_handling`: 'freeze' | 'decay' — rest day EWMA behavior
- `sprint_threshold`: number — km/h threshold for sprint distance (default 25)

---

## Key References

- **Gabbett, T.J. (2016)** — The training-injury prevention paradox. British Journal of Sports Medicine. Established the 0.8-1.3 sweet spot and >1.5 danger zone for ACWR.
- **Williams, S. et al. (2017)** — Better way to determine ACWR. British Journal of Sports Medicine. Recommended EWMA over rolling averages with λ = 2/(N+1).
- **Menaspa, P. (2017)** — Are rolling averages a good way to assess ACWR? Proposed the freeze approach for rest days to prevent artificial spikes.
- **Foster, C. et al. (1998)** — A new approach to monitoring exercise training. Established session RPE (sRPE = RPE × duration) as a practical training load metric.
- **Bowen, L. et al. (2017)** — Accumulated workloads and the acute:chronic workload ratio. Used sprint distance (≥25 km/h) as a GPS-derived load metric in elite football.
- **Hulin, B.T. et al. (2014)** — The acute:chronic workload ratio predicts injury. Foundational ACWR paper using cricket fast bowlers.

---

## Phase 1 Implementation (Complete)

| Component | File | Purpose |
|-----------|------|---------|
| DB Migration | `supabase/migrations/20260317_training_loads.sql` | training_loads table |
| EWMA Engine | `docs/utils/constants.ts` | ACWR_UTILS with multi-metric, rest day freeze, team aggregate |
| Settings | `docs/pages/SettingsPage.tsx` | ACWR preferences card |
| Manual Input | `docs/components/analytics/TrainingLoadEntry.tsx` | Training load entry form |
| Reasoning Modal | `docs/components/analytics/InterventionModal.tsx` | Risk analysis popup |
| Context Wiring | `docs/context/AppStateContext.tsx` | Fetches training_loads, feeds calculateACWR |
| Dashboard | `docs/pages/DashboardPage.tsx` | Morning Report + InterventionModal |
| Analytics | `docs/pages/AnalyticsHubPage.tsx` | TrainingLoadEntry in Load terminal |

## Phase 2 Plan

See [ACWR-PHASE-2.md](ACWR-PHASE-2.md) for:
- GPS auto-feed pipeline
- ACWR visualisation dashboard (charts matching Excel)
- Wellness × ACWR composite readiness score
- CSV import enhancement
- Periodization integration
