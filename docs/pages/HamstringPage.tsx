// @ts-nocheck
import React, { useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';

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
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                    onClick={() => setHamAssessmentMode('split')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${hamAssessmentMode === 'split' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Split (L/R)
                </button>
                <button
                    onClick={() => setHamAssessmentMode('aggregate')}
                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${hamAssessmentMode === 'aggregate' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Aggregate
                </button>
            </div>

            {hamAssessmentMode === 'split' ? (
                <div className="space-y-6">
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-xs text-orange-900 leading-relaxed">
                        <strong className="block uppercase tracking-widest mb-1 text-orange-600 text-[10px]">Nordic Split Assessment</strong>
                        <p>Input peak force for each leg and body weight to calculate relative strength and asymmetry.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Left (N)</label>
                            <input type="number" value={hamLeft} onChange={(e) => setHamLeft(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-md font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="350" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Right (N)</label>
                            <input type="number" value={hamRight} onChange={(e) => setHamRight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-md font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="340" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">BW (kg)</label>
                            <input type="number" value={hamBodyWeight} onChange={(e) => setHamBodyWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-md font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="85" />
                        </div>
                    </div>

                    {hamResults && (
                        <div className="bg-slate-900 rounded-2xl p-5 text-white space-y-4">
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Avg Force</span>
                                    <div className="text-xl font-black">{Math.round(hamResults.avg)}N</div>
                                </div>
                                <div>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Asymmetry</span>
                                    <div className={`text-xl font-black ${hamResults.color}`}>{hamResults.asymmetry}%</div>
                                </div>
                                <div>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Rel. Str</span>
                                    <div className="text-xl font-black text-orange-400">{hamResults.relativeStrength || '--'}</div>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-800 text-center">
                                <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${hamResults.color} bg-white/10`}>
                                    Risk: {hamResults.riskText}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-xs text-orange-900 leading-relaxed">
                        <strong className="block uppercase tracking-widest mb-1 text-orange-600 text-[10px]">Nordic Aggregate Assessment</strong>
                        <p>Input total peak force and body weight to calculate relative strength.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Total Force (N)</label>
                            <input type="number" value={hamAggregate} onChange={(e) => setHamAggregate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="e.g. 700" />
                        </div>
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Body Weight (kg)</label>
                            <input type="number" value={hamBodyWeight} onChange={(e) => setHamBodyWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="e.g. 85" />
                        </div>
                    </div>

                    {hamResults && (
                        <div className="bg-slate-900 rounded-2xl p-6 text-white text-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Relative Nordic Strength</span>
                            <div className="text-5xl font-black tracking-tighter text-orange-400">{hamResults.relativeStrength || '--'}</div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">N/kg</div>
                        </div>
                    )}
                </div>
            )}

            <div className="pt-4 border-t border-slate-100 space-y-3">
                <select value={hamAthleteId} onChange={(e) => setHamAthleteId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                    <option value="">Select Athlete to Save Score...</option>
                    {allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button onClick={() => handleSaveMetricWithType('hamstring')} className="w-full py-3 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-orange-700">Save Assessment</button>
            </div>
        </div>
    );
};
