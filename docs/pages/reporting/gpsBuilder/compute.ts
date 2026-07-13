// GPS Chart Builder — compute engine.
// Pure functions that turn a GpsChartConfig + normalised GPS rows into
// recharts-ready data. No React, no I/O — so it's trivially testable and
// reused identically by the builder preview and saved dashboard tiles.

import type { GpsRow, GpsChartConfig, MetricDef, DateSpec, Aggregation } from './types';
import { GPS_CHART_COLORS, GPS_CATEGORY_COLORS } from './types';

/** Extract a unit hint from a column name like "Total distance [km]" → "km". */
export function extractUnit(col: string): string {
    const m = col?.match(/\[([^\]]+)\]/);
    return m ? m[1] : '';
}

/** Human label for a metric (uses the parent's column-label resolver). */
export function metricLabel(metric: MetricDef, colLabel: (k: string) => string): string {
    if (metric.kind === 'column') return metric.column ? colLabel(metric.column) : '';
    const n = colLabel(metric.numerator);
    const d = colLabel(metric.denominator);
    return metric.asPercent ? `${n} as % of ${d}` : `${n} ÷ ${d}`;
}

/** Unit to display on the value axis for a metric. */
export function metricUnit(metric: MetricDef): string {
    if (metric.kind === 'column') return extractUnit(metric.column);
    return metric.asPercent ? '%' : '';
}

// Length units → metres, so a ratio of two distance columns is unit-consistent
// even when a team's export mixes them (e.g. HSR in m ÷ total distance in km).
const LENGTH_TO_M: Record<string, number> = { m: 1, km: 1000, mi: 1609.34, yd: 0.9144, ft: 0.3048 };

/** Evaluate a metric on a single row. Returns null when data is missing/invalid. */
export function computeMetricValue(row: GpsRow, metric: MetricDef): number | null {
    const raw = row.rawColumns || {};
    if (metric.kind === 'column') {
        const v = parseFloat(raw[metric.column]);
        return isNaN(v) ? null : v;
    }
    let num = parseFloat(raw[metric.numerator]);
    let den = parseFloat(raw[metric.denominator]);
    if (isNaN(num) || isNaN(den) || den === 0) return null;
    // If both sides are lengths, normalise to metres so mixed m/km divide correctly.
    const nf = LENGTH_TO_M[extractUnit(metric.numerator).toLowerCase()];
    const df = LENGTH_TO_M[extractUnit(metric.denominator).toLowerCase()];
    if (nf && df) { num *= nf; den *= df; }
    const ratio = num / den;
    return metric.asPercent ? ratio * 100 : ratio;
}

/** Collapse a list of per-session values into one number. */
export function aggregate(values: number[], agg: Aggregation): number | null {
    if (values.length === 0) return null;
    switch (agg) {
        case 'sum': return values.reduce((s, v) => s + v, 0);
        case 'max': return Math.max(...values);
        case 'min': return Math.min(...values);
        case 'raw':
        case 'average':
        default: return values.reduce((s, v) => s + v, 0) / values.length;
    }
}

/**
 * Resolve a DateSpec into the concrete set of dates to include, given the
 * dates that actually have data (ascending). Rolling windows are anchored on
 * the latest available session date so they stay meaningful for imported /
 * historical datasets, not just "today".
 */
export function resolveDates(spec: DateSpec, availableDates: string[]): Set<string> {
    const sorted = [...availableDates].sort();
    if (sorted.length === 0) return new Set();
    const latest = sorted[sorted.length - 1];

    switch (spec.mode) {
        case 'single':
            return new Set([spec.date]);
        case 'range':
            return new Set(sorted.filter(d => d >= spec.start && d <= spec.end));
        case 'specific':
            return new Set(spec.dates);
        case 'relative': {
            if (spec.window === 'lastSession') return new Set([latest]);
            if (spec.window === 'lastN') {
                const n = Math.max(1, spec.n || 5);
                return new Set(sorted.slice(-n));
            }
            const days = spec.window === 'last7' ? 7 : spec.window === 'last14' ? 14 : spec.window === 'last90' ? 90 : 28;
            const anchor = new Date(latest + 'T12:00:00');
            const cutoff = new Date(anchor);
            cutoff.setDate(anchor.getDate() - (days - 1));
            const cutoffStr = cutoff.toISOString().split('T')[0];
            return new Set(sorted.filter(d => d >= cutoffStr && d <= latest));
        }
        default:
            return new Set();
    }
}

/** Filter rows to a team (by name) or all athletes. */
export function scopeRows(rows: GpsRow[], teamFilter: string, teams: any[]): GpsRow[] {
    if (teamFilter === 'All Athletes') return rows;
    const team = teams.find(t => t.name === teamFilter);
    if (!team) return [];
    const ids = new Set((team.players || []).map((p: any) => p.id));
    return rows.filter(r => ids.has(r.athleteId));
}

