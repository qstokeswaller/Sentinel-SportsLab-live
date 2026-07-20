import type { PeriodizationPlan } from '../types/types';

/** Generate a unique ID */
export const uid = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/** Get the Monday of the week containing a given date */
export const getMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Set of block IDs whose date ranges genuinely overlap another block's in the plan.
 * Used to flag data-entry mistakes on the timeline (e.g. one block ending Jun 5 while
 * the next starts Jun 4). Inclusive day-range comparison; blocks with no endDate fall
 * back to their week count. Adjacent ranges (end Sun / start Mon) do NOT count.
 */
export const getOverlappingBlockIds = (plan: PeriodizationPlan): Set<string> => {
    const MS = 86400000;
    const off = (s: string) => Math.round(new Date(s + 'T00:00:00Z').getTime() / MS);
    const arr = (plan.phases || [])
        .flatMap(ph => ph.blocks || [])
        .filter(b => b.startDate)
        .map(b => {
            const s = off(b.startDate);
            const e = b.endDate ? off(b.endDate) : s + Math.max(b.weeks?.length || 1, 1) * 7 - 1;
            return { id: b.id, s, e: Math.max(s, e) };
        });
    const ids = new Set<string>();
    for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i].s <= arr[j].e && arr[j].s <= arr[i].e) { ids.add(arr[i].id); ids.add(arr[j].id); }
        }
    }
    return ids;
};

/** Convert a date string to a week index relative to plan start date (0-based) */
export const dateToWeekIndex = (dateStr: string, planStartDate: string): number => {
    const planStart = getMonday(new Date(planStartDate));
    const target = new Date(dateStr);
    const ms = target.getTime() - planStart.getTime();
    return Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
};

