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

export const ACWR_UTILS = {
            /**
             * Calculates the Exponentially Weighted Moving Average
             * @param {Array} loads - Array of daily loads (AU)
             * @param {Number} N - Time decay constant (7 for Acute, 28 for Chronic)
             * @returns {Number} Calculated EWMA
             */
            calculateEWMA: (loads, N) => {
                if (!loads || loads.length === 0) return 0;
                const lambda = 2 / (N + 1);
                let ewma = loads[0]; // Start with the first load
                for (let i = 1; i < loads.length; i++) {
                    ewma = (loads[i] * lambda) + (ewma * (1 - lambda));
                }
                return ewma;
            },

            /**
             * Calculates ACWR for a specific athlete
             * @param {Array} records - All load records
             * @param {String} athleteId - Target athlete
             * @returns {Object} { acute, chronic, ratio }
             */
            calculateAthleteACWR: (records, athleteId) => {
                // Filter and sort records by date
                const athleteRecords = records
                    .filter(r => r.athleteId === athleteId)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                if (athleteRecords.length === 0) return { acute: 0, chronic: 0, ratio: 0 };

                // Map to daily loads (handles multiple sessions per day)
                const dailyLoadsMap = athleteRecords.reduce((acc, r) => {
                    const date = r.date.split('T')[0];
                    const load = r.sRPE || 0;
                    acc[date] = (acc[date] || 0) + load;
                    return acc;
                }, {});

                // Fill gaps for missing days (essential for EWMA decay)
                const dates = Object.keys(dailyLoadsMap).sort();
                const startDate = new Date(dates[0]);
                const endDate = new Date(dates[dates.length - 1]);
                const dailyLoads = [];

                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    dailyLoads.push(dailyLoadsMap[dateStr] || 0);
                }

                // EWMA for Acute (7 days) and Chronic (28 days)
                const acute = ACWR_UTILS.calculateEWMA(dailyLoads, 7);
                const chronic = ACWR_UTILS.calculateEWMA(dailyLoads, 28);
                const ratio = chronic > 0 ? (acute / chronic) : 0;

                return {
                    acute: Math.round(acute),
                    chronic: Math.round(chronic),
                    ratio: parseFloat(ratio.toFixed(2))
                };
            },

            /**
             * Determines the status and color based on ACWR ratio
             * @param {Number} ratio 
             * @returns {Object} { label, color, status }
             */
            getRatioStatus: (ratio) => {
                if (ratio === 0) return { label: 'No Data', color: 'text-slate-400', bg: 'bg-slate-100', status: 'neutral' };
                if (ratio < 0.8) return { label: 'Undertrained', color: 'text-blue-500', bg: 'bg-blue-50', status: 'warning' };
                if (ratio >= 0.8 && ratio <= 1.3) return { label: 'Optimal', color: 'text-emerald-500', bg: 'bg-emerald-50', status: 'success' };
                if (ratio > 1.3 && ratio <= 1.5) return { label: 'Overreaching', color: 'text-amber-500', bg: 'bg-amber-50', status: 'warning' };
                return { label: 'Danger Zone', color: 'text-rose-500', bg: 'bg-rose-50', status: 'danger' };
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