/** Display name for a row. */
function rowName(r: GpsRow): string {
    return r.matchedName || r.playerName || 'Unknown';
}

export interface SeriesDef { key: string; label: string; color: string; }
export interface ChartData {
    points: any[];                 // recharts data array
    series: SeriesDef[];           // y-dimensions to draw
    xKey: string;                  // category/x dataKey on each point
    unit: string;
    metricLabel: string;
    count: number;                 // athletes or dates represented
    stats: { avg: number | null; max: number | null; min: number | null; maxLabel?: string; minLabel?: string };
    empty: boolean;
}

type ExcludedPredicate = (athleteId: string, date: string) => boolean;

/**
 * The heart of the builder: config + rows → chart-ready data. Branches on
 * chartType/dimension to produce the right shape for the renderer.
 */
export function buildChartData(
    config: GpsChartConfig,
    allRows: GpsRow[],
    teams: any[],
    colLabel: (k: string) => string,
    isExcluded: ExcludedPredicate = () => false,
): ChartData {
    const rows = scopeRows(Array.isArray(allRows) ? allRows : [], config.teamFilter, teams);
    const label = metricLabel(config.metric, colLabel);
    const unit = metricUnit(config.metric);
    const empty: ChartData = { points: [], series: [], xKey: 'label', unit, metricLabel: label, count: 0, stats: { avg: null, max: null, min: null }, empty: true };

    // Dates that actually have data for the primary metric, within scope.
    const datesWithData = [...new Set(
        rows.filter(r => !isExcluded(r.athleteId, r.date) && computeMetricValue(r, config.metric) !== null).map(r => r.date)
    )].sort();
    const activeDates = resolveDates(config.dateSpec, datesWithData);
    const inWindow = (r: GpsRow) => activeDates.has(r.date) && !isExcluded(r.athleteId, r.date);

    // ── Stacked bar: series are seriesColumns, X is athletes (or single date) ──
    if (config.chartType === 'stackedBar' && config.seriesColumns?.length) {
        const cols = config.seriesColumns;
        const byAthlete = new Map<string, { name: string; sums: Record<string, number[]> }>();
        for (const r of rows) {
            if (!inWindow(r)) continue;
            if (!byAthlete.has(r.athleteId)) byAthlete.set(r.athleteId, { name: rowName(r), sums: {} });
            const entry = byAthlete.get(r.athleteId)!;
            for (const c of cols) {
                const v = parseFloat((r.rawColumns || {})[c]);
                if (isNaN(v)) continue;
                (entry.sums[c] ||= []).push(v);
            }
        }
        const points = [...byAthlete.values()].map(a => {
            const pt: any = { label: a.name.split(' ')[0] || a.name, fullName: a.name };
            for (const c of cols) pt[c] = aggregate(a.sums[c] || [], config.aggregation === 'raw' ? 'average' : config.aggregation) ?? 0;
            pt.__total = cols.reduce((s, c) => s + (pt[c] || 0), 0);
            return pt;
        });
        if (config.sort !== 'none') points.sort((a, b) => config.sort === 'desc' ? b.__total - a.__total : a.__total - b.__total);
        const series: SeriesDef[] = cols.map((c, i) => ({ key: c, label: colLabel(c), color: GPS_CHART_COLORS[i % GPS_CHART_COLORS.length] }));
        return { points, series, xKey: 'label', unit, metricLabel: label, count: points.length, stats: { avg: null, max: null, min: null }, empty: points.length === 0 };
    }

    // ── Pie: slices are seriesColumns (distribution) or athletes ───────────────
    if (config.chartType === 'pie') {
        if (config.seriesColumns?.length) {
            const cols = config.seriesColumns;
            const totals: Record<string, number> = {};
            for (const r of rows) {
                if (!inWindow(r)) continue;
                for (const c of cols) { const v = parseFloat((r.rawColumns || {})[c]); if (!isNaN(v)) totals[c] = (totals[c] || 0) + v; }
            }
            const points = cols.map((c, i) => ({ label: colLabel(c), value: parseFloat((totals[c] || 0).toFixed(2)), color: GPS_CHART_COLORS[i % GPS_CHART_COLORS.length] }))
                .filter(p => p.value > 0);
            return { points, series: [{ key: 'value', label, color: '#6366f1' }], xKey: 'label', unit, metricLabel: label, count: points.length, stats: { avg: null, max: null, min: null }, empty: points.length === 0 };
        }
        // slices = athletes, value = aggregated metric
        const per = aggregatePerAthlete(rows, config, inWindow);
        const points = per.map((a, i) => ({ label: a.name.split(' ')[0] || a.name, fullName: a.name, value: a.value, color: GPS_CHART_COLORS[i % GPS_CHART_COLORS.length] }));
        return { points, series: [{ key: 'value', label, color: '#6366f1' }], xKey: 'label', unit, metricLabel: label, count: points.length, stats: statsOf(per.map(a => a.value)), empty: points.length === 0 };
    }

    // ── Scatter: each athlete a point (x=metric, y=metricY2) ───────────────────
    if (config.chartType === 'scatter' && config.metricY2) {
        const label2 = metricLabel(config.metricY2, colLabel);
        const byA = new Map<string, { name: string; xs: number[]; ys: number[]; category?: string }>();
        for (const r of rows) {
            if (!inWindow(r)) continue;
            const x = computeMetricValue(r, config.metric);
            const y = computeMetricValue(r, config.metricY2!);
            if (x === null || y === null) continue;
            if (!byA.has(r.athleteId)) byA.set(r.athleteId, { name: rowName(r), xs: [], ys: [], category: r.category });
            const e = byA.get(r.athleteId)!; e.xs.push(x); e.ys.push(y);
        }
        const agg = config.aggregation === 'raw' ? 'average' : config.aggregation;
        const points = [...byA.values()].map(a => ({
            label: a.name, fullName: a.name, category: a.category || 'training',
            x: parseFloat((aggregate(a.xs, agg) ?? 0).toFixed(2)),
            y: parseFloat((aggregate(a.ys, agg) ?? 0).toFixed(2)),
        }));
        return { points, series: [{ key: 'y', label: label2, color: '#6366f1' }], xKey: 'x', unit, metricLabel: `${label} vs ${label2}`, count: points.length, stats: { avg: null, max: null, min: null }, empty: points.length === 0 };
    }

    // ── Trend over time (dimension = date) ─────────────────────────────────────
    if (config.dimension === 'date') {
        const dateMap = new Map<string, number[]>();
        for (const r of rows) {
            if (!inWindow(r)) continue;
            if (config.athleteId && r.athleteId !== config.athleteId) continue;
            const v = computeMetricValue(r, config.metric);
            if (v === null) continue;
            if (!dateMap.has(r.date)) dateMap.set(r.date, []);
            dateMap.get(r.date)!.push(v);
        }
        const dates = [...dateMap.keys()].sort();
        const points = dates.map(d => ({
            label: fmtDate(d), date: d,
            value: parseFloat((aggregate(dateMap.get(d)!, config.athleteId ? 'raw' : 'average') ?? 0).toFixed(2)),
        }));
        return { points, series: [{ key: 'value', label, color: '#6366f1' }], xKey: 'label', unit, metricLabel: label, count: points.length, stats: statsOf(points.map(p => p.value), points.map(p => p.label)), empty: points.length === 0 };
    }

    // ── Compare athletes (dimension = athlete) — bar / horizontalBar / line ────
    const per = aggregatePerAthlete(rows, config, inWindow);
    if (per.length === 0) return empty;
    const points = per.map(a => ({ label: a.name.split(' ')[0] || a.name, fullName: a.name, value: a.value, category: a.category || 'training' }));
    return {
        points,
        series: [{ key: 'value', label, color: '#6366f1' }],
        xKey: 'label',
        unit, metricLabel: label, count: points.length,
        stats: statsOf(per.map(a => a.value), per.map(a => a.name)),
        empty: false,
    };
}

