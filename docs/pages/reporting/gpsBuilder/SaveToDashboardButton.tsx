// "Save to dashboard" — builder preview action. Adds the current chart config
// to a saved dashboard (or updates it in place when it was opened for editing
// from a dashboard tile). Small popover; no native dialogs.

import React, { useEffect, useRef, useState } from 'react';
import { BookmarkPlusIcon, CheckIcon, PlusIcon } from 'lucide-react';
import type { GpsChartConfig } from './types';
import { useGpsDashboards, useCreateGpsDashboard, useUpdateGpsDashboard } from '../../../hooks/useGpsDashboards';

interface Props {
    config: GpsChartConfig;
    /** Set when the chart was opened from a dashboard tile — Save updates in place. */
    editingDashboardId?: string | null;
    onSaved?: () => void;
    /** Which insights surface owns the dashboards (default 'gps'). */
    source?: string;
}

export const SaveToDashboardButton: React.FC<Props> = ({ config, editingDashboardId, onSaved, source = 'gps' }) => {
    const { data: dashboards = [] } = useGpsDashboards(source);
    const createDashboard = useCreateGpsDashboard();
    const updateDashboard = useUpdateGpsDashboard();

    const [open, setOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [savedFlash, setSavedFlash] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    const flashSaved = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 2000); };

    const saveInto = async (dashboardId: string) => {
        const dash = dashboards.find(d => d.id === dashboardId);
        if (!dash) return;
        const exists = dash.charts.some(c => c.id === config.id);
        const charts = exists
            ? dash.charts.map(c => (c.id === config.id ? config : c))
            : [...dash.charts, config];
        await updateDashboard.mutateAsync({ id: dashboardId, charts });
        setOpen(false); flashSaved(); onSaved?.();
    };

    const saveIntoNew = async () => {
        const name = newName.trim();
        if (!name) return;
        await createDashboard.mutateAsync({ name, charts: [config], source });
        setNewName(''); setOpen(false); flashSaved(); onSaved?.();
    };

    const editingDash = editingDashboardId ? dashboards.find(d => d.id === editingDashboardId) : null;

    return (
        <div ref={wrapRef} className="relative">
            <div className="flex items-center gap-1.5">
                {editingDash && (
                    <button onClick={() => saveInto(editingDash.id)} disabled={updateDashboard.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
                        <CheckIcon size={13} /> Save to "{editingDash.name}"
                    </button>
                )}
                <button onClick={() => setOpen(v => !v)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors">
                    {savedFlash ? <><CheckIcon size={14} className="text-emerald-500" /> Saved</> : <><BookmarkPlusIcon size={14} /> {editingDash ? 'Save elsewhere' : 'Save to dashboard'}</>}
                </button>
            </div>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 z-[500] w-64 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-lg p-2 animate-in fade-in zoom-in-95 duration-150">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#64748B]">Add "{config.title || 'chart'}" to…</p>
                    <div className="max-h-44 overflow-y-auto no-scrollbar">
                        {dashboards.map(d => (
                            <button key={d.id} onClick={() => saveInto(d.id)} disabled={updateDashboard.isPending}
                                className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors flex items-center justify-between">
                                <span className="truncate">{d.name}</span>
                                <span className="text-[9px] text-slate-400 shrink-0 ml-2">{d.charts.length}</span>
                            </button>
                        ))}
                        {dashboards.length === 0 && <p className="px-2 py-1.5 text-[11px] text-slate-400">No dashboards yet — create one below.</p>}
                    </div>
                    <div className="border-t border-slate-100 dark:border-[#1A2D48] mt-1.5 pt-1.5 flex items-center gap-1.5">
                        <input value={newName} onChange={e => setNewName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveIntoNew(); }}
                            placeholder="New dashboard name"
                            className="flex-1 min-w-0 text-[11px] rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] px-2 py-1.5 text-slate-800 dark:text-[#E2E8F0] outline-none focus:ring-1 focus:ring-indigo-300" />
                        <button onClick={saveIntoNew} disabled={!newName.trim() || createDashboard.isPending} aria-label="Create dashboard with this chart"
                            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-colors shrink-0">
                            <PlusIcon size={13} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SaveToDashboardButton;
