// WellnessHub shared helpers + types.
// Extracted verbatim from WellnessHub.tsx (restructure step 1, 2026-07-12) —
// pure functions with no component state. New home for anything the Wellness
// Hub sub-views share.

export type AthleteStatus = 'green' | 'amber' | 'red';
export type Availability = 'available' | 'modified' | 'unavailable';

// Use local date (not UTC) so SA timezone shows correct day
export const localDateStr = (d: Date = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const TODAY = localDateStr();

export const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const formatDateHeader = (isoDate: string): { label: string; sub: string | null } => {
    const d = new Date(isoDate + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    const dayName  = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const short    = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    if (d.getTime() === now.getTime())       return { label: 'Today',     sub: short };
    if (d.getTime() === yesterday.getTime()) return { label: 'Yesterday', sub: short };
    return { label: dayName + ', ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), sub: null };
};

/** Resolves availability from either the top-level field (new) or the raw responses object (legacy).
 *  The form used to save full option text like 'Fully available for training/competition'. */
export const resolveAvailability = (res: any): Availability | undefined => {
    const top = res?.availability;
    if (top === 'available' || top === 'modified' || top === 'unavailable') return top;
    const raw: string = res?.responses?.availability || '';
    if (!raw) return undefined;
    if (raw === 'available' || raw.toLowerCase().includes('fully available')) return 'available';
    if (raw === 'modified'  || raw.toLowerCase().includes('modified'))        return 'modified';
    if (raw === 'unavailable' || raw.toLowerCase().includes('unavailable'))   return 'unavailable';
    return undefined;
};

/** Returns 'green' | 'amber' | 'red' | null for a wellness response */
export const getAthleteStatus = (res: any): AthleteStatus | null => {
    if (!res) return null;
    const avail = resolveAvailability(res);
    if (avail === 'unavailable' || (res.injury_report?.areas?.length || 0) > 0 || (res.rpe || 0) >= 9) return 'red';
    if (avail === 'modified' || (res.rpe || 0) >= 7) return 'amber';
    return 'green';
};

/** Returns gradient badge classes for an RPE value (1-10) */
export const getRpeBadge = (rpe: number): string => {
    if (rpe >= 9) return 'bg-rose-50 dark:bg-rose-700 text-rose-600 dark:text-white border-rose-100 dark:border-rose-900/40';
    if (rpe >= 7) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-800/40';
    if (rpe >= 5) return 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/40';
    if (rpe >= 3) return 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40';
    return 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40';
};

export const STATUS_DOT: Record<AthleteStatus, string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red:   'bg-rose-500',
};

export interface VizBlock {
    id:          string;
    questionId?: string;
    chartType?:  string;
    compareQId?: string;
    date?:       string;
}

// Static range-chip options (moved from WellnessHub in restructure fix, 2026-07-12)
export const RUNDOWN_RANGE_OPTIONS: { id: number; label: string }[] = [
    { id: 1,  label: 'Today' },
    { id: 3,  label: '3d' },
    { id: 7,  label: '7d' },
    { id: 14, label: '14d' },
    { id: 30, label: '30d' },
];
export const HISTORY_RANGE_OPTIONS: { id: number; label: string }[] = [
    { id: 7,    label: '7d' },
    { id: 30,   label: '30d' },
    { id: 90,   label: '90d' },
    { id: 9999, label: 'All' },
];
