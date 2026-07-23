// ─────────────────────────────────────────────────────────────────────────────
// Sports-Science Toolkit — pure calculators
//
// Every function here is deterministic and free of React/UI/state so the maths
// can be reasoned about (and unit-tested) in isolation. Units are annotated on
// each function. The Toolkit UI (components/performance/PerformanceLab.tsx) is a
// thin shell over these.
// ─────────────────────────────────────────────────────────────────────────────

/** Round to the nearest achievable increment (e.g. 2.5 kg plates). */
export function roundToNearest(n: number, step: number): number {
    if (!step) return Math.round(n);
    return Math.round(n / step) * step;
}

// ─── 1RM ESTIMATION ──────────────────────────────────────────────────────────
// Seven validated rep-max equations, averaged. Single-formula estimates carry
// meaningful error, so practitioners average across formulas. Valid ~2–10 reps.
// Ref: LeSuer et al. (1997); NSCA training-load chart.

export interface OneRmEstimates {
    epley: number; brzycki: number; lombardi: number; lander: number;
    oconnor: number; mayhew: number; wathan: number; average: number;
}

export function estimate1RM(weight: number, reps: number): OneRmEstimates | null {
    const w = Number(weight);
    const r = Number(reps);
    if (!w || !r || w <= 0 || r <= 0) return null;

    const round = (n: number) => Math.round(n * 10) / 10;
    if (r === 1) {
        return { epley: w, brzycki: w, lombardi: w, lander: w, oconnor: w, mayhew: w, wathan: w, average: w };
    }

    const epley = w * (1 + r / 30);
    const brzycki = r < 37 ? w * (36 / (37 - r)) : NaN;
    const lombardi = w * Math.pow(r, 0.10);
    const lander = w * (100 / (101.3 - 2.67123 * r));
    const oconnor = w * (1 + r / 40);
    const mayhew = w * (100 / (52.2 + 41.9 * Math.exp(-0.055 * r)));
    const wathan = w * (100 / (48.8 + 53.8 * Math.exp(-0.075 * r)));

    const all = [epley, brzycki, lombardi, lander, oconnor, mayhew, wathan].filter(v => isFinite(v) && v > 0);
    const average = all.reduce((a, b) => a + b, 0) / all.length;

    return {
        epley: round(epley), brzycki: round(brzycki), lombardi: round(lombardi),
        lander: round(lander), oconnor: round(oconnor), mayhew: round(mayhew),
        wathan: round(wathan), average: round(average),
    };
}

// %1RM → typical max reps (NSCA training-load chart).
export const PERCENT_TO_REPS: { pct: number; reps: number }[] = [
    { pct: 100, reps: 1 }, { pct: 95, reps: 2 }, { pct: 93, reps: 3 },
    { pct: 90, reps: 4 }, { pct: 87, reps: 5 }, { pct: 85, reps: 6 },
    { pct: 83, reps: 7 }, { pct: 80, reps: 8 }, { pct: 77, reps: 9 },
    { pct: 75, reps: 10 }, { pct: 70, reps: 11 }, { pct: 67, reps: 12 },
];

export interface PercentRow { pct: number; load: number; reps: number | null; }

/** Build a %1RM load table from a known/estimated 1RM (100% → 50%, 5% steps). */
export function percentTable(oneRm: number, rounding = 2.5): PercentRow[] {
    const orm = Number(oneRm);
    if (!orm || orm <= 0) return [];
    const rows: PercentRow[] = [];
    for (let pct = 100; pct >= 50; pct -= 5) {
        const match = PERCENT_TO_REPS.find(x => x.pct <= pct);
        rows.push({ pct, load: roundToNearest(orm * (pct / 100), rounding), reps: match ? match.reps : null });
    }
    return rows;
}

// ─── RPE / RIR → LOAD ─────────────────────────────────────────────────────────
// Autoregulation. RIR = 10 − RPE; the load is what lets you hit `reps` at that
// RPE. %1RM taken from the Epley-inverse of reps-to-failure so it's continuous.
// Ref: Zourdos et al. (2016) RIR-based RPE scale.

export interface RpeLoadResult { rir: number; repsToFailure: number; pct: number; load: number; }

export function rpeLoad(oneRm: number, reps: number, rpe: number, rounding = 2.5): RpeLoadResult | null {
    const orm = Number(oneRm);
    const rp = Number(reps);
    const e = Number(rpe);
    if (!orm || !rp || !e || e < 1 || e > 10 || rp <= 0) return null;
    const rir = Math.max(0, 10 - e);
    const repsToFailure = rp + rir;
    const frac = 1 / (1 + repsToFailure / 30); // Epley inverse → fraction of 1RM
    return {
        rir,
        repsToFailure,
        pct: Math.round(frac * 1000) / 10,
        load: roundToNearest(orm * frac, rounding),
    };
}

