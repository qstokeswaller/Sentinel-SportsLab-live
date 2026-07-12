import React, { useState, useMemo, useEffect } from 'react';
import {
    Search, Users, ChevronRight, ChevronLeft, ArrowLeft, ClipboardList, AlertTriangle,
    Share2, Calendar, Activity, CheckCircle2, Clock, Copy, Zap, Link2, Plus, X,
    BarChart3, Trash2, ChevronUp, ChevronDown, Shield as ShieldIcon, Thermometer,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import { CustomSelect } from '../ui/CustomSelect';
import { AthleteAvatar } from '../roster/AthleteAvatar';
import QuestionnaireManager from './QuestionnaireManager';
import WellnessChartCard from '../charts/WellnessChartCard';
import WellnessHeatmap from '../wellness/WellnessHeatmap';
import WellnessSparklines from '../wellness/WellnessSparklines';
import WellnessFlagPanel from '../wellness/WellnessFlagPanel';
import ComplianceTracker from '../wellness/ComplianceTracker';
import { BodyMapArea } from '../../types/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Use local date (not UTC) so SA timezone shows correct day
const localDateStr = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const TODAY = localDateStr();

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const formatDateHeader = (isoDate: string): { label: string; sub: string | null } => {
    const d = new Date(isoDate + 'T00:00:00');
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    const dayName  = d.toLocaleDateString('en-GB', { weekday: 'long' });
    const short    = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const full     = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (d.getTime() === now.getTime())       return { label: 'Today',     sub: short };
    if (d.getTime() === yesterday.getTime()) return { label: 'Yesterday', sub: short };
    return { label: dayName + ', ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), sub: null };
};

/** Resolves availability from either the top-level field (new) or the raw responses object (legacy).
 *  The form used to save full option text like 'Fully available for training/competition'. */
const resolveAvailability = (res: any): 'available' | 'modified' | 'unavailable' | undefined => {
    const top = res?.availability;
    if (top === 'available' || top === 'modified' || top === 'unavailable') return top;
    const raw: string = res?.responses?.availability || '';
    if (!raw) return undefined;
    if (raw === 'available' || raw.toLowerCase().includes('fully available')) return 'available';
    if (raw === 'modified'  || raw.toLowerCase().includes('modified'))        return 'modified';
    if (raw === 'unavailable' || raw.toLowerCase().includes('unavailable'))   return 'unavailable';
    return undefined;
};

/** Returns 'green' | 'amber' | 'red' | null for a wellness response */
const getAthleteStatus = (res: any): 'green' | 'amber' | 'red' | null => {
    if (!res) return null;
    const avail = resolveAvailability(res);
    if (avail === 'unavailable' || (res.injury_report?.areas?.length || 0) > 0 || (res.rpe || 0) >= 9) return 'red';
    if (avail === 'modified' || (res.rpe || 0) >= 7) return 'amber';
    return 'green';
};

/** Returns gradient badge classes for an RPE value (1-10) */
const getRpeBadge = (rpe: number): string => {
    if (rpe >= 9) return 'bg-rose-50 dark:bg-rose-700 text-rose-600 dark:text-white border-rose-100 dark:border-rose-900/40';
    if (rpe >= 7) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border-amber-100 dark:border-amber-800/40';
    if (rpe >= 5) return 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 border-sky-100 dark:border-sky-900/40';
    if (rpe >= 3) return 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40';
    return 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40';
};

const STATUS_DOT: Record<'green' | 'amber' | 'red', string> = {
    green: 'bg-emerald-500',
    amber: 'bg-amber-400',
    red:   'bg-rose-500',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface VizBlock {
    id:          string;
    questionId?: string;
    chartType?:  string;
    compareQId?: string;
    date?:       string;
}

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
    const RUNDOWN_RANGE_OPTIONS: { id: number; label: string }[] = [
        { id: 1,  label: 'Today' },
        { id: 3,  label: '3d' },
        { id: 7,  label: '7d' },
        { id: 14, label: '14d' },
        { id: 30, label: '30d' },
    ];
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
    const HISTORY_RANGE_OPTIONS: { id: number; label: string }[] = [
        { id: 7,    label: '7d' },
        { id: 30,   label: '30d' },
        { id: 90,   label: '90d' },
        { id: 9999, label: 'All' },
    ];

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
    const renderSelection = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h2 className="text-4xl font-semibold text-slate-900 dark:text-[#E2E8F0] tracking-tighter">Questionnaire Data</h2>
                    <p className="text-slate-400 dark:text-[#CBD5E1] font-bold uppercase text-[11px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <Activity size={14} className="text-cyan-500" />
                        {formatDate(TODAY)} — Real-time Readiness Monitoring
                    </p>
                </div>
                <button
                    data-tour="wellness-templates"
                    onClick={() => setViewMode('templates')}
                    className="px-6 py-3 bg-white dark:bg-[#132338] border-2 border-slate-100 dark:border-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] rounded-xl font-bold flex items-center gap-2 hover:border-cyan-200 hover:text-cyan-600 transition-all shadow-sm"
                >
                    <ClipboardList size={18} /> Templates
                </button>
            </div>

            {/* Team Cards */}
            <div data-tour="wellness-teams" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => {
                    // Today's responses for this team (from whatever is cached in context)
                    const todayRes = wellnessResponses.filter(
                        r => r.team_id === team.id && r.session_date === TODAY
                    );
                    const fullCount      = todayRes.filter(r => resolveAvailability(r) === 'available').length;
                    const modCount       = todayRes.filter(r => resolveAvailability(r) === 'modified').length;
                    const outCount       = todayRes.filter(r => resolveAvailability(r) === 'unavailable').length;
                    const alertCount     = todayRes.filter(r => (r.rpe || 0) >= 8 || r.injury_report || resolveAvailability(r) === 'unavailable').length;
                    // Count only daily check-ins for the "responded" ratio so it never exceeds athlete count.
                    // Weekly responses are tracked separately and would double-count if included.
                    const responseCount  = fullCount + modCount + outCount;
                    const totalAthletes  = team.players.length;

                    return (
                        <div
                            key={team.id}
                            onClick={() => {
                                setSelectedTeamId(team.id);
                                handleLoadWellnessResponses(team.id, '30d');
                                setViewMode('dashboard');
                            }}
                            className="bg-white dark:bg-[#132338] p-6 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/5 transition-all group cursor-pointer relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                <Users size={80} />
                            </div>

                            {/* Alert badge */}
                            {alertCount > 0 && (
                                <div className="absolute top-4 right-4 flex items-center gap-1 px-2.5 py-1 bg-rose-500 text-white rounded-full text-[9px] font-semibold uppercase shadow-lg">
                                    <AlertTriangle size={10} /> {alertCount} Flagged
                                </div>
                            )}

                            <div className="relative z-10 space-y-5">
                                {/* Avatar — added dark:group-hover variants so the
                                    tile hover state doesn't flash cyan-50 (effectively
                                    white) in dark mode. */}
                                <div className="w-14 h-14 bg-slate-50 dark:bg-[#0F1C30] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#CBD5E1] group-hover:bg-cyan-50 dark:group-hover:bg-cyan-500/15 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{team.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mt-1">
                                        {totalAthletes} Athletes • {team.sport}
                                    </p>
                                </div>

                                {/* Today's availability chips */}
                                {responseCount > 0 ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/40 px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                            {fullCount} Full
                                        </span>
                                        {modCount > 0 && (
                                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/25 border border-amber-100 dark:border-amber-800/40 px-2.5 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                                {modCount} Modified
                                            </span>
                                        )}
                                        {outCount > 0 && (
                                            // Out pill: dropped dark:bg-rose-700 (saturated rose where
                                            // text-rose-600 disappeared) for dark:bg-rose-900/25 with a
                                            // light dark:text-rose-300 — matches the Full / Modified pill
                                            // contrast pattern.
                                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/25 border border-rose-100 dark:border-rose-800/40 px-2.5 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                                {outCount} Out
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-tighter">
                                        <Zap size={10} className="text-cyan-400" /> No responses today
                                    </span>
                                )}

                                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-300 dark:text-[#475569] uppercase">
                                        {responseCount}/{totalAthletes} responded today
                                    </span>
                                    <ChevronRight size={20} className="text-slate-300 dark:text-[#475569] group-hover:text-cyan-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ── INSIGHTS TAB — Customizable Wellness Visualizations ──────────────────
    const [insightMetric, setInsightMetric] = useState<string>('fatigue');
    const [insightView, setInsightView] = useState<string>('bar_sorted');
    const [insightDate, setInsightDate] = useState<string>(TODAY);
    const [insightPeriodMode, setInsightPeriodMode] = useState<boolean>(false); // false=single day, true=full period
    const [insightCompareMetric, setInsightCompareMetric] = useState<string>('sleep_quality'); // second metric for comparison view

    const renderInsightsTab = () => {

        // All visualizable metrics from both forms
        const METRIC_DEFS = [
            { key: 'fatigue',       label: 'Fatigue',       max: 10, negative: true,  color: '#f59e0b', form: 'daily', type: 'scale' },
            { key: 'soreness',      label: 'Soreness',      max: 10, negative: true,  color: '#ef4444', form: 'daily', type: 'scale' },
            { key: 'sleep_quality', label: 'Sleep Quality', max: 10, negative: false, color: '#06b6d4', form: 'daily', type: 'scale' },
            { key: 'stress',        label: 'Stress',        max: 10, negative: true,  color: '#ec4899', form: 'daily', type: 'scale' },
            { key: 'mood',          label: 'Mood',          max: 10, negative: false, color: '#8b5cf6', form: 'daily', type: 'scale' },
            { key: 'sleep_hours',   label: 'Sleep Hours',   max: 12, negative: false, color: '#0ea5e9', form: 'daily', type: 'number' },
            { key: 'availability',  label: 'Availability',  max: 0,  negative: false, color: '#22c55e', form: 'daily', type: 'category', options: ['available', 'modified', 'unavailable'] },
            { key: 'readiness',     label: 'Readiness',     max: 0,  negative: false, color: '#6366f1', form: 'daily', type: 'category', options: ['ready', 'compromised', 'not_ready'] },
            { key: 'health_complaint', label: 'Health Complaint', max: 0, negative: false, color: '#ef4444', form: 'daily', type: 'category', options: ['no', 'injury', 'illness', 'both'] },
            { key: 'hydration',     label: 'Hydration',     max: 10, negative: false, color: '#06b6d4', form: 'weekly', type: 'scale' },
            { key: 'nutrition',     label: 'Nutrition',     max: 10, negative: false, color: '#10b981', form: 'weekly', type: 'scale' },
        ];

        // View options per metric type
        const VIEWS_FOR_TYPE = {
            scale:    [
                { id: 'bar_sorted',  label: 'Bar — Sorted' },
                { id: 'team_avg',    label: 'Team Average' },
                { id: 'distribution', label: 'Distribution' },
                { id: 'comparison',  label: 'Compare Metrics' },
                { id: 'trend',       label: 'Trend Over Time' },
            ],
            number:   [
                { id: 'bar_sorted',  label: 'Bar — Sorted' },
                { id: 'team_avg',    label: 'Team Average' },
                { id: 'histogram',   label: 'Histogram' },
                { id: 'trend',       label: 'Trend Over Time' },
            ],
            category: [
                { id: 'donut',       label: 'Donut Chart' },
                { id: 'count_bar',   label: 'Count Bar' },
            ],
            yesno: [
                { id: 'donut',       label: 'Donut Chart' },
                { id: 'count_bar',   label: 'Count Bar' },
            ],
        };

        const activeDef = METRIC_DEFS.find(m => m.key === insightMetric) || METRIC_DEFS[0];
        const viewOptions = VIEWS_FOR_TYPE[activeDef.type] || [];

        // Ensure current view is valid for the selected metric type
        const activeView = viewOptions.find(v => v.id === insightView) ? insightView : viewOptions[0]?.id || 'bar_sorted';

        // Use the correct response set for the selected metric type
        const insightSource = activeDef.form === 'weekly' ? weeklyResponses : dailyResponses;

        // Available dates derived from the active source (weekly metrics use weekly dates)
        const availDates = Array.from(new Set(insightSource.map(r => r.session_date))).sort((a, b) => String(b).localeCompare(String(a)));

        // Responses for selected date OR full period
        const dateResponses = insightSource.filter(r => r.session_date === insightDate);
        const chartResponses = insightPeriodMode ? insightSource : dateResponses;
        const totalAthletes = activeTeam?.players?.length || 0;
        const periodLabel = insightPeriodMode
            ? (wellnessDateRange === 'today' ? 'Today' : wellnessDateRange === '7d' ? 'Last 7 Days' : 'Last 30 Days')
            : new Date(insightDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        // ── Helper: get metric value from a response ──
        const getVal = (r: any) => {
            if (activeDef.key === 'availability') return resolveAvailability(r);
            if (activeDef.key === 'readiness') return r.responses?.readiness;
            if (activeDef.key === 'health_complaint') return r.responses?.health_complaint;
            return r.responses?.[activeDef.key];
        };

        // ── Chart renderers ──

        // BAR SORTED — per-athlete bars sorted by value (averages in period mode)
        const renderBarSorted = () => {
            let rows;
            if (insightPeriodMode) {
                // Period mode: average per athlete across all responses
                const byAthlete: Record<string, { sum: number; count: number; name: string; fullName: string }> = {};
                chartResponses.forEach(r => {
                    const v = getVal(r);
                    if (typeof v !== 'number') return;
                    const a = athletes.find(att => att.id === r.athlete_id);
                    const id = r.athlete_id;
                    if (!byAthlete[id]) byAthlete[id] = { sum: 0, count: 0, name: a?.name?.split(' ').pop() || '?', fullName: a?.name || 'Unknown' };
                    byAthlete[id].sum += v;
                    byAthlete[id].count++;
                });
                rows = Object.values(byAthlete).map(a => ({ name: a.name, value: +(a.sum / a.count).toFixed(1), fullName: a.fullName }));
            } else {
                rows = chartResponses.map(r => {
                    const a = athletes.find(att => att.id === r.athlete_id);
                    return { name: a?.name?.split(' ').pop() || '?', value: getVal(r) || 0, fullName: a?.name || 'Unknown' };
                }).filter(r => typeof r.value === 'number');
            }

            if (rows.length === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No responses for this {insightPeriodMode ? 'period' : 'date'}</p>;

            // Sort: negative metrics ascending (low=good first), positive metrics descending (high=good first)
            rows.sort((a, b) => activeDef.negative ? a.value - b.value : b.value - a.value);

            const max = activeDef.max || Math.max(...rows.map(r => r.value), 1);
            return (
                <div className="space-y-1.5">
                    {rows.map((r, i) => {
                        const pct = (r.value / max) * 100;
                        const barColor = activeDef.negative
                            ? r.value <= 3 ? '#22c55e' : r.value <= 6 ? '#f59e0b' : '#ef4444'
                            : r.value >= 7 ? '#22c55e' : r.value >= 4 ? '#f59e0b' : '#ef4444';
                        return (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] w-20 text-right truncate" title={r.fullName}>{r.name}</span>
                                <div className="flex-1 h-5 bg-slate-50 dark:bg-[#0F1C30] rounded-md overflow-hidden border border-slate-100 dark:border-[#1A2D48]">
                                    <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-[#E2E8F0] w-8 text-right">
                                    {activeDef.key === 'sleep_hours' ? `${r.value}h` : r.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        };

        // TEAM AVERAGE — large number + sparkline of daily averages
        const renderTeamAvg = () => {
            const vals = chartResponses.map(r => getVal(r)).filter(v => typeof v === 'number');
            const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

            // Historical averages for trend — use same source as the selected metric type
            const byDate: Record<string, number[]> = {};
            insightSource.forEach(r => {
                const v = r.responses?.[activeDef.key];
                if (typeof v === 'number') {
                    if (!byDate[r.session_date]) byDate[r.session_date] = [];
                    byDate[r.session_date].push(v);
                }
            });
            const trend = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([d, vs]) => ({
                date: d.slice(5),
                avg: vs.reduce((s, v) => s + v, 0) / vs.length,
            }));

            return (
                <div className="flex flex-col items-center py-6 gap-4">
                    <div className="text-center">
                        <div className="text-6xl font-bold tracking-tight" style={{ color: activeDef.color }}>
                            {activeDef.key === 'sleep_hours' ? `${avg.toFixed(1)}h` : avg.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] font-semibold uppercase tracking-wide mt-1">
                            Team Average — {vals.length} response{vals.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    {trend.length >= 2 && (
                        <div className="w-full max-w-md">
                            <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-semibold uppercase mb-1">Daily Average Trend</div>
                            {(() => {
                                const tVals = trend.map(t => t.avg);
                                const yMax = activeDef.max || 10;
                                const PAD_L = 22, PAD_B = 14, PAD_T = 4, PAD_R = 4;
                                const W = 300, H = 70;
                                const plotW = W - PAD_L - PAD_R;
                                const plotH = H - PAD_T - PAD_B;
                                const xPos = (i: number) => PAD_L + (tVals.length > 1 ? (i / (tVals.length - 1)) * plotW : plotW / 2);
                                const yPos = (v: number) => PAD_T + plotH - (v / yMax) * plotH;
                                const gridVals = activeDef.key === 'sleep_hours' ? [0, 6, 12] : [0, 5, 10];
                                return (
                                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
                                        {gridVals.map(gv => (
                                            <g key={gv}>
                                                <line x1={PAD_L} y1={yPos(gv)} x2={W - PAD_R} y2={yPos(gv)} stroke={chartGridColor} strokeWidth="1" />
                                                <text x={PAD_L - 3} y={yPos(gv) + 3} textAnchor="end" fontSize="6" fill={chartLabelColor}>{gv}{activeDef.key === 'sleep_hours' ? 'h' : ''}</text>
                                            </g>
                                        ))}
                                        <polygon
                                            points={[
                                                ...tVals.map((v, i) => `${xPos(i)},${yPos(v)}`),
                                                `${xPos(tVals.length - 1)},${PAD_T + plotH}`,
                                                `${xPos(0)},${PAD_T + plotH}`,
                                            ].join(' ')}
                                            fill={activeDef.color} fillOpacity="0.1"
                                        />
                                        <polyline points={tVals.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ')} fill="none" stroke={activeDef.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        {tVals.map((v, i) => {
                                            const showLabel = tVals.length <= 10 || i === 0 || i === tVals.length - 1;
                                            return (
                                                <g key={i}>
                                                    <circle cx={xPos(i)} cy={yPos(v)} r="2.5" fill={activeDef.color} />
                                                    {showLabel && <text x={xPos(i)} y={H - 2} textAnchor="middle" fontSize="6" fill={chartLabelColor}>{trend[i].date}</text>}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                );
                            })()}
                        </div>
                    )}
                </div>
            );
        };

        // DISTRIBUTION — pie/donut of score buckets (1-3 / 4-6 / 7-10)
        const renderDistribution = () => {
            const vals = chartResponses.map(r => getVal(r)).filter(v => typeof v === 'number');
            const low = vals.filter(v => v <= 3).length;
            const med = vals.filter(v => v >= 4 && v <= 6).length;
            const high = vals.filter(v => v >= 7).length;
            const total = vals.length;

            const data = activeDef.negative
                ? [{ label: '1-3 (Good)', count: low, color: '#22c55e' }, { label: '4-6 (Moderate)', count: med, color: '#f59e0b' }, { label: '7-10 (Concern)', count: high, color: '#ef4444' }]
                : [{ label: '1-3 (Low)', count: low, color: '#ef4444' }, { label: '4-6 (Moderate)', count: med, color: '#f59e0b' }, { label: '7-10 (Good)', count: high, color: '#22c55e' }];

            if (total === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No data</p>;

            const r = 50, circ = 2 * Math.PI * r;
            let offset = 0;
            return (
                <div className="flex items-center justify-center gap-8 py-4">
                    <svg width="130" height="130">
                        {data.map((d, i) => {
                            const pct = d.count / total;
                            const dash = pct * circ;
                            const seg = <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={d.color} strokeWidth="14"
                                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="round"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />;
                            offset += dash;
                            return seg;
                        })}
                        <text x="65" y="65" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill={chartTextColor}>{total}</text>
                    </svg>
                    <div className="space-y-2">
                        {data.map(d => (
                            <div key={d.label} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1]">{d.label}</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-[#E2E8F0]">{d.count} ({total > 0 ? Math.round((d.count/total)*100) : 0}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        // TREND — line chart of team averages over the whole date range
        const renderTrend = () => {
            const byDate: Record<string, number[]> = {};
            insightSource.forEach(r => {
                const v = r.responses?.[activeDef.key];
                if (typeof v === 'number') {
                    if (!byDate[r.session_date]) byDate[r.session_date] = [];
                    byDate[r.session_date].push(v);
                }
            });
            const trend = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([d, vs]) => ({
                date: d.slice(5),
                avg: +(vs.reduce((s, v) => s + v, 0) / vs.length).toFixed(1),
                count: vs.length,
            }));

            if (trend.length < 2) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">Need at least 2 days of data for trends</p>;

            // Fixed scale: use metric max (10 for scales, 12 for sleep_hours)
            const yMax = activeDef.max || 10;
            const yMin = 0;
            // SVG dimensions — leave room for Y-axis labels (left) and X-axis labels (bottom)
            const PAD_L = 28, PAD_B = 18, PAD_T = 8, PAD_R = 8;
            const W = 400, H = 110;
            const plotW = W - PAD_L - PAD_R;
            const plotH = H - PAD_T - PAD_B;

            const xPos = (i: number) => PAD_L + (trend.length > 1 ? (i / (trend.length - 1)) * plotW : plotW / 2);
            const yPos = (v: number) => PAD_T + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

            // Y grid lines at 0, 25%, 50%, 75%, 100% of scale
            const gridVals = activeDef.key === 'sleep_hours'
                ? [0, 3, 6, 9, 12]
                : [0, 2.5, 5, 7.5, 10];

            return (
                <div className="py-2">
                    <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-semibold mb-1 ml-7">
                        {activeDef.label} — daily team average · scale {yMin}–{yMax}{activeDef.key === 'sleep_hours' ? 'h' : ''}
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '140px' }}>
                        {/* Grid lines + Y labels */}
                        {gridVals.map(gv => {
                            const gy = yPos(gv);
                            return (
                                <g key={gv}>
                                    <line x1={PAD_L} y1={gy} x2={W - PAD_R} y2={gy} stroke={chartGridColor} strokeWidth="1" />
                                    <text x={PAD_L - 4} y={gy + 3} textAnchor="end" fontSize="7" fill={chartLabelColor}>{gv}{activeDef.key === 'sleep_hours' ? 'h' : ''}</text>
                                </g>
                            );
                        })}
                        {/* X axis baseline */}
                        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke={chartAxisColor} strokeWidth="1" />
                        {/* Fill area under line */}
                        <polygon
                            points={[
                                ...trend.map((t, i) => `${xPos(i)},${yPos(t.avg)}`),
                                `${xPos(trend.length - 1)},${PAD_T + plotH}`,
                                `${xPos(0)},${PAD_T + plotH}`,
                            ].join(' ')}
                            fill={activeDef.color}
                            fillOpacity="0.08"
                        />
                        {/* Line */}
                        <polyline
                            points={trend.map((t, i) => `${xPos(i)},${yPos(t.avg)}`).join(' ')}
                            fill="none" stroke={activeDef.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        />
                        {/* Dots + X labels */}
                        {trend.map((t, i) => {
                            const showLabel = trend.length <= 14 || i % Math.ceil(trend.length / 10) === 0 || i === trend.length - 1;
                            return (
                                <g key={i}>
                                    <circle cx={xPos(i)} cy={yPos(t.avg)} r="3" fill={activeDef.color} />
                                    <title>{`${t.date}: ${t.avg}${activeDef.key === 'sleep_hours' ? 'h' : ''} (${t.count} responses)`}</title>
                                    {showLabel && (
                                        <text x={xPos(i)} y={H - 4} textAnchor="middle" fontSize="7" fill={chartLabelColor}>{t.date}</text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            );
        };

        // HISTOGRAM — for sleep hours
        const renderHistogram = () => {
            const hrs = chartResponses.map(r => r.responses?.sleep_hours).filter(v => typeof v === 'number');
            const buckets = [
                { range: '<5h',   count: hrs.filter(h => h < 5).length,              color: '#ef4444' },
                { range: '5-6h',  count: hrs.filter(h => h >= 5 && h < 6).length,    color: '#f59e0b' },
                { range: '6-7h',  count: hrs.filter(h => h >= 6 && h < 7).length,    color: '#eab308' },
                { range: '7-8h',  count: hrs.filter(h => h >= 7 && h < 8).length,    color: '#22c55e' },
                { range: '8-9h',  count: hrs.filter(h => h >= 8 && h < 9).length,    color: '#06b6d4' },
                { range: '9h+',   count: hrs.filter(h => h >= 9).length,             color: '#8b5cf6' },
            ];
            const maxCount = Math.max(...buckets.map(b => b.count), 1);

            return (
                <div className="flex items-end gap-2 h-40 px-4 py-4">
                    {buckets.map(b => (
                        <div key={b.range} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-700 dark:text-[#E2E8F0]">{b.count}</span>
                            <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${(b.count / maxCount) * 100}%`, backgroundColor: b.color, minHeight: b.count > 0 ? 8 : 0 }} />
                            <span className="text-[8px] font-semibold text-slate-400 dark:text-[#CBD5E1]">{b.range}</span>
                        </div>
                    ))}
                </div>
            );
        };

        // DONUT — for category/yesno fields
        const renderDonut = () => {
            const counts: Record<string, number> = {};
            chartResponses.forEach(r => {
                const v = getVal(r);
                if (v) counts[v] = (counts[v] || 0) + 1;
            });
            // Add "No Response" for missing athletes (only meaningful for single-day view)
            if (!insightPeriodMode) {
                const noResp = Math.max(0, totalAthletes - chartResponses.length);
                if (noResp > 0) counts['No Response'] = noResp;
            }

            const COLORS = { available: '#22c55e', modified: '#f59e0b', unavailable: '#ef4444', ready: '#22c55e', compromised: '#f59e0b', not_ready: '#ef4444', no: '#22c55e', injury: '#f59e0b', illness: '#3b82f6', both: '#ef4444', 'No Response': '#e2e8f0' };
            const data = Object.entries(counts).map(([label, count]) => ({ label, count, color: COLORS[label] || '#6366f1' }));
            const total = data.reduce((s, d) => s + d.count, 0);

            if (total === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No data</p>;

            const r = 50, circ = 2 * Math.PI * r;
            let off = 0;
            return (
                <div className="flex items-center justify-center gap-8 py-4">
                    <svg width="130" height="130">
                        {data.map((d, i) => {
                            const pct = d.count / total;
                            const dash = pct * circ;
                            const seg = <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={d.color} strokeWidth="14"
                                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off} strokeLinecap="round"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />;
                            off += dash;
                            return seg;
                        })}
                        <text x="65" y="65" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill={chartTextColor}>{total}</text>
                    </svg>
                    <div className="space-y-2">
                        {data.map(d => (
                            <div key={d.label} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] capitalize">{d.label.replace('_', ' ')}</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-[#E2E8F0]">{d.count} ({Math.round((d.count/total)*100)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        // COUNT BAR — horizontal bars for category counts
        const renderCountBar = () => {
            const counts: Record<string, number> = {};
            chartResponses.forEach(r => {
                const v = getVal(r);
                if (v) counts[v] = (counts[v] || 0) + 1;
            });
            const COLORS = { available: '#22c55e', modified: '#f59e0b', unavailable: '#ef4444', ready: '#22c55e', compromised: '#f59e0b', not_ready: '#ef4444', no: '#22c55e', injury: '#f59e0b', illness: '#3b82f6', both: '#ef4444' };
            const data = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const maxC = Math.max(...data.map(([, c]) => c), 1);

            return (
                <div className="space-y-2 py-4">
                    {data.map(([label, count]) => (
                        <div key={label} className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] w-24 text-right capitalize">{label.replace('_', ' ')}</span>
                            <div className="flex-1 h-6 bg-slate-50 dark:bg-[#0F1C30] rounded-md overflow-hidden border border-slate-100 dark:border-[#1A2D48]">
                                <div className="h-full rounded-md transition-all duration-500" style={{ width: `${(count / maxC) * 100}%`, backgroundColor: COLORS[label] || '#6366f1' }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-[#E2E8F0] w-8">{count}</span>
                        </div>
                    ))}
                </div>
            );
        };

        // COMPARISON — two metrics side-by-side per athlete (grouped bars)
        const renderComparison = () => {
            const compareDef = METRIC_DEFS.find(m => m.key === insightCompareMetric && m.type === 'scale');
            if (!compareDef) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">Select a second metric to compare</p>;

            const athleteMap: Record<string, { name: string; v1: number | null; v2: number | null }> = {};

            if (insightPeriodMode) {
                // Period mode: average per athlete for both metrics
                chartResponses.forEach(r => {
                    const a = athletes.find(att => att.id === r.athlete_id);
                    const id = r.athlete_id;
                    if (!athleteMap[id]) athleteMap[id] = { name: a?.name?.split(' ').pop() || '?', v1: null, v2: null };
                });
                // Calculate averages
                const sums1: Record<string, { s: number; c: number }> = {};
                const sums2: Record<string, { s: number; c: number }> = {};
                chartResponses.forEach(r => {
                    const v1 = r.responses?.[activeDef.key];
                    const v2 = r.responses?.[compareDef.key];
                    if (typeof v1 === 'number') { sums1[r.athlete_id] = sums1[r.athlete_id] || { s: 0, c: 0 }; sums1[r.athlete_id].s += v1; sums1[r.athlete_id].c++; }
                    if (typeof v2 === 'number') { sums2[r.athlete_id] = sums2[r.athlete_id] || { s: 0, c: 0 }; sums2[r.athlete_id].s += v2; sums2[r.athlete_id].c++; }
                });
                Object.keys(athleteMap).forEach(id => {
                    if (sums1[id]) athleteMap[id].v1 = +(sums1[id].s / sums1[id].c).toFixed(1);
                    if (sums2[id]) athleteMap[id].v2 = +(sums2[id].s / sums2[id].c).toFixed(1);
                });
            } else {
                chartResponses.forEach(r => {
                    const a = athletes.find(att => att.id === r.athlete_id);
                    const id = r.athlete_id;
                    athleteMap[id] = {
                        name: a?.name?.split(' ').pop() || '?',
                        v1: typeof r.responses?.[activeDef.key] === 'number' ? r.responses[activeDef.key] : null,
                        v2: typeof r.responses?.[compareDef.key] === 'number' ? r.responses[compareDef.key] : null,
                    };
                });
            }

            const rows = Object.values(athleteMap).filter(r => r.v1 != null || r.v2 != null);
            if (rows.length === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No data</p>;

            const maxVal = 10;
            const barW = 100 / rows.length;

            const isSameMetric = activeDef.key === compareDef.key;
            return (
                <div>
                    {/* Explanation */}
                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mb-3 leading-relaxed">
                        Each athlete shows two bars side-by-side — <span className="font-semibold" style={{ color: activeDef.color }}>{activeDef.label}</span> (left) vs <span className="font-semibold" style={{ color: compareDef.color }}>{compareDef.label}</span> (right). Both use the 1–10 scale. Useful for spotting patterns, e.g. high fatigue + low mood together.
                    </p>
                    {isSameMetric && (
                        <p className="text-[10px] text-amber-500 font-semibold mb-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5">Both metrics are the same — select a different metric to compare in the "Compare With" selector above.</p>
                    )}
                    {/* Legend */}
                    <div className="flex items-center gap-4 mb-3 px-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: activeDef.color }} /> {activeDef.label} (left bar)
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: compareDef.color }} /> {compareDef.label} (right bar)
                        </span>
                    </div>
                    {/* Grouped bars with SVG for proper grid lines */}
                    <div className="relative" style={{ height: '180px' }}>
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-5 flex flex-col justify-between text-[7px] text-slate-300 dark:text-[#475569] font-semibold w-6">
                            <span>10</span><span>7.5</span><span>5</span><span>2.5</span><span>0</span>
                        </div>
                        {/* Grid lines */}
                        <div className="absolute left-6 right-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none">
                            {[0,1,2,3,4].map(i => <div key={i} className="border-t border-slate-100 dark:border-[#1A2D48] w-full" />)}
                        </div>
                        {/* Bars */}
                        <div className="absolute left-7 right-0 bottom-5 top-0 flex items-end gap-[3px]">
                            {rows.map((r, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0 h-full justify-end">
                                    <div className="flex gap-[2px] items-end w-full justify-center" style={{ height: 'calc(100% - 14px)' }}>
                                        {r.v1 != null && (
                                            <div className="rounded-t transition-all duration-500" style={{ width: '45%', height: `${(r.v1 / maxVal) * 100}%`, backgroundColor: activeDef.color }} title={`${activeDef.label}: ${r.v1}`} />
                                        )}
                                        {r.v2 != null && (
                                            <div className="rounded-t transition-all duration-500" style={{ width: '45%', height: `${(r.v2 / maxVal) * 100}%`, backgroundColor: compareDef.color }} title={`${compareDef.label}: ${r.v2}`} />
                                        )}
                                    </div>
                                    <span className="text-[7px] font-semibold text-slate-400 dark:text-[#CBD5E1] truncate w-full text-center" title={r.name}>{r.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        };

        // ── RENDER CHART BASED ON ACTIVE VIEW ──
        const renderChart = () => {
            switch (activeView) {
                case 'bar_sorted':   return renderBarSorted();
                case 'team_avg':     return renderTeamAvg();
                case 'distribution': return renderDistribution();
                case 'comparison':   return renderComparison();
                case 'trend':        return renderTrend();
                case 'histogram':    return renderHistogram();
                case 'donut':        return renderDonut();
                case 'count_bar':    return renderCountBar();
                default:             return renderBarSorted();
            }
        };

        // ── Empty state ──
        if (dailyResponses.length === 0) {
            return (
                <div className="p-16 border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl text-center bg-slate-50/50 dark:bg-[#132338]/40">
                    <BarChart3 size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 dark:text-[#CBD5E1] text-sm font-semibold uppercase tracking-wide mb-2">No daily responses yet</p>
                    <p className="text-slate-300 dark:text-[#475569] text-xs font-bold max-w-xs mx-auto">Share the Daily Wellness Check with your athletes to start collecting data.</p>
                </div>
            );
        }

        // ── MAIN RETURN ──
        return (
            <div className="space-y-6">
                {/* Controls: Metric picker + View toggle + Period/Date */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm p-5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                        {/* Metric pills */}
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Metric</div>
                            <div className="flex flex-wrap gap-1.5">
                                {METRIC_DEFS.map(m => (
                                    <button key={m.key} onClick={() => { setInsightMetric(m.key); setInsightView(VIEWS_FOR_TYPE[m.type]?.[0]?.id || 'bar_sorted'); }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                                            insightMetric === m.key
                                                ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                                                : 'border-slate-100 dark:border-[#1A2D48] bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] hover:border-slate-200 hover:text-slate-700'
                                        }`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* View toggle */}
                        <div className="shrink-0">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">View</div>
                            <div className="flex gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                                {viewOptions.map(v => (
                                    <button key={v.id} onClick={() => setInsightView(v.id)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                            activeView === v.id ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600'
                                        }`}>
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Compare-with dropdown (only for comparison view) */}
                        {activeView === 'comparison' && (
                            <div className="shrink-0">
                                <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Compare With</div>
                                <CustomSelect
                                    variant="filter"
                                    size="xs"
                                    value={insightCompareMetric}
                                    onChange={e => setInsightCompareMetric(e.target.value)}
                                >
                                    {METRIC_DEFS.filter(m => m.type === 'scale' && m.key !== insightMetric).map(m => (
                                        <option key={m.key} value={m.key}>{m.label}</option>
                                    ))}
                                </CustomSelect>
                            </div>
                        )}

                        {/* Period toggle + Date picker */}
                        {activeView !== 'trend' && (
                            <div className="shrink-0">
                                <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Time Range</div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                                        <button onClick={() => setInsightPeriodMode(false)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${!insightPeriodMode ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600'}`}>
                                            Single Day
                                        </button>
                                        <button onClick={() => setInsightPeriodMode(true)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${insightPeriodMode ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600'}`}>
                                            Period
                                        </button>
                                    </div>
                                    {!insightPeriodMode && (
                                        <CustomSelect
                                            variant="filter"
                                            size="xs"
                                            value={insightDate}
                                            onChange={e => setInsightDate(e.target.value)}
                                        >
                                            {availDates.map(d => (
                                                <option key={d} value={d}>{new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</option>
                                            ))}
                                        </CustomSelect>
                                    )}
                                    {insightPeriodMode && (
                                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600 px-3 py-1.5 rounded-lg">
                                            {wellnessDateRange === 'today' ? 'Today' : wellnessDateRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart card */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/40 dark:bg-[#0F1C30]/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeDef.color }} />
                            <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">{activeDef.label}</span>
                            <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-medium">
                                {activeView === 'trend'
                                    ? `${dailyResponses.length} total responses`
                                    : insightPeriodMode
                                        ? `${chartResponses.length} responses across period`
                                        : `${chartResponses.length} response${chartResponses.length !== 1 ? 's' : ''} — ${periodLabel}`
                                }
                            </span>
                            {insightPeriodMode && activeView === 'bar_sorted' && (
                                <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300">Avg per athlete</span>
                            )}
                        </div>
                        {activeDef.type === 'scale' && (
                            <span className={`text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                activeDef.negative ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-500'
                            }`}>
                                {activeDef.negative ? 'Lower is better' : 'Higher is better'}
                            </span>
                        )}
                    </div>
                    <div className="px-6 py-2 min-h-[200px]">
                        {renderChart()}
                    </div>
                </div>

                {/* Quick overview strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {METRIC_DEFS.filter(m => m.type === 'scale' || m.type === 'number').map(m => {
                        const vals = chartResponses.map(r => r.responses?.[m.key]).filter(v => typeof v === 'number');
                        const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
                        return (
                            <button key={m.key} onClick={() => { setInsightMetric(m.key); setInsightView('bar_sorted'); }}
                                className={`p-3 rounded-xl border transition-all text-left ${insightMetric === m.key ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50' : 'border-slate-100 dark:border-[#1A2D48] bg-white dark:bg-[#132338] hover:border-slate-200'}`}>
                                <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">{m.label}</div>
                                <div className="text-xl font-bold mt-0.5" style={{ color: m.color }}>
                                    {avg != null ? (m.key === 'sleep_hours' ? `${avg.toFixed(1)}h` : avg.toFixed(1)) : '—'}
                                </div>
                                {insightPeriodMode && <div className="text-[7px] text-slate-300 dark:text-[#475569] mt-0.5">avg across period</div>}
                            </button>
                        );
                    })}
                </div>

                {/* Deep Check Insights — aggregate panel for weekly/deep check data */}
                {weeklyResponses.length > 0 && (() => {
                    const URTI_KEYS = ['urti_hoarseness','urti_blocked_nose','urti_runny_nose','urti_sinus_pressure','urti_sneezing','urti_dry_cough','urti_wet_cough','urti_headache'];
                    const URTI_LABELS2: Record<string,string> = { urti_hoarseness:'Hoarseness', urti_blocked_nose:'Blocked Nose', urti_runny_nose:'Runny Nose', urti_sinus_pressure:'Sinus Pressure', urti_sneezing:'Sneezing', urti_dry_cough:'Dry Cough', urti_wet_cough:'Wet Cough', urti_headache:'Headache' };

                    // Infer path from matching daily response
                    const withPath = weeklyResponses.map(dc => {
                        const daily = dailyResponses.find(d => d.athlete_id === dc.athlete_id && d.session_date === dc.session_date);
                        const complaint = daily?.responses?.health_complaint;
                        const path = complaint === 'injury' ? 'injury' : complaint === 'illness' ? 'illness' : complaint === 'both' ? 'both' : 'trends';
                        return { ...dc, path };
                    });

                    const pathCounts = { injury: 0, illness: 0, both: 0, trends: 0 };
                    withPath.forEach(d => { pathCounts[d.path as keyof typeof pathCounts]++; });

                    // Hydration / nutrition averages
                    const hydVals = weeklyResponses.map(r => r.responses?.hydration).filter(v => typeof v === 'number');
                    const nutVals = weeklyResponses.map(r => r.responses?.nutrition).filter(v => typeof v === 'number');
                    const avgHyd = hydVals.length ? (hydVals.reduce((s:number,v:number) => s+v, 0)/hydVals.length).toFixed(1) : null;
                    const avgNut = nutVals.length ? (nutVals.reduce((s:number,v:number) => s+v, 0)/nutVals.length).toFixed(1) : null;

                    // Symptom frequency across illness-path checks
                    const illnessChecks = weeklyResponses.filter(dc => URTI_KEYS.some(k => (dc.responses?.[k] || 0) > 0));
                    const symptomFreq = URTI_KEYS.map(k => ({
                        label: URTI_LABELS2[k],
                        count: illnessChecks.filter(dc => (dc.responses?.[k] || 0) > 0).length,
                        avgSev: illnessChecks.length ? +(illnessChecks.reduce((s, dc) => s + (dc.responses?.[k] || 0), 0) / illnessChecks.length).toFixed(1) : 0,
                    })).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

                    const PATH_STYLES: Record<string,string> = { injury:'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40', illness:'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/40', both:'bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white border-indigo-100 dark:border-indigo-800/40', trends:'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]' };
                    const PATH_LABELS: Record<string,string> = { injury:'Injury', illness:'Illness', both:'Injury + Illness', trends:'Health Trends' };

                    return (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-indigo-50 shadow-sm p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-300">
                                        <Thermometer size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-[#E2E8F0]">Deep Check Insights</h3>
                                        <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-semibold mt-0.5">{weeklyResponses.length} deep check{weeklyResponses.length !== 1 ? 's' : ''} completed in period</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Path breakdown */}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-3">Check Paths</p>
                                    <div className="space-y-2">
                                        {Object.entries(pathCounts).filter(([,c]) => c > 0).map(([path, count]) => (
                                            <div key={path} className="flex items-center justify-between">
                                                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${PATH_STYLES[path]}`}>{PATH_LABELS[path]}</span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-[#E2E8F0]">{count}</span>
                                            </div>
                                        ))}
                                        {Object.values(pathCounts).every(c => c === 0) && (
                                            <p className="text-xs text-slate-300 dark:text-[#475569] italic">No path data</p>
                                        )}
                                    </div>
                                </div>

                                {/* Hydration + Nutrition */}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-3">Avg Scores (Team)</p>
                                    <div className="space-y-3">
                                        {avgHyd != null && (
                                            <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/40 rounded-xl">
                                                <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">Hydration</span>
                                                <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{avgHyd}<span className="text-xs font-medium text-cyan-400 dark:text-cyan-600">/10</span></span>
                                            </div>
                                        )}
                                        {avgNut != null && (
                                            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/40 rounded-xl">
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Nutrition</span>
                                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{avgNut}<span className="text-xs font-medium text-emerald-400 dark:text-emerald-600">/10</span></span>
                                            </div>
                                        )}
                                        {avgHyd == null && avgNut == null && <p className="text-xs text-slate-300 dark:text-[#475569] italic">No data</p>}
                                    </div>
                                </div>

                                {/* Symptom frequency */}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-3">
                                        Illness Symptoms{illnessChecks.length > 0 ? ` (${illnessChecks.length} checks)` : ''}
                                    </p>
                                    {symptomFreq.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {symptomFreq.map(s => (
                                                <div key={s.label} className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 dark:bg-[#1A2D48] rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-sky-400 h-full rounded-full" style={{ width: `${(s.count / illnessChecks.length) * 100}%` }} />
                                                    </div>
                                                    <span className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] w-20 truncate">{s.label}</span>
                                                    <span className="text-[9px] font-bold text-slate-700 dark:text-[#E2E8F0] w-6 text-right">{s.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-300 dark:text-[#475569] italic">No illness checks in period</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Individual breakdown table (only for single-day mode) */}
                {!insightPeriodMode && (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm overflow-hidden">
                        <div className="px-6 py-3 border-b border-slate-50 bg-slate-50/40 dark:bg-[#0F1C30]/40">
                            <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">Individual Breakdown — {periodLabel}</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/30 dark:bg-[#0F1C30]/30">
                                        <th className="px-4 py-2.5 text-left font-semibold text-slate-500 dark:text-[#CBD5E1]">Athlete</th>
                                        {METRIC_DEFS.filter(m => m.type === 'scale').map(m => (
                                            <th key={m.key} className="px-3 py-2.5 text-center font-semibold text-slate-500 dark:text-[#CBD5E1]">{m.label}</th>
                                        ))}
                                        <th className="px-3 py-2.5 text-center font-semibold text-slate-500 dark:text-[#CBD5E1]">Sleep</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-slate-500 dark:text-[#CBD5E1]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {dateResponses.map(r => {
                                        const a = athletes.find(att => att.id === r.athlete_id);
                                        const resp = r.responses || {};
                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50/50 dark:bg-[#132338]/40 transition-colors cursor-pointer"
                                                onClick={() => openAthlete(r.athlete_id)}>
                                                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-[#E2E8F0]">{a?.name || 'Unknown'}</td>
                                                {METRIC_DEFS.filter(m => m.type === 'scale').map(m => {
                                                    const v = resp[m.key];
                                                    const bg = v == null ? '' :
                                                        m.negative
                                                            ? v <= 3 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : v <= 6 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                            : v >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : v >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
                                                    return (
                                                        <td key={m.key} className="px-3 py-2.5 text-center">
                                                            {v != null ? <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${bg}`}>{v}</span> : <span className="text-slate-200">—</span>}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-3 py-2.5 text-center">
                                                    {resp.sleep_hours != null
                                                        ? <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${resp.sleep_hours >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : resp.sleep_hours >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{resp.sleep_hours}h</span>
                                                        : <span className="text-slate-200">—</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                                                        resolveAvailability(r) === 'available' ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-600' :
                                                        resolveAvailability(r) === 'modified' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-rose-100 text-rose-600'
                                                    }`}>{resolveAvailability(r)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderDashboard = () => (
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
                        <input
                            type="date"
                            value={rundownAsOfDate}
                            max={TODAY}
                            onChange={e => setRundownAsOfDate(e.target.value || TODAY)}
                            className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1] outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-300 transition-all"
                        />
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
                                <input type="date" value={responseViewDate} onChange={e => setResponseViewDate(e.target.value)} max={TODAY}
                                    className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1] outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all"
                                />
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
                                            <tr key={res.id} className={`group transition-colors border-t border-slate-50 ${isChecked ? 'bg-indigo-50/40 dark:bg-indigo-900/20' : 'hover:bg-slate-50/50 dark:bg-[#132338]/40'}`}>
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
                                                        <tr key={r.id} className="border-t border-amber-50 hover:bg-amber-50/30 transition-colors">
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
                                                        <tr key={r.id} className="border-t border-slate-50 hover:bg-slate-50/40 dark:bg-[#0F1C30]/40 transition-colors">
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
                                                <tr key={dc.id} className="group hover:bg-slate-50/50 dark:bg-[#132338]/40 transition-colors border-t border-slate-50">
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
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:text-slate-800 transition-colors"
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
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:text-slate-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                            : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-200'
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
            {dashboardTab === 'insights' && renderInsightsTab()}

        </div>
    );

    // ── ATHLETE VIEW ─────────────────────────────────────────────────────────
    const renderAthleteView = () => {
        // Separate latest daily and latest weekly for this athlete
        const dailyRes = [...filteredResponses]
            .filter(r => r.athlete_id === selectedAthleteId && r.tier !== 'weekly')
            .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))[0];
        const weeklyRes = [...wellnessResponses]
            .filter(r => r.athlete_id === selectedAthleteId && r.tier === 'weekly')
            .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))[0];
        const res    = dailyRes;
        const status = getAthleteStatus(res);

        return (
            <div className="space-y-4 animate-in slide-in-from-right-8 duration-500">
                {/* Header — compressed: smaller back, smaller avatar, tighter padding.
                    Makes room for the new history sections below without bloating page height. */}
                <div className="bg-white dark:bg-[#132338] p-4 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setViewMode('dashboard')}
                            className="w-9 h-9 bg-slate-50 dark:bg-[#0F1C30] rounded-lg flex items-center justify-center text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-900 transition-all"
                        >
                            <ArrowLeft size={16} />
                        </button>
                        <div className="flex items-center gap-3">
                            <AthleteAvatar
                                player={activeAthlete || { name: '?' }}
                                size="lg"
                                shape="rounded-lg"
                                className="w-11 h-11 border-2 border-white dark:border-[#132338] shadow-sm ring-1 ring-slate-100 dark:ring-[#243A58]"
                                fallbackClass="bg-indigo-100 dark:bg-indigo-600 text-indigo-600 dark:text-indigo-300"
                                fallbackTextSize="text-sm"
                            />
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0] tracking-tight leading-tight">{activeAthlete?.name}</h2>
                                    {status && (
                                        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]} shadow-sm`} />
                                    )}
                                </div>
                                <p className="text-slate-400 dark:text-[#CBD5E1] font-bold uppercase text-[9px] tracking-wide leading-tight">
                                    {activeAthlete?.subsection} • Individual Profile
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Availability badge */}
                    {(() => {
                        const avail = resolveAvailability(res);
                        if (!avail) return null;
                        const cls = avail === 'available' ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40'
                                  : avail === 'modified'  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-100 dark:border-amber-800/40'
                                                          : 'bg-rose-50 dark:bg-rose-700 text-rose-600 dark:text-white border border-rose-100 dark:border-rose-900/40';
                        const label = avail === 'available' ? 'Full Training' : avail === 'modified' ? 'Modified Training' : 'Unavailable';
                        return <span className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{label}</span>;
                    })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Entry Analysis */}
                    <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm space-y-4">
                        <h3 className="text-sm font-semibold uppercase text-slate-900 dark:text-[#E2E8F0]">Entry Analysis</h3>
                        {(dailyRes || weeklyRes) ? (() => {
                            const complaint = dailyRes?.responses?.health_complaint;
                            // Show injury section if daily flagged injury OR if a deep check has an injury path
                            const weeklyHasInjury = weeklyRes?.responses?.problem_type === 'injury' || weeklyRes?.responses?.problem_type === 'both';
                            const hasInjury = complaint === 'injury' || complaint === 'both' || weeklyHasInjury;
                            // Show illness section if daily flagged illness OR if a deep check has URTI/illness data
                            const weeklyHasIllness = weeklyRes != null && (
                                weeklyRes.responses?.problem_type === 'illness' ||
                                weeklyRes.responses?.problem_type === 'both' ||
                                Object.keys(weeklyRes.responses || {}).some(k => k.startsWith('urti_') && (weeklyRes.responses[k] || 0) > 0)
                            );
                            const hasIllness = complaint === 'illness' || complaint === 'both' || weeklyHasIllness;

                            // Helper: numeric chip
                            const NumChip = ({ id, val, max, label }: { id: string; val: number; max: number | null; label: string; key?: string }) => {
                                const qLow = id.toLowerCase();
                                const isHighBad = ['rpe', 'stress', 'fatigue', 'soreness'].some(k => qLow.includes(k));
                                const isHighGood = ['energy', 'motivation', 'sleep', 'hydration', 'nutrition', 'mood'].some(k => qLow.includes(k));
                                const pct = max ? val / max : 0;
                                let chipColor = 'bg-slate-50 dark:bg-[#0F1C30] text-slate-700 dark:text-[#E2E8F0] border-slate-100 dark:border-[#1A2D48]';
                                if (isHighBad && max) {
                                    chipColor = pct >= 0.8 ? 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' : pct >= 0.6 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' : 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40';
                                } else if (isHighGood && max) {
                                    chipColor = pct <= 0.4 ? 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' : pct <= 0.6 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' : 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40';
                                }
                                return (
                                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold ${chipColor}`}>
                                        <span className="uppercase tracking-tight text-[9px] font-bold opacity-60">{label.slice(0, 18)}</span>
                                        <span className="text-sm">{val}</span>
                                        {max && <span className="text-[8px] font-medium opacity-40">/ {max}</span>}
                                    </div>
                                );
                            };

                            // Helper: string pill (categorical)
                            const StrPill = ({ label, val, colorMap }: { label: string; val: string; colorMap?: Record<string, string> }) => {
                                const defaultCls = 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]';
                                const cls = colorMap?.[val] || defaultCls;
                                return (
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wide ${cls}`}>
                                        <span className="opacity-50">{label}</span>
                                        <span>{val.replace(/_/g, ' ')}</span>
                                    </div>
                                );
                            };

                            const READINESS_COLORS: Record<string, string> = {
                                ready: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40',
                                compromised: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40',
                                not_ready: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40',
                            };
                            const SEVERITY_COLORS: Record<string, string> = {
                                mild: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40',
                                moderate: 'bg-rose-50 dark:bg-rose-700 text-rose-600 dark:text-white border-rose-100 dark:border-rose-900/40',
                                severe: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40',
                            };
                            const TREND_COLORS: Record<string, string> = {
                                improving: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40',
                                stable: 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]',
                                declining: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40',
                                worsening: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40',
                            };
                            const URTI_LABELS: Record<string, string> = {
                                urti_hoarseness: 'Hoarseness', urti_blocked_nose: 'Blocked Nose', urti_runny_nose: 'Runny Nose',
                                urti_sinus_pressure: 'Sinus Pressure', urti_sneezing: 'Sneezing', urti_dry_cough: 'Dry Cough',
                                urti_wet_cough: 'Wet Cough', urti_headache: 'Headache',
                            };
                            const URTI_SEVERITY = ['None', 'Mild', 'Moderate', 'Severe'];

                            const dailyResp = dailyRes?.responses || {};
                            const weeklyResp = weeklyRes?.responses || {};

                            const urtiFields = Object.keys(URTI_LABELS).filter(k => weeklyResp[k] != null && weeklyResp[k] > 0);

                            return (
                                <div className="space-y-5">
                                    {/* Daily wellness metrics */}
                                    {dailyRes && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-3">Daily Wellness</p>
                                            <div className="flex flex-wrap gap-2">
                                                {dailyResp.readiness && (
                                                    <StrPill label="Readiness" val={dailyResp.readiness} colorMap={READINESS_COLORS} />
                                                )}
                                                {(['fatigue','soreness','sleep_quality','stress','mood'] as const).map(k =>
                                                    typeof dailyResp[k] === 'number' ? (
                                                        <NumChip key={k} id={k} val={dailyResp[k] as number} max={10} label={k.replace(/_/g,' ')} />
                                                    ) : null
                                                )}
                                                {typeof dailyResp.sleep_hours === 'number' && (
                                                    <NumChip id="sleep_hours" val={dailyResp.sleep_hours} max={12} label="Sleep hrs" />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Injury section */}
                                    {hasInjury && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-rose-400 mb-3 flex items-center gap-1.5">
                                                <AlertTriangle size={10} /> Injury
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                <StrPill label="Complaint" val="Injury flagged" colorMap={{ 'Injury flagged': 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' }} />
                                                {dailyRes?.injury_report?.areas?.map((a: any) => (
                                                    <span key={a.area} className="px-3 py-1.5 rounded-xl border text-[10px] font-bold bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40 uppercase">
                                                        {a.area.replace(/_/g,' ')}
                                                    </span>
                                                ))}
                                                {/* Injury classification details from deep check */}
                                                {weeklyHasInjury && weeklyResp.onset && (
                                                    <StrPill label="Onset" val={weeklyResp.onset} colorMap={{ sudden: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40', gradual: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40' }} />
                                                )}
                                                {weeklyHasInjury && weeklyResp.status && (
                                                    <StrPill label="Status" val={weeklyResp.status} colorMap={{ new: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40', recurrence: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40', exacerbation: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' }} />
                                                )}
                                                {weeklyHasInjury && weeklyResp.impact && weeklyResp.impact !== 'none' && (
                                                    <StrPill label="Impact" val={weeklyResp.impact} colorMap={{ minor: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40', moderate: 'bg-rose-50 dark:bg-rose-700 text-rose-600 dark:text-white border-rose-100 dark:border-rose-900/40', severe: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' }} />
                                                )}
                                                {weeklyHasInjury && weeklyResp.time_loss && weeklyResp.time_loss !== '0' && (
                                                    <StrPill label="Time loss" val={weeklyResp.time_loss} colorMap={{}} />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Illness section */}
                                    {hasIllness && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-sky-400 mb-3 flex items-center gap-1.5">
                                                <Thermometer size={10} /> Illness
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {dailyResp.illness_severity && (
                                                    <StrPill label="Severity" val={dailyResp.illness_severity} colorMap={SEVERITY_COLORS} />
                                                )}
                                                {/* URTI symptoms from weekly if present */}
                                                {urtiFields.map(k => (
                                                    <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/40">
                                                        <span className="opacity-50">{URTI_LABELS[k]}</span>
                                                        <span>{URTI_SEVERITY[weeklyResp[k]] || weeklyResp[k]}</span>
                                                    </div>
                                                ))}
                                                {weeklyResp.illness_impact && weeklyResp.illness_impact !== 'none' && (
                                                    <StrPill label="Impact" val={weeklyResp.illness_impact} colorMap={{ no_impact: 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/40', minor: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-800/40', moderate: 'bg-rose-50 dark:bg-rose-700 text-rose-600 dark:text-white border-rose-100 dark:border-rose-900/40', severe: 'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40' }} />
                                                )}
                                                {weeklyResp.illness_time_loss && weeklyResp.illness_time_loss !== '0' && (
                                                    <StrPill label="Time loss" val={weeklyResp.illness_time_loss} colorMap={{}} />
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Weekly health data */}
                                    {weeklyRes && (
                                        <div className="border-t border-slate-100 dark:border-[#1A2D48] pt-4">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-400 mb-3">Deep Health Report</p>
                                            <div className="flex flex-wrap gap-2">
                                                {typeof weeklyResp.hydration === 'number' && (
                                                    <NumChip id="hydration" val={weeklyResp.hydration} max={10} label="Hydration" />
                                                )}
                                                {typeof weeklyResp.nutrition === 'number' && (
                                                    <NumChip id="nutrition" val={weeklyResp.nutrition} max={10} label="Nutrition" />
                                                )}
                                                {weeklyResp.sleep_trend && (
                                                    <StrPill label="Sleep trend" val={weeklyResp.sleep_trend} colorMap={TREND_COLORS} />
                                                )}
                                                {weeklyResp.fatigue_trend && (
                                                    <StrPill label="Fatigue trend" val={weeklyResp.fatigue_trend} colorMap={TREND_COLORS} />
                                                )}
                                                {Array.isArray(weeklyResp.stress_sources) && weeklyResp.stress_sources.filter((s: string) => s !== 'None').length > 0 && (
                                                    <div className="w-full flex flex-wrap gap-1.5 mt-1">
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] w-full">Stress sources</span>
                                                        {weeklyResp.stress_sources.filter((s: string) => s !== 'None').map((s: string) => (
                                                            <span key={s} className="px-2.5 py-1 rounded-lg border text-[10px] font-semibold bg-pink-50 text-pink-700 border-pink-100">{s}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })() : (
                            <div className="p-10 text-center border-2 border-dashed border-slate-100 dark:border-[#1A2D48] rounded-xl">
                                <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-sm font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">No response for this date range.</p>
                            </div>
                        )}
                    </div>

                    {/* Body Map + Per-Area Injury Details — compressed p-8/space-y-6 → p-5/space-y-4 */}
                    <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase text-slate-900 dark:text-[#E2E8F0] flex items-center gap-2">
                                <Activity size={18} className="text-rose-500" /> Niggles & Injuries
                            </h3>
                            {res?.injury_report && (
                                <span className="px-3 py-1 bg-rose-500 text-white rounded-lg text-[10px] font-semibold uppercase">Flagged</span>
                            )}
                        </div>

                        <div className="relative aspect-[3/4] max-w-[320px] mx-auto bg-slate-50 dark:bg-[#0F1C30] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl p-8 overflow-hidden">
                            <img src="/body-image.jpeg" className="w-full h-full object-contain opacity-30 grayscale contrast-125" alt="Body Map" />
                            <div className="absolute inset-0 p-8 flex flex-wrap content-start justify-center gap-3">
                                {res?.injury_report?.areas?.map((area: BodyMapArea, idx: number) => (
                                    <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-white font-semibold text-xs shadow-lg animate-in zoom-in-50 ${
                                        area.severity === 3 ? 'bg-rose-600 border-rose-400' :
                                        area.severity === 2 ? 'bg-rose-400 border-rose-300' :
                                                              'bg-amber-400 border-amber-300'
                                    }`}>
                                        {area.area}
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/80 dark:bg-[#132338]/80 animate-ping" />
                                    </div>
                                ))}
                                {(!res?.injury_report || res.injury_report.areas.length === 0) && (
                                    <div className="flex flex-col items-center justify-center h-full w-full text-center opacity-30">
                                        <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">All Clear</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Per-area injury follow-up details
                            (When an athlete has injuries flagged, each affected body area
                            gets its own card here listing Nature, When, Mechanism, Side,
                            and Interrupted Training — populated from the deep check
                            follow-up answers tied to that area.) */}
                        {res?.injury_report?.areas?.length > 0 && (() => {
                            const followUpIds = ['injury_type', 'injury_timing', 'injury_mechanism', 'injury_side', 'training_interruption'];
                            const followUpLabels: Record<string, string> = {
                                injury_type: 'Nature', injury_timing: 'When', injury_mechanism: 'Mechanism',
                                injury_side: 'Side', training_interruption: 'Interrupted Training',
                            };
                            return (
                                <div className="space-y-3 mt-2">
                                    {res.injury_report.areas.map((area: BodyMapArea) => {
                                        // Check compound keys first (new format), fall back to flat keys (legacy)
                                        const details = followUpIds
                                            .map(fid => {
                                                const val = res.responses[`${fid}__${area.area}`] ?? res.responses[fid];
                                                return val ? { label: followUpLabels[fid] || fid, value: val } : null;
                                            })
                                            .filter(Boolean) as { label: string; value: any }[];

                                        if (details.length === 0) return null;

                                        return (
                                            <div key={area.area} className="p-4 bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48] rounded-xl space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                        area.severity === 3 ? 'bg-rose-500' : area.severity === 2 ? 'bg-rose-400' : 'bg-amber-400'
                                                    }`} />
                                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-700 dark:text-[#E2E8F0]">
                                                        {area.area.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {details.map(d => (
                                                        <div key={d.label} className="px-2.5 py-1 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg">
                                                            <span className="text-[8px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] block">{d.label}</span>
                                                            <span className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">{String(d.value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Wellness Trends — third tile in the row, 7-day compact view.
                        Compact prop keeps chart/labels narrow so the tile fits a
                        ~⅓-column at lg+. Below lg it stacks underneath the others. */}
                    <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm">
                        <h3 className="text-sm font-semibold uppercase text-slate-900 dark:text-[#E2E8F0] mb-3">Wellness Trends</h3>
                        {selectedAthleteId && activeAthlete && (
                            <WellnessSparklines
                                athleteId={selectedAthleteId}
                                athleteName={activeAthlete.name}
                                responses={wellnessResponses}
                                days={7}
                                compact
                            />
                        )}
                    </div>
                </div>

                {/* ── HISTORY SECTIONS — three collapsible cards. Each defaults closed
                    so the page stays compact; sport scientists expand what they need.
                    Per-section range filter (7/30/90d/All) sits next to each chevron. */}
                {selectedAthleteId && (() => {
                    // Per-section windowed lists. All anchored to today.
                    const todayKey = TODAY;
                    const inLastNDays = (d: string | null | undefined, n: number) => {
                        if (!d) return false;
                        const day = d.slice(0, 10);
                        if (n >= 9999) return true;
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - (n - 1));
                        const cut = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
                        return day >= cut && day <= todayKey;
                    };

                    const dailyHistAll = (wellnessResponses || [])
                        .filter(r => r.athlete_id === selectedAthleteId && r.tier !== 'weekly')
                        .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
                    const weeklyHistAll = (wellnessResponses || [])
                        .filter(r => r.athlete_id === selectedAthleteId && r.tier === 'weekly')
                        .sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''));
                    const flagHistAll = [...athleteFlagHistory]
                        .sort((a, b) => (b.flag_date || '').localeCompare(a.flag_date || ''));

                    const dailyHist  = dailyHistAll.filter(r => inLastNDays(r.session_date, historyDailyDays));
                    const weeklyHist = weeklyHistAll.filter(r => inLastNDays(r.session_date, historyWeeklyDays));
                    const flagHist   = flagHistAll.filter(f => inLastNDays(f.flag_date, historyFlagDays));

                    const pendingFlags = flagHistAll.filter(f => !f.weekly_completed).length;

                    // Render a range-toggle chip group (used by all three sections)
                    const renderRangeChips = (current: number, setter: (n: number) => void, accent: string) => (
                        <div className="flex items-center gap-1 flex-wrap">
                            {HISTORY_RANGE_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={e => { e.stopPropagation(); setter(opt.id); }}
                                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                                        current === opt.id
                                            ? `${accent} text-white`
                                            : 'bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243A58]'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    );

                    // ── Card 1: Daily Responses History ──────────────────────────────
                    // 3-col side-by-side on lg+. Each row body is sparse (date + a
                    // few tiny pills) — stacking wasted ~⅔ of the width. `items-start`
                    // keeps cards independent height (no stretch-to-tallest).
                    return (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                        <div className="bg-white dark:bg-[#132338] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setIsDailyHistOpen(v => !v)}
                                    className="flex items-center gap-2 mr-auto text-left hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                                >
                                    <div className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isDailyHistOpen ? '' : '-rotate-90'}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-tight">Daily Responses History</h4>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8]">
                                        · {dailyHistAll.length} {dailyHistAll.length === 1 ? 'entry' : 'entries'}
                                    </span>
                                </button>
                                {isDailyHistOpen && renderRangeChips(historyDailyDays, setHistoryDailyDays, 'bg-indigo-600')}
                            </div>
                            {isDailyHistOpen && (
                                <div className="border-t border-slate-100 dark:border-[#1A2D48] divide-y divide-slate-50 dark:divide-[#1A2D48] max-h-96 overflow-y-auto">
                                    {dailyHist.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase">No daily responses in this window</div>
                                    ) : dailyHist.slice(0, 100).map(r => {
                                        const resp = r.responses || {};
                                        const avail = resolveAvailability(r);
                                        const sleepH = resp.sleep_hours;
                                        return (
                                            <div key={r.id} className="px-4 py-2 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/40 transition-colors">
                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0] min-w-[80px] tabular-nums">
                                                    {r.session_date ? new Date(r.session_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                                                </span>
                                                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                                    {avail && (
                                                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                                            avail === 'available' ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300' :
                                                            avail === 'modified'  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' :
                                                                                    'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                                                        }`}>{avail === 'available' ? 'Full' : avail === 'modified' ? 'Mod' : 'Out'}</span>
                                                    )}
                                                    {resp.fatigue != null && <span className="text-[9px] text-slate-600 dark:text-[#CBD5E1]">Fat {resp.fatigue}</span>}
                                                    {resp.soreness != null && <span className="text-[9px] text-slate-600 dark:text-[#CBD5E1]">Sor {resp.soreness}</span>}
                                                    {sleepH != null && <span className="text-[9px] text-slate-600 dark:text-[#CBD5E1]">Slp {sleepH}h</span>}
                                                    {resp.stress != null && <span className="text-[9px] text-slate-600 dark:text-[#CBD5E1]">Str {resp.stress}</span>}
                                                    {resp.health_complaint && resp.health_complaint !== 'no' && (
                                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300">{resp.health_complaint}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {dailyHist.length > 100 && (
                                        <div className="px-4 py-2 text-center text-[9px] text-slate-400 dark:text-[#94A3B8]">
                                            Showing 100 most recent of {dailyHist.length} entries. Narrow the range to see older context.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Card 2: Deep Checks History ────────────────────────────── */}
                        <div className="bg-white dark:bg-[#132338] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setIsWeeklyHistOpen(v => !v)}
                                    className="flex items-center gap-2 mr-auto text-left hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                                >
                                    <div className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isWeeklyHistOpen ? '' : '-rotate-90'}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-tight">Deep Checks History</h4>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8]">
                                        · {weeklyHistAll.length} weekly {weeklyHistAll.length === 1 ? 'entry' : 'entries'}
                                    </span>
                                </button>
                                {isWeeklyHistOpen && renderRangeChips(historyWeeklyDays, setHistoryWeeklyDays, 'bg-violet-600')}
                            </div>
                            {isWeeklyHistOpen && (
                                <div className="border-t border-slate-100 dark:border-[#1A2D48] divide-y divide-slate-50 dark:divide-[#1A2D48] max-h-96 overflow-y-auto">
                                    {weeklyHist.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase">No deep checks in this window</div>
                                    ) : weeklyHist.slice(0, 100).map(r => {
                                        const resp = r.responses || {};
                                        const followup = resp.weekly_followup;
                                        const problemType = resp.problem_type;
                                        return (
                                            <div key={r.id} className="px-4 py-2 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/40 transition-colors">
                                                <span className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0] min-w-[80px] tabular-nums">
                                                    {r.session_date ? new Date(r.session_date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                                                </span>
                                                <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                                                    {problemType && (
                                                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300">{problemType}</span>
                                                    )}
                                                    {followup && (
                                                        <span className="text-[9px] text-slate-600 dark:text-[#CBD5E1]">Follow-up: {followup.replace(/_/g, ' ')}</span>
                                                    )}
                                                    {!problemType && !followup && (
                                                        <span className="text-[9px] text-slate-400 dark:text-[#94A3B8] italic">Submitted</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {weeklyHist.length > 100 && (
                                        <div className="px-4 py-2 text-center text-[9px] text-slate-400 dark:text-[#94A3B8]">
                                            Showing 100 most recent of {weeklyHist.length} entries.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Card 3: Flag History — grouped by date, pills per trigger ──── */}
                        <div className="bg-white dark:bg-[#132338] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl shadow-sm overflow-hidden">
                            <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setIsFlagHistOpen(v => !v)}
                                    className="flex items-center gap-2 mr-auto text-left hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                                >
                                    <div className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isFlagHistOpen ? '' : '-rotate-90'}`}>
                                        <ChevronDown size={14} />
                                    </div>
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-tight">Flag History</h4>
                                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8]">
                                        · {flagHistAll.length} {flagHistAll.length === 1 ? 'flag' : 'flags'}
                                        {/* Dropped "(N pending)" — pending is the default state; the
                                            count is redundant with the total flag count and only
                                            meaningful as "done" when actioned. Surface done count
                                            instead when any have been completed. */}
                                        {pendingFlags < flagHistAll.length && flagHistAll.length > 0 && (
                                            <> · {flagHistAll.length - pendingFlags} done</>
                                        )}
                                    </span>
                                </button>
                                {isFlagHistOpen && renderRangeChips(historyFlagDays, setHistoryFlagDays, 'bg-rose-600')}
                            </div>
                            {isFlagHistOpen && (
                                <div className="border-t border-slate-100 dark:border-[#1A2D48] max-h-96 overflow-y-auto">
                                    {flagHist.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase">No flags in this window</div>
                                    ) : (() => {
                                        // Group by date desc
                                        const groups: { date: string; flags: any[] }[] = [];
                                        for (const f of flagHist) {
                                            const g = groups.find(x => x.date === f.flag_date);
                                            if (g) g.flags.push(f);
                                            else groups.push({ date: f.flag_date, flags: [f] });
                                        }
                                        return groups.map(g => {
                                            const topSeverity = g.flags.some(f => f.flag_type === 'red') ? 'red' : 'amber';
                                            const allCompleted = g.flags.every(f => f.weekly_completed);
                                            return (
                                                <div key={g.date} className="px-4 py-2 flex items-center gap-3 hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/40 transition-colors border-b border-slate-50 dark:border-[#1A2D48]">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${topSeverity === 'red' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                                    <span className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0] min-w-[80px] tabular-nums">
                                                        {new Date(g.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                    </span>
                                                    <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                                                        {g.flags.map((f, i) => (
                                                            <span
                                                                key={i}
                                                                className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
                                                                    f.flag_type === 'red'
                                                                        ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40'
                                                                        : 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40'
                                                                }`}
                                                            >
                                                                {f.trigger_field}: {f.trigger_value}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {/* Per-row "Pending" tag dropped — every row would carry
                                                        it (pending is the default state until follow-up is
                                                        completed). Pending count surfaces in the section
                                                        header. Only "Done" badge renders when actioned. */}
                                                    {allCompleted && (
                                                        <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Done</span>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>
                        </div>
                    );
                })()}
            </div>
        );
    };

    // ── SHARE PANEL ──────────────────────────────────────────────────────────
    const renderSharePanel = () => {
        const previewLink = selectedTemplate
            ? selectedTemplate.id === '__wellness_check__'
                ? `${window.location.origin}/daily-wellness/${selectedTeamId}`
                : selectedTemplate.id === '__weekly_health__'
                    ? `${window.location.origin}/weekly-wellness/${selectedTeamId}`
                    : `${window.location.origin}/wellness-form/${selectedTemplate.id}/${selectedTeamId}`
            : '';

        const todayStr = localDateStr();
        const isBuiltInTemplate = selectedTemplate?.id === '__wellness_check__' || selectedTemplate?.id === '__weekly_health__';
        // Built-in forms are always "tracked" — they're permanent links, responses are recorded by date
        const isTrackedToday = isBuiltInTemplate || shareSessions.some(s => s.shared_at?.split('T')[0] === todayStr);

        const handleCopy = async () => {
            if (!previewLink) return;
            await navigator.clipboard.writeText(previewLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        };

        const handleWhatsApp = () => {
            if (!previewLink) return;
            const waUrl = `https://wa.me/?text=${encodeURIComponent(`Complete your wellness check-in here: ${previewLink}`)}`;
            window.open(waUrl, '_blank', 'noopener,noreferrer');
        };

        const handleTrackToday = async () => {
            if (!selectedTemplate || !selectedTeamId || isTrackedToday) return;
            try {
                setSharingInProgress(true);
                const session = await DatabaseService.createShareSession(selectedTemplate.id, selectedTeamId);
                setShareSessions(prev => [{ id: session.id, template_id: selectedTemplate.id, shared_at: new Date().toISOString() }, ...prev]);
            } catch (err) {
                console.error('Failed to create tracking session:', err);
            } finally {
                setSharingInProgress(false);
            }
        };

        return (
            <div className="space-y-8 animate-in zoom-in-95 duration-500 max-w-4xl mx-auto">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setViewMode('dashboard')}
                        className="w-12 h-12 bg-white dark:bg-[#132338] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] hover:text-slate-900 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-semibold text-slate-900 dark:text-[#E2E8F0] tracking-tighter">Share Check-in Link</h2>
                        <p className="text-slate-400 dark:text-[#CBD5E1] font-bold uppercase text-[10px] tracking-wide mt-1">
                            Share link and track daily responses
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Template list + create card */}
                    <div data-tour="share-template-picker" className="space-y-4">
                        <label className="text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide ml-1">Select Questionnaire</label>
                        <div className="space-y-3">
                            {/* Built-in: Daily Wellness Check */}
                            <div
                                onClick={() => setSelectedTemplate({ id: '__wellness_check__', name: 'Wellness Check', questions: [] })}
                                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                    selectedTemplate?.id === '__wellness_check__'
                                        ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 dark:shadow-none text-white'
                                        : 'bg-white dark:bg-[#132338] border-indigo-100 dark:border-indigo-800/40 text-slate-900 dark:text-[#E2E8F0] hover:border-indigo-200'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTemplate?.id === '__wellness_check__' ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300'}`}>
                                        <Activity size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-base">Wellness Check</div>
                                        <div className={`text-[9px] font-bold uppercase tracking-wide ${selectedTemplate?.id === '__wellness_check__' ? 'text-indigo-100' : 'text-indigo-400'}`}>
                                            Daily check-in · 8 questions · &lt;2 min
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Built-in: Deep Health Check */}
                            <div
                                onClick={() => setSelectedTemplate({ id: '__weekly_health__', name: 'Deep Health Check', questions: [] })}
                                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                    selectedTemplate?.id === '__weekly_health__'
                                        ? 'bg-amber-600 border-amber-600 shadow-xl shadow-amber-200 dark:shadow-none text-white'
                                        : 'bg-white dark:bg-[#132338] border-amber-100 dark:border-amber-800/40 text-slate-900 dark:text-[#E2E8F0] hover:border-amber-200'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTemplate?.id === '__weekly_health__' ? 'bg-white/20' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}>
                                        <ShieldIcon size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-base">Deep Health Check</div>
                                        <div className={`text-[9px] font-bold uppercase tracking-wide ${selectedTemplate?.id === '__weekly_health__' ? 'text-amber-100' : 'text-amber-400'}`}>
                                            Deep check · FIFA/IOC aligned · 2–5 min
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Custom templates */}
                            {wellnessTemplates.map((t: any) => {
                                const isSelected = selectedTemplate?.id === t.id;
                                return (
                                    <div
                                        key={t.id}
                                        onClick={() => setSelectedTemplate(isSelected ? null : t)}
                                        className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                            isSelected
                                                ? 'bg-cyan-600 border-cyan-600 shadow-xl shadow-cyan-200 dark:shadow-none text-white'
                                                : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] hover:border-cyan-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-400 dark:text-[#CBD5E1]'}`}>
                                                    <ClipboardList size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-base">{t.name || t.title}</div>
                                                    <div className={`text-[9px] font-bold uppercase tracking-wide ${isSelected ? 'text-cyan-100' : 'text-slate-400 dark:text-[#CBD5E1]'}`}>
                                                        {t.questions?.length || 0} questions
                                                    </div>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 size={18} />
                                                    <div className="w-6 h-6 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center transition-all" title="Deselect">
                                                        <X size={12} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Create new template card */}
                            <div
                                onClick={() => setViewMode('templates')}
                                className="p-5 rounded-xl border-2 border-dashed border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40 hover:border-slate-300 hover:bg-white transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] flex items-center justify-center text-slate-300 dark:text-[#475569] group-hover:text-slate-500 transition-colors">
                                        <Plus size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm text-slate-500 dark:text-[#CBD5E1] group-hover:text-slate-700 dark:group-hover:text-[#CBD5E1] transition-colors">Create New Template</div>
                                        <div className="text-[9px] font-bold uppercase tracking-wide text-slate-300 dark:text-[#475569]">
                                            Build a custom questionnaire to share
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Link panel — only shown when a template is selected */}
                    <div className="flex flex-col">
                        {selectedTemplate ? (
                            <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-xl p-8 flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
                                {/* Link ready indicator */}
                                <div className="flex flex-col items-center text-center gap-3 py-6">
                                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/25 border-2 border-emerald-100 dark:border-emerald-800/40 rounded-xl flex items-center justify-center">
                                        <Link2 size={28} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-[#E2E8F0] text-lg">Link Ready</p>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mt-1">
                                            {selectedTemplate.name || selectedTemplate.title} · {activeTeam?.name}
                                        </p>
                                    </div>
                                </div>

                                {/* URL preview row */}
                                <div className="bg-slate-50 dark:bg-[#0F1C30] border-2 border-slate-100 dark:border-[#1A2D48] rounded-xl p-4 flex items-center gap-3">
                                    <p className="text-[10px] font-mono text-slate-400 dark:text-[#CBD5E1] truncate flex-1">{previewLink}</p>
                                    <button
                                        onClick={handleCopy}
                                        className={`p-2 rounded-lg border transition-all shrink-0 ${copied ? 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50 text-emerald-600' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:text-cyan-600 hover:border-cyan-200'}`}
                                    >
                                        {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>

                                {/* Share actions */}
                                <div data-tour="share-actions" className="flex flex-col gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="w-full py-3.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-indigo-500 dark:hover:bg-indigo-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <Copy size={14} /> {copied ? 'Copied!' : 'Copy Link'}
                                    </button>
                                    <button
                                        onClick={handleWhatsApp}
                                        className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-[#1ebe5d] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={14} /> Share via WhatsApp
                                    </button>
                                </div>

                                {/* Tracking */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-px bg-slate-100 dark:bg-[#1A2D48] flex-1" />
                                        <span className="text-[9px] font-bold text-slate-300 dark:text-[#475569] uppercase tracking-wide">Response Tracking</span>
                                        <div className="h-px bg-slate-100 dark:bg-[#1A2D48] flex-1" />
                                    </div>
                                    {isTrackedToday ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/25 border-2 border-emerald-100 dark:border-emerald-800/40 rounded-xl p-4 text-center space-y-1">
                                            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 size={16} />
                                                <span className="text-xs font-bold uppercase tracking-wide">Tracking Today</span>
                                            </div>
                                            <p className="text-[9px] font-semibold text-emerald-500">
                                                Responses submitted today are being recorded
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <button
                                                onClick={handleTrackToday}
                                                disabled={sharingInProgress}
                                                className="w-full py-3 rounded-xl font-semibold text-[10px] uppercase tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-2 bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:border-cyan-300 hover:text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
                                            >
                                                {sharingInProgress ? (
                                                    <><Clock size={14} className="animate-spin" /> Creating...</>
                                                ) : (
                                                    <><Zap size={14} /> Start Tracking Today</>
                                                )}
                                            </button>
                                            <p className="text-[9px] font-bold text-slate-300 dark:text-[#475569] uppercase text-center tracking-wide">
                                                Click to start tracking responses for today
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-[8px] font-medium text-slate-300 dark:text-[#475569] text-center">
                                        Athletes can bookmark this link for daily use — tracking also starts automatically when the first response is submitted
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="hidden md:flex flex-col items-center justify-center h-full text-center py-16 opacity-30">
                                <Share2 size={32} className="text-slate-300 dark:text-[#475569] mb-3" />
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">Select a questionnaire<br />to generate a share link</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── ROOT ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50/30 dark:bg-[#0F1C30]/30 p-8 pt-4">
            {viewMode === 'selection' && renderSelection()}
            {viewMode === 'dashboard'  && renderDashboard()}
            {viewMode === 'athlete'    && renderAthleteView()}
            {viewMode === 'share'      && renderSharePanel()}
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
