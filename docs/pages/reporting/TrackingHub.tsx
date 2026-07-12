// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect } from 'react';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CalendarIcon, DumbbellIcon, TrendingUpIcon, ZapIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import DatePicker from '../../components/ui/DatePicker';

export const TrackingHub: React.FC<any> = ({
    BODY_PART_BG,
    BODY_PART_COLORS_MAP,
    REGION_BG,
    REGION_COLORS_MAP,
    TrackingSortIcon,
    TrackingTrendArrow,
    allTrackingAthletes,
    handleTrackingSort,
    setTrackingDateRange,
    setTrackingLoadCustomRange,
    setTrackingLoadPeriod,
    setTrackingLoadView,
    setTrackingPeriod,
    setTrackingSelectedAthlete,
    setTrackingSelectedTeam,
    setTrackingTab,
    teams,
    trackingAthleteData,
    trackingDateRange,
    trackingExerciseBreakdown,
    trackingKpis,
    trackingLoadCustomRange,
    trackingLoadData,
    trackingLoadPeriod,
    trackingLoadView,
    trackingPeriod,
    trackingSelectedAthlete,
    trackingSelectedTeam,
    trackingSessionTonnage,
    trackingSortedTeamStats,
    trackingTab,
}) => {
        const tabs = ['Tonnage Trends', 'Team Overview', 'Load Distribution'];
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Tab pills */}
                <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg w-fit border border-slate-200 dark:border-[#243A58]">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setTrackingTab(tab)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${trackingTab === tab ? "bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm" : "text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]"}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ═══ TAB 1: TONNAGE TRENDS ═══ */}
                {trackingTab === 'Tonnage Trends' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">Athlete</label>
                                <CustomSelect value={trackingSelectedAthlete} onChange={e => setTrackingSelectedAthlete(e.target.value)} variant="form" size="xs">
                                    {allTrackingAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">From</label>
                                <DatePicker value={trackingDateRange.start} onChange={e => setTrackingDateRange(r => ({ ...r, start: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">To</label>
                                <DatePicker value={trackingDateRange.end} onChange={e => setTrackingDateRange(r => ({ ...r, end: e.target.value }))} />
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Weekly Total', value: `${trackingKpis.weeklyTotal.toLocaleString()} kg`, icon: <CalendarIcon size={16} className="text-indigo-500 dark:text-indigo-300" />, sub: 'Last 7 days' },
                                { label: 'Monthly Total', value: `${trackingKpis.monthlyTotal.toLocaleString()} kg`, icon: <DumbbellIcon size={16} className="text-indigo-500 dark:text-indigo-300" />, sub: 'Selected range' },
                                { label: 'Avg / Session', value: `${trackingKpis.avgPerSession.toLocaleString()} kg`, icon: <TrendingUpIcon size={16} className="text-indigo-500 dark:text-indigo-300" />, sub: `${new Set(trackingAthleteData.map(d => d.date)).size} sessions` },
                                { label: 'Peak Session', value: `${trackingKpis.peakTonnage.toLocaleString()} kg`, icon: <ZapIcon size={16} className="text-indigo-500 dark:text-indigo-300" />, sub: trackingKpis.peakDate || '—' },
                            ].map(kpi => (
                                <div key={kpi.label} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center">{kpi.icon}</div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide">{kpi.label}</span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900 dark:text-[#E2E8F0]">{kpi.value}</div>
                                    <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-1">{kpi.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-6">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0] mb-4">Session Tonnage Over Time</h4>
                            {trackingSessionTonnage.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={trackingSessionTonnage} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}t`} />
                                        <Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Tonnage']}
                                            contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                        <Bar dataKey="tonnage" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center text-sm text-slate-400 dark:text-[#CBD5E1]">No data for selected range</div>
                            )}
                        </div>

                        {/* Exercise Breakdown Table */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1A2D48]">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-[#E2E8F0]">Exercise Breakdown</h4>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/50 dark:bg-[#132338]/40">
                                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide">Exercise</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide">Sets</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide">Reps</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide">Avg Weight</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide">Tonnage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackingExerciseBreakdown.map((row, i) => (
                                        <tr key={row.exercise} className={`border-b border-slate-50 dark:border-[#1A2D48] ${i % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-[#0F1C30]/30'}`}>
                                            <td className="px-5 py-3 text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">{row.exercise}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-[#CBD5E1] text-center">{row.sets}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-[#CBD5E1] text-center">{row.reps}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 dark:text-[#CBD5E1] text-center">{row.avgWeight} kg</td>
                                            <td className="px-4 py-3 text-xs font-bold text-indigo-700 dark:text-indigo-400 text-right">{row.tonnage.toLocaleString()} kg</td>
                                        </tr>
                                    ))}
                                    {trackingExerciseBreakdown.length > 0 && (
                                        <tr className="bg-indigo-50/50 border-t border-indigo-100 dark:border-indigo-800/40">
                                            <td className="px-5 py-3 text-xs font-bold text-indigo-900">Total</td>
                                            <td className="px-4 py-3 text-xs font-bold text-indigo-700 dark:text-indigo-400 text-center">{trackingExerciseBreakdown.reduce((s, r) => s + r.sets, 0)}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-indigo-700 dark:text-indigo-400 text-center">{trackingExerciseBreakdown.reduce((s, r) => s + r.reps, 0)}</td>
                                            <td className="px-4 py-3"></td>
                                            <td className="px-4 py-3 text-xs font-black text-indigo-900 text-right">{trackingExerciseBreakdown.reduce((s, r) => s + r.tonnage, 0).toLocaleString()} kg</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ TAB 2: TEAM OVERVIEW ═══ */}
                {trackingTab === 'Team Overview' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">Team</label>
                                <CustomSelect value={trackingSelectedTeam} onChange={e => setTrackingSelectedTeam(e.target.value)} variant="form" size="xs">
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </CustomSelect>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                {(['This Week', 'This Month', 'Custom'] as const).map(p => (
                                    <button key={p} onClick={() => setTrackingPeriod(p)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${trackingPeriod === p ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                            {trackingPeriod === 'Custom' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">From</label>
                                        <DatePicker value={trackingDateRange.start} onChange={e => setTrackingDateRange(r => ({ ...r, start: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">To</label>
                                        <DatePicker value={trackingDateRange.end} onChange={e => setTrackingDateRange(r => ({ ...r, end: e.target.value }))} />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Table */}
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50/50 dark:bg-[#132338]/40">
                                        {[
                                            { key: 'name', label: 'Athlete', align: 'left' },
                                            { key: 'sessions', label: 'Sessions', align: 'center' },
                                            { key: 'totalTonnage', label: 'Total Tonnage', align: 'center' },
                                            { key: 'avgPerSession', label: 'Avg / Session', align: 'center' },
                                            { key: 'trend', label: 'Trend', align: 'center' },
                                        ].map(col => (
                                            <th key={col.key} onClick={() => handleTrackingSort(col.key)}
                                                className={`px-5 py-3 text-${col.align} text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide cursor-pointer hover:text-slate-600 dark:hover:text-[#E2E8F0] transition-colors select-none`}>
                                                <span className="inline-flex items-center gap-1">{col.label} <TrackingSortIcon col={col.key} /></span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackingSortedTeamStats.length > 0 ? trackingSortedTeamStats.map((row, i) => (
                                        <tr key={row.id} className={`border-b border-slate-50 dark:border-[#1A2D48] hover:bg-indigo-50/30 dark:hover:bg-indigo-500/15 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-[#0F1C30]/30'}`}>
                                            <td className="px-5 py-3.5 text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">{row.name}</td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-[#CBD5E1] text-center">{row.sessions}</td>
                                            <td className="px-4 py-3.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 text-center">{row.totalTonnage.toLocaleString()} kg</td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-[#CBD5E1] text-center">{row.avgPerSession.toLocaleString()} kg</td>
                                            <td className="px-4 py-3.5 text-center"><TrackingTrendArrow value={row.trend} /></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400 dark:text-[#CBD5E1]">Select a team to view tonnage data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ TAB 3: LOAD DISTRIBUTION ═══ */}
                {trackingTab === 'Load Distribution' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">Team</label>
                                <CustomSelect value={trackingSelectedTeam} onChange={e => setTrackingSelectedTeam(e.target.value)} variant="form" size="xs">
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </CustomSelect>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                {(['Day', 'Week', 'Month', 'Custom'] as const).map(p => (
                                    <button key={p} onClick={() => setTrackingLoadPeriod(p)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${trackingLoadPeriod === p ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                            {trackingLoadPeriod === 'Custom' && (
                                <div className="flex items-end gap-2">
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">From</label>
                                        <DatePicker value={trackingLoadCustomRange.start} onChange={e => setTrackingLoadCustomRange(prev => ({ ...prev, start: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide block mb-1">To</label>
                                        <DatePicker value={trackingLoadCustomRange.end} onChange={e => setTrackingLoadCustomRange(prev => ({ ...prev, end: e.target.value }))} min={trackingLoadCustomRange.start} />
                                    </div>
                                </div>
                            )}
                            <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                                {([['body_part', 'By Muscle'], ['region', 'By Region']] as const).map(([key, label]) => (
                                    <button key={key} onClick={() => setTrackingLoadView(key as any)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${trackingLoadView === key ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wider mb-1">Total Tonnage</div>
                                <div className="text-2xl font-black text-slate-900 dark:text-[#E2E8F0]">{trackingLoadData.totalTonnage.toLocaleString()} <span className="text-xs font-semibold text-slate-400 dark:text-[#CBD5E1]">kg</span></div>
                            </div>
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wider mb-1">Total Sets</div>
                                <div className="text-2xl font-black text-slate-900 dark:text-[#E2E8F0]">{trackingLoadData.totalSets.toLocaleString()}</div>
                            </div>
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wider mb-1">{trackingLoadView === 'body_part' ? 'Muscle Groups' : 'Regions'} Trained</div>
                                <div className="text-2xl font-black text-slate-900 dark:text-[#E2E8F0]">{trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList.length : trackingLoadData.regionList.length}</div>
                            </div>
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wider mb-1">Top {trackingLoadView === 'body_part' ? 'Muscle' : 'Region'}</div>
                                <div className="text-lg font-black text-slate-900 dark:text-[#E2E8F0] truncate">
                                    {(trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList[0]?.name : trackingLoadData.regionList[0]?.name) || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Chart + Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Bar chart */}
                            <div className="lg:col-span-2 bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                                <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-widest mb-4">
                                    Tonnage {trackingLoadView === 'body_part' ? 'by Muscle Group' : 'by Region'}
                                </div>
                                {(() => {
                                    const items = trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList : trackingLoadData.regionList;
                                    const colorsMap = trackingLoadView === 'body_part' ? BODY_PART_COLORS_MAP : REGION_COLORS_MAP;
                                    if (items.length === 0) return <div className="text-center py-12 text-sm text-slate-400 dark:text-[#CBD5E1]">No tonnage data for this period</div>;
                                    return (
                                        <ResponsiveContainer width="100%" height={Math.max(200, items.length * 36)}>
                                            <BarChart data={items} layout="vertical" margin={{ left: 10, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fontWeight: 600 }} />
                                                <Tooltip
                                                    formatter={(v: number) => [`${v.toLocaleString()} kg`, 'Tonnage']}
                                                    contentStyle={{ borderRadius: 8, fontSize: 11, fontWeight: 600 }}
                                                />
                                                <Bar dataKey="tonnage" radius={[0, 6, 6, 0]}>
                                                    {items.map(item => (
                                                        <Cell key={item.name} fill={colorsMap[item.name] || '#94a3b8'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    );
                                })()}
                            </div>

                            {/* Breakdown list */}
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                                <div className="text-[10px] font-bold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-widest mb-4">Breakdown</div>
                                <div className="space-y-3">
                                    {(trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList : trackingLoadData.regionList).map(item => {
                                        const bgClass = trackingLoadView === 'body_part'
                                            ? (BODY_PART_BG[item.name] || 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]')
                                            : (REGION_BG[item.name] || 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]');
                                        return (
                                            <div key={item.name} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${bgClass}`}>{item.name}</span>
                                                    <span className="text-xs font-black text-slate-800 dark:text-[#E2E8F0]">{item.tonnage.toLocaleString()} kg</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-[#1A2D48] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${item.pct}%`,
                                                                backgroundColor: (trackingLoadView === 'body_part' ? BODY_PART_COLORS_MAP : REGION_COLORS_MAP)[item.name] || '#94a3b8',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] w-8 text-right">{item.pct}%</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[9px] text-slate-400 dark:text-[#CBD5E1]">
                                                    <span>{item.sets} sets</span>
                                                    {'exerciseCount' in item && <span>{(item as any).exerciseCount} exercises</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList : trackingLoadData.regionList).length === 0 && (
                                        <div className="text-center py-8 text-sm text-slate-400 dark:text-[#CBD5E1]">No data for this period</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
};

export default TrackingHub;
