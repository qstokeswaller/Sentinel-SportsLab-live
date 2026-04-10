// @ts-nocheck
/**
 * WellnessHeatmap — Team × Days matrix
 *
 * Rows = athletes, Columns = days (last 14 or 30 days)
 * Cells coloured by composite wellness score (green → amber → red)
 * Shows patterns: who's consistently low, who had a bad spell, team-wide dips
 */

import React, { useMemo } from 'react';

interface HeatmapProps {
    athletes: { id: string; name: string }[];
    responses: any[];  // wellness_responses with session_date, athlete_id, responses JSONB
    days?: number;     // how many days to show (default 14)
    anchorDate?: string; // end date of window, ISO YYYY-MM-DD (default = today)
}

/** Compute composite wellness from a response's JSONB values (0-10 scale, higher = better) */
function computeComposite(resp: Record<string, any>): number | null {
    // Extract available numeric wellness metrics
    const metrics: number[] = [];

    // For FIFA daily form: fatigue/soreness/stress are negative (invert), sleep_quality/mood are positive
    const negativeKeys = ['fatigue', 'soreness', 'stress'];
    const positiveKeys = ['sleep_quality', 'mood', 'energy', 'sleep'];

    for (const [key, val] of Object.entries(resp)) {
        if (typeof val !== 'number' || val < 0 || val > 10) continue;
        if (negativeKeys.some(k => key.toLowerCase().includes(k))) {
            metrics.push(10 - val); // invert: high fatigue = low wellness
        } else if (positiveKeys.some(k => key.toLowerCase().includes(k))) {
            metrics.push(val);
        } else if (!isNaN(val) && val >= 1 && val <= 10) {
            // Unknown metric — assume higher is better (generic questionnaire)
            metrics.push(val);
        }
    }

    if (metrics.length === 0) return null;
    return metrics.reduce((a, b) => a + b, 0) / metrics.length;
}

/** Map composite (0-10) to a Tailwind background color */
function scoreToColor(score: number | null): string {
    if (score === null) return 'bg-slate-100';
    if (score >= 8) return 'bg-emerald-400';
    if (score >= 7) return 'bg-emerald-300';
    if (score >= 6) return 'bg-lime-300';
    if (score >= 5) return 'bg-yellow-300';
    if (score >= 4) return 'bg-amber-400';
    if (score >= 3) return 'bg-orange-400';
    return 'bg-rose-400';
}

const WellnessHeatmap: React.FC<HeatmapProps> = ({ athletes, responses, days = 14, anchorDate }) => {
    // Build date columns ending at anchorDate (or today if not provided)
    const dateColumns = useMemo(() => {
        const cols: string[] = [];
        const anchor = anchorDate ? new Date(anchorDate + 'T12:00:00') : new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(anchor);
            d.setDate(anchor.getDate() - i);
            cols.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
        return cols;
    }, [days, anchorDate]);

    // Build lookup: athleteId → date → composite score
    const heatData = useMemo(() => {
        const map = new Map<string, Map<string, number | null>>();

        for (const r of responses) {
            // Only use daily tier responses for heatmap (avoid mixing with weekly classification data)
            if (r.tier && r.tier !== 'daily') continue;
            const aid = r.athlete_id || r.athleteId;
            const date = (r.session_date || r.date || '').split('T')[0];
            if (!aid || !date) continue;

            if (!map.has(aid)) map.set(aid, new Map());
            // Always overwrite — last response for the day wins (sorted chronologically)
            const composite = computeComposite(r.responses || {});
            if (composite !== null) {
                map.get(aid)!.set(date, composite);
            }
        }
        return map;
    }, [responses]);

    if (athletes.length === 0) return null;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
                <thead>
                    <tr>
                        <th className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-[9px] font-semibold text-slate-400 uppercase tracking-wide w-32 min-w-[128px]">Athlete</th>
                        {dateColumns.map(d => {
                            const dayNum = new Date(d + 'T12:00:00').getDate();
                            const dayName = new Date(d + 'T12:00:00').toLocaleDateString('en', { weekday: 'narrow' });
                            return (
                                <th key={d} className="px-0.5 py-2 text-center text-[8px] text-slate-400 min-w-[28px]">
                                    <div>{dayName}</div>
                                    <div className="font-bold">{dayNum}</div>
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {athletes.map((athlete, idx) => {
                        const athleteData = heatData.get(athlete.id);
                        return (
                            <tr key={athlete.id} className={idx % 2 === 0 ? '' : 'bg-slate-50/30'}>
                                <td className="sticky left-0 bg-white z-10 px-3 py-1.5 font-medium text-slate-700 truncate max-w-[128px]">
                                    {athlete.name}
                                </td>
                                {dateColumns.map(d => {
                                    const score = athleteData?.get(d) ?? null;
                                    return (
                                        <td key={d} className="px-0.5 py-1">
                                            <div
                                                className={`w-6 h-6 mx-auto rounded-md ${scoreToColor(score)} transition-colors`}
                                                title={score !== null ? `${athlete.name}: ${score.toFixed(1)}/10 on ${d}` : `No data`}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default WellnessHeatmap;
