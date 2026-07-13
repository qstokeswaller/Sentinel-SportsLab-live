// Testing Insights — the GPS Chart Builder engine pointed at assessment data.
// Pick a test → its recorded metrics become chartable columns; build charts,
// export them, and save them into per-source dashboards ('testing') that
// re-pull live results on open. All heavy lifting is reused from
// pages/reporting/gpsBuilder/ — this file is the test-data adapter + shell.

import React, { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../ui/CustomSelect';
import { SlidersHorizontalIcon, LayoutDashboardIcon, FlaskConicalIcon } from 'lucide-react';
import { DatabaseService } from '../../services/databaseService';
import { ALL_TESTS, getTestById, TEST_CATEGORIES } from '../../utils/testRegistry';
import type { TestDefinition } from '../../utils/testRegistry';
import GpsChartBuilder from '../../pages/reporting/gpsBuilder/GpsChartBuilder';
import GpsDashboardsView from '../../pages/reporting/gpsBuilder/GpsDashboardsView';
import SaveToDashboardButton from '../../pages/reporting/gpsBuilder/SaveToDashboardButton';
import { newChartConfig, type GpsChartConfig, type GpsRow } from '../../pages/reporting/gpsBuilder/types';
import { useGpsDashboards } from '../../hooks/useGpsDashboards';

interface Props {
    teams: any[];
    visibleTests: TestDefinition[];   // registry minus tests hidden in Settings
    showToast?: (msg: string, type?: string) => void;
}

/** Assessment rows → builder rows. Metrics JSONB becomes rawColumns; derived
 *  calculations are evaluated so they're chartable like any stored field. */
function toRows(assessments: any[], test: TestDefinition | null, athleteName: (id: string) => string): GpsRow[] {
    return (assessments || []).map(a => {
        const raw: Record<string, any> = { ...(a.metrics || {}) };
        for (const calc of test?.calculations || []) {
            if (raw[calc.key] === undefined) {
                try { const v = calc.formula(raw); if (v !== null && !isNaN(v as any)) raw[calc.key] = v; } catch { /* skip */ }
            }
        }
        return {
            athleteId: a.athlete_id,
            date: (a.date || '').split('T')[0],
            matchedName: athleteName(a.athlete_id),
            playerName: athleteName(a.athlete_id),
            rawColumns: raw,
        };
    });
}

/** Chartable column keys for a test: numeric registry fields + calculations,
 *  plus any numeric keys found in the actual data (covers legacy entries). */
function columnsFor(test: TestDefinition | null, rows: GpsRow[]): string[] {
    const keys: string[] = [];
    const seen = new Set<string>();
    const push = (k: string) => { if (!seen.has(k)) { seen.add(k); keys.push(k); } };
    for (const f of test?.fields || []) {
        if (f.type === 'number' || f.type === 'time_seconds' || f.type === 'score_pills' || f.type === 'calculated') {
            if (f.bilateral) { push(`${f.key}_left`); push(`${f.key}_right`); } else push(f.key);
        }
    }
    for (const c of test?.calculations || []) push(c.key);
    for (const r of rows) {
        for (const [k, v] of Object.entries(r.rawColumns || {})) {
            if (!seen.has(k) && v !== null && v !== '' && !isNaN(parseFloat(v as any))) push(k);
        }
    }
    return keys;
}

export const TestingInsights: React.FC<Props> = ({ teams, visibleTests, showToast }) => {
    const [mode, setMode] = useState<'builder' | 'dashboards'>('builder');
    const [testId, setTestId] = useState<string>('');
    const [config, setConfig] = useState<GpsChartConfig>(() => newChartConfig({ title: '', sort: 'desc' }));
    const [editingSource, setEditingSource] = useState<string | null>(null);
    // Per-test assessment cache — dashboards can mix tests, so tiles resolve
    // their own rows from here (fetched on demand).
    const [cache, setCache] = useState<Record<string, any[]>>({});

    const allPlayerIds = useMemo(() => {
        const ids = new Set<string>();
        for (const t of teams || []) for (const p of t.players || []) ids.add(p.id);
        return [...ids];
    }, [teams]);

    const athleteName = useMemo(() => {
        const map = new Map<string, string>();
        for (const t of teams || []) for (const p of t.players || []) map.set(p.id, p.name);
        return (id: string) => map.get(id) || 'Unknown';
    }, [teams]);

    // Fetch (and cache) assessments for a test type.
    const ensureLoaded = async (id: string) => {
        if (!id || cache[id] || allPlayerIds.length === 0) return;
        try {
            const data = await DatabaseService.fetchAssessmentsByTeam(allPlayerIds, id);
            setCache(prev => ({ ...prev, [id]: data }));
        } catch (e: any) {
            showToast?.(e.message || 'Could not load test results', 'error');
        }
    };
    useEffect(() => { if (testId) ensureLoaded(testId); }, [testId, allPlayerIds.length]); // eslint-disable-line

    // Preload every test type used by saved testing dashboards when the
    // dashboards tab opens (tiles then render synchronously from cache).
    const preloadForCharts = (charts: GpsChartConfig[]) => {
        for (const c of charts) { const t = c.dataFilter?.testType; if (t) ensureLoaded(t); }
    };

    const activeTest = testId ? getTestById(testId) || null : null;
    const rows = useMemo(() => toRows(cache[testId] || [], activeTest, athleteName), [cache, testId, activeTest, athleteName]);
    const numericCols = useMemo(() => columnsFor(activeTest, rows), [activeTest, rows]);

    // Column label: registry label + unit, e.g. "Jump Height (cm)"; falls back
    // to prettified key for legacy metrics not in the registry.
    const colLabel = useMemo(() => {
        const map = new Map<string, string>();
        for (const f of activeTest?.fields || []) {
            const unit = f.unit ? ` (${f.unit})` : '';
            if (f.bilateral) { map.set(`${f.key}_left`, `${f.label} L${unit}`); map.set(`${f.key}_right`, `${f.label} R${unit}`); }
            else map.set(f.key, `${f.label}${unit}`);
        }
        for (const c of activeTest?.calculations || []) map.set(c.key, `${c.label}${c.unit ? ` (${c.unit})` : ''}`);
        return (k: string) => map.get(k) || k.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    }, [activeTest]);

    // Grouped test picker (mirrors the hub's category structure).
    const testsByCategory = useMemo(() => {
        const g: Record<string, TestDefinition[]> = {};
        for (const t of visibleTests) (g[t.category] ||= []).push(t);
        return g;
    }, [visibleTests]);

    const pickTest = (id: string) => {
        setTestId(id);
        const test = getTestById(id);
        // Reset the chart for the new test: first numeric column, keep chart type.
        setConfig(c => ({
            ...c,
            title: test ? `${test.name}` : c.title,
            metric: { kind: 'column', column: '' },
            metricY2: undefined,
            seriesColumns: undefined,
            labelOverrides: undefined,
            seriesColors: c.seriesColors,
            dataFilter: { testType: id },
        }));
        setEditingSource(null);
    };

    // Backfill first column once data arrives.
    useEffect(() => {
        if (config.metric.kind === 'column' && !config.metric.column && numericCols.length) {
            setConfig(c => ({ ...c, metric: { kind: 'column', column: numericCols[0] } }));
        }
    }, [numericCols, config.metric]);

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
                <TestingDashboards
                    teams={teams}
                    cache={cache}
                    athleteName={athleteName}
                    preloadForCharts={preloadForCharts}
                    onEditChart={(dashboardId, chart) => {
                        const t = chart.dataFilter?.testType || '';
                        setTestId(t); ensureLoaded(t);
                        setConfig(chart);
                        setEditingSource(dashboardId);
                        setMode('builder');
                    }}
                    showToast={showToast}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
                {modeToggle}
                {/* Test picker — the source of chartable columns */}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">Test</span>
                    <CustomSelect value={testId} onChange={e => pickTest(e.target.value)} variant="form" size="xs" placeholder="Choose a test" minWidth={220}>
                        <option value="">Choose a test…</option>
                        {TEST_CATEGORIES.filter(cat => testsByCategory[cat.id]?.length).map(cat => (
                            <optgroup key={cat.id} label={cat.name}>
                                {testsByCategory[cat.id].map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </optgroup>
                        ))}
                    </CustomSelect>
                </div>
            </div>

            {!testId ? (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-14 flex flex-col items-center gap-3 text-center">
                    <FlaskConicalIcon size={36} className="text-slate-200 dark:text-[#334155]" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">Pick a test to start building</p>
                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] max-w-sm">Its recorded metrics become chartable columns — compare athletes, track trends over test dates, build ratios, and save charts to a dashboard.</p>
                </div>
            ) : (
                <GpsChartBuilder
                    config={config}
                    onChange={setConfig}
                    rows={rows}
                    teams={teams}
                    colLabel={colLabel}
                    numericGpsCols={numericCols}
                    presets={[]}
                    actions={
                        <SaveToDashboardButton
                            config={config}
                            source="testing"
                            editingDashboardId={editingSource}
                            onSaved={() => { setEditingSource(null); setMode('dashboards'); }}
                        />
                    }
                />
            )}
        </div>
    );
};

