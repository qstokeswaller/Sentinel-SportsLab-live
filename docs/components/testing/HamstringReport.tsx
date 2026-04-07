// @ts-nocheck
// ─── HamstringReport ────────────────────────────────────────────────
// Extracted from ReportingHubPage.tsx — NordBord Hamstring Strength Test
// 3 tabs: Analysis, Assessment (Individual + Team Batch), Import
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    ActivityIcon, CalendarIcon, XIcon, ChevronDownIcon, UndoIcon,
    FileEditIcon, PrinterIcon, Trash2Icon, UsersIcon, CheckCircleIcon,
    SaveIcon, FileTextIcon, FileIcon
} from 'lucide-react';

export const HamstringReport: React.FC = () => {
    const {
        teams, setTeams,
        hamstringReportTab, setHamstringReportTab,
        hamstringReportSelectedAthlete, setHamstringReportSelectedAthlete,
        hamDateFilterStart, setHamDateFilterStart, hamDateFilterEnd, setHamDateFilterEnd,
        recentDeletions, isHamstringEditMode, setIsHamstringEditMode,
        handleUndoDelete, handleDeleteMetric, inspectHamEntry, setInspectHamEntry,
        hamAthleteId, setHamAthleteId, hamLeft, setHamLeft, hamRight, setHamRight,
        hamBodyWeight, setHamBodyWeight, hamAggregate, setHamAggregate,
        hamAssessmentMode, setHamAssessmentMode, hamDate, handleSaveMetric,
        showToast,
    } = useAppState();

    // --- Local state for hamstring assessment entry ---
    const [hamEntryMode, setHamEntryMode] = useState<'individual' | 'team'>('individual');
    const [hamSelectedTeamId, setHamSelectedTeamId] = useState('');
    const [hamTeamAthleteFilter, setHamTeamAthleteFilter] = useState('');
    const [teamRowData, setTeamRowData] = useState<Record<string, { left?: string; right?: string; aggregate?: string; bw?: string }>>({});
    const [teamBatchMode, setTeamBatchMode] = useState('split');
    const [teamBatchDate, setTeamBatchDate] = useState(new Date().toISOString().split('T')[0]);
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
    const [hamAnalysisTeamFilter, setHamAnalysisTeamFilter] = useState('');

    // ─── MAIN RENDER ────────────────────────────────────────────────
    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                        <ActivityIcon size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Hamstring Intelligence</h3>
                        <p className="text-xs text-orange-500 uppercase tracking-wide mt-0.5">Nordic Force & Asymmetry Analysis</p>
                    </div>
                </div>
                <div className="flex bg-slate-100 p-1.5 rounded-xl">
                    {['Analysis', 'Assessment', 'Import'].map(tab => (
                        <button key={tab} onClick={() => setHamstringReportTab(tab)}
                            className={`px-5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide transition-all ${hamstringReportTab === tab ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
                            {tab}
                        </button>
                    ))}
                </div>
            </div>
            {hamstringReportTab === 'Analysis' && <AnalysisTab
                teams={teams} hamAnalysisTeamFilter={hamAnalysisTeamFilter} setHamAnalysisTeamFilter={setHamAnalysisTeamFilter}
                hamstringReportSelectedAthlete={hamstringReportSelectedAthlete} setHamstringReportSelectedAthlete={setHamstringReportSelectedAthlete}
                hamDateFilterStart={hamDateFilterStart} setHamDateFilterStart={setHamDateFilterStart}
                hamDateFilterEnd={hamDateFilterEnd} setHamDateFilterEnd={setHamDateFilterEnd}
                recentDeletions={recentDeletions} isHamstringEditMode={isHamstringEditMode} setIsHamstringEditMode={setIsHamstringEditMode}
                handleUndoDelete={handleUndoDelete} handleDeleteMetric={handleDeleteMetric}
                inspectHamEntry={inspectHamEntry} setInspectHamEntry={setInspectHamEntry}
            />}
            {hamstringReportTab === 'Assessment' && <AssessmentTab
                teams={teams} hamEntryMode={hamEntryMode} setHamEntryMode={setHamEntryMode}
                hamAthleteId={hamAthleteId} setHamAthleteId={setHamAthleteId}
                hamLeft={hamLeft} setHamLeft={setHamLeft} hamRight={hamRight} setHamRight={setHamRight}
                hamBodyWeight={hamBodyWeight} setHamBodyWeight={setHamBodyWeight}
                hamAggregate={hamAggregate} setHamAggregate={setHamAggregate}
                hamAssessmentMode={hamAssessmentMode} setHamAssessmentMode={setHamAssessmentMode}
                hamDate={hamDate} handleSaveMetric={handleSaveMetric}
                setHamstringReportTab={setHamstringReportTab}
                hamSelectedTeamId={hamSelectedTeamId} setHamSelectedTeamId={setHamSelectedTeamId}
                hamTeamAthleteFilter={hamTeamAthleteFilter} setHamTeamAthleteFilter={setHamTeamAthleteFilter}
                teamRowData={teamRowData} setTeamRowData={setTeamRowData}
                teamBatchMode={teamBatchMode} setTeamBatchMode={setTeamBatchMode}
                teamBatchDate={teamBatchDate} setTeamBatchDate={setTeamBatchDate}
                savedRows={savedRows} setSavedRows={setSavedRows}
            />}
            {hamstringReportTab === 'Import' && <ImportTab
                teams={teams} setTeams={setTeams} showToast={showToast} setHamstringReportTab={setHamstringReportTab}
            />}
        </div>
    );
};

// ─── ANALYSIS TAB ───────────────────────────────────────────────────

const AnalysisTab = ({ teams, hamAnalysisTeamFilter, setHamAnalysisTeamFilter, hamstringReportSelectedAthlete, setHamstringReportSelectedAthlete, hamDateFilterStart, setHamDateFilterStart, hamDateFilterEnd, setHamDateFilterEnd, recentDeletions, isHamstringEditMode, setIsHamstringEditMode, handleUndoDelete, handleDeleteMetric, inspectHamEntry, setInspectHamEntry }) => {
    const allEntries = teams.flatMap(t =>
        t.players.flatMap(p =>
            (p.performanceMetrics || [])
                .filter(m => m.type === 'hamstring')
                .map(m => ({ ...m, athleteName: p.name, athleteId: p.id, teamId: t.id, teamName: t.name }))
        )
    );

    const teamFilteredPlayers = hamAnalysisTeamFilter
        ? (teams.find(t => t.id === hamAnalysisTeamFilter)?.players || [])
        : teams.flatMap(t => t.players);

    let filteredEntries = allEntries;
    if (hamAnalysisTeamFilter) filteredEntries = filteredEntries.filter(e => e.teamId === hamAnalysisTeamFilter);
    if (hamstringReportSelectedAthlete !== 'All') filteredEntries = filteredEntries.filter(e => e.athleteId === hamstringReportSelectedAthlete);
    if (hamDateFilterStart) filteredEntries = filteredEntries.filter(e => e.date >= hamDateFilterStart);
    if (hamDateFilterEnd) filteredEntries = filteredEntries.filter(e => e.date <= hamDateFilterEnd);
    filteredEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const splitEntries = filteredEntries.filter(e => e.mode === 'split');
    const totalAsymmetry = splitEntries.reduce((sum, e) => sum + (parseFloat(e.asymmetry) || 0), 0);
    const avgAsymmetry = (totalAsymmetry / (splitEntries.length || 1)).toFixed(1);

    const hasAnyFilter = hamAnalysisTeamFilter || hamstringReportSelectedAthlete !== 'All' || hamDateFilterStart || hamDateFilterEnd;
    const clearAllFilters = () => { setHamAnalysisTeamFilter(''); setHamstringReportSelectedAthlete('All'); setHamDateFilterStart(''); setHamDateFilterEnd(''); };
    const handlePrint = () => { window.print(); };
    const selectCls = 'bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-slate-700 outline-none focus:border-orange-300 shadow-sm appearance-none cursor-pointer transition-all hover:bg-slate-50';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filter bar */}
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 print:hidden">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
                        <CalendarIcon size={13} className="text-slate-400 shrink-0" />
                        <input type="date" value={hamDateFilterStart} onChange={(e) => setHamDateFilterStart(e.target.value)} className="text-[10px] font-black text-slate-700 outline-none w-28 cursor-pointer bg-transparent" />
                        <span className="text-slate-300 font-bold text-xs">—</span>
                        <input type="date" value={hamDateFilterEnd} onChange={(e) => setHamDateFilterEnd(e.target.value)} className="text-[10px] font-black text-slate-700 outline-none w-28 cursor-pointer bg-transparent" />
                        {(hamDateFilterStart || hamDateFilterEnd) && (
                            <button onClick={() => { setHamDateFilterStart(''); setHamDateFilterEnd(''); }} className="ml-1 text-slate-300 hover:text-rose-500 transition-colors"><XIcon size={12} /></button>
                        )}
                    </div>
                    <div className="relative">
                        <select value={hamAnalysisTeamFilter} onChange={(e) => { setHamAnalysisTeamFilter(e.target.value); setHamstringReportSelectedAthlete('All'); }} className={`${selectCls} pr-8 min-w-[140px]`}>
                            <option value="">All Teams</option>
                            {teams.filter(t => t.players?.length > 0).map(t => (<option key={t.id} value={t.id}>{t.name}</option>))}
                        </select>
                        <ChevronDownIcon size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                        <select value={hamstringReportSelectedAthlete} onChange={(e) => setHamstringReportSelectedAthlete(e.target.value)} className={`${selectCls} pr-8 min-w-[160px]`}>
                            <option value="All">{hamAnalysisTeamFilter ? `All in ${teams.find(t => t.id === hamAnalysisTeamFilter)?.name || 'Team'}` : 'All Athletes'}</option>
                            {hamAnalysisTeamFilter
                                ? teamFilteredPlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))
                                : teams.filter(t => t.players?.length > 0).map(t => (
                                    <optgroup key={t.id} label={t.name}>
                                        {t.players.sort((a, b) => a.name.localeCompare(b.name)).map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                    </optgroup>
                                ))
                            }
                        </select>
                        <ChevronDownIcon size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    {hasAnyFilter && (
                        <button onClick={clearAllFilters} className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-all">
                            <XIcon size={12} /> Clear filters
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {recentDeletions.length > 0 && isHamstringEditMode && (
                        <button onClick={handleUndoDelete} className="px-4 py-2.5 rounded-xl border bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 transition-all shadow-sm text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                            <UndoIcon size={16} /> Undo
                        </button>
                    )}
                    <button onClick={() => setIsHamstringEditMode(!isHamstringEditMode)}
                        className={`p-2.5 rounded-xl border transition-all ${isHamstringEditMode ? 'bg-orange-600 border-orange-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-orange-300 hover:text-orange-500'}`}>
                        <FileEditIcon size={18} />
                    </button>
                    <button onClick={handlePrint} className="p-2.5 rounded-xl border bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all shadow-sm"><PrinterIcon size={18} /></button>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="bg-white px-5 py-5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Total Reports</span>
                    <div className="text-2xl font-bold text-slate-800">{filteredEntries.length}</div>
                </div>
                <div className="bg-white px-5 py-5 rounded-xl border border-rose-100 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-[9px] font-semibold uppercase text-rose-400 tracking-wide">High Risk</span>
                    <div className="text-2xl font-bold text-rose-500">{filteredEntries.filter(e => { const rs = parseFloat(e.relativeStrength || 0); return rs > 0 && rs < 3.37; }).length}</div>
                </div>
                <div className="bg-white px-5 py-5 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-1">
                    <span className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Avg Asymmetry</span>
                    <div className="text-2xl font-bold text-slate-800">{avgAsymmetry}<span className="text-lg ml-0.5">%</span></div>
                </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse hamstring-analysis-table">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                                <th className="px-4 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Date</th>
                                <th className="px-4 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Athlete</th>
                                <th className="px-4 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide text-center">Avg Force (N)</th>
                                <th className="px-4 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide text-center">Rel. Strength (N/kg)</th>
                                <th className="px-4 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide text-center">Asymmetry (%)</th>
                                <th className="px-4 py-3 text-[9px] font-semibold uppercase text-slate-400 tracking-wide text-right">Risk</th>
                                {isHamstringEditMode && <th className="px-4 py-3 text-[9px] font-semibold uppercase text-rose-400 tracking-wide text-center print:hidden">Delete</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredEntries.map((entry, idx) => {
                                const asym = parseFloat(entry.asymmetry || 0);
                                const rs = parseFloat(entry.relativeStrength || 0);
                                const avgForceValue = entry.avgForce ? parseFloat(entry.avgForce).toFixed(0)
                                    : (entry.mode === 'split' ? ((parseFloat(entry.left || 0) + parseFloat(entry.right || 0)) / 2).toFixed(0) : (parseFloat(entry.aggregate || 0) / 2).toFixed(0));
                                let riskColor = 'bg-emerald-500', riskLabel = 'Low', riskText = 'text-emerald-500', riskBg = 'bg-emerald-50';
                                if (rs > 0 && rs < 3.37) { riskColor = 'bg-rose-500'; riskLabel = 'High'; riskText = 'text-rose-500'; riskBg = 'bg-rose-50'; }
                                else if (rs >= 3.37 && rs < 4.47) { riskColor = 'bg-orange-500'; riskLabel = 'Moderate'; riskText = 'text-orange-500'; riskBg = 'bg-orange-50'; }
                                return (
                                    <tr key={entry.id || idx} onClick={() => !isHamstringEditMode && setInspectHamEntry(entry)}
                                        className={`transition-colors group ${isHamstringEditMode ? 'cursor-default bg-slate-50/30' : 'hover:bg-slate-50/50 cursor-pointer'}`}>
                                        <td className="px-4 py-3"><div className="text-xs font-semibold text-slate-900">{entry.date.slice(0, 10)}</div></td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-[10px]">{entry.athleteName.split(' ').map(n => n[0]).join('')}</div>
                                                <div className="text-xs font-semibold text-slate-800">{entry.athleteName}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center"><div className="text-sm font-semibold text-slate-900">{avgForceValue} <span className="text-[9px] text-slate-300">N</span></div></td>
                                        <td className="px-4 py-3 text-center"><div className={`text-sm font-semibold ${riskText}`}>{rs} <span className="text-[9px] opacity-70">N/kg</span></div></td>
                                        <td className="px-4 py-3 text-center">
                                            {entry.mode === 'split' ? (
                                                <div className={`text-sm font-semibold ${asym > 15 ? 'text-rose-500' : asym > 10 ? 'text-orange-500' : 'text-emerald-500'}`}>{asym}%</div>
                                            ) : (<div className="text-[9px] font-medium text-slate-300 italic">N/A</div>)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end items-center gap-2">
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${riskBg} ${riskText}`}>{riskLabel}</span>
                                                <div className={`w-2.5 h-2.5 rounded-full ${riskColor} shadow-sm`}></div>
                                            </div>
                                        </td>
                                        {isHamstringEditMode && (
                                            <td className="px-4 py-4 text-center print:hidden">
                                                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Delete record for ${entry.athleteName} on ${entry.date}?`)) { handleDeleteMetric(entry.athleteId, entry.id); } }}
                                                    className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><Trash2Icon size={16} /></button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {inspectHamEntry && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-slate-900 px-10 py-8 text-white relative">
                            <button onClick={() => setInspectHamEntry(null)} className="absolute top-8 right-8 text-slate-400 hover:text-white transition-colors"><XIcon size={24} /></button>
                            <div className="flex items-center gap-4 mb-2">
                                <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white font-black text-lg">{inspectHamEntry.athleteName.split(' ').map(n => n[0]).join('')}</div>
                                <div>
                                    <h3 className="text-xl font-black tracking-tighter">{inspectHamEntry.athleteName}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assessment Detail</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center"><span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Bodyweight</span><span className="text-sm font-black text-slate-800">{inspectHamEntry.weight}kg</span></div>
                                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center"><span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Rel. Strength</span><span className="text-sm font-black text-rose-500">{inspectHamEntry.relativeStrength}</span></div>
                                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center"><span className="block text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">Asymmetry</span><span className="text-sm font-black text-slate-800">{inspectHamEntry.asymmetry || '0'}%</span></div>
                            </div>
                            <button onClick={() => setInspectHamEntry(null)} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200">Dismiss View</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── ASSESSMENT TAB ─────────────────────────────────────────────────

const AssessmentTab = ({ teams, hamEntryMode, setHamEntryMode, hamAthleteId, setHamAthleteId, hamLeft, setHamLeft, hamRight, setHamRight, hamBodyWeight, setHamBodyWeight, hamAggregate, setHamAggregate, hamAssessmentMode, setHamAssessmentMode, hamDate, handleSaveMetric, setHamstringReportTab, hamSelectedTeamId, setHamSelectedTeamId, hamTeamAthleteFilter, setHamTeamAthleteFilter, teamRowData, setTeamRowData, teamBatchMode, setTeamBatchMode, teamBatchDate, setTeamBatchDate, savedRows, setSavedRows }) => {
    const allAthletes = teams.flatMap(t => t.players);
    const currentAthlete = allAthletes.find(p => p.id === hamAthleteId);
    const defaultWeight = currentAthlete?.performanceMetrics?.find(m => m.type === 'biometrics')?.weight || 80;
    const indLeft = parseFloat(hamLeft) || 0;
    const indRight = parseFloat(hamRight) || 0;
    const indAggregate = parseFloat(hamAggregate) || 0;
    const indWeight = parseFloat(hamBodyWeight) || defaultWeight;
    const indAvg = (indLeft + indRight) / 2;
    const indAsym = Math.max(indLeft, indRight) > 0 ? ((Math.abs(indLeft - indRight) / Math.max(indLeft, indRight)) * 100) : 0;
    const indRel = hamAssessmentMode === 'split' ? (indWeight > 0 ? indAvg / indWeight : 0) : (indWeight > 0 ? indAggregate / indWeight : 0);

    const handleSaveIndividual = () => {
        if (!hamAthleteId) { alert('Please select an athlete'); return; }
        const record = {
            type: 'hamstring', mode: hamAssessmentMode,
            value: hamAssessmentMode === 'split' ? indAvg : indAggregate,
            left: hamAssessmentMode === 'split' ? indLeft : null,
            right: hamAssessmentMode === 'split' ? indRight : null,
            aggregate: hamAssessmentMode === 'aggregate' ? indAggregate : null,
            weight: indWeight, relativeStrength: indRel.toFixed(2),
            asymmetry: hamAssessmentMode === 'split' ? indAsym.toFixed(1) : null,
            date: hamDate,
        };
        handleSaveMetric(hamAthleteId, record);
        setHamLeft(''); setHamRight(''); setHamAggregate('');
        setHamstringReportTab('Analysis');
    };

    const selectedTeam = teams.find(t => t.id === hamSelectedTeamId) || null;
    const allTeamPlayers = selectedTeam?.players || [];
    const teamPlayers = hamTeamAthleteFilter ? allTeamPlayers.filter(p => p.id === hamTeamAthleteFilter) : allTeamPlayers;

    const updateRow = (athleteId, field, value) => {
        setTeamRowData(prev => ({ ...prev, [athleteId]: { ...(prev[athleteId] || {}), [field]: value } }));
    };

    const calcRow = (row, mode) => {
        const l = parseFloat(row?.left) || 0;
        const r = parseFloat(row?.right) || 0;
        const agg = parseFloat(row?.aggregate) || 0;
        const bw = parseFloat(row?.bw) || 0;
        if (mode === 'split') {
            if (!l && !r) return null;
            const avg = (l + r) / 2;
            const asym = Math.max(l, r) > 0 ? Math.abs(l - r) / Math.max(l, r) * 100 : 0;
            const rel = bw > 0 ? avg / bw : 0;
            const risk = rel > 0 ? (rel < 3.37 ? 'High' : rel < 4.47 ? 'Mod' : 'Low') : null;
            const riskColor = risk === 'High' ? 'text-rose-500 bg-rose-50' : risk === 'Mod' ? 'text-amber-500 bg-amber-50' : risk === 'Low' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300';
            return { avg, asym: asym.toFixed(1), rel: rel.toFixed(2), risk, riskColor, ready: l > 0 && r > 0 };
        } else {
            if (!agg) return null;
            const rel = bw > 0 ? agg / bw : 0;
            const risk = rel > 0 ? (rel < 3.37 ? 'High' : rel < 4.47 ? 'Mod' : 'Low') : null;
            const riskColor = risk === 'High' ? 'text-rose-500 bg-rose-50' : risk === 'Mod' ? 'text-amber-500 bg-amber-50' : risk === 'Low' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-300';
            return { avg: agg / 2, asym: null, rel: rel.toFixed(2), risk, riskColor, ready: agg > 0 };
        }
    };

    const saveRow = (player) => {
        const row = teamRowData[player.id] || {};
        const l = parseFloat(row.left) || 0;
        const r = parseFloat(row.right) || 0;
        const agg = parseFloat(row.aggregate) || 0;
        const bw = parseFloat(row.bw) || 0;
        const avg = teamBatchMode === 'split' ? (l + r) / 2 : agg / 2;
        const asym = teamBatchMode === 'split' && Math.max(l, r) > 0 ? (Math.abs(l - r) / Math.max(l, r) * 100).toFixed(1) : null;
        const rel = bw > 0 ? (teamBatchMode === 'split' ? avg / bw : agg / bw).toFixed(2) : '0.00';
        handleSaveMetric(player.id, {
            type: 'hamstring', mode: teamBatchMode,
            value: teamBatchMode === 'split' ? avg : agg,
            left: teamBatchMode === 'split' ? l : null,
            right: teamBatchMode === 'split' ? r : null,
            aggregate: teamBatchMode === 'aggregate' ? agg : null,
            weight: bw, relativeStrength: rel, asymmetry: asym, date: teamBatchDate,
        });
        setSavedRows(prev => new Set([...prev, player.id]));
    };

    const readyUnsaved = teamPlayers.filter(p => calcRow(teamRowData[p.id], teamBatchMode)?.ready && !savedRows.has(p.id));
    const saveAllReady = () => { readyUnsaved.forEach(p => saveRow(p)); };
    const inputCls = (disabled) =>
        `w-full text-center bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:border-rose-400 transition-all${disabled ? ' bg-slate-50 text-slate-400 cursor-not-allowed' : ''}`;
    const dropdownCls = 'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-rose-400 transition-all cursor-pointer appearance-none';

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Mode toggle + dropdowns */}
            <div className="bg-rose-50/50 px-8 py-6 border-b border-rose-100 space-y-5">
                <div className="flex bg-white border border-slate-200 p-1 rounded-xl w-fit shadow-sm">
                    <button onClick={() => setHamEntryMode('individual')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${hamEntryMode === 'individual' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Individual</button>
                    <button onClick={() => setHamEntryMode('team')} className={`px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${hamEntryMode === 'team' ? 'bg-rose-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Team Batch</button>
                </div>
                {hamEntryMode === 'individual' && (
                    <div className="relative">
                        <label className="text-[9px] font-black uppercase text-rose-400 tracking-widest block mb-1.5">Select Athlete</label>
                        <select value={hamAthleteId} onChange={(e) => setHamAthleteId(e.target.value)} className={dropdownCls}>
                            <option value="">— Choose athlete —</option>
                            {teams.filter(t => (t.players || []).length > 0).map(t => (
                                <optgroup key={t.id} label={t.name}>{t.players.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}</optgroup>
                            ))}
                        </select>
                    </div>
                )}
                {hamEntryMode === 'team' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative">
                            <label className="text-[9px] font-black uppercase text-rose-400 tracking-widest block mb-1.5">Select Team</label>
                            <select value={hamSelectedTeamId} onChange={(e) => { setHamSelectedTeamId(e.target.value); setHamTeamAthleteFilter(''); setSavedRows(new Set()); setTeamRowData({}); }} className={dropdownCls}>
                                <option value="">— Choose team —</option>
                                {teams.filter(t => (t.players || []).length > 0).map(t => (<option key={t.id} value={t.id}>{t.name} ({t.players.length})</option>))}
                            </select>
                        </div>
                        {selectedTeam && (
                            <div className="relative">
                                <label className="text-[9px] font-black uppercase text-rose-400 tracking-widest block mb-1.5">Athlete Filter <span className="text-slate-400 normal-case font-bold">(optional)</span></label>
                                <select value={hamTeamAthleteFilter} onChange={(e) => setHamTeamAthleteFilter(e.target.value)} className={dropdownCls}>
                                    <option value="">All athletes ({allTeamPlayers.length})</option>
                                    {allTeamPlayers.map(p => (<option key={p.id} value={p.id}>{p.name}</option>))}
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="p-8 space-y-6">
                {/* Individual form */}
                {hamEntryMode === 'individual' && (
                    <div className="space-y-5">
                        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                            <button onClick={() => setHamAssessmentMode('split')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${hamAssessmentMode === 'split' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>Split (L/R)</button>
                            <button onClick={() => setHamAssessmentMode('aggregate')} className={`flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${hamAssessmentMode === 'aggregate' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>Aggregate</button>
                        </div>
                        {hamAssessmentMode === 'split' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Left Peak (N)</label>
                                    <input type="number" value={hamLeft} onChange={(e) => setHamLeft(e.target.value)} placeholder="e.g. 340" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-xl font-black outline-none focus:border-rose-400" />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Right Peak (N)</label>
                                    <input type="number" value={hamRight} onChange={(e) => setHamRight(e.target.value)} placeholder="e.g. 320" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-xl font-black outline-none focus:border-rose-400" />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Total Force (N)</label>
                                <input type="number" value={hamAggregate} onChange={(e) => setHamAggregate(e.target.value)} placeholder="e.g. 660" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-2xl font-black outline-none focus:border-rose-400" />
                            </div>
                        )}
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">Bodyweight (kg)</label>
                            <input type="number" value={hamBodyWeight || defaultWeight} onChange={(e) => setHamBodyWeight(e.target.value)} placeholder="e.g. 85" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl font-black outline-none focus:border-rose-400" />
                        </div>
                        <button onClick={handleSaveIndividual} disabled={!hamAthleteId}
                            className="w-full py-4 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white rounded-xl font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98]">
                            {hamAthleteId ? 'Save Assessment' : 'Select an athlete above first'}
                        </button>
                    </div>
                )}

                {/* Team batch: no team selected */}
                {hamEntryMode === 'team' && !selectedTeam && (
                    <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">Select a team above to begin batch entry</div>
                )}

                {/* Team batch table */}
                {hamEntryMode === 'team' && selectedTeam && (
                    <div className="space-y-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                                <button onClick={() => setTeamBatchMode('split')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${teamBatchMode === 'split' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>Split (L/R)</button>
                                <button onClick={() => setTeamBatchMode('aggregate')} className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${teamBatchMode === 'aggregate' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-400'}`}>Aggregate</button>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                <CalendarIcon size={13} className="text-slate-400" />
                                <input type="date" value={teamBatchDate} onChange={(e) => setTeamBatchDate(e.target.value)} className="text-xs font-bold outline-none bg-transparent text-slate-700" />
                            </div>
                            <div className="ml-auto flex items-center gap-3">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{savedRows.size}/{allTeamPlayers.length} saved</span>
                                {readyUnsaved.length > 0 && (
                                    <button onClick={saveAllReady} className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95">Save All Ready ({readyUnsaved.length})</button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="w-7 h-7 bg-rose-100 rounded-lg flex items-center justify-center shrink-0"><UsersIcon size={14} className="text-rose-500" /></div>
                            <span className="text-xs font-black uppercase tracking-tight text-slate-700">{selectedTeam.name}</span>
                            {hamTeamAthleteFilter
                                ? <span className="text-[9px] font-bold text-rose-400 uppercase bg-rose-50 px-2 py-0.5 rounded-lg">Filtered: 1 athlete</span>
                                : <span className="text-[9px] font-bold text-slate-400 uppercase">{allTeamPlayers.length} athletes</span>
                            }
                            {hamTeamAthleteFilter && (
                                <button onClick={() => setHamTeamAthleteFilter('')} className="ml-auto text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase tracking-widest flex items-center gap-1"><XIcon size={11} /> Show all</button>
                            )}
                        </div>
                        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-44 sticky left-0 bg-slate-50">Athlete</th>
                                        {teamBatchMode === 'split' ? (
                                            <><th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[90px]">Left (N)</th>
                                            <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[90px]">Right (N)</th></>
                                        ) : (<th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[110px]">Total (N)</th>)}
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[80px]">BW (kg)</th>
                                        {teamBatchMode === 'split' && (<th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[70px]">Asym %</th>)}
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[70px]">Rel. Str</th>
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center min-w-[60px]">Risk</th>
                                        <th className="px-3 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-14">Save</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamPlayers.map((player, idx) => {
                                        const row = teamRowData[player.id] || {};
                                        const res = calcRow(row, teamBatchMode);
                                        const isSaved = savedRows.has(player.id);
                                        const rowBg = isSaved ? 'bg-emerald-50/50' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40';
                                        return (
                                            <tr key={player.id} className={`border-b border-slate-50 transition-colors hover:bg-rose-50/20 ${rowBg}`}>
                                                <td className={`px-4 py-2.5 sticky left-0 ${rowBg}`}>
                                                    <div className="flex items-center gap-2">
                                                        {isSaved ? <CheckCircleIcon size={12} className="text-emerald-500 shrink-0" /> : <div className="w-3 h-3 rounded-full border-2 border-slate-200 shrink-0" />}
                                                        <span className="font-bold text-slate-800 truncate max-w-[130px]">{player.name}</span>
                                                    </div>
                                                </td>
                                                {teamBatchMode === 'split' ? (
                                                    <><td className="px-2 py-1.5"><input type="number" value={row.left || ''} onChange={(e) => updateRow(player.id, 'left', e.target.value)} placeholder="—" disabled={isSaved} className={inputCls(isSaved)} /></td>
                                                    <td className="px-2 py-1.5"><input type="number" value={row.right || ''} onChange={(e) => updateRow(player.id, 'right', e.target.value)} placeholder="—" disabled={isSaved} className={inputCls(isSaved)} /></td></>
                                                ) : (<td className="px-2 py-1.5"><input type="number" value={row.aggregate || ''} onChange={(e) => updateRow(player.id, 'aggregate', e.target.value)} placeholder="—" disabled={isSaved} className={inputCls(isSaved)} /></td>)}
                                                <td className="px-2 py-1.5"><input type="number" value={row.bw || ''} onChange={(e) => updateRow(player.id, 'bw', e.target.value)} placeholder="—" disabled={isSaved} className={inputCls(isSaved)} /></td>
                                                {teamBatchMode === 'split' && (
                                                    <td className="px-3 py-2.5 text-center"><span className={`text-xs font-black ${parseFloat(res?.asym) > 15 ? 'text-rose-500' : res?.asym ? 'text-slate-700' : 'text-slate-300'}`}>{res?.asym ? `${res.asym}%` : '—'}</span></td>
                                                )}
                                                <td className="px-3 py-2.5 text-center"><span className="text-xs font-black text-slate-700">{res?.rel && parseFloat(res.rel) > 0 ? res.rel : '—'}</span></td>
                                                <td className="px-3 py-2.5 text-center">
                                                    {res?.risk ? <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${res.riskColor}`}>{res.risk}</span> : <span className="text-slate-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-2 py-1.5 text-center">
                                                    {isSaved ? (<CheckCircleIcon size={18} className="text-emerald-500 mx-auto" />) : (
                                                        <button onClick={() => saveRow(player)} disabled={!res?.ready} title={res?.ready ? 'Save' : 'Enter force values first'}
                                                            className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto transition-all active:scale-90 ${res?.ready ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm cursor-pointer' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}>
                                                            <SaveIcon size={13} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {readyUnsaved.length > 0 && (
                            <div className="flex justify-end pt-1">
                                <button onClick={saveAllReady} className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-[0.98]">Save All Ready ({readyUnsaved.length})</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── IMPORT TAB ─────────────────────────────────────────────────────

const ImportTab = ({ teams, setTeams, showToast, setHamstringReportTab }) => {
    const processCSV = (csvText) => {
        const lines = csvText.split('\n');
        if (lines.length < 2) return;
        const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
        const rows = lines.slice(1).filter(r => r.trim());
        const newRecords = [];
        rows.forEach(row => {
            const cols = row.split(',').map(c => c.trim());
            const rowData = {};
            headers.forEach((h, i) => rowData[h] = cols[i]);
            const name = rowData['name'] || rowData['athlete'];
            const date = rowData['date'] || new Date().toISOString().split('T')[0];
            const left = parseFloat(rowData['left'] || 0);
            const right = parseFloat(rowData['right'] || 0);
            const athlete = teams.flatMap(t => t.players).find(p => p.name.toLowerCase() === name.toLowerCase());
            if (athlete && (left > 0 || right > 0)) {
                newRecords.push({ athleteId: athlete.id, record: { type: 'hamstring', value: ((left + right) / 2).toFixed(1), left, right, asymmetry: (Math.max(left, right) > 0 ? (Math.abs(left - right) / Math.max(left, right) * 100) : 0).toFixed(1), date } });
            }
        });
        if (newRecords.length > 0) {
            const newTeams = teams.map(t => ({ ...t, players: t.players.map(p => { const playerEntries = newRecords.filter(e => e.athleteId === p.id); return playerEntries.length > 0 ? { ...p, performanceMetrics: [...(p.performanceMetrics || []), ...playerEntries.map(e => e.record)] } : p; }) }));
            setTeams(newTeams);
            showToast(`Imported ${newRecords.length} records`);
            setHamstringReportTab('Analysis');
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => processCSV(e.target.result);
        reader.readAsText(file);
    };

    return (
        <div className="bg-white p-12 rounded-xl border border-orange-100 shadow-sm text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600"><FileTextIcon size={40} /></div>
            <h4 className="text-2xl font-black uppercase tracking-tighter">Batch Data Import</h4>
            <label className="inline-flex items-center gap-3 bg-orange-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest cursor-pointer shadow-lg hover:bg-orange-600 transition-all">
                <FileIcon size={20} /><span>Select CSV File</span>
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
        </div>
    );
};
