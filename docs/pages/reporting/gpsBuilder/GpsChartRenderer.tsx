// GPS Chart Builder — renderer.
// Given a config + the loaded GPS rows, computes chart data and draws the
// chosen chart type with custom titles/axis labels. Reused identically by the
// builder's live preview and saved dashboard tiles. Exposes its container ref
// so the export layer (Phase B) can snapshot the SVG. Theme-aware (light/dark).

import React, { useMemo, useEffect, useState, forwardRef } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
    ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import { ActivityIcon } from 'lucide-react';
import type { GpsChartConfig, GpsRow } from './types';
import { GPS_CATEGORY_COLORS, GPS_CHART_COLORS } from './types';
import { buildChartData } from './compute';

interface Props {
    config: GpsChartConfig;
    rows: GpsRow[];
    teams: any[];
    colLabel: (k: string) => string;
    isExcluded?: (athleteId: string, date: string) => boolean;
    height?: number;
    showTitle?: boolean;
}

/** Reactively track the app's dark-mode class so charts theme themselves. */
function useIsDark(): boolean {
    const [dark, setDark] = useState(() => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));
    useEffect(() => {
        const el = document.documentElement;
        const obs = new MutationObserver(() => setDark(el.classList.contains('dark')));
        obs.observe(el, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);
    return dark;
}

interface Theme { grid: string; tick: string; axisTitle: string; tooltip: React.CSSProperties; refLine: string; }

export const GpsChartRenderer = forwardRef<HTMLDivElement, Props>(function GpsChartRenderer(
    { config, rows, teams, colLabel, isExcluded, height = 320, showTitle = true }, ref,
) {
    const dark = useIsDark();
    const data = useMemo(
        () => buildChartData(config, rows, teams, colLabel, isExcluded),
        [config, rows, teams, colLabel, isExcluded],
    );

    const theme: Theme = dark
        ? { grid: '#243A58', tick: '#94A3B8', axisTitle: '#94A3B8', refLine: '#818CF8',
            tooltip: { fontSize: 11, borderRadius: 8, background: '#132338', border: '1px solid #243A58', color: '#E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' } }
        : { grid: '#f1f5f9', tick: '#94a3b8', axisTitle: '#94a3b8', refLine: '#6366f1',
            tooltip: { fontSize: 11, borderRadius: 8, background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } };

    const xTitle = config.axis.x || (config.dimension === 'date' ? 'Date' : config.chartType === 'scatter' ? stripUnit(data.metricLabel.split(' vs ')[0] || 'Athlete') : 'Athlete');
    const yTitle = config.axis.y || computeYTitle(config, data);

    // Ranking (horizontal bar) grows with the number of athletes so bars stay legible.
    const effHeight = config.chartType === 'horizontalBar' ? Math.max(220, data.count * 30 + 64) : height;

    if (data.empty) {
        return (
            <div ref={ref} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-10 flex flex-col items-center gap-3 text-center">
                <ActivityIcon size={32} className="text-slate-200 dark:text-[#334155]" />
                <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">{emptyReason(config)}</p>
                <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">Adjust the metric, dates, or team on the left.</p>
            </div>
        );
    }

    const noun = config.chartType === 'pie' && config.seriesColumns?.length ? 'categories' : config.dimension === 'date' ? 'sessions' : 'athletes';

    return (
        <div ref={ref} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5">
            {showTitle && (
                <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{config.title || data.metricLabel}</h3>
                    <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                        {config.teamFilter} · {data.count} {noun}{data.unit && ` · ${data.unit}`}
                    </p>
                </div>
            )}
            <ResponsiveContainer width="100%" height={effHeight}>
                {renderChart(config, data, xTitle, yTitle, theme)}
            </ResponsiveContainer>
        </div>
    );
});

function renderChart(config: GpsChartConfig, data: any, xTitle: string, yTitle: string, theme: Theme): React.ReactElement {
    const { points, series, unit } = data;
    const tick = { fontSize: 10, fill: theme.tick };

    // ── Pie / donut — labels show % only; names live in the legend ─────────────
    if (config.chartType === 'pie') {
        const total = points.reduce((s: number, p: any) => s + (p.value || 0), 0);
        return (
            <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <Pie data={points} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius="72%" innerRadius="45%"
                    label={(e: any) => total ? `${Math.round((e.value / total) * 100)}%` : ''} labelLine={false}
                    stroke={theme.tooltip.background as string} strokeWidth={2}>
                    {points.map((p: any, i: number) => <Cell key={i} fill={p.color} />)}
                </Pie>
                <Tooltip formatter={(v: any, _n: any, p: any) => [`${fmt(v)}${unit ? ` ${unit}` : ''} (${total ? Math.round((v / total) * 100) : 0}%)`, p?.payload?.label]} contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
        );
    }

    // ── Scatter ────────────────────────────────────────────────────────────────
    if (config.chartType === 'scatter') {
        return (
            <ScatterChart margin={{ top: 10, right: 24, left: 12, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                <XAxis type="number" dataKey="x" name={xTitle} tick={tick} tickLine={false} axisLine={false}
                    label={{ value: xTitle, position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: theme.axisTitle } }} />
                <YAxis type="number" dataKey="y" name={yTitle} tick={tick} tickLine={false} axisLine={false}
                    label={{ value: yTitle, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: theme.axisTitle, textAnchor: 'middle' } }} width={60} />
                <ZAxis range={[90, 90]} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }}
                    labelStyle={{ color: theme.tooltip.color, fontWeight: 600 }}
                    formatter={(v: any, n: any) => [fmt(v), n === 'x' ? xTitle : yTitle]}
                    labelFormatter={(_l: any, payload: any) => payload?.[0]?.payload?.fullName || ''} />
                <Scatter data={points} fill={config.seriesColors?.__primary || '#6366f1'}>
                    {points.map((p: any, i: number) => <Cell key={i} fill={
                        config.colorBy === 'category' ? (GPS_CATEGORY_COLORS[p.category] || config.seriesColors?.__primary || '#6366f1')
                        : (config.seriesColors?.__primary || '#6366f1')
                    } />)}
                </Scatter>
            </ScatterChart>
        );
    }

    // ── Line (trend) ─────────────────────────────────────────────────────────
    if (config.chartType === 'line') {
        return (
            <LineChart data={points} margin={{ top: 8, right: 44, left: 12, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} />
                <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} interval="preserveStartEnd"
                    label={{ value: xTitle, position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: theme.axisTitle } }} />
                <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString()}
                    label={{ value: yTitle, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: theme.axisTitle, textAnchor: 'middle' } }} width={60} />
                <Tooltip contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }} labelStyle={{ color: theme.tooltip.color, fontWeight: 600 }} formatter={(v: any) => [`${fmt(v)}${unit ? ` ${unit}` : ''}`, data.metricLabel]} />
                {data.stats.avg != null && <ReferenceLine y={data.stats.avg} stroke={theme.refLine} strokeDasharray="4 4" strokeWidth={1}
                    label={{ value: `Avg ${fmt(data.stats.avg)}`, fontSize: 9, fill: theme.refLine, position: 'insideTopRight' }} />}
                <Line type="monotone" dataKey="value" stroke={config.seriesColors?.__primary || '#6366f1'} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name={data.metricLabel} />
            </LineChart>
        );
    }

    // ── Stacked bar ──────────────────────────────────────────────────────────
    if (config.chartType === 'stackedBar') {
        return (
            <BarChart data={points} margin={{ top: 8, right: 20, left: 12, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false}
                    label={{ value: xTitle, position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: theme.axisTitle } }} />
                <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString()}
                    label={{ value: yTitle, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: theme.axisTitle, textAnchor: 'middle' } }} width={60} />
                <Tooltip contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }} labelStyle={{ color: theme.tooltip.color, fontWeight: 600 }} formatter={(v: any, n: any) => [fmt(v), n]} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
                {series.map((s: any) => <Bar key={s.key} dataKey={s.key} stackId="a" fill={s.color} name={s.label} maxBarSize={44} />)}
            </BarChart>
        );
    }

    // ── Bar / horizontal bar (compare athletes / dates) ───────────────────────
    const horizontal = config.chartType === 'horizontalBar';
    return (
        <BarChart data={points} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 44, left: 12, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={!horizontal} vertical={horizontal} />
            {horizontal ? (
                <>
                    <XAxis type="number" tick={tick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString()}
                        label={{ value: yTitle, position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: theme.axisTitle } }} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: theme.tick }} tickLine={false} axisLine={false} width={84} />
                </>
            ) : (
                <>
                    <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false}
                        label={{ value: xTitle, position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: theme.axisTitle } }} />
                    <YAxis tick={tick} tickLine={false} axisLine={false} tickFormatter={(v: number) => v.toLocaleString()}
                        label={{ value: yTitle, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: theme.axisTitle, textAnchor: 'middle' } }} width={60} />
                </>
            )}
            <Tooltip contentStyle={theme.tooltip} itemStyle={{ color: theme.tooltip.color }} formatter={(v: any, _n: any, p: any) => [`${fmt(v)}${unit ? ` ${unit}` : ''}`, p?.payload?.fullName || data.metricLabel]} labelStyle={{ display: 'none' }} />
            {data.stats.avg != null && (
                <ReferenceLine {...(horizontal ? { x: data.stats.avg } : { y: data.stats.avg })} stroke={theme.refLine} strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: `Avg ${fmt(data.stats.avg)}`, fontSize: 9, fill: theme.refLine, position: horizontal ? 'insideBottomRight' : 'insideTopRight' }} />
            )}
            <Bar dataKey="value" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontal ? 20 : 52} name={data.metricLabel}>
                {points.map((p: any, i: number) => {
                    const primary = config.seriesColors?.__primary || '#6366f1';
                    const fill = config.colorBy === 'category' ? (GPS_CATEGORY_COLORS[p.category] || primary)
                        : config.colorBy === 'multi' ? GPS_CHART_COLORS[i % GPS_CHART_COLORS.length]
                        : primary;
                    return <Cell key={i} fill={fill} fillOpacity={0.9} />;
                })}
            </Bar>
        </BarChart>
    );
}

