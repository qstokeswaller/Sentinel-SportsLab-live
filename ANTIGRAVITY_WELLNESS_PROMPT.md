# Antigravity Prompt — Wellness Hub Full Redesign

## Context
TrainerOS SaaS — React 19 + TypeScript + Vite, Tailwind CSS, Supabase.
- Root: `docs/` — Vite dev server at localhost:8081
- State: `docs/context/AppStateContext.tsx`
- DB: `docs/services/databaseService.ts` (methods already added — see below)
- Types: `docs/types/types.ts` (WellnessQuestion, QuestionnaireTemplate, WellnessResponse, BodyMapArea, InjuryReport already added)
- The Wellness Hub is currently rendered inside `docs/pages/ReportingHubPage.tsx` when `activeReport === 'Wellness Hub'`
- Existing files to REWRITE (not delete): `docs/components/performance/WellnessHub.tsx`, `docs/components/performance/QuestionnaireManager.tsx`

## Body Map Image
The file `docs/public/body-map.png` contains a front + back anatomical muscle diagram.
Use it as: `<img src="/body-map.png" />` — Vite serves docs/public/ as static root.

## Already Done (do NOT redo)
- Supabase tables: `questionnaire_templates`, `wellness_responses` — both exist with RLS
- Supabase RPC: `get_wellness_form_data(p_template_id, p_team_id)` — returns `{ template, athletes[] }`
- `databaseService.ts` has these methods ready to call:
  - `DatabaseService.fetchQuestionnaireTemplates(teamId?)`
  - `DatabaseService.saveQuestionnaireTemplate(template)`
  - `DatabaseService.deleteQuestionnaireTemplate(templateId)`
  - `DatabaseService.saveWellnessResponse(response)` — works for anon (public form)
  - `DatabaseService.fetchWellnessResponses(teamId, dateFrom?, dateTo?)`
  - `DatabaseService.fetchWellnessResponsesByAthlete(athleteId, dateFrom?, dateTo?)`
  - `DatabaseService.getWellnessFormData(templateId, teamId)` — public RPC, anon-safe
- `DEFAULT_WELLNESS_QUESTIONS` in `docs/utils/mocks.ts` — full AmaTuks template (22 questions)
- `BODY_MAP_AREAS` in `docs/utils/mocks.ts` — 17 areas, front + back
- Types: `QuestionnaireTemplate`, `WellnessQuestion`, `WellnessResponse`, `BodyMapArea`, `InjuryReport`

## Data Shapes

### WellnessResponse (from DB)
```typescript
{
  id: string,
  athlete_id: string,
  team_id: string,
  questionnaire_template_id: string,
  session_date: string,           // 'YYYY-MM-DD'
  responses: {                    // keyed by question id
    rpe: 7,
    fatigue: 'High',              // raw text answer
    fatigue_numeric: 4,           // derived from numericMap
    energy: 'Average',
    energy_numeric: 3,
    stress: 'Low',
    stress_numeric: 2,
    motivation: 'High',
    motivation_numeric: 4,
    soreness: 'Low',
    soreness_numeric: 2,
    sleep_quality: 'Very high (Excellent sleep)',
    sleep_quality_numeric: 5,
    sleep_hours: '6 - 8 hours',
    availability: 'Fully available for training/competition',
    urti_hoarseness: 0,
    urti_blocked_nose: 1,
    urti_runny_nose: 0,
    urti_sinus_pressure: 0,
    urti_sneezing: 0,
    urti_dry_cough: 0,
    urti_wet_cough: 0,
    urti_headache: 0,
    body_map: [{ area: 'hamstrings', side: 'left', severity: 2 }],
    injury_type: 'Soreness (pain during exercise)',
    injury_timing: 'Middle of session',
    injury_mechanism: 'Non-contact',
    injury_side: 'Left',
    training_interruption: false
  },
  rpe: 7,                        // denormalised
  availability: 'available',     // denormalised: 'available' | 'modified' | 'unavailable'
  injury_report: { areas: [...], type: '...', mechanism: '...', ... },
  submitted_at: string
}
```

### Availability mapping (from form text → DB enum)
- 'Fully available for training/competition' → 'available'
- 'Available for modified training' → 'modified'
- 'Unavailable due to injury/illness' → 'unavailable'

