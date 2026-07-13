// GPS Chart Builder — controlled config panel + live preview.
// Parent owns the `config` (so a saved dashboard can feed one in for editing);
// this component renders the controls and, beside them, a live GpsChartRenderer.

import React, { useMemo, useRef } from 'react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import DatePicker from '../../../components/ui/DatePicker';
import {
    BarChart3Icon, LineChartIcon, PieChartIcon, LayersIcon, ScatterChartIcon, AlignLeftIcon, PlusIcon, XIcon,
    ImageIcon, FileTextIcon, FileDownIcon,
} from 'lucide-react';
import type { GpsChartConfig, GpsRow, ChartType, MetricDef } from './types';
import GpsChartRenderer from './GpsChartRenderer';
import { GPS_PRESETS } from './presets';
import { downloadChartPng, downloadChartCsv, exportChartPdf } from './exportChart';

interface Props {
    config: GpsChartConfig;
    onChange: (c: GpsChartConfig) => void;
    rows: GpsRow[];
    teams: any[];
    colLabel: (k: string) => string;
    numericGpsCols: string[];
    isExcluded?: (athleteId: string, date: string) => boolean;
    /** Optional action slot (Save / Export buttons) rendered in the preview header. */
    actions?: React.ReactNode;
}

const CHART_TYPES: { type: ChartType; label: string; Icon: any }[] = [
    { type: 'bar', label: 'Bar', Icon: BarChart3Icon },
    { type: 'horizontalBar', label: 'Ranking', Icon: AlignLeftIcon },
    { type: 'line', label: 'Line', Icon: LineChartIcon },
    { type: 'stackedBar', label: 'Stacked', Icon: LayersIcon },
    { type: 'pie', label: 'Pie', Icon: PieChartIcon },
    { type: 'scatter', label: 'Scatter', Icon: ScatterChartIcon },
];

function colGroup(k: string): string {
    if (/number of acceleration/i.test(k)) return 'Accelerations';
    if (/time in hr zone/i.test(k)) return 'HR Zones';
    if (/time in power zone|muscle load in power zone/i.test(k)) return 'Power Zones';
    if (/distance in speed zone/i.test(k)) return 'Speed Zones';
    if (/\bhr (min|avg|max)\b|\bhr\b.*\b(bpm|%)\b/i.test(k)) return 'Heart Rate';
    if (/load|recovery time|calorie/i.test(k)) return 'Load & Recovery';
    if (/hrv|rmssd|rr interval/i.test(k)) return 'HRV';
    if (/distance|speed|sprint|km.h|m.min/i.test(k)) return 'Speed & Distance';
    return 'Other';
}
const GROUP_ORDER = ['Speed & Distance', 'Speed Zones', 'Heart Rate', 'HR Zones', 'Accelerations', 'Load & Recovery', 'Power Zones', 'HRV', 'Other'];

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">{label}</span>
        {children}
    </div>
);

/** Grouped column dropdown. */
const ColumnSelect: React.FC<{ value: string; onChange: (v: string) => void; cols: string[]; colLabel: (k: string) => string; placeholder?: string }> = ({ value, onChange, cols, colLabel, placeholder }) => {
    const grouped = useMemo(() => {
        const g: Record<string, string[]> = {};
        for (const c of cols) (g[colGroup(c)] ||= []).push(c);
        return g;
    }, [cols]);
    return (
        <CustomSelect value={value} onChange={e => onChange(e.target.value)} variant="form" size="xs" placeholder={placeholder || 'Select column'}>
            <option value="">{placeholder || 'Select column'}</option>
            {GROUP_ORDER.filter(g => grouped[g]?.length).map(g => (
                <optgroup key={g} label={g}>
                    {grouped[g].map(c => <option key={c} value={c}>{colLabel(c)}</option>)}
                </optgroup>
            ))}
        </CustomSelect>
    );
};

