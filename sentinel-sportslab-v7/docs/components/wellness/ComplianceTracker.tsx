// @ts-nocheck
/**
 * ComplianceTracker — Daily form completion rate over time
 *
 * Shows a bar chart of daily compliance % for the last 14/30 days.
 * Helps sport scientists identify when athletes stop filling in forms.
 */

import React, { useMemo } from 'react';

interface ComplianceProps {
    athletes: { id: string; name: string }[];
    responses: any[];
    days?: number;
}

const ComplianceTracker: React.FC<ComplianceProps> = ({ athletes, responses, days = 14 }) => {
    const totalAthletes = athletes.length;

    const dailyCompliance = useMemo(() => {
        const today = new Date();
        const result: { date: string; day: string; count: number; pct: number }[] = [];

        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dayName = d.toLocaleDateString('en', { weekday: 'narrow' });

            // Count unique athletes who submitted a daily check-in on this date
            const respondedIds = new Set<string>();
            for (const r of responses) {
                if (r.tier && r.tier !== 'daily') continue; // only count daily form submissions
                const rDate = (r.session_date || r.date || '').split('T')[0];
                if (rDate === dateStr) {
                    respondedIds.add(r.athlete_id || r.athleteId);
                }
            }

            const count = respondedIds.size;
            const pct = totalAthletes > 0 ? Math.round((count / totalAthletes) * 100) : 0;
            result.push({ date: dateStr, day: dayName, count, pct });
        }

        return result;
    }, [responses, athletes, days]);

    const avgCompliance = dailyCompliance.length > 0
        ? Math.round(dailyCompliance.reduce((s, d) => s + d.pct, 0) / dailyCompliance.length)
        : 0;

    const maxBarHeight = 48;

    if (totalAthletes === 0) return null;

    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-semibold text-slate-800">Compliance</h4>
                    <p className="text-[10px] text-slate-400">Daily form completion rate</p>
                </div>
                <div className="text-right">
                    <div className={`text-lg font-bold ${avgCompliance >= 80 ? 'text-emerald-600' : avgCompliance >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {avgCompliance}%
                    </div>
                    <div className="text-[9px] text-slate-400">{days}-day avg</div>
                </div>
            </div>

            <div className="px-4 py-3">
                <div className="flex items-end gap-1" style={{ height: maxBarHeight + 16 }}>
                    {dailyCompliance.map((d, i) => {
                        const barH = Math.max(2, (d.pct / 100) * maxBarHeight);
                        const isToday = i === dailyCompliance.length - 1;
                        const color = d.pct >= 80 ? 'bg-emerald-400' : d.pct >= 50 ? 'bg-amber-400' : d.pct > 0 ? 'bg-rose-400' : 'bg-slate-200';
                        return (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.count}/${totalAthletes} (${d.pct}%)`}>
                                <div className="text-[8px] text-slate-400 font-medium">{d.pct > 0 ? `${d.pct}` : ''}</div>
                                <div className={`w-full rounded-t-sm transition-all ${color} ${isToday ? 'ring-2 ring-indigo-300' : ''}`} style={{ height: barH }} />
                                <div className={`text-[8px] ${isToday ? 'font-bold text-indigo-600' : 'text-slate-400'}`}>{d.day}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ComplianceTracker;
