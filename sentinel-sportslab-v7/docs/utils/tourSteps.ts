// @ts-nocheck
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
            { element: '[data-tour="sidebar-nav"]', title: 'Navigation', description: 'Your main navigation. Each section handles a different part of athlete management — from wellness monitoring to workout programming.', side: 'right' },
            { element: '[data-tour="morning-report"]', title: 'Morning Report', description: 'Your daily ACWR readiness report. Shows at-risk athletes based on training load data. Enable ACWR monitoring in Settings → Feature Settings to activate this.', side: 'left' },
            { element: '[data-tour="calendar"]', title: 'Calendar', description: 'Schedule and manage training sessions, matches, and events. Drag events to reschedule. Click any day to add a new event.', side: 'top' },
            { element: '[data-tour="heatmap"]', title: 'Squad Readiness', description: 'See your team\'s energy and stress distribution at a glance. Colour-coded by wellness scores from daily check-ins.', side: 'top' },
        ],
    },
    {
        pageId: 'roster',
        pageName: 'Roster',
        route: '/clients',
        steps: [
            { element: '[data-tour="team-list"]', title: 'Your Teams', description: 'Teams and squads are listed here. Click a team to expand and see its athletes. Use the grid/list toggle to switch views. Teams are collapsible.', side: 'bottom' },
            { element: '[data-tour="athlete-row"]', title: 'Athlete Profiles', description: 'Click any athlete to open their full profile — test results, training load history, wellness data, injury records, and goals all in one place.', side: 'bottom' },
            { element: '[data-tour="add-athlete"]', title: 'Add Athletes & Teams', description: 'Add new athletes or create new teams. Private clients are automatically grouped together in their own section.', side: 'left' },
        ],
    },
    {
        pageId: 'wellness',
        pageName: 'Wellness Hub',
        route: '/wellness',
        steps: [
            { element: '[data-tour="wellness-teams"]', title: 'Team Selection', description: 'Select a team to view their wellness responses, compliance rates, and flagged athletes. Each team card shows today\'s submission count.', side: 'bottom' },
            { element: '[data-tour="wellness-templates"]', title: 'Form Templates', description: 'View and manage questionnaire templates. The built-in Daily Wellness Check and Weekly Health Check are research-aligned (FIFA/IOC) and ready to use immediately.', side: 'left' },
        ],
    },
    {
        pageId: 'testing',
        pageName: 'Testing Hub',
        route: '/testing',
        steps: [
            { element: '[data-tour="test-categories"]', title: 'Test Categories', description: '80+ sport science test protocols organised by category — musculoskeletal, strength, speed, flexibility, aerobic, anthropometry, and more. Click a category to see its tests.', side: 'bottom' },
            { element: '[data-tour="test-tools"]', title: 'Comparison & Export', description: 'Compare athletes across tests with the Team Comparison tool, or export assessment data for external analysis in Excel, R, or Python.', side: 'bottom' },
        ],
    },
    {
        pageId: 'analytics',
        pageName: 'Analytics Hub',
        route: '/analytics',
        steps: [
            { element: '[data-tour="analytics-selector"]', title: 'Select Subject', description: 'First, choose who to analyse — an individual athlete or an entire team. All terminals adapt to your selection.', side: 'bottom' },
            { element: '[data-tour="analytics-modules"]', title: 'Analytics Terminals', description: 'Five analysis tools: Baseline Trends tracks test results over time, Performance Intelligence scores readiness, Scenario Modelling projects future load, Dose-Response links training to outcomes, and Force-Velocity builds F-V profiles.', side: 'bottom' },
        ],
    },
    {
        pageId: 'workouts',
        pageName: 'Workouts',
        route: '/workouts',
        steps: [
            { element: '[data-tour="workout-programs"]', title: 'Training Programs', description: 'Multi-day structured training programs with weeks, days, warm-up, workout, and cool-down sections. Click a program card to view it, or use the menu to edit or delete.', side: 'bottom' },
            { element: '[data-tour="workout-create"]', title: 'Create a Program', description: 'Click "Add Program" to open the program builder. You\'ll name the program, add training days, then fill each day with exercises from the 3,700+ exercise library.', side: 'left' },
            { element: '[data-tour="workout-packets"]', title: 'Workout Packets', description: 'Quick single-session workout templates. Perfect for one-off sessions. Create, assign, schedule, and share with athletes via link.', side: 'bottom' },
        ],
    },
    {
        pageId: 'reports',
        pageName: 'Reporting Hub',
        route: '/reports',
        steps: [
            { element: '[data-tour="report-cards"]', title: 'Reports', description: 'Four reporting modules: Heart Rate Metrics for HR zone analysis, Data Hub for daily activity logs, Tracking Hub for consolidated benchmarks, and GPS Data for importing sprint/distance/velocity telemetry from Catapult, STATSports, Polar, etc.', side: 'bottom' },
        ],
    },
    {
        pageId: 'conditioning',
        pageName: 'Conditioning Hub',
        route: '/conditioning',
        steps: [
            { element: '[data-tour="conditioning-main"]', title: 'Conditioning Modules', description: 'Three modules: Wattbike Protocols for power profiling, Conditioning Sessions for prescribing running/bike/sled work with sets, reps, and work:rest ratios, and Running Mechanics Library for technique reference.', side: 'bottom' },
        ],
    },
    {
        pageId: 'library',
        pageName: 'Exercise Library',
        route: '/library',
        steps: [
            { element: '[data-tour="library-search"]', title: 'Search & Filter', description: 'Search 3,700+ exercises by name, or filter by body region (upper/lower/core), classification (compound/isolation), or equipment. Use the alphabet filter for quick access.', side: 'bottom' },
            { element: '[data-tour="library-personal"]', title: 'My Library', description: 'Star exercises to save them to your personal library. These appear first when building workouts. Recently used exercises are suggested too.', side: 'bottom' },
        ],
    },
    {
        pageId: 'periodization',
        pageName: 'Planner',
        route: '/periodization',
        steps: [
            { element: '[data-tour="planner-main"]', title: 'Periodization Plans', description: 'Design training periodization for a team or individual. Create phases (e.g. Pre-Season, Competition), add blocks (e.g. Accumulation, Intensification), then drill into weekly views. Filter by team or athlete.', side: 'bottom' },
        ],
    },
    {
        pageId: 'settings',
        pageName: 'Settings',
        route: '/settings',
        steps: [
            { element: '[data-tour="settings-features"]', title: 'Feature Settings', description: 'Configure ACWR monitoring per team (choose load method, EWMA windows, rest-day handling), and manage which tests appear in the Testing Hub.', side: 'right' },
            { element: '[data-tour="settings-account"]', title: 'Account', description: 'Update your name, organisation, and contact details. Sign out from here.', side: 'right' },
            { element: '[data-tour="settings-walkthrough"]', title: 'Walkthrough', description: 'Restart or resume page tours and workflow guides from here at any time. Great for onboarding new staff.', side: 'right' },
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
            { element: '[data-tour="program-meta"]', title: 'Step 1: Name & Tags', description: 'Give your program a name (e.g. "Push Pull Legs") and optional tags for organisation. Tags help you filter programs later.', side: 'bottom' },
            { element: '[data-tour="program-day-sections"]', title: 'Step 2: Build Your Day', description: 'Each training day has three sections: Warm-Up, Workout, and Cool-Down. Click "Add an Exercise" in any section to search the 3,700+ exercise library and add movements.', side: 'bottom' },
            { element: '[data-tour="program-save-button"]', title: 'Step 3: Save', description: 'When you\'re happy with your program, click Save. If editing an existing program, you can also "Save as New" to create a copy without overwriting the original.', side: 'top' },
        ],
    },
    {
        id: 'wf_test_entry',
        name: 'Recording a Test Assessment',
        triggerElement: '[data-tour="test-field-inputs"]',
        parentPageId: 'testing',
        steps: [
            { element: '[data-tour="test-field-inputs"]', title: 'Enter Results', description: 'Fill in the test fields for the selected athlete. Required fields are marked. Some tests auto-calculate derived metrics (e.g. RSI from jump height and contact time).', side: 'bottom' },
            { element: '[data-tour="test-save-button"]', title: 'Save Assessment', description: 'Click Save to record the result. It will appear in the athlete\'s history, trend charts, and be available for analytics comparisons.', side: 'top' },
        ],
    },
    {
        id: 'wf_wellness_share',
        name: 'Sharing Wellness Forms',
        triggerElement: '[data-tour="share-template-picker"]',
        parentPageId: 'wellness',
        steps: [
            { element: '[data-tour="share-template-picker"]', title: 'Choose a Form', description: 'Select which form to share. The built-in Daily Wellness Check covers fatigue, soreness, sleep, stress, and mood. The Weekly Health Check is a FIFA/IOC-aligned injury classification form.', side: 'right' },
            { element: '[data-tour="share-actions"]', title: 'Share the Link', description: 'Copy the link and send it to your athletes via WhatsApp, email, or any messaging app. Athletes fill it in on their phone — no login required. Responses are tracked by date.', side: 'left' },
        ],
    },
    {
        id: 'wf_acwr_monitoring',
        name: 'ACWR Load Monitoring',
        triggerElement: '[data-tour="acwr-controls"]',
        parentPageId: 'wellness',
        steps: [
            { element: '[data-tour="acwr-team-selector"]', title: 'Select Team', description: 'Choose a team or private client to monitor. Only teams/athletes with ACWR enabled in Settings will appear here.', side: 'bottom' },
            { element: '[data-tour="acwr-log-button"]', title: 'Log Training Load', description: 'Manually enter training load for a session (RPE × duration, sprint distance, total distance, etc.) based on the method configured in Settings.', side: 'bottom' },
            { element: '[data-tour="acwr-csv-import"]', title: 'Import CSV', description: 'Bulk import training load data from a CSV file. The smart mapper auto-detects columns and matches athlete names.', side: 'bottom' },
        ],
    },
    {
        id: 'wf_conditioning_builder',
        name: 'Creating a Conditioning Session',
        triggerElement: '[data-tour="cond-meta-fields"]',
        parentPageId: 'conditioning',
        steps: [
            { element: '[data-tour="cond-meta-fields"]', title: 'Session Details', description: 'Name your session, choose a modality (running, cycling, rowing, sled, etc.), and set the total duration.', side: 'bottom' },
            { element: '[data-tour="cond-energy-system"]', title: 'Target Energy System', description: 'Select the energy system: Alactic (short explosive), Glycolytic (moderate intensity), Aerobic (endurance), or Mixed. This classifies the session for load tracking.', side: 'bottom' },
            { element: '[data-tour="cond-interval-sets"]', title: 'Interval Sets', description: 'Add sets with reps, work duration, rest duration, intensity, and inter-set rest. Build complex interval protocols like 4×4min at 90% with 3min rest.', side: 'bottom' },
        ],
    },
    {
        id: 'wf_analytics_terminal',
        name: 'Using Analytics Terminals',
        triggerElement: '[data-tour="analytics-dates"]',
        parentPageId: 'analytics',
        steps: [
            { element: '[data-tour="analytics-dates"]', title: 'Set Date Range', description: 'Adjust the analysis window. The terminal will filter all data to this range. Use broader ranges for trend analysis, narrower for recent performance snapshots.', side: 'left' },
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