function computeYTitle(config: GpsChartConfig, data: any): string {
    if (config.chartType === 'scatter') return stripUnit(data.metricLabel.split(' vs ')[1] || 'Value');
    if (config.chartType === 'stackedBar') return data.unit ? `Distance (${data.unit})` : 'Total';
    // A user rename is used verbatim — they typed exactly what they want to see
    // (and it may already include a unit, e.g. "Total Load (km)").
    if (config.metric.kind === 'column' && config.labelOverrides?.[config.metric.column]?.trim()) return data.metricLabel;
    return data.unit ? `${stripUnit(data.metricLabel)} (${data.unit})` : data.metricLabel;
}

function emptyReason(config: GpsChartConfig): string {
    if (config.chartType === 'scatter' && !(config.metricY2?.kind === 'column' && config.metricY2.column)) return 'Pick a second metric for the Y axis';
    if ((config.chartType === 'stackedBar' || config.chartType === 'pie') && !config.seriesColumns?.length) return 'Choose columns to stack / split';
    if (config.metric.kind === 'column' && !config.metric.column) return 'Choose a metric to chart';
    if (config.metric.kind === 'ratio' && (!config.metric.numerator || !config.metric.denominator)) return 'Choose both ratio columns';
    return 'No data for this configuration';
}

const fmt = (v: any) => typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—';
const stripUnit = (label: string) => (label || '').replace(/\s*\[[^\]]+\]/, '');

export default GpsChartRenderer;
