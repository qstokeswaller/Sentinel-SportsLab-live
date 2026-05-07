# Planner Evolution — Sentinel SportsTech

_Last updated: 2026-05-06_

---

## What Was Built

This document records the deliberate design decisions made during the periodization planner redesign, based on sport scientist mockup screenshots reviewed in May 2026.

---

### Tab System (Overview | Timeline | Periods | Microcycles)

The old toggle between "Timeline" and "Cards" views was replaced with a full tab system anchored to the plan header. The four tabs represent the four natural levels of periodization hierarchy:

- **Overview** — plan metadata, stats, modality editor, phases summary
- **Timeline** — existing Gantt-style week/block view (unchanged internally)
- **Periods** — table of all training periods, grouped by phase, with intensity/volume bars
- **Microcycles** — day-level session editor for individual training weeks

**Why tabs instead of separate pages:** The plan data is already loaded; navigating between hierarchical views of the same plan should feel instant and not require a page reload. The activeTab is local component state — no URL routing is involved.

---

### Blocks → Periods (Rename)

"Training Block" was renamed to "Training Period" throughout the UI (labels, modals, table headers). The data model field names (`blocks`, `PlanTrainingBlock`) were intentionally kept unchanged to avoid a migration. The rename is purely cosmetic/presentational.

**Why:** The sport science community uses "period" (Pre-season, Transitional, Competition period) rather than "block" which is a strength & conditioning term. Using the right vocabulary reduces friction for the primary users.

---

### Plan Status Badges (Active | Draft | Upcoming | At Risk)

Plans now carry an explicit `status` field (`'active' | 'draft' | 'upcoming' | 'at_risk'`), set manually by the sport scientist at creation or edit time. Status badges appear:
- On each plan card in the plan list
- In the active plan header next to the plan name

**Why manually set:** Automatic status from dates alone is insufficient — a plan may be active but at risk due to a player injury, or upcoming even though its start date has passed because execution was delayed. The sport scientist needs full editorial control.

---

### Period Intensity & Volume Levels

Each period (block) now has two new fields: `intensityLevel` and `volumeLevel`, each selectable from `['Low', 'Moderate', 'High', 'Very High']`. These are displayed as 4-bar graduated visual indicators in the Periods tab table (green → yellow → orange → red).

**Why 4 bars instead of a slider or percentage:** A qualitative 4-point scale is the standard in periodization literature (Bompa, Issurin). It matches how sport scientists think and communicate load. Percentage-based precision implies a level of accuracy that isn't warranted at the planning stage.

---

### Period Status (Completed | In Progress | Upcoming | No Date)

In the Periods tab, each period automatically displays a status badge calculated from its start and end dates relative to today. This requires no extra data — it's derived entirely from the existing date fields.

---

### Modalities Editor — Moved to Overview Tab

The modality editor popup was removed from the plan header. It now lives as a persistent card in the Overview tab, showing current modalities and allowing add/remove/preset-quick-add inline. This follows the principle that configuration should live where you set up the plan, not floating in a toolbar.

---

### Microcycles — Match Day (MD) Countdown

When the Microcycles tab is open and a competition event exists within the current week's date range, each day in the 7-column grid is labelled relative to match day: MD, MD-1, MD-2 … MD-6, MD+1, MD+2. This is a standard training load periodization convention (the "MD-minus" system) used widely in team sport science.

**Data source:** `plan.events` filtered for `type === 'competition'`. No new data model changes required.

---

### Cross-Tab Navigation (Periods → Microcycles)

The "View Microcycles" button in the Periods tab expanded row navigates directly to the Microcycles tab with the correct phase and period pre-selected. This is implemented via `microcyclesJump` state lifted to `PeriodizationPage`, passed as props to `MicrocyclesTab`, and consumed via `useEffect`.

---

### Week Intent / Focus Field

Each week in the Microcycles tab has an editable "Intent / Focus" field shown in the right sidebar and editable via inline pencil icon. This maps to the `week.intent` field stored on `PlanTrainingWeek`. Saves via `handleUpdatePlanWeek`.

---

### Assign Workout Link

The "Assign/View Workout" button in each session card in the Microcycles tab navigates to `/workouts/packets` and sets `assignToPlanSession` navigation state, enabling the Workout Packets page to pre-fill the plan session context. This deep-link is the bridge between planning and execution — the sport scientist assigns a workout packet to a planned session without leaving the planning workflow.

---

## What Was Intentionally Left Out

