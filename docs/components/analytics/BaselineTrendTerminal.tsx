// @ts-nocheck
import React from 'react';
import { TrendingUpIcon, TrendingDownIcon, MinusIcon, InfoIcon, ActivityIcon, HeartPulseIcon, ZapIcon } from 'lucide-react';

export const BaselineTrendTerminal = ({ habitRecords, loadRecords, selectedAnalyticsAthleteId, subjectAthleteIds }) => {
    const aggregateByDate = (data, fields) => {
        const dates = [...new Set(data.map(r => r.date))].sort();
        return dates.map(date => {
            const daily = data.filter(r => r.date === date);
            const obj = { date };
            fields.forEach(f => {
                obj[f] = daily.reduce((acc, r) => acc + (r[f] || 0), 0) / (daily.length || 1);
            });
            return obj;
        });
    };

    const athleteHabitsRaw = React.useMemo(() =>
        (habitRecords || []).filter(r => (subjectAthleteIds || [selectedAnalyticsAthleteId]).includes(r.athleteId)),
        [habitRecords, subjectAthleteIds, selectedAnalyticsAthleteId]
    );
    const athleteLoadRaw = React.useMemo(() =>
        (loadRecords || []).filter(r => (subjectAthleteIds || [selectedAnalyticsAthleteId]).includes(r.athleteId)),
        [loadRecords, subjectAthleteIds, selectedAnalyticsAthleteId]
    );

    const athleteHabits = React.useMemo(() =>
        aggregateByDate(athleteHabitsRaw, ['readiness', 'sleep', 'stress', 'soreness', 'energy']),
        [athleteHabitsRaw]
    );
    const athleteLoad = React.useMemo(() =>
        aggregateByDate(athleteLoadRaw, ['sRPE']),
        [athleteLoadRaw]
    );

    const calculateBaseline = (data, field, days = 28) => {
        const recent = data.slice(-days);
        if (recent.length === 0) return 0;
        return recent.reduce((acc, r) => acc + (r[field] || 0), 0) / recent.length;
    };

    const loadValue    = athleteLoad.length > 0 ? athleteLoad[athleteLoad.length - 1].sRPE : 0;
    const loadBaseline = calculateBaseline(athleteLoad, 'sRPE');
    const loadDeviation = loadBaseline > 0 ? ((loadValue - loadBaseline) / loadBaseline * 100) : 0;

    const wellnessValue    = athleteHabits.length > 0 ? athleteHabits[athleteHabits.length - 1].readiness : 0;
    const wellnessBaseline = calculateBaseline(athleteHabits, 'readiness');
    const wellnessDeviation = wellnessBaseline > 0 ? ((wellnessValue - wellnessBaseline) / wellnessBaseline * 100) : 0;

    const getTrend = (data, field) => {
        if (data.length < 7) return 'Stable';
        const current = data.slice(-7).reduce((acc, r) => acc + (r[field] || 0), 0) / 7;
        const baseline = calculateBaseline(data, field);
        if (baseline === 0) return 'Stable';
        const diff = (current - baseline) / baseline;
        if (Math.abs(diff) < 0.15) return 'Stable';
        return diff > 0 ? 'Increasing' : 'Decreasing';
    };

    const loadTrend    = getTrend(athleteLoad, 'sRPE');
    const wellnessTrend = getTrend(athleteHabits, 'readiness');

    const isVolatile = (data, field) => {
        const recent = data.slice(-7);
        if (recent.length < 7) return false;
        const mean = recent.reduce((acc, r) => acc + (r[field] || 0), 0) / 7;
        const variance = recent.reduce((acc, r) => acc + Math.pow((r[field] || 0) - mean, 2), 0) / 7;
        return Math.sqrt(variance) > (mean * 0.4);
    };

    const loadVolatility    = isVolatile(athleteLoad, 'sRPE');
    const wellnessVolatility = isVolatile(athleteHabits, 'readiness');

    // Simple rolling ACWR (acute = last 7d, chronic = last 28d / 4)
    const getACWR = (data) => {
        if (data.length < 14) return 1.0;
        const acute = data.slice(-7).reduce((acc, r) => acc + (r.sRPE || 0), 0);
        const chronicSum = data.slice(-28).reduce((acc, r) => acc + (r.sRPE || 0), 0);
        const chronicAvg = chronicSum / 4;
        return chronicAvg > 0 ? (acute / chronicAvg) : 1.0;
    };
    const currentACWR = getACWR(athleteLoad);

    const riskState = currentACWR > 1.5 ? 'High Risk'
        : currentACWR > 1.3 ? 'Functional Overreaching'
        : wellnessValue < 50 ? 'Accumulated Fatigue'
        : 'Positive Adaptation';

    const hasLoadData    = athleteLoad.length > 0;
    const hasWellnessData = athleteHabits.length > 0;

    const TrendIcon = ({ trend, inverse = false }) => {
        const up = trend === 'Increasing';
        const positive = inverse ? up : !up;
        if (trend === 'Stable') return <MinusIcon size={12} className="text-slate-400" />;
        if (up) return <TrendingUpIcon size={12} className={positive ? 'text-emerald-500' : 'text-rose-500'} />;
        return <TrendingDownIcon size={12} className={positive ? 'text-emerald-500' : 'text-rose-500'} />;
    };

    const acwrZoneColor = currentACWR > 1.5 ? 'text-rose-600 dark:text-rose-400'
        : currentACWR > 1.3 ? 'text-amber-600 dark:text-amber-400'
        : currentACWR < 0.8 ? 'text-sky-600 dark:text-sky-400'
        : 'text-emerald-600 dark:text-emerald-400';

    const acwrZoneLabel = currentACWR > 1.5 ? 'DANGER'
        : currentACWR > 1.3 ? 'ELEVATED'
        : currentACWR < 0.8 ? 'UNDEREXPOSED'
        : 'OPTIMAL';

    const acwrZoneBg = currentACWR > 1.5 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50'
        : currentACWR > 1.3 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
        : currentACWR < 0.8 ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/50'
        : 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50';

    const riskStateColor = riskState === 'High Risk' ? 'text-rose-400'
        : riskState === 'Functional Overreaching' ? 'text-amber-400'
        : riskState === 'Accumulated Fatigue' ? 'text-amber-400'
        : 'text-emerald-400';

    return (
        <div className="space-y-4 animate-in fade-in duration-500">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <h4 className="text-lg font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">Baseline Trend Analysis</h4>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mt-1">
                    28-day rolling baselines · load vs. wellness deviation · ACWR status
                </p>
            </div>

            {/* ── Summary Stat Cards ──────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">

                {/* Daily Load Baseline */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <ActivityIcon size={12} className="text-indigo-500" />
                        <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Load Baseline</div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#E2E8F0]">
                        {hasLoadData ? loadBaseline.toFixed(0) : '—'}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">AU · 28-day avg</div>
                    {hasLoadData && (
                        <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${loadDeviation > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {loadDeviation > 0 ? <TrendingUpIcon size={11} /> : <TrendingDownIcon size={11} />}
                            {loadDeviation > 0 ? '+' : ''}{loadDeviation.toFixed(1)}% vs baseline
                        </div>
                    )}
                </div>

                {/* Load Trend */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <ZapIcon size={12} className="text-indigo-500" />
                        <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Load Trend</div>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-[#E2E8F0] mt-1">
                        {loadVolatility ? 'Volatile' : loadTrend}
                    </div>
                    <div className={`text-[9px] font-semibold mt-1 ${loadVolatility ? 'text-purple-500' : loadTrend === 'Stable' ? 'text-emerald-500' : loadTrend === 'Increasing' ? 'text-rose-500' : 'text-amber-500'}`}>
                        {loadVolatility ? 'High variability (7d)' : `7-day vs 28-day avg`}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                        <TrendIcon trend={loadTrend} />
                    </div>
                </div>

                {/* Wellness Baseline */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                    <div className="flex items-center gap-1.5 mb-2">
                        <HeartPulseIcon size={12} className="text-indigo-500" />
                        <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Wellness Baseline</div>
                    </div>
                    <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#E2E8F0]">
                        {hasWellnessData ? wellnessBaseline.toFixed(1) : '—'}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">readiness · /100</div>
                    {hasWellnessData && (
                        <div className={`flex items-center gap-1 mt-2 text-[10px] font-semibold ${wellnessDeviation < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {wellnessDeviation < 0 ? <TrendingDownIcon size={11} /> : <TrendingUpIcon size={11} />}
                            {wellnessDeviation > 0 ? '+' : ''}{wellnessDeviation.toFixed(1)}% vs baseline
                        </div>
                    )}
                </div>

                {/* ACWR */}
                <div className={`rounded-xl border shadow-sm p-4 ${acwrZoneBg}`}>
                    <div className="text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Current ACWR</div>
                    <div className={`text-2xl font-bold tracking-tight ${acwrZoneColor}`}>
                        {currentACWR.toFixed(2)}
                    </div>
                    <div className={`text-[9px] font-bold uppercase mt-1 ${acwrZoneColor}`}>
                        {acwrZoneLabel}
                    </div>
                    <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">7:28 rolling ratio</div>
                </div>

                {/* Diagnostic State */}
                <div className="bg-[#0F1C30] dark:bg-[#0A1628] rounded-xl border border-[#243A58] shadow-sm p-4 col-span-2 sm:col-span-1">
                    <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wide mb-2">Diagnostic State</div>
                    <div className={`text-sm font-bold uppercase tracking-tight leading-snug ${riskStateColor}`}>
                        {riskState}
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-2 leading-relaxed">
                        {riskState === 'High Risk' ? 'ACWR >1.5. Prioritise recovery and reduce session intensity immediately.'
                            : riskState === 'Functional Overreaching' ? 'ACWR elevated (>1.3). Monitor closely. Taper if wellness scores drop.'
                            : riskState === 'Accumulated Fatigue' ? 'Wellness below threshold despite acceptable ACWR. Recovery deficit likely.'
                            : 'Load and wellness in sync. Maintain current periodisation.'}
                    </p>
                </div>
            </div>

            {/* ── Load vs Wellness Chart ──────────────────────────────────── */}
            {(hasLoadData || hasWellnessData) && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-semibold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">
                                Baseline vs. Current Volatility
                            </h4>
                            <p className="text-[9px] text-indigo-400 font-semibold uppercase mt-0.5">
                                Last 14 days · load (AU) vs wellness readiness
                            </p>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-slate-400 dark:text-[#CBD5E1]">
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-indigo-400" /> Load</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-cyan-400" /> Readiness</span>
                        </div>
                    </div>

                    {/* Baseline reference lines + bars */}
                    <div className="h-48 flex items-end justify-between px-2 border-b border-l border-indigo-50 dark:border-[#1A2D48] relative pt-10">
                        {/* Load baseline reference line */}
                        {hasLoadData && loadBaseline > 0 && (
                            <div className="absolute left-0 right-0 border-t border-dashed border-indigo-300/50 dark:border-indigo-600/40 pointer-events-none"
                                style={{ bottom: `${Math.min((loadBaseline / 800) * 100, 100)}%` }}>
                                <span className="text-[7px] text-indigo-400 absolute -top-2 left-1">Avg {loadBaseline.toFixed(0)} AU</span>
                            </div>
                        )}
                        {/* Wellness 50% line */}
                        <div className="absolute left-0 right-0 border-t border-dashed border-cyan-300/40 dark:border-cyan-600/30 pointer-events-none"
                            style={{ bottom: '50%' }}>
                            <span className="text-[7px] text-cyan-400 absolute -top-2 right-1">Wellness 50%</span>
                        </div>

                        {athleteLoad.slice(-14).map((l, i) => {
                            const hL = Math.min((l.sRPE / 800) * 100, 100);
                            const matchingHabit = athleteHabits.find(h => h.date === l.date);
                            const hH = matchingHabit ? (matchingHabit.readiness / 100) * 100 : 0;
                            return (
                                <div key={i} className="flex flex-col items-center gap-0.5 group relative flex-1">
                                    <div className="flex items-end gap-0.5">
                                        <div className="w-3 bg-indigo-400 dark:bg-indigo-500 rounded-t-sm opacity-80 transition-all group-hover:opacity-100"
                                            style={{ height: `${hL * 1.5}px` }} />
                                        <div className="w-3 bg-cyan-400 rounded-t-sm opacity-70 transition-all group-hover:opacity-100"
                                            style={{ height: `${hH * 1.5}px` }} />
                                    </div>
                                    <div className="text-[7px] text-slate-300 dark:text-[#475569]">{l.date.split('-')[2]}</div>
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 dark:bg-indigo-600 text-white text-[9px] px-2 py-1 rounded shadow z-10 whitespace-nowrap pointer-events-none">
                                        {l.date} · {l.sRPE?.toFixed(0) || 0} AU {matchingHabit ? `· R:${matchingHabit.readiness?.toFixed(0)}` : ''}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] text-slate-300 dark:text-[#475569]">
                        <span>14 days ago</span>
                        <span>Today</span>
                    </div>
                </div>
            )}

            {/* ── How This Works ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest">How This Works</div>
                    <div className="text-[9px] text-slate-400 dark:text-[#475569] mt-0.5">Baseline methodology · deviation thresholds · how to read each metric</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#1A2D48]">
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide mb-2">Rolling Baseline</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                            All metrics are computed as a 28-day rolling average. This "baseline" reflects the athlete's established norm — what their body has adapted to over the past month.
                        </p>
                    </div>
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">Deviation Signals</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                            A significant deviation from baseline (&gt;15%) in either direction signals a meaningful shift. Rising load with falling wellness readiness is the classic early fatigue pattern.
                        </p>
                    </div>
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-rose-500 uppercase tracking-wide mb-2">Volatility Flag</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                            Volatility (CV &gt;40%) means the 7-day trend is highly inconsistent. Consistent load is more important than average load magnitude for chronic adaptation and injury prevention.
                        </p>
                    </div>
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">ACWR on this page</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                            ACWR here uses a simple 7:28 ratio (acute / chronic average). For EWMA-based ACWR projections and scenario planning, use the Scenario Modelling terminal.
                        </p>
                    </div>
                </div>
            </div>

            {/* Empty state */}
            {!hasLoadData && !hasWellnessData && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-dashed border-slate-200 dark:border-[#243A58] p-12 text-center">
                    <InfoIcon size={28} className="mx-auto text-slate-300 dark:text-[#475569] mb-3" />
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1">No Data Available</h3>
                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] max-w-sm mx-auto">
                        Log training loads and wellness check-ins to begin building baselines and trend analysis.
                    </p>
                </div>
            )}
        </div>
    );
};
