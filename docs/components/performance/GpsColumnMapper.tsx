// @ts-nocheck
import React, { useState, useMemo } from 'react';
import {
    XIcon, CheckIcon, SaveIcon, UploadIcon, AlertTriangleIcon,
    SettingsIcon, SparklesIcon, UsersIcon, PlusIcon,
} from 'lucide-react';

/**
 * GPS Column Mapper — Smart CSV Import
 *
 * Flow:
 * 1. CSV uploaded → headers parsed
 * 2. Check if a saved profile matches these headers (per-team/group)
 *    a. Full match → auto-apply, skip mapper, import directly
 *    b. Partial match (new columns detected) → show anomaly prompt
 *    c. No match → show full mapper
 * 3. Sport scientist confirms/adjusts mapping
 * 4. Saves profile linked to a team/group for future auto-apply
 *
 * Supports providers: Catapult, STATSports, Polar, Playertek, Kinexon,
 * Firstbeat/Garmin, GPSports/SPI Pro, and generic CSVs.
 */

// ═══════════════════════════════════════════════════════════════════
// Platform fields — comprehensive list covering all major providers
// ═══════════════════════════════════════════════════════════════════

export const PLATFORM_FIELDS = [
    // ── Identification (required) ──
    { id: 'athlete_name', label: 'Athlete Name', required: true, group: 'Identity', description: 'Player / athlete identifier' },
    { id: 'date', label: 'Session Date', required: true, group: 'Identity', description: 'Date of the session' },
    { id: 'gps_pod_number', label: 'GPS Pod Number', required: false, group: 'Identity', description: 'Physical GPS device/pod number assigned to the player' },

    // ── Distance & Speed ──
    { id: 'total_distance', label: 'Total Distance (m)', required: false, group: 'Distance & Speed', description: 'Total metres covered' },
    { id: 'distance_per_min', label: 'Distance per Min (m/min)', required: false, group: 'Distance & Speed', description: 'Work rate / intensity proxy' },
    { id: 'max_speed', label: 'Max Speed (km/h)', required: false, group: 'Distance & Speed', description: 'Peak velocity during session' },
    { id: 'avg_speed', label: 'Avg Speed (km/h)', required: false, group: 'Distance & Speed', description: 'Mean velocity during session' },

    // ── High-Intensity Running ──
    { id: 'hsr', label: 'High Speed Running (m)', required: false, group: 'High Intensity', description: 'Metres above HSR threshold (typically >18-21 km/h)' },
    { id: 'sprint_distance', label: 'Sprint Distance (m)', required: false, group: 'High Intensity', description: 'Metres above sprint threshold (typically >21-25 km/h)' },
    { id: 'sprints', label: 'Sprint Count', required: false, group: 'High Intensity', description: 'Number of sprint efforts' },
    { id: 'hml_distance', label: 'High Metabolic Load Distance (m)', required: false, group: 'High Intensity', description: 'Distance at >25.5 W/kg metabolic power' },

    // ── Speed Zones ──
    { id: 'speed_zone_1', label: 'Speed Zone 1 Distance (m)', required: false, group: 'Speed Zones', description: 'Walking (0-6 km/h)' },
    { id: 'speed_zone_2', label: 'Speed Zone 2 Distance (m)', required: false, group: 'Speed Zones', description: 'Jogging (6-12 km/h)' },
    { id: 'speed_zone_3', label: 'Speed Zone 3 Distance (m)', required: false, group: 'Speed Zones', description: 'Running (12-18 km/h)' },
    { id: 'speed_zone_4', label: 'Speed Zone 4 Distance (m)', required: false, group: 'Speed Zones', description: 'High Speed (18-21 km/h)' },
    { id: 'speed_zone_5', label: 'Speed Zone 5 Distance (m)', required: false, group: 'Speed Zones', description: 'Sprinting (21-24 km/h)' },
    { id: 'speed_zone_6', label: 'Speed Zone 6 Distance (m)', required: false, group: 'Speed Zones', description: 'Max Sprint (24+ km/h)' },

    // ── Acceleration / Deceleration ──
    { id: 'accelerations', label: 'Accelerations', required: false, group: 'Accel / Decel', description: 'Total high acceleration efforts' },
    { id: 'decelerations', label: 'Decelerations', required: false, group: 'Accel / Decel', description: 'Total high deceleration efforts' },
    { id: 'max_acceleration', label: 'Max Acceleration (m/s²)', required: false, group: 'Accel / Decel', description: 'Peak acceleration recorded' },
    { id: 'max_deceleration', label: 'Max Deceleration (m/s²)', required: false, group: 'Accel / Decel', description: 'Peak deceleration recorded' },

    // ── Load Metrics ──
    { id: 'player_load', label: 'Player Load (AU)', required: false, group: 'Load', description: 'Catapult/Kinexon tri-axial accelerometer load' },
    { id: 'player_load_per_min', label: 'Player Load / Min (AU/min)', required: false, group: 'Load', description: 'Load intensity rate' },
    { id: 'dynamic_stress_load', label: 'Dynamic Stress Load (DSL)', required: false, group: 'Load', description: 'STATSports proprietary load metric' },
    { id: 'metabolic_power', label: 'Metabolic Power Avg (W/kg)', required: false, group: 'Load', description: 'Average metabolic power output' },
    { id: 'equivalent_distance', label: 'Equivalent Distance (m)', required: false, group: 'Load', description: 'Metabolic-adjusted distance (Catapult/Kinexon)' },

    // ── Heart Rate ──
    { id: 'heart_rate_avg', label: 'Avg Heart Rate (bpm)', required: false, group: 'Heart Rate', description: 'Average HR during session' },
    { id: 'heart_rate_max', label: 'Max Heart Rate (bpm)', required: false, group: 'Heart Rate', description: 'Peak HR during session' },
    { id: 'trimp', label: 'TRIMP (AU)', required: false, group: 'Heart Rate', description: 'Training impulse — HR zone-weighted duration' },
    { id: 'hr_exertion', label: 'HR Exertion (AU)', required: false, group: 'Heart Rate', description: 'Heart rate based exertion score' },
    { id: 'hr_zone_1', label: 'HR Zone 1 Time (s)', required: false, group: 'Heart Rate', description: '50-60% HRmax zone duration' },
    { id: 'hr_zone_2', label: 'HR Zone 2 Time (s)', required: false, group: 'Heart Rate', description: '60-70% HRmax zone duration' },
    { id: 'hr_zone_3', label: 'HR Zone 3 Time (s)', required: false, group: 'Heart Rate', description: '70-80% HRmax zone duration' },
    { id: 'hr_zone_4', label: 'HR Zone 4 Time (s)', required: false, group: 'Heart Rate', description: '80-90% HRmax zone duration' },
    { id: 'hr_zone_5', label: 'HR Zone 5 Time (s)', required: false, group: 'Heart Rate', description: '90-100% HRmax zone duration' },

    // ── Session Info ──
    { id: 'duration_minutes', label: 'Duration (min)', required: false, group: 'Session', description: 'Session duration in minutes' },
    { id: 'session_title', label: 'Session Title', required: false, group: 'Session', description: 'Name of the session or drill' },
    { id: 'session_type', label: 'Session Type', required: false, group: 'Session', description: 'Training / Match / Gym / Recovery' },
    { id: 'position', label: 'Position', required: false, group: 'Session', description: 'Playing position' },

    // ── Contact / Impact (Rugby, AFL, Combat) ──
    { id: 'impacts', label: 'Impacts / Collisions', required: false, group: 'Contact', description: 'Contact event count' },
    { id: 'rhie', label: 'Repeated High Intensity Efforts', required: false, group: 'Contact', description: 'RHIE count (Catapult)' },

    // ── IMA / Movement Analysis (Catapult) ──
    { id: 'ima_accel_high', label: 'IMA Accel High', required: false, group: 'IMA', description: 'High intensity acceleration events (Catapult)' },
    { id: 'ima_decel_high', label: 'IMA Decel High', required: false, group: 'IMA', description: 'High intensity deceleration events (Catapult)' },
    { id: 'ima_cod_left', label: 'IMA COD Left', required: false, group: 'IMA', description: 'Change of direction left (Catapult)' },
    { id: 'ima_cod_right', label: 'IMA COD Right', required: false, group: 'IMA', description: 'Change of direction right (Catapult)' },
    { id: 'jump_count', label: 'Jump Count', required: false, group: 'IMA', description: 'Total jumps detected' },

    // ── Recovery / Readiness (Firstbeat, Polar) ──
    { id: 'epoc', label: 'EPOC (ml/kg)', required: false, group: 'Recovery', description: 'Excess post-exercise oxygen consumption (Firstbeat)' },
    { id: 'training_effect_aerobic', label: 'Training Effect (Aerobic)', required: false, group: 'Recovery', description: 'Aerobic training effect score (Firstbeat)' },
    { id: 'training_effect_anaerobic', label: 'Training Effect (Anaerobic)', required: false, group: 'Recovery', description: 'Anaerobic training effect score (Firstbeat)' },
    { id: 'calories', label: 'Calories (kcal)', required: false, group: 'Recovery', description: 'Estimated energy expenditure' },
    { id: 'recovery_time_h', label: 'Recovery Time (h)', required: false, group: 'Recovery', description: 'Estimated recovery time in hours (Polar)' },

    // ── Polar-specific Load ──
    { id: 'polar_training_load', label: 'Training Load Score', required: false, group: 'Load', description: 'Polar HR-based training load score (≈ TRIMP)' },
    { id: 'polar_cardio_load', label: 'Cardio Load', required: false, group: 'Load', description: 'Polar cardio load metric' },
    { id: 'polar_muscle_load', label: 'Muscle Load', required: false, group: 'Load', description: 'Polar muscle load (≈ Player Load)' },

    // ── HRV (Polar, Firstbeat, Garmin) ──
    { id: 'hrv_rmssd', label: 'HRV RMSSD (ms)', required: false, group: 'HRV', description: 'Root mean square of successive RR differences' },
    { id: 'rr_min', label: 'RR Min (ms)', required: false, group: 'HRV', description: 'Minimum RR interval' },
    { id: 'rr_max', label: 'RR Max (ms)', required: false, group: 'HRV', description: 'Maximum RR interval' },
    { id: 'rr_avg', label: 'RR Avg (ms)', required: false, group: 'HRV', description: 'Average RR interval' },

    // ── Asymmetry (STATSports) ──
    { id: 'step_balance', label: 'Step Balance (%)', required: false, group: 'Asymmetry', description: 'Left/right ground contact asymmetry (STATSports)' },
];