export const GpsChartBuilder: React.FC<Props> = ({ config, onChange, rows, teams, colLabel, numericGpsCols, isExcluded, actions }) => {
    const previewRef = useRef<HTMLDivElement>(null);
    const [notice, setNotice] = React.useState<string | null>(null);
    const patch = (p: Partial<GpsChartConfig>) => onChange({ ...config, ...p });
    const flash = (msg: string) => { setNotice(msg); window.setTimeout(() => setNotice(n => (n === msg ? null : n)), 4000); };

    const isRatio = config.metric.kind === 'ratio';
    const needsSeries = config.chartType === 'stackedBar' || config.chartType === 'pie';
    const isTrend = config.dimension === 'date';

    const toggleSeriesCol = (c: string) => {
        const cur = config.seriesColumns || [];
        patch({ seriesColumns: cur.includes(c) ? cur.filter(x => x !== c) : [...cur, c] });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
            {/* ── Config panel ──────────────────────────────────────────── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 flex flex-col gap-4 max-h-[720px] overflow-y-auto no-scrollbar">
                {/* Presets */}
                <Section label="Start from a preset">
                    <div className="flex flex-wrap gap-1.5">
                        {GPS_PRESETS.map(p => (
                            <button key={p.id} title={p.description}
                                onClick={() => { const c = p.build(numericGpsCols); if (c) onChange({ ...c, id: config.id, teamFilter: config.teamFilter }); }}
                                className="px-2.5 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                                {p.label}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Title */}
                <Section label="Chart title">
                    <input value={config.title} onChange={e => patch({ title: e.target.value })}
                        className="w-full text-xs rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] px-2.5 py-2 text-slate-800 dark:text-[#E2E8F0] outline-none focus:ring-1 focus:ring-indigo-300" />
                </Section>

                {/* Chart type */}
                <Section label="Chart type">
                    <div className="grid grid-cols-3 gap-1.5">
                        {CHART_TYPES.map(({ type, label, Icon }) => (
                            <button key={type} onClick={() => patch({ chartType: type })}
                                className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] font-medium transition-all ${config.chartType === type ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:border-slate-300'}`}>
                                <Icon size={16} /> {label}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Team */}
                <Section label="Team">
                    <CustomSelect value={config.teamFilter} onChange={e => patch({ teamFilter: e.target.value })} variant="form" size="xs">
                        <option value="All Athletes">All Athletes</option>
                        {teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </CustomSelect>
                </Section>

                {/* Compare axis (bar/line only) */}
                {(config.chartType === 'bar' || config.chartType === 'line' || config.chartType === 'horizontalBar') && (
                    <Section label="Compare by">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                            {(['athlete', 'date'] as const).map(dim => (
                                <button key={dim} onClick={() => patch({ dimension: dim })}
                                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all capitalize ${config.dimension === dim ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>
                                    {dim === 'athlete' ? 'Athletes' : 'Over time'}
                                </button>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Metric */}
                {!needsSeries && (
                    <Section label="Metric">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg mb-1.5">
                            <button onClick={() => patch({ metric: { kind: 'column', column: config.metric.kind === 'column' ? config.metric.column : '' } })}
                                className={`flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${!isRatio ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>Single column</button>
                            <button onClick={() => patch({ metric: { kind: 'ratio', numerator: '', denominator: '', asPercent: true } })}
                                className={`flex-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${isRatio ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>Ratio / %</button>
                        </div>
                        {config.metric.kind === 'column' ? (
                            <ColumnSelect value={config.metric.column} onChange={v => patch({ metric: { kind: 'column', column: v } })} cols={numericGpsCols} colLabel={colLabel} />
                        ) : (
                            <div className="flex flex-col gap-1.5">
                                <ColumnSelect value={config.metric.numerator} onChange={v => patch({ metric: { ...(config.metric as any), numerator: v } })} cols={numericGpsCols} colLabel={colLabel} placeholder="Numerator (top)" />
                                <div className="text-center text-[10px] text-slate-400">divided by</div>
                                <ColumnSelect value={config.metric.denominator} onChange={v => patch({ metric: { ...(config.metric as any), denominator: v } })} cols={numericGpsCols} colLabel={colLabel} placeholder="Denominator (bottom)" />
                                <label className="flex items-center gap-2 mt-0.5 cursor-pointer">
                                    <input type="checkbox" checked={(config.metric as any).asPercent} onChange={e => patch({ metric: { ...(config.metric as any), asPercent: e.target.checked } })} className="accent-indigo-600" />
                                    <span className="text-[11px] text-slate-600 dark:text-[#CBD5E1]">Show as percentage (×100)</span>
                                </label>
                            </div>
                        )}
                    </Section>
                )}

                {/* Scatter Y2 */}
                {config.chartType === 'scatter' && (
                    <Section label="Second metric (Y axis)">
                        <ColumnSelect value={config.metricY2?.kind === 'column' ? config.metricY2.column : ''} onChange={v => patch({ metricY2: { kind: 'column', column: v } })} cols={numericGpsCols} colLabel={colLabel} />
                    </Section>
                )}

                {/* Series columns (stacked / pie) */}
                {needsSeries && (
                    <Section label="Columns to stack / split">
                        <div className="max-h-40 overflow-y-auto no-scrollbar border border-slate-200 dark:border-[#243A58] rounded-lg divide-y divide-slate-100 dark:divide-[#1A2D48]">
                            {numericGpsCols.map(c => (
                                <label key={c} className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                    <input type="checkbox" checked={config.seriesColumns?.includes(c) || false} onChange={() => toggleSeriesCol(c)} className="accent-indigo-600" />
                                    <span className="text-[11px] text-slate-700 dark:text-[#CBD5E1] truncate">{colLabel(c)}</span>
                                </label>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Athlete (trend of single athlete) */}
                {isTrend && (
                    <Section label="Athlete (blank = team average)">
                        <CustomSelect value={config.athleteId || ''} onChange={e => patch({ athleteId: e.target.value || undefined })} variant="form" size="xs">
                            <option value="">Team average</option>
                            {athletesOf(rows, teams, config.teamFilter).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </CustomSelect>
                    </Section>
                )}

                {/* Dates */}
                <Section label="Dates">
                    <CustomSelect value={config.dateSpec.mode} onChange={e => patch({ dateSpec: defaultDateSpec(e.target.value) })} variant="form" size="xs">
                        <option value="single">Single day</option>
                        <option value="range">Date range</option>
                        <option value="specific">Specific dates</option>
                        <option value="relative">Rolling (live)</option>
                    </CustomSelect>
                    {config.dateSpec.mode === 'single' && (
                        <DatePicker value={config.dateSpec.date} onChange={e => patch({ dateSpec: { mode: 'single', date: e.target.value } })} />
                    )}
                    {config.dateSpec.mode === 'range' && (
                        <div className="flex items-center gap-2">
                            <DatePicker value={config.dateSpec.start} onChange={e => patch({ dateSpec: { ...(config.dateSpec as any), start: e.target.value } })} />
                            <span className="text-[10px] text-slate-400">to</span>
                            <DatePicker value={config.dateSpec.end} onChange={e => patch({ dateSpec: { ...(config.dateSpec as any), end: e.target.value } })} />
                        </div>
                    )}
                    {config.dateSpec.mode === 'specific' && (
                        <SpecificDates dates={config.dateSpec.dates} onChange={dates => patch({ dateSpec: { mode: 'specific', dates } })} />
                    )}
                    {config.dateSpec.mode === 'relative' && (
                        <div className="flex flex-col gap-1.5">
                            <CustomSelect value={config.dateSpec.window} onChange={e => patch({ dateSpec: { mode: 'relative', window: e.target.value as any, n: (config.dateSpec as any).n } })} variant="form" size="xs">
                                <option value="lastSession">Most recent session</option>
                                <option value="last7">Last 7 days</option>
                                <option value="last14">Last 14 days</option>
                                <option value="last28">Last 28 days</option>
                                <option value="last90">Last 90 days</option>
                                <option value="lastN">Last N sessions…</option>
                            </CustomSelect>
                            {config.dateSpec.window === 'lastN' && (
                                <input type="number" min={1} value={config.dateSpec.n || 5} onChange={e => patch({ dateSpec: { mode: 'relative', window: 'lastN', n: parseInt(e.target.value) || 1 } })}
                                    className="w-full text-xs rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] px-2.5 py-2 text-slate-800 dark:text-[#E2E8F0] outline-none focus:ring-1 focus:ring-indigo-300" />
                            )}
                        </div>
                    )}
                </Section>

                {/* Aggregation + sort */}
                {!isTrend && (
                    <div className="grid grid-cols-2 gap-3">
                        <Section label="Aggregate">
                            <CustomSelect value={config.aggregation} onChange={e => patch({ aggregation: e.target.value as any })} variant="form" size="xs">
                                <option value="average">Average</option>
                                <option value="sum">Sum</option>
                                <option value="max">Max</option>
                                <option value="min">Min</option>
                            </CustomSelect>
                        </Section>
                        <Section label="Sort">
                            <CustomSelect value={config.sort} onChange={e => patch({ sort: e.target.value as any })} variant="form" size="xs">
                                <option value="desc">High → Low</option>
                                <option value="asc">Low → High</option>
                                <option value="none">Unsorted</option>
                            </CustomSelect>
                        </Section>
                    </div>
                )}

                {/* Axis titles */}
                <div className="grid grid-cols-2 gap-3">
                    <Section label="X-axis title">
                        <input value={config.axis.x || ''} onChange={e => patch({ axis: { ...config.axis, x: e.target.value } })} placeholder="Auto"
                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] px-2.5 py-2 text-slate-800 dark:text-[#E2E8F0] outline-none focus:ring-1 focus:ring-indigo-300" />
                    </Section>
                    <Section label="Y-axis title">
                        <input value={config.axis.y || ''} onChange={e => patch({ axis: { ...config.axis, y: e.target.value } })} placeholder="Auto"
                            className="w-full text-xs rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] px-2.5 py-2 text-slate-800 dark:text-[#E2E8F0] outline-none focus:ring-1 focus:ring-indigo-300" />
                    </Section>
                </div>

                {/* Options */}
                <div className="flex flex-col gap-2">
                    {(config.chartType === 'bar' || config.chartType === 'horizontalBar') && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={config.colorBy === 'category'} onChange={e => patch({ colorBy: e.target.checked ? 'category' : 'none' })} className="accent-indigo-600" />
                            <span className="text-[11px] text-slate-600 dark:text-[#CBD5E1]">Colour bars by session type (match/training/recovery)</span>
                        </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={config.excludeInjured} onChange={e => patch({ excludeInjured: e.target.checked })} className="accent-indigo-600" />
                        <span className="text-[11px] text-slate-600 dark:text-[#CBD5E1]">Exclude injured / excluded athletes</span>
                    </label>
                </div>
            </div>

            {/* ── Live preview ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-end gap-2 flex-wrap">
                    {actions}
                    <button onClick={() => downloadChartPng(previewRef.current!, config.title).catch(err => flash(err.message))}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                        <ImageIcon size={14} /> PNG
                    </button>
                    <button onClick={() => exportChartPdf(previewRef.current!, config.title).catch(err => flash(err.message))}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                        <FileDownIcon size={14} /> PDF
                    </button>
                    <button onClick={() => { try { downloadChartCsv(config, rows, teams, colLabel, isExcluded); } catch (err: any) { flash(err.message); } }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                        <FileTextIcon size={14} /> CSV
                    </button>
                </div>
                {notice && (
                    <div className="px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 text-[11px] text-amber-700 dark:text-amber-300">{notice}</div>
                )}
                <GpsChartRenderer ref={previewRef} config={config} rows={rows} teams={teams} colLabel={colLabel}
                    isExcluded={config.excludeInjured ? isExcluded : undefined} height={420} />
            </div>
        </div>
    );
};

// ── Specific-dates chip editor ──────────────────────────────────────────────
const SpecificDates: React.FC<{ dates: string[]; onChange: (d: string[]) => void }> = ({ dates, onChange }) => {
    const [pending, setPending] = React.useState('');
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
                <DatePicker value={pending} onChange={e => setPending(e.target.value)} placeholder="Pick a date" />
                <button onClick={() => { if (pending && !dates.includes(pending)) { onChange([...dates, pending].sort()); setPending(''); } }}
                    className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shrink-0" aria-label="Add date"><PlusIcon size={14} /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {dates.map(d => (
                    <span key={d} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1A2D48] text-[11px] text-slate-600 dark:text-[#CBD5E1]">
                        {new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        <button onClick={() => onChange(dates.filter(x => x !== d))} aria-label="Remove date" className="hover:text-rose-500"><XIcon size={11} /></button>
                    </span>
                ))}
                {dates.length === 0 && <span className="text-[10px] text-slate-400">No dates picked yet</span>}
            </div>
        </div>
    );
};

function defaultDateSpec(mode: string): GpsChartConfig['dateSpec'] {
    const today = new Date().toISOString().split('T')[0];
    if (mode === 'range') { const d = new Date(); d.setDate(d.getDate() - 28); return { mode: 'range', start: d.toISOString().split('T')[0], end: today }; }
    if (mode === 'specific') return { mode: 'specific', dates: [] };
    if (mode === 'relative') return { mode: 'relative', window: 'last28' };
    return { mode: 'single', date: today };
}

function athletesOf(rows: GpsRow[], teams: any[], teamFilter: string): { id: string; name: string }[] {
    const scoped = teamFilter === 'All Athletes' ? rows : (() => {
        const t = teams.find(x => x.name === teamFilter);
        const ids = new Set((t?.players || []).map((p: any) => p.id));
        return rows.filter(r => ids.has(r.athleteId));
    })();
    const seen = new Set<string>(); const out: { id: string; name: string }[] = [];
    for (const r of scoped) {
        if (r.athleteId && r.athleteId !== 'unknown' && !seen.has(r.athleteId)) {
            seen.add(r.athleteId); out.push({ id: r.athleteId, name: r.matchedName || r.playerName || 'Unknown' });
        }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
}

export default GpsChartBuilder;
