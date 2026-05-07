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
             * @param {Boolean} freezeRestDays - If true, EWMA freezes on explicit rest days
             * @param {Set} restDays - Set of date strings that are explicit rest days
             * @param {Array} dates - Corresponding date strings for each load entry
             * @returns {Number} Calculated EWMA
             */
            calculateEWMA: (loads, N, freezeRestDays = false, restDays = new Set(), dates = []) => {
                if (!loads || loads.length === 0) return 0;
                const lambda = 2 / (N + 1);
                let ewma = loads[0];
                for (let i = 1; i < loads.length; i++) {
                    if (freezeRestDays && restDays.has(dates[i])) continue; // freeze only on explicit rest
                    ewma = (loads[i] * lambda) + (ewma * (1 - lambda));
                }
                return ewma;
            },

            /**
             * Builds daily load array from records, filling date gaps.
             * Also tracks which days are explicit rest days (session_type === 'rest')
             * vs days with no data (gaps) vs days with a logged zero value.
             * @param {Array} records - Filtered records for one athlete + one metric type
             * @param {String} valueField - Field to sum ('value', 'sRPE', etc.)
             * @returns {{ dates: string[], loads: number[], restDays: Set<string> }}
             */
            buildDailyLoads: (records, valueField = 'value') => {
                if (!records || records.length === 0) return { dates: [], loads: [], restDays: new Set() };
                const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
                const dailyMap = {};
                const restDaySet = new Set();
                sorted.forEach(r => {
                    const d = (r.date || '').split('T')[0];
                    // Track explicit rest days (marked by sport scientist)
                    if (r.session_type === 'rest') {
                        restDaySet.add(d);
                    }
                    const v = Number(r[valueField]) || Number(r.sRPE) || 0;
                    dailyMap[d] = (dailyMap[d] || 0) + v;
                });
                const dateKeys = Object.keys(dailyMap).sort();
                if (dateKeys.length === 0) return { dates: [], loads: [], restDays: restDaySet };
                // Timezone-safe date iteration using local date parts
                const [sy, sm, sd] = dateKeys[0].split('-').map(Number);
                const [ey, em, ed] = dateKeys[dateKeys.length - 1].split('-').map(Number);
                const startD = new Date(sy, sm - 1, sd);
                const endD = new Date(ey, em - 1, ed);
                const dates = [];
                const loads = [];
                for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    dates.push(ds);
                    loads.push(dailyMap[ds] || 0);
                }
                return { dates, loads, restDays: restDaySet };
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

                if (athleteRecords.length === 0) return { acute: 0, chronic: 0, ratio: 0, dates: [], loads: [], acuteHistory: [], chronicHistory: [], ratioHistory: [], restDays: new Set() };

                // Build daily loads + explicit rest day tracking
                const valueField = metricType ? 'value' : 'sRPE';
                const { dates, loads, restDays } = ACWR_UTILS.buildDailyLoads(athleteRecords, valueField);

                if (loads.length === 0) return { acute: 0, chronic: 0, ratio: 0, dates: [], loads: [], acuteHistory: [], chronicHistory: [], ratioHistory: [], restDays };

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
                    } else if (freezeRestDays && restDays.has(dates[i])) {
                        // Freeze ONLY on explicitly marked rest days — zeros from training still count
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

                return { acute: Math.round(acute), chronic: Math.round(chronic), ratio, dates, loads, acuteHistory, chronicHistory, ratioHistory, restDays };
            },

            /**
             * Calculates team aggregate ACWR (mean of all athletes' daily loads)
             */
            calculateTeamACWR: (records, athleteIds, options = {}) => {
                const { metricType, acuteN = 7, chronicN = 28, freezeRestDays = false } = options;

                // Build per-athlete daily load maps + collect rest days
                let filtered = metricType ? records.filter(r => r.metric_type === metricType) : records;
                const allDates = new Set();
                const athleteMaps = {};
                const allRestDays = new Set();

                athleteIds.forEach(aid => {
                    const recs = filtered.filter(r => (r.athleteId === aid || r.athlete_id === aid));
                    const valueField = metricType ? 'value' : 'sRPE';
                    const { dates, loads, restDays } = ACWR_UTILS.buildDailyLoads(recs, valueField);
                    const map = {};
                    dates.forEach((d, i) => { map[d] = loads[i]; allDates.add(d); });
                    athleteMaps[aid] = map;
                    // A team rest day = all athletes have explicit rest on that date
                    restDays.forEach(d => allRestDays.add(d + '_' + aid));
                });

                const sortedDates = [...allDates].sort();
                if (sortedDates.length === 0) return { acute: 0, chronic: 0, ratio: 0, dates: [], loads: [], acuteHistory: [], chronicHistory: [], ratioHistory: [], restDays: new Set() };

                // Fill complete date range and average (timezone-safe)
                const [sy, sm, sd] = sortedDates[0].split('-').map(Number);
                const [ey, em, ed] = sortedDates[sortedDates.length - 1].split('-').map(Number);
                const startD = new Date(sy, sm - 1, sd);
                const endD = new Date(ey, em - 1, ed);
                const dates = [];
                const loads = [];
                const teamRestDays = new Set();
                for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                    dates.push(ds);
                    let sum = 0, count = 0;
                    // Check if ALL athletes have explicit rest on this day
                    let allResting = athleteIds.length > 0;
                    athleteIds.forEach(aid => {
                        const v = athleteMaps[aid]?.[ds];
                        if (v !== undefined) { sum += v; count++; }
                        if (!allRestDays.has(ds + '_' + aid)) allResting = false;
                    });
                    if (allResting) teamRestDays.add(ds);
                    loads.push(count > 0 ? parseFloat((sum / count).toFixed(1)) : 0);
                }

                // Run EWMA on team averages — mark team rest days so freeze works
                const teamRecords = dates.map((d, i) => ({
                    date: d, value: loads[i], athlete_id: '__team__',
                    metric_type: metricType || 'srpe',
                    session_type: teamRestDays.has(d) ? 'rest' : 'training',
                }));
                const result = ACWR_UTILS.calculateAthleteACWR(
                    teamRecords, '__team__',
                    { metricType: metricType || 'srpe', acuteN, chronicN, freezeRestDays }
                );
                return result;
            },

            /**
             * Determines the status and color based on ACWR ratio
             */
            getRatioStatus: (ratio) => {
                if (ratio === 0) return { label: 'No Data', color: 'text-slate-400', bg: 'bg-slate-100', status: 'neutral' };
                if (ratio < 0.8) return { label: 'Undertrained', color: 'text-sky-500', bg: 'bg-sky-50', status: 'warning' };
                if (ratio >= 0.8 && ratio <= 1.3) return { label: 'Optimal', color: 'text-emerald-500', bg: 'bg-emerald-50', status: 'success' };
                if (ratio > 1.3 && ratio <= 1.5) return { label: 'Caution', color: 'text-amber-500', bg: 'bg-amber-50', status: 'warning' };
                return { label: 'Danger', color: 'text-rose-500', bg: 'bg-rose-50', status: 'danger' };
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
            },

            /**
             * Solves for the daily load needed to achieve a target ACWR ratio on the next day.
             * Derivation from EWMA:
             *   acute_new  = load × λ_a + acute_old  × (1 − λ_a)
             *   chronic_new = load × λ_c + chronic_old × (1 − λ_c)
             *   target = acute_new / chronic_new
             * Solving:  load = (acute×(1−λ_a) − target×chronic×(1−λ_c)) / (target×λ_c − λ_a)
             *
             * @param {Number} currentAcute  - Current EWMA acute value
             * @param {Number} currentChronic - Current EWMA chronic value
             * @param {Number} targetRatio   - Desired ACWR ratio (default 1.0)
             * @param {Number} acuteN        - Acute window (default 7)
             * @param {Number} chronicN      - Chronic window (default 28)
             * @returns {Number} Recommended daily load (clamped to ≥ 0)
             */
            solveLoadForTargetACWR: (currentAcute, currentChronic, targetRatio = 1.0, acuteN = 7, chronicN = 28) => {
                const lambda_a = 2 / (acuteN + 1);
                const lambda_c = 2 / (chronicN + 1);
                const denominator = targetRatio * lambda_c - lambda_a;
                // When denominator ≈ 0 the target is effectively unreachable in one day — fall back to chronic level
                if (Math.abs(denominator) < 1e-9) return Math.max(0, currentChronic);
                const load = (currentAcute * (1 - lambda_a) - targetRatio * currentChronic * (1 - lambda_c)) / denominator;
                return Math.max(0, load);
            },

            /**
             * Projects optimal daily loads for the next N days to maintain a target ACWR.
             * Each day's projection feeds into the next so the EWMA evolves realistically.
             *
             * @param {Number} currentAcute   - Starting EWMA acute
             * @param {Number} currentChronic  - Starting EWMA chronic
             * @param {Number} days            - Number of days to project (default 7)
             * @param {Number} targetRatio     - Desired ACWR ratio (default 1.0)
             * @param {Number} acuteN          - Acute window (default 7)
             * @param {Number} chronicN        - Chronic window (default 28)
             * @returns {Array<{day, load, acute, chronic, ratio}>}
             */
            projectOptimalWeek: (currentAcute, currentChronic, days = 7, targetRatio = 1.0, acuteN = 7, chronicN = 28) => {
                const lambda_a = 2 / (acuteN + 1);
                const lambda_c = 2 / (chronicN + 1);
                let acute = currentAcute;
                let chronic = currentChronic;
                const projection = [];

                for (let d = 1; d <= days; d++) {
                    const load = ACWR_UTILS.solveLoadForTargetACWR(acute, chronic, targetRatio, acuteN, chronicN);
                    acute = load * lambda_a + acute * (1 - lambda_a);
                    chronic = load * lambda_c + chronic * (1 - lambda_c);
                    const ratio = chronic > 0 ? parseFloat((acute / chronic).toFixed(2)) : 0;
                    projection.push({ day: d, load: Math.round(load), acute: Math.round(acute), chronic: Math.round(chronic), ratio });
                }
                return projection;
            },

            /**
             * Projects what the ACWR would be if a specific load sequence is applied.
             * Used for "what-if" scenario comparison.
             */
            projectWithLoads: (currentAcute, currentChronic, dailyLoads = [], acuteN = 7, chronicN = 28) => {
                const lambda_a = 2 / (acuteN + 1);
                const lambda_c = 2 / (chronicN + 1);
                let acute = currentAcute;
                let chronic = currentChronic;
                const projection = [];

                for (let d = 0; d < dailyLoads.length; d++) {
                    const load = dailyLoads[d];
                    acute = load * lambda_a + acute * (1 - lambda_a);
                    chronic = load * lambda_c + chronic * (1 - lambda_c);
                    const ratio = chronic > 0 ? parseFloat((acute / chronic).toFixed(2)) : 0;
                    projection.push({ day: d + 1, load: Math.round(load), acute: Math.round(acute), chronic: Math.round(chronic), ratio });
                }
                return projection;
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