// ═══════════════════════════════════════════════════════════════════
// Alias map — covers Catapult, STATSports, Polar, Playertek,
// Kinexon, Firstbeat, GPSports across all naming conventions
// ═══════════════════════════════════════════════════════════════════

export const ALIAS_MAP: Record<string, string[]> = {
    // Identity
    athlete_name: ['player', 'name', 'athlete', 'full name', 'first name', 'surname', 'player name', 'athlete name', 'player_name', 'playername', 'player id', 'jersey number'],
    date: ['date', 'session date', 'day', 'match date', 'session_date', 'activity date', 'start time', 'start date'],
    gps_pod_number: ['player number', 'pod number', 'gps pod', 'device number', 'unit number', 'pod id', 'gps number', 'device id', 'unit id', 'tag number', 'sensor number'],

    // Distance & Speed
    total_distance: ['total distance', 'distance', 'total distance (m)', 'total distance (km)', 'dist', 'distance (m)', 'meters', 'total dist', 'td', 'total_distance', 'totaldistance', 'distance covered', 'total distance covered', 'odometer'],
    distance_per_min: ['distance per min', 'm/min', 'dist/min', 'meters per minute', 'distance_per_min', 'work rate', 'distance per minute', 'distance per minute (m/min)', 'distance / min', 'distance / min [m/min]'],
    max_speed: ['top speed', 'max speed', 'velocity max', 'max speed (km/h)', 'max speed (m/s)', 'v max', 'vmax', 'peak speed', 'max velocity', 'max_speed', 'maximum speed', 'top speed (km/h)', 'peak velocity', 'max velocity (km/h)'],
    avg_speed: ['avg speed', 'average speed', 'avg speed (km/h)', 'average speed (km/h)', 'mean speed', 'average velocity'],

    // High Intensity
    hsr: ['hsr', 'high speed running', 'hsr (m)', 'high speed dist', 'high speed distance', 'hsr distance', 'hsr_distance', 'high_speed_running', 'high speed running (m)', 'hsr distance (m)', 'high speed running distance', 'high speed running distance (m)', 'hsd', 'high intensity running distance'],
    sprints: ['sprints', 'sprint count', 'sprinting', 'sprint_count', 'number of sprints', 'sprint efforts', 'no. sprints', 'total sprints', 'no of sprints'],
    hml_distance: ['hml distance', 'hml', 'high metabolic load distance', 'high metabolic load distance (m)', 'hmld', 'high metabolic power distance', 'hml distance (m)'],

    // Speed zones — extended with Polar long-form bracket names
    speed_zone_1: ['speed zone 1', 'speed zone 1 distance', 'speed zone 1 (m)', 'speed zone 1 distance (m)', 'velocity band 1 distance', 'velocity band 1 distance (m)', 'sz1', 'distance in speed zone 1', 'distance in speed zone 1 [m]'],
    speed_zone_2: ['speed zone 2', 'speed zone 2 distance', 'speed zone 2 (m)', 'speed zone 2 distance (m)', 'velocity band 2 distance', 'velocity band 2 distance (m)', 'sz2', 'distance in speed zone 2', 'distance in speed zone 2 [m]'],
    speed_zone_3: ['speed zone 3', 'speed zone 3 distance', 'speed zone 3 (m)', 'speed zone 3 distance (m)', 'velocity band 3 distance', 'velocity band 3 distance (m)', 'sz3', 'distance in speed zone 3', 'distance in speed zone 3 [m]'],
    speed_zone_4: ['speed zone 4', 'speed zone 4 distance', 'speed zone 4 (m)', 'speed zone 4 distance (m)', 'velocity band 4 distance', 'velocity band 4 distance (m)', 'sz4', 'distance in speed zone 4', 'distance in speed zone 4 [m]'],
    // Speed zone 5 = >25 km/h sprint zone — the ACWR load metric for sprint_distance method
    speed_zone_5: ['speed zone 5', 'speed zone 5 distance', 'speed zone 5 (m)', 'speed zone 5 distance (m)', 'velocity band 5 distance', 'velocity band 5 distance (m)', 'sz5', 'distance in speed zone 5', 'distance in speed zone 5 [m]'],
    speed_zone_6: ['speed zone 6', 'speed zone 6 distance', 'speed zone 6 (m)', 'speed zone 6 distance (m)', 'velocity band 6 distance', 'velocity band 6 distance (m)', 'sz6', 'distance in speed zone 6', 'distance in speed zone 6 [m]'],

    // Sprint distance — includes Polar speed zone 5 (>25 km/h) bracket format explicitly
    sprint_distance: ['sprint distance', 'sprint dist', 'sprint_distance', 'sprint distance (m)', 'very high speed running', 'vhsr', 'vhsr distance', 'vhsr (m)', 'distance in speed zone 5 [m] (25.00- km/h)', 'distance in speed zone 5 (25.00- km/h)'],

    // Acceleration / Deceleration — Polar uses "Number of accelerations (x - y m/s²)" for both
    // Positive ranges = accelerations, negative ranges = decelerations
    accelerations: ['accels', 'accelerations', 'accel', 'total accelerations', 'high accels', 'acc', 'accel count', 'total_accelerations', 'acceleration efforts', 'total accel efforts', 'number of accelerations (3.00 - 50.00 m/s²)', 'number of accelerations (2.00 - 2.99 m/s²)', 'number of accelerations (1.00 - 1.99 m/s²)', 'number of accelerations (0.50 - 0.99 m/s²)'],
    decelerations: ['decels', 'decelerations', 'decel', 'total decelerations', 'high decels', 'dec', 'decel count', 'total_decelerations', 'deceleration efforts', 'total decel efforts', 'number of accelerations (-50.00 - -3.00 m/s²)', 'number of accelerations (-2.99 - -2.00 m/s²)', 'number of accelerations (-1.99 - -1.00 m/s²)', 'number of accelerations (-0.99 - -0.50 m/s²)'],
    max_acceleration: ['max acceleration', 'max acceleration (m/s/s)', 'max accel', 'max acceleration (m/s²)', 'peak acceleration'],
    max_deceleration: ['max deceleration', 'max deceleration (m/s/s)', 'max decel', 'max deceleration (m/s²)', 'peak deceleration'],

    // Load — extended with Polar muscle load aliases
    player_load: ['player load', 'playerload', 'player_load', 'body load', 'pl', 'total player load', 'accumulated player load', 'player load (au)', 'total muscle load'],
    player_load_per_min: ['player load per min', 'pl/min', 'player load/min', 'player load per min (au/min)', 'playerload per min'],
    dynamic_stress_load: ['dynamic stress load', 'dsl', 'dynamic_stress_load', 'stress load'],
    metabolic_power: ['metabolic power', 'avg metabolic power', 'metabolic_power', 'mp', 'avg mp', 'metabolic power (w/kg)', 'metabolic power avg', 'metabolic power avg (w/kg)'],
    equivalent_distance: ['equivalent distance', 'equivalent distance (m)', 'eq distance', 'equiv dist', 'equivalent_distance'],

    // Polar-specific load metrics
    polar_training_load: ['training load score', 'training load', 'polar training load', 'training load (polar)', 'session training load'],
    polar_cardio_load: ['cardio load', 'cardiac load', 'polar cardio load'],
    polar_muscle_load: ['muscle load', 'polar muscle load'],

    // Heart Rate — extended with Polar bracket-format zone names
    heart_rate_avg: ['avg hr', 'average heart rate', 'hr avg', 'heart rate avg', 'avg_hr', 'mean hr', 'hr mean', 'average hr', 'avg hr (bpm)', 'average heart rate (bpm)', 'hr avg (bpm)'],
    heart_rate_max: ['max hr', 'maximum heart rate', 'hr max', 'heart rate max', 'max_hr', 'peak hr', 'peak heart rate', 'max hr (bpm)', 'maximum heart rate (bpm)'],
    trimp: ['trimp', 'trimp (au)', 'training load (trimp)', 'training impulse'],
    hr_exertion: ['hr exertion', 'hr exertion (au)', 'heart rate exertion', 'exertion'],
    hr_zone_1: ['hr zone 1', 'hr zone 1 time', 'hr zone 1 duration', 'hr zone 1 (s)', 'hr zone 1 time (s)', 'heart rate zone 1', 'time in hr zone 1', 'time in hr zone 1 (50 - 59 %)', 'time in hr zone 1 (50-59%)'],
    hr_zone_2: ['hr zone 2', 'hr zone 2 time', 'hr zone 2 duration', 'hr zone 2 (s)', 'hr zone 2 time (s)', 'heart rate zone 2', 'time in hr zone 2', 'time in hr zone 2 (60 - 69 %)', 'time in hr zone 2 (60-69%)'],
    hr_zone_3: ['hr zone 3', 'hr zone 3 time', 'hr zone 3 duration', 'hr zone 3 (s)', 'hr zone 3 time (s)', 'heart rate zone 3', 'time in hr zone 3', 'time in hr zone 3 (70 - 79 %)', 'time in hr zone 3 (70-79%)'],
    hr_zone_4: ['hr zone 4', 'hr zone 4 time', 'hr zone 4 duration', 'hr zone 4 (s)', 'hr zone 4 time (s)', 'heart rate zone 4', 'time in hr zone 4', 'time in hr zone 4 (80 - 89 %)', 'time in hr zone 4 (80-89%)'],
    hr_zone_5: ['hr zone 5', 'hr zone 5 time', 'hr zone 5 duration', 'hr zone 5 (s)', 'hr zone 5 time (s)', 'heart rate zone 5', 'time in hr zone 5', 'time in hr zone 5 (90 - 100 %)', 'time in hr zone 5 (90-100%)'],

    // Session — Polar uses "Phase name" for period/drill label
    duration_minutes: ['duration', 'duration (min)', 'time', 'session duration', 'minutes', 'session time', 'total time', 'drill duration', 'duration (s)', 'duration (hh:mm:ss)'],
    session_title: ['session', 'session title', 'session name', 'drill title', 'activity', 'period name', 'phase name'],
    session_type: ['session type', 'type', 'activity type'],
    position: ['position', 'position name', 'pos'],

    // Contact
    impacts: ['impacts', 'collisions', 'contact events', 'body impacts', 'total impacts', 'impact zone 1', 'impact count'],
    rhie: ['rhie', 'repeated high intensity efforts', 'repeated high-intensity efforts'],

    // IMA
    ima_accel_high: ['ima accel high', 'ima accel high (count)', 'ima acceleration high'],
    ima_decel_high: ['ima decel high', 'ima decel high (count)', 'ima deceleration high'],
    ima_cod_left: ['ima cod left', 'ima cod left (count)', 'ima change of direction left'],
    ima_cod_right: ['ima cod right', 'ima cod right (count)', 'ima change of direction right'],
    jump_count: ['jump count', 'jumps', 'jump count high', 'total jumps', 'jump count (count)'],

    // Recovery — extended with Polar recovery time
    epoc: ['epoc', 'epoc (ml/kg)', 'excess post-exercise oxygen consumption'],
    training_effect_aerobic: ['training effect', 'training effect (aerobic)', 'aerobic training effect', 'aerobic te'],
    training_effect_anaerobic: ['training effect (anaerobic)', 'anaerobic training effect', 'anaerobic te'],
    calories: ['calories', 'calories (kcal)', 'energy', 'energy (kcal)', 'cal'],
    recovery_time_h: ['recovery time', 'recovery time [h]', 'recovery time (h)', 'recovery hours', 'recommended recovery time'],

    // HRV — Polar, Firstbeat, Garmin
    hrv_rmssd: ['hrv', 'hrv (rmssd)', 'rmssd', 'hrv rmssd', 'heart rate variability', 'hrv score'],
    rr_min: ['min rr', 'min rr interval', 'rr min', 'minimum rr interval', 'rr min (ms)'],
    rr_max: ['max rr', 'max rr interval', 'rr max', 'maximum rr interval', 'rr max (ms)'],
    rr_avg: ['avg rr', 'avg rr interval', 'rr avg', 'average rr interval', 'rr avg (ms)', 'mean rr'],

    // Asymmetry
    step_balance: ['step balance', 'step balance (%)', 'step_balance', 'l/r balance', 'ground contact balance'],
};

