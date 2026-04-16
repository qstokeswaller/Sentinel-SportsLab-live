// @ts-nocheck
/**
 * WellnessFlagPanel — Shows flagged athletes from the auto-detection engine
 *
 * Displays red and amber flags with trigger details, grouped by date with
 * date separator rows (matching the Individual Rundown table pattern).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon, ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon, XIcon } from 'lucide-react';

interface FlagPanelProps {
    teamId: string;
    athletes: { id: string; name: string }[];
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

const localDateStr = () => new Date().toISOString().split('T')[0];

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

const WellnessFlagPanel: React.FC<FlagPanelProps> = ({ teamId, athletes }) => {
    const [flags, setFlags] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);

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

    // Group flags by date descending — each entry is one flag row
    const byDate = useMemo(() => {
        const sorted = [...flags].sort((a, b) => b.flag_date.localeCompare(a.flag_date));
        const groups: { date: string; items: any[] }[] = [];
        for (const f of sorted) {
            const last = groups[groups.length - 1];
            if (last && last.date === f.flag_date) last.items.push(f);
            else groups.push({ date: f.flag_date, items: [f] });
        }
        return groups;
    }, [flags]);

    const pendingCount = useMemo(() => {
        const pendingAthletes = new Set(flags.filter(f => !f.weekly_completed).map(f => f.athlete_id));
        return pendingAthletes.size;
    }, [flags]);

    if (loading) return null;
    if (flags.length === 0) return null;

    return (
        <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-amber-50/50 hover:bg-amber-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <AlertTriangleIcon size={16} className="text-amber-600" />
                    <span className="text-sm font-semibold text-slate-800">Wellness Flags</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {pendingCount} pending
                    </span>
                </div>
                {expanded ? <ChevronUpIcon size={14} className="text-slate-400" /> : <ChevronDownIcon size={14} className="text-slate-400" />}
            </button>

            {expanded && (
                <div className="divide-y divide-slate-100">
                    {byDate.map(({ date, items }) => {
                        const { label, badge } = formatDateSep(date);
                        return (
                            <React.Fragment key={date}>
                                {/* ── Date separator ── */}
                                <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2.5">
                                    <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
                                    {badge && (
                                        <span className="text-[8px] font-bold uppercase px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 border border-cyan-100">
                                            {badge}
                                        </span>
                                    )}
                                    <span className="ml-auto text-[8px] font-semibold text-slate-300 uppercase tracking-wide">
                                        {items.length} flag{items.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* ── Flags for this date ── */}
                                {items.map((f, i) => {
                                    const name = athleteMap.get(f.athlete_id) || 'Unknown';
                                    const isRed = f.flag_type === 'red';
                                    return (
                                        <div key={`${f.athlete_id}-${f.trigger_field}-${i}`} className="px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${isRed ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                            <span className="text-xs font-semibold text-slate-800 min-w-[120px] truncate">{name}</span>
                                            <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${isRed ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                                                {FLAG_LABELS[f.trigger_field] || f.trigger_field}: {f.trigger_value}
                                            </span>
                                            <span className="ml-auto flex items-center gap-2 shrink-0">
                                                {!f.weekly_completed ? (
                                                    <>
                                                        <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-600">
                                                            <ClockIcon size={10} /> Pending
                                                        </span>
                                                        <a
                                                            href={`/weekly-wellness/${teamId}/${f.athlete_id}`}
                                                            target="_blank"
                                                            rel="noopener"
                                                            className="flex items-center gap-1 text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                        >
                                                            <ExternalLinkIcon size={9} /> Deep Check
                                                        </a>
                                                    </>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
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
