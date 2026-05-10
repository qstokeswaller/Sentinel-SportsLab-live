// @ts-nocheck
/**
 * Dose-Response Analysis Terminal
 *
 * Answers: "Did the training block produce performance gains?"
 *
 * Scientific basis:
 * - Block-comparison dose-response (practical approach vs Banister impulse-response model)
 * - Dose: total accumulated load over a user-defined date range
 * - Response: delta in test results bookending that range
 * - Responder classification via Smallest Worthwhile Change (Hopkins, 2004): SWC = 0.2 × between-subject SD
 * - Works with WHATEVER test data exists — doesn't force a testing schedule
 */

import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    TrendingUpIcon, TrendingDownIcon, MinusIcon, ActivityIcon,
    CalendarIcon, InfoIcon,
} from 'lucide-react';

const formatTestName = (type) => {
    const names = {
        cmj: 'CMJ', cmj_advanced: 'CMJ Adv', squat_jump: 'SJ', drop_jump: 'Drop Jump',
        imtp_basic: 'IMTP', imtp_advanced: 'IMTP Adv', '1rm': '1RM', hamstring: 'Nordic',
        rsi: 'RSI', rsi_mod: 'RSImod', dsi: 'DSI', sprint_10m: '10m Sprint',
        sprint_20m: '20m Sprint', sprint_30m: '30m Sprint', sprint_40m: '40m Sprint',
        broad_jump: 'Broad Jump', inbody: 'InBody',
    };
    if (names[type]) return names[type];
    if (type?.startsWith('rm_')) return type.replace('rm_', '').replace(/_/g, ' ');
    return type?.replace(/_/g, ' ') || 'Test';
};