// ═══════════════════════════════════════════════════════════════════
// Fuzzy matching
// ═══════════════════════════════════════════════════════════════════

export function fuzzyMatchHeader(csvHeader: string): { fieldId: string | null; confidence: number } {
    const h = csvHeader.toLowerCase().trim();
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const [fieldId, aliases] of Object.entries(ALIAS_MAP)) {
        for (const alias of aliases) {
            const a = alias.toLowerCase();
            if (h === a) return { fieldId, confidence: 1.0 };
            if (h.includes(a) || a.includes(h)) {
                const score = Math.min(h.length, a.length) / Math.max(h.length, a.length);
                if (score > bestScore) { bestScore = score; bestMatch = fieldId; }
            }
        }
    }

    return { fieldId: bestScore > 0.4 ? bestMatch : null, confidence: bestScore };
}

// ═══════════════════════════════════════════════════════════════════
// Profile matching — checks if incoming headers match a saved profile
// ═══════════════════════════════════════════════════════════════════

export interface GpsProfile {
    name: string;
    teamId: string;           // linked to a specific team/group
    teamName: string;         // display name
    provider?: string;        // e.g. "Catapult", "STATSports"
    mapping: Record<string, string>;  // { platformFieldId: csvColumnName }
    headerFingerprint: string[];      // sorted lowercase headers at time of save
}

