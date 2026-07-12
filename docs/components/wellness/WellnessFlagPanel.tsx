/**
 * WellnessFlagPanel — Shows flagged athletes from the auto-detection engine
 *
 * Displays red and amber flags with trigger details, grouped by date with
 * date separator rows (matching the Individual Rundown table pattern).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { AlertTriangleIcon, CheckCircleIcon, ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon, CalendarIcon } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';

interface FlagPanelProps {
    teamId: string;
    athletes: { id: string; name: string }[];
    /** Initial expand/collapse state for the flag list. Defaults to `true`
     *  to preserve legacy behaviour; the Option A Wellness Hub layout passes
     *  `false` so the panel renders header-only until the coach opens it. */
    defaultExpanded?: boolean;
    /** Optional click handler invoked when a flagged-athlete row is clicked.
     *  When provided, the parent typically navigates into that athlete's
     *  drill-in view with Flag History auto-opened. If omitted, rows are
     *  non-clickable (the "Deep Check" link still works as before). */
    onAthleteClick?: (athleteId: string) => void;
}

const FLAG_LABELS: Record<string, string> = {
    availability: 'Availability',
    health_complaint: 'Health Complaint',
    fatigue: 'Fatigue',
    sleep_hours: 'Sleep',
    soreness: 'Soreness',
    stress: 'Stress',
    readiness: 'Readiness',
    mood: 'Mood',
};

