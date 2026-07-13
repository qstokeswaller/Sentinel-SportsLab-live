// Load & Tonnage Insights — the chart-builder engine pointed at training-load
// and planned-tonnage data. One merged daily row per athlete: sRPE session
// load, RPE, duration, total tonnage, and per-body-part tonnage columns
// (stackable). Lives as the "Insights" tab of the Tracking Hub.

import React, { useMemo, useState } from 'react';
import { SlidersHorizontalIcon, LayoutDashboardIcon } from 'lucide-react';
import GpsChartBuilder from './gpsBuilder/GpsChartBuilder';
import GpsDashboardsView from './gpsBuilder/GpsDashboardsView';
import SaveToDashboardButton from './gpsBuilder/SaveToDashboardButton';
import { newChartConfig, type GpsChartConfig, type GpsRow } from './gpsBuilder/types';

interface Props {
    teams: any[];
    loadRecords: any[];
    plannedTonnageLog: any[];
    showToast?: (msg: string, type?: string) => void;
}

const BASE_LABELS: Record<string, string> = {
    session_load: 'Session Load (AU)',
    rpe: 'RPE',
    duration: 'Duration (min)',
    tonnage: 'Total Tonnage (kg)',
};

function buildRows(loadRecords: any[], tonnageLog: any[], teams: any[]): { rows: GpsRow[]; cols: string[] } {
    const nameOf = new Map<string, string>();
    for (const t of teams || []) for (const p of t.players || []) nameOf.set(p.id, p.name);

    // athleteId|date → merged row
    const map = new Map<string, GpsRow & { _rpeVals?: number[] }>();
    const key = (a: string, d: string) => `${a}|${d}`;
    const get = (a: string, d: string) => {
        const k = key(a, d);
        if (!map.has(k)) map.set(k, { athleteId: a, date: d, matchedName: nameOf.get(a) || 'Unknown', playerName: nameOf.get(a) || 'Unknown', rawColumns: {} });
        return map.get(k)!;
    };

    for (const r of loadRecords || []) {
        const a = r.athleteId || r.athlete_id; const d = (r.date || '').split('T')[0];
        if (!a || !d) continue;
        const row = get(a, d); const raw = row.rawColumns!;
        const v = parseFloat(r.value ?? r.sRPE);
        if (!isNaN(v)) raw.session_load = (parseFloat(raw.session_load) || 0) + v;
        const dur = parseFloat(r.duration);
        if (!isNaN(dur)) raw.duration = (parseFloat(raw.duration) || 0) + dur;
        const rpe = parseFloat(r.rpe);
        if (!isNaN(rpe)) { (row._rpeVals ||= []).push(rpe); raw.rpe = row._rpeVals.reduce((s, x) => s + x, 0) / row._rpeVals.length; }
    }

    const bodyParts = new Set<string>();
    for (const r of tonnageLog || []) {
        const a = r.athlete_id; const d = (r.date || '').split('T')[0];
        if (!a || !d) continue;
        const raw = get(a, d).rawColumns!;
        const total = parseFloat(r.total_tonnage);
        if (!isNaN(total)) raw.tonnage = (parseFloat(raw.tonnage) || 0) + total;
        for (const [bp, t] of Object.entries(r.by_body_part || {})) {
            const v = parseFloat(t as any);
            if (isNaN(v)) continue;
            const col = `tonnage_${bp}`;
            bodyParts.add(col);
            raw[col] = (parseFloat(raw[col]) || 0) + v;
        }
    }

    const cols = [...Object.keys(BASE_LABELS).filter(c =>
        [...map.values()].some(r => r.rawColumns?.[c] !== undefined)
    ), ...[...bodyParts].sort()];
    return { rows: [...map.values()], cols };
}

export const LoadInsights: React.FC<Props> = ({ teams, loadRecords, plannedTonnageLog, showToast }) => {
    const [mode, setMode] = useState<'builder' | 'dashboards'>('builder');
    const [config, setConfig] = useState<GpsChartConfig>(() =>
        newChartConfig({ title: 'Training load', dateSpec: { mode: 'relative', window: 'thisWeek' } }));
    const [editingSource, setEditingSource] = useState<string | null>(null);

    const { rows, cols } = useMemo(() => buildRows(loadRecords, plannedTonnageLog, teams), [loadRecords, plannedTonnageLog, teams]);

    const colLabel = (k: string) =>
        BASE_LABELS[k] || (k.startsWith('tonnage_') ? `Tonnage — ${k.slice(8)} (kg)` : k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

    // Backfill default metric once data exists.
    React.useEffect(() => {
        if (config.metric.kind === 'column' && !config.metric.column && cols.length) {
            setConfig(c => ({ ...c, metric: { kind: 'column', column: cols[0] } }));
        }
    }, [cols, config.metric]);

    const modeToggle = (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg w-fit">
            {([['builder', 'Builder', SlidersHorizontalIcon], ['dashboards', 'Dashboards', LayoutDashboardIcon]] as const).map(([m, label, Icon]) => (
                <button key={m} onClick={() => setMode(m)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${mode === m ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>
                    <Icon size={13} /> {label}
                </button>
            ))}
        </div>
    );

    if (mode === 'dashboards') {
        return (
            <div className="space-y-4">
                {modeToggle}
                <GpsDashboardsView
                    source="load"
                    rows={rows}
                    teams={teams}
                    colLabel={colLabel}
                    onEditChart={(dashboardId, chart) => { setConfig(chart); setEditingSource(dashboardId); setMode('builder'); }}
                    showToast={showToast}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {modeToggle}
            <GpsChartBuilder
                config={config}
                onChange={setConfig}
                rows={rows}
                teams={teams}
                colLabel={colLabel}
                numericGpsCols={cols}
                presets={[]}
                actions={
                    <SaveToDashboardButton
                        config={config}
                        source="load"
                        editingDashboardId={editingSource}
                        onSaved={() => { setEditingSource(null); setMode('dashboards'); }}
                    />
                }
            />
        </div>
    );
};

export default LoadInsights;
