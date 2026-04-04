// @ts-nocheck
/**
 * WellnessFlagPanel — Shows flagged athletes from the auto-detection engine
 *
 * Displays red and amber flags with trigger details, pending/completed weekly status,
 * and links to the weekly deep check form.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { DatabaseService } from '../../services/databaseService';
import { AlertTriangleIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

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

    // Group flags by athlete, show most recent per athlete
    const groupedFlags = useMemo(() => {
        const groups = new Map<string, any[]>();
        for (const f of flags) {
            const aid = f.athlete_id;
            if (!groups.has(aid)) groups.set(aid, []);
            groups.get(aid)!.push(f);
        }
        // Sort each group by date descending
        for (const [, arr] of groups) arr.sort((a, b) => b.flag_date.localeCompare(a.flag_date));
        // Sort groups: red first, then by flag count
        return Array.from(groups.entries())
            .map(([athleteId, athleteFlags]) => ({
                athleteId,
                name: athleteMap.get(athleteId) || 'Unknown',
                flags: athleteFlags,
                hasRed: athleteFlags.some(f => f.flag_type === 'red'),
                hasPending: athleteFlags.some(f => !f.weekly_completed),
            }))
            .sort((a, b) => {
                if (a.hasRed && !b.hasRed) return -1;
                if (!a.hasRed && b.hasRed) return 1;
                return b.flags.length - a.flags.length;
            });
    }, [flags, athleteMap]);

    const pendingCount = groupedFlags.filter(g => g.hasPending).length;
    const totalFlags = flags.length;

    if (loading) return null;
    if (totalFlags === 0) return null; // no flags = nothing to show

    return (
        <div className="bg-white border border-amber-200 rounded-xl shadow-sm overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-amber-50/50 hover:bg-amber-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <AlertTriangleIcon size={16} className="text-amber-600" />
                    <span className="text-sm font-semibold text-slate-800">
                        Wellness Flags
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {pendingCount} pending
                    </span>
                </div>
                {expanded ? <ChevronUpIcon size={14} className="text-slate-400" /> : <ChevronDownIcon size={14} className="text-slate-400" />}
            </button>

            {expanded && (
                <div className="divide-y divide-slate-100">
                    {groupedFlags.map(group => (
                        <div key={group.athleteId} className="px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${group.hasRed ? 'bg-rose-500' : 'bg-amber-400'}`} />
                                    <span className="text-xs font-semibold text-slate-800">{group.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {group.hasPending ? (
                                        <span className="flex items-center gap-1 text-[9px] font-semibold text-amber-600">
                                            <ClockIcon size={10} /> Weekly pending
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                                            <CheckCircleIcon size={10} /> Resolved
                                        </span>
                                    )}
                                    {group.hasPending && (
                                        <a
                                            href={`/weekly-wellness/${teamId}/${group.athleteId}`}
                                            target="_blank"
                                            rel="noopener"
                                            className="flex items-center gap-1 text-[9px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                        >
                                            <ExternalLinkIcon size={9} /> Weekly link
                                        </a>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {group.flags.slice(0, 4).map((f, i) => (
                                    <span key={i} className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${
                                        f.flag_type === 'red' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
                                    }`}>
                                        {FLAG_LABELS[f.trigger_field] || f.trigger_field}: {f.trigger_value}
                                        <span className="text-slate-300 ml-1">{f.flag_date?.slice(5)}</span>
                                    </span>
                                ))}
                                {group.flags.length > 4 && (
                                    <span className="text-[9px] text-slate-400">+{group.flags.length - 4} more</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WellnessFlagPanel;
