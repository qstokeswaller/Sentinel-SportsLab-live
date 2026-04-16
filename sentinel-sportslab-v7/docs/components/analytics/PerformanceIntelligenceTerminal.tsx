// @ts-nocheck
import React, { useMemo, useState } from 'react';
import {
    BrainIcon, TrendingUpIcon, AlertCircleIcon, ShieldAlertIcon, HeartPulseIcon,
    ZapIcon, SearchIcon, ActivityIcon, ChevronDownIcon, ChevronRightIcon,
    CheckCircleIcon, AlertTriangleIcon, InfoIcon, TargetIcon, UsersIcon,
    UserIcon, CalendarIcon, ArrowRightIcon,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { buildAthleteDataProfile, generateInsights, calculateReadinessScore } from '../../utils/performanceIntelligence';

export const PerformanceIntelligenceTerminal = ({
    kpiDefinitions,
    kpiRecords,
    selectedAnalyticsAthleteId,
    subjectAthleteIds,
    analyticsStartDate,
    analyticsEndDate,
    watchedKpiIds,
    setWatchedKpiIds,
    setIsKpiWatchlistModalOpen
}) => {
    const {
        athleteAssessments, loadRecords, habitRecords, wellnessData,
        acwrSettings, teams, isLoading,
    } = useAppState();

    const [expandedInsight, setExpandedInsight] = useState(null);
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [focusedPlayerId, setFocusedPlayerId] = useState(null); // drill into individual from team

    const isTeam = (subjectAthleteIds || []).length > 1;
    const selectedSubject = isTeam
        ? teams.find(t => `team_${t.id}` === selectedAnalyticsAthleteId)
        : teams.flatMap(t => t.players).find(p => p.id === selectedAnalyticsAthleteId);

    const wellness = useMemo(() =>
        (wellnessData && wellnessData.length > 0) ? wellnessData : (habitRecords || []),
        [wellnessData, habitRecords]
    );

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
        );
    }, [selectedAnalyticsAthleteId, focusedPlayerId, isTeam, loadRecords, wellness, athleteAssessments, acwrSettings, teams]);

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
            );
            const insights = generateInsights(profile);
            const readiness = calculateReadinessScore(profile);
            return { ...p, profile, insights, readiness };
        }).sort((a, b) => a.readiness.overall - b.readiness.overall);
    }, [isTeam, selectedSubject, loadRecords, wellness, athleteAssessments, acwrSettings, teams]);

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
        const titleCounts = {};
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

    // ── Helpers ──
    const severityIcon = (s) => {
        if (s === 'critical') return <AlertCircleIcon size={16} className="text-rose-500" />;
        if (s === 'warning') return <AlertTriangleIcon size={16} className="text-amber-500" />;
        return <InfoIcon size={16} className="text-sky-500" />;
    };
    const severityBg = (s) => s === 'critical' ? 'border-rose-200 bg-rose-50' : s === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-sky-200 bg-sky-50';
    const severityBadge = (s) => s === 'critical' ? 'bg-rose-100 text-rose-700' : s === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';
    const categoryIcon = (c) => {
        if (c === 'Risk') return <ShieldAlertIcon size={14} />;
        if (c === 'Performance') return <TrendingUpIcon size={14} />;
        if (c === 'Recovery') return <HeartPulseIcon size={14} />;
        return <TargetIcon size={14} />;
    };
    const statusColor = (s) => s === 'green' ? 'text-emerald-600' : s === 'amber' ? 'text-amber-600' : 'text-rose-600';
    const statusBg = (s) => s === 'green' ? 'bg-emerald-50 border-emerald-200' : s === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200';
    const statusRing = (s) => s === 'green' ? 'ring-emerald-400' : s === 'amber' ? 'ring-amber-400' : 'ring-rose-400';

    // ── Shared UI blocks ──

    const renderReadinessBreakdown = (r) => (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tight">Readiness Breakdown</h3>
                <span className="text-[10px] text-slate-400">{r.domainsUsed} of {r.domainsTotal} domains active</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {r.domains.map(d => (
                    <div key={d.name} className={`p-3 rounded-xl border ${d.available ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-200 opacity-60'}`}>
                        <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">{d.name}</div>
                        {d.available ? (
                            <>
                                <div className={`text-xl font-bold ${d.score >= 80 ? 'text-emerald-600' : d.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{d.score}</div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${d.score >= 80 ? 'bg-emerald-500' : d.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${d.score}%` }} />
                                </div>
                                <div className="text-[8px] text-slate-400 mt-1 truncate" title={d.reason}>{d.reason}</div>
                            </>
                        ) : (
                            <div className="text-[10px] text-slate-400 italic mt-1">{d.reason}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderInsightFeed = (insightList, title = 'Intelligence Feed', subtitle = 'Actionable insights generated from cross-domain analysis') => (
        insightList.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tight">{title}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
                </div>
                <div className="divide-y divide-slate-50">
                    {insightList.map(ins => {
                        const isExpanded = expandedInsight === ins.id;
                        return (
                            <div key={ins.id}>
                                <button
                                    onClick={() => setExpandedInsight(isExpanded ? null : ins.id)}
                                    className="w-full px-6 py-4 flex items-start gap-4 text-left hover:bg-slate-50/50 transition-colors"
                                >
                                    <div className="mt-0.5 shrink-0">{severityIcon(ins.severity)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${severityBadge(ins.severity)}`}>{ins.severity}</span>
                                            <span className="text-[9px] font-semibold text-slate-400 uppercase flex items-center gap-1">{categoryIcon(ins.category)} {ins.category}</span>
                                        </div>
                                        <h4 className="text-sm font-semibold text-slate-900 mt-1">{ins.title}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{ins.message}</p>
                                    </div>
                                    <div className="shrink-0 mt-1">
                                        {isExpanded ? <ChevronDownIcon size={14} className="text-slate-400" /> : <ChevronRightIcon size={14} className="text-slate-400" />}
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="px-6 pb-4 ml-10">
                                        <div className={`p-4 rounded-xl border ${severityBg(ins.severity)}`}>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Recommendation</div>
                                            <p className="text-xs text-slate-700 leading-relaxed">{ins.recommendation}</p>
                                            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-200/50">
                                                <span className="text-[9px] text-slate-400">Source: {ins.dataSource}</span>
                                                {ins.confidence && <span className="text-[9px] text-slate-400">| {ins.confidence}</span>}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )
    );

    const renderAssessmentProfile = (p) => (
        p && Object.keys(p.assessmentsByType).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tight">Assessment Profile</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(p.assessmentsByType).map(([type, data]) => {
                        const m = data.latest?.metrics || {};
                        const pm = data.previous?.metrics || {};
                        const val = Number(m.value) || Number(m.weight) || Number(m.relativeStrength) || null;
                        const prevVal = Number(pm.value) || Number(pm.weight) || Number(pm.relativeStrength) || null;
                        const trend = (val && prevVal && prevVal !== 0) ? (((val - prevVal) / prevVal) * 100).toFixed(1) : null;
                        const stale = data.daysSinceLatest > 60;
                        const label = m.exerciseLabel || type.replace(/^rm_/, '').replace(/_/g, ' ');
                        return (
                            <div key={type} className={`p-4 rounded-xl border ${stale ? 'border-dashed border-slate-200 bg-slate-50/50' : 'border-slate-200 bg-white'}`}>
                                <div className="text-[9px] font-bold text-indigo-500 uppercase">{label}</div>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-2xl font-bold text-slate-900">{val !== null ? val.toFixed(val < 10 ? 2 : 0) : '--'}</span>
                                    <span className="text-[9px] text-slate-400">{m.unit || ''}</span>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    {trend !== null && (
                                        <span className={`text-[10px] font-semibold ${Number(trend) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {Number(trend) >= 0 ? '+' : ''}{trend}%
                                        </span>
                                    )}
                                    <span className={`text-[9px] ${stale ? 'text-amber-500' : 'text-slate-400'}`}>
                                        {data.daysSinceLatest}d ago
                                    </span>
                                </div>
                                {data.count > 1 && <div className="text-[8px] text-slate-400 mt-1">{data.count} tests logged</div>}
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
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Compact header — readiness badge + context + back button */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    {/* Back to squad (when drilled into player) */}
                    {focusedPlayerId && (
                        <>
                            <button
                                onClick={() => { setFocusedPlayerId(null); setExpandedInsight(null); }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-all"
                            >
                                <ChevronRightIcon size={12} className="rotate-180" /> Squad
                            </button>
                            <div className="h-4 w-px bg-slate-200" />
                        </>
                    )}
                    <div>
                        <div className="text-sm font-semibold text-slate-900">
                            {focusedPlayerName || (isTeam ? `${teamProfiles.length} Athletes` : selectedSubject?.name)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                            {insights.length} insight{insights.length !== 1 ? 's' : ''} generated
                            {focusedPlayerName && ' — individual deep-dive'}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Individual readiness badge */}
                    {showingIndividual && readiness && (
                        <div className="flex items-center gap-2.5">
                            <div className="text-right">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Readiness</div>
                                <div className="text-[9px] text-slate-300 uppercase">{readiness.confidence}</div>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${statusBg(readiness.status)} ring-2 ${statusRing(readiness.status)}`}>
                                <span className={`text-lg font-bold ${statusColor(readiness.status)}`}>{readiness.overall}</span>
                            </div>
                        </div>
                    )}
                    {/* Team average readiness */}
                    {isTeam && !focusedPlayerId && teamReadiness && (
                        <div className="flex items-center gap-2.5">
                            <div className="text-right">
                                <div className="text-[9px] font-bold text-slate-400 uppercase">Squad Avg</div>
                                <div className="text-[9px] text-slate-300 uppercase">
                                    {teamReadiness.greenCount}G {teamReadiness.amberCount}A {teamReadiness.redCount}R
                                </div>
                            </div>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${statusBg(teamReadiness.status)} ring-2 ${statusRing(teamReadiness.status)}`}>
                                <span className={`text-lg font-bold ${statusColor(teamReadiness.status)}`}>{teamReadiness.avg}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Team Summary Stats ── */}
            {isTeam && !focusedPlayerId && teamReadiness && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                        <div className="text-[9px] font-bold text-slate-400 uppercase">Squad Size</div>
                        <div className="text-2xl font-bold text-slate-900">{teamProfiles.length}</div>
                    </div>
                    <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
                        <div className="text-[9px] font-bold text-emerald-600 uppercase">Green (80+)</div>
                        <div className="text-2xl font-bold text-emerald-700">{teamReadiness.greenCount}</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                        <div className="text-[9px] font-bold text-amber-600 uppercase">Amber (50-79)</div>
                        <div className="text-2xl font-bold text-amber-700">{teamReadiness.amberCount}</div>
                    </div>
                    <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
                        <div className="text-[9px] font-bold text-rose-600 uppercase">Red (&lt;50)</div>
                        <div className="text-2xl font-bold text-rose-700">{teamReadiness.redCount}</div>
                    </div>
                </div>
            )}

            {/* ── Individual View (standalone or drilled from team) ── */}
            {showingIndividual && (
                <>
                    {readiness && renderReadinessBreakdown(readiness)}
                    {renderInsightFeed(individualInsights)}
                    {renderAssessmentProfile(profile)}
                    {individualInsights.length === 0 && !isLoading && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
                            <BrainIcon size={32} className="text-slate-300 mx-auto mb-3" />
                            <h3 className="text-sm font-semibold text-slate-600 mb-1">No Insights Available</h3>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                {focusedPlayerName
                                    ? `No data found for ${focusedPlayerName}. Log training loads, wellness check-ins, or test results to generate insights.`
                                    : 'Start logging training loads, wellness check-ins, and test results to unlock cross-domain intelligence.'}
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* ── Team View ── */}
            {isTeam && !focusedPlayerId && (
                <>
                    {/* Squad-Wide Patterns */}
                    {renderInsightFeed(teamInsights, 'Squad-Wide Patterns', `Flags shared across 30%+ of ${selectedSubject?.name || 'the squad'}`)}

                    {/* Squad Readiness Matrix */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tight">Squad Readiness Matrix</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">Click any athlete to view their full individual profile</p>
                            </div>
                            <div className="flex items-center gap-2 text-[9px]">
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 80+</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 50-79</span>
                                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;50</span>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-50">
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
                                                className="flex-1 px-6 py-3 flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold border-2 ${statusBg(r.status)}`}>
                                                    <span className={statusColor(r.status)}>{r.overall}</span>
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <div className="text-sm font-semibold text-slate-900">{player.name}</div>
                                                    <div className="text-[9px] text-slate-400">{r.confidence} confidence — {r.domainsUsed} domains</div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {critCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">{critCount} critical</span>}
                                                    {warnCount > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{warnCount} warning</span>}
                                                    {critCount === 0 && warnCount === 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">clear</span>}
                                                    {isExp ? <ChevronDownIcon size={14} className="text-slate-400" /> : <ChevronRightIcon size={14} className="text-slate-400" />}
                                                </div>
                                            </button>
                                            {/* Drill-in button */}
                                            <button
                                                onClick={() => { setFocusedPlayerId(player.id); setExpandedInsight(null); }}
                                                className="px-3 py-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all border-l border-slate-100"
                                                title={`View ${player.name}'s full profile`}
                                            >
                                                <ArrowRightIcon size={14} />
                                            </button>
                                        </div>
                                        {isExp && (
                                            <div className="px-6 pb-4 space-y-2">
                                                <div className="grid grid-cols-5 gap-2">
                                                    {r.domains.filter(d => d.available).map(d => (
                                                        <div key={d.name} className="text-center">
                                                            <div className="text-[8px] font-bold text-slate-400 uppercase truncate">{d.name}</div>
                                                            <div className={`text-sm font-bold ${d.score >= 80 ? 'text-emerald-600' : d.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>{d.score}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {player.insights.filter(i => i.severity !== 'info').slice(0, 3).map(ins => (
                                                    <div key={ins.id} className={`p-3 rounded-lg border ${severityBg(ins.severity)} flex items-start gap-2`}>
                                                        {severityIcon(ins.severity)}
                                                        <div>
                                                            <div className="text-xs font-semibold text-slate-800">{ins.title}</div>
                                                            <div className="text-[10px] text-slate-600 mt-0.5">{ins.recommendation}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Re-Test Schedule */}
                    {retestSchedule.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <CalendarIcon size={14} className="text-indigo-500" />
                                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-tight">Re-Test Schedule</h3>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{retestSchedule.length} overdue assessments across the squad</p>
                            </div>
                            <div className="divide-y divide-slate-50">
                                {retestSchedule.map((entry) => (
                                    <div key={entry.id} className="px-6 py-3 flex items-center gap-4">
                                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <CalendarIcon size={12} className="text-amber-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs font-semibold text-slate-900">{entry.playerName}</div>
                                            <div className="text-[10px] text-slate-500">{entry.message}</div>
                                        </div>
                                        <button
                                            onClick={() => { setFocusedPlayerId(entry.playerId); setExpandedInsight(null); }}
                                            className="text-[10px] text-indigo-600 font-semibold hover:underline shrink-0"
                                        >
                                            View Profile
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