/** Dashboards wrapper: resolves each tile's rows from the per-test cache. */
const TestingDashboards: React.FC<{
    teams: any[];
    cache: Record<string, any[]>;
    athleteName: (id: string) => string;
    preloadForCharts: (charts: GpsChartConfig[]) => void;
    onEditChart: (dashboardId: string, chart: GpsChartConfig) => void;
    showToast?: (msg: string, type?: string) => void;
}> = ({ teams, cache, athleteName, preloadForCharts, onEditChart, showToast }) => {
    const rowsForChart = (chart: GpsChartConfig): GpsRow[] => {
        const t = chart.dataFilter?.testType || '';
        return toRows(cache[t] || [], t ? getTestById(t) || null : null, athleteName);
    };
    // colLabel per chart isn't supported by the shared view (single resolver),
    // so use a registry-wide resolver: search every test's fields.
    const globalLabel = useMemo(() => {
        const map = new Map<string, string>();
        for (const t of ALL_TESTS) {
            for (const f of t.fields || []) {
                const unit = f.unit ? ` (${f.unit})` : '';
                if (f.bilateral) { if (!map.has(`${f.key}_left`)) { map.set(`${f.key}_left`, `${f.label} L${unit}`); map.set(`${f.key}_right`, `${f.label} R${unit}`); } }
                else if (!map.has(f.key)) map.set(f.key, `${f.label}${unit}`);
            }
            for (const c of t.calculations || []) if (!map.has(c.key)) map.set(c.key, `${c.label}${c.unit ? ` (${c.unit})` : ''}`);
        }
        return (k: string) => map.get(k) || k.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
    }, []);

    // Mirror the dashboards query so every test type used by any saved chart
    // is preloaded into the cache before tiles try to render.
    const { data: dashboards = [] } = useGpsDashboards('testing');
    useEffect(() => {
        for (const d of dashboards) preloadForCharts(d.charts || []);
    }, [dashboards]); // eslint-disable-line

    return (
        <GpsDashboardsView
            source="testing"
            rows={[]}
            teams={teams}
            colLabel={globalLabel}
            rowsForChart={rowsForChart}
            onEditChart={onEditChart}
            showToast={showToast}
        />
    );
};

export default TestingInsights;
