import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    question:     any;   // question object with visualization config + templateName
    allQuestions: any[]; // all questions in templates (unfiltered, for vs_bar lookup)
    responses:    any[]; // filteredResponses (team + date range already applied)
    athletes:     any[]; // activeTeam.players
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#06b6d4', '#6366f1', '#f59e0b', '#ec4899', '#10b981', '#f97316', '#8b5cf6', '#14b8a6'];

const TOOLTIP_STYLE = {
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
};

const AXIS_TICK = { fontSize: 8, fontWeight: 700, fill: '#94a3b8' };

const CHART_LABEL: Record<string, string> = {
    bar:            'Bar — per athlete',
    vs_bar:         'Grouped — comparison',
    count_bar:      'Count Bar',
    pie:            'Pie / Donut',
    line:           'Line over time',
    horizontal_bar: 'Horizontal Bar',
};

const CHART_ICON: Record<string, React.ReactNode> = {
    bar:            <BarChart3 size={13} className="text-cyan-400" />,
    vs_bar:         <BarChart3 size={13} className="text-violet-400" />,
    count_bar:      <BarChart3 size={13} className="text-indigo-400" />,
    pie:            <PieIcon   size={13} className="text-emerald-400" />,
    line:           <TrendingUp size={13} className="text-blue-400" />,
    horizontal_bar: <BarChart3 size={13} className="text-amber-400" />,
};

// ─── Component ────────────────────────────────────────────────────────────────

