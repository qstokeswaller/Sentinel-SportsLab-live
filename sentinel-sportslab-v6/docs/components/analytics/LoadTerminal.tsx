// @ts-nocheck
import React from 'react';
import { ActivityIcon, TrendingUpIcon, AlertCircleIcon, ZapIcon } from 'lucide-react';

export const LoadTerminal = ({ loadRegistry, acwrValue, acwrStatus, athleteLoad }) => {
    return (
        <div className="bg-white p-10 rounded-xl border border-indigo-100 shadow-sm space-y-10">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h3 className="text-2xl font-semibold uppercase tracking-tighter text-indigo-900">Load & Fatigue Terminal</h3>
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide">Biometric strain vs. historical capacity</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-4 py-2 bg-indigo-50 rounded-xl text-[10px] font-semibold text-indigo-600 uppercase">Pro Logic V4.2</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-8 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-4">
                    <div className="flex justify-between items-center">
                        <ActivityIcon size={24} className="text-indigo-600" />
                        <span className={`px-3 py-1 rounded-full text-[8px] font-semibold uppercase tracking-wide ${acwrStatus.color.replace('text-', 'bg-').replace('600', '100')} ${acwrStatus.color}`}>
                            {acwrStatus.label}
                        </span>
                    </div>
                    <div>
                        <div className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-1">Current ACWR</div>
                        <div className="text-4xl font-semibold text-indigo-900">{acwrValue.toFixed(2)}</div>
                    </div>
                </div>

                <div className="p-8 bg-white rounded-xl border border-slate-100 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                        <TrendingUpIcon size={24} className="text-emerald-500" />
                        <span className="text-[8px] font-semibold text-emerald-500 uppercase tracking-wide bg-emerald-50 px-2 py-1 rounded-full">+12% vs LW</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Acute Load (7d)</div>
                        <div className="text-4xl font-semibold text-slate-900">{athleteLoad.slice(-7).reduce((acc, r) => acc + (r.sRPE || 0), 0)}</div>
                    </div>
                </div>

                <div className="p-8 bg-white rounded-xl border border-slate-100 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                        <AlertCircleIcon size={24} className="text-indigo-400" />
                        <span className="text-[8px] font-semibold text-slate-400 uppercase tracking-wide">Steady</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Chronic Load (28d)</div>
                        <div className="text-4xl font-semibold text-slate-900">{(athleteLoad.slice(-28).reduce((acc, r) => acc + (r.sRPE || 0), 0) / 4).toFixed(0)}</div>
                    </div>
                </div>

                <div className="p-8 bg-slate-900 rounded-xl space-y-4 shadow-xl">
                    <div className="flex justify-between items-center">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <ZapIcon size={18} className="text-indigo-400" />
                        </div>
                        <span className="text-[8px] font-semibold text-indigo-400 uppercase tracking-wide italic">Est. Freshness</span>
                    </div>
                    <div>
                        <div className="text-[10px] font-semibold text-indigo-300/50 uppercase tracking-wide mb-1">Training TSB</div>
                        <div className="text-4xl font-semibold text-white">+8.4</div>
                    </div>
                </div>
            </div>

            <div className="pt-8 border-t border-slate-50">
                <div className="flex flex-wrap gap-4">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                        const load = athleteLoad[athleteLoad.length - 7 + i]?.sRPE || 0;
                        const h = Math.min((load / 1000) * 100, 100);
                        return (
                            <div key={day} className="flex-1 min-w-[100px] flex flex-col gap-3">
                                <div className="h-32 bg-slate-50 rounded-xl relative overflow-hidden flex items-end p-1">
                                    <div
                                        className="w-full bg-indigo-500 rounded-xl opacity-80"
                                        style={{ height: `${h}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">{day}</span>
                                    <span className="text-[10px] font-semibold text-slate-900">{load}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
