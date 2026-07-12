// @ts-nocheck — moved verbatim from WellnessHub.tsx (restructure step 5,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// Main dashboard view: KPI strip, daily rundown, alerts, response list,
// heatmap, compliance — hosts the Responses/Insights tab switch.
import React from 'react';
import {
    Search, ChevronRight, ChevronLeft, ArrowLeft, AlertTriangle, Share2,
    Calendar, Activity, CheckCircle2, Clock, Zap, X, Trash2, ChevronDown, Thermometer,
} from 'lucide-react';
import { CustomSelect } from '../../ui/CustomSelect';
import { AthleteAvatar } from '../../roster/AthleteAvatar';
import WellnessHeatmap from '../../wellness/WellnessHeatmap';
import WellnessFlagPanel from '../../wellness/WellnessFlagPanel';
import WellnessInsightsTab from './WellnessInsightsTab';
import DatePicker from '../../../components/ui/DatePicker';
import {
    resolveAvailability, getAthleteStatus, getRpeBadge, STATUS_DOT,
    formatDate, localDateStr, TODAY,
    RUNDOWN_RANGE_OPTIONS,
} from './shared';

export const WellnessDashboard: React.FC<any> = ({
    onBackToSections, chartTextColor, chartAxisColor,
    activeTeam,
    alertsModalOpen,
    athletes,
    chartGridColor,
    chartLabelColor,
    compliance,
    dailyResponses,
    dashboardTab,
    heatmapAnchor,
    heatmapDays,
    insightCompareMetric,
    insightDate,
    insightMetric,
    insightPeriodMode,
    insightView,
    isHeatmapOpen,
    isKpiExpanded,
    isRundownOpen,
    isSelectMode,
    kpi,
    latestPerAthlete,
    openAthlete,
    responseViewDate,
    rundownAsOfDate,
    rundownDailyFiltered,
    rundownDeepChecks,
    rundownRangeDays,
    rundownTab,
    searchQuery,
    selectedResponseIds,
    selectedTeamId,
    setAlertsModalOpen,
    setDashboardTab,
    setHeatmapAnchor,
    setHeatmapDays,
    setInsightCompareMetric,
    setInsightDate,
    setInsightMetric,
    setInsightPeriodMode,
    setInsightView,
    setIsHeatmapOpen,
    setIsKpiExpanded,
    setIsRundownOpen,
    setIsSelectMode,
    setResponseViewDate,
    setRundownAsOfDate,
    setRundownRangeDays,
    setRundownTab,
    setSearchQuery,
    setSelectedResponseIds,
    setShowBulkConfirm,
    setShowDailyTracker,
    setViewMode,
    setWellnessDateRange,
    showDailyTracker,
    teamAverages,
    teams,
    triggeredIncomplete,
    triggeredNoChange,
    weeklyResponses,
    wellnessDateRange,
    wellnessResponses,
}) => {
    return (
        <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
            {/* Consolidated top banner — replaces the old big team header + the
                4-tile KPI strip + the availability summary bar. Owns the section
                breadcrumb (Wellness Hub > Questionnaire Data > Team), team title,
                date + response count, inline Avail/Mod/Unav pills, date range
                filter, and share. Parent WellnessHubPage hides its own breadcrumb
                when this is active (see WellnessHubPage:ownsBreadcrumb). */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                {/* Left: breadcrumb + team + date + response counts */}
                <div className="flex items-center gap-3 min-w-0">
                    {/* Back arrow goes up ONE level — to team selection — so coaches can
                        switch teams without leaving Questionnaire Data. To go further back
                        (out to all Wellness Hub sections), click "Wellness Hub" in the
                        breadcrumb below. */}
                    <button
                        onClick={() => setViewMode('selection')}
                        className="w-8 h-8 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg flex items-center justify-center text-slate-400 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] hover:border-slate-300 dark:hover:border-[#364E6E] transition-all shrink-0"
                        title="Change team"
                    >
                        <ArrowLeft size={14} />
                    </button>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">
                            <button
                                type="button"
                                onClick={() => onBackToSections ? onBackToSections() : setViewMode('selection')}
                                className="hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors"
                                title="Back to Wellness Hub sections"
                            >
                                Wellness Hub
                            </button>
                            <ChevronRight size={10} />
                            <span className="text-slate-500 dark:text-[#CBD5E1]">Questionnaire Data</span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight truncate">{activeTeam?.name}</h2>
                            <span className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded text-[9px] font-bold uppercase tracking-wide">Dashboard</span>
                            <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] truncate">
                                · {formatDate(TODAY)} · {kpi.total} of {activeTeam?.players.length} {kpi.total === 1 ? 'response' : 'responses'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right cluster: date filter + share. Availability pills + expandable
                    distribution bar moved into the Response Rate tile in the right rail —
                    same parent metric (daily check-in compliance), more logical drill-down. */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-32">
                        <CustomSelect
                            variant="filter"
                            size="sm"
                            value={wellnessDateRange}
                            onChange={e => setWellnessDateRange(e.target.value)}
                            prefixIcon={<Calendar size={12} />}
                        >
                            <option value="today">Today</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </CustomSelect>
                    </div>
                    <button
                        data-tour="wellness-share"
                        onClick={() => setViewMode('share')}
                        className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-all shadow-sm"
                        title="Share dashboard"
                    >
                        <Share2 size={14} />
                    </button>
                </div>
            </div>

            {/* Availability distribution bar moved into the Response Rate tile.
                Trigger lives there too (clicking the pills inside Response Rate
                expands the proportional bar). */}

            {/* ── Tab strip ───────────────────────────────────────────── */}
            <div className="flex gap-1 bg-white dark:bg-[#132338] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl p-1 w-fit shadow-sm">
                {(['overview', 'insights'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setDashboardTab(tab)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all ${
                            dashboardTab === tab
                                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm'
                                : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0]'
                        }`}
                    >
                        {tab === 'overview' ? 'Overview' : 'Insights'}
                    </button>
                ))}
            </div>

            {dashboardTab === 'overview' && (<>
            {/* 2-COL OVERVIEW BODY — main reading column on the left, summary rail
                on the right. Uses CSS `order` so the JSX stays mobile-first (rail
                content appears first in DOM = first on phones, where alerts come
                top of stream) while lg+ visually puts the rail on the right. */}
            <div className="flex flex-col lg:flex-row gap-4">
                {/* RIGHT RAIL — Priority Alerts (top, moved here) + Response Rate +
                    Team Averages. The OLD inner sm:grid-cols-2 (Avg+Response side-by-side)
                    collapses to a vertical stack at lg via lg:grid-cols-1.
                    lg:sticky keeps the rail glued to viewport-top as the left column
                    scrolls (solves the "right side blank when you scroll" problem). The
                    lg:max-h calc + overflow-y-auto are the safety net for tall rail
                    content in laptop viewports. */}
                <div className="lg:order-2 lg:w-96 shrink-0 flex flex-col gap-4 lg:sticky lg:top-0 lg:self-start lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">

                        {/* lg:order-2 pushes Team Averages BELOW Response Rate in the rail,
                            matching the requested order: Alerts → Response Rate → Averages.
                            Compressed from p-8/space-y-6 → p-5/space-y-3 + h-2 bars to fit
                            the rail without scroll on a typical laptop viewport. */}
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm space-y-3 lg:order-2">
                            <h3 className="text-sm font-semibold uppercase text-slate-900 dark:text-[#E2E8F0] flex items-center gap-2">
                                <Zap size={14} className="text-amber-500" /> Team Averages
                            </h3>
                            <div className="space-y-2.5">
                                {[
                                    { label: 'Fatigue',       id: 'fatigue',       color: '#f59e0b', max: 10, negative: true },
                                    { label: 'Soreness',      id: 'soreness',      color: '#ef4444', max: 10, negative: true },
                                    { label: 'Sleep Quality', id: 'sleep_quality', color: '#06b6d4', max: 10, negative: false },
                                    { label: 'Stress',        id: 'stress',        color: '#ec4899', max: 10, negative: true },
                                    { label: 'Mood',          id: 'mood',          color: '#8b5cf6', max: 10, negative: false },
                                    { label: 'Sleep (hrs)',   id: 'sleep_hours',   color: '#0ea5e9', max: 12, negative: false },
                                ].map(metric => {
                                    const avg     = teamAverages?.[metric.id] || 0;
                                    const percent = Math.min((avg / metric.max) * 100, 100);
                                    // For negative metrics (fatigue, soreness, stress) — low is good
                                    const barColor = metric.negative
                                        ? avg <= 3 ? '#22c55e' : avg <= 6 ? metric.color : '#ef4444'
                                        : metric.color;
                                    return (
                                        <div key={metric.id}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1]">{metric.label}</span>
                                                <span className="text-[11px] font-semibold text-slate-900 dark:text-[#E2E8F0] tabular-nums">
                                                    {metric.id === 'sleep_hours' ? `${avg.toFixed(1)}h` : avg.toFixed(1)}
                                                    <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] ml-1">/{metric.max}</span>
                                                </span>
                                            </div>
                                            <div className="h-2 bg-slate-50 dark:bg-[#0F1C30] rounded-full overflow-hidden border border-slate-100 dark:border-[#1A2D48]">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${percent}%`, backgroundColor: barColor }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Response Rate tile — light card matching the rest of the
                            rail. Big % accent on top, "X of Y expected" subline, dot
                            compliance row, then availability pills (clickable to expand
                            the proportional distribution bar). Was previously a dark
                            slate-900 card that clashed with the white siblings.
                            lg:order-1 pulls Response Rate ABOVE Team Averages in the rail. */}
                        {/* Compressed from p-6/text-5xl/gap-4 → p-5/text-4xl/gap-3 to
                            fit rail without scroll on a laptop viewport. */}
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm relative overflow-hidden lg:order-1">
                            <div className="absolute top-3 right-3 opacity-[0.06] pointer-events-none text-cyan-600 dark:text-cyan-400"><Activity size={56} /></div>
                            <div className="relative z-10 flex flex-col gap-3">
                                {/* Header + headline % */}
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-[#E2E8F0] flex items-center gap-2">
                                        <Activity size={14} className="text-cyan-500" /> Response Rate
                                    </h3>
                                    {compliance.expected > 0 ? (
                                        <>
                                            <div className="text-4xl font-semibold mt-2 tracking-tighter text-cyan-600 dark:text-cyan-400">
                                                {compliance.rate}%
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase mt-1">
                                                {compliance.actual} of {compliance.expected} expected
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-400 dark:text-[#94A3B8] mt-0.5">
                                                {compliance.sessionCount} day{compliance.sessionCount !== 1 ? 's' : ''} tracked · {compliance.athleteCount} athlete{compliance.athleteCount !== 1 ? 's' : ''}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-4xl font-semibold mt-2 tracking-tighter text-slate-300 dark:text-[#475569]">
                                                —
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase mt-1">
                                                No days tracked yet in this period
                                            </p>
                                        </>
                                    )}
                                </div>

                                {/* Dot compliance row — filled segments = days responded */}
                                <div className="flex gap-1.5">
                                    {compliance.expected > 0
                                        ? Array.from({ length: Math.min(compliance.expected, 12) }, (_, i) => (
                                            <div key={i} className={`flex-1 h-1.5 rounded-full ${i < compliance.actual ? 'bg-cyan-500 dark:bg-cyan-400' : 'bg-slate-100 dark:bg-[#1A2D48]'}`} />
                                        ))
                                        : (activeTeam?.players || []).slice(0, 6).map((_, i) => (
                                            <div key={i} className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-[#1A2D48]" />
                                        ))
                                    }
                                </div>

                                {/* Availability pills — moved from the banner. Click any
                                    pill (or the underlying button) to toggle the proportional
                                    distribution bar below. */}
                                {kpi.total > 0 && (
                                    <div className="border-t border-slate-100 dark:border-[#1A2D48] pt-3 -mx-5 px-5">
                                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8] mb-2">Availability today</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsKpiExpanded(v => !v)}
                                            title={isKpiExpanded ? 'Hide distribution bar' : 'Show proportional distribution bar (includes non-respondents)'}
                                            className="flex items-center gap-1.5 w-full hover:opacity-90 transition-opacity"
                                        >
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 text-[11px] leading-tight">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="font-bold text-emerald-700 dark:text-emerald-300">{kpi.available}</span>
                                                <span className="text-emerald-600 dark:text-emerald-400">avail</span>
                                            </span>
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-[11px] leading-tight">
                                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                <span className="font-bold text-amber-700 dark:text-amber-300">{kpi.modified}</span>
                                                <span className="text-amber-600 dark:text-amber-400">mod</span>
                                            </span>
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 text-[11px] leading-tight">
                                                <span className="w-2 h-2 rounded-full bg-rose-500" />
                                                <span className="font-bold text-rose-700 dark:text-rose-300">{kpi.unavailable}</span>
                                                <span className="text-rose-600 dark:text-rose-400">unav</span>
                                            </span>
                                        </button>
                                        {/* Proportional distribution bar — collapsible. Shows
                                            % widths + "No Response" segment (athletes who haven't
                                            submitted today). */}
                                        {isKpiExpanded && activeTeam && (
                                            <div className="mt-3">
                                                <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-[#0F1C30]">
                                                    <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(kpi.available / activeTeam.players.length) * 100}%` }} />
                                                    <div className="bg-amber-400 transition-all duration-700" style={{ width: `${(kpi.modified / activeTeam.players.length) * 100}%` }} />
                                                    <div className="bg-rose-500 transition-all duration-700" style={{ width: `${(kpi.unavailable / activeTeam.players.length) * 100}%` }} />
                                                    <div className="flex-1 bg-slate-200 dark:bg-[#243A58]" />
                                                </div>
                                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                    {[
                                                        { label: 'Avail',  color: 'bg-emerald-500' },
                                                        { label: 'Mod',    color: 'bg-amber-400' },
                                                        { label: 'Unav',   color: 'bg-rose-500' },
                                                        { label: 'No resp', color: 'bg-slate-200 dark:bg-[#243A58]' },
                                                    ].map(l => (
                                                        <span key={l.label} className="flex items-center gap-1 text-[9px] font-semibold uppercase text-slate-400 dark:text-[#94A3B8]">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${l.color}`} />{l.label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>{/* /Avg+Response inner stack */}

                {/* Priority Alerts — order-first to pin top of the rail. Compressed
                    from p-8/mb-6 → p-5/mb-3 and PREVIEW from 5 → 3 to fit the rail
                    without page scroll on a typical laptop. Overflow opens the modal. */}
                <div className="order-first">
                    <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-8 h-8 bg-rose-50 dark:bg-rose-700 rounded-xl flex items-center justify-center text-rose-500">
                                <AlertTriangle size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-[#E2E8F0]">Priority Alerts</h3>
                                {kpi.alerts > 0 && (
                                    <p className="text-[9px] font-bold text-rose-500 uppercase mt-0.5">{kpi.alerts} athlete{kpi.alerts > 1 ? 's' : ''} flagged</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {(() => {
                                const flagged = latestPerAthlete.filter(r => {
                                    const resp = r.responses || {};
                                    return r.injury_report
                                        || resolveAvailability(r) === 'unavailable'
                                        || resp.readiness === 'not_ready'
                                        || resp.fatigue >= 8
                                        || resp.soreness >= 8
                                        || resp.stress >= 8
                                        || (resp.sleep_hours != null && resp.sleep_hours <= 5)
                                        || resp.health_complaint === 'illness'
                                        || resp.health_complaint === 'both';
                                });
                                const PREVIEW = 3;
                                const visible = flagged.slice(0, PREVIEW);
                                const hiddenCount = flagged.length - PREVIEW;

                                const renderAlertCard = (r: any, onClick?: () => void) => {
                                    const a      = athletes.find(att => att.id === r.athlete_id);
                                    const resp   = r.responses || {};
                                    const status = getAthleteStatus(r);
                                    const reason = r.injury_report ? 'Injury Reported'
                                        : resolveAvailability(r) === 'unavailable' ? 'Unavailable'
                                        : resp.readiness === 'not_ready' ? 'Not Ready'
                                        : resp.health_complaint === 'illness' ? 'Illness Reported'
                                        : resp.health_complaint === 'both' ? 'Injury + Illness'
                                        : resp.fatigue >= 8 ? `Fatigue ${resp.fatigue}/10`
                                        : resp.soreness >= 8 ? `Soreness ${resp.soreness}/10`
                                        : resp.stress >= 8 ? `Stress ${resp.stress}/10`
                                        : resp.sleep_hours <= 5 ? `Sleep ${resp.sleep_hours}h`
                                        : 'Flagged';
                                    return (
                                        <div
                                            key={r.id}
                                            onClick={onClick || (() => openAthlete(r.athlete_id))}
                                            className="p-4 bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58] rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white dark:hover:bg-[#1A2D48] hover:shadow-md dark:hover:border-rose-700/50 transition-all group"
                                        >
                                            {status && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />}
                                            <AthleteAvatar
                                                player={a || { name: '?' }}
                                                size="sm"
                                                className="w-9 h-9 border border-slate-200 dark:border-[#243A58]"
                                                fallbackClass="bg-indigo-100 dark:bg-indigo-600 text-indigo-600 dark:text-indigo-300"
                                                fallbackTextSize="text-[10px]"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">{a?.name || 'Unknown'}</div>
                                                <div className="text-[9px] font-bold text-rose-500 uppercase">{reason}</div>
                                            </div>
                                            <ChevronRight size={13} className="text-slate-300 dark:text-[#475569] group-hover:text-rose-500 shrink-0" />
                                        </div>
                                    );
                                };

                                return (
                                    <>
                                        {visible.map(r => renderAlertCard(r))}
                                        {hiddenCount > 0 && (
                                            <button
                                                onClick={() => setAlertsModalOpen(true)}
                                                className="w-full py-2.5 rounded-xl border border-dashed border-rose-200 dark:border-rose-700/50 text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors"
                                            >
                                                + {hiddenCount} more flagged athlete{hiddenCount !== 1 ? 's' : ''}
                                            </button>
                                        )}

                                        {/* ── All Alerts Modal ── */}
                                        {alertsModalOpen && (
                                            <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setAlertsModalOpen(false)}>
                                                <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-md flex flex-col max-h-[80vh] animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1A2D48]">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 bg-rose-50 dark:bg-rose-700 rounded-xl flex items-center justify-center text-rose-500">
                                                                <AlertTriangle size={18} />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">All Priority Alerts</h3>
                                                                <p className="text-[10px] text-rose-500 font-bold uppercase mt-0.5">{flagged.length} athlete{flagged.length !== 1 ? 's' : ''} flagged today</p>
                                                            </div>
                                                        </div>
                                                        <button onClick={() => setAlertsModalOpen(false)} aria-label="Close" className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 dark:text-[#CBD5E1] transition-colors">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    {/* List */}
                                                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                                        {flagged.map(r => renderAlertCard(r, () => { openAthlete(r.athlete_id); setAlertsModalOpen(false); }))}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            {kpi.alerts === 0 && (
                                <div className="text-center py-10">
                                    <CheckCircle2 size={36} className="mx-auto text-emerald-300 mb-3" />
                                    <p className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide leading-relaxed">
                                        All clear — no flags<br />for this period.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>{/* /Priority Alerts wrapper */}
                </div>{/* /right rail */}

                {/* LEFT COLUMN — order-1 on lg+ pulls this column to the left. Contains
                    Individual Rundown (top), Wellness Flag Panel, and the Team Wellness
                    Heatmap (the FIFA block was moved up here from below). */}
                <div className="lg:order-1 flex-1 min-w-0 space-y-4">
                    {/* Individual Rundown */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm overflow-hidden">
                {/* ── Header ── */}
                <div className="p-5 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/30 dark:bg-[#0F1C30]/30 flex flex-wrap items-center gap-3">
                    <button onClick={() => setIsRundownOpen(v => !v)} className="flex items-center gap-2 hover:text-indigo-600 dark:text-indigo-300 transition-colors mr-auto">
                        <div className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isRundownOpen ? '' : '-rotate-90'}`}><ChevronDown size={16} /></div>
                        <h3 className="text-sm font-semibold uppercase text-slate-900 dark:text-[#E2E8F0] tracking-wide">Individual Rundown</h3>
                        <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-medium ml-1">({new Set(dailyResponses.filter(r => r.session_date === TODAY).map(r => r.athlete_id)).size} today)</span>
                    </button>
                    {/* Date scope — range buttons + as-of date input. Same UX as
                        WellnessFlagPanel. Applies to both Daily and Deep Check tabs. */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {RUNDOWN_RANGE_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setRundownRangeDays(opt.id)}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                                    rundownRangeDays === opt.id
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243A58]'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1] ml-1">As of</span>
                        <DatePicker value={rundownAsOfDate} onChange={e => setRundownAsOfDate(e.target.value || TODAY)} max={TODAY} />
                    </div>
                    {rundownTab === 'daily' && (
                        <button onClick={() => setShowDailyTracker(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all border ${showDailyTracker ? 'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-400' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:border-slate-400'}`}>
                            <Calendar size={12} />
                            {showDailyTracker ? 'Hide' : 'Daily'} Tracker
                        </button>
                    )}
                    {/* Select Mode toggle — reveals/hides checkboxes + bulk-delete
                        UI. Hidden by default = no accidental clicks. Replaces the
                        always-visible per-row delete buttons + permanent checkboxes. */}
                    <button
                        onClick={() => {
                            const next = !isSelectMode;
                            setIsSelectMode(next);
                            if (!next) {
                                // Leaving select mode — clear any selection so we
                                // don't carry stale state into the next session.
                                setSelectedResponseIds(new Set());
                                setShowBulkConfirm(false);
                            }
                        }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all border ${
                            isSelectMode
                                ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-400'
                                : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:border-slate-400'
                        }`}
                        title={isSelectMode ? 'Exit select mode' : 'Enter select mode to bulk-delete responses'}
                    >
                        <Trash2 size={12} />
                        {isSelectMode ? 'Done' : 'Select'}
                    </button>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#CBD5E1]" />
                        <input type="text" placeholder="Find athlete..."
                            className="pl-9 pr-4 py-2 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-full text-[10px] font-bold outline-none focus:ring-2 focus:ring-cyan-500/10 w-36"
                            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {isRundownOpen && (<>
                {/* ── Tab switcher ── */}
                <div className="flex border-b border-slate-100 dark:border-[#1A2D48]">
                    {([['daily', 'Daily Responses', rundownDailyFiltered.length], ['deepcheck', 'Deep Checks', rundownDeepChecks.length + triggeredIncomplete.length + triggeredNoChange.length]] as const).map(([tab, label, count]) => (
                        <button key={tab} onClick={() => setRundownTab(tab)}
                            className={`flex items-center gap-2 px-6 py-3 text-[10px] font-bold uppercase tracking-wide transition-all border-b-2 ${
                                rundownTab === tab
                                    ? 'border-indigo-500 text-indigo-600 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-900/20'
                                    : 'border-transparent text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:border-slate-200 dark:hover:border-[#243A58]'
                            }`}>
                            {label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${rundownTab === tab ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-600 dark:text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1]'}`}>{count}</span>
                        </button>
                    ))}
                </div>

                {/* ── DAILY RESPONSES TAB ── */}
                {rundownTab === 'daily' && (<>
                {/* Collapsible Daily Response Tracker */}
                {showDailyTracker && (
                    <div className="border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/40 dark:bg-[#0F1C30]/40 animate-in slide-in-from-top-2 duration-300">
                        <div className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-cyan-50 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center text-cyan-600 dark:text-cyan-400"><Calendar size={14} /></div>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Who responded on</span>
                                <DatePicker value={responseViewDate} onChange={e => setResponseViewDate(e.target.value)} max={TODAY} />
                            </div>
                            {(() => {
                                const respondedSet = new Set(rundownDailyFiltered.filter(r => r.session_date === responseViewDate).map(r => r.athlete_id));
                                const totalAthletes = activeTeam?.players?.length || 0;
                                return (
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${respondedSet.size === totalAthletes && totalAthletes > 0 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-600' : respondedSet.size === 0 ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1]' : 'bg-amber-100 text-amber-600'}`}>
                                        {respondedSet.size} of {totalAthletes} responded
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="px-6 pb-4">
                            {(() => {
                                const respondedIds = new Set(rundownDailyFiltered.filter(r => r.session_date === responseViewDate).map(r => r.athlete_id));
                                const allAthletes = activeTeam?.players || [];
                                return (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {allAthletes.filter(a => respondedIds.has(a.id)).map(a => (
                                            <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/40 rounded-lg">
                                                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 truncate">{a.name}</span>
                                            </div>
                                        ))}
                                        {allAthletes.filter(a => !respondedIds.has(a.id)).map(a => (
                                            <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#132338] border border-slate-100 dark:border-[#1A2D48] rounded-lg">
                                                <Clock size={12} className="text-slate-300 dark:text-[#475569] shrink-0" />
                                                <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] truncate">{a.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto relative">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-[#0F1C30] text-[9px] text-slate-400 dark:text-[#CBD5E1] uppercase tracking-[0.15em] font-semibold">
                            <tr>
                                <th className="pl-4 pr-1 py-4 w-9">
                                    {/* select-all rendered inline once visible is computed below */}
                                </th>
                                <th className="px-4 py-4 w-8" />
                                <th className="px-6 py-4">Athlete</th>
                                <th className="px-4 py-4">Availability</th>
                                <th className="px-4 py-4">Sleep</th>
                                <th className="px-4 py-4">Fatigue</th>
                                <th className="px-4 py-4">Soreness</th>
                                <th className="px-4 py-4">Health</th>
                                <th className="px-6 py-4 text-right">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const playerMap = Object.fromEntries((activeTeam?.players || []).map(p => [p.id, p]));

                                const sorted = [...rundownDailyFiltered]
                                    .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || '') || (b.submitted_at || '').localeCompare(a.submitted_at || ''));

                                const visible = sorted.filter(res => {
                                    if (!searchQuery) return true;
                                    return playerMap[res.athlete_id]?.name.toLowerCase().includes(searchQuery.toLowerCase());
                                });

                                const allVisibleIds = visible.map(r => r.id);
                                const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selectedResponseIds.has(id));
                                const someSelected = allVisibleIds.some(id => selectedResponseIds.has(id));

                                if (visible.length === 0) return (
                                    <tr><td colSpan={9} className="px-6 py-12 text-center text-slate-300 dark:text-[#475569] text-xs">
                                        No responses in this date range
                                    </td></tr>
                                );

                                const groups: { date: string; items: typeof visible }[] = [];
                                visible.forEach(res => {
                                    const last = groups[groups.length - 1];
                                    if (last && last.date === res.session_date) last.items.push(res);
                                    else groups.push({ date: res.session_date, items: [res] });
                                });

                                const fmtDate = (dateStr: string) => {
                                    const [y, m, d] = dateStr.split('-').map(Number);
                                    const dt = new Date(y, m - 1, d);
                                    const todayStr = localDateStr(new Date());
                                    const yest = new Date(); yest.setDate(yest.getDate() - 1);
                                    const label = `${dt.toLocaleDateString('en-GB', { weekday: 'long' })}  ${dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                                    const badge = dateStr === todayStr ? 'Today' : dateStr === localDateStr(yest) ? 'Yesterday' : null;
                                    return { label, badge };
                                };

                                // Prepend a real select-all header row (rendered before date groups).
                                // Only rendered when Select Mode is active — otherwise the rundown
                                // reads as a clean review table with no selection controls.
                                const headerSelectRow = isSelectMode ? (
                                    <tr key="__header_select__" className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-100 dark:border-[#1A2D48]">
                                        <td className="pl-4 pr-1 py-3">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                                onChange={e => {
                                                    if (e.target.checked) setSelectedResponseIds(new Set(allVisibleIds));
                                                    else setSelectedResponseIds(new Set());
                                                }}
                                                className="rounded border-slate-300 dark:border-[#243A58] accent-indigo-500 cursor-pointer w-3.5 h-3.5"
                                            />
                                        </td>
                                        <td colSpan={8} className="pr-4 py-3">
                                            <span className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1]">
                                                {allSelected ? `All ${allVisibleIds.length} selected` : someSelected ? `${selectedResponseIds.size} selected` : 'Select all'}
                                            </span>
                                        </td>
                                    </tr>
                                ) : null;

                                return [headerSelectRow, ...groups.flatMap(({ date, items }) => {
                                    const { label, badge } = fmtDate(date);
                                    const dateIds = items.map(r => r.id);
                                    const allDateSelected = dateIds.every(id => selectedResponseIds.has(id));
                                    const rows: React.ReactNode[] = [
                                        <tr key={`date-${date}`} className="border-t-2 border-slate-100 dark:border-[#1A2D48] bg-slate-50/60 dark:bg-[#132338]/40">
                                            {/* First column is ALWAYS rendered to keep td count == th count
                                                (9). The checkbox only appears inside when Select Mode is on. */}
                                            <td className="pl-4 pr-1 py-2 w-9">
                                                {isSelectMode && (
                                                    <input
                                                        type="checkbox"
                                                        checked={allDateSelected}
                                                        onChange={e => {
                                                            setSelectedResponseIds(prev => {
                                                                const next = new Set(prev);
                                                                if (e.target.checked) dateIds.forEach(id => next.add(id));
                                                                else dateIds.forEach(id => next.delete(id));
                                                                return next;
                                                            });
                                                        }}
                                                        className="rounded border-slate-300 dark:border-[#243A58] accent-indigo-500 cursor-pointer w-3.5 h-3.5"
                                                    />
                                                )}
                                            </td>
                                            <td colSpan={8} className="px-2 py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-[#CBD5E1]">{label}</span>
                                                    {badge && <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/50">{badge}</span>}
                                                    <span className="ml-auto text-[8px] font-semibold text-slate-300 dark:text-[#475569] uppercase tracking-wide">{items.length} response{items.length !== 1 ? 's' : ''}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ];

                                    items.forEach(res => {
                                        const player = playerMap[res.athlete_id];
                                        const status = getAthleteStatus(res);
                                        const injuryCount = res?.injury_report?.areas?.length || 0;
                                        const resp = res?.responses || {};
                                        const sleepH = resp.sleep_hours;
                                        const soreness = resp.soreness;
                                        const isChecked = selectedResponseIds.has(res.id);
                                        rows.push(
                                            <tr key={res.id} className={`group transition-colors border-t border-slate-50 dark:border-[#1A2D48] ${isChecked ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/60 dark:bg-[#132338]/40'}`}>
                                                {/* First cell ALWAYS rendered so body td-count matches thead
                                                    (9). Without this, when isSelectMode is off, every cell
                                                    shifts left under the wrong header (e.g. 7h under "Availability"). */}
                                                <td className="pl-4 pr-1 py-4 w-9">
                                                    {isSelectMode && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                setSelectedResponseIds(prev => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(res.id)) next.delete(res.id);
                                                                    else next.add(res.id);
                                                                    return next;
                                                                });
                                                            }}
                                                            className="rounded border-slate-300 dark:border-[#243A58] accent-indigo-500 cursor-pointer w-3.5 h-3.5"
                                                        />
                                                    )}
                                                </td>
                                                <td className="pl-5 pr-1 py-4 w-8">
                                                    {status ? <span className={`w-3 h-3 rounded-full block ${STATUS_DOT[status]} shadow-sm`} /> : <span className="w-3 h-3 rounded-full block bg-slate-200 dark:bg-[#243A58]" />}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {player ? (
                                                        <div className="flex items-center gap-3">
                                                            <AthleteAvatar
                                                                player={player}
                                                                size="sm"
                                                                className="w-9 h-9 border-2 border-white dark:border-[#132338] shadow-sm ring-1 ring-slate-100 dark:ring-[#243A58]"
                                                                fallbackClass="bg-indigo-100 dark:bg-indigo-600 text-indigo-600 dark:text-indigo-300"
                                                                fallbackTextSize="text-[10px]"
                                                            />
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">{player.name}</div>
                                                                <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-tighter">{player.subsection}</div>
                                                            </div>
                                                        </div>
                                                    ) : <span className="text-slate-400 dark:text-[#CBD5E1] text-xs">Unknown athlete</span>}
                                                </td>
                                                <td className="px-4 py-4 font-semibold uppercase text-[9px]">
                                                    {(() => {
                                                        const avail = resolveAvailability(res);
                                                        if (avail === 'available')   return <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">Full</span>;
                                                        if (avail === 'modified')    return <span className="text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-2.5 py-1 rounded-full">Modified</span>;
                                                        if (avail === 'unavailable') return <span className="text-rose-600 bg-rose-50 dark:bg-rose-700 border border-rose-100 dark:border-rose-900/40 px-2.5 py-1 rounded-full">Out</span>;
                                                        return <span className="text-slate-300 dark:text-[#475569]">—</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {sleepH != null
                                                        ? <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${sleepH >= 7 ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40' : sleepH >= 6 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' : 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40'}`}>{sleepH}h</span>
                                                        : <span className="text-slate-300 dark:text-[#475569] text-[10px] font-bold">—</span>}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {(() => {
                                                        const f = resp.fatigue || res?.rpe;
                                                        if (!f) return <span className="text-slate-300 dark:text-[#475569] text-[10px] font-bold">—</span>;
                                                        return <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getRpeBadge(f)}`}>{f}/10</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {soreness != null
                                                        ? <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${soreness >= 7 ? 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' : soreness >= 4 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' : 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40'}`}>{soreness}/10</span>
                                                        : <span className="text-slate-300 dark:text-[#475569] text-[10px] font-bold">—</span>}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {(() => {
                                                        const complaint = resp.health_complaint;
                                                        const hasInjury = injuryCount > 0 || complaint === 'injury' || complaint === 'both';
                                                        const hasIllness = complaint === 'illness' || complaint === 'both';
                                                        if (!hasInjury && !hasIllness) return (
                                                            <div className="flex items-center gap-1.5 text-emerald-500">
                                                                <CheckCircle2 size={13} /><span className="text-[10px] font-semibold uppercase">Clear</span>
                                                            </div>
                                                        );
                                                        return (
                                                            <div className="flex flex-col gap-1">
                                                                {hasInjury && <div className="flex items-center gap-1 text-rose-500"><AlertTriangle size={12} /><span className="text-[10px] font-semibold">Injury{injuryCount > 0 ? ` (${injuryCount})` : ''}</span></div>}
                                                                {hasIllness && <div className="flex items-center gap-1 text-sky-500"><Thermometer size={12} /><span className="text-[10px] font-semibold">Illness</span></div>}
                                                            </div>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Per-row delete button removed — bulk delete via Select Mode
                                                            replaces it to avoid accidental single-click deletions. */}
                                                        <button onClick={() => player?.id && openAthlete(player.id)} className="p-2 bg-white dark:bg-[#132338] border border-slate-100 dark:border-[#1A2D48] rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-cyan-600 hover:border-cyan-100 hover:shadow-sm transition-all">
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });
                                    return rows;
                                })];
                            })()}
                        </tbody>
                    </table>
                </div>
                </>)}

                {/* ── DEEP CHECKS TAB ── */}
                {rundownTab === 'deepcheck' && (
                    <div className="overflow-x-auto">
                        {/* Triggered but incomplete */}
                        {triggeredIncomplete.length > 0 && (() => {
                            const playerMap = Object.fromEntries((activeTeam?.players || []).map(p => [p.id, p]));
                            return (
                                <div className="border-b border-slate-100 dark:border-[#1A2D48]">
                                    <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                            Triggered — No Response ({triggeredIncomplete.length})
                                        </span>
                                        <span className="text-[9px] text-amber-500 ml-1">Athletes who flagged but did not complete the deep check form within 3 days</span>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-amber-50/50 text-[9px] text-slate-400 dark:text-[#CBD5E1] uppercase tracking-[0.15em] font-semibold border-b border-amber-100 dark:border-amber-800/40">
                                            <tr>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Athlete</th>
                                                <th className="px-4 py-3">Flag Reason</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {triggeredIncomplete
                                                .filter(r => !searchQuery || playerMap[r.athlete_id]?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map(r => {
                                                    const player = playerMap[r.athlete_id];
                                                    const rr = r.responses || {};
                                                    const reasons: string[] = [];
                                                    if (rr.health_complaint && rr.health_complaint !== 'no') reasons.push(rr.health_complaint === 'injury' ? 'Injury' : rr.health_complaint === 'illness' ? 'Illness' : 'Health complaint');
                                                    if (rr.fatigue != null && rr.fatigue >= 8) reasons.push(`Fatigue ${rr.fatigue}/10`);
                                                    if (rr.sleep_hours != null && rr.sleep_hours <= 5) reasons.push(`Sleep ${rr.sleep_hours}h`);
                                                    if (r.availability === 'unavailable') reasons.push('Unavailable');
                                                    const [fy, fm, fd] = (r.session_date || '').split('-').map(Number);
                                                    const dt = new Date(fy, fm - 1, fd);
                                                    const dateLabel = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                                                    return (
                                                        <tr key={r.id} className="border-t border-amber-50 hover:bg-amber-50/30 dark:hover:bg-amber-500/15 transition-colors">
                                                            <td className="px-6 py-3.5">
                                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">{dateLabel}</span>
                                                            </td>
                                                            <td className="px-6 py-3.5">
                                                                {player ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <AthleteAvatar
                                                                            player={player}
                                                                            size="xs"
                                                                            className="w-7 h-7"
                                                                            fallbackClass="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                                                            fallbackTextSize="text-[9px]"
                                                                        />
                                                                        <span className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">{player.name}</span>
                                                                    </div>
                                                                ) : <span className="text-slate-400 dark:text-[#CBD5E1] text-xs">Unknown</span>}
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {reasons.map(reason => (
                                                                        <span key={reason} className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 dark:border-amber-800/50 rounded text-[9px] font-semibold">{reason}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase bg-rose-50 dark:bg-rose-700 text-rose-600 dark:text-white border-rose-100 dark:border-rose-900/40">
                                                                    Incomplete
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}

                        {/* ── Same Issue — No Change section ── */}
                        {triggeredNoChange.length > 0 && (() => {
                            const playerMap = Object.fromEntries((activeTeam?.players || []).map(p => [p.id, p]));
                            return (
                                <div className="border-b border-slate-100 dark:border-[#1A2D48]">
                                    <div className="px-6 py-3 bg-slate-50 dark:bg-[#0F1C30] flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />
                                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">
                                            Same Issue — No Change ({triggeredNoChange.length})
                                        </span>
                                        <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] ml-1">Athletes who flagged and confirmed no new developments since their last report</span>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 dark:bg-[#132338]/40 text-[9px] text-slate-400 dark:text-[#CBD5E1] uppercase tracking-[0.15em] font-semibold border-b border-slate-100 dark:border-[#1A2D48]">
                                            <tr>
                                                <th className="px-6 py-3">Date</th>
                                                <th className="px-6 py-3">Athlete</th>
                                                <th className="px-4 py-3">Flag Reason</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {triggeredNoChange
                                                .filter(r => !searchQuery || playerMap[r.athlete_id]?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                                                .map(r => {
                                                    const player = playerMap[r.athlete_id];
                                                    const rr = r.responses || {};
                                                    const reasons: string[] = [];
                                                    if (rr.health_complaint && rr.health_complaint !== 'no') reasons.push(rr.health_complaint === 'injury' ? 'Injury' : rr.health_complaint === 'illness' ? 'Illness' : 'Health Complaint');
                                                    if (rr.fatigue != null && rr.fatigue >= 8) reasons.push(`Fatigue ${rr.fatigue}/10`);
                                                    if (rr.sleep_hours != null && rr.sleep_hours <= 5) reasons.push(`Sleep ${rr.sleep_hours}h`);
                                                    if (r.availability === 'unavailable') reasons.push('Unavailable');
                                                    const [fy, fm, fd] = (r.session_date || '').split('-').map(Number);
                                                    const dt = new Date(fy, fm - 1, fd);
                                                    const dateLabel = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                                                    return (
                                                        <tr key={r.id} className="border-t border-slate-50 dark:border-[#1A2D48] hover:bg-slate-50/40 dark:hover:bg-[#1A2D48]/60 dark:bg-[#0F1C30]/40 transition-colors">
                                                            <td className="px-6 py-3.5">
                                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">{dateLabel}</span>
                                                            </td>
                                                            <td className="px-6 py-3.5">
                                                                {player ? (
                                                                    <div className="flex items-center gap-3">
                                                                        <AthleteAvatar
                                                                            player={player}
                                                                            size="xs"
                                                                            className="w-7 h-7"
                                                                            fallbackClass="bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]"
                                                                            fallbackTextSize="text-[9px]"
                                                                        />
                                                                        <span className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">{player.name}</span>
                                                                    </div>
                                                                ) : <span className="text-slate-400 dark:text-[#CBD5E1] text-xs">Unknown</span>}
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {reasons.map(reason => (
                                                                        <span key={reason} className="px-2 py-0.5 bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] rounded text-[9px] font-semibold">{reason}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3.5">
                                                                <span className="px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]">
                                                                    No Change
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}

                        {rundownDeepChecks.length === 0 && triggeredIncomplete.length === 0 && triggeredNoChange.length === 0 ? (
                            <div className="px-6 py-16 text-center">
                                <Thermometer size={36} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-sm font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">No deep checks in this period</p>
                                <p className="text-[10px] text-slate-300 dark:text-[#475569] mt-2">Adjust the date range or share the Deep Health Check form with your athletes.</p>
                            </div>
                        ) : rundownDeepChecks.length === 0 ? null : (
                            <>
                            {/* ── Completed Deep Checks heading ── */}
                            <div className="px-6 py-3 bg-emerald-50 dark:bg-emerald-900/25 border-b border-emerald-100 dark:border-emerald-800/40 flex items-center gap-2">
                                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                    Completed Deep Checks ({rundownDeepChecks.length})
                                </span>
                                <span className="text-[9px] text-emerald-500 ml-1">Athletes who completed the full deep health check form</span>
                            </div>
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-[#0F1C30] text-[9px] text-slate-400 dark:text-[#CBD5E1] uppercase tracking-[0.15em] font-semibold">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Athlete</th>
                                        <th className="px-4 py-4">Trigger</th>
                                        <th className="px-4 py-4">Path</th>
                                        <th className="px-4 py-4">Severity / Symptoms</th>
                                        <th className="px-4 py-4">Impact</th>
                                        <th className="px-4 py-4">Time Loss</th>
                                        <th className="px-6 py-4 text-right">Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const playerMap = Object.fromEntries((activeTeam?.players || []).map(p => [p.id, p]));
                                        const URTI_SHORT: Record<string,string> = { urti_hoarseness:'Hoarseness', urti_blocked_nose:'Blocked Nose', urti_runny_nose:'Runny Nose', urti_sinus_pressure:'Sinus', urti_sneezing:'Sneezing', urti_dry_cough:'Dry Cough', urti_wet_cough:'Wet Cough', urti_headache:'Headache' };
                                        const SEV_LABELS = ['None','Mild','Moderate','Severe'];

                                        const visible = rundownDeepChecks.filter(dc => {
                                            if (!searchQuery) return true;
                                            return playerMap[dc.athlete_id]?.name.toLowerCase().includes(searchQuery.toLowerCase());
                                        });

                                        if (visible.length === 0) return (
                                            <tr><td colSpan={8} className="px-6 py-8 text-center text-slate-300 dark:text-[#475569] text-xs">No matching athletes</td></tr>
                                        );

                                        return visible.map(dc => {
                                            const player = playerMap[dc.athlete_id];
                                            const resp = dc.responses || {};

                                            // Infer path and trigger from matching daily response
                                            const daily = dailyResponses.find(d => d.athlete_id === dc.athlete_id && d.session_date === dc.session_date);
                                            const complaint = daily?.responses?.health_complaint;
                                            const wasTriggered = daily?.health_problem_flag === true;
                                            const path = complaint === 'injury' ? 'Injury' : complaint === 'illness' ? 'Illness' : complaint === 'both' ? 'Both' : 'Health Trends';

                                            // Active URTI symptoms
                                            const activeSymptoms = Object.entries(URTI_SHORT)
                                                .filter(([k]) => (resp[k] || 0) > 0)
                                                .map(([k, label]) => `${label} (${SEV_LABELS[resp[k]] || resp[k]})`);

                                            // Severity from daily illness_severity
                                            const illnessSev = daily?.responses?.illness_severity;

                                            // Date formatting
                                            const [y, m, d] = (dc.session_date || '').split('-').map(Number);
                                            const dt = new Date(y, m - 1, d);
                                            const dateLabel = dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

                                            const PATH_STYLES: Record<string,string> = { Injury:'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40', Illness:'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/40', Both:'bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white border-indigo-100 dark:border-indigo-800/40', 'Health Trends':'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]' };

                                            return (
                                                <tr key={dc.id} className="group hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/60 dark:bg-[#132338]/40 transition-colors border-t border-slate-50 dark:border-[#1A2D48]">
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">{dateLabel}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {player ? (
                                                            <div className="flex items-center gap-3">
                                                                <AthleteAvatar
                                                                    player={player}
                                                                    size="sm"
                                                                    className="border border-white dark:border-[#132338] shadow-sm ring-1 ring-slate-100 dark:ring-[#243A58]"
                                                                    fallbackClass="bg-indigo-100 dark:bg-indigo-600 text-indigo-600 dark:text-indigo-300"
                                                                    fallbackTextSize="text-[9px]"
                                                                />
                                                                <span className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">{player.name}</span>
                                                            </div>
                                                        ) : <span className="text-slate-400 dark:text-[#CBD5E1] text-xs">Unknown</span>}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold uppercase ${wasTriggered ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]'}`}>
                                                            {wasTriggered ? 'Daily Flag' : 'Coach Sent'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-bold ${PATH_STYLES[path] || 'bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]'}`}>{path}</span>
                                                    </td>
                                                    <td className="px-4 py-4 max-w-[200px]">
                                                        {activeSymptoms.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {activeSymptoms.slice(0, 3).map(s => (
                                                                    <span key={s} className="px-1.5 py-0.5 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40 rounded text-[8px] font-semibold">{s}</span>
                                                                ))}
                                                                {activeSymptoms.length > 3 && <span className="text-[8px] text-slate-400 dark:text-[#CBD5E1] font-semibold">+{activeSymptoms.length - 3} more</span>}
                                                            </div>
                                                        ) : illnessSev ? (
                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border capitalize ${illnessSev === 'severe' ? 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' : illnessSev === 'moderate' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/40'}`}>{illnessSev}</span>
                                                        ) : complaint === 'injury' || complaint === 'both' ? (
                                                            <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] italic">See detail →</span>
                                                        ) : <span className="text-slate-300 dark:text-[#475569] text-[10px]">—</span>}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {(() => {
                                                            const impact = resp.illness_impact || resp.impact;
                                                            if (!impact || impact === 'none') return <span className="text-slate-300 dark:text-[#475569] text-[10px]">—</span>;
                                                            return <span className="text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1] capitalize">{String(impact).replace(/_/g,' ')}</span>;
                                                        })()}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {(() => {
                                                            const tl = resp.illness_time_loss || resp.time_loss;
                                                            if (!tl || tl === '0') return <span className="text-slate-300 dark:text-[#475569] text-[10px]">—</span>;
                                                            return <span className="text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1]">{tl}</span>;
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => player?.id && openAthlete(player.id)} className="p-2 bg-white dark:bg-[#132338] border border-slate-100 dark:border-[#1A2D48] rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-cyan-600 hover:border-cyan-100 hover:shadow-sm transition-all">
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                            </>
                        )}
                    </div>
                )}
                </>)}
            </div>{/* /Individual Rundown card */}

            {/* Wellness Flag Panel — uses its own internal expanded state. Option A
                layout passes defaultExpanded={false} so it renders header-only
                ("Wellness Flags · N pending") until the coach opens it.
                onAthleteClick navigates into the athlete drill-in with Flag History
                auto-opened (#6 from the layout scope). */}
            {selectedTeamId && activeTeam && (
                <WellnessFlagPanel
                    teamId={selectedTeamId}
                    athletes={(activeTeam.players || []).map(p => ({ id: p.id, name: p.name }))}
                    defaultExpanded={false}
                    onAthleteClick={(athleteId) => openAthlete(athleteId, 'flags')}
                />
            )}

            {/* Team Wellness Heatmap — collapsible (Option A). Default closed; coach
                expands via the chevron header for the visual scan. Period nav +
                day-width toggle + colour legend only render when expanded. See
                plans/WELLNESS-HUB-QUESTIONNAIRE-LAYOUT.md. */}
            {selectedTeamId && activeTeam && (
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm overflow-hidden">
                    {/* Title row — left side is the collapse trigger; right side shows
                        nav controls only when expanded. */}
                    <div className={`px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap ${isHeatmapOpen ? 'border-b border-slate-100 dark:border-[#1A2D48]' : ''}`}>
                        <button
                            type="button"
                            onClick={() => setIsHeatmapOpen(v => !v)}
                            className="flex items-center gap-2 mr-auto text-left hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                            title={isHeatmapOpen ? 'Collapse heatmap' : 'Expand heatmap'}
                        >
                            <div className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isHeatmapOpen ? '' : '-rotate-90'}`}>
                                <ChevronDown size={14} />
                            </div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Team Wellness Heatmap</h4>
                            {/* Collapsed-state summary: "7d ending 29 May" */}
                            {!isHeatmapOpen && (
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8]">
                                    · {heatmapDays}d ending {new Date(heatmapAnchor + 'T12:00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                                </span>
                            )}
                        </button>
                        {/* Period navigation — only when expanded */}
                        {isHeatmapOpen && (<>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    const d = new Date(heatmapAnchor + 'T12:00:00');
                                    d.setDate(d.getDate() - heatmapDays);
                                    setHeatmapAnchor(d.toISOString().split('T')[0]);
                                }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:text-slate-800 dark:hover:text-[#E2E8F0] transition-colors"
                                title="Previous period"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-[#E2E8F0] min-w-[140px] text-center">
                                {(() => {
                                    const end = new Date(heatmapAnchor + 'T12:00:00');
                                    const start = new Date(end);
                                    start.setDate(end.getDate() - heatmapDays + 1);
                                    const fmt = (d: Date) => d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
                                    return `${fmt(start)} – ${fmt(end)}`;
                                })()}
                            </span>
                            <button
                                onClick={() => {
                                    const d = new Date(heatmapAnchor + 'T12:00:00');
                                    d.setDate(d.getDate() + heatmapDays);
                                    const today = localDateStr();
                                    const next = d.toISOString().split('T')[0];
                                    setHeatmapAnchor(next > today ? today : next);
                                }}
                                disabled={heatmapAnchor >= localDateStr()}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:text-slate-800 dark:hover:text-[#E2E8F0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Next period"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                onClick={() => setHeatmapAnchor(localDateStr())}
                                disabled={heatmapAnchor >= localDateStr()}
                                className="text-[9px] font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Today
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex gap-0.5" title="Low → High wellness">
                                {['bg-rose-500', 'bg-rose-400', 'bg-amber-500', 'bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-emerald-500'].map((c, i) => (
                                    <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
                                ))}
                            </div>
                            <div className="w-px h-4 bg-slate-200 dark:bg-[#243A58]" />
                            {([7, 14, 30] as const).map(d => (
                                <button
                                    key={d}
                                    onClick={() => setHeatmapDays(d)}
                                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                                        heatmapDays === d
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#1A2D48]/60'
                                    }`}
                                >
                                    {d}d
                                </button>
                            ))}
                        </div>
                        </>)}{/* /isHeatmapOpen nav controls */}
                    </div>{/* /title row */}
                    {isHeatmapOpen && (
                        <WellnessHeatmap
                            athletes={(activeTeam.players || []).map(p => ({ id: p.id, name: p.name }))}
                            responses={wellnessResponses}
                            days={heatmapDays}
                            anchorDate={heatmapAnchor}
                        />
                    )}
                </div>
            )}
                </div>{/* /LEFT column */}
            </div>{/* /2-col overview body */}
            </>)}
            {dashboardTab === 'insights' && (
                <WellnessInsightsTab
                    activeTeam={activeTeam}
                    athletes={athletes}
                    dailyResponses={dailyResponses}
                    weeklyResponses={weeklyResponses}
                    insightMetric={insightMetric}
                    setInsightMetric={setInsightMetric}
                    insightView={insightView}
                    setInsightView={setInsightView}
                    insightDate={insightDate}
                    setInsightDate={setInsightDate}
                    insightPeriodMode={insightPeriodMode}
                    setInsightPeriodMode={setInsightPeriodMode}
                    insightCompareMetric={insightCompareMetric}
                    setInsightCompareMetric={setInsightCompareMetric}
                    wellnessDateRange={wellnessDateRange}
                    chartGridColor={chartGridColor}
                    chartLabelColor={chartLabelColor}
                    chartTextColor={chartTextColor}
                    chartAxisColor={chartAxisColor}
                    openAthlete={openAthlete}
                />
            )}

        </div>
    );
};

export default WellnessDashboard;
