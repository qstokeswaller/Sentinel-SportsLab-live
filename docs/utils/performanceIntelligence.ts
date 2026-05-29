// @ts-nocheck
/**
 * Performance Intelligence Engine
 *
 * Discovery Layer  → scans what data exists for an athlete
 * Insight Engine   → runs independent rules that fire only when relevant data exists
 * Readiness Score  → weighted composite of available domains
 *
 * Design principles:
 * - Rules check DATA AVAILABILITY, not sport codes
 * - Missing data = rule silently skips (never errors, never shows "no data")
 * - Readiness score redistributes weight when domains are missing
 * - All thresholds are research-backed (sources in ANALYTICS-EVOLUTION.md)
 */

import { ACWR_UTILS, ACWR_METRIC_TYPES } from './constants';

// ── Sport-aware testing thresholds ──────────────────────────────────────────
// In-season pro soccer realistically tests 2-4× per year; treating that as
// "stale" data pathologises healthy cadence. Buckets below come from
// `plans/PI-SPORT-AWARE-THRESHOLDS.md` (McGuigan 2017, Cormack 2008,
// Claudino 2017, Coutts 2017). CMJ + Nordic carve-outs override the bucket
// because they're cheap/repeatable (CMJ) or injury-risk-windowed (Nordic).

export type SportBucket = 'high_density_team' | 'mid_density_team' | 'individual' | 'combat' | 'default';

export interface SportThresholds {
    bucket: SportBucket;
    bucketLabel: string;
    sport: string | null;
    decayStart: number;        // tests older than this start losing confidence in Performance Trend
    excludeAfter: number;      // tests older than this drop out of Performance Trend entirely
    retestAfter: number;       // generic re-test recommendation (Re-Test Due rule)
    staleness: { strength: number; power: number; injury_screen: number; speed: number; aerobic: number; anthropometry: number; other: number };
    typeOverrides: Record<string, { decayStart: number; excludeAfter: number; retestAfter: number }>;
}

const SPORT_BUCKET_DEFS: Record<SportBucket, Omit<SportThresholds, 'bucket' | 'bucketLabel' | 'sport' | 'typeOverrides'> & { label: string }> = {
    high_density_team: {
        label: 'High-density team sport',
        decayStart: 120, excludeAfter: 270, retestAfter: 180,
        staleness: { strength: 180, power: 120, injury_screen: 120, speed: 150, aerobic: 180, anthropometry: 180, other: 180 },
    },
    mid_density_team: {
        label: 'Mid-density team sport',
        decayStart: 90, excludeAfter: 210, retestAfter: 120,
        staleness: { strength: 120, power: 90, injury_screen: 90, speed: 120, aerobic: 120, anthropometry: 120, other: 120 },
    },
    individual: {
        label: 'Individual / training-dominant',
        decayStart: 45, excludeAfter: 120, retestAfter: 60,
        staleness: { strength: 60, power: 45, injury_screen: 60, speed: 60, aerobic: 60, anthropometry: 60, other: 60 },
    },
    combat: {
        label: 'Combat / camp-based',
        decayStart: 60, excludeAfter: 240, retestAfter: 90,
        staleness: { strength: 90, power: 60, injury_screen: 90, speed: 90, aerobic: 90, anthropometry: 90, other: 90 },
    },
    default: {
        label: 'Default (unknown sport)',
        decayStart: 90, excludeAfter: 210, retestAfter: 120,
        staleness: { strength: 90, power: 90, injury_screen: 90, speed: 90, aerobic: 90, anthropometry: 90, other: 90 },
    },
};

// Universal test-type overrides — apply regardless of sport bucket
const TEST_TYPE_OVERRIDES: SportThresholds['typeOverrides'] = {
    cmj:       { decayStart: 21, excludeAfter: 60,  retestAfter: 21 }, // Claudino 2017 CMJ review
    dsi:       { decayStart: 21, excludeAfter: 60,  retestAfter: 21 },
    rsi:       { decayStart: 21, excludeAfter: 60,  retestAfter: 21 },
    sj:        { decayStart: 21, excludeAfter: 60,  retestAfter: 21 },
    nordic:    { decayStart: 42, excludeAfter: 120, retestAfter: 42 }, // Opar 2015 / Bourne 2018 hamstring window
    hamstring: { decayStart: 42, excludeAfter: 120, retestAfter: 42 },
};

const SPORT_TO_BUCKET: Record<string, SportBucket> = {
    // High-density team
    'soccer': 'high_density_team',
    'football': 'high_density_team',
    'association football': 'high_density_team',
    'basketball': 'high_density_team',
    'ice hockey': 'high_density_team',
    'hockey': 'high_density_team',
    'afl': 'high_density_team',
    'australian rules': 'high_density_team',
    'cricket': 'high_density_team',
    'american football': 'high_density_team',
    'nfl': 'high_density_team',
    // Mid-density team
    'rugby': 'mid_density_team',
    'rugby union': 'mid_density_team',
    'rugby league': 'mid_density_team',
    'college football': 'mid_density_team',
    // Individual / training-dominant
    'athletics': 'individual',
    'track': 'individual',
    'track and field': 'individual',
    'swimming': 'individual',
    'cycling': 'individual',
    'olympic lifting': 'individual',
    'olympic weightlifting': 'individual',
    'powerlifting': 'individual',
    'triathlon': 'individual',
    'rowing': 'individual',
    'personal training': 'individual',
    // Combat
    'mma': 'combat',
    'boxing': 'combat',
    'martial arts': 'combat',
    'combat sports': 'combat',
};

export function getSportThresholds(sport: string | null | undefined): SportThresholds {
    const norm = (sport || '').trim().toLowerCase();
    const bucket: SportBucket = SPORT_TO_BUCKET[norm] || 'default';
    const def = SPORT_BUCKET_DEFS[bucket];
    return {
        bucket,
        bucketLabel: def.label,
        sport: sport || null,
        decayStart: def.decayStart,
        excludeAfter: def.excludeAfter,
        retestAfter: def.retestAfter,
        staleness: def.staleness,
        typeOverrides: TEST_TYPE_OVERRIDES,
    };
}