export interface ProfileMatchResult {
    profile: GpsProfile;
    matchType: 'exact' | 'partial';
    newColumns: string[];      // CSV columns not in saved profile
    missingColumns: string[];  // Profile columns not in current CSV
}

/**
 * Try to match incoming CSV headers against saved profiles for a specific team.
 * Returns null if no match, or the best match result.
 */
export function findMatchingProfile(
    csvHeaders: string[],
    profiles: GpsProfile[],
    teamId?: string
): ProfileMatchResult | null {
    const normalised = csvHeaders.map(h => h.toLowerCase().trim()).sort();

    // Filter to profiles for this team first, then fall back to all profiles
    const candidates = teamId
        ? [...profiles.filter(p => p.teamId === teamId), ...profiles.filter(p => p.teamId !== teamId)]
        : profiles;

    for (const profile of candidates) {
        const fingerprint = (profile.headerFingerprint || []).map(h => h.toLowerCase().trim()).sort();
        if (fingerprint.length === 0) continue;

        const savedSet = new Set(fingerprint);
        const incomingSet = new Set(normalised);

        const newColumns = normalised.filter(h => !savedSet.has(h));
        const missingColumns = fingerprint.filter(h => !incomingSet.has(h));

        // Exact match = all saved headers present in incoming (new columns OK)
        if (missingColumns.length === 0 && newColumns.length === 0) {
            return { profile, matchType: 'exact', newColumns: [], missingColumns: [] };
        }

        // Partial match = most headers present (>80% overlap)
        const overlap = fingerprint.filter(h => incomingSet.has(h)).length;
        const overlapPct = overlap / fingerprint.length;
        if (overlapPct >= 0.8) {
            // Map new columns back to original casing
            const newOriginal = csvHeaders.filter(h => !savedSet.has(h.toLowerCase().trim()));
            const missingOriginal = (profile.headerFingerprint || []).filter(h => !incomingSet.has(h.toLowerCase().trim()));
            return { profile, matchType: newColumns.length > 0 ? 'partial' : 'exact', newColumns: newOriginal, missingColumns: missingOriginal };
        }
    }

    return null;
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

interface GpsColumnMapperProps {
    csvHeaders: string[];
    csvPreviewRows: Record<string, string>[];
    onConfirm: (mapping: Record<string, string>) => void;
    onCancel: () => void;
    savedProfiles: GpsProfile[];
    onSaveProfile: (profile: GpsProfile) => void;
    onDeleteProfile: (name: string) => void;
    teams: { id: string; name: string }[];
    preSelectedTeamId?: string;
    /** If set, component is in anomaly mode — showing only new columns from a partial profile match */
    anomalyMode?: { profile: GpsProfile; newColumns: string[]; missingColumns: string[] };
}

const FIELD_GROUPS = [...new Set(PLATFORM_FIELDS.map(f => f.group))];

const GpsColumnMapper: React.FC<GpsColumnMapperProps> = ({
    csvHeaders, csvPreviewRows, onConfirm, onCancel,
    savedProfiles, onSaveProfile, onDeleteProfile,
    teams, preSelectedTeamId, anomalyMode,
}) => {
    // Auto-generate initial mapping from fuzzy matching
    const autoMapping = useMemo(() => {
        const mapping: Record<string, { csvColumn: string; confidence: number }> = {};
        const usedCsvColumns = new Set<string>();

        // If anomaly mode with existing profile, start from that profile's mapping
        if (anomalyMode) {
            for (const [fieldId, csvCol] of Object.entries(anomalyMode.profile.mapping)) {
                const matched = csvHeaders.find(h => h.toLowerCase() === csvCol.toLowerCase());
                if (matched) {
                    mapping[fieldId] = { csvColumn: matched, confidence: 1.0 };
                    usedCsvColumns.add(matched);
                }
            }
        }

        // Fuzzy match remaining headers
        for (const header of csvHeaders) {
            if (usedCsvColumns.has(header)) continue;
            const { fieldId, confidence } = fuzzyMatchHeader(header);
            if (fieldId && confidence >= 0.8 && !mapping[fieldId]) {
                mapping[fieldId] = { csvColumn: header, confidence };
                usedCsvColumns.add(header);
            }
        }
        for (const header of csvHeaders) {
            if (usedCsvColumns.has(header)) continue;
            const { fieldId, confidence } = fuzzyMatchHeader(header);
            if (fieldId && !mapping[fieldId] && confidence > 0.4) {
                mapping[fieldId] = { csvColumn: header, confidence };
                usedCsvColumns.add(header);
            }
        }

        return mapping;
    }, [csvHeaders, anomalyMode]);

    const [mapping, setMapping] = useState<Record<string, string>>(() => {
        const m: Record<string, string> = {};
        for (const [fieldId, { csvColumn }] of Object.entries(autoMapping)) {
            m[fieldId] = csvColumn;
        }
        return m;
    });

    const [showSaveProfile, setShowSaveProfile] = useState(!anomalyMode); // auto-show save in first-time mode
    const [profileName, setProfileName] = useState(anomalyMode?.profile?.name || '');
    const [selectedTeamId, setSelectedTeamId] = useState(preSelectedTeamId || anomalyMode?.profile?.teamId || '');
    const [provider, setProvider] = useState(anomalyMode?.profile?.provider || '');
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
        // In anomaly mode, only expand groups with new unmapped columns
        if (anomalyMode) return new Set(['Identity']);
        return new Set(FIELD_GROUPS);
    });

    // Apply a saved profile
    const applyProfile = (profile: GpsProfile) => {
        const newMapping: Record<string, string> = {};
        for (const [fieldId, csvCol] of Object.entries(profile.mapping)) {
            const matched = csvHeaders.find(h => h.toLowerCase() === csvCol.toLowerCase());
            if (matched) newMapping[fieldId] = matched;
        }
        setMapping(newMapping);
        setProfileName(profile.name);
        setSelectedTeamId(profile.teamId);
        setProvider(profile.provider || '');
    };

    const updateMapping = (fieldId: string, csvColumn: string) => {
        setMapping(prev => {
            const next = { ...prev };
            if (!csvColumn) { delete next[fieldId]; }
            else {
                for (const key of Object.keys(next)) {
                    if (next[key] === csvColumn && key !== fieldId) delete next[key];
                }
                next[fieldId] = csvColumn;
            }
            return next;
        });
    };

    const toggleGroup = (group: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group); else next.add(group);
            return next;
        });
    };

    const mappedCount = Object.keys(mapping).length;
    const requiredMissing = PLATFORM_FIELDS.filter(f => f.required && !mapping[f.id]);
    const autoMatchCount = Object.keys(autoMapping).length;
    const unmappedCsvColumns = csvHeaders.filter(h => !Object.values(mapping).includes(h));
    const selectedTeam = teams.find(t => t.id === selectedTeamId);

    const handleConfirm = () => onConfirm(mapping);

    const handleSaveAndConfirm = () => {
        if (profileName.trim() && selectedTeamId) {
            onSaveProfile({
                name: profileName.trim(),
                teamId: selectedTeamId,
                teamName: selectedTeam?.name || selectedTeamId,
                provider: provider.trim() || undefined,
                mapping,
                headerFingerprint: csvHeaders.map(h => h.toLowerCase().trim()),
            });
        }
        onConfirm(mapping);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${anomalyMode ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                                {anomalyMode ? <AlertTriangleIcon size={18} /> : <SettingsIcon size={18} />}
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    {anomalyMode ? 'New Columns Detected' : 'Map CSV Columns'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {anomalyMode
                                        ? `${anomalyMode.newColumns.length} new column${anomalyMode.newColumns.length > 1 ? 's' : ''} found in "${anomalyMode.profile.name}" import. Map or skip them.`
                                        : `Auto-detected ${autoMatchCount} of ${csvHeaders.length} columns. Assign each to a platform field.`
                                    }
                                </p>
                            </div>
                        </div>
                        <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                            <XIcon size={18} className="text-slate-400" />
                        </button>
                    </div>

                    {/* Team + Provider selector (for saving profile) */}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <UsersIcon size={12} className="text-slate-400" />
                            <select
                                value={selectedTeamId}
                                onChange={e => setSelectedTeamId(e.target.value)}
                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 min-w-[140px]"
                            >
                                <option value="">Select team/group...</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <input
                            type="text"
                            value={provider}
                            onChange={e => setProvider(e.target.value)}
                            placeholder="Provider (e.g. Catapult, STATSports)"
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 w-48"
                        />
                        <input
                            type="text"
                            value={profileName}
                            onChange={e => setProfileName(e.target.value)}
                            placeholder="Profile name"
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 w-40"
                        />
                    </div>

                    {/* Existing profiles for this team */}
                    {savedProfiles.filter(p => !selectedTeamId || p.teamId === selectedTeamId).length > 0 && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Saved:</span>
                            {savedProfiles.filter(p => !selectedTeamId || p.teamId === selectedTeamId).map(p => (
                                <div key={p.name} className="flex items-center gap-1">
                                    <button
                                        onClick={() => applyProfile(p)}
                                        className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                                    >
                                        {p.name} <span className="text-slate-300">· {p.teamName}</span>
                                    </button>
                                    <button onClick={() => onDeleteProfile(p.name)} className="p-0.5 text-slate-300 hover:text-rose-500 transition-colors">
                                        <XIcon size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mapping Body — grouped by category */}
                <div className="flex-1 overflow-y-auto p-5 space-y-2">
                    {FIELD_GROUPS.map(group => {
                        const fields = PLATFORM_FIELDS.filter(f => f.group === group);
                        const expanded = expandedGroups.has(group);
                        const groupMappedCount = fields.filter(f => mapping[f.id]).length;
                        const hasRequired = fields.some(f => f.required && !mapping[f.id]);

                        return (
                            <div key={group} className="border border-slate-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => toggleGroup(group)}
                                    className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-slate-700">{group}</span>
                                        {hasRequired && <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">{groupMappedCount}/{fields.length} mapped</span>
                                </button>

                                {expanded && (
                                    <div className="divide-y divide-slate-50">
                                        {fields.map(field => {
                                            const currentCsv = mapping[field.id] || '';
                                            const auto = autoMapping[field.id];
                                            const isAutoMatched = auto && auto.csvColumn === currentCsv;
                                            const isMapped = !!currentCsv;
                                            // In anomaly mode, highlight new columns
                                            const isNewColumn = anomalyMode && currentCsv && anomalyMode.newColumns.some(c => c.toLowerCase() === currentCsv.toLowerCase());

                                            return (
                                                <div key={field.id} className={`flex items-center gap-3 px-4 py-2 transition-all ${
                                                    isNewColumn ? 'bg-amber-50/80' :
                                                    isMapped ? isAutoMatched ? 'bg-emerald-50/40' : 'bg-indigo-50/40'
                                                    : field.required ? 'bg-rose-50/40' : ''
                                                }`}>
                                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                                        isMapped ? 'bg-emerald-500' : field.required ? 'bg-rose-400' : 'bg-slate-200'
                                                    }`}>
                                                        {isMapped && <CheckIcon size={10} className="text-white" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs font-medium text-slate-900">{field.label}</span>
                                                            {field.required && <span className="text-[8px] font-bold text-rose-500 uppercase">Req</span>}
                                                            {isAutoMatched && <span className="text-[8px] font-bold text-emerald-500 uppercase flex items-center gap-0.5"><SparklesIcon size={7} />Auto</span>}
                                                            {isNewColumn && <span className="text-[8px] font-bold text-amber-500 uppercase">New</span>}
                                                        </div>
                                                    </div>

                                                    <select
                                                        value={currentCsv}
                                                        onChange={e => updateMapping(field.id, e.target.value)}
                                                        className={`bg-white border rounded-lg px-2.5 py-1.5 text-xs min-w-[180px] outline-none transition-all ${
                                                            isMapped ? 'border-emerald-300 text-slate-900' : 'border-slate-200 text-slate-400'
                                                        }`}
                                                    >
                                                        <option value="">— Skip —</option>
                                                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Unmapped CSV columns */}
                    {unmappedCsvColumns.length > 0 && (
                        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                                Skipped CSV Columns ({unmappedCsvColumns.length})
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {unmappedCsvColumns.map(col => (
                                    <span key={col} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-500">{col}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {csvPreviewRows.length > 0 && mappedCount > 0 && (
                        <div>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Preview</p>
                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            {Object.entries(mapping).slice(0, 8).map(([fieldId]) => (
                                                <th key={fieldId} className="px-2.5 py-1.5 text-[9px] font-semibold text-slate-500 uppercase whitespace-nowrap">
                                                    {PLATFORM_FIELDS.find(f => f.id === fieldId)?.label || fieldId}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {csvPreviewRows.slice(0, 3).map((row, i) => (
                                            <tr key={i} className="border-b border-slate-50">
                                                {Object.entries(mapping).slice(0, 8).map(([fieldId, csvCol]) => (
                                                    <td key={fieldId} className="px-2.5 py-1 text-[11px] text-slate-700 whitespace-nowrap">{row[csvCol] || '—'}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
                    <button onClick={onCancel} className="px-4 py-2.5 bg-white border border-slate-200 text-slate-500 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleConfirm}
                            disabled={requiredMissing.length > 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 text-sm font-medium rounded-xl transition-colors"
                        >
                            <UploadIcon size={14} />
                            Import Only
                        </button>
                        <button
                            onClick={handleSaveAndConfirm}
                            disabled={requiredMissing.length > 0 || !profileName.trim() || !selectedTeamId}
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors"
                        >
                            <SaveIcon size={14} />
                            {anomalyMode ? 'Update Profile & Import' : 'Save Profile & Import'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GpsColumnMapper;
