import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { DatabaseService } from '../../services/databaseService';
import type { TestDefinition } from '../../utils/testRegistry';
import { TrendingUpIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import { useAppState } from '../../context/AppStateContext';

interface Props {
    test: TestDefinition;
    athleteId: string | null;
    athleteName?: string;
    refreshKey?: number;
}

/**
 * Line chart showing how an athlete's test results change over time.
 * Plots the primary metric (or first numeric field) across assessment dates.
 */
export const TrendChart: React.FC<Props> = ({ test, athleteId, athleteName, refreshKey }) => {
    const { isDarkMode } = useAppState();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<string>('');

    // Recharts doesn't ship Tailwind-aware theming, so we resolve grid / axis /
    // tooltip palette from isDarkMode here. Picking values that match the rest
    // of the platform (slate-100/200 for light, the project's #243A58/#94A3B8 for dark).
    const chartTheme = isDarkMode
        ? { grid: '#1A2D48', axis: '#243A58', tick: '#94A3B8', tooltipBg: '#132338', tooltipBorder: '#243A58', tooltipText: '#E2E8F0' }
        : { grid: '#f1f5f9', axis: '#e2e8f0', tick: '#94a3b8', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0', tooltipText: '#1e293b' };

    // Determine which metrics can be plotted
    const plottableMetrics = useMemo(() => {
        const fromFields = test.fields
            .filter(f => f.type === 'number' || f.type === 'time_seconds')
            .map(f => ({ key: f.key, label: f.label, unit: f.unit }));
        const fromCalcs = (test.calculations || [])
            .map(c => ({ key: c.key, label: c.label, unit: c.unit }));
        return [...fromFields, ...fromCalcs];
    }, [test]);

    // Default to primary norms field, or first plottable
    useEffect(() => {
        if (selectedMetric) return;
        const primary = test.norms?.primaryField;
        if (primary && plottableMetrics.find(m => m.key === primary)) {
            setSelectedMetric(primary);
        } else if (plottableMetrics.length) {
            setSelectedMetric(plottableMetrics[0].key);
        }
    }, [plottableMetrics, test.norms, selectedMetric]);

    // Request-id guard so quick athlete switches don't let an older response
    // overwrite a newer one (race condition on slow networks).
    const reqIdRef = useRef(0);
    const loadResults = useCallback(async () => {
        if (!athleteId) { setResults([]); return; }
        const myReq = ++reqIdRef.current;
        setLoading(true);
        try {
            const data = await DatabaseService.fetchAssessmentsByAthlete(athleteId, test.id);
            if (myReq !== reqIdRef.current) return;
            setResults((data || []).reverse()); // oldest first for chart
        } catch (err) {
            if (myReq !== reqIdRef.current) return;
            console.error('TrendChart load error:', err);
            setResults([]);
        } finally {
            if (myReq === reqIdRef.current) setLoading(false);
        }
    }, [athleteId, test.id]);

    useEffect(() => { loadResults(); }, [loadResults, refreshKey]);

    // Build chart data
    const chartData = useMemo(() => {
        if (!selectedMetric || !results.length) return [];
        return results.map(r => {
            const metrics = r.metrics || {};
            // Run calculations to get derived values
            let value = metrics[selectedMetric];
            if (value == null && test.calculations?.length) {
                for (const calc of test.calculations) {
                    if (calc.key === selectedMetric) {
                        value = calc.formula(metrics);
                        break;
                    }
                }
            }
            return {
                date: r.date || metrics._date || '',
                value: value != null ? +value : null,
                label: r.date ? new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—',
            };
        }).filter(d => d.value != null);
    }, [results, selectedMetric, test.calculations]);

    const metricInfo = plottableMetrics.find(m => m.key === selectedMetric);

    // Calculate trend
    const trend = useMemo(() => {
        if (chartData.length < 2) return null;
        const first = chartData[0].value;
        const last = chartData[chartData.length - 1].value;
        const diff = last - first;
        const pct = first !== 0 ? ((diff / Math.abs(first)) * 100).toFixed(1) : '0';
        return { diff: diff.toFixed(2), pct, direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat' };
    }, [chartData]);

    // Always rendered once an athlete is selected, so the section stays put with
    // a friendly empty state when there aren't enough points to plot. Advertises
    // the feature and avoids the appearing/disappearing shimmer that read as a bug.
    if (!athleteId) return null;

    const isWarmLoad = loading && chartData.length >= 2;
    const isEmpty = !loading && chartData.length < 2;
    const emptyMessage = results.length === 0
        ? 'No trend data yet'
        : `One result so far — record at least one more ${test.name} to plot a trend.`;

    return (
        <div className="space-y-3">
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center justify-between w-full text-left"
            >
                <div className="flex items-center gap-2">
                    <TrendingUpIcon size={14} className="text-slate-400 dark:text-[#94A3B8]" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#CBD5E1]">Trend</h3>
                    {trend && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${
                            trend.direction === 'up' ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                            : trend.direction === 'down' ? 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30'
                            : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-700 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]'
                        }`}>
                            {trend.direction === 'up' ? '+' : ''}{trend.pct}%
                        </span>
                    )}
                    {loading && (
                        <span
                            className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-300 animate-pulse"
                            aria-label="Loading"
                            title="Refreshing"
                        />
                    )}
                </div>
                {expanded ? <ChevronUpIcon size={14} className="text-slate-400 dark:text-[#94A3B8]" /> : <ChevronDownIcon size={14} className="text-slate-400 dark:text-[#94A3B8]" />}
            </button>

            {expanded && (
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-4 space-y-3">
                    {/* Metric selector */}
                    {plottableMetrics.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 dark:text-[#94A3B8]">Metric:</span>
                            <CustomSelect
                                variant="filter"
                                size="xs"
                                value={selectedMetric}
                                onChange={e => setSelectedMetric(e.target.value)}
                            >
                                {plottableMetrics.map(m => (
                                    <option key={m.key} value={m.key}>
                                        {m.label}{m.unit ? ` (${m.unit})` : ''}
                                    </option>
                                ))}
                            </CustomSelect>
                        </div>
                    )}

                    {isEmpty ? (
                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/50 p-6 text-center">
                            <TrendingUpIcon size={18} className="mx-auto text-slate-300 dark:text-[#475569] mb-1.5" />
                            <p className="text-xs font-medium text-slate-500 dark:text-[#CBD5E1]">{emptyMessage}</p>
                            <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1 leading-snug">
                                Trend lines populate once at least two results are saved for this athlete.
                            </p>
                        </div>
                    ) : (
                    <div className={`transition-opacity duration-150 ${isWarmLoad ? 'opacity-60' : 'opacity-100'}`}>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: chartTheme.tick }}
                                    tickLine={false}
                                    axisLine={{ stroke: chartTheme.axis }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: chartTheme.tick }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={45}
                                />
                                <Tooltip
                                    contentStyle={{
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: `1px solid ${chartTheme.tooltipBorder}`,
                                        background: chartTheme.tooltipBg,
                                        color: chartTheme.tooltipText,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    }}
                                    labelStyle={{ color: chartTheme.tooltipText }}
                                    itemStyle={{ color: chartTheme.tooltipText }}
                                    formatter={(value: number) => [
                                        `${value}${metricInfo?.unit ? ` ${metricInfo.unit}` : ''}`,
                                        metricInfo?.label || selectedMetric,
                                    ]}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                    activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    )}

                    {/* Summary stats */}
                    {chartData.length >= 2 && (
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100 dark:border-[#1A2D48]">
                            {[
                                { label: 'First', value: chartData[0]?.value },
                                { label: 'Latest', value: chartData[chartData.length - 1]?.value },
                                { label: 'Best', value: Math.max(...chartData.map(d => d.value)) },
                                { label: 'Avg', value: +(chartData.reduce((s, d) => s + d.value, 0) / chartData.length).toFixed(1) },
                            ].map(s => (
                                <div key={s.label} className="text-center">
                                    <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">{s.label}</div>
                                    <div className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0]">
                                        {s.value}{metricInfo?.unit ? <span className="text-[10px] text-slate-400 dark:text-[#94A3B8] ml-0.5">{metricInfo.unit}</span> : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