// Resolve effective decay/exclude/retest for a specific test type. Universal
// type overrides (CMJ, Nordic) win over the sport bucket.
export function getEffectiveTestThresholds(thresholds: SportThresholds, testType: string) {
    const override = thresholds.typeOverrides[testType];
    if (override) return override;
    return {
        decayStart: thresholds.decayStart,
        excludeAfter: thresholds.excludeAfter,
        retestAfter: thresholds.retestAfter,
    };
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Insight {
    id: string;
    category: 'Risk' | 'Performance' | 'Opportunity' | 'Recovery';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    message: string;
    recommendation: string;
    dataSource: string;
    confidence: string;
}

export interface DataProfile {
    athleteId: string;
    athleteName: string;
    // Load domain
    hasLoadData: boolean;
    loadDays: number;
    loadMetricType: string;
    acwrResult: any | null;
    acwrRatio: number;
    monotony: number;
    strain: number;
    // Wellness domain
    hasWellnessData: boolean;
    wellnessDays: number;
    latestWellness: any | null;
    avgSleep3d: number;
    avgEnergy3d: number;
    avgSoreness3d: number;
    avgStress3d: number;
    // Assessment domains
    assessmentsByType: Record<string, { count: number; latest: any; previous: any | null; latestDate: string; daysSinceLatest: number }>;
    testCategories: string[];
    // Break detection
    breakDetected: boolean;
    daysSinceBreak: number;
    // Multi-metric ACWR (if team has multiple models)
    additionalAcwrModels: { metricType: string; ratio: number; status: string }[];
    // Sport-aware staleness thresholds resolved from the athlete's team sport
    sportThresholds: SportThresholds;
}

export interface ReadinessScore {
    overall: number;          // 0-100
    status: 'green' | 'amber' | 'red';
    confidence: 'high' | 'moderate' | 'limited';
    domainsUsed: number;
    domainsTotal: number;
    domains: {
        name: string;
        score: number;
        weight: number;
        available: boolean;
        reason: string;
    }[];
}

// ── Discovery Layer ──────────────────────────────────────────────────────────

export function buildAthleteDataProfile(
    athleteId: string,
    athleteName: string,
    loadRecords: any[],
    habitRecords: any[],
    assessments: any[],
    acwrSettings: Record<string, any>,
    teams: any[],
    /** As-of date (YYYY-MM-DD). All rolling windows anchor to this date.
     *  Records dated after this point are filtered out so analysis runs
     *  exactly as it would have on the chosen date. Defaults to today. */
    asOfDate?: string,
): DataProfile {
    const now = asOfDate ? new Date(asOfDate + 'T23:59:59') : new Date();
    const today = (asOfDate || now.toISOString().split('T')[0]).slice(0, 10);
    const onOrBefore = (iso: string | null | undefined) => {
        if (!iso) return false;
        return iso.slice(0, 10) <= today;
    };

    // ── Load domain ──
    const athleteLoads = (loadRecords || []).filter(r =>
        (r.athleteId === athleteId || r.athlete_id === athleteId) && onOrBefore(r.date)
    );
    const hasLoadData = athleteLoads.length >= 7;
    const loadDays = new Set(athleteLoads.map(r => (r.date || '').split('T')[0])).size;

    // Resolve ACWR settings
    const playerTeam = teams.find(t => (t.players || []).some(p => p.id === athleteId));
    const teamId = playerTeam?.id;
    const settings = (teamId === 't_private')
        ? (acwrSettings[`ind_${athleteId}`] || {})
        : (acwrSettings[teamId] || {});
    const loadMetricType = settings.method || 'srpe';
    const acuteN = settings.acuteWindow || 7;
    const chronicN = settings.chronicWindow || 28;
    const freezeRestDays = settings.freezeRestDays !== false;

    // Filter the raw loadRecords array (not just athleteLoads) to as-of so ACWR
    // sees the right history.
    const loadRecordsAsOf = (loadRecords || []).filter(r => onOrBefore(r.date));
    let acwrResult = null;
    let acwrRatio = 0;
    if (hasLoadData) {
        acwrResult = ACWR_UTILS.calculateAthleteACWR(loadRecordsAsOf, athleteId, {
            metricType: loadMetricType !== 'srpe' ? loadMetricType : undefined,
            acuteN, chronicN, freezeRestDays,
        });
        acwrRatio = acwrResult?.ratio || 0;
    }

    // Monotony & strain (simple 7-day calculation)
    let monotony = 0;
    let strain = 0;
    if (hasLoadData) {
        const last7 = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            const daySum = athleteLoads
                .filter(l => (l.date || '').split('T')[0] === ds)
                .reduce((acc, l) => acc + (Number(l.value) || Number(l.sRPE) || 0), 0);
            last7.push(daySum);
        }
        const mean = last7.reduce((a, b) => a + b, 0) / 7;
        if (mean > 0) {
            const variance = last7.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / 7;
            const stdDev = Math.sqrt(variance);
            monotony = stdDev > 0 ? parseFloat((mean / stdDev).toFixed(2)) : 0;
            strain = parseFloat((last7.reduce((a, b) => a + b, 0) * (monotony || 1)).toFixed(0));
        }
    }

    // Break detection: >14 consecutive days with zero load
    let breakDetected = false;
    let daysSinceBreak = 999; // days since the break ENDED (training resumed)
    if (loadDays > 0) {
        const loadDates = new Set(athleteLoads.map(r => (r.date || '').split('T')[0]));
        let gapCount = 0;
        for (let i = 1; i <= 90; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!loadDates.has(ds)) {
                gapCount++;
            } else {
                if (gapCount >= 14) {
                    breakDetected = true;
                    // i is the day we found load data again (break ended i days ago, gap was above it)
                    daysSinceBreak = i - 1; // the last no-data day = when break ended
                    break; // only care about the most recent break
                }
                gapCount = 0;
            }
        }
        // If we're still in a gap at the 90-day boundary
        if (!breakDetected && gapCount >= 14) { breakDetected = true; daysSinceBreak = 0; } // still on break
    }

    // ── Wellness domain ──
    // habitRecords here is now the live `wellnessResponses` array (legacy param name
    // kept for back-compat). Records use `session_date` (not `date`) and nest the
    // questionnaire fields under `responses` for FIFA-style forms. The accessors
    // below check both top-level and nested locations so both shapes work.
    const wellnessDateOf = (r: any) => r?.session_date || r?.date || '';
    const wellnessField = (r: any, key: string) => {
        const v = r?.responses?.[key];
        if (typeof v === 'number') return v;
        const top = r?.[key];
        return typeof top === 'number' ? top : null;
    };
    const athleteWellness = (habitRecords || []).filter(r =>
        (r.athleteId === athleteId || r.athlete_id === athleteId) && onOrBefore(wellnessDateOf(r))
    );
    const sortedWellness = [...athleteWellness].sort((a, b) =>
        new Date(wellnessDateOf(b)).getTime() - new Date(wellnessDateOf(a)).getTime()
    );
    const hasWellnessData = sortedWellness.length > 0 &&
        daysBetween(wellnessDateOf(sortedWellness[0]), today) <= 7;
    const wellnessDays = sortedWellness.length;
    const latestWellness = sortedWellness[0] || null;

    // 3-day rolling averages — map questionnaire fields to PI's domain shape.
    // sleep_quality → sleep score; fatigue (inverse) → energy; soreness/stress unchanged.
    const recent3 = sortedWellness.slice(0, 3);
    const avgRecent = (key: string, invert = false) => {
        const vals = recent3
            .map(r => wellnessField(r, key))
            .filter(v => typeof v === 'number') as number[];
        if (vals.length === 0) return 0;
        const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
        return invert ? Math.max(0, 10 - mean) : mean;
    };
    const avgSleep3d    = avgRecent('sleep_quality');        // 1-10, higher = better
    const avgEnergy3d   = avgRecent('fatigue', /*invert*/ true); // fatigue inverse → energy
    const avgSoreness3d = avgRecent('soreness');             // 1-10, higher = worse
    const avgStress3d   = avgRecent('stress');               // 1-10, higher = worse

    // ── Assessment domains ──
    const athleteAssessments = (assessments || []).filter(a =>
        (a.athlete_id === athleteId || a.athleteId === athleteId) && onOrBefore(a.date)
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    const assessmentsByType: DataProfile['assessmentsByType'] = {};
    const seenTypes = new Set();
    for (const a of athleteAssessments) {
        const type = a.test_type;
        if (!seenTypes.has(type)) {
            seenTypes.add(type);
            const allOfType = athleteAssessments.filter(x => x.test_type === type);
            assessmentsByType[type] = {
                count: allOfType.length,
                latest: allOfType[0],
                previous: allOfType.length > 1 ? allOfType[1] : null,
                latestDate: allOfType[0]?.date || '',
                daysSinceLatest: daysBetween(allOfType[0]?.date, today),
            };
        }
    }

    // Determine test categories present
    const categoryMap = {
        'rm_back_squat': 'strength', 'rm_bench_press': 'strength', 'rm_deadlift': 'strength',
        'rm_front_squat': 'strength', 'rm_ohp': 'strength', '1rm': 'strength',
        'dsi': 'power', 'rsi': 'power', 'cmj': 'power', 'sj': 'power', 'drop_jump': 'power',
        'nordic': 'injury_screen', 'hamstring': 'injury_screen', 'fms_total': 'injury_screen',
        'y_balance': 'injury_screen',
        'sprint_10m': 'speed', 'sprint_20m': 'speed', 'sprint_40m': 'speed',
        'yo_yo': 'aerobic', 'beep_test': 'aerobic', 'vo2max': 'aerobic',
        'body_comp': 'anthropometry', 'skinfolds': 'anthropometry',
    };
    const testCategories = [...new Set(Object.keys(assessmentsByType).map(t => categoryMap[t] || 'other'))];

    // ── Additional ACWR models ──
    const additionalAcwrModels = [];
    if (hasLoadData && settings.method) {
        // Check if athlete has data for other metric types too
        const otherTypes = Object.keys(ACWR_METRIC_TYPES).filter(t => t !== loadMetricType);
        for (const mt of otherTypes) {
            const mtRecords = athleteLoads.filter(r => r.metric_type === mt);
            if (mtRecords.length >= 7) {
                const result = ACWR_UTILS.calculateAthleteACWR(loadRecordsAsOf, athleteId, {
                    metricType: mt, acuteN, chronicN, freezeRestDays,
                });
                if (result.ratio > 0) {
                    const status = ACWR_UTILS.getRatioStatus(result.ratio);
                    additionalAcwrModels.push({ metricType: mt, ratio: result.ratio, status: status.label });
                }
            }
        }
    }

    // Resolve sport-aware testing thresholds from the athlete's team
    const sportThresholds = getSportThresholds(playerTeam?.sport);

    return {
        athleteId, athleteName,
        hasLoadData, loadDays, loadMetricType, acwrResult, acwrRatio, monotony, strain,
        hasWellnessData, wellnessDays, latestWellness, avgSleep3d, avgEnergy3d, avgSoreness3d, avgStress3d,
        assessmentsByType, testCategories,
        breakDetected, daysSinceBreak,
        additionalAcwrModels,
        sportThresholds,
    };
}

