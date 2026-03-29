export const BORG_RPE_SCALE: Record<number, { label: string; color: string }> = {
            0: { label: 'Nothing at all',  color: 'text-slate-400' },
            1: { label: 'Rest',            color: 'text-emerald-400' },
            2: { label: 'Really easy',     color: 'text-emerald-500' },
            3: { label: 'Easy',            color: 'text-green-500' },
            4: { label: 'Moderate',        color: 'text-amber-500' },
            5: { label: 'Challenging',     color: 'text-amber-600' },
            6: { label: 'Hard',            color: 'text-orange-500' },
            7: { label: 'Very hard',       color: 'text-orange-600' },
            8: { label: 'Really hard',     color: 'text-red-500' },
            9: { label: 'Near maximal',    color: 'text-rose-600' },
            10: { label: 'Maximal',        color: 'text-rose-700' }
        };

export const ACWR_METRIC_TYPES = {
    srpe:             { label: 'Session RPE (sRPE)',     unit: 'AU',  desc: 'RPE × Duration (minutes)', sports: ['all'] },
    sprint_distance:  { label: 'Sprint Distance',        unit: 'm',   desc: 'Metres ≥25 km/h (configurable)', sports: ['football', 'rugby', 'hockey', 'afl'] },
    total_distance:   { label: 'Total Distance',         unit: 'm',   desc: 'Total metres per session', sports: ['running', 'football', 'rugby'] },
    tonnage:          { label: 'Tonnage',                 unit: 'kg',  desc: 'Sets × Reps × Weight', sports: ['powerlifting', 'weightlifting', 'gym'] },
    duration:         { label: 'Training Duration',       unit: 'min', desc: 'Session minutes', sports: ['swimming', 'combat', 'general'] },
    trimp:            { label: 'TRIMP',                   unit: 'AU',  desc: 'HR-zone weighted duration', sports: ['endurance', 'cycling', 'rowing'] },
    player_load:      { label: 'PlayerLoad',              unit: 'AU',  desc: 'Tri-axial accelerometer load', sports: ['football', 'rugby', 'basketball'] },
};

