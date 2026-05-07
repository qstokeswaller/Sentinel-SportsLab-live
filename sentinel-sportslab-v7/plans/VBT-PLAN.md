# Velocity-Based Training (VBT) Implementation Plan

> Current state: VBT tab added to Testing Hub for all 5 barbell tests (Back Squat, Bench Press, Deadlift, Front Squat, OHP). This plan covers the next phase — integrating VBT into the Workout system.

## What VBT Is

Velocity-Based Training uses bar speed to autoregulate training intensity in real-time. Instead of prescribing fixed percentages of 1RM (which decay as an athlete fatigues or as their 1RM changes), VBT prescribes target velocity zones:

| Zone | Mean Velocity | Approx %1RM | Training Goal |
|------|--------------|-------------|---------------|
| Speed-Strength | >1.0 m/s | 30-50% | Power, rate of force development |
| Power | 0.75-1.0 m/s | 50-70% | Explosive strength, sport transfer |
| Strength-Speed | 0.5-0.75 m/s | 70-85% | Hypertrophy, strength endurance |
| Max Strength | 0.3-0.5 m/s | 85-95% | Maximal strength development |
| Near 1RM | <0.3 m/s | 95-100% | Peaking, competition prep |

## What's Already Built (Testing Hub)

- VBT fields added to all 5 barbell 1RM tests in the test registry
- Fields: Load (kg), Mean Velocity (m/s), Peak Velocity (m/s), Reps
- Calculations: Estimated 1RM (from load-velocity regression), Velocity Zone classification, Estimated Intensity (%)
- Works in both Individual and Team Batch Entry modes
- Data saved to the assessments table with `_vbt: true` flag in the metrics blob
- Uses the same inline roster pattern as existing team testing

## Phase 1: VBT in Workout Packets (Prescription)

### Where it fits
The Workout Packets builder (ProgramBuilderModal) currently lets sport scientists prescribe:
- Exercise, Sets, Reps, Rest, RIR, RPE, Intensity (%), Tempo, Weight, Notes

**Add a "Velocity Target" field** to the exercise prescription row:
- New field: `target_velocity` (m/s) — optional, shows only when toggled
- New field: `velocity_zone` (dropdown: Speed-Strength / Power / Strength-Speed / Max Strength)
- If velocity zone is selected, auto-fill the target velocity range
- Display the zone colour inline (sky/indigo/amber/orange/rose)

### Data shape change
```typescript
// Current workout_day_exercises row:
{
  exercise_id, section, order_index,
  sets, reps, rest_min, rest_sec,
  rir, rpe, intensity, tempo, weight, notes,
  athlete_weight_overrides
}

// Add:
{
  ...existing,
  target_velocity?: string,       // e.g. "0.5-0.75"
  velocity_zone?: string,         // e.g. "Strength-Speed"
}
```

No DB migration needed — `target_velocity` and `velocity_zone` can be stored in the existing columns or as part of a JSONB extension. The `workout_day_exercises` table already has flexible text columns.

### UI change
In the exercise row of ProgramBuilderModal:
- Add a small toggle/checkbox: "VBT" next to the intensity field
- When enabled, show velocity zone dropdown + target velocity range
- The intensity field auto-fills based on the velocity zone (for reference)
- On the printed weightroom sheet, show the target velocity alongside the weight

## Phase 2: VBT in Weightroom Sheets (Display)

### Where it fits
WeightroomSheetsPage generates printable daily load sheets. Currently shows: Athlete Name | Exercise 1 (weight) | Exercise 2 (weight) | ...

**Add velocity column per exercise** when VBT is prescribed:
- Column header: "Back Squat (0.5-0.75 m/s)" instead of just "Back Squat"
- Cell shows calculated weight from %1RM + the target velocity
- On the printed sheet, athletes see both the weight AND the velocity target

### Implementation
- Check if `workout_day_exercise.velocity_zone` exists
- If yes, append velocity range to the column header
- No additional data fetching needed — the velocity target is in the prescription data

## Phase 3: VBT in Session Completion (Logging)

### Where it fits
When a scheduled workout session is completed (via CompleteSessionModal or WorkoutHistory), the actual results are logged.

**Add velocity result fields** to the session completion form:
- For each exercise that has a velocity target, show:
  - Actual Mean Velocity (m/s) — input field
  - Actual Peak Velocity (m/s) — optional
  - Velocity achieved vs target — auto-calculated (green if within zone, amber if off, red if far off)
- This data is stored in `actual_results` JSONB on the scheduled_sessions table

### Data flow
```
Prescription (workout_day_exercises.velocity_zone)
  → Displayed on sheet (WeightroomSheetsPage)
  → Athlete trains with VBT device
  → Session completed (CompleteSessionModal)
  → Actual velocity logged (scheduled_sessions.actual_results)
  → Performance Intelligence picks up velocity trends
```

## Phase 4: VBT in Performance Intelligence (Analysis)

### Load-Velocity Profile
Once an athlete has 3+ VBT assessments for the same exercise, the PI engine can:
- Build a load-velocity profile (scatter plot: load on X, velocity on Y)
- Fit a linear regression to estimate 1RM without maximal testing
- Track profile shifts over time (curve shifting right = getting stronger)

### Fatigue Detection via Velocity
If an athlete's velocity at a given load drops >10% from their established profile:
- PI insight: "Velocity at 100kg Back Squat has dropped from 0.62 to 0.54 m/s — potential fatigue or detraining. Investigate recovery status."
- Cross-reference with ACWR and wellness data

### Minimum Velocity Threshold (MVT)
Each exercise has a characteristic velocity at 1RM (the "minimum velocity threshold"):
- Back Squat: ~0.30 m/s
- Bench Press: ~0.17 m/s
- Deadlift: ~0.15 m/s

The system can use athlete-specific MVT (from their heaviest logged set) to improve 1RM estimation accuracy over time.

## Phase 5: VBT Autoregulation (Future)

### Smart prescription
Once the load-velocity profile is established:
- The system can prescribe: "Today's target: 0.6 m/s zone. Based on your profile, start at ~95kg and adjust."
- After each set, the athlete logs the actual velocity
- The system suggests load adjustments: "Velocity was 0.72 m/s — add 5kg for next set"
- This is the gold standard of VBT usage in elite sport

### Implementation
- Requires real-time-ish data entry (per-set logging)
- Could be a dedicated "VBT Session" mode in the workout flow
- Or integrate with Bluetooth VBT devices (GymAware, PUSH, Vitruve) via Web Bluetooth API — future

## Technical Summary

| Phase | Scope | DB Changes | New Components |
|-------|-------|------------|----------------|
| 1 | Prescription | None (use existing text columns) | VBT toggle in ProgramBuilderModal exercise row |
| 2 | Display | None | Velocity column in WeightroomSheetsPage |
| 3 | Logging | None (use actual_results JSONB) | Velocity fields in CompleteSessionModal |
| 4 | Analysis | None (assessments table already stores VBT) | Load-velocity chart in PI terminal |
| 5 | Autoregulation | None | VBT Session mode, per-set logging UI |

All phases use existing database tables with no schema migrations. VBT data flows through the same JSONB blob pattern (metrics in assessments, actual_results in sessions) that every other feature uses.