const WellnessChartCard: React.FC<Props> = ({ question, allQuestions, responses, athletes }) => {
    const chartType = question.visualization?.chartType || 'bar';
    const scaleMax  = question.scaleMax ?? (
        question.type === 'scale_1_10' ? 10 :
        question.type === 'scale_0_3'  ? 3  : 5
    );

    // ── Most recent value per athlete ───────────────────────────────────────
    const latestByAthlete = useMemo<Record<string, any>>(() => {
        const map: Record<string, any> = {};
        [...responses]
            .sort((a, b) => a.session_date.localeCompare(b.session_date))
            .forEach(r => {
                if (r.responses?.[question.id] !== undefined) {
                    map[r.athlete_id] = r.responses[question.id];
                }
            });
        return map;
    }, [responses, question.id]);

    // ── Bar data: per-athlete scale value, ascending ────────────────────────
    const barData = useMemo(() => {
        if (chartType !== 'bar') return [];
        return athletes
            .map(a => ({ name: (a.name || '').split(' ')[0], value: latestByAthlete[a.id] ?? null }))
            .filter(d => d.value !== null)
            .sort((a, b) => (a.value as number) - (b.value as number));
    }, [athletes, latestByAthlete, chartType]);

    // ── Count data: how many athletes selected each category ────────────────
    const countData = useMemo(() => {
        if (chartType !== 'count_bar' && chartType !== 'pie') return [];
        const counts: Record<string, number> = {};

        // Pre-seed with question options so zero-count options still appear
        if (question.type === 'yes_no') {
            counts['Yes'] = 0;
            counts['No']  = 0;
        } else if (question.options?.length) {
            question.options.forEach((opt: string) => { counts[opt] = 0; });
        }

        responses.forEach(r => {
            const val = r.responses?.[question.id];
            if (val === null || val === undefined) return;

            if (question.type === 'body_map') {
                (Array.isArray(val) ? val : []).forEach((area: any) => {
                    const name = typeof area === 'string' ? area : area?.area;
                    if (name) counts[name] = (counts[name] || 0) + 1;
                });
            } else if (Array.isArray(val)) {
                // checklist — multiple selections
                val.forEach((v: string) => { counts[String(v)] = (counts[String(v)] || 0) + 1; });
            } else if (question.type === 'yes_no') {
                const key = (val === true || val === 'yes' || val === 'Yes') ? 'Yes' : 'No';
                counts[key] = (counts[key] || 0) + 1;
            } else {
                counts[String(val)] = (counts[String(val)] || 0) + 1;
            }
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .filter(d => d.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [responses, question, chartType]);

    // ── Line data: team average per date ────────────────────────────────────
    const lineData = useMemo(() => {
        if (chartType !== 'line') return [];
        const byDate: Record<string, { sum: number; count: number }> = {};
        responses.forEach(r => {
            const val = r.responses?.[question.id];
            if (typeof val === 'number') {
                if (!byDate[r.session_date]) byDate[r.session_date] = { sum: 0, count: 0 };
                byDate[r.session_date].sum   += val;
                byDate[r.session_date].count += 1;
            }
        });
        return Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, { sum, count }]) => ({
                date: new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
                avg:  parseFloat((sum / count).toFixed(1)),
            }));
    }, [responses, question.id, chartType]);

    // ── Grouped data: two scale questions side-by-side ───────────────────────
    const vsResult = useMemo(() => {
        if (chartType !== 'vs_bar') return { data: [], compareQ: null };
        const compareQ = allQuestions.find((q: any) => q.id === question.visualization?.compareWith);

        const compareLatest: Record<string, any> = {};
        if (compareQ) {
            [...responses]
                .sort((a, b) => a.session_date.localeCompare(b.session_date))
                .forEach(r => {
                    if (r.responses?.[compareQ.id] !== undefined) {
                        compareLatest[r.athlete_id] = r.responses[compareQ.id];
                    }
                });
        }

        const data = athletes
            .map(a => ({
                name: (a.name || '').split(' ')[0],
                q1:   latestByAthlete[a.id]   ?? null,
                q2:   compareLatest[a.id]      ?? null,
            }))
            .filter(d => d.q1 !== null || d.q2 !== null);

        return { data, compareQ };
    }, [athletes, responses, question, allQuestions, latestByAthlete, chartType]);

    // ── Empty state check ────────────────────────────────────────────────────
    const isEmpty =
        (chartType === 'bar'       && barData.length   === 0) ||
        (['count_bar', 'pie'].includes(chartType) && countData.length === 0) ||
        (chartType === 'line'      && lineData.length  === 0) ||
        (chartType === 'vs_bar'    && vsResult.data.length === 0);

    // ── Chart render ─────────────────────────────────────────────────────────
    const renderChart = () => {
        if (isEmpty) {
            return (
                <div className="h-44 flex flex-col items-center justify-center gap-2 bg-slate-50/30">
                    <BarChart3 size={28} className="text-slate-200" />
                    <p className="text-[9px] font-semibold text-slate-300 uppercase tracking-wide">
                        No data for this period
                    </p>
                </div>
            );
        }

        // ── Bar per athlete ─────────────────────────────────────────────────
        if (chartType === 'bar') {
            return (
                <div className="px-2 pt-3 pb-1">
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={barData} margin={{ top: 4, right: 4, left: -28, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={AXIS_TICK} angle={-35} textAnchor="end" interval={0} />
                            <YAxis tick={AXIS_TICK} domain={[0, scaleMax]} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Bar dataKey="value" radius={[3, 3, 0, 0]} fill="#06b6d4" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        // ── Count bar: category frequency ───────────────────────────────────
        if (chartType === 'count_bar') {
            return (
                <div className="px-2 pt-3 pb-1">
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={countData} margin={{ top: 4, right: 4, left: -28, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={AXIS_TICK} angle={-35} textAnchor="end" interval={0} />
                            <YAxis tick={AXIS_TICK} allowDecimals={false} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} athletes`, 'Count']} />
                            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                                {countData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        // ── Pie / donut ─────────────────────────────────────────────────────
        if (chartType === 'pie') {
            return (
                <div className="px-2 pt-2 pb-1">
                    <ResponsiveContainer width="100%" height={166}>
                        <PieChart>
                            <Pie
                                data={countData}
                                cx="50%"
                                cy="46%"
                                innerRadius={28}
                                outerRadius={58}
                                dataKey="count"
                                nameKey="name"
                                paddingAngle={2}
                            >
                                {countData.map((_, i) => (
                                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={TOOLTIP_STYLE}
                                formatter={(v, name) => [`${v} athletes`, name]}
                            />
                            <Legend
                                iconType="circle"
                                iconSize={6}
                                wrapperStyle={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        // ── Line: team avg over time ────────────────────────────────────────
        if (chartType === 'line') {
            return (
                <div className="px-2 pt-3 pb-1">
                    <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={lineData} margin={{ top: 4, right: 8, left: -28, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="date" tick={AXIS_TICK} />
                            <YAxis tick={AXIS_TICK} domain={[0, scaleMax]} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Line
                                type="monotone"
                                dataKey="avg"
                                stroke="#06b6d4"
                                strokeWidth={2}
                                dot={{ r: 3, fill: '#06b6d4', strokeWidth: 0 }}
                                activeDot={{ r: 5 }}
                                name="Team Avg"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        // ── Grouped (vs): two metrics side-by-side ──────────────────────────
        if (chartType === 'vs_bar') {
            if (!vsResult.compareQ) {
                return (
                    <div className="h-44 flex flex-col items-center justify-center gap-2 bg-amber-50/30 px-6">
                        <BarChart3 size={22} className="text-amber-300" />
                        <p className="text-[9px] font-semibold text-amber-400 uppercase tracking-wide text-center leading-relaxed">
                            No comparison question set.<br />Edit this template to configure.
                        </p>
                    </div>
                );
            }
            const q1Label = (question.text || 'Q1').slice(0, 14) + (question.text?.length > 14 ? '…' : '');
            const q2Label = (vsResult.compareQ.text || 'Q2').slice(0, 14) + (vsResult.compareQ.text?.length > 14 ? '…' : '');
            return (
                <div className="px-2 pt-3 pb-1">
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={vsResult.data} margin={{ top: 4, right: 4, left: -28, bottom: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="name" tick={AXIS_TICK} angle={-35} textAnchor="end" interval={0} />
                            <YAxis tick={AXIS_TICK} />
                            <Tooltip contentStyle={TOOLTIP_STYLE} />
                            <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 9, fontWeight: 700, color: '#64748b' }} />
                            <Bar dataKey="q1"  name={q1Label} fill="#06b6d4" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="q2"  name={q2Label} fill="#6366f1" radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            );
        }

        return null;
    };

    // ── Card ─────────────────────────────────────────────────────────────────
    return (
        <div className="bg-white rounded-xl border-2 border-slate-100 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-50">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 leading-tight">
                            {question.text || 'Unnamed question'}
                        </p>
                        {question.templateName && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">
                                {question.templateName}
                            </p>
                        )}
                    </div>
                    <span className="px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-semibold text-slate-400 uppercase shrink-0">
                        {question.visualization?.aggregation || 'daily'}
                    </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                    {CHART_ICON[chartType]}
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                        {CHART_LABEL[chartType] || chartType}
                    </span>
                    {chartType === 'vs_bar' && vsResult.compareQ && (
                        <span className="text-[9px] font-bold text-slate-300 ml-1">
                            vs {(vsResult.compareQ.text || '').slice(0, 18)}…
                        </span>
                    )}
                </div>
            </div>

            {renderChart()}
        </div>
    );
};

export default WellnessChartCard;
