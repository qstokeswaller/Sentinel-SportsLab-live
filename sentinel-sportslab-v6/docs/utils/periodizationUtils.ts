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

/** Calculate weekly volume from session data (normalized 0-10) */
export const calculateWeeklyVolume = (plan: PeriodizationPlan, totalWeeks: number): (number | null)[] => {
    const weeklyTotals: number[] = new Array(totalWeeks).fill(0);
    const hasSessions: boolean[] = new Array(totalWeeks).fill(false);

    for (const phase of plan.phases) {
        for (const block of phase.blocks) {
            for (const week of block.weeks) {
                const wIdx = dateToWeekIndex(week.startDate, plan.startDate);
                if (wIdx < 0 || wIdx >= totalWeeks) continue;
                for (const session of week.sessions) {
                    for (const section of session.sections) {
                        for (const ex of section.exercises) {
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
        if (plan.volumeOverrides[i] !== undefined) return plan.volumeOverrides[i];
        if (!hasSessions[i]) return null;
        return Math.round((v / max) * 10);
    });
};

/** Calculate weekly intensity from session data (normalized 0-10) */
export const calculateWeeklyIntensity = (plan: PeriodizationPlan, totalWeeks: number): (number | null)[] => {
    const weeklyRpe: number[][] = Array.from({ length: totalWeeks }, () => []);

    for (const phase of plan.phases) {
        for (const block of phase.blocks) {
            for (const week of block.weeks) {
                const wIdx = dateToWeekIndex(week.startDate, plan.startDate);
                if (wIdx < 0 || wIdx >= totalWeeks) continue;
                for (const session of week.sessions) {
                    if (session.plannedRPE) weeklyRpe[wIdx].push(session.plannedRPE);
                }
            }
        }
    }

    return weeklyRpe.map((rpes, i) => {
        if (plan.intensityOverrides[i] !== undefined) return plan.intensityOverrides[i];
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

/** Default modality presets for quick-add */
export const DEFAULT_MODALITY_PRESETS = [
    'Strength', 'Plyometrics', 'Speed', 'Conditioning', 'Loaded Power',
];
