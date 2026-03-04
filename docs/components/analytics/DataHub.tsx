// @ts-nocheck
import React, { useState, useMemo, useRef } from 'react';
import { DownloadIcon, ColumnsIcon, SearchIcon, ChevronDown, ChevronUp, X, Shield, ShieldAlert } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

// ─── Column definitions ───────────────────────────────────────────────────────
// key: the property name on the row object
// label: displayed in header
// defaultOn: visible by default
const COLUMN_DEFS = [
    { key: 'squad',           label: 'Squad',              defaultOn: true  },
    { key: 'position',        label: 'Position',           defaultOn: false },
    { key: 'injuryStatus',    label: 'Injury Status',      defaultOn: true  },
    { key: 'availability',    label: 'Availability',       defaultOn: true  },
    { key: 'acwr',            label: 'ACWR',               defaultOn: true  },
    { key: 'lastRPE',         label: 'Last RPE',           defaultOn: true  },
    { key: 'lastCheckin',     label: 'Last Check-In',      defaultOn: true  },
    { key: 'hamstring',       label: 'Hamstring (N/kg)',   defaultOn: true  },
    { key: 'hamstringDate',   label: 'Ham. Test Date',     defaultOn: false },
    { key: 'oneRM',           label: 'Last 1RM',           defaultOn: true  },
    { key: 'oneRMDate',       label: '1RM Test Date',      defaultOn: false },
    { key: 'dsi',             label: 'DSI Score',          defaultOn: true  },
    { key: 'dsiCategory',     label: 'DSI Category',       defaultOn: false },
    { key: 'rsi',             label: 'RSI Score',          defaultOn: false },
    { key: 'rsiDate',         label: 'RSI Test Date',      defaultOn: false },
];

// ─── Badge helpers ────────────────────────────────────────────────────────────
const Chip = ({ label, cls }: { label: string; cls: string }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
        {label}
    </span>
);

const formatDate = (val: string | undefined) => {
    if (!val) return null;
    return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
};

const DASH = <span className="text-slate-300 text-xs font-bold">—</span>;

const renderCell = (key: string, val: any) => {
    if (val === null || val === undefined) return DASH;

    switch (key) {
        case 'injuryStatus':
            return val === 'Injured'
                ? <span className="flex items-center gap-1.5 text-rose-600 font-semibold text-[11px]"><ShieldAlert size={13} /> Injured</span>
                : <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]"><Shield size={13} /> Clear</span>;

        case 'availability':
            const avMap: Record<string, string> = {
                available:   'bg-emerald-100 text-emerald-700',
                modified:    'bg-amber-100 text-amber-700',
                unavailable: 'bg-rose-100 text-rose-700',
            };
            return <Chip label={val} cls={avMap[val] || 'bg-slate-100 text-slate-500'} />;

        case 'acwr': {
            const n = parseFloat(val);
            if (isNaN(n) || n === 0) return DASH;
            const cls = n > 1.5 ? 'bg-rose-600 text-white'
                : n > 1.3 ? 'bg-rose-100 text-rose-700'
                : n < 0.8 ? 'bg-indigo-100 text-indigo-700'
                : 'bg-emerald-100 text-emerald-700';
            const label = n > 1.5 ? `${n.toFixed(2)} ⚠` : n.toFixed(2);
            return <Chip label={label} cls={cls} />;
        }

        case 'lastRPE': {
            const cls = val >= 9 ? 'bg-rose-100 text-rose-700'
                : val >= 7 ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700';
            return <Chip label={`RPE ${val}`} cls={cls} />;
        }

        case 'hamstring':
            return <span className="text-slate-700 text-xs font-semibold">{parseFloat(val).toFixed(2)}</span>;

        case 'oneRM':
            return <span className="text-slate-700 text-xs font-semibold">{val} kg</span>;

        case 'dsi': {
            const cls = parseFloat(val) > 1.0 ? 'bg-rose-100 text-rose-700'
                : parseFloat(val) >= 0.8 ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700';
            return <Chip label={val} cls={cls} />;
        }

        case 'dsiCategory':
            return <span className="text-slate-600 text-xs font-bold">{val}</span>;

        case 'rsi':
            return <span className="text-slate-700 text-xs font-semibold">{parseFloat(val).toFixed(2)}</span>;

        case 'hamstringDate':
        case 'oneRMDate':
        case 'rsiDate':
        case 'lastCheckin': {
            const d = formatDate(val);
            return d ? <span className="text-slate-500 text-xs font-bold">{d}</span> : DASH;
        }

        default:
            return <span className="text-slate-600 text-xs font-bold">{val}</span>;
    }
};

