// GPS Chart Builder — one-click preset templates.
// Each returns a partial config seeded from whatever columns the team's data
// actually has, matching how sport scientists commonly present GPS data.

import type { GpsChartConfig, MetricDef } from './types';
import { newChartConfig } from './types';

/** Find the first column matching any of the given patterns. */
export function findCol(cols: string[], patterns: RegExp[]): string | undefined {
    for (const p of patterns) { const hit = cols.find(c => p.test(c)); if (hit) return hit; }
    return undefined;
}

const TOTAL_DIST = [/total distance/i, /^distance/i];
const HSR = [/high.?speed|high.?intensity|hsr|distance in speed zone 4|distance in speed zone 5/i, /sprint distance/i];
const DURATION = [/duration/i, /^time$/i];
const SPEED_ZONE = [/distance in speed zone/i];
const HR = [/hr avg|heart rate|average hr/i];

export interface PresetDef {
    id: string;
    label: string;
    description: string;
    build: (cols: string[]) => GpsChartConfig | null;
}

export const GPS_PRESETS: PresetDef[] = [
    {
        id: 'ranking',
        label: 'Athlete ranking',
        description: 'Bar chart of a metric per athlete, highest to lowest, for one day.',
        build: (cols) => {
            const m = findCol(cols, TOTAL_DIST) || cols[0];
            if (!m) return null;
            return newChartConfig({ title: 'Athlete ranking', chartType: 'horizontalBar', dimension: 'athlete', metric: { kind: 'column', column: m }, dateSpec: { mode: 'relative', window: 'lastSession' }, sort: 'desc' });
        },
    },
    {
        id: 'hsr-ratio',
        label: 'Intensity ratio (HSR %)',
        description: 'High-speed running as a % of total distance, per athlete.',
        build: (cols) => {
            const num = findCol(cols, HSR); const den = findCol(cols, TOTAL_DIST);
            if (!num || !den) return null;
            const metric: MetricDef = { kind: 'ratio', numerator: num, denominator: den, asPercent: true };
            return newChartConfig({ title: 'High-speed running (% of total)', chartType: 'bar', dimension: 'athlete', metric, dateSpec: { mode: 'relative', window: 'lastSession' }, sort: 'desc', axis: { y: 'HSR %' } });
        },
    },
    {
        id: 'zone-distribution',
        label: 'Speed-zone distribution',
        description: 'Stacked bar of distance in each speed zone, per athlete.',
        build: (cols) => {
            const zones = cols.filter(c => SPEED_ZONE[0].test(c));
            if (zones.length < 2) return null;
            return newChartConfig({ title: 'Speed-zone distribution', chartType: 'stackedBar', dimension: 'athlete', seriesColumns: zones, metric: { kind: 'column', column: zones[0] }, dateSpec: { mode: 'relative', window: 'lastSession' }, sort: 'desc' });
        },
    },
    {
        id: 'zone-pie',
        label: 'Zone split (donut)',
        description: 'Donut of how distance is distributed across speed zones for the group.',
        build: (cols) => {
            const zones = cols.filter(c => SPEED_ZONE[0].test(c));
            if (zones.length < 2) return null;
            return newChartConfig({ title: 'Speed-zone split', chartType: 'pie', dimension: 'athlete', seriesColumns: zones, metric: { kind: 'column', column: zones[0] }, dateSpec: { mode: 'relative', window: 'last7' } });
        },
    },
    {
        id: 'trend',
        label: 'Team trend',
        description: 'Line chart of the team average for a metric over the last 28 days.',
        build: (cols) => {
            const m = findCol(cols, TOTAL_DIST) || cols[0];
            if (!m) return null;
            return newChartConfig({ title: 'Team load trend', chartType: 'line', dimension: 'date', metric: { kind: 'column', column: m }, dateSpec: { mode: 'relative', window: 'last28' } });
        },
    },
    {
        id: 'scatter',
        label: 'Two-metric scatter',
        description: 'Plot two metrics against each other to spot outliers.',
        build: (cols) => {
            const x = findCol(cols, TOTAL_DIST) || cols[0];
            const y = findCol(cols, HSR) || findCol(cols, HR) || cols[1] || cols[0];
            if (!x || !y) return null;
            return newChartConfig({ title: 'Total distance vs high-speed running', chartType: 'scatter', dimension: 'athlete', metric: { kind: 'column', column: x }, metricY2: { kind: 'column', column: y }, dateSpec: { mode: 'relative', window: 'last7' }, aggregation: 'average' });
        },
    },
];
