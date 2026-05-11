// @ts-nocheck
/**
 * Force-Velocity Profile Terminal
 *
 * Scientific basis:
 * - Samozino et al. (2008, 2012, 2014): Simple method — F-V from CMJ/SJ
 * - Morin & Samozino (2016): Sprint-based horizontal F-V
 * - Jimenez-Reyes et al. (2019): Training recommendations from FV imbalance
 *
 * Formulas:
 *   v0        = sqrt(2 * g * h)
 *   F_mean    = m * g * (h/hPO + 1)
 *   Pmax      = F0 * V0 / 4
 *   FVimb     = (SFV_actual - SFV_opt) / |SFV_opt| * 100
 */

import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    ZapIcon, AlertTriangleIcon, InfoIcon, TrendingUpIcon,
    CheckCircleIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon,
} from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';

const G = 9.81;
const DEFAULT_HPO = 0.40;

// ─── F-V Calculation Engine ───────────────────────────────────────────────────

interface FVProfile {
    F0: number;
    V0: number;
    Pmax: number;
    SFV: number;
    SFV_opt: number;
    FVimbalance: number;
    classification: 'force_deficit' | 'velocity_deficit' | 'well_balanced';
    recommendation: string;
    trainingFocus: string;
    dataPoints: { label: string; force: number; velocity: number; source: string }[];
    bodyMass: number;
}

function buildFVProfile(
    bodyMass: number,
    cmjHeight?: number,
    sjHeight?: number,
    imtpForce?: number,
    sprint10m?: number,
    sprint30m?: number,
    loadedCmjPoints?: { loadKg: number; heightCm: number }[],
    hPO = DEFAULT_HPO
): FVProfile | null {
    if (!bodyMass) return null;
    const dataPoints: FVProfile['dataPoints'] = [];
    const toM = (v: number) => v > 3 ? v / 100 : v;

    if (cmjHeight && cmjHeight > 0) {
        const h = toM(cmjHeight);
        const v = Math.sqrt(2 * G * h);
        const F = bodyMass * G * (h / hPO + 1);
        dataPoints.push({ label: 'CMJ', force: F, velocity: v, source: 'Samozino simple' });
    }
    if (sjHeight && sjHeight > 0) {
        const h = toM(sjHeight);
        const v = Math.sqrt(2 * G * h);
        const F = bodyMass * G * (h / hPO + 1);
        dataPoints.push({ label: 'SJ', force: F, velocity: v, source: 'Samozino simple (SJ)' });
    }
    if (imtpForce && imtpForce > 0) {
        dataPoints.push({ label: 'IMTP', force: imtpForce, velocity: 0.05, source: 'Isometric peak force' });
    }
    if (sprint10m && sprint30m && sprint10m > 0 && sprint30m > 0) {
        const vMax = 20 / (sprint30m - sprint10m);
        const FSprint = bodyMass * vMax / (sprint10m * 0.8);
        dataPoints.push({ label: 'Sprint', force: FSprint, velocity: vMax, source: 'Sprint split derivation' });
    }
    // Loaded CMJ — each (load, height) pair is a direct F-V data point
    if (loadedCmjPoints?.length) {
        loadedCmjPoints.forEach(({ loadKg, heightCm }, i) => {
            if (heightCm > 0) {
                const h = toM(heightCm);
                const v = Math.sqrt(2 * G * h);
                const F = (bodyMass + loadKg) * G * (h / hPO + 1);
                dataPoints.push({ label: `LCMJ${i === 0 ? ' BW' : `+${loadKg}kg`}`, force: F, velocity: v, source: 'Loaded CMJ V-L profile' });
            }
        });
    }
    if (dataPoints.length < 2) return null;

    const n = dataPoints.length;
    const sumV = dataPoints.reduce((s, p) => s + p.velocity, 0);
    const sumF = dataPoints.reduce((s, p) => s + p.force, 0);
    const sumVV = dataPoints.reduce((s, p) => s + p.velocity * p.velocity, 0);
    const sumVF = dataPoints.reduce((s, p) => s + p.velocity * p.force, 0);
    const denom = n * sumVV - sumV * sumV;
    if (Math.abs(denom) < 0.001) return null;

    const SFV = (n * sumVF - sumV * sumF) / denom;
    const F0 = (sumF - SFV * sumV) / n;
    const V0 = F0 > 0 && SFV < 0 ? -F0 / SFV : 0;
    const Pmax = F0 > 0 && V0 > 0 ? (F0 * V0) / 4 : 0;
    if (F0 <= 0 || V0 <= 0) return null;

    const sqrtTerm = Math.sqrt((Pmax * hPO) / (2 * bodyMass * G));
    const SFV_opt = sqrtTerm > 0 ? -(bodyMass * G) / (2 * hPO * sqrtTerm) : SFV;
    const FVimbalance = SFV_opt !== 0 ? ((SFV - SFV_opt) / Math.abs(SFV_opt)) * 100 : 0;

    let classification: FVProfile['classification'];
    let recommendation: string;
    let trainingFocus: string;
    if (FVimbalance < -10) {
        classification = 'force_deficit';
        recommendation = 'Profile is force-deficient. The athlete produces insufficient force relative to their velocity capacity.';
        trainingFocus = 'Heavy resistance (>80% 1RM), weighted jumps, eccentric overload, isometric holds (IMTP).';
    } else if (FVimbalance > 10) {
        classification = 'velocity_deficit';
        recommendation = 'Profile is velocity-deficient. The athlete lacks speed-strength relative to their force capacity.';
        trainingFocus = 'Ballistic/plyometric work (<30% 1RM), unloaded jumps, sprint accelerations, light-load jump squats.';
    } else {
        classification = 'well_balanced';
        recommendation = 'Profile is near-optimal — force and velocity capacities are well-matched.';
        trainingFocus = 'Mixed-methods training. Focus on shifting the F-V line outward to increase overall Pmax.';
    }

    return {
        F0: Math.round(F0),
        V0: parseFloat(V0.toFixed(2)),
        Pmax: Math.round(Pmax),
        SFV: parseFloat(SFV.toFixed(1)),
        SFV_opt: parseFloat(SFV_opt.toFixed(1)),
        FVimbalance: parseFloat(FVimbalance.toFixed(1)),
        classification,
        recommendation,
        trainingFocus,
        dataPoints,
        bodyMass,
    };
}

