// @ts-nocheck
import React, { useEffect, useState, useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import { UserIcon, ChevronDownIcon, AlertTriangleIcon, LockIcon, CalendarIcon, ArrowLeftIcon, ActivityIcon, UsersIcon, XIcon } from 'lucide-react';
import { CustomSelect } from '../components/ui/CustomSelect';
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
        acwrSettings, isLoading,
        periodizationPlans,
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

    // ── Dual-filter local state ───────────────────────────────────────────────
    // teamScope: which team's roster to show in the Athlete dropdown (doesn't drive analytics)
    const [teamScope, setTeamScope] = useState<string>(() => {
        if (selectedAnalyticsAthleteId?.startsWith('team_')) return selectedAnalyticsAthleteId.replace('team_', '');
        for (const t of teams) { if (t.players.some(p => p.id === selectedAnalyticsAthleteId)) return t.id; }
        return '';
    });

    const scopedAthletes = useMemo(() => {
        if (teamScope) {
            const team = teams.find(t => t.id === teamScope);
            return [...(team?.players || [])].sort((a, b) => a.name.localeCompare(b.name));
        }
        return [...teams.flatMap(t => t.players)].sort((a, b) => a.name.localeCompare(b.name));
    }, [teamScope, teams]);

    // current individual athlete value (blank when a team is the active selection)
    const athleteSelectValue = (!isTeamSelection && selectedAnalyticsAthleteId) ? selectedAnalyticsAthleteId : '';

    function handleTeamScopeChange(newTeamId: string) {
        setTeamScope(newTeamId);
        if (newTeamId) {
            setSelectedAnalyticsAthleteId(`team_${newTeamId}`);
        } else {
            setSelectedAnalyticsAthleteId(null);
        }
    }

    function handleAthleteChange(athleteId: string) {
        if (athleteId) {
            setSelectedAnalyticsAthleteId(athleteId);
        } else {
            // Revert to team-level if a team is scoped, else clear
            setSelectedAnalyticsAthleteId(teamScope ? `team_${teamScope}` : null);
        }
    }

    const hasFilter = !!selectedAnalyticsAthleteId;

    return !activeAnalyticsModule ? (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* Page header */}
            <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-[#E2E8F0]">Analytics</h2>
                        <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mt-0.5">Diagnostic monitoring terminals for elite high-performance units.</p>
                    </div>
                    {/* Dual subject selector */}
                    <div className="flex items-center gap-2 flex-wrap" data-tour="analytics-selector">
                        {/* Team/Squad */}
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest flex items-center gap-1">
                                <UsersIcon size={9} /> Team / Squad
                            </p>
                            <CustomSelect
                                value={teamScope}
                                onChange={e => handleTeamScopeChange(e.target.value)}
                                variant="filter"
                                size="sm"
                                prefixIcon={<UsersIcon size={13} />}
                                placeholder="All Teams"
                                minWidth="170px"
                            >
                                <option value="">All Teams</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </CustomSelect>
                        </div>
                        {/* Athlete */}
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest flex items-center gap-1">
                                <UserIcon size={9} /> Athlete
                            </p>
                            <CustomSelect
                                value={athleteSelectValue}
                                onChange={e => handleAthleteChange(e.target.value)}
                                variant="filter"
                                size="sm"
                                prefixIcon={<UserIcon size={13} />}
                                placeholder={teamScope ? `All in ${teams.find(t => t.id === teamScope)?.name ?? 'Squad'}` : 'All Athletes'}
                                minWidth="170px"
                            >
                                <option value="">{teamScope ? `All in ${teams.find(t => t.id === teamScope)?.name ?? 'Squad'}` : 'All Athletes'}</option>
                                {scopedAthletes.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </CustomSelect>
                        </div>
                        {/* Clear */}
                        {hasFilter && (
                            <button
                                onClick={() => { setTeamScope(''); setSelectedAnalyticsAthleteId(null); }}
                                className="mt-4 p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors"
                                title="Clear selection"
                            >
                                <XIcon size={13} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {!selectedAnalyticsAthleteId && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangleIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-semibold text-amber-900">
                            {teams.length === 0 ? 'No teams found' : 'Athlete selection required'}
                        </h3>
                        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                            {teams.length === 0
                                ? 'Add a team and athletes from the Roster page first, then return here to view analytics.'
                                : 'Please select an athlete from the dropdown above to unlock diagnostic terminals and view performance data.'}
                        </p>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm h-[160px] flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-[#1A2D48] animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2 py-2">
                                    <div className="h-4 w-36 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" />
                                    <div className="h-3 w-full bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                                    <div className="h-3 w-2/3 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center py-3">
                        <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin mb-2" />
                        <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading analytics modules...</span>
                    </div>
                </div>
            ) : (
                <div data-tour="analytics-modules" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {modules.map(mod => (
                        <button
                            key={mod.id}
                            onClick={() => selectedAnalyticsAthleteId && setActiveAnalyticsModule(mod.id)}
                            disabled={!selectedAnalyticsAthleteId}
                            data-tour={`analytics-module-${mod.id}`}
                            className={`bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm transition-all text-left relative overflow-hidden group h-[160px] flex flex-col justify-center
                                ${selectedAnalyticsAthleteId
                                    ? 'hover:shadow-md hover:border-indigo-200 dark:border-indigo-800/50 cursor-pointer'
                                    : 'opacity-50 cursor-not-allowed grayscale'
                                }`}
                        >
                            {!selectedAnalyticsAthleteId && (
                                <div className="absolute top-3 right-3">
                                    <div className="bg-slate-100 dark:bg-[#1A2D48] p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1]">
                                        <LockIcon size={13} />
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-4 h-full">
                                <div className={`w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 ${selectedAnalyticsAthleteId ? 'group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 dark:group-hover:text-white' : ''} flex items-center justify-center transition-all shrink-0`}>
                                    <mod.icon size={20} />
                                </div>
                                <div className="flex flex-col justify-center h-full">
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] mb-1 leading-tight">{mod.title}</h3>
                                    <p className="text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed">{mod.description}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    ) : (() => {
        // PI ('load' + 'kpi') owns its own top banner now (Hub back + module title +
        // subject + as-of date picker + Explain all in one slim row), so we skip the
        // shared module nav bar for those modules and let PI render full-height.
        const isPI = activeAnalyticsModule === 'load' || activeAnalyticsModule === 'kpi';
        const moduleTitle = modules.find(m => m.id === activeAnalyticsModule)?.title;
        return (
        <div className={isPI ? 'animate-in fade-in duration-300' : 'space-y-5 animate-in fade-in duration-300'}>
            {/* Module nav bar — hidden for PI, shown for every other terminal */}
            {!isPI && (
            <div className="flex items-center justify-between bg-white dark:bg-[#132338] px-5 py-3 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setActiveAnalyticsModule(null)}
                        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-all"
                    >
                        <ArrowLeftIcon size={14} /> Hub
                    </button>
                    <div className="h-4 w-px bg-slate-200 dark:bg-[#243A58]" />
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <ActivityIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{moduleTitle}</h3>
                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{selectedSubject?.name} · {isTeamSelection ? 'Squad' : 'Individual'}</p>
                        </div>
                    </div>
                </div>
                <div data-tour="analytics-dates" className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] rounded-lg px-3 py-1.5 border border-slate-200 dark:border-[#243A58]">
                    <CalendarIcon size={13} className="text-slate-400 dark:text-[#CBD5E1]" />
                    <input type="date" value={analyticsStartDate} onChange={(e) => setAnalyticsStartDate(e.target.value)} className="text-xs text-slate-700 dark:text-[#E2E8F0] outline-none bg-transparent w-28 cursor-pointer" />
                    <span className="text-slate-300 dark:text-[#475569] text-xs">–</span>
                    <input type="date" value={analyticsEndDate} onChange={(e) => setAnalyticsEndDate(e.target.value)} className="text-xs text-slate-700 dark:text-[#E2E8F0] outline-none bg-transparent w-28 cursor-pointer" />
                </div>
            </div>
            )}

            {activeAnalyticsModule === 'load' && (
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-[#132338]/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl min-h-[200px]">
                            <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading {selectedSubject?.name} performance intelligence...</span>
                        </div>
                    )}
                    {/* Baseline & Trend Analysis was merged into Performance Intelligence.
                        The `load` module id is kept so existing deep links still resolve;
                        it renders the same PI terminal as the `kpi` id below. */}
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
                        onBackToHub={() => setActiveAnalyticsModule(null)}
                        moduleTitle={moduleTitle}
                    />
                </div>
            )}
            {activeAnalyticsModule === 'kpi' && (
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-[#132338]/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl min-h-[200px]">
                            <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading {selectedSubject?.name} performance intelligence...</span>
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
                        onBackToHub={() => setActiveAnalyticsModule(null)}
                        moduleTitle={moduleTitle}
                    />
                </div>
            )}

            {activeAnalyticsModule === 'scenario' && (
                <div className="relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-[#132338]/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl min-h-[200px]">
                            <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading {selectedSubject?.name} scenario model...</span>
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
                        periodizationPlans={periodizationPlans}
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
    })();
};
