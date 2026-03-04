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

    const selectedAthlete = selectedSubject;

    return !activeAnalyticsModule ? (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Page header */}
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Analytics Hub</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Diagnostic monitoring terminals for elite high-performance units.</p>
                    </div>
                    {/* Subject selector */}
                    <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 gap-2">
                        <UserIcon size={14} className="text-slate-400 shrink-0" />
                        <select
                            value={selectedAnalyticsAthleteId || ''}
                            onChange={(e) => setSelectedAnalyticsAthleteId(e.target.value || null)}
                            className="bg-transparent text-sm text-slate-700 outline-none appearance-none pr-6 cursor-pointer min-w-[180px]"
                        >
                            <option value="">Select subject...</option>
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
                        <ChevronDownIcon size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {!selectedAnalyticsAthleteId && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangleIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-amber-900">Athlete selection required</h3>
                        <p className="text-xs text-amber-700 mt-1">Please select an athlete from the dropdown above to unlock diagnostic terminals and view performance data.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {modules.map(mod => (
                    <button
                        key={mod.id}
                        onClick={() => selectedAnalyticsAthleteId && setActiveAnalyticsModule(mod.id)}
                        disabled={!selectedAnalyticsAthleteId}
                        className={`bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all text-left relative overflow-hidden group h-[160px] flex flex-col justify-center
                            ${selectedAnalyticsAthleteId
                                ? 'hover:shadow-md hover:border-indigo-200 cursor-pointer'
                                : 'opacity-50 cursor-not-allowed grayscale'
                            }`}
                    >
                        {!selectedAnalyticsAthleteId && (
                            <div className="absolute top-3 right-3">
                                <div className="bg-slate-100 p-1.5 rounded-lg text-slate-400">
                                    <LockIcon size={13} />
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-4 h-full">
                            <div className={`w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 ${selectedAnalyticsAthleteId ? 'group-hover:bg-indigo-600 group-hover:text-white' : ''} flex items-center justify-center transition-all shrink-0`}>
                                <mod.icon size={20} />
                            </div>
                            <div className="flex flex-col justify-center h-full">
                                <h3 className="text-base font-semibold text-slate-900 mb-1 leading-tight">{mod.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    ) : (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Module navigation bar */}
            <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                <button
                    onClick={() => setActiveAnalyticsModule(null)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-all"
                >
                    <ArrowLeftIcon size={15} /> Back to Hub
                </button>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
                        <UserIcon size={13} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-700">{selectedSubject?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
                        <CalendarIcon size={13} className="text-slate-400" />
                        <input type="date" value={analyticsStartDate} onChange={(e) => setAnalyticsStartDate(e.target.value)} className="text-xs text-slate-700 outline-none bg-transparent w-28 cursor-pointer" />
                        <span className="text-slate-300 text-xs">–</span>
                        <input type="date" value={analyticsEndDate} onChange={(e) => setAnalyticsEndDate(e.target.value)} className="text-xs text-slate-700 outline-none bg-transparent w-28 cursor-pointer" />
                    </div>
                </div>
            </div>

            {/* Module header banner */}
            <div className="bg-indigo-600 px-5 py-4 rounded-xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5"><ActivityIcon size={160} className="text-white" /></div>
                <div className="relative z-10 space-y-1">
                    <div className="text-[10px] font-medium text-indigo-300 uppercase tracking-wide">Diagnostic Terminal — Connected</div>
                    <h3 className="text-lg font-semibold text-white">{modules.find(m => m.id === activeAnalyticsModule)?.title} Diagnostic</h3>
                    <p className="text-indigo-300 text-xs">Subject: {selectedSubject?.name} · {isTeamSelection ? 'Squad Analysis' : `SID-${selectedSubject?.id?.toString().padStart(4, '0')}`}</p>
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
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ACWRMetricCard athleteId={selectedAnalyticsAthleteId} loadRecords={loadRecords} />

                        <div className="bg-slate-800 text-white p-5 rounded-xl shadow-sm flex flex-col justify-center">
                            <h4 className="text-sm font-semibold text-emerald-400 mb-3">Model Interpretation</h4>
                            <p className="text-sm text-slate-300 leading-relaxed mb-3">
                                The Acute:Chronic Workload Ratio (ACWR) compares short-term workload (7 days) to long-term workload (28 days).
                            </p>
                            <ul className="space-y-2 text-xs text-slate-400">
                                <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> 0.8–1.3: Optimal Load (Low Risk)</li>
                                <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div> 1.3–1.5: High Load (Caution)</li>
                                <li className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div> &gt;1.5: Excessive Load (High Risk)</li>
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