// ─── Main component ───────────────────────────────────────────────────────────
export const DataHub = () => {
    const { teams, wellnessResponses, loadRecords, calculateACWR } = useAppState();

    const defaultVis = Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultOn]));
    const [colVis, setColVis] = useState<Record<string, boolean>>(defaultVis);
    const [search, setSearch] = useState('');
    const [teamFilter, setTeamFilter] = useState('All');
    const [showColPanel, setShowColPanel] = useState(false);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Scroll progress indicator
    const tableWrapRef = useRef<HTMLDivElement>(null);
    const [scrollPct, setScrollPct] = useState(0);
    const handleScroll = () => {
        const el = tableWrapRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setScrollPct(max > 0 ? (el.scrollLeft / max) * 100 : 0);
    };

    // ── Build rows ────────────────────────────────────────────────────────────
    const allRows = useMemo(() => {
        return (teams || []).flatMap(team =>
            (team.players || []).map(player => {
                // Latest wellness response
                const wResponses = (wellnessResponses || [])
                    .filter(r => r.athlete_id === player.id)
                    .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
                const latest = wResponses[0];
                const injuredAreas = latest?.injury_report?.areas?.length || 0;

                // ACWR
                const acwrVal = calculateACWR ? calculateACWR(player.id) : '0';

                // Performance metrics — pick most recent of each type
                const pm = player.performanceMetrics || [];
                const latestHam = pm.find(m => m.type === 'hamstring');
                const latest1RM  = pm.find(m => m.type === '1rm');
                const latestDSI  = pm.find(m => m.type === 'dsi');
                const latestRSI  = pm.find(m => m.type === 'rsi');

                // Hamstring: prefer peak value across left/right legs
                const hamVal = latestHam
                    ? Math.max(
                        parseFloat(latestHam.leftPeak || latestHam.left || latestHam.value || 0),
                        parseFloat(latestHam.rightPeak || latestHam.right || 0)
                    ) || latestHam.value
                    : null;

                return {
                    id: player.id,
                    name: player.name,
                    squad: team.name,
                    position: player.position || null,
                    injuryStatus: injuredAreas > 0 ? 'Injured' : latest ? 'Clear' : null,
                    availability: latest?.availability || null,
                    acwr: acwrVal,
                    lastRPE: latest?.rpe ?? null,
                    lastCheckin: latest?.session_date || null,
                    hamstring: hamVal || null,
                    hamstringDate: latestHam?.date || null,
                    oneRM: latest1RM ? `${latest1RM.value}` : null,
                    oneRMDate: latest1RM?.date || null,
                    dsi: latestDSI ? `${parseFloat(latestDSI.value).toFixed(2)}` : null,
                    dsiCategory: latestDSI?.category || null,
                    rsi: latestRSI ? `${latestRSI.value}` : null,
                    rsiDate: latestRSI?.date || null,
                };
            })
        );
    }, [teams, wellnessResponses, loadRecords, calculateACWR]);

    // ── Team options ──────────────────────────────────────────────────────────
    const teamOptions = useMemo(() => {
        const names = [...new Set((teams || []).map(t => t.name))];
        return ['All', ...names];
    }, [teams]);

    // ── Filter + sort ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let rows = allRows;
        if (teamFilter !== 'All') rows = rows.filter(r => r.squad === teamFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(r => r.name?.toLowerCase().includes(q) || r.squad?.toLowerCase().includes(q));
        }
        if (sortKey) {
            rows = [...rows].sort((a, b) => {
                const av = a[sortKey] ?? '';
                const bv = b[sortKey] ?? '';
                const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
                return sortDir === 'asc' ? cmp : -cmp;
            });
        }
        return rows;
    }, [allRows, teamFilter, search, sortKey, sortDir]);

    const visibleCols = COLUMN_DEFS.filter(c => colVis[c.key]);

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const handleExportCSV = () => {
        const headers = ['Athlete', ...visibleCols.map(c => c.label)];
        const rows = filtered.map(r => [r.name, ...visibleCols.map(c => r[c.key] ?? '—')]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'athlete_data_hub.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm space-y-6">

            {/* Header row */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
                <div>
                    <h3 className="text-2xl font-semibold uppercase tracking-tighter text-slate-900">Athlete Data Hub</h3>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                        {filtered.length} athletes · {visibleCols.length + 1} columns visible
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search athletes..."
                            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold outline-none focus:border-slate-300 w-44"
                        />
                    </div>

                    {/* Team filter */}
                    <select
                        value={teamFilter}
                        onChange={e => setTeamFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[11px] font-bold text-slate-600 outline-none focus:border-slate-300"
                    >
                        {teamOptions.map(t => <option key={t}>{t}</option>)}
                    </select>

                    {/* Columns toggle */}
                    <div className="relative">
                        <button
                            onClick={() => setShowColPanel(p => !p)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-[11px] font-semibold text-slate-600 uppercase hover:bg-slate-200 transition-colors"
                        >
                            <ColumnsIcon size={13} /> Columns
                        </button>

                        {showColPanel && (
                            <div className="absolute right-0 top-11 z-50 bg-white border border-slate-100 rounded-xl shadow-2xl p-4 w-56 space-y-1.5">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Toggle Columns</span>
                                    <button onClick={() => setShowColPanel(false)}><X size={14} className="text-slate-400 hover:text-slate-700" /></button>
                                </div>
                                {COLUMN_DEFS.map(col => (
                                    <label key={col.key} className="flex items-center gap-3 cursor-pointer group py-0.5">
                                        <div
                                            onClick={() => setColVis(v => ({ ...v, [col.key]: !v[col.key] }))}
                                            className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${colVis[col.key] ? 'bg-slate-900 border-slate-900' : 'border-slate-200'}`}
                                        >
                                            {colVis[col.key] && <div className="w-2 h-2 bg-white rounded-sm" />}
                                        </div>
                                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900">{col.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Export */}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-xl text-[11px] font-semibold text-white uppercase shadow-lg shadow-slate-200 hover:bg-black transition-all active:scale-95"
                    >
                        <DownloadIcon size={13} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Table wrapper — scroll progress indicator on top edge */}
            <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden">
                {/* Horizontal scroll progress line */}
                <div className="h-1 w-full bg-slate-100 relative">
                    <div
                        className="h-full bg-cyan-500 transition-all duration-75 ease-linear rounded-full"
                        style={{ width: `${scrollPct}%` }}
                    />
                </div>

                {/* Table */}
                <div
                    ref={tableWrapRef}
                    onScroll={handleScroll}
                    className="overflow-x-auto"
                >
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                {/* Athlete — always first, sticky */}
                                <th className="p-4 text-[9px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap sticky left-0 bg-slate-900 z-10">
                                    Athlete
                                </th>
                                {visibleCols.map(col => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        className="p-4 text-[9px] font-semibold uppercase tracking-[0.15em] cursor-pointer select-none whitespace-nowrap hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.label}
                                            {sortKey === col.key
                                                ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                                                : <ChevronDown size={10} className="opacity-20" />
                                            }
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length > 0 ? filtered.map((row, i) => (
                                <tr key={row.id || i} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 whitespace-nowrap sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-100">
                                        <span className="text-sm font-semibold text-slate-900">{row.name}</span>
                                    </td>
                                    {visibleCols.map(col => (
                                        <td key={col.key} className="p-4 whitespace-nowrap">
                                            {renderCell(col.key, row[col.key])}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={1 + visibleCols.length} className="p-16 text-center">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                            {allRows.length === 0
                                                ? 'No athletes found. Add athletes via the Squads page.'
                                                : 'No results match your search or filter.'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide w-full">ACWR Legend</p>
                {[
                    { label: '< 0.8 — Detraining',  cls: 'bg-indigo-100 text-indigo-700' },
                    { label: '0.8–1.3 — Optimal',   cls: 'bg-emerald-100 text-emerald-700' },
                    { label: '1.3–1.5 — Caution',   cls: 'bg-rose-100 text-rose-700' },
                    { label: '> 1.5 — Danger',       cls: 'bg-rose-600 text-white' },
                ].map(l => (
                    <span key={l.label} className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase ${l.cls}`}>{l.label}</span>
                ))}
            </div>
        </div>
    );
};
