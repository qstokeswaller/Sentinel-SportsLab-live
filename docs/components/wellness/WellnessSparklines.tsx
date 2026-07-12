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
    // compact mode: no outer card wrapper, tighter rows, narrower charts.
    // Used when embedded inside another card (e.g. Niggles & Injuries column)
    // so we don't end up with nested rounded-xl borders or duplicated chrome.
    compact?: boolean;
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
    if (validPoints.length < 2) return <div className="text-[9px] text-slate-300 dark:text-[#475569] italic">Not enough data</div>;

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

const WellnessSparklines: React.FC<SparklineProps> = ({ athleteId, athleteName, responses, days = 14, compact = false }) => {
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

    // Hooper Index — classical sport-science wellness composite:
    //   (fatigue + soreness + stress + (11 - sleep_quality)) / 4
    // Sleep quality is inverted because in our scale 10=good, but in the
    // original Hooper instrument all four items are scored so that higher = worse
    // strain. Output is 1-10 with high=bad (negative metric, like fatigue).
    // Requires all four daily numerics present for a date to contribute.
    const hooperData = useMemo(() => {
        const athleteResponses = responses.filter(r => (r.athlete_id || r.athleteId) === athleteId && (!r.tier || r.tier === 'daily'));
        const dateMap = new Map<string, any>();
        for (const r of athleteResponses) {
            const date = (r.session_date || r.date || '').split('T')[0];
            dateMap.set(date, r.responses || {});
        }
        const series = dateColumns.map(d => {
            const resp = dateMap.get(d);
            if (!resp) return null;
            const { fatigue, soreness, stress, sleep_quality } = resp;
            if (typeof fatigue !== 'number' || typeof soreness !== 'number'
                || typeof stress !== 'number' || typeof sleep_quality !== 'number') return null;
            return (fatigue + soreness + stress + (11 - sleep_quality)) / 4;
        });
        const valid = series.filter(v => v !== null) as number[];
        return {
            data: series,
            latest: valid.length > 0 ? valid[valid.length - 1] : null,
            avg: valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null,
        };
    }, [responses, athleteId, dateColumns]);

    // Readiness band — categorical per-day series (ready/compromised/not_ready).
    // Rendered as colored squares, not a line chart.
    const readinessData = useMemo(() => {
        const athleteResponses = responses.filter(r => (r.athlete_id || r.athleteId) === athleteId && (!r.tier || r.tier === 'daily'));
        const dateMap = new Map<string, string>();
        for (const r of athleteResponses) {
            const date = (r.session_date || r.date || '').split('T')[0];
            const v = r.responses?.readiness;
            if (typeof v === 'string') dateMap.set(date, v);
        }
        const series = dateColumns.map(d => dateMap.get(d) ?? null);
        const valid = series.filter(v => v !== null) as string[];
        const readyCount = valid.filter(v => v === 'ready').length;
        return {
            data: series,
            latest: valid.length > 0 ? valid[valid.length - 1] : null,
            readyCount,
            validCount: valid.length,
        };
    }, [responses, athleteId, dateColumns]);

    // Compact dimensions when embedded — chart is narrower, rows are shorter,
    // labels are smaller. Full mode keeps the original sizing for any callers
    // that still want the standalone card.
    const rowPad   = compact ? 'px-2 py-1.5' : 'px-4 py-3';
    const labelCol = compact ? 'w-16' : 'w-20';
    const labelTxt = compact ? 'text-[10px]' : 'text-xs';
    const subTxt   = compact ? 'text-[9px]'  : 'text-[10px]';
    const valTxt   = compact ? 'text-sm w-6' : 'text-lg w-8';
    const chartW   = compact ? 100 : 140;
    const chartH   = compact ? 22  : 28;

    // Hooper colour follows negative-metric scale (≥7 red, ≥5 amber, else green)
    const hooperLatestColor = hooperData.latest !== null
        ? hooperData.latest >= 7 ? 'text-rose-600 dark:text-rose-400'
        : hooperData.latest >= 5 ? 'text-amber-600 dark:text-amber-400'
        : 'text-emerald-600 dark:text-emerald-400'
        : 'text-slate-300 dark:text-[#475569]';

    // Readiness latest colour + label
    const readinessLatestColor = readinessData.latest === 'ready' ? 'text-emerald-600 dark:text-emerald-400'
        : readinessData.latest === 'compromised' ? 'text-amber-600 dark:text-amber-400'
        : readinessData.latest === 'not_ready' ? 'text-rose-600 dark:text-rose-400'
        : 'text-slate-300 dark:text-[#475569]';
    const readinessLatestLabel = readinessData.latest === 'ready' ? '✓'
        : readinessData.latest === 'compromised' ? '~'
        : readinessData.latest === 'not_ready' ? '✗'
        : '—';

    const body = (
        <div className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
            {/* Hooper Index — headline composite, sits at the top of the list */}
            <div className={`flex items-center gap-2 ${rowPad} bg-indigo-50/30 dark:bg-indigo-900/10`}>
                <div className={`${labelCol} shrink-0`}>
                    <div className={`${labelTxt} font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1`}>
                        <span>📊</span> Hooper Index
                    </div>
                    <div className={`${subTxt} text-slate-400 dark:text-[#CBD5E1]`}>
                        avg: {hooperData.avg !== null ? hooperData.avg.toFixed(1) : '—'}
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <Sparkline data={hooperData.data} negative={true} width={chartW} height={chartH} />
                </div>
                <div className={`${valTxt} font-bold text-right ${hooperLatestColor}`}>
                    {hooperData.latest !== null ? hooperData.latest.toFixed(1) : '—'}
                </div>
            </div>

            {METRICS.map(metric => {
                const d = metricData[metric.key];
                if (!d) return null;
                const latestColor = d.latest !== null
                    ? metric.negative
                        ? d.latest >= 7 ? 'text-rose-600 dark:text-rose-400' : d.latest >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        : d.latest >= 7 ? 'text-emerald-600 dark:text-emerald-400' : d.latest >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-300 dark:text-[#475569]';

                return (
                    <div key={metric.key} className={`flex items-center gap-2 ${rowPad}`}>
                        <div className={`${labelCol} shrink-0`}>
                            <div className={`${labelTxt} font-semibold text-slate-700 dark:text-[#CBD5E1] flex items-center gap-1`}>
                                <span>{metric.icon}</span> {metric.label}
                            </div>
                            <div className={`${subTxt} text-slate-400 dark:text-[#CBD5E1]`}>
                                avg: {d.avg !== null ? d.avg.toFixed(1) : '—'}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <Sparkline data={d.data} negative={metric.negative} width={chartW} height={chartH} />
                        </div>
                        <div className={`${valTxt} font-bold text-right ${latestColor}`}>
                            {d.latest !== null ? d.latest : '—'}
                        </div>
                    </div>
                );
            })}

            {/* Sleep hours row */}
            <div className={`flex items-center gap-2 ${rowPad}`}>
                <div className={`${labelCol} shrink-0`}>
                    <div className={`${labelTxt} font-semibold text-slate-700 dark:text-[#CBD5E1] flex items-center gap-1`}>
                        <span>🛏️</span> Sleep Hours
                    </div>
                    <div className={`${subTxt} text-slate-400 dark:text-[#CBD5E1]`}>
                        avg: {sleepData.avg !== null ? sleepData.avg.toFixed(1) : '—'}h
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <Sparkline data={sleepData.data.map(v => v !== null ? Math.min(12, v) * (10 / 12) : null)} negative={false} width={chartW} height={chartH} />
                </div>
                <div className={`${valTxt} font-bold text-right ${sleepData.latest !== null ? (sleepData.latest >= 7 ? 'text-emerald-600 dark:text-emerald-400' : sleepData.latest >= 6 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400') : 'text-slate-300 dark:text-[#475569]'}`}>
                    {sleepData.latest !== null ? `${sleepData.latest}` : '—'}
                </div>
            </div>

            {/* Readiness band — categorical squares (not a line chart).
                Each square = one day in the window; colour = post-session feeling. */}
            <div className={`flex items-center gap-2 ${rowPad}`}>
                <div className={`${labelCol} shrink-0`}>
                    <div className={`${labelTxt} font-semibold text-slate-700 dark:text-[#CBD5E1] flex items-center gap-1`}>
                        <span>🎯</span> Readiness
                    </div>
                    <div className={`${subTxt} text-slate-400 dark:text-[#CBD5E1]`}>
                        {readinessData.validCount > 0 ? `${readinessData.readyCount}/${readinessData.validCount} ready` : '—'}
                    </div>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-0.5">
                    {readinessData.data.map((v, i) => {
                        const cls = v === 'ready' ? 'bg-emerald-500'
                                  : v === 'compromised' ? 'bg-amber-400'
                                  : v === 'not_ready' ? 'bg-rose-500'
                                  : 'bg-slate-200 dark:bg-[#243A58]';
                        const tooltip = v ? v.replace(/_/g, ' ') : 'no data';
                        return <div key={i} title={tooltip} className={`flex-1 ${compact ? 'h-3' : 'h-4'} rounded-sm ${cls}`} />;
                    })}
                </div>
                <div className={`${valTxt} font-bold text-right ${readinessLatestColor}`}>
                    {readinessLatestLabel}
                </div>
            </div>
        </div>
    );

    // Compact: parent owns the card chrome (border, padding, header).
    // We just render a tiny "Last N days" caption + the body, with a top divider.
    if (compact) {
        return (
            <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-1">Last {days} days</p>
                <div className="border-t border-slate-100 dark:border-[#1A2D48] -mx-5">
                    {body}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">{athleteName} — Wellness Trends</h4>
                <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Last {days} days</p>
            </div>
            {body}
        </div>
    );
};

export default WellnessSparklines;
