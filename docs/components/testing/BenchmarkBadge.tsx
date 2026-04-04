// @ts-nocheck
/**
 * BenchmarkBadge — Inline percentile rank for any test result
 *
 * Shows where an athlete's result sits relative to their team/roster.
 * Rendered next to individual test results in the Testing Hub.
 *
 * Why benchmarking matters:
 * "CMJ 38cm" is meaningless in isolation. Is that good? Bad? Average for their position?
 * Percentile ranking against the roster answers this instantly — the sport scientist
 * sees "38cm · 85th percentile" and knows this athlete is above average for the team.
 * This drives individual programming decisions: athletes below 25th percentile on a
 * metric may need targeted intervention, while those above 75th are performing well.
 */

import React, { useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';

interface BenchmarkBadgeProps {
    testType: string;
    value: number;
    athleteId: string;
    /** If true, lower is better (sprint times, agility times) */
    lowerIsBetter?: boolean;
}

/**
 * Calculate percentile rank of a value within a distribution.
 * Returns 0-100 where 100 = best in group.
 */
function percentileRank(value: number, allValues: number[], lowerIsBetter = false): number {
    if (allValues.length < 2) return -1; // not enough data
    const sorted = [...allValues].sort((a, b) => a - b);
    let rank = sorted.filter(v => (lowerIsBetter ? v > value : v < value)).length;
    const ties = sorted.filter(v => v === value).length;
    rank += ties / 2; // average rank for ties
    return Math.round((rank / sorted.length) * 100);
}

export const BenchmarkBadge: React.FC<BenchmarkBadgeProps> = ({ testType, value, athleteId, lowerIsBetter = false }) => {
    const { teams } = useAppState();

    const { percentile, count } = useMemo(() => {
        // Collect latest value per athlete for this test type across entire roster
        const allAthletes = teams.flatMap(t => t.players || []);
        const values: number[] = [];

        for (const athlete of allAthletes) {
            const metrics = athlete.performanceMetrics || [];
            const latest = metrics
                .filter(m => m.type === testType)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            if (!latest) continue;

            const val = Number(latest.value || latest.weight || latest.time || latest.avgForce || latest.metrics?.value || latest.metrics?.weight || latest.metrics?.time || 0);
            if (val > 0) values.push(val);
        }

        if (values.length < 3) return { percentile: -1, count: values.length }; // need 3+ athletes for meaningful percentile
        return { percentile: percentileRank(value, values, lowerIsBetter), count: values.length };
    }, [teams, testType, value]);

    if (percentile < 0) return null; // not enough data

    const color = percentile >= 75 ? 'text-emerald-600 bg-emerald-50'
        : percentile >= 50 ? 'text-sky-600 bg-sky-50'
        : percentile >= 25 ? 'text-amber-600 bg-amber-50'
        : 'text-rose-600 bg-rose-50';

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold ${color}`} title={`${percentile}th percentile across ${count} athletes with ${testType} data`}>
            P{percentile}
        </span>
    );
};

/**
 * BenchmarkSummary — Standalone component showing full roster comparison for a test type.
 * Used in test detail views.
 */
export const BenchmarkSummary: React.FC<{ testType: string; athleteId: string; lowerIsBetter?: boolean }> = ({ testType, athleteId, lowerIsBetter = false }) => {
    const { teams } = useAppState();

    const data = useMemo(() => {
        const allAthletes = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name })));
        const entries: { id: string; name: string; team: string; value: number; date: string }[] = [];

        for (const athlete of allAthletes) {
            const metrics = athlete.performanceMetrics || [];
            const latest = metrics
                .filter(m => m.type === testType)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            if (!latest) continue;
            const val = Number(latest.value || latest.weight || latest.time || latest.avgForce || latest.metrics?.value || latest.metrics?.weight || latest.metrics?.time || 0);
            if (val > 0) entries.push({ id: athlete.id, name: athlete.name, team: athlete.teamName, value: val, date: latest.date?.slice(0, 10) || '' });
        }

        // Sort: best first
        entries.sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
        return entries;
    }, [teams, testType]);

    if (data.length < 2) return null;

    const currentIdx = data.findIndex(d => d.id === athleteId);

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Roster Ranking — {data.length} athletes
            </div>
            <div className="space-y-1">
                {data.map((entry, i) => {
                    const isCurrent = entry.id === athleteId;
                    const rank = i + 1;
                    return (
                        <div key={entry.id} className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${
                            isCurrent ? 'bg-indigo-50 border border-indigo-200 font-semibold' : i % 2 === 0 ? 'bg-slate-50' : ''
                        }`}>
                            <div className="flex items-center gap-2">
                                <span className={`w-5 text-center text-[10px] font-bold ${rank <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>{rank}</span>
                                <span className={isCurrent ? 'text-indigo-700' : 'text-slate-700'}>{entry.name}</span>
                                <span className="text-[9px] text-slate-300">{entry.team}</span>
                            </div>
                            <span className={isCurrent ? 'text-indigo-600' : 'text-slate-600'}>{entry.value}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
