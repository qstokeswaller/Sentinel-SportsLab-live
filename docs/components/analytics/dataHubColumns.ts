// ── Data Hub column registry ────────────────────────────────────────────────
// Single source of truth for every column the Data Hub can render. Each entry
// declares the group/subsection it belongs to, the kind of data it represents,
// whether it supports multi-date history, and a per-column resolver that
// returns { value, date } for a given player on a given history index.
//
// `index = 0` is always the most recent data point. Multi-date columns can
// resolve index 1..N for the comparison view.
//
// Data-source audit (see chat thread): every column below has a docstring above
// it stating the exact backing source so we don't end up with two interpretations
// of "RPE" or "Injury Status" again.

import { RM_EXERCISE_MAP } from '../../utils/constants';
import { byBodyPartToRegions } from '../../utils/plannedTonnage';

export type DataPoint = { value: any; date: string | null };

export interface ColumnDef {
    /** Unique key — survives rename of the label */
    key: string;
    /** Display label */
    label: string;
    /** Group ID — left-rail bucket in the selector modal */
    group: string;
    /** Optional subsection within a group (e.g. Force/Velocity inside Testing Hub) */
    subsection?: string;
    /** Show this column by default in a fresh session */
    defaultOn?: boolean;
    /** Can the column show historical data points? (false = latest only) */
    supportsHistory: boolean;
    /** Soft data-freshness budget in days. Older data renders with a stale tint. */
    staleAfterDays?: number;
    /** Column is gated on team-level configuration (e.g. GPS, ACWR). Renders
     *  "Not configured" when the team scope is missing the config. */
    requiresConfig?: 'gps' | 'acwr' | null;
    /** Resolver: returns { value, date } for the given history index */
    resolve: (ctx: ResolveCtx, index: number) => DataPoint;
    /** Cell renderer hint — drives chip vs plain rendering. Default = 'plain' */
    renderHint?: 'plain' | 'acwr' | 'availability' | 'injury' | 'rpe' | 'dsi' | 'kg' | 'numeric' | 'percent' | 'load';
    /** Units suffix appended in plain numeric renders */
    unit?: string;
    /** Default # of decimal places for numeric values */
    fractionDigits?: number;
}

export interface ResolveCtx {
    player: any;
    /** Sorted wellness responses for this athlete, newest first */
    wellnessSorted: any[];
    /** Sorted performanceMetrics for this athlete, newest first */
    perfSorted: any[];
    /** Athlete's open injury reports — `status !== 'resolved'`, newest first */
    activeInjuries: any[];
    /** All injury reports for this athlete (incl. resolved) sorted newest first */
    allInjuries: any[];
    /** Latest N completed scheduled sessions for this athlete, newest first */
    completedSessions: any[];
    /** This athlete's planned tonnage log rows (newest first). Source of truth
     *  for all tonnage columns under the new "plan-time tracking" model. */
    plannedTonnage: any[];
    /** This athlete's training load records, newest first */
    loadRecords: any[];
    /** This athlete's 1RM history rows (from maxHistory), newest first */
    maxHistory: any[];
    /** This athlete's GPS records, newest first */
    gpsRecords: any[];
    /** ACWR scalar from calculateACWR — single value, no history yet */
    acwrScalar: string | number;
    /** Team config flags so columns can return "Not configured" appropriately */
    teamConfig: { hasACWR: boolean; hasGPS: boolean };
    /** Exercise metadata lookup so per-region tonnage can resolve body parts */
    exerciseFullMap: Record<string, any>;
}

// ── Body-part → region map (mirrors ReportingHubPage so Tracking Hub and Data
// Hub never split tonnage differently). Exercises whose body parts aren't in
// this map fall back to "Full Body" so general tonnage is never lost.
export const BODY_PART_TO_REGION: Record<string, string> = {
    'Chest': 'Upper Body', 'Back': 'Upper Body', 'Shoulders': 'Upper Body', 'Biceps': 'Upper Body',
    'Triceps': 'Upper Body', 'Forearms': 'Upper Body', 'Trapezius': 'Upper Body',
    'Quadriceps': 'Lower Body', 'Hamstrings': 'Lower Body', 'Glutes': 'Lower Body',
    'Calves': 'Lower Body', 'Hip Flexors': 'Lower Body', 'Adductors': 'Lower Body',
    'Abductors': 'Lower Body', 'Shins': 'Lower Body',
    'Abdominals': 'Core',
};

