// @ts-nocheck
import React from 'react';
import { XIcon, EyeIcon, ActivityIcon, ArrowUpRightIcon, ArrowDownRightIcon } from 'lucide-react';

export const KpiWatchlistModal = ({ isOpen, onClose, watchlistItems }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-5xl h-[80vh] shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                            <EyeIcon size={18} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">KPI Global Watchlist</h3>
                            <p className="text-xs text-slate-400">Real-time anomaly detection across multi-variate metrics</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
                    >
                        <XIcon size={18} />
                    </button>
                </div>

                <div className="flex-1 p-5 overflow-y-auto no-scrollbar grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {watchlistItems.map((item, i) => (
                        <div key={i} className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.severity === 'Critical' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                    <ActivityIcon size={18} />
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-medium text-slate-400">Severity</div>
                                    <div className={`text-xs font-semibold ${item.severity === 'Critical' ? 'text-rose-500' : 'text-emerald-500'}`}>{item.severity}</div>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <div className="text-xs font-medium text-indigo-500">{item.metric}</div>
                                <h4 className="text-base font-semibold text-slate-900">{item.athlete}</h4>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-[10px] font-medium text-slate-400 mb-1">Current</div>
                                    <div className="text-lg font-semibold text-slate-900">{item.current}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg">
                                    <div className="text-[10px] font-medium text-slate-400 mb-1">Baseline</div>
                                    <div className="text-lg font-semibold text-slate-600">{item.baseline}</div>
                                </div>
                            </div>

                            <div className={`flex items-center gap-2 p-3 rounded-lg border ${item.trend === 'up' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                                {item.trend === 'up' ? <ArrowUpRightIcon className="text-emerald-500" size={16} /> : <ArrowDownRightIcon className="text-rose-500" size={16} />}
                                <span className={`text-xs font-medium ${item.trend === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
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
