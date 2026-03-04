// @ts-nocheck
import React, { useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import { Button } from '@/components/ui/button';

export const HamstringPage = () => {
    const {
        hamAssessmentMode,
        setHamAssessmentMode,
        hamLeft,
        setHamLeft,
        hamRight,
        setHamRight,
        hamBodyWeight,
        setHamBodyWeight,
        hamAggregate,
        setHamAggregate,
        hamAthleteId,
        setHamAthleteId,
        teams,
        handleSaveMetricWithType,
        calculateHamstringResults
    } = useAppState();

    const hamResults = useMemo(() => calculateHamstringResults(), [calculateHamstringResults]);
    const allAthletes = useMemo(() => teams.flatMap(t => t.players), [teams]);

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Mode toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit">
                <button
                    onClick={() => setHamAssessmentMode('split')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${hamAssessmentMode === 'split' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Split (L/R)
                </button>
                <button
                    onClick={() => setHamAssessmentMode('aggregate')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${hamAssessmentMode === 'aggregate' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Aggregate
                </button>
            </div>

            {hamAssessmentMode === 'split' ? (
                <div className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-900 leading-relaxed">
                        <strong className="block font-semibold mb-1 text-orange-700">Nordic Split Assessment</strong>
                        <p className="text-orange-600">Input peak force for each leg and body weight to calculate relative strength and asymmetry.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 block">Left (N)</label>
                            <input type="number" value={hamLeft} onChange={(e) => setHamLeft(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" placeholder="350" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 block">Right (N)</label>
                            <input type="number" value={hamRight} onChange={(e) => setHamRight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" placeholder="340" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 block">Body Weight (kg)</label>
                            <input type="number" value={hamBodyWeight} onChange={(e) => setHamBodyWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" placeholder="85" />
                        </div>
                    </div>

                    {hamResults && (
                        <div className="bg-slate-800 rounded-xl p-5 text-white space-y-4">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <span className="text-xs text-slate-400 block mb-1">Avg Force</span>
                                    <div className="text-xl font-semibold">{Math.round(hamResults.avg)}N</div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block mb-1">Asymmetry</span>
                                    <div className={`text-xl font-semibold ${hamResults.color}`}>{hamResults.asymmetry}%</div>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-400 block mb-1">Rel. Strength</span>
                                    <div className="text-xl font-semibold text-orange-400">{hamResults.relativeStrength || '--'}</div>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-700 text-center">
                                <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${hamResults.color} bg-white/10`}>
                                    Risk: {hamResults.riskText}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-900 leading-relaxed">
                        <strong className="block font-semibold mb-1 text-orange-700">Nordic Aggregate Assessment</strong>
                        <p className="text-orange-600">Input total peak force and body weight to calculate relative strength.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 block">Total Force (N)</label>
                            <input type="number" value={hamAggregate} onChange={(e) => setHamAggregate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" placeholder="e.g. 700" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500 block">Body Weight (kg)</label>
                            <input type="number" value={hamBodyWeight} onChange={(e) => setHamBodyWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" placeholder="e.g. 85" />
                        </div>
                    </div>

                    {hamResults && (
                        <div className="bg-slate-800 rounded-xl p-5 text-white text-center">
                            <span className="text-xs text-slate-400 block mb-2">Relative Nordic Strength</span>
                            <div className="text-4xl font-bold text-orange-400">{hamResults.relativeStrength || '--'}</div>
                            <div className="text-xs text-slate-500 mt-2">N/kg</div>
                        </div>
                    )}
                </div>
            )}

            {/* Save row */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
                <select
                    value={hamAthleteId}
                    onChange={(e) => setHamAthleteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-300"
                >
                    <option value="">Select athlete to save score...</option>
                    {allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                    onClick={() => handleSaveMetricWithType('hamstring')}
                    className="w-full py-2.5 bg-orange-600 text-white rounded-full text-sm font-medium shadow-sm hover:bg-orange-700 transition-colors"
                >
                    Save Assessment
                </button>
            </div>
        </div>
    );
};
