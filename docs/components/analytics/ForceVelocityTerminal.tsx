// @ts-nocheck
/**
 * Force-Velocity Profile Terminal
 *
 * Scientific basis:
 * - Samozino et al. (2008, MSSE): Simple method — F-V from single CMJ
 * - Samozino et al. (2012, 2014, JAB): Optimal F-V profile and FV imbalance
 * - Morin & Samozino (2016, IJSS): Sprint-based horizontal F-V
 * - Jimenez-Reyes et al. (2019, JSCR): Training recommendations from profile
 *
 * Formulas:
 *   v0 = sqrt(2 * g * h)                          — take-off velocity from jump height
 *   F_mean = m * g * (h/hPO + 1)                  — mean force during push-off
 *   P_mean = F_mean * v0/2                         — mean power
 *   Pmax = F0 * V0 / 4                             — peak power (vertex of F-V parabola)
 *   FV_imbalance = (SFV_actual - SFV_opt) / |SFV_opt| * 100
 *
 * Classification (Jimenez-Reyes et al., 2019):
 *   Force deficit: FVimb < -10%
 *   Velocity deficit: FVimb > +10%
 *   Well-balanced: |FVimb| <= 10%
 */

import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    ZapIcon, UserIcon, TrendingUpIcon, AlertTriangleIcon, InfoIcon,
} from 'lucide-react';

const G = 9.81;
const DEFAULT_HPO = 0.40; // default push-off distance (m) — Samozino et al.

// ═══════════════════════════════════════════════════════════════════════
// F-V Calculation Engine
// ═══════════════════════════════════════════════════════════════════════

interface FVProfile {
    F0: number;           // Theoretical max force (N)
    V0: number;           // Theoretical max velocity (m/s)
    Pmax: number;         // Peak power (W)
    SFV: number;          // F-V slope (N·s/m, always negative)
    SFV_opt: number;      // Optimal slope for this athlete
    FVimbalance: number;  // % imbalance
    classification: 'force_deficit' | 'velocity_deficit' | 'well_balanced';
    recommendation: string;
    dataPoints: { label: string; force: number; velocity: number; source: string }[];
    bodyMass: number;
    jumpHeight?: number;
}

