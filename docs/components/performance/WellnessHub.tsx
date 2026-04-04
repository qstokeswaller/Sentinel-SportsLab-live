import React, { useState, useMemo } from 'react';
import {
    Search, Users, ChevronRight, ArrowLeft, ClipboardList, AlertTriangle,
    Share2, Calendar, Activity, CheckCircle2, Clock, Copy, Zap, Link2, Plus, X,
    BarChart3, Trash2, ChevronUp, ChevronDown, Shield as ShieldIcon,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import QuestionnaireManager from './QuestionnaireManager';
import WellnessChartCard from '../charts/WellnessChartCard';
import WellnessHeatmap from '../wellness/WellnessHeatmap';
import WellnessSparklines from '../wellness/WellnessSparklines';
import WellnessFlagPanel from '../wellness/WellnessFlagPanel';
import ComplianceTracker from '../wellness/ComplianceTracker';
import { BodyMapArea } from '../../types/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

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
    if (rpe >= 9) return 'bg-rose-50 text-rose-600 border-rose-100';
    if (rpe >= 7) return 'bg-orange-50 text-orange-600 border-orange-100';
    if (rpe >= 5) return 'bg-amber-50 text-amber-600 border-amber-100';
    if (rpe >= 3) return 'bg-green-50 text-green-600 border-green-100';
    return 'bg-emerald-50 text-emerald-600 border-emerald-100';
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

const WellnessHub: React.FC = () => {
    const {
        teams,
        athletes,
        wellnessTemplates,
        setWellnessTemplates,
        wellnessResponses,
        handleLoadWellnessResponses,
        wellnessDateRange,
        setWellnessDateRange,
    } = useAppState();

    const [viewMode, setViewMode] = useState<'selection' | 'dashboard' | 'athlete' | 'templates' | 'share'>('selection');
    const [previewTemplate, setPreviewTemplate] = useState<'daily' | 'weekly' | null>(null);
    const [expandedPreviewQ, setExpandedPreviewQ] = useState<string | null>(null);
    const [selectedTeamId, setSelectedTeamId]     = useState<string | null>(null);
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

    // Resolve wellnessDateRange to ISO dateFrom/dateTo
    const dateRange = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        if (wellnessDateRange === 'today') return { from: today, to: today };
        if (wellnessDateRange === '30d') return { from: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], to: today };
        // default '7d'
        return { from: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], to: today };
    }, [wellnessDateRange]);

    // Auto-reload when selectedTeamId or wellnessDateRange changes
    React.useEffect(() => {
        if (selectedTeamId && viewMode === 'dashboard') {
            handleLoadWellnessResponses(selectedTeamId, wellnessDateRange);
        }
    }, [selectedTeamId, wellnessDateRange, viewMode]);

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
            if (selectedTeamId) handleLoadWellnessResponses(selectedTeamId, wellnessDateRange);
        } catch {
            alert('Failed to delete response.');
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

    const activeTeam = teams.find(t => t.id === selectedTeamId);

    // Compliance: expected = unique tracking days × athletes, actual = unique (athlete, date) pairs
    // Multiple shares on the same day count as 1 session day
    const compliance = useMemo(() => {
        const athleteCount = activeTeam?.players?.length || 0;
        if (athleteCount === 0) return { expected: 0, actual: 0, rate: 0, sessionCount: 0, athleteCount: 0 };

        // Count unique tracking days from share sessions (deduplicate by date)
        let uniqueTrackingDates: Set<string>;
        if (shareSessions.length > 0) {
            uniqueTrackingDates = new Set(shareSessions.map(s => {
                // shared_at is a timestamp — extract date portion
                const ts = s.shared_at || s.session_date || '';
                return ts.split('T')[0];
            }));
        } else {
            // Legacy fallback: each unique response date counts as one tracking day
            uniqueTrackingDates = new Set(filteredResponses.map(r => r.session_date));
        }

        const sessionCount = uniqueTrackingDates.size;
        if (sessionCount === 0) return { expected: 0, actual: 0, rate: 0, sessionCount: 0, athleteCount };
        const expected = sessionCount * athleteCount;
        // Count unique (athlete, date) pairs — one response per athlete per day
        const seen = new Set<string>();
        filteredResponses.forEach(r => {
            seen.add(`${r.athlete_id}__${r.session_date}`);
        });
        const actual = seen.size;
        return { expected, actual, rate: Math.round((actual / expected) * 100), sessionCount, athleteCount };
    }, [filteredResponses, shareSessions, activeTeam]);

    // Team averages across all numeric responses
    const teamAverages = useMemo(() => {
        if (filteredResponses.length === 0) return null;
        const sums: Record<string, number> = {};
        const counts: Record<string, number> = {};
        filteredResponses.forEach(res => {
            Object.entries(res.responses).forEach(([qid, val]) => {
                if (typeof val === 'number') {
                    sums[qid]   = (sums[qid] || 0) + val;
                    counts[qid] = (counts[qid] || 0) + 1;
                }
            });
        });
        const avgs: Record<string, number> = {};
        Object.keys(sums).forEach(qid => { avgs[qid] = sums[qid] / counts[qid]; });
        return avgs;
    }, [filteredResponses]);

    // KPI counts derived from filtered responses
    const kpi = useMemo(() => ({
        total:       filteredResponses.length,
        available:   filteredResponses.filter(r => resolveAvailability(r) === 'available').length,
        modified:    filteredResponses.filter(r => resolveAvailability(r) === 'modified').length,
        unavailable: filteredResponses.filter(r => resolveAvailability(r) === 'unavailable').length,
        alerts:      filteredResponses.filter(r => (r.rpe || 0) >= 8 || r.injury_report || resolveAvailability(r) === 'unavailable').length,
    }), [filteredResponses]);

    const activeAthlete = athletes.find(a => a.id === selectedAthleteId);

    // ── SELECTION (home) ────────────────────────────────────────────────────
    const renderSelection = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h2 className="text-4xl font-semibold text-slate-900 tracking-tighter">Questionnaire Data</h2>
                    <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.2em] mt-2 flex items-center gap-2">
                        <Activity size={14} className="text-cyan-500" />
                        {formatDate(TODAY)} — Real-time Readiness Monitoring
                    </p>
                </div>
                <button
                    onClick={() => setViewMode('templates')}
                    className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-600 rounded-xl font-bold flex items-center gap-2 hover:border-cyan-200 hover:text-cyan-600 transition-all shadow-sm"
                >
                    <ClipboardList size={18} /> Templates
                </button>
            </div>

            {/* Team Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => {
                    // Today's responses for this team (from whatever is cached in context)
                    const todayRes = wellnessResponses.filter(
                        r => r.team_id === team.id && r.session_date === TODAY
                    );
                    const fullCount      = todayRes.filter(r => resolveAvailability(r) === 'available').length;
                    const modCount       = todayRes.filter(r => resolveAvailability(r) === 'modified').length;
                    const outCount       = todayRes.filter(r => resolveAvailability(r) === 'unavailable').length;
                    const alertCount     = todayRes.filter(r => (r.rpe || 0) >= 8 || r.injury_report || resolveAvailability(r) === 'unavailable').length;
                    const responseCount  = todayRes.length;
                    const totalAthletes  = team.players.length;

                    return (
                        <div
                            key={team.id}
                            onClick={() => {
                                setSelectedTeamId(team.id);
                                handleLoadWellnessResponses(team.id, wellnessDateRange);
                                setViewMode('dashboard');
                            }}
                            className="bg-white p-6 rounded-xl border-2 border-slate-100 shadow-sm hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/5 transition-all group cursor-pointer relative overflow-hidden"
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
                                <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-cyan-50 group-hover:text-cyan-600 transition-colors">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-semibold text-slate-900 leading-tight">{team.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                                        {totalAthletes} Athletes • {team.sport}
                                    </p>
                                </div>

                                {/* Today's availability chips */}
                                {responseCount > 0 ? (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                            {fullCount} Full
                                        </span>
                                        {modCount > 0 && (
                                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                                                {modCount} Modified
                                            </span>
                                        )}
                                        {outCount > 0 && (
                                            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                                {outCount} Out
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-2 text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                                        <Zap size={10} className="text-cyan-400" /> No responses today
                                    </span>
                                )}

                                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-[9px] font-bold text-slate-300 uppercase">
                                        {responseCount}/{totalAthletes} responded today
                                    </span>
                                    <ChevronRight size={20} className="text-slate-300 group-hover:text-cyan-500 transition-colors" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // ── INSIGHTS TAB ─────────────────────────────────────────────────────────
    const renderInsightsTab = () => {

        const CHART_OPTIONS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
            scale_1_10:      [{ value: 'bar', label: 'Bar per athlete' }, { value: 'line', label: 'Line over time' }, { value: 'vs_bar', label: 'Comparison' }],
            scale_0_3:       [{ value: 'bar', label: 'Bar per athlete' }, { value: 'line', label: 'Line over time' }, { value: 'vs_bar', label: 'Comparison' }],
            scale_0_5:       [{ value: 'bar', label: 'Bar per athlete' }, { value: 'line', label: 'Line over time' }, { value: 'vs_bar', label: 'Comparison' }],
            number:          [{ value: 'bar', label: 'Bar per athlete' }, { value: 'line', label: 'Line over time' }],
            yes_no:          [{ value: 'count_bar', label: 'Count bar' }, { value: 'pie', label: 'Pie chart' }],
            multiple_choice: [{ value: 'count_bar', label: 'Count bar' }, { value: 'pie', label: 'Pie chart' }],
            single_choice:   [{ value: 'count_bar', label: 'Count bar' }, { value: 'pie', label: 'Pie chart' }],
            select:          [{ value: 'count_bar', label: 'Count bar' }, { value: 'pie', label: 'Pie chart' }],
            checklist:       [{ value: 'count_bar', label: 'Count bar' }, { value: 'pie', label: 'Pie chart' }],
            body_map:        [{ value: 'count_bar', label: 'Count bar' }],
        };

        const Q_TYPE_LABEL: Record<string, string> = {
            scale_1_10: 'Scale 1–10', scale_0_3: 'Scale 0–3', scale_0_5: 'Scale 0–5',
            yes_no: 'Yes / No', multiple_choice: 'Multiple choice', single_choice: 'Single choice',
            select: 'Select', checklist: 'Checklist', body_map: 'Body map', number: 'Number', text: 'Text',
        };

        const CHART_LABEL: Record<string, string> = {
            bar: 'Bar per athlete', line: 'Line over time', vs_bar: 'Comparison',
            count_bar: 'Count bar', pie: 'Pie chart',
        };

        // All questions from templates that have at least one chart option
        const allQuestions = (wellnessTemplates || []).flatMap((t: any) =>
            (t.questions || []).map((q: any) => ({ ...q, templateName: t.title || t.name }))
        ).filter((q: any) => (CHART_OPTIONS_BY_TYPE[q.type] || []).length > 0);

        // Distinct dates with responses for this team, most recent first
        const availableDates = Array.from(
            new Set(filteredResponses.map((r: any) => r.session_date as string))
        ).sort((a, b) => (b as string).localeCompare(a as string));

        const renderBlock = (block: VizBlock) => {
            const selectedQ    = allQuestions.find((q: any) => q.id === block.questionId);
            const chartOptions = selectedQ ? (CHART_OPTIONS_BY_TYPE[selectedQ.type] || []) : [];
            const isVsBar      = block.chartType === 'vs_bar';
            const vsOptions    = isVsBar
                ? allQuestions.filter((q: any) => q.id !== block.questionId &&
                    ['scale_1_10','scale_0_3','scale_0_5','number'].includes(q.type))
                : [];
            const compareQ     = allQuestions.find((q: any) => q.id === block.compareQId);

            // Which step are we on?
            const step: 1 | 2 | '2b' | 3 | 'done' =
                !block.questionId              ? 1 :
                !block.chartType               ? 2 :
                isVsBar && !block.compareQId   ? '2b' :
                !block.date                    ? 3  : 'done';

            const blockResponses = block.date
                ? wellnessResponses.filter((r: any) => r.team_id === selectedTeamId && r.session_date === block.date)
                : [];

            const stepLabel = step === 'done'
                ? (selectedQ?.text?.slice(0, 32) || 'Visualization')
                : `Step ${step === '2b' ? '2b' : step} of 3`;

            return (
                <div key={block.id} className="bg-white rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden">
                    {/* Block header */}
                    <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/40">
                        <div className="flex items-center gap-2 flex-wrap">
                            <BarChart3 size={13} className="text-cyan-500" />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                {stepLabel}
                            </span>
                            {step === 'done' && block.date && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                    — {new Date(block.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => removeVizBlock(block.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        >
                            <X size={13} />
                        </button>
                    </div>

                    <div className="p-6">

                        {/* ── Step 1: pick question ─────────────────────────── */}
                        {step === 1 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-4">
                                    Pick a question to visualise
                                </p>
                                {allQuestions.length === 0 ? (
                                    <p className="text-[10px] font-bold text-slate-300 text-center py-8">
                                        No questions found in your templates.
                                    </p>
                                ) : allQuestions.map((q: any) => (
                                    <button
                                        key={q.id}
                                        onClick={() => updateVizBlock(block.id, { questionId: q.id, chartType: undefined, compareQId: undefined, date: undefined })}
                                        className="w-full text-left px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-cyan-200 hover:bg-cyan-50/30 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-900 truncate">{q.text || 'Unnamed'}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{q.templateName}</p>
                                            </div>
                                            <span className="shrink-0 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-semibold text-slate-500 uppercase">
                                                {Q_TYPE_LABEL[q.type] || q.type}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Step 2: pick chart type ───────────────────────── */}
                        {step === 2 && selectedQ && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <button
                                        onClick={() => updateVizBlock(block.id, { questionId: undefined })}
                                        className="text-[9px] font-semibold text-slate-400 hover:text-slate-900 uppercase tracking-wide flex items-center gap-1"
                                    >
                                        <ArrowLeft size={10} /> Back
                                    </button>
                                    <span className="text-[9px] text-slate-300">·</span>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 truncate">
                                        {selectedQ.text?.slice(0, 30)}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {chartOptions.map((opt: { value: string; label: string }) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => updateVizBlock(block.id, { chartType: opt.value, compareQId: undefined, date: undefined })}
                                            className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 transition-all"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── Step 2b: pick comparison question (vs_bar) ────── */}
                        {step === '2b' && selectedQ && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4">
                                    <button
                                        onClick={() => updateVizBlock(block.id, { chartType: undefined })}
                                        className="text-[9px] font-semibold text-slate-400 hover:text-slate-900 uppercase tracking-wide flex items-center gap-1"
                                    >
                                        <ArrowLeft size={10} /> Back
                                    </button>
                                    <span className="text-[9px] text-slate-300">·</span>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Pick comparison question
                                    </p>
                                </div>
                                {vsOptions.length === 0 ? (
                                    <p className="text-[10px] font-bold text-slate-300 text-center py-6">
                                        No compatible scale questions found.
                                    </p>
                                ) : vsOptions.map((q: any) => (
                                    <button
                                        key={q.id}
                                        onClick={() => updateVizBlock(block.id, { compareQId: q.id, date: undefined })}
                                        className="w-full text-left px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl hover:border-violet-200 hover:bg-violet-50/30 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs font-semibold text-slate-900 truncate flex-1">{q.text || 'Unnamed'}</p>
                                            <span className="shrink-0 px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[9px] font-semibold text-slate-500 uppercase">
                                                {Q_TYPE_LABEL[q.type] || q.type}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Step 3: pick date ─────────────────────────────── */}
                        {step === 3 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-4">
                                    <button
                                        onClick={() => updateVizBlock(block.id, isVsBar ? { compareQId: undefined } : { chartType: undefined })}
                                        className="text-[9px] font-semibold text-slate-400 hover:text-slate-900 uppercase tracking-wide flex items-center gap-1"
                                    >
                                        <ArrowLeft size={10} /> Back
                                    </button>
                                    <span className="text-[9px] text-slate-300">·</span>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Pick a date
                                    </p>
                                </div>
                                {availableDates.length === 0 ? (
                                    <p className="text-[10px] font-bold text-slate-300 text-center py-8">
                                        No responses found for this team.
                                    </p>
                                ) : availableDates.map((date: string) => (
                                    <button
                                        key={date}
                                        onClick={() => updateVizBlock(block.id, { date })}
                                        className="w-full text-left px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 transition-all"
                                    >
                                        {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ── Done: render chart ────────────────────────────── */}
                        {step === 'done' && selectedQ && block.date && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-semibold text-slate-500 uppercase">
                                            {CHART_LABEL[block.chartType!] || block.chartType}
                                        </span>
                                        {isVsBar && compareQ && (
                                            <span className="text-[9px] font-bold text-slate-400">
                                                vs {compareQ.text?.slice(0, 20)}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-semibold text-slate-500 uppercase">
                                            {new Date(block.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => updateVizBlock(block.id, { questionId: undefined, chartType: undefined, compareQId: undefined, date: undefined })}
                                        className="text-[9px] font-semibold text-slate-400 hover:text-slate-900 uppercase tracking-wide"
                                    >
                                        Reconfigure
                                    </button>
                                </div>
                                <WellnessChartCard
                                    question={{
                                        ...selectedQ,
                                        visualization: { chartType: block.chartType, compareWith: block.compareQId },
                                    }}
                                    allQuestions={allQuestions}
                                    responses={blockResponses}
                                    athletes={activeTeam?.players || []}
                                />
                            </div>
                        )}

                    </div>
                </div>
            );
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Add block button */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={addVizBlock}
                        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-semibold uppercase tracking-wide hover:bg-slate-700 transition-all shadow-sm"
                    >
                        <Plus size={13} /> New Visualization Block
                    </button>
                    {vizBlocks.length > 0 && (
                        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide">
                            {vizBlocks.length} block{vizBlocks.length !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {/* Empty state */}
                {vizBlocks.length === 0 && (
                    <div className="p-16 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                        <BarChart3 size={40} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">No visualizations yet</p>
                        <p className="text-slate-300 text-xs font-bold max-w-xs mx-auto">
                            Click "New Visualization Block" to pick a question and chart type.
                        </p>
                    </div>
                )}

                {/* Blocks */}
                <div className="space-y-6">
                    {vizBlocks.map(block => renderBlock(block))}
                </div>
            </div>
        );
    };

    // ── DASHBOARD ────────────────────────────────────────────────────────────
    const renderDashboard = () => (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl border-2 border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setViewMode('selection')}
                        className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-2xl font-semibold text-slate-900">{activeTeam?.name}</h2>
                            <span className="px-3 py-1 bg-cyan-100 text-cyan-600 rounded-lg text-[10px] font-semibold uppercase tracking-wide">Dashboard</span>
                        </div>
                        {/* Improvement #4: date + response count */}
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wide mt-1">
                            {formatDate(TODAY)} — {kpi.total} of {activeTeam?.players.length} responded
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-48">
                        <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                            value={wellnessDateRange}
                            onChange={e => {
                                setWellnessDateRange(e.target.value);
                                handleLoadWellnessResponses(selectedTeamId!, e.target.value);
                            }}
                            className="w-full bg-slate-50 border-none rounded-xl py-3 pl-11 pr-4 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/20"
                        >
                            <option value="today">Today</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setIsKpiExpanded(v => !v)}
                        title={isKpiExpanded ? 'Hide availability summary' : 'Show availability summary'}
                        className="flex items-center gap-1.5 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all text-[10px] font-bold uppercase tracking-wide"
                    >
                        {isKpiExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        {isKpiExpanded ? 'Hide' : 'Show'}
                    </button>
                    <button
                        onClick={() => setViewMode('share')}
                        className="p-3.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            {isKpiExpanded && (<>
            {/* Improvement #2: KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Responses',   value: kpi.total,       color: 'text-slate-900',   bg: 'bg-white',       border: 'border-slate-100' },
                    { label: 'Available',   value: kpi.available,   color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
                    { label: 'Modified',    value: kpi.modified,    color: 'text-amber-600',   bg: 'bg-amber-50',    border: 'border-amber-100' },
                    { label: 'Unavailable', value: kpi.unavailable, color: 'text-rose-600',    bg: 'bg-rose-50',     border: 'border-rose-100' },
                ].map(kpiItem => (
                    <div key={kpiItem.label} className={`${kpiItem.bg} border-2 ${kpiItem.border} rounded-xl p-6 flex flex-col gap-1`}>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{kpiItem.label}</span>
                        <span className={`text-4xl font-semibold tracking-tighter ${kpiItem.color}`}>{kpiItem.value}</span>
                    </div>
                ))}
            </div>

            {/* Improvement #5: Availability summary bar */}
            {kpi.total > 0 && (
                <div className="bg-white rounded-xl border-2 border-slate-100 overflow-hidden shadow-sm">
                    <div className="flex h-3">
                        <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(kpi.available / activeTeam!.players.length) * 100}%` }} />
                        <div className="bg-amber-400 transition-all duration-700" style={{ width: `${(kpi.modified / activeTeam!.players.length) * 100}%` }} />
                        <div className="bg-rose-500 transition-all duration-700" style={{ width: `${(kpi.unavailable / activeTeam!.players.length) * 100}%` }} />
                        <div className="bg-slate-100 flex-1" />
                    </div>
                    <div className="flex items-center gap-6 px-6 py-2.5">
                        {[
                            { label: 'Available',    color: 'bg-emerald-500' },
                            { label: 'Modified',     color: 'bg-amber-400' },
                            { label: 'Unavailable',  color: 'bg-rose-500' },
                            { label: 'No Response',  color: 'bg-slate-200' },
                        ].map(l => (
                            <span key={l.label} className="flex items-center gap-1.5 text-[9px] font-semibold uppercase text-slate-400">
                                <span className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            </>)}

            {/* ── Tab strip ───────────────────────────────────────────── */}
            <div className="flex gap-1 bg-white border-2 border-slate-100 rounded-xl p-1 w-fit shadow-sm">
                {(['overview', 'insights'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setDashboardTab(tab)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all ${
                            dashboardTab === tab
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        {tab === 'overview' ? 'Overview' : 'Insights'}
                    </button>
                ))}
            </div>

            {dashboardTab === 'overview' && (<>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {/* Readiness Averages + Response Rate */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                        <div className="bg-white p-8 rounded-xl border-2 border-slate-100 shadow-sm space-y-6">
                            <h3 className="text-sm font-semibold uppercase text-slate-900 flex items-center gap-2">
                                <Zap size={16} className="text-yellow-500" /> Team Averages
                            </h3>
                            <div className="space-y-5">
                                {[
                                    { label: 'Sleep Quality', id: 'sleep_quality', color: '#06b6d4', max: 5 },
                                    { label: 'RPE',           id: 'rpe',           color: '#6366f1', max: 10 },
                                    { label: 'Fatigue',       id: 'fatigue',       color: '#f59e0b', max: 5 },
                                    { label: 'Stress',        id: 'stress',        color: '#ec4899', max: 5 },
                                ].map(metric => {
                                    const avg     = teamAverages?.[metric.id] || 0;
                                    const percent = (avg / metric.max) * 100;
                                    return (
                                        <div key={metric.id}>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[10px] font-semibold uppercase text-slate-500">{metric.label}</span>
                                                <span className="text-xs font-semibold text-slate-900">{avg.toFixed(1)}</span>
                                            </div>
                                            <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                                <div
                                                    className="h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${percent}%`, backgroundColor: metric.color }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="bg-slate-900 p-8 rounded-xl text-white shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Activity size={80} /></div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Response Rate</h3>
                                    {compliance.expected > 0 ? (
                                        <>
                                            <div className="text-5xl font-semibold mt-2 tracking-tighter">
                                                {compliance.rate}%
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">
                                                {compliance.actual} of {compliance.expected} expected
                                            </p>
                                            <p className="text-[9px] font-medium text-slate-600 mt-1">
                                                {compliance.sessionCount} day{compliance.sessionCount !== 1 ? 's' : ''} tracked · {compliance.athleteCount} athlete{compliance.athleteCount !== 1 ? 's' : ''}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-5xl font-semibold mt-2 tracking-tighter text-slate-600">
                                                —
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">
                                                No days tracked yet in this period
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="pt-8 flex gap-1.5">
                                    {compliance.expected > 0
                                        ? Array.from({ length: Math.min(compliance.expected, 12) }, (_, i) => (
                                            <div key={i} className={`flex-1 h-1.5 rounded-full overflow-hidden ${i < compliance.actual ? 'bg-cyan-500' : 'bg-white/10'}`} />
                                        ))
                                        : (activeTeam?.players || []).slice(0, 6).map((_, i) => (
                                            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/10" />
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Priority Alerts sidebar */}
                <div>
                    <div className="bg-white p-8 rounded-xl border-2 border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900">Priority Alerts</h3>
                                {kpi.alerts > 0 && (
                                    <p className="text-[9px] font-bold text-rose-500 uppercase mt-0.5">{kpi.alerts} athlete{kpi.alerts > 1 ? 's' : ''} flagged</p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {filteredResponses
                                .filter(r => (r.rpe || 0) >= 8 || r.injury_report || resolveAvailability(r) === 'unavailable')
                                .slice(0, 6)
                                .map(r => {
                                    const a      = athletes.find(att => att.id === r.athlete_id);
                                    const status = getAthleteStatus(r);
                                    return (
                                        <div
                                            key={r.id}
                                            onClick={() => { setSelectedAthleteId(r.athlete_id); setViewMode('athlete'); }}
                                            className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-white hover:shadow-md transition-all group"
                                        >
                                            {status && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[status]}`} />}
                                            <div className="w-9 h-9 rounded-full bg-white border border-slate-200 overflow-hidden shrink-0">
                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${a?.name}`} alt="" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-semibold text-slate-900 truncate">{a?.name || 'Unknown'}</div>
                                                <div className="text-[9px] font-bold text-rose-500 uppercase">
                                                    {r.injury_report ? 'Injury Reported' : (r.rpe || 0) >= 8 ? `RPE ${r.rpe}/10` : 'Unavailable'}
                                                </div>
                                            </div>
                                            <ChevronRight size={13} className="text-slate-300 group-hover:text-rose-500 shrink-0" />
                                        </div>
                                    );
                                })}

                            {kpi.alerts === 0 && (
                                <div className="text-center py-10">
                                    <CheckCircle2 size={36} className="mx-auto text-emerald-300 mb-3" />
                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide leading-relaxed">
                                        All clear — no flags<br />for this period.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Rundown — full width below the grid */}
            <div className="bg-white rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase text-slate-900 px-2 tracking-wide">Individual Rundown</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowDailyTracker(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide transition-all border ${
                                showDailyTracker
                                    ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-400'
                            }`}
                        >
                            <Calendar size={12} />
                            {showDailyTracker ? 'Hide' : 'Daily'} Tracker
                        </button>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Find athlete..."
                                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold outline-none focus:ring-2 focus:ring-cyan-500/10 w-40"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Collapsible Daily Response Tracker */}
                {showDailyTracker && (
                    <div className="border-b border-slate-100 bg-slate-50/40 animate-in slide-in-from-top-2 duration-300">
                        <div className="px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-7 h-7 bg-cyan-50 rounded-lg flex items-center justify-center text-cyan-600">
                                    <Calendar size={14} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Who responded on</span>
                                <input
                                    type="date"
                                    value={responseViewDate}
                                    onChange={e => setResponseViewDate(e.target.value)}
                                    max={TODAY}
                                    className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-400 transition-all"
                                />
                            </div>
                            {(() => {
                                const dayCount = filteredResponses.filter(r => r.session_date === responseViewDate).length;
                                const totalAthletes = activeTeam?.players?.length || 0;
                                const respondedSet = new Set(filteredResponses.filter(r => r.session_date === responseViewDate).map(r => r.athlete_id));
                                return (
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${
                                        respondedSet.size === totalAthletes && totalAthletes > 0
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : respondedSet.size === 0
                                                ? 'bg-slate-100 text-slate-400'
                                                : 'bg-amber-100 text-amber-600'
                                    }`}>
                                        {respondedSet.size} of {totalAthletes} responded
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="px-6 pb-4">
                            {(() => {
                                const dayResponses = filteredResponses.filter(r => r.session_date === responseViewDate);
                                const respondedIds = new Set(dayResponses.map(r => r.athlete_id));
                                const allAthletes = activeTeam?.players || [];
                                const responded = allAthletes.filter(a => respondedIds.has(a.id));
                                const notResponded = allAthletes.filter(a => !respondedIds.has(a.id));

                                return (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                        {responded.map(a => (
                                            <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                                <span className="text-[10px] font-semibold text-emerald-700 truncate">{a.name}</span>
                                            </div>
                                        ))}
                                        {notResponded.map(a => (
                                            <div key={a.id} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-lg">
                                                <Clock size={12} className="text-slate-300 shrink-0" />
                                                <span className="text-[10px] font-semibold text-slate-400 truncate">{a.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] text-slate-400 uppercase tracking-[0.15em] font-semibold">
                            <tr>
                                <th className="px-4 py-4 w-8" />
                                <th className="px-6 py-4">Athlete</th>
                                <th className="px-4 py-4">Availability</th>
                                <th className="px-4 py-4">RPE</th>
                                <th className="px-4 py-4">Injuries</th>
                                <th className="px-6 py-4 text-right">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const playerMap = Object.fromEntries(
                                    (activeTeam?.players || []).map(p => [p.id, p])
                                );

                                const visibleResponses = filteredResponses.filter(res => {
                                    if (!searchQuery) return true;
                                    const player = playerMap[res.athlete_id];
                                    return player?.name.toLowerCase().includes(searchQuery.toLowerCase());
                                });

                                if (visibleResponses.length === 0) {
                                    return (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-300 text-xs">
                                                No responses found
                                            </td>
                                        </tr>
                                    );
                                }

                                const sorted = [...visibleResponses].sort((a, b) => {
                                    const d = b.session_date.localeCompare(a.session_date);
                                    return d !== 0 ? d : b.submitted_at.localeCompare(a.submitted_at);
                                });

                                // Group by session_date
                                const groups: { date: string; items: typeof sorted }[] = [];
                                sorted.forEach(res => {
                                    const last = groups[groups.length - 1];
                                    if (last && last.date === res.session_date) {
                                        last.items.push(res);
                                    } else {
                                        groups.push({ date: res.session_date, items: [res] });
                                    }
                                });

                                const formatDateLabel = (dateStr: string) => {
                                    const [y, m, d] = dateStr.split('-').map(Number);
                                    const dt = new Date(y, m - 1, d);
                                    const today = new Date();
                                    const todayStr = today.toISOString().split('T')[0];
                                    const yest = new Date(today); yest.setDate(today.getDate() - 1);
                                    const yesterdayStr = yest.toISOString().split('T')[0];
                                    const weekday = dt.toLocaleDateString('en-GB', { weekday: 'long' });
                                    const dayNum  = dt.toLocaleDateString('en-GB', { day: 'numeric' });
                                    const month   = dt.toLocaleDateString('en-GB', { month: 'short' });
                                    const year    = dt.toLocaleDateString('en-GB', { year: 'numeric' });
                                    const label   = `${weekday}  ${dayNum} ${month} ${year}`;
                                    const badge   = dateStr === todayStr ? 'Today' : dateStr === yesterdayStr ? 'Yesterday' : null;
                                    return { label, badge };
                                };

                                return groups.flatMap(({ date, items }) => {
                                    const { label, badge } = formatDateLabel(date);
                                    const rows: React.ReactNode[] = [
                                        <tr key={`date-${date}`} className="border-t-2 border-slate-100 bg-slate-50/60">
                                            <td colSpan={6} className="px-5 py-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
                                                    {badge && (
                                                        <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100">{badge}</span>
                                                    )}
                                                    <span className="ml-auto text-[8px] font-semibold text-slate-300 uppercase tracking-wide">
                                                        {items.length} response{items.length !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ];

                                    items.forEach(res => {
                                        const player      = playerMap[res.athlete_id];
                                        const status      = getAthleteStatus(res);
                                        const injuryCount = res?.injury_report?.areas?.length || 0;
                                        rows.push(
                                            <tr key={res.id} className="group hover:bg-slate-50/50 transition-colors border-t border-slate-50">
                                                <td className="pl-5 pr-1 py-4">
                                                    {status
                                                        ? <span className={`w-3 h-3 rounded-full block ${STATUS_DOT[status]} shadow-sm`} />
                                                        : <span className="w-3 h-3 rounded-full block bg-slate-200" />
                                                    }
                                                </td>
                                                <td className="px-6 py-4">
                                                    {player ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100 shrink-0">
                                                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-semibold text-slate-900">{player.name}</div>
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{player.subsection}</div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs">Unknown athlete</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 font-semibold uppercase text-[9px]">
                                                    {(() => {
                                                        const avail = resolveAvailability(res);
                                                        if (avail === 'available')   return <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">Full</span>;
                                                        if (avail === 'modified')    return <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">Modified</span>;
                                                        if (avail === 'unavailable') return <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">Out</span>;
                                                        return <span className="text-slate-300">—</span>;
                                                    })()}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {res?.rpe ? (
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${getRpeBadge(res.rpe)}`}>{res.rpe}/10</span>
                                                    ) : <span className="text-slate-300 text-[10px] font-bold">—</span>}
                                                </td>
                                                <td className="px-4 py-4">
                                                    {injuryCount > 0 ? (
                                                        <div className="flex items-center gap-1.5 text-rose-500">
                                                            <AlertTriangle size={13} />
                                                            <span className="text-[10px] font-semibold">{injuryCount} Area{injuryCount > 1 ? 's' : ''}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-emerald-500">
                                                            <CheckCircle2 size={13} />
                                                            <span className="text-[10px] font-semibold uppercase">Clear</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {confirmDeleteId === res.id ? (
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-[9px] font-bold text-rose-500 uppercase">Delete?</span>
                                                                <button
                                                                    onClick={() => handleDeleteResponse(res.id)}
                                                                    className="px-1.5 py-1 bg-rose-50 border border-rose-200 rounded text-[9px] font-bold text-rose-600 hover:bg-rose-100 transition-all"
                                                                >Yes</button>
                                                                <button
                                                                    onClick={() => setConfirmDeleteId(null)}
                                                                    className="px-1.5 py-1 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                                                >No</button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmDeleteId(res.id)}
                                                                className="p-2 bg-white border border-slate-100 rounded-lg text-slate-300 hover:text-rose-400 hover:border-rose-100 hover:shadow-sm transition-all"
                                                                title="Delete response"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => { setSelectedAthleteId(player?.id || ''); setViewMode('athlete'); }}
                                                            className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-cyan-600 hover:border-cyan-100 hover:shadow-sm transition-all"
                                                        >
                                                            <ChevronRight size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    });

                                    return rows;
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
            </>)}
            {dashboardTab === 'insights' && renderInsightsTab()}

            {/* FIFA Wellness Visualisations */}
            {dashboardTab === 'overview' && selectedTeamId && activeTeam && (
                <div className="space-y-5 mt-5">
                    {/* Wellness Flags */}
                    <WellnessFlagPanel
                        teamId={selectedTeamId}
                        athletes={(activeTeam.players || []).map(p => ({ id: p.id, name: p.name }))}
                    />

                    {/* Compliance Tracker */}
                    <ComplianceTracker
                        athletes={(activeTeam.players || []).map(p => ({ id: p.id, name: p.name }))}
                        responses={wellnessResponses}
                    />

                    {/* Team Heatmap */}
                    <WellnessHeatmap
                        athletes={(activeTeam.players || []).map(p => ({ id: p.id, name: p.name }))}
                        responses={wellnessResponses}
                        days={14}
                    />
                </div>
            )}
        </div>
    );

    // ── ATHLETE VIEW ─────────────────────────────────────────────────────────
    const renderAthleteView = () => {
        const res    = filteredResponses.find(r => r.athlete_id === selectedAthleteId);
        const status = getAthleteStatus(res);

        return (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                {/* Header */}
                <div className="bg-white p-6 rounded-xl border-2 border-slate-100 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <button
                            onClick={() => setViewMode('dashboard')}
                            className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-all"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden border-2 border-white shadow-md ring-1 ring-slate-100">
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeAthlete?.name}`} alt="" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-2xl font-semibold text-slate-900 tracking-tighter">{activeAthlete?.name}</h2>
                                    {status && (
                                        <span className={`w-3 h-3 rounded-full ${STATUS_DOT[status]} shadow-md`} />
                                    )}
                                </div>
                                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wide mt-1">
                                    {activeAthlete?.subsection} • Individual Profile
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Availability badge */}
                    {(() => {
                        const avail = resolveAvailability(res);
                        if (!avail) return null;
                        const cls = avail === 'available' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : avail === 'modified'  ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                                          : 'bg-rose-50 text-rose-600 border border-rose-100';
                        const label = avail === 'available' ? 'Full Training' : avail === 'modified' ? 'Modified Training' : 'Unavailable';
                        return <span className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide ${cls}`}>{label}</span>;
                    })()}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Metric chips */}
                    <div className="bg-white p-8 rounded-xl border-2 border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-semibold uppercase text-slate-900">Entry Analysis</h3>
                        {res ? (
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(res.responses).map(([qid, val]: [string, any]) => {
                                    if (typeof val !== 'number') return null;
                                    const question = wellnessTemplates.flatMap((t: any) => t.questions || [])
                                        .find((q: any) => q.id === qid);
                                    const qText = question?.text || qid;
                                    const qType = question?.type || '';
                                    // Resolve scale max from question type or numericMap
                                    const scaleMax = qType === 'scale_1_10' ? 10
                                        : qType === 'scale_0_5' ? 5
                                        : qType === 'scale_0_3' ? 3
                                        : qType === 'scale' && question?.scaleMax ? question.scaleMax
                                        : question?.numericMap?.length ? Math.max(...question.numericMap)
                                        : null;
                                    // Color chip by sentiment — high-bad vs high-good
                                    const qLow = qid.toLowerCase();
                                    const isHighBad = ['rpe', 'stress', 'fatigue', 'soreness'].some(k => qLow.includes(k));
                                    const isHighGood = ['energy', 'motivation', 'sleep'].some(k => qLow.includes(k));
                                    const pct = scaleMax ? val / scaleMax : 0;
                                    let chipColor = 'bg-slate-50 text-slate-700 border-slate-100';
                                    if (isHighBad && scaleMax) {
                                        chipColor = pct >= 0.8 ? 'bg-rose-50 text-rose-700 border-rose-100' : pct >= 0.6 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                    } else if (isHighGood && scaleMax) {
                                        chipColor = pct <= 0.4 ? 'bg-rose-50 text-rose-700 border-rose-100' : pct <= 0.6 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                    }
                                    return (
                                        <div key={qid} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold ${chipColor}`}>
                                            <span className="uppercase tracking-tight text-[9px] font-bold opacity-60">{qText.slice(0, 18)}</span>
                                            <span className="text-sm">{val}</span>
                                            {scaleMax && <span className="text-[8px] font-medium opacity-40">/ {scaleMax}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-xl">
                                <Clock size={40} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">No response for this date range.</p>
                            </div>
                        )}
                    </div>

                    {/* Body Map + Per-Area Injury Details */}
                    <div className="bg-white p-8 rounded-xl border-2 border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase text-slate-900 flex items-center gap-2">
                                <Activity size={18} className="text-rose-500" /> Niggles & Injuries
                            </h3>
                            {res?.injury_report && (
                                <span className="px-3 py-1 bg-rose-500 text-white rounded-lg text-[10px] font-semibold uppercase">Flagged</span>
                            )}
                        </div>

                        <div className="relative aspect-[3/4] max-w-[320px] mx-auto bg-slate-50 border-2 border-slate-100 rounded-xl p-8 overflow-hidden">
                            <img src="/body-image.jpeg" className="w-full h-full object-contain opacity-30 grayscale contrast-125" alt="Body Map" />
                            <div className="absolute inset-0 p-8 flex flex-wrap content-start justify-center gap-3">
                                {res?.injury_report?.areas?.map((area: BodyMapArea, idx: number) => (
                                    <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-white font-semibold text-xs shadow-lg animate-in zoom-in-50 ${
                                        area.severity === 3 ? 'bg-rose-600 border-rose-400' :
                                        area.severity === 2 ? 'bg-orange-500 border-orange-300' :
                                                              'bg-yellow-400 border-yellow-200 text-slate-900'
                                    }`}>
                                        {area.area}
                                        <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-ping" />
                                    </div>
                                ))}
                                {(!res?.injury_report || res.injury_report.areas.length === 0) && (
                                    <div className="flex flex-col items-center justify-center h-full w-full text-center opacity-30">
                                        <CheckCircle2 size={48} className="text-emerald-500 mb-4" />
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">All Clear</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Per-area injury follow-up details */}
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
                                            <div key={area.area} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                        area.severity === 3 ? 'bg-rose-500' : area.severity === 2 ? 'bg-orange-500' : 'bg-yellow-400'
                                                    }`} />
                                                    <span className="text-[10px] font-black uppercase tracking-wide text-slate-700">
                                                        {area.area.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {details.map(d => (
                                                        <div key={d.label} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg">
                                                            <span className="text-[8px] font-bold uppercase text-slate-400 block">{d.label}</span>
                                                            <span className="text-[10px] font-semibold text-slate-700">{String(d.value)}</span>
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
                </div>

                {/* Sparklines for this athlete */}
                {selectedAthleteId && activeAthlete && (
                    <WellnessSparklines
                        athleteId={selectedAthleteId}
                        athleteName={activeAthlete.name}
                        responses={wellnessResponses}
                        days={14}
                    />
                )}
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

        const todayStr = new Date().toISOString().split('T')[0];
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
                        className="w-12 h-12 bg-white border-2 border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-semibold text-slate-900 tracking-tighter">Share Check-in Link</h2>
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-wide mt-1">
                            Share link and track daily responses
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Template list + create card */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide ml-1">Select Questionnaire</label>
                        <div className="space-y-3">
                            {/* Built-in: Daily Wellness Check */}
                            <div
                                onClick={() => setSelectedTemplate({ id: '__wellness_check__', name: 'Wellness Check', questions: [] })}
                                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                    selectedTemplate?.id === '__wellness_check__'
                                        ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-200 text-white'
                                        : 'bg-white border-indigo-100 text-slate-900 hover:border-indigo-200'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTemplate?.id === '__wellness_check__' ? 'bg-white/20' : 'bg-indigo-50 text-indigo-500'}`}>
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

                            {/* Built-in: Weekly Health Check */}
                            <div
                                onClick={() => setSelectedTemplate({ id: '__weekly_health__', name: 'Weekly Health Check', questions: [] })}
                                className={`p-5 rounded-xl border-2 transition-all cursor-pointer ${
                                    selectedTemplate?.id === '__weekly_health__'
                                        ? 'bg-amber-600 border-amber-600 shadow-xl shadow-amber-200 text-white'
                                        : 'bg-white border-amber-100 text-slate-900 hover:border-amber-200'
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedTemplate?.id === '__weekly_health__' ? 'bg-white/20' : 'bg-amber-50 text-amber-500'}`}>
                                        <ShieldIcon size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-base">Weekly Health Check</div>
                                        <div className={`text-[9px] font-bold uppercase tracking-wide ${selectedTemplate?.id === '__weekly_health__' ? 'text-amber-100' : 'text-amber-400'}`}>
                                            Deep check · FIFA/IOC aligned · 5 min
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
                                                ? 'bg-cyan-600 border-cyan-600 shadow-xl shadow-cyan-200 text-white'
                                                : 'bg-white border-slate-100 text-slate-900 hover:border-cyan-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-white/20' : 'bg-slate-50 text-slate-400'}`}>
                                                    <ClipboardList size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-base">{t.name || t.title}</div>
                                                    <div className={`text-[9px] font-bold uppercase tracking-wide ${isSelected ? 'text-cyan-100' : 'text-slate-400'}`}>
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
                                className="p-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-white transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 group-hover:text-slate-500 transition-colors">
                                        <Plus size={20} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm text-slate-500 group-hover:text-slate-700 transition-colors">Create New Template</div>
                                        <div className="text-[9px] font-bold uppercase tracking-wide text-slate-300">
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
                            <div className="bg-white rounded-xl border-2 border-slate-100 shadow-xl p-8 flex-1 flex flex-col gap-6 animate-in fade-in duration-300">
                                {/* Link ready indicator */}
                                <div className="flex flex-col items-center text-center gap-3 py-6">
                                    <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-100 rounded-xl flex items-center justify-center">
                                        <Link2 size={28} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 text-lg">Link Ready</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                                            {selectedTemplate.name || selectedTemplate.title} · {activeTeam?.name}
                                        </p>
                                    </div>
                                </div>

                                {/* URL preview row */}
                                <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 flex items-center gap-3">
                                    <p className="text-[10px] font-mono text-slate-400 truncate flex-1">{previewLink}</p>
                                    <button
                                        onClick={handleCopy}
                                        className={`p-2 rounded-lg border transition-all shrink-0 ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-500 hover:text-cyan-600 hover:border-cyan-200'}`}
                                    >
                                        {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>

                                {/* Share actions */}
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleCopy}
                                        className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
                                        <div className="h-px bg-slate-100 flex-1" />
                                        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wide">Response Tracking</span>
                                        <div className="h-px bg-slate-100 flex-1" />
                                    </div>
                                    {isTrackedToday ? (
                                        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-xl p-4 text-center space-y-1">
                                            <div className="flex items-center justify-center gap-2 text-emerald-600">
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
                                                className="w-full py-3 rounded-xl font-semibold text-[10px] uppercase tracking-wide transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-2 bg-white border-slate-200 text-slate-500 hover:border-cyan-300 hover:text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
                                            >
                                                {sharingInProgress ? (
                                                    <><Clock size={14} className="animate-spin" /> Creating...</>
                                                ) : (
                                                    <><Zap size={14} /> Start Tracking Today</>
                                                )}
                                            </button>
                                            <p className="text-[9px] font-bold text-slate-300 uppercase text-center tracking-wide">
                                                Click to start tracking responses for today
                                            </p>
                                        </div>
                                    )}
                                    <p className="text-[8px] font-medium text-slate-300 text-center">
                                        Athletes can bookmark this link for daily use — tracking also starts automatically when the first response is submitted
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="hidden md:flex flex-col items-center justify-center h-full text-center py-16 opacity-30">
                                <Share2 size={32} className="text-slate-300 mb-3" />
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Select a questionnaire<br />to generate a share link</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    // ── ROOT ─────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50/30 p-8 pt-4">
            {viewMode === 'selection' && renderSelection()}
            {viewMode === 'dashboard'  && renderDashboard()}
            {viewMode === 'athlete'    && renderAthleteView()}
            {viewMode === 'share'      && renderSharePanel()}
            {viewMode === 'templates'  && (
                <div className="space-y-6">
                    <button
                        onClick={() => setViewMode('selection')}
                        className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-[10px] uppercase tracking-[0.2em]"
                    >
                        <ArrowLeft size={14} /> Back to Hub
                    </button>

                    {/* Built-in form templates */}
                    <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Built-in Templates</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div onClick={() => setPreviewTemplate('daily')} className="bg-white border-2 border-indigo-100 rounded-xl p-5 space-y-2 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                        <Activity size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">Wellness Check</h4>
                                        <p className="text-[10px] text-indigo-500 font-medium">Daily · 8 questions · &lt;2 min</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Availability, health complaint, fatigue, soreness, sleep quality, stress, mood, sleep hours, readiness. Auto-generates wellness flags.
                                </p>
                            </div>
                            <div onClick={() => setPreviewTemplate('weekly')} className="bg-white border-2 border-amber-100 rounded-xl p-5 space-y-2 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                        <ShieldIcon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">Weekly Health Check</h4>
                                        <p className="text-[10px] text-amber-500 font-medium">Deep check · FIFA/IOC aligned · 5 min</p>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-400 transition-colors" />
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Problem classification, onset, recurrence, body area (FIFA), mechanism, impact, time-loss, wellness trends, recovery.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Preview modal for built-in templates */}
                    {previewTemplate && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreviewTemplate(null)} />
                            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                                {/* Header */}
                                <div className={`px-5 py-4 border-b ${previewTemplate === 'daily' ? 'bg-indigo-50 border-indigo-100' : 'bg-amber-50 border-amber-100'} flex items-center justify-between`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${previewTemplate === 'daily' ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'}`}>
                                            {previewTemplate === 'daily' ? <Activity size={16} /> : <ShieldIcon size={16} />}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">{previewTemplate === 'daily' ? 'Wellness Check' : 'Weekly Health Check'}</h3>
                                            <p className="text-[10px] text-slate-500">{previewTemplate === 'daily' ? 'Daily · 8 questions · <2 min' : 'Deep check · FIFA/IOC · ~5 min'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                        <X size={16} className="text-slate-400" />
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
                                            { id: 'd2', label: 'Health Check', type: 'Yes / No', instruction: 'Do you have any physical complaint today?', options: ['No', 'Yes'], colors: ['bg-emerald-500', 'bg-amber-500'] },
                                            { id: 'd2b', label: 'Complaint Areas', type: 'Buttons', instruction: 'Tap affected area(s) on body map with severity.', options: ['Body Map — front & back view', 'Severity: Minor → Moderate → Severe'], colors: ['bg-slate-800', 'bg-amber-500'], note: 'Only shown if complaint = Yes' },
                                            { id: 'd3', label: 'Fatigue', type: '1-10 Scale', instruction: '1 = Fully fresh → 10 = Completely exhausted', negative: true },
                                            { id: 'd4', label: 'Muscle Soreness', type: '1-10 Scale', instruction: '1 = No soreness → 10 = Severe pain', negative: true },
                                            { id: 'd5', label: 'Sleep Quality', type: '1-10 Scale', instruction: '1 = Very poor → 10 = Outstanding', negative: false },
                                            { id: 'd6', label: 'Stress', type: '1-10 Scale', instruction: '1 = Completely relaxed → 10 = Extreme stress', negative: true },
                                            { id: 'd7', label: 'Mood', type: '1-10 Scale', instruction: '1 = Very low → 10 = Exceptional', negative: false },
                                            { id: 'd8', label: 'Sleep Duration', type: 'Number', instruction: 'Hours slept last night. Quick-select: 5-9h.', quickSelect: ['5h', '6h', '7h', '8h', '9h'] },
                                            { id: 'd9', label: 'Readiness', type: 'Buttons', instruction: 'How ready are you to train today?', options: ['Ready to Train', 'Slightly Compromised', 'Not Ready'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'] },
                                        ] : [
                                            { id: 'w0', label: 'Introduction', type: 'Buttons', instruction: 'Explains why the form is needed. Not a question.', options: ['Continue'], colors: ['bg-slate-800'], note: 'Auto-passes — info screen only' },
                                            { id: 'w1', label: 'Problem Type', type: 'Buttons', instruction: 'What best describes your current issue?', options: ['Injury (musculoskeletal)', 'Illness'], colors: ['bg-slate-800', 'bg-slate-800'] },
                                            { id: 'w2', label: 'Onset', type: 'Buttons', instruction: 'Was it a specific event or has it built up?', options: ['Sudden Onset', 'Gradual Onset'], colors: ['bg-slate-800', 'bg-slate-800'] },
                                            { id: 'w3', label: 'Status', type: 'Buttons', instruction: 'Has this happened before in the same area?', options: ['New Problem', 'Recurrence (healed, came back)', 'Exacerbation (never fully healed)'], colors: ['bg-slate-800', 'bg-slate-800', 'bg-slate-800'] },
                                            { id: 'w4', label: 'Body Area', type: 'Buttons', instruction: 'Body map with reference image. Tap areas, tap again for severity.', options: ['FIFA body areas — front & back view', 'Hip and Groin separated', 'Severity: Minor → Moderate → Severe'], colors: ['bg-slate-800', 'bg-amber-500', 'bg-rose-500'] },
                                            { id: 'w5', label: 'Side', type: 'Buttons', instruction: 'Which side is affected?', options: ['Left', 'Right', 'Bilateral (both)', 'Central'], colors: ['bg-slate-800', 'bg-slate-800', 'bg-slate-800', 'bg-slate-800'] },
                                            { id: 'w6', label: 'Mechanism', type: 'List', instruction: 'What activity caused or triggered it?', options: ['Running', 'Change of direction', 'Kicking', 'Landing', 'Tackle', 'Collision', 'Jumping', 'Other'], note: 'Only shown for sudden onset' },
                                            { id: 'w7', label: 'Contact Type', type: 'List', instruction: 'Did this involve contact?', options: ['Non-contact', 'Indirect contact', 'Direct — Opponent', 'Direct — Teammate', 'Direct — Ball', 'Direct — Goal post'], note: 'Only shown for sudden onset' },
                                            { id: 'w8', label: 'Performance Impact', type: 'Buttons', instruction: 'How much is this affecting your training?', options: ['No Impact', 'Minor (can fully train)', 'Moderate (reduced performance)', 'Severe (cannot complete session)'], colors: ['bg-emerald-500', 'bg-lime-500', 'bg-amber-500', 'bg-rose-500'] },
                                            { id: 'w9', label: 'Expected Time-Loss', type: 'Buttons', instruction: 'How long do you expect this to affect availability?', options: ['0 days', '1–3 days', '4–7 days', '8–28 days', '29+ days'], colors: ['bg-slate-800', 'bg-slate-800', 'bg-slate-800', 'bg-slate-800', 'bg-slate-800'] },
                                            { id: 'w10', label: 'Fatigue Trend', type: 'Buttons', instruction: 'Over the past week, how has your fatigue trended?', options: ['Improving', 'Stable', 'Worsening'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'] },
                                            { id: 'w11', label: 'Sleep Trend', type: 'Buttons', instruction: 'Over the past week, how has your sleep trended?', options: ['Improving', 'Stable', 'Worsening'], colors: ['bg-emerald-500', 'bg-amber-500', 'bg-rose-500'] },
                                            { id: 'w12', label: 'Nutrition', type: '1-10 Scale', instruction: '1 = Very poor → 10 = Outstanding', negative: false },
                                            { id: 'w13', label: 'Hydration', type: '1-10 Scale', instruction: '1 = Very poor → 10 = Outstanding', negative: false },
                                            { id: 'w14', label: 'Stress Sources', type: 'Multi', instruction: 'What are your main stress sources right now?', options: ['Football / Sport', 'Work / School', 'Personal', 'None'] },
                                        ];

                                        const negColors = ['bg-emerald-400', 'bg-emerald-400', 'bg-lime-400', 'bg-lime-400', 'bg-yellow-400', 'bg-yellow-400', 'bg-amber-400', 'bg-orange-400', 'bg-red-400', 'bg-red-500'];
                                        const posColors = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-yellow-400', 'bg-yellow-400', 'bg-lime-400', 'bg-lime-400', 'bg-emerald-400', 'bg-emerald-400'];

                                        return questions.map((q, i) => {
                                            const isExpanded = expandedPreviewQ === q.id;
                                            return (
                                                <div key={q.id}>
                                                    <div onClick={() => setExpandedPreviewQ(isExpanded ? null : q.id)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isExpanded ? 'bg-slate-100 ring-1 ring-slate-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                                                        <div className="w-6 h-6 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-semibold text-slate-800">{q.label}</span>
                                                                <span className="text-[9px] font-medium text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded">{q.type}</span>
                                                            </div>
                                                            {q.note && <p className="text-[9px] text-amber-500 italic mt-0.5">{q.note}</p>}
                                                        </div>
                                                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    {/* Mini phone preview */}
                                                    {isExpanded && (
                                                        <div className="flex justify-center py-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                            <div className="w-[220px] bg-white rounded-[20px] shadow-xl border border-slate-200 overflow-hidden">
                                                                {/* Phone notch */}
                                                                <div className="bg-slate-50 px-4 pt-2 pb-1.5 flex items-center justify-between">
                                                                    <div className="flex items-center gap-1">
                                                                        <div className="w-4 h-4 bg-indigo-600 rounded-[4px] flex items-center justify-center">
                                                                            <Activity size={8} className="text-white" />
                                                                        </div>
                                                                        <span className="text-[7px] font-bold text-slate-700">SportsLab</span>
                                                                    </div>
                                                                    <span className="text-[7px] text-slate-400">{i + 1}/{questions.length}</span>
                                                                </div>
                                                                {/* Progress bar */}
                                                                <div className="h-[2px] bg-slate-100">
                                                                    <div className={`h-full ${previewTemplate === 'daily' ? 'bg-cyan-500' : 'bg-amber-500'}`} style={{ width: `${((i + 1) / questions.length) * 100}%` }} />
                                                                </div>
                                                                {/* Content */}
                                                                <div className="px-4 py-3 space-y-2">
                                                                    <h3 className="text-[10px] font-bold text-slate-900">{q.label}</h3>
                                                                    {q.instruction && <p className="text-[7px] text-slate-500">{q.instruction}</p>}

                                                                    {/* Render based on type */}
                                                                    {q.type === 'Buttons' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-1.5 rounded-lg border text-[7px] font-semibold ${j === 0 ? `${q.colors?.[j] || 'bg-slate-800'} text-white border-transparent` : 'bg-white border-slate-100 text-slate-600'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Yes / No' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-2 rounded-lg border text-[8px] font-bold ${j === 0 ? `${q.colors?.[j] || 'bg-emerald-500'} text-white border-transparent` : 'bg-white border-slate-100 text-slate-600'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.type === '1-10 Scale' && (
                                                                        <div>
                                                                            <div className="flex justify-between text-[6px] text-slate-400 mb-1 px-0.5">
                                                                                <span>{q.lowLabel}</span>
                                                                                <span>{q.highLabel}</span>
                                                                            </div>
                                                                            <div className="grid grid-cols-5 gap-[3px]">
                                                                                {[1,2,3,4,5,6,7,8,9,10].map(v => {
                                                                                    const colors = q.negative ? negColors : posColors;
                                                                                    return (
                                                                                        <div key={v} className={`aspect-square rounded-md flex items-center justify-center text-[7px] font-bold ${v === 3 ? `${colors[v-1]} text-white` : 'bg-slate-100 text-slate-500'}`}>
                                                                                            {v}
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Number' && (
                                                                        <div className="space-y-1.5">
                                                                            <div className="bg-slate-50 border border-slate-200 rounded-lg py-2 text-center text-[12px] font-bold text-slate-900">7.5</div>
                                                                            <div className="flex gap-1">
                                                                                {(q.quickSelect || []).map(h => (
                                                                                    <div key={h} className={`flex-1 py-1 rounded-md text-center text-[7px] font-bold ${h === '7h' ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{h}</div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'List' && q.options && (
                                                                        <div className="space-y-[3px] max-h-[80px] overflow-y-auto">
                                                                            {q.options.slice(0, 6).map((opt, j) => (
                                                                                <div key={j} className={`px-2 py-1.5 rounded-md border text-[7px] font-semibold ${j === 0 ? 'bg-slate-800 text-white border-transparent' : 'bg-white border-slate-100 text-slate-600'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                            {q.options.length > 6 && <div className="text-[7px] text-slate-400 text-center">+{q.options.length - 6} more</div>}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Multi' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-1.5 rounded-lg border text-[7px] font-semibold ${j === 0 ? 'bg-cyan-500 text-white border-transparent' : 'bg-white border-slate-100 text-slate-600'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {q.type === 'Colour Scale' && q.options && (
                                                                        <div className="space-y-1">
                                                                            {q.options.map((opt, j) => (
                                                                                <div key={j} className={`px-2.5 py-1.5 rounded-lg border text-[7px] font-semibold ${j === 0 ? `${q.colors?.[j] || 'bg-emerald-500'} text-white border-transparent` : 'bg-white border-slate-100 text-slate-600'}`}>
                                                                                    {opt}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Footer */}
                                                                <div className="px-4 py-2 border-t border-slate-100">
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
                                    <div className={`mt-4 p-3 ${previewTemplate === 'daily' ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'} border rounded-xl`}>
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
                    <div className="border-t border-slate-200 pt-2">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Custom Templates</h3>
                    </div>

                    <QuestionnaireManager
                        wellnessTemplates={wellnessTemplates}
                        setWellnessTemplates={setWellnessTemplates}
                    />
                </div>
            )}
        </div>
    );
};

export default WellnessHub;
