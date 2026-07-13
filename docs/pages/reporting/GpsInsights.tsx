// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect } from 'react';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { ActivityIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DatePicker from '../../components/ui/DatePicker';
import { LayoutDashboardIcon, SlidersHorizontalIcon } from 'lucide-react';
import GpsChartBuilder from './gpsBuilder/GpsChartBuilder';
import GpsDashboardsView from './gpsBuilder/GpsDashboardsView';
import SaveToDashboardButton from './gpsBuilder/SaveToDashboardButton';
import { newChartConfig, type GpsChartConfig } from './gpsBuilder/types';

export const GpsInsights: React.FC<any> = ({
    acwrExclusions,
    gpsColLabel,
    gpsData,
    gpsRangeEnd,
    gpsRangeStart,
    insightAthleteId,
    insightDateMode,
    insightMetric,
    insightRollingAvg,
    insightScope,
    insightShowPerAthlete,
    insightSingleDate,
    insightTeamFilter,
    numericGpsCols,
    setGpsRangeEnd,
    setGpsRangeStart,
    setGpsTab,
    setInsightAthleteId,
    setInsightDateMode,
    setInsightMetric,
    setInsightRollingAvg,
    setInsightScope,
    setInsightShowPerAthlete,
    setInsightSingleDate,
    setInsightTeamFilter,
    teams,
}) => {
        const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6','#a855f7','#64748b'];
        const CAT_COLORS: Record<string, string> = { match: '#ef4444', recovery: '#10b981', training: '#6366f1' };

        // Insights view mode: the original quick view, the configurable chart
        // builder, or saved dashboards (GPS Chart Builder Phases A–C).
        const [viewMode, setViewMode] = useState<'quick' | 'builder' | 'dashboards'>('quick');
        const [builderConfig, setBuilderConfig] = useState<GpsChartConfig>(() => newChartConfig());
        // When editing a chart that lives in a dashboard, remember where it came
        // from so "Save" updates that dashboard instead of duplicating.
        const [editingSource, setEditingSource] = useState<string | null>(null);
        // Backfill a sensible default metric once GPS columns are known.
        useEffect(() => {
            if (viewMode === 'builder' && builderConfig.metric.kind === 'column' && !builderConfig.metric.column && numericGpsCols.length) {
                const col = numericGpsCols.find(k => /total distance/i.test(k)) || numericGpsCols[0];
                setBuilderConfig(c => ({ ...c, metric: { kind: 'column', column: col } }));
            }
        }, [viewMode, numericGpsCols, builderConfig.metric]);

        const fmtDate = (d: string) => {
            try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
            catch { return d; }
        };
        const fmtDateFull = (d: string) => {
            try { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
            catch { return d; }
        };

        const extractUnit = (col: string): string => { const m = col.match(/\[([^\]]+)\]/); return m ? m[1] : ''; };

        // Was this athlete excluded (injured/excluded) on the given date?
        // Checks: exclusion started on/before `date` AND (still excluded OR date is before returnDate)
        const wasExcludedOnDate = (athleteId: string, date: string): boolean => {
            const ex = acwrExclusions?.[athleteId];
            if (!ex || ex.excluded === false && !ex.excludedDate) return false;
            const startDate = ex.excludedDate;
            if (!startDate || date < startDate) return false;  // exclusion hadn't started yet
            if (ex.excluded === true) return true;              // currently excluded, started on/before date
            if (ex.returnDate && date < ex.returnDate) return true; // was excluded, returned after date
            return false;
        };

        // Auto-select metric if none chosen yet
        const activeMetric = insightMetric || (numericGpsCols.find(k => /total distance/i.test(k)) ?? numericGpsCols[0] ?? '');
        const unit = extractUnit(activeMetric);
        const metricLabel = activeMetric ? gpsColLabel(activeMetric) : '';

        // Build filtered dataset scoped to the own team filter (independent of Data Import tab)
        const allGps = Array.isArray(gpsData) ? gpsData : [];
        const scopedData = allGps.filter(r => {
            if (insightTeamFilter === 'All Athletes') return true;
            const team = teams.find(t => t.name === insightTeamFilter);
            if (team) return team.players.some((p: any) => p.id === r.athleteId);
            return false;
        });

        // Date-range-filtered data
        const rangeData = scopedData.filter(r => r.date >= gpsRangeStart && r.date <= gpsRangeEnd);

        // Athletes in scope (linked only)
        const athletesInScope: {id: string; name: string}[] = [];
        const seenIds = new Set<string>();
        for (const r of scopedData) {
            if (r.athleteId && r.athleteId !== 'unknown' && !seenIds.has(r.athleteId)) {
                seenIds.add(r.athleteId);
                athletesInScope.push({ id: r.athleteId, name: r.matchedName || r.playerName });
            }
        }
        athletesInScope.sort((a, b) => a.name.localeCompare(b.name));

        // Default athlete if none selected
        const activeAthleteId = insightAthleteId || athletesInScope[0]?.id || '';
        const activeAthleteName = athletesInScope.find(a => a.id === activeAthleteId)?.name || '';

        // Column group helper
        const getColGroup = (k: string): string => {
            if (/number of acceleration/i.test(k)) return 'Accelerations';
            if (/time in hr zone/i.test(k)) return 'HR Zones';
            if (/time in power zone|muscle load in power zone/i.test(k)) return 'Power Zones';
            if (/distance in speed zone/i.test(k)) return 'Speed Zones';
            if (/\bhr (min|avg|max)\b|\bhr\b.*\b(bpm|%)\b/i.test(k)) return 'Heart Rate';
            if (/load|recovery time|calorie/i.test(k)) return 'Load & Recovery';
            if (/hrv|rmssd|rr interval/i.test(k)) return 'HRV';
            if (/distance|speed|sprint|km.h|m.min/i.test(k)) return 'Speed & Distance';
            return 'Other';
        };

        // Group numeric cols for metric selector
        const groupedCols: Record<string, string[]> = {};
        for (const k of numericGpsCols) {
            const grp = getColGroup(k);
            if (!groupedCols[grp]) groupedCols[grp] = [];
            groupedCols[grp].push(k);
        }
        const groupOrder = ['Speed & Distance','Heart Rate','HR Zones','Speed Zones','Accelerations','Load & Recovery','Power Zones','HRV','Other'];

        // ── Skeleton while metric columns are being derived ─────────────────
        if (allGps.length > 0 && numericGpsCols.length === 0) {
            return (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5 space-y-4 animate-pulse">
                    <div className="h-4 w-48 bg-slate-100 dark:bg-[#1A2D48] rounded" />
                    <div className="h-[300px] flex items-end gap-1.5 px-2">
                        {[55,70,45,80,65,90,50,75,60,85,40,72,58,88,48].map((h, i) => (
                            <div key={i} className="flex-1 bg-slate-100 dark:bg-[#1A2D48] rounded-t" style={{ height: `${h}%` }} />
                        ))}
                    </div>
                    <div className="h-3 w-32 bg-slate-100 dark:bg-[#1A2D48] rounded mx-auto" />
                </div>
            );
        }

        // ── Empty state ───────────────────────────────────────────────────────
        if (numericGpsCols.length === 0 || allGps.length === 0) {
            return (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-16 flex flex-col items-center gap-4 text-center">
                    <ActivityIcon size={40} className="text-slate-200" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">No GPS data yet</p>
                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">Import a GPS CSV first, then come back here to visualise your data.</p>
                    <button onClick={() => setGpsTab('import')} className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition-colors">
                        Go to Data Import
                    </button>
                </div>
            );
        }

        // ── Quick View / Builder / Dashboards mode switch ─────────────────────
        const modeToggle = (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg w-fit">
                {([
                    ['quick', 'Quick View', SlidersHorizontalIcon],
                    ['builder', 'Builder', SlidersHorizontalIcon],
                    ['dashboards', 'Dashboards', LayoutDashboardIcon],
                ] as const).map(([mode, label, Icon]) => (
                    <button key={mode} onClick={() => setViewMode(mode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${viewMode === mode ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>
                        <Icon size={13} /> {label}
                    </button>
                ))}
            </div>
        );

        // ── Builder mode — configurable chart studio ──────────────────────────
        if (viewMode === 'builder') {
            return (
                <div className="space-y-4">
                    {modeToggle}
                    <GpsChartBuilder
                        config={builderConfig}
                        onChange={setBuilderConfig}
                        rows={allGps}
                        teams={teams}
                        colLabel={gpsColLabel}
                        numericGpsCols={numericGpsCols}
                        isExcluded={wasExcludedOnDate}
                        actions={
                            <SaveToDashboardButton
                                config={builderConfig}
                                editingDashboardId={editingSource}
                                onSaved={() => { setEditingSource(null); setViewMode('dashboards'); }}
                            />
                        }
                    />
                </div>
            );
        }

        // ── Dashboards mode — saved chart collections, live data ──────────────
        if (viewMode === 'dashboards') {
            return (
                <div className="space-y-4">
                    {modeToggle}
                    <GpsDashboardsView
                        rows={allGps}
                        teams={teams}
                        colLabel={gpsColLabel}
                        isExcluded={wasExcludedOnDate}
                        onEditChart={(dashboardId, chart) => {
                            setBuilderConfig(chart);
                            setEditingSource(dashboardId);
                            setViewMode('builder');
                        }}
                    />
                </div>
            );
        }

        // Helper: toggle switch
        const Toggle = ({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) => (
            <label className="flex items-center gap-2 cursor-pointer self-end pb-[2px]">
                <div onClick={onToggle} className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${on ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-[#243A58]'}`}>
                    <div className={`absolute top-[1px] w-3.5 h-3.5 bg-white dark:bg-[#132338] rounded-full shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-[1px]'}`} />
                </div>
                <span className="text-xs text-slate-600 dark:text-[#CBD5E1] font-medium whitespace-nowrap">{label}</span>
            </label>
        );

        // ── Controls bar ─────────────────────────────────────────────────────
        const controlsBar = (
            <>
            {modeToggle}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 flex flex-wrap items-end gap-3">
                {/* Team filter */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Team</span>
                    <CustomSelect
                        value={insightTeamFilter}
                        onChange={e => setInsightTeamFilter(e.target.value)}
                        variant="form"
                        size="xs"
                        placeholder="All Athletes"
                    >
                        <option value="All Athletes">All Athletes</option>
                        {teams.map((t: any) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </CustomSelect>
                </div>

                {/* Scope */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Scope</span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                        <button onClick={() => setInsightScope('team')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${insightScope === 'team' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>Team</button>
                        <button onClick={() => setInsightScope('individual')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${insightScope === 'individual' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>Individual</button>
                    </div>
                </div>

                {/* Athlete picker (individual mode only) */}
                {insightScope === 'individual' && athletesInScope.length > 0 && (
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Athlete</span>
                        <CustomSelect value={activeAthleteId} onChange={e => setInsightAthleteId(e.target.value)} variant="form" size="xs">
                            {athletesInScope.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </CustomSelect>
                    </div>
                )}

                {/* Metric selector */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Metric</span>
                    <CustomSelect value={activeMetric} onChange={e => setInsightMetric(e.target.value)} variant="form" size="xs">
                        {groupOrder.filter(g => groupedCols[g]?.length).map(grp => (
                            <optgroup key={grp} label={grp}>
                                {groupedCols[grp].map(k => <option key={k} value={k}>{gpsColLabel(k)}</option>)}
                            </optgroup>
                        ))}
                    </CustomSelect>
                </div>

                {/* Date mode toggle */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">View</span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg">
                        <button onClick={() => setInsightDateMode('range')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${insightDateMode === 'range' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>Trend</button>
                        <button onClick={() => setInsightDateMode('single')} className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${insightDateMode === 'single' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>Single Day</button>
                    </div>
                </div>

                {/* Date inputs */}
                {insightDateMode === 'range' ? (
                    <>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">From</span>
                            <DatePicker value={gpsRangeStart} onChange={e => setGpsRangeStart(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">To</span>
                            <DatePicker value={gpsRangeEnd} onChange={e => setGpsRangeEnd(e.target.value)} />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Date</span>
                        <DatePicker value={insightSingleDate} onChange={e => setInsightSingleDate(e.target.value)} />
                    </div>
                )}

                {/* Per-athlete toggle — team trend only */}
                {insightScope === 'team' && insightDateMode === 'range' && (
                    <Toggle on={insightShowPerAthlete} onToggle={() => setInsightShowPerAthlete(v => !v)} label="Per athlete" />
                )}

                {/* Rolling avg toggle — individual trend only */}
                {insightScope === 'individual' && insightDateMode === 'range' && (
                    <Toggle on={insightRollingAvg} onToggle={() => setInsightRollingAvg(v => !v)} label="7-day rolling avg" />
                )}
            </div>
            </>
        );

        // ── CHART: Team — Single Day Bar Chart (P10: compare=bar) ────────────
        if (insightScope === 'team' && insightDateMode === 'single') {
            const dayRecords = scopedData.filter(r =>
                r.date === insightSingleDate && !wasExcludedOnDate(r.athleteId, r.date)
            );
            const barData = dayRecords
                .map(r => {
                    const val = parseFloat(r.rawColumns?.[activeMetric]);
                    return isNaN(val) ? null : {
                        name: (r.matchedName || r.playerName).split(' ')[0] || (r.matchedName || r.playerName),
                        fullName: r.matchedName || r.playerName,
                        value: parseFloat(val.toFixed(2)),
                        category: r.category || 'training',
                    };
                })
                .filter(Boolean)
                .sort((a: any, b: any) => b.value - a.value);

            const teamAvg = barData.length ? parseFloat((barData.reduce((s: number, d: any) => s + d.value, 0) / barData.length).toFixed(2)) : 0;
            const sessionDatesWithData = [...new Set(scopedData.filter(r => activeMetric && !isNaN(parseFloat(r.rawColumns?.[activeMetric]))).map(r => r.date))].sort();
            const currentIdx = sessionDatesWithData.indexOf(insightSingleDate);
            const prevDate = currentIdx > 0 ? sessionDatesWithData[currentIdx - 1] : null;
            const nextDate = currentIdx < sessionDatesWithData.length - 1 ? sessionDatesWithData[currentIdx + 1] : null;

            return (
                <div className="space-y-4">
                    {controlsBar}
                    {barData.length === 0 ? (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">No data for {fmtDateFull(insightSingleDate)}</p>
                            {sessionDatesWithData.length > 0 && (
                                <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">Nearest session: <button onClick={() => setInsightSingleDate(sessionDatesWithData[sessionDatesWithData.length - 1])} className="text-indigo-600 dark:text-indigo-300 font-medium hover:underline">{fmtDate(sessionDatesWithData[sessionDatesWithData.length - 1])}</button></p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{metricLabel} — Team Comparison</h3>
                                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">{fmtDateFull(insightSingleDate)}{unit && ` · ${unit}`} · {barData.length} athletes</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => prevDate && setInsightSingleDate(prevDate)} disabled={!prevDate}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48] disabled:opacity-30 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                                    </button>
                                    <button onClick={() => nextDate && setInsightSingleDate(nextDate)} disabled={!nextDate}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48] disabled:opacity-30 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                                    </button>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={Math.max(280, barData.length * 30)}>
                                <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                                    <XAxis type="number"
                                        domain={[0, Math.ceil(Math.max(...barData.map((d: any) => d.value)) * 1.15)]}
                                        tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false}
                                        tickFormatter={(v: number) => v.toLocaleString()}
                                        label={unit ? { value: unit, position: 'insideBottom', offset: -2, style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
                                    />
                                    <YAxis type="category" dataKey="name"
                                        tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} width={72} />
                                    <Tooltip
                                        contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                        formatter={(value: any, _: any, props: any) => [
                                            `${typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}${unit ? ` ${unit}` : ''}`,
                                            props.payload?.fullName || metricLabel,
                                        ]}
                                        labelStyle={{ display: 'none' }}
                                    />
                                    <ReferenceLine x={teamAvg} stroke="#6366f1" strokeDasharray="4 3" strokeWidth={1.5}
                                        label={{ value: `Team avg: ${teamAvg.toLocaleString(undefined, { maximumFractionDigits: 1 })}`, fontSize: 9, fill: '#6366f1', position: 'top' }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18}>
                                        {barData.map((entry: any, i: number) => (
                                            <Cell key={i} fill={CAT_COLORS[entry.category] || '#6366f1'} fillOpacity={0.85} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="flex items-center gap-4 mt-3 justify-center text-[10px] text-slate-400 dark:text-[#CBD5E1] flex-wrap">
                                {Object.entries(CAT_COLORS).map(([cat, color]) => (
                                    <span key={cat} className="flex items-center gap-1.5 capitalize">
                                        <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />{cat}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {barData.length >= 2 && (() => {
                        const top = barData[0] as any;
                        const bottom = barData[barData.length - 1] as any;
                        return (
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Team Average', value: teamAvg.toLocaleString(undefined, { maximumFractionDigits: 1 }), sub: `${barData.length} athletes`, color: 'text-slate-900 dark:text-[#E2E8F0]' },
                                    { label: 'Highest', value: top.value.toLocaleString(undefined, { maximumFractionDigits: 1 }), sub: top.fullName, color: 'text-emerald-600' },
                                    { label: 'Lowest', value: bottom.value.toLocaleString(undefined, { maximumFractionDigits: 1 }), sub: bottom.fullName, color: 'text-rose-500' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 text-center">
                                        <div className={`text-xl font-bold ${s.color}`}>{s.value}{unit && <span className="text-xs font-normal text-slate-400 dark:text-[#CBD5E1] ml-1">{unit}</span>}</div>
                                        <div className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mt-1">{s.label}</div>
                                        <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5 truncate">{s.sub}</div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            );
        }

        // ── CHART: Team — Trend over date range ───────────────────────────────
        if (insightScope === 'team') {
            const dateMap = new Map<string, number[]>();
            for (const r of rangeData) {
                if (!activeMetric) continue;
                if (wasExcludedOnDate(r.athleteId, r.date)) continue; // skip excluded athletes per-date
                const val = parseFloat(r.rawColumns?.[activeMetric]);
                if (isNaN(val)) continue;
                if (!dateMap.has(r.date)) dateMap.set(r.date, []);
                dateMap.get(r.date)!.push(val);
            }
            const allDates = [...dateMap.keys()].sort();

            // Per-athlete series — also excludes dates when the athlete was excluded
            const athleteSeriesMap = new Map<string, {name: string; data: Map<string, number>}>();
            if (insightShowPerAthlete) {
                for (const r of rangeData) {
                    if (!r.athleteId || r.athleteId === 'unknown') continue;
                    if (wasExcludedOnDate(r.athleteId, r.date)) continue; // gap on excluded dates
                    const val = parseFloat(r.rawColumns?.[activeMetric]);
                    if (isNaN(val)) continue;
                    if (!athleteSeriesMap.has(r.athleteId)) {
                        athleteSeriesMap.set(r.athleteId, { name: r.matchedName || r.playerName, data: new Map() });
                    }
                    athleteSeriesMap.get(r.athleteId)!.data.set(r.date, val);
                }
            }
            const athleteSeries = [...athleteSeriesMap.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name));

            const teamChartData = allDates.map(date => {
                const vals = dateMap.get(date)!;
                const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
                const pt: any = { date, label: fmtDate(date), teamAvg: parseFloat(avg.toFixed(2)) };
                for (const [id, series] of athleteSeries) {
                    pt[id] = series.data.has(date) ? parseFloat(series.data.get(date)!.toFixed(2)) : null;
                }
                return pt;
            });

            const overallMean = teamChartData.length
                ? parseFloat((teamChartData.reduce((s, d) => s + d.teamAvg, 0) / teamChartData.length).toFixed(2))
                : 0;

            if (teamChartData.length === 0) {
                return (
                    <div className="space-y-4">
                        {controlsBar}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">No data in this date range</p>
                            <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">Adjust the date range above or switch to a different metric.</p>
                        </div>
                    </div>
                );
            }

            const allSeriesVals = teamChartData.flatMap(d => {
                const v = [d.teamAvg];
                for (const [id] of athleteSeries) { if (d[id] !== null && d[id] !== undefined) v.push(d[id]); }
                return v;
            }).filter(v => !isNaN(v));
            const rawYMin = Math.min(...allSeriesVals);
            const rawYMax = Math.max(...allSeriesVals);
            const ySame = rawYMin === rawYMax;
            const yMin = ySame ? Math.max(0, rawYMin - Math.max(rawYMin * 0.1, 1)) : Math.floor(rawYMin * 0.9);
            const yMax = ySame ? rawYMax + Math.max(rawYMax * 0.1, 1) : Math.ceil(rawYMax * 1.1);

            return (
                <div className="space-y-4">
                    {controlsBar}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                                    {insightShowPerAthlete ? 'Per-Athlete Trend' : 'Team Average Trend'} — {metricLabel}
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                                    {insightTeamFilter === 'All Athletes' ? 'All athletes' : insightTeamFilter} · {gpsRangeStart} → {gpsRangeEnd}
                                    {unit && ` · ${unit}`}
                                </p>
                            </div>
                            {!insightShowPerAthlete && (
                                <div className="text-right shrink-0">
                                    <div className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">{overallMean.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                                    <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Period average{unit && ` (${unit})`}</div>
                                </div>
                            )}
                        </div>
                        <ResponsiveContainer width="100%" height={320}>
                            <LineChart data={teamChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                                <YAxis
                                    domain={[yMin < 0 ? yMin : Math.max(0, yMin), yMax < 0 ? 0 : yMax]}
                                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v: number) => v.toLocaleString()}
                                    label={unit ? { value: unit, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
                                    width={unit ? 52 : 44}
                                />
                                <Tooltip
                                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                    formatter={(value: any, name: string) => {
                                        const label = name === 'teamAvg' ? 'Team Avg' : (athleteSeriesMap.get(name)?.name || name);
                                        return [typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) + (unit ? ` ${unit}` : '') : '—', label];
                                    }}
                                    labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                                />
                                {!insightShowPerAthlete && (
                                    <ReferenceLine y={overallMean} stroke="#6366f1" strokeDasharray="4 4" strokeWidth={1.5}
                                        label={{ value: `Avg: ${overallMean.toLocaleString(undefined, { maximumFractionDigits: 1 })}`, fontSize: 9, fill: '#6366f1', position: 'right' }} />
                                )}
                                {insightShowPerAthlete ? (
                                    athleteSeries.map(([id], i) => (
                                        <Line key={id} type="monotone" dataKey={id} stroke={CHART_COLORS[i % CHART_COLORS.length]}
                                            strokeWidth={1.5} dot={false} connectNulls={false}
                                            name={athleteSeriesMap.get(id)?.name || id} activeDot={{ r: 4 }} />
                                    ))
                                ) : (
                                    <Line type="monotone" dataKey="teamAvg" stroke="#6366f1" strokeWidth={2}
                                        dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 5 }} name="Team Avg" />
                                )}
                                {insightShowPerAthlete && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />}
                            </LineChart>
                        </ResponsiveContainer>
                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-3 text-center">{teamChartData.length} session dates · hover to inspect</p>
                    </div>

                    {/* Summary stats strip — team average mode */}
                    {!insightShowPerAthlete && teamChartData.length > 0 && (() => {
                        const tVals = teamChartData.map(d => d.teamAvg);
                        const tMax = Math.max(...tVals);
                        const tMin = Math.min(...tVals);
                        const tMaxDate = teamChartData[tVals.indexOf(tMax)]?.label;
                        const tMinDate = teamChartData[tVals.indexOf(tMin)]?.label;
                        return (
                            <div className="grid grid-cols-3 gap-4">
                                {[
                                    { label: 'Period Average', value: overallMean.toLocaleString(undefined, { maximumFractionDigits: 1 }), sub: unit },
                                    { label: 'Peak Session', value: tMax.toLocaleString(undefined, { maximumFractionDigits: 1 }), sub: tMaxDate },
                                    { label: 'Lowest Session', value: tMin.toLocaleString(undefined, { maximumFractionDigits: 1 }), sub: tMinDate },
                                ].map(s => (
                                    <div key={s.label} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 text-center">
                                        <div className="text-xl font-bold text-slate-900 dark:text-[#E2E8F0]">{s.value}{unit && <span className="text-xs font-normal text-slate-400 dark:text-[#CBD5E1] ml-1">{unit}</span>}</div>
                                        <div className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mt-1">{s.label}</div>
                                        {s.sub && s.sub !== unit && <div className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">{s.sub}</div>}
                                    </div>
                                ))}
                            </div>
                        );
                    })()}

                    {/* Per-athlete averages table */}
                    {insightShowPerAthlete && athleteSeries.length > 0 && (() => {
                        const rows = athleteSeries.map(([id, series], i) => {
                            const vals = [...series.data.values()];
                            const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
                            const max = vals.length ? Math.max(...vals) : null;
                            const min = vals.length ? Math.min(...vals) : null;
                            return { name: series.name, avg, max, min, sessions: vals.length, color: CHART_COLORS[i % CHART_COLORS.length] };
                        }).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));
                        return (
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48]">
                                    <h4 className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">Athlete Averages — {metricLabel}</h4>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-200 dark:border-[#243A58]">
                                            <tr>
                                                <th className="text-left px-4 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1] border-r border-slate-200 dark:border-[#243A58]">Athlete</th>
                                                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1] border-r border-slate-100 dark:border-[#1A2D48]">Sessions</th>
                                                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1] border-r border-slate-100 dark:border-[#1A2D48]">Average</th>
                                                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1] border-r border-slate-100 dark:border-[#1A2D48]">Peak</th>
                                                <th className="text-center px-4 py-2.5 font-semibold text-slate-500 dark:text-[#CBD5E1]">Lowest</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                            {rows.map((r, i) => (
                                                <tr key={r.name} className={`hover:bg-indigo-50/20 dark:hover:bg-[#1A2D48]/60 transition-colors ${i === 0 ? 'bg-indigo-50/30 dark:bg-indigo-500/10' : ''}`}>
                                                    <td className="px-4 py-2.5 bg-slate-50/80 dark:bg-[#132338] border-r border-slate-200 dark:border-[#243A58] text-left">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                                                            <span className="font-medium text-slate-800 dark:text-[#E2E8F0]">{r.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center px-4 py-2.5 text-slate-500 dark:text-[#CBD5E1] tabular-nums border-r border-slate-100 dark:border-[#1A2D48]">{r.sessions}</td>
                                                    <td className="text-center px-4 py-2.5 font-semibold text-slate-800 dark:text-[#E2E8F0] tabular-nums border-r border-slate-100 dark:border-[#1A2D48]">{r.avg !== null ? r.avg.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}{unit && r.avg !== null ? ` ${unit}` : ''}</td>
                                                    <td className="text-center px-4 py-2.5 text-slate-500 dark:text-[#CBD5E1] tabular-nums border-r border-slate-100 dark:border-[#1A2D48]">{r.max !== null ? r.max.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}</td>
                                                    <td className="text-center px-4 py-2.5 text-slate-500 dark:text-[#CBD5E1] tabular-nums">{r.min !== null ? r.min.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            );
        }

        // ── CHART: Individual — Single Day Stat Cards ─────────────────────────
        if (insightScope === 'individual' && insightDateMode === 'single') {
            const isExcludedToday = wasExcludedOnDate(activeAthleteId, insightSingleDate);
            const record = isExcludedToday ? null : scopedData.find(r => r.athleteId === activeAthleteId && r.date === insightSingleDate);
            const sessionDatesForAthlete = [...new Set(scopedData.filter(r => r.athleteId === activeAthleteId && !wasExcludedOnDate(r.athleteId, r.date)).map(r => r.date))].sort();
            const currentIdx = sessionDatesForAthlete.indexOf(insightSingleDate);
            const prevDate = currentIdx > 0 ? sessionDatesForAthlete[currentIdx - 1] : null;
            const nextDate = currentIdx < sessionDatesForAthlete.length - 1 ? sessionDatesForAthlete[currentIdx + 1] : null;

            // Build stat list — all numeric columns with a value for this record
            const statCards = numericGpsCols
                .map(k => {
                    const raw = record?.rawColumns?.[k];
                    if (raw === undefined || raw === null || raw === '') return null;
                    const val = parseFloat(raw);
                    if (isNaN(val)) return null;
                    return { key: k, label: gpsColLabel(k), value: val, unit: extractUnit(k) };
                })
                .filter(Boolean) as { key: string; label: string; value: number; unit: string }[];

            return (
                <div className="space-y-4">
                    {controlsBar}
                    {!record || statCards.length === 0 ? (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">
                                {athletesInScope.length === 0
                                    ? 'No linked athletes'
                                    : isExcludedToday
                                        ? `${activeAthleteName} was excluded / injured on this date`
                                        : `No data for ${activeAthleteName} on ${fmtDateFull(insightSingleDate)}`}
                            </p>
                            {isExcludedToday && (
                                <p className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                    Data hidden — athlete was marked as excluded during this period
                                </p>
                            )}
                            {!isExcludedToday && sessionDatesForAthlete.length > 0 && (
                                <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">Most recent session: <button onClick={() => setInsightSingleDate(sessionDatesForAthlete[sessionDatesForAthlete.length - 1])} className="text-indigo-600 dark:text-indigo-300 font-medium hover:underline">{fmtDate(sessionDatesForAthlete[sessionDatesForAthlete.length - 1])}</button></p>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{activeAthleteName} — Session Snapshot</h3>
                                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">{fmtDateFull(insightSingleDate)} · {statCards.length} metrics</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={() => prevDate && setInsightSingleDate(prevDate)} disabled={!prevDate}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48] disabled:opacity-30 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                                    </button>
                                    <button onClick={() => nextDate && setInsightSingleDate(nextDate)} disabled={!nextDate}
                                        className="p-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48] disabled:opacity-30 transition-all">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {statCards.map(s => (
                                    <div key={s.key} className={`rounded-xl border p-3.5 flex flex-col gap-1 ${s.key === activeMetric ? 'border-indigo-300 bg-indigo-50/60' : 'border-slate-100 dark:border-[#1A2D48] bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide leading-tight truncate" title={s.label}>{s.label}</span>
                                        <span className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0] tabular-nums leading-tight">
                                            {s.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                            {s.unit && <span className="text-xs font-normal text-slate-400 dark:text-[#CBD5E1] ml-1">{s.unit}</span>}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        // ── CHART: Individual — Trend over date range ─────────────────────────
        const athleteRecords = rangeData
            .filter(r => r.athleteId === activeAthleteId && !wasExcludedOnDate(r.athleteId, r.date))
            .sort((a, b) => a.date.localeCompare(b.date));

        let indChartData: any[] = athleteRecords
            .filter(r => !isNaN(parseFloat(r.rawColumns?.[activeMetric])))
            .map(r => ({
                date: r.date,
                label: fmtDate(r.date),
                value: parseFloat(parseFloat(r.rawColumns?.[activeMetric]).toFixed(2)),
                category: r.category || 'training',
            }));

        // 7-day rolling average
        if (insightRollingAvg && indChartData.length > 0) {
            indChartData = indChartData.map((pt, i) => {
                const window = indChartData.slice(Math.max(0, i - 6), i + 1);
                const wVals = window.map((p: any) => p.value).filter((v: number) => !isNaN(v));
                const rolling = wVals.length ? parseFloat((wVals.reduce((s: number, v: number) => s + v, 0) / wVals.length).toFixed(2)) : null;
                return { ...pt, rolling };
            });
        }

        if (indChartData.length === 0) {
            return (
                <div className="space-y-4">
                    {controlsBar}
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 flex flex-col items-center gap-3 text-center">
                        <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">
                            {athletesInScope.length === 0 ? 'No linked athletes in this dataset' : `No data for ${activeAthleteName} in this date range`}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">
                            {athletesInScope.length === 0 ? 'Athletes must be linked to your roster to appear here.' : 'Adjust the date range or select a different athlete.'}
                        </p>
                    </div>
                </div>
            );
        }

        const indVals = indChartData.map((d: any) => d.value);
        const rawIndMin = Math.min(...indVals);
        const rawIndMax = Math.max(...indVals);
        const indSame = rawIndMin === rawIndMax;
        const indYMin = indSame ? Math.max(0, rawIndMin - Math.max(rawIndMin * 0.1, 1)) : Math.floor(rawIndMin * 0.9);
        const indYMax = indSame ? rawIndMax + Math.max(rawIndMax * 0.1, 1) : Math.ceil(rawIndMax * 1.1);
        const indMean = parseFloat((indVals.reduce((s: number, v: number) => s + v, 0) / indVals.length).toFixed(2));
        const indMaxVal = Math.max(...indVals);
        const indMinVal = Math.min(...indVals);

        const CAT_DOT_COLOR: Record<string, string> = { match: '#ef4444', recovery: '#10b981', training: '#6366f1' };

        return (
            <div className="space-y-4">
                {controlsBar}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{activeAthleteName} — {metricLabel}</h3>
                            <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">{gpsRangeStart} → {gpsRangeEnd}{unit && ` · ${unit}`}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <div className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">{indMean.toLocaleString(undefined, { maximumFractionDigits: 1 })}</div>
                            <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Period average{unit && ` (${unit})`}</div>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={indChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                            <YAxis
                                domain={[indYMin < 0 ? indYMin : Math.max(0, indYMin), indYMax < 0 ? 0 : indYMax]}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v: number) => v.toLocaleString()}
                                label={unit ? { value: unit, angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 10, fill: '#94a3b8' } } : undefined}
                                width={unit ? 52 : 44}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                formatter={(value: any) => [typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) + (unit ? ` ${unit}` : '') : '—', metricLabel]}
                                labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                            />
                            <ReferenceLine y={indMean} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1}
                                label={{ value: `Avg: ${indMean.toLocaleString(undefined, { maximumFractionDigits: 1 })}`, fontSize: 9, fill: '#94a3b8', position: 'right' }} />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={(props: any) => {
                                    const { cx, cy, payload } = props;
                                    const c = CAT_DOT_COLOR[payload.category] || '#6366f1';
                                    return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={3} fill={c} stroke="white" strokeWidth={1} />;
                                }}
                                activeDot={{ r: 5 }}
                                name={metricLabel}
                                connectNulls={false}
                            />
                            {insightRollingAvg && (
                                <Line type="monotone" dataKey="rolling" stroke="#f59e0b" strokeWidth={1.5}
                                    dot={false} strokeDasharray="5 3" name="7-day Avg" connectNulls={true} />
                            )}
                            {insightRollingAvg && <Legend wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />}
                        </LineChart>
                    </ResponsiveContainer>
                    <div className="flex items-center gap-4 mt-3 justify-center text-[10px] text-slate-400 dark:text-[#CBD5E1] flex-wrap">
                        {Object.entries(CAT_DOT_COLOR).map(([cat, color]) => (
                            <span key={cat} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </span>
                        ))}
                        <span className="ml-2">{indChartData.length} sessions</span>
                    </div>
                </div>

                {/* Individual stats strip */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Average', value: indMean.toLocaleString(undefined, { maximumFractionDigits: 1 }), color: 'text-indigo-600' },
                        { label: 'Peak', value: indMaxVal.toLocaleString(undefined, { maximumFractionDigits: 1 }), color: 'text-emerald-600' },
                        { label: 'Lowest', value: indMinVal.toLocaleString(undefined, { maximumFractionDigits: 1 }), color: 'text-rose-500' },
                    ].map(s => (
                        <div key={s.label} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4 text-center">
                            <div className={`text-xl font-bold ${s.color}`}>{s.value}{unit && <span className="text-xs font-normal text-slate-400 dark:text-[#CBD5E1] ml-1">{unit}</span>}</div>
                            <div className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mt-1">{s.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
};

export default GpsInsights;
