import React, { useState, useMemo } from 'react';
import {
    Search, Users, ChevronRight, ArrowLeft, ClipboardList, AlertTriangle,
    Share2, Calendar, Activity, CheckCircle2, Clock, Copy, Zap, Link2, Plus, X,
    BarChart3,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import QuestionnaireManager from './QuestionnaireManager';
import WellnessChartCard from '../charts/WellnessChartCard';
import { BodyMapArea } from '../../types/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split('T')[0];

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Returns 'green' | 'amber' | 'red' | null for a wellness response */
const getAthleteStatus = (res: any): 'green' | 'amber' | 'red' | null => {
    if (!res) return null;
    if (res.availability === 'unavailable' || (res.injury_report?.areas?.length || 0) > 0 || (res.rpe || 0) >= 9) return 'red';
    if (res.availability === 'modified' || (res.rpe || 0) >= 7) return 'amber';
    return 'green';
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

    // Auto-reload when selectedTeamId or wellnessDateRange changes
    React.useEffect(() => {
        if (selectedTeamId && viewMode === 'dashboard') {
            handleLoadWellnessResponses(selectedTeamId, wellnessDateRange);
        }
    }, [selectedTeamId, wellnessDateRange, viewMode]);

    // Responses for currently selected team
    const filteredResponses = useMemo(() =>
        selectedTeamId
            ? wellnessResponses.filter(r => r.team_id === selectedTeamId)
            : wellnessResponses,
        [wellnessResponses, selectedTeamId]
    );

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
        available:   filteredResponses.filter(r => r.availability === 'available').length,
        modified:    filteredResponses.filter(r => r.availability === 'modified').length,
        unavailable: filteredResponses.filter(r => r.availability === 'unavailable').length,
        alerts:      filteredResponses.filter(r => (r.rpe || 0) >= 8 || r.injury_report || r.availability === 'unavailable').length,
    }), [filteredResponses]);

    const activeTeam    = teams.find(t => t.id === selectedTeamId);
    const activeAthlete = athletes.find(a => a.id === selectedAthleteId);

    // ── SELECTION (home) ────────────────────────────────────────────────────
    const renderSelection = () => (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h2 className="text-4xl font-semibold text-slate-900 tracking-tighter">Wellness Hub</h2>
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
                    const fullCount      = todayRes.filter(r => r.availability === 'available').length;
                    const modCount       = todayRes.filter(r => r.availability === 'modified').length;
                    const outCount       = todayRes.filter(r => r.availability === 'unavailable').length;
                    const alertCount     = todayRes.filter(r => (r.rpe || 0) >= 8 || r.injury_report || r.availability === 'unavailable').length;
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
                        onClick={() => setViewMode('share')}
                        className="p-3.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all shadow-lg shadow-cyan-200"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

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
                                    <div className="text-5xl font-semibold mt-2 tracking-tighter">
                                        {Math.round((filteredResponses.length / (activeTeam?.players.length || 1)) * 100)}%
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">
                                        {filteredResponses.length} of {activeTeam?.players.length} athletes
                                    </p>
                                </div>
                                <div className="pt-8 flex gap-1.5">
                                    {(activeTeam?.players || []).slice(0, 6).map((_, i) => (
                                        <div key={i} className={`flex-1 h-1.5 rounded-full overflow-hidden ${i < filteredResponses.length ? 'bg-cyan-500' : 'bg-white/10'}`} />
                                    ))}
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
                                .filter(r => (r.rpe || 0) >= 8 || r.injury_report || r.availability === 'unavailable')
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
                        <tbody className="divide-y divide-slate-50">
                            {(activeTeam?.players || [])
                                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(player => {
                                    const res         = filteredResponses.find(r => r.athlete_id === player.id);
                                    const status      = getAthleteStatus(res);
                                    const injuryCount = res?.injury_report?.areas?.length || 0;
                                    return (
                                        <tr key={player.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="pl-5 pr-1 py-4">
                                                {status
                                                    ? <span className={`w-3 h-3 rounded-full block ${STATUS_DOT[status]} shadow-sm`} />
                                                    : <span className="w-3 h-3 rounded-full block bg-slate-200" />
                                                }
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100 shrink-0">
                                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt="" />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-semibold text-slate-900">{player.name}</div>
                                                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{player.subsection}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 font-semibold uppercase text-[9px]">
                                                {res?.availability === 'available'   && <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">Full</span>}
                                                {res?.availability === 'modified'    && <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">Modified</span>}
                                                {res?.availability === 'unavailable' && <span className="text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">Out</span>}
                                                {!res?.availability && <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                {res?.rpe ? (
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                                                        res.rpe >= 9 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                        res.rpe >= 7 ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                       'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>{res.rpe}/10</span>
                                                ) : <span className="text-slate-300 text-[10px] font-bold">—</span>}
                                            </td>
                                            <td className="px-4 py-4">
                                                {injuryCount > 0 ? (
                                                    <div className="flex items-center gap-1.5 text-rose-500">
                                                        <AlertTriangle size={13} />
                                                        <span className="text-[10px] font-semibold">{injuryCount} Area{injuryCount > 1 ? 's' : ''}</span>
                                                    </div>
                                                ) : res ? (
                                                    <div className="flex items-center gap-1.5 text-emerald-500">
                                                        <CheckCircle2 size={13} />
                                                        <span className="text-[10px] font-semibold uppercase">Clear</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-200 text-[10px]">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedAthleteId(player.id); setViewMode('athlete'); }}
                                                    className="p-2 bg-white border border-slate-100 rounded-lg text-slate-400 hover:text-cyan-600 hover:border-cyan-100 hover:shadow-sm transition-all"
                                                >
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>
            </>)}
            {dashboardTab === 'insights' && renderInsightsTab()}
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
                    {res?.availability && (
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide ${
                            res.availability === 'available'   ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            res.availability === 'modified'    ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                  'bg-rose-50 text-rose-600 border border-rose-100'
                        }`}>
                            {res.availability === 'available' ? 'Full Training' : res.availability === 'modified' ? 'Modified Training' : 'Unavailable'}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Metric chips */}
                    <div className="bg-white p-8 rounded-xl border-2 border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-semibold uppercase text-slate-900">Entry Analysis</h3>
                        {res ? (
                            <div className="flex flex-wrap gap-3">
                                {Object.entries(res.responses).map(([qid, val]: [string, any]) => {
                                    if (typeof val !== 'number') return null;
                                    const qText = wellnessTemplates.flatMap((t: any) => t.questions || [])
                                        .find((q: any) => q.id === qid)?.text || qid;
                                    // Color chip by value — heuristic: low is good for RPE/stress/fatigue, high is good for energy/sleep
                                    const isHighBad = ['rpe', 'stress', 'fatigue'].some(k => qid.toLowerCase().includes(k));
                                    const chipColor = isHighBad
                                        ? (val >= 8 ? 'bg-rose-50 text-rose-700 border-rose-100' : val >= 6 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100')
                                        : 'bg-slate-50 text-slate-700 border-slate-100';
                                    return (
                                        <div key={qid} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold ${chipColor}`}>
                                            <span className="uppercase tracking-tight text-[9px] font-bold opacity-60">{qText.slice(0, 18)}</span>
                                            <span className="text-sm">{val}</span>
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

                    {/* Body Map */}
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
                    </div>
                </div>
            </div>
        );
    };

    // ── SHARE PANEL ──────────────────────────────────────────────────────────
    const renderSharePanel = () => {
        const templatesWithLinks = wellnessTemplates.map((t: any) => ({
            ...t,
            url: `${window.location.origin}/wellness-form/${t.id}/${selectedTeamId}`,
        }));

        const activeLink = selectedTemplate ? `${window.location.origin}/wellness-form/${selectedTemplate.id}/${selectedTeamId}` : '';

        const handleCopy = async () => {
            await navigator.clipboard.writeText(activeLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        };

        const waUrl = `https://wa.me/?text=${encodeURIComponent(`Complete your wellness check-in here: ${activeLink}`)}`;

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
                            Send to athletes — no login required
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Template list + create card */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide ml-1">Select Questionnaire</label>
                        <div className="space-y-3">
                            {/* Existing templates */}
                            {templatesWithLinks.map((t: any) => {
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

                                {/* URL copy row */}
                                <div className="bg-slate-50 border-2 border-slate-100 rounded-xl p-4 flex items-center gap-3">
                                    <p className="text-[10px] font-mono text-slate-400 truncate flex-1">{activeLink}</p>
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
                                    <a
                                        href={waUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full py-3.5 bg-[#25D366] text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-[#1ebe5d] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={14} /> Share via WhatsApp
                                    </a>
                                </div>

                                <p className="text-[9px] font-bold text-slate-300 uppercase text-center tracking-wide">
                                    Athletes open the link on their device — no app or login needed.
                                </p>
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
