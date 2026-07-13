// GPS Insights — saved dashboards. A dashboard is a named set of chart
// configs; every open re-renders against the CURRENT gpsData, so rolling-date
// charts stay live. Per-tile: PNG/CSV export, edit-in-builder, remove.

import React, { useMemo, useRef, useState } from 'react';
import {
    LayoutDashboardIcon, PlusIcon, Trash2Icon, PencilIcon, ImageIcon, FileTextIcon,
    ChevronLeftIcon, GlobeIcon, LockIcon,
} from 'lucide-react';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { ConfirmDeleteModal } from '../../../components/ui/ConfirmDeleteModal';
import type { GpsChartConfig, GpsRow, GpsDashboard } from './types';
import GpsChartRenderer from './GpsChartRenderer';
import { downloadChartPng, downloadChartCsv } from './exportChart';
import { useGpsDashboards, useCreateGpsDashboard, useUpdateGpsDashboard, useDeleteGpsDashboard } from '../../../hooks/useGpsDashboards';

interface Props {
    rows: GpsRow[];
    teams: any[];
    colLabel: (k: string) => string;
    isExcluded?: (athleteId: string, date: string) => boolean;
    /** Open a chart config in the Builder for editing (switches mode). */
    onEditChart: (dashboardId: string, chart: GpsChartConfig) => void;
    showToast?: (msg: string, type?: string) => void;
}

