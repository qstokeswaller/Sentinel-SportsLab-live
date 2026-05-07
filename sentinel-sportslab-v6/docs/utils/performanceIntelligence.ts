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
): DataProfile {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // ── Load domain ──
    const athleteLoads = (loadRecords || []).filter(r =>
        (r.athleteId === athleteId || r.athlete_id === athleteId)
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

    let acwrResult = null;
    let acwrRatio = 0;
    if (hasLoadData) {
        acwrResult = ACWR_UTILS.calculateAthleteACWR(loadRecords, athleteId, {
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
    const athleteWellness = (habitRecords || []).filter(r =>
        r.athleteId === athleteId || r.athlete_id === athleteId
    );
    const sortedWellness = [...athleteWellness].sort((a, b) => new Date(b.date) - new Date(a.date));
    const hasWellnessData = sortedWellness.length > 0 &&
        daysBetween(sortedWellness[0]?.date, today) <= 7;
    const wellnessDays = sortedWellness.length;
    const latestWellness = sortedWellness[0] || null;

    // 3-day rolling averages
    const recent3 = sortedWellness.slice(0, 3);
    const avg = (arr, key) => arr.length > 0 ? arr.reduce((s, r) => s + (Number(r[key]) || 0), 0) / arr.length : 0;
    const avgSleep3d = avg(recent3, 'sleep');
    const avgEnergy3d = avg(recent3, 'energy');
    const avgSoreness3d = avg(recent3, 'soreness');
    const avgStress3d = avg(recent3, 'stress');

    // ── Assessment domains ──
    const athleteAssessments = (assessments || []).filter(a =>
        a.athlete_id === athleteId || a.athleteId === athleteId
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
                const result = ACWR_UTILS.calculateAthleteACWR(loadRecords, athleteId, {
                    metricType: mt, acuteN, chronicN, freezeRestDays,
                });
                if (result.ratio > 0) {
                    const status = ACWR_UTILS.getRatioStatus(result.ratio);
                    additionalAcwrModels.push({ metricType: mt, ratio: result.ratio, status: status.label });
                }
            }
        }
    }

    return {
        athleteId, athleteName,
        hasLoadData, loadDays, loadMetricType, acwrResult, acwrRatio, monotony, strain,
        hasWellnessData, wellnessDays, latestWellness, avgSleep3d, avgEnergy3d, avgSoreness3d, avgStress3d,
        assessmentsByType, testCategories,
        breakDetected, daysSinceBreak,
        additionalAcwrModels,
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
        if (!data || data.count < 2 || data.daysSinceLatest > 90) continue;
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
    const staleness = {
        strength: 60, power: 60, injury_screen: 90, speed: 60,
        aerobic: 90, anthropometry: 90, other: 90,
    };
    for (const [testType, data] of Object.entries(profile.assessmentsByType)) {
        const cat = getCategoryForTest(testType);
        const threshold = staleness[cat] || 90;
        if (data.daysSinceLatest > threshold) {
            insights.push({
                id: id(), category: 'Opportunity', severity: 'info',
                title: `Re-Test Due: ${titleCase(testType.replace(/_/g, ' '))}`,
                message: `Last tested ${data.daysSinceLatest} days ago (recommended: every ${threshold} days). Data may no longer reflect current capacity.`,
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
    let recoveryScore = 75;
    let recoveryAvailable = profile.hasWellnessData;
    if (recoveryAvailable) {
        const sleepNorm = (profile.avgSleep3d / 10) * 100;
        const energyNorm = (profile.avgEnergy3d / 10) * 100;
        const sorenessNorm = ((10 - profile.avgSoreness3d) / 10) * 100; // inverted
        const stressNorm = ((10 - profile.avgStress3d) / 10) * 100; // inverted
        recoveryScore = (sleepNorm + energyNorm + sorenessNorm + stressNorm) / 4;
    }
    domains.push({ name: 'Recovery State', score: Math.round(recoveryScore), weight: 25, available: recoveryAvailable, reason: recoveryAvailable ? `Sleep: ${profile.avgSleep3d.toFixed(1)}, Energy: ${profile.avgEnergy3d.toFixed(1)}` : 'No recent wellness data' });

    // Domain 3: Performance Trend (test direction → 0-100)
    let perfScore = 75;
    let perfAvailable = false;
    const trendScores = [];
    for (const [type, data] of Object.entries(profile.assessmentsByType)) {
        if (data.count < 2 || data.daysSinceLatest > 90) continue;
        // Skip if post-break and this is first test back
        if (profile.breakDetected && data.count < 3) continue;
        const latest = Number(data.latest?.metrics?.value || data.latest?.metrics?.weight || 0);
        const prev = Number(data.previous?.metrics?.value || data.previous?.metrics?.weight || 0);
        if (latest <= 0 || prev <= 0) continue;
        const pctChange = ((latest - prev) / prev) * 100;
        // Score: improving = 90, stable = 75, declining = 40
        if (pctChange > 3) trendScores.push(90);
        else if (pctChange >= -3) trendScores.push(75);
        else trendScores.push(40);
        perfAvailable = true;
    }
    if (perfAvailable && trendScores.length > 0) {
        perfScore = trendScores.reduce((a, b) => a + b, 0) / trendScores.length;
    }
    domains.push({ name: 'Performance Trend', score: Math.round(perfScore), weight: 20, available: perfAvailable, reason: perfAvailable ? `${trendScores.length} test trends analysed` : 'Insufficient recent test data' });

    // Domain 4: Injury Risk Flags (inverse of severity → 0-100)
    let injuryScore = 100;
    let injuryAvailable = false;
    for (const nt of ['nordic', 'hamstring', 'fms_total', 'y_balance']) {
        const data = profile.assessmentsByType[nt];
        if (data && data.daysSinceLatest <= 90) {
            injuryAvailable = true;
            const m = data.latest?.metrics;
            if (!m) continue;
            // Nordic/hamstring risk
            const rel = Number(m.relativeStrength || 0);
            if (rel > 0 && rel < 3.37) injuryScore = Math.min(injuryScore, 20);
            else if (rel > 0 && rel < 4.47) injuryScore = Math.min(injuryScore, 60);
            // Asymmetry
            const left = Number(m.leftPeak || m.left || 0);
            const right = Number(m.rightPeak || m.right || 0);
            if (left > 0 && right > 0) {
                const asym = Math.abs(left - right) / Math.max(left, right) * 100;
                if (asym > 15) injuryScore = Math.min(injuryScore, 40);
                else if (asym > 10) injuryScore = Math.min(injuryScore, 70);
            }
            // FMS
            if (nt === 'fms_total' && m.total && Number(m.total) < 14) {
                injuryScore = Math.min(injuryScore, 50);
            }
        }
    }
    // Compound: Nordic risk + ACWR elevated
    if (injuryScore <= 40 && profile.acwrRatio > 1.3) {
        injuryScore = Math.max(0, injuryScore - 20);
    }
    domains.push({ name: 'Injury Risk', score: Math.round(injuryScore), weight: 15, available: injuryAvailable, reason: injuryAvailable ? `Screening data available` : 'No screening tests in last 90 days' });

    // Domain 5: Data Freshness (confidence signal → 0-100)
    let freshnessScore = 0;
    const freshnessChecks = [
        { label: 'Load data current', pass: profile.hasLoadData },
        { label: 'Wellness current', pass: profile.hasWellnessData },
        { label: 'Strength tested', pass: Object.keys(profile.assessmentsByType).some(t => ['1rm', 'rm_back_squat', 'rm_bench_press', 'rm_deadlift'].includes(t) && profile.assessmentsByType[t].daysSinceLatest <= 60) },
        { label: 'Screening tested', pass: Object.keys(profile.assessmentsByType).some(t => ['nordic', 'hamstring', 'fms_total', 'y_balance'].includes(t) && profile.assessmentsByType[t].daysSinceLatest <= 90) },
        { label: 'Power tested', pass: Object.keys(profile.assessmentsByType).some(t => ['cmj', 'dsi', 'rsi', 'sj'].includes(t) && profile.assessmentsByType[t].daysSinceLatest <= 60) },
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
