// @ts-nocheck — moved verbatim from DashboardPage.tsx (monolith restructure,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// Morning Report: at-risk athletes, flagged list, wellness summary rows.
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
    ChevronDownIcon, AlertTriangleIcon, XIcon, UsersIcon, ExternalLinkIcon,
    ClockIcon, CheckCircle2Icon, Activity as ActivityIcon,
} from 'lucide-react';
import { AthleteAvatar } from '../../components/roster/AthleteAvatar';

export const MorningReport: React.FC<any> = ({
    acwrEnabledAthleteIds,
    acwrExclusions,
    calculateACWR,
    hasAnyAcwrEnabled,
    heatmapTeamFilter,
    isMorningReportExpanded,
    isReportCollapsed,
    loadRecords,
    setIsInterventionModalOpen,
    setIsMorningReportExpanded,
    setSelectedInterventionAthlete,
    teams,
    toggleReportCollapsed,
}) => {
        // Show prompt state when no squad is selected
        if (heatmapTeamFilter === 'prompt') return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col h-full">
                <button
                    onClick={toggleReportCollapsed}
                    className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/60 dark:bg-[#132338]/40 flex items-center justify-between w-full text-left hover:bg-slate-100/60 dark:hover:bg-[#1A2D48] transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <ActivityIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-[#E2E8F0]">Performance Report</h3>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">ACWR readiness</p>
                        </div>
                    </div>
                    <ChevronDownIcon size={14} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform duration-200 shrink-0 ${isReportCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isReportCollapsed && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <UsersIcon size={20} className="text-slate-300 dark:text-[#475569] mb-2" />
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">Select a squad to view the performance report.</p>
                    </div>
                )}
            </div>
        );

        // Show empty state when ACWR is not enabled
        if (!hasAnyAcwrEnabled) return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col h-full">
                <button
                    onClick={toggleReportCollapsed}
                    className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/60 dark:bg-[#132338]/40 flex items-center justify-between w-full text-left hover:bg-slate-100/60 dark:hover:bg-[#1A2D48] transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-200 dark:bg-[#1A2D48] rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                            <AlertTriangleIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-[#E2E8F0]">Performance Report</h3>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">ACWR readiness</p>
                        </div>
                    </div>
                    <ChevronDownIcon size={14} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform duration-200 shrink-0 ${isReportCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isReportCollapsed && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">No ACWR monitoring enabled.</p>
                        <p className="text-[10px] text-slate-300 dark:text-[#475569] mt-1">Enable ACWR for your teams in Settings → Feature Settings to see the performance report.</p>
                    </div>
                )}
            </div>
        );

        // Staleness check — only show athletes with load data in the last 7 days
        const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        const athleteLastLoadDate = new Map<string, string>();
        for (const r of (loadRecords || [])) {
            const aid = r.athlete_id || r.athleteId;
            const d = r.date || '';
            if (aid && d && (!athleteLastLoadDate.has(aid) || d > athleteLastLoadDate.get(aid)!)) {
                athleteLastLoadDate.set(aid, d);
            }
        }
        // Most recent load date overall (for "as of" label)
        const loadDateValues = [...athleteLastLoadDate.values()];
        const mostRecentLoadDate = loadDateValues.length > 0 ? loadDateValues.sort().reverse()[0] : null;
        const hasRecentData = mostRecentLoadDate && mostRecentLoadDate >= sevenDaysAgoStr;

        // Active at-risk athletes — only those with data within the last 7 days
        const activeAtRisk = teams.flatMap(t => t.players)
            .filter(player => acwrEnabledAthleteIds.has(player.id))
            .filter(player => !acwrExclusions?.[player.id]?.excluded)
            .filter(player => {
                const last = athleteLastLoadDate.get(player.id);
                return last && last >= sevenDaysAgoStr;
            })
            .map(player => {
                const acwr = parseFloat(calculateACWR(player.id));
                let riskLevel = 'Stable';
                const ex = acwrExclusions?.[player.id];
                const isReturning = ex?.returnDate && !ex.excluded && ((Date.now() - new Date(ex.returnDate + 'T00:00:00').getTime()) / 86400000) <= 7;
                if (acwr > 1.5) riskLevel = 'Critical';
                else if (acwr > 1.3) riskLevel = 'Warning';
                else if (acwr < 0.8 && acwr > 0) riskLevel = 'Warning';
                else if (isReturning) riskLevel = 'Warning';
                const lastDate = athleteLastLoadDate.get(player.id) || '';
                return { ...player, riskLevel, acwr, isReturning, isInjured: false, lastDate };
            }).filter(p => p.riskLevel !== 'Stable').sort((a, b) => {
                const tierRank = { Critical: 2, Warning: 1 };
                const tA = tierRank[a.riskLevel] ?? 0;
                const tB = tierRank[b.riskLevel] ?? 0;
                if (tB !== tA) return tB - tA;
                if (b.lastDate !== a.lastDate) return b.lastDate.localeCompare(a.lastDate);
                return b.acwr - a.acwr;
            });

        // Injured/excluded athletes (at the bottom)
        const injuredAthletes = teams.flatMap(t => t.players)
            .filter(player => acwrEnabledAthleteIds.has(player.id))
            .filter(player => acwrExclusions?.[player.id]?.excluded)
            .map(player => ({ ...player, riskLevel: 'Injured', acwr: 0, isReturning: false, isInjured: true }));

        const atRiskAthletes = [...activeAtRisk, ...injuredAthletes];
        const totalCount = atRiskAthletes.length;

        const visible = atRiskAthletes.slice(0, 5);
        const remaining = atRiskAthletes.length - 5;

        const renderCompactRow = (player, onClick) => {
            const isInjured = player.isInjured;
            const acwrColor = isInjured ? 'text-slate-400' : player.acwr > 1.5 ? 'text-rose-600' : player.acwr > 1.3 ? 'text-amber-600' : 'text-sky-600';
            const bgColor = isInjured ? 'bg-slate-200 text-slate-500' : player.acwr > 1.5 ? 'bg-rose-100 text-rose-700' : player.acwr > 1.3 ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';
            const borderColor = isInjured ? 'border-l-slate-400' : player.acwr > 1.5 ? 'border-l-rose-500' : player.acwr > 1.3 ? 'border-l-amber-400' : 'border-l-sky-400';
            return (
                <div key={player.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-l-[3px] ${borderColor} ${isInjured ? 'bg-slate-50/80 dark:bg-[#1A2D48]/60 opacity-70' : 'bg-slate-50/50 dark:bg-[#1A2D48]/30'} hover:bg-white dark:hover:bg-[#1A2D48] hover:shadow-sm transition-all cursor-pointer`}
                    onClick={onClick}
                >
                    <AthleteAvatar
                        player={player}
                        size="xs"
                        shape="rounded-md"
                        className="w-7 h-7"
                        fallbackClass={bgColor}
                    />
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-medium text-slate-900 dark:text-[#E2E8F0] truncate">{player.name}</h4>
                    </div>
                    {isInjured ? (
                        <span className="text-[10px] font-semibold text-slate-400 italic shrink-0">Injured</span>
                    ) : (
                        <div className="flex flex-col items-end shrink-0">
                            <div className={`text-sm font-bold ${acwrColor}`}>{player.acwr.toFixed(2)}</div>
                            {player.lastDate && (
                                <div className="text-[9px] text-slate-400">
                                    {player.lastDate === new Date().toISOString().split('T')[0]
                                        ? 'today'
                                        : player.lastDate === new Date(Date.now() - 86400000).toISOString().split('T')[0]
                                        ? 'yesterday'
                                        : new Date(player.lastDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        };

        return (
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col">
                <button
                    onClick={toggleReportCollapsed}
                    className="px-4 py-3 border-b border-slate-100 dark:border-[#243A58] bg-rose-50/60 dark:bg-rose-900/10 flex items-center justify-between w-full text-left hover:bg-rose-50/80 dark:hover:bg-[#1A2D48] transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <AlertTriangleIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-slate-900 dark:text-[#E2E8F0]">Performance Report</h3>
                            <p className="text-[10px] text-slate-500">
                                {mostRecentLoadDate ? (() => {
                                    const today = new Date().toISOString().split('T')[0];
                                    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
                                    const label = mostRecentLoadDate === today ? 'today'
                                        : mostRecentLoadDate === yesterday ? 'yesterday'
                                        : new Date(mostRecentLoadDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
                                    return `ACWR from last session — ${label}`;
                                })() : 'ACWR readiness'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 bg-white dark:bg-[#1A2D48] border border-rose-200 dark:border-rose-800/50 rounded-full text-[10px] font-medium text-rose-600 dark:text-rose-400">{atRiskAthletes.length}</span>
                        <ChevronDownIcon size={14} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform duration-200 ${isReportCollapsed ? '-rotate-90' : ''}`} />
                    </div>
                </button>
                {!isReportCollapsed && (<>
                    <div className="p-2.5 space-y-1.5 flex-1 overflow-y-auto">
                        {!hasRecentData ? (
                            <div className="py-8 flex flex-col items-center justify-center gap-2">
                                <ClockIcon size={22} className="text-slate-400" />
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] text-center font-medium">No recent data</p>
                                <p className="text-[10px] text-slate-500 text-center">
                                    {mostRecentLoadDate
                                        ? `Last entry was ${mostRecentLoadDate} — more than 7 days ago.`
                                        : 'No training load recorded yet.'}
                                </p>
                                <p className="text-[10px] text-slate-500 text-center">Log sessions or import CSV to see readiness.</p>
                            </div>
                        ) : atRiskAthletes.length > 0 ? (
                            <>
                                {visible.map(player => renderCompactRow(player, () => {
                                    setSelectedInterventionAthlete(player);
                                    setIsInterventionModalOpen(true);
                                }))}
                                {remaining > 0 && (
                                    <button
                                        onClick={() => setIsMorningReportExpanded(true)}
                                        className="w-full py-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-[#1A2D48] rounded-lg transition-colors"
                                    >
                                        +{remaining} more athlete{remaining > 1 ? 's' : ''}
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-slate-300 gap-2">
                                <CheckCircle2Icon size={28} className="text-emerald-400/40" />
                                <p className="text-[11px] text-slate-400">All monitored athletes within safe range</p>
                            </div>
                        )}
                    </div>
                    {/* Sub-banner — quiet link through to the source hub for this report.
                        Mirrors the "Open Questionnaire Data" affordance on the Wellness Summary card
                        so each dashboard surface has a clear path back to where its data is managed. */}
                    <Link
                        to="/wellness?section=ACWR+Monitoring"
                        className="px-4 py-2.5 border-t border-slate-100 dark:border-[#1A2D48] flex items-center justify-between text-[11px] font-medium text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 hover:bg-indigo-50/60 dark:hover:bg-[#1A2D48]/60 transition-colors group"
                    >
                        <span>Open ACWR Monitoring in Wellness</span>
                        <ExternalLinkIcon size={12} className="opacity-70 group-hover:opacity-100 transition-opacity" />
                    </Link>
                </>)}

                {/* Expanded popup showing all at-risk athletes */}
                {isMorningReportExpanded && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMorningReportExpanded(false)} />
                        <div className="relative bg-white dark:bg-[#1A2D48] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] bg-rose-50/60 dark:bg-rose-900/10 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">All At-Risk Athletes</h3>
                                    <p className="text-[10px] text-slate-500">Click an athlete to see their risk analysis</p>
                                </div>
                                <button onClick={() => setIsMorningReportExpanded(false)} aria-label="Close" className="p-1.5 hover:bg-white/60 rounded-lg">
                                    <XIcon size={16} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
                                {atRiskAthletes.map(player => renderCompactRow(player, () => {
                                    setSelectedInterventionAthlete(player);
                                    setIsInterventionModalOpen(true);
                                    setIsMorningReportExpanded(false);
                                }))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
};

export default MorningReport;