// (Per-session tonnage helpers moved to docs/utils/plannedTonnage.ts and now
// run at packet/program SCHEDULE time, persisting to planned_tonnage_log. The
// resolver path here just reads from that log — no live aggregation needed.)

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Canonical availability resolver. Wellness responses can store availability
 * either at the top level (`res.availability`) or nested under the questionnaire
 * payload (`res.responses.availability`). Some payloads use sentence forms like
 * "Fully Available — full training". Normalize all of it down to one of:
 * 'available' | 'modified' | 'unavailable' | undefined.
 *
 * Mirrors the logic in `WellnessHub.tsx` so the two surfaces never disagree.
 */
export function resolveAvailability(res: any): 'available' | 'modified' | 'unavailable' | undefined {
    if (!res) return undefined;
    const top = res?.availability;
    if (top === 'available' || top === 'modified' || top === 'unavailable') return top;
    const raw: string = res?.responses?.availability || '';
    if (!raw) return undefined;
    const low = String(raw).toLowerCase();
    if (raw === 'available' || low.includes('fully available') || low === 'available') return 'available';
    if (raw === 'modified'  || low.includes('modified'))                                 return 'modified';
    if (raw === 'unavailable' || low.includes('unavailable'))                            return 'unavailable';
    return undefined;
}

const pickWellness = (ctx: ResolveCtx, idx: number): any | null => ctx.wellnessSorted[idx] || null;

// Wellness responses can land on either the top-level column (legacy direct
// form) OR nested under `responses.X` (the FIFA daily wellness form persists
// scores into the responses JSONB). Without this fallback every athlete using
// the FIFA form would show '—' for fatigue/soreness/sleep/stress/mood/RPE in
// the Data Hub. Mirrors the canonical availability resolver pattern.
function readWellnessField(w: any, keys: string[]): any {
    if (!w) return null;
    for (const k of keys) {
        if (w[k] != null && w[k] !== '') return w[k];
        if (w.responses && w.responses[k] != null && w.responses[k] !== '') return w.responses[k];
    }
    return null;
}
const pickPerf = (ctx: ResolveCtx, idx: number, type: string): any | null =>
    ctx.perfSorted.filter(m => m.type === type)[idx] || null;
const pickSession = (ctx: ResolveCtx, idx: number): any | null => ctx.completedSessions[idx] || null;
const pickMaxByExercise = (ctx: ResolveCtx, idx: number, exerciseName: string): any | null =>
    ctx.maxHistory.filter(m => m.exercise === exerciseName)[idx] || null;
const pickGps = (ctx: ResolveCtx, idx: number): any | null => ctx.gpsRecords[idx] || null;

// Hamstring peak across left/right legs
const hamPeak = (m: any) => {
    if (!m) return null;
    const l = parseFloat(m.leftPeak || m.left || m.value || 0);
    const r = parseFloat(m.rightPeak || m.right || 0);
    const v = Math.max(l, r);
    return Number.isFinite(v) && v > 0 ? v : (m.value ?? null);
};

// Rolling average helper — mean of a wellness field across the last N days.
// Honors the same top-level → responses.X fallback as readWellnessField so
// FIFA-form rows aren't silently excluded from the average.
function rollingAvg(items: any[], field: string, lookbackDays: number, asOfIdx: number = 0): { avg: number | null; firstDate: string | null } {
    if (!items || items.length === 0) return { avg: null, firstDate: null };
    const anchor = items[asOfIdx];
    if (!anchor?.session_date) return { avg: null, firstDate: null };
    const anchorTs = new Date(anchor.session_date).getTime();
    const minTs = anchorTs - lookbackDays * 86400000;
    const read = (r: any) => {
        if (r[field] != null && r[field] !== '') return parseFloat(r[field]);
        if (r.responses && r.responses[field] != null && r.responses[field] !== '') return parseFloat(r.responses[field]);
        return NaN;
    };
    const inWindow = items.filter(r => {
        const t = new Date(r.session_date).getTime();
        if (t < minTs || t > anchorTs) return false;
        return !isNaN(read(r));
    });
    if (inWindow.length === 0) return { avg: null, firstDate: null };
    const sum = inWindow.reduce((s, r) => s + read(r), 0);
    return { avg: sum / inWindow.length, firstDate: inWindow[inWindow.length - 1].session_date };
}

