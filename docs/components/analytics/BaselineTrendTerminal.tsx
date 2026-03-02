// @ts-nocheck
import React from 'react';

export const BaselineTrendTerminal = ({ habitRecords, loadRecords, selectedAnalyticsAthleteId, subjectAthleteIds }) => {
    // Aggregation logic for Team or individual view
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

    const athleteHabitsRaw = React.useMemo(() => (habitRecords || []).filter(r => (subjectAthleteIds || [selectedAnalyticsAthleteId]).includes(r.athleteId)), [habitRecords, subjectAthleteIds, selectedAnalyticsAthleteId]);
    const athleteLoadRaw = React.useMemo(() => (loadRecords || []).filter(r => (subjectAthleteIds || [selectedAnalyticsAthleteId]).includes(r.athleteId)), [loadRecords, subjectAthleteIds, selectedAnalyticsAthleteId]);

    const athleteHabits = React.useMemo(() => aggregateByDate(athleteHabitsRaw, ['readiness', 'sleep', 'stress', 'soreness', 'energy']), [athleteHabitsRaw]);
    const athleteLoad = React.useMemo(() => aggregateByDate(athleteLoadRaw, ['sRPE']), [athleteLoadRaw]);

    const calculateBaseline = (data, field, days = 28) => {
        const recent = data.slice(-days);
        if (recent.length === 0) return 0;
        const sum = recent.reduce((acc, r) => acc + (r[field] || 0), 0);
        return sum / recent.length;
    };

    const loadValue = athleteLoad.length > 0 ? athleteLoad[athleteLoad.length - 1].sRPE : 0;
    const loadBaseline = calculateBaseline(athleteLoad, 'sRPE');
    const loadDeviation = loadBaseline > 0 ? ((loadValue - loadBaseline) / loadBaseline * 100) : 0;

    const wellnessValue = athleteHabits.length > 0 ? athleteHabits[athleteHabits.length - 1].readiness : 0;
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

    const loadTrend = getTrend(athleteLoad, 'sRPE');
    const wellnessTrend = getTrend(athleteHabits, 'readiness');

    // Volatility check (SD approximation)
    const isVolatile = (data, field) => {
        const recent = data.slice(-7);
        if (recent.length < 7) return false;
        const mean = recent.reduce((acc, r) => acc + (r[field] || 0), 0) / 7;
        const variance = recent.reduce((acc, r) => acc + Math.pow((r[field] || 0) - mean, 2), 0) / 7;
        return Math.sqrt(variance) > (mean * 0.4); // 40% CV as threshold for volatility
    };

    const loadVolatility = isVolatile(athleteLoad, 'sRPE');
    const wellnessVolatility = isVolatile(athleteHabits, 'readiness');

    const getStatusColor = (trend, volatile, inverse = false) => {
        if (volatile) return 'text-purple-500 bg-purple-50 border-purple-100';
        if (trend === 'Stable') return 'text-emerald-500 bg-emerald-50 border-emerald-100';
        if (!inverse) return trend === 'Increasing' ? 'text-rose-500 bg-rose-50 border-rose-100' : 'text-amber-500 bg-amber-50 border-amber-100';
        return trend === 'Increasing' ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : 'text-rose-500 bg-rose-50 border-rose-100';
    };

    // ACWR Logic - Professional V4 Alignment
    const getACWR = (data) => {
        if (data.length < 14) return 1.0; // Wait for at least 2 weeks of data
        const acute = data.slice(-7).reduce((acc, r) => acc + (r.sRPE || 0), 0);
        const chronicSum = data.slice(-28).reduce((acc, r) => acc + (r.sRPE || 0), 0);
        const chronicAvg = chronicSum / 4;
        return chronicAvg > 0 ? (acute / chronicAvg) : 1.0;
    };
    const currentACWR = getACWR(athleteLoad);


    const riskState = currentACWR > 1.5 ? 'High Risk' : currentACWR > 1.3 ? 'Functional Overreaching' : wellnessValue < 50 ? 'Accumulated Fatigue' : 'Positive Adaptation';
    const riskColor = riskState === 'High Risk' ? 'text-rose-500' : riskState === 'Functional Overreaching' ? 'text-amber-500' : 'text-emerald-500';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Daily Load Baseline</div>
                    <div className="flex items-baseline justify-between">
                        <div className="text-4xl font-black text-indigo-900">{loadBaseline.toFixed(0)}</div>
                        <div className={`text-xs font-black ${loadDeviation > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {loadDeviation > 0 ? '+' : ''}{loadDeviation.toFixed(1)}%
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase text-center ${getStatusColor(loadTrend, loadVolatility)}`}>
                        {loadVolatility ? 'Volatile' : `Trend: ${loadTrend}`}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Wellness Baseline</div>
                    <div className="flex items-baseline justify-between">
                        <div className="text-4xl font-black text-indigo-900">{wellnessBaseline.toFixed(1)}</div>
                        <div className={`text-xs font-black ${wellnessDeviation < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {wellnessDeviation > 0 ? '+' : ''}{wellnessDeviation.toFixed(1)}%
                        </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase text-center ${getStatusColor(wellnessTrend, wellnessVolatility, true)}`}>
                        {wellnessVolatility ? 'Volatile' : `Trend: ${wellnessTrend}`}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-indigo-100 shadow-sm space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Current ACWR</div>
                    <div className="text-4xl font-black text-indigo-900">{currentACWR.toFixed(2)}</div>
                    <div className={`px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase text-center ${currentACWR > 1.5 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        Status: {currentACWR > 1.5 ? 'CRITICAL' : 'OPTIMAL'}
                    </div>
                </div>

                <div className="bg-indigo-900 p-8 rounded-[3rem] shadow-xl space-y-4 text-white">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300 italic">Diagnostic Summary</div>
                    <div className={`text-2xl font-black uppercase tracking-tighter leading-tight ${riskColor}`}>{riskState}</div>
                    <p className="text-[10px] font-bold text-indigo-200 uppercase leading-relaxed">System detecting {riskState.toLowerCase()} pattern based on multi-variate baseline deviation.</p>
                </div>
            </div>

            <div className="bg-white p-10 rounded-[3rem] border border-indigo-100 shadow-sm space-y-8">
                <div className="flex justify-between items-center">
                    <h4 className="text-xl font-black uppercase tracking-tighter text-indigo-900">Baseline vs. Current Volatility</h4>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-indigo-400">
                            <div className="w-3 h-3 bg-indigo-500 rounded-full"></div> Load
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-indigo-400">
                            <div className="w-3 h-3 bg-cyan-400 rounded-full"></div> Wellness
                        </div>
                    </div>
                </div>
                <div className="h-48 flex items-end justify-between px-6 border-b border-indigo-50 relative pt-12">
                    {athleteLoad.slice(-14).map((l, i) => {
                        const hL = Math.min((l.sRPE / 800) * 100, 100);
                        const matchingHabit = athleteHabits.find(h => h.date === l.date);
                        const hH = matchingHabit ? (matchingHabit.readiness / 100) * 100 : 0;
                        return (
                            <div key={i} className="flex flex-col items-center gap-1 group relative">
                                <div className="flex items-end gap-1">
                                    <div className="w-3 bg-indigo-500 rounded-t-sm opacity-80" style={{ height: `${hL}px` }}></div>
                                    <div className="w-3 bg-cyan-400 rounded-t-sm opacity-80" style={{ height: `${hH}px` }}></div>
                                </div>
                                <div className="text-[8px] font-black text-slate-300">{l.date.split('-')[2]}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