export const ACWR_UTILS = {
            /**
             * Calculates the Exponentially Weighted Moving Average
             * λ = 2/(N+1) per Williams et al. (2017)
             * @param {Array} loads - Array of daily loads
             * @param {Number} N - Time decay constant (7 for Acute, 28 for Chronic)
             * @param {Boolean} freezeRestDays - If true, EWMA freezes on zero-load days (Menaspà 2017 approach)
             * @returns {Number} Calculated EWMA
             */
            calculateEWMA: (loads, N, freezeRestDays = false) => {
                if (!loads || loads.length === 0) return 0;
                const lambda = 2 / (N + 1);
                let ewma = loads[0];
                for (let i = 1; i < loads.length; i++) {
                    if (freezeRestDays && loads[i] === 0) continue; // freeze on rest days
                    ewma = (loads[i] * lambda) + (ewma * (1 - lambda));
                }
                return ewma;
            },

            /**
             * Builds daily load array from records, filling date gaps
             * @param {Array} records - Filtered records for one athlete + one metric type
             * @param {String} valueField - Field to sum ('value', 'sRPE', etc.)
             * @returns {Array} { dates: string[], loads: number[] }
             */
            buildDailyLoads: (records, valueField = 'value') => {
                if (!records || records.length === 0) return { dates: [], loads: [] };
                const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
                const dailyMap = {};
                sorted.forEach(r => {
                    const d = (r.date || '').split('T')[0];
                    const v = Number(r[valueField]) || Number(r.sRPE) || 0;
                    dailyMap[d] = (dailyMap[d] || 0) + v;
                });
                const dateKeys = Object.keys(dailyMap).sort();
                if (dateKeys.length === 0) return { dates: [], loads: [] };
                const start = new Date(dateKeys[0] + 'T00:00:00');
                const end = new Date(dateKeys[dateKeys.length - 1] + 'T00:00:00');
                const dates = [];
                const loads = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const ds = d.toISOString().split('T')[0];
                    dates.push(ds);
                    loads.push(dailyMap[ds] || 0);
                }
                return { dates, loads };
            },

            /**
             * Calculates ACWR for a specific athlete using any metric
             * Supports both legacy sRPE records and new training_loads records
             */
            calculateAthleteACWR: (records, athleteId, options = {}) => {
                const { metricType, acuteN = 7, chronicN = 28, freezeRestDays = false } = options;

                // Filter records for this athlete
                let athleteRecords = records.filter(r =>
                    (r.athleteId === athleteId || r.athlete_id === athleteId)
                );

                // If metricType specified, filter further
                if (metricType) {
                    athleteRecords = athleteRecords.filter(r => r.metric_type === metricType);
                }

                if (athleteRecords.length === 0) return { acute: 0, chronic: 0, ratio: 0, dates: [], loads: [], acuteHistory: [], chronicHistory: [], ratioHistory: [] };

                // Build daily loads
                const valueField = metricType ? 'value' : 'sRPE';
                const { dates, loads } = ACWR_UTILS.buildDailyLoads(athleteRecords, valueField);

                if (loads.length === 0) return { acute: 0, chronic: 0, ratio: 0, dates: [], loads: [], acuteHistory: [], chronicHistory: [], ratioHistory: [] };

                // Calculate full EWMA history for charting
                const lambda_a = 2 / (acuteN + 1);
                const lambda_c = 2 / (chronicN + 1);
                const acuteHistory = [];
                const chronicHistory = [];
                const ratioHistory = [];
                let ewma_a = loads[0];
                let ewma_c = loads[0];

                for (let i = 0; i < loads.length; i++) {
                    if (i === 0) {
                        ewma_a = loads[0];
                        ewma_c = loads[0];
                    } else if (freezeRestDays && loads[i] === 0) {
                        // Freeze — keep previous values
                    } else {
                        ewma_a = (loads[i] * lambda_a) + (ewma_a * (1 - lambda_a));
                        ewma_c = (loads[i] * lambda_c) + (ewma_c * (1 - lambda_c));
                    }
                    acuteHistory.push(parseFloat(ewma_a.toFixed(1)));
                    chronicHistory.push(parseFloat(ewma_c.toFixed(1)));
                    ratioHistory.push(ewma_c > 0 ? parseFloat((ewma_a / ewma_c).toFixed(2)) : 0);
                }

                const acute = acuteHistory[acuteHistory.length - 1] || 0;
                const chronic = chronicHistory[chronicHistory.length - 1] || 0;
                const ratio = ratioHistory[ratioHistory.length - 1] || 0;

                return { acute: Math.round(acute), chronic: Math.round(chronic), ratio, dates, loads, acuteHistory, chronicHistory, ratioHistory };
            },

            /**
             * Calculates team aggregate ACWR (mean of all athletes' daily loads)
             */
            calculateTeamACWR: (records, athleteIds, options = {}) => {
                const { metricType, acuteN = 7, chronicN = 28, freezeRestDays = false } = options;

                // Build per-athlete daily load maps
                let filtered = metricType ? records.filter(r => r.metric_type === metricType) : records;
                const allDates = new Set();
                const athleteMaps = {};

                athleteIds.forEach(aid => {
                    const recs = filtered.filter(r => (r.athleteId === aid || r.athlete_id === aid));
                    const valueField = metricType ? 'value' : 'sRPE';
                    const { dates, loads } = ACWR_UTILS.buildDailyLoads(recs, valueField);
                    const map = {};
                    dates.forEach((d, i) => { map[d] = loads[i]; allDates.add(d); });
                    athleteMaps[aid] = map;
                });

                const sortedDates = [...allDates].sort();
                if (sortedDates.length === 0) return { acute: 0, chronic: 0, ratio: 0, dates: [], loads: [], acuteHistory: [], chronicHistory: [], ratioHistory: [] };

                // Fill complete date range and average
                const start = new Date(sortedDates[0] + 'T00:00:00');
                const end = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00');
                const dates = [];
                const loads = [];
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const ds = d.toISOString().split('T')[0];
                    dates.push(ds);
                    let sum = 0, count = 0;
                    athleteIds.forEach(aid => {
                        const v = athleteMaps[aid]?.[ds];
                        if (v !== undefined) { sum += v; count++; }
                    });
                    loads.push(count > 0 ? parseFloat((sum / count).toFixed(1)) : 0);
                }

                // Run EWMA on team averages
                const teamRecords = dates.map((d, i) => ({ date: d, value: loads[i] }));
                const result = ACWR_UTILS.calculateAthleteACWR(
                    teamRecords.map(r => ({ ...r, athlete_id: '__team__', metric_type: metricType || 'srpe' })),
                    '__team__',
                    { metricType: metricType || 'srpe', acuteN, chronicN, freezeRestDays }
                );
                return result;
            },

            /**
             * Determines the status and color based on ACWR ratio
             */
            getRatioStatus: (ratio) => {
                if (ratio === 0) return { label: 'No Data', color: 'text-slate-400', bg: 'bg-slate-100', status: 'neutral' };
                if (ratio < 0.8) return { label: 'Undertrained', color: 'text-blue-500', bg: 'bg-blue-50', status: 'warning' };
                if (ratio >= 0.8 && ratio <= 1.3) return { label: 'Optimal', color: 'text-emerald-500', bg: 'bg-emerald-50', status: 'success' };
                if (ratio > 1.3 && ratio <= 1.5) return { label: 'Overreaching', color: 'text-amber-500', bg: 'bg-amber-50', status: 'warning' };
                return { label: 'Danger Zone', color: 'text-rose-500', bg: 'bg-rose-50', status: 'danger' };
            },

            /**
             * Gets detailed reasoning for an athlete's risk level
             */
            getAthleteRiskReasoning: (acwrResult, wellnessData, loadRecords, athleteId) => {
                const reasons = [];
                const { ratio, acute, chronic, loads = [], ratioHistory = [] } = acwrResult;

                // ACWR analysis
                if (ratio > 1.5) reasons.push({ severity: 'critical', category: 'ACWR', text: `ACWR at ${ratio} — exceeds 1.5 danger threshold. Acute load (${acute} AU) far outpacing chronic base (${chronic} AU). Immediate de-load needed.` });
                else if (ratio > 1.3) reasons.push({ severity: 'warning', category: 'ACWR', text: `ACWR at ${ratio} — above 1.3 overreaching threshold. Training load ramping faster than adaptation. Monitor closely.` });
                else if (ratio < 0.8) reasons.push({ severity: 'info', category: 'ACWR', text: `ACWR at ${ratio} — below 0.8 undertraining threshold. Chronic fitness may be declining.` });

                // Spike detection (ratio jumped >0.3 in last 3 days)
                if (ratioHistory.length >= 4) {
                    const recent = ratioHistory[ratioHistory.length - 1];
                    const threeDaysAgo = ratioHistory[ratioHistory.length - 4];
                    const spike = recent - threeDaysAgo;
                    if (spike > 0.3) reasons.push({ severity: 'warning', category: 'Load Spike', text: `ACWR spiked +${spike.toFixed(2)} in the last 3 days. Rapid increases correlate with 2-4× injury risk (Gabbett 2016).` });
                }

                // Rest-day return detection
                if (loads.length >= 3) {
                    const lastThree = loads.slice(-3);
                    if (lastThree[0] === 0 && lastThree[1] === 0 && lastThree[2] > 0) {
                        reasons.push({ severity: 'info', category: 'Return from Rest', text: `Athlete returned from 2+ rest days. ACWR spike may be partly artifactual — interpret with caution.` });
                    }
                }

                // Wellness integration
                const athleteWellness = (wellnessData || []).filter(w => w.athleteId === athleteId);
                const latest = athleteWellness.length > 0 ? athleteWellness[athleteWellness.length - 1] : null;
                if (latest) {
                    if (latest.energy < 3) reasons.push({ severity: 'critical', category: 'Wellness', text: `Energy rated ${latest.energy}/10 — severe fatigue reported. Combined with load data, high injury risk.` });
                    else if (latest.energy < 5) reasons.push({ severity: 'warning', category: 'Wellness', text: `Energy rated ${latest.energy}/10 — below average. Recovery may be compromised.` });
                    if (latest.sleep < 5) reasons.push({ severity: 'warning', category: 'Wellness', text: `Sleep rated ${latest.sleep}/10 — poor sleep impairs recovery and increases soft tissue injury risk.` });
                    if (latest.stress > 8) reasons.push({ severity: 'warning', category: 'Wellness', text: `Stress rated ${latest.stress}/10 — high psychosocial stress compounds physiological load.` });
                    if (latest.soreness > 7) reasons.push({ severity: 'warning', category: 'Wellness', text: `Soreness rated ${latest.soreness}/10 — elevated musculoskeletal complaint.` });
                }

                // Monotony check (last 7 days of loads)
                if (loads.length >= 7) {
                    const last7 = loads.slice(-7);
                    const mean = last7.reduce((a, b) => a + b, 0) / 7;
                    if (mean > 0) {
                        const variance = last7.map(x => (x - mean) ** 2).reduce((a, b) => a + b, 0) / 7;
                        const stdDev = Math.sqrt(variance);
                        const monotony = stdDev > 0 ? mean / stdDev : 2.0;
                        if (monotony > 2.0) reasons.push({ severity: 'warning', category: 'Monotony', text: `Training monotony at ${monotony.toFixed(1)} (>2.0). Low load variation increases overtraining risk.` });
                    }
                }

                return reasons;
            }
        };

// Maps Testing Hub test_type IDs and Performance Lab exerciseIds → canonical display names
export const RM_EXERCISE_MAP: Record<string, string> = {
    // Testing Hub test_type values
    'rm_back_squat': 'Back Squat',
    'rm_bench_press': 'Bench Press',
    'rm_deadlift': 'Deadlift',
    'rm_front_squat': 'Front Squat',
    'rm_ohp': 'Overhead Press',
    // Performance Lab exerciseId values
    'back_squat': 'Back Squat',
    'front_squat': 'Front Squat',
    'trap_bar_deadlift': 'Trap Bar Deadlift',
    'leg_press': 'Leg Press',
    'bench_press': 'Bench Press',
    'overhead_press': 'Overhead Press',
    'incline_bench': 'Incline Bench',
    'dips_weighted': 'Dips (Weighted)',
    'pullups_weighted': 'Pullups (Weighted)',
    'barbell_row': 'Barbell Row',
    'lat_pulldown': 'Lat Pulldown',
};

// Deduplicated, sorted list of all 1RM-testable exercise names for the weightroom sheet picker
export const WEIGHTROOM_1RM_EXERCISES = [...new Set(Object.values(RM_EXERCISE_MAP))].sort();