// ─── F-V Curve SVG ────────────────────────────────────────────────────────────

function FVCurveChart({ profile, comparisonProfile }: { profile: FVProfile; comparisonProfile?: FVProfile | null }) {
    const W = 480, H = 260;
    const PAD = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    const maxV = Math.max(profile.V0, comparisonProfile?.V0 ?? 0) * 1.15;
    const maxF = Math.max(profile.F0, comparisonProfile?.F0 ?? 0) * 1.15;

    const sx = (v: number) => PAD.left + (v / maxV) * chartW;
    const sy = (f: number) => PAD.top + chartH - (f / maxF) * chartH;

    // Generate F-V line points (athlete)
    const steps = 60;
    const athletePoints = Array.from({ length: steps + 1 }, (_, i) => {
        const v = (i / steps) * profile.V0;
        const f = profile.F0 + profile.SFV * v;
        return `${sx(v).toFixed(1)},${sy(Math.max(0, f)).toFixed(1)}`;
    });

    // Power curve (P = F * v) — scale to chart
    const maxP = profile.Pmax * 1.1;
    const powerPoints = Array.from({ length: steps + 1 }, (_, i) => {
        const v = (i / steps) * profile.V0;
        const f = profile.F0 + profile.SFV * v;
        const p = Math.max(0, f) * v;
        return `${sx(v).toFixed(1)},${sy((p / maxP) * maxF).toFixed(1)}`;
    });

    // Pmax point at V0/2, F0/2
    const pmaxV = profile.V0 / 2;
    const pmaxF = profile.F0 / 2;

    // Comparison line
    let compPoints: string[] | null = null;
    if (comparisonProfile) {
        compPoints = Array.from({ length: steps + 1 }, (_, i) => {
            const v = (i / steps) * comparisonProfile.V0;
            const f = comparisonProfile.F0 + comparisonProfile.SFV * v;
            return `${sx(v).toFixed(1)},${sy(Math.max(0, f)).toFixed(1)}`;
        });
    }

    const gridVs = [0.25, 0.5, 0.75, 1.0].map(f => f * maxV);
    const gridFs = [0.25, 0.5, 0.75, 1.0].map(f => f * maxF);

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" style={{ maxHeight: 260 }}>
            {/* Grid */}
            {gridVs.map(v => (
                <line key={v} x1={sx(v)} y1={PAD.top} x2={sx(v)} y2={PAD.top + chartH}
                    stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            ))}
            {gridFs.map(f => (
                <line key={f} x1={PAD.left} y1={sy(f)} x2={PAD.left + chartW} y2={sy(f)}
                    stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            ))}

            {/* Axes */}
            <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + chartH + 6}
                stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />
            <line x1={PAD.left - 6} y1={PAD.top + chartH} x2={PAD.left + chartW} y2={PAD.top + chartH}
                stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />

            {/* Axis labels */}
            {gridVs.map(v => (
                <text key={v} x={sx(v)} y={PAD.top + chartH + 14} textAnchor="middle"
                    fontSize={9} fill="currentColor" opacity={0.4}>
                    {v.toFixed(1)}
                </text>
            ))}
            {gridFs.map(f => (
                <text key={f} x={PAD.left - 6} y={sy(f) + 3} textAnchor="end"
                    fontSize={9} fill="currentColor" opacity={0.4}>
                    {(f / 1000).toFixed(1)}
                </text>
            ))}
            <text x={PAD.left + chartW / 2} y={H - 4} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.4}>
                Velocity (m/s)
            </text>
            <text x={14} y={PAD.top + chartH / 2} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.4}
                transform={`rotate(-90, 14, ${PAD.top + chartH / 2})`}>
                Force (kN)
            </text>

            {/* Power curve (faint dashed) */}
            <polyline points={powerPoints.join(' ')} fill="none"
                stroke="#6366f1" strokeWidth={1} strokeDasharray="3 4" opacity={0.3} />

            {/* Comparison line */}
            {compPoints && (
                <polyline points={compPoints.join(' ')} fill="none"
                    stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.5} />
            )}

            {/* Athlete F-V line */}
            <polyline points={athletePoints.join(' ')} fill="none"
                stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" />

            {/* Data point dots */}
            {profile.dataPoints.map((dp, i) => (
                <circle key={i} cx={sx(dp.velocity)} cy={sy(dp.force)} r={5}
                    fill="#6366f1" stroke="white" strokeWidth={2} />
            ))}

            {/* Pmax annotation */}
            <circle cx={sx(pmaxV)} cy={sy(pmaxF)} r={6}
                fill="#8b5cf6" stroke="white" strokeWidth={2} />
            <text x={sx(pmaxV) + 9} y={sy(pmaxF) - 6} fontSize={9} fill="#8b5cf6" fontWeight="bold">
                Pmax
            </text>
            <text x={sx(pmaxV) + 9} y={sy(pmaxF) + 5} fontSize={8} fill="#8b5cf6" opacity={0.8}>
                {(profile.Pmax / 1000).toFixed(1)} kW
            </text>
        </svg>
    );
}

