import React, { useMemo, useState } from 'react';
import {
    BrainIcon, TrendingUpIcon, TrendingDownIcon, MinusIcon,
    AlertCircleIcon, ShieldAlertIcon, HeartPulseIcon,
    ZapIcon, ActivityIcon, ChevronDownIcon, ChevronRightIcon,
    AlertTriangleIcon, InfoIcon, TargetIcon, DatabaseIcon,
    CalendarIcon, ArrowRightIcon, ArrowLeftIcon, XIcon, BookOpenIcon,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { buildAthleteDataProfile, generateInsights, calculateReadinessScore } from '../../utils/performanceIntelligence';
import { ACWR_UTILS } from '../../utils/constants';
import DatePicker from '../../components/ui/DatePicker';

export const PerformanceIntelligenceTerminal = ({
    kpiDefinitions,
    kpiRecords,
    selectedAnalyticsAthleteId,
    subjectAthleteIds,
    analyticsStartDate,
    analyticsEndDate,
    watchedKpiIds,
    setWatchedKpiIds,
    setIsKpiWatchlistModalOpen,
    onBackToHub,
    moduleTitle,
}) => {
    const {
        athleteAssessments, loadRecords, wellnessResponses,
        acwrSettings, teams, isLoading,
    } = useAppState();

    const [expandedInsight, setExpandedInsight] = useState(null);
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [focusedPlayerId, setFocusedPlayerId] = useState(null); // drill into individual from team
    const [explainOpen, setExplainOpen] = useState(false);
    const [patternsCollapsed, setPatternsCollapsed] = useState(false);
    const [coverageInfoOpen, setCoverageInfoOpen] = useState(false);
    // As-of date — anchors every rolling window so a coach can see PI's read of
    // the squad as it would have looked on that date. Default = today.
    const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const [asOfDate, setAsOfDate] = useState<string>(todayISO());

    const isTeam = (subjectAthleteIds || []).length > 1;
    const selectedSubject = isTeam
        ? teams.find(t => `team_${t.id}` === selectedAnalyticsAthleteId)
        : teams.flatMap(t => t.players).find(p => p.id === selectedAnalyticsAthleteId);

    // Wellness questionnaire submissions — the live data source. PI's engine adapts
    // both top-level and nested `responses.*` shapes internally so we can pass this
    // straight through.
    const wellness = wellnessResponses || [];

    // Build data profile + insights for individual
    const individualProfile = useMemo(() => {
        const targetId = focusedPlayerId || (!isTeam ? selectedAnalyticsAthleteId : null);
        if (!targetId) return null;
        const targetName = focusedPlayerId
            ? (selectedSubject?.players || []).find(p => p.id === focusedPlayerId)?.name || ''
            : selectedSubject?.name || '';
        return buildAthleteDataProfile(
            targetId, targetName,
            loadRecords, wellness,
            athleteAssessments, acwrSettings, teams,
            asOfDate,
        );
    }, [selectedAnalyticsAthleteId, focusedPlayerId, isTeam, loadRecords, wellness, athleteAssessments, acwrSettings, teams, asOfDate]);

    const individualInsights = useMemo(() => individualProfile ? generateInsights(individualProfile) : [], [individualProfile]);
    const individualReadiness = useMemo(() => individualProfile ? calculateReadinessScore(individualProfile) : null, [individualProfile]);

    // Build profiles for all team members (team view)
    const teamProfiles = useMemo(() => {
        if (!isTeam) return [];
        const players = selectedSubject?.players || [];
        return players.map(p => {
            const profile = buildAthleteDataProfile(
                p.id, p.name || '',
                loadRecords, wellness,
                athleteAssessments, acwrSettings, teams,
                asOfDate,
            );
            const insights = generateInsights(profile);
            const readiness = calculateReadinessScore(profile);
            return { ...p, profile, insights, readiness };
        }).sort((a, b) => a.readiness.overall - b.readiness.overall);
    }, [isTeam, selectedSubject, loadRecords, wellness, athleteAssessments, acwrSettings, teams, asOfDate]);

    // Team aggregate readiness
    const teamReadiness = useMemo(() => {
        if (!isTeam || teamProfiles.length === 0) return null;
        const avg = Math.round(teamProfiles.reduce((s, p) => s + p.readiness.overall, 0) / teamProfiles.length);
        const status = avg >= 80 ? 'green' : avg >= 50 ? 'amber' : 'red';
        const greenCount = teamProfiles.filter(p => p.readiness.status === 'green').length;
        const amberCount = teamProfiles.filter(p => p.readiness.status === 'amber').length;
        const redCount = teamProfiles.filter(p => p.readiness.status === 'red').length;
        const totalCritical = teamProfiles.reduce((s, p) => s + p.insights.filter(i => i.severity === 'critical').length, 0);
        const totalWarning = teamProfiles.reduce((s, p) => s + p.insights.filter(i => i.severity === 'warning').length, 0);
        return { avg, status, greenCount, amberCount, redCount, totalCritical, totalWarning };
    }, [isTeam, teamProfiles]);

    // Aggregate team insights
    const teamInsights = useMemo(() => {
        if (!isTeam) return [];
        const all = teamProfiles.flatMap(p => p.insights);
        const titleCounts: Record<string, number> = {};
        for (const ins of all) { titleCounts[ins.title] = (titleCounts[ins.title] || 0) + 1; }
        const teamWide = [];
        const threshold = teamProfiles.length < 5 ? Math.max(1, Math.ceil(teamProfiles.length * 0.3)) : Math.ceil(teamProfiles.length * 0.3);
        for (const [title, count] of Object.entries(titleCounts)) {
            if (count >= threshold) {
                const sample = all.find(i => i.title === title);
                teamWide.push({
                    ...sample,
                    id: `team_${title}`,
                    title: `Squad Pattern: ${title}`,
                    message: `${count} of ${teamProfiles.length} athletes share this flag. ${sample.message}`,
                    confidence: `${count}/${teamProfiles.length} athletes affected`,
                });
            }
        }
        teamWide.sort((a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] - { critical: 0, warning: 1, info: 2 }[b.severity]));
        return teamWide;
    }, [isTeam, teamProfiles]);

    // Re-test schedule (team view)
    const retestSchedule = useMemo(() => {
        if (!isTeam) return [];
        const entries = [];
        for (const p of teamProfiles) {
            for (const ins of p.insights) {
                if (ins.title.startsWith('Re-Test Due:')) {
                    entries.push({ playerName: p.name, playerId: p.id, ...ins });
                }
            }
        }
        return entries;
    }, [isTeam, teamProfiles]);

    const profile = individualProfile;
    const insights = (isTeam && !focusedPlayerId) ? teamInsights : individualInsights;
    const readiness = individualReadiness;

    // ── Quick-glance summary tiles (merged in from the old Baseline Trend terminal) ──
    // Compute a tile-ready summary for ANY profile — used for both individual view
    // and team view (aggregated across the squad).
    const computeSummary = (p: any) => {
        if (!p) return null;
        // Filter to records on or before asOfDate so the tile series stays in sync
        // with the as-of anchor everywhere else in the engine.
        const playerLoads = (loadRecords || []).filter((r: any) => {
            const matches = (r.athleteId || r.athlete_id) === p.athleteId;
            const d = (r.date || '').slice(0, 10);
            return matches && !!d && d <= asOfDate;
        });
        const byDate: Record<string, number> = {};
        playerLoads.forEach((r: any) => {
            const d = (r.date || '').slice(0, 10);
            if (!d) return;
            const v = Number(r.sRPE) || Number(r.value) || 0;
            byDate[d] = (byDate[d] || 0) + v;
        });
        const loadSeries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
        const last28 = loadSeries.slice(-28);
        const last7 = loadSeries.slice(-7);
        const loadBaseline = last28.length > 0 ? last28.reduce((s, x) => s + x.value, 0) / last28.length : 0;
        const load7Avg = last7.length > 0 ? last7.reduce((s, x) => s + x.value, 0) / last7.length : 0;
        const loadValue = loadSeries.length > 0 ? loadSeries[loadSeries.length - 1].value : 0;
        const loadDeviation = loadBaseline > 0 ? ((loadValue - loadBaseline) / loadBaseline) * 100 : 0;
        let loadTrend: 'Stable' | 'Increasing' | 'Decreasing' = 'Stable';
        if (last7.length >= 7 && loadBaseline > 0) {
            const diff = (load7Avg - loadBaseline) / loadBaseline;
            if (Math.abs(diff) >= 0.15) loadTrend = diff > 0 ? 'Increasing' : 'Decreasing';
        }
        const recent7Vals = last7.map(x => x.value);
        const mean = recent7Vals.length ? recent7Vals.reduce((a, b) => a + b, 0) / recent7Vals.length : 0;
        const variance = mean > 0 && recent7Vals.length ? recent7Vals.reduce((a, b) => a + (b - mean) ** 2, 0) / recent7Vals.length : 0;
        const loadVolatile = recent7Vals.length >= 7 && mean > 0 && Math.sqrt(variance) > mean * 0.4;
        const wellnessAvailable = p.hasWellnessData;
        const wellnessScore = wellnessAvailable
            ? (p.avgSleep3d * 0.35 + p.avgEnergy3d * 0.30 + (10 - p.avgSoreness3d) * 0.20 + (10 - p.avgStress3d) * 0.15)
            : 0;
        return {
            loadBaseline, loadValue, loadDeviation, loadTrend, loadVolatile,
            hasLoadData: p.hasLoadData,
            wellnessScore, wellnessAvailable,
            acwrRatio: p.acwrRatio,
        };
    };

    // Individual summary (focused-from-team OR standalone individual)
    const summary = useMemo(() => computeSummary(profile), [profile, loadRecords, asOfDate]);

    // Team-aggregate summary — averages each tile metric across squad athletes who have data.
    // Load Trend at team level becomes the majority direction across the squad
    // (e.g. "5 increasing / 2 stable / 1 decreasing" → "Increasing").
    const teamSummary = useMemo(() => {
        if (!isTeam || teamProfiles.length === 0) return null;
        const perAthlete = teamProfiles.map(tp => computeSummary(tp.profile)).filter(Boolean) as any[];
        const withLoad = perAthlete.filter(s => s.hasLoadData);
        const withWellness = perAthlete.filter(s => s.wellnessAvailable);
        if (withLoad.length === 0 && withWellness.length === 0) return null;
        const avg = (arr: any[], key: string) => arr.length > 0 ? arr.reduce((s, x) => s + (x[key] || 0), 0) / arr.length : 0;
        // Trend mode — count each direction across the squad
        const trendCounts = { Increasing: 0, Decreasing: 0, Stable: 0 };
        withLoad.forEach(s => { trendCounts[s.loadTrend] = (trendCounts[s.loadTrend] || 0) + 1; });
        const trendMode = (Object.entries(trendCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Stable') as 'Stable' | 'Increasing' | 'Decreasing';
        const volatileCount = withLoad.filter(s => s.loadVolatile).length;
        return {
            loadBaseline: avg(withLoad, 'loadBaseline'),
            loadDeviation: avg(withLoad, 'loadDeviation'),
            loadTrend: trendMode,
            loadVolatile: volatileCount > withLoad.length / 2, // majority volatile
            hasLoadData: withLoad.length > 0,
            wellnessScore: avg(withWellness, 'wellnessScore'),
            wellnessAvailable: withWellness.length > 0,
            acwrRatio: avg(withLoad.filter(s => s.acwrRatio > 0), 'acwrRatio'),
            trendCounts,
            squadSize: perAthlete.length,
            withLoadCount: withLoad.length,
            withWellnessCount: withWellness.length,
        };
    }, [isTeam, teamProfiles, loadRecords, asOfDate]);

    // Pick the right summary for the current view
    const activeSummary = (isTeam && !focusedPlayerId) ? teamSummary : summary;
    const acwrZone = activeSummary && activeSummary.acwrRatio > 0 ? ACWR_UTILS.getRatioStatus(activeSummary.acwrRatio) : null;

    // Squad-level data coverage — counts athletes meeting freshness thresholds
    // per data domain. Mirrors the engine's Data Freshness scoring logic so the
    // card surfaces *the same gates* that drive the 10% Data Freshness weight in
    // each athlete's Readiness Score. Sport-aware: thresholds come from each
    // profile's resolved bucket (CMJ / Nordic universal overrides applied).
    const dataCoverage = useMemo(() => {
        if (!isTeam || teamProfiles.length === 0) return null;
        const total = teamProfiles.length;
        // Test-id lookups must match what's actually persisted (see docs/utils/testRegistry.ts).
        // Strength: rm_* compounds (legacy `1rm` kept as fallback). Power: CMJ + family +
        // SJ + RSI + DSI (note: registry uses `squat_jump`; `sj` kept as fallback).
        // Screening: Nordic + hamstring use the universal Nordic override; FMS sub-tests
        // and Y-balance use the bucket's injury_screen staleness.
        const STRENGTH_IDS = ['1rm', 'rm_back_squat', 'rm_bench_press', 'rm_deadlift', 'rm_front_squat', 'rm_ohp'];
        const SCREENING_IDS = ['nordic', 'hamstring', 'fms_deep_squat', 'fms_hurdle_step', 'fms_inline_lunge', 'fms_shoulder_mobility', 'fms_aslr', 'fms_trunk_pushup', 'fms_rotary_stability', 'y_balance'];
        const POWER_IDS = ['cmj', 'cmj_advanced', 'dsi', 'rsi', 'squat_jump', 'sj'];
        let load = 0, wellness = 0, strength = 0, screening = 0, power = 0;
        for (const tp of teamProfiles) {
            const p: any = tp.profile;
            if (!p?.sportThresholds) continue;
            const stale = p.sportThresholds.staleness;
            const overrideFor = (t: string) => p.sportThresholds.typeOverrides[t];
            if (p.hasLoadData) load++;
            if (p.hasWellnessData) wellness++;
            const hasStrength = STRENGTH_IDS.some(t => p.assessmentsByType[t] && p.assessmentsByType[t].daysSinceLatest <= stale.strength);
            if (hasStrength) strength++;
            const hasScreening = SCREENING_IDS.some(t => {
                const d = p.assessmentsByType[t];
                if (!d) return false;
                if (t === 'nordic' || t === 'hamstring') {
                    return d.daysSinceLatest <= (overrideFor(t)?.excludeAfter || stale.injury_screen);
                }
                return d.daysSinceLatest <= stale.injury_screen;
            });
            if (hasScreening) screening++;
            const hasPower = POWER_IDS.some(t => {
                const d = p.assessmentsByType[t];
                if (!d) return false;
                // CMJ universal override applies to all jump-family tests
                const cutoff = overrideFor('cmj')?.excludeAfter || stale.power;
                return d.daysSinceLatest <= cutoff;
            });
            if (hasPower) power++;
        }
        return { total, load, wellness, strength, screening, power };
    }, [isTeam, teamProfiles]);

    // ── Helpers ──
    const severityIcon = (s) => {
        if (s === 'critical') return <AlertCircleIcon size={16} className="text-rose-500" />;
        if (s === 'warning') return <AlertTriangleIcon size={16} className="text-amber-500" />;
        return <InfoIcon size={16} className="text-sky-500" />;
    };
    const severityBg = (s) => s === 'critical' ? 'border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/20' : s === 'warning' ? 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20' : 'border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-900/20';
    const severityBadge = (s) => s === 'critical' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300' : s === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300';
    const categoryIcon = (c) => {
        if (c === 'Risk') return <ShieldAlertIcon size={14} />;
        if (c === 'Performance') return <TrendingUpIcon size={14} />;
        if (c === 'Recovery') return <HeartPulseIcon size={14} />;
        return <TargetIcon size={14} />;
    };
    const statusColor = (s) => s === 'green' ? 'text-emerald-600 dark:text-emerald-300' : s === 'amber' ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300';
    const statusBg = (s) => s === 'green' ? 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50' : s === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50';
    const statusRing = (s) => s === 'green' ? 'ring-emerald-400' : s === 'amber' ? 'ring-amber-400' : 'ring-rose-400';

    // ── Shared UI blocks ──

    const renderReadinessBreakdown = (r) => (
        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-tight">Readiness Breakdown</h3>
                <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{r.domainsUsed} of {r.domainsTotal} domains active</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {r.domains.map(d => (
                    <div key={d.name} className={`p-3 rounded-xl border ${d.available ? 'bg-white dark:bg-[#1A2D48] border-slate-200 dark:border-[#243A58]' : 'bg-slate-50 dark:bg-[#0F1C30] border-dashed border-slate-200 dark:border-[#243A58] opacity-60'}`}>
                        <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase mb-1">{d.name}</div>
                        {d.available ? (
                            <>
                                <div className={`text-xl font-bold ${d.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : d.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>{d.score}</div>
                                <div className="w-full h-1.5 bg-slate-100 dark:bg-[#243A58] rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${d.score >= 80 ? 'bg-emerald-500' : d.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${d.score}%` }} />
                                </div>
                                <div className="text-[8px] text-slate-400 dark:text-[#CBD5E1] mt-1 truncate" title={d.reason}>{d.reason}</div>
                            </>
                        ) : (
                            <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] italic mt-1">{d.reason}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderInsightFeed = (
        insightList,
        title = 'Intelligence Feed',
        subtitle = 'Actionable insights generated from cross-domain analysis',
        collapsible: boolean = false,
        isCollapsed: boolean = false,
        toggleCollapsed?: () => void,
    ) => (
        insightList.length > 0 && (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                {collapsible ? (
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        className={`w-full px-5 py-2.5 flex items-center gap-3 text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/40 ${isCollapsed ? '' : 'border-b border-slate-100 dark:border-[#1A2D48]'}`}
                        aria-expanded={!isCollapsed}
                    >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <h3 className="text-[12px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-tight shrink-0">{title}</h3>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] shrink-0">{insightList.length}</span>
                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] truncate">· {subtitle}</span>
                        </div>
                        {isCollapsed
                            ? <ChevronRightIcon size={15} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />
                            : <ChevronDownIcon size={15} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />}
                    </button>
                ) : (
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-[#1A2D48]">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-tight">{title}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">{subtitle}</p>
                    </div>
                )}
                {!(collapsible && isCollapsed) && (
                <div className={`divide-y divide-slate-50 dark:divide-[#1A2D48] ${collapsible ? 'max-h-48 overflow-y-auto' : ''}`}>
                    {insightList.map(ins => {
                        const isExpanded = expandedInsight === ins.id;
                        return (
                            <div key={ins.id}>
                                <button
                                    onClick={() => setExpandedInsight(isExpanded ? null : ins.id)}
                                    className="w-full px-6 py-4 flex items-start gap-4 text-left hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/40 transition-colors"
                                >
                                    <div className="mt-0.5 shrink-0">{severityIcon(ins.severity)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${severityBadge(ins.severity)}`}>{ins.severity}</span>
                                            <span className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase flex items-center gap-1">{categoryIcon(ins.category)} {ins.category}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] mt-1">{ins.title}</h4>
                                        <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5 line-clamp-2">{ins.message}</p>
                                    </div>
                                    <div className="shrink-0 mt-1">
                                        {isExpanded ? <ChevronDownIcon size={14} className="text-slate-400" /> : <ChevronRightIcon size={14} className="text-slate-400" />}
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="px-6 pb-4 ml-10">
                                        <div className={`p-4 rounded-xl border ${severityBg(ins.severity)}`}>
                                            <div className="text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase mb-1">Recommendation</div>
                                            <p className="text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed">{ins.recommendation}</p>
                                            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-200/50 dark:border-[#243A58]/50">
                                                <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">Source: {ins.dataSource}</span>
                                                {ins.confidence && <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">| {ins.confidence}</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                )}
            </div>
        )
    );

    const renderAssessmentProfile = (p) => (
        p && Object.keys(p.assessmentsByType).length > 0 && (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-tight">Assessment Profile</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(p.assessmentsByType).map(([type, data]: [string, any]) => {
                        const m = data.latest?.metrics || {};
                        const pm = data.previous?.metrics || {};
                        const val = Number(m.value) || Number(m.weight) || Number(m.relativeStrength) || null;
                        const prevVal = Number(pm.value) || Number(pm.weight) || Number(pm.relativeStrength) || null;
                        const trend = (val && prevVal && prevVal !== 0) ? (((val - prevVal) / prevVal) * 100).toFixed(1) : null;
                        const stale = data.daysSinceLatest > 60;
                        const label = m.exerciseLabel || type.replace(/^rm_/, '').replace(/_/g, ' ');
                        return (
                            <div key={type} className={`p-4 rounded-xl border ${stale ? 'border-dashed border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/50' : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#1A2D48]'}`}>
                                <div className="text-[9px] font-bold text-indigo-500 uppercase">{label}</div>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">{val !== null ? val.toFixed(val < 10 ? 2 : 0) : '--'}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{m.unit || ''}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    {trend !== null && (
                                        <span className={`text-[10px] font-semibold ${Number(trend) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {Number(trend) >= 0 ? '+' : ''}{trend}%
                                        </span>
                                    )}
                                    <span className={`text-[9px] ${stale ? 'text-amber-500' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>
                                        {data.daysSinceLatest}d ago
                                    </span>
                                </div>
                                {data.count > 1 && <div className="text-[8px] text-slate-400 dark:text-[#CBD5E1] mt-1">{data.count} tests logged</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    );

    // ── Main Render ──
    const showingIndividual = !isTeam || focusedPlayerId;
    const focusedPlayerName = focusedPlayerId
        ? (selectedSubject?.players || []).find(p => p.id === focusedPlayerId)?.name
        : null;

    return (
        <div className="animate-in fade-in duration-500 h-[calc(100vh-40px)] flex flex-col gap-3">
            {/* Consolidated top banner — Hub back + module title + subject + as-of picker + Explain */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-2.5 flex items-center justify-between flex-wrap gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    {onBackToHub && (
                        <>
                            <button
                                onClick={onBackToHub}
                                className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-all"
                            >
                                <ArrowLeftIcon size={13} /> Hub
                            </button>
                            <div className="h-4 w-px bg-slate-200 dark:bg-[#243A58]" />
                        </>
                    )}
                    <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                        <ActivityIcon size={13} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight truncate">
                            {moduleTitle || 'Performance Intelligence'}
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] truncate">
                            {focusedPlayerName
                                ? `${focusedPlayerName} · individual deep-dive`
                                : `${selectedSubject?.name || ''} · ${isTeam ? 'Squad' : 'Individual'}`}
                        </p>
                    </div>
                    {focusedPlayerId && (
                        <>
                            <div className="h-4 w-px bg-slate-200 dark:bg-[#243A58]" />
                            <button
                                onClick={() => { setFocusedPlayerId(null); setExpandedInsight(null); }}
                                className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#1A2D48] dark:hover:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] rounded-md text-[11px] font-medium transition-all"
                            >
                                <ChevronRightIcon size={11} className="rotate-180" /> Squad
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* As-of date — anchors every rolling window */}
                    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-md px-2.5 py-1">
                        <CalendarIcon size={12} className="text-slate-400 dark:text-[#CBD5E1]" />
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">As of</span>
                        <DatePicker value={asOfDate} onChange={e => setAsOfDate(e.target.value || todayISO())} max={todayISO()} className="w-28" />
                    </div>
                    <button
                        onClick={() => setExplainOpen(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-500/40 text-slate-600 dark:text-[#CBD5E1] rounded-md text-[11px] font-medium transition-all"
                        title="How this terminal reads your data"
                    >
                        <BookOpenIcon size={12} /> Explain
                    </button>
                </div>
            </div>

            {/* Body — 2-column on lg (tables left, tiles right rail), stacked on mobile */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">

            {/* ── Summary tiles — vertical right-rail on lg, stacks above tables on mobile.
                Uses CSS `order` so JSX stays in natural top-down sequence while the
                rendered layout puts tables on the left and tiles on the right. ── */}
            {activeSummary && (activeSummary.hasLoadData || activeSummary.wellnessAvailable) && (() => {
                const s: any = activeSummary;
                const isTeamView = isTeam && !focusedPlayerId;
                const readinessTile = isTeamView ? teamReadiness : readiness;
                return (
                <div className="lg:order-2 w-full lg:w-64 shrink-0 flex flex-col gap-2.5 lg:overflow-y-auto">
                    {/* Load Baseline */}
                    <div className="bg-white dark:bg-[#132338] rounded-lg border border-slate-200 dark:border-[#243A58] shadow-sm px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <ActivityIcon size={11} className="text-indigo-500" />
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Load Baseline</div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-[#E2E8F0]">
                                {s.hasLoadData ? s.loadBaseline.toFixed(0) : '—'}
                            </div>
                            {s.hasLoadData && (
                                <span className={`text-[10px] font-semibold inline-flex items-center gap-0.5 ${s.loadDeviation > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {s.loadDeviation > 0 ? <TrendingUpIcon size={10} /> : <TrendingDownIcon size={10} />}
                                    {s.loadDeviation > 0 ? '+' : ''}{s.loadDeviation.toFixed(0)}%
                                </span>
                            )}
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] truncate">
                            {isTeamView ? `Squad · ${s.withLoadCount}/${s.squadSize}` : 'AU · 28-day avg'}
                        </div>
                    </div>

                    {/* Load Trend */}
                    <div className="bg-white dark:bg-[#132338] rounded-lg border border-slate-200 dark:border-[#243A58] shadow-sm px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <ZapIcon size={11} className="text-indigo-500" />
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Load Trend</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">{s.loadVolatile ? 'Volatile' : s.loadTrend}</span>
                            {s.loadTrend === 'Stable' ? <MinusIcon size={11} className="text-slate-400" />
                                : s.loadTrend === 'Increasing' ? <TrendingUpIcon size={11} className="text-rose-500" />
                                : <TrendingDownIcon size={11} className="text-emerald-500" />}
                        </div>
                        <div className={`text-[9px] font-semibold truncate ${s.loadVolatile ? 'text-purple-500' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>
                            {isTeamView && s.trendCounts
                                ? `${s.trendCounts.Increasing}↑ ${s.trendCounts.Stable}→ ${s.trendCounts.Decreasing}↓`
                                : (s.loadVolatile ? 'High variability' : '7d vs 28d')}
                        </div>
                    </div>

                    {/* Wellness Composite */}
                    <div className="bg-white dark:bg-[#132338] rounded-lg border border-slate-200 dark:border-[#243A58] shadow-sm px-3 py-2">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <HeartPulseIcon size={11} className="text-indigo-500" />
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Wellness</div>
                        </div>
                        <div className="text-lg font-bold tracking-tight text-slate-900 dark:text-[#E2E8F0]">
                            {s.wellnessAvailable ? s.wellnessScore.toFixed(1) : '—'}
                        </div>
                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] truncate">
                            {isTeamView ? `Squad · ${s.withWellnessCount}/${s.squadSize}` : '3-day · /10'}
                        </div>
                    </div>

                    {/* ACWR */}
                    {acwrZone && (() => {
                        const r = s.acwrRatio;
                        const tileTone =
                            r > 1.5 ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-300'
                            : r > 1.3 ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-300'
                            : r < 0.8 ? 'bg-sky-50 dark:bg-sky-500/15 border-sky-200 dark:border-sky-500/30 text-sky-600 dark:text-sky-300'
                            : 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300';
                        const valColor = tileTone.split(' ').filter(c => c.startsWith('text-') || c.startsWith('dark:text-')).join(' ');
                        return (
                            <div className={`rounded-lg border shadow-sm px-3 py-2 ${tileTone.replace(/text-\S+/g, '').replace(/dark:text-\S+/g, '').trim()}`}>
                                <div className="text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-0.5">ACWR</div>
                                <div className={`text-lg font-bold tracking-tight ${valColor}`}>{r.toFixed(2)}</div>
                                <div className={`text-[9px] font-bold uppercase truncate ${valColor}`}>{acwrZone.label}</div>
                            </div>
                        );
                    })()}

                    {/* Readiness */}
                    {readinessTile && (() => {
                        const status = readinessTile.status;
                        const tone =
                            status === 'green' ? 'text-emerald-600 dark:text-emerald-300'
                            : status === 'amber' ? 'text-amber-600 dark:text-amber-300'
                            : 'text-rose-600 dark:text-rose-300';
                        const value = isTeamView ? (readinessTile as any).avg : (readinessTile as any).overall;
                        const subLine = isTeamView
                            ? `${(readinessTile as any).greenCount}G ${(readinessTile as any).amberCount}A ${(readinessTile as any).redCount}R`
                            : `${(readinessTile as any).confidence}`;
                        return (
                            <div className={`rounded-lg border-2 shadow-sm px-3 py-2 ${statusBg(status)}`}>
                                <div className="text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-0.5">
                                    {isTeamView ? 'Squad Readiness' : 'Readiness'}
                                </div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className={`text-lg font-bold tracking-tight ${tone}`}>{value}</span>
                                    <span className={`text-[9px] font-bold uppercase ${tone}`}>{status === 'green' ? 'Ready' : status === 'amber' ? 'Caution' : 'High Risk'}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] truncate">{subLine}</div>
                            </div>
                        );
                    })()}

                    {/* Squad Data Coverage — team-only. Surfaces which data domains
                        have current data and where gaps exist. Same staleness gates as
                        the engine's Data Freshness scoring so what you see here is what
                        drives the 10% Data Freshness weight in the Readiness Score.
                        Grows (lg:flex-1) to fill leftover right-rail height so the rail
                        bottom aligns with the matrix's last visible row. */}
                    {isTeamView && dataCoverage && (() => {
                        const rows = [
                            { label: 'Load monitoring',    count: dataCoverage.load,      hint: 'Athletes with recent training-load entries' },
                            { label: 'Wellness check-ins', count: dataCoverage.wellness,  hint: 'Athletes with recent wellness questionnaire responses' },
                            { label: 'Strength current',   count: dataCoverage.strength,  hint: '1RM / RM compounds within the sport bucket window' },
                            { label: 'Screening current',  count: dataCoverage.screening, hint: 'Nordic / FMS / Y-balance within injury-screen window' },
                            { label: 'Power current',      count: dataCoverage.power,     hint: 'CMJ / RSI / DSI / SJ within the 60-day window' },
                        ];
                        return (
                            <div className="bg-white dark:bg-[#132338] rounded-lg border border-slate-200 dark:border-[#243A58] shadow-sm px-3 py-2.5 lg:flex-1 lg:min-h-0 flex flex-col">
                                <div className="flex items-center gap-1.5 mb-2 shrink-0">
                                    <DatabaseIcon size={11} className="text-indigo-500" />
                                    <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide flex-1">Squad Data Coverage</div>
                                    <button
                                        type="button"
                                        onClick={() => setCoverageInfoOpen(v => !v)}
                                        className="p-0.5 rounded text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-500 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors"
                                        aria-label={coverageInfoOpen ? 'Hide explanation' : 'Show explanation'}
                                        title="What does this show?"
                                    >
                                        <InfoIcon size={11} />
                                    </button>
                                </div>
                                {coverageInfoOpen && (
                                    <div className="mb-2 p-2 rounded bg-indigo-50/60 dark:bg-indigo-500/10 border border-indigo-200/60 dark:border-indigo-500/30 text-[9px] leading-snug text-slate-600 dark:text-[#CBD5E1] shrink-0">
                                        Counts athletes with current data per domain. Same staleness gates as the <strong>Data Freshness</strong> scoring (10% of Readiness). Bars: <span className="text-emerald-600 dark:text-emerald-300 font-semibold">green ≥75%</span> · <span className="text-amber-600 dark:text-amber-300 font-semibold">amber 40-74%</span> · <span className="text-rose-600 dark:text-rose-300 font-semibold">red &lt;40%</span>. Thresholds adapt to the team's sport bucket — Nordic / CMJ keep their universal cliffs.
                                    </div>
                                )}
                                <div className="flex-1 min-h-0 flex flex-col justify-around gap-1.5 py-0.5">
                                    {rows.map(row => {
                                        const pct = dataCoverage.total > 0 ? (row.count / dataCoverage.total) * 100 : 0;
                                        const tone = pct >= 75 ? 'emerald' : pct >= 40 ? 'amber' : 'rose';
                                        const textTone =
                                            tone === 'emerald' ? 'text-emerald-600 dark:text-emerald-300'
                                            : tone === 'amber' ? 'text-amber-600 dark:text-amber-300'
                                            : 'text-rose-600 dark:text-rose-300';
                                        const barTone =
                                            tone === 'emerald' ? 'bg-emerald-500'
                                            : tone === 'amber' ? 'bg-amber-500'
                                            : 'bg-rose-500';
                                        return (
                                            <div key={row.label} title={row.hint}>
                                                <div className="flex items-center justify-between text-[10px] leading-tight">
                                                    <span className="text-slate-600 dark:text-[#CBD5E1] truncate">{row.label}</span>
                                                    <span className={`font-semibold tabular-nums shrink-0 ml-1 ${textTone}`}>{row.count}/{dataCoverage.total}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-100 dark:bg-[#243A58] rounded-full mt-1 overflow-hidden">
                                                    <div className={`h-full ${barTone} transition-all`} style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
                );
            })()}

            {/* ── Left column — tables (order-1 on lg). Wraps both individual and team views. */}
            <div className="lg:order-1 flex-1 min-w-0 min-h-0 flex flex-col gap-3">

            {/* ── Individual body — single scrollable column ── */}
            {showingIndividual && (
                <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
                    {readiness && renderReadinessBreakdown(readiness)}
                    {renderInsightFeed(individualInsights)}
                    {renderAssessmentProfile(profile)}
                    {individualInsights.length === 0 && !isLoading && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 text-center">
                            <BrainIcon size={32} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                            <h3 className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] mb-1">No Insights Available</h3>
                            <p className="text-xs text-slate-400 dark:text-[#CBD5E1] max-w-md mx-auto">
                                {focusedPlayerName
                                    ? `No data found for ${focusedPlayerName}. Log training loads, wellness check-ins, or test results to generate insights.`
                                    : 'Start logging training loads, wellness check-ins, and test results to unlock cross-domain intelligence.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── Team body — Squad Patterns + matrix-dominant container ──
                The matrix takes the remaining viewport height; its header stays
                pinned while only the athlete rows (and any Re-Test entries below)
                scroll inside. */}
            {isTeam && !focusedPlayerId && (
                <div className="flex-1 min-h-0 flex flex-col gap-3">
                    {/* Squad Patterns — collapsible so coaches can reclaim space when scanning the matrix */}
                    {renderInsightFeed(
                        teamInsights,
                        'Squad Patterns',
                        `Flags shared across 30%+ of ${selectedSubject?.name || 'the squad'}`,
                        true,
                        patternsCollapsed,
                        () => setPatternsCollapsed(c => !c),
                    )}

                    {/* Athlete Triage Matrix — renamed from "Squad Readiness Matrix"
                        to avoid collision with the Wellness Hub's Squad Readiness
                        questionnaire data. The matrix takes the remaining viewport,
                        header is shrink-0, athlete rows scroll inside. */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex-1 min-h-0 flex flex-col">
                        <div className="shrink-0 px-5 py-2.5 border-b border-slate-100 dark:border-[#1A2D48] flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <h3 className="text-[12px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-tight shrink-0">Athlete Triage Matrix</h3>
                                {teamReadiness && (
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] shrink-0">· {teamProfiles.length} athletes</span>
                                )}
                                <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] truncate">· Click any athlete for their full profile</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] flex-wrap shrink-0">
                                {teamReadiness && (
                                    <>
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="font-bold text-emerald-700 dark:text-emerald-300">{teamReadiness.greenCount}</span>
                                            <span className="text-emerald-600 dark:text-emerald-400">Green</span>
                                        </span>
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span className="font-bold text-amber-700 dark:text-amber-300">{teamReadiness.amberCount}</span>
                                            <span className="text-amber-600 dark:text-amber-400">Amber</span>
                                        </span>
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50">
                                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="font-bold text-rose-700 dark:text-rose-300">{teamReadiness.redCount}</span>
                                            <span className="text-rose-600 dark:text-rose-400">Red</span>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto">
                        <div className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
                            {teamProfiles.map(player => {
                                const r = player.readiness;
                                const isExp = expandedPlayer === player.id;
                                const critCount = player.insights.filter(i => i.severity === 'critical').length;
                                const warnCount = player.insights.filter(i => i.severity === 'warning').length;
                                return (
                                    <div key={player.id}>
                                        <div className="flex items-center">
                                            <button
                                                onClick={() => setExpandedPlayer(isExp ? null : player.id)}
                                                className="flex-1 px-4 py-2 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/40 transition-colors"
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border-2 shrink-0 ${statusBg(r.status)}`}>
                                                    <span className={statusColor(r.status)}>{r.overall}</span>
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">{player.name}</div>
                                                    <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] truncate">{r.confidence} · {r.domainsUsed} domains</div>
                                                </div>
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    {critCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">{critCount}c</span>}
                                                    {warnCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">{warnCount}w</span>}
                                                    {critCount === 0 && warnCount === 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">clear</span>}
                                                    {isExp ? <ChevronDownIcon size={13} className="text-slate-400" /> : <ChevronRightIcon size={13} className="text-slate-400" />}
                                                </div>
                                            </button>
                                            {/* Drill-in button — icon-only with tooltip so the row stays tight */}
                                            <button
                                                onClick={() => { setFocusedPlayerId(player.id); setExpandedInsight(null); }}
                                                className="p-2 text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all border-l border-slate-100 dark:border-[#1A2D48]"
                                                title={`View ${player.name}'s full profile`}
                                            >
                                                <ArrowRightIcon size={13} />
                                            </button>
                                        </div>
                                        {isExp && (
                                            <div className="px-6 pb-4 space-y-2">
                                                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                                    {r.domains.filter(d => d.available).map(d => (
                                                        <div key={d.name} className="text-center">
                                                            <div className="text-[8px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase truncate">{d.name}</div>
                                                            <div className={`text-sm font-bold ${d.score >= 80 ? 'text-emerald-600 dark:text-emerald-300' : d.score >= 50 ? 'text-amber-600 dark:text-amber-300' : 'text-rose-600 dark:text-rose-300'}`}>{d.score}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {player.insights.filter(i => i.severity !== 'info').slice(0, 3).map(ins => (
                                                    <div key={ins.id} className={`p-3 rounded-lg border ${severityBg(ins.severity)} flex items-start gap-2`}>
                                                        {severityIcon(ins.severity)}
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{ins.title}</div>
                                                            <div className="text-[10px] text-slate-600 dark:text-[#CBD5E1] mt-0.5">{ins.recommendation}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Re-Test Schedule — lives inside the same scroll body so it
                            stays visible right after the squad without needing a
                            separate page scroll. */}
                        {retestSchedule.length > 0 && (
                            <div className="border-t border-slate-100 dark:border-[#1A2D48]">
                                <div className="px-4 py-2 bg-slate-50/60 dark:bg-[#0F1C30]/40">
                                    <div className="flex items-center gap-2">
                                        <CalendarIcon size={12} className="text-indigo-500" />
                                        <h4 className="text-[11px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-tight">Re-Test Schedule</h4>
                                        <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">· {retestSchedule.length} overdue</span>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-50 dark:divide-[#1A2D48]">
                                    {retestSchedule.map((entry) => (
                                        <div key={entry.id} className="px-4 py-2 flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                                                <CalendarIcon size={11} className="text-amber-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">{entry.playerName}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1] truncate">{entry.message}</div>
                                            </div>
                                            <button
                                                onClick={() => { setFocusedPlayerId(entry.playerId); setExpandedInsight(null); }}
                                                className="text-[10px] text-indigo-600 dark:text-indigo-300 font-semibold hover:underline shrink-0"
                                            >
                                                View
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        </div>{/* /matrix scroll body */}
                    </div>{/* /matrix container */}
                </div>
            )}

            </div>{/* /left column */}
            </div>{/* /body 2-col */}

            {/* ── Explain modal — domain explainer tiles ── */}
            {explainOpen && (
                <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4" onClick={() => setExplainOpen(false)}>
                    <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] shrink-0 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">How Performance Intelligence works</h3>
                                <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">The data domains feeding this terminal and how to read the output.</p>
                            </div>
                            <button onClick={() => setExplainOpen(false)} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                                <XIcon size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">
                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ActivityIcon size={14} className="text-indigo-500" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Load Status (30%)</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Fed from the <strong>ACWR Hub</strong> — the per-athlete training-load entries logged there are the current source. Load Thresholds will join as a parallel feed once that hub is finalised. The <strong>ACWR model configured per team</strong> in the ACWR settings determines what data type is fed in: if the team is set to sRPE, then RPE × Duration values feed the math; Sprint Distance pulls GPS sprint metres; Total Distance, Tonnage, TRIMP, PlayerLoad and Session Duration each feed their own values. Whichever model is active, the last 7 days' average is compared against the last 28 days to produce the Acute:Chronic Workload Ratio. <strong>Optimal zone is 0.8–1.3</strong>, above 1.3 is caution, above 1.5 is danger, below 0.8 is under-exposed. Zone thresholds are research-standard for every athlete — individualised threshold overrides come later once Load Thresholds is built out.
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <HeartPulseIcon size={14} className="text-indigo-500" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Recovery State (25%)</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Pulls from daily wellness questionnaire answers submitted by athletes through the Wellness Hub (sleep quality, fatigue, soreness, stress, mood, sleep hours). A composite is built from the 3 most recent responses using research-weighted contributions (sleep quality 35%, energy 30%, soreness 20%, stress 15%). Rolling averages drive both the Wellness Composite tile and the rule-engine (e.g. "Sleep Quality Compromised" fires when 3-day sleep drops below 5/10).
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUpIcon size={14} className="text-indigo-500" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Performance Trend (20%)</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Reads testing data from the Testing Hub. Each test type (1RM lifts, CMJ, DSI, RSI, Nordic, sprint times, etc.) is compared between the latest result and the previous one. Improving (&gt;3%) scores 90, stable scores 75, declining (&lt;-3%) scores 40.
                                    <br /><br />
                                    <strong>Sport-aware staleness:</strong> decay and exclusion thresholds adapt to the team's sport so in-season pro athletes who only test 2–4× a year don't get flagged as "missing data." Buckets: <strong>high-density team</strong> (Soccer / NBA / NHL / NFL / AFL / Cricket) decays at 120 d and excludes at 270 d · <strong>mid-density team</strong> (Rugby) decays at 90 d, excludes at 210 d · <strong>individual / training-dominant</strong> (T&amp;F / Swimming / Cycling / OLY) decays at 45 d, excludes at 120 d · <strong>combat</strong> 60–150 d / 240 d · default (unknown sport) 90 d / 210 d.
                                    <br /><br />
                                    <strong>Test-type carve-outs</strong> that apply regardless of sport: CMJ / RSI / DSI / SJ decay at 21 d and drop out at 60 d (cheap and repeatable — Claudino 2017); Nordic / hamstring decay at 42 d and drop out at 120 d (injury-risk window — Opar 2015, Bourne 2018). Source: <code>plans/PI-SPORT-AWARE-THRESHOLDS.md</code>.
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldAlertIcon size={14} className="text-indigo-500" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Injury Risk (15%)</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Multi-factor screening from the Testing Hub. <strong>Nordic / hamstring</strong> (relative strength &lt; 3.37 N/kg flags High Risk; bilateral asymmetry &gt; 15% flags too — Opar 2015, Bourne 2018) — most relevant for sprint-heavy sports. <strong>Y-Balance</strong> composite reach &lt; 94% leg length or anterior asymmetry &gt; 4 cm (Plisky 2006, Smith 2015). <strong>CMJ Advanced</strong> bilateral asymmetry &gt; 15% (Bishop 2018) — picks up cutting / jumping sport risk where Nordic isn't standard. <strong>FMS sub-scores</strong> — any 0 (pain) is critical, any 1 (unable) is a warning (Cook 2014; a single sub-score predicts injury better than the total alone). <strong>Compound risk</strong> — any high-risk screening flag + ACWR &gt; 1.3 amplifies the score. Each rule is field-presence-defensive, so partial data still produces a useful read. See <code>plans/PI-INJURY-RISK-EXPANSION.md</code> for the Phase 2-5 roadmap (adductor squeeze, single-leg hop battery, previous-injury history, sport-specific overlays, cycle-phase tracking).
                                </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BrainIcon size={14} className="text-indigo-500" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Data Freshness (10%)</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    A confidence signal that goes up the more current data exists across all domains. Five checks: load recent, wellness recent, strength tested in the last 60 days, screening tested in the last 90 days, power tested in the last 60 days. Each check passing adds 20 points.
                                </p>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-200 dark:border-indigo-500/30 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <InfoIcon size={14} className="text-indigo-600 dark:text-indigo-300" />
                                    <h4 className="text-[12px] font-bold text-indigo-700 dark:text-indigo-200 uppercase tracking-wide">How to use the output</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    The <strong>Readiness</strong> tile is the rolled-up verdict — green ≥80, amber 50–79, red &lt;50. Domains with no data are skipped and their weight redistributes across the rest, so the score stays honest. The <strong>Intelligence Feed</strong> below lists the specific rules that fired (sorted critical → warning → info) — each card has a recommendation and a research citation. In team view, the <strong>Athlete Triage Matrix</strong> ranks all athletes by readiness (lowest first, so the athletes who need attention surface at the top); click any name (or the arrow on the right) to drill into their full individual profile.
                                </p>
                            </div>
                        </div>
                        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#243A58] shrink-0 flex justify-end bg-slate-50/50 dark:bg-[#0F1C30]/40">
                            <button onClick={() => setExplainOpen(false)} className="px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
