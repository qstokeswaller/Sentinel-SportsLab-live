// GPS Chart Builder — configuration model.
// A GpsChartConfig fully describes one chart: what data to pull, how to
// aggregate it, how to draw it, and how to label it. The same config drives
// both the live builder preview and saved dashboard tiles, so it must be a
// plain serialisable object (stored in the gps_dashboards.charts JSONB array).

/** A GPS data row after source-agnostic normalisation (Polar/Catapult/CSV/manual). */
export interface GpsRow {
    athleteId: string;
    date: string;                       // YYYY-MM-DD
    category?: string;                  // 'match' | 'training' | 'recovery' | ...
    matchedName?: string;
    playerName?: string;
    rawColumns?: Record<string, any>;
}

/**
 * The value a chart plots. Either a raw column, or a derived ratio of two
 * columns (A÷B, optionally ×100 for a percentage — e.g. High-Speed Running as
 * a % of Total Distance, or distance-per-minute when B is a duration column).
 */
export type MetricDef =
    | { kind: 'column'; column: string }
    | { kind: 'ratio'; numerator: string; denominator: string; asPercent: boolean };

/** Which dates a chart pulls. Fixed (single/range/specific) or rolling (relative). */
export type DateSpec =
    | { mode: 'single'; date: string }
    | { mode: 'range'; start: string; end: string }
    | { mode: 'specific'; dates: string[] }
    | { mode: 'relative'; window: RelativeWindow; n?: number };

export type RelativeWindow = 'last7' | 'last14' | 'last28' | 'last90' | 'lastN' | 'lastSession';

/** How multiple sessions collapse into one number (per athlete, or per date). */
export type Aggregation = 'raw' | 'average' | 'sum' | 'max' | 'min';

export type ChartType = 'bar' | 'horizontalBar' | 'line' | 'pie' | 'stackedBar' | 'scatter';

/** What the primary axis (X for most, category for pie) represents. */
export type Dimension = 'athlete' | 'date';

export interface GpsChartConfig {
    id: string;
    title: string;
    chartType: ChartType;
    dimension: Dimension;
    teamFilter: string;                 // team name | 'All Athletes'
    athleteId?: string;                 // required when dimension='date' + single athlete
    metric: MetricDef;                  // primary Y
    metricY2?: MetricDef;               // scatter Y2
    seriesColumns?: string[];           // stacked-bar bands (e.g. speed zones Z1..Z6)
    dateSpec: DateSpec;
    aggregation: Aggregation;
    sort: 'none' | 'asc' | 'desc';
    excludeInjured: boolean;
    axis: { x?: string; y?: string };   // custom axis titles ('' = auto)
    colorBy?: 'category' | 'none';
}

export interface GpsDashboard {
    id: string;
    team_id: string | null;             // null = All Athletes
    name: string;
    charts: GpsChartConfig[];
    visibility: 'personal' | 'org';
    created_at?: string;
    updated_at?: string;
}

/** Factory: a sensible default chart to seed the builder. */
export function newChartConfig(partial: Partial<GpsChartConfig> = {}): GpsChartConfig {
    return {
        id: `chart_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: 'Untitled chart',
        chartType: 'bar',
        dimension: 'athlete',
        teamFilter: 'All Athletes',
        metric: { kind: 'column', column: '' },
        dateSpec: { mode: 'single', date: new Date().toISOString().split('T')[0] },
        aggregation: 'raw',
        sort: 'desc',
        excludeInjured: true,
        axis: {},
        colorBy: 'category',
        ...partial,
    };
}

/** Palette shared across builder + dashboard tiles. */
export const GPS_CHART_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
    '#f97316', '#84cc16', '#ec4899', '#14b8a6', '#a855f7', '#64748b',
];

export const GPS_CATEGORY_COLORS: Record<string, string> = {
    match: '#ef4444', recovery: '#10b981', training: '#6366f1',
};
