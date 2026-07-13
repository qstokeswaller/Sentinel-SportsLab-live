// Questionnaire Custom Insights — the chart-builder engine pointed at daily +
// weekly wellness questionnaire responses. Sits behind the "Custom builder"
// toggle inside the questionnaire data hub's Insights tab, alongside the
// original standard chart set.

import React, { useMemo, useState } from 'react';
import { SlidersHorizontalIcon, LayoutDashboardIcon } from 'lucide-react';
import GpsChartBuilder from '../../../pages/reporting/gpsBuilder/GpsChartBuilder';
import GpsDashboardsView from '../../../pages/reporting/gpsBuilder/GpsDashboardsView';
import SaveToDashboardButton from '../../../pages/reporting/gpsBuilder/SaveToDashboardButton';
import { newChartConfig, type GpsChartConfig, type GpsRow } from '../../../pages/reporting/gpsBuilder/types';

interface Props {
    activeTeam: any;
    athletes: any[];
    dailyResponses: any[];
    weeklyResponses: any[];
    showToast?: (msg: string, type?: string) => void;
}

// Numeric questionnaire metrics (categorical ones like availability/readiness
// aren't chartable as values).
const METRIC_LABELS: Record<string, string> = {
    fatigue: 'Fatigue (1–10)',
    soreness: 'Soreness (1–10)',
    sleep_quality: 'Sleep Quality (1–10)',
    stress: 'Stress (1–10)',
    mood: 'Mood (1–10)',
    sleep_hours: 'Sleep Hours',
    hydration: 'Hydration (1–10)',
    nutrition: 'Nutrition (1–10)',
};

function buildRows(daily: any[], weekly: any[], athletes: any[]): { rows: GpsRow[]; cols: string[] } {
    const nameOf = new Map<string, string>();
    for (const a of athletes || []) nameOf.set(a.id, a.name);

    const map = new Map<string, GpsRow>();
    const get = (a: string, d: string) => {
        const k = `${a}|${d}`;
        if (!map.has(k)) map.set(k, { athleteId: a, date: d, matchedName: nameOf.get(a) || 'Unknown', playerName: nameOf.get(a) || 'Unknown', rawColumns: {} });
        return map.get(k)!;
    };

    const ingest = (resp: any) => {
        const a = resp.athlete_id || resp.athleteId;
        const d = (resp.session_date || resp.date || '').split('T')[0];
        if (!a || !d) return;
        const raw = get(a, d).rawColumns!;
        for (const k of Object.keys(METRIC_LABELS)) {
            const v = parseFloat(resp[k]);
            if (!isNaN(v)) raw[k] = v;
        }
    };
    for (const r of daily || []) ingest(r);
    for (const r of weekly || []) ingest(r);

    const cols = Object.keys(METRIC_LABELS).filter(c => [...map.values()].some(r => r.rawColumns?.[c] !== undefined));
    return { rows: [...map.values()], cols };
}

export const WellnessCustomInsights: React.FC<Props> = ({ activeTeam, athletes, dailyResponses, weeklyResponses, showToast }) => {
    const [mode, setMode] = useState<'builder' | 'dashboards'>('builder');
    const [editingSource, setEditingSource] = useState<string | null>(null);

    // The questionnaire hub is already scoped to one team — mirror that.
    const teams = useMemo(() => [{ id: activeTeam?.id || 'team', name: activeTeam?.name || 'Team', players: athletes || [] }], [activeTeam, athletes]);
    const [config, setConfig] = useState<GpsChartConfig>(() =>
        newChartConfig({ title: 'Wellness', teamFilter: activeTeam?.name || 'Team', dateSpec: { mode: 'relative', window: 'thisWeek' } }));

    const { rows, cols } = useMemo(() => buildRows(dailyResponses, weeklyResponses, athletes), [dailyResponses, weeklyResponses, athletes]);
    const colLabel = (k: string) => METRIC_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

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
                    source="questionnaire"
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
                        source="questionnaire"
                        editingDashboardId={editingSource}
                        onSaved={() => { setEditingSource(null); setMode('dashboards'); }}
                    />
                }
            />
        </div>
    );
};

export default WellnessCustomInsights;
