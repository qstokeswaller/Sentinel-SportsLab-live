// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════
// CSV Import Schemas — Universal field definitions + fuzzy matching
// Used by SmartCsvMapper across all import sections
// ═══════════════════════════════════════════════════════════════════════

export interface CsvField {
    id: string;
    label: string;
    aliases: string[];
    required?: boolean;
    group: string;
    description?: string;
    type?: 'number' | 'string' | 'date';
}

export interface CsvImportSchema {
    id: string;
    name: string;
    description: string;
    accentColor: string;
    fields: CsvField[];
}

// ═══════════════════════════════════════════════════════════════════════
// Shared date normaliser — handles all common CSV date formats
// ═══════════════════════════════════════════════════════════════════════

export function normaliseDate(s: string): string {
    const today = new Date().toISOString().split('T')[0];
    if (!s) return today;
    const raw = s.trim();
    if (!raw) return today;

    // Excel serial number: 5-digit int in plausible range (~1982–2065)
    if (/^\d{5}$/.test(raw)) {
        const serial = parseInt(raw, 10);
        if (serial > 30000 && serial < 60000) {
            const d = new Date((serial - 25569) * 86400000);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
    }

    // ISO / YYYY-MM-DD (with optional time component)
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

    // Numeric with separator: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, DD.MM.YYYY, 2-digit years
    const numDate = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
    if (numDate) {
        const [, p1, p2, yr] = numDate;
        const n1 = parseInt(p1, 10), n2 = parseInt(p2, 10);
        // Disambiguate: first > 12 → must be DD/MM; second > 12 → must be MM/DD; otherwise assume DD/MM
        let day: string, month: string;
        if (n1 > 12)      { day = p1; month = p2; }
        else if (n2 > 12) { day = p2; month = p1; }
        else              { day = p1; month = p2; }
        const fullYear = yr.length === 2 ? (parseInt(yr, 10) < 50 ? `20${yr}` : `19${yr}`) : yr;
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Month-name formats: "29 Apr 2026", "29-Apr-2026", "Apr 29, 2026", "April 29 2026"
    const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const dayFirst = raw.match(/^(\d{1,2})[\s\-]+([a-zA-Z]{3,9})[\s\-,]+(\d{4})/);
    if (dayFirst) {
        const mi = MONTHS.findIndex(m => dayFirst[2].toLowerCase().startsWith(m));
        if (mi >= 0) return `${dayFirst[3]}-${String(mi + 1).padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}`;
    }
    const monFirst = raw.match(/^([a-zA-Z]{3,9})[\s\-,]+(\d{1,2})[\s\-,]+(\d{4})/);
    if (monFirst) {
        const mi = MONTHS.findIndex(m => monFirst[1].toLowerCase().startsWith(m));
        if (mi >= 0) return `${monFirst[3]}-${String(mi + 1).padStart(2, '0')}-${monFirst[2].padStart(2, '0')}`;
    }

    // Fallback: JS Date parser
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

    return today;
}

// ═══════════════════════════════════════════════════════════════════════
// Fuzzy matching engine
// ═══════════════════════════════════════════════════════════════════════

/**
 * Score a single CSV header against a list of known aliases.
 * Three matching strategies (best score wins):
 *   1. Exact match after normalisation → 1.0
 *   2. Substring containment → length ratio (catches "Average Left Force (N)" vs "average left")
 *   3. Word-overlap (order-independent) → matched words / alias words
 *      (catches "Left Peak Force" vs "peak left", "Force Right Avg" vs "avg right")
 */
export function fuzzyMatch(csvHeader: string, aliases: string[]): number {
    const normalise = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, ' ');
    const h = normalise(csvHeader);
    const hWords = h.split(' ').filter(Boolean);

    let best = 0;
    for (const alias of aliases) {
        const a = normalise(alias);

        // Strategy 1: exact match
        if (h === a) return 1.0;

        // Strategy 2: substring containment
        if (h.includes(a) || a.includes(h)) {
            const score = Math.min(h.length, a.length) / Math.max(h.length, a.length);
            if (score > best) best = score;
        }

        // Strategy 3: word-overlap (order-independent)
        const aWords = a.split(' ').filter(Boolean);
        if (aWords.length > 0) {
            let matched = 0;
            for (const aw of aWords) {
                // Check if the alias word appears in any header word (partial word match too)
                if (hWords.some(hw => hw === aw || hw.includes(aw) || aw.includes(hw))) matched++;
            }
            const wordScore = matched / aWords.length;
            // Penalise slightly if header has many extra words (noise)
            const noisePenalty = aWords.length / Math.max(aWords.length, hWords.length);
            const adjusted = wordScore * (0.6 + 0.4 * noisePenalty);
            if (adjusted > best) best = adjusted;
        }
    }
    return best;
}

/**
 * Auto-map CSV headers to schema fields using fuzzy matching.
 * Returns a mapping of fieldId → { csvColumn, confidence }.
 * Three passes: exact (1.0), high (≥0.8), medium (>0.4).
 */
export function autoMapHeaders(
    headers: string[],
    schema: CsvImportSchema
): Record<string, { csvColumn: string; confidence: number }> {
    const mapping: Record<string, { csvColumn: string; confidence: number }> = {};
    const used = new Set<string>();

    // Pass 1: exact matches
    for (const field of schema.fields) {
        for (const header of headers) {
            if (used.has(header)) continue;
            if (fuzzyMatch(header, field.aliases) === 1.0) {
                mapping[field.id] = { csvColumn: header, confidence: 1.0 };
                used.add(header);
                break;
            }
        }
    }

    // Pass 2: high confidence (≥0.8)
    for (const field of schema.fields) {
        if (mapping[field.id]) continue;
        let best = { header: '', score: 0 };
        for (const header of headers) {
            if (used.has(header)) continue;
            const score = fuzzyMatch(header, field.aliases);
            if (score >= 0.8 && score > best.score) best = { header, score };
        }
        if (best.header) {
            mapping[field.id] = { csvColumn: best.header, confidence: best.score };
            used.add(best.header);
        }
    }

    // Pass 3: medium confidence (>0.4)
    for (const field of schema.fields) {
        if (mapping[field.id]) continue;
        let best = { header: '', score: 0 };
        for (const header of headers) {
            if (used.has(header)) continue;
            const score = fuzzyMatch(header, field.aliases);
            if (score > 0.4 && score > best.score) best = { header, score };
        }
        if (best.header) {
            mapping[field.id] = { csvColumn: best.header, confidence: best.score };
            used.add(best.header);
        }
    }

    return mapping;
}

// ═══════════════════════════════════════════════════════════════════════
// ACWR Training Load — method-dependent schema
// ═══════════════════════════════════════════════════════════════════════

const IDENTITY_FIELDS: CsvField[] = [
    {
        id: 'athlete', label: 'Player / Athlete Name', required: true, group: 'Identity', type: 'string',
        aliases: [
            'player', 'athlete', 'name', 'player name', 'athlete name', 'full name',
            'athlete_name', 'player_name', 'full_name', 'surname', 'first name',
            'staff', 'member', 'participant',
        ],
    },
    {
        id: 'date', label: 'Date', required: false, group: 'Identity', type: 'date',
        aliases: [
            'date', 'day', 'session date', 'training date', 'match date',
            'session_date', 'training_date', 'match_date', 'workout_date',
            'workout date', 'activity date', 'event date',
        ],
    },
    {
        id: 'session_type', label: 'Session Type', required: false, group: 'Session', type: 'string',
        aliases: ['type', 'session type', 'session_type', 'activity type', 'activity_type', 'activity', 'category'],
    },
];

const ACWR_METHOD_CONFIGS: Record<string, { name: string; fields: CsvField[] }> = {
    srpe: {
        name: 'ACWR Training Load — Session RPE',
        fields: [
            {
                id: 'rpe', label: 'RPE Rating (1–10)', required: false, group: 'Load Data', type: 'number',
                aliases: ['rpe', 'session_rpe', 'srpe_rating', 'rating', 'rpe_value', 'perceived_exertion', 'rpe rating', 'session rpe', 'borg'],
            },
            {
                id: 'duration', label: 'Duration (min)', required: false, group: 'Load Data', type: 'number',
                aliases: ['duration', 'duration_min', 'minutes', 'session_duration', 'time', 'total_time', 'session duration', 'duration (min)', 'training time'],
            },
            {
                id: 'srpe', label: 'sRPE / Load Value (direct)', required: false, group: 'Load Data', type: 'number',
                description: 'Pre-computed sRPE. If present, overrides RPE × Duration.',
                aliases: [
                    'load', 'srpe', 'session load', 'training load', 'session_load', 'training_load',
                    'srpe_value', 's-rpe', 'session rpe load', 'daily load', 'total load',
                    'au', 'arbitrary units', 'load (au)', 'load au',
                ],
            },
        ],
    },
    sprint_distance: {
        name: 'ACWR Training Load — Sprint Distance',
        fields: [
            {
                id: 'value', label: 'Sprint Distance (m)', required: true, group: 'Load Data', type: 'number',
                aliases: [
                    'sprint_distance', 'sprint_dist', 'sprint distance', 'sprint distance (m)', 'vhsr', 'vhsr distance',
                    'vhsr_distance', 'very high speed running', 'sprint', 'sprinting distance', 'sprint dist (m)',
                    'high speed running distance', 'high speed running', 'hsr distance', 'hsr', 'hsr (m)',
                    'sprint distance total', 'total sprint distance', 'sprint metres', 'sprint meters',
                    'distance sprinting', 'high speed dist', 'high speed distance',
                ],
            },
        ],
    },
    total_distance: {
        name: 'ACWR Training Load — Total Distance',
        fields: [
            {
                id: 'value', label: 'Total Distance (m)', required: true, group: 'Load Data', type: 'number',
                aliases: [
                    'total_distance', 'total distance', 'distance', 'distance (m)', 'total distance (m)', 'meters',
                    'total dist', 'td', 'total_dist', 'distance covered', 'total metres', 'total meters',
                    'distance total', 'session distance', 'match distance', 'training distance', 'distance m',
                    'total distance covered', 'metres covered', 'meters covered', 'odometer',
                ],
            },
        ],
    },
    tonnage: {
        name: 'ACWR Training Load — Tonnage',
        fields: [
            {
                id: 'value', label: 'Tonnage (kg)', required: true, group: 'Load Data', type: 'number',
                aliases: [
                    'tonnage', 'total_tonnage', 'volume', 'volume_load', 'total tonnage', 'total volume',
                    'load (kg)', 'training volume', 'volume load', 'tonnage (kg)', 'total load',
                    'session tonnage', 'session volume', 'weight moved', 'total weight', 'volume kg',
                    'training load kg', 'lifting volume', 'total lifting volume',
                ],
            },
        ],
    },
    duration: {
        name: 'ACWR Training Load — Duration',
        fields: [
            {
                id: 'value', label: 'Training Duration (min)', required: true, group: 'Load Data', type: 'number',
                aliases: [
                    'duration', 'duration_min', 'minutes', 'session_duration', 'time', 'total_time',
                    'training time', 'session time', 'session duration', 'duration (min)', 'total duration',
                    'training duration', 'duration minutes', 'session length', 'time (min)', 'mins',
                    'total minutes', 'elapsed time', 'active time', 'practice duration', 'match duration',
                ],
            },
        ],
    },
    trimp: {
        name: 'ACWR Training Load — TRIMP',
        fields: [
            {
                id: 'value', label: 'TRIMP (AU)', required: true, group: 'Load Data', type: 'number',
                aliases: [
                    'trimp', 'trimp (au)', 'training_impulse', 'training impulse', 'hr_load', 'heart rate load',
                    'hr load', 'trimp score', 'trimp value', 'training impulse score', 'hr training load',
                    'heart rate training load', 'hr based load', 'cardiac load', 'hr impulse',
                ],
            },
        ],
    },
    player_load: {
        name: 'ACWR Training Load — Player Load',
        fields: [
            {
                id: 'value', label: 'Player Load (AU)', required: true, group: 'Load Data', type: 'number',
                aliases: [
                    'player_load', 'playerload', 'player load', 'player load (au)', 'body load', 'pl',
                    'total player load', 'accumulated player load', 'body_load', 'accelerometer load',
                    'accel load', 'tri axial load', 'triaxial load', 'inertial load',
                    'total body load', 'cumulative player load', 'player load total',
                ],
            },
        ],
    },
};

export function getAcwrSchema(method: string): CsvImportSchema {
    const config = ACWR_METHOD_CONFIGS[method] || ACWR_METHOD_CONFIGS.srpe;
    return {
        id: `acwr_${method}`,
        name: config.name,
        description: `Import training load data for ACWR monitoring`,
        accentColor: 'indigo',
        fields: [...IDENTITY_FIELDS, ...config.fields],
    };
}

// ═══════════════════════════════════════════════════════════════════════
// Heart Rate Monitoring Schema
// ═══════════════════════════════════════════════════════════════════════

export const HR_SCHEMA: CsvImportSchema = {
    id: 'hr_data',
    name: 'Heart Rate Monitoring Data',
    description: 'Import HR session data from Polar, Garmin, Catapult, FirstBeat, etc.',
    accentColor: 'rose',
    fields: [
        {
            id: 'athlete', label: 'Athlete Name', required: false, group: 'Identity', type: 'string',
            aliases: ['athlete', 'player', 'name', 'athlete_name', 'player_name', 'full name', 'full_name', 'player name'],
        },
        {
            id: 'date', label: 'Date', required: false, group: 'Identity', type: 'date',
            aliases: ['date', 'session_date', 'timestamp', 'day', 'activity_date'],
        },
        {
            id: 'session', label: 'Session Name', required: false, group: 'Identity', type: 'string',
            aliases: ['session', 'session_name', 'session_type', 'activity', 'type', 'activity_name', 'activity name', 'session name'],
        },
        {
            id: 'avg_hr', label: 'Avg Heart Rate (bpm)', required: false, group: 'Heart Rate', type: 'number',
            description: 'At least one of Avg HR or Max HR is needed.',
            aliases: [
                'avg_hr', 'average_hr', 'avg_heart_rate', 'mean_hr', 'avghr', 'average heart rate', 'avg hr',
                'hr avg', 'avg hr (bpm)', 'average hr (bpm)', 'mean heart rate', 'hr average', 'heart rate avg',
                'heart rate average', 'average bpm', 'avg bpm', 'mean bpm', 'average heart rate (bpm)',
                'avg heart rate bpm', 'hr mean',
            ],
        },
        {
            id: 'max_hr', label: 'Max Heart Rate (bpm)', required: false, group: 'Heart Rate', type: 'number',
            aliases: [
                'max_hr', 'peak_hr', 'max_heart_rate', 'maxhr', 'maximum heart rate', 'max hr', 'peak hr',
                'max hr (bpm)', 'peak heart rate', 'maximum hr', 'hr max', 'hr peak', 'heart rate max',
                'heart rate peak', 'max bpm', 'peak bpm', 'highest hr', 'highest heart rate',
                'maximum heart rate (bpm)', 'max heart rate bpm',
            ],
        },
        {
            id: 'min_hr', label: 'Min / Resting HR (bpm)', required: false, group: 'Heart Rate', type: 'number',
            aliases: [
                'min_hr', 'resting_hr', 'rest_hr', 'minhr', 'minimum hr', 'resting heart rate', 'min hr',
                'rest hr', 'minimum heart rate', 'hr min', 'lowest hr', 'lowest heart rate', 'hr resting',
                'heart rate min', 'heart rate resting', 'min bpm', 'resting bpm', 'baseline hr',
            ],
        },
        {
            id: 'duration', label: 'Duration (min)', required: false, group: 'Session', type: 'number',
            aliases: ['duration', 'session_duration', 'time', 'total_time', 'duration_min', 'minutes', 'session time', 'duration (min)'],
        },
        {
            id: 'trimp', label: 'TRIMP (AU)', required: false, group: 'Load', type: 'number',
            aliases: ['trimp', 'training_impulse', 'trimp (au)', 'training impulse'],
        },
        {
            id: 'calories', label: 'Calories (kcal)', required: false, group: 'Load', type: 'number',
            aliases: ['calories', 'kcal', 'energy', 'cal', 'calories (kcal)', 'energy expenditure'],
        },
        {
            id: 'z1', label: 'Zone 1 Time', required: false, group: 'HR Zones', type: 'number',
            aliases: ['z1', 'zone_1', 'zone1', 'time_z1', 'zone 1', 'hr zone 1', 'hr_zone_1', 'time in zone 1'],
        },
        {
            id: 'z2', label: 'Zone 2 Time', required: false, group: 'HR Zones', type: 'number',
            aliases: ['z2', 'zone_2', 'zone2', 'time_z2', 'zone 2', 'hr zone 2', 'hr_zone_2', 'time in zone 2'],
        },
        {
            id: 'z3', label: 'Zone 3 Time', required: false, group: 'HR Zones', type: 'number',
            aliases: ['z3', 'zone_3', 'zone3', 'time_z3', 'zone 3', 'hr zone 3', 'hr_zone_3', 'time in zone 3'],
        },
        {
            id: 'z4', label: 'Zone 4 Time', required: false, group: 'HR Zones', type: 'number',
            aliases: ['z4', 'zone_4', 'zone4', 'time_z4', 'zone 4', 'hr zone 4', 'hr_zone_4', 'time in zone 4'],
        },
        {
            id: 'z5', label: 'Zone 5 Time', required: false, group: 'HR Zones', type: 'number',
            aliases: ['z5', 'zone_5', 'zone5', 'time_z5', 'zone 5', 'hr zone 5', 'hr_zone_5', 'time in zone 5'],
        },
        {
            id: 'recovery_hr', label: 'Recovery HR (bpm)', required: false, group: 'Recovery', type: 'number',
            aliases: ['recovery_hr', 'hrr', 'hr_recovery', 'recovery', 'recovery heart rate', 'hr recovery'],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════════
// Hamstring / NordBord Schema — handles single + multi-attempt formats
// ═══════════════════════════════════════════════════════════════════════

export const HAMSTRING_SCHEMA: CsvImportSchema = {
    id: 'hamstring',
    name: 'Hamstring / NordBord Force Data',
    description: 'Import Nordic hamstring strength test data — single or multi-attempt format.',
    accentColor: 'orange',
    fields: [
        {
            id: 'athlete', label: 'Athlete Name', required: true, group: 'Identity', type: 'string',
            aliases: ['name', 'athlete', 'player', 'athlete_name', 'player_name', 'full name', 'surname', 'full_name', 'player name'],
        },
        {
            id: 'date', label: 'Test Date', required: false, group: 'Identity', type: 'date',
            aliases: ['date', 'test_date', 'assessment_date', 'day', 'session_date', 'test date'],
        },
        // ── Simple format (single left/right values) ──
        {
            id: 'left', label: 'Left Force (N)', required: false, group: 'Force', type: 'number',
            description: 'Single left value — used when only one result per leg.',
            aliases: [
                'left', 'left_force', 'left (n)', 'left_n', 'l_force', 'left force', 'l', 'left_peak', 'left peak',
                'force left', 'left leg', 'left (N)', 'left force (n)', 'left newton', 'left newtons',
                'force production left', 'left limb', 'left side', 'left hamstring', 'left nordic',
            ],
        },
        {
            id: 'right', label: 'Right Force (N)', required: false, group: 'Force', type: 'number',
            description: 'Single right value — used when only one result per leg.',
            aliases: [
                'right', 'right_force', 'right (n)', 'right_n', 'r_force', 'right force', 'r', 'right_peak', 'right peak',
                'force right', 'right leg', 'right (N)', 'right force (n)', 'right newton', 'right newtons',
                'force production right', 'right limb', 'right side', 'right hamstring', 'right nordic',
            ],
        },
        // ── Multi-attempt format ──
        {
            id: 'rep1_left', label: 'Rep 1 Left (N)', required: false, group: 'Attempts', type: 'number',
            aliases: [
                'rep 1 left', 'rep1_left', 'attempt 1 left', 'trial 1 left', 'r1 left', 'r1l',
                'rep 1 left (n)', 'attempt_1_left', 'rep1 left', 'trial1 left', '1 left', 'rep 1 l',
                'left rep 1', 'left attempt 1', 'left trial 1', 'left 1', 'rep1 left force',
                'attempt 1 left force', 'trial 1 left force', 'first rep left', 'first attempt left',
            ],
        },
        {
            id: 'rep1_right', label: 'Rep 1 Right (N)', required: false, group: 'Attempts', type: 'number',
            aliases: [
                'rep 1 right', 'rep1_right', 'attempt 1 right', 'trial 1 right', 'r1 right', 'r1r',
                'rep 1 right (n)', 'attempt_1_right', 'rep1 right', 'trial1 right', '1 right', 'rep 1 r',
                'right rep 1', 'right attempt 1', 'right trial 1', 'right 1', 'rep1 right force',
                'attempt 1 right force', 'trial 1 right force', 'first rep right', 'first attempt right',
            ],
        },
        {
            id: 'rep2_left', label: 'Rep 2 Left (N)', required: false, group: 'Attempts', type: 'number',
            aliases: [
                'rep 2 left', 'rep2_left', 'attempt 2 left', 'trial 2 left', 'r2 left', 'r2l',
                'rep 2 left (n)', 'attempt_2_left', 'rep2 left', 'trial2 left', '2 left', 'rep 2 l',
                'left rep 2', 'left attempt 2', 'left trial 2', 'left 2', 'second rep left', 'second attempt left',
            ],
        },
        {
            id: 'rep2_right', label: 'Rep 2 Right (N)', required: false, group: 'Attempts', type: 'number',
            aliases: [
                'rep 2 right', 'rep2_right', 'attempt 2 right', 'trial 2 right', 'r2 right', 'r2r',
                'rep 2 right (n)', 'attempt_2_right', 'rep2 right', 'trial2 right', '2 right', 'rep 2 r',
                'right rep 2', 'right attempt 2', 'right trial 2', 'right 2', 'second rep right', 'second attempt right',
            ],
        },
        {
            id: 'rep3_left', label: 'Rep 3 Left (N)', required: false, group: 'Attempts', type: 'number',
            aliases: [
                'rep 3 left', 'rep3_left', 'attempt 3 left', 'trial 3 left', 'r3 left', 'r3l',
                'rep 3 left (n)', 'attempt_3_left', 'rep3 left', 'trial3 left', '3 left', 'rep 3 l',
                'left rep 3', 'left attempt 3', 'left trial 3', 'left 3', 'third rep left', 'third attempt left',
            ],
        },
        {
            id: 'rep3_right', label: 'Rep 3 Right (N)', required: false, group: 'Attempts', type: 'number',
            aliases: [
                'rep 3 right', 'rep3_right', 'attempt 3 right', 'trial 3 right', 'r3 right', 'r3r',
                'rep 3 right (n)', 'attempt_3_right', 'rep3 right', 'trial3 right', '3 right', 'rep 3 r',
                'right rep 3', 'right attempt 3', 'right trial 3', 'right 3', 'third rep right', 'third attempt right',
            ],
        },
        // ── Summary fields (peak / average across attempts) ──
        {
            id: 'max_left', label: 'Peak Left (N)', required: false, group: 'Summary', type: 'number',
            aliases: [
                'max left', 'peak left', 'max_left', 'peak_left', 'best left', 'max left (n)', 'peak left (n)',
                'maximum left', 'highest left', 'left max', 'left peak', 'left best', 'left maximum',
                'peak force left', 'max force left', 'left peak force', 'left max force',
                'maximum left force', 'peak left force (n)', 'best left force',
            ],
        },
        {
            id: 'max_right', label: 'Peak Right (N)', required: false, group: 'Summary', type: 'number',
            aliases: [
                'max right', 'peak right', 'max_right', 'peak_right', 'best right', 'max right (n)', 'peak right (n)',
                'maximum right', 'highest right', 'right max', 'right peak', 'right best', 'right maximum',
                'peak force right', 'max force right', 'right peak force', 'right max force',
                'maximum right force', 'peak right force (n)', 'best right force',
            ],
        },
        {
            id: 'avg_left', label: 'Average Left (N)', required: false, group: 'Summary', type: 'number',
            aliases: [
                'avg left', 'average left', 'mean left', 'avg_left', 'average_left', 'avg left (n)', 'mean left (n)',
                'left avg', 'left average', 'left mean', 'average left force', 'avg left force',
                'mean left force', 'left average force', 'left avg force', 'left mean force',
                'average force left', 'mean force left',
            ],
        },
        {
            id: 'avg_right', label: 'Average Right (N)', required: false, group: 'Summary', type: 'number',
            aliases: [
                'avg right', 'average right', 'mean right', 'avg_right', 'average_right', 'avg right (n)', 'mean right (n)',
                'right avg', 'right average', 'right mean', 'average right force', 'avg right force',
                'mean right force', 'right average force', 'right avg force', 'right mean force',
                'average force right', 'mean force right',
            ],
        },
        {
            id: 'body_weight', label: 'Body Weight (kg)', required: false, group: 'Anthropometry', type: 'number',
            aliases: [
                'body weight', 'bw', 'weight', 'body_weight', 'mass', 'body mass', 'weight (kg)',
                'body weight (kg)', 'bodyweight', 'athlete weight', 'player weight', 'kg',
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════════
// InBody Scan Schema — LookinBody CSV export format
// ═══════════════════════════════════════════════════════════════════════

export const INBODY_SCHEMA: CsvImportSchema = {
    id: 'inbody',
    name: 'InBody Scan Data',
    description: 'Import InBody body composition data from LookinBody CSV export.',
    accentColor: 'indigo',
    fields: [
        {
            id: 'athlete', label: 'Athlete Name', required: true, group: 'Identity', type: 'string',
            aliases: ['name', 'athlete', 'player', 'id', 'athlete_name', 'player_name', 'full name', 'subject'],
        },
        {
            id: 'date', label: 'Scan Date', required: false, group: 'Identity', type: 'date',
            aliases: ['date', 'test_date', 'scan_date', 'time', 'datetime', 'date/time'],
        },
        // Primary
        {
            id: 'weight', label: 'Weight (kg)', required: true, group: 'Primary', type: 'number',
            aliases: ['weight', 'weight (kg)', 'body weight', 'mass', 'wt'],
        },
        {
            id: 'smm', label: 'Skeletal Muscle Mass (kg)', required: true, group: 'Primary', type: 'number',
            aliases: ['smm', 'skeletal muscle mass', 'smm (kg)', 'skeletal muscle', 'muscle mass'],
        },
        {
            id: 'bfm', label: 'Body Fat Mass (kg)', required: true, group: 'Primary', type: 'number',
            aliases: ['bfm', 'body fat mass', 'bfm (kg)', 'fat mass', 'body fat mass (kg)'],
        },
        {
            id: 'pbf', label: 'Percent Body Fat (%)', required: true, group: 'Primary', type: 'number',
            aliases: ['pbf', 'percent body fat', 'pbf (%)', 'body fat %', 'body fat percentage', 'bf%', 'fat %'],
        },
        {
            id: 'tbw', label: 'Total Body Water (L)', required: false, group: 'Primary', type: 'number',
            aliases: ['tbw', 'total body water', 'tbw (l)', 'total water', 'body water'],
        },
        {
            id: 'ecw_tbw', label: 'ECW/TBW Ratio', required: false, group: 'Primary', type: 'number',
            aliases: ['ecw/tbw', 'ecw_tbw', 'ecw ratio', 'ecw/tbw ratio'],
        },
        {
            id: 'phase_angle', label: 'Phase Angle (°)', required: false, group: 'Primary', type: 'number',
            aliases: ['phase angle', 'phaseangle', 'phase angle (°)', 'pa'],
        },
        {
            id: 'inbody_score', label: 'InBody Score', required: false, group: 'Primary', type: 'number',
            aliases: ['inbody score', 'inbodyscore', 'score', 'ib score'],
        },
        // Segmental Lean
        {
            id: 'lean_ra', label: 'Lean — Right Arm (kg)', required: false, group: 'Segmental Lean', type: 'number',
            aliases: ['ra lean', 'right arm lean', 'ra_leanmass', 'lean ra', 'ra lean mass', 'right arm lean mass'],
        },
        {
            id: 'lean_la', label: 'Lean — Left Arm (kg)', required: false, group: 'Segmental Lean', type: 'number',
            aliases: ['la lean', 'left arm lean', 'la_leanmass', 'lean la', 'la lean mass', 'left arm lean mass'],
        },
        {
            id: 'lean_tr', label: 'Lean — Trunk (kg)', required: false, group: 'Segmental Lean', type: 'number',
            aliases: ['tr lean', 'trunk lean', 'tr_leanmass', 'lean tr', 'trunk lean mass'],
        },
        {
            id: 'lean_rl', label: 'Lean — Right Leg (kg)', required: false, group: 'Segmental Lean', type: 'number',
            aliases: ['rl lean', 'right leg lean', 'rl_leanmass', 'lean rl', 'right leg lean mass'],
        },
        {
            id: 'lean_ll', label: 'Lean — Left Leg (kg)', required: false, group: 'Segmental Lean', type: 'number',
            aliases: ['ll lean', 'left leg lean', 'll_leanmass', 'lean ll', 'left leg lean mass'],
        },
        // Segmental Fat
        {
            id: 'fat_ra', label: 'Fat — Right Arm (kg)', required: false, group: 'Segmental Fat', type: 'number',
            aliases: ['ra fat', 'right arm fat', 'ra_fatmass', 'fat ra', 'ra fat mass'],
        },
        {
            id: 'fat_la', label: 'Fat — Left Arm (kg)', required: false, group: 'Segmental Fat', type: 'number',
            aliases: ['la fat', 'left arm fat', 'la_fatmass', 'fat la', 'la fat mass'],
        },
        {
            id: 'fat_tr', label: 'Fat — Trunk (kg)', required: false, group: 'Segmental Fat', type: 'number',
            aliases: ['tr fat', 'trunk fat', 'tr_fatmass', 'fat tr', 'trunk fat mass'],
        },
        {
            id: 'fat_rl', label: 'Fat — Right Leg (kg)', required: false, group: 'Segmental Fat', type: 'number',
            aliases: ['rl fat', 'right leg fat', 'rl_fatmass', 'fat rl', 'right leg fat mass'],
        },
        {
            id: 'fat_ll', label: 'Fat — Left Leg (kg)', required: false, group: 'Segmental Fat', type: 'number',
            aliases: ['ll fat', 'left leg fat', 'll_fatmass', 'fat ll', 'left leg fat mass'],
        },
        // Advanced
        {
            id: 'icw', label: 'Intracellular Water (L)', required: false, group: 'Advanced', type: 'number',
            aliases: ['icw', 'intracellular water', 'icw (l)'],
        },
        {
            id: 'ecw', label: 'Extracellular Water (L)', required: false, group: 'Advanced', type: 'number',
            aliases: ['ecw', 'extracellular water', 'ecw (l)'],
        },
        {
            id: 'lbm', label: 'Lean Body Mass (kg)', required: false, group: 'Advanced', type: 'number',
            aliases: ['lbm', 'lean body mass', 'lbm (kg)', 'lean mass'],
        },
        {
            id: 'ffm', label: 'Fat-Free Mass (kg)', required: false, group: 'Advanced', type: 'number',
            aliases: ['ffm', 'fat free mass', 'ffm (kg)', 'fat-free mass'],
        },
        {
            id: 'bmr', label: 'Basal Metabolic Rate (kcal)', required: false, group: 'Advanced', type: 'number',
            aliases: ['bmr', 'basal metabolic rate', 'bmr (kcal)', 'resting metabolic rate'],
        },
        {
            id: 'vfl', label: 'Visceral Fat Level', required: false, group: 'Advanced', type: 'number',
            aliases: ['vfl', 'visceral fat', 'visceral fat level', 'visceral fat area'],
        },
        {
            id: 'protein', label: 'Protein (kg)', required: false, group: 'Advanced', type: 'number',
            aliases: ['protein', 'protein (kg)', 'protein mass'],
        },
        {
            id: 'minerals', label: 'Minerals (kg)', required: false, group: 'Advanced', type: 'number',
            aliases: ['minerals', 'mineral', 'minerals (kg)', 'mineral content'],
        },
        {
            id: 'bmi', label: 'BMI (kg/m²)', required: false, group: 'Advanced', type: 'number',
            aliases: ['bmi', 'body mass index', 'bmi (kg/m²)'],
        },
    ],
};
