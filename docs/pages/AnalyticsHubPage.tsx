// @ts-nocheck
import React, { useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';
import { UserIcon, ChevronDownIcon, AlertTriangleIcon, LockIcon, CalendarIcon, ArrowLeftIcon, ActivityIcon } from 'lucide-react';
import { ACWRMetricCard } from '../components/analytics/ACWRMetricCard';
import { BaselineTrendTerminal } from '../components/analytics/BaselineTrendTerminal';
import { PerformanceIntelligenceTerminal } from '../components/analytics/PerformanceIntelligenceTerminal';
import { ScenarioModellingTerminal } from '../components/analytics/ScenarioModellingTerminal';
import { KpiWatchlistModal } from '../components/analytics/KpiWatchlistModal';
import { DatabaseService } from '../services/databaseService';

export const AnalyticsHubPage = () => {
    const {
        selectedAnalyticsAthleteId, setSelectedAnalyticsAthleteId,
        teams, modules, activeAnalyticsModule, setActiveAnalyticsModule,
        analyticsStartDate, setAnalyticsStartDate,
        analyticsEndDate, setAnalyticsEndDate,
        watchedKpiIds, setWatchedKpiIds,
        isKpiWatchlistModalOpen, setIsKpiWatchlistModalOpen,
        kpiDefinitions, kpiRecords, scheduledSessions, loadRecords, habitRecords,
        setAthleteAssessments
    } = useAppState();

    useEffect(() => {
        if (selectedAnalyticsAthleteId && !selectedAnalyticsAthleteId.startsWith('team_')) {
            DatabaseService.fetchAssessmentsByAthlete(selectedAnalyticsAthleteId).then(setAthleteAssessments);
        } else {
            setAthleteAssessments([]);
        }
    }, [selectedAnalyticsAthleteId, setAthleteAssessments]);




    const isTeamSelection = selectedAnalyticsAthleteId?.startsWith('team_');
    const selectedSubject = isTeamSelection
        ? teams.find(t => `team_${t.id}` === selectedAnalyticsAthleteId)
        : teams.flatMap(t => t.players).find(p => p.id === selectedAnalyticsAthleteId);

    const subjectAthleteIds = isTeamSelection
        ? (selectedSubject?.players || []).map(p => p.id)
        : [selectedAnalyticsAthleteId];

    const selectedAthlete = selectedSubject; // Mapping back for compatibility where possible

    return !activeAnalyticsModule ? (
        <div className="space-y-8">
            <div className="bg-white p-12 rounded-[3.5rem] border border-indigo-100 shadow-sm relative overflow-hidden group/header border-t-8 border-t-indigo-900">
                <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-4">
                        <h2 className="text-5xl font-black text-indigo-900 uppercase tracking-tighter leading-none">Analytics Hub</h2>
                        <p className="text-indigo-400 text-lg italic leading-relaxed font-medium">Diagnostic monitoring terminals for elite high-performance units.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-50 rounded-2xl px-6 py-4 border-2 border-slate-200 shadow-sm relative group">
                            <UserIcon size={18} className="text-slate-400" />
                            <select
                                value={selectedAnalyticsAthleteId || ''}
                                onChange={(e) => setSelectedAnalyticsAthleteId(e.target.value || null)}
                                className="bg-transparent text-[11px] font-black text-slate-700 outline-none appearance-none pr-8 cursor-pointer uppercase tracking-tight min-w-[200px]"
                            >
                                <option value="">Select Subject...</option>
                                <optgroup label="Teams">
                                    {teams.map(t => (
                                        <option key={t.id} value={`team_${t.id}`}>{t.name} (Squad)</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Individuals">
                                    {teams.flatMap(t => t.players).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                            <ChevronDownIcon size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {!selectedAnalyticsAthleteId && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-[2rem] p-8 flex items-start gap-4">
                    <AlertTriangleIcon size={24} className="text-amber-600 shrink-0 mt-1" />
                    <div>
                        <h3 className="text-lg font-black text-amber-900 uppercase tracking-tight">Athlete Selection Required</h3>
                        <p className="text-sm text-amber-700 font-medium mt-2">Please select an athlete from the dropdown above to unlock diagnostic terminals and view performance data.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {modules.map(mod => (
                    <button
                        key={mod.id}
                        onClick={() => selectedAnalyticsAthleteId && setActiveAnalyticsModule(mod.id)}
                        disabled={!selectedAnalyticsAthleteId}
                        className={`bg-white p-6 rounded-[2.5rem] border border-indigo-100 shadow-sm transition-all text-left relative overflow-hidden group h-[200px] flex flex-col justify-center
                                        ${selectedAnalyticsAthleteId
                                ? 'hover:shadow-2xl hover:scale-[1.02] cursor-pointer'
                                : 'opacity-50 cursor-not-allowed grayscale'
                            }`}
                    >
                        {!selectedAnalyticsAthleteId && (
                            <div className="absolute top-4 right-4 animate-in fade-in">
                                <div className="bg-slate-100 p-2 rounded-xl text-slate-400">
                                    <LockIcon size={16} />
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-5 h-full">
                            <div className={`w-16 h-16 rounded-[1.5rem] bg-indigo-50 text-indigo-400 ${selectedAnalyticsAthleteId ? 'group-hover:bg-indigo-600 group-hover:text-white' : ''} flex items-center justify-center transition-all shrink-0`}>
                                <mod.icon size={30} />
                            </div>
                            <div className="flex flex-col justify-center h-full">
                                <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tighter mb-1 leading-tight">{mod.title}</h3>
                                <p className="text-[11px] text-indigo-400 font-bold leading-relaxed">{mod.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    ) : (
        <div className="space-y-12 animate-in slide-in-from-bottom-10">
            <div className="flex items-center justify-between">
                <button onClick={() => setActiveAnalyticsModule(null)} className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"><ArrowLeftIcon size={16} /> Back to {selectedAthlete?.name.split(' ')[0]}'s Hub</button>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 border border-slate-200 shadow-sm relative group cursor-default">
                        <UserIcon size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{selectedSubject?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2 border border-slate-200 shadow-sm relative group">
                        <CalendarIcon size={14} className="text-slate-400" />
                        <input type="date" value={analyticsStartDate} onChange={(e) => setAnalyticsStartDate(e.target.value)} className="text-[10px] font-black text-slate-700 uppercase tracking-tight outline-none bg-transparent w-32 cursor-pointer" />
                        <span className="text-[10px] font-black text-slate-300">-</span>
                        <input type="date" value={analyticsEndDate} onChange={(e) => setAnalyticsEndDate(e.target.value)} className="text-[10px] font-black text-slate-700 uppercase tracking-tight outline-none bg-transparent w-32 cursor-pointer" />
                    </div>
                </div>
            </div>

            <div className="bg-indigo-900 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-10"><ActivityIcon size={300} className="text-white" /></div>
                <div className="relative z-10 space-y-2">
                    <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Diagnostic Terminal // Connected</div>
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter">{modules.find(m => m.id === activeAnalyticsModule)?.title} Diagnostic</h3>
                    <p className="text-indigo-300 text-xs font-bold uppercase tracking-[0.2em]">Subject: {selectedSubject?.name} // {isTeamSelection ? 'Squad Analysis' : `SID-${selectedSubject?.id.toString().padStart(4, '0')}`}</p>
                </div>
            </div>


            {activeAnalyticsModule === 'load' && (
                <BaselineTrendTerminal
                    habitRecords={habitRecords}
                    loadRecords={loadRecords}
                    selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                />
            )}
            {activeAnalyticsModule === 'kpi' && <PerformanceIntelligenceTerminal
                kpiDefinitions={kpiDefinitions}
                kpiRecords={kpiRecords}
                selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                subjectAthleteIds={subjectAthleteIds}
                analyticsStartDate={analyticsStartDate}
                analyticsEndDate={analyticsEndDate}
                watchedKpiIds={watchedKpiIds}
                setWatchedKpiIds={setWatchedKpiIds}
                setIsKpiWatchlistModalOpen={setIsKpiWatchlistModalOpen}
            />}

            {activeAnalyticsModule === 'acwr' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ACWRMetricCard athleteId={selectedAnalyticsAthleteId} loadRecords={loadRecords} />

                        {/* Explanation Card */}
                        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-center">
                            <h4 className="text-lg font-black uppercase tracking-tight mb-4 text-emerald-400">Model Interpretation</h4>
                            <p className="text-sm font-medium text-slate-300 leading-relaxed mb-4">
                                The Acute:Chronic Workload Ratio (ACWR) compares short-term workload (7 days) to long-term workload (28 days).
                            </p>
                            <ul className="space-y-2 text-xs font-bold text-slate-400 uppercase tracking-wide">
                                <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 0.8 - 1.3: Optimal Load (Low Risk)</li>
                                <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> 1.3 - 1.5: High Load (Caution)</li>
                                <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> &gt; 1.5: Excessive Load (High Risk)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {activeAnalyticsModule === 'scenario' && (
                <ScenarioModellingTerminal
                    scheduledSessions={scheduledSessions}
                    loadRecords={loadRecords}
                    wellnessData={habitRecords}
                    selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                    subjectAthleteIds={subjectAthleteIds}
                    selectedSubject={selectedSubject}
                />
            )}

            <KpiWatchlistModal
                isOpen={isKpiWatchlistModalOpen}
                onClose={() => setIsKpiWatchlistModalOpen(false)}
                kpiDefinitions={kpiDefinitions}
                watchedKpiIds={watchedKpiIds}
                setWatchedKpiIds={setWatchedKpiIds}
            />
        </div>
    );
};