### Numeric mapping for multiple_choice wellness questions
The `numericMap` array in DEFAULT_WELLNESS_QUESTIONS maps each option index to a number.
Example for fatigue: options[0]='Very low' → 1, options[4]='Very high' → 5.
Store both the raw text and the numeric value in responses.

---

## TASK 1 — AppStateContext updates
File: `docs/context/AppStateContext.tsx`

Add to state:
```typescript
const [wellnessTemplates, setWellnessTemplates] = useState<QuestionnaireTemplate[]>([]);
const [wellnessResponses, setWellnessResponses] = useState<WellnessResponse[]>([]);
const [wellnessSelectedTeamId, setWellnessSelectedTeamId] = useState('');
const [wellnessDateRange, setWellnessDateRange] = useState<'today' | '7d' | '14d' | '28d'>('today');
```

In `initData()`, after teams load, add:
```typescript
try {
    const templates = await DatabaseService.fetchQuestionnaireTemplates();
    setWellnessTemplates(templates || []);
} catch (e) { console.error('wellness templates load error', e); }
```

Add handler:
```typescript
const handleLoadWellnessResponses = async (teamId: string, dateFrom?: string, dateTo?: string) => {
    try {
        const data = await DatabaseService.fetchWellnessResponses(teamId, dateFrom, dateTo);
        setWellnessResponses(data || []);
    } catch (e) { console.error('wellness responses load error', e); }
};
```

Export in contextValue: `wellnessTemplates`, `setWellnessTemplates`, `wellnessResponses`, `wellnessSelectedTeamId`, `setWellnessSelectedTeamId`, `wellnessDateRange`, `setWellnessDateRange`, `handleLoadWellnessResponses`

---

## TASK 2 — Wellness Hub Home Screen
Rewrite `docs/components/performance/WellnessHub.tsx`

The component receives `{ teams, questionnaires (legacy — ignore), setQuestionnaires (legacy — ignore) }` from ReportingHubPage but should use `useAppState()` for all new state.

### View modes (local state: `view: 'home' | 'dashboard' | 'athlete'`)

### HOME view layout:
```
┌─────────────────────────────────────────────────────────┐
│ WELLNESS HUB                          [+ New Template]  │
├──────────────────────────┬──────────────────────────────┤
│  QUESTIONNAIRE TEMPLATES │  TODAY'S SNAPSHOT            │
│  ┌──────────────────┐   │  (shows if responses exist   │
│  │ AmaTuks Wellness  │   │   for today for any team)    │
│  │ 22 questions      │   │                              │
│  │ [Share] [Edit]    │   │  Team: X — 28/31 responded  │
│  └──────────────────┘   │  ✓ 26 Available              │
│  ┌──────────────────┐   │  ~ 1 Modified                │
│  │ + Create New      │   │  ✗ 1 Unavailable             │
│  └──────────────────┘   │                              │
├──────────────────────────┴──────────────────────────────┤
│  TEAMS — Select to view wellness dashboard              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Team Name   │  │ Team Name   │  │ Team Name   │    │
│  │ 5 athletes  │  │ 12 athletes │  │ 8 athletes  │    │
│  │ Last: Today │  │ Last: 3d ago│  │ No data     │    │
│  │ [View Data] │  │ [View Data] │  │ [View Data] │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────┘
```

Template cards show: name, question count, [Share] button (generates link), [Edit] button.
Team cards show: name, athlete count, last submission date (or 'No data yet'), availability bar if today data exists.

---

## TASK 3 — Share / QR Panel (inside WellnessHub)
When [Share] is clicked on a template card, show a modal/panel:

1. Team selector dropdown (which team is this form for)
2. Generated URL: `{window.location.origin}/w/{base64(templateId:teamId)}`
3. [Copy Link] button
4. QR code image: `<img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={encodedUrl}" />`
5. Instructions: "Share this link with athletes. They can fill it out on any device without logging in."

Token encoding:
```typescript
const token = btoa(`${templateId}:${teamId}`);
const url = `${window.location.origin}/w/${token}`;
```

---

## TASK 4 — Team Dashboard View
Local state: `selectedTeamId`, `dateRange: 'today'|'7d'|'14d'|'28d'`, `activeCharts: string[]` (which charts to show — default all)

On entering dashboard view: call `handleLoadWellnessResponses(teamId, dateFrom, dateTo)`.
Re-fetch whenever dateRange changes.