export const GpsDashboardsView: React.FC<Props> = ({ rows, teams, colLabel, isExcluded, onEditChart, showToast }) => {
    const { data: dashboards = [], isLoading } = useGpsDashboards();
    const createDashboard = useCreateGpsDashboard();
    const updateDashboard = useUpdateGpsDashboard();
    const deleteDashboard = useDeleteGpsDashboard();

    const [openId, setOpenId] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const [creating, setCreating] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<GpsDashboard | null>(null);
    const [removeChart, setRemoveChart] = useState<{ dash: GpsDashboard; chart: GpsChartConfig } | null>(null);

    const open = dashboards.find(d => d.id === openId) || null;

    const handleCreate = async () => {
        const name = newName.trim();
        if (!name) return;
        try {
            const d = await createDashboard.mutateAsync({ name });
            setNewName(''); setCreating(false); setOpenId(d.id);
            showToast?.('Dashboard created', 'success');
        } catch (e: any) { showToast?.(e.message || 'Could not create dashboard', 'error'); }
    };

    // ── Dashboard detail: live chart grid ────────────────────────────────────
    if (open) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setOpenId(null)} aria-label="Back to dashboards"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">
                            <ChevronLeftIcon size={14} />
                        </button>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{open.name}</h3>
                            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">{open.charts.length} chart{open.charts.length !== 1 ? 's' : ''} · always shows the latest imported data</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CustomSelect value={open.visibility} variant="filter" size="xs" prefixLabel="Visibility"
                            onChange={e => updateDashboard.mutate({ id: open.id, visibility: e.target.value as any })}>
                            <option value="personal">Only me</option>
                            <option value="org">Whole organisation</option>
                        </CustomSelect>
                        <button onClick={() => setConfirmDelete(open)} aria-label="Delete dashboard"
                            className="p-2 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-colors">
                            <Trash2Icon size={14} />
                        </button>
                    </div>
                </div>

                {open.charts.length === 0 ? (
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-12 text-center">
                        <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">No charts yet</p>
                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-1">Build a chart in the Builder tab, then use "Save to dashboard".</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {open.charts.map(chart => (
                            <DashboardTile key={chart.id} chart={chart} dashboard={open} rows={rows} teams={teams} colLabel={colLabel}
                                isExcluded={isExcluded} onEdit={() => onEditChart(open.id, chart)}
                                onRemove={() => setRemoveChart({ dash: open, chart })} />
                        ))}
                    </div>
                )}

                {confirmDelete && (
                    <ConfirmDeleteModal
                        isOpen
                        title="Delete dashboard?"
                        message={`"${confirmDelete.name}" and its ${confirmDelete.charts.length} chart config(s) will be removed. Your GPS data is not affected.`}
                        onCancel={() => setConfirmDelete(null)}
                        onConfirm={() => { deleteDashboard.mutate(confirmDelete.id); setConfirmDelete(null); setOpenId(null); }}
                    />
                )}
                {removeChart && (
                    <ConfirmDeleteModal
                        isOpen
                        title="Remove chart?"
                        message={`Remove "${removeChart.chart.title}" from ${removeChart.dash.name}?`}
                        onCancel={() => setRemoveChart(null)}
                        onConfirm={() => {
                            updateDashboard.mutate({ id: removeChart.dash.id, charts: removeChart.dash.charts.filter(c => c.id !== removeChart.chart.id) });
                            setRemoveChart(null);
                        }}
                    />
                )}
            </div>
        );
    }

    // ── Dashboard list ────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Saved chart collections — open one to see it with the latest data.</p>
                {!creating ? (
                    <button onClick={() => setCreating(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors">
                        <PlusIcon size={13} /> New dashboard
                    </button>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
                            placeholder="Dashboard name (e.g. Match-day report)"
                            className="text-xs rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] px-2.5 py-2 text-slate-800 dark:text-[#E2E8F0] outline-none focus:ring-1 focus:ring-indigo-300 w-64" />
                        <button onClick={handleCreate} disabled={!newName.trim() || createDashboard.isPending}
                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">Create</button>
                        <button onClick={() => setCreating(false)} className="px-2 py-2 text-xs text-slate-500 dark:text-[#94A3B8]">Cancel</button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[0, 1, 2].map(i => <div key={i} className="h-28 bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] animate-pulse" />)}
                </div>
            ) : dashboards.length === 0 ? (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-14 flex flex-col items-center gap-3 text-center">
                    <LayoutDashboardIcon size={36} className="text-slate-200 dark:text-[#334155]" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">No dashboards yet</p>
                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] max-w-sm">
                        Create one here, then build charts in the Builder tab and hit "Save to dashboard" — they'll always show your newest GPS data.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {dashboards.map(d => (
                        <button key={d.id} onClick={() => setOpenId(d.id)}
                            className="text-left bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between">
                                <div className="w-9 h-9 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-300 mb-3">
                                    <LayoutDashboardIcon size={17} />
                                </div>
                                <span className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#64748B]">
                                    {d.visibility === 'org' ? <><GlobeIcon size={10} /> Org</> : <><LockIcon size={10} /> Personal</>}
                                </span>
                            </div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate">{d.name}</h4>
                            <p className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-0.5">{d.charts.length} chart{d.charts.length !== 1 ? 's' : ''}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

/** One live chart tile inside a dashboard. */
const DashboardTile: React.FC<{
    chart: GpsChartConfig; dashboard: GpsDashboard; rows: GpsRow[]; teams: any[];
    colLabel: (k: string) => string; isExcluded?: (a: string, d: string) => boolean;
    onEdit: () => void; onRemove: () => void;
}> = ({ chart, rows, teams, colLabel, isExcluded, onEdit, onRemove }) => {
    const tileRef = useRef<HTMLDivElement>(null);
    const excl = useMemo(() => (chart.excludeInjured ? isExcluded : undefined), [chart.excludeInjured, isExcluded]);
    return (
        <div className="relative group">
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => downloadChartPng(tileRef.current!, chart.title).catch(() => {})} aria-label="Download PNG" title="Download PNG"
                    className="p-1.5 rounded-lg bg-white/90 dark:bg-[#1A2D48]/90 border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 transition-colors">
                    <ImageIcon size={13} />
                </button>
                <button onClick={() => { try { downloadChartCsv(chart, rows, teams, colLabel, isExcluded); } catch {} }} aria-label="Download CSV" title="Download CSV"
                    className="p-1.5 rounded-lg bg-white/90 dark:bg-[#1A2D48]/90 border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 transition-colors">
                    <FileTextIcon size={13} />
                </button>
                <button onClick={onEdit} aria-label="Edit in Builder" title="Edit in Builder"
                    className="p-1.5 rounded-lg bg-white/90 dark:bg-[#1A2D48]/90 border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 transition-colors">
                    <PencilIcon size={13} />
                </button>
                <button onClick={onRemove} aria-label="Remove chart" title="Remove from dashboard"
                    className="p-1.5 rounded-lg bg-white/90 dark:bg-[#1A2D48]/90 border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:text-rose-500 transition-colors">
                    <Trash2Icon size={13} />
                </button>
            </div>
            <GpsChartRenderer ref={tileRef} config={chart} rows={rows} teams={teams} colLabel={colLabel} isExcluded={excl} height={280} />
        </div>
    );
};

export default GpsDashboardsView;