These features appeared in the AI-generated mockup screenshots but were deliberately deferred. They are recorded here so future contributors understand the design intent and rationale.

---

### Targets Tab

The mockup showed a "Targets" tab for setting measurable performance goals (e.g. "VO2max > 55 by Week 12"). This is genuinely useful but requires:
- A new `targets` field on `PeriodizationPlan` (array of `{ metric, value, unit, deadline, status }`)
- UI for CRUD of targets
- Potentially linking to testing data from the Testing Hub

**Deferred because:** Building targets without the link to testing outcomes creates a dead-end data entry form. It should be built alongside or after the Testing Hub → Planner integration is scoped.

---

### Load Plan Tab (AU / Arbitrary Units)

The mockup showed a "Load Plan" tab with session-level Arbitrary Units (AU) — a quantified training load metric (e.g. RPE × duration). Displaying a wavy load curve across weeks with planned vs. actual AU.

**Deferred because:** AU data doesn't exist yet. Sessions in the planner are planned intents, not executed sessions with recorded RPE. Displaying AU requires:
1. Athletes to submit post-session RPE via the wellness form
2. A mapping layer from planned sessions to executed athlete sessions
3. Aggregation logic for weekly AU by athlete and by team

Building the chart before the data pipeline exists would create a permanently empty chart — exactly the kind of dead placeholder the sport scientists said they didn't want.

---

### Gantt Inline Preview on Plan Cards

The mockup showed a small horizontal Gantt bar preview on each plan card in the list view, showing phases as colored segments. 

**Deferred because:** Computing the bar proportions requires knowing each phase's date range relative to the full plan span. Some plans have open-ended dates. The visual complexity didn't justify the implementation cost at this stage.

---

### Wavy Load Curve (Volume/Intensity over Weeks)

The mockup showed a smooth wavy line overlaid on the Timeline view representing the planned load progression. This would require:
- Mapping each week's parent block's intensity/volume level to a numeric value
- Rendering an SVG path over the timeline grid

**Deferred because:** The 4-level qualitative scale doesn't naturally produce a meaningful smooth curve — it would step between 4 values. A meaningful load curve would require numeric session load data (AU). Left for when AU data is available.

---

### Plan Edit Modal (Full Edit of Plan Metadata)

The plan header shows the plan name and status but there is no "Edit Plan" button to change the plan's name, dates, status, or target after creation. Currently modalities are the only in-plan field editable after creation (via the Overview tab modality editor).

**Deferred because:** The CreatePlanModal could be repurposed as an edit modal with minimal changes. Left as a follow-up task: add an "Edit Plan" button to the Overview tab header that opens CreatePlanModal pre-populated with the active plan's data.

---

## Future Roadmap Items

In priority order, based on sport scientist feedback:

1. **Plan Edit Modal** — repurpose CreatePlanModal for editing existing plans
2. **Targets Tab** — performance targets linked to testing metrics
3. **Load Plan Tab** — once AU data pipeline exists (RPE × duration per session)
4. **Load Curve on Timeline** — SVG overlay, gated on AU data
5. **Gantt Preview on Plan Cards** — phase bar segments on the list view card
6. **Athlete-level Microcycle View** — filter the 7-day grid by individual athlete within a team plan
7. **Copy Week** — duplicate a week's sessions to the next week (common in periodization)
8. **Export to PDF / CSV** — printable microcycle sheet per athlete

---

## Data Model Reference (at time of this document)

```typescript
PeriodizationPlan {
  id, name, targetType, targetId, startDate, endDate,
  status: 'active' | 'draft' | 'upcoming' | 'at_risk',
  modalities: string[],
  phases: PlanPhase[],
  events: PlanEvent[],
}

PlanPhase {
  id, name, color, startDate, endDate,
  blocks: PlanTrainingBlock[],
}

PlanTrainingBlock {
  id, name, label, blockType, goals, color,
  startDate, endDate,
  intensityLevel: 'Low' | 'Moderate' | 'High' | 'Very High',
  volumeLevel:    'Low' | 'Moderate' | 'High' | 'Very High',
  weeks: PlanTrainingWeek[],
  modalities: Record<string, string>,
}

PlanTrainingWeek {
  id, weekNumber, startDate, endDate, intent,
  sessions: PlanSession[],
}

PlanSession {
  id, dayOfWeek, date, label, sessionType, notes,
  workoutPacketId?,
}

PlanEvent {
  id, title, date, type: 'competition' | 'training' | 'travel' | 'rest' | 'other',
  notes?,
}
```