const localDateStr = (d: Date = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Range options (in days) — Today = 1, then 3/7/14/30. Shared with Individual
// Rundown so the date-picker UX is consistent across the Wellness Hub.
const RANGE_OPTIONS: { id: number; label: string }[] = [
    { id: 1,  label: 'Today' },
    { id: 3,  label: '3d' },
    { id: 7,  label: '7d' },
    { id: 14, label: '14d' },
    { id: 30, label: '30d' },
];

// Inclusive window: (asOf - rangeDays + 1) -> asOf. Range=1 -> single day.
function computeWindow(asOfDate: string, rangeDays: number) {
    const [y, m, d] = asOfDate.split('-').map(Number);
    const end = new Date(y, m - 1, d);
    const start = new Date(y, m - 1, d - rangeDays + 1);
    return { from: localDateStr(start), to: localDateStr(end) };
}

const formatDateSep = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const todayStr = localDateStr();
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yesterdayStr = yest.toISOString().split('T')[0];
    const label = `${dt.toLocaleDateString('en-GB', { weekday: 'long' })}  ${dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    const badge = dateStr === todayStr ? 'Today' : dateStr === yesterdayStr ? 'Yesterday' : null;
    return { label, badge };
};

const WellnessFlagPanel: React.FC<FlagPanelProps> = ({ teamId, athletes, defaultExpanded = true, onAthleteClick }) => {
    const [flags, setFlags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(defaultExpanded);
    // Date-scope state — same UX as Individual Rundown. Defaults to today only.
    const [asOfDate, setAsOfDate] = useState<string>(() => localDateStr());
    const [rangeDays, setRangeDays] = useState<number>(1);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await DatabaseService.fetchWellnessFlags(teamId, false);
                setFlags(data);
            } catch (err) {
                console.warn('Failed to load wellness flags:', err);
            } finally {
                setLoading(false);
            }
        };
        if (teamId) load();
    }, [teamId]);

    const athleteMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const a of athletes) m.set(a.id, a.name);
        return m;
    }, [athletes]);

    // Apply the date scope. Filters all flags to those whose flag_date falls
    // within the (asOfDate - rangeDays + 1, asOfDate] inclusive window.
    const scopedFlags = useMemo(() => {
        const { from, to } = computeWindow(asOfDate, rangeDays);
        return flags.filter(f => f.flag_date >= from && f.flag_date <= to);
    }, [flags, asOfDate, rangeDays]);

    // Group scoped flags by date desc, then by athlete WITHIN each date so we
    // render one row per (athlete, date) pair with all their triggered rules as
    // inline pills. Previously each rule was its own row, which made one athlete
    // with multiple thresholds tripped (e.g. Soreness 7 + Health Complaint = yes)
    // appear as two visually-noisy rows. Now: one row, two pills.
    const byDate = useMemo(() => {
        const sorted = [...scopedFlags].sort((a, b) => b.flag_date.localeCompare(a.flag_date));
        const groups: { date: string; athletes: { athleteId: string; triggers: any[]; weeklyCompleted: boolean; topSeverity: 'red' | 'amber' }[] }[] = [];
        for (const f of sorted) {
            let dateGroup = groups.find(g => g.date === f.flag_date);
            if (!dateGroup) {
                dateGroup = { date: f.flag_date, athletes: [] };
                groups.push(dateGroup);
            }
            let athleteEntry = dateGroup.athletes.find(a => a.athleteId === f.athlete_id);
            if (!athleteEntry) {
                athleteEntry = { athleteId: f.athlete_id, triggers: [], weeklyCompleted: !!f.weekly_completed, topSeverity: f.flag_type === 'red' ? 'red' : 'amber' };
                dateGroup.athletes.push(athleteEntry);
            }
            athleteEntry.triggers.push(f);
            // Aggregate severity — if any trigger is red, the athlete row reads red
            if (f.flag_type === 'red') athleteEntry.topSeverity = 'red';
            // Aggregate completion — row reads "Done" only if EVERY trigger has been followed up
            if (!f.weekly_completed) athleteEntry.weeklyCompleted = false;
        }
        return groups;
    }, [scopedFlags]);

    // Pending count is now scoped — only flags within the active window
    const pendingCount = useMemo(() => {
        const pendingAthletes = new Set(scopedFlags.filter(f => !f.weekly_completed).map(f => f.athlete_id));
        return pendingAthletes.size;
    }, [scopedFlags]);

    if (loading) return null;
    // Render the panel even with zero flags in window — coaches need the picker
    // visible to broaden their scope. Empty state shown inside.
    if (flags.length === 0) return null;

    return (
        <div className="bg-white dark:bg-[#132338] border border-amber-200 dark:border-amber-500/40 rounded-xl shadow-sm overflow-hidden">
            {/* Header: chevron + title + scoped pending count.
                The picker (range buttons + as-of date) lives in its own row
                below so it stays visible even when the body is collapsed
                — coaches can re-scope without expanding. */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-50 dark:hover:bg-amber-500/20 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <AlertTriangleIcon size={16} className="text-amber-600 dark:text-amber-300" />
                    <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Wellness Flags</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/25 text-amber-700 dark:text-amber-200">
                        {pendingCount} pending
                    </span>
                </div>
                {expanded ? <ChevronUpIcon size={14} className="text-slate-400 dark:text-[#CBD5E1]" /> : <ChevronDownIcon size={14} className="text-slate-400 dark:text-[#CBD5E1]" />}
            </button>

            {/* Scope picker — range buttons + as-of date input */}
            <div className="px-4 py-2 border-t border-amber-100 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-1 flex-wrap">
                    {RANGE_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={e => { e.stopPropagation(); setRangeDays(opt.id); }}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                                rangeDays === opt.id
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-white dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243A58]'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1]">
                    <CalendarIcon size={12} />
                    <span className="text-[9px] uppercase tracking-wide text-slate-400 dark:text-[#94A3B8]">As of</span>
                    <DatePicker value={asOfDate} onChange={e => { setAsOfDate(e.target.value || localDateStr()); }} max={localDateStr()} />
                </div>
            </div>

            {expanded && byDate.length === 0 && (
                <div className="px-4 py-6 text-center">
                    <CheckCircleIcon size={20} className="mx-auto text-emerald-300 dark:text-emerald-500/60 mb-2" />
                    <p className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">
                        No flags in this window
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">
                        Pick a wider range or shift the as-of date to look back further.
                    </p>
                </div>
            )}

            {expanded && byDate.length > 0 && (
                <div className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                    {byDate.map(({ date, athletes: athleteEntries }) => {
                        const { label, badge } = formatDateSep(date);
                        return (
                            <React.Fragment key={date}>
                                {/* ── Date separator ── */}
                                <div className="px-4 py-2 bg-slate-50/70 dark:bg-[#0F1C30]/60 border-t border-slate-100 dark:border-[#1A2D48] flex items-center gap-2.5">
                                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-[#CBD5E1]">{label}</span>
                                    {badge && (
                                        <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/50">
                                            {badge}
                                        </span>
                                    )}
                                    <span className="ml-auto text-[8px] font-semibold text-slate-300 dark:text-[#CBD5E1] uppercase tracking-wide">
                                        {athleteEntries.length} athlete{athleteEntries.length !== 1 ? 's' : ''} flagged
                                    </span>
                                </div>

                                {/* ── Athletes flagged this date — one row each with all their trigger pills inline ── */}
                                {athleteEntries.map(entry => {
                                    const name = athleteMap.get(entry.athleteId) || 'Unknown';
                                    const isRed = entry.topSeverity === 'red';
                                    // Row click drills into the athlete's profile with Flag History
                                    // auto-opened (parent wires the navigation via onAthleteClick).
                                    // The Deep Check anchor below stops propagation so coaches who
                                    // want to action the flag form stay on the secondary path.
                                    const rowClickable = !!onAthleteClick;
                                    return (
                                        <div
                                            key={`${entry.athleteId}-${date}`}
                                            onClick={rowClickable ? () => onAthleteClick!(entry.athleteId) : undefined}
                                            className={`px-4 py-2.5 flex items-center gap-3 transition-colors ${rowClickable ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2D48]/60' : 'hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/40'}`}
                                            title={rowClickable ? `Open ${name}'s flag history` : undefined}
                                        >
                                            {/* Severity dot — uses the highest severity across this athlete's triggers (red wins over amber) */}
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${isRed ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                            <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0] min-w-[120px] truncate">{name}</span>
                                            {/* Inline pills — one per triggered rule */}
                                            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                                {entry.triggers.map((f, i) => {
                                                    const triggerIsRed = f.flag_type === 'red';
                                                    return (
                                                        <span
                                                            key={`${f.trigger_field}-${i}`}
                                                            className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${triggerIsRed ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40' : 'bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40'}`}
                                                        >
                                                            {FLAG_LABELS[f.trigger_field] || f.trigger_field}: {f.trigger_value}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                            <span className="ml-auto flex items-center gap-2 shrink-0">
                                                {/* Action: open weekly deep-check form for this athlete.
                                                    "Done" badge shows only when ALL triggers for this
                                                    athlete on this day have a follow-up completed. */}
                                                {!entry.weeklyCompleted ? (
                                                    <a
                                                        href={`/weekly-wellness/${teamId}/${entry.athleteId}`}
                                                        target="_blank"
                                                        rel="noopener"
                                                        onClick={e => e.stopPropagation()}
                                                        className="flex items-center gap-1 text-[9px] font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 transition-colors"
                                                    >
                                                        <ExternalLinkIcon size={9} /> Deep Check
                                                    </a>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                        <CheckCircleIcon size={10} /> Done
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default WellnessFlagPanel;
