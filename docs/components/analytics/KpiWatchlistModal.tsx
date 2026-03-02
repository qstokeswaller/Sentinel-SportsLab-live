// @ts-nocheck
import React from 'react';
import { XIcon, EyeIcon, ActivityIcon, TargetIcon, TrendingUpIcon, ZapIcon, ClockIcon, ArrowUpRightIcon, ArrowDownRightIcon } from 'lucide-react';

export const KpiWatchlistModal = ({ isOpen, onClose, watchlistItems }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4 animate-in fade-in duration-500">
            <div className="bg-white rounded-[4rem] w-full max-w-6xl h-[85vh] shadow-[0_32px_128px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="p-12 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                <EyeIcon size={24} />
                            </div>
                            <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900">KPI Global Watchlist</h3>
                        </div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest pl-16">Real-time anomaly detection across multi-variate metrics</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 hover:bg-slate-200 rounded-full text-slate-400 transition-all active:scale-95"
                    >
                        <XIcon size={32} />
                    </button>
                </div>

                <div className="flex-1 p-12 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {watchlistItems.map((item, i) => (
                        <div key={i} className="group bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2">
                            <div className="flex justify-between items-start mb-10">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${item.severity === 'Critical' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    <ActivityIcon size={28} />
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Severity</div>
                                    <div className={`text-xs font-black uppercase ${item.severity === 'Critical' ? 'text-rose-500' : 'text-emerald-500'}`}>{item.severity}</div>
                                </div>
                            </div>

                            <div className="space-y-2 mb-10">
                                <div className="text-xs font-black text-indigo-500 uppercase tracking-widest">{item.metric}</div>
                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{item.athlete}</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Current</div>
                                    <div className="text-xl font-black text-slate-900">{item.current}</div>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <div className="text-[8px] font-black text-slate-400 uppercase mb-1">Baseline</div>
                                    <div className="text-xl font-black text-slate-600">{item.baseline}</div>
                                </div>
                            </div>

                            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${item.trend === 'up' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                                {item.trend === 'up' ? <ArrowUpRightIcon className="text-emerald-500" size={20} /> : <ArrowDownRightIcon className="text-rose-500" size={20} />}
                                <span className={`text-[10px] font-black uppercase ${item.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {item.change} {item.trend === 'up' ? 'Increase' : 'Regression'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
