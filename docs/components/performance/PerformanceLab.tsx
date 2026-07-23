import React, { useState, useMemo } from 'react';
import {
    FlaskConicalIcon, XIcon, ArrowLeftIcon, InfoIcon,
    DumbbellIcon, GaugeIcon, LayersIcon, TrendingUpIcon,
    ZapIcon, ArrowRightLeftIcon, HeartPulseIcon, ActivityIcon, BikeIcon,
} from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CustomSelect } from '../ui/CustomSelect';
import WattbikeMapCalculator from './WattbikeMapCalculator';
import * as Calc from '../../utils/toolkitCalculators';

// ─────────────────────────────────────────────────────────────────────────────
// Sports-Science Toolkit
//
// Replaces the old Performance Lab (its tabs — 1RM/DSI/RSI/Nordic/MAP save +
// import — are now the Testing Hub's job). This is a pure *calculator* surface:
// fast, athlete-optional, nothing persisted. All maths lives in
// utils/toolkitCalculators.ts so it can be reasoned about in isolation.
//
// Layout: desktop = centred modal with a calculator rail; mobile = full-screen
// page (grid → calculator, with a back arrow). Every calculator carries a
// "how to use" note + reference at the bottom.
// ─────────────────────────────────────────────────────────────────────────────

const numInput =
    'w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:ring-2 focus:ring-indigo-500/20';
const labelCls =
    'text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1';

const NoteBox = ({ children, reference }: { children: React.ReactNode; reference?: string }) => (
    <div className="mt-6 p-4 bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-xl">
        <div className="flex items-center gap-1.5 mb-1.5">
            <InfoIcon size={12} className="text-indigo-500 dark:text-indigo-300" />
            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">How to use</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed">{children}</p>
        {reference && (
            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-2 italic">Reference: {reference}</p>
        )}
    </div>
);

