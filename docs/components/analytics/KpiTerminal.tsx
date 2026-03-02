// @ts-nocheck
import React from 'react';
import { ActivityIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon } from 'lucide-react';

const calculateTrendSlope = (data) => {
    if (data.length < 2) return 0;
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += data[i];
        sumXY += i * data[i];
        sumXX += i * i;
    }
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
};

const PulseGraph = ({ values, color }) => {
    const max = Math.max(...values, 10);
    const min = Math.min(...values);

    return (
        <div className="flex items-end gap-1 h-8">
            {values.slice(-7).map((v, i) => {
                const height = ((v - min) / (max - min || 1)) * 100 + 20;
                return (
                    <div
                        key={i}
                        className={`w-1 rounded-full opacity-40 ${color}`}
                        style={{ height: `${Math.min(height, 100)}%` }}
                    ></div>
                );
            })}
        </div>
    );
};

export const KpiTerminal = ({ kpiData, selectedAthlete }) => {
    if (!kpiData || kpiData.length === 0) return null;

    const athleteKpis = kpiData.filter(d => d.athleteId === selectedAthlete || (!selectedAthlete && d.athleteId === 'all'));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {athleteKpis.map(kpi => {
                const slope = calculateTrendSlope(kpi.history);
                const isPositiveTrend = slope > 0;
                const isStable = Math.abs(slope) < 0.1;

                return (
                    <div key={kpi.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-md group">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-3 rounded-2xl ${isStable ? 'bg-slate-50 text-slate-400' : isPositiveTrend ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                                {isStable ? <MinusIcon size={20} /> : isPositiveTrend ? <TrendingUpIcon size={20} /> : <TrendingDownIcon size={20} />}
                            </div>
                            <PulseGraph values={kpi.history} color={isStable ? 'bg-slate-400' : isPositiveTrend ? 'bg-emerald-500' : 'bg-rose-500'} />
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black text-slate-900">{kpi.value}</span>
                                <span className="text-[10px] font-black text-slate-400">{kpi.unit}</span>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-[8px] font-black text-slate-400 uppercase">7-Day Momentum</span>
                            <span className={`text-[8px] font-black uppercase ${isStable ? 'text-slate-400' : isPositiveTrend ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {isStable ? 'Neutral' : isPositiveTrend ? '+ Improvement' : '- Regression'}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