// Get the per-exercise 1RM columns — generated from RM_EXERCISE_MAP so the
// list stays in sync with the rest of the app's 1RM vocabulary.
const ONE_RM_EXERCISES = [...new Set(Object.values(RM_EXERCISE_MAP))].sort();

const oneRmColumns: ColumnDef[] = ONE_RM_EXERCISES.map(ex => ({
    key: `oneRM_${ex.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    label: `1RM — ${ex}`,
    group: 'Performance',
    subsection: '1RM',
    supportsHistory: true,
    staleAfterDays: 180,
    resolve: (ctx, i) => {
        const m = pickMaxByExercise(ctx, i, ex);
        return { value: m?.weight ?? null, date: m?.date || null };
    },
    renderHint: 'kg',
}));

// Default GPS metric keys we surface — these are the most-common keys across
// providers. If a team's import doesn't contain them, the resolver returns null
// and the column renders the "Not configured" / "No data" state automatically.
const GPS_METRIC_KEYS: Array<{ key: string; label: string; rawKeys: string[]; unit?: string }> = [
    { key: 'gps_total_distance', label: 'Total Distance', rawKeys: ['total_distance', 'Total Distance', 'distance'], unit: 'm' },
    { key: 'gps_hsr',            label: 'High-Speed Running', rawKeys: ['hsr_distance', 'HSR Distance', 'high_speed_distance', 'HSR'], unit: 'm' },
    { key: 'gps_sprints',        label: 'Sprint Count', rawKeys: ['sprint_count', 'Sprint Count', 'sprints'] },
    { key: 'gps_max_speed',      label: 'Max Speed', rawKeys: ['max_speed', 'Max Speed', 'top_speed'], unit: 'km/h' },
    { key: 'gps_accel',          label: 'Accelerations', rawKeys: ['accelerations', 'Accelerations', 'high_accel'] },
    { key: 'gps_decel',          label: 'Decelerations', rawKeys: ['decelerations', 'Decelerations', 'high_decel'] },
];

const gpsResolve = (rawKeys: string[]) => (ctx: ResolveCtx, i: number): DataPoint => {
    const rec = pickGps(ctx, i);
    if (!rec) return { value: null, date: null };
    const raw = rec.rawColumns || rec;
    for (const k of rawKeys) {
        if (raw[k] != null && raw[k] !== '') {
            const num = parseFloat(raw[k]);
            return { value: Number.isFinite(num) ? num : raw[k], date: rec.date || null };
        }
    }
    return { value: null, date: rec.date || null };
};

const gpsColumns: ColumnDef[] = GPS_METRIC_KEYS.map(m => ({
    key: m.key,
    label: m.label,
    group: 'GPS',
    subsection: m.label.includes('Distance') || m.label.includes('Running') ? 'Volume' : m.label.includes('Speed') ? 'Intensity' : m.label.includes('Sprint') ? 'Intensity' : 'Acceleration',
    supportsHistory: true,
    staleAfterDays: 14,
    requiresConfig: 'gps',
    resolve: gpsResolve(m.rawKeys),
    renderHint: 'numeric',
    unit: m.unit,
}));

// ── Column registry ────────────────────────────────────────────────────────
export const COLUMNS: ColumnDef[] = [
    // ─── Athlete profile ─────────────────────────────────────────────────
    {
        key: 'squad', label: 'Squad', group: 'Athlete', defaultOn: true,
        supportsHistory: false,
        resolve: (ctx) => ({ value: ctx.player.__squad ?? null, date: null }),
    },
    {
        key: 'position', label: 'Position', group: 'Athlete',
        supportsHistory: false,
        resolve: (ctx) => ({ value: ctx.player.position || null, date: null }),
    },

    // ─── Wellness — daily check-in ───────────────────────────────────────
    // SOURCE: `wellness_responses` table (Wellness Hub → Daily check-in form)
    {
        key: 'lastCheckin', label: 'Last Check-In', group: 'Wellness', defaultOn: true,
        supportsHistory: false, staleAfterDays: 3,
        resolve: (ctx) => {
            const w = pickWellness(ctx, 0);
            return { value: w?.session_date || null, date: w?.session_date || null };
        },
        renderHint: 'plain',
    },
    {
        key: 'wellnessRPE', label: 'Wellness RPE', group: 'Wellness', defaultOn: true,
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            return { value: readWellnessField(w, ['rpe']), date: w?.session_date || null };
        },
        renderHint: 'rpe',
    },
    {
        key: 'fatigue', label: 'Fatigue', group: 'Wellness',
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            return { value: readWellnessField(w, ['fatigue']), date: w?.session_date || null };
        },
        renderHint: 'numeric',
    },
    // Sleep is captured as two distinct fields by the FIFA daily form:
    //   • sleep_quality (1-10 score)
    //   • sleep_hours (numeric hours)
    // Surface both so a scientist can see "good sleep / not enough" vs "long sleep / low quality" mismatches.
    {
        key: 'sleepQuality', label: 'Sleep Quality', group: 'Wellness',
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            // Legacy forms wrote 'sleep' top-level; FIFA writes 'sleep_quality' nested under responses.
            return { value: readWellnessField(w, ['sleep_quality', 'sleep']), date: w?.session_date || null };
        },
        renderHint: 'numeric',
    },
    {
        key: 'sleepHours', label: 'Sleep Hours', group: 'Wellness',
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            return { value: readWellnessField(w, ['sleep_hours']), date: w?.session_date || null };
        },
        renderHint: 'numeric', fractionDigits: 1, unit: 'h',
    },
    {
        key: 'soreness', label: 'Soreness', group: 'Wellness',
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            return { value: readWellnessField(w, ['soreness']), date: w?.session_date || null };
        },
        renderHint: 'numeric',
    },
    {
        key: 'mood', label: 'Mood', group: 'Wellness',
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            return { value: readWellnessField(w, ['mood']), date: w?.session_date || null };
        },
        renderHint: 'numeric',
    },
    {
        key: 'stress', label: 'Stress', group: 'Wellness',
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            return { value: readWellnessField(w, ['stress']), date: w?.session_date || null };
        },
        renderHint: 'numeric',
    },
    // Rolling averages — useful for trend studies without leaving the table.
    // Note: rollingAvg only reads top-level columns. For FIFA-form data the
    // equivalent value lives under `responses.X` — when we wire historical
    // rolling-avg for those, the helper needs the same fallback. For now,
    // most cohorts use the direct form so the top-level path covers them.
    {
        key: 'fatigue_7d', label: 'Fatigue (7d avg)', group: 'Wellness',
        supportsHistory: false, staleAfterDays: 7,
        resolve: (ctx) => {
            const { avg, firstDate } = rollingAvg(ctx.wellnessSorted, 'fatigue', 7);
            return { value: avg, date: firstDate };
        },
        renderHint: 'numeric', fractionDigits: 1,
    },
    {
        key: 'sleepQuality_7d', label: 'Sleep Quality (7d avg)', group: 'Wellness',
        supportsHistory: false, staleAfterDays: 7,
        resolve: (ctx) => {
            const { avg, firstDate } = rollingAvg(ctx.wellnessSorted, 'sleep_quality', 7);
            return { value: avg, date: firstDate };
        },
        renderHint: 'numeric', fractionDigits: 1,
    },
    {
        key: 'wellnessCompliance7d', label: 'Wellness Compliance % (7d)', group: 'Wellness',
        supportsHistory: false, staleAfterDays: 7,
        resolve: (ctx) => {
            // Count distinct days with a wellness response in the last 7 days vs the 7-day window
            const now = Date.now();
            const cutoff = now - 7 * 86400000;
            const days = new Set<string>();
            for (const r of ctx.wellnessSorted) {
                const t = new Date(r.session_date).getTime();
                if (t >= cutoff && t <= now) days.add(r.session_date.slice(0, 10));
            }
            const pct = (days.size / 7) * 100;
            // Date here is informational — the latest response in the window
            const firstInWindow = ctx.wellnessSorted.find(r => new Date(r.session_date).getTime() >= cutoff);
            return { value: pct, date: firstInWindow?.session_date || null };
        },
        renderHint: 'percent',
    },

    // ─── Availability ─────────────────────────────────────────────────────
    // SOURCE: `wellness_responses` (canonical resolveAvailability)
    {
        key: 'availability', label: 'Availability', group: 'Availability', defaultOn: true,
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            return { value: resolveAvailability(w) || null, date: w?.session_date || null };
        },
        renderHint: 'availability',
    },
    // Daily Pain Flags — athlete's same-day body-map self-report (NOT a formal injury)
    {
        key: 'painFlags', label: 'Daily Pain Flags', group: 'Availability', defaultOn: false,
        supportsHistory: true, staleAfterDays: 3,
        resolve: (ctx, i) => {
            const w = pickWellness(ctx, i);
            const count = w?.injury_report?.areas?.length || 0;
            return { value: count > 0 ? `${count} area${count === 1 ? '' : 's'}` : null, date: w?.session_date || null };
        },
        renderHint: 'plain',
    },
    // Active Injury — formal injury record from the InjuryReport flow.
    // SOURCE: `injury_reports` table, filtered to status !== 'resolved'.
    {
        key: 'activeInjury', label: 'Active Injury', group: 'Availability', defaultOn: true,
        supportsHistory: false, staleAfterDays: undefined,
        resolve: (ctx) => {
            const inj = ctx.activeInjuries[0];
            if (!inj) return { value: 'Clear', date: null };
            // Build a short label like "Hamstring (Severe)" or just the body part
            const part = inj.bodyPart || inj.body_part || inj.location || 'Injury';
            const sev = inj.severityGrade || inj.severity_grade || inj.severity;
            const sevLabel = sev === 3 ? 'Severe' : sev === 2 ? 'Moderate' : sev === 1 ? 'Mild' : null;
            return { value: sevLabel ? `${part} (${sevLabel})` : part, date: inj.dateOfInjury || inj.date_of_injury || null };
        },
        renderHint: 'injury',
    },

    // ─── ACWR ──────────────────────────────────────────────────────────────
    // SOURCE: `load_records` via calculateACWR helper. Single scalar today.
    {
        key: 'acwr', label: 'ACWR', group: 'ACWR', defaultOn: true,
        supportsHistory: false, staleAfterDays: 14, requiresConfig: 'acwr',
        resolve: (ctx) => ({ value: ctx.acwrScalar, date: null }),
        renderHint: 'acwr',
    },
    {
        key: 'recentLoad7d', label: 'Recent Load sRPE (7d)', group: 'ACWR',
        supportsHistory: false, staleAfterDays: 7,
        resolve: (ctx) => {
            // Sum of (rpe × duration) over the last 7 days. Matches the canonical sRPE formula.
            const now = Date.now();
            const cutoff = now - 7 * 86400000;
            let sum = 0;
            let mostRecent: string | null = null;
            for (const l of ctx.loadRecords) {
                const t = new Date(l.date).getTime();
                if (t < cutoff || t > now) continue;
                const rpe = parseFloat(l.rpe || l.sRPE || 0);
                const dur = parseFloat(l.duration || l.minutes || 0);
                if (rpe > 0 && dur > 0) sum += rpe * dur;
                if (!mostRecent || l.date > mostRecent) mostRecent = l.date;
            }
            return { value: sum > 0 ? Math.round(sum) : null, date: mostRecent };
        },
        renderHint: 'numeric', unit: 'AU',
    },

    // ─── Workouts (session load only) ─────────────────────────────────────
    // SOURCE: `scheduled_sessions.load` — the coach-tagged Low/Medium/High
    // intensity that flows through from the Packet's Load picker on schedule.
    // Programs don't carry a load field, so program-scheduled sessions render
    // empty here (which is correct, not a bug).
    //
    // We intentionally do NOT surface:
    //   • Session RPE (actual) — the only capture is CompleteSessionModal, and
    //     even there it's a single value per team session (not per athlete).
    //     The canonical per-athlete RPE flow is the Daily Wellness form →
    //     `wellnessRPE` column.
    //   • Session duration — `actual_duration` is never populated by any
    //     capture flow; `planned_duration` is hard-coded to 60 at schedule
    //     time. Showing this would mislead every row to "60 min".
    //   • Last Workout title — workout names are descriptive of the
    //     prescription, not of athlete state. The data hub is for athlete
    //     state, not session catalog.
    // If any of those gain a real per-athlete capture flow later, re-add here.
    {
        key: 'sessionLoad', label: 'Session Load (planned)', group: 'Workouts', defaultOn: true,
        supportsHistory: true, staleAfterDays: 7,
        resolve: (ctx, i) => {
            const s = pickSession(ctx, i);
            return { value: s?.load ?? null, date: s?.date || null };
        },
        renderHint: 'load',
    },
    // Tonnage — pulled from the planned_tonnage_log table written on packet/
    // program schedule. Per-athlete totals are computed from prescription rows
    // (sets × reps × weight, honoring weightroom-sheet per-athlete overrides).
    // For packets one row per scheduled date; for programs one row per
    // non-rest day mapped onto the calendar.
    {
        key: 'lastSessionTonnage', label: 'Last Session Tonnage', group: 'Workouts',
        supportsHistory: true, staleAfterDays: 14,
        resolve: (ctx, i) => {
            const row = ctx.plannedTonnage[i];
            // Supabase returns NUMERIC as a string in some setups — coerce so chip rendering works
            const v = row ? parseFloat(row.total_tonnage) : null;
            return { value: Number.isFinite(v as number) ? v : null, date: row?.date || null };
        },
        renderHint: 'numeric', unit: 'kg',
    },
    {
        key: 'tonnage_7d', label: 'Tonnage (7d sum)', group: 'Workouts',
        supportsHistory: false, staleAfterDays: 7,
        resolve: (ctx) => {
            const now = Date.now();
            const cutoff = now - 7 * 86400000;
            let sum = 0;
            let mostRecent: string | null = null;
            for (const r of ctx.plannedTonnage) {
                const t = new Date(r.date).getTime();
                if (!Number.isFinite(t) || t < cutoff || t > now) continue;
                sum += parseFloat(r.total_tonnage) || 0;
                if (!mostRecent || r.date > mostRecent) mostRecent = r.date;
            }
            return { value: sum > 0 ? Math.round(sum) : null, date: mostRecent };
        },
        renderHint: 'numeric', unit: 'kg',
    },
    // Per-region tonnage (7d) — mirrors the Tracking Hub split. Exercises with
    // no body parts assigned fall into Full Body so general tonnage stays
    // accounted for. Defaulted off because they're a power-user breakdown;
    // turn on what you need via the Columns modal.
    ...(['Upper Body', 'Lower Body', 'Core', 'Full Body'] as const).map(region => ({
        key: `tonnage_${region.toLowerCase().replace(/\s+/g, '_')}_7d`,
        label: `${region} Tonnage (7d)`,
        group: 'Workouts',
        subsection: 'Tonnage by Region',
        supportsHistory: false,
        staleAfterDays: 7,
        resolve: (ctx: ResolveCtx): DataPoint => {
            const now = Date.now();
            const cutoff = now - 7 * 86400000;
            let sum = 0;
            let mostRecent: string | null = null;
            for (const r of ctx.plannedTonnage) {
                const t = new Date(r.date).getTime();
                if (!Number.isFinite(t) || t < cutoff || t > now) continue;
                // Map this row's by_body_part split into regions and pick the requested region
                const regions = byBodyPartToRegions(r.by_body_part || {});
                if (regions[region] > 0) sum += regions[region];
                if (!mostRecent || r.date > mostRecent) mostRecent = r.date;
            }
            return { value: sum > 0 ? Math.round(sum) : null, date: mostRecent };
        },
        renderHint: 'numeric' as const,
        unit: 'kg',
    })),

    // ─── Performance — Hamstring ───────────────────────────────────────────
    // SOURCE: `performance_assessments` where test_type='hamstring' (Testing Hub)
    {
        key: 'hamstring', label: 'Hamstring Peak (N/kg)', group: 'Performance', subsection: 'Hamstring',
        defaultOn: true, supportsHistory: true, staleAfterDays: 90,
        resolve: (ctx, i) => {
            const m = pickPerf(ctx, i, 'hamstring');
            return { value: hamPeak(m), date: m?.date || null };
        },
        renderHint: 'numeric', fractionDigits: 2,
    },
    {
        key: 'hamstring_left', label: 'Hamstring Left', group: 'Performance', subsection: 'Hamstring',
        supportsHistory: true, staleAfterDays: 90,
        resolve: (ctx, i) => {
            const m = pickPerf(ctx, i, 'hamstring');
            const v = m ? parseFloat(m.leftPeak || m.left || 0) : null;
            return { value: v || null, date: m?.date || null };
        },
        renderHint: 'numeric', fractionDigits: 2,
    },
    {
        key: 'hamstring_right', label: 'Hamstring Right', group: 'Performance', subsection: 'Hamstring',
        supportsHistory: true, staleAfterDays: 90,
        resolve: (ctx, i) => {
            const m = pickPerf(ctx, i, 'hamstring');
            const v = m ? parseFloat(m.rightPeak || m.right || 0) : null;
            return { value: v || null, date: m?.date || null };
        },
        renderHint: 'numeric', fractionDigits: 2,
    },
    {
        key: 'hamstring_asymmetry', label: 'Hamstring Asymmetry %', group: 'Performance', subsection: 'Hamstring',
        supportsHistory: true, staleAfterDays: 90,
        resolve: (ctx, i) => {
            const m = pickPerf(ctx, i, 'hamstring');
            if (!m) return { value: null, date: null };
            const l = parseFloat(m.leftPeak || m.left || 0);
            const r = parseFloat(m.rightPeak || m.right || 0);
            if (!l || !r) return { value: null, date: m.date || null };
            const asym = Math.abs(l - r) / Math.max(l, r) * 100;
            return { value: asym, date: m.date || null };
        },
        renderHint: 'numeric', fractionDigits: 1, unit: '%',
    },

    // ─── Performance — 1RM per exercise ────────────────────────────────────
    // SOURCE: `maxHistory[]` (which aggregates Testing Hub `rm_*` rows AND
    // Performance Lab 1rm estimates). One column per exercise so "Squat 1RM"
    // and "Bench 1RM" don't fight for a single column slot.
    ...oneRmColumns,

    // ─── Performance — DSI ─────────────────────────────────────────────────
    // SOURCE: `performance_assessments` where test_type='dsi'
    {
        key: 'dsi', label: 'DSI Score', group: 'Performance', subsection: 'DSI',
        defaultOn: true, supportsHistory: true, staleAfterDays: 90,
        resolve: (ctx, i) => {
            const m = pickPerf(ctx, i, 'dsi');
            return { value: m ? parseFloat(m.value).toFixed(2) : null, date: m?.date || null };
        },
        renderHint: 'dsi',
    },
    {
        key: 'dsiCategory', label: 'DSI Category', group: 'Performance', subsection: 'DSI',
        supportsHistory: true, staleAfterDays: 90,
        resolve: (ctx, i) => {
            const m = pickPerf(ctx, i, 'dsi');
            return { value: m?.category || null, date: m?.date || null };
        },
        renderHint: 'plain',
    },

    // ─── Performance — RSI ─────────────────────────────────────────────────
    // SOURCE: `performance_assessments` where test_type='rsi'
    {
        key: 'rsi', label: 'RSI Score', group: 'Performance', subsection: 'RSI',
        supportsHistory: true, staleAfterDays: 90,
        resolve: (ctx, i) => {
            const m = pickPerf(ctx, i, 'rsi');
            return { value: m?.value ?? null, date: m?.date || null };
        },
        renderHint: 'numeric', fractionDigits: 2,
    },

    // ─── GPS ──────────────────────────────────────────────────────────────
    // SOURCE: `gpsData[]` — flexible per-provider columns surfaced through
    // `rawColumns`. Gated on team-level GPS configuration.
    ...gpsColumns,
];

// ── Group + subsection layout for the modal left rail ─────────────────────
export const GROUP_ORDER = ['Athlete', 'Wellness', 'Availability', 'ACWR', 'Workouts', 'Performance', 'GPS'];

export const GROUP_DESCRIPTIONS: Record<string, string> = {
    Athlete: 'Identity columns — name, squad, position. Always visible.',
    Wellness: 'Daily check-in scores. Source: wellness_responses (Wellness Hub).',
    Availability: 'Availability status + formal active injuries + same-day pain flags.',
    ACWR: 'Acute:Chronic Workload Ratio + recent training load. Requires ACWR config in Settings.',
    Workouts: 'Last completed session data — date, session RPE, duration. Source: scheduled_sessions.',
    Performance: 'Tested capacities — strength, hamstring, jumps. Source: Testing Hub.',
    GPS: 'Movement telemetry. Requires GPS data import.',
};

export const getSubsectionsForGroup = (group: string): string[] => {
    const seen = new Set<string>();
    const order: string[] = [];
    COLUMNS.filter(c => c.group === group).forEach(c => {
        if (c.subsection && !seen.has(c.subsection)) {
            seen.add(c.subsection);
            order.push(c.subsection);
        }
    });
    return order;
};

export const getColumnsForGroup = (group: string, subsection?: string): ColumnDef[] =>
    COLUMNS.filter(c => c.group === group && (subsection ? c.subsection === subsection : true));

export const findColumn = (key: string): ColumnDef | undefined => COLUMNS.find(c => c.key === key);

export const DEFAULT_VISIBLE_KEYS: string[] =
    COLUMNS.filter(c => c.defaultOn).map(c => c.key);
