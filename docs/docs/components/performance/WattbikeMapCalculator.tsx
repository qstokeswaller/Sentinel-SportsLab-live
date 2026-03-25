// @ts-nocheck
import React, { useState } from 'react';
import {
    X as XIcon,
    Save as SaveIcon,
    Users as UsersIcon,
    Clipboard as ClipboardIcon,
    Zap as ZapIcon,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { calculateFanFromRPM, calculateRpmForFan } from '../../utils/performanceUtils';

const WattbikeMapCalculator = ({ inline = false }) => {
    const {
        isWattbikeMapCalculatorOpen,
        setIsWattbikeMapCalculatorOpen,
        wbMapTab,
        setWbMapTab,
        wbMapTargetId,
        setWbMapTargetId,
        wbMapTargetType,
        setWbMapTargetType,
        wbMapPercentage,
        setWbMapPercentage,
        wbMapBikeModel,
        setWbMapBikeModel,
        wbMapManualRPM,
        setWbMapManualRPM,
        wbMapAthleteData,
        setWbMapAthleteData,
        wbMapDate,
        setWbMapDate,
        wbMapStandaloneWatts,
        setWbMapStandaloneWatts,
        wbMapStandaloneInput,
        setWbMapStandaloneInput,
        teams,
        kpiRecords,
        handleSaveMetric,
        showToast
    } = useAppState();

    // Local state for Data Entry tab
    const [dataEntryType, setDataEntryType] = useState('Team');
    const [dataEntryTargetId, setDataEntryTargetId] = useState('');
    // Local state for standalone prescription visibility
    const [prescriptionReady, setPrescriptionReady] = useState(false);

    if (!inline && !isWattbikeMapCalculatorOpen) return null;

    const allAthletes = teams.flatMap(t => t.players);

    // Athletes for the Calculator tab
    const calcAthletes = wbMapTargetType === 'Team'
        ? (teams.find(t => t.id === wbMapTargetId)?.players || [])
        : wbMapTargetType === 'Individual'
            ? allAthletes.filter(p => p.id === wbMapTargetId)
            : [];

    // Athletes for the Data Entry tab
    const entryAthletes = dataEntryType === 'Team'
        ? (teams.find(t => t.id === dataEntryTargetId)?.players || [])
        : allAthletes.filter(p => p.id === dataEntryTargetId);

    const refRPM = wbMapManualRPM || 90;

    const handleSaveAssessment = () => {
        let saved = 0;
        entryAthletes.forEach(p => {
            const data = wbMapAthleteData[p.id];
            if (data?.map) {
                handleSaveMetric(p.id, {
                    type: 'kpi',
                    id: 'map_score',
                    name: 'MAP Score',
                    value: data.map,
                    unit: 'W',
                    date: wbMapDate,
                    bikeModel: data.model || 'Pro'
                });
                saved++;
            }
        });
        if (saved > 0) {
            showToast(`MAP assessments saved for ${wbMapDate}`);
        } else {
            showToast('Please enter MAP values before saving.', 'error');
        }
    };

    const content = (
        <div className={inline
            ? 'h-full flex flex-col bg-white'
            : 'bg-white rounded-xl w-full max-w-3xl max-h-[90vh] shadow-xl overflow-hidden flex flex-col border border-slate-200'
        }>

            {/* ─── HEADER ─── */}
            <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md">
                        <ClipboardIcon size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold uppercase tracking-tight text-slate-900 leading-none">Map Calculator</h3>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Prescription Engine</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Tab toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-slate-200">
                        <button
                            onClick={() => setWbMapTab('calc')}
                            className={`px-5 py-2 text-[10px] font-semibold uppercase tracking-wide transition-all ${wbMapTab === 'calc' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:text-indigo-500'}`}
                        >
                            Calculator
                        </button>
                        <button
                            onClick={() => setWbMapTab('entry')}
                            className={`px-5 py-2 text-[10px] font-semibold uppercase tracking-wide border-l border-slate-200 transition-all ${wbMapTab === 'entry' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:text-indigo-500'}`}
                        >
                            Data Entry
                        </button>
                    </div>
                    {!inline && (
                        <button
                            onClick={() => setIsWattbikeMapCalculatorOpen(false)}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"
                        >
                            <XIcon size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* ─── BODY ─── */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-7 py-6">

                {/* ══════════════════════════════
                    CALCULATOR TAB
                ══════════════════════════════ */}
                {wbMapTab === 'calc' && (
                    <div className="space-y-6">

                        {/* Controls Row */}
                        <div className="flex flex-wrap items-end gap-3">

                            {/* BIKE MODEL */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">Bike Model</label>
                                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                    {['Pro', 'Trainer'].map((m, i) => (
                                        <button
                                            key={m}
                                            onClick={() => setWbMapBikeModel(m)}
                                            className={`px-5 py-2 text-[10px] font-semibold uppercase tracking-wide transition-all ${i > 0 ? 'border-l border-slate-200' : ''} ${wbMapBikeModel === m ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:text-indigo-500'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* SELECTION TYPE */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">Selection Type</label>
                                <select
                                    value={wbMapTargetType}
                                    onChange={(e) => { setWbMapTargetType(e.target.value); setWbMapTargetId(''); setPrescriptionReady(false); }}
                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none appearance-none min-w-[130px]"
                                >
                                    <option value="Team">Team</option>
                                    <option value="Individual">Individual</option>
                                    <option value="Standalone">Standalone</option>
                                </select>
                            </div>

                            {/* SELECT TEAM / ATHLETE (not for Standalone) */}
                            {wbMapTargetType !== 'Standalone' && (
                                <div className="space-y-1.5 flex-1 min-w-[160px]">
                                    <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">
                                        {wbMapTargetType === 'Team' ? 'Select Team' : 'Select Athlete'}
                                    </label>
                                    <select
                                        value={wbMapTargetId}
                                        onChange={(e) => setWbMapTargetId(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
                                    >
                                        <option value="">Choose {wbMapTargetType === 'Team' ? 'team' : 'athlete'}...</option>
                                        {wbMapTargetType === 'Team'
                                            ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                            : allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                        }
                                    </select>
                                </div>
                            )}

                            {/* TARGET % */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">Target %</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={wbMapPercentage}
                                    onChange={(e) => setWbMapPercentage(parseInt(e.target.value) || 100)}
                                    className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                                />
                            </div>

                            {/* REF RPM (not for Standalone) */}
                            {wbMapTargetType !== 'Standalone' && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">Ref RPM</label>
                                    <input
                                        type="number"
                                        value={wbMapManualRPM || ''}
                                        onChange={(e) => setWbMapManualRPM(e.target.value ? parseInt(e.target.value) : null)}
                                        placeholder="RPM"
                                        className="w-28 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none placeholder:text-slate-300"
                                    />
                                </div>
                            )}
                        </div>

                        {/* ──────────────────────────────────
                            STANDALONE MODE: Quick Conversion
                        ────────────────────────────────── */}
                        {wbMapTargetType === 'Standalone' ? (
                            <div className="flex flex-col items-center py-6 space-y-5">
                                <div className="text-center">
                                    <h4 className="text-lg font-semibold uppercase tracking-tighter text-slate-900">Quick Wattbike Conversion</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-1">Enter MAP watts for instant prescription</p>
                                </div>

                                <div className="relative w-full max-w-sm">
                                    <ZapIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                    <input
                                        type="number"
                                        value={wbMapStandaloneInput}
                                        onChange={(e) => { setWbMapStandaloneInput(e.target.value); setPrescriptionReady(false); }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-16 py-4 text-2xl font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20 text-center"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 uppercase">Watts</span>
                                </div>

                                <button
                                    onClick={() => {
                                        setWbMapStandaloneWatts(parseFloat(wbMapStandaloneInput) || 0);
                                        setPrescriptionReady(true);
                                    }}
                                    className="w-full max-w-sm py-4 bg-indigo-600 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    Calculate Prescription
                                </button>

                                {prescriptionReady && wbMapStandaloneWatts > 0 && (
                                    <div className="w-full max-w-sm bg-slate-900 rounded-xl p-5 grid grid-cols-5 gap-3">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(fan => {
                                            const targetW = wbMapStandaloneWatts * (wbMapPercentage / 100);
                                            const rpm = calculateRpmForFan(targetW, fan, wbMapBikeModel);
                                            return (
                                                <div key={fan} className="text-center space-y-1">
                                                    <div className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide">Fan {fan}</div>
                                                    <div className="text-sm font-semibold text-indigo-400">{rpm}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        ) : (
                            /* ──────────────────────────────────────────
                                TEAM / INDIVIDUAL MODE: Athlete Table
                            ─────────────────────────────────────────── */
                            <div className="rounded-xl border border-slate-100 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Athlete</th>
                                            <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Base MAP</th>
                                            <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Target ({wbMapPercentage}%)</th>
                                            <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Target RPM</th>
                                            <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Fan Setting</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {calcAthletes.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-16 text-center">
                                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                                        <UsersIcon size={36} />
                                                        <p className="text-[10px] font-semibold uppercase tracking-wide">Select a team or individual to view matrix</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            calcAthletes.map(p => {
                                                const baseMap = (kpiRecords || []).find(r => r.athleteId === p.id && r.id === 'map_score')?.value || 0;
                                                const targetWatts = baseMap * (wbMapPercentage / 100);
                                                const fanSetting = baseMap > 0
                                                    ? calculateFanFromRPM(refRPM, targetWatts, wbMapBikeModel)
                                                    : '–';
                                                return (
                                                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-5 py-3.5 text-xs font-semibold text-slate-800">{p.name}</td>
                                                        <td className="px-5 py-3.5 text-xs font-bold text-slate-500">
                                                            {baseMap > 0 ? `${baseMap}W` : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-xs font-semibold text-indigo-600">
                                                            {baseMap > 0 ? `${Math.round(targetWatts)}W` : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-xs font-bold text-slate-600">
                                                            {baseMap > 0 ? refRPM : <span className="text-slate-300">—</span>}
                                                        </td>
                                                        <td className="px-5 py-3.5">
                                                            {baseMap > 0 ? (
                                                                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-semibold border border-indigo-100">
                                                                    {fanSetting}
                                                                </span>
                                                            ) : <span className="text-slate-300">—</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════════════════════════════
                    DATA ENTRY TAB
                ══════════════════════════════ */}
                {wbMapTab === 'entry' && (
                    <div className="space-y-6">

                        {/* Controls Row */}
                        <div className="flex flex-wrap items-end gap-3">

                            {/* SELECTION TYPE: TEAM | INDIVIDUAL pills */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">Selection Type</label>
                                <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                    {['Team', 'Individual'].map((t, i) => (
                                        <button
                                            key={t}
                                            onClick={() => { setDataEntryType(t); setDataEntryTargetId(''); }}
                                            className={`px-5 py-2 text-[10px] font-semibold uppercase tracking-wide transition-all ${i > 0 ? 'border-l border-slate-200' : ''} ${dataEntryType === t ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 hover:text-indigo-500'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* SELECT TEAM / ATHLETE */}
                            <div className="space-y-1.5 flex-1 min-w-[160px]">
                                <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">
                                    {dataEntryType === 'Team' ? 'Select Team' : 'Select Athlete'}
                                </label>
                                <select
                                    value={dataEntryTargetId}
                                    onChange={(e) => setDataEntryTargetId(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
                                >
                                    <option value="">Choose team...</option>
                                    {dataEntryType === 'Team'
                                        ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                        : allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                    }
                                </select>
                            </div>

                            {/* ASSESSMENT DATE */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide block">Assessment Date</label>
                                <input
                                    type="date"
                                    value={wbMapDate}
                                    onChange={(e) => setWbMapDate(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
                                />
                            </div>
                        </div>

                        {/* Athlete Entry Table */}
                        {entryAthletes.length > 0 ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border border-slate-100 overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 border-b border-slate-100">
                                            <tr>
                                                <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Athlete</th>
                                                <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">MAP (Watts)</th>
                                                <th className="px-5 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Bike Model</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {entryAthletes.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3 text-xs font-semibold text-slate-800">{p.name}</td>
                                                    <td className="px-5 py-3">
                                                        <input
                                                            type="number"
                                                            value={wbMapAthleteData[p.id]?.map || ''}
                                                            onChange={(e) => setWbMapAthleteData({
                                                                ...wbMapAthleteData,
                                                                [p.id]: { ...wbMapAthleteData[p.id], map: parseFloat(e.target.value) }
                                                            })}
                                                            className="w-32 bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all"
                                                            placeholder="e.g. 300"
                                                        />
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <select
                                                            value={wbMapAthleteData[p.id]?.model || 'Pro'}
                                                            onChange={(e) => setWbMapAthleteData({
                                                                ...wbMapAthleteData,
                                                                [p.id]: { ...wbMapAthleteData[p.id], model: e.target.value }
                                                            })}
                                                            className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:border-indigo-400 focus:bg-white transition-all"
                                                        >
                                                            <option value="Pro">Pro</option>
                                                            <option value="Trainer">Trainer</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <button
                                    onClick={handleSaveAssessment}
                                    className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-wide hover:bg-black transition-all shadow-sm"
                                >
                                    <SaveIcon size={14} /> Save Assessments
                                </button>
                            </div>
                        ) : (
                            <div className="py-16 flex flex-col items-center gap-3 text-slate-300">
                                <UsersIcon size={36} />
                                <p className="text-[10px] font-semibold uppercase tracking-wide">Select a team or individual to begin entry</p>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );

    if (inline) return content;

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            {content}
        </div>
    );
};

export default WattbikeMapCalculator;
