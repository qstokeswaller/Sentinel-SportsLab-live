// @ts-nocheck
/**
 * Individualized Load Tolerance Thresholds
 *
 * Scientific basis:
 * - Gabbett (2016): Population ACWR zones (0.8–1.3 sweet spot, >1.5 danger)
 * - Blanch & Gabbett (2016): High chronic workload is protective
 * - Windt & Gabbett (2017): Individual variation requires personalized thresholds
 * - Hulin et al. (2016): Athletes with high chronic loads tolerate higher ACWR
 * - Impellizzeri et al. (2019): ACWR mathematical coupling critique → use EWMA
 *
 * Method: Frequency-based threshold estimation
 * For each athlete, bin historical ACWR values and track negative event
 * incidence per bin. Personal threshold = ACWR above which negative events
 * cluster at >15% incidence. Falls back to population defaults when data < 8 weeks.
 */

import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { ACWR_UTILS, ACWR_METRIC_TYPES } from '../../utils/constants';
import { CustomSelect } from '../ui/CustomSelect';
import {
    ShieldIcon, GaugeIcon, AlertTriangleIcon, InfoIcon,
    TrendingUpIcon, ActivityIcon, UserIcon, UsersIcon, XIcon as XSmallIcon,
    BookOpenIcon, XIcon, HeartPulseIcon, BrainIcon, TargetIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Threshold calculation engine
// ═══════════════════════════════════════════════════════════════════════

interface ThresholdResult {
    lowerThreshold: number;   // below this = underexposed
    upperThreshold: number;   // above this = elevated risk
    confidence: 'high' | 'moderate' | 'low';
    weeksOfData: number;
    negativeEvents: number;
    binData: { bin: number; totalWeeks: number; eventWeeks: number; rate: number }[];
    isPersonalized: boolean;  // false = using population defaults
}

// Population defaults (Gabbett 2016)
const POP_LOWER = 0.8;
const POP_UPPER = 1.3;
const POP_DANGER = 1.5;

/**
 * Build the canonical ACWR series for an athlete, honouring the platform's
 * ACWR options (metric type, rest-day freezing, return-from-injury anchor,
 * coach-marked rest days). Same EWMA semantics as `ACWR_UTILS.calculateEWMA`
 * + `buildDailyLoads`, so the series we bin against matches what the ACWR Hub
 * displays — no divergence between Wellness Hub's personal thresholds and the
 * coach's live ACWR view.
 *
 * Critically, this filters by `opts.metricType` BEFORE building the daily
 * series — sRPE-only teams accept records without an explicit metric_type,
 * every other metric (Sprint Distance, Tonnage, etc.) requires an exact match.
 * Without this filter, multi-metric data was being summed into mixed-unit
 * garbage and the personal thresholds were meaningless for non-sRPE teams.
 */
function buildAcwrSeriesForAthlete(
    loadRecords: any[],
    athleteId: string,
    opts: {
        metricType?: string;
        acuteN: number;
        chronicN: number;
        freezeRestDays?: boolean;
        recalcAnchorDate?: string;
        additionalRestDays?: Set<string>;
    },
): { date: string; acwr: number }[] {
    let records = (loadRecords || []).filter(
        r => r.athleteId === athleteId || r.athlete_id === athleteId
    );
    const isSrpe = !opts.metricType || opts.metricType === 'srpe';
    if (isSrpe) {
        records = records.filter(r => !r.metric_type || r.metric_type === 'srpe');
    } else {
        records = records.filter(r => r.metric_type === opts.metricType);
    }
    if (opts.recalcAnchorDate) {
        // Defensive: anchor may be a string OR Date object depending on how it
        // was persisted (recalcAnchors and exclusion.returnAnchorDate aren't
        // always normalised). Coerce both sides to YYYY-MM-DD strings.
        const anchor = String(opts.recalcAnchorDate).slice(0, 10);
        records = records.filter(r => String(r.date || '').slice(0, 10) >= anchor);
    }
    if (records.length === 0) return [];

    // Always read the unified `value` field — buildDailyLoads internally falls
    // back to `r.sRPE` when `value` is missing, which is how the canonical
    // ACWR engine handles both new and legacy record shapes. Using 'sRPE' as
    // primary would silently miss new unified records (value present, sRPE absent).
    const valueField = 'value';
    const { dates, loads, restDays } = ACWR_UTILS.buildDailyLoads(records, valueField, opts.additionalRestDays);
    if (loads.length === 0) return [];

    const lambdaA = 2 / (opts.acuteN + 1);
    const lambdaC = 2 / (opts.chronicN + 1);
    let acute = loads[0];
    let chronic = loads[0];
    const series: { date: string; acwr: number }[] = [];
    for (let i = 0; i < loads.length; i++) {
        if (opts.freezeRestDays && restDays.has(dates[i])) {
            // freeze — keep prior EWMA values
        } else if (i > 0) {
            acute = loads[i] * lambdaA + acute * (1 - lambdaA);
            chronic = loads[i] * lambdaC + chronic * (1 - lambdaC);
        }
        if (chronic > 0) {
            series.push({ date: dates[i], acwr: acute / chronic });
        }
    }
    return series;
}

/**
 * Calculate individualized ACWR thresholds for an athlete.
 *
 * @param acwrSeries - Pre-built ACWR series (typically from buildAcwrSeriesForAthlete)
 * @param wellnessScores - Array of { date, composite } where composite is 0-10
 * @param injuryDates - Array of ISO date strings when injuries occurred
 */
export function calculatePersonalThresholds(
    acwrSeries: { date: string; acwr: number }[],
    wellnessScores: { date: string; composite: number }[],
    injuryDates: string[],
): ThresholdResult {
    if (acwrSeries.length < 14) {
        return {
            lowerThreshold: POP_LOWER, upperThreshold: POP_UPPER, confidence: 'low',
            weeksOfData: Math.floor(acwrSeries.length / 7),
            negativeEvents: 0, binData: [], isPersonalized: false,
        };
    }

    // Build negative event set:
    // 1. Injury dates
    // 2. Sustained wellness drop: composite below athlete's own mean - 1.5 SD for 3+ consecutive days
    const negativeEventDates = new Set<string>(injuryDates.map(d => d.split('T')[0]));

    if (wellnessScores.length >= 14) {
        const mean = wellnessScores.reduce((s, w) => s + w.composite, 0) / wellnessScores.length;
        const sd = Math.sqrt(wellnessScores.reduce((s, w) => s + (w.composite - mean) ** 2, 0) / wellnessScores.length);
        const threshold = mean - 1.5 * sd;
        let consecutiveLow = 0;
        for (const w of wellnessScores) {
            if (w.composite < threshold) {
                consecutiveLow++;
                if (consecutiveLow >= 3) negativeEventDates.add(w.date.split('T')[0]);
            } else {
                consecutiveLow = 0;
            }
        }
    }

    // Bin ACWR values into 0.1 increments, track negative event incidence per bin
    // A week is flagged as "event week" if a negative event occurred within the following 7 days
    const bins = new Map<number, { total: number; events: number }>();

    for (let i = 0; i < acwrSeries.length; i++) {
        const binKey = Math.round(acwrSeries[i].acwr * 10) / 10; // round to 0.1
        if (!bins.has(binKey)) bins.set(binKey, { total: 0, events: 0 });
        const bin = bins.get(binKey)!;
        bin.total++;

        // Check if negative event within next 7 days
        const thisDate = new Date(acwrSeries[i].date);
        let hasEvent = false;
        for (let d = 0; d <= 7; d++) {
            const checkDate = new Date(thisDate);
            checkDate.setDate(thisDate.getDate() + d);
            if (negativeEventDates.has(checkDate.toISOString().split('T')[0])) {
                hasEvent = true;
                break;
            }
        }
        if (hasEvent) bin.events++;
    }

    // Convert to sorted array
    const binData = Array.from(bins.entries())
        .map(([bin, data]) => ({ bin, totalWeeks: data.total, eventWeeks: data.events, rate: data.total > 0 ? data.events / data.total : 0 }))
        .sort((a, b) => a.bin - b.bin);

    const weeksOfData = Math.floor(acwrSeries.length / 7);
    const negativeEvents = negativeEventDates.size;

    // Find personal upper threshold: lowest ACWR bin above 0.8 where event rate > 15%
    let upperThreshold = POP_UPPER;
    let isPersonalized = false;

    if (weeksOfData >= 8 && negativeEvents >= 1) {
        // Scan from low ACWR upward — find where risk starts climbing
        for (const b of binData) {
            if (b.bin >= 0.8 && b.totalWeeks >= 3 && b.rate > 0.15) {
                upperThreshold = b.bin;
                isPersonalized = true;
                break;
            }
        }
        // If no bin exceeds 15%, athlete tolerates all observed loads — use max observed + buffer
        if (!isPersonalized && binData.length > 0) {
            const maxObserved = Math.max(...binData.filter(b => b.totalWeeks >= 2).map(b => b.bin));
            if (maxObserved > POP_UPPER) {
                upperThreshold = Math.min(maxObserved, 2.0);
                isPersonalized = true;
            }
        }
    }

    // Find personal lower threshold: ACWR below which chronic load decays significantly
    let lowerThreshold = POP_LOWER;
    for (const b of [...binData].reverse()) {
        if (b.bin <= 0.8 && b.totalWeeks >= 3 && b.rate > 0.10) {
            lowerThreshold = b.bin + 0.1; // one bin above the risky low zone
            break;
        }
    }

    const confidence = weeksOfData >= 16 && negativeEvents >= 3 ? 'high'
        : weeksOfData >= 8 ? 'moderate'
        : 'low';

    return { lowerThreshold, upperThreshold, confidence, weeksOfData, negativeEvents, binData, isPersonalized };
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

const IndividualizedThresholds: React.FC = () => {
    const {
        teams, loadRecords, wellnessResponses, injuryReports, acwrSettings,
        calculateACWR, getAthleteAcwrOptions,
    } = useAppState();

    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const [teamScope, setTeamScope] = useState<string>('');
    const [explainOpen, setExplainOpen] = useState(false);
    const allAthletes = useMemo(() => teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamId: t.id, teamName: t.name }))), [teams]);

    // Athletes scoped to the selected team. When no team is picked, show every
    // athlete across all teams — same dual-filter pattern as AnalyticsHubPage.
    const scopedAthletes = useMemo(() => {
        if (teamScope) {
            const team = teams.find(t => t.id === teamScope);
            return [...(team?.players || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        }
        return [...allAthletes].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [teamScope, teams, allAthletes]);

    function handleTeamScopeChange(newTeamId: string) {
        setTeamScope(newTeamId);
        // Clear the athlete if they're no longer in the new team's roster
        if (newTeamId && selectedAthleteId) {
            const team = teams.find(t => t.id === newTeamId);
            if (!team?.players?.some(p => p.id === selectedAthleteId)) {
                setSelectedAthleteId('');
            }
        }
    }

    const selectedAthlete = allAthletes.find(a => a.id === selectedAthleteId);
    const playerTeam = selectedAthlete ? teams.find(t => t.id === selectedAthlete.teamId) : null;
    const teamId = playerTeam?.id;
    const acwrEnabled = teamId && (teamId === 't_private'
        ? acwrSettings[`ind_${selectedAthleteId}`]?.enabled
        : acwrSettings[teamId]?.enabled);

    // Resolve the athlete's ACWR options up-front. Surfaced separately from the
    // thresholds memo so the UI can show "Personalised for: [metric]" without
    // re-running the heavy threshold calculation.
    const acwrOpts = useMemo(
        () => (selectedAthleteId && acwrEnabled) ? getAthleteAcwrOptions(selectedAthleteId) : null,
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedAthleteId, acwrEnabled, acwrSettings]
    );

    // Compute thresholds for selected athlete
    const thresholds = useMemo(() => {
        if (!selectedAthleteId || !acwrEnabled || !acwrOpts) return null;

        // Build canonical ACWR series — filters by metric_type, honours rest-day
        // freezing + return-from-injury anchor + coach-marked rest days. Matches
        // exactly what the ACWR Hub displays for this athlete.
        const acwrSeries = buildAcwrSeriesForAthlete(loadRecords || [], selectedAthleteId, acwrOpts);

        // Build wellness composite series from the live questionnaire feed. Handles
        // both flat (legacy) and nested `responses.X` (current FIFA-style) shapes,
        // and uses the same 4-domain weighting as the PI engine (sleep 35%, energy
        // 30%, soreness 20%, stress 15%; soreness/stress/fatigue inverted so higher
        // = better). Single source of truth so the threshold engine never disagrees
        // with PI on what counts as a wellness drop.
        const athleteWellness = (wellnessResponses || [])
            .filter(w => w.athleteId === selectedAthleteId || w.athlete_id === selectedAthleteId)
            .map(w => {
                const r = (w.responses && typeof w.responses === 'object') ? w.responses : w;
                const date = String(w.session_date || w.date || '').slice(0, 10);
                // Track which fields were actually filled in. Defaulting missing
                // fields to 0 inflates the composite (because soreness/stress/fatigue
                // get inverted to `10 - 0 = 10`) — an entry with no data would
                // otherwise score a misleading 6.5/10. Skip such ghost entries.
                const sleepVal    = r.sleep_quality ?? r.sleep;
                const fatigueVal  = r.fatigue;
                const sorenessVal = r.soreness;
                const stressVal   = r.stress;
                const hasAny = [sleepVal, fatigueVal, sorenessVal, stressVal]
                    .some(v => v !== null && v !== undefined && v !== '' && !Number.isNaN(Number(v)));
                if (!hasAny) return null;
                const sleep    = Number(sleepVal ?? 0);
                const fatigue  = Number(fatigueVal ?? 0);
                const soreness = Number(sorenessVal ?? 0);
                const stress   = Number(stressVal ?? 0);
                // Composite on 0-10 scale. Energy = inverted fatigue (questionnaire asks
                // about fatigue, not energy directly).
                const composite = sleep * 0.35 + (10 - fatigue) * 0.30 + (10 - soreness) * 0.20 + (10 - stress) * 0.15;
                return { date, composite };
            })
            .filter((w): w is { date: string; composite: number } => !!w && !!w.date && !Number.isNaN(w.composite))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Injury dates — use the canonical `dateOfInjury` field. Falls back to
        // `date_of_injury` (snake_case, raw DB shape) but NOT to `created_at`
        // (that's when the report was filed, not when the injury happened — wrong
        // temporal alignment).
        const injuryDates = (injuryReports || [])
            .filter(r => r.athleteId === selectedAthleteId || r.athlete_id === selectedAthleteId)
            .map(r => String(r.dateOfInjury || r.date_of_injury || ''))
            .filter(Boolean);

        return calculatePersonalThresholds(acwrSeries, athleteWellness, injuryDates);
    }, [selectedAthleteId, loadRecords, wellnessResponses, injuryReports, acwrEnabled, acwrOpts]);

    // Current ACWR
    let currentAcwr = null;
    try { if (acwrEnabled) currentAcwr = calculateACWR(selectedAthleteId); } catch {}

    const zoneColor = (acwr: number, t: ThresholdResult) => {
        if (acwr < t.lowerThreshold) return 'text-sky-600 dark:text-sky-300';
        if (acwr <= t.upperThreshold) return 'text-emerald-600 dark:text-emerald-300';
        if (acwr <= t.upperThreshold + 0.2) return 'text-amber-600 dark:text-amber-300';
        return 'text-rose-600 dark:text-rose-300';
    };

    const zoneBg = (acwr: number, t: ThresholdResult) => {
        if (acwr < t.lowerThreshold) return 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/50';
        if (acwr <= t.upperThreshold) return 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50';
        if (acwr <= t.upperThreshold + 0.2) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50';
        return 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50';
    };

    const zoneLabel = (acwr: number, t: ThresholdResult) => {
        if (acwr < t.lowerThreshold) return 'Underexposed';
        if (acwr <= t.upperThreshold) return 'Personal Sweet Spot';
        if (acwr <= t.upperThreshold + 0.2) return 'Approaching Limit';
        return 'Above Personal Threshold';
    };

    // ── Derivation chart — visualises the per-bin ACWR distribution + event
    // incidence that drove the personal upper threshold. Bars per 0.1 ACWR bin
    // from 0.5 to 2.0. Bar height = days in that bin. Bar colour = event rate
    // (emerald <10%, amber 10-15%, rose >15%). Reference lines for population
    // defaults (dashed), personal thresholds (solid violet) + current ACWR.
    const renderDerivationChart = (t: ThresholdResult) => {
        const BIN_MIN = 0.5;
        const BIN_MAX = 2.0;
        const BIN_STEP = 0.1;
        const binCount = Math.round((BIN_MAX - BIN_MIN) / BIN_STEP) + 1;
        const denseBins: { bin: number; totalWeeks: number; eventWeeks: number; rate: number }[] = [];
        for (let i = 0; i < binCount; i++) {
            const b = Math.round((BIN_MIN + i * BIN_STEP) * 10) / 10;
            const found = t.binData.find(x => Math.round(x.bin * 10) / 10 === b);
            denseBins.push(found || { bin: b, totalWeeks: 0, eventWeeks: 0, rate: 0 });
        }
        const maxWeeks = Math.max(1, ...denseBins.map(b => b.totalWeeks));
        const xPct = (v: number) => ((v - BIN_MIN) / (BIN_MAX - BIN_MIN)) * 100;

        return (
            <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <GaugeIcon size={12} className="text-violet-500 dark:text-violet-300" />
                            <h3 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Threshold Derivation</h3>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">
                            How the personal upper threshold was picked from {t.weeksOfData} week{t.weeksOfData !== 1 ? 's' : ''} of this athlete's ACWR history.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2.5 text-[9px] text-slate-600 dark:text-[#CBD5E1] shrink-0">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-emerald-400" /> &lt;10% events</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-amber-400" /> 10-15%</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-sm bg-rose-400" /> &gt;15%</span>
                    </div>
                </div>

                {/* Y-axis title — rotated and pinned to the left edge */}
                <div className="relative" style={{ height: '210px' }}>
                    <div className="absolute left-0 top-0 bottom-12 w-4 flex items-center justify-center">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] whitespace-nowrap" style={{ transform: 'rotate(-90deg)' }}>Days in bin</span>
                    </div>
                    {/* Y-axis tick labels */}
                    <div className="absolute left-4 top-0 bottom-12 w-9 flex flex-col justify-between text-[9px] text-slate-400 dark:text-[#94A3B8] pr-1 text-right">
                        <span>{maxWeeks} d</span>
                        <span>{Math.round(maxWeeks / 2)} d</span>
                        <span>0 d</span>
                    </div>
                    {/* Bars + reference lines — left offset = title col (16px) + tick labels (36px) = 52px */}
                    <div className="absolute left-[52px] right-0 top-0 bottom-12">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="border-t border-slate-100 dark:border-[#1A2D48]" />
                            <div className="border-t border-slate-100 dark:border-[#1A2D48]" />
                            <div className="border-t border-slate-200 dark:border-[#243A58]" />
                        </div>
                        <div className="relative h-full flex items-end gap-px">
                            {denseBins.map(bin => {
                                const heightPct = maxWeeks > 0 ? (bin.totalWeeks / maxWeeks) * 100 : 0;
                                const tone = bin.totalWeeks === 0 ? 'bg-slate-100 dark:bg-[#1A2D48]/50'
                                    : bin.rate > 0.15 ? 'bg-rose-400 dark:bg-rose-500'
                                    : bin.rate > 0.10 ? 'bg-amber-400 dark:bg-amber-500'
                                    : 'bg-emerald-400 dark:bg-emerald-500';
                                return (
                                    <div
                                        key={bin.bin}
                                        className="flex-1 relative flex items-end"
                                        title={bin.totalWeeks > 0
                                            ? `ACWR ${bin.bin.toFixed(1)} · ${bin.totalWeeks} day${bin.totalWeeks !== 1 ? 's' : ''} · ${bin.eventWeeks} event-day${bin.eventWeeks !== 1 ? 's' : ''} (${(bin.rate * 100).toFixed(0)}%)`
                                            : `ACWR ${bin.bin.toFixed(1)} · No data`}
                                    >
                                        <div className={`w-full ${tone} rounded-t`} style={{ height: `${Math.max(heightPct, bin.totalWeeks > 0 ? 4 : 0)}%` }} />
                                    </div>
                                );
                            })}
                        </div>
                        {/* Reference: population lower */}
                        <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-slate-400 dark:border-[#94A3B8] opacity-60 pointer-events-none" style={{ left: `${xPct(POP_LOWER)}%` }}>
                            <span className="absolute top-0 left-1 text-[8px] font-semibold text-slate-500 dark:text-[#94A3B8] whitespace-nowrap bg-white/80 dark:bg-[#132338]/80 px-0.5 rounded">Pop {POP_LOWER}</span>
                        </div>
                        {/* Reference: population upper */}
                        <div className="absolute top-0 bottom-0 w-px border-l border-dashed border-slate-400 dark:border-[#94A3B8] opacity-60 pointer-events-none" style={{ left: `${xPct(POP_UPPER)}%` }}>
                            <span className="absolute top-0 left-1 text-[8px] font-semibold text-slate-500 dark:text-[#94A3B8] whitespace-nowrap bg-white/80 dark:bg-[#132338]/80 px-0.5 rounded">Pop {POP_UPPER}</span>
                        </div>
                        {/* Personal lower */}
                        {t.isPersonalized && t.lowerThreshold > BIN_MIN && t.lowerThreshold < BIN_MAX && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-violet-500 opacity-80 pointer-events-none" style={{ left: `${xPct(t.lowerThreshold)}%` }}>
                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-violet-700 dark:text-violet-300 whitespace-nowrap bg-white/90 dark:bg-[#132338]/90 px-0.5 rounded">P-Low</span>
                            </div>
                        )}
                        {/* Personal upper */}
                        {t.isPersonalized && t.upperThreshold > BIN_MIN && t.upperThreshold < BIN_MAX && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-violet-500 opacity-90 pointer-events-none" style={{ left: `${xPct(t.upperThreshold)}%` }}>
                                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-violet-700 dark:text-violet-300 whitespace-nowrap bg-white/90 dark:bg-[#132338]/90 px-0.5 rounded">P-Up</span>
                            </div>
                        )}
                        {/* Current ACWR */}
                        {currentAcwr != null && currentAcwr > BIN_MIN && currentAcwr < BIN_MAX && (
                            <div className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-[#E2E8F0] opacity-90 pointer-events-none" style={{ left: `${xPct(currentAcwr)}%` }}>
                                <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-700 dark:text-[#E2E8F0] whitespace-nowrap bg-slate-100/90 dark:bg-[#1A2D48]/90 px-0.5 rounded">Now {currentAcwr}</span>
                            </div>
                        )}
                    </div>
                    {/* X-axis ticks + title — same left offset as bars area */}
                    <div className="absolute bottom-0 h-12 pt-1 left-[52px] right-0">
                        <div className="relative h-full">
                            {/* Tick values */}
                            {[0.5, 0.8, 1.0, 1.3, 1.5, 1.7, 2.0].map(v => (
                                <span key={v} className="absolute top-0 text-[9px] text-slate-400 dark:text-[#94A3B8] -translate-x-1/2" style={{ left: `${xPct(v)}%` }}>
                                    {v.toFixed(1)}
                                </span>
                            ))}
                            {/* X-axis title — full descriptor centred under the chart */}
                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] whitespace-nowrap">
                                Acute : Chronic Workload Ratio (ACWR)
                            </span>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] leading-relaxed mt-3 italic">
                    Each bar = days the athlete's ACWR sat in that 0.1 bin. <strong>Colour</strong> = event incidence (injury / wellness drop within the next 7 days). Personal upper threshold = the lowest bin ≥0.8 where event incidence exceeded 15% (Gabbett 2016 method). Dashed lines = population defaults; <span className="text-violet-600 dark:text-violet-300 font-semibold">violet lines</span> = this athlete's personalised thresholds; <strong>black line</strong> = current ACWR.
                </p>
            </div>
        );
    };

    return (
        <div data-tour="wellness-thresholds-overview" className="space-y-5">
            {/* Slim header — title + Personalised pill + Team/Athlete cascading filters + Explain.
                One row on lg+, wraps on narrow viewports. Replaces the original full-card header
                + standalone athlete dropdown + "no athlete selected" empty card. */}
            <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-2.5 shadow-sm flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-500/15 text-violet-500 dark:text-violet-300 flex items-center justify-center shrink-0">
                        <ShieldIcon size={14} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight truncate">Individualized Load Thresholds</h3>
                        {acwrOpts ? (
                            <div className="text-[10px] text-violet-600 dark:text-violet-300 truncate">
                                <span className="font-semibold">{ACWR_METRIC_TYPES[acwrOpts.metricType]?.label || acwrOpts.metricType || 'sRPE'}</span>
                                <span className="text-violet-500/70 dark:text-violet-400/70"> · A{acwrOpts.acuteN}/C{acwrOpts.chronicN}{acwrOpts.recalcAnchorDate ? ` · Baseline ${String(acwrOpts.recalcAnchorDate).slice(0, 10)}` : ''}</span>
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] truncate">Personal safe training bands from historical load, wellness, and injury data</p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Team filter — scopes the athlete dropdown */}
                    <CustomSelect
                        value={teamScope}
                        onChange={e => handleTeamScopeChange(e.target.value)}
                        variant="filter"
                        size="sm"
                        prefixIcon={<UsersIcon size={12} />}
                        placeholder="All Teams"
                        minWidth="150px"
                    >
                        <option value="">All Teams</option>
                        {teams.filter(t => t.players?.length).map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </CustomSelect>
                    {/* Athlete filter — scoped to the team above */}
                    <CustomSelect
                        value={selectedAthleteId}
                        onChange={e => setSelectedAthleteId(e.target.value)}
                        variant="filter"
                        size="sm"
                        prefixIcon={<UserIcon size={12} />}
                        placeholder={teamScope ? `Athlete in ${teams.find(t => t.id === teamScope)?.name ?? 'team'}` : 'Select athlete'}
                        minWidth="170px"
                    >
                        <option value="">{teamScope ? `Athlete in ${teams.find(t => t.id === teamScope)?.name ?? 'team'}` : 'Select athlete'}</option>
                        {scopedAthletes.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </CustomSelect>
                    {selectedAthleteId && (
                        <button
                            onClick={() => setSelectedAthleteId('')}
                            className="p-1.5 rounded-md text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors"
                            title="Clear athlete"
                        >
                            <XSmallIcon size={12} />
                        </button>
                    )}
                    <button
                        onClick={() => setExplainOpen(true)}
                        className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] hover:border-violet-300 dark:hover:border-violet-500/40 text-slate-600 dark:text-[#CBD5E1] rounded-md text-[11px] font-medium transition-all"
                        title="How this page works"
                    >
                        <BookOpenIcon size={12} /> Explain
                    </button>
                </div>
            </div>

            {/* Inline prompt when no athlete is selected — slim banner instead of full-page empty state */}
            {!selectedAthleteId && (
                <div className="bg-slate-50 dark:bg-[#0F1C30] border border-dashed border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 flex items-center gap-2.5">
                    <UserIcon size={14} className="text-slate-400 dark:text-[#475569] shrink-0" />
                    <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Pick a team and an athlete above to view their personalised load thresholds.</p>
                </div>
            )}

            {/* ACWR not enabled */}
            {selectedAthleteId && !acwrEnabled && (
                <div className="bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5 text-center">
                    <AlertTriangleIcon size={20} className="mx-auto text-amber-500 dark:text-amber-300 mb-2" />
                    <p className="text-sm text-amber-700 dark:text-amber-300">ACWR monitoring is not enabled for this athlete's team. Enable it in Settings → Feature Settings.</p>
                </div>
            )}

            {/* Results */}
            {thresholds && acwrEnabled && (
                <div className="space-y-3">

                    {/* Consolidated banner — Current ACWR + Personal Band + Population delta
                        + zone bar + confidence + footer note, all in one card. Replaces three
                        separate cards (Current status / Personal Zones / vs. Population Defaults)
                        with a single denser surface. The full-width zone bar at the bottom
                        keeps the spatial reading intact. */}
                    <div className={`rounded-xl border shadow-sm ${currentAcwr != null ? zoneBg(currentAcwr, thresholds) : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58]'}`}>
                        {/* Stat strip — Current / Personal Band / Population / Delta / Confidence */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 px-4 py-3">
                            {/* Current ACWR */}
                            <div className="flex flex-col">
                                <div className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Current ACWR</div>
                                {currentAcwr != null ? (
                                    <>
                                        <div className={`text-2xl font-bold leading-tight ${zoneColor(currentAcwr, thresholds)}`}>{currentAcwr}</div>
                                        <div className={`text-[10px] font-semibold mt-0.5 ${zoneColor(currentAcwr, thresholds)}`}>{zoneLabel(currentAcwr, thresholds)}</div>
                                    </>
                                ) : (
                                    <div className="text-sm text-slate-400 dark:text-[#94A3B8] italic mt-1">No live ratio</div>
                                )}
                            </div>
                            {/* Personal Band */}
                            <div className="flex flex-col">
                                <div className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Personal Band</div>
                                <div className="text-lg font-bold text-slate-800 dark:text-[#E2E8F0] leading-tight">{thresholds.lowerThreshold.toFixed(2)} — {thresholds.upperThreshold.toFixed(2)}</div>
                                <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">Sweet spot</div>
                            </div>
                            {/* Population reference */}
                            <div className="flex flex-col">
                                <div className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Population (Gabbett)</div>
                                <div className="text-lg font-bold text-slate-600 dark:text-[#94A3B8] leading-tight">{POP_LOWER.toFixed(1)} — {POP_UPPER.toFixed(1)}</div>
                                <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">Default reference</div>
                            </div>
                            {/* Delta */}
                            <div className="flex flex-col">
                                <div className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Δ Upper</div>
                                <div className={`text-lg font-bold leading-tight ${thresholds.upperThreshold > POP_UPPER ? 'text-emerald-600 dark:text-emerald-300' : thresholds.upperThreshold < POP_UPPER ? 'text-amber-600 dark:text-amber-300' : 'text-slate-600 dark:text-[#E2E8F0]'}`}>
                                    {thresholds.upperThreshold > POP_UPPER ? '+' : ''}{(thresholds.upperThreshold - POP_UPPER).toFixed(2)}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">
                                    {thresholds.upperThreshold > POP_UPPER ? 'Tolerates more' : thresholds.upperThreshold < POP_UPPER ? 'Tolerates less' : 'At population'}
                                </div>
                            </div>
                            {/* Confidence */}
                            <div className="flex flex-col">
                                <div className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Confidence</div>
                                <div className={`text-lg font-bold leading-tight uppercase ${
                                    thresholds.confidence === 'high' ? 'text-emerald-600 dark:text-emerald-300' :
                                    thresholds.confidence === 'moderate' ? 'text-amber-600 dark:text-amber-300' :
                                    'text-slate-500 dark:text-[#94A3B8]'
                                }`}>{thresholds.confidence}</div>
                                <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">{thresholds.weeksOfData} weeks · {thresholds.negativeEvents} event{thresholds.negativeEvents !== 1 ? 's' : ''}</div>
                            </div>
                        </div>

                        {/* Personal zone bar — runs across the full width below the stat strip */}
                        <div className="px-4 pb-3 pt-1 border-t border-white/40 dark:border-[#243A58]/60">
                            <div className="relative h-6 rounded-md overflow-hidden bg-slate-100/80 dark:bg-[#0F1C30]/80">
                                <div className="absolute h-full bg-sky-200 dark:bg-sky-500/40" style={{ left: 0, width: `${(thresholds.lowerThreshold / 2.0) * 100}%` }} />
                                <div className="absolute h-full bg-emerald-200 dark:bg-emerald-500/40" style={{ left: `${(thresholds.lowerThreshold / 2.0) * 100}%`, width: `${((thresholds.upperThreshold - thresholds.lowerThreshold) / 2.0) * 100}%` }} />
                                <div className="absolute h-full bg-amber-200 dark:bg-amber-500/40" style={{ left: `${(thresholds.upperThreshold / 2.0) * 100}%`, width: `${(0.2 / 2.0) * 100}%` }} />
                                <div className="absolute h-full bg-rose-200 dark:bg-rose-500/40" style={{ left: `${((thresholds.upperThreshold + 0.2) / 2.0) * 100}%`, right: 0 }} />
                                {/* Population defaults — dashed reference lines */}
                                <div className="absolute top-0 h-full w-px border-l border-dashed border-slate-500 dark:border-[#94A3B8] opacity-50" style={{ left: `${(POP_LOWER / 2.0) * 100}%` }} />
                                <div className="absolute top-0 h-full w-px border-l border-dashed border-slate-500 dark:border-[#94A3B8] opacity-50" style={{ left: `${(POP_UPPER / 2.0) * 100}%` }} />
                                {/* Current ACWR marker */}
                                {currentAcwr != null && (
                                    <div className="absolute top-0 h-full w-0.5 bg-slate-900 dark:bg-[#E2E8F0] z-10" style={{ left: `${Math.min(100, (currentAcwr / 2.0) * 100)}%` }}>
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-700 dark:text-[#E2E8F0] bg-white dark:bg-[#1A2D48] px-1 rounded shadow-sm whitespace-nowrap">{currentAcwr}</div>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-500 dark:text-[#CBD5E1] mt-1">
                                <span>0</span>
                                <span>{thresholds.lowerThreshold.toFixed(1)}</span>
                                <span>{thresholds.upperThreshold.toFixed(1)}</span>
                                <span>2.0</span>
                            </div>
                            <div className="flex flex-wrap gap-2.5 text-[9px] mt-2 text-slate-600 dark:text-[#CBD5E1]">
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-400" /> Underexposed</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Sweet Spot</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" /> Approaching Limit</span>
                                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400" /> Above Threshold</span>
                                <span className="ml-auto italic text-slate-500 dark:text-[#94A3B8]">Dashed lines = population defaults (0.8 / 1.3)</span>
                            </div>
                            {!thresholds.isPersonalized && (
                                <p className="text-[10px] text-slate-500 dark:text-[#94A3B8] mt-2 italic">
                                    Using population defaults. {thresholds.weeksOfData < 8 ? `Need ${8 - thresholds.weeksOfData} more weeks of data for personalisation.` : 'No negative events detected yet — thresholds will personalise as data accumulates.'}
                                </p>
                            )}
                            {thresholds.isPersonalized && thresholds.upperThreshold > POP_UPPER && (
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-2 italic">Tolerates higher loads than the population average — indicative of a well-conditioned training base (Blanch &amp; Gabbett 2016).</p>
                            )}
                            {thresholds.isPersonalized && thresholds.upperThreshold < POP_UPPER && (
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-2 italic">Personal threshold is below population — athlete may be more susceptible to load spikes. Use conservative progression.</p>
                            )}
                        </div>
                    </div>

                    {/* Derivation panel — visualises how the personal upper threshold was set.
                        See plans/PI-SPORT-AWARE-THRESHOLDS.md for follow-ups (ACWR-over-time
                        with event markers, contributing-event drilldown, etc.). */}
                    {renderDerivationChart(thresholds)}
                </div>
            )}

            {/* ── Explain modal — how this page works ── */}
            {explainOpen && (
                <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4" onClick={() => setExplainOpen(false)}>
                    <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58] shrink-0 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">How Individualized Load Thresholds work</h3>
                                <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">A walkthrough of the algorithm, the data feeds, and how to read the output.</p>
                            </div>
                            <button onClick={() => setExplainOpen(false)} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                                <XIcon size={16} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-3">

                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldIcon size={14} className="text-violet-500 dark:text-violet-300" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">What this page does</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Builds a <strong>personal ACWR safe zone</strong> for each athlete instead of using the universal 0.8 – 1.3 sweet spot from Gabbett 2016. Some athletes tolerate higher ACWRs without breaking down (Hulin 2016 — high chronic load is protective); others get flagged in the danger zone before they ever reach 1.5. This page learns each athlete's own breaking point from their history of load, wellness drops, and injuries — then shows you the range they actually tolerate.
                                </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ActivityIcon size={14} className="text-violet-500 dark:text-violet-300" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Data feeds</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    <strong>Load</strong> comes from the <strong>ACWR Hub</strong> entries logged for this athlete. The series is filtered to the team's primary ACWR metric (sRPE, Sprint Distance, Tonnage, Duration, TRIMP, PlayerLoad — whichever model the team uses) and built with the same EWMA, rest-day freezing, and return-from-injury anchor as the ACWR Hub line chart. <strong>Wellness</strong> comes from the daily wellness questionnaire (sleep_quality, fatigue, soreness, stress) and gets composited into a 0-10 score using the PI engine's 4-domain weighting. <strong>Injuries</strong> come from the Injury Reports system — the algorithm reads when the injury actually happened (<code>dateOfInjury</code>), not when the report was filed.
                                </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <GaugeIcon size={14} className="text-violet-500 dark:text-violet-300" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">The algorithm (6 steps)</h4>
                                </div>
                                <ol className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed list-decimal pl-4 space-y-1">
                                    <li><strong>Build a daily ACWR series</strong> using EWMA — same Williams 2017 method as the rest of the platform.</li>
                                    <li><strong>Define negative events</strong> — actual injuries, plus sustained wellness drops (composite below this athlete's own mean - 1.5 SD for 3+ consecutive days). Personalised baseline, not a fixed cut-off.</li>
                                    <li><strong>Bin the ACWR history</strong> at 0.1 increments. For each day, look ahead 7 days — if a negative event happened, mark that bin as an "event week."</li>
                                    <li><strong>Find the personal upper threshold</strong> — scan bins ascending from 0.8. First bin where event incidence &gt; 15% (with ≥3 weeks of data in that bin) becomes the personal upper limit. If no bin crosses 15%, the athlete tolerates everything observed — use max observed + buffer, capped at 2.0.</li>
                                    <li><strong>Find the personal lower threshold</strong> — scan bins descending from 0.8. First bin where event incidence &gt; 10% suggests under-exposure is a problem for this athlete (detraining injuries / return-to-play risk).</li>
                                    <li><strong>Rate the confidence</strong> based on how much data you have — see next section.</li>
                                </ol>
                            </div>

                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUpIcon size={14} className="text-violet-500 dark:text-violet-300" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Confidence levels</h4>
                                </div>
                                <ul className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed list-disc pl-4 space-y-1">
                                    <li><strong>High</strong> — ≥16 weeks of data AND ≥3 negative events. Personal zones are well-supported.</li>
                                    <li><strong>Moderate</strong> — ≥8 weeks. Personal zones are emerging but a single new event can shift them.</li>
                                    <li><strong>Low</strong> — &lt;8 weeks. Not enough history yet. The page falls back to the population defaults (Gabbett 0.8 / 1.3 / 1.5) and keeps collecting.</li>
                                </ul>
                            </div>

                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <HeartPulseIcon size={14} className="text-violet-500 dark:text-violet-300" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Per-team ACWR model</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    The pill in the header tells you <strong>which ACWR model</strong> the personal threshold was built on — sRPE for most teams; Sprint Distance for football / rugby / AFL on GPS; Tonnage for lifting; TRIMP / Total Distance / Duration / PlayerLoad for the rest. The threshold engine filters load records to the team's primary model only — no mixed-unit summing, no contamination. If the team's ACWR model is changed later, this page automatically rebuilds against the new model on the next load.
                                </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-[#0F1C30] rounded-xl border border-slate-200 dark:border-[#243A58] p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <BrainIcon size={14} className="text-violet-500 dark:text-violet-300" />
                                    <h4 className="text-[12px] font-bold text-slate-800 dark:text-[#E2E8F0] uppercase tracking-wide">Sources</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    Gabbett T., 2016, <em>BJSM</em> — population ACWR zones. Blanch &amp; Gabbett, 2016, <em>BJSM</em> — protective high chronic workload. Hulin B. et al., 2016, <em>BJSM</em> — high chronic load increases tolerance. Windt &amp; Gabbett, 2017, <em>BJSM</em> — individual variation requires personalised thresholds. Impellizzeri F. et al., 2019 — ACWR mathematical coupling critique → EWMA preferred. Williams S. et al., 2017, <em>BJSM</em> — EWMA λ = 2/(N+1) method.
                                </p>
                            </div>

                            <div className="bg-violet-50 dark:bg-violet-500/10 rounded-xl border border-violet-200 dark:border-violet-500/30 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TargetIcon size={14} className="text-violet-600 dark:text-violet-300" />
                                    <h4 className="text-[12px] font-bold text-violet-700 dark:text-violet-200 uppercase tracking-wide">How to use the output</h4>
                                </div>
                                <p className="text-[11px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                                    The <strong>Personal Band</strong> in the top tile is what to work to — keep the athlete inside it. The <strong>visualization bar</strong> places their current ACWR (solid marker) against their personal zones (coloured) and the population defaults (dashed lines) so you can see if "they're at 1.4" is actually a problem for THIS athlete. The <strong>vs. Population Defaults</strong> row tells you whether the personal upper is above or below 1.3 — a higher personal upper means the athlete tolerates more; a lower one means they break down sooner than the average athlete and need a tighter cap.
                                </p>
                            </div>

                        </div>
                        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#243A58] shrink-0 flex justify-end bg-slate-50/50 dark:bg-[#0F1C30]/40">
                            <button onClick={() => setExplainOpen(false)} className="px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-colors">
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndividualizedThresholds;
