/**
 * wellnessScoring.ts — Evidence-based athlete readiness composite
 *
 * Algorithm: Hooper Index dimensions + z-score normalization + weighted composite.
 * Research: research/WELLNESS-SCORING-RESEARCH.md
 *
 * Output: 0–10 scale (10 = excellent readiness, 0 = critical)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AthleteBaseline {
    // mean and SD per metric (computed from athlete's last 28d of responses)
    fatigue:      { mean: number; sd: number; n: number };
    soreness:     { mean: number; sd: number; n: number };
    stress:       { mean: number; sd: number; n: number };
    sleep_quality:{ mean: number; sd: number; n: number };
    mood:         { mean: number; sd: number; n: number };
    sleep_hours_score: { mean: number; sd: number; n: number };
}

// ── Sleep hours: piecewise curve (elite athlete optimum 8–9h) ─────────────────
// Based on: Mah et al. 2011, Fullagar et al. 2015
// Non-linear — 5h is not merely "2 units worse" than 7h, it compounds.

export function scoreSleepHours(hours: number): number {
    if (!hours || hours <= 0) return 5; // no data → neutral
    if (hours < 5)  return 1;
    if (hours < 6)  return 1 + (hours - 5) * 2;       // 1 → 3
    if (hours < 7)  return 3 + (hours - 6) * 3;       // 3 → 6
    if (hours < 8)  return 6 + (hours - 7) * 2;       // 6 → 8
    if (hours <= 9) return 8 + (hours - 8) * 2;       // 8 → 10 (optimal)
    if (hours <= 10) return 10 - (hours - 9) * 1;     // 10 → 9 (diminishing)
    return 8.5; // >10h often compensatory after deprivation
}

// ── Compute per-athlete baseline from their historical responses ───────────────
// Requires an array of raw response JSONB objects (resp.responses field).
// Used in heatmap to normalize each day relative to that athlete's baseline.

function meanSd(values: number[]): { mean: number; sd: number; n: number } {
    const n = values.length;
    if (n === 0) return { mean: 5, sd: 1, n: 0 };
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const sd = n < 2 ? 1 : Math.sqrt(values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / (n - 1));
    return { mean, sd: Math.max(sd, 0.5), n }; // min SD 0.5 to avoid division explosion
}

export function computeAthleteBaseline(responseObjects: Record<string, any>[]): AthleteBaseline {
    const collect = (key: string) =>
        responseObjects.map(r => r[key]).filter(v => typeof v === 'number' && v >= 1 && v <= 10) as number[];

    const hoursRaw = responseObjects
        .map(r => r['sleep_hours'])
        .filter(v => typeof v === 'number' && v > 0) as number[];

    return {
        fatigue:           meanSd(collect('fatigue')),
        soreness:          meanSd(collect('soreness')),
        stress:            meanSd(collect('stress')),
        sleep_quality:     meanSd(collect('sleep_quality')),
        mood:              meanSd(collect('mood')),
        sleep_hours_score: meanSd(hoursRaw.map(scoreSleepHours)),
    };
}

// ── Main composite ─────────────────────────────────────────────────────────────
// Weights (must sum to 1.0):
//   sleep_quality 25% — strongest predictor of recovery (RESTQ-Sport, Fullagar)
//   fatigue       20% — direct performance correlation (Hooper)
//   soreness      15% — DOMS signal (Hooper)
//   stress        15% — autonomic/psychosocial load (Hooper)
//   mood          15% — ancillary but validated (Hooper, POMS)
//   sleep_hours   10% — partially captured by quality; lower weight avoids double-counting

const WEIGHTS = {
    sleep_quality:     0.25,
    fatigue:           0.20,
    soreness:          0.15,
    stress:            0.15,
    mood:              0.15,
    sleep_hours_score: 0.10,
};

const MIN_BASELINE_N = 3; // minimum responses needed to use z-score normalization

export function computeComposite(
    resp: Record<string, any>,
    baseline?: AthleteBaseline,
): number | null {
    const fat = resp['fatigue'];
    const sor = resp['soreness'];
    const str = resp['stress'];
    const slq = resp['sleep_quality'];
    const mod = resp['mood'];
    const slh = resp['sleep_hours'];

    // Need at least sleep_quality or fatigue to produce a meaningful score
    const hasCoreData = (typeof slq === 'number' || typeof fat === 'number');
    if (!hasCoreData) return null;

    const slhScore = typeof slh === 'number' && slh > 0 ? scoreSleepHours(slh) : null;

    const useBaseline = baseline &&
        baseline.fatigue.n >= MIN_BASELINE_N &&
        baseline.sleep_quality.n >= MIN_BASELINE_N;

    let composite: number;

    if (useBaseline) {
        // Z-score normalization relative to athlete's own baseline
        // Negative metrics (high = bad): inverted z — deviation above mean is worse
        const zFat = typeof fat === 'number'
            ? (baseline!.fatigue.mean - fat) / baseline!.fatigue.sd : 0;
        const zSor = typeof sor === 'number'
            ? (baseline!.soreness.mean - sor) / baseline!.soreness.sd : 0;
        const zStr = typeof str === 'number'
            ? (baseline!.stress.mean - str) / baseline!.stress.sd : 0;
        // Positive metrics (high = good): normal z
        const zSlq = typeof slq === 'number'
            ? (slq - baseline!.sleep_quality.mean) / baseline!.sleep_quality.sd : 0;
        const zMod = typeof mod === 'number'
            ? (mod - baseline!.mood.mean) / baseline!.mood.sd : 0;
        const zSlh = slhScore !== null
            ? (slhScore - baseline!.sleep_hours_score.mean) / baseline!.sleep_hours_score.sd : 0;

        const weightedZ =
            WEIGHTS.sleep_quality     * zSlq +
            WEIGHTS.fatigue           * zFat +
            WEIGHTS.soreness          * zSor +
            WEIGHTS.stress            * zStr +
            WEIGHTS.mood              * zMod +
            WEIGHTS.sleep_hours_score * zSlh;

        // Map z-score composite to 0–10 (centre = 5, ±2.5 SD spans full range)
        composite = 5 + 2 * weightedZ;
    } else {
        // Fallback: weighted raw score (no baseline yet)
        // Negative metrics inverted: 10 - val → higher = better
        const rawFat = typeof fat === 'number' ? (10 - fat) : 5;
        const rawSor = typeof sor === 'number' ? (10 - sor) : 5;
        const rawStr = typeof str === 'number' ? (10 - str) : 5;
        const rawSlq = typeof slq === 'number' ? slq : 5;
        const rawMod = typeof mod === 'number' ? mod : 5;
        const rawSlh = slhScore ?? 5;

        composite =
            WEIGHTS.sleep_quality     * rawSlq +
            WEIGHTS.fatigue           * rawFat +
            WEIGHTS.soreness          * rawSor +
            WEIGHTS.stress            * rawStr +
            WEIGHTS.mood              * rawMod +
            WEIGHTS.sleep_hours_score * rawSlh;
    }

    // ── Hard modifiers — clinical status overrides self-report ────────────────
    const avail = resp['availability'];
    const complaint = resp['health_complaint'];
    const illnessSeverity = resp['illness_severity'];

    // Availability cap (cannot be "ready" if not available)
    if (avail === 'unavailable_match' || avail === 'unavailable_training') {
        composite = Math.min(composite, 4.5);
    } else if (avail === 'modified') {
        composite = Math.min(composite, 7.5);
    }

    // Health complaint penalty
    if (complaint === 'both') {
        composite -= 1.5;
    } else if (complaint === 'injury') {
        composite -= 0.5;
    } else if (complaint === 'illness') {
        if (illnessSeverity === 'severe')   composite -= 1.2;
        else if (illnessSeverity === 'moderate') composite -= 0.7;
        else composite -= 0.3; // mild or unknown
    }

    return Math.max(0, Math.min(10, composite));
}

// ── Color scale ───────────────────────────────────────────────────────────────

export function scoreToColor(score: number | null): string {
    if (score === null) return 'bg-slate-100';
    if (score >= 8.5) return 'bg-emerald-500';
    if (score >= 7.0) return 'bg-emerald-400';
    if (score >= 6.0) return 'bg-lime-300';
    if (score >= 5.0) return 'bg-yellow-300';
    if (score >= 4.0) return 'bg-amber-400';
    if (score >= 3.0) return 'bg-orange-400';
    return 'bg-rose-500';
}

// Hex version for non-Tailwind contexts (e.g. dashboard dot inline styles)
export function scoreToHex(score: number | null): string {
    if (score === null) return '#e2e8f0'; // slate-200
    if (score >= 8.5) return '#10b981'; // emerald-500
    if (score >= 7.0) return '#34d399'; // emerald-400
    if (score >= 6.0) return '#a3e635'; // lime-400
    if (score >= 5.0) return '#fde047'; // yellow-300
    if (score >= 4.0) return '#fb923c'; // amber-400 (orange-ish)
    if (score >= 3.0) return '#f97316'; // orange-500
    return '#f43f5e'; // rose-500
}