// ─── PLATE LOADER ─────────────────────────────────────────────────────────────
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export interface PlateResult {
    perSide: { plate: number; count: number }[];
    barWeight: number;
    loadedTotal: number;   // actual total the plates achieve
    shortfall: number;     // kg still missing vs. the target (0 if exact)
    achievable: boolean;
}

/** Greedy plates-per-side breakdown for a target barbell weight. */
export function plateBreakdown(target: number, bar = 20, plates = DEFAULT_PLATES_KG): PlateResult | null {
    const t = Number(target);
    const b = Number(bar);
    if (!t || t <= 0) return null;
    if (t < b) return { perSide: [], barWeight: b, loadedTotal: b, shortfall: 0, achievable: false };

    let remaining = (t - b) / 2; // per side
    const perSide: { plate: number; count: number }[] = [];
    for (const p of [...plates].sort((a, c) => c - a)) {
        const count = Math.floor(remaining / p + 1e-9);
        if (count > 0) {
            perSide.push({ plate: p, count });
            remaining = +(remaining - count * p).toFixed(4);
        }
    }
    const loadedPerSide = (t - b) / 2 - remaining;
    return {
        perSide,
        barWeight: b,
        loadedTotal: +(b + loadedPerSide * 2).toFixed(2),
        shortfall: +(remaining * 2).toFixed(2),
        achievable: remaining < 1e-6,
    };
}

// ─── WARM-UP RAMP ─────────────────────────────────────────────────────────────
export interface WarmupSet { label: string; pct: number | null; load: number; reps: number | null; }

/** General-prep warm-up progression up to a working weight. */
export function warmupRamp(workingWeight: number, bar = 20, rounding = 2.5): WarmupSet[] {
    const w = Number(workingWeight);
    const b = Number(bar);
    if (!w || w <= b) return [];
    const steps: { label: string; pct: number | null; reps: number | null }[] = [
        { label: 'Empty bar', pct: null, reps: 8 },
        { label: '40%', pct: 40, reps: 5 },
        { label: '55%', pct: 55, reps: 5 },
        { label: '70%', pct: 70, reps: 3 },
        { label: '85%', pct: 85, reps: 2 },
        { label: 'Working weight', pct: 100, reps: null },
    ];
    return steps.map(s => ({
        label: s.label,
        pct: s.pct,
        load: s.pct == null ? b : roundToNearest(w * (s.pct / 100), rounding),
        reps: s.reps,
    }));
}

// ─── SPEED / PACE ─────────────────────────────────────────────────────────────
export const METRES_PER_MILE = 1609.344;

export function msToKmh(ms: number): number { return +(ms * 3.6).toFixed(2); }
export function msToMph(ms: number): number { return +(ms / 0.44704).toFixed(2); }

