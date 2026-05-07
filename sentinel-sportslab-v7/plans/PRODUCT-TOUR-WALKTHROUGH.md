# Product Tour / Onboarding Walkthrough — Plan

## Context
New users need guided orientation when first using the platform. A product tour with tooltip-style popups highlights key UI elements and explains what each section does. The tour is per-page — each page has its own tour that triggers the first time the user visits that page, not a single tour across all pages at once.

## How It Works

### Per-page tours (not one giant tour)
- Each page has its own mini-tour (2-5 steps)
- First time a user visits a page → that page's tour auto-starts
- User can skip the tour for that page → it won't show again
- Visiting a different page later → that page's tour triggers independently
- Each page tour is tracked separately: `{ dashboard: 'completed', roster: 'skipped', wellness: 'pending' }`

### Skip behaviour
- "Skip tour for this page" button on every tooltip
- On skip: marks that page's tour as skipped → never auto-triggers again
- User can re-trigger any page tour from Settings → Walkthrough tab
- Does not block access to the page — tour overlays on top, content is still usable

### Settings → Walkthrough tab
- Lists all pages with their tour status: Completed / Skipped / Not yet visited
- Each page has a "Start Tour" button to manually trigger that page's tour
- "Reset All Tours" button to re-enable all tours (marks everything as pending)
- Allows sport scientists to re-learn features after updates or show the platform to new staff

## Tour steps per page

### Dashboard (4 steps)
1. **Sidebar Navigation** — "Your main navigation. Each section handles a different part of athlete management."
2. **Morning Report** — "Daily ACWR readiness report. Shows at-risk athletes based on training load data."
3. **Calendar** — "Schedule and manage sessions, matches, and events. Drag events to reschedule."
4. **Squad Readiness Heatmap** — "Team energy and stress distribution at a glance."

### Roster (3 steps)
1. **Team list** — "Your teams and squads. Click a team to see its athletes."
2. **Athlete card/row** — "Click any athlete to see their full profile — test results, load data, wellness, and injuries."
3. **Add Athlete button** — "Add new athletes or create new teams here."

### Wellness Hub (4 steps)
1. **Team cards** — "Select a team to view their wellness responses, compliance, and flagged athletes."
2. **Share Link** — "Share wellness check-in links with your athletes. Choose built-in or custom forms."
3. **Templates** — "View and manage questionnaire templates. Built-in Wellness Check and Weekly Health Check are ready to use."
4. **Dashboard overview** — "Compliance tracker, team heatmap, and wellness flags appear here after athletes submit responses."

### Testing Hub (3 steps)
1. **Category grid** — "80+ sport science test protocols organised by category. Select one to view available tests."
2. **Test visibility** — "Don't need certain tests? Toggle them off in Settings → Feature Settings → Testing Hub."
3. **Smart Import** — "Upload CSV test data and the system detects the test type automatically."

### Analytics Hub (3 steps)
1. **Module grid** — "Five analytics terminals: Baseline Trends, Performance Intelligence, Scenario Modelling, Dose-Response, and F-V Profiling."
2. **Athlete/team selector** — "Select an individual athlete or entire team to analyse."
3. **Date range** — "Adjust the analysis window with the date picker."

### Workouts (3 steps)
1. **Programs** — "Build multi-day training programs. Assign to teams or individuals."
2. **Packets** — "Quick workout templates for single sessions."
3. **History** — "View completed workout logs."

### Performance Lab (3 steps)
1. **Quick test tabs** — "Fast access to 1RM, DSI, RSI, Nordic Force calculators."
2. **Smart Import tab** — "Upload any test CSV — the system auto-detects the test type and maps columns."
3. **Save to athlete** — "Select an athlete and save results directly to their profile."

### Reporting Hub (3 steps)
1. **Report cards** — "Choose from Heart Rate Metrics, Data Hub, Tracking Hub, or GPS Data reports."
2. **GPS Import** — "Smart column mapping for GPS data from Catapult, STATSports, Polar, and more."
3. **HR Import** — "Import heart rate data with automatic column detection."

### Conditioning Hub (2 steps)
1. **Running Mechanics** — "Running mechanics library and documentation."
2. **Conditioning Sessions** — "Track and manage conditioning sessions."

### Settings (3 steps)
1. **Feature Settings** — "Configure ACWR monitoring and Testing Hub visibility per team."
2. **Account** — "Update your profile, organisation details, and sign out."
3. **Walkthrough** — "Restart or resume page tours from here at any time."

## Technical implementation

### Library: driver.js (~5KB)
- Lightweight, no React wrapper needed
- Supports highlighted elements, tooltip popups, step progression, overlay dimming
- `npm install driver.js`

### Tour state storage
- Supabase `user_data` via StorageService (not localStorage)
- Key: `tour_state`
- Value: `{ [pageId]: 'completed' | 'skipped' | 'pending' }`
- Default for new users: all pages = 'pending'

### Files to create
- `docs/components/ui/PageTour.tsx` — Reusable component that checks tour state for current page, triggers driver.js if pending
- `docs/utils/tourSteps.ts` — Step definitions per page with element selectors, titles, descriptions

### Files to modify
- `docs/services/storageService.ts` — Add `getTourState` / `saveTourState`
- `docs/App.tsx` — Mount `<PageTour />` inside the main layout (reads current route, triggers matching tour)
- `docs/pages/SettingsPage.tsx` — Add "Walkthrough" tab listing all pages with tour status + restart buttons

### How per-page triggering works
1. `<PageTour />` component mounted in App.tsx layout
2. On route change → checks current page against `tourState`
3. If `tourState[currentPage] === 'pending'` → starts that page's tour after 500ms delay (let page render)
4. On tour complete → saves `tourState[currentPage] = 'completed'`
5. On skip → saves `tourState[currentPage] = 'skipped'`
6. Tour never auto-triggers for 'completed' or 'skipped' pages

### First-login detection
- After `initData`, check if `tour_state` exists in user_data
- If not → create default state with all pages = 'pending'
- First page they visit (Dashboard) → tour auto-starts

### Element selectors
- Each step targets a specific DOM element using `data-tour="step-id"` attributes
- Add `data-tour` attributes to key UI elements in each page component
- driver.js highlights the element and shows a tooltip beside it

## Estimated effort
- Tour infrastructure (PageTour component, state management, Settings tab): 1 day
- Step definitions + data-tour attributes across all pages: 1 day  
- Testing + polish: half day
- Total: ~2.5 days