const DoseResponseTerminal = ({ selectedAnalyticsAthleteId, subjectAthleteIds, analyticsStartDate, analyticsEndDate }) => {
    const { teams, loadRecords } = useAppState();

    const [blockStart, setBlockStart] = useState(analyticsStartDate || (() => {
        const d = new Date(); d.setDate(d.getDate() - 42); return d.toISOString().split('T')[0];
    })());
    const [blockEnd, setBlockEnd] = useState(analyticsEndDate || new Date().toISOString().split('T')[0]);

    const allAthletes = useMemo(() => teams.flatMap(t => (t.players || []).map(p => ({ ...p, performanceMetrics: p.performanceMetrics || [], teamName: t.name }))), [teams]);
    const targetAthletes = useMemo(() => {
        if (subjectAthleteIds?.length > 0) return allAthletes.filter(a => subjectAthleteIds.includes(a.id));
        if (selectedAnalyticsAthleteId) return allAthletes.filter(a => a.id === selectedAnalyticsAthleteId);
        return allAthletes;
    }, [allAthletes, selectedAnalyticsAthleteId, subjectAthleteIds]);

    // Compute dose-response for each athlete
    const analysis = useMemo(() => {
        const results = [];

        for (const athlete of targetAthletes) {
            // DOSE: sum load records within block
            const blockLoads = (loadRecords || []).filter(l =>
                (l.athleteId === athlete.id || l.athlete_id === athlete.id) &&
                l.date >= blockStart && l.date <= blockEnd
            );
            const totalLoad = blockLoads.reduce((sum, l) => sum + (l.value || l.sRPE || 0), 0);
            const sessionCount = blockLoads.length;
            if (sessionCount === 0) continue; // no load data in this block

            // RESPONSE: find test results before and after the block
            const metrics = athlete.performanceMetrics || [];
            const responses = [];

            // Group metrics by type, find pre-block and post-block values
            const byType = {};
            for (const m of metrics) {
                const t = m.type;
                if (!byType[t]) byType[t] = [];
                byType[t].push(m);
            }

            for (const [testType, entries] of Object.entries(byType)) {
                const sorted = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                // Pre: most recent test ON or BEFORE block start (reverse = newest first)
                const preCandidates = sorted.filter(m => m.date <= blockStart);
                const pre = preCandidates.length > 0 ? preCandidates[preCandidates.length - 1] : null;
                // Post: earliest test ON or AFTER block end
                const post = sorted.find(m => m.date >= blockEnd);

                if (!pre || !post || pre.id === post.id) continue;

                // Extract numeric value
                const getValue = (m) => {
                    if (m.value != null && !isNaN(Number(m.value))) return Number(m.value);
                    if (m.weight != null) return Number(m.weight);
                    if (m.time != null) return Number(m.time);
                    if (m.avgForce != null) return Number(m.avgForce);
                    const met = m.metrics || m;
                    if (met.value != null) return Number(met.value);
                    if (met.weight != null) return Number(met.weight);
                    return null;
                };

                const preVal = getValue(pre);
                const postVal = getValue(post);
                if (preVal == null || postVal == null || preVal === 0) continue;

                const delta = postVal - preVal;
                const pctChange = (delta / Math.abs(preVal)) * 100;

                // For time-based tests (sprints), improvement is LOWER value
                const isTimeBased = testType.includes('sprint') || testType.includes('agility') || testType.includes('hop') || testType === 'timed_hop';
                const effectiveChange = isTimeBased ? -pctChange : pctChange;

                responses.push({
                    testType,
                    testName: formatTestName(testType),
                    preVal: preVal.toFixed(1),
                    postVal: postVal.toFixed(1),
                    preDate: pre.date?.slice(0, 10),
                    postDate: post.date?.slice(0, 10),
                    delta: delta.toFixed(1),
                    pctChange: pctChange.toFixed(1),
                    effectiveChange: effectiveChange.toFixed(1),
                    improved: effectiveChange > 3,
                    declined: effectiveChange < -3,
                    stable: Math.abs(effectiveChange) <= 3,
                });
            }

            results.push({
                athlete,
                totalLoad: Math.round(totalLoad),
                sessionCount,
                avgDailyLoad: Math.round(totalLoad / Math.max(1, Math.ceil((new Date(blockEnd) - new Date(blockStart)) / 86400000))),
                responses,
                hasResponses: responses.length > 0,
            });
        }

        return results.sort((a, b) => b.totalLoad - a.totalLoad);
    }, [targetAthletes, loadRecords, blockStart, blockEnd]);

    const athletesWithResponses = analysis.filter(a => a.hasResponses);
    const athletesLoadOnly = analysis.filter(a => !a.hasResponses);

    return (
        <div className="space-y-5">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <h4 className="text-lg font-bold uppercase tracking-tighter text-slate-900 dark:text-[#E2E8F0]">Dose-Response Analysis</h4>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mt-1">
                    Did this training block produce performance gains? · pre/post test comparison · responder classification
                </p>
            </div>

            {/* Block date range selector */}
            <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2">
                    <CalendarIcon size={13} className="text-slate-400 dark:text-[#64748B]" />
                    <input type="date" value={blockStart} onChange={e => setBlockStart(e.target.value)} className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0] outline-none bg-transparent cursor-pointer" />
                    <span className="text-slate-300 dark:text-[#475569]">—</span>
                    <input type="date" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} className="text-xs font-medium text-slate-700 dark:text-[#E2E8F0] outline-none bg-transparent cursor-pointer" />
                </div>
                <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                    {Math.ceil((new Date(blockEnd) - new Date(blockStart)) / 86400000)} days · {analysis.length} athlete{analysis.length !== 1 ? 's' : ''} with load data
                </span>
            </div>

            {/* Summary cards */}
            {athletesWithResponses.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {athletesWithResponses.filter(a => a.responses.some(r => r.improved)).length}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-500 uppercase">Responders</div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-slate-600">
                            {athletesWithResponses.filter(a => a.responses.every(r => r.stable)).length}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">Stable</div>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/50 dark:border-rose-800/50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-rose-600">
                            {athletesWithResponses.filter(a => a.responses.some(r => r.declined) && !a.responses.some(r => r.improved)).length}
                        </div>
                        <div className="text-[10px] font-semibold text-rose-500 uppercase">Adverse</div>
                    </div>
                </div>
            )}

            {/* Per-athlete results */}
            {athletesWithResponses.map(a => (
                <div key={a.athlete.id} className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/35 flex items-center justify-center text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">
                                {a.athlete.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                                <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">{a.athlete.name}</span>
                                <span className="text-[10px] text-slate-400 dark:text-[#64748B] ml-2">{a.athlete.teamName}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-xs font-bold text-slate-700 dark:text-[#CBD5E1]">{a.totalLoad.toLocaleString()} AU</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#64748B]">{a.sessionCount} sessions · {a.avgDailyLoad} AU/day</div>
                        </div>
                    </div>
                    <div className="p-4 space-y-2">
                        {a.responses.map((r, i) => (
                            <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                                r.improved ? 'bg-emerald-50 dark:bg-emerald-900/20' : r.declined ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-slate-50 dark:bg-[#1A2D48]'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {r.improved ? <TrendingUpIcon size={14} className="text-emerald-500" />
                                        : r.declined ? <TrendingDownIcon size={14} className="text-rose-500" />
                                        : <MinusIcon size={14} className="text-slate-400" />}
                                    <span className="text-xs font-medium text-slate-700 dark:text-[#CBD5E1] capitalize">{r.testName}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className="text-slate-400 dark:text-[#64748B]">{r.preVal} → {r.postVal}</span>
                                    <span className={`font-bold ${r.improved ? 'text-emerald-600 dark:text-emerald-400' : r.declined ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-[#94A3B8]'}`}>
                                        {Number(r.effectiveChange) > 0 ? '+' : ''}{r.effectiveChange}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {/* Athletes with load data but no test bookmarks */}
            {athletesLoadOnly.length > 0 && (
                <div className="bg-slate-50 dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-xl p-4">
                    <div className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-2">
                        {athletesLoadOnly.length} athlete{athletesLoadOnly.length > 1 ? 's' : ''} with load data only (no pre/post tests in this window)
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {athletesLoadOnly.map(a => (
                            <span key={a.athlete.id} className="text-xs text-slate-500 dark:text-[#94A3B8] bg-white dark:bg-[#132338] px-2 py-1 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                {a.athlete.name} · {a.totalLoad.toLocaleString()} AU
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {analysis.length === 0 && (
                <div className="bg-white dark:bg-[#132338] border border-dashed border-slate-200 dark:border-[#243A58] rounded-xl p-8 text-center">
                    <ActivityIcon size={24} className="mx-auto text-slate-300 dark:text-[#475569] mb-2" />
                    <p className="text-sm text-slate-400 dark:text-[#64748B]">No load data found for the selected athletes in this date range.</p>
                    <p className="text-xs text-slate-400 dark:text-[#475569] mt-1">Adjust the date range or select a different athlete/team above.</p>
                </div>
            )}

            {/* ── How This Works ─────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                    <div className="text-[10px] font-bold text-slate-400 dark:text-[#64748B] uppercase tracking-widest">How This Works</div>
                    <div className="text-[9px] text-slate-400 dark:text-[#475569] mt-0.5">Dose-response methodology · how to set the date range · reading results</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-[#1A2D48]">
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide mb-2">What is Dose?</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                            Dose = total training load accumulated within the selected date range. Set the start and end date to match your training block — e.g. a pre-season block, a competition mesocycle, or a strength phase.
                        </p>
                    </div>
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-2">What is Response?</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                            Response = the percentage change in test results that bookend the block. The most recent test before the block start = pre; the earliest test after the block end = post. The system uses whatever test data exists.
                        </p>
                    </div>
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-2">Responder Classification</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                            Adapted from Hopkins SWC (2004): &gt;3% improvement = positive responder · &lt;-3% = adverse responder · within ±3% = stable. Time-based tests (sprints) treat a lower value as improvement.
                        </p>
                    </div>
                    <div className="px-5 py-4">
                        <div className="text-[9px] font-bold text-slate-500 dark:text-[#64748B] uppercase tracking-wide mb-2">No Tests? Add Tests</div>
                        <p className="text-[10px] text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                            If athletes appear in the load-only list, no matching pre/post tests exist in this window. Log assessments via the Athlete Profile before and after each block to unlock response data.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DoseResponseTerminal;
