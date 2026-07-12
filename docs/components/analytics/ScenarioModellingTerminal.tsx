import React, { useState, useMemo, useEffect } from 'react';
import { AthleteAvatar } from '../roster/AthleteAvatar';
import { ACWR_UTILS, ACWR_METRIC_TYPES } from '../../utils/constants';
import {
    UsersIcon, TargetIcon, CalendarIcon, ChevronDownIcon, ChevronRightIcon,
    ArrowRightIcon, InfoIcon, LockIcon, UnlockIcon, ZapIcon, BarChart2Icon,
    BookmarkIcon, Trash2Icon, TrophyIcon, FlaskConicalIcon, GitCompareIcon,
} from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import { supabase } from '../../lib/supabase';

// ─── Anchor projection helper ─────────────────────────────────────────────────
// Iterates day-by-day: pinned days use their fixed load; others are algebraically
// solved to hit the target ACWR given the running EWMA state at that point.
const buildAnchorProjection = (startAcute, startChronic, days, targetRatio, acuteN, chronicN, pinnedDays, anchorInputs) => {
    const lA = 2 / (acuteN + 1);
    const lC = 2 / (chronicN + 1);
    let a = startAcute, c = startChronic;
    return Array.from({ length: days }, (_, i) => {
        const day = i + 1;
        const pinned = pinnedDays.has(day);
        const rawInput = anchorInputs[day];
        const load = pinned && rawInput !== undefined && rawInput !== ''
            ? Math.max(0, Number(rawInput))
            : Math.max(0, ACWR_UTILS.solveLoadForTargetACWR(a, c, targetRatio, acuteN, chronicN));
        a = load * lA + a * (1 - lA);
        c = load * lC + c * (1 - lC);
        return {
            day,
            load: Math.round(load),
            acute: Math.round(a),
            chronic: Math.round(c),
            ratio: c > 0 ? parseFloat((a / c).toFixed(2)) : 0,
            isPinned: pinned,
        };
    });
};

// ─── Safe-range helper ────────────────────────────────────────────────────────
// Projects two parallel trajectories — one targeting ACWR 0.8 (lower green edge)
// and one targeting 1.3 (upper green edge) — day-by-day so each day's bounds
// account for the cumulative effect of prior days' auto-solved loads.
const buildSafeRange = (startAcute, startChronic, days, acuteN, chronicN) => {
    const lA = 2 / (acuteN + 1);
    const lC = 2 / (chronicN + 1);
    let aLo = startAcute, cLo = startChronic;
    let aHi = startAcute, cHi = startChronic;
    return Array.from({ length: days }, (_, i) => {
        const minLoad = Math.max(0, ACWR_UTILS.solveLoadForTargetACWR(aLo, cLo, 0.8,  acuteN, chronicN));
        const maxLoad = Math.max(0, ACWR_UTILS.solveLoadForTargetACWR(aHi, cHi, 1.3,  acuteN, chronicN));
        aLo = minLoad * lA + aLo * (1 - lA);
        cLo = minLoad * lC + cLo * (1 - lC);
        aHi = maxLoad * lA + aHi * (1 - lA);
        cHi = maxLoad * lC + cHi * (1 - lC);
        return { day: i + 1, minLoad: Math.round(minLoad), maxLoad: Math.round(maxLoad) };
    });
};


