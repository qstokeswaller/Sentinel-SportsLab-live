// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Trash2Icon } from 'lucide-react';

export const ScenarioModellingTerminal = ({ scheduledSessions = [], loadRecords = [], wellnessData = [], selectedAnalyticsAthleteId, subjectAthleteIds, selectedSubject }) => {
    const [simulatedSessions, setSimulatedSessions] = useState([]);
    const isTeam = (subjectAthleteIds || []).length > 1;

    // Aggregation helper
    const aggregateData = (data, fields) => {
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

    // Initialize simulated sessions from upcoming planned sessions
    useEffect(() => {
        const now = new Date();
        const subjectSessRaw = scheduledSessions.filter(s => (subjectAthleteIds || [selectedAnalyticsAthleteId]).includes(s.athleteId));

        let upcoming = [];
        if (isTeam) {
            const grouped = subjectSessRaw.reduce((acc, s) => {
                const key = `${s.date}_${s.title}`;
                if (!acc[key]) acc[key] = { ...s, count: 0, sumRPE: 0, sumDur: 0 };
                acc[key].count++;
                acc[key].sumRPE += (s.plannedRPE || 5);
                acc[key].sumDur += (s.plannedDuration || 60);
                return acc;
            }, {});
            upcoming = Object.values(grouped).map(g => ({
                ...g,
                plannedRPE: g.sumRPE / g.count,
                plannedDuration: g.sumDur / g.count
            }));
        } else {
            upcoming = subjectSessRaw;
        }

        const finalUpcoming = upcoming.filter(s => {
            const d = new Date(s.date);
            return d >= now && d <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }).map(s => ({
            ...s,
            simulatedRPE: s.plannedRPE || 5,
            simulatedDuration: s.plannedDuration || 60
        }));
        setSimulatedSessions(finalUpcoming);
    }, [scheduledSessions, selectedAnalyticsAthleteId, subjectAthleteIds]);

    const updateSim = (id, field, val) => {
        setSimulatedSessions(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
    };

    const historyRaw = loadRecords.filter(l => (subjectAthleteIds || [selectedAnalyticsAthleteId]).includes(l.athleteId));
    const wellnessRaw = (wellnessData || []).filter(d => (subjectAthleteIds || [selectedAnalyticsAthleteId]).includes(d.athleteId));

    const history = aggregateData(historyRaw, ['sRPE']);
    const latestWellness = aggregateData(wellnessRaw, ['soreness', 'sleep', 'sickness']).slice(-1)[0] || {};

    const calculateProjectedMetrics = (dayOffset) => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + dayOffset);
        const dateStr = targetDate.toISOString().split('T')[0];

        const simLoad = simulatedSessions
            .filter(s => s.date <= dateStr)
            .map(s => ({ date: s.date, sRPE: (s.simulatedRPE * s.simulatedDuration) }));

        const totalLoadSeries = [...history, ...simLoad].sort((a, b) => new Date(a.date) - new Date(b.date));

        const getSum = (days, refDate) => {
            const start = new Date(refDate);
            start.setDate(refDate.getDate() - days);
            return totalLoadSeries
                .filter(l => {
                    const d = new Date(l.date);
                    return d > start && d <= refDate;
                })
                .reduce((acc, l) => acc + (l.sRPE || 0), 0);
        };

        const acute = getSum(7, targetDate);
        const chronic = getSum(28, targetDate) / 4;
        const acwr = chronic > 0 ? (acute / chronic) : 1.0;
        return { acute, chronic, acwr };
    };

    const projection = Array.from({ length: 7 }, (_, i) => ({
        day: i + 1,
        ...calculateProjectedMetrics(i + 1)
    }));

    const finalACWR = projection[6].acwr;
    const wellnessRisk = (latestWellness.soreness >= 4 ? 0.3 : 0) +
        (latestWellness.sleep <= 5 ? 0.2 : 0) +
        (latestWellness.sickness ? 0.5 : 0);

    const baseRisk = finalACWR > 1.5 ? 0.8 : finalACWR > 1.3 ? 0.5 : 0.2;
    const combinedRisk = Math.min(1.0, baseRisk + wellnessRisk);

    const riskLevel = combinedRisk > 0.7 ? 'High' : combinedRisk > 0.4 ? 'Moderate' : 'Low';
    const riskColor = riskLevel === 'High' ? 'text-rose-500' : riskLevel === 'Moderate' ? 'text-amber-500' : 'text-emerald-500';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-xl border border-indigo-100 shadow-sm space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h4 className="text-2xl font-semibold uppercase tracking-tighter text-indigo-900">Training Logic Simulator</h4>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mt-1">Adjust upcoming sessions to see projected risk</p>
                    </div>
                    <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-xl">
                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                        <span className="text-[10px] font-semibold uppercase text-indigo-900">Active Scenario</span>
                    </div>
                </div>

                <div className="space-y-4">
                    {simulatedSessions.length > 0 ? simulatedSessions.map(session => (
                        <div key={session.id} className="p-6 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center gap-8">
                            <div className="flex-1 min-w-[200px]">
                                <div className="text-[10px] font-semibold text-indigo-400 uppercase mb-1">{session.date}</div>
                                <div className="font-semibold text-indigo-900 uppercase">{session.title}</div>
                            </div>
                            <div className="flex gap-6">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-semibold uppercase text-slate-400">Planned RPE: {session.simulatedRPE}</label>
                                    <input
                                        type="range" min="1" max="10"
                                        value={session.simulatedRPE}
                                        onChange={(e) => updateSim(session.id, 'simulatedRPE', parseInt(e.target.value))}
                                        className="w-32 h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-semibold uppercase text-slate-400">Duration: {session.simulatedDuration}m</label>
                                    <input
                                        type="range" min="0" max="180" step="15"
                                        value={session.simulatedDuration}
                                        onChange={(e) => updateSim(session.id, 'simulatedDuration', parseInt(e.target.value))}
                                        className="w-32 h-1.5 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => setSimulatedSessions(prev => prev.filter(s => s.id !== session.id))}
                                className="p-2 text-rose-400 hover:text-rose-600 transition-colors"
                            >
                                <Trash2Icon size={16} />
                            </button>
                        </div>
                    )) : (
                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">No upcoming sessions found for {selectedSubject?.name}</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-10 rounded-xl border border-indigo-100 shadow-sm space-y-8">
                    <h4 className="text-xl font-semibold uppercase tracking-tighter text-indigo-900">7-Day ACWR Trajectory</h4>
                    <div className="h-64 flex items-end justify-between px-6 border-b border-l border-indigo-50 relative pt-12">
                        <div className="absolute top-4 right-0 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[8px] font-semibold text-rose-600 uppercase">Risk Zone (&gt;1.5)</div>
                        {projection.map((point, i) => {
                            const h = Math.min(point.acwr * 60, 200);
                            return (
                                <div key={i} className="flex flex-col items-center gap-2 group relative">
                                    <div className={`w-8 rounded-t-lg transition-all ${point.acwr > 1.5 ? 'bg-rose-500' : point.acwr > 1.3 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ height: `${h}px` }}></div>
                                    <div className="text-[8px] font-semibold text-slate-400">D+{point.day}</div>
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded transition-all z-10">
                                        {point.acwr.toFixed(2)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-10 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between">
                    <div className="space-y-6">
                        <h4 className="text-xl font-semibold uppercase tracking-tighter text-indigo-900">Risk Assessment</h4>
                        <div className="text-center py-8">
                            <div className={`text-5xl font-semibold uppercase ${riskColor} tracking-tighter`}>{riskLevel}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-2">Overall Rating</div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Projected ACWR</span>
                                <span className={finalACWR > 1.3 ? 'text-rose-500' : 'text-emerald-500'}>{finalACWR.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase border-b border-slate-50 pb-2">
                                <span className="text-slate-500">Wellness Modifiers</span>
                                <span className={wellnessRisk > 0 ? 'text-amber-500' : 'text-emerald-500'}>{(wellnessRisk * 100).toFixed(0)}% Penalty</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase leading-relaxed">
                            <span className="font-semibold text-indigo-900">Logic:</span> {
                                riskLevel === 'High' ? "Critical load spike predicted. High probability of overuse injury if cumulative fatigue is not managed." :
                                    riskLevel === 'Moderate' ? "Load is trending high. Ensure recovery protocols are prioritized to maintain readiness." :
                                        "Planned output is aligned with athlete capacity. Projecting positive adaptation."
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
