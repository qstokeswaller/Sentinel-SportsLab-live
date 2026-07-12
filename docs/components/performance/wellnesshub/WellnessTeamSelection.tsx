// @ts-nocheck — moved verbatim from WellnessHub.tsx (restructure step 6,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// Team selection screen — entry view of the Wellness Hub.
import React from 'react';
import { Users, ChevronRight, ClipboardList, AlertTriangle, Activity, Zap } from 'lucide-react';
import { resolveAvailability, formatDate, TODAY } from './shared';

export const WellnessTeamSelection: React.FC<any> = ({
    handleLoadWellnessResponses,
    setSelectedTeamId,
    setViewMode,
    teams,
    wellnessResponses,
}) => {
    return (
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
};

export default WellnessTeamSelection;