/** metres/second → "m:ss" pace per km. */
export function msToPacePerKm(ms: number): string | null {
    if (!ms || ms <= 0) return null;
    const secPerKm = 1000 / ms;
    const m = Math.floor(secPerKm / 60);
    const s = Math.round(secPerKm % 60);
    return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

/** metres/second → "m:ss" pace per mile. */
export function msToPacePerMile(ms: number): string | null {
    if (!ms || ms <= 0) return null;
    const secPerMi = METRES_PER_MILE / ms;
    const m = Math.floor(secPerMi / 60);
    const s = Math.round(secPerMi % 60);
    return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Parse "m:ss" (or "mm:ss") pace into metres/second. `perMile` interprets per-mile. */
export function paceToMs(pace: string, perMile = false): number | null {
    const m = String(pace).trim().match(/^(\d{1,2}):(\d{1,2})$/);
    if (!m) return null;
    const secs = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    if (!secs) return null;
    return +((perMile ? METRES_PER_MILE : 1000) / secs).toFixed(3);
}

export type SpeedUnit = 'ms' | 'kmh' | 'mph' | 'pace_km' | 'pace_mi';

export interface SpeedConversion { ms: number; kmh: number; mph: number; paceKm: string | null; paceMi: string | null; }

/** Convert a value in any supported unit into all others. */
export function convertSpeed(value: string, unit: SpeedUnit): SpeedConversion | null {
    let ms: number | null = null;
    if (unit === 'pace_km') ms = paceToMs(value, false);
    else if (unit === 'pace_mi') ms = paceToMs(value, true);
    else {
        const v = Number(value);
        if (!v || v <= 0) return null;
        if (unit === 'ms') ms = v;
        else if (unit === 'kmh') ms = v / 3.6;
        else if (unit === 'mph') ms = v * 0.44704;
    }
    if (!ms || ms <= 0) return null;
    return {
        ms: +ms.toFixed(2),
        kmh: msToKmh(ms),
        mph: msToMph(ms),
        paceKm: msToPacePerKm(ms),
        paceMi: msToPacePerMile(ms),
    };
}

// ─── MAS / ASR ────────────────────────────────────────────────────────────────
// MAS = lowest running speed that elicits VO2max. Derive from a max time-trial
// (distance ÷ time) or a field test. %MAS → running speed → pace + interval
// distance. ASR = MSS − MAS individualises supramaximal work.
// Ref: Baker (2011); Buchheit & Laursen (2013).

export function masFromTrial(distanceM: number, timeSec: number): number | null {
    const d = Number(distanceM);
    const t = Number(timeSec);
    if (!d || !t || d <= 0 || t <= 0) return null;
    return +(d / t).toFixed(2);
}

export interface MasPrescription {
    speedMs: number;
    speedKmh: number;
    pacePerKm: string | null;
    distanceM: number | null; // distance covered in the work interval, if given
    asr: number | null;       // MSS − MAS (m/s), if MSS supplied
    pctASR: number | null;    // where target speed sits in the ASR band (supramaximal only)
}

export function masPrescription(mas: number, pctMas: number, workSec?: number, mss?: number): MasPrescription | null {
    const m = Number(mas);
    const pct = Number(pctMas);
    if (!m || !pct || m <= 0) return null;
    const speed = m * (pct / 100); // m/s
    const w = Number(workSec);
    const M = Number(mss);
    let asr: number | null = null;
    let pctASR: number | null = null;
    if (M && M > m) {
        asr = +(M - m).toFixed(2);
        if (speed > m) pctASR = Math.round(((speed - m) / asr) * 100);
    }
    return {
        speedMs: +speed.toFixed(2),
        speedKmh: msToKmh(speed),
        pacePerKm: msToPacePerKm(speed),
        distanceM: w && w > 0 ? Math.round(speed * w) : null,
        asr,
        pctASR,
    };
}

// ─── HEART-RATE ZONES ─────────────────────────────────────────────────────────
// Tanaka HRmax = 208 − 0.7·age. Zones by %HRmax, or Karvonen (%heart-rate-reserve
// with resting HR). Ref: Tanaka et al. (2001); Karvonen (1957).

export function tanakaHrMax(age: number): number { return Math.round(208 - 0.7 * Number(age)); }

export interface HrZone { zone: number; name: string; lowPct: number; highPct: number; low: number; high: number; }

const HR_ZONE_DEFS = [
    { zone: 1, name: 'Recovery', low: 50, high: 60 },
    { zone: 2, name: 'Aerobic / Endurance', low: 60, high: 70 },
    { zone: 3, name: 'Tempo', low: 70, high: 80 },
    { zone: 4, name: 'Threshold', low: 80, high: 90 },
    { zone: 5, name: 'VO₂max / Anaerobic', low: 90, high: 100 },
];

export function hrZones(hrMax: number, method: 'max' | 'karvonen', hrRest = 60): HrZone[] {
    const max = Number(hrMax);
    const rest = Number(hrRest);
    if (!max || max <= 0) return [];
    const at = (pct: number) => method === 'karvonen' && rest > 0
        ? Math.round((max - rest) * (pct / 100) + rest)
        : Math.round(max * (pct / 100));
    return HR_ZONE_DEFS.map(z => ({
        zone: z.zone, name: z.name, lowPct: z.low, highPct: z.high, low: at(z.low), high: at(z.high),
    }));
}

// ─── MATURITY OFFSET (PHV) ────────────────────────────────────────────────────
// Predicts years-from-peak-height-velocity from anthropometry. APHV = age −
// offset. Most valid near PHV; less accurate at extremes.
// Ref: Mirwald et al. (2002).

export interface MaturityInput {
    sex: 'male' | 'female';
    ageYears: number;
    heightCm: number;
    sittingHeightCm: number;
    weightKg: number;
}

export interface MaturityResult {
    legLengthCm: number;
    maturityOffset: number; // years from PHV (negative = pre)
    aphv: number;           // predicted age at PHV
    status: string;
    statusTone: 'pre' | 'circa' | 'post';
}

export function maturityOffset(i: MaturityInput): MaturityResult | null {
    const age = Number(i.ageYears);
    const H = Number(i.heightCm);
    const S = Number(i.sittingHeightCm);
    const W = Number(i.weightKg);
    if (!age || !H || !S || !W || S >= H) return null;
    const L = H - S; // leg length

    let mo: number;
    if (i.sex === 'male') {
        mo = -9.236
            + 0.0002708 * (L * S)
            - 0.001663 * (age * L)
            + 0.007216 * (age * S)
            + 0.02292 * ((W / H) * 100);
    } else {
        mo = -9.376
            + 0.0001882 * (L * S)
            + 0.0022 * (age * L)
            + 0.005841 * (age * S)
            - 0.002658 * (age * W)
            + 0.07693 * ((W / H) * 100);
    }

    let status = 'Circa-PHV — peak growth window';
    let statusTone: 'pre' | 'circa' | 'post' = 'circa';
    if (mo < -1) { status = 'Pre-PHV'; statusTone = 'pre'; }
    else if (mo > 1) { status = 'Post-PHV'; statusTone = 'post'; }

    return {
        legLengthCm: +L.toFixed(1),
        maturityOffset: +mo.toFixed(2),
        aphv: +(age - mo).toFixed(1),
        status,
        statusTone,
    };
}
