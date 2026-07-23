/**
 * Product Tour Step Definitions
 *
 * Two types of tours:
 * 1. PAGE_TOURS — auto-start when landing on a page (home/landing view)
 * 2. WORKFLOW_TOURS — triggered when the user enters a specific sub-view
 *    (e.g. opening the Program Builder, entering a test, etc.)
 *    These are detected by watching for a "trigger" element appearing in the DOM.
 *
 * Steps use `data-tour="step-id"` attributes on target DOM elements.
 * driver.js highlights the element and shows a tooltip.
 *
 * Description style: each step explains WHAT the element is, WHY a sport
 * scientist cares, and WHERE the data comes from (which other module
 * populates or consumes it) so the user understands the platform as a
 * connected system, not a collection of isolated screens.
 */

export interface TourStep {
    element: string;           // CSS selector (data-tour attribute)
    title: string;
    description: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
}

export interface PageTourDef {
    pageId: string;
    pageName: string;
    route: string;             // matches against pathname
    steps: TourStep[];
}

export interface WorkflowTourDef {
    id: string;
    name: string;
    triggerElement: string;    // CSS selector — tour starts when this element appears in DOM
    parentPageId: string;      // which page this workflow belongs to (for Settings display)
    steps: TourStep[];
    /**
     * Optional explicit route to navigate to when launching this sub-tour from
     * Settings → Walkthrough. Use this when the trigger element lives inside a
     * specific sub-view of the parent page (e.g. /wellness?section=ACWR+Monitoring),
     * not on the parent page's default landing. Falls back to the parent page's
     * route when omitted.
     */
    route?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// PAGE TOURS — one per page, covers the landing/home view
// ═══════════════════════════════════════════════════════════════════════

export const PAGE_TOURS: PageTourDef[] = [
    {
        pageId: 'dashboard',
        pageName: 'Dashboard',
        route: '/dashboard',
        steps: [
            {
                element: '[data-tour="sidebar-nav"]',
                title: 'Sidebar navigation',
                description: 'Every section of Sentinel SportsLab lives in this sidebar — Dashboard (here), Planner, Roster, Workouts, Library, Conditioning, Wellness, Testing, Reporting, Analytics, and Toolkit. Sections you don\'t have access to under your current subscription tier show a lock icon and link to the Settings → Organisation upgrade page.',
                side: 'right',
            },
            {
                element: '[data-tour="morning-report"]',
                title: 'Performance Report',
                description: 'Your daily morning readout. Each row is an athlete with an ACWR (Acute-to-Chronic Workload Ratio) flag — a sports-science indicator of injury risk based on the spike between recent and longer-term training load. The data populating this list comes from training sessions logged in Wellness → ACWR Monitoring (manually or via CSV/GPS import). Click any athlete to drill into their full load trend, sessions and history.',
                side: 'left',
            },
            {
                element: '[data-tour="calendar"]',
                title: 'Training calendar',
                description: 'The weekly view of your team\'s schedule. Toggle Week / Month / All using the buttons in the header. Click + Add Event for one-off matches, rest days or notes. Scheduled Workout Packets and Programs (built in the Workouts page) auto-appear here too, colour-coded by session type. Drag any event to reschedule.',
                side: 'top',
            },
            {
                element: '[data-tour="heatmap"]',
                title: 'Wellness Summary heatmap',
                description: 'A visual heatmap of every athlete\'s latest daily wellness check-in — sleep, fatigue, soreness, stress, mood. Greener cells = healthier, redder = flagged. Click an athlete row for details. The responses powering this come from the Wellness forms you share with athletes (each form returns a row to this table).',
                side: 'top',
            },
        ],
    },
    {
        pageId: 'roster',
        pageName: 'Roster',
        route: '/clients',
        steps: [
            {
                element: '[data-tour="team-list"]',
                title: 'Teams and squads',
                description: 'Every team you manage lives here, with the athletes inside. Click a team header to expand or collapse it. Switch between grid and list view with the toggle. A team is just a grouping for organising athletes, scheduling sessions, and scoping reports — an athlete can sit in one team at a time.',
                side: 'bottom',
            },
            {
                element: '[data-tour="athlete-row"]',
                title: 'Athlete profiles',
                description: 'Click any athlete to open their full profile — a single page that aggregates everything you know about them: test results from the Testing, training load trend and ACWR from Wellness, wellness check-in responses, injury records, current program, and notes. This is the page to open before any 1-on-1 conversation with the athlete.',
                side: 'bottom',
            },
            {
                element: '[data-tour="add-athlete"]',
                title: 'Add athletes & teams',
                description: 'Add new athletes individually, or import a whole roster via CSV. You can also create new teams here. Athletes without a team get filed under Private Clients automatically — useful for one-on-one consulting work outside of squad management.',
                side: 'left',
            },
        ],
    },
    {
        pageId: 'wellness',
        pageName: 'Wellness',
        route: '/wellness',
        steps: [
            {
                element: '[data-tour="wellness-sections"]',
                title: 'Six wellness modules',
                description: 'The Wellness is the home for everything athlete-health related. Six modules live inside: Questionnaire Data (daily wellness check-ins), Medical Reports (PDF medical records), Injury Report (injury log + history), ACWR Monitoring (training load injury-risk tracking), Load Thresholds (per-sport overload bands), and Heart Rate Metrics (HR / HRV / zone data). Click any card to open it — each has its own dedicated walkthrough in Settings → Walkthrough.',
                side: 'bottom',
            },
            {
                element: '[data-tour="wellness-section-questionnaire-data"]',
                title: 'Questionnaire Data — the most-used module',
                description: 'The day-to-day workhorse — the daily wellness check-in dashboard. Athletes submit a 30-second form (fatigue, soreness, sleep, stress, mood); responses land here for you to scan, flag, and triage before training. Compliance and flagged-athlete counts roll up to the Dashboard tiles.',
                side: 'right',
            },
            {
                element: '[data-tour="wellness-section-medical-reports"]',
                title: 'Medical Reports — your records vault',
                description: 'Upload PDFs from doctors, physios or specialists and attach them to an athlete. Builds a central medical record alongside their training data, useful for return-to-play decisions and audit history. Files are scoped to your org only.',
                side: 'right',
            },
            {
                element: '[data-tour="wellness-section-injury-report"]',
                title: 'Injury Report — active + historical',
                description: 'Log injuries with body part, mechanism, severity and expected return-to-play date. Active and historical injuries surface on the athlete\'s profile, drive availability counts, and feed Analytics trend reports. Use this for recurrence tracking and weekly squad availability planning.',
                side: 'right',
            },
            {
                element: '[data-tour="wellness-section-acwr-monitoring"]',
                title: 'ACWR Monitoring — load injury-risk',
                description: 'Where you log training sessions (manually, via CSV, or via GPS integration) so the platform can compute the Acute-to-Chronic Workload Ratio per athlete. The Performance Report tile on the Dashboard reads from this module — without sessions logged here, that tile stays empty.',
                side: 'right',
            },
            {
                element: '[data-tour="wellness-section-load-thresholds"]',
                title: 'Load Thresholds — sport-specific bands',
                description: 'Override the default ACWR safe band (0.8–1.3) per sport or per athlete. Rugby front-rows tolerate different load profiles than distance runners — set those overrides here and they flow back into ACWR Monitoring colouring and Dashboard alerts org-wide.',
                side: 'right',
            },
            {
                element: '[data-tour="wellness-section-heart-rate-metrics"]',
                title: 'Heart Rate Metrics — HR + HRV + zones',
                description: 'Import HR data from Polar / Garmin / Wahoo. The platform classifies time-in-zone (Z1 Recovery → Z5 VO₂ Max) and trends resting HR and HRV. Watch for falling HRV alongside rising resting HR — a classic overtraining signal.',
                side: 'right',
            },
        ],
    },
    {
        pageId: 'testing',
        pageName: 'Testing',
        route: '/testing',
        steps: [
            {
                element: '[data-tour="test-categories"]',
                title: 'Test protocol library',
                description: '80+ sports-science test protocols organised by category — Musculoskeletal (1RM, isometric strength), Strength (CMJ, DSI, RSI), Speed, Flexibility, Aerobic (VO₂ max, Yo-Yo IR), Anthropometry, and more. Click a category to see its tests. Results you save here feed into Athlete Profiles, Analytics (Baseline Trends, Force-Velocity).',
                side: 'bottom',
            },
            {
                element: '[data-tour="test-tools"]',
                title: 'Comparison & export',
                description: 'Team Comparison plots multiple athletes on the same test for benchmarking. Export pulls all saved assessments out as CSV for offline analysis in Excel, R or Python. Use this for end-of-block or end-of-season reports — and for sharing results with strength coaches or physios.',
                side: 'bottom',
            },
        ],
    },
    {
        pageId: 'analytics',
        pageName: 'Analytics',
        route: '/analytics',
        steps: [
            {
                element: '[data-tour="analytics-selector"]',
                title: 'Subject selector',
                description: 'Every analytics terminal operates on either a single athlete or a whole team — pick here first. The terminals re-fetch data for the selected subject (test results, training load, wellness scores) so what you see below always matches who you chose. Terminals are locked until a subject is chosen.',
                side: 'bottom',
            },
            {
                element: '[data-tour="analytics-modules"]',
                title: 'Four analytics terminals',
                description: 'The Analytics page houses four focused analysis tools. Each works for the subject you picked above. Click any card to open the terminal — each has its own dedicated walkthrough in Settings → Walkthrough.',
                side: 'bottom',
            },
            {
                element: '[data-tour="analytics-module-kpi"]',
                title: 'Performance Intelligence',
                description: 'A composite readiness score rolling up recent training load, wellness check-ins, ACWR and test results into a single signal per athlete. Click in to see which inputs drove the score and where the weak signal is.',
                side: 'right',
            },
            {
                element: '[data-tour="analytics-module-scenario"]',
                title: 'Scenario Modelling',
                description: 'Build a what-if — "what happens to ACWR if I add a 90-min session tomorrow?" — and the platform projects the resulting acute/chronic ratio. Stress-test a planned week before committing.',
                side: 'right',
            },
            {
                element: '[data-tour="analytics-module-dose_response"]',
                title: 'Dose-Response Analysis',
                description: 'Correlate training inputs (load, type, volume) with outcome deltas (test scores, wellness, performance). Answers "did this block actually produce gains?" with hard data, not vibes.',
                side: 'right',
            },
            {
                element: '[data-tour="analytics-module-fv_profile"]',
                title: 'Force-Velocity Profile',
                description: 'Generate per-athlete F-V profiles from CMJ, IMTP and sprint data. Identifies whether the athlete is force-dominant or velocity-dominant, pointing to training-focus priorities.',
                side: 'right',
            },
        ],
    },
    {
        pageId: 'workouts',
        pageName: 'Workouts',
        route: '/workouts',
        steps: [
            {
                element: '[data-tour="workouts-tabs"]',
                title: 'Three workout authoring modes',
                description: 'Workouts has three flavours — pick the right tool for the job. Programs are multi-day plans (a full microcycle or training block). Packets are single-session templates. Sheets are printable, gym-ready load sheets. Switch between them with these tabs.',
                side: 'bottom',
            },
            {
                element: '[data-tour="workouts-tab-programs"]',
                title: 'Programs — multi-day plans',
                description: 'A Program is a structured multi-day training plan (e.g. "Push/Pull/Legs Week 1" or "Pre-Season Phase 2"). Each program contains days, and each day has Warm-Up / Workout / Cool-Down sections. Assigning a Program to an athlete populates their Calendar automatically.',
                side: 'bottom',
            },
            {
                element: '[data-tour="workouts-tab-packets"]',
                title: 'Packets — single sessions',
                description: 'A Packet is a single-session workout template — faster to author than a full Program. Great for one-offs, recovery sessions, or warm-ups. Share a Packet with an athlete via link (no login required) so they can follow it on their phone.',
                side: 'bottom',
            },
            {
                element: '[data-tour="workouts-tab-sheets"]',
                title: 'Sheets — printable load sheets',
                description: 'Weightroom Sheets — saved printable plans for gym walls. Pick exercises and percentages, the platform fills in absolute kg values based on each athlete\'s most recent 1RM tests.',
                side: 'bottom',
            },
            {
                element: '[data-tour="workouts-create"]',
                title: 'Create button',
                description: 'Opens the builder for whichever tab is currently active. Label and colour update per tab — "Create Program" on Programs, "Create Packet" on Packets, etc. Programs and Packets open a full-screen builder; Sheets open a print-preview composer.',
                side: 'left',
            },
        ],
    },
    {
        pageId: 'reports',
        pageName: 'Reporting',
        route: '/reports',
        steps: [
            {
                element: '[data-tour="report-cards"]',
                title: 'Four reporting modules',
                description: 'The Reporting houses four data-export and analysis modules. Each card opens a dedicated view. Click a card to enter, or use the dedicated walkthroughs from Settings → Walkthrough for a guided tour of each module.',
                side: 'bottom',
            },
            {
                element: '[data-tour="report-card-data-hub"]',
                title: 'Data Hub — daily activity registry',
                description: 'The live spreadsheet of every athlete\'s data — load, wellness, tests — side-by-side in a single grid. Column picker lets you show only what you care about. Generate a shareable read-only snapshot link to send to coaches without an account.',
                side: 'right',
            },
            {
                element: '[data-tour="report-card-tracking-hub"]',
                title: 'Tracking Hub — body-region load',
                description: 'Training load split by body region (upper / lower / core / full body) across any time window. Useful for spotting imbalances (e.g. a squad that\'s only doing lower-body work) and for periodisation review.',
                side: 'right',
            },
            {
                element: '[data-tour="report-card-gps-data"]',
                title: 'GPS Data — sprint + telemetry import',
                description: 'Import sprint distance, max velocity, accel/decel counts, total distance from Catapult / STATSports / Polar / generic CSV. Smart column mapper auto-detects columns. Imported sessions feed straight into ACWR Monitoring as training load.',
                side: 'right',
            },
            {
                element: '[data-tour="report-card-running-mechanics"]',
                title: 'Running Mechanics — drill library',
                description: 'Documented running-mechanics drills with cues, progressions and reference video. Tag drills to an athlete\'s plan to expose them in their next session.',
                side: 'right',
            },
        ],
    },
    {
        pageId: 'conditioning',
        pageName: 'Conditioning',
        route: '/conditioning',
        steps: [
            {
                element: '[data-tour="conditioning-main"]',
                title: 'Two conditioning modules',
                description: 'The Conditioning focuses on aerobic / anaerobic conditioning work — separate from strength training. Two modules cover the workflow: Wattbike for indoor power-based protocols, and Conditioning Sessions for prescribing interval / continuous / sled work across any modality.',
                side: 'bottom',
            },
            {
                element: '[data-tour="conditioning-card-wattbike"]',
                title: 'Wattbike Hub',
                description: 'Official power-resistance tables for Trainer, Pro, Nucleus Standard and Nucleus High Wattbike models. Prescribe sessions against target wattage and the lookup will give the right Level × RPM combination for each athlete.',
                side: 'right',
            },
            {
                element: '[data-tour="conditioning-card-sessions"]',
                title: 'Conditioning Sessions',
                description: 'Build interval, continuous, or repeated-effort sessions with sets, reps, work duration, rest duration, intensity and inter-set rest. Tag the session\'s energy system (Alactic / Glycolytic / Aerobic / Mixed) for load distribution tracking. Assign to athletes and the session appears on the Calendar.',
                side: 'right',
            },
        ],
    },
    {
        pageId: 'library',
        pageName: 'Exercise Library',
        route: '/library',
        steps: [
            {
                element: '[data-tour="library-search"]',
                title: 'Search & filter 3,700+ exercises',
                description: 'Search the full database by name or filter by body region (upper / lower / core / full), classification (compound / isolation / accessory), or equipment (barbell / dumbbell / machine / bodyweight / band). Alphabet rail on the right scrolls you to the right letter quickly. Every exercise in the library can be added to a Program or Packet.',
                side: 'bottom',
            },
            {
                element: '[data-tour="library-personal"]',
                title: 'My Library — your shortlist',
                description: 'Star any exercise to pin it to your personal library — these surface first inside the Program / Packet builders, saving you from searching the full 3,700-exercise database every time. Recently-used exercises also appear here automatically. Treat this as your "go-to" toolbox.',
                side: 'bottom',
            },
        ],
    },
    {
        pageId: 'periodization',
        pageName: 'Planner',
        route: '/periodization',
        steps: [
            {
                element: '[data-tour="planner-main"]',
                title: 'Periodization Planner',
                description: 'Design long-horizon training plans for a team or individual. The Planner uses a three-tier structure: macrocycles (the season / year), mesocycles (4-6 week blocks like Accumulation, Intensification, Realisation, Taper), and microcycles (per-week breakdown of intensity, volume, focus). Plans bind to a team — every session scheduled inside the plan window inherits its phase context automatically. Available on Elite tier.',
                side: 'bottom',
            },
        ],
    },
    {
        pageId: 'settings',
        pageName: 'Settings',
        route: '/settings',
        steps: [
            {
                element: '[data-tour="settings-features"]',
                title: 'Feature Settings',
                description: 'Configure ACWR per team — choose the load method (sRPE, total distance, sprint distance, etc.), EWMA window length, and rest-day handling. Also toggle which test categories appear in the Testing so coaches only see relevant protocols (e.g. hide swim-specific tests for a rugby squad). These choices flow through to every report and analytics terminal.',
                side: 'right',
            },
            {
                element: '[data-tour="settings-account"]',
                title: 'Account',
                description: 'Update your name, organisation, contact details, password and email. Sign out from here. Your account is one row in our database — your data, your athletes, your workouts all bind to this user ID. Multi-user organisations share access via the Organisation tab.',
                side: 'right',
            },
            {
                element: '[data-tour="settings-walkthrough"]',
                title: 'Walkthroughs',
                description: 'Replay the welcome tour or any page tour from here, anytime. Useful when onboarding new staff or when you\'ve forgotten how a feature works. Video walkthroughs (screen-recorded tours of each hub) plug in here as we ship them.',
                side: 'right',
            },
        ],
    },
];

// ═══════════════════════════════════════════════════════════════════════
// WORKFLOW TOURS — triggered when user enters a specific sub-view
// ═══════════════════════════════════════════════════════════════════════

export const WORKFLOW_TOURS: WorkflowTourDef[] = [
    {
        id: 'wf_program_builder',
        name: 'Creating a Training Program',
        triggerElement: '[data-tour="program-name-input"]',
        parentPageId: 'workouts',
        steps: [
            {
                element: '[data-tour="program-meta"]',
                title: 'Name & tags',
                description: 'Give the program a clear name (e.g. "Push Pull Legs — Hypertrophy Block 1") so you can find it later. Tags are optional but help organise large libraries — tag by phase, sport, or training focus. The same program template can be assigned to multiple athletes or squads.',
                side: 'bottom',
            },
            {
                element: '[data-tour="program-day-sections"]',
                title: 'Build the day',
                description: 'Each training day has three sections — Warm-Up, Workout, Cool-Down — to mirror how a session is actually structured. Click "Add an Exercise" inside any section to open the Exercise Library picker (3,700+ exercises searchable by name, body part, or equipment). Set reps, sets, load (kg or %1RM), tempo and rest per exercise.',
                side: 'bottom',
            },
            {
                element: '[data-tour="program-save-button"]',
                title: 'Save (or save as new)',
                description: 'Save commits your program — it will appear in the Workouts page programs list and become assignable to athletes. If you opened an existing program and want a variant rather than overwriting, use "Save as New" to fork a copy. Programs are reusable templates: edit them anytime and the changes flow to future assignments only, not past ones.',
                side: 'top',
            },
        ],
    },
    {
        id: 'wf_test_entry',
        name: 'Recording a Test Assessment',
        triggerElement: '[data-tour="test-field-inputs"]',
        parentPageId: 'testing',
        steps: [
            {
                element: '[data-tour="test-field-inputs"]',
                title: 'Enter the result',
                description: 'Fill in the raw numbers for the selected athlete on the selected test — fields vary by protocol (1RM in kg, jump height in cm, sprint time in seconds, etc.). Some tests auto-derive secondary metrics: RSI from jump height and contact time, DSI from isometric / ballistic ratio. Required fields are marked.',
                side: 'bottom',
            },
            {
                element: '[data-tour="test-save-button"]',
                title: 'Save assessment',
                description: 'Saving the result writes it to the athlete\'s test history and timestamps it. From here the value automatically flows into the Athlete Profile page, Analytics → Baseline Trends, and any team comparison. You can revisit and edit the result later if there\'s a data-entry error.',
                side: 'top',
            },
        ],
    },
    {
        id: 'wf_wellness_questionnaire',
        name: 'Questionnaire Data',
        triggerElement: '[data-tour="wellness-teams"]',
        parentPageId: 'wellness',
        route: '/wellness?section=Questionnaire+Data',
        steps: [
            {
                element: '[data-tour="wellness-teams"]',
                title: 'Team selection & compliance',
                description: 'Each team card shows today\'s submission count (how many athletes have done their daily check-in), compliance trend, and any flagged athletes. Compliance = athletes who actually submitted ÷ total in squad — a leading indicator of buy-in. Click a card to see the team\'s detailed responses.',
                side: 'bottom',
            },
            {
                element: '[data-tour="wellness-templates"]',
                title: 'Questionnaire templates',
                description: 'Templates control what your athletes are asked. The built-in Daily Wellness Check covers fatigue, soreness, sleep quality, stress and mood (4-7 point scales, takes ~30 seconds). The Weekly Health Check is a FIFA/IOC-aligned injury classification form. You can also build custom templates with your own fields.',
                side: 'left',
            },
            {
                element: '[data-tour="wellness-share"]',
                title: 'Share the form',
                description: 'Click here to generate a shareable link for the chosen template. Send it via WhatsApp, email or team chat — athletes fill it in on their phone, no account needed. Each submission becomes a row in this table within seconds.',
                side: 'left',
            },
        ],
    },
    {
        id: 'wf_wellness_medical',
        name: 'Medical Reports',
        triggerElement: '[data-tour="wellness-medical-overview"]',
        parentPageId: 'wellness',
        route: '/wellness?section=Medical+Reports',
        steps: [
            {
                element: '[data-tour="wellness-medical-overview"]',
                title: 'Medical records vault',
                description: 'Upload PDFs from doctors, physios or specialists and attach them to an athlete. The system stores them per-athlete so you have a central medical record alongside their training data. Useful for return-to-play decisions and audit history. Files live in Supabase Storage with restricted access — only your org can read them.',
                side: 'bottom',
            },
        ],
    },
    {
        id: 'wf_wellness_injury',
        name: 'Injury Report',
        triggerElement: '[data-tour="wellness-injury-overview"]',
        parentPageId: 'wellness',
        route: '/wellness?section=Injury+Report',
        steps: [
            {
                element: '[data-tour="wellness-injury-overview"]',
                title: 'Injury log + history',
                description: 'Active injuries listed at the top with body part, mechanism, severity and expected return-to-play date. History view shows past injuries for recurrence tracking. Add a new injury with the + button. Injuries logged here surface on the athlete\'s profile, in availability counts, and feed Analytics trend reports.',
                side: 'bottom',
            },
        ],
    },
    {
        id: 'wf_acwr_monitoring',
        name: 'ACWR Monitoring',
        triggerElement: '[data-tour="acwr-controls"]',
        parentPageId: 'wellness',
        route: '/wellness?section=ACWR+Monitoring',
        steps: [
            {
                element: '[data-tour="acwr-team-selector"]',
                title: 'Choose team / athlete',
                description: 'Pick the team or individual whose training load you want to monitor. Only teams with ACWR enabled in Settings → Features show up — this lets you scope monitoring to the squads that need it (e.g. first team only, not academy).',
                side: 'bottom',
            },
            {
                element: '[data-tour="acwr-log-button"]',
                title: 'Log a session load',
                description: 'Manually record training load for a single session. Inputs depend on the load method configured in Settings — typically sRPE × duration (in arbitrary units), total distance (m), sprint distance (m), or training impulse (TRIMP). Each entry rolls into both the acute (~7 day) and chronic (~28 day) load averages used in the ACWR ratio.',
                side: 'bottom',
            },
            {
                element: '[data-tour="acwr-csv-import"]',
                title: 'Bulk import from CSV',
                description: 'If you already track load in a spreadsheet or export from a GPS unit, paste in or upload the CSV here. The smart mapper detects athlete-name and load columns automatically — preview and confirm before committing. Saves hours over manual entry for whole-squad imports.',
                side: 'bottom',
            },
        ],
    },
    {
        id: 'wf_wellness_thresholds',
        name: 'Load Thresholds',
        triggerElement: '[data-tour="wellness-thresholds-overview"]',
        parentPageId: 'wellness',
        route: '/wellness?section=Load+Thresholds',
        steps: [
            {
                element: '[data-tour="wellness-thresholds-overview"]',
                title: 'Per-sport ACWR bands',
                description: 'Default ACWR sweet-spot is 0.8–1.3 (research-aligned). Different sports tolerate different load profiles — rugby front-rows vs distance runners — and this page lets you override the safe band per sport or per athlete. Changes apply org-wide and feed back into the ACWR Monitoring risk colouring and Dashboard alerts.',
                side: 'bottom',
            },
        ],
    },
    {
        id: 'wf_wellness_heart_rate',
        name: 'Heart Rate Metrics',
        triggerElement: '[data-tour="wellness-heart-rate-overview"]',
        parentPageId: 'wellness',
        route: '/wellness?section=Heart+Rate+Metrics',
        steps: [
            {
                element: '[data-tour="wellness-heart-rate-overview"]',
                title: 'HR / HRV / zone tracking',
                description: 'Import heart-rate data exported from Polar, Garmin or Wahoo. The platform classifies time-in-zone (Z1 Recovery → Z5 VO2 Max), shows resting HR and HRV trends, and flags drops that may indicate accumulated fatigue or illness. Watch for falling HRV + rising resting HR together — a classic overtraining signal.',
                side: 'bottom',
            },
        ],
    },
    {
        id: 'wf_conditioning_builder',
        name: 'Creating a Conditioning Session',
        triggerElement: '[data-tour="cond-meta-fields"]',
        parentPageId: 'conditioning',
        steps: [
            {
                element: '[data-tour="cond-meta-fields"]',
                title: 'Session basics',
                description: 'Name the session (e.g. "Tuesday VO₂ max — 4x4"), choose the modality (running / bike / rowing / sled / mixed), and set the total expected duration. The modality controls which metrics will be tracked at the athlete level when this session is delivered.',
                side: 'bottom',
            },
            {
                element: '[data-tour="cond-energy-system"]',
                title: 'Energy system target',
                description: 'Tag the session as Alactic (short explosive — ATP-PCr, e.g. 6s sprints), Glycolytic (moderate intensity — e.g. 30-90s max efforts), Aerobic (endurance — e.g. continuous 20+ min), or Mixed. This classification feeds into the athlete\'s load distribution chart so you can balance energy systems across the week.',
                side: 'bottom',
            },
            {
                element: '[data-tour="cond-interval-sets"]',
                title: 'Interval blocks',
                description: 'Build the actual protocol — work duration, rest duration, intensity (% max HR / % VO₂ max / RPE), number of reps per set, and inter-set rest. Example: 4 × (4 min @ 90% HRmax + 3 min recovery). You can chain multiple blocks for more complex protocols like pyramid sets or fartlek structures.',
                side: 'bottom',
            },
        ],
    },
    {
        id: 'wf_analytics_terminal',
        name: 'Using Analytics Terminals',
        triggerElement: '[data-tour="analytics-dates"]',
        parentPageId: 'analytics',
        steps: [
            {
                element: '[data-tour="analytics-dates"]',
                title: 'Date range filter',
                description: 'Every terminal scopes its data to this window — pick "Last 28 days" for an acute snapshot, a single training block (e.g. 6 weeks), or a whole season for trend analysis. Charts and stats recompute the moment you change the range. Default ranges align with typical periodization blocks.',
                side: 'left',
            },
        ],
    },
];

/** Get page tour definition for a given route */
export function getTourForRoute(pathname: string): PageTourDef | null {
    return PAGE_TOURS.find(t => pathname.startsWith(t.route)) || null;
}

/** Default tour state — all pages and workflows pending */
export function getDefaultTourState(): Record<string, string> {
    const state: Record<string, string> = {};
    for (const tour of PAGE_TOURS) {
        state[tour.pageId] = 'pending';
    }
    for (const wf of WORKFLOW_TOURS) {
        state[wf.id] = 'pending';
    }
    return state;
}