export const ScenarioModellingTerminal = ({
    scheduledSessions = [],
    loadRecords = [],
    wellnessData = [],
    selectedAnalyticsAthleteId,
    subjectAthleteIds,
    selectedSubject,
    acwrSettings = {},
    teams = [],
    periodizationPlans = [],
}) => {
    const SCENARIO_COLORS = ['#6366f1', '#10b981', '#f59e0b'];

    const [targetRatio,    setTargetRatio]    = useState(1.0);
    const [projectionDays, setProjectionDays] = useState(7);
    const [expandedPlayer, setExpandedPlayer] = useState(null);
    const [manualOverrides, setManualOverrides] = useState({});
    const [viewMode,       setViewMode]       = useState('optimal'); // 'optimal' | 'anchor' | 'whatif'
    const [showSafeRange,  setShowSafeRange]  = useState(true);

    // Anchor-mode state
    const [anchorInputs, setAnchorInputs] = useState({});   // { [day]: string }
    const [pinnedDays,   setPinnedDays]   = useState(new Set()); // Set<number>

    // Scenario save/compare state
    const [savedScenarios,  setSavedScenarios]  = useState([]);
    const [savingName,      setSavingName]      = useState('');
    const [showSaveInput,   setShowSaveInput]   = useState(false);
    const [compareMode,     setCompareMode]     = useState(false);
    const [dbSaving,        setDbSaving]        = useState(false);
    const [dbError,         setDbError]         = useState('');

    // Load saved scenarios from Supabase on mount
    useEffect(() => {
        const subjectKey = selectedAnalyticsAthleteId || '';
        if (!subjectKey) return;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('analytics_scenarios')
                .select('*')
                .eq('user_id', user.id)
                .or(subjectKey.startsWith('team_')
                    ? `team_id.eq.${subjectKey.replace('team_', '')}`
                    : `athlete_id.eq.${subjectKey}`)
                .order('created_at', { ascending: false })
                .limit(3);
            if (data && data.length > 0) {
                setSavedScenarios(data.map((row, i) => ({
                    id:            row.id,
                    name:          row.name,
                    projection:    row.projection || [],
                    targetRatio:   row.target_ratio,
                    projectionDays:row.projection_days,
                    mode:          row.mode,
                    pinnedCount:   ((row.pinned_days as any[]) || []).length,
                    color:         SCENARIO_COLORS[i % 3],
                    dbId:          row.id,
                })));
            }
        })();
    }, [selectedAnalyticsAthleteId]);

    const isTeam = (subjectAthleteIds || []).length > 1;

    const resolvedSettings = useMemo(() => {
        if (isTeam && selectedSubject?.id) {
            return acwrSettings[selectedSubject.id] || acwrSettings[`team_${selectedSubject.id}`] || {};
        }
        if (selectedAnalyticsAthleteId) {
            return acwrSettings[`ind_${selectedAnalyticsAthleteId}`] || {};
        }
        return {};
    }, [acwrSettings, isTeam, selectedSubject, selectedAnalyticsAthleteId]);

    const metricType    = resolvedSettings.method        || 'srpe';
    const acuteN        = resolvedSettings.acuteWindow   || 7;
    const chronicN      = resolvedSettings.chronicWindow || 28;
    const freezeRestDays = resolvedSettings.freezeRestDays || false;
    const metricInfo    = ACWR_METRIC_TYPES[metricType] || ACWR_METRIC_TYPES.srpe;

    const teamACWR = useMemo(() => {
        if (!isTeam) return null;
        return ACWR_UTILS.calculateTeamACWR(loadRecords, subjectAthleteIds, {
            metricType: metricType !== 'srpe' ? metricType : undefined,
            acuteN, chronicN, freezeRestDays,
        });
    }, [loadRecords, subjectAthleteIds, metricType, acuteN, chronicN, freezeRestDays, isTeam]);

    const individualACWR = useMemo(() => {
        if (isTeam) return null;
        return ACWR_UTILS.calculateAthleteACWR(loadRecords, selectedAnalyticsAthleteId, {
            metricType: metricType !== 'srpe' ? metricType : undefined,
            acuteN, chronicN, freezeRestDays,
        });
    }, [loadRecords, selectedAnalyticsAthleteId, metricType, acuteN, chronicN, freezeRestDays, isTeam]);

    const currentACWR   = isTeam ? teamACWR : individualACWR;
    const currentAcute  = currentACWR?.acute   || 0;
    const currentChronic = currentACWR?.chronic || 0;
    const currentRatio  = currentACWR?.ratio    || 0;
    const hasData       = currentAcute > 0 || currentChronic > 0;

    // ── Historical load band (last 28 days from ACWR history) ─────────────────
    const historicalBand = useMemo(() => {
        const loads = (currentACWR?.loads || []).filter(v => typeof v === 'number' && v >= 0);
        if (loads.length === 0) return null;
        const recent = loads.slice(-28);
        const nonZero = recent.filter(v => v > 0);
        if (nonZero.length === 0) return null;
        const min  = Math.round(Math.min(...nonZero));
        const max  = Math.round(Math.max(...nonZero));
        const avg  = Math.round(nonZero.reduce((s, v) => s + v, 0) / nonZero.length);
        const sorted = [...nonZero].sort((a, b) => a - b);
        const p75  = Math.round(sorted[Math.floor(sorted.length * 0.75)] ?? max);
        const chartBars = loads.slice(-14); // last 14 days for mini-chart
        return { min, max, avg, p75, chartBars, n: nonZero.length };
    }, [currentACWR]);

    // ── Projections ───────────────────────────────────────────────────────────
    const teamProjection = useMemo(() => {
        if (!hasData) return [];
        return ACWR_UTILS.projectOptimalWeek(currentAcute, currentChronic, projectionDays, targetRatio, acuteN, chronicN);
    }, [currentAcute, currentChronic, projectionDays, targetRatio, acuteN, chronicN, hasData]);

    const anchorProjection = useMemo(() => {
        if (!hasData) return [];
        return buildAnchorProjection(currentAcute, currentChronic, projectionDays, targetRatio, acuteN, chronicN, pinnedDays, anchorInputs);
    }, [hasData, currentAcute, currentChronic, projectionDays, targetRatio, acuteN, chronicN, pinnedDays, anchorInputs]);

    const whatIfProjection = useMemo(() => {
        if (viewMode !== 'whatif') return [];
        const dailyLoads = Array.from({ length: projectionDays }, (_, i) => {
            const override = manualOverrides[i + 1];
            if (override !== undefined && override !== '') return Number(override);
            return teamProjection[i]?.load || 0;
        });
        return ACWR_UTILS.projectWithLoads(currentAcute, currentChronic, dailyLoads, acuteN, chronicN);
    }, [viewMode, manualOverrides, currentAcute, currentChronic, projectionDays, acuteN, chronicN, teamProjection]);

    // ── Safe range (green-zone bounds per day) ────────────────────────────────
    const safeRange = useMemo(() => {
        if (!hasData) return [];
        return buildSafeRange(currentAcute, currentChronic, projectionDays, acuteN, chronicN);
    }, [hasData, currentAcute, currentChronic, projectionDays, acuteN, chronicN]);

    const activeProjection = viewMode === 'whatif' ? whatIfProjection
        : viewMode === 'anchor'  ? anchorProjection
        : teamProjection;

    // ── Upcoming periodization plan events within projection window ───────────
    const upcomingPlanEvents = useMemo(() => {
        if (!periodizationPlans || periodizationPlans.length === 0) return [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const results = [];
        for (const plan of periodizationPlans) {
            const subjectMatch = plan.targetId === selectedSubject?.id
                || (!isTeam && plan.targetId === selectedAnalyticsAthleteId);
            if (!subjectMatch) continue;
            for (const evt of (plan.events || [])) {
                if (!evt.date) continue;
                const evtDate = new Date(evt.date);
                evtDate.setHours(0, 0, 0, 0);
                const dayOffset = Math.round((evtDate.getTime() - today.getTime()) / 86400000);
                if (dayOffset >= 1 && dayOffset <= projectionDays) {
                    results.push({ ...evt, dayOffset, planName: plan.name });
                }
            }
        }
        return results.sort((a, b) => a.dayOffset - b.dayOffset);
    }, [periodizationPlans, selectedSubject, selectedAnalyticsAthleteId, isTeam, projectionDays]);

    // ── Per-player breakdown ──────────────────────────────────────────────────
    const playerBreakdowns = useMemo(() => {
        if (!isTeam) return [];
        const players = selectedSubject?.players || [];
        return players.map(p => {
            const acwr = ACWR_UTILS.calculateAthleteACWR(loadRecords, p.id, {
                metricType: metricType !== 'srpe' ? metricType : undefined,
                acuteN, chronicN, freezeRestDays,
            });
            const projection = (acwr.acute > 0 || acwr.chronic > 0)
                ? ACWR_UTILS.projectOptimalWeek(acwr.acute, acwr.chronic, projectionDays, targetRatio, acuteN, chronicN)
                : [];
            return { ...p, acwr, projection };
        }).sort((a, b) => (b.acwr.ratio || 0) - (a.acwr.ratio || 0));
    }, [isTeam, selectedSubject, loadRecords, metricType, acuteN, chronicN, freezeRestDays, projectionDays, targetRatio]);

    // ── Anchor mode helpers ───────────────────────────────────────────────────
    const setAnchorLoad = (day, value) => {
        setAnchorInputs(prev => ({ ...prev, [day]: value }));
        if (value !== '') {
            setPinnedDays(prev => new Set([...prev, day]));
        } else {
            setPinnedDays(prev => { const n = new Set(prev); n.delete(day); return n; });
        }
    };

    const togglePin = (day) => {
        setPinnedDays(prev => {
            const n = new Set(prev);
            if (n.has(day)) n.delete(day);
            else n.add(day);
            return n;
        });
    };

    const resetAnchors = () => { setAnchorInputs({}); setPinnedDays(new Set()); };

    // Pin a plan event day with a suggested load (P75 of history, else sensible default)
    const anchorPlanEvent = (dayOffset) => {
        const suggestedLoad = historicalBand?.p75 || Math.round(currentAcute * 1.2) || 300;
        setAnchorInputs(prev => ({ ...prev, [dayOffset]: String(suggestedLoad) }));
        setPinnedDays(prev => new Set([...prev, dayOffset]));
        if (viewMode !== 'anchor') setViewMode('anchor');
    };

    // Save current projection as a named scenario (max 3)
    const saveCurrentScenario = async () => {
        const name = savingName.trim();
        if (!name || savedScenarios.length >= 3) return;
        setDbSaving(true);
        setDbError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const isTeamSubject = selectedAnalyticsAthleteId?.startsWith('team_');
            const row = {
                user_id:         user?.id,
                team_id:         isTeamSubject ? selectedAnalyticsAthleteId.replace('team_', '') : null,
                athlete_id:      !isTeamSubject ? selectedAnalyticsAthleteId : null,
                name,
                mode:            viewMode,
                target_ratio:    targetRatio,
                projection_days: projectionDays,
                metric_type:     metricType,
                pinned_days:     [...pinnedDays],
                anchor_inputs:   anchorInputs,
                manual_overrides:manualOverrides,
                projection:      activeProjection,
            };
            const { data, error } = await supabase
                .from('analytics_scenarios')
                .insert(row as any)
                .select()
                .single();
            if (error) throw error;
            setSavedScenarios(prev => [...prev, {
                id:            data.id,
                name,
                projection:    activeProjection,
                targetRatio,
                projectionDays,
                mode:          viewMode,
                pinnedCount:   pinnedDays.size,
                color:         SCENARIO_COLORS[prev.length % 3],
                dbId:          data.id,
            }]);
        } catch (e: any) {
            setDbError(e.message || 'Failed to save scenario');
        } finally {
            setDbSaving(false);
            setSavingName('');
            setShowSaveInput(false);
        }
    };

    const deleteScenarioFromDb = async (scenario) => {
        if (scenario.dbId) {
            await supabase.from('analytics_scenarios').delete().eq('id', scenario.dbId);
        }
        setSavedScenarios(prev => prev.filter(s => s.id !== scenario.id));
    };

    const deleteScenario = (id) => deleteScenarioFromDb(savedScenarios.find(s => s.id === id));

    // ── Utilities ─────────────────────────────────────────────────────────────
    const getDateLabel = (dayOffset) => {
        const d = new Date();
        d.setDate(d.getDate() + dayOffset);
        return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    };

    const getRatioColor = (r) => {
        if (r === 0)  return 'text-slate-400';
        if (r < 0.8)  return 'text-sky-500';
        if (r <= 1.3) return 'text-emerald-500';
        if (r <= 1.5) return 'text-amber-500';
        return 'text-rose-500';
    };

    const getRatioBg = (r) => {
        if (r === 0)  return 'bg-slate-100';
        if (r < 0.8)  return 'bg-sky-50';
        if (r <= 1.3) return 'bg-emerald-50';
        if (r <= 1.5) return 'bg-amber-50';
        return 'bg-rose-50';
    };

    const getBarColor = (r) => {
        if (r > 1.5)  return 'bg-rose-500';
        if (r > 1.3)  return 'bg-amber-500';
        if (r < 0.8)  return 'bg-sky-400';
        return 'bg-indigo-500';
    };


    const statusInfo = ACWR_UTILS.getRatioStatus(currentRatio);
    const pinnedCount = pinnedDays.size;

    return (
        <div className="space-y-4 animate-in fade-in duration-500">

            {/* ── Header + Current State ────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-5">
                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <h4 className="text-lg font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">Scenario Modelling</h4>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mt-1">
                            EWMA load projections · anchor heavy days · safe-zone ranges
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-600 px-3 py-2 rounded-lg">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span className="text-[10px] font-semibold uppercase text-indigo-900 dark:text-indigo-300">{metricInfo.label}</span>
                            <span className="text-[9px] text-indigo-400">({metricInfo.unit})</span>
                        </div>
                        {isTeam && (
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#1A2D48] px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                <UsersIcon size={12} className="text-slate-500" />
                                <span className="text-[10px] font-semibold text-slate-700 dark:text-[#CBD5E1]">{(subjectAthleteIds || []).length} Athletes</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Current state cards */}
                {hasData ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
                        <div className="bg-slate-50 dark:bg-[#1A2D48] rounded-xl p-4 border border-slate-100 dark:border-[#243A58]">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase mb-1">Current ACWR</div>
                            <div className={`text-2xl font-bold tracking-tight ${getRatioColor(currentRatio)}`}>{currentRatio.toFixed(2)}</div>
                            <div className={`text-[9px] font-semibold uppercase mt-1 ${statusInfo.color}`}>{statusInfo.label}</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-[#1A2D48] rounded-xl p-4 border border-slate-100 dark:border-[#243A58]">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase mb-1">Acute Load</div>
                            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#E2E8F0]">{currentAcute}</div>
                            <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{acuteN}-day EWMA</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-[#1A2D48] rounded-xl p-4 border border-slate-100 dark:border-[#243A58]">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase mb-1">Chronic Load</div>
                            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#E2E8F0]">{currentChronic}</div>
                            <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{chronicN}-day EWMA</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-[#1A2D48] rounded-xl p-4 border border-slate-100 dark:border-[#243A58]">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase mb-1">Load Model</div>
                            <div className="text-base font-bold tracking-tight text-slate-900 dark:text-[#E2E8F0]">{metricInfo.label}</div>
                            <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">{metricInfo.desc}</div>
                        </div>
                        {historicalBand && (
                            <div className="bg-slate-50 dark:bg-[#1A2D48] rounded-xl p-4 border border-slate-100 dark:border-[#243A58] col-span-2 sm:col-span-1">
                                <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase mb-2">28-Day Load Band</div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <div className="text-center">
                                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">Min</div>
                                        <div className="text-sm font-bold text-sky-600">{historicalBand.min}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">Avg</div>
                                        <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{historicalBand.avg}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">P75</div>
                                        <div className="text-sm font-bold text-amber-600">{historicalBand.p75}</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1]">Max</div>
                                        <div className="text-sm font-bold text-rose-600">{historicalBand.max}</div>
                                    </div>
                                </div>
                                <div className="text-[8px] text-slate-400 dark:text-[#475569]">From {historicalBand.n} training days · {metricInfo.unit}</div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 bg-slate-50 dark:bg-[#1A2D48] rounded-xl border border-dashed border-slate-200 dark:border-[#243A58]">
                        <InfoIcon size={24} className="mx-auto text-slate-300 dark:text-[#475569] mb-3" />
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">
                            No training load data found for {selectedSubject?.name}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-[#475569] mt-1">Log loads via the ACWR Monitoring dashboard first</p>
                    </div>
                )}

                {/* Controls row */}
                {hasData && (
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                            <TargetIcon size={14} className="text-indigo-500" />
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Target ACWR:</label>
                            <CustomSelect value={String(targetRatio)} onChange={e => setTargetRatio(parseFloat(e.target.value))} variant="filter" size="xs">
                                <option value="0.85">0.85 — Conservative</option>
                                <option value="0.9">0.90 — Low-end Optimal</option>
                                <option value="0.95">0.95 — Mid Optimal</option>
                                <option value="1">1.00 — Sweet Spot</option>
                                <option value="1.05">1.05 — Progressive</option>
                                <option value="1.1">1.10 — Overreaching (planned)</option>
                                <option value="1.2">1.20 — High Progressive</option>
                            </CustomSelect>
                        </div>
                        <div className="flex items-center gap-2">
                            <CalendarIcon size={14} className="text-indigo-500" />
                            <label className="text-[9px] font-bold text-slate-500 uppercase">Days:</label>
                            <CustomSelect value={String(projectionDays)} onChange={e => { setProjectionDays(parseInt(e.target.value)); setManualOverrides({}); resetAnchors(); }} variant="filter" size="xs">
                                <option value="3">3 Days</option>
                                <option value="5">5 Days</option>
                                <option value="7">7 Days</option>
                                <option value="10">10 Days</option>
                                <option value="14">14 Days</option>
                            </CustomSelect>
                        </div>

                        {/* Mode toggle — 3 options */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0F1C30] rounded-lg p-0.5">
                            {[
                                { id: 'optimal', label: 'Optimal Plan' },
                                { id: 'anchor',  label: 'Anchor Mode' },
                                { id: 'whatif',  label: 'What-If' },
                            ].map(m => (
                                <button key={m.id} onClick={() => setViewMode(m.id)}
                                    className={`text-[10px] font-semibold px-3 py-1.5 rounded-md transition-all ${viewMode === m.id ? 'bg-white dark:bg-[#1A2D48] text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#94A3B8]'}`}>
                                    {m.label}
                                </button>
                            ))}
                        </div>

                        {/* Safe range toggle */}
                        <button onClick={() => setShowSafeRange(v => !v)}
                            className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${showSafeRange ? 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50 text-emerald-700' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1]'}`}>
                            <BarChart2Icon size={11} />
                            Safe Range
                        </button>

                        {/* Anchor mode: reset button + pin count */}
                        {viewMode === 'anchor' && (
                            <div className="flex items-center gap-2">
                                {pinnedCount > 0 && (
                                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                        {pinnedCount} day{pinnedCount > 1 ? 's' : ''} anchored
                                    </span>
                                )}
                                <button onClick={resetAnchors}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] transition-colors">
                                    Reset anchors
                                </button>
                            </div>
                        )}

                        {/* Save scenario controls */}
                        {hasData && (
                            <div className="flex items-center gap-2 ml-auto">
                                {showSaveInput ? (
                                    <div className="flex items-center gap-1.5">
                                        <input
                                            autoFocus
                                            className="text-xs border border-indigo-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-300 w-32"
                                            placeholder="Scenario name…"
                                            value={savingName}
                                            onChange={e => setSavingName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') saveCurrentScenario(); if (e.key === 'Escape') { setShowSaveInput(false); setSavingName(''); } }}
                                        />
                                        <button onClick={saveCurrentScenario} disabled={!savingName.trim() || dbSaving}
                                            className="text-[10px] font-semibold px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition-all">
                                            {dbSaving ? 'Saving…' : 'Save'}
                                        </button>
                                        <button onClick={() => { setShowSaveInput(false); setSavingName(''); }}
                                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] transition-colors">
                                            Cancel
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowSaveInput(true)}
                                        disabled={savedScenarios.length >= 3}
                                        title={savedScenarios.length >= 3 ? 'Max 3 scenarios saved — delete one to save more' : 'Save this projection as a named scenario'}
                                        className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white dark:bg-[#132338] text-slate-500 hover:text-indigo-600 dark:text-indigo-300 hover:border-indigo-200 dark:border-indigo-800/50 disabled:opacity-40 transition-all">
                                        <BookmarkIcon size={11} />
                                        Save Scenario {savedScenarios.length > 0 && `(${savedScenarios.length}/3)`}
                                    </button>
                                )}

                                {savedScenarios.length >= 2 && (
                                    <button onClick={() => setCompareMode(v => !v)}
                                        className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${compareMode ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-500 hover:text-indigo-600 dark:text-indigo-300 hover:border-indigo-200'}`}>
                                        <GitCompareIcon size={11} />
                                        Compare
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Historical Load Mini-Chart ────────────────────────────────── */}
            {hasData && historicalBand && historicalBand.chartBars.length > 0 && (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h4 className="text-sm font-semibold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">Recent Load History</h4>
                            <p className="text-[9px] text-indigo-400 font-semibold uppercase mt-0.5">Last {historicalBand.chartBars.length} days · {metricInfo.unit} · reference for realistic load targets</p>
                        </div>
                        <div className="flex items-center gap-3 text-[9px]">
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-sky-400" /> Min {historicalBand.min}</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-emerald-400" /> Avg {historicalBand.avg}</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-amber-400" /> P75 {historicalBand.p75}</span>
                            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-rose-400" /> Max {historicalBand.max}</span>
                        </div>
                    </div>

                    {/* Mini bar chart */}
                    <div className="h-16 flex items-end gap-0.5 relative">
                        {/* Avg reference line */}
                        <div className="absolute inset-x-0 border-t border-dashed border-emerald-300/60 pointer-events-none"
                            style={{ bottom: `${(historicalBand.avg / historicalBand.max) * 100}%` }} />
                        {/* P75 reference line */}
                        <div className="absolute inset-x-0 border-t border-dashed border-amber-300/60 pointer-events-none"
                            style={{ bottom: `${(historicalBand.p75 / historicalBand.max) * 100}%` }} />

                        {historicalBand.chartBars.map((load, i) => {
                            const pct = historicalBand.max > 0 ? (load / historicalBand.max) * 100 : 0;
                            const barColor = load === 0 ? 'bg-slate-100'
                                : load >= historicalBand.p75 ? 'bg-amber-400'
                                : load <= historicalBand.min ? 'bg-sky-300'
                                : 'bg-indigo-300';
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center justify-end group relative">
                                    <div className={`w-full rounded-t-sm transition-all ${barColor}`} style={{ height: `${Math.max(pct, load > 0 ? 4 : 0)}%` }} />
                                    {/* Hover tooltip */}
                                    {load > 0 && (
                                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 whitespace-nowrap">
                                            <div className="bg-slate-900 dark:bg-indigo-600 text-white text-[9px] px-2 py-1 rounded shadow">
                                                D-{historicalBand.chartBars.length - i} · {load} {metricInfo.unit}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] text-slate-300">
                        <span>D-{historicalBand.chartBars.length}</span>
                        <span>Today</span>
                    </div>
                </div>
            )}

            {hasData && (
                <>
                    {/* ── Upcoming Plan Events (from Periodization Planner) ─── */}
                    {upcomingPlanEvents.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-amber-100 dark:border-amber-800/40 shadow-sm px-6 py-4">
                            <div className="flex items-center gap-2 mb-3">
                                <CalendarIcon size={13} className="text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Upcoming Plan Events in Projection Window</span>
                                <span className="text-[9px] text-slate-400 ml-1">— from Periodization Planner · click to auto-anchor</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {upcomingPlanEvents.map((evt, i) => {
                                    const alreadyPinned = pinnedDays.has(evt.dayOffset);
                                    const Icon = evt.type === 'competition' ? TrophyIcon : evt.type === 'testing' ? FlaskConicalIcon : CalendarIcon;
                                    const colorClass = evt.type === 'competition'
                                        ? 'bg-yellow-50 border-yellow-300 text-yellow-800 hover:bg-yellow-100'
                                        : evt.type === 'testing'
                                            ? 'bg-indigo-50 dark:bg-indigo-600 border-indigo-200 dark:border-indigo-800/50 text-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-500/15'
                                            : 'bg-slate-50 border-slate-200 text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48]/60';
                                    return (
                                        <button key={i} onClick={() => anchorPlanEvent(evt.dayOffset)}
                                            title={alreadyPinned ? 'Already anchored' : `Pin D+${evt.dayOffset} as a ${evt.type || 'event'} day with suggested load`}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-semibold transition-all ${colorClass} ${alreadyPinned ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}>
                                            <Icon size={11} />
                                            D+{evt.dayOffset} · {getDateLabel(evt.dayOffset)}
                                            {evt.label && <span className="opacity-70">· {evt.label}</span>}
                                            {alreadyPinned
                                                ? <LockIcon size={9} className="ml-1 opacity-60" />
                                                : <ZapIcon size={9} className="ml-1 opacity-50" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── Saved scenarios list (compact) ────────────────────── */}
                    {savedScenarios.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm px-5 py-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <BookmarkIcon size={11} />
                                    Saved Scenarios
                                </span>
                                {savedScenarios.length >= 2 && (
                                    <button onClick={() => setCompareMode(v => !v)}
                                        className={`text-[9px] font-semibold px-2 py-1 rounded-lg border transition-all ${compareMode ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600'}`}>
                                        {compareMode ? 'Hide Compare' : 'Compare'}
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {savedScenarios.map(sc => (
                                    <div key={sc.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#1A2D48]">
                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                                        <span className="text-xs font-semibold text-slate-700 dark:text-[#CBD5E1]">{sc.name}</span>
                                        <span className="text-[9px] text-slate-400">
                                            {sc.mode === 'anchor' ? `${sc.pinnedCount} anchors · ` : ''}{sc.projectionDays}d · ACWR→{(sc.projection[sc.projection.length - 1]?.ratio || 0).toFixed(2)}
                                        </span>
                                        <button onClick={() => deleteScenario(sc.id)}
                                            className="text-slate-300 hover:text-rose-400 transition-colors ml-1">
                                            <Trash2Icon size={11} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Projected Load Table ──────────────────────────────── */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-100 dark:border-[#1A2D48]">
                            <h4 className="text-base font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">
                                {viewMode === 'optimal' ? 'Recommended Daily Loads'
                                    : viewMode === 'anchor' ? 'Anchor Mode — Pin Heavy Days'
                                    : 'What-If Scenario'}
                            </h4>
                            <p className="text-[10px] text-indigo-400 font-semibold uppercase mt-0.5">
                                {viewMode === 'optimal'
                                    ? `Loads calculated to maintain ACWR at ${targetRatio.toFixed(2)} — ${isTeam ? 'team average per athlete' : 'individual'}`
                                    : viewMode === 'anchor'
                                        ? 'Enter a load on any heavy or anchored day — surrounding days auto-optimise around it'
                                        : 'Edit loads below to see projected ACWR impact'}
                            </p>
                        </div>

                        {/* Anchor mode explanation banner */}
                        {viewMode === 'anchor' && (
                            <div className="px-8 py-3 bg-amber-50/60 border-b border-amber-100 dark:border-amber-800/40 flex items-start gap-2">
                                <ZapIcon size={13} className="text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-[10px] text-amber-800 leading-relaxed">
                                    <strong>How to use:</strong> Type a load into any day you want to fix (e.g. a match, heavy gym session, or GPS-heavy training day).
                                    That day is automatically locked <LockIcon size={9} className="inline mx-0.5" />.
                                    All unlocked days are auto-solved around your anchors to keep ACWR near {targetRatio.toFixed(2)}.
                                    Click the lock icon to unpin and let the model take over that day again.
                                </p>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-[#0F1C30]">
                                        <th className="text-left text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase px-6 py-3">Day</th>
                                        <th className="text-left text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase px-4 py-3">Date</th>
                                        {viewMode === 'anchor' && (
                                            <th className="text-center text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase px-2 py-3">Anchor</th>
                                        )}
                                        <th className="text-right text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase px-4 py-3">
                                            {viewMode === 'whatif' ? 'Planned Load'
                                                : viewMode === 'anchor' ? 'Day Load'
                                                : 'Suggested Load'}
                                        </th>
                                        {showSafeRange && (
                                            <th className="text-right text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase px-4 py-3">Safe Range</th>
                                        )}
                                        <th className="text-right text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase px-4 py-3">Acute</th>
                                        <th className="text-right text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase px-4 py-3">Chronic</th>
                                        <th className="text-right text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase px-6 py-3">ACWR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeProjection.map((point) => {
                                        const sr = safeRange.find(s => s.day === point.day);
                                        const isPinned = viewMode === 'anchor' && point.isPinned;
                                        const outOfRange = showSafeRange && sr && (point.load < sr.minLoad || point.load > sr.maxLoad);

                                        return (
                                            <tr key={point.day}
                                                className={`border-t border-slate-50 dark:border-[#1A2D48] transition-colors ${isPinned ? 'bg-amber-50/40' : 'hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/60 dark:bg-[#132338]/40'}`}>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {isPinned && <LockIcon size={10} className="text-amber-500" />}
                                                        <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">D+{point.day}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs text-slate-600 dark:text-[#CBD5E1]">{getDateLabel(point.day)}</span>
                                                </td>

                                                {/* Anchor mode: pin toggle */}
                                                {viewMode === 'anchor' && (
                                                    <td className="px-2 py-3 text-center">
                                                        <button onClick={() => togglePin(point.day)}
                                                            title={pinnedDays.has(point.day) ? 'Click to unpin (let model solve)' : 'Click to pin this load'}
                                                            className={`p-1.5 rounded-md transition-all ${pinnedDays.has(point.day) ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-[#1A2D48]/60'}`}>
                                                            {pinnedDays.has(point.day) ? <LockIcon size={11} /> : <UnlockIcon size={11} />}
                                                        </button>
                                                    </td>
                                                )}

                                                {/* Load cell */}
                                                <td className="px-4 py-3 text-right">
                                                    {viewMode === 'whatif' ? (
                                                        <input type="number" min="0"
                                                            value={manualOverrides[point.day] !== undefined ? manualOverrides[point.day] : point.load}
                                                            onChange={e => setManualOverrides(prev => ({ ...prev, [point.day]: e.target.value }))}
                                                            className="w-20 text-right text-xs font-bold bg-indigo-50 dark:bg-indigo-600 border border-indigo-200 dark:border-indigo-800/50 rounded px-2 py-1 outline-none focus:border-indigo-400"
                                                        />
                                                    ) : viewMode === 'anchor' ? (
                                                        <input type="number" min="0"
                                                            value={anchorInputs[point.day] !== undefined ? anchorInputs[point.day] : (pinnedDays.has(point.day) ? point.load : '')}
                                                            placeholder={String(point.load)}
                                                            onChange={e => setAnchorLoad(point.day, e.target.value)}
                                                            className={`w-24 text-right text-xs font-bold rounded px-2 py-1 outline-none transition-all ${pinnedDays.has(point.day)
                                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 text-amber-900 focus:border-amber-500'
                                                                : 'bg-slate-50 border border-slate-200 dark:border-[#243A58] text-slate-400 placeholder-slate-400 focus:border-indigo-300 focus:text-slate-700 dark:text-[#CBD5E1]'}`}
                                                        />
                                                    ) : (
                                                        <span className={`text-sm font-bold ${outOfRange ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-900 dark:text-indigo-300'}`}>
                                                            {point.load} <span className="text-[9px] text-slate-400 font-normal">{metricInfo.unit}</span>
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Safe range */}
                                                {showSafeRange && (
                                                    <td className="px-4 py-3 text-right">
                                                        {sr ? (
                                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${outOfRange ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600'}`}>
                                                                {sr.minLoad}–{sr.maxLoad}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                )}

                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs text-slate-600 dark:text-[#CBD5E1]">{point.acute}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="text-xs text-slate-600 dark:text-[#CBD5E1]">{point.chronic}</span>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-full ${getRatioBg(point.ratio)} ${getRatioColor(point.ratio)}`}>
                                                        {point.ratio.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Safe range legend */}
                        {showSafeRange && (
                            <div className="px-8 py-3 border-t border-slate-50 dark:border-[#1A2D48] bg-slate-50/30 dark:bg-[#0F1C30]/30 flex items-center gap-2">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-[9px] text-slate-500">
                                    Safe Range = load that keeps ACWR between 0.8 and 1.3 for that day. Values outside the range shown in <span className="text-rose-500 font-semibold">red</span>.
                                </span>
                                {historicalBand && (
                                    <span className="text-[9px] text-slate-400 ml-2">
                                        Historical avg: <strong>{historicalBand.avg}</strong> · P75: <strong>{historicalBand.p75}</strong> {metricInfo.unit}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── ACWR Trajectory Chart ─────────────────────────────── */}
                    <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-4">
                        <h4 className="text-base font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">ACWR Trajectory</h4>
                        <div className="h-56 flex items-end justify-between gap-1 px-4 border-b border-l border-indigo-50 relative pt-10">
                            {/* Green safe zone shading */}
                            <div className="absolute left-0 right-0 bg-emerald-50/40 pointer-events-none"
                                style={{ bottom: `${(0.8 / 2.0) * 100}%`, top: `${100 - (1.3 / 2.0) * 100}%` }} />

                            {/* Zone labels */}
                            <div className="absolute top-2 left-0 right-0 flex justify-between px-4">
                                <span className="text-[8px] font-semibold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/25 px-2 py-0.5 rounded">Sweet Spot 0.8–1.3</span>
                                <span className="text-[8px] font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded">Danger &gt;1.5</span>
                            </div>

                            {/* Reference lines */}
                            <div className="absolute left-0 right-0 border-t border-dashed border-emerald-300" style={{ bottom: `${(1.3 / 2.0) * 100}%` }}>
                                <span className="text-[7px] text-emerald-500 absolute -top-2 left-1">1.3</span>
                            </div>
                            <div className="absolute left-0 right-0 border-t border-dashed border-emerald-200 dark:border-emerald-800/50" style={{ bottom: `${(1.0 / 2.0) * 100}%` }}>
                                <span className="text-[7px] text-emerald-400 absolute -top-2 left-1">1.0</span>
                            </div>
                            <div className="absolute left-0 right-0 border-t border-dashed border-sky-200 dark:border-sky-900/50" style={{ bottom: `${(0.8 / 2.0) * 100}%` }}>
                                <span className="text-[7px] text-sky-400 absolute -top-2 left-1">0.8</span>
                            </div>
                            <div className="absolute left-0 right-0 border-t border-dashed border-rose-200 dark:border-rose-900/50" style={{ bottom: `${(1.5 / 2.0) * 100}%` }}>
                                <span className="text-[7px] text-rose-400 absolute -top-2 left-1">1.5</span>
                            </div>

                            {activeProjection.map((point) => {
                                const h = Math.min(Math.max(point.ratio * 50, 4), 97);
                                return (
                                    <div key={point.day} className="flex-1 flex flex-col items-center gap-1 group relative">
                                        <div className={`w-full max-w-10 rounded-t-lg transition-all ${point.isPinned ? 'bg-amber-400' : getBarColor(point.ratio)}`}
                                            style={{ height: `${h}%` }} />
                                        <div className="text-[8px] font-semibold text-slate-400">D+{point.day}</div>
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-semibold px-2 py-1 rounded transition-all z-10 whitespace-nowrap">
                                            {point.ratio.toFixed(2)} ACWR · {point.load} {metricInfo.unit}
                                            {point.isPinned ? ' 🔒' : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chart legend */}
                        <div className="flex items-center gap-4 flex-wrap text-[9px]">
                            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50" /> Green zone (0.8–1.3 ACWR)</span>
                            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" /> Optimal</span>
                            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-sky-400" /> Underexposed</span>
                            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-amber-400" /> {viewMode === 'anchor' ? 'Anchored / Caution' : 'Caution'}</span>
                            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-rose-500" /> Danger</span>
                        </div>
                    </div>

                    {/* ── Per-Player Drill-Down ─────────────────────────────── */}
                    {isTeam && playerBreakdowns.length > 0 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1A2D48]">
                                <h4 className="text-base font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">Individual Athlete Loads</h4>
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
                                            <button onClick={() => setExpandedPlayer(isExpanded ? null : player.id)}
                                                className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/60 dark:bg-[#132338]/40 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <AthleteAvatar
                                                        player={player}
                                                        size="sm"
                                                        fallbackClass="bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-indigo-400"
                                                        fallbackTextSize="text-[10px]"
                                                    />
                                                    <div className="text-left">
                                                        <div className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{player.name}</div>
                                                        <div className="text-[9px] text-slate-400">
                                                            {hasPlayerData ? `A: ${player.acwr.acute} · C: ${player.acwr.chronic}` : 'No load data'}
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
                                                                <div className="text-sm font-bold text-indigo-900 dark:text-indigo-300">
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
                                                    <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-100 dark:border-[#243A58] overflow-hidden">
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
                                                                    <tr key={pt.day} className="border-t border-slate-100 dark:border-[#243A58]">
                                                                        <td className="px-4 py-2 text-xs font-semibold text-indigo-900 dark:text-indigo-300">D+{pt.day}</td>
                                                                        <td className="px-4 py-2 text-xs text-slate-600 dark:text-[#CBD5E1]">{getDateLabel(pt.day)}</td>
                                                                        <td className="px-4 py-2 text-right text-xs font-bold text-indigo-900 dark:text-indigo-300">
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

                                                    {player.projection[0] && teamProjection[0] && (
                                                        <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 dark:border-indigo-800/40">
                                                            <ArrowRightIcon size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                                                            <p className="text-[10px] text-indigo-700 dark:text-indigo-400 leading-relaxed">
                                                                {(() => {
                                                                    const diff = player.projection[0].load - teamProjection[0].load;
                                                                    const pct  = teamProjection[0].load > 0 ? Math.round((diff / teamProjection[0].load) * 100) : 0;
                                                                    if (Math.abs(pct) < 10) return `${player.name}'s recommended load is aligned with team average.`;
                                                                    if (diff > 0) return `${player.name} needs ${Math.abs(pct)}% MORE load than team average — their chronic base is higher; they can handle more to maintain the target ratio.`;
                                                                    return `${player.name} needs ${Math.abs(pct)}% LESS load than team average — their acute load is elevated relative to their chronic base. Consider reducing intensity.`;
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

                    {/* ── Scenario Comparison Chart ─────────────────────────── */}
                    {compareMode && savedScenarios.length >= 2 && (
                        <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-base font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">Scenario Comparison</h4>
                                    <p className="text-[10px] text-indigo-400 font-semibold uppercase mt-0.5">
                                        ACWR trajectory across {savedScenarios.length} saved scenarios
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                    {savedScenarios.map(sc => (
                                        <div key={sc.id} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                                            <span className="inline-block w-6 h-1.5 rounded" style={{ backgroundColor: sc.color }} />
                                            {sc.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Side-by-side grouped bars — one group per day */}
                            <div className="overflow-x-auto">
                                <div className="h-48 flex items-end gap-3 px-2 border-b border-l border-indigo-50 relative pt-8"
                                    style={{ minWidth: `${Math.max(...savedScenarios.map(s => s.projectionDays)) * 52}px` }}>

                                    {/* Reference lines */}
                                    <div className="absolute left-0 right-0 border-t border-dashed border-emerald-300/60 pointer-events-none"
                                        style={{ bottom: `${(1.3 / 2.0) * 100}%` }}>
                                        <span className="text-[7px] text-emerald-500 absolute -top-2 left-1">1.3</span>
                                    </div>
                                    <div className="absolute left-0 right-0 border-t border-dashed border-emerald-200 dark:border-emerald-800/50 pointer-events-none"
                                        style={{ bottom: `${(1.0 / 2.0) * 100}%` }}>
                                        <span className="text-[7px] text-emerald-400 absolute -top-2 left-1">1.0</span>
                                    </div>
                                    <div className="absolute left-0 right-0 border-t border-dashed border-sky-200 dark:border-sky-900/50 pointer-events-none"
                                        style={{ bottom: `${(0.8 / 2.0) * 100}%` }}>
                                        <span className="text-[7px] text-sky-400 absolute -top-2 left-1">0.8</span>
                                    </div>
                                    <div className="absolute left-0 right-0 bg-emerald-50/30 pointer-events-none"
                                        style={{ bottom: `${(0.8 / 2.0) * 100}%`, top: `${100 - (1.3 / 2.0) * 100}%` }} />

                                    {/* One group per day (up to max projection days) */}
                                    {Array.from({ length: Math.max(...savedScenarios.map(s => s.projectionDays)) }, (_, i) => {
                                        const day = i + 1;
                                        return (
                                            <div key={day} className="flex items-end gap-0.5 flex-1 group relative">
                                                {savedScenarios.map(sc => {
                                                    const pt = sc.projection[i];
                                                    if (!pt) return null;
                                                    const h = Math.min(Math.max(pt.ratio * 50, 3), 97);
                                                    return (
                                                        <div key={sc.id}
                                                            className="flex-1 rounded-t-sm transition-all relative group/bar"
                                                            style={{ height: `${h}%`, backgroundColor: sc.color, opacity: 0.8 }}>
                                                            {/* Per-bar tooltip */}
                                                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover/bar:block z-20 whitespace-nowrap pointer-events-none">
                                                                <div className="bg-slate-900 dark:bg-indigo-600 text-white text-[9px] px-2 py-1 rounded shadow">
                                                                    {sc.name} D+{day}: {pt.ratio.toFixed(2)} ACWR · {pt.load} {metricInfo.unit}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="absolute -bottom-5 left-0 right-0 text-center text-[8px] text-slate-400">D+{day}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Summary table */}
                            <div className="overflow-x-auto mt-6">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-[#243A58]">
                                            <th className="text-left text-[9px] font-bold text-slate-400 uppercase py-2 pr-4">Scenario</th>
                                            <th className="text-center text-[9px] font-bold text-slate-400 uppercase py-2 px-3">Mode</th>
                                            <th className="text-center text-[9px] font-bold text-slate-400 uppercase py-2 px-3">Target ACWR</th>
                                            <th className="text-center text-[9px] font-bold text-slate-400 uppercase py-2 px-3">Days</th>
                                            <th className="text-center text-[9px] font-bold text-slate-400 uppercase py-2 px-3">D+1 Load</th>
                                            <th className="text-right text-[9px] font-bold text-slate-400 uppercase py-2 pl-3">End ACWR</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {savedScenarios.map(sc => {
                                            const endRatio = sc.projection[sc.projection.length - 1]?.ratio || 0;
                                            return (
                                                <tr key={sc.id} className="border-b border-slate-50 dark:border-[#1A2D48]">
                                                    <td className="py-2 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sc.color }} />
                                                            <span className="font-semibold text-slate-700 dark:text-[#CBD5E1]">{sc.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-3 text-center">
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A2D48] text-slate-500 capitalize">{sc.mode}</span>
                                                    </td>
                                                    <td className="py-2 px-3 text-center font-semibold text-slate-700 dark:text-[#CBD5E1]">{sc.targetRatio.toFixed(2)}</td>
                                                    <td className="py-2 px-3 text-center text-slate-500">{sc.projectionDays}d</td>
                                                    <td className="py-2 px-3 text-center font-semibold text-indigo-700 dark:text-indigo-400">
                                                        {sc.projection[0]?.load ?? '—'} <span className="text-[9px] text-slate-400 font-normal">{metricInfo.unit}</span>
                                                    </td>
                                                    <td className="py-2 pl-3 text-right">
                                                        <span className={`font-bold text-sm ${getRatioColor(endRatio)}`}>{endRatio.toFixed(2)}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Summary + Coach Actions ────────────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                        {/* Quick stat cards */}
                        <div className={`p-4 rounded-xl border ${getRatioBg(currentRatio)} ${currentRatio > 1.3 ? 'border-amber-200 dark:border-amber-800/50' : currentRatio < 0.8 ? 'border-sky-200 dark:border-sky-900/50' : 'border-emerald-200 dark:border-emerald-800/50'}`}>
                            <div className="text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-widest mb-1.5">Current State</div>
                            <div className={`text-2xl font-bold tracking-tight mb-1 ${getRatioColor(currentRatio)}`}>{currentRatio.toFixed(2)}</div>
                            <p className="text-[10px] leading-relaxed text-slate-600 dark:text-[#CBD5E1]">
                                {currentRatio > 1.5 ? 'Danger zone — de-load immediately.'
                                    : currentRatio > 1.3 ? 'Caution — moderate load over next 2–3 days.'
                                    : currentRatio < 0.8 ? 'Underexposed — progressively increase load.'
                                    : 'Optimal zone — maintain planned load structure.'}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338]">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1.5">
                                {viewMode === 'anchor' && pinnedCount > 0 ? 'Next Non-Anchored Day' : "D+1 Target Load"}
                            </div>
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 tracking-tight">
                                {activeProjection[0]?.load || '—'}
                                <span className="text-sm text-slate-400 dark:text-[#CBD5E1] font-normal ml-1">{metricInfo.unit}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-1">
                                {isTeam ? 'Avg per athlete' : 'Individual target'} · ACWR target {targetRatio.toFixed(2)}
                            </p>
                            {showSafeRange && safeRange[0] && (
                                <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                                    Safe zone: {safeRange[0].minLoad}–{safeRange[0].maxLoad} {metricInfo.unit}
                                </p>
                            )}
                        </div>

                        <div className="p-4 rounded-xl border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338]">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1.5">End-of-Period ACWR</div>
                            <div className={`text-2xl font-bold tracking-tight ${getRatioColor(activeProjection[activeProjection.length - 1]?.ratio || 0)}`}>
                                {(activeProjection[activeProjection.length - 1]?.ratio || 0).toFixed(2)}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-1">
                                After {projectionDays} days · {viewMode === 'optimal' ? 'recommended' : viewMode === 'anchor' ? 'anchored' : 'what-if'} plan
                            </p>
                            {viewMode === 'anchor' && pinnedCount > 0 && (
                                <p className="text-[9px] text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                                    {pinnedCount} anchored day{pinnedCount > 1 ? 's' : ''} fixed
                                </p>
                            )}
                        </div>
                    </div>

                    {/* ── How Scenario Modelling Works ──────────────────────── */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                            <div className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest">How This Works</div>
                            <div className="text-[9px] text-slate-400 dark:text-[#475569] mt-0.5">ACWR methodology · load projection logic · zone thresholds</div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#1A2D48]">
                            <div className="px-5 py-4">
                                <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide mb-2">ACWR Calculation</div>
                                <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Acute:Chronic Workload Ratio compares short-term fitness (acute, {acuteN}-day EWMA) to long-term conditioning (chronic, {chronicN}-day EWMA).
                                    A ratio of 1.0 means recent load exactly matches the established base.
                                </p>
                            </div>
                            <div className="px-5 py-4">
                                <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">Optimal Zone 0.8–1.3</div>
                                <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    The 0.8–1.3 range (Hulin et al.) is associated with the lowest injury risk.
                                    Below 0.8 indicates underexposure; above 1.3 indicates spikes that outpace the athlete's conditioning base.
                                </p>
                            </div>
                            <div className="px-5 py-4">
                                <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">Projection Modes</div>
                                <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    <strong className="text-slate-700 dark:text-[#CBD5E1]">Optimal</strong> — auto-solves daily loads to maintain target ACWR.
                                    <strong className="text-slate-700 dark:text-[#CBD5E1]"> Anchor</strong> — pin match/test days and the model adjusts surrounding sessions.
                                    <strong className="text-slate-700 dark:text-[#CBD5E1]"> What-if</strong> — enter any loads to preview projected ACWR impact.
                                </p>
                            </div>
                            <div className="px-5 py-4">
                                <div className="text-[9px] font-bold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Saving Scenarios</div>
                                <p className="text-[10px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Save up to 3 scenarios per subject to compare planning options side-by-side.
                                    Scenarios persist across sessions — use them to model a conservative, moderate, and progressive week simultaneously.
                                </p>
                            </div>
                        </div>
                        {dbError && (
                            <div className="px-5 pb-3 border-t border-slate-50 dark:border-[#1A2D48] flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 pt-3">
                                <InfoIcon size={12} />
                                {dbError}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
