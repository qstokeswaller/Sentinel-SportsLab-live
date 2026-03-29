# ACWR Phase 2 — Automation, Visualisation & Intelligence

## Context
Phase 1 (complete) delivered: training_loads table, EWMA engine with multi-metric + rest-day freeze, manual load entry form, Settings ACWR preferences, InterventionModal reasoning popup, and Morning Report integration.

Phase 2 focuses on removing manual friction, adding rich visualisations, and deepening the intelligence layer.

---

## 2A — GPS Auto-Feed Pipeline

### Problem
Coaches currently import GPS CSVs into the Reporting Hub (ReportingHubPage.tsx), which stores `totalDistance`, `hsr`, `sprints`, `maxSpeed` per athlete per date in `gpsData[]`. This data is **not** wired to the ACWR pipeline — coaches would have to re-enter the same numbers manually via TrainingLoadEntry. That's redundant.

### Solution
When GPS data is imported (or updated), automatically derive and upsert `training_loads` records:

| GPS Field | Derived training_loads record |
|-----------|-------------------------------|
| `totalDistance` | `metric_type = 'total_distance'`, `value = totalDistance` |
| `hsr` | `metric_type = 'sprint_distance'`, `value = hsr` |
| `totalDistance / 100` | `metric_type = 'exercise_load'` (optional — mirrors Excel sheet formula) |

### Implementation
1. **Post-import hook** in ReportingHubPage GPS import flow — after `setGpsData(...)`, call a new `syncGpsToTrainingLoads(importedRecords)` function
2. **`syncGpsToTrainingLoads()`** in databaseService.ts — maps GPS records to training_loads shape, resolves `playerName` → `athlete_id`, batch upserts
3. **Dedup logic** — upsert on `(athlete_id, date, metric_type, session_type='gps')` so re-importing the same CSV doesn't create duplicates
4. **Retroactive sync** — button in Analytics Hub to backfill training_loads from all existing gpsData in one go

### Edge Cases
- GPS records without a matched athlete → skip with warning toast
- Multiple GPS sessions same athlete same day → sum values per metric
- User edits a manually-entered load that was also auto-synced → manual overrides GPS (GPS session_type is 'gps', manual is 'training')

---

## 2B — ACWR Visualisation Dashboard

### Charts (matching partner's Excel DAILY LOAD INPUT sheet)
1. **Daily Load Bar Chart** — stacked bars per day, colour-coded by session type
2. **Acute vs Chronic EWMA Line Chart** — dual lines with 0.8/1.3 threshold bands
3. **ACWR Ratio Line Chart** — with green (0.8–1.3), amber (1.3–1.5), red (>1.5) zones
4. **Team Heatmap** — rows = athletes, columns = dates, cells = ACWR ratio colour

### Implementation
- New `ACWRDashboard.tsx` component in `docs/components/analytics/`
- Use lightweight charting (Recharts or native SVG) — avoid heavy dependencies
- Date range selector (7d, 14d, 28d, custom)
- Athlete/team toggle reusing existing selector pattern
- Wire to `loadRecords` from AppStateContext

---

## 2C — Wellness × ACWR Composite Score

### Concept
Combine ACWR ratio with latest wellness questionnaire data to produce a single **Readiness Score** (0–100) per athlete per day.

### Formula (weighted)
```
readiness = 100 - (
  acwr_penalty     +   // 0–40 pts based on how far ratio deviates from 1.0
  fatigue_penalty   +   // 0–20 pts based on energy rating
  sleep_penalty     +   // 0–15 pts based on sleep rating
  stress_penalty    +   // 0–15 pts based on stress rating
  soreness_penalty      // 0–10 pts based on soreness rating
)
```

### Where It Shows
- Morning Performance Report → replace raw ACWR number with Readiness Score + ACWR subtitle
- Squad Readiness Heatmap (future) → colour cells by readiness score
- InterventionModal → show composite breakdown

---

## 2D — CSV Import Enhancement

### Current State
GPS CSV import exists in ReportingHubPage but only feeds `gpsData[]`.

### Phase 2 Addition
- Add a dedicated **"Import Training Loads" CSV option** in TrainingLoadEntry
- Parse columns: `athlete_name, date, metric_type, value` (flexible column mapping)
- Support bulk import for sRPE, tonnage, duration, PlayerLoad, TRIMP
- Preview table before committing
- Batch upsert to `training_loads`

---

## 2E — Periodization Integration

### Concept
Auto-populate planned load targets from the Periodization Planner into the ACWR dashboard as a **target line** overlay on the daily load chart.

- Coaches set weekly load targets per phase/block in the Periodization Planner
- ACWR dashboard shows actual vs planned load
- Deviation alerts when actual load exceeds planned by >20%

---

## Files Expected to Change

| File | Changes |
|------|---------|
| `docs/pages/ReportingHubPage.tsx` | GPS import → auto-sync training_loads |
| `docs/services/databaseService.ts` | `syncGpsToTrainingLoads()`, CSV import method |
| `docs/components/analytics/ACWRDashboard.tsx` | NEW: full visualisation dashboard |
| `docs/components/analytics/TrainingLoadEntry.tsx` | Add CSV import tab |
| `docs/components/analytics/InterventionModal.tsx` | Add readiness score breakdown |
| `docs/pages/DashboardPage.tsx` | Readiness score in Morning Report |
| `docs/context/AppStateContext.tsx` | Readiness score calculation, GPS sync hook |

## Priority Order
1. **2A (GPS Auto-Feed)** — highest impact, removes most manual friction
2. **2B (Visualisation Dashboard)** — coaches need to see trends, not just numbers
3. **2C (Readiness Score)** — composite intelligence layer
4. **2D (CSV Import)** — fallback for non-GPS metrics
5. **2E (Periodization Integration)** — advanced feature, lower priority
