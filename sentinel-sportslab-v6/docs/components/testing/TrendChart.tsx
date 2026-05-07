// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { DatabaseService } from '../../services/databaseService';
import type { TestDefinition } from '../../utils/testRegistry';
import { TrendingUpIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';

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
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [selectedMetric, setSelectedMetric] = useState<string>('');

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

    const loadResults = useCallback(async () => {
        if (!athleteId) { setResults([]); return; }
        setLoading(true);
        try {
            const data = await DatabaseService.fetchAssessmentsByAthlete(athleteId, test.id);
            setResults((data || []).reverse()); // oldest first for chart
        } catch (err) {
            console.error('TrendChart load error:', err);
            setResults([]);
        } finally {
            setLoading(false);
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

    if (!athleteId) return null;
    if (chartData.length < 2 && !loading) return null;

    return (
        <div className="space-y-3">
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center justify-between w-full text-left"
            >
                <div className="flex items-center gap-2">
                    <TrendingUpIcon size={14} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700">Trend</h3>
                    {trend && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                            trend.direction === 'up' ? 'bg-emerald-50 text-emerald-600'
                            : trend.direction === 'down' ? 'bg-red-50 text-red-600'
                            : 'bg-slate-50 text-slate-500'
                        }`}>
                            {trend.direction === 'up' ? '+' : ''}{trend.pct}%
                        </span>
                    )}
                </div>
                {expanded ? <ChevronUpIcon size={14} className="text-slate-400" /> : <ChevronDownIcon size={14} className="text-slate-400" />}
            </button>

            {expanded && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    {/* Metric selector */}
                    {plottableMetrics.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Metric:</span>
                            <select
                                value={selectedMetric}
                                onChange={e => setSelectedMetric(e.target.value)}
                                className="px-2 py-1 rounded border border-slate-200 text-xs bg-white focus:ring-1 focus:ring-indigo-200 outline-none"
                            >
                                {plottableMetrics.map(m => (
                                    <option key={m.key} value={m.key}>
                                        {m.label}{m.unit ? ` (${m.unit})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-xs text-slate-400 py-8 text-center">Loading trend data...</div>
                    ) : chartData.length < 2 ? (
                        <div className="text-xs text-slate-400 py-8 text-center">Need at least 2 results to show trend</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="label"
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#e2e8f0' }}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={45}
                                />
                                <Tooltip
                                    contentStyle={{
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                    }}
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
                    )}

                    {/* Summary stats */}
                    {chartData.length >= 2 && (
                        <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-100">
                            {[
                                { label: 'First', value: chartData[0]?.value },
                                { label: 'Latest', value: chartData[chartData.length - 1]?.value },
                                { label: 'Best', value: Math.max(...chartData.map(d => d.value)) },
                                { label: 'Avg', value: +(chartData.reduce((s, d) => s + d.value, 0) / chartData.length).toFixed(1) },
                            ].map(s => (
                                <div key={s.label} className="text-center">
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wide">{s.label}</div>
                                    <div className="text-sm font-bold text-slate-800">
                                        {s.value}{metricInfo?.unit ? <span className="text-[10px] text-slate-400 ml-0.5">{metricInfo.unit}</span> : ''}
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
