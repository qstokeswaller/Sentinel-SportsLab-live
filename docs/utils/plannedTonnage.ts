// @ts-nocheck
// ── Planned tonnage compute ─────────────────────────────────────────────
// Given a set of prescription rows (warmup/workout/cooldown for a packet, or
// a single program day's exercises), the resolved athlete list, and optional
// weightroom-sheet per-athlete weight overrides, return per-athlete tonnage
// totals + body-part splits.
//
// Per-athlete weight resolution:
//   1) If a row has athlete_weight_overrides[athleteId] set (sheets), use that
//   2) Else if the row has a numeric `weight` field (standard prescribed kg), use that
//   3) Else skip the row for that athlete (no weight = can't compute tonnage)
//
// Body-part split mirrors the Tracking Hub logic: tonnage is divided evenly
// across an exercise's tagged body_parts. Exercises with no tagged body parts
// fall into '_unassigned' so general tonnage is never lost — the consumer can
// fold this into Full Body for reporting.

import { BODY_PART_TO_REGION } from '../components/analytics/dataHubColumns';

export interface PrescriptionRow {
    exerciseId?: string;
    exerciseName?: string;
    sets?: string | number;
    reps?: string | number;
    weight?: string | number;
    athlete_weight_overrides?: Record<string, string | number>;
}

export interface AthleteRef {
    id: string;
    name?: string;
}

export interface PerAthleteTonnage {
    athleteId: string;
    total: number;
    byBodyPart: Record<string, number>;
}

const num = (v: any): number => {
    const n = parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : 0;
};

export function computePlannedTonnage(
    rows: PrescriptionRow[],
    athletes: AthleteRef[],
    exerciseFullMap: Record<string, any>,
): PerAthleteTonnage[] {
    const results: PerAthleteTonnage[] = [];
    for (const ath of athletes) {
        const byBodyPart: Record<string, number> = {};
        let total = 0;
        for (const r of rows) {
            const sets = num(r.sets);
            const reps = num(r.reps);
            if (sets <= 0 || reps <= 0) continue;
            // Resolve weight: per-athlete override first, then standard row weight
            const override = r.athlete_weight_overrides?.[ath.id];
            const wRaw = override != null && override !== '' ? override : r.weight;
            const weight = num(wRaw);
            if (weight <= 0) continue; // no weight = nothing to count for this row × athlete
            const t = sets * reps * weight;
            total += t;
            // Body-part split — divide tonnage evenly across tagged parts; fall back to "_unassigned"
            const exInfo = r.exerciseId ? exerciseFullMap[r.exerciseId] : null;
            const parts: string[] = (exInfo?.body_parts && exInfo.body_parts.length > 0) ? exInfo.body_parts : ['_unassigned'];
            const share = t / parts.length;
            for (const p of parts) {
                byBodyPart[p] = (byBodyPart[p] || 0) + share;
            }
        }
        if (total > 0) results.push({ athleteId: ath.id, total: Math.round(total), byBodyPart });
    }
    return results;
}

// Helper: collapse a by-body-part split into the four canonical regions
// (Upper Body / Lower Body / Core / Full Body). The `_unassigned` bucket
// (exercises without tagged body parts) maps to Full Body.
export function byBodyPartToRegions(byBodyPart: Record<string, number>): Record<string, number> {
    const out: Record<string, number> = { 'Upper Body': 0, 'Lower Body': 0, 'Core': 0, 'Full Body': 0 };
    for (const [bp, v] of Object.entries(byBodyPart)) {
        if (bp === '_unassigned') { out['Full Body'] += v; continue; }
        const region = BODY_PART_TO_REGION[bp] || 'Full Body';
        out[region] = (out[region] || 0) + v;
    }
    return out;
}
