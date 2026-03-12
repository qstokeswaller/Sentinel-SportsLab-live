// @ts-nocheck
import { WEIGHTROOM_1RM_EXERCISES } from './constants';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SheetColumn {
    id: string;
    label: string;
    exerciseId: string;  // canonical 1RM exercise name (e.g. "Back Squat")
    percentage: number;
}

export interface SheetConfig {
    columns: SheetColumn[];
    orientation: 'portrait' | 'landscape';
}

// ── Utilities ─────────────────────────────────────────────────────────────────

/** Snap a weight value to nearest 2.5 kg */
export const roundTo2_5 = (v: number): number => Math.round(v / 2.5) * 2.5;

/** Build lookup: { athleteId → { exerciseName → { weight, date } } } (keeps latest per athlete+exercise) */
export const buildMaxLookup = (maxHistory: any[]) => {
    const map: Record<string, Record<string, { weight: number; date: string }>> = {};
    (maxHistory || []).forEach(r => {
        if (!map[r.athleteId]) map[r.athleteId] = {};
        const existing = map[r.athleteId][r.exercise];
        if (!existing || r.date > existing.date) {
            map[r.athleteId][r.exercise] = { weight: r.weight, date: r.date };
        }
    });
    return map;
};

/** Get the cell value for a single athlete + column, using the maxLookup */
export const getSheetCellValue = (
    col: SheetColumn,
    athleteId: string,
    maxLookup: Record<string, Record<string, { weight: number; date: string }>>
): string => {
    if (!col.exerciseId) return '';
    const athleteMax = maxLookup[athleteId]?.[col.exerciseId];
    if (!athleteMax) return '\u2014';
    const load = roundTo2_5(athleteMax.weight * (col.percentage / 100));
    return `${load}`;
};

/** Generate full print HTML for a weightroom sheet */
export const generateSheetPrintHTML = (
    config: SheetConfig,
    athletes: { id: string; name: string }[],
    maxLookup: Record<string, Record<string, { weight: number; date: string }>>,
    title?: string
): string => {
    const headers = config.columns.map(col => `${col.label} (${col.percentage}%)`);
    const rows = athletes.map(a => ({
        name: a.name,
        cells: config.columns.map(col => getSheetCellValue(col, a.id, maxLookup)),
    }));

    const thStyle = 'padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:#1e293b;color:white;border:1px solid #334155;';
    const tdStyle = 'padding:8px 12px;font-size:12px;border:1px solid #e2e8f0;';
    const tdNameStyle = 'padding:8px 12px;font-size:12px;font-weight:600;border:1px solid #e2e8f0;text-transform:uppercase;';

    const headerRow = `<tr><th style="${thStyle}">Name</th>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr>`;
    const bodyRows = rows.map(r =>
        `<tr><td style="${tdNameStyle}">${r.name}</td>${r.cells.map(c => `<td style="${tdStyle}">${c}</td>`).join('')}</tr>`
    ).join('');

    return `<!DOCTYPE html><html><head><title>Weightroom Sheet</title>
<style>
@page { size: ${config.orientation}; margin: 15mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
h1 { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin: 0 0 4px; }
.divider { border: none; border-top: 2px solid #1e293b; margin: 8px auto 20px; width: 60%; }
table { width: 100%; border-collapse: collapse; }
@media print { button { display: none; } }
</style></head><body>
<h1>${title || 'Weight Training - Record Sheet'}</h1>
<hr class="divider" />
<table>${headerRow}${bodyRows}</table>
</body></html>`;
};

/** Print a weightroom sheet in a new window */
export const printSheet = (
    config: SheetConfig,
    athletes: { id: string; name: string }[],
    maxLookup: Record<string, Record<string, { weight: number; date: string }>>,
    title?: string
) => {
    const html = generateSheetPrintHTML(config, athletes, maxLookup, title);
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.print(); }
};

/** Match workout exercises against 1RM-testable exercise list, return suggested columns */
export const matchWorkoutExercisesTo1RM = (
    workoutExercises: { exerciseName: string }[]
): SheetColumn[] => {
    const matched: SheetColumn[] = [];
    const seen = new Set<string>();

    for (const row of workoutExercises) {
        const name = row.exerciseName;
        if (!name || seen.has(name)) continue;

        // Direct match
        if (WEIGHTROOM_1RM_EXERCISES.includes(name)) {
            seen.add(name);
            matched.push({ id: 'c' + Date.now() + matched.length, label: name, exerciseId: name, percentage: 100 });
            continue;
        }

        // Fuzzy: check if exercise name contains a 1RM exercise name (e.g. "Barbell Back Squat" contains "Back Squat")
        for (const rmEx of WEIGHTROOM_1RM_EXERCISES) {
            if (!seen.has(rmEx) && name.toLowerCase().includes(rmEx.toLowerCase())) {
                seen.add(rmEx);
                matched.push({ id: 'c' + Date.now() + matched.length, label: rmEx, exerciseId: rmEx, percentage: 100 });
                break;
            }
        }
    }

    return matched;
};
