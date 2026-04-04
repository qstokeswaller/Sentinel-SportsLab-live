// @ts-nocheck
import React, { useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';
import { UserIcon, ChevronDownIcon, AlertTriangleIcon, LockIcon, CalendarIcon, ArrowLeftIcon, ActivityIcon } from 'lucide-react';
import { BaselineTrendTerminal } from '../components/analytics/BaselineTrendTerminal';
import { PerformanceIntelligenceTerminal } from '../components/analytics/PerformanceIntelligenceTerminal';
import { ScenarioModellingTerminal } from '../components/analytics/ScenarioModellingTerminal';
import { KpiWatchlistModal } from '../components/analytics/KpiWatchlistModal';
import DoseResponseTerminal from '../components/analytics/DoseResponseTerminal';
import ForceVelocityTerminal from '../components/analytics/ForceVelocityTerminal';
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
        setAthleteAssessments,
        acwrSettings, isLoading
    } = useAppState();

    useEffect(() => {
        if (selectedAnalyticsAthleteId && !selectedAnalyticsAthleteId.startsWith('team_')) {
            DatabaseService.fetchAssessmentsByAthlete(selectedAnalyticsAthleteId).then(setAthleteAssessments);
        } else if (selectedAnalyticsAthleteId?.startsWith('team_')) {
            // Team view: fetch assessments for all team players (needed by Performance Intelligence)
            const team = teams.find(t => `team_${t.id}` === selectedAnalyticsAthleteId);
            const playerIds = (team?.players || []).map(p => p.id);
            if (playerIds.length > 0) {
                DatabaseService.fetchAssessmentsByTeam(playerIds).then(setAthleteAssessments);
            } else {
                setAthleteAssessments([]);
            }
        } else {
            setAthleteAssessments([]);
        }
    }, [selectedAnalyticsAthleteId, setAthleteAssessments, teams]);

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

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-[160px] flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2 py-2">
                                    <div className="h-4 w-36 bg-slate-100 rounded animate-pulse" />
                                    <div className="h-3 w-full bg-slate-50 rounded animate-pulse" />
                                    <div className="h-3 w-2/3 bg-slate-50 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center py-3">
                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                        <span className="text-xs font-medium text-slate-400">Loading analytics modules...</span>
                    </div>
                </div>
            ) : (
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
            )}
        </div>
    ) : (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Unified module nav bar — back, subject, date range */}
            <div className="flex items-center justify-between bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveAnalyticsModule(null)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-900 transition-all"
                    >
                        <ArrowLeftIcon size={14} /> Hub
                    </button>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <ActivityIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 leading-tight">{modules.find(m => m.id === activeAnalyticsModule)?.title}</h3>
                            <p className="text-[10px] text-slate-400">{selectedSubject?.name} · {isTeamSelection ? 'Squad' : 'Individual'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
                    <CalendarIcon size={13} className="text-slate-400" />
                    <input type="date" value={analyticsStartDate} onChange={(e) => setAnalyticsStartDate(e.target.value)} className="text-xs text-slate-700 outline-none bg-transparent w-28 cursor-pointer" />
                    <span className="text-slate-300 text-xs">–</span>
                    <input type="date" value={analyticsEndDate} onChange={(e) => setAnalyticsEndDate(e.target.value)} className="text-xs text-slate-700 outline-none bg-transparent w-28 cursor-pointer" />
                </div>
            </div>

            {activeAnalyticsModule === 'load' && (
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl min-h-[200px]">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400">Loading {selectedSubject?.name} baseline & trend data...</span>
                        </div>
                    )}
                    <BaselineTrendTerminal
                        habitRecords={habitRecords}
                        loadRecords={loadRecords}
                        selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                        subjectAthleteIds={subjectAthleteIds}
                    />
                </div>
            )}
            {activeAnalyticsModule === 'kpi' && (
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl min-h-[200px]">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400">Loading {selectedSubject?.name} performance intelligence...</span>
                        </div>
                    )}
                    <PerformanceIntelligenceTerminal
                        kpiDefinitions={kpiDefinitions}
                        kpiRecords={kpiRecords}
                        selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                        subjectAthleteIds={subjectAthleteIds}
                        analyticsStartDate={analyticsStartDate}
                        analyticsEndDate={analyticsEndDate}
                        watchedKpiIds={watchedKpiIds}
                        setWatchedKpiIds={setWatchedKpiIds}
                        setIsKpiWatchlistModalOpen={setIsKpiWatchlistModalOpen}
                    />
                </div>
            )}

            {activeAnalyticsModule === 'scenario' && (
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl min-h-[200px]">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400">Loading {selectedSubject?.name} scenario model...</span>
                        </div>
                    )}
                    <ScenarioModellingTerminal
                        scheduledSessions={scheduledSessions}
                        loadRecords={loadRecords}
                        wellnessData={habitRecords}
                        selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                        subjectAthleteIds={subjectAthleteIds}
                        selectedSubject={selectedSubject}
                        acwrSettings={acwrSettings}
                        teams={teams}
                    />
                </div>
            )}

            {activeAnalyticsModule === 'dose_response' && (
                <DoseResponseTerminal
                    selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                    subjectAthleteIds={subjectAthleteIds}
                    analyticsStartDate={analyticsStartDate}
                    analyticsEndDate={analyticsEndDate}
                />
            )}

            {activeAnalyticsModule === 'fv_profile' && (
                <ForceVelocityTerminal
                    selectedAnalyticsAthleteId={selectedAnalyticsAthleteId}
                    subjectAthleteIds={subjectAthleteIds}
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