function buildFVProfile(
    bodyMass: number,
    cmjHeight?: number,     // m
    sjHeight?: number,      // m
    imtpForce?: number,     // N (peak isometric force)
    sprint10m?: number,     // seconds
    sprint30m?: number,     // seconds
    hPO = DEFAULT_HPO
): FVProfile | null {
    if (!bodyMass) return null;

    const dataPoints: FVProfile['dataPoints'] = [];

    // Convert height to metres: if value > 3, assume cm; otherwise assume m
    const toMetres = (val: number) => val > 3 ? val / 100 : val;

    // Point from CMJ (Samozino simple method)
    if (cmjHeight && cmjHeight > 0) {
        const height = toMetres(cmjHeight);
        const v_takeoff = Math.sqrt(2 * G * height);
        const F_mean = bodyMass * G * (height / hPO + 1);
        dataPoints.push({ label: 'CMJ', force: F_mean, velocity: v_takeoff, source: 'Samozino simple method' });
    }

    // Point from Squat Jump (different F:V ratio, no SSC)
    if (sjHeight && sjHeight > 0) {
        const height = toMetres(sjHeight);
        const v_takeoff = Math.sqrt(2 * G * height);
        const F_mean = bodyMass * G * (height / hPO + 1);
        dataPoints.push({ label: 'SJ', force: F_mean, velocity: v_takeoff, source: 'Samozino simple method (SJ)' });
    }

    // Point from IMTP (near-isometric = high force, ~zero velocity)
    if (imtpForce && imtpForce > 0) {
        dataPoints.push({ label: 'IMTP', force: imtpForce, velocity: 0.05, source: 'Isometric peak force' });
    }

    // Sprint-derived point (velocity-dominant)
    if (sprint10m && sprint30m && sprint10m > 0 && sprint30m > 0) {
        const v_max_approx = 20 / (sprint30m - sprint10m); // 20m split velocity
        const F_sprint = bodyMass * v_max_approx / (sprint10m * 0.8); // simplified horizontal force
        dataPoints.push({ label: 'Sprint', force: F_sprint, velocity: v_max_approx, source: 'Sprint split derivation' });
    }

    if (dataPoints.length < 2) return null; // need at least 2 points for a line

    // Linear regression on (velocity, force) pairs → F = F0 + SFV * v
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

    // Optimal SFV (Samozino et al., 2014): for vertical jumping
    // SFV_opt ≈ -(m * g) / (2 * hPO * sqrt(Pmax * hPO / (2 * m * g)))
    const sqrtTerm = Math.sqrt((Pmax * hPO) / (2 * bodyMass * G));
    const SFV_opt = sqrtTerm > 0 ? -(bodyMass * G) / (2 * hPO * sqrtTerm) : SFV;

    // F-V imbalance
    const FVimbalance = SFV_opt !== 0 ? ((SFV - SFV_opt) / Math.abs(SFV_opt)) * 100 : 0;

    let classification: FVProfile['classification'];
    let recommendation: string;

    if (FVimbalance < -10) {
        classification = 'force_deficit';
        recommendation = 'Focus on heavy resistance training (>80% 1RM), weighted jumps, eccentric overload, and isometric work to shift the profile toward higher force production.';
    } else if (FVimbalance > 10) {
        classification = 'velocity_deficit';
        recommendation = 'Focus on ballistic/plyometric training (<30% 1RM), unloaded jumps, sprint accelerations, and light-load jump squats to develop velocity capabilities.';
    } else {
        classification = 'well_balanced';
        recommendation = 'Profile is near-optimal. Maintain with mixed-methods training and focus on increasing overall Pmax (shift the entire F-V line outward).';
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
        dataPoints,
        bodyMass,
        jumpHeight: cmjHeight,
    };
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

const ForceVelocityTerminal = ({ selectedAnalyticsAthleteId, subjectAthleteIds }) => {
    const { teams } = useAppState();

    const allAthletes = useMemo(() => teams.flatMap(t => (t.players || []).map(p => ({ ...p, performanceMetrics: p.performanceMetrics || [], teamName: t.name }))), [teams]);
    const [selectedId, setSelectedId] = useState(selectedAnalyticsAthleteId || '');

    const athlete = allAthletes.find(a => a.id === selectedId);

    // Extract latest test data for this athlete
    const profile = useMemo(() => {
        if (!athlete) return null;
        const metrics = athlete.performanceMetrics || [];

        const getLatest = (types: string[]) => {
            const matches = metrics.filter(m => types.includes(m.type)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return matches[0] || null;
        };

        const cmj = getLatest(['cmj', 'cmj_advanced']);
        const sj = getLatest(['squat_jump']);
        const imtp = getLatest(['imtp_basic', 'imtp_advanced']);
        const sprint = getLatest(['sprint_10m', 'sprint_30m', 'sprint_20m', 'sprint_40m']);

        const bodyMass = athlete.weight_kg || athlete.weight || 80;

        // Extract values
        const cmjHeight = cmj?.height || cmj?.jump_height || cmj?.metrics?.jump_height || cmj?.metrics?.height || cmj?.value;
        const sjHeight = sj?.height || sj?.jump_height || sj?.metrics?.jump_height || sj?.metrics?.height || sj?.value;
        const imtpForce = imtp?.peak_force || imtp?.metrics?.peak_force || imtp?.value;

        // Sprint: need a short split (10m) and a longer split (20m/30m/40m)
        let sprint10 = null, sprint30 = null;
        // Get latest per sprint distance, sorted newest first
        const sprintMetrics = metrics.filter(m => m.type?.startsWith('sprint_')).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        for (const m of sprintMetrics) {
            const t = Number(m.time || m.metrics?.time || m.value || 0);
            if (t <= 0) continue;
            if (m.type === 'sprint_10m' && !sprint10) sprint10 = t;
            if ((m.type === 'sprint_30m' || m.type === 'sprint_40m' || m.type === 'sprint_20m') && !sprint30) sprint30 = t;
        }

        return buildFVProfile(bodyMass, cmjHeight, sjHeight, imtpForce, sprint10, sprint30);
    }, [athlete]);

    const classColors = {
        force_deficit: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', label: 'Force Deficit' },
        velocity_deficit: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', label: 'Velocity Deficit' },
        well_balanced: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', label: 'Well Balanced' },
    };

    return (
        <div className="space-y-5">
            {/* Athlete selector */}
            <div className="flex items-center gap-3">
                <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-300">
                    <option value="">Select an athlete...</option>
                    {teams.filter(t => t.players?.length).map(t => (
                        <optgroup key={t.id} label={t.name}>
                            {(t.players || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                    ))}
                </select>
            </div>

            {!selectedId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <ZapIcon size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">Select an athlete to view their Force-Velocity profile</p>
                    <p className="text-[10px] text-slate-300 mt-1">Requires at least 2 of: CMJ, Squat Jump, IMTP, Sprint data</p>
                </div>
            )}

            {selectedId && !profile && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                    <AlertTriangleIcon size={20} className="mx-auto text-amber-500 mb-2" />
                    <p className="text-sm text-amber-700">Insufficient test data to build an F-V profile.</p>
                    <p className="text-xs text-amber-500 mt-1">Need at least 2 of: CMJ height, Squat Jump height, IMTP peak force, or sprint split times (10m + 30m).</p>
                </div>
            )}

            {profile && (() => {
                const cls = classColors[profile.classification];
                return (
                    <div className="space-y-4">
                        {/* Classification banner */}
                        <div className={`rounded-xl border p-5 ${cls.bg} ${cls.border}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className={`text-lg font-bold ${cls.text}`}>{cls.label}</div>
                                    <div className="text-xs text-slate-600 mt-1">{profile.recommendation}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 uppercase">FV Imbalance</div>
                                    <div className={`text-2xl font-bold ${cls.text}`}>{profile.FVimbalance > 0 ? '+' : ''}{profile.FVimbalance}%</div>
                                </div>
                            </div>
                        </div>

                        {/* Key metrics */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                                <div className="text-[9px] font-semibold text-slate-400 uppercase">F0 (Max Force)</div>
                                <div className="text-xl font-bold text-slate-800">{profile.F0}<span className="text-xs text-slate-400 ml-1">N</span></div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                                <div className="text-[9px] font-semibold text-slate-400 uppercase">V0 (Max Velocity)</div>
                                <div className="text-xl font-bold text-slate-800">{profile.V0}<span className="text-xs text-slate-400 ml-1">m/s</span></div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                                <div className="text-[9px] font-semibold text-slate-400 uppercase">Pmax (Peak Power)</div>
                                <div className="text-xl font-bold text-indigo-600">{profile.Pmax}<span className="text-xs text-slate-400 ml-1">W</span></div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                                <div className="text-[9px] font-semibold text-slate-400 uppercase">SFV Slope</div>
                                <div className="text-xl font-bold text-slate-800">{profile.SFV}<span className="text-xs text-slate-400 ml-1">N·s/m</span></div>
                                <div className="text-[9px] text-slate-400">Optimal: {profile.SFV_opt}</div>
                            </div>
                        </div>

                        {/* Data points used */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Data Points Used ({profile.dataPoints.length})</div>
                            <div className="space-y-2">
                                {profile.dataPoints.map((dp, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-700">{dp.label}</span>
                                            <span className="text-[10px] text-slate-400 ml-2">{dp.source}</span>
                                        </div>
                                        <div className="text-xs text-slate-600">
                                            {Math.round(dp.force)}N @ {dp.velocity.toFixed(2)} m/s
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Methodology */}
                        <div className="bg-slate-800 text-white rounded-xl p-4">
                            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-1">F-V Profile Methodology</div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                                Force-velocity profile calculated using the Samozino simple method (2008, 2014). Push-off distance assumed at {DEFAULT_HPO}m.
                                F0 and V0 derived from linear regression of available data points (CMJ, SJ, IMTP, Sprint).
                                Optimal slope calculated per Samozino et al. (2014). FV imbalance thresholds: &gt;±10% indicates deficit (Jimenez-Reyes et al., 2019).
                                This is a proxy profile — accuracy improves with loaded jump testing (multi-point method).
                            </p>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default ForceVelocityTerminal;