function aggregatePerAthlete(rows: GpsRow[], config: GpsChartConfig, inWindow: (r: GpsRow) => boolean) {
    const byA = new Map<string, { name: string; vals: number[]; category?: string }>();
    for (const r of rows) {
        if (!inWindow(r)) continue;
        const v = computeMetricValue(r, config.metric);
        if (v === null) continue;
        if (!byA.has(r.athleteId)) byA.set(r.athleteId, { name: rowName(r), vals: [], category: r.category });
        byA.get(r.athleteId)!.vals.push(v);
    }
    const agg = config.aggregation;
    let out = [...byA.values()].map(a => ({
        name: a.name,
        category: a.category,
        value: parseFloat((aggregate(a.vals, agg === 'raw' ? 'average' : agg) ?? 0).toFixed(2)),
    }));
    if (config.sort !== 'none') out.sort((a, b) => config.sort === 'desc' ? b.value - a.value : a.value - b.value);
    return out;
}

function statsOf(values: number[], labels?: string[]): ChartData['stats'] {
    if (values.length === 0) return { avg: null, max: null, min: null };
    const max = Math.max(...values); const min = Math.min(...values);
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    return {
        avg: parseFloat(avg.toFixed(2)), max, min,
        maxLabel: labels?.[values.indexOf(max)], minLabel: labels?.[values.indexOf(min)],
    };
}

export function fmtDate(d: string): string {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
    catch { return d; }
}

export { GPS_CATEGORY_COLORS };
