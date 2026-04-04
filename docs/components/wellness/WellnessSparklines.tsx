// @ts-nocheck
/**
 * WellnessSparklines — Individual athlete wellness metric trends
 *
 * Shows 14-day rolling line per wellness metric for a selected athlete.
 * Each metric gets its own mini chart with colour indicating current status.
 */

import React, { useMemo } from 'react';

interface SparklineProps {
    athleteId: string;
    athleteName: string;
    responses: any[];  // all wellness_responses for this athlete
    days?: number;
}

const METRICS = [
    { key: 'fatigue', label: 'Fatigue', negative: true, icon: '⚡' },
    { key: 'soreness', label: 'Soreness', negative: true, icon: '💪' },
    { key: 'sleep_quality', label: 'Sleep Quality', negative: false, icon: '😴' },
    { key: 'stress', label: 'Stress', negative: true, icon: '🧠' },
    { key: 'mood', label: 'Mood', negative: false, icon: '😊' },
];

/** Mini SVG sparkline */
const Sparkline = ({ data, negative, width = 120, height = 32 }: { data: (number | null)[]; negative: boolean; width?: number; height?: number }) => {
    const validPoints = data.map((v, i) => v !== null ? { x: i, y: v } : null).filter(Boolean) as { x: number; y: number }[];
    if (validPoints.length < 2) return <div className="text-[9px] text-slate-300 italic">Not enough data</div>;

    const xScale = width / (data.length - 1);
    const yMin = 0;
    const yMax = 10;
    const yScale = height / (yMax - yMin);

    const points = validPoints.map(p => `${p.x * xScale},${height - (p.y - yMin) * yScale}`).join(' ');
    const lastVal = validPoints[validPoints.length - 1].y;

    // Colour based on last value + whether metric is negative
    let strokeColor = '#94a3b8'; // slate-400 default
    if (negative) {
        // High = bad
        if (lastVal >= 7) strokeColor = '#ef4444'; // red
        else if (lastVal >= 5) strokeColor = '#f59e0b'; // amber
        else strokeColor = '#22c55e'; // green
    } else {
        // High = good
        if (lastVal >= 7) strokeColor = '#22c55e';
        else if (lastVal >= 5) strokeColor = '#f59e0b';
        else strokeColor = '#ef4444';
    }

    return (
        <svg width={width} height={height} className="shrink-0">
            <polyline points={points} fill="none" stroke={strokeColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {/* Dot on last point */}
            {validPoints.length > 0 && (() => {
                const last = validPoints[validPoints.length - 1];
                return <circle cx={last.x * xScale} cy={height - (last.y - yMin) * yScale} r={3} fill={strokeColor} />;
            })()}
        </svg>
    );
};

const WellnessSparklines: React.FC<SparklineProps> = ({ athleteId, athleteName, responses, days = 14 }) => {
    // Build date range
    const dateColumns = useMemo(() => {
        const cols: string[] = [];
        const today = new Date();
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            cols.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
        return cols;
    }, [days]);

    // Build metric series
    const metricData = useMemo(() => {
        const athleteResponses = responses
            .filter(r => (r.athlete_id || r.athleteId) === athleteId && (!r.tier || r.tier === 'daily'))
            .sort((a, b) => (a.session_date || a.date || '').localeCompare(b.session_date || b.date || ''));

        // Create date → response map (latest per day)
        const dateMap = new Map<string, Record<string, any>>();
        for (const r of athleteResponses) {
            const date = (r.session_date || r.date || '').split('T')[0];
            dateMap.set(date, r.responses || {});
        }

        const result: Record<string, { data: (number | null)[]; latest: number | null; avg: number | null }> = {};

        for (const metric of METRICS) {
            const series = dateColumns.map(d => {
                const resp = dateMap.get(d);
                if (!resp) return null;
                const val = resp[metric.key];
                return typeof val === 'number' ? val : null;
            });
            const validVals = series.filter(v => v !== null) as number[];
            result[metric.key] = {
                data: series,
                latest: validVals.length > 0 ? validVals[validVals.length - 1] : null,
                avg: validVals.length > 0 ? validVals.reduce((a, b) => a + b, 0) / validVals.length : null,
            };
        }

        return result;
    }, [responses, athleteId, dateColumns]);

    // Sleep hours separate (not 1-10 scale)
    const sleepData = useMemo(() => {
        const athleteResponses = responses.filter(r => (r.athlete_id || r.athleteId) === athleteId && (!r.tier || r.tier === 'daily'));
        const dateMap = new Map<string, number>();
        for (const r of athleteResponses) {
            const date = (r.session_date || r.date || '').split('T')[0];
            const hrs = r.responses?.sleep_hours;
            if (typeof hrs === 'number') dateMap.set(date, hrs);
        }
        const series = dateColumns.map(d => dateMap.get(d) ?? null);
        const valid = series.filter(v => v !== null) as number[];
        return { data: series, latest: valid.length > 0 ? valid[valid.length - 1] : null, avg: valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null };
    }, [responses, athleteId, dateColumns]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
                <h4 className="text-sm font-semibold text-slate-800">{athleteName} — Wellness Trends</h4>
                <p className="text-[10px] text-slate-400">Last {days} days</p>
            </div>

            <div className="divide-y divide-slate-50">
                {METRICS.map(metric => {
                    const d = metricData[metric.key];
                    if (!d) return null;
                    const latestColor = d.latest !== null
                        ? metric.negative
                            ? d.latest >= 7 ? 'text-rose-600' : d.latest >= 5 ? 'text-amber-600' : 'text-emerald-600'
                            : d.latest >= 7 ? 'text-emerald-600' : d.latest >= 5 ? 'text-amber-600' : 'text-rose-600'
                        : 'text-slate-300';

                    return (
                        <div key={metric.key} className="flex items-center gap-4 px-4 py-3">
                            <div className="w-20 shrink-0">
                                <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                                    <span>{metric.icon}</span> {metric.label}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    avg: {d.avg !== null ? d.avg.toFixed(1) : '—'}
                                </div>
                            </div>
                            <div className="flex-1">
                                <Sparkline data={d.data} negative={metric.negative} width={140} height={28} />
                            </div>
                            <div className={`text-lg font-bold w-8 text-right ${latestColor}`}>
                                {d.latest !== null ? d.latest : '—'}
                            </div>
                        </div>
                    );
                })}

                {/* Sleep hours row */}
                <div className="flex items-center gap-4 px-4 py-3">
                    <div className="w-20 shrink-0">
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <span>🛏️</span> Sleep Hours
                        </div>
                        <div className="text-[10px] text-slate-400">
                            avg: {sleepData.avg !== null ? sleepData.avg.toFixed(1) : '—'}h
                        </div>
                    </div>
                    <div className="flex-1">
                        <Sparkline data={sleepData.data.map(v => v !== null ? Math.min(12, v) * (10 / 12) : null)} negative={false} width={140} height={28} />
                    </div>
                    <div className={`text-lg font-bold w-8 text-right ${sleepData.latest !== null ? (sleepData.latest >= 7 ? 'text-emerald-600' : sleepData.latest >= 6 ? 'text-amber-600' : 'text-rose-600') : 'text-slate-300'}`}>
                        {sleepData.latest !== null ? `${sleepData.latest}` : '—'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WellnessSparklines;
