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
import {
    ShieldIcon, GaugeIcon, AlertTriangleIcon, InfoIcon,
    TrendingUpIcon, ActivityIcon, UserIcon,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// Threshold calculation engine
// ═══════════════════════════════════════════════════════════════════════

interface ThresholdResult {
    lowerThreshold: number;   // below this = undertrained
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
 * Calculate individualized ACWR thresholds for an athlete.
 *
 * @param dailyLoads - Array of { date, value } sorted chronologically
 * @param wellnessScores - Array of { date, composite } where composite is 0-10
 * @param injuryDates - Array of ISO date strings when injuries occurred
 * @param acuteN - Acute window (default 7)
 * @param chronicN - Chronic window (default 28)
 */
export function calculatePersonalThresholds(
    dailyLoads: { date: string; value: number }[],
    wellnessScores: { date: string; composite: number }[],
    injuryDates: string[],
    acuteN = 7,
    chronicN = 28
): ThresholdResult {
    if (dailyLoads.length < 14) {
        return { lowerThreshold: POP_LOWER, upperThreshold: POP_UPPER, confidence: 'low', weeksOfData: 0, negativeEvents: 0, binData: [], isPersonalized: false };
    }

    // Build daily ACWR series using EWMA
    const lambdaA = 2 / (acuteN + 1);
    const lambdaC = 2 / (chronicN + 1);
    let acute = dailyLoads[0]?.value || 0;
    let chronic = acute;
    const acwrSeries: { date: string; acwr: number }[] = [];

    for (const day of dailyLoads) {
        acute = day.value * lambdaA + acute * (1 - lambdaA);
        chronic = day.value * lambdaC + chronic * (1 - lambdaC);
        if (chronic > 0) {
            acwrSeries.push({ date: day.date, acwr: acute / chronic });
        }
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

    const weeksOfData = Math.floor(dailyLoads.length / 7);
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
        teams, loadRecords, wellnessData, injuryReports, acwrSettings,
        calculateACWR, getAthleteAcwrOptions,
    } = useAppState();

    const [selectedAthleteId, setSelectedAthleteId] = useState('');
    const allAthletes = useMemo(() => teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamId: t.id, teamName: t.name }))), [teams]);

    const selectedAthlete = allAthletes.find(a => a.id === selectedAthleteId);
    const playerTeam = selectedAthlete ? teams.find(t => t.id === selectedAthlete.teamId) : null;
    const teamId = playerTeam?.id;
    const acwrEnabled = teamId && (teamId === 't_private'
        ? acwrSettings[`ind_${selectedAthleteId}`]?.enabled
        : acwrSettings[teamId]?.enabled);

    // Compute thresholds for selected athlete
    const thresholds = useMemo(() => {
        if (!selectedAthleteId || !acwrEnabled) return null;

        const opts = getAthleteAcwrOptions(selectedAthleteId);

        // Build daily load series
        const athleteLoads = (loadRecords || [])
            .filter(l => (l.athleteId === selectedAthleteId || l.athlete_id === selectedAthleteId))
            .map(l => ({ date: (l.date || '').split('T')[0], value: l.value || l.sRPE || 0 }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Build wellness series (composite = average of available scores)
        const athleteWellness = (wellnessData || [])
            .filter(w => w.athleteId === selectedAthleteId || w.athlete_id === selectedAthleteId)
            .map(w => {
                const r = w.responses || {};
                const vals = Object.values(r).filter(v => typeof v === 'number');
                return { date: (w.date || w.session_date || '').split('T')[0], composite: vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 5 };
            })
            .sort((a, b) => a.date.localeCompare(b.date));

        // Injury dates
        const injuryDates = (injuryReports || [])
            .filter(r => r.athleteId === selectedAthleteId || r.athlete_id === selectedAthleteId)
            .map(r => r.date || r.created_at || '')
            .filter(Boolean);

        return calculatePersonalThresholds(athleteLoads, athleteWellness, injuryDates, opts.acuteN, opts.chronicN);
    }, [selectedAthleteId, loadRecords, wellnessData, injuryReports, acwrEnabled]);

    // Current ACWR
    let currentAcwr = null;
    try { if (acwrEnabled) currentAcwr = calculateACWR(selectedAthleteId); } catch {}

    const zoneColor = (acwr: number, t: ThresholdResult) => {
        if (acwr < t.lowerThreshold) return 'text-sky-600';
        if (acwr <= t.upperThreshold) return 'text-emerald-600';
        if (acwr <= t.upperThreshold + 0.2) return 'text-amber-600';
        return 'text-rose-600';
    };

    const zoneBg = (acwr: number, t: ThresholdResult) => {
        if (acwr < t.lowerThreshold) return 'bg-sky-50 border-sky-200';
        if (acwr <= t.upperThreshold) return 'bg-emerald-50 border-emerald-200';
        if (acwr <= t.upperThreshold + 0.2) return 'bg-amber-50 border-amber-200';
        return 'bg-rose-50 border-rose-200';
    };

    const zoneLabel = (acwr: number, t: ThresholdResult) => {
        if (acwr < t.lowerThreshold) return 'Undertrained';
        if (acwr <= t.upperThreshold) return 'Personal Sweet Spot';
        if (acwr <= t.upperThreshold + 0.2) return 'Approaching Limit';
        return 'Above Personal Threshold';
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-500 flex items-center justify-center">
                        <ShieldIcon size={18} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Individualized Load Thresholds</h3>
                        <p className="text-[10px] text-slate-400">Personal safe training bands based on historical load, wellness, and injury data</p>
                    </div>
                </div>

                <select
                    value={selectedAthleteId}
                    onChange={e => setSelectedAthleteId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-300"
                >
                    <option value="">Select an athlete...</option>
                    {teams.filter(t => t.players?.length).map(t => (
                        <optgroup key={t.id} label={t.name}>
                            {(t.players || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </optgroup>
                    ))}
                </select>
            </div>

            {/* No athlete selected */}
            {!selectedAthleteId && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                    <UserIcon size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">Select an athlete to view their personalized load thresholds</p>
                </div>
            )}

            {/* ACWR not enabled */}
            {selectedAthleteId && !acwrEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                    <AlertTriangleIcon size={20} className="mx-auto text-amber-500 mb-2" />
                    <p className="text-sm text-amber-700">ACWR monitoring is not enabled for this athlete's team. Enable it in Settings → Feature Settings.</p>
                </div>
            )}

            {/* Results */}
            {thresholds && acwrEnabled && (
                <div className="space-y-4">
                    {/* Current status */}
                    {currentAcwr != null && (
                        <div className={`rounded-xl border p-5 ${zoneBg(currentAcwr, thresholds)}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Current ACWR</div>
                                    <div className={`text-3xl font-bold ${zoneColor(currentAcwr, thresholds)}`}>{currentAcwr}</div>
                                    <div className={`text-xs font-semibold mt-1 ${zoneColor(currentAcwr, thresholds)}`}>{zoneLabel(currentAcwr, thresholds)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Personal Band</div>
                                    <div className="text-lg font-bold text-slate-700">{thresholds.lowerThreshold.toFixed(1)} — {thresholds.upperThreshold.toFixed(1)}</div>
                                    <div className={`text-[10px] font-semibold uppercase mt-1 ${
                                        thresholds.confidence === 'high' ? 'text-emerald-600' : thresholds.confidence === 'moderate' ? 'text-amber-600' : 'text-slate-400'
                                    }`}>
                                        Confidence: {thresholds.confidence}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Threshold visualization bar */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">Personal ACWR Zones</div>
                        <div className="relative h-8 rounded-full overflow-hidden bg-slate-100 mb-2">
                            {/* Undertrained zone */}
                            <div className="absolute h-full bg-sky-200" style={{ left: 0, width: `${(thresholds.lowerThreshold / 2.0) * 100}%` }} />
                            {/* Sweet spot */}
                            <div className="absolute h-full bg-emerald-200" style={{ left: `${(thresholds.lowerThreshold / 2.0) * 100}%`, width: `${((thresholds.upperThreshold - thresholds.lowerThreshold) / 2.0) * 100}%` }} />
                            {/* Caution zone */}
                            <div className="absolute h-full bg-amber-200" style={{ left: `${(thresholds.upperThreshold / 2.0) * 100}%`, width: `${(0.2 / 2.0) * 100}%` }} />
                            {/* Danger zone */}
                            <div className="absolute h-full bg-rose-200" style={{ left: `${((thresholds.upperThreshold + 0.2) / 2.0) * 100}%`, right: 0 }} />
                            {/* Current marker */}
                            {currentAcwr != null && (
                                <div className="absolute top-0 h-full w-0.5 bg-slate-900 z-10" style={{ left: `${Math.min(100, (currentAcwr / 2.0) * 100)}%` }}>
                                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-slate-700 bg-white px-1 rounded shadow-sm">{currentAcwr}</div>
                                </div>
                            )}
                            {/* Population default markers (dashed) */}
                            <div className="absolute top-0 h-full w-px border-l border-dashed border-slate-400 opacity-40" style={{ left: `${(POP_LOWER / 2.0) * 100}%` }} />
                            <div className="absolute top-0 h-full w-px border-l border-dashed border-slate-400 opacity-40" style={{ left: `${(POP_UPPER / 2.0) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-400">
                            <span>0</span>
                            <span>{thresholds.lowerThreshold.toFixed(1)}</span>
                            <span>{thresholds.upperThreshold.toFixed(1)}</span>
                            <span>2.0</span>
                        </div>
                        {thresholds.isPersonalized && (
                            <p className="text-[10px] text-slate-400 mt-2 italic">
                                Dashed lines show population defaults (0.8–1.3). Solid zones are personalized from {thresholds.weeksOfData} weeks of data and {thresholds.negativeEvents} negative event{thresholds.negativeEvents !== 1 ? 's' : ''}.
                            </p>
                        )}
                        {!thresholds.isPersonalized && (
                            <p className="text-[10px] text-slate-400 mt-2 italic">
                                Using population defaults. {thresholds.weeksOfData < 8 ? `Need ${8 - thresholds.weeksOfData} more weeks of data for personalization.` : 'No negative events detected yet — thresholds will personalize as data accumulates.'}
                            </p>
                        )}
                    </div>

                    {/* Comparison to population */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">vs. Population Defaults</div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-50 rounded-lg p-3 text-center">
                                <div className="text-[9px] text-slate-400 mb-1">Population Upper</div>
                                <div className="text-lg font-bold text-slate-600">{POP_UPPER}</div>
                            </div>
                            <div className="bg-violet-50 rounded-lg p-3 text-center border border-violet-200">
                                <div className="text-[9px] text-violet-500 mb-1">Personal Upper</div>
                                <div className="text-lg font-bold text-violet-700">{thresholds.upperThreshold.toFixed(2)}</div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 text-center">
                                <div className="text-[9px] text-slate-400 mb-1">Difference</div>
                                <div className={`text-lg font-bold ${thresholds.upperThreshold > POP_UPPER ? 'text-emerald-600' : thresholds.upperThreshold < POP_UPPER ? 'text-amber-600' : 'text-slate-600'}`}>
                                    {thresholds.upperThreshold > POP_UPPER ? '+' : ''}{(thresholds.upperThreshold - POP_UPPER).toFixed(2)}
                                </div>
                            </div>
                        </div>
                        {thresholds.upperThreshold > POP_UPPER && (
                            <p className="text-xs text-emerald-600 mt-3">This athlete tolerates higher loads than the population average — indicative of a well-conditioned training base (Blanch & Gabbett, 2016).</p>
                        )}
                        {thresholds.upperThreshold < POP_UPPER && thresholds.isPersonalized && (
                            <p className="text-xs text-amber-600 mt-3">This athlete's threshold is below the population average — they may be more susceptible to load spikes. Consider conservative load progression.</p>
                        )}
                    </div>

                    {/* Data summary */}
                    <div className="bg-slate-800 text-white rounded-xl p-5">
                        <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide mb-2">Methodology</div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Personal thresholds are calculated from {thresholds.weeksOfData} weeks of load data, wellness responses, and injury records.
                            Negative events (injuries or sustained wellness drops ≥3 days below personal mean - 1.5 SD) are mapped against ACWR bins.
                            The upper threshold is the ACWR where negative event incidence exceeds 15%.
                            {thresholds.confidence === 'low' && ' Insufficient data for personalization — using population defaults (Gabbett, 2016).'}
                            {thresholds.confidence === 'moderate' && ' Moderate confidence — threshold is emerging but may shift as more data accumulates.'}
                            {thresholds.confidence === 'high' && ' High confidence — ≥16 weeks of data with ≥3 negative events provide reliable personalization.'}
                        </p>
                        <div className="flex flex-wrap gap-3 text-[10px] mt-3">
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /> Undertrained</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> Personal Sweet Spot</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> Approaching Limit</span>
                            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400" /> Above Threshold</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IndividualizedThresholds;
