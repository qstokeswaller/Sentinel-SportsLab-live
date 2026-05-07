// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { ACWR_UTILS, ACWR_METRIC_TYPES } from '../../utils/constants';
import { UsersIcon, UserIcon, TargetIcon, CalendarIcon, ChevronDownIcon, ChevronRightIcon, ArrowRightIcon, InfoIcon } from 'lucide-react';

/**
 * ScenarioModellingTerminal — ACWR Load Predictor
 *
 * Uses the EWMA-based ACWR engine to:
 * 1. Compute current acute/chronic for the selected team or athlete
 * 2. Solve algebraically for the daily load needed to hit a target ACWR
 * 3. Project optimal loads for the next 7 days (team average + per-player)
 * 4. Allow "what-if" manual overrides to see projected ACWR impact
 * 5. Respects the team/athlete's configured load model (sRPE, sprint distance, etc.)
 */
export const ScenarioModellingTerminal = ({
    scheduledSessions = [],
    loadRecords = [],
    wellnessData = [],
    selectedAnalyticsAthleteId,
    subjectAthleteIds,
    selectedSubject,
    acwrSettings = {},
    teams = [],
}) => {
    const [targetRatio, setTargetRatio] = useState(1.0);
    const [projectionDays, setProjectionDays] = useState(7);
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [manualOverrides, setManualOverrides] = useState({});
    const [viewMode, setViewMode] = useState('optimal'); // 'optimal' | 'whatif'

    const isTeam = (subjectAthleteIds || []).length > 1;

    // Resolve ACWR settings for the current subject
    const resolvedSettings = useMemo(() => {
        if (isTeam && selectedSubject?.id) {
            return acwrSettings[selectedSubject.id] || acwrSettings[`team_${selectedSubject.id}`] || {};
        }
        if (selectedAnalyticsAthleteId) {
            return acwrSettings[`ind_${selectedAnalyticsAthleteId}`] || {};
        }
        return {};
    }, [acwrSettings, isTeam, selectedSubject, selectedAnalyticsAthleteId]);

    const metricType = resolvedSettings.method || 'srpe';
    const acuteN = resolvedSettings.acuteWindow || 7;
    const chronicN = resolvedSettings.chronicWindow || 28;
    const freezeRestDays = resolvedSettings.freezeRestDays || false;
    const metricInfo = ACWR_METRIC_TYPES[metricType] || ACWR_METRIC_TYPES.srpe;

    // Compute current ACWR state for team or individual
    const teamACWR = useMemo(() => {
        if (!isTeam) return null;
        return ACWR_UTILS.calculateTeamACWR(loadRecords, subjectAthleteIds, {
            metricType: metricType !== 'srpe' ? metricType : undefined,
            acuteN, chronicN, freezeRestDays
        });
    }, [loadRecords, subjectAthleteIds, metricType, acuteN, chronicN, freezeRestDays, isTeam]);

    const individualACWR = useMemo(() => {
        if (isTeam) return null;
        return ACWR_UTILS.calculateAthleteACWR(loadRecords, selectedAnalyticsAthleteId, {
            metricType: metricType !== 'srpe' ? metricType : undefined,
            acuteN, chronicN, freezeRestDays
        });
    }, [loadRecords, selectedAnalyticsAthleteId, metricType, acuteN, chronicN, freezeRestDays, isTeam]);

    const currentACWR = isTeam ? teamACWR : individualACWR;
    const currentAcute = currentACWR?.acute || 0;
    const currentChronic = currentACWR?.chronic || 0;
    const currentRatio = currentACWR?.ratio || 0;

    // Team-level optimal projection
    const teamProjection = useMemo(() => {
        if (currentChronic === 0 && currentAcute === 0) return [];
        return ACWR_UTILS.projectOptimalWeek(currentAcute, currentChronic, projectionDays, targetRatio, acuteN, chronicN);
    }, [currentAcute, currentChronic, projectionDays, targetRatio, acuteN, chronicN]);

    // Per-player ACWR states + individual projections (for team view)
    const playerBreakdowns = useMemo(() => {
        if (!isTeam) return [];
        const players = selectedSubject?.players || [];
        return players.map(p => {
            const acwr = ACWR_UTILS.calculateAthleteACWR(loadRecords, p.id, {
                metricType: metricType !== 'srpe' ? metricType : undefined,
                acuteN, chronicN, freezeRestDays
            });
            const projection = (acwr.acute > 0 || acwr.chronic > 0)
                ? ACWR_UTILS.projectOptimalWeek(acwr.acute, acwr.chronic, projectionDays, targetRatio, acuteN, chronicN)
                : [];
            return { ...p, acwr, projection };
        }).sort((a, b) => (b.acwr.ratio || 0) - (a.acwr.ratio || 0));
    }, [isTeam, selectedSubject, loadRecords, metricType, acuteN, chronicN, freezeRestDays, projectionDays, targetRatio]);

    // What-if projection using manual overrides
    const whatIfProjection = useMemo(() => {
        if (viewMode !== 'whatif') return [];
        const dailyLoads = Array.from({ length: projectionDays }, (_, i) => {
            const override = manualOverrides[i + 1];
            if (override !== undefined && override !== '') return Number(override);
            // Fall back to optimal suggestion
            const optDay = teamProjection[i];
            return optDay ? optDay.load : 0;
        });
        return ACWR_UTILS.projectWithLoads(currentAcute, currentChronic, dailyLoads, acuteN, chronicN);
    }, [viewMode, manualOverrides, currentAcute, currentChronic, projectionDays, acuteN, chronicN, teamProjection]);

    const activeProjection = viewMode === 'whatif' ? whatIfProjection : teamProjection;

    // Date labels for projection days
    const getDateLabel = (dayOffset) => {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const getRatioColor = (r) => {
        if (r === 0) return 'text-slate-400';
        if (r < 0.8) return 'text-sky-500';
        if (r <= 1.3) return 'text-emerald-500';
        if (r <= 1.5) return 'text-amber-500';
        return 'text-rose-500';
    };

    const getRatioBg = (r) => {
        if (r === 0) return 'bg-slate-100';
        if (r < 0.8) return 'bg-sky-50';
        if (r <= 1.3) return 'bg-emerald-50';
        if (r <= 1.5) return 'bg-amber-50';
        return 'bg-rose-50';
    };

    const getBarColor = (r) => {
        if (r > 1.5) return 'bg-rose-500';
        if (r > 1.3) return 'bg-amber-500';
        if (r < 0.8) return 'bg-sky-400';
        return 'bg-indigo-500';
    };

    const statusInfo = ACWR_UTILS.getRatioStatus(currentRatio);

    const hasData = currentAcute > 0 || currentChronic > 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header + Controls */}
            <div className="bg-white p-8 rounded-xl border border-indigo-100 shadow-sm space-y-6">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h4 className="text-2xl font-semibold uppercase tracking-tighter text-indigo-900">Load Predictor</h4>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mt-1">
                            EWMA-based load recommendations to maintain optimal ACWR
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-[10px] font-semibold uppercase text-indigo-900">
                                {metricInfo.label}
                            </span>
                            <span className="text-[9px] text-indigo-400">({metricInfo.unit})</span>
                        </div>
                        {isTeam && (
                            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                                <UsersIcon size={12} className="text-slate-500" />
                                <span className="text-[10px] font-semibold text-slate-700">{(subjectAthleteIds || []).length} Athletes</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Current State Summary */}
                {hasData ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Current ACWR</div>
                            <div className={`text-2xl font-bold tracking-tight ${getRatioColor(currentRatio)}`}>
                                {currentRatio.toFixed(2)}
                            </div>
                            <div className={`text-[9px] font-semibold uppercase mt-1 ${statusInfo.color}`}>{statusInfo.label}</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Acute Load</div>
                            <div className="text-2xl font-bold tracking-tight text-indigo-900">{currentAcute}</div>
                            <div className="text-[9px] text-slate-400">{acuteN}-day EWMA</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Chronic Load</div>
                            <div className="text-2xl font-bold tracking-tight text-indigo-900">{currentChronic}</div>
                            <div className="text-[9px] text-slate-400">{chronicN}-day EWMA</div>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <div className="text-[9px] font-bold text-slate-400 uppercase mb-1">Load Model</div>
                            <div className="text-lg font-bold tracking-tight text-indigo-900">{metricInfo.label}</div>
                            <div className="text-[9px] text-slate-400">{metricInfo.desc}</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <InfoIcon size={24} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            No training load data found for {selectedSubject?.name}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1">Log loads via the ACWR Monitoring dashboard first</p>
                    </div>
                )}

                {/* Controls Row */}
                {hasData && (
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <TargetIcon size={14} className="text-indigo-500" />
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Target ACWR:</label>
                            <select
                                value={targetRatio}
                                onChange={(e) => setTargetRatio(parseFloat(e.target.value))}
                                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-300"
                            >
                                <option value={0.85}>0.85 — Conservative</option>
                                <option value={0.9}>0.90 — Low-end Optimal</option>
                                <option value={0.95}>0.95 — Mid Optimal</option>
                                <option value={1.0}>1.00 — Sweet Spot</option>
                                <option value={1.05}>1.05 — Progressive</option>
                                <option value={1.1}>1.10 — Overreaching (planned)</option>
                                <option value={1.2}>1.20 — High Progressive</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={14} className="text-indigo-500" />
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Days:</label>
                            <select
                                value={projectionDays}
                                onChange={(e) => { setProjectionDays(parseInt(e.target.value)); setManualOverrides({}); }}
                                className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-300"
                            >
                                <option value={3}>3 Days</option>
                                <option value={5}>5 Days</option>
                                <option value={7}>7 Days</option>
                                <option value={10}>10 Days</option>
                                <option value={14}>14 Days</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('optimal')}
                                className={`text-[10px] font-semibold px-3 py-1.5 rounded-md transition-all ${viewMode === 'optimal' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Optimal Plan
                            </button>
                            <button
                                onClick={() => setViewMode('whatif')}
                                className={`text-[10px] font-semibold px-3 py-1.5 rounded-md transition-all ${viewMode === 'whatif' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                What-If
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {hasData && (
                <>
                    {/* Projected Load Table */}
                    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100">
                            <h4 className="text-lg font-semibold uppercase tracking-tighter text-indigo-900">
                                {viewMode === 'optimal' ? 'Recommended Daily Loads' : 'What-If Scenario'}
                            </h4>
                            <p className="text-[10px] text-indigo-400 font-semibold uppercase mt-0.5">
                                {viewMode === 'optimal'
                                    ? `Loads calculated to maintain ACWR at ${targetRatio.toFixed(2)} — ${isTeam ? 'team average per athlete' : 'individual'}`
                                    : 'Edit loads below to see projected ACWR impact'}
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="text-left text-[9px] font-bold text-slate-500 uppercase px-6 py-3">Day</th>
                                        <th className="text-left text-[9px] font-bold text-slate-500 uppercase px-4 py-3">Date</th>
                                        <th className="text-right text-[9px] font-bold text-slate-500 uppercase px-4 py-3">
                                            {viewMode === 'whatif' ? 'Planned Load' : 'Suggested Load'}
                                        </th>
                                        <th className="text-right text-[9px] font-bold text-slate-500 uppercase px-4 py-3">Acute</th>
                                        <th className="text-right text-[9px] font-bold text-slate-500 uppercase px-4 py-3">Chronic</th>
                                        <th className="text-right text-[9px] font-bold text-slate-500 uppercase px-6 py-3">ACWR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeProjection.map((point) => (
                                        <tr key={point.day} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-3">
                                                <span className="text-xs font-bold text-indigo-900">D+{point.day}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-xs text-slate-600">{getDateLabel(point.day)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {viewMode === 'whatif' ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={manualOverrides[point.day] !== undefined ? manualOverrides[point.day] : point.load}
                                                        onChange={(e) => setManualOverrides(prev => ({ ...prev, [point.day]: e.target.value }))}
                                                        className="w-20 text-right text-xs font-bold bg-indigo-50 border border-indigo-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-bold text-indigo-900">
                                                        {point.load} <span className="text-[9px] text-slate-400 font-normal">{metricInfo.unit}</span>
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-xs text-slate-600">{point.acute}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="text-xs text-slate-600">{point.chronic}</span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${getRatioBg(point.ratio)} ${getRatioColor(point.ratio)}`}>
                                                    {point.ratio.toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* ACWR Trajectory Chart */}
                    <div className="bg-white p-8 rounded-xl border border-indigo-100 shadow-sm space-y-6">
                        <h4 className="text-lg font-semibold uppercase tracking-tighter text-indigo-900">ACWR Trajectory</h4>
                        <div className="h-56 flex items-end justify-between gap-1 px-4 border-b border-l border-indigo-50 relative pt-10">
                            {/* Zone markers */}
                            <div className="absolute top-2 left-0 right-0 flex justify-between px-4">
                                <span className="text-[8px] font-semibold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded">Sweet Spot 0.8–1.3</span>
                                <span className="text-[8px] font-semibold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">Danger &gt;1.5</span>
                            </div>
                            {/* Reference line at 1.0 */}
                            <div className="absolute left-0 right-0 border-t border-dashed border-emerald-200" style={{ bottom: `${(1.0 / 2.0) * 100}%` }}>
                                <span className="text-[7px] text-emerald-400 absolute -top-2 left-1">1.0</span>
                            </div>
                            <div className="absolute left-0 right-0 border-t border-dashed border-rose-200" style={{ bottom: `${(1.5 / 2.0) * 100}%` }}>
                                <span className="text-[7px] text-rose-400 absolute -top-2 left-1">1.5</span>
                            </div>
                            {activeProjection.map((point) => {
                                const h = Math.min(Math.max(point.ratio * 50, 8), 95);
                                return (
                                    <div key={point.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                                        <div
                                            className={`w-full max-w-10 rounded-t-lg transition-all ${getBarColor(point.ratio)}`}
                                            style={{ height: `${h}%` }}
                                        ></div>
                                        <div className="text-[8px] font-semibold text-slate-400">D+{point.day}</div>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded transition-all z-10 whitespace-nowrap">
                                            {point.ratio.toFixed(2)} ACWR · {point.load} {metricInfo.unit}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Per-Player Drill-Down (Team view only) */}
                    {isTeam && playerBreakdowns.length > 0 && (
                        <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
                            <div className="px-8 py-5 border-b border-slate-100">
                                <h4 className="text-lg font-semibold uppercase tracking-tighter text-indigo-900">Individual Athlete Loads</h4>
                                <p className="text-[10px] text-indigo-400 font-semibold uppercase mt-0.5">
                                    Per-player suggested loads to maintain ACWR at {targetRatio.toFixed(2)}
                                </p>
                            </div>

                            <div className="divide-y divide-slate-50">
                                {playerBreakdowns.map(player => {
                                    const isExpanded = expandedPlayer === player.id;
                                    const pStatus = ACWR_UTILS.getRatioStatus(player.acwr.ratio || 0);
                                    const hasPlayerData = player.acwr.acute > 0 || player.acwr.chronic > 0;

                                    return (
                                        <div key={player.id}>
                                            <button
                                                onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                                                className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <span className="text-[10px] font-bold text-indigo-700">
                                                            {(player.name || '??').split(' ').map(n => n[0]).join('').toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-sm font-semibold text-slate-900">{player.name}</div>
                                                        <div className="text-[9px] text-slate-400">
                                                            {hasPlayerData
                                                                ? `A: ${player.acwr.acute} · C: ${player.acwr.chronic}`
                                                                : 'No load data'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {hasPlayerData && (
                                                        <>
                                                            <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${pStatus.bg} ${pStatus.color}`}>
                                                                {(player.acwr.ratio || 0).toFixed(2)}
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-[9px] text-slate-400 uppercase">Next Day</div>
                                                                <div className="text-sm font-bold text-indigo-900">
                                                                    {player.projection[0]?.load || '—'} <span className="text-[9px] text-slate-400 font-normal">{metricInfo.unit}</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                    {isExpanded ? <ChevronDownIcon size={16} className="text-slate-400" /> : <ChevronRightIcon size={16} className="text-slate-400" />}
                                                </div>
                                            </button>

                                            {isExpanded && hasPlayerData && (
                                                <div className="px-8 pb-5">
                                                    <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr className="bg-slate-100/50">
                                                                    <th className="text-left text-[9px] font-bold text-slate-500 uppercase px-4 py-2">Day</th>
                                                                    <th className="text-left text-[9px] font-bold text-slate-500 uppercase px-4 py-2">Date</th>
                                                                    <th className="text-right text-[9px] font-bold text-slate-500 uppercase px-4 py-2">Suggested Load</th>
                                                                    <th className="text-right text-[9px] font-bold text-slate-500 uppercase px-4 py-2">Proj. ACWR</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {player.projection.map((pt) => (
                                                                    <tr key={pt.day} className="border-t border-slate-100">
                                                                        <td className="px-4 py-2 text-xs font-semibold text-indigo-900">D+{pt.day}</td>
                                                                        <td className="px-4 py-2 text-xs text-slate-600">{getDateLabel(pt.day)}</td>
                                                                        <td className="px-4 py-2 text-right text-xs font-bold text-indigo-900">
                                                                            {pt.load} <span className="text-[9px] text-slate-400 font-normal">{metricInfo.unit}</span>
                                                                        </td>
                                                                        <td className="px-4 py-2 text-right">
                                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getRatioBg(pt.ratio)} ${getRatioColor(pt.ratio)}`}>
                                                                                {pt.ratio.toFixed(2)}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Deviation flag */}
                                                    {player.projection[0] && teamProjection[0] && (
                                                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
                                                            <ArrowRightIcon size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                                                            <p className="text-[10px] text-indigo-700 leading-relaxed">
                                                                {(() => {
                                                                    const diff = player.projection[0].load - teamProjection[0].load;
                                                                    const pct = teamProjection[0].load > 0 ? Math.round((diff / teamProjection[0].load) * 100) : 0;
                                                                    if (Math.abs(pct) < 10) return `${player.name}'s recommended load is aligned with team average.`;
                                                                    if (diff > 0) return `${player.name} needs ${Math.abs(pct)}% MORE load than team average — their chronic base is higher, they can handle more to maintain the target ratio.`;
                                                                    return `${player.name} needs ${Math.abs(pct)}% LESS load than team average — their acute load is elevated relative to chronic base. Consider reducing intensity.`;
                                                                })()}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Summary Insight Card */}
                    <div className="bg-white p-8 rounded-xl border border-indigo-100 shadow-sm">
                        <h4 className="text-lg font-semibold uppercase tracking-tighter text-indigo-900 mb-4">Insight Summary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className={`p-5 rounded-xl border ${getRatioBg(currentRatio)} ${currentRatio > 1.3 ? 'border-amber-200' : currentRatio < 0.8 ? 'border-sky-200' : 'border-emerald-200'}`}>
                                <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">Current State</div>
                                <p className="text-[11px] leading-relaxed text-slate-700">
                                    {currentRatio > 1.5
                                        ? 'ACWR is in the danger zone. The model strongly recommends de-loading for the next few days to allow chronic fitness to catch up with the acute spike.'
                                        : currentRatio > 1.3
                                            ? 'ACWR is elevated into the caution zone. Moderate the next few sessions — the suggested loads will gradually bring the ratio back to optimal range.'
                                            : currentRatio < 0.8
                                                ? 'ACWR is below optimal — the athlete/team is undertrained. The model recommends progressively increasing load to build acute fitness without overshooting.'
                                                : 'ACWR is within the optimal sweet spot. The suggested loads maintain this balance while allowing for progressive training adaptation.'}
                                </p>
                            </div>
                            <div className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                                <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">Tomorrow's Target</div>
                                <div className="text-3xl font-bold text-indigo-900 tracking-tight">
                                    {activeProjection[0]?.load || '—'}
                                    <span className="text-sm text-slate-400 font-normal ml-1">{metricInfo.unit}</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    {isTeam ? 'Average per athlete' : 'Individual target'} to {targetRatio >= 1.1 ? 'progressively overload' : 'maintain'} at {targetRatio.toFixed(2)} ACWR
                                </p>
                            </div>
                            <div className="p-5 rounded-xl border border-slate-100 bg-slate-50">
                                <div className="text-[9px] font-bold text-slate-500 uppercase mb-2">End-of-Period ACWR</div>
                                <div className={`text-3xl font-bold tracking-tight ${getRatioColor(activeProjection[activeProjection.length - 1]?.ratio || 0)}`}>
                                    {(activeProjection[activeProjection.length - 1]?.ratio || 0).toFixed(2)}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1">
                                    Projected after {projectionDays} days following the {viewMode === 'optimal' ? 'recommended' : 'planned'} loads
                                </p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