const CalcShell = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div>
            <h4 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[#E2E8F0]">{title}</h4>
            {subtitle && <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5">{subtitle}</p>}
        </div>
        {children}
    </div>
);

// ─── 1RM & %1RM ───────────────────────────────────────────────────────────────
const OneRmCalc = () => {
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const est = useMemo(() => Calc.estimate1RM(parseFloat(weight), parseFloat(reps)), [weight, reps]);
    const table = useMemo(() => (est ? Calc.percentTable(est.average) : []), [est]);

    return (
        <CalcShell title="1RM & %1RM" subtitle="Estimate one-rep max from a set, then prescribe loads">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Load (kg)</label>
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className={numInput} placeholder="100" />
                </div>
                <div>
                    <label className={labelCls}>Reps</label>
                    <input type="number" value={reps} onChange={e => setReps(e.target.value)} className={numInput} placeholder="5" />
                </div>
            </div>

            {est && (
                <>
                    <div className="bg-slate-900 dark:bg-[#0F1C30] rounded-xl p-6 text-center">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide block mb-1">Estimated 1RM (avg of 7 formulas)</span>
                        <div className="text-5xl font-semibold tracking-tighter text-white">{est.average}<span className="text-xl text-slate-400 ml-1">kg</span></div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {([['Epley', est.epley], ['Brzycki', est.brzycki], ['Lombardi', est.lombardi], ['Lander', est.lander], ['O’Connor', est.oconnor], ['Mayhew', est.mayhew], ['Wathan', est.wathan]] as [string, number][]).map(([n, v]) => (
                            <div key={n} className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-lg px-2 py-1.5 text-center">
                                <div className="text-[8px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">{n}</div>
                                <div className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">{isFinite(v) ? v : '—'}</div>
                            </div>
                        ))}
                    </div>
                    <div>
                        <div className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Training Load Table</div>
                        <div className="rounded-xl border border-slate-100 dark:border-[#243A58] overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-[#0F1C30]">
                                    <tr>
                                        <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">% 1RM</th>
                                        <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Load</th>
                                        <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">~ Max reps</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {table.map(r => (
                                        <tr key={r.pct} className="border-t border-slate-50 dark:border-[#1A2D48]">
                                            <td className="px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">{r.pct}%</td>
                                            <td className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{r.load} kg</td>
                                            <td className="px-4 py-2 text-xs text-slate-500 dark:text-[#CBD5E1]">{r.reps ?? '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <NoteBox reference="LeSuer et al. (1997); NSCA training-load chart">
                Enter a submaximal set (load × reps) to estimate 1RM across seven validated formulas and their average — single-formula estimates carry more error. The load table then prescribes working weights. Most accurate at <strong>2–10 reps</strong>; if you already know a true 1RM, enter it as the load with <strong>1 rep</strong>.
            </NoteBox>
        </CalcShell>
    );
};

// ─── RPE → LOAD ───────────────────────────────────────────────────────────────
const RpeCalc = () => {
    const [oneRm, setOneRm] = useState('');
    const [reps, setReps] = useState('');
    const [rpe, setRpe] = useState('');
    const res = useMemo(() => Calc.rpeLoad(parseFloat(oneRm), parseFloat(reps), parseFloat(rpe)), [oneRm, reps, rpe]);

    return (
        <CalcShell title="RPE → Load" subtitle="Autoregulated working load from a target RPE">
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className={labelCls}>1RM (kg)</label>
                    <input type="number" value={oneRm} onChange={e => setOneRm(e.target.value)} className={numInput} placeholder="140" />
                </div>
                <div>
                    <label className={labelCls}>Reps</label>
                    <input type="number" value={reps} onChange={e => setReps(e.target.value)} className={numInput} placeholder="5" />
                </div>
                <div>
                    <label className={labelCls}>Target RPE</label>
                    <input type="number" min="1" max="10" step="0.5" value={rpe} onChange={e => setRpe(e.target.value)} className={numInput} placeholder="8" />
                </div>
            </div>

            {res && (
                <div className="bg-slate-900 dark:bg-[#0F1C30] rounded-xl p-6 text-white text-center space-y-4">
                    <div>
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide block mb-1">Working Load</span>
                        <div className="text-5xl font-semibold tracking-tighter">{res.load}<span className="text-xl text-slate-400 ml-1">kg</span></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 dark:border-[#243A58]">
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">RIR</span><div className="text-lg font-semibold">{res.rir}</div></div>
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">% 1RM</span><div className="text-lg font-semibold text-indigo-400">{res.pct}%</div></div>
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Reps to failure</span><div className="text-lg font-semibold">{res.repsToFailure}</div></div>
                    </div>
                </div>
            )}

            <NoteBox reference="Zourdos et al. (2016) RIR-based RPE">
                Converts a target <strong>RPE</strong> (rating of perceived exertion) into the load that lets an athlete hit the prescribed reps with the matching reps-in-reserve (RIR = 10 − RPE). Use it for autoregulated programming when an athlete's day-to-day readiness varies. Built on the Epley relationship, so it stays continuous across rep ranges.
            </NoteBox>
        </CalcShell>
    );
};

// ─── PLATE LOADER ─────────────────────────────────────────────────────────────
const PlateCalc = () => {
    const [target, setTarget] = useState('');
    const [bar, setBar] = useState('20');
    const res = useMemo(() => Calc.plateBreakdown(parseFloat(target), parseFloat(bar)), [target, bar]);

    return (
        <CalcShell title="Plate Loader" subtitle="Plates per side for a target barbell weight">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Target Total (kg)</label>
                    <input type="number" value={target} onChange={e => setTarget(e.target.value)} className={numInput} placeholder="100" />
                </div>
                <div>
                    <label className={labelCls}>Bar (kg)</label>
                    <input type="number" value={bar} onChange={e => setBar(e.target.value)} className={numInput} placeholder="20" />
                </div>
            </div>

            {res && res.perSide.length > 0 && (
                <div className="bg-slate-900 dark:bg-[#0F1C30] rounded-xl p-6 text-white space-y-4">
                    <div className="text-center">
                        <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide block mb-2">Load per side</span>
                        <div className="flex flex-wrap justify-center gap-2">
                            {res.perSide.map(p => (
                                <span key={p.plate} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-sm font-semibold">
                                    {p.count} × {p.plate}kg
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="pt-3 border-t border-slate-800 dark:border-[#243A58] text-center text-xs text-slate-400">
                        Loaded total: <strong className="text-white">{res.loadedTotal} kg</strong>
                        {!res.achievable && <span className="text-amber-400"> · {res.shortfall}kg short of target (not achievable with these plates)</span>}
                    </div>
                </div>
            )}
            {res && res.perSide.length === 0 && parseFloat(target) > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-300">
                    Target is at or below the bar weight — nothing to load.
                </div>
            )}

            <NoteBox reference="Standard IPF / Olympic plate set (25 → 1.25 kg)">
                Shows exactly which plates to put on <strong>each side</strong> to reach a target weight, given the bar. Uses a standard plate set and picks the heaviest plates first. If a target can't be made exactly, it shows the closest achievable load and the shortfall.
            </NoteBox>
        </CalcShell>
    );
};

// ─── WARM-UP RAMP ─────────────────────────────────────────────────────────────
const WarmupCalc = () => {
    const [working, setWorking] = useState('');
    const [bar, setBar] = useState('20');
    const ramp = useMemo(() => Calc.warmupRamp(parseFloat(working), parseFloat(bar)), [working, bar]);

    return (
        <CalcShell title="Warm-up Ramp" subtitle="Warm-up sets building to a working weight">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Working Weight (kg)</label>
                    <input type="number" value={working} onChange={e => setWorking(e.target.value)} className={numInput} placeholder="120" />
                </div>
                <div>
                    <label className={labelCls}>Bar (kg)</label>
                    <input type="number" value={bar} onChange={e => setBar(e.target.value)} className={numInput} placeholder="20" />
                </div>
            </div>

            {ramp.length > 0 && (
                <div className="rounded-xl border border-slate-100 dark:border-[#243A58] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-[#0F1C30]">
                            <tr>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Set</th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Load</th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Reps</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ramp.map((s, i) => (
                                <tr key={i} className={`border-t border-slate-50 dark:border-[#1A2D48] ${s.pct === 100 ? 'bg-indigo-50/60 dark:bg-indigo-500/10' : ''}`}>
                                    <td className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-[#CBD5E1]">{s.label}</td>
                                    <td className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{s.load} kg</td>
                                    <td className="px-4 py-2 text-xs text-slate-500 dark:text-[#CBD5E1]">{s.reps ?? 'work'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <NoteBox>
                Generates a general-prep warm-up progression (empty bar → 40 / 55 / 70 / 85% → working weight) so an athlete ramps to their working load without under- or over-fatiguing. Adjust to the movement and the individual — heavier or more technical lifts may need extra ramp steps.
            </NoteBox>
        </CalcShell>
    );
};

// ─── MAS / ASR ────────────────────────────────────────────────────────────────
const MasCalc = () => {
    const [mode, setMode] = useState<'direct' | 'trial'>('direct');
    const [mas, setMas] = useState('');
    const [dist, setDist] = useState('');
    const [time, setTime] = useState('');
    const [pct, setPct] = useState('100');
    const [work, setWork] = useState('');
    const [mss, setMss] = useState('');

    const masValue = useMemo(() => {
        if (mode === 'direct') return parseFloat(mas) || 0;
        return Calc.masFromTrial(parseFloat(dist), parseFloat(time)) || 0;
    }, [mode, mas, dist, time]);

    const res = useMemo(
        () => Calc.masPrescription(masValue, parseFloat(pct), parseFloat(work) || undefined, parseFloat(mss) || undefined),
        [masValue, pct, work, mss]
    );

    const refTable = useMemo(
        () => (masValue > 0 ? [90, 100, 110, 120].map(p => ({ p, r: Calc.masPrescription(masValue, p) })) : []),
        [masValue]
    );

    return (
        <CalcShell title="MAS / ASR" subtitle="Turn a MAS test into running pace & interval distances">
            <div className="flex bg-slate-100 dark:bg-[#0F1C30] p-1 rounded-xl">
                {(['direct', 'trial'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)} className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-all ${mode === m ? 'bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>
                        {m === 'direct' ? 'Enter MAS' : 'From Time-Trial'}
                    </button>
                ))}
            </div>

            {mode === 'direct' ? (
                <div>
                    <label className={labelCls}>MAS (m/s)</label>
                    <input type="number" step="0.1" value={mas} onChange={e => setMas(e.target.value)} className={numInput} placeholder="4.2" />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelCls}>Distance (m)</label>
                        <input type="number" value={dist} onChange={e => setDist(e.target.value)} className={numInput} placeholder="1500" />
                    </div>
                    <div>
                        <label className={labelCls}>Time (s)</label>
                        <input type="number" value={time} onChange={e => setTime(e.target.value)} className={numInput} placeholder="360" />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className={labelCls}>Target % MAS</label>
                    <input type="number" value={pct} onChange={e => setPct(e.target.value)} className={numInput} placeholder="100" />
                </div>
                <div>
                    <label className={labelCls}>Work (s)</label>
                    <input type="number" value={work} onChange={e => setWork(e.target.value)} className={numInput} placeholder="15" />
                </div>
                <div>
                    <label className={labelCls}>MSS (m/s) <span className="text-slate-300 dark:text-[#475569] normal-case">opt.</span></label>
                    <input type="number" step="0.1" value={mss} onChange={e => setMss(e.target.value)} className={numInput} placeholder="9.0" />
                </div>
            </div>

            {res && masValue > 0 && (
                <div className="bg-slate-900 dark:bg-[#0F1C30] rounded-xl p-6 text-white space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Speed</span><div className="text-xl font-semibold">{res.speedMs}<span className="text-xs text-slate-400"> m/s</span></div></div>
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Speed</span><div className="text-xl font-semibold">{res.speedKmh}<span className="text-xs text-slate-400"> km/h</span></div></div>
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Pace /km</span><div className="text-xl font-semibold text-indigo-400">{res.pacePerKm ?? '—'}</div></div>
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Distance</span><div className="text-xl font-semibold text-emerald-400">{res.distanceM != null ? `${res.distanceM} m` : '—'}</div></div>
                    </div>
                    {res.asr != null && (
                        <div className="pt-3 border-t border-slate-800 dark:border-[#243A58] text-center text-xs text-slate-400">
                            ASR (MSS − MAS): <strong className="text-white">{res.asr} m/s</strong>
                            {res.pctASR != null && <span> · this rep sits at <strong className="text-white">{res.pctASR}% ASR</strong></span>}
                        </div>
                    )}
                </div>
            )}

            {refTable.length > 0 && (
                <div className="rounded-xl border border-slate-100 dark:border-[#243A58] overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-[#0F1C30]">
                            <tr>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">% MAS</th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">km/h</th>
                                <th className="px-4 py-2 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Pace /km</th>
                            </tr>
                        </thead>
                        <tbody>
                            {refTable.map(({ p, r }) => (
                                <tr key={p} className="border-t border-slate-50 dark:border-[#1A2D48]">
                                    <td className="px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300">{p}%</td>
                                    <td className="px-4 py-2 text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{r?.speedKmh}</td>
                                    <td className="px-4 py-2 text-xs text-slate-500 dark:text-[#CBD5E1]">{r?.pacePerKm ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <NoteBox reference="Baker (2011); Buchheit & Laursen (2013)">
                <strong>MAS</strong> (maximal aerobic speed) is the lowest speed that elicits VO₂max — derive it from a max time-trial (distance ÷ time, e.g. a 1200–1500 m run) or a field test. Set a <strong>% MAS</strong> to get the running speed, pace, and the distance to cover in a work interval — the running equivalent of the Wattbike MAP → RPM prescription. Add <strong>MSS</strong> (max sprint speed) to get <strong>ASR</strong> for individualising supramaximal (&gt;100% MAS) intervals.
            </NoteBox>
        </CalcShell>
    );
};

// ─── PACE CONVERTER ───────────────────────────────────────────────────────────
const PaceCalc = () => {
    const [value, setValue] = useState('');
    const [unit, setUnit] = useState<Calc.SpeedUnit>('kmh');
    const res = useMemo(() => Calc.convertSpeed(value, unit), [value, unit]);
    const isPace = unit === 'pace_km' || unit === 'pace_mi';

    return (
        <CalcShell title="Pace Converter" subtitle="m/s · km/h · mph · pace per km / mile">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Value</label>
                    <input
                        type={isPace ? 'text' : 'number'}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        className={numInput}
                        placeholder={isPace ? '4:00' : '15'}
                    />
                </div>
                <div>
                    <label className={labelCls}>Unit</label>
                    <CustomSelect value={unit} onChange={(e: any) => setUnit(e.target.value)} variant="form" size="sm">
                        <option value="kmh">km/h</option>
                        <option value="ms">m/s</option>
                        <option value="mph">mph</option>
                        <option value="pace_km">Pace (min/km)</option>
                        <option value="pace_mi">Pace (min/mile)</option>
                    </CustomSelect>
                </div>
            </div>

            {res && (
                <div className="bg-slate-900 dark:bg-[#0F1C30] rounded-xl p-6 text-white grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">m/s</span><div className="text-lg font-semibold">{res.ms}</div></div>
                    <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">km/h</span><div className="text-lg font-semibold">{res.kmh}</div></div>
                    <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">mph</span><div className="text-lg font-semibold">{res.mph}</div></div>
                    <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">/km</span><div className="text-lg font-semibold text-indigo-400">{res.paceKm ?? '—'}</div></div>
                    <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">/mile</span><div className="text-lg font-semibold text-indigo-400">{res.paceMi ?? '—'}</div></div>
                </div>
            )}

            <NoteBox>
                Convert any running speed or pace into every other unit. Enter pace as <strong>m:ss</strong> (e.g. 4:00). Handy for translating GPS speeds, treadmill settings and MAS prescriptions into the units your athletes actually read.
            </NoteBox>
        </CalcShell>
    );
};

// ─── HR ZONES ─────────────────────────────────────────────────────────────────
const HrZonesCalc = () => {
    const [age, setAge] = useState('');
    const [manualMax, setManualMax] = useState('');
    const [rest, setRest] = useState('');
    const [method, setMethod] = useState<'max' | 'karvonen'>('max');

    const hrMax = useMemo(() => {
        if (manualMax) return parseFloat(manualMax);
        if (age) return Calc.tanakaHrMax(parseFloat(age));
        return 0;
    }, [age, manualMax]);

    const zones = useMemo(
        () => Calc.hrZones(hrMax, method, parseFloat(rest) || 60),
        [hrMax, method, rest]
    );

    const zoneColors = ['text-sky-400', 'text-emerald-400', 'text-amber-400', 'text-orange-400', 'text-rose-400'];

    return (
        <CalcShell title="HR Zones" subtitle="Five training zones from max HR or heart-rate reserve">
            <div className="grid grid-cols-3 gap-3">
                <div>
                    <label className={labelCls}>Age</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} className={numInput} placeholder="22" />
                </div>
                <div>
                    <label className={labelCls}>Max HR <span className="text-slate-300 dark:text-[#475569] normal-case">opt.</span></label>
                    <input type="number" value={manualMax} onChange={e => setManualMax(e.target.value)} className={numInput} placeholder="auto" />
                </div>
                <div>
                    <label className={labelCls}>Rest HR <span className="text-slate-300 dark:text-[#475569] normal-case">opt.</span></label>
                    <input type="number" value={rest} onChange={e => setRest(e.target.value)} className={numInput} placeholder="60" />
                </div>
            </div>

            <div className="flex bg-slate-100 dark:bg-[#0F1C30] p-1 rounded-xl">
                {([['max', '% Max HR'], ['karvonen', 'Karvonen (HRR)']] as const).map(([m, lbl]) => (
                    <button key={m} onClick={() => setMethod(m)} className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-all ${method === m ? 'bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>
                        {lbl}
                    </button>
                ))}
            </div>

            {hrMax > 0 && (
                <>
                    <div className="text-center text-xs text-slate-500 dark:text-[#CBD5E1]">
                        Max HR: <strong className="text-slate-800 dark:text-[#E2E8F0]">{hrMax} bpm</strong>
                        {method === 'karvonen' && <span> · Rest HR: <strong className="text-slate-800 dark:text-[#E2E8F0]">{parseFloat(rest) || 60} bpm</strong></span>}
                    </div>
                    <div className="bg-slate-900 dark:bg-[#0F1C30] rounded-xl p-4 space-y-2">
                        {zones.slice().reverse().map(z => (
                            <div key={z.zone} className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-300">
                                    <span className={`font-bold ${zoneColors[z.zone - 1]}`}>Z{z.zone}</span> · {z.name} <span className="text-slate-500">({z.lowPct}–{z.highPct}%)</span>
                                </span>
                                <span className={`text-sm font-semibold ${zoneColors[z.zone - 1]}`}>{z.low}–{z.high} bpm</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <NoteBox reference="Tanaka et al. (2001); Karvonen (1957)">
                Builds five HR training zones. Max HR is estimated from age (Tanaka: 208 − 0.7 × age) unless you enter a measured value. Choose <strong>% Max HR</strong> for a simple split, or <strong>Karvonen</strong> (heart-rate reserve) for a more individualised range — it needs a resting HR. Use when writing HR-based conditioning.
            </NoteBox>
        </CalcShell>
    );
};

// ─── MATURITY OFFSET (PHV) ────────────────────────────────────────────────────
const MaturityCalc = () => {
    const [sex, setSex] = useState<'male' | 'female'>('male');
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [sitting, setSitting] = useState('');
    const [weight, setWeight] = useState('');

    const res = useMemo(() => Calc.maturityOffset({
        sex, ageYears: parseFloat(age), heightCm: parseFloat(height),
        sittingHeightCm: parseFloat(sitting), weightKg: parseFloat(weight),
    }), [sex, age, height, sitting, weight]);

    const tone = res?.statusTone === 'pre' ? 'text-sky-400' : res?.statusTone === 'post' ? 'text-emerald-400' : 'text-amber-400';

    return (
        <CalcShell title="Maturity Offset (PHV)" subtitle="Predicted years from peak height velocity — youth athletes">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className={labelCls}>Sex</label>
                    <CustomSelect value={sex} onChange={(e: any) => setSex(e.target.value)} variant="form" size="sm">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </CustomSelect>
                </div>
                <div>
                    <label className={labelCls}>Age (yrs, decimal)</label>
                    <input type="number" step="0.1" value={age} onChange={e => setAge(e.target.value)} className={numInput} placeholder="13.4" />
                </div>
                <div>
                    <label className={labelCls}>Standing Height (cm)</label>
                    <input type="number" value={height} onChange={e => setHeight(e.target.value)} className={numInput} placeholder="165" />
                </div>
                <div>
                    <label className={labelCls}>Sitting Height (cm)</label>
                    <input type="number" value={sitting} onChange={e => setSitting(e.target.value)} className={numInput} placeholder="85" />
                </div>
                <div className="col-span-2">
                    <label className={labelCls}>Body Mass (kg)</label>
                    <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className={numInput} placeholder="52" />
                </div>
            </div>

            {res && (
                <div className="bg-slate-900 dark:bg-[#0F1C30] rounded-xl p-6 text-white space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Maturity Offset</span><div className="text-xl font-semibold">{res.maturityOffset > 0 ? '+' : ''}{res.maturityOffset} <span className="text-xs text-slate-400">yrs</span></div></div>
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Age at PHV</span><div className="text-xl font-semibold text-indigo-400">{res.aphv}</div></div>
                        <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block">Leg Length</span><div className="text-xl font-semibold">{res.legLengthCm} <span className="text-xs text-slate-400">cm</span></div></div>
                    </div>
                    <div className="pt-3 border-t border-slate-800 dark:border-[#243A58] text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 ${tone}`}>{res.status}</span>
                    </div>
                </div>
            )}

            <NoteBox reference="Mirwald et al. (2002)">
                Predicts <strong>maturity offset</strong> — years before/after peak height velocity (PHV) — from age, standing &amp; sitting height and mass, and the predicted age at PHV. Use it to interpret youth testing (a bigger, earlier-maturing athlete isn't necessarily more talented) and to manage growth-related injury load. Most valid near PHV; less accurate at the extremes and outside ~8–16 yrs.
            </NoteBox>
        </CalcShell>
    );
};

// ─── REGISTRY ─────────────────────────────────────────────────────────────────
interface CalcDef { id: string; group: string; name: string; icon: any; blurb: string; launch?: boolean; }
const CALCS: CalcDef[] = [
    { id: 'onerm', group: 'Strength & Power', name: '1RM & %1RM', icon: DumbbellIcon, blurb: 'Estimate 1RM and build a load table' },
    { id: 'rpe', group: 'Strength & Power', name: 'RPE → Load', icon: GaugeIcon, blurb: 'Autoregulated load from a target RPE' },
    { id: 'plate', group: 'Strength & Power', name: 'Plate Loader', icon: LayersIcon, blurb: 'Plates per side for a target weight' },
    { id: 'warmup', group: 'Strength & Power', name: 'Warm-up Ramp', icon: TrendingUpIcon, blurb: 'Warm-up sets to a working weight' },
    { id: 'mas', group: 'Conditioning', name: 'MAS / ASR', icon: ZapIcon, blurb: 'Running pace & interval distances' },
    { id: 'pace', group: 'Conditioning', name: 'Pace Converter', icon: ArrowRightLeftIcon, blurb: 'm/s · km/h · mph · pace' },
    { id: 'hr', group: 'Conditioning', name: 'HR Zones', icon: HeartPulseIcon, blurb: '5 zones (max-HR or Karvonen)' },
    { id: 'map', group: 'Conditioning', name: 'MAP → RPM (Wattbike)', icon: BikeIcon, blurb: 'Wattbike MAP prescription & fan/RPM' },
    { id: 'maturity', group: 'Profiling', name: 'Maturity Offset (PHV)', icon: ActivityIcon, blurb: 'Years from peak height velocity' },
];
const GROUPS = ['Strength & Power', 'Conditioning', 'Profiling'];

const renderCalc = (id: string) => {
    switch (id) {
        case 'onerm': return <OneRmCalc />;
        case 'rpe': return <RpeCalc />;
        case 'plate': return <PlateCalc />;
        case 'warmup': return <WarmupCalc />;
        case 'mas': return <MasCalc />;
        case 'pace': return <PaceCalc />;
        case 'hr': return <HrZonesCalc />;
        case 'maturity': return <MaturityCalc />;
        case 'map': return <WattbikeMapCalculator inline />;
        default: return null;
    }
};

// ─── SHELL ────────────────────────────────────────────────────────────────────
const PerformanceLab = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const isMobile = useIsMobile();
    // Desktop opens straight into the first calculator; mobile lands on the grid.
    const [activeId, setActiveId] = useState<string | null>(() =>
        (typeof window !== 'undefined' && window.innerWidth < 1024) ? null : 'onerm'
    );

    if (!isOpen) return null;

    const openCalc = (c: CalcDef) => setActiveId(c.id);

    const activeDef = CALCS.find(c => c.id === activeId) || null;

    const Header = (
        <div className="px-6 py-3 border-b border-slate-100 dark:border-[#243A58] flex items-center justify-between bg-white dark:bg-[#132338] shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
                {isMobile && activeDef && (
                    <button onClick={() => setActiveId(null)} aria-label="Back" className="p-2 -ml-2 rounded-full text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
                        <ArrowLeftIcon size={18} />
                    </button>
                )}
                <FlaskConicalIcon size={22} className="text-indigo-600 dark:text-indigo-300 shrink-0" />
                <div className="min-w-0">
                    <h3 className="text-lg font-semibold uppercase tracking-tight text-slate-900 dark:text-[#E2E8F0] leading-none truncate">Toolkit</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mt-0.5">Sports-Science Calculators</p>
                </div>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-full text-slate-400 dark:text-[#94A3B8] transition-colors shrink-0"><XIcon size={20} /></button>
        </div>
    );

    // Grid of calculator cards (mobile landing + used when nothing selected).
    const Grid = (
        <div className="p-5 space-y-6">
            {GROUPS.map(g => (
                <div key={g}>
                    <div className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-2">{g}</div>
                    <div className="grid grid-cols-2 gap-3">
                        {CALCS.filter(c => c.group === g).map(c => (
                            <button key={c.id} onClick={() => openCalc(c)} className="group text-left bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all">
                                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 dark:group-hover:text-white flex items-center justify-center mb-2 transition-all">
                                    <c.icon size={18} />
                                </div>
                                <div className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 leading-tight transition-colors">{c.name}</div>
                                <div className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-0.5 leading-snug">{c.blurb}</div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    // Left rail (desktop only) — grouped calculator list.
    const Rail = (
        <div className="w-56 shrink-0 border-r border-slate-100 dark:border-[#243A58] overflow-y-auto no-scrollbar py-3 bg-slate-50/50 dark:bg-[#0F1C30]/40">
            {GROUPS.map(g => (
                <div key={g} className="mb-2">
                    <div className="px-4 py-1.5 text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider">{g}</div>
                    {CALCS.filter(c => c.group === g).map(c => {
                        const active = c.id === activeId;
                        return (
                            <button key={c.id} onClick={() => openCalc(c)} className={`w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors ${active ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-r-2 border-indigo-600' : 'text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'}`}>
                                <c.icon size={15} className="shrink-0" />
                                <span className="text-xs font-medium truncate">{c.name}</span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </div>
    );

    // ── Mobile: full-screen page ──
    if (isMobile) {
        return (
            <div className="fixed inset-0 z-[800] bg-white dark:bg-[#132338] flex flex-col animate-in fade-in duration-200">
                {Header}
                {activeDef
                    ? <div className="p-5 overflow-y-auto flex-1">{renderCalc(activeDef.id)}</div>
                    : <div className="flex-1 overflow-y-auto">{Grid}</div>}
            </div>
        );
    }

    // ── Desktop: centred modal with rail + pane ──
    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-4xl h-[85vh] max-h-[720px] shadow-2xl border border-slate-200 dark:border-[#243A58] overflow-hidden flex flex-col border-t-2 border-t-indigo-600 animate-in zoom-in-95">
                {Header}
                <div className="flex flex-1 min-h-0">
                    {Rail}
                    <div className="flex-1 min-w-0 p-6 overflow-y-auto">
                        {activeDef ? renderCalc(activeDef.id) : (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400 dark:text-[#94A3B8]">Select a calculator</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PerformanceLab;