// ── Insight Engine ───────────────────────────────────────────────────────────

export function generateInsights(profile: DataProfile): Insight[] {
    const insights: Insight[] = [];
    let idCounter = 0;
    const id = () => `pi_${++idCounter}`;

    // ── Group 1: Load & Recovery ──
    if (profile.hasLoadData) {
        const r = profile.acwrRatio;

        if (r > 1.5) {
            insights.push({
                id: id(), category: 'Risk', severity: 'critical',
                title: 'ACWR in Danger Zone',
                message: `Acute:Chronic ratio is ${r.toFixed(2)} — exceeds the 1.5 threshold associated with 2-4x injury risk (Gabbett 2016). Acute load has surged well beyond the chronic base.`,
                recommendation: 'Immediate de-load required. Reduce to 50% intensity or prescribe active recovery for the next 48 hours.',
                dataSource: 'ACWR', confidence: `Based on ${profile.loadDays} days of load data`,
            });
        } else if (r > 1.3) {
            insights.push({
                id: id(), category: 'Risk', severity: 'warning',
                title: 'ACWR Elevated — Caution Zone',
                message: `Ratio at ${r.toFixed(2)} — above the 1.3 overreaching threshold. Training load is ramping faster than chronic adaptation.`,
                recommendation: 'Reduce session volume in the next 2-3 days. Prioritise recovery protocols.',
                dataSource: 'ACWR', confidence: `Based on ${profile.loadDays} days of load data`,
            });
        } else if (r > 0 && r < 0.8 && !profile.breakDetected) {
            insights.push({
                id: id(), category: 'Opportunity', severity: 'info',
                title: 'Undertraining Detected',
                message: `ACWR at ${r.toFixed(2)} — below 0.8 optimal threshold. Chronic fitness may be declining without sufficient stimulus.`,
                recommendation: 'Gradually increase weekly load to return to the 0.8-1.3 sweet spot. Avoid sudden spikes.',
                dataSource: 'ACWR', confidence: `Based on ${profile.loadDays} days of load data`,
            });
        }

        // Monotony
        if (profile.monotony > 2.0) {
            insights.push({
                id: id(), category: 'Risk', severity: 'warning',
                title: 'Training Monotony High',
                message: `Monotony index at ${profile.monotony} (threshold: 2.0). Load has been too consistent with insufficient day-to-day variation.`,
                recommendation: 'Introduce a low-intensity recovery day or vary session types. High monotony increases overtraining risk.',
                dataSource: 'Monotony', confidence: '7-day load variance analysis',
            });
        }

        // Break detection
        if (profile.breakDetected && profile.daysSinceBreak < 14) {
            insights.push({
                id: id(), category: 'Recovery', severity: 'info',
                title: 'Return from Break Detected',
                message: `A training break of 14+ days was detected. Research shows 2 weeks of retraining is needed to return to baseline performance (Joo 2018). ACWR may appear low — this is expected.`,
                recommendation: 'Ramp load progressively over the next 2 weeks. Avoid comparing current test scores to pre-break peaks — re-baseline first.',
                dataSource: 'Load Gap Analysis', confidence: 'Based on load record gap detection',
            });
        }

        // Multi-metric ACWR disagreement
        if (profile.additionalAcwrModels.length > 0) {
            const elevated = profile.additionalAcwrModels.filter(m => m.ratio > 1.3);
            const primary = ACWR_UTILS.getRatioStatus(profile.acwrRatio);
            if (primary.status === 'success' && elevated.length > 0) {
                const names = elevated.map(m => `${ACWR_METRIC_TYPES[m.metricType]?.label || m.metricType} (${m.ratio.toFixed(2)})`).join(', ');
                insights.push({
                    id: id(), category: 'Risk', severity: 'warning',
                    title: 'Multi-Metric Load Disagreement',
                    message: `Primary ACWR (${profile.loadMetricType}) is optimal at ${profile.acwrRatio.toFixed(2)}, but other metrics are elevated: ${names}.`,
                    recommendation: 'Investigate which training domain is driving the spike. The athlete may not feel overloaded but specific musculoskeletal stress is elevated.',
                    dataSource: 'Multi-metric ACWR', confidence: `Comparing ${profile.additionalAcwrModels.length + 1} load models`,
                });
            }
        }
    }

    // ── Group 2: Strength & Power ──
    const strengthTypes = ['1rm', 'rm_back_squat', 'rm_bench_press', 'rm_deadlift', 'rm_front_squat', 'rm_ohp'];
    for (const st of strengthTypes) {
        const data = profile.assessmentsByType[st];
        // Use the strength staleness threshold from the sport bucket — high-density
        // team sports get 180 d, individual sports get 60 d, etc.
        const strengthCutoff = profile.sportThresholds.staleness.strength;
        if (!data || data.count < 2 || data.daysSinceLatest > strengthCutoff) continue;
        const latest = Number(data.latest?.metrics?.value || data.latest?.metrics?.weight || 0);
        const prev = Number(data.previous?.metrics?.value || data.previous?.metrics?.weight || 0);
        if (latest <= 0 || prev <= 0) continue;
        const pctChange = ((latest - prev) / prev) * 100;
        const label = data.latest?.metrics?.exerciseLabel || st.replace('rm_', '').replace(/_/g, ' ');

        if (pctChange < -5 && !profile.breakDetected) {
            insights.push({
                id: id(), category: 'Performance', severity: 'warning',
                title: `${titleCase(label)} Strength Declining`,
                message: `${titleCase(label)} 1RM dropped ${Math.abs(pctChange).toFixed(1)}% (${prev}kg -> ${latest}kg). If not post-break, investigate fatigue, detraining, or technique regression.`,
                recommendation: 'Review recent load and recovery. If wellness is low, prioritise recovery before adjusting strength program.',
                dataSource: st, confidence: `Based on ${data.count} assessments`,
            });
        } else if (pctChange > 5) {
            insights.push({
                id: id(), category: 'Opportunity', severity: 'info',
                title: `${titleCase(label)} Strength Improving`,
                message: `${titleCase(label)} 1RM increased ${pctChange.toFixed(1)}% (${prev}kg -> ${latest}kg). Positive adaptation detected.`,
                recommendation: 'Consider updating training percentages to reflect new capacity. Current prescribed loads may be below optimal stimulus.',
                dataSource: st, confidence: `Based on ${data.count} assessments`,
            });
        }
    }

    // DSI classification
    const dsiData = profile.assessmentsByType['dsi'];
    if (dsiData && dsiData.latest?.metrics?.value) {
        const dsi = Number(dsiData.latest.metrics.value);
        if (dsi > 0) {
            const classification = dsi < 0.6 ? 'Strength Deficit' : dsi <= 0.8 ? 'Well Balanced' : 'Reactive Strength Deficit';
            const rec = dsi < 0.6
                ? 'Athlete cannot express maximal strength explosively. Prioritise ballistic and plyometric training for the next 4-week block.'
                : dsi > 0.8
                    ? 'Reactive ability exceeds force production capacity. Prioritise maximal strength development (heavy compound lifts).'
                    : 'Force production and reactive ability are balanced. Maintain concurrent training approach.';
            insights.push({
                id: id(), category: 'Performance', severity: dsi < 0.6 || dsi > 0.8 ? 'warning' : 'info',
                title: `DSI Profile: ${classification}`,
                message: `Dynamic Strength Index is ${dsi.toFixed(2)} — classified as "${classification}".`,
                recommendation: rec,
                dataSource: 'dsi', confidence: `Tested ${dsiData.daysSinceLatest} days ago`,
            });
        }
    }

    // ── Group 3: Injury Risk ──
    const nordicTypes = ['nordic', 'hamstring'];
    for (const nt of nordicTypes) {
        const data = profile.assessmentsByType[nt];
        if (!data) continue;
        const m = data.latest?.metrics;
        if (!m) continue;

        const relStrength = Number(m.relativeStrength || 0);
        const leftPeak = Number(m.leftPeak || m.left || 0);
        const rightPeak = Number(m.rightPeak || m.right || 0);

        // Relative strength risk
        if (relStrength > 0) {
            const risk = relStrength < 3.37 ? 'High' : relStrength < 4.47 ? 'Moderate' : 'Low';
            if (risk !== 'Low') {
                // Cross-reference with ACWR
                const compoundRisk = risk === 'High' && profile.acwrRatio > 1.3;
                insights.push({
                    id: id(),
                    category: 'Risk',
                    severity: compoundRisk ? 'critical' : risk === 'High' ? 'warning' : 'info',
                    title: compoundRisk ? 'CRITICAL: Weak Hamstrings Under High Load' : `Hamstring Risk: ${risk}`,
                    message: compoundRisk
                        ? `Relative hamstring strength is ${relStrength.toFixed(2)} N/kg (below 3.37 threshold) AND ACWR is ${profile.acwrRatio.toFixed(2)} (elevated). This is the highest compound injury risk combination.`
                        : `Relative hamstring strength at ${relStrength.toFixed(2)} N/kg — classified as ${risk} Risk.`,
                    recommendation: compoundRisk
                        ? 'Immediately reduce high-speed running volume. Begin Nordic protocol (48 reps/week). Research shows Nordic exercise reduces hamstring injury rate by 51% (van Dyk et al. 2019).'
                        : risk === 'High'
                            ? 'Prescribe Nordic hamstring protocol. Target 48 reps/week with progressive loading. Re-test in 4-6 weeks.'
                            : 'Continue maintenance Nordic protocol. Monitor bilateral strength balance.',
                    dataSource: nt, confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            }
        }

        // Bilateral asymmetry
        if (leftPeak > 0 && rightPeak > 0) {
            const asymmetry = Math.abs(leftPeak - rightPeak) / Math.max(leftPeak, rightPeak) * 100;
            const weakSide = leftPeak < rightPeak ? 'Left' : 'Right';
            if (asymmetry > 15) {
                insights.push({
                    id: id(), category: 'Risk', severity: 'warning',
                    title: `Hamstring Asymmetry: ${asymmetry.toFixed(0)}%`,
                    message: `${weakSide} hamstring is ${asymmetry.toFixed(1)}% weaker (${Math.min(leftPeak, rightPeak).toFixed(0)}N vs ${Math.max(leftPeak, rightPeak).toFixed(0)}N). Exceeds the 15% threshold for elevated injury risk.`,
                    recommendation: `Prioritise unilateral Nordic hamstring work on the ${weakSide.toLowerCase()} side. Consider single-leg RDL and eccentric-focused exercises.`,
                    dataSource: nt, confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            } else if (asymmetry > 10) {
                insights.push({
                    id: id(), category: 'Risk', severity: 'info',
                    title: `Hamstring Asymmetry: ${asymmetry.toFixed(0)}%`,
                    message: `${weakSide} hamstring is ${asymmetry.toFixed(1)}% weaker. Approaching the 15% risk threshold — monitor closely.`,
                    recommendation: 'Include unilateral work in programming. Re-test in 4 weeks.',
                    dataSource: nt, confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            }
        }
    }

    // Y-Balance — composite < 94% of leg length (Plisky 2006) + anterior
    // asymmetry > 4 cm (Smith 2015). Defensively reads both stored composite
    // values and recomputes from raw reaches if needed.
    {
        const data = profile.assessmentsByType['y_balance'];
        const injuryCutoff = profile.sportThresholds.staleness.injury_screen;
        if (data && data.daysSinceLatest <= injuryCutoff) {
            const m = data.latest?.metrics || {};
            let compL = Number(m.composite_left || 0);
            let compR = Number(m.composite_right || 0);
            const legLen = Number(m.leg_length || 0);
            if ((!compL || !compR) && legLen > 0) {
                const sumL = Number(m.ant_left || 0) + Number(m.pm_left || 0) + Number(m.pl_left || 0);
                const sumR = Number(m.ant_right || 0) + Number(m.pm_right || 0) + Number(m.pl_right || 0);
                if (!compL && sumL > 0) compL = (sumL / (legLen * 3)) * 100;
                if (!compR && sumR > 0) compR = (sumR / (legLen * 3)) * 100;
            }
            const lowerComp = Math.min(compL || 999, compR || 999);
            if (lowerComp < 89) {
                insights.push({
                    id: id(), category: 'Risk', severity: 'warning',
                    title: `Y-Balance Composite Low (${lowerComp.toFixed(0)}%)`,
                    message: `Worst-side composite reach is ${lowerComp.toFixed(0)}% of leg length — below 89% threshold. Plisky 2006 found this elevates lower-extremity injury risk by ~2.5×.`,
                    recommendation: 'Targeted dynamic balance work — single-leg reach drills, perturbation training. Re-screen in 4 weeks.',
                    dataSource: 'y_balance', confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            } else if (lowerComp < 94) {
                insights.push({
                    id: id(), category: 'Risk', severity: 'info',
                    title: `Y-Balance Composite Borderline (${lowerComp.toFixed(0)}%)`,
                    message: `Worst-side composite reach is ${lowerComp.toFixed(0)}% of leg length — approaching the 94% risk threshold.`,
                    recommendation: 'Monitor closely. Add single-leg balance work to programming.',
                    dataSource: 'y_balance', confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            }
            let antAsym = Number(m.ant_asymmetry || 0);
            if (!antAsym) {
                const al = Number(m.ant_left || 0), ar = Number(m.ant_right || 0);
                if (al > 0 && ar > 0) antAsym = Math.abs(al - ar);
            }
            if (antAsym > 4) {
                const weakSide = Number(m.ant_left || 0) < Number(m.ant_right || 0) ? 'left' : 'right';
                insights.push({
                    id: id(), category: 'Risk', severity: 'warning',
                    title: `Y-Balance Anterior Asymmetry: ${antAsym.toFixed(1)} cm`,
                    message: `Anterior reach differs by ${antAsym.toFixed(1)} cm between limbs (${weakSide} side limited). Exceeds the 4 cm threshold for elevated injury risk (Plisky 2006).`,
                    recommendation: `Investigate ankle dorsiflexion ROM and quadriceps control on the ${weakSide} side. Add unilateral work.`,
                    dataSource: 'y_balance', confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            }
        }
    }

    // CMJ Advanced — bilateral asymmetry_index (Bishop 2018)
    {
        const data = profile.assessmentsByType['cmj_advanced'];
        const eff = getEffectiveTestThresholds(profile.sportThresholds, 'cmj');
        if (data && data.daysSinceLatest <= eff.excludeAfter) {
            const m = data.latest?.metrics || {};
            const asym = Number(m.asymmetry_index || 0);
            if (asym > 15) {
                insights.push({
                    id: id(), category: 'Risk', severity: 'warning',
                    title: `CMJ Asymmetry: ${asym.toFixed(0)}%`,
                    message: `Bilateral force asymmetry is ${asym.toFixed(0)}% — exceeds the 15% threshold linked to elevated lower-limb injury risk in cutting and jumping sports (Bishop 2018).`,
                    recommendation: 'Prescribe unilateral strength + landing mechanics work. Re-test bilateral CMJ in 4 weeks.',
                    dataSource: 'cmj_advanced', confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            } else if (asym > 10) {
                insights.push({
                    id: id(), category: 'Risk', severity: 'info',
                    title: `CMJ Asymmetry: ${asym.toFixed(0)}%`,
                    message: `Bilateral force asymmetry is ${asym.toFixed(0)}% — approaching the 15% risk threshold.`,
                    recommendation: 'Monitor closely. Include unilateral jump and landing work in programming.',
                    dataSource: 'cmj_advanced', confidence: `Tested ${data.daysSinceLatest} days ago`,
                });
            }
        }
    }

    // FMS sub-scores — any 0 (pain) is critical, any 1 (unable) is a warning
    // (Cook 2014 — sub-score interpretation predicts injury better than total)
    {
        const fmsKeys = ['fms_deep_squat', 'fms_hurdle_step', 'fms_inline_lunge', 'fms_shoulder_mobility', 'fms_aslr', 'fms_trunk_pushup', 'fms_rotary_stability'];
        const fmsLabels: Record<string, string> = {
            fms_deep_squat: 'Deep Squat',
            fms_hurdle_step: 'Hurdle Step',
            fms_inline_lunge: 'In-Line Lunge',
            fms_shoulder_mobility: 'Shoulder Mobility',
            fms_aslr: 'Active Straight Leg Raise',
            fms_trunk_pushup: 'Trunk Stability Push-Up',
            fms_rotary_stability: 'Rotary Stability',
        };
        const injuryCutoff = profile.sportThresholds.staleness.injury_screen;
        const painMoves: string[] = [];
        const failMoves: string[] = [];
        let mostRecentDays = -1;
        for (const fk of fmsKeys) {
            const data = profile.assessmentsByType[fk];
            if (!data || data.daysSinceLatest > injuryCutoff) continue;
            mostRecentDays = mostRecentDays === -1 ? data.daysSinceLatest : Math.min(mostRecentDays, data.daysSinceLatest);
            const m = data.latest?.metrics || {};
            const raw = [m.score, m.score_left, m.score_right];
            let hasPain = false, hasFail = false;
            for (const v of raw) {
                if (v === null || v === undefined || v === '') continue;
                const n = Number(v);
                if (n === 0) hasPain = true;
                else if (n === 1) hasFail = true;
            }
            if (hasPain) painMoves.push(fmsLabels[fk]);
            else if (hasFail) failMoves.push(fmsLabels[fk]);
        }
        if (painMoves.length > 0) {
            insights.push({
                id: id(), category: 'Risk', severity: 'critical',
                title: `FMS Pain Reported (${painMoves.length} movement${painMoves.length > 1 ? 's' : ''})`,
                message: `Athlete scored 0 (pain) on: ${painMoves.join(', ')}. Pain during screening overrides all other interpretation — refer to medical staff before further loading.`,
                recommendation: 'Refer to medical / physiotherapy. Do not load painful movements until cleared.',
                dataSource: 'FMS', confidence: `Most recent FMS: ${mostRecentDays} days ago`,
            });
        } else if (failMoves.length > 0) {
            insights.push({
                id: id(), category: 'Risk', severity: 'warning',
                title: `FMS Movement Dysfunction (${failMoves.length} movement${failMoves.length > 1 ? 's' : ''})`,
                message: `Athlete scored 1 (unable) on: ${failMoves.join(', ')}. Cook 2014 — a single "1" score predicts injury better than the FMS total alone.`,
                recommendation: 'Targeted corrective work on the failed pattern(s). Re-screen in 4-6 weeks.',
                dataSource: 'FMS', confidence: `Most recent FMS: ${mostRecentDays} days ago`,
            });
        }
    }

    // ── Group 4: Wellness Patterns ──
    if (profile.hasWellnessData) {
        // ACWR + wellness compound
        if (profile.hasLoadData && profile.acwrRatio > 1.3 && profile.avgSleep3d < 5 && profile.avgSoreness3d > 6) {
            insights.push({
                id: id(), category: 'Risk', severity: 'critical',
                title: 'Compound Fatigue: Load + Poor Recovery',
                message: `ACWR is ${profile.acwrRatio.toFixed(2)} (elevated) while 3-day average sleep is ${profile.avgSleep3d.toFixed(1)}/10 and soreness is ${profile.avgSoreness3d.toFixed(1)}/10. Multiple risk factors are compounding simultaneously.`,
                recommendation: 'Immediate de-load. Address sleep hygiene and recovery protocols before resuming normal training.',
                dataSource: 'ACWR + Wellness', confidence: 'Cross-domain analysis',
            });
        }

        // Sustained soreness
        if (profile.avgSoreness3d > 6) {
            insights.push({
                id: id(), category: 'Recovery', severity: profile.avgSoreness3d > 7 ? 'warning' : 'info',
                title: 'Elevated Soreness',
                message: `3-day average soreness is ${profile.avgSoreness3d.toFixed(1)}/10. Persistent musculoskeletal complaint detected.`,
                recommendation: 'Cross-reference with injury report system. Consider soft-tissue management and modified training if persists.',
                dataSource: 'Wellness', confidence: `Based on ${Math.min(3, profile.wellnessDays)} recent check-ins`,
            });
        }

        // Sleep degradation
        if (profile.avgSleep3d < 5) {
            insights.push({
                id: id(), category: 'Recovery', severity: 'warning',
                title: 'Sleep Quality Compromised',
                message: `3-day average sleep score is ${profile.avgSleep3d.toFixed(1)}/10. Poor sleep impairs recovery, increases soft tissue injury risk, and reduces cognitive performance.`,
                recommendation: 'Address sleep hygiene. Avoid heavy CNS loading until sleep improves. Focus on technical/tactical sessions.',
                dataSource: 'Wellness', confidence: `Based on recent check-ins`,
            });
        }

        // Low energy with load
        if (profile.hasLoadData && profile.avgEnergy3d < 4 && profile.acwrRatio > 1.0) {
            insights.push({
                id: id(), category: 'Recovery', severity: 'info',
                title: 'Low Energy Under Load',
                message: `Energy rated ${profile.avgEnergy3d.toFixed(1)}/10 while ACWR is ${profile.acwrRatio.toFixed(2)}. High load applied during a low-energy state.`,
                recommendation: 'Monitor for overreaching symptoms. Modify sessions to "technical focus" if energy remains low.',
                dataSource: 'Wellness + ACWR', confidence: 'Cross-domain analysis',
            });
        }
    }

    // ── Group 5: Meta Rules ──
    // Staleness pulls from the sport bucket; CMJ / Nordic / RSI / DSI / SJ /
    // hamstring use their type-specific universal overrides (cheap-and-frequent
    // or injury-risk-windowed).
    const staleness = profile.sportThresholds.staleness;
    for (const [testType, data] of Object.entries(profile.assessmentsByType)) {
        const cat = getCategoryForTest(testType);
        const override = profile.sportThresholds.typeOverrides[testType];
        const threshold = override
            ? override.retestAfter
            : (staleness[cat] || profile.sportThresholds.retestAfter);
        if (data.daysSinceLatest > threshold) {
            insights.push({
                id: id(), category: 'Opportunity', severity: 'info',
                title: `Re-Test Due: ${titleCase(testType.replace(/_/g, ' '))}`,
                message: `Last tested ${data.daysSinceLatest} days ago (recommended: every ${threshold} days for ${profile.sportThresholds.bucketLabel.toLowerCase()}). Data may no longer reflect current capacity.`,
                recommendation: 'Schedule re-assessment to maintain an accurate performance profile.',
                dataSource: testType, confidence: `Last test: ${data.latestDate}`,
            });
        }
    }

    // Data gap warnings
    if (!profile.hasLoadData && Object.keys(profile.assessmentsByType).length > 0) {
        insights.push({
            id: id(), category: 'Opportunity', severity: 'info',
            title: 'No Load Monitoring Data',
            message: 'Assessment data exists but no training load records found. ACWR-based insights are unavailable without load tracking.',
            recommendation: 'Begin logging training loads via ACWR Monitoring to unlock load-based intelligence.',
            dataSource: 'Data Completeness', confidence: '',
        });
    }
    if (!profile.hasWellnessData && profile.hasLoadData) {
        insights.push({
            id: id(), category: 'Opportunity', severity: 'info',
            title: 'No Wellness Check-Ins',
            message: 'Load data exists but no recent wellness records. Recovery-based insights are limited.',
            recommendation: 'Enable daily wellness questionnaires to unlock cross-domain fatigue and readiness analysis.',
            dataSource: 'Data Completeness', confidence: '',
        });
    }

    // Sort: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return insights;
}

// ── Readiness Composite Score ────────────────────────────────────────────────

export function calculateReadinessScore(profile: DataProfile): ReadinessScore {
    const domains: ReadinessScore['domains'] = [];

    // Domain 1: Load Status (ACWR → 0-100)
    let loadScore = 75; // neutral default
    let loadAvailable = false;
    if (profile.hasLoadData && profile.acwrRatio > 0) {
        loadAvailable = true;
        if (profile.breakDetected && profile.daysSinceBreak < 14) {
            loadScore = 75; // re-baselining — neutral, don't penalise
        } else if (profile.acwrRatio >= 0.8 && profile.acwrRatio <= 1.3) {
            loadScore = 100;
        } else if (profile.acwrRatio > 1.3 && profile.acwrRatio <= 1.5) {
            loadScore = 50 + (1.5 - profile.acwrRatio) / 0.2 * 50; // 50-100 linear
        } else if (profile.acwrRatio > 1.5) {
            loadScore = Math.max(0, 50 - (profile.acwrRatio - 1.5) * 100); // drops to 0
        } else if (profile.acwrRatio < 0.8 && profile.acwrRatio >= 0.6) {
            loadScore = 50 + (profile.acwrRatio - 0.6) / 0.2 * 50;
        } else {
            loadScore = Math.max(0, profile.acwrRatio / 0.6 * 50);
        }
    }
    domains.push({ name: 'Load Status', score: Math.round(loadScore), weight: 30, available: loadAvailable, reason: loadAvailable ? `ACWR: ${profile.acwrRatio.toFixed(2)}` : 'No load data' });

    // Domain 2: Recovery State (Wellness → 0-100)
    // Sleep weighted 35%, energy 30%, soreness 20%, stress 15% (sleep is ~2x more
    // predictive of next-day performance recovery than stress — Halson 2014, Fullagar 2015)
    let recoveryScore = 75;
    let recoveryAvailable = profile.hasWellnessData;
    if (recoveryAvailable) {
        const sleepNorm = (profile.avgSleep3d / 10) * 100;
        const energyNorm = (profile.avgEnergy3d / 10) * 100;
        const sorenessNorm = ((10 - profile.avgSoreness3d) / 10) * 100; // inverted
        const stressNorm = ((10 - profile.avgStress3d) / 10) * 100; // inverted
        recoveryScore = sleepNorm * 0.35 + energyNorm * 0.30 + sorenessNorm * 0.20 + stressNorm * 0.15;
    }
    domains.push({ name: 'Recovery State', score: Math.round(recoveryScore), weight: 25, available: recoveryAvailable, reason: recoveryAvailable ? `Sleep: ${profile.avgSleep3d.toFixed(1)}, Energy: ${profile.avgEnergy3d.toFixed(1)}` : 'No recent wellness data' });

    // Domain 3: Performance Trend (test direction → 0-100)
    // Decay-start, exclusion, and re-test thresholds are sport-aware (sport bucket
    // resolved during discovery). CMJ / Nordic / RSI / DSI / SJ / hamstring use
    // universal type overrides regardless of sport — see SPORT_BUCKET_DEFS +
    // TEST_TYPE_OVERRIDES above and plans/PI-SPORT-AWARE-THRESHOLDS.md.
    let perfScore = 75;
    let perfAvailable = false;
    const trendScores = [];
    for (const [type, data] of Object.entries(profile.assessmentsByType)) {
        const eff = getEffectiveTestThresholds(profile.sportThresholds, type);
        if (data.count < 2 || data.daysSinceLatest > eff.excludeAfter) continue;
        // Skip if post-break and this is first test back
        if (profile.breakDetected && data.count < 3) continue;
        const latest = Number(data.latest?.metrics?.value || data.latest?.metrics?.weight || 0);
        const prev = Number(data.previous?.metrics?.value || data.previous?.metrics?.weight || 0);
        if (latest <= 0 || prev <= 0) continue;
        const pctChange = ((latest - prev) / prev) * 100;
        // Score: improving = 90, stable = 75, declining = 40
        let raw = pctChange > 3 ? 90 : pctChange >= -3 ? 75 : 40;
        // Soft decay: tests older than the decay-start point lose confidence on
        // a linear ramp down to a 0.4 floor at the exclusion cliff.
        if (data.daysSinceLatest > eff.decayStart) {
            const span = Math.max(1, eff.excludeAfter - eff.decayStart);
            const decay = Math.max(0.4, 1.0 - (data.daysSinceLatest - eff.decayStart) / (span / 0.6));
            raw = 75 + (raw - 75) * decay; // decay toward neutral (75), not toward 0
        }
        trendScores.push(raw);
        perfAvailable = true;
    }
    if (perfAvailable && trendScores.length > 0) {
        perfScore = trendScores.reduce((a, b) => a + b, 0) / trendScores.length;
    }
    domains.push({ name: 'Performance Trend', score: Math.round(perfScore), weight: 20, available: perfAvailable, reason: perfAvailable ? `${trendScores.length} test trends · ${profile.sportThresholds.bucketLabel}` : 'Insufficient recent test data' });

    // Domain 4: Injury Risk Flags (inverse of severity → 0-100)
    // Multi-factor scoring. Nordic / hamstring still drive the score where
    // present (Opar 2015, Bourne 2018, van Dyk 2019). For sports where Nordic
    // isn't typically tested, Y-balance (Plisky 2006), CMJ Advanced bilateral
    // asymmetry (Bishop 2018), and FMS sub-scores (Cook 2014) carry the domain.
    // Each rule is field-presence-defensive — missing fields silently skip.
    let injuryScore = 100;
    let injuryAvailable = false;

    // 1) Nordic / hamstring — relative strength + bilateral asymmetry
    for (const nt of ['nordic', 'hamstring']) {
        const data = profile.assessmentsByType[nt];
        const eff = getEffectiveTestThresholds(profile.sportThresholds, nt);
        if (!data || data.daysSinceLatest > eff.excludeAfter) continue;
        injuryAvailable = true;
        const m = data.latest?.metrics;
        if (!m) continue;
        const rel = Number(m.relativeStrength || 0);
        if (rel > 0 && rel < 3.37) injuryScore = Math.min(injuryScore, 20);
        else if (rel > 0 && rel < 4.47) injuryScore = Math.min(injuryScore, 60);
        const left = Number(m.leftPeak || m.left || 0);
        const right = Number(m.rightPeak || m.right || 0);
        if (left > 0 && right > 0) {
            const asym = Math.abs(left - right) / Math.max(left, right) * 100;
            if (asym > 15) injuryScore = Math.min(injuryScore, 40);
            else if (asym > 10) injuryScore = Math.min(injuryScore, 70);
        }
    }

    // 2) Y-Balance — composite reach + anterior asymmetry (Plisky 2006, Smith 2015)
    {
        const data = profile.assessmentsByType['y_balance'];
        const injuryCutoff = profile.sportThresholds.staleness.injury_screen;
        if (data && data.daysSinceLatest <= injuryCutoff) {
            const m = data.latest?.metrics || {};
            // Some platforms persist the registry's computed `composite_left/right`;
            // others store only raw reaches. Compute defensively from raw if needed.
            let compL = Number(m.composite_left || 0);
            let compR = Number(m.composite_right || 0);
            const legLen = Number(m.leg_length || 0);
            if ((!compL || !compR) && legLen > 0) {
                const sumL = Number(m.ant_left || 0) + Number(m.pm_left || 0) + Number(m.pl_left || 0);
                const sumR = Number(m.ant_right || 0) + Number(m.pm_right || 0) + Number(m.pl_right || 0);
                if (!compL && sumL > 0) compL = (sumL / (legLen * 3)) * 100;
                if (!compR && sumR > 0) compR = (sumR / (legLen * 3)) * 100;
            }
            const lowerComp = Math.min(compL || 999, compR || 999); // most-at-risk side
            if (lowerComp < 999) {
                injuryAvailable = true;
                if (lowerComp < 89) injuryScore = Math.min(injuryScore, 40);
                else if (lowerComp < 94) injuryScore = Math.min(injuryScore, 70);
            }
            // Anterior asymmetry — Plisky threshold >4 cm
            let antAsym = Number(m.ant_asymmetry || 0);
            if (!antAsym) {
                const al = Number(m.ant_left || 0), ar = Number(m.ant_right || 0);
                if (al > 0 && ar > 0) antAsym = Math.abs(al - ar);
            }
            if (antAsym > 4) {
                injuryAvailable = true;
                injuryScore = Math.min(injuryScore, 50);
            }
        }
    }

    // 3) CMJ Advanced — bilateral asymmetry_index (Bishop 2018)
    {
        const data = profile.assessmentsByType['cmj_advanced'];
        const eff = getEffectiveTestThresholds(profile.sportThresholds, 'cmj');
        if (data && data.daysSinceLatest <= eff.excludeAfter) {
            const m = data.latest?.metrics || {};
            const asym = Number(m.asymmetry_index || 0);
            if (asym > 0) {
                injuryAvailable = true;
                if (asym > 15) injuryScore = Math.min(injuryScore, 40);
                else if (asym > 10) injuryScore = Math.min(injuryScore, 70);
            }
        }
    }

    // 4) FMS sub-scores — any 0 (pain) or 1 (unable) on any movement (Cook 2014)
    {
        const fmsKeys = ['fms_deep_squat', 'fms_hurdle_step', 'fms_inline_lunge', 'fms_shoulder_mobility', 'fms_aslr', 'fms_trunk_pushup', 'fms_rotary_stability'];
        const injuryCutoff = profile.sportThresholds.staleness.injury_screen;
        let anyPain = false, anyOne = false, anyFmsPresent = false;
        for (const fk of fmsKeys) {
            const data = profile.assessmentsByType[fk];
            if (!data || data.daysSinceLatest > injuryCutoff) continue;
            anyFmsPresent = true;
            const m = data.latest?.metrics || {};
            // Some FMS tests have single `score`, others have bilateral `score_left/right`
            const raw = [m.score, m.score_left, m.score_right];
            for (const v of raw) {
                if (v === null || v === undefined || v === '') continue;
                const n = Number(v);
                if (n === 0) anyPain = true;
                else if (n === 1) anyOne = true;
            }
        }
        if (anyFmsPresent) {
            injuryAvailable = true;
            if (anyPain) injuryScore = Math.min(injuryScore, 20);
            else if (anyOne) injuryScore = Math.min(injuryScore, 60);
        }
    }

    // Compound: any high-risk screening flag + ACWR elevated → amplify
    if (injuryScore <= 40 && profile.acwrRatio > 1.3) {
        injuryScore = Math.max(0, injuryScore - 20);
    }
    domains.push({ name: 'Injury Risk', score: Math.round(injuryScore), weight: 15, available: injuryAvailable, reason: injuryAvailable ? `Screening data available` : 'No screening tests in window' });

    // Domain 5: Data Freshness (confidence signal → 0-100)
    // Each check uses sport-bucket thresholds. Power/screening for specific test
    // types fall back to the universal CMJ/Nordic overrides since those are the
    // cheap-and-frequent / injury-windowed measures.
    const stale = profile.sportThresholds.staleness;
    const overrideFor = (t: string) => profile.sportThresholds.typeOverrides[t];
    const nordicOver = overrideFor('nordic'); // 120d exclusion universal
    let freshnessScore = 0;
    const freshnessChecks = [
        { label: 'Load data current', pass: profile.hasLoadData },
        { label: 'Wellness current', pass: profile.hasWellnessData },
        { label: 'Strength tested', pass: Object.keys(profile.assessmentsByType).some(t => ['1rm', 'rm_back_squat', 'rm_bench_press', 'rm_deadlift', 'rm_front_squat', 'rm_ohp'].includes(t) && profile.assessmentsByType[t].daysSinceLatest <= stale.strength) },
        { label: 'Screening tested', pass: ['nordic', 'hamstring', 'fms_deep_squat', 'fms_hurdle_step', 'fms_inline_lunge', 'fms_shoulder_mobility', 'fms_aslr', 'fms_trunk_pushup', 'fms_rotary_stability', 'y_balance'].some(t => {
            const data = profile.assessmentsByType[t];
            if (!data) return false;
            if (t === 'nordic' || t === 'hamstring') return data.daysSinceLatest <= (nordicOver?.excludeAfter || stale.injury_screen);
            return data.daysSinceLatest <= stale.injury_screen;
        }) },
        { label: 'Power tested', pass: ['cmj', 'cmj_advanced', 'dsi', 'rsi', 'squat_jump', 'sj'].some(t => {
            const data = profile.assessmentsByType[t];
            if (!data) return false;
            // CMJ override applies to all CMJ variants; everything else uses sport-bucket power staleness
            const cmjFamily = t === 'cmj' || t === 'cmj_advanced' || t === 'dsi' || t === 'rsi' || t === 'squat_jump' || t === 'sj';
            const cutoff = cmjFamily ? (overrideFor('cmj')?.excludeAfter || stale.power) : ((overrideFor(t)?.excludeAfter) || stale.power);
            return data.daysSinceLatest <= cutoff;
        }) },
    ];
    freshnessScore = freshnessChecks.filter(c => c.pass).length * 20;
    domains.push({ name: 'Data Freshness', score: freshnessScore, weight: 10, available: true, reason: `${freshnessChecks.filter(c => c.pass).length} of ${freshnessChecks.length} data domains current` });

    // ── Compute weighted composite with redistribution ──
    const availableDomains = domains.filter(d => d.available);
    const totalWeight = availableDomains.reduce((s, d) => s + d.weight, 0);
    let overall = 0;
    if (totalWeight > 0) {
        for (const d of availableDomains) {
            overall += d.score * (d.weight / totalWeight);
        }
    } else {
        overall = 50; // no data at all
    }
    overall = Math.round(Math.max(0, Math.min(100, overall)));

    const domainsUsed = availableDomains.length;
    const domainsTotal = domains.length;
    const status = overall >= 80 ? 'green' : overall >= 50 ? 'amber' : 'red';
    const confidence = domainsUsed >= 4 ? 'high' : domainsUsed >= 2 ? 'moderate' : 'limited';

    return { overall, status, confidence, domainsUsed, domainsTotal, domains };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysBetween(dateStr: string, todayStr: string): number {
    if (!dateStr) return 999;
    const a = new Date(dateStr.split('T')[0] + 'T00:00:00');
    const b = new Date(todayStr.split('T')[0] + 'T00:00:00');
    return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function titleCase(str: string): string {
    return str.replace(/\b\w/g, c => c.toUpperCase());
}

function getCategoryForTest(testType: string): string {
    const map: Record<string, string> = {
        'rm_back_squat': 'strength', 'rm_bench_press': 'strength', 'rm_deadlift': 'strength',
        'rm_front_squat': 'strength', 'rm_ohp': 'strength', '1rm': 'strength',
        'dsi': 'power', 'rsi': 'power', 'cmj': 'power', 'sj': 'power', 'drop_jump': 'power',
        'nordic': 'injury_screen', 'hamstring': 'injury_screen', 'fms_total': 'injury_screen', 'y_balance': 'injury_screen',
        'sprint_10m': 'speed', 'sprint_20m': 'speed', 'sprint_40m': 'speed',
        'yo_yo': 'aerobic', 'beep_test': 'aerobic', 'vo2max': 'aerobic',
        'body_comp': 'anthropometry', 'skinfolds': 'anthropometry',
    };
    return map[testType] || 'other';
}
