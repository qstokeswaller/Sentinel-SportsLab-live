// @ts-nocheck — moved verbatim from WellnessHub.tsx (restructure step 4,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// Single-athlete drilldown: daily/weekly response history + flag history with
// collapsible range-chip sections.
import React from 'react';
import {
    ArrowLeft, AlertTriangle, Activity, CheckCircle2, Clock, ChevronDown, Thermometer,
} from 'lucide-react';
import { AthleteAvatar } from '../../roster/AthleteAvatar';
import WellnessSparklines from '../../wellness/WellnessSparklines';
import { BodyMapArea } from '../../../types/types';
import { resolveAvailability, getAthleteStatus, STATUS_DOT, TODAY, HISTORY_RANGE_OPTIONS } from './shared';

interface Props {
    activeAthlete: any;
    selectedAthleteId: string | null;
    wellnessResponses: any[];
    filteredResponses: any[];
    athleteFlagHistory: any[];
    historyDailyDays: number;
    setHistoryDailyDays: (n: number) => void;
    historyWeeklyDays: number;
    setHistoryWeeklyDays: (n: number) => void;
    historyFlagDays: number;
    setHistoryFlagDays: (n: number) => void;
    isDailyHistOpen: boolean;
    setIsDailyHistOpen: (b: boolean) => void;
    isWeeklyHistOpen: boolean;
    setIsWeeklyHistOpen: (b: boolean) => void;
    isFlagHistOpen: boolean;
    setIsFlagHistOpen: (b: boolean) => void;
    setViewMode: (m: string) => void;
}

export const WellnessAthleteView: React.FC<Props> = ({
    activeAthlete, selectedAthleteId, wellnessResponses, filteredResponses,
    athleteFlagHistory,
    historyDailyDays, setHistoryDailyDays,
    historyWeeklyDays, setHistoryWeeklyDays,
    historyFlagDays, setHistoryFlagDays,
    isDailyHistOpen, setIsDailyHistOpen,
    isWeeklyHistOpen, setIsWeeklyHistOpen,
    isFlagHistOpen, setIsFlagHistOpen,
    setViewMode,
}) => {
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

export default WellnessAthleteView;
