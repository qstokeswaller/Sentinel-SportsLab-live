// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
    FlaskConicalIcon, XIcon, CheckIcon, FileDownIcon, PlusIcon,
    MonitorIcon
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

const ONE_RM_EXERCISES = {
    'Lower Body': [
        { id: 'back_squat', name: 'Back Squat' },
        { id: 'front_squat', name: 'Front Squat' },
        { id: 'trap_bar_deadlift', name: 'Trap Bar Deadlift' },
        { id: 'leg_press', name: 'Leg Press' }
    ],
    'Upper Body Push': [
        { id: 'bench_press', name: 'Bench Press' },
        { id: 'overhead_press', name: 'Overhead Press' },
        { id: 'incline_bench', name: 'Incline Bench' },
        { id: 'dips_weighted', name: 'Dips (Weighted)' }
    ],
    'Upper Body Pull': [
        { id: 'pullups_weighted', name: 'Pullups (Weighted)' },
        { id: 'barbell_row', name: 'Barbell Row' },
        { id: 'lat_pulldown', name: 'Lat Pulldown' }
    ]
};
import { calculateRpmForFan } from '../../utils/performanceUtils';
import WattbikeMapCalculator from './WattbikeMapCalculator';


const PerformanceLab = ({ isOpen, onClose }) => {
    const {
        teams, exercises, onSaveMetric, handleSaveMetric, handleDeleteMetric,
        hamLeft, setHamLeft,
        hamRight, setHamRight,
        hamAggregate, setHamAggregate,
        hamAthleteId, setHamAthleteId,
        hamAssessmentMode, setHamAssessmentMode,
        hamBodyWeight, setHamBodyWeight,
        isHamstringEditMode, setIsHamstringEditMode,
        showToast,
        importStaging, setImportStaging,
        isImportResolverOpen, setIsImportResolverOpen,
        importStatus, setImportStatus,
        handleCommitImport,
        recentDeletions,
        handleUndoDelete,
        questionnaires,
        setQuestionnaires
    } = useAppState();

    const [activeTab, setActiveTab] = useState('1rm'); // '1rm', 'dsi', 'rsi', 'map', 'hamstring', 'import', 'wellness'
    const allAthletes = useMemo(() => teams.flatMap(t => t.players), [teams]);

    // --- 1RM STATE ---
    const [weight, setWeight] = useState('');
    const [reps, setReps] = useState('');
    const [oneRmAthleteId, setOneRmAthleteId] = useState('');
    const [oneRmExerciseId, setOneRmExerciseId] = useState('');

    // --- DSI STATE ---
    const [dsiBallistic, setDsiBallistic] = useState('');
    const [dsiIsometric, setDsiIsometric] = useState('');
    const [dsiAthleteId, setDsiAthleteId] = useState('');

    // --- RSI STATE ---
    const [rsiHeight, setRsiHeight] = useState('');
    const [rsiContactTime, setRsiContactTime] = useState('');
    const [rsiAthleteId, setRsiAthleteId] = useState('');

    // --- IMPORT STATE ---
    const [csvContent, setCsvContent] = useState('');
    const [selectedDsiPreset, setSelectedDsiPreset] = useState('');

    // --- MAP STATE ---
    const [mapWatts, setMapWatts] = useState('');
    const [targetPct, setTargetPct] = useState('100');
    const [bikeModel, setBikeModel] = useState('Trainer'); // 'Trainer' or 'Pro'

    const [saveStatus, setSaveStatus] = useState(null);

    const showSaveStatus = (status) => {
        setSaveStatus(status);
        setTimeout(() => setSaveStatus(null), 3000);
    };

    // 1RM Calculation
    const oneRepMax = useMemo(() => {
        const w = parseFloat(weight);
        const r = parseFloat(reps);
        if (!w || !r) return 0;
        if (r === 1) return w;
        return Math.round(w * (1 + r / 30));
    }, [weight, reps]);

    // DSI Combinations
    const dsiCombinations = {
        lower: [
            { label: 'Gold Standard (Classic)', strength: 'IMTP', ballistic: 'CMJ' },
            { label: 'Dynamic Performance', strength: 'Heavy Back Squat', ballistic: 'Countermovement Jump' },
            { label: 'Strength-Deficit', strength: 'Trap Bar Deadlift', ballistic: 'Trap Bar Jump' },
            { label: 'Unilateral Power', strength: 'Weighted Bulgarian Split Squat', ballistic: 'Jumping Lunges' },
            { label: 'Posterior Chain', strength: 'Heavy RDL', ballistic: 'Weighted Broad Jump' }
        ],
        upper: [
            { label: 'Standard Upper', strength: 'Iso Bench Press', ballistic: 'Ballistic Bench Throw' },
            { label: 'Compound Push/Pull', strength: 'Weighted Dip / Close-Grip Bench', ballistic: 'Med Ball Chest Pass' },
            { label: 'Vertical Focus', strength: 'Weighted Pull-up', ballistic: 'Explosive High Pull-up' }
        ]
    };

    const applyDsiPreset = (presetName) => {
        const all = [...dsiCombinations.lower, ...dsiCombinations.upper];
        const p = all.find(x => x.label === presetName);
        if (p) {
            setSelectedDsiPreset(presetName);
        }
    };

    // DSI Calculation
    const dsiScore = useMemo(() => {
        const b = parseFloat(dsiBallistic);
        const i = parseFloat(dsiIsometric);
        if (!b || !i) return null;
        return (b / i).toFixed(2);
    }, [dsiBallistic, dsiIsometric]);

    const dsiCategory = useMemo(() => {
        if (!dsiScore) return null;
        if (dsiScore < 0.60) return { label: 'Ballistic Deficit', color: 'text-orange-500', rec: 'Plyometrics / Power' };
        if (dsiScore > 0.80) return { label: 'Strength Deficit', color: 'text-indigo-500', rec: 'Maximal Strength' };
        return { label: 'Concurrent / Balanced', color: 'text-emerald-500', rec: 'Train Both' };
    }, [dsiScore]);

    // RSI Calculation
    const rsiScore = useMemo(() => {
        const h = parseFloat(rsiHeight);
        const t = parseFloat(rsiContactTime);
        if (!h || !t) return null;
        return (h / t).toFixed(2);
    }, [rsiHeight, rsiContactTime]);

    // HAMSTRING Calculation
    const hamResults = useMemo(() => {
        const bw = parseFloat(hamBodyWeight);
        if (hamAssessmentMode === 'split') {
            const l = parseFloat(hamLeft);
            const r = parseFloat(hamRight);
            if (!l || !r) return null;
            const max = Math.max(l, r);
            const total = l + r;
            const avg = total / 2;
            let relativeStrength = null;
            const asymmetry = Math.abs(l - r) / max * 100;
            if (bw && bw > 0) relativeStrength = (avg / bw).toFixed(2);
            const rs = parseFloat(relativeStrength || 0);
            let riskText = 'Low Risk';
            let riskColor = 'text-emerald-500';
            if (rs > 0 && rs < 3.37) { riskText = 'High Risk'; riskColor = 'text-rose-500'; }
            else if (rs >= 3.37 && rs < 4.47) { riskText = 'Moderate Risk'; riskColor = 'text-orange-500'; }
            return { avg, relativeStrength, asymmetry: asymmetry.toFixed(1), riskText, color: riskColor };
        } else {
            const agg = parseFloat(hamAggregate);
            if (!agg) return null;
            let relativeStrength = null;
            if (bw && bw > 0) relativeStrength = (agg / bw).toFixed(2);
            return { total: agg, relativeStrength, avg: agg / 2 };
        }
    }, [hamAssessmentMode, hamLeft, hamRight, hamAggregate, hamBodyWeight]);

    const handleSave = (type) => {
        let data = null;
        let athleteId = null;
        if (type === '1rm') {
            if (!oneRmAthleteId || !oneRmExerciseId || !oneRepMax) return showSaveStatus('error');
            athleteId = oneRmAthleteId;
            const exerciseLabel = Object.values(ONE_RM_EXERCISES).flat().find(e => e.id === oneRmExerciseId)?.name || oneRmExerciseId;
            data = {
                type: '1rm',
                exerciseId: oneRmExerciseId,
                exerciseLabel,
                value: oneRepMax,
                weight: weight,
                reps: reps
            };
        } else if (type === 'dsi') {
            if (!dsiAthleteId || !dsiScore) return showSaveStatus('error');
            athleteId = dsiAthleteId;
            data = { type: 'dsi', value: dsiScore, ballistic: dsiBallistic, isometric: dsiIsometric, category: dsiCategory.label };
        } else if (type === 'rsi') {
            if (!rsiAthleteId || !rsiScore) return showSaveStatus('error');
            athleteId = rsiAthleteId;
            data = { type: 'rsi', value: rsiScore, height: rsiHeight, contactTime: rsiContactTime };
        } else if (type === 'hamstring') {
            if (!hamAthleteId || !hamResults) return showSaveStatus('error');
            athleteId = hamAthleteId;
            if (hamAssessmentMode === 'split') {
                data = {
                    type: 'hamstring',
                    mode: 'split',
                    left: hamLeft,
                    right: hamRight,
                    asymmetry: hamResults.asymmetry,
                    avgForce: hamResults.avg.toFixed(1),
                    bodyWeight: hamBodyWeight,
                    relativeStrength: hamResults.relativeStrength,
                    riskText: hamResults.riskText
                };
            } else {
                data = {
                    type: 'hamstring',
                    mode: 'aggregate',
                    aggregate: hamAggregate,
                    avgForce: hamResults.avg.toFixed(1),
                    bodyWeight: hamBodyWeight,
                    relativeStrength: hamResults.relativeStrength,
                    riskText: hamResults.riskText || 'N/A'
                };
            }
        }
        if (athleteId && data) {
            handleSaveMetric(athleteId, data);
            showSaveStatus('success');
        }
    };

    const handleImport = () => {
        if (!csvContent) return;
        const lines = csvContent.split('\n');
        const staging = [];
        lines.forEach((line, idx) => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 3) return;
            const [name, typeRaw, v1, v2] = parts;
            const type = typeRaw.toLowerCase();
            let data = null;
            if (type === 'dsi') {
                const b = parseFloat(v1), i = parseFloat(v2);
                if (b && i) {
                    const score = (b / i).toFixed(2);
                    let cat = 'Balanced';
                    if (score < 0.60) cat = 'Ballistic Deficit';
                    if (score > 0.80) cat = 'Strength Deficit';
                    data = { type: 'dsi', value: score, ballistic: b, isometric: i, category: cat };
                }
            } else if (type === 'rsi') {
                const h = parseFloat(v1), t = parseFloat(v2);
                if (h && t) data = { type: 'rsi', value: (h / t).toFixed(2), height: h, contactTime: t };
            } else if (type === '1rm') {
                if (v1) data = { type: '1rm', value: parseFloat(v1), exerciseLabel: v2 };
            } else if (type === 'map' || type === 'peak map') {
                if (v1) data = { type: 'map', value: parseFloat(v1), baseWatts: parseFloat(v1), percentage: '100', bikeModel: 'Pro' };
            }
            if (data) {
                const match = allAthletes.find(p => p.name.toLowerCase() === name.toLowerCase());
                staging.push({ id: `sim_${idx}`, originalName: name, status: match ? 'matched' : 'conflict', matchedId: match ? match.id : '', matchedName: match ? match.name : '', data: data });
            }
        });
        setImportStaging(staging);
        setIsImportResolverOpen(true);
    };

    const handlePdfUpload = async (file) => {
        if (!window.pdfjsLib) return showToast("PDF Library not loaded.");
        setImportStatus("Scanning PDF... please wait.");
        const buffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument(buffer).promise;
        let extractedText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const items = content.items.sort((a, b) => {
                if (Math.abs(a.transform[5] - b.transform[5]) > 5) return b.transform[5] - a.transform[5];
                return a.transform[4] - b.transform[4];
            });
            let lastY = -1;
            items.forEach(item => {
                if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 10) extractedText += "\n";
                extractedText += item.str + "  ";
                lastY = item.transform[5];
            });
            extractedText += "\n";
        }
        setCsvContent(prev => prev + "\n" + extractedText);
        setImportStatus("PDF Scanned! Please review and click Process.");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 border-t border-t-indigo-600">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <h3 className="text-xl font-semibold uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                        <FlaskConicalIcon size={24} className="text-indigo-600" />
                        Performance Lab
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><XIcon size={20} /></button>
                </div>

                <div className="flex border-b border-slate-100 px-6 gap-6 overflow-x-auto no-scrollbar shrink-0">
                    {[
                        { id: '1rm', label: '1RM Calc' },
                        { id: 'dsi', label: 'DSI Profiler' },
                        { id: 'rsi', label: 'RSI Profiler' },
                        { id: 'map', label: 'MAP Calc' },
                        { id: 'hamstring', label: 'Nordic Force' },
                        { id: 'import', label: 'Data Import' }
                    ].map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-4 text-xs font-semibold uppercase tracking-wide border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-indigo-500'}`}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-6 overflow-y-auto no-scrollbar">
                    {activeTab === '1rm' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Weight (kg/lbs)</label>
                                    <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="100" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Reps</label>
                                    <input type="number" value={reps} onChange={(e) => setReps(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="5" />
                                </div>
                            </div>
                            <div className="bg-slate-900 rounded-xl p-6 text-white text-center">
                                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wide block mb-1">Estimated 1RM</span>
                                <div className="text-5xl font-semibold tracking-tighter">{oneRepMax}</div>
                            </div>
                            <div className="grid grid-cols-1 gap-3 pt-4 border-t border-slate-100">
                                <select value={oneRmAthleteId} onChange={(e) => setOneRmAthleteId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                                    <option value="">Select Athlete...</option>
                                    {allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <select value={oneRmExerciseId} onChange={(e) => setOneRmExerciseId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                                    <option value="">Select Exercise...</option>
                                    {Object.entries(ONE_RM_EXERCISES).map(([group, items]) => (
                                        <optgroup key={group} label={group}>
                                            {items.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                                <button onClick={() => handleSave('1rm')} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold uppercase tracking-wide shadow-lg hover:bg-indigo-700 transition-colors">Save 1RM</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'dsi' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                                <strong className="block uppercase tracking-wide mb-1 text-indigo-600">Dynamic Strength Index</strong>
                                <p className="mb-3">Measures the difference between an athlete's ballistic peak force (e.g. CMJ) and isometric peak force (e.g. IMTP).</p>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-400 shrink-0">Presets:</span>
                                    <select value={selectedDsiPreset} onChange={(e) => applyDsiPreset(e.target.value)} className="bg-white border border-indigo-200 text-indigo-900 text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-1 outline-none w-full cursor-pointer hover:border-indigo-400 transition-colors">
                                        <option value="">Custom Entry...</option>
                                        <optgroup label="Lower Body">
                                            {dsiCombinations.lower.map(x => <option key={x.label} value={x.label}>{x.label}</option>)}
                                        </optgroup>
                                        <optgroup label="Upper Body">
                                            {dsiCombinations.upper.map(x => <option key={x.label} value={x.label}>{x.label}</option>)}
                                        </optgroup>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Peak Force: Ballistic (N)</label>
                                    <input type="number" value={dsiBallistic} onChange={(e) => setDsiBallistic(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-cyan-500/20" placeholder="e.g. 1800" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Peak Force: Isometric (N)</label>
                                    <input type="number" value={dsiIsometric} onChange={(e) => setDsiIsometric(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. 3200" />
                                </div>
                            </div>
                            {dsiScore && (
                                <div className="bg-slate-900 rounded-xl p-6 text-white text-center space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Index Score</span>
                                            <div className="text-3xl font-semibold tracking-tighter text-white">{dsiScore}</div>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Recommendation</span>
                                            <div className={`text-xl font-semibold tracking-tighter ${dsiCategory.color}`}>{dsiCategory.label}</div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-800">
                                        <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${dsiCategory.color} bg-white/10`}>Focus: {dsiCategory.rec}</div>
                                    </div>
                                </div>
                            )}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <select value={dsiAthleteId} onChange={(e) => setDsiAthleteId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                                    <option value="">Select Athlete to Save Score...</option>
                                    {allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <button onClick={() => handleSave('dsi')} className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-semibold uppercase tracking-wide shadow-lg hover:bg-indigo-700 transition-colors">Save DSI Profile</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'rsi' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-900 leading-relaxed">
                                <strong className="block uppercase tracking-wide mb-1 text-emerald-600">Reactive Strength Index</strong>
                                <p>Commonly measured via a 10-to-5 jump or drop jump. Calculation: Jump Height (m) / Contact Time (s).</p>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Jump Height (m)</label>
                                    <input type="number" step="0.01" value={rsiHeight} onChange={(e) => setRsiHeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. 0.35" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Contact Time (s)</label>
                                    <input type="number" step="0.001" value={rsiContactTime} onChange={(e) => setRsiContactTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/20" placeholder="e.g. 0.18" />
                                </div>
                            </div>
                            {rsiScore && (
                                <div className="bg-slate-900 rounded-xl p-6 text-white text-center space-y-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">RSI Score</span>
                                    <div className="text-6xl font-semibold tracking-tighter text-emerald-400">{rsiScore}</div>
                                </div>
                            )}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <select value={rsiAthleteId} onChange={(e) => setRsiAthleteId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                                    <option value="">Select Athlete to Save Score...</option>
                                    {allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <button onClick={() => handleSave('rsi')} className="w-full py-3 bg-emerald-500 text-white rounded-xl text-xs font-semibold uppercase tracking-wide shadow-lg hover:bg-emerald-600 transition-colors">Save RSI Profile</button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'map' && (() => {
                        const watts = parseFloat(mapWatts) || 0;
                        const pct = parseFloat(targetPct) || 100;
                        const targetWatts = watts * (pct / 100);
                        return (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 pb-2">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <p className="text-[10px] font-semibold uppercase text-indigo-600 tracking-wide">Wattbike MAP Calculator</p>
                                    <p className="text-[10px] font-medium text-indigo-400 mt-0.5">Convert your MAP into RPM targets for specific Fan settings.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">MAP Watts</label>
                                        <input
                                            type="number"
                                            value={mapWatts}
                                            onChange={(e) => setMapWatts(e.target.value)}
                                            placeholder="e.g. 300"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">Target %</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="200"
                                            value={targetPct}
                                            onChange={(e) => setTargetPct(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        />
                                    </div>
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    {['Trainer', 'Pro'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setBikeModel(m)}
                                            className={`flex-1 py-2.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide transition-all ${bikeModel === m ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-slate-900 rounded-xl p-5 grid grid-cols-5 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fan => {
                                        const rpm = watts > 0 ? calculateRpmForFan(targetWatts, fan, bikeModel) : '< 40';
                                        return (
                                            <div key={fan} className="text-center space-y-1">
                                                <div className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Fan {fan}</div>
                                                <div className="text-sm font-semibold text-indigo-400">{rpm}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {activeTab === 'hamstring' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button onClick={() => setHamAssessmentMode('split')} className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-all ${hamAssessmentMode === 'split' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Split (L/R)</button>
                                <button onClick={() => setHamAssessmentMode('aggregate')} className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide rounded-lg transition-all ${hamAssessmentMode === 'aggregate' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Aggregate</button>
                            </div>
                            {hamAssessmentMode === 'split' ? (
                                <div className="space-y-6">
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-900 leading-relaxed">
                                        <strong className="block uppercase tracking-wide mb-1 text-orange-600 text-[10px]">Nordic Split Assessment</strong>
                                        <p>Input peak force for each leg and body weight to calculate relative strength and asymmetry.</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Left (N)</label>
                                            <input type="number" value={hamLeft} onChange={(e) => setHamLeft(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-md font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="350" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Right (N)</label>
                                            <input type="number" value={hamRight} onChange={(e) => setHamRight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-md font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="340" />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">BW (kg)</label>
                                            <input type="number" value={hamBodyWeight} onChange={(e) => setHamBodyWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-md font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="85" />
                                        </div>
                                    </div>
                                    {hamResults && (
                                        <div className="bg-slate-900 rounded-xl p-5 text-white space-y-4">
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Avg Force</span><div className="text-xl font-semibold">{Math.round(hamResults.avg)}N</div></div>
                                                <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Asymmetry</span><div className={`text-xl font-semibold ${hamResults.color}`}>{hamResults.asymmetry}%</div></div>
                                                <div><span className="text-[8px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Rel. Str</span><div className="text-xl font-semibold text-orange-400">{hamResults.relativeStrength || '--'}</div></div>
                                            </div>
                                            <div className="pt-3 border-t border-slate-800 text-center"><div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${hamResults.color} bg-white/10`}>Risk: {hamResults.riskText}</div></div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl text-xs text-orange-900 leading-relaxed">
                                        <strong className="block uppercase tracking-wide mb-1 text-orange-600 text-[10px]">Nordic Aggregate Assessment</strong>
                                        <p>Input total peak force and body weight to calculate relative strength.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Total Force (N)</label><input type="number" value={hamAggregate} onChange={(e) => setHamAggregate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="e.g. 700" /></div>
                                        <div><label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block mb-1">Body Weight (kg)</label><input type="number" value={hamBodyWeight} onChange={(e) => setHamBodyWeight(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-orange-500/20" placeholder="e.g. 85" /></div>
                                    </div>
                                    {hamResults && (
                                        <div className="bg-slate-900 rounded-xl p-6 text-white text-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-2">Relative Nordic Strength</span>
                                            <div className="text-5xl font-semibold tracking-tighter text-orange-400">{hamResults.relativeStrength || '--'}</div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-2">N/kg</div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                <select value={hamAthleteId} onChange={(e) => setHamAthleteId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none">
                                    <option value="">Select Athlete to Save Score...</option>
                                    {allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <button onClick={() => handleSave('hamstring')} className="w-full py-3 bg-orange-600 text-white rounded-xl text-xs font-semibold uppercase tracking-wide shadow-lg hover:bg-orange-700 transition-colors">Save Assessment</button>
                            </div>
                        </div>
                    )}


                    {activeTab === 'import' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center hover:bg-slate-100 transition-colors cursor-pointer relative">
                                <input type="file" accept=".csv, .pdf" onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    if (file.type === 'application/pdf') handlePdfUpload(file);
                                    else {
                                        const reader = new FileReader();
                                        reader.onload = (evt) => setCsvContent(evt.target.result);
                                        reader.readAsText(file);
                                    }
                                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <div className="flex flex-col items-center gap-2 text-slate-400"><FileDownIcon size={32} /><span className="text-xs font-bold uppercase tracking-wide">Drop CSV or PDF here</span><span className="text-[10px]">or click to browse</span></div>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
                                <p className="font-bold mb-2">Bulk Import</p>
                                <p>Supported: <strong>CSV</strong> (text) or <strong>PDF</strong> (scanned reports).</p>
                                <p className="mt-2">Format: <code>Athlete Name, Type, Value1, Value2</code></p>
                                <ul className="list-disc pl-4 mt-2 space-y-1">
                                    <li><strong>DSI:</strong> Name, DSI, Ballistic, Isometric</li>
                                    <li><strong>RSI:</strong> Name, RSI, Height, ContactTime</li>
                                    <li><strong>PDF:</strong> Auto-extracts "Name", "Peak Force", "Jump Height" tables.</li>
                                </ul>
                            </div>
                            <textarea value={csvContent} onChange={(e) => setCsvContent(e.target.value)} className="w-full h-40 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono outline-none focus:border-indigo-500" placeholder={`John Doe, DSI, 2500, 3200\nJane Smith, RSI, 0.45, 0.18`} />
                            <button onClick={handleImport} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wide shadow-lg hover:bg-black transition-colors">Process Text Import</button>
                            {importStatus && <div className="text-center text-xs font-bold text-emerald-600 animate-in fade-in">{importStatus}</div>}
                        </div>
                    )}

                    {saveStatus && (
                        <div className="absolute inset-x-8 bottom-8 animate-in slide-in-from-bottom-4">
                            <div className="bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center"><CheckIcon size={18} /></div>
                                    <span className="font-bold text-sm">Save {saveStatus === 'success' ? 'Successful' : 'Error'}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PerformanceLab;
