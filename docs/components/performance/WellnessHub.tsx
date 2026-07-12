import React, { useState, useMemo, useEffect } from 'react';
import {
    ChevronRight, ArrowLeft, Activity, X, Trash2, ChevronDown, Shield as ShieldIcon,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import QuestionnaireManager from './QuestionnaireManager';
// Shared helpers/types extracted in restructure step 1 (2026-07-12) — see
// wellnesshub/shared.ts. Pure functions, no behaviour change.
import {
    localDateStr, TODAY, formatDate, formatDateHeader, resolveAvailability,
    getAthleteStatus, getRpeBadge, STATUS_DOT, type VizBlock,
} from './wellnesshub/shared';
import WellnessSharePanel from './wellnesshub/WellnessSharePanel';
import WellnessInsightsTab from './wellnesshub/WellnessInsightsTab';
import WellnessAthleteView from './wellnesshub/WellnessAthleteView';
import WellnessDashboard from './wellnesshub/WellnessDashboard';
import WellnessTeamSelection from './wellnesshub/WellnessTeamSelection';

// ─── Component ────────────────────────────────────────────────────────────────

const WellnessHub: React.FC<{ initialTeamId?: string; onBackToSections?: () => void }> = ({ initialTeamId, onBackToSections }) => {
    const {
        teams,
        athletes,
        wellnessTemplates,
        setWellnessTemplates,
        wellnessResponses,
        handleLoadWellnessResponses,
        wellnessDateRange,
        setWellnessDateRange,
        isDarkMode,
        showToast,
    } = useAppState();

    // Chart palette — matches ACWRLineChart for visual consistency
    const chartGridColor  = isDarkMode ? '#1A2D48' : '#f1f5f9';
    const chartAxisColor  = isDarkMode ? '#243A58' : '#e2e8f0';
    const chartLabelColor = isDarkMode ? '#64748B' : '#94a3b8';
    const chartTextColor  = isDarkMode ? '#E2E8F0' : '#1e293b';

    const [viewMode, setViewMode] = useState<'selection' | 'dashboard' | 'athlete' | 'templates' | 'share'>('selection');
    const [previewTemplate, setPreviewTemplate] = useState<'daily' | 'weekly' | null>(null);
    const [expandedPreviewQ, setExpandedPreviewQ] = useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId]     = useState<string | null>(initialTeamId || null);

    React.useEffect(() => {
        if (initialTeamId) {
            setSelectedTeamId(initialTeamId);
            setViewMode('dashboard');
        }
    }, [initialTeamId]);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
    const [dashboardTab, setDashboardTab]           = useState<'overview' | 'insights'>('overview');

    // ── Visualization blocks (Insights tab) ─────────────────────────────────
    const [vizBlocks, setVizBlocks] = useState<VizBlock[]>([]);
    const addVizBlock    = () => setVizBlocks(prev => [...prev, { id: Date.now().toString() }]);
    const removeVizBlock = (id: string) => setVizBlocks(prev => prev.filter(b => b.id !== id));
    const updateVizBlock = (id: string, patch: Partial<VizBlock>) =>
        setVizBlocks(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [searchQuery, setSearchQuery]           = useState('');
    const [copied, setCopied]                     = useState(false);
    const [sharingInProgress, setSharingInProgress] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null);
    const [isKpiExpanded, setIsKpiExpanded]       = useState(true);
    const [shareSessions, setShareSessions] = useState<{ id: string; template_id: string; shared_at: string }[]>([]);
    const [responseViewDate, setResponseViewDate] = useState(TODAY);
    const [showDailyTracker, setShowDailyTracker] = useState(false);
    const [isRundownOpen, setIsRundownOpen] = useState(true);
    // Option A layout: Heatmap collapsed by default; coach expands when they want
    // the visual scan. Flag Panel keeps its own internal expanded state (defaults
    // to collapsed via prop below). See plans/WELLNESS-HUB-QUESTIONNAIRE-LAYOUT.md.
    const [isHeatmapOpen, setIsHeatmapOpen] = useState(false);
    const [showAllAlerts, setShowAllAlerts] = useState(false);
    const [alertsModalOpen, setAlertsModalOpen] = useState(false);
    const [rundownTab, setRundownTab] = useState<'daily' | 'deepcheck'>('daily');
    // Rundown date scope — same UX as Wellness Flags panel. Range buttons
    // (Today/3d/7d/14d/30d) + an as-of date picker. Default = today only.
    // Shared by both Daily Responses and Deep Checks sub-tabs.
    const [rundownAsOfDate, setRundownAsOfDate] = useState<string>(() => localDateStr());
    const [rundownRangeDays, setRundownRangeDays] = useState<number>(1);
    // Derived window — inclusive [from, to].
    const rundownWindow = useMemo(() => {
        const [y, m, d] = rundownAsOfDate.split('-').map(Number);
        const end = new Date(y, m - 1, d);
        const start = new Date(y, m - 1, d - rundownRangeDays + 1);
        const fmt = (dt: Date) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        return { from: fmt(start), to: fmt(end) };
    }, [rundownAsOfDate, rundownRangeDays]);
    const rundownFrom = rundownWindow.from;
    const rundownTo   = rundownWindow.to;
    const [selectedResponseIds, setSelectedResponseIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showBulkConfirm, setShowBulkConfirm] = useState(false);
    // Select Mode — when off, checkboxes/delete UI are completely hidden so the
    // rundown reads as a clean review table. Toggling on reveals checkboxes +
    // bulk-delete bar. Replaces the always-on per-row delete buttons (accidental
    // deletions) with an explicit opt-in flow.
    const [isSelectMode, setIsSelectMode] = useState(false);

    // Athlete drill-in — History section state. Three collapsible cards at the
    // bottom of the per-athlete view (Daily Responses History / Deep Checks
    // History / Flag History). All default closed; each has its own range scope
    // (7/30/90 days/All time, default 30d). `athleteHistoryFocus` lets external
    // entry points (e.g. clicking a flag row) auto-open one specific section
    // when navigating into the athlete view.
    const [isDailyHistOpen,  setIsDailyHistOpen]  = useState(false);
    const [isWeeklyHistOpen, setIsWeeklyHistOpen] = useState(false);
    const [isFlagHistOpen,   setIsFlagHistOpen]   = useState(false);
    const [historyDailyDays,  setHistoryDailyDays]  = useState<number>(30);
    const [historyWeeklyDays, setHistoryWeeklyDays] = useState<number>(30);
    const [historyFlagDays,   setHistoryFlagDays]   = useState<number>(30);
    const [athleteFlagHistory, setAthleteFlagHistory] = useState<any[]>([]);

    // Navigate to an athlete's drill-in. Optional focus param auto-opens one of
    // the three history sections (used by flag-row click — opens Flag History).
    const openAthlete = (athleteId: string, focus?: 'daily' | 'weekly' | 'flags') => {
        setSelectedAthleteId(athleteId);
        setIsDailyHistOpen(focus === 'daily');
        setIsWeeklyHistOpen(focus === 'weekly');
        setIsFlagHistOpen(focus === 'flags');
        setViewMode('athlete');
    };

    // Fetch this athlete's full flag history when their profile opens. Scoped
    // to the team to honour RLS; filtered to this athlete client-side.
    useEffect(() => {
        if (viewMode !== 'athlete' || !selectedTeamId || !selectedAthleteId) {
            setAthleteFlagHistory([]);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const all = await DatabaseService.fetchWellnessFlags(selectedTeamId, false);
                if (cancelled) return;
                setAthleteFlagHistory((all || []).filter((f: any) => f.athlete_id === selectedAthleteId));
            } catch (err) {
                console.warn('Failed to load athlete flag history:', err);
                if (!cancelled) setAthleteFlagHistory([]);
            }
        })();
        return () => { cancelled = true; };
    }, [viewMode, selectedTeamId, selectedAthleteId]);
    const [heatmapDays, setHeatmapDays] = useState<number>(7);
    const [heatmapAnchor, setHeatmapAnchor] = useState<string>(() => localDateStr());

    // Resolve wellnessDateRange to local dateFrom/dateTo
    const dateRange = useMemo(() => {
        const today = localDateStr();
        if (wellnessDateRange === 'today') return { from: today, to: today };
        if (wellnessDateRange === '30d') return { from: localDateStr(new Date(Date.now() - 30 * 86400000)), to: today };
        // default '7d'
        return { from: localDateStr(new Date(Date.now() - 7 * 86400000)), to: today };
    }, [wellnessDateRange]);

    // Always load 30d of data so heatmap/sparklines/trends have enough — KPIs use filteredResponses for range
    React.useEffect(() => {
        if (selectedTeamId && viewMode === 'dashboard') {
            handleLoadWellnessResponses(selectedTeamId, '30d');
        }
    }, [selectedTeamId, viewMode]);

    // Fetch share sessions for this team + date range
    React.useEffect(() => {
        if (selectedTeamId) {
            DatabaseService.fetchShareSessions(selectedTeamId, dateRange.from, dateRange.to).then(setShareSessions);
        }
    }, [selectedTeamId, dateRange]);

    const handleDeleteResponse = async (id: string) => {
        try {
            await DatabaseService.deleteWellnessResponse(id);
            setConfirmDeleteId(null);
            setSelectedResponseIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            if (selectedTeamId) handleLoadWellnessResponses(selectedTeamId, wellnessDateRange);
        } catch {
            showToast?.('Failed to delete response.', 'error');
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkDeleting(true);
        try {
            await Promise.all([...selectedResponseIds].map(id => DatabaseService.deleteWellnessResponse(id)));
            setSelectedResponseIds(new Set());
            setShowBulkConfirm(false);
            if (selectedTeamId) handleLoadWellnessResponses(selectedTeamId, wellnessDateRange);
        } catch {
            showToast?.('Failed to delete some responses.', 'error');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    // Responses for currently selected team, filtered to the active date range
    const filteredResponses = useMemo(() => {
        let filtered = selectedTeamId
            ? wellnessResponses.filter(r => r.team_id === selectedTeamId)
            : wellnessResponses;
        // Apply date range filter so compliance + averages match the picker
        filtered = filtered.filter(r => {
            const d = r.session_date || r.created_at?.split('T')[0];
            return d && d >= dateRange.from && d <= dateRange.to;
        });
        return filtered;
    }, [wellnessResponses, selectedTeamId, dateRange]);

    // Daily-only responses (exclude weekly tier) — used for metric averages and KPI
    const dailyResponses = useMemo(() =>
        filteredResponses.filter(r => r.tier !== 'weekly'),
    [filteredResponses]);

    // Weekly-only responses — NOT filtered by the global date picker (deep checks are sparse;
    // filtering by 7d/today would hide all historical data). Uses the full 30d loaded set.
    const weeklyResponses = useMemo(() =>
        wellnessResponses.filter(r => r.team_id === selectedTeamId && r.tier === 'weekly'),
    [wellnessResponses, selectedTeamId]);

    // Rundown daily responses — filtered from raw wellnessResponses (NOT from
    // `dailyResponses` which is already gated by the banner's global filter).
    // That coupling was the bug: a banner set to "Today" + rundown set to
    // "30d" would only see today's data. Now Rundown's range is truly
    // independent.
    //
    // After scoping by window, we collapse to ONE row per athlete = their
    // latest response within the window (matches the "Individual Rundown"
    // intent — squad-wide latest-state view). Athletes with no response in
    // the window are simply excluded.
    const rundownDailyFiltered = useMemo(() => {
        const inWindow = (wellnessResponses || [])
            .filter(r => r.team_id === selectedTeamId && r.tier !== 'weekly')
            .filter(r => {
                const d = r.session_date || r.created_at?.split('T')[0];
                return d && d >= rundownFrom && d <= rundownTo;
            });
        // Latest per athlete in the window
        const latestByAthlete = new Map<string, any>();
        for (const r of inWindow) {
            const existing = latestByAthlete.get(r.athlete_id);
            if (!existing) { latestByAthlete.set(r.athlete_id, r); continue; }
            const existingKey = (existing.session_date || '') + (existing.submitted_at || '');
            const newKey = (r.session_date || '') + (r.submitted_at || '');
            if (newKey > existingKey) latestByAthlete.set(r.athlete_id, r);
        }
        return Array.from(latestByAthlete.values())
            .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || '') || (b.submitted_at || '').localeCompare(a.submitted_at || ''));
    }, [wellnessResponses, selectedTeamId, rundownFrom, rundownTo]);

    const rundownDeepChecks = useMemo(() =>
        (wellnessResponses || [])
            .filter(r => r.team_id === selectedTeamId && r.tier === 'weekly')
            .filter(r => { const d = r.session_date || r.created_at?.split('T')[0]; return d && d >= rundownFrom && d <= rundownTo; })
            .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || '') || (b.submitted_at || '').localeCompare(a.submitted_at || '')),
    [wellnessResponses, selectedTeamId, rundownFrom, rundownTo]);

    // Daily responses that triggered a deep check but no weekly response followed within 3 days
    const triggeredIncomplete = useMemo(() => {
        if (!selectedTeamId) return [];
        const dailyForTeam = (wellnessResponses || []).filter(
            r => r.team_id === selectedTeamId && r.tier !== 'weekly'
        );
        const weeklyForTeam = (wellnessResponses || []).filter(
            r => r.team_id === selectedTeamId && r.tier === 'weekly'
        );
        return dailyForTeam.filter(r => {
            const date = r.session_date || r.created_at?.split('T')[0];
            if (!date || date < rundownFrom || date > rundownTo) return false;
            const rr = r.responses || {};
            const isFlag =
                (rr.health_complaint && rr.health_complaint !== 'no') ||
                (rr.fatigue != null && rr.fatigue >= 8) ||
                (rr.sleep_hours != null && rr.sleep_hours <= 5) ||
                r.availability === 'unavailable';
            if (!isFlag) return false;
            const [fy, fm, fd] = date.split('-').map(Number);
            const triggerMs = new Date(fy, fm - 1, fd).getTime();
            const completed = weeklyForTeam.some(w => {
                if (w.athlete_id !== r.athlete_id) return false;
                const wd = w.session_date || w.created_at?.split('T')[0];
                if (!wd) return false;
                const [wy, wm, wday] = wd.split('-').map(Number);
                const wMs = new Date(wy, wm - 1, wday).getTime();
                return wMs >= triggerMs && wMs <= triggerMs + 3 * 86400000;
            });
            return !completed;
        }).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
    }, [wellnessResponses, selectedTeamId, rundownFrom, rundownTo]);

    // Daily flags where athlete responded "no change — same issue" (sentinel weekly with weekly_followup='no_change')
    const triggeredNoChange = useMemo(() => {
        if (!selectedTeamId) return [];
        const dailyForTeam = (wellnessResponses || []).filter(
            r => r.team_id === selectedTeamId && r.tier !== 'weekly'
        );
        const weeklyForTeam = (wellnessResponses || []).filter(
            r => r.team_id === selectedTeamId && r.tier === 'weekly'
        );
        return dailyForTeam.filter(r => {
            const date = r.session_date || r.created_at?.split('T')[0];
            if (!date || date < rundownFrom || date > rundownTo) return false;
            const rr = r.responses || {};
            const isFlag =
                (rr.health_complaint && rr.health_complaint !== 'no') ||
                (rr.fatigue != null && rr.fatigue >= 8) ||
                (rr.sleep_hours != null && rr.sleep_hours <= 5) ||
                r.availability === 'unavailable';
            if (!isFlag) return false;
            const [fy, fm, fd] = date.split('-').map(Number);
            const triggerMs = new Date(fy, fm - 1, fd).getTime();
            return weeklyForTeam.some(w => {
                if (w.athlete_id !== r.athlete_id) return false;
                const wd = w.session_date || w.created_at?.split('T')[0];
                if (!wd) return false;
                const [wy, wm, wday] = wd.split('-').map(Number);
                const wMs = new Date(wy, wm - 1, wday).getTime();
                return wMs >= triggerMs && wMs <= triggerMs + 3 * 86400000
                    && w.responses?.weekly_followup === 'no_change';
            });
        }).sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
    }, [wellnessResponses, selectedTeamId, rundownFrom, rundownTo]);

    const activeTeam = teams.find(t => t.id === selectedTeamId);

    // Compliance: expected = unique tracking days × athletes, actual = unique (athlete, date) pairs
    const compliance = useMemo(() => {
        const athleteCount = activeTeam?.players?.length || 0;
        if (athleteCount === 0) return { expected: 0, actual: 0, rate: 0, sessionCount: 0, athleteCount: 0 };

        // Count unique daily response dates only (not weekly)
        const uniqueTrackingDates = new Set(dailyResponses.map(r => r.session_date));

        const sessionCount = uniqueTrackingDates.size;
        if (sessionCount === 0) return { expected: 0, actual: 0, rate: 0, sessionCount: 0, athleteCount };
        const expected = sessionCount * athleteCount;
        // Count unique (athlete, date) pairs from daily responses only
        const seen = new Set<string>();
        dailyResponses.forEach(r => {
            seen.add(`${r.athlete_id}__${r.session_date}`);
        });
        const actual = seen.size;
        return { expected, actual, rate: Math.round((actual / expected) * 100), sessionCount, athleteCount };
    }, [dailyResponses, activeTeam]);

    // Team averages across daily responses only (excludes weekly tier)
    const teamAverages = useMemo(() => {
        if (dailyResponses.length === 0) return null;
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};
        dailyResponses.forEach(res => {
            Object.entries(res.responses || {}).forEach(([qid, val]) => {
                if (typeof val === 'number') {
                    sums[qid]   = (sums[qid] || 0) + val;
                    counts[qid] = (counts[qid] || 0) + 1;
                }
            });
        });
        const avgs: Record<string, number> = {};
        Object.keys(sums).forEach(qid => { avgs[qid] = sums[qid] / counts[qid]; });
        return avgs;
    }, [dailyResponses]);

    // Latest response per athlete (deduplicated) from daily responses
    const latestPerAthlete = useMemo(() => {
        const map = new Map();
        [...dailyResponses]
            .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))
            .forEach(r => { if (!map.has(r.athlete_id)) map.set(r.athlete_id, r); });
        return Array.from(map.values());
    }, [dailyResponses]);

    // KPI counts derived from latest daily response per athlete
    const kpi = useMemo(() => {
        const isAlert = (r: any) => {
            const resp = r.responses || {};
            return r.injury_report
                || resolveAvailability(r) === 'unavailable'
                || resp.readiness === 'not_ready'
                || (resp.fatigue >= 8)
                || (resp.soreness >= 8)
                || (resp.stress >= 8)
                || (resp.sleep_hours != null && resp.sleep_hours <= 5)
                || resp.health_complaint === 'illness'
                || resp.health_complaint === 'both';
        };
        return {
            total:       latestPerAthlete.length,
            available:   latestPerAthlete.filter(r => resolveAvailability(r) === 'available').length,
            modified:    latestPerAthlete.filter(r => resolveAvailability(r) === 'modified').length,
            unavailable: latestPerAthlete.filter(r => resolveAvailability(r) === 'unavailable').length,
            alerts:      latestPerAthlete.filter(isAlert).length,
        };
    }, [latestPerAthlete]);

    const activeAthlete = athletes.find(a => a.id === selectedAthleteId);

    // ── SELECTION (home) ────────────────────────────────────────────────────

    // ── INSIGHTS TAB — Customizable Wellness Visualizations ──────────────────
    const [insightMetric, setInsightMetric] = useState<string>('fatigue');
    const [insightView, setInsightView] = useState<string>('bar_sorted');
    const [insightDate, setInsightDate] = useState<string>(TODAY);
    const [insightPeriodMode, setInsightPeriodMode] = useState<boolean>(false); // false=single day, true=full period
    const [insightCompareMetric, setInsightCompareMetric] = useState<string>('sleep_quality'); // second metric for comparison view

    // ── ROOT ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50/30 dark:bg-[#0F1C30]/30 p-8 pt-4">
            {viewMode === 'selection' && <WellnessTeamSelection {...{ handleLoadWellnessResponses, setSelectedTeamId, setViewMode, teams, wellnessResponses }} />}
            {viewMode === 'dashboard'  && <WellnessDashboard {...{ onBackToSections, chartTextColor, chartAxisColor, activeTeam, alertsModalOpen, athletes, chartGridColor, chartLabelColor, compliance, dailyResponses, dashboardTab, heatmapAnchor, heatmapDays, insightCompareMetric, insightDate, insightMetric, insightPeriodMode, insightView, isHeatmapOpen, isKpiExpanded, isRundownOpen, isSelectMode, kpi, latestPerAthlete, openAthlete, responseViewDate, rundownAsOfDate, rundownDailyFiltered, rundownDeepChecks, rundownRangeDays, rundownTab, searchQuery, selectedResponseIds, selectedTeamId, setAlertsModalOpen, setDashboardTab, setHeatmapAnchor, setHeatmapDays, setInsightCompareMetric, setInsightDate, setInsightMetric, setInsightPeriodMode, setInsightView, setIsHeatmapOpen, setIsKpiExpanded, setIsRundownOpen, setIsSelectMode, setResponseViewDate, setRundownAsOfDate, setRundownRangeDays, setRundownTab, setSearchQuery, setSelectedResponseIds, setShowBulkConfirm, setShowDailyTracker, setViewMode, setWellnessDateRange, showDailyTracker, teamAverages, teams, triggeredIncomplete, triggeredNoChange, weeklyResponses, wellnessDateRange, wellnessResponses }} />}
            {viewMode === 'athlete'    && (
                <WellnessAthleteView
                    activeAthlete={activeAthlete}
                    selectedAthleteId={selectedAthleteId}
                    wellnessResponses={wellnessResponses}
                    filteredResponses={filteredResponses}
                    athleteFlagHistory={athleteFlagHistory}
                    historyDailyDays={historyDailyDays}
                    setHistoryDailyDays={setHistoryDailyDays}
                    historyWeeklyDays={historyWeeklyDays}
                    setHistoryWeeklyDays={setHistoryWeeklyDays}
                    historyFlagDays={historyFlagDays}
                    setHistoryFlagDays={setHistoryFlagDays}
                    isDailyHistOpen={isDailyHistOpen}
                    setIsDailyHistOpen={setIsDailyHistOpen}
                    isWeeklyHistOpen={isWeeklyHistOpen}
                    setIsWeeklyHistOpen={setIsWeeklyHistOpen}
                    isFlagHistOpen={isFlagHistOpen}
                    setIsFlagHistOpen={setIsFlagHistOpen}
                    setViewMode={setViewMode}
                />
            )}
            {viewMode === 'share'      && (
                <WellnessSharePanel
                    selectedTemplate={selectedTemplate}
                    setSelectedTemplate={setSelectedTemplate}
                    selectedTeamId={selectedTeamId}
                    activeTeamName={activeTeam?.name}
                    wellnessTemplates={wellnessTemplates}
                    shareSessions={shareSessions}
                    setShareSessions={setShareSessions}
                    copied={copied}
                    setCopied={setCopied}
                    sharingInProgress={sharingInProgress}
                    setSharingInProgress={setSharingInProgress}
                    setViewMode={setViewMode}
                />
            )}
            {viewMode === 'templates'  && (
                <div className="space-y-6">
                    <button
                        onClick={() => setViewMode('selection')}
                        className="flex items-center gap-2 text-slate-400 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors font-bold text-[10px] uppercase tracking-[0.2em]"
                    >
                        <ArrowLeft size={14} /> Back to Hub
                    </button>

                    {/* Built-in form templates */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-3">Built-in Templates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div onClick={() => setPreviewTemplate('daily')} className="bg-white dark:bg-[#132338] border-2 border-indigo-100 dark:border-indigo-800/40 rounded-xl p-5 space-y-2 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300 flex items-center justify-center">
                                        <Activity size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-indigo-600 dark:text-indigo-300 transition-colors">Wellness Check</h4>
                                        <p className="text-[10px] text-indigo-500 font-medium">Daily · 8 questions · &lt;2 min</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 dark:text-[#475569] group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed">
                                    Availability, health complaint, fatigue, soreness, sleep quality, stress, mood, sleep hours, readiness. Auto-generates wellness flags.
                                </p>
                            </div>
                            <div onClick={() => setPreviewTemplate('weekly')} className="bg-white dark:bg-[#132338] border-2 border-amber-100 dark:border-amber-800/40 rounded-xl p-5 space-y-2 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-500 flex items-center justify-center">
                                        <ShieldIcon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-amber-600 transition-colors">Deep Health Check</h4>
                                        <p className="text-[10px] text-amber-500 font-medium">Deep check · FIFA/IOC aligned · 2–5 min</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 dark:text-[#475569] group-hover:text-amber-400 transition-colors" />
                                </div>
                                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed">
                                    Problem classification, onset, recurrence, body area (FIFA), mechanism, impact, time-loss, wellness trends, recovery.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Preview modal for built-in templates */}
                    {previewTemplate && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)} />
                            <div className="relative bg-white dark:bg-[#132338] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                {/* Header */}
                                <div className={`px-5 py-4 border-b ${previewTemplate === 'daily' ? 'bg-indigo-50 dark:bg-indigo-600 border-indigo-100 dark:border-indigo-800/40' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/40'} flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${previewTemplate === 'daily' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'}`}>
                                            {previewTemplate === 'daily' ? <Activity size={16} /> : <ShieldIcon size={16} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{previewTemplate === 'daily' ? 'Wellness Check' : 'Deep Health Check'}</h3>
                                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">{previewTemplate === 'daily' ? 'Daily · 8 questions · <2 min' : 'Deep check · FIFA/IOC · 2–5 min'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setPreviewTemplate(null)} aria-label="Close" className="p-2 hover:bg-slate-200 dark:hover:bg-[#1A2D48] rounded-lg transition-colors">
                                        <X size={16} className="text-slate-400 dark:text-[#CBD5E1]" />
                                    </button>
                                </div>

                                {/* Preview content with expandable phone mockups */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                                    <p className={`text-xs ${previewTemplate === 'daily' ? 'text-indigo-600' : 'text-amber-600'} font-semibold uppercase tracking-wide mb-4`}>
                                        Tap any question to see how it looks on screen
                                    </p>

                                    {(() => {
                                        const questions = previewTemplate === 'daily' ? [
                                            { id: 'd1', label: 'Availability', type: 'Buttons', instruction: 'What is your training status today?', options: ['Fully Available', 'Modified Training', 'Unavailable — Training', 'Unavailable — Match'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-rose-500'] },
                                            { id: 'd2', label: 'Health Check', type: 'Buttons', instruction: 'Do you have any physical (medical) complaint today?', options: ['No', 'Yes — Injury related', 'Yes — Illness related', 'Yes — Injury + Illness'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-amber-500', 'bg-rose-500'] },
                                            { id: 'd2b', label: 'Complaint Areas', type: 'Body Map', instruction: 'Tap affected area(s) on body map. Tap again to increase severity.', options: ['Body Map — front & back view', 'Severity: Minor → Moderate → Severe'], colors: ['bg-slate-800', 'bg-amber-500'], note: 'Only shown if Injury or Both selected' },
                                            { id: 'd3', label: 'Fatigue', type: '1-10 Scale', instruction: '1 = Fully fresh → 10 = Completely exhausted', negative: true },
                                            { id: 'd4', label: 'Muscle Soreness', type: '1-10 Scale', instruction: '1 = No soreness → 10 = Severe pain', negative: true },
                                            { id: 'd5', label: 'Sleep Quality', type: '1-10 Scale', instruction: '1 = Very poor → 10 = Outstanding', negative: false },
                                            { id: 'd6', label: 'Stress', type: '1-10 Scale', instruction: '1 = Completely relaxed → 10 = Extreme stress', negative: true },
                                            { id: 'd7', label: 'Mood', type: '1-10 Scale', instruction: '1 = Very low → 10 = Exceptional', negative: false },
                                            { id: 'd8', label: 'Sleep Duration', type: 'Number', instruction: 'Enter hours slept last night (any value, e.g. 3, 7.5, 10).' },
                                            { id: 'd9', label: 'Readiness', type: 'Buttons', instruction: 'How ready are you to train today?', options: ['Ready to Train', 'Slightly Compromised', 'Not Ready'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'] },
                                        ] : [
                                            { id: 'w0', label: 'Introduction', type: 'Info screen', instruction: 'Explains why the form is needed. Auto-continues.', options: ['Confirm & Continue'], colors: ['bg-slate-800'], note: 'No input required — context screen only' },
                                            { id: 'w1', label: 'Problem Type', type: 'Buttons', instruction: 'What best describes your current issue?', options: ['Injury', 'Illness', 'Injury + Illness'], colors: ['bg-slate-800', 'bg-slate-800', 'bg-slate-800'], note: 'Skipped if triggered from daily form (already answered)' },
                                            // ── INJURY PATH (shown only if Injury or Both) ──
                                            { id: 'w2', label: 'Onset', type: 'Buttons', instruction: 'Was it a specific event or has it built up gradually?', options: ['Sudden Onset', 'Gradual Onset'], colors: ['bg-slate-800', 'bg-slate-800'], note: 'Injury path only' },
                                            { id: 'w3', label: 'Status', type: 'Buttons', instruction: 'Has this happened before in the same area?', options: ['New Problem', 'Recurrence (fully healed, came back)', 'Exacerbation (never fully healed)'], colors: ['bg-slate-800', 'bg-slate-800', 'bg-slate-800'], note: 'Injury path only' },
                                            { id: 'w4', label: 'Body Area', type: 'Body Map', instruction: 'Select the primary area affected. FIFA-aligned body regions.', options: ['FIFA body areas — front & back view', 'Hip/Groin separated', 'Severity: Minor → Moderate → Severe'], colors: ['bg-slate-800', 'bg-amber-500', 'bg-rose-500'], note: 'Injury path only' },
                                            { id: 'w5', label: 'Which Side?', type: 'Buttons', instruction: 'Which side is affected?', options: ['Left', 'Right', 'Bilateral (both)', 'Central'], colors: ['bg-slate-800', 'bg-slate-800', 'bg-slate-800', 'bg-slate-800'], note: 'Injury path only' },
                                            { id: 'w6', label: 'Mechanism', type: 'List', instruction: 'What activity caused or triggered it?', options: ['Running', 'Change of direction', 'Kicking', 'Landing', 'Tackle', 'Collision', 'Jumping', 'Other'], note: 'Injury path · sudden onset only' },
                                            { id: 'w7', label: 'Contact Type', type: 'List', instruction: 'Did this involve contact with a person or object?', options: ['Non-contact', 'Indirect contact', 'Direct — Opponent', 'Direct — Teammate', 'Direct — Ball', 'Direct — Goal post', 'Direct — Other'], note: 'Injury path · sudden onset only' },
                                            { id: 'w8', label: 'Performance Impact', type: 'Buttons', instruction: 'How much is this injury affecting your ability to train?', options: ['No Impact', 'Minor — can fully train', 'Moderate — reduced performance', 'Severe — cannot complete session'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Injury path only' },
                                            { id: 'w9', label: 'Expected Time-Loss', type: 'Buttons', instruction: 'How long do you expect this injury to affect your availability?', options: ['0 days', '1–3 days', '4–7 days', '8–28 days', '29+ days'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-400', 'bg-amber-600', 'bg-rose-500'], note: 'Injury path only' },
                                            // ── ILLNESS PATH (shown only if Illness or Both) ──
                                            { id: 'w_ill1', label: 'Hoarseness', type: 'Severity', instruction: 'Rate any voice roughness or hoarseness you\'re experiencing.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill2', label: 'Blocked / Plugged Nose', type: 'Severity', instruction: 'Rate how blocked or plugged your nose feels.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill3', label: 'Runny Nose', type: 'Severity', instruction: 'Rate any runny nose you\'re experiencing.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill4', label: 'Sinus Pressure', type: 'Severity', instruction: 'Rate any facial pressure or sinus pain.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill5', label: 'Sneezing', type: 'Severity', instruction: 'Rate how frequently you\'re sneezing.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill6', label: 'Dry Cough', type: 'Severity', instruction: 'Rate any dry, unproductive cough.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill7', label: 'Wet Cough', type: 'Severity', instruction: 'Rate any cough that produces mucus or sputum.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill8', label: 'Headache', type: 'Severity', instruction: 'Rate any headache you\'re currently experiencing.', options: ['No Symptoms', 'Mild', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill9', label: 'Illness Impact', type: 'Buttons', instruction: 'How much is this illness affecting your ability to train?', options: ['No Impact', 'Minor', 'Moderate', 'Severe'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-500', 'bg-rose-500'], note: 'Illness path only' },
                                            { id: 'w_ill10', label: 'Illness Time-Loss', type: 'Buttons', instruction: 'How long do you expect this illness to affect your availability?', options: ['0 days', '1–3 days', '4–7 days', '8–28 days', '29+ days'], colors: ['bg-emerald-500', 'bg-sky-400', 'bg-amber-400', 'bg-amber-600', 'bg-rose-500'], note: 'Illness path only' },
                                            // ── SHARED CLOSING (always shown) ──
                                            { id: 'w10', label: 'Fatigue Trend', type: 'Buttons', instruction: 'Over the past week, how has your fatigue been trending?', options: ['Improving', 'Stable', 'Worsening'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'] },
                                            { id: 'w11', label: 'Sleep Trend', type: 'Buttons', instruction: 'Over the past week, how has your sleep quality been trending?', options: ['Improving', 'Stable', 'Worsening'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'] },
                                            { id: 'w12', label: 'Nutrition', type: '1-10 Scale', instruction: '1 = Very poor → 10 = Outstanding consistency this week', negative: false },
                                            { id: 'w13', label: 'Hydration', type: '1-10 Scale', instruction: '1 = Very poor → 10 = Outstanding consistency this week', negative: false },
                                            { id: 'w14', label: 'Stress Sources', type: 'Multi-select', instruction: 'What are your main stress sources right now? Select all that apply.', options: ['Football / Sport', 'Work / School', 'Personal', 'None'] },
                                        ];

                                        const negColors = ['bg-emerald-500', 'bg-emerald-400', 'bg-emerald-400', 'bg-sky-400', 'bg-sky-500', 'bg-amber-400', 'bg-amber-500', 'bg-rose-400', 'bg-rose-500', 'bg-rose-600'];
                                        const posColors = ['bg-rose-600', 'bg-rose-500', 'bg-rose-400', 'bg-amber-500', 'bg-amber-400', 'bg-sky-500', 'bg-sky-400', 'bg-emerald-400', 'bg-emerald-400', 'bg-emerald-500'];

                                        return questions.map((q, i) => {
                                            const isExpanded = expandedPreviewQ === q.id;
                                            return (
                                                <div key={q.id}>
                                                    <div onClick={() => setExpandedPreviewQ(isExpanded ? null : q.id)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isExpanded ? 'bg-slate-100 dark:bg-[#1A2D48] ring-1 ring-slate-200' : 'bg-slate-50 dark:bg-[#0F1C30] hover:bg-slate-100'}`}>
                                                        <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{q.label}</span>
                                                                <span className="text-[9px] font-medium text-slate-400 dark:text-[#CBD5E1] bg-slate-200 dark:bg-[#243A58] px-1.5 py-0.5 rounded">{q.type}</span>
                                                            </div>
                                                            {q.note && <p className="text-[9px] text-amber-500 italic mt-0.5">{q.note}</p>}
                                                        </div>
                                                        <ChevronDown size={14} className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {/* Mini phone preview */}
                                                    {isExpanded && (
                                                        <div className="flex justify-center py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="w-[220px] bg-white dark:bg-[#132338] rounded-[20px] shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden">
                                                                {/* Phone notch */}
                                                                <div className="bg-slate-50 dark:bg-[#0F1C30] px-4 pt-2 pb-1.5 flex items-center justify-between">
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-4 h-4 bg-indigo-600 rounded-[4px] flex items-center justify-center">
                                                                            <Activity size={8} className="text-white" />
                                                                        </div>
                                                                        <span className="text-[7px] font-bold text-slate-700 dark:text-[#E2E8F0]">SportsLab</span>
                                                                    </div>
                                                                    <span className="text-[7px] text-slate-400 dark:text-[#CBD5E1]">{i + 1}/{questions.length}</span>
                                                                </div>
                                                                {/* Progress bar */}
                                                                <div className="h-[2px] bg-slate-100 dark:bg-[#1A2D48]">
                                                                    <div className={`h-full ${previewTemplate === 'daily' ? 'bg-cyan-500' : 'bg-amber-500'}`} style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
                                                                </div>
                                                                {/* Content */}
                                                                <div className="px-4 py-3 space-y-2">
                                                                    <h3 className="text-[10px] font-bold text-slate-900 dark:text-[#E2E8F0]">{q.label}</h3>
                                                                    {q.instruction && <p className="text-[7px] text-slate-500 dark:text-[#CBD5E1]">{q.instruction}</p>}

                                                                    {/* Render based on type */}
                                                                    {q.type === 'Buttons' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-1.5 rounded-lg border text-[7px] font-semibold ${j === 0 ? `${q.colors?.[j] || 'bg-slate-800'} text-white border-transparent` : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Yes / No' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-2 rounded-lg border text-[8px] font-bold ${j === 0 ? `${q.colors?.[j] || 'bg-emerald-500'} text-white border-transparent` : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.type === '1-10 Scale' && (
                                                                        <div>
                                                                            <div className="flex justify-between text-[6px] text-slate-400 dark:text-[#CBD5E1] mb-1 px-0.5">
                                                                                <span>{q.lowLabel}</span>
                                                                                <span>{q.highLabel}</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-5 gap-[3px]">
                                                                                {[1,2,3,4,5,6,7,8,9,10].map(v => {
                                                                                    const colors = q.negative ? negColors : posColors;
                                                                                    return (
                                                                                        <div key={v} className={`aspect-square rounded-md flex items-center justify-center text-[7px] font-bold ${v === 3 ? `${colors[v-1]} text-white` : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]'}`}>
                                                                                            {v}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Number' && (
                                                                        <div className="space-y-1.5">
                                                                            <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg py-2 text-center text-[12px] font-bold text-slate-900 dark:text-[#E2E8F0]">7.5</div>
                                                                            <div className="flex gap-1">
                                                                                {(q.quickSelect || []).map(h => (
                                                                                    <div key={h} className={`flex-1 py-1 rounded-md text-center text-[7px] font-bold ${h === '7h' ? 'bg-cyan-500 text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]'}`}>{h}</div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'List' && q.options && (
                                                                        <div className="space-y-[3px] max-h-[80px] overflow-y-auto">
                                                                            {q.options.slice(0, 6).map((opt, j) => (
                                                                                <div key={j} className={`px-2 py-1.5 rounded-md border text-[7px] font-semibold ${j === 0 ? 'bg-slate-800 text-white border-transparent' : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                            {q.options.length > 6 && <div className="text-[7px] text-slate-400 dark:text-[#CBD5E1] text-center">+{q.options.length - 6} more</div>}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Multi' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-1.5 rounded-lg border text-[7px] font-semibold ${j === 0 ? 'bg-cyan-500 text-white border-transparent' : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Colour Scale' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-1.5 rounded-lg border text-[7px] font-semibold ${j === 0 ? `${q.colors?.[j] || 'bg-emerald-500'} text-white border-transparent` : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Footer */}
                                                                <div className="px-4 py-2 border-t border-slate-100 dark:border-[#1A2D48]">
                                                                    <div className="bg-slate-800 text-white text-[8px] font-bold text-center py-2 rounded-lg">Continue →</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}

                                    {/* Info callout */}
                                    <div className={`mt-4 p-3 ${previewTemplate === 'daily' ? 'bg-rose-50 dark:bg-rose-700 border-rose-200 dark:border-rose-700' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'} border rounded-xl`}>
                                        <p className={`text-[10px] font-semibold ${previewTemplate === 'daily' ? 'text-rose-600' : 'text-amber-600'} uppercase tracking-wide mb-1`}>
                                            {previewTemplate === 'daily' ? 'Auto-Flag & Trigger System' : 'FIFA/IOC Aligned'}
                                        </p>
                                        <p className={`text-[10px] ${previewTemplate === 'daily' ? 'text-rose-500' : 'text-amber-500'} leading-relaxed`}>
                                            {previewTemplate === 'daily'
                                                ? 'Red flags (Unavailable, complaint = yes, fatigue ≥ 8, sleep ≤ 5hrs) trigger an immediate prompt to complete the In-Depth Report after submission. If already completed within 7 days, athlete is asked if anything new has changed. Body map appears only when complaint = Yes.'
                                                : 'Based on Waldén et al. (2023, BJSM) consensus. Body map uses FIFA areas with hip/groin split. Injury status distinguishes recurrence from exacerbation. Time-loss bins match FIFA severity. Body map includes reference image with severity tap cycling.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t border-slate-200 dark:border-[#243A58] pt-2">
                        <h3 className="text-xs font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-3">Custom Templates</h3>
                    </div>

                    <QuestionnaireManager
                        wellnessTemplates={wellnessTemplates}
                        setWellnessTemplates={setWellnessTemplates}
                    />
                </div>
            )}

            {/* ── Bulk Action Floating Bar ── only when Select Mode is on AND items are selected */}
            {isSelectMode && selectedResponseIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[9px] font-bold">{selectedResponseIds.size}</div>
                        <span className="text-sm font-semibold">{selectedResponseIds.size === 1 ? '1 response selected' : `${selectedResponseIds.size} responses selected`}</span>
                    </div>
                    <div className="w-px h-5 bg-slate-600" />
                    <button
                        onClick={() => setShowBulkConfirm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-colors"
                    >
                        <Trash2 size={12} />
                        Delete
                    </button>
                    <button
                        onClick={() => setSelectedResponseIds(new Set())}
                        className="p-1.5 text-slate-400 dark:text-[#CBD5E1] hover:text-white transition-colors rounded-lg hover:bg-slate-800"
                        title="Clear selection"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* ── Bulk Delete Confirm Modal ── */}
            {showBulkConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] p-6 w-full max-w-sm mx-4">
                        <div className="w-11 h-11 rounded-xl bg-rose-50 dark:bg-rose-700 flex items-center justify-center mb-4">
                            <Trash2 size={20} className="text-rose-500" />
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0] mb-1">Delete {selectedResponseIds.size} response{selectedResponseIds.size !== 1 ? 's' : ''}?</h3>
                        <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mb-5">This will permanently remove the selected wellness responses. This cannot be undone.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBulkConfirm(false)}
                                disabled={isBulkDeleting}
                                className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-[#243A58] rounded-xl text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isBulkDeleting}
                                className="flex-1 px-4 py-2.5 bg-rose-500 hover:bg-rose-600 rounded-xl text-sm font-bold text-white transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {isBulkDeleting ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deleting…</> : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WellnessHub;
