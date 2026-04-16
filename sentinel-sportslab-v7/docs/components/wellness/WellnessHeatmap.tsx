// @ts-nocheck
/**
 * WellnessHeatmap — Team × Days matrix
 *
 * Rows = athletes, Columns = days (last N days ending at anchorDate)
 * Cells coloured by evidence-based composite wellness score (green → amber → red)
 *
 * Algorithm: z-score normalization per athlete + weighted Hooper dimensions
 * Research: research/WELLNESS-SCORING-RESEARCH.md
 * Scoring:  docs/utils/wellnessScoring.ts
 */

import React, { useMemo } from 'react';
import {
    computeComposite,
    computeAthleteBaseline,
    scoreToColor,
} from '../../utils/wellnessScoring';

interface HeatmapProps {
    athletes: { id: string; name: string }[];
    responses: any[];  // wellness_responses with session_date, athlete_id, responses JSONB
    days?: number;     // how many days to show (default 14)
    anchorDate?: string; // end date of window, ISO YYYY-MM-DD (default = today)
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

    // Build per-athlete baselines from all available daily responses (up to 28d)
    // This allows z-score normalization: each day is scored relative to that athlete's norm.
    const athleteBaselines = useMemo(() => {
        const map = new Map<string, ReturnType<typeof computeAthleteBaseline>>();
        const grouped = new Map<string, Record<string, any>[]>();

        for (const r of responses) {
            if (r.tier && r.tier !== 'daily') continue;
            const aid = r.athlete_id || r.athleteId;
            if (!aid || !r.responses) continue;
            if (!grouped.has(aid)) grouped.set(aid, []);
            grouped.get(aid)!.push(r.responses);
        }

        for (const [aid, respObjects] of grouped.entries()) {
            map.set(aid, computeAthleteBaseline(respObjects));
        }
        return map;
    }, [responses]);

    // Build lookup: athleteId → date → composite score
    const heatData = useMemo(() => {
        const map = new Map<string, Map<string, number | null>>();

        for (const r of responses) {
            if (r.tier && r.tier !== 'daily') continue;
            const aid = r.athlete_id || r.athleteId;
            const date = (r.session_date || r.date || '').split('T')[0];
            if (!aid || !date || !r.responses) continue;

            if (!map.has(aid)) map.set(aid, new Map());

            const baseline = athleteBaselines.get(aid);
            const composite = computeComposite(r.responses, baseline);
            if (composite !== null) {
                map.get(aid)!.set(date, composite);
            }
        }
        return map;
    }, [responses, athleteBaselines]);

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