### Date range calculation
```typescript
const getDateRange = (range: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (range === 'today') return { from: today, to: today };
    const d = new Date();
    d.setDate(d.getDate() - (range === '7d' ? 7 : range === '14d' ? 14 : 28));
    return { from: d.toISOString().split('T')[0], to: today };
};
```

### Layout:
```
[← Back]  Team Name  |  [Today] [7d] [14d] [28d]  |  [Filter charts ▼]

KPI CARDS ROW:
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 31           │ │ 28           │ │ 1            │ │ 2            │
│ Responses    │ │ Available    │ │ Modified     │ │ Unavailable  │
│              │ │ ✓ green      │ │ ~ amber      │ │ ✗ red        │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘

CHART GRID (2 columns on desktop, 1 on mobile):
┌────────────────────┐  ┌────────────────────┐
│ HOURS SLEPT        │  │ SESSION RPE        │
│ (pie chart)        │  │ (bar per athlete)  │
└────────────────────┘  └────────────────────┘
┌────────────────────────────────────────────┐
│ FATIGUE vs ENERGY LEVELS                  │
│ (grouped bar per athlete — red/green)     │
└────────────────────────────────────────────┘
┌────────────────────┐  ┌────────────────────┐
│ MUSCLE SORENESS    │  │ SIGNS OF ILLNESS   │
│ (horizontal bars)  │  │ (stacked per       │
│ dist. by category  │  │  athlete, 8 colors)│
└────────────────────┘  └────────────────────┘
┌────────────────────────────────────────────┐
│ KNOCKS & NIGGLES                          │
│ Table: Athlete | Area (colour dot) | Type │
│ Filtered to athletes with body_map data   │
└────────────────────┘
```

---

## TASK 5 — CSS Chart Components (NO external chart library)

All charts use Tailwind CSS + inline styles for bar widths. Same pattern as existing ACWR bar in the app.

### Chart A — Hours Slept (Pie/Donut approximation)
Use a stacked horizontal bar (simpler than true SVG pie, works on mobile):
- Categories: '1-3 hours' (red), '3-6 hours' (amber), '6-8 hours' (blue), '8+' (green)
- Count per category, show as percentage bar + legend below

### Chart B — Session RPE per Athlete (Vertical bar chart)
- X-axis: athlete first names (rotated 45°)
- Y-axis: 1–10 scale
- Bar height: `(rpe / 10) * 100%` relative to container
- Bar colour: green (≤5) → amber (6-7) → red (≥8)
- If dateRange > today: show average RPE per athlete
- Sort by RPE descending

### Chart C — Fatigue vs Energy per Athlete (Grouped bars)
- Per athlete: two bars side by side — Fatigue (red) and Energy (green)
- Height: `(score / 5) * 100%`
- Athlete names on X-axis, rotated

### Chart D — Muscle Soreness Distribution (Horizontal bars)
- Categories: Very Low, Low, Average, High, Very High
- One horizontal bar per category showing count
- Width: `(count / total) * 100%`
- Colour: green → amber → red

### Chart E — Signs of Illness (Stacked bar per athlete)
- Per athlete: stacked bar where each segment is one URTI symptom score (0-3)
- 8 segments per bar, each a different colour
- Only show athletes with at least one symptom score > 0
- Legend: 8 symptom names with colours
- Sorted by total symptom burden (highest first)

### Chart F — Knocks & Niggles Table
Filter `wellnessResponses` where `injury_report` is not null and `injury_report.areas.length > 0`.
For each: show athlete name, each affected area with a coloured dot (match BODY_MAP_AREAS color), injury type.

---

## TASK 6 — Individual Athlete View
Accessed from team dashboard via athlete name click.

Shows for selected athlete over selected date range:
- Timeline list of their submissions (date, availability badge, RPE chip)
- Trend mini-charts for each wellness metric (fatigue, energy, stress, motivation, soreness, sleep quality) — use small sparkline bars showing last N values
- Body map showing all affected areas across the date range (aggregate severity)
- URTI history table

---

## TASK 7 — Public Form Route (/w/:token)
Add to `docs/Router.tsx` (or wherever React Router routes are defined):
```tsx
<Route path="/w/:token" element={<PublicWellnessForm />} />
```

Create `docs/pages/PublicWellnessForm.tsx`:

1. On mount: decode token `const [templateId, teamId] = atob(token).split(':')`, call `DatabaseService.getWellnessFormData(templateId, teamId)`
2. Show: athlete name dropdown (from `data.athletes`), then render all questions from `data.template.questions`
3. Form renders questions by type:
   - `scale_1_10`: row of 10 numbered circles, tap to select
   - `scale_0_3`: row of 4 circles (0, 1, 2, 3) with labels
   - `multiple_choice`: vertical list of selectable pills (one select)
   - `checklist`: vertical list of toggleable pills (multi-select)
   - `yes_no`: two large buttons [Yes] [No]
   - `body_map`: see Task 8 below
   - `text`: textarea
   - Conditional questions: only show when `conditional.questionId` answer satisfies the condition
4. On submit:
   - Map answers to `responses` object
   - Derive `rpe` (from responses.rpe), `availability` (map text → enum)
   - Derive `injury_report` from body_map + injury detail answers
   - Call `DatabaseService.saveWellnessResponse({ athlete_id, team_id, questionnaire_template_id, session_date: today, responses, rpe, availability, injury_report })`
   - Show success screen: "Response submitted! Thank you."
5. Mobile-first design: full-width, large tap targets, progress bar at top showing % complete
6. Error states: invalid token, form not found, already submitted today (check & warn, don't block)

---

## TASK 8 — BodyMapSelector Component
Create `docs/components/wellness/BodyMapSelector.tsx`

```
Props: {
  value: BodyMapArea[],
  onChange: (areas: BodyMapArea[]) => void
}
```

### Layout
```
[FRONT] [BACK]  ← toggle buttons

┌─────────────────────────────┐
│   <img src="/body-map.png"  │  (show front or back half of image)
│    cropped to front view>   │
│                             │
│  [Named area buttons below] │
└─────────────────────────────┘

Tap an area button → shows severity picker (0/1/2/3):
  [0 None] [1 Mild] [2 Moderate] [3 Severe]
Selected areas shown as chips below map with ✕ to remove.
```

### Implementation
- Show the full body-map.png image (both figures) scaled to fit
- Below image: two rows of buttons — FRONT areas, BACK areas (toggle which row is visible)
- Each area button: shows the BODY_MAP_AREAS color dot + label
- Tapping an area that's not selected → adds it with severity 1 + shows inline severity selector
- Tapping a selected area → shows severity selector to update
- Selected areas shown as coloured chips at bottom: `[● Hamstrings — Moderate ✕]`
- The image is a visual guide only (not interactive clickable); the buttons are the input

### BODY_MAP_AREAS import
```typescript
import { BODY_MAP_AREAS } from '../../utils/mocks';
```

---

## TASK 9 — Rewrite QuestionnaireManager
File: `docs/components/performance/QuestionnaireManager.tsx`

Keep the same 3-view structure (list, create/edit, view) but:
1. Load/save from DB via `DatabaseService.fetchQuestionnaireTemplates()` and `DatabaseService.saveQuestionnaireTemplate()` instead of local state/localStorage
2. Add `body_map` as a supported question type in the create/edit toolbar
3. Delete uses `DatabaseService.deleteQuestionnaireTemplate()` (soft delete, sets is_active=false)
4. On save: call `setWellnessTemplates` from context to update global state

---

## Styling notes
- Match existing app style: dark navy (`#0F172A`), indigo accents, white cards with `rounded-3xl border border-slate-100 shadow-sm`
- Availability colours: green (`text-emerald-500`) = available, amber (`text-amber-500`) = modified, red (`text-rose-500`) = unavailable
- Chart bars: use `transition-all duration-500` for animated entry
- No external chart libraries — pure CSS/Tailwind bars only
- Mobile public form: `max-w-lg mx-auto`, large padding, `text-base` minimum font size

---

## File summary — what to create/modify

| File | Action |
|------|--------|
| `docs/context/AppStateContext.tsx` | Add state + handler (Task 1) |
| `docs/components/performance/WellnessHub.tsx` | Full rewrite (Tasks 2, 3, 4, 5, 6) |
| `docs/components/performance/QuestionnaireManager.tsx` | Rewrite (Task 9) |
| `docs/components/wellness/BodyMapSelector.tsx` | Create new (Task 8) |
| `docs/pages/PublicWellnessForm.tsx` | Create new (Task 7) |
| `docs/Router.tsx` | Add `/w/:token` route (Task 7) |

Do NOT modify: `databaseService.ts`, `types/types.ts`, `utils/mocks.ts` — already updated.