/** Convert a week index back to the Monday of that week */
export const weekIndexToDate = (weekIndex: number, planStartDate: string): string => {
    const planStart = getMonday(new Date(planStartDate));
    const d = new Date(planStart.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
};

/** Format a date string to short display (e.g. "Jan 6") */
export const formatDateShort = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Calculate total weeks to display for a plan */
export const calculateTotalWeeks = (plan: PeriodizationPlan): number => {
    let latestDate = plan.startDate;

    if (plan.endDate) {
        latestDate = plan.endDate;
    } else {
        // Find the latest date across all phases/blocks/events
        for (const phase of plan.phases) {
            if (phase.endDate > latestDate) latestDate = phase.endDate;
            for (const block of phase.blocks) {
                if (block.endDate > latestDate) latestDate = block.endDate;
            }
        }
        for (const event of plan.events) {
            if (event.date > latestDate) latestDate = event.date;
        }
    }

    const weeks = dateToWeekIndex(latestDate, plan.startDate) + 2; // +2 for padding
    return Math.max(weeks, 8); // minimum 8 weeks visible
};

/** Generate month labels for a date range */
export const getMonthLabels = (planStartDate: string, totalWeeks: number): { label: string; weekSpan: number; monthIdx: number }[] => {
    const start = getMonday(new Date(planStartDate));
    const months: { label: string; weekSpan: number; monthIdx: number }[] = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let currentMonth = start.getMonth();
    let currentYear = start.getFullYear();
    let span = 0;

    for (let w = 0; w < totalWeeks; w++) {
        const weekDate = new Date(start.getTime() + w * 7 * 24 * 60 * 60 * 1000);
        const m = weekDate.getMonth();
        const y = weekDate.getFullYear();

        if (m !== currentMonth || y !== currentYear) {
            if (span > 0) {
                months.push({
                    label: `${monthNames[currentMonth]} ${currentYear !== new Date().getFullYear() ? currentYear : ''}`.trim(),
                    weekSpan: span,
                    monthIdx: currentMonth
                });
            }
            currentMonth = m;
            currentYear = y;
            span = 1;
        } else {
            span++;
        }
    }
    // Push last month
    if (span > 0) {
        months.push({
            label: `${monthNames[currentMonth]} ${currentYear !== new Date().getFullYear() ? currentYear : ''}`.trim(),
            weekSpan: span,
            monthIdx: currentMonth
        });
    }

    return months;
};

/**
 * Normalise a periodization plan loaded from storage so every nested collection
 * is guaranteed to be an array. Defends downstream consumers (volume / intensity
 * calcs, TimelineView, MicrocyclesTab, etc.) from `xxx.weeks is not iterable`
 * style crashes when a partially-authored or legacy plan is missing a level.
 *
 * Safe to call on any plan shape — already-normalised plans pass through unchanged.
 */
export function normalisePlan(plan: any): any {
    if (!plan || typeof plan !== 'object') return plan;
    return {
        ...plan,
        phases: (plan.phases || []).map((ph: any) => ({
            ...ph,
            blocks: (ph?.blocks || []).map((b: any) => ({
                ...b,
                weeks: (b?.weeks || []).map((w: any) => ({
                    ...w,
                    sessions: (w?.sessions || []).map((s: any) => ({
                        ...s,
                        sections: (s?.sections || []).map((sec: any) => ({
                            ...sec,
                            exercises: sec?.exercises || [],
                        })),
                    })),
                })),
            })),
        })),
        events: plan.events || [],
        volumeOverrides: plan.volumeOverrides || {},
        intensityOverrides: plan.intensityOverrides || {},
    };
}

/** Calculate weekly volume from session data (normalized 0-10) */
export const calculateWeeklyVolume = (plan: PeriodizationPlan, totalWeeks: number): (number | null)[] => {
    const weeklyTotals: number[] = new Array(totalWeeks).fill(0);
    const hasSessions: boolean[] = new Array(totalWeeks).fill(false);

    // Defensive: any nested array can be undefined on a partially-authored plan
    // (e.g. a phase without blocks, a block without weeks). Treat missing as empty
    // so the calc proceeds and the affected weeks just stay at zero.
    for (const phase of (plan.phases || [])) {
        for (const block of (phase.blocks || [])) {
            for (const week of (block.weeks || [])) {
                const wIdx = dateToWeekIndex(week.startDate, plan.startDate);
                if (wIdx < 0 || wIdx >= totalWeeks) continue;
                for (const session of (week.sessions || [])) {
                    for (const section of (session.sections || [])) {
                        for (const ex of (section.exercises || [])) {
                            const reps = parseInt(ex.reps) || 0;
                            weeklyTotals[wIdx] += ex.sets * reps;
                            hasSessions[wIdx] = true;
                        }
                    }
                }
            }
        }
    }

    const max = Math.max(...weeklyTotals, 1);
    return weeklyTotals.map((v, i) => {
        if (plan.volumeOverrides?.[i] !== undefined) return plan.volumeOverrides[i];
        if (!hasSessions[i]) return null;
        return Math.round((v / max) * 10);
    });
};

/** Calculate weekly intensity from session data (normalized 0-10) */
export const calculateWeeklyIntensity = (plan: PeriodizationPlan, totalWeeks: number): (number | null)[] => {
    const weeklyRpe: number[][] = Array.from({ length: totalWeeks }, () => []);

    // Defensive null-coalesce on every level — see calculateWeeklyVolume for rationale.
    for (const phase of (plan.phases || [])) {
        for (const block of (phase.blocks || [])) {
            for (const week of (block.weeks || [])) {
                const wIdx = dateToWeekIndex(week.startDate, plan.startDate);
                if (wIdx < 0 || wIdx >= totalWeeks) continue;
                for (const session of (week.sessions || [])) {
                    if (session.plannedRPE) weeklyRpe[wIdx].push(session.plannedRPE);
                }
            }
        }
    }

    return weeklyRpe.map((rpes, i) => {
        if (plan.intensityOverrides?.[i] !== undefined) return plan.intensityOverrides[i];
        if (rpes.length === 0) return null;
        return Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length);
    });
};