// ─── Data Status Badge ────────────────────────────────────────────────────────

function DataStatusBadge({ label, date, present }: { label: string; date?: string; present: boolean }) {
    return (
        <div className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${
            present
                ? 'bg-emerald-50 dark:bg-emerald-900/15 border-emerald-200 dark:border-emerald-700/40'
                : 'bg-slate-50 dark:bg-[#1A2D48] border-slate-200 dark:border-[#243A58]'
        }`}>
            <div className="flex items-center gap-2">
                {present
                    ? <CheckCircleIcon size={13} className="text-emerald-500 shrink-0" />
                    : <ClockIcon size={13} className="text-slate-400 dark:text-[#475569] shrink-0" />}
                <span className={`text-xs font-semibold ${present ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-[#64748B]'}`}>
                    {label}
                </span>
            </div>
            {present && date ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-500">{date}</span>
            ) : (
                <span className="text-[10px] text-slate-400 dark:text-[#475569]">Not completed</span>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ForceVelocityTerminal = ({ selectedAnalyticsAthleteId, subjectAthleteIds }) => {
    const { teams } = useAppState();
    const [selectedId, setSelectedId] = useState(
        (!selectedAnalyticsAthleteId || selectedAnalyticsAthleteId.startsWith('team_')) ? '' : selectedAnalyticsAthleteId
    );
    const [showMethodology, setShowMethodology] = useState(false);

    const allAthletes = useMemo(() =>
        teams.flatMap(t => (t.players || []).map(p => ({
            ...p,
            performanceMetrics: p.performanceMetrics || [],
            teamName: t.name,
        }))),
        [teams]
    );

    const athlete = allAthletes.find(a => a.id === selectedId);

    // Extract all test records for this athlete
    const testData = useMemo(() => {
        if (!athlete) return { cmj: null, sj: null, imtp: null, sprint: null };
        const metrics = athlete.performanceMetrics || [];
        const getLatest = (types: string[]) => {
            const matches = metrics
                .filter(m => types.includes(m.type))
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return matches[0] || null;
        };
        const cmj   = getLatest(['cmj', 'cmj_advanced']);
        const sj    = getLatest(['squat_jump']);
        const imtp  = getLatest(['imtp_basic', 'imtp_advanced']);
        const loadedCmj = getLatest(['loaded_cmj']);
        const sprintMetrics = metrics
            .filter(m => m.type?.startsWith('sprint_'))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        let sprint10 = null, sprint30 = null;
        for (const m of sprintMetrics) {
            const t = Number(m.time || m.metrics?.time || m.value || 0);
            if (t <= 0) continue;
            if (m.type === 'sprint_10m' && !sprint10) sprint10 = { ...m, resolvedTime: t };
            if ((m.type === 'sprint_30m' || m.type === 'sprint_40m' || m.type === 'sprint_20m') && !sprint30) sprint30 = { ...m, resolvedTime: t };
        }
        return { cmj, sj, imtp, loadedCmj, sprint10, sprint30 };
    }, [athlete]);

    const profile = useMemo(() => {
        if (!athlete) return null;
        const { cmj, sj, imtp, loadedCmj, sprint10, sprint30 } = testData;
        const bodyMass = athlete.weight_kg || athlete.weight || 80;
        const cmjH  = cmj?.height  || cmj?.jump_height  || cmj?.metrics?.jump_height  || cmj?.value;
        const sjH   = sj?.height   || sj?.jump_height   || sj?.metrics?.jump_height   || sj?.value;
        const imtpF = imtp?.peak_force || imtp?.metrics?.peak_force || imtp?.value;
        const lcmj = loadedCmj ? [
            { loadKg: 0,                                              heightCm: loadedCmj.metrics?.bw_height   || loadedCmj.bw_height   || 0 },
            { loadKg: loadedCmj.metrics?.load_1_kg || loadedCmj.load_1_kg || 0, heightCm: loadedCmj.metrics?.load_1_height || loadedCmj.load_1_height || 0 },
            { loadKg: loadedCmj.metrics?.load_2_kg || loadedCmj.load_2_kg || 0, heightCm: loadedCmj.metrics?.load_2_height || loadedCmj.load_2_height || 0 },
            { loadKg: loadedCmj.metrics?.load_3_kg || loadedCmj.load_3_kg || 0, heightCm: loadedCmj.metrics?.load_3_height || loadedCmj.load_3_height || 0 },
        ].filter(p => p.heightCm > 0) : undefined;
        return buildFVProfile(bodyMass, cmjH, sjH, imtpF, sprint10?.resolvedTime ?? null, sprint30?.resolvedTime ?? null, lcmj);
    }, [athlete, testData]);

    // Historical profiles — one per date where sufficient data exists
    const historicalProfiles = useMemo(() => {
        if (!athlete) return [];
        const metrics = athlete.performanceMetrics || [];
        const bodyMass = athlete.weight_kg || athlete.weight || 80;
        // Group by date (within 7-day windows = test session)
        const byDate: Record<string, any[]> = {};
        for (const m of metrics) {
            if (!m.date) continue;
            const d = m.date.slice(0, 10);
            if (!byDate[d]) byDate[d] = [];
            byDate[d].push(m);
        }
        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, mets]) => {
                const cmj  = mets.find(m => ['cmj', 'cmj_advanced'].includes(m.type));
                const sj   = mets.find(m => m.type === 'squat_jump');
                const imtp = mets.find(m => ['imtp_basic', 'imtp_advanced'].includes(m.type));
                const s10  = mets.find(m => m.type === 'sprint_10m');
                const s30  = mets.find(m => ['sprint_30m', 'sprint_40m', 'sprint_20m'].includes(m.type));
                const lcmjH = mets.find(m => m.type === 'loaded_cmj');
                const lcmjPts = lcmjH ? [
                    { loadKg: 0, heightCm: lcmjH.metrics?.bw_height || lcmjH.bw_height || 0 },
                    { loadKg: lcmjH.metrics?.load_1_kg || 0, heightCm: lcmjH.metrics?.load_1_height || 0 },
                    { loadKg: lcmjH.metrics?.load_2_kg || 0, heightCm: lcmjH.metrics?.load_2_height || 0 },
                    { loadKg: lcmjH.metrics?.load_3_kg || 0, heightCm: lcmjH.metrics?.load_3_height || 0 },
                ].filter(p => p.heightCm > 0) : undefined;
                const p = buildFVProfile(
                    bodyMass,
                    cmj?.height || cmj?.value,
                    sj?.height  || sj?.value,
                    imtp?.peak_force || imtp?.value,
                    s10?.time   || s10?.value,
                    s30?.time   || s30?.value,
                    lcmjPts
                );
                return p ? { date, profile: p } : null;
            })
            .filter(Boolean);
    }, [athlete]);

    const cls = profile ? {
        force_deficit:    { bg: 'bg-amber-50 dark:bg-amber-900/20',   border: 'border-amber-200 dark:border-amber-700/40',   text: 'text-amber-700 dark:text-amber-400',   dot: 'bg-amber-500',   label: 'Force Deficit' },
        velocity_deficit: { bg: 'bg-sky-50 dark:bg-sky-900/20',       border: 'border-sky-200 dark:border-sky-700/40',       text: 'text-sky-700 dark:text-sky-400',       dot: 'bg-sky-500',     label: 'Velocity Deficit' },
        well_balanced:    { bg: 'bg-emerald-50 dark:bg-emerald-900/15',border: 'border-emerald-200 dark:border-emerald-700/40',text: 'text-emerald-700 dark:text-emerald-400',dot: 'bg-emerald-500', label: 'Well Balanced' },
    }[profile.classification] : null;

    const completedTests = [
        !!testData.cmj, !!testData.sj, !!testData.imtp,
        !!(testData.sprint10 && testData.sprint30),
        !!testData.loadedCmj,
    ].filter(Boolean).length;

    const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) : undefined;

    return (
        <div className="space-y-5 animate-in fade-in duration-300">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h4 className="text-lg font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0] flex items-center gap-2">
                            <ZapIcon size={16} className="text-indigo-500" />
                            Force-Velocity Profile
                        </h4>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mt-0.5">
                            Explosive Capacity · Strength-Velocity Balance · Performance Potential
                        </p>
                    </div>
                    <div className="min-w-[200px]">
                        <CustomSelect
                            value={selectedId}
                            onChange={e => setSelectedId(e.target.value)}
                            variant="filter"
                            size="sm"
                            placeholder="Select athlete…"
                        >
                            <option value="">Select athlete…</option>
                            {teams.filter(t => t.players?.length).map(t => (
                                <optgroup key={t.id} label={t.name}>
                                    {(t.players || []).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                        </CustomSelect>
                    </div>
                </div>
            </div>

            {/* ── Empty states ─────────────────────────────────────────────── */}
            {!selectedId && (
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-10 text-center">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/25 flex items-center justify-center mx-auto mb-3">
                        <ZapIcon size={22} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-[#94A3B8]">Select an athlete to view their Force-Velocity profile</p>
                    <p className="text-xs text-slate-400 dark:text-[#64748B] mt-1">Requires at least 2 of: CMJ, Squat Jump, IMTP, Sprint data</p>
                </div>
            )}

            {selectedId && !profile && (
                <div className="space-y-4">
                    {/* Data status even when no profile computable */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-amber-200 dark:border-amber-700/40 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangleIcon size={14} className="text-amber-500" />
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                                Insufficient data to build F-V profile — {completedTests}/5 tests completed
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-[#94A3B8] mb-4">
                            At least 2 of the following tests must be logged to compute the Force-Velocity profile. Loaded CMJ alone provides the most data points.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <DataStatusBadge label="Countermovement Jump (CMJ)" date={fmtDate(testData.cmj?.date)} present={!!testData.cmj} />
                            <DataStatusBadge label="Squat Jump (SJ)" date={fmtDate(testData.sj?.date)} present={!!testData.sj} />
                            <DataStatusBadge label="IMTP (Isometric Mid-Thigh Pull)" date={fmtDate(testData.imtp?.date)} present={!!testData.imtp} />
                            <DataStatusBadge label="Sprint (10m + 30m/20m splits)" date={fmtDate(testData.sprint10?.date)} present={!!(testData.sprint10 && testData.sprint30)} />
                            <DataStatusBadge label="Loaded CMJ — Velocity-Load Profile" date={fmtDate(testData.loadedCmj?.date)} present={!!testData.loadedCmj} />
                        </div>
                    </div>
                </div>
            )}

            {profile && cls && (
                <div className="space-y-4">

                    {/* ── Summary Stat Cards ──────────────────────────────────── */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 gap-3">
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1">F₀ Max Force</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">
                                {(profile.F0 / 1000).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-[#64748B] mt-0.5">kN</div>
                        </div>
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1">V₀ Max Velocity</div>
                            <div className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0] tracking-tight">{profile.V0}</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#64748B] mt-0.5">m/s</div>
                        </div>
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 shadow-sm">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1">Pmax Peak Power</div>
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-300 tracking-tight">
                                {(profile.Pmax / 1000).toFixed(1)}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-[#64748B] mt-0.5">kW</div>
                        </div>
                        <div className={`rounded-xl border p-4 shadow-sm ${cls.bg} ${cls.border}`}>
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1">FV Imbalance</div>
                            <div className={`text-2xl font-bold tracking-tight ${cls.text}`}>
                                {profile.FVimbalance > 0 ? '+' : ''}{profile.FVimbalance}%
                            </div>
                            <div className={`text-[10px] font-semibold mt-0.5 ${cls.text}`}>{cls.label}</div>
                        </div>
                        <div className={`rounded-xl border p-4 shadow-sm col-span-2 sm:col-span-1 ${cls.bg} ${cls.border}`}>
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1">Profile Type</div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={`w-2.5 h-2.5 rounded-full ${cls.dot}`} />
                                <span className={`text-sm font-bold ${cls.text}`}>{cls.label}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-1 leading-tight">
                                {profile.FVimbalance < -10 ? 'Strength · Velocity Balance' :
                                    profile.FVimbalance > 10 ? 'Velocity · Strength Balance' : 'Strength · Velocity Balance'}
                            </div>
                        </div>
                    </div>

                    {/* ── Main chart + data status ───────────────────────────── */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                        {/* F-V Curve */}
                        <div className="xl:col-span-2 bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest">Force-Velocity Curve</div>
                                    <div className="text-[9px] text-slate-400 dark:text-[#475569] mt-0.5">
                                        Based on {profile.dataPoints.length} test data point{profile.dataPoints.length !== 1 ? 's' : ''}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-[9px] text-slate-400 dark:text-[#64748B]">
                                    <span className="flex items-center gap-1">
                                        <span className="inline-block w-4 h-0.5 bg-indigo-500 rounded" />
                                        Athlete Profile
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="inline-block w-4 h-0.5 bg-violet-400 rounded opacity-60" style={{ borderTop: '1.5px dashed' }} />
                                        Power Curve
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="inline-block w-3 h-3 rounded-full bg-violet-500" />
                                        Pmax
                                    </span>
                                </div>
                            </div>
                            <div className="text-slate-800 dark:text-[#94A3B8]">
                                <FVCurveChart profile={profile} />
                            </div>
                        </div>

                        {/* Data Status */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest">Data Status</div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    completedTests === 4
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                                        : completedTests >= 2
                                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                                }`}>
                                    {completedTests}/4 Tests
                                </span>
                            </div>

                            <div className="space-y-2">
                                <DataStatusBadge label="CMJ" date={fmtDate(testData.cmj?.date)} present={!!testData.cmj} />
                                <DataStatusBadge label="Squat Jump" date={fmtDate(testData.sj?.date)} present={!!testData.sj} />
                                <DataStatusBadge label="IMTP" date={fmtDate(testData.imtp?.date)} present={!!testData.imtp} />
                                <DataStatusBadge label="Sprint Splits" date={fmtDate(testData.sprint10?.date)} present={!!(testData.sprint10 && testData.sprint30)} />
                            </div>

                            {completedTests < 4 && (
                                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40">
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                        Complete all 4 tests to improve F-V profile accuracy. Missing tests reduce regression precision.
                                    </p>
                                </div>
                            )}

                            {/* Profile summary */}
                            <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-[#1A2D48]">
                                <div className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest">Profile Summary</div>
                                {[
                                    { label: 'Strength Qualities', val: profile.F0 > 3000 ? 'Above Average' : profile.F0 > 2000 ? 'Average' : 'Below Average', color: profile.F0 > 3000 ? 'text-emerald-600 dark:text-emerald-400' : profile.F0 > 2000 ? 'text-slate-600 dark:text-[#94A3B8]' : 'text-amber-600 dark:text-amber-400' },
                                    { label: 'Velocity Qualities', val: profile.V0 > 9 ? 'Above Average' : profile.V0 > 7 ? 'Average' : 'Below Average', color: profile.V0 > 9 ? 'text-emerald-600 dark:text-emerald-400' : profile.V0 > 7 ? 'text-slate-600 dark:text-[#94A3B8]' : 'text-amber-600 dark:text-amber-400' },
                                    { label: 'Power Qualities', val: profile.Pmax > 7000 ? 'Above Average' : profile.Pmax > 5000 ? 'Average' : 'Below Average', color: profile.Pmax > 7000 ? 'text-emerald-600 dark:text-emerald-400' : profile.Pmax > 5000 ? 'text-slate-600 dark:text-[#94A3B8]' : 'text-amber-600 dark:text-amber-400' },
                                    { label: 'Balance', val: cls.label, color: cls.text },
                                ].map(row => (
                                    <div key={row.label} className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{row.label}</span>
                                        <span className={`text-xs font-semibold ${row.color}`}>{row.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Training Recommendation ────────────────────────────── */}
                    <div className={`rounded-xl border p-5 ${cls.bg} ${cls.border}`}>
                        <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cls.dot} bg-opacity-20`}>
                                <TrendingUpIcon size={14} className={cls.text} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${cls.text}`}>Profile Insight</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${cls.bg} ${cls.text} border ${cls.border}`}>
                                        {cls.label}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-700 dark:text-[#CBD5E1] leading-relaxed">{profile.recommendation}</p>
                                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#243A58]/60">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest">Training Focus: </span>
                                    <span className="text-[10px] text-slate-600 dark:text-[#94A3B8]">{profile.trainingFocus}</span>
                                </div>
                                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-[#243A58]/60">
                                    <span className="text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest">SFV Slope: </span>
                                    <span className="text-[10px] text-slate-600 dark:text-[#94A3B8]">
                                        Actual {profile.SFV} N·s/m · Optimal {profile.SFV_opt} N·s/m
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Historical Trend (if multiple test sessions) ──────── */}
                    {historicalProfiles.length >= 2 && (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 shadow-sm">
                            <div className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-4">
                                Historical Trend — F₀, V₀, Pmax across test sessions
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-[#1A2D48]">
                                            <th className="text-left text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase py-2 pr-4">Date</th>
                                            <th className="text-right text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase py-2 px-3">F₀ (kN)</th>
                                            <th className="text-right text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase py-2 px-3">V₀ (m/s)</th>
                                            <th className="text-right text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase py-2 px-3">Pmax (kW)</th>
                                            <th className="text-right text-[9px] font-bold text-slate-400 dark:text-[#64748B] uppercase py-2 pl-3">Profile</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {historicalProfiles.map(({ date, profile: hp }, i) => {
                                            const prev = i > 0 ? historicalProfiles[i - 1].profile : null;
                                            const deltaF = prev ? ((hp.F0 - prev.F0) / prev.F0 * 100).toFixed(1) : null;
                                            const deltaPmax = prev ? ((hp.Pmax - prev.Pmax) / prev.Pmax * 100).toFixed(1) : null;
                                            const hcls = { force_deficit: 'text-amber-600 dark:text-amber-400', velocity_deficit: 'text-sky-600 dark:text-sky-400', well_balanced: 'text-emerald-600 dark:text-emerald-400' }[hp.classification];
                                            return (
                                                <tr key={date} className={`border-t border-slate-50 dark:border-[#1A2D48] ${i === historicalProfiles.length - 1 ? 'font-semibold bg-slate-50 dark:bg-[#1A2D48]/40' : ''}`}>
                                                    <td className="py-2 pr-4 text-slate-600 dark:text-[#94A3B8]">
                                                        {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                                                        {i === historicalProfiles.length - 1 && <span className="ml-1.5 text-[9px] text-indigo-500">latest</span>}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-700 dark:text-[#E2E8F0]">
                                                        {(hp.F0 / 1000).toFixed(2)}
                                                        {deltaF && <span className={`ml-1 text-[9px] ${Number(deltaF) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{Number(deltaF) > 0 ? '+' : ''}{deltaF}%</span>}
                                                    </td>
                                                    <td className="py-2 px-3 text-right text-slate-700 dark:text-[#E2E8F0]">{hp.V0}</td>
                                                    <td className="py-2 px-3 text-right text-slate-700 dark:text-[#E2E8F0]">
                                                        {(hp.Pmax / 1000).toFixed(1)}
                                                        {deltaPmax && <span className={`ml-1 text-[9px] ${Number(deltaPmax) > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{Number(deltaPmax) > 0 ? '+' : ''}{deltaPmax}%</span>}
                                                    </td>
                                                    <td className={`py-2 pl-3 text-right text-[10px] font-semibold ${hcls}`}>
                                                        {{ force_deficit: 'Force Def.', velocity_deficit: 'Vel. Def.', well_balanced: 'Balanced' }[hp.classification]}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── Methodology (collapsible) ──────────────────────────── */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] overflow-hidden shadow-sm">
                        <button
                            onClick={() => setShowMethodology(v => !v)}
                            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <InfoIcon size={13} className="text-slate-400 dark:text-[#64748B]" />
                                <span className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest">Methodology</span>
                            </div>
                            {showMethodology ? <ChevronUpIcon size={14} className="text-slate-400" /> : <ChevronDownIcon size={14} className="text-slate-400" />}
                        </button>
                        {showMethodology && (
                            <div className="px-5 pb-4 space-y-2 border-t border-slate-100 dark:border-[#1A2D48]">
                                <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] leading-relaxed pt-3">
                                    F-V profile computed using the Samozino simple method (2008, 2014). Push-off distance assumed at {DEFAULT_HPO}m.
                                    F₀ and V₀ derived from linear regression across available data points (CMJ, SJ, IMTP, Sprint).
                                    Optimal slope per Samozino et al. (2014). FV imbalance thresholds: &gt;±10% indicates a deficit (Jimenez-Reyes et al., 2019).
                                    This is a proxy profile — accuracy improves with loaded jump testing (multi-point method).
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-[#64748B]">
                                    Sources: Samozino et al. MSSE 2008, JAB 2014 · Morin & Samozino IJSS 2016 · Jimenez-Reyes et al. JSCR 2019
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            )}
        </div>
    );
};

export default ForceVelocityTerminal;
