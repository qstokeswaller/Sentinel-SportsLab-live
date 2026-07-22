// 2026-07-12). Typing this legacy body is Phase 5 work; this step is pure movement.
// Insights tab: metric picker + 9 chart renderers (bar/avg/distribution/trend/
// histogram/donut/count/comparison) for daily + weekly wellness responses.
import React from 'react';
import { BarChart3, Thermometer } from 'lucide-react';
import { CustomSelect } from '../../ui/CustomSelect';
import { resolveAvailability } from './shared';

interface Props {
    activeTeam: any;
    athletes: any[];
    dailyResponses: any[];
    weeklyResponses: any[];
    insightMetric: string;
    setInsightMetric: (v: string) => void;
    insightView: string;
    setInsightView: (v: string) => void;
    insightDate: string;
    setInsightDate: (v: string) => void;
    insightPeriodMode: boolean;
    setInsightPeriodMode: (v: boolean) => void;
    insightCompareMetric: string;
    setInsightCompareMetric: (v: string) => void;
    wellnessDateRange: string;
    chartGridColor: string;
    chartLabelColor: string;
    chartTextColor: string;
    chartAxisColor: string;
    openAthlete: (athleteId: string, focus?: 'daily' | 'weekly' | 'flags') => void;
}

export const WellnessInsightsTab: React.FC<Props> = ({
    activeTeam, athletes, dailyResponses, weeklyResponses,
    insightMetric, setInsightMetric, insightView, setInsightView,
    insightDate, setInsightDate, insightPeriodMode, setInsightPeriodMode,
    insightCompareMetric, setInsightCompareMetric, wellnessDateRange,
    chartGridColor, chartLabelColor, chartTextColor, chartAxisColor, openAthlete,
}) => {

        // All visualizable metrics from both forms
        const METRIC_DEFS = [
            { key: 'fatigue',       label: 'Fatigue',       max: 10, negative: true,  color: '#f59e0b', form: 'daily', type: 'scale' },
            { key: 'soreness',      label: 'Soreness',      max: 10, negative: true,  color: '#ef4444', form: 'daily', type: 'scale' },
            { key: 'sleep_quality', label: 'Sleep Quality', max: 10, negative: false, color: '#06b6d4', form: 'daily', type: 'scale' },
            { key: 'stress',        label: 'Stress',        max: 10, negative: true,  color: '#ec4899', form: 'daily', type: 'scale' },
            { key: 'mood',          label: 'Mood',          max: 10, negative: false, color: '#8b5cf6', form: 'daily', type: 'scale' },
            { key: 'sleep_hours',   label: 'Sleep Hours',   max: 12, negative: false, color: '#0ea5e9', form: 'daily', type: 'number' },
            { key: 'availability',  label: 'Availability',  max: 0,  negative: false, color: '#22c55e', form: 'daily', type: 'category', options: ['available', 'modified', 'unavailable'] },
            { key: 'readiness',     label: 'Readiness',     max: 0,  negative: false, color: '#6366f1', form: 'daily', type: 'category', options: ['ready', 'compromised', 'not_ready'] },
            { key: 'health_complaint', label: 'Health Complaint', max: 0, negative: false, color: '#ef4444', form: 'daily', type: 'category', options: ['no', 'injury', 'illness', 'both'] },
            { key: 'hydration',     label: 'Hydration',     max: 10, negative: false, color: '#06b6d4', form: 'weekly', type: 'scale' },
            { key: 'nutrition',     label: 'Nutrition',     max: 10, negative: false, color: '#10b981', form: 'weekly', type: 'scale' },
        ];

        // View options per metric type
        const VIEWS_FOR_TYPE = {
            scale:    [
                { id: 'bar_sorted',  label: 'Bar — Sorted' },
                { id: 'team_avg',    label: 'Team Average' },
                { id: 'distribution', label: 'Distribution' },
                { id: 'comparison',  label: 'Compare Metrics' },
                { id: 'trend',       label: 'Trend Over Time' },
            ],
            number:   [
                { id: 'bar_sorted',  label: 'Bar — Sorted' },
                { id: 'team_avg',    label: 'Team Average' },
                { id: 'histogram',   label: 'Histogram' },
                { id: 'trend',       label: 'Trend Over Time' },
            ],
            category: [
                { id: 'donut',       label: 'Donut Chart' },
                { id: 'count_bar',   label: 'Count Bar' },
            ],
            yesno: [
                { id: 'donut',       label: 'Donut Chart' },
                { id: 'count_bar',   label: 'Count Bar' },
            ],
        };

        const activeDef = METRIC_DEFS.find(m => m.key === insightMetric) || METRIC_DEFS[0];
        const viewOptions = VIEWS_FOR_TYPE[activeDef.type] || [];

        // Ensure current view is valid for the selected metric type
        const activeView = viewOptions.find(v => v.id === insightView) ? insightView : viewOptions[0]?.id || 'bar_sorted';

        // Use the correct response set for the selected metric type
        const insightSource = activeDef.form === 'weekly' ? weeklyResponses : dailyResponses;

        // Available dates derived from the active source (weekly metrics use weekly dates)
        const availDates = Array.from(new Set(insightSource.map(r => r.session_date))).sort((a, b) => String(b).localeCompare(String(a)));

        // Responses for selected date OR full period
        const dateResponses = insightSource.filter(r => r.session_date === insightDate);
        const chartResponses = insightPeriodMode ? insightSource : dateResponses;
        const totalAthletes = activeTeam?.players?.length || 0;
        const periodLabel = insightPeriodMode
            ? (wellnessDateRange === 'today' ? 'Today' : wellnessDateRange === '7d' ? 'Last 7 Days' : 'Last 30 Days')
            : new Date(insightDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

        // ── Helper: get metric value from a response ──
        const getVal = (r: any) => {
            if (activeDef.key === 'availability') return resolveAvailability(r);
            if (activeDef.key === 'readiness') return r.responses?.readiness;
            if (activeDef.key === 'health_complaint') return r.responses?.health_complaint;
            return r.responses?.[activeDef.key];
        };

        // ── Chart renderers ──

        // BAR SORTED — per-athlete bars sorted by value (averages in period mode)
        const renderBarSorted = () => {
            let rows;
            if (insightPeriodMode) {
                // Period mode: average per athlete across all responses
                const byAthlete: Record<string, { sum: number; count: number; name: string; fullName: string }> = {};
                chartResponses.forEach(r => {
                    const v = getVal(r);
                    if (typeof v !== 'number') return;
                    const a = athletes.find(att => att.id === r.athlete_id);
                    const id = r.athlete_id;
                    if (!byAthlete[id]) byAthlete[id] = { sum: 0, count: 0, name: a?.name?.split(' ').pop() || '?', fullName: a?.name || 'Unknown' };
                    byAthlete[id].sum += v;
                    byAthlete[id].count++;
                });
                rows = Object.values(byAthlete).map(a => ({ name: a.name, value: +(a.sum / a.count).toFixed(1), fullName: a.fullName }));
            } else {
                rows = chartResponses.map(r => {
                    const a = athletes.find(att => att.id === r.athlete_id);
                    return { name: a?.name?.split(' ').pop() || '?', value: getVal(r) || 0, fullName: a?.name || 'Unknown' };
                }).filter(r => typeof r.value === 'number');
            }

            if (rows.length === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No responses for this {insightPeriodMode ? 'period' : 'date'}</p>;

            // Sort: negative metrics ascending (low=good first), positive metrics descending (high=good first)
            rows.sort((a, b) => activeDef.negative ? a.value - b.value : b.value - a.value);

            const max = activeDef.max || Math.max(...rows.map(r => r.value), 1);
            return (
                <div className="space-y-1.5">
                    {rows.map((r, i) => {
                        const pct = (r.value / max) * 100;
                        const barColor = activeDef.negative
                            ? r.value <= 3 ? '#22c55e' : r.value <= 6 ? '#f59e0b' : '#ef4444'
                            : r.value >= 7 ? '#22c55e' : r.value >= 4 ? '#f59e0b' : '#ef4444';
                        return (
                            <div key={i} className="flex items-center gap-2">
                                <span className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] w-20 text-right truncate" title={r.fullName}>{r.name}</span>
                                <div className="flex-1 h-5 bg-slate-50 dark:bg-[#0F1C30] rounded-md overflow-hidden border border-slate-100 dark:border-[#1A2D48]">
                                    <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                                </div>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-[#E2E8F0] w-8 text-right">
                                    {activeDef.key === 'sleep_hours' ? `${r.value}h` : r.value}
                                </span>
                            </div>
                        );
                    })}
                </div>
            );
        };

        // TEAM AVERAGE — large number + sparkline of daily averages
        const renderTeamAvg = () => {
            const vals = chartResponses.map(r => getVal(r)).filter(v => typeof v === 'number');
            const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

            // Historical averages for trend — use same source as the selected metric type
            const byDate: Record<string, number[]> = {};
            insightSource.forEach(r => {
                const v = r.responses?.[activeDef.key];
                if (typeof v === 'number') {
                    if (!byDate[r.session_date]) byDate[r.session_date] = [];
                    byDate[r.session_date].push(v);
                }
            });
            const trend = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([d, vs]) => ({
                date: d.slice(5),
                avg: vs.reduce((s, v) => s + v, 0) / vs.length,
            }));

            return (
                <div className="flex flex-col items-center py-6 gap-4">
                    <div className="text-center">
                        <div className="text-6xl font-bold tracking-tight" style={{ color: activeDef.color }}>
                            {activeDef.key === 'sleep_hours' ? `${avg.toFixed(1)}h` : avg.toFixed(1)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] font-semibold uppercase tracking-wide mt-1">
                            Team Average — {vals.length} response{vals.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    {trend.length >= 2 && (
                        <div className="w-full max-w-md">
                            <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-semibold uppercase mb-1">Daily Average Trend</div>
                            {(() => {
                                const tVals = trend.map(t => t.avg);
                                const yMax = activeDef.max || 10;
                                const PAD_L = 22, PAD_B = 14, PAD_T = 4, PAD_R = 4;
                                const W = 300, H = 70;
                                const plotW = W - PAD_L - PAD_R;
                                const plotH = H - PAD_T - PAD_B;
                                const xPos = (i: number) => PAD_L + (tVals.length > 1 ? (i / (tVals.length - 1)) * plotW : plotW / 2);
                                const yPos = (v: number) => PAD_T + plotH - (v / yMax) * plotH;
                                const gridVals = activeDef.key === 'sleep_hours' ? [0, 6, 12] : [0, 5, 10];
                                return (
                                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
                                        {gridVals.map(gv => (
                                            <g key={gv}>
                                                <line x1={PAD_L} y1={yPos(gv)} x2={W - PAD_R} y2={yPos(gv)} stroke={chartGridColor} strokeWidth="1" />
                                                <text x={PAD_L - 3} y={yPos(gv) + 3} textAnchor="end" fontSize="6" fill={chartLabelColor}>{gv}{activeDef.key === 'sleep_hours' ? 'h' : ''}</text>
                                            </g>
                                        ))}
                                        <polygon
                                            points={[
                                                ...tVals.map((v, i) => `${xPos(i)},${yPos(v)}`),
                                                `${xPos(tVals.length - 1)},${PAD_T + plotH}`,
                                                `${xPos(0)},${PAD_T + plotH}`,
                                            ].join(' ')}
                                            fill={activeDef.color} fillOpacity="0.1"
                                        />
                                        <polyline points={tVals.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ')} fill="none" stroke={activeDef.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        {tVals.map((v, i) => {
                                            const showLabel = tVals.length <= 10 || i === 0 || i === tVals.length - 1;
                                            return (
                                                <g key={i}>
                                                    <circle cx={xPos(i)} cy={yPos(v)} r="2.5" fill={activeDef.color} />
                                                    {showLabel && <text x={xPos(i)} y={H - 2} textAnchor="middle" fontSize="6" fill={chartLabelColor}>{trend[i].date}</text>}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                );
                            })()}
                        </div>
                    )}
                </div>
            );
        };

        // DISTRIBUTION — pie/donut of score buckets (1-3 / 4-6 / 7-10)
        const renderDistribution = () => {
            const vals = chartResponses.map(r => getVal(r)).filter(v => typeof v === 'number');
            const low = vals.filter(v => v <= 3).length;
            const med = vals.filter(v => v >= 4 && v <= 6).length;
            const high = vals.filter(v => v >= 7).length;
            const total = vals.length;

            const data = activeDef.negative
                ? [{ label: '1-3 (Good)', count: low, color: '#22c55e' }, { label: '4-6 (Moderate)', count: med, color: '#f59e0b' }, { label: '7-10 (Concern)', count: high, color: '#ef4444' }]
                : [{ label: '1-3 (Low)', count: low, color: '#ef4444' }, { label: '4-6 (Moderate)', count: med, color: '#f59e0b' }, { label: '7-10 (Good)', count: high, color: '#22c55e' }];

            if (total === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No data</p>;

            const r = 50, circ = 2 * Math.PI * r;
            let offset = 0;
            return (
                <div className="flex items-center justify-center gap-8 py-4">
                    <svg width="130" height="130">
                        {data.map((d, i) => {
                            const pct = d.count / total;
                            const dash = pct * circ;
                            const seg = <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={d.color} strokeWidth="14"
                                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} strokeLinecap="round"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />;
                            offset += dash;
                            return seg;
                        })}
                        <text x="65" y="65" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill={chartTextColor}>{total}</text>
                    </svg>
                    <div className="space-y-2">
                        {data.map(d => (
                            <div key={d.label} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1]">{d.label}</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-[#E2E8F0]">{d.count} ({total > 0 ? Math.round((d.count/total)*100) : 0}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        // TREND — line chart of team averages over the whole date range
        const renderTrend = () => {
            const byDate: Record<string, number[]> = {};
            insightSource.forEach(r => {
                const v = r.responses?.[activeDef.key];
                if (typeof v === 'number') {
                    if (!byDate[r.session_date]) byDate[r.session_date] = [];
                    byDate[r.session_date].push(v);
                }
            });
            const trend = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([d, vs]) => ({
                date: d.slice(5),
                avg: +(vs.reduce((s, v) => s + v, 0) / vs.length).toFixed(1),
                count: vs.length,
            }));

            if (trend.length < 2) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">Need at least 2 days of data for trends</p>;

            // Fixed scale: use metric max (10 for scales, 12 for sleep_hours)
            const yMax = activeDef.max || 10;
            const yMin = 0;
            // SVG dimensions — leave room for Y-axis labels (left) and X-axis labels (bottom)
            const PAD_L = 28, PAD_B = 18, PAD_T = 8, PAD_R = 8;
            const W = 400, H = 110;
            const plotW = W - PAD_L - PAD_R;
            const plotH = H - PAD_T - PAD_B;

            const xPos = (i: number) => PAD_L + (trend.length > 1 ? (i / (trend.length - 1)) * plotW : plotW / 2);
            const yPos = (v: number) => PAD_T + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

            // Y grid lines at 0, 25%, 50%, 75%, 100% of scale
            const gridVals = activeDef.key === 'sleep_hours'
                ? [0, 3, 6, 9, 12]
                : [0, 2.5, 5, 7.5, 10];

            return (
                <div className="py-2">
                    <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-semibold mb-1 ml-7">
                        {activeDef.label} — daily team average · scale {yMin}–{yMax}{activeDef.key === 'sleep_hours' ? 'h' : ''}
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '140px' }}>
                        {/* Grid lines + Y labels */}
                        {gridVals.map(gv => {
                            const gy = yPos(gv);
                            return (
                                <g key={gv}>
                                    <line x1={PAD_L} y1={gy} x2={W - PAD_R} y2={gy} stroke={chartGridColor} strokeWidth="1" />
                                    <text x={PAD_L - 4} y={gy + 3} textAnchor="end" fontSize="7" fill={chartLabelColor}>{gv}{activeDef.key === 'sleep_hours' ? 'h' : ''}</text>
                                </g>
                            );
                        })}
                        {/* X axis baseline */}
                        <line x1={PAD_L} y1={PAD_T + plotH} x2={W - PAD_R} y2={PAD_T + plotH} stroke={chartAxisColor} strokeWidth="1" />
                        {/* Fill area under line */}
                        <polygon
                            points={[
                                ...trend.map((t, i) => `${xPos(i)},${yPos(t.avg)}`),
                                `${xPos(trend.length - 1)},${PAD_T + plotH}`,
                                `${xPos(0)},${PAD_T + plotH}`,
                            ].join(' ')}
                            fill={activeDef.color}
                            fillOpacity="0.08"
                        />
                        {/* Line */}
                        <polyline
                            points={trend.map((t, i) => `${xPos(i)},${yPos(t.avg)}`).join(' ')}
                            fill="none" stroke={activeDef.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        />
                        {/* Dots + X labels */}
                        {trend.map((t, i) => {
                            const showLabel = trend.length <= 14 || i % Math.ceil(trend.length / 10) === 0 || i === trend.length - 1;
                            return (
                                <g key={i}>
                                    <circle cx={xPos(i)} cy={yPos(t.avg)} r="3" fill={activeDef.color} />
                                    <title>{`${t.date}: ${t.avg}${activeDef.key === 'sleep_hours' ? 'h' : ''} (${t.count} responses)`}</title>
                                    {showLabel && (
                                        <text x={xPos(i)} y={H - 4} textAnchor="middle" fontSize="7" fill={chartLabelColor}>{t.date}</text>
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            );
        };

        // HISTOGRAM — for sleep hours
        const renderHistogram = () => {
            const hrs = chartResponses.map(r => r.responses?.sleep_hours).filter(v => typeof v === 'number');
            const buckets = [
                { range: '<5h',   count: hrs.filter(h => h < 5).length,              color: '#ef4444' },
                { range: '5-6h',  count: hrs.filter(h => h >= 5 && h < 6).length,    color: '#f59e0b' },
                { range: '6-7h',  count: hrs.filter(h => h >= 6 && h < 7).length,    color: '#eab308' },
                { range: '7-8h',  count: hrs.filter(h => h >= 7 && h < 8).length,    color: '#22c55e' },
                { range: '8-9h',  count: hrs.filter(h => h >= 8 && h < 9).length,    color: '#06b6d4' },
                { range: '9h+',   count: hrs.filter(h => h >= 9).length,             color: '#8b5cf6' },
            ];
            const maxCount = Math.max(...buckets.map(b => b.count), 1);

            return (
                <div className="flex items-end gap-2 h-40 px-4 py-4">
                    {buckets.map(b => (
                        <div key={b.range} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] font-bold text-slate-700 dark:text-[#E2E8F0]">{b.count}</span>
                            <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${(b.count / maxCount) * 100}%`, backgroundColor: b.color, minHeight: b.count > 0 ? 8 : 0 }} />
                            <span className="text-[8px] font-semibold text-slate-400 dark:text-[#CBD5E1]">{b.range}</span>
                        </div>
                    ))}
                </div>
            );
        };

        // DONUT — for category/yesno fields
        const renderDonut = () => {
            const counts: Record<string, number> = {};
            chartResponses.forEach(r => {
                const v = getVal(r);
                if (v) counts[v] = (counts[v] || 0) + 1;
            });
            // Add "No Response" for missing athletes (only meaningful for single-day view)
            if (!insightPeriodMode) {
                const noResp = Math.max(0, totalAthletes - chartResponses.length);
                if (noResp > 0) counts['No Response'] = noResp;
            }

            const COLORS = { available: '#22c55e', modified: '#f59e0b', unavailable: '#ef4444', ready: '#22c55e', compromised: '#f59e0b', not_ready: '#ef4444', no: '#22c55e', injury: '#f59e0b', illness: '#3b82f6', both: '#ef4444', 'No Response': '#e2e8f0' };
            const data = Object.entries(counts).map(([label, count]) => ({ label, count, color: COLORS[label] || '#6366f1' }));
            const total = data.reduce((s, d) => s + d.count, 0);

            if (total === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No data</p>;

            const r = 50, circ = 2 * Math.PI * r;
            let off = 0;
            return (
                <div className="flex items-center justify-center gap-8 py-4">
                    <svg width="130" height="130">
                        {data.map((d, i) => {
                            const pct = d.count / total;
                            const dash = pct * circ;
                            const seg = <circle key={i} cx="65" cy="65" r={r} fill="none" stroke={d.color} strokeWidth="14"
                                strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off} strokeLinecap="round"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />;
                            off += dash;
                            return seg;
                        })}
                        <text x="65" y="65" textAnchor="middle" dominantBaseline="central" className="text-lg font-bold" fill={chartTextColor}>{total}</text>
                    </svg>
                    <div className="space-y-2">
                        {data.map(d => (
                            <div key={d.label} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                                <span className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] capitalize">{d.label.replace('_', ' ')}</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-[#E2E8F0]">{d.count} ({Math.round((d.count/total)*100)}%)</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        };

        // COUNT BAR — horizontal bars for category counts
        const renderCountBar = () => {
            const counts: Record<string, number> = {};
            chartResponses.forEach(r => {
                const v = getVal(r);
                if (v) counts[v] = (counts[v] || 0) + 1;
            });
            const COLORS = { available: '#22c55e', modified: '#f59e0b', unavailable: '#ef4444', ready: '#22c55e', compromised: '#f59e0b', not_ready: '#ef4444', no: '#22c55e', injury: '#f59e0b', illness: '#3b82f6', both: '#ef4444' };
            const data = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const maxC = Math.max(...data.map(([, c]) => c), 1);

            return (
                <div className="space-y-2 py-4">
                    {data.map(([label, count]) => (
                        <div key={label} className="flex items-center gap-3">
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] w-24 text-right capitalize">{label.replace('_', ' ')}</span>
                            <div className="flex-1 h-6 bg-slate-50 dark:bg-[#0F1C30] rounded-md overflow-hidden border border-slate-100 dark:border-[#1A2D48]">
                                <div className="h-full rounded-md transition-all duration-500" style={{ width: `${(count / maxC) * 100}%`, backgroundColor: COLORS[label] || '#6366f1' }} />
                            </div>
                            <span className="text-[10px] font-bold text-slate-700 dark:text-[#E2E8F0] w-8">{count}</span>
                        </div>
                    ))}
                </div>
            );
        };

        // COMPARISON — two metrics side-by-side per athlete (grouped bars)
        const renderComparison = () => {
            const compareDef = METRIC_DEFS.find(m => m.key === insightCompareMetric && m.type === 'scale');
            if (!compareDef) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">Select a second metric to compare</p>;

            const athleteMap: Record<string, { name: string; v1: number | null; v2: number | null }> = {};

            if (insightPeriodMode) {
                // Period mode: average per athlete for both metrics
                chartResponses.forEach(r => {
                    const a = athletes.find(att => att.id === r.athlete_id);
                    const id = r.athlete_id;
                    if (!athleteMap[id]) athleteMap[id] = { name: a?.name?.split(' ').pop() || '?', v1: null, v2: null };
                });
                // Calculate averages
                const sums1: Record<string, { s: number; c: number }> = {};
                const sums2: Record<string, { s: number; c: number }> = {};
                chartResponses.forEach(r => {
                    const v1 = r.responses?.[activeDef.key];
                    const v2 = r.responses?.[compareDef.key];
                    if (typeof v1 === 'number') { sums1[r.athlete_id] = sums1[r.athlete_id] || { s: 0, c: 0 }; sums1[r.athlete_id].s += v1; sums1[r.athlete_id].c++; }
                    if (typeof v2 === 'number') { sums2[r.athlete_id] = sums2[r.athlete_id] || { s: 0, c: 0 }; sums2[r.athlete_id].s += v2; sums2[r.athlete_id].c++; }
                });
                Object.keys(athleteMap).forEach(id => {
                    if (sums1[id]) athleteMap[id].v1 = +(sums1[id].s / sums1[id].c).toFixed(1);
                    if (sums2[id]) athleteMap[id].v2 = +(sums2[id].s / sums2[id].c).toFixed(1);
                });
            } else {
                chartResponses.forEach(r => {
                    const a = athletes.find(att => att.id === r.athlete_id);
                    const id = r.athlete_id;
                    athleteMap[id] = {
                        name: a?.name?.split(' ').pop() || '?',
                        v1: typeof r.responses?.[activeDef.key] === 'number' ? r.responses[activeDef.key] : null,
                        v2: typeof r.responses?.[compareDef.key] === 'number' ? r.responses[compareDef.key] : null,
                    };
                });
            }

            const rows = Object.values(athleteMap).filter(r => r.v1 != null || r.v2 != null);
            if (rows.length === 0) return <p className="text-xs text-slate-300 dark:text-[#475569] italic py-8 text-center">No data</p>;

            const maxVal = 10;
            const barW = 100 / rows.length;

            const isSameMetric = activeDef.key === compareDef.key;
            return (
                <div>
                    {/* Explanation */}
                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mb-3 leading-relaxed">
                        Each athlete shows two bars side-by-side — <span className="font-semibold" style={{ color: activeDef.color }}>{activeDef.label}</span> (left) vs <span className="font-semibold" style={{ color: compareDef.color }}>{compareDef.label}</span> (right). Both use the 1–10 scale. Useful for spotting patterns, e.g. high fatigue + low mood together.
                    </p>
                    {isSameMetric && (
                        <p className="text-[10px] text-amber-500 font-semibold mb-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-1.5">Both metrics are the same — select a different metric to compare in the "Compare With" selector above.</p>
                    )}
                    {/* Legend */}
                    <div className="flex items-center gap-4 mb-3 px-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: activeDef.color }} /> {activeDef.label} (left bar)
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0]">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: compareDef.color }} /> {compareDef.label} (right bar)
                        </span>
                    </div>
                    {/* Grouped bars with SVG for proper grid lines */}
                    <div className="relative" style={{ height: '180px' }}>
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-5 flex flex-col justify-between text-[7px] text-slate-300 dark:text-[#475569] font-semibold w-6">
                            <span>10</span><span>7.5</span><span>5</span><span>2.5</span><span>0</span>
                        </div>
                        {/* Grid lines */}
                        <div className="absolute left-6 right-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none">
                            {[0,1,2,3,4].map(i => <div key={i} className="border-t border-slate-100 dark:border-[#1A2D48] w-full" />)}
                        </div>
                        {/* Bars */}
                        <div className="absolute left-7 right-0 bottom-5 top-0 flex items-end gap-[3px]">
                            {rows.map((r, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0 h-full justify-end">
                                    <div className="flex gap-[2px] items-end w-full justify-center" style={{ height: 'calc(100% - 14px)' }}>
                                        {r.v1 != null && (
                                            <div className="rounded-t transition-all duration-500" style={{ width: '45%', height: `${(r.v1 / maxVal) * 100}%`, backgroundColor: activeDef.color }} title={`${activeDef.label}: ${r.v1}`} />
                                        )}
                                        {r.v2 != null && (
                                            <div className="rounded-t transition-all duration-500" style={{ width: '45%', height: `${(r.v2 / maxVal) * 100}%`, backgroundColor: compareDef.color }} title={`${compareDef.label}: ${r.v2}`} />
                                        )}
                                    </div>
                                    <span className="text-[7px] font-semibold text-slate-400 dark:text-[#CBD5E1] truncate w-full text-center" title={r.name}>{r.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        };

        // ── RENDER CHART BASED ON ACTIVE VIEW ──
        const renderChart = () => {
            switch (activeView) {
                case 'bar_sorted':   return renderBarSorted();
                case 'team_avg':     return renderTeamAvg();
                case 'distribution': return renderDistribution();
                case 'comparison':   return renderComparison();
                case 'trend':        return renderTrend();
                case 'histogram':    return renderHistogram();
                case 'donut':        return renderDonut();
                case 'count_bar':    return renderCountBar();
                default:             return renderBarSorted();
            }
        };

        // ── Empty state ──
        if (dailyResponses.length === 0) {
            return (
                <div className="p-16 border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl text-center bg-slate-50/50 dark:bg-[#132338]/40">
                    <BarChart3 size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 dark:text-[#CBD5E1] text-sm font-semibold uppercase tracking-wide mb-2">No daily responses yet</p>
                    <p className="text-slate-300 dark:text-[#475569] text-xs font-bold max-w-xs mx-auto">Share the Daily Wellness Check with your athletes to start collecting data.</p>
                </div>
            );
        }

        // ── MAIN RETURN ──
        return (
            <div className="space-y-6">
                {/* Controls: Metric picker + View toggle + Period/Date */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm p-5">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                        {/* Metric pills */}
                        <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Metric</div>
                            <div className="flex flex-wrap gap-1.5">
                                {METRIC_DEFS.map(m => (
                                    <button key={m.key} onClick={() => { setInsightMetric(m.key); setInsightView(VIEWS_FOR_TYPE[m.type]?.[0]?.id || 'bar_sorted'); }}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all border ${
                                            insightMetric === m.key
                                                ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm'
                                                : 'border-slate-100 dark:border-[#1A2D48] bg-slate-50 dark:bg-[#0F1C30] text-slate-500 dark:text-[#CBD5E1] hover:border-slate-200 hover:text-slate-700 dark:hover:text-[#E2E8F0]'
                                        }`}>
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* View toggle */}
                        <div className="shrink-0">
                            <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">View</div>
                            <div className="flex gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                                {viewOptions.map(v => (
                                    <button key={v.id} onClick={() => setInsightView(v.id)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                            activeView === v.id ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'
                                        }`}>
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Compare-with dropdown (only for comparison view) */}
                        {activeView === 'comparison' && (
                            <div className="shrink-0">
                                <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Compare With</div>
                                <CustomSelect
                                    variant="filter"
                                    size="xs"
                                    value={insightCompareMetric}
                                    onChange={e => setInsightCompareMetric(e.target.value)}
                                >
                                    {METRIC_DEFS.filter(m => m.type === 'scale' && m.key !== insightMetric).map(m => (
                                        <option key={m.key} value={m.key}>{m.label}</option>
                                    ))}
                                </CustomSelect>
                            </div>
                        )}

                        {/* Period toggle + Date picker */}
                        {activeView !== 'trend' && (
                            <div className="shrink-0">
                                <div className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Time Range</div>
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                                        <button onClick={() => setInsightPeriodMode(false)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${!insightPeriodMode ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'}`}>
                                            Single Day
                                        </button>
                                        <button onClick={() => setInsightPeriodMode(true)}
                                            className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all ${insightPeriodMode ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'}`}>
                                            Period
                                        </button>
                                    </div>
                                    {!insightPeriodMode && (
                                        <CustomSelect
                                            variant="filter"
                                            size="xs"
                                            value={insightDate}
                                            onChange={e => setInsightDate(e.target.value)}
                                        >
                                            {availDates.map(d => (
                                                <option key={d} value={d}>{new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</option>
                                            ))}
                                        </CustomSelect>
                                    )}
                                    {insightPeriodMode && (
                                        <span className="text-[10px] font-semibold text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600 px-3 py-1.5 rounded-lg">
                                            {wellnessDateRange === 'today' ? 'Today' : wellnessDateRange === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart card */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 dark:border-[#1A2D48] bg-slate-50/40 dark:bg-[#0F1C30]/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeDef.color }} />
                            <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">{activeDef.label}</span>
                            <span className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-medium">
                                {activeView === 'trend'
                                    ? `${dailyResponses.length} total responses`
                                    : insightPeriodMode
                                        ? `${chartResponses.length} responses across period`
                                        : `${chartResponses.length} response${chartResponses.length !== 1 ? 's' : ''} — ${periodLabel}`
                                }
                            </span>
                            {insightPeriodMode && activeView === 'bar_sorted' && (
                                <span className="text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-300">Avg per athlete</span>
                            )}
                        </div>
                        {activeDef.type === 'scale' && (
                            <span className={`text-[8px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                activeDef.negative ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-500'
                            }`}>
                                {activeDef.negative ? 'Lower is better' : 'Higher is better'}
                            </span>
                        )}
                    </div>
                    <div className="px-6 py-2 min-h-[200px]">
                        {renderChart()}
                    </div>
                </div>

                {/* Quick overview strip */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {METRIC_DEFS.filter(m => m.type === 'scale' || m.type === 'number').map(m => {
                        const vals = chartResponses.map(r => r.responses?.[m.key]).filter(v => typeof v === 'number');
                        const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
                        return (
                            <button key={m.key} onClick={() => { setInsightMetric(m.key); setInsightView('bar_sorted'); }}
                                className={`p-3 rounded-xl border transition-all text-left ${insightMetric === m.key ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50' : 'border-slate-100 dark:border-[#1A2D48] bg-white dark:bg-[#132338] hover:border-slate-200'}`}>
                                <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">{m.label}</div>
                                <div className="text-xl font-bold mt-0.5" style={{ color: m.color }}>
                                    {avg != null ? (m.key === 'sleep_hours' ? `${avg.toFixed(1)}h` : avg.toFixed(1)) : '—'}
                                </div>
                                {insightPeriodMode && <div className="text-[7px] text-slate-300 dark:text-[#475569] mt-0.5">avg across period</div>}
                            </button>
                        );
                    })}
                </div>

                {/* Deep Check Insights — aggregate panel for weekly/deep check data */}
                {weeklyResponses.length > 0 && (() => {
                    const URTI_KEYS = ['urti_hoarseness','urti_blocked_nose','urti_runny_nose','urti_sinus_pressure','urti_sneezing','urti_dry_cough','urti_wet_cough','urti_headache'];
                    const URTI_LABELS2: Record<string,string> = { urti_hoarseness:'Hoarseness', urti_blocked_nose:'Blocked Nose', urti_runny_nose:'Runny Nose', urti_sinus_pressure:'Sinus Pressure', urti_sneezing:'Sneezing', urti_dry_cough:'Dry Cough', urti_wet_cough:'Wet Cough', urti_headache:'Headache' };

                    // Infer path from matching daily response
                    const withPath = weeklyResponses.map(dc => {
                        const daily = dailyResponses.find(d => d.athlete_id === dc.athlete_id && d.session_date === dc.session_date);
                        const complaint = daily?.responses?.health_complaint;
                        const path = complaint === 'injury' ? 'injury' : complaint === 'illness' ? 'illness' : complaint === 'both' ? 'both' : 'trends';
                        return { ...dc, path };
                    });

                    const pathCounts = { injury: 0, illness: 0, both: 0, trends: 0 };
                    withPath.forEach(d => { pathCounts[d.path as keyof typeof pathCounts]++; });

                    // Hydration / nutrition averages
                    const hydVals = weeklyResponses.map(r => r.responses?.hydration).filter(v => typeof v === 'number');
                    const nutVals = weeklyResponses.map(r => r.responses?.nutrition).filter(v => typeof v === 'number');
                    const avgHyd = hydVals.length ? (hydVals.reduce((s:number,v:number) => s+v, 0)/hydVals.length).toFixed(1) : null;
                    const avgNut = nutVals.length ? (nutVals.reduce((s:number,v:number) => s+v, 0)/nutVals.length).toFixed(1) : null;

                    // Symptom frequency across illness-path checks
                    const illnessChecks = weeklyResponses.filter(dc => URTI_KEYS.some(k => (dc.responses?.[k] || 0) > 0));
                    const symptomFreq = URTI_KEYS.map(k => ({
                        label: URTI_LABELS2[k],
                        count: illnessChecks.filter(dc => (dc.responses?.[k] || 0) > 0).length,
                        avgSev: illnessChecks.length ? +(illnessChecks.reduce((s, dc) => s + (dc.responses?.[k] || 0), 0) / illnessChecks.length).toFixed(1) : 0,
                    })).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

                    const PATH_STYLES: Record<string,string> = { injury:'bg-rose-50 dark:bg-rose-700 text-rose-700 dark:text-white border-rose-100 dark:border-rose-900/40', illness:'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400 border-sky-100 dark:border-sky-900/40', both:'bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white border-indigo-100 dark:border-indigo-800/40', trends:'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]' };
                    const PATH_LABELS: Record<string,string> = { injury:'Injury', illness:'Illness', both:'Injury + Illness', trends:'Health Trends' };

                    return (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-indigo-50 shadow-sm p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-500 dark:text-indigo-300">
                                        <Thermometer size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-900 dark:text-[#E2E8F0]">Deep Check Insights</h3>
                                        <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] font-semibold mt-0.5">{weeklyResponses.length} deep check{weeklyResponses.length !== 1 ? 's' : ''} completed in period</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Path breakdown */}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-3">Check Paths</p>
                                    <div className="space-y-2">
                                        {Object.entries(pathCounts).filter(([,c]) => c > 0).map(([path, count]) => (
                                            <div key={path} className="flex items-center justify-between">
                                                <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold ${PATH_STYLES[path]}`}>{PATH_LABELS[path]}</span>
                                                <span className="text-sm font-bold text-slate-700 dark:text-[#E2E8F0]">{count}</span>
                                            </div>
                                        ))}
                                        {Object.values(pathCounts).every(c => c === 0) && (
                                            <p className="text-xs text-slate-300 dark:text-[#475569] italic">No path data</p>
                                        )}
                                    </div>
                                </div>

                                {/* Hydration + Nutrition */}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-3">Avg Scores (Team)</p>
                                    <div className="space-y-3">
                                        {avgHyd != null && (
                                            <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800/40 rounded-xl">
                                                <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400 uppercase">Hydration</span>
                                                <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{avgHyd}<span className="text-xs font-medium text-cyan-400 dark:text-cyan-600">/10</span></span>
                                            </div>
                                        )}
                                        {avgNut != null && (
                                            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-100 dark:border-emerald-800/40 rounded-xl">
                                                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">Nutrition</span>
                                                <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{avgNut}<span className="text-xs font-medium text-emerald-400 dark:text-emerald-600">/10</span></span>
                                            </div>
                                        )}
                                        {avgHyd == null && avgNut == null && <p className="text-xs text-slate-300 dark:text-[#475569] italic">No data</p>}
                                    </div>
                                </div>

                                {/* Symptom frequency */}
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-[#CBD5E1] mb-3">
                                        Illness Symptoms{illnessChecks.length > 0 ? ` (${illnessChecks.length} checks)` : ''}
                                    </p>
                                    {symptomFreq.length > 0 ? (
                                        <div className="space-y-1.5">
                                            {symptomFreq.map(s => (
                                                <div key={s.label} className="flex items-center gap-2">
                                                    <div className="flex-1 bg-slate-100 dark:bg-[#1A2D48] rounded-full h-1.5 overflow-hidden">
                                                        <div className="bg-sky-400 h-full rounded-full" style={{ width: `${(s.count / illnessChecks.length) * 100}%` }} />
                                                    </div>
                                                    <span className="text-[9px] font-semibold text-slate-500 dark:text-[#CBD5E1] w-20 truncate">{s.label}</span>
                                                    <span className="text-[9px] font-bold text-slate-700 dark:text-[#E2E8F0] w-6 text-right">{s.count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-300 dark:text-[#475569] italic">No illness checks in period</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Individual breakdown table (only for single-day mode) */}
                {!insightPeriodMode && (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border-2 border-slate-100 dark:border-[#1A2D48] shadow-sm overflow-hidden">
                        <div className="px-6 py-3 border-b border-slate-50 dark:border-[#1A2D48] bg-slate-50/40 dark:bg-[#0F1C30]/40">
                            <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">Individual Breakdown — {periodLabel}</h4>
                        </div>
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/30 dark:bg-[#0F1C30]/30">
                                        <th className="px-4 py-2.5 text-left font-semibold text-slate-500 dark:text-[#CBD5E1]">Athlete</th>
                                        {METRIC_DEFS.filter(m => m.type === 'scale').map(m => (
                                            <th key={m.key} className="px-3 py-2.5 text-center font-semibold text-slate-500 dark:text-[#CBD5E1]">{m.label}</th>
                                        ))}
                                        <th className="px-3 py-2.5 text-center font-semibold text-slate-500 dark:text-[#CBD5E1]">Sleep</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-slate-500 dark:text-[#CBD5E1]">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {dateResponses.map(r => {
                                        const a = athletes.find(att => att.id === r.athlete_id);
                                        const resp = r.responses || {};
                                        return (
                                            <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]/60 dark:bg-[#132338]/40 transition-colors cursor-pointer"
                                                onClick={() => openAthlete(r.athlete_id)}>
                                                <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-[#E2E8F0]">{a?.name || 'Unknown'}</td>
                                                {METRIC_DEFS.filter(m => m.type === 'scale').map(m => {
                                                    const v = resp[m.key];
                                                    const bg = v == null ? '' :
                                                        m.negative
                                                            ? v <= 3 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : v <= 6 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                            : v >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : v >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
                                                    return (
                                                        <td key={m.key} className="px-3 py-2.5 text-center">
                                                            {v != null ? <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${bg}`}>{v}</span> : <span className="text-slate-200">—</span>}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-3 py-2.5 text-center">
                                                    {resp.sleep_hours != null
                                                        ? <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[10px] ${resp.sleep_hours >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : resp.sleep_hours >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{resp.sleep_hours}h</span>
                                                        : <span className="text-slate-200">—</span>}
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                                                        resolveAvailability(r) === 'available' ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-600' :
                                                        resolveAvailability(r) === 'modified' ? 'bg-amber-100 text-amber-600' :
                                                        'bg-rose-100 text-rose-600'
                                                    }`}>{resolveAvailability(r)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Mobile cards (<lg) — same data + colour rules as the table above.
                            Charts/gauges above are untouched (they stay in graph form). */}
                        <div className="lg:hidden p-3 space-y-2">
                            {dateResponses.length === 0 ? (
                                <div className="text-center py-8 text-sm text-slate-400 dark:text-[#CBD5E1]">No responses for this day</div>
                            ) : dateResponses.map(r => {
                                const a = athletes.find(att => att.id === r.athlete_id);
                                const resp = r.responses || {};
                                const avail = resolveAvailability(r);
                                return (
                                    <div key={r.id} onClick={() => openAthlete(r.athlete_id)}
                                        className="p-3 rounded-xl border border-slate-100 dark:border-[#1A2D48] bg-white dark:bg-[#132338] cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2D48]/60 transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0] truncate">{a?.name || 'Unknown'}</span>
                                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] uppercase shrink-0 ${
                                                avail === 'available' ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-600' :
                                                avail === 'modified' ? 'bg-amber-100 text-amber-600' :
                                                'bg-rose-100 text-rose-600'
                                            }`}>{avail}</span>
                                        </div>
                                        <div className="flex items-center flex-wrap gap-1.5 mt-2">
                                            {METRIC_DEFS.filter(m => m.type === 'scale').map(m => {
                                                const v = resp[m.key];
                                                if (v == null) return null;
                                                const bg = m.negative
                                                    ? v <= 3 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : v <= 6 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                    : v >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : v >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
                                                return (
                                                    <span key={m.key} className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${bg}`}>{m.label} {v}</span>
                                                );
                                            })}
                                            {resp.sleep_hours != null && (
                                                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold ${resp.sleep_hours >= 7 ? 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700' : resp.sleep_hours >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>Sleep {resp.sleep_hours}h</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        );
};

export default WellnessInsightsTab;