/** Calculate peaking index: (intensity - volume + 5) clamped 0-10 */
export const calculatePeakingIndex = (volume: (number | null)[], intensity: (number | null)[]): (number | null)[] => {
    return volume.map((v, i) => {
        const iv = intensity[i];
        if (v === null || iv === null) return null;
        return Math.max(0, Math.min(10, iv - v + 5));
    });
};

/** Color presets for phases/blocks */
export const PHASE_COLOR_PRESETS = [
    '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

export const BLOCK_COLOR_PRESETS = [
    '#8b5cf6', '#ef4444', '#f97316', '#14b8a6', '#3b82f6',
    '#06b6d4', '#ec4899', '#84cc16', '#f59e0b', '#6366f1',
];

/** Standard (industry-built-in) training modalities — never deleted, only toggled per-plan */
export const STANDARD_MODALITIES = [
    'Strength', 'Plyometrics', 'Speed', 'Conditioning', 'Loaded Power',
] as const;

/** Backwards-compat alias — same value, used in older imports */
export const DEFAULT_MODALITY_PRESETS = STANDARD_MODALITIES as readonly string[];

/** Returns true if a modality name is one of the built-in standard ones */
export const isStandardModality = (m: string): boolean =>
    (STANDARD_MODALITIES as readonly string[]).includes(m);

/** Industry-standard intensity / volume level presets per standard modality.
 *  Used by the Timeline tab dropdowns to constrain valid values. Each list ends with
 *  an implicit "Custom…" escape hatch in the UI for unusual prescriptions. */
export const MODALITY_LEVEL_PRESETS: Record<string, string[]> = {
    'Strength':     ['None', 'Maintenance', 'Submax', 'Maximal', 'Max Integration', 'Individual'],
    'Plyometrics':  ['None', 'Intro', 'Limited', 'Moderate', 'High', 'Peak'],
    'Speed':        ['None', 'Intro', 'Limited', 'Balanced', 'High', 'Peak'],
    'Conditioning': ['None', 'Low', 'Moderate', 'High', 'Sport Specific'],
    'Loaded Power': ['None', 'Intro', 'Limited', 'Moderate', 'High', 'Peak'],
};

/** Returns the preset levels for a modality, or empty array if it's custom (no presets) */
export const getModalityLevels = (m: string): string[] => MODALITY_LEVEL_PRESETS[m] || [];

/** Industry-standard short descriptors for each standard modality — shown on hover */
export const MODALITY_DESCRIPTIONS: Record<string, string> = {
    'Strength':     'Maximal force production',
    'Plyometrics':  'Stretch-shortening cycle / reactive strength',
    'Speed':        'Maximum velocity and acceleration',
    'Conditioning': 'Aerobic + anaerobic energy systems',
    'Loaded Power': 'Force × velocity under load',
};

/** Returns the descriptor for a modality. Falls back to plan-level customDescriptions for custom modalities. */
export const getModalityDescription = (m: string, customDescriptions?: Record<string, string>): string => {
    return MODALITY_DESCRIPTIONS[m] || customDescriptions?.[m] || '';
};

// ── Target metric catalogue ────────────────────────────────────────────────────

export interface MetricDefinition {
    key: string;
    label: string;
    unit: string;
    defaultOp: '>=' | '<=' | '=' | 'between' | 'qualitative';
}

export interface CategoryDefinition {
    label: string;
    color: string;
    source: string;
    metrics: MetricDefinition[];
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
    competition: 'Competition',
    testing:     'Testing / Assessment',
    custom:      'Custom Event',
    travel:      'Travel',
    recovery:    'Recovery Block',
    camp:        'Training Camp',
    deadline:    'Deadline / Milestone',
    medical:     'Medical / Screening',
};

export const EVENT_TYPE_COLORS: Record<string, string> = {
    competition: '#f59e0b',
    testing:     '#6366f1',
    custom:      '#10b981',
    travel:      '#0ea5e9',
    recovery:    '#14b8a6',
    camp:        '#8b5cf6',
    deadline:    '#ef4444',
    medical:     '#ec4899',
};

export const METRIC_CATALOGUE: Record<string, CategoryDefinition> = {
    performance: {
        label: 'Performance',
        color: '#6366f1',
        source: 'Testing',
        metrics: [
            { key: 'yoyo_ir1',         label: 'Yo-Yo IR1',                     unit: 'm',          defaultOp: '>=' },
            { key: 'yoyo_ir2',         label: 'Yo-Yo IR2',                     unit: 'm',          defaultOp: '>=' },
            { key: 'cmj',              label: 'CMJ Height',                     unit: 'cm',         defaultOp: '>=' },
            { key: 'sprint_10m',       label: 'Sprint 10m',                     unit: 's',          defaultOp: '<=' },
            { key: 'sprint_20m',       label: 'Sprint 20m',                     unit: 's',          defaultOp: '<=' },
            { key: 'sprint_30m',       label: 'Sprint 30m',                     unit: 's',          defaultOp: '<=' },
            { key: 'sprint_40m',       label: 'Sprint 40m',                     unit: 's',          defaultOp: '<=' },
            { key: 'sprint_rep_avg',   label: '5×30m — Avg Split',             unit: 's',          defaultOp: '<=' },
            { key: 'sprint_rep_fi',    label: '5×30m — Fatigue Index',         unit: '%',          defaultOp: '<=' },
            { key: 'max_vel_field',    label: 'Max Velocity (Field Test)',      unit: 'km/h',       defaultOp: '>=' },
            { key: 'rsi',              label: 'Reactive Strength Index',        unit: '',           defaultOp: '>=' },
            { key: 'imtp',             label: 'Isometric Mid-Thigh Pull',      unit: 'N',          defaultOp: '>=' },
            { key: 'vo2_est',          label: 'Est. VO₂ Max',                  unit: 'mL/kg/min',  defaultOp: '>=' },
        ],
    },
    gps: {
        label: 'GPS & Match Output',
        color: '#0ea5e9',
        source: 'GPS / Match Data',
        metrics: [
            { key: 'total_distance',   label: 'Total Distance',                 unit: 'km',         defaultOp: '>=' },
            { key: 'hsr',              label: 'High-Speed Running (>19 km/h)', unit: 'm',          defaultOp: '>=' },
            { key: 'sprint_dist',      label: 'Sprint Distance (>25 km/h)',    unit: 'm',          defaultOp: '>=' },
            { key: 'max_vel_gps',      label: 'Max Velocity — GPS',            unit: 'km/h',       defaultOp: '>=' },
            { key: 'accelerations',    label: 'Accelerations',                  unit: 'count',      defaultOp: '>=' },
            { key: 'decelerations',    label: 'Decelerations',                  unit: 'count',      defaultOp: '>=' },
            { key: 'player_load',      label: 'Player Load',                   unit: 'AU',         defaultOp: '>=' },
            { key: 'dist_per_min',     label: 'Distance per Minute',           unit: 'm/min',      defaultOp: '>=' },
        ],
    },
    load: {
        label: 'Load Management',
        color: '#f59e0b',
        source: 'Load Management',
        metrics: [
            { key: 'acwr',             label: 'ACWR',                           unit: '',           defaultOp: 'between' },
            { key: 'weekly_load',      label: 'Weekly Training Load',          unit: 'AU',         defaultOp: '<=' },
            { key: 'session_rpe',      label: 'Avg Session RPE',               unit: '/10',        defaultOp: '<=' },
            { key: 'monotony',         label: 'Training Monotony',              unit: '',           defaultOp: '<=' },
            { key: 'strain',           label: 'Training Strain',               unit: 'AU',         defaultOp: '<=' },
            { key: 'sessions_pw',      label: 'Sessions per Week',             unit: '',           defaultOp: '=' },
            { key: 'availability',     label: 'Player Availability',           unit: '%',          defaultOp: '>=' },
        ],
    },
    wellness: {
        label: 'Wellness',
        color: '#10b981',
        source: 'Wellness Hub',
        metrics: [
            { key: 'wellness_score',   label: 'Overall Wellness Score',        unit: '/10',        defaultOp: '>=' },
            { key: 'sleep_quality',    label: 'Sleep Quality',                  unit: '/10',        defaultOp: '>=' },
            { key: 'sleep_duration',   label: 'Sleep Duration',                unit: 'hrs',        defaultOp: '>=' },
            { key: 'fatigue',          label: 'Fatigue',                        unit: '/10',        defaultOp: '<=' },
            { key: 'soreness',         label: 'Muscle Soreness',               unit: '/10',        defaultOp: '<=' },
            { key: 'mood',             label: 'Mood',                           unit: '/10',        defaultOp: '>=' },
            { key: 'stress',           label: 'Stress',                         unit: '/10',        defaultOp: '<=' },
            { key: 'energy',           label: 'Energy Level',                  unit: '/10',        defaultOp: '>=' },
            { key: 'readiness',        label: 'Perceived Readiness',           unit: '/10',        defaultOp: '>=' },
        ],
    },
    injury: {
        label: 'Injury & Medical',
        color: '#ef4444',
        source: 'Injury Hub',
        metrics: [
            { key: 'injury_count',     label: 'Injury Incidence',              unit: 'count',      defaultOp: '<=' },
            { key: 'days_lost',        label: 'Days Lost — Injury',            unit: 'days',       defaultOp: '<=' },
            { key: 'time_loss',        label: 'Time-Loss Injuries',            unit: 'count',      defaultOp: '<=' },
            { key: 'avail_medical',    label: 'Player Availability',           unit: '%',          defaultOp: '>=' },
            { key: 'injury_burden',    label: 'Injury Burden',                 unit: 'days/1000h', defaultOp: '<=' },
        ],
    },
    physical: {
        label: 'Body Composition',
        color: '#8b5cf6',
        source: 'Testing / Medical',
        metrics: [
            { key: 'body_weight',      label: 'Body Weight',                   unit: 'kg',         defaultOp: '=' },
            { key: 'body_fat',         label: 'Body Fat %',                    unit: '%',          defaultOp: '<=' },
            { key: 'lean_mass',        label: 'Lean Muscle Mass',              unit: 'kg',         defaultOp: '>=' },
            { key: 'bmi',              label: 'BMI',                           unit: '',           defaultOp: 'between' },
        ],
    },
    tactical: {
        label: 'Tactical / Match',
        color: '#f97316',
        source: 'Match Stats',
        metrics: [
            { key: 'possession',       label: 'Team Possession %',             unit: '%',          defaultOp: '>=' },
            { key: 'pass_completion',  label: 'Pass Completion %',             unit: '%',          defaultOp: '>=' },
            { key: 'press_events',     label: 'High-Intensity Pressing Events', unit: 'count',     defaultOp: '>=' },
            { key: 'goals_scored',     label: 'Goals Scored',                  unit: 'count',      defaultOp: '>=' },
            { key: 'goals_conceded',   label: 'Goals Conceded',                unit: 'count',      defaultOp: '<=' },
            { key: 'xg',              label: 'Expected Goals (xG)',            unit: 'xG',         defaultOp: '>=' },
            { key: 'def_duels',        label: 'Defensive Duels Won %',        unit: '%',          defaultOp: '>=' },
            { key: 'aerial_duels',     label: 'Aerial Duels Won %',           unit: '%',          defaultOp: '>=' },
        ],
    },
};
