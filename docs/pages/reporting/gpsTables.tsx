// GPS table components + column helpers — moved verbatim from
// ReportingHubPage.tsx (restructure step 8, 2026-07-12). Already module-level
// and self-contained; now importable by the GPS report slices.
import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronDown as ChevronDownIcon, EyeOff as EyeOffIcon } from 'lucide-react';
import { CustomSelect } from '../../components/ui/CustomSelect';

// ── GPS meta-columns: handled specially, never shown as data columns ──────────
export const GPS_META_COLS = new Set([
    'Player number', 'Player name', 'Session name', 'Phase name', 'Type',
]);

// ── GPS column priority — matches Polar CSV order ─────────────────────────────
export const GPS_COL_PRIORITY = (k: string): number => {
    if (/^duration$/i.test(k)) return 0;
    if (/end time/i.test(k)) return 1;
    if (/^hr (min|avg|max) \[bpm\]/i.test(k)) return 10;
    if (/^hr (min|avg|max) \[%\]/i.test(k)) return 11;
    if (/time in hr zone/i.test(k)) return 12;
    if (/total distance/i.test(k)) return 20;
    if (/distance \/ min/i.test(k)) return 21;
    if (/maximum speed/i.test(k)) return 22;
    if (/average speed/i.test(k)) return 23;
    if (/^sprints?$/i.test(k)) return 24;
    if (/distance in speed zone/i.test(k)) return 30;
    if (/number of accelerations \(-/i.test(k)) return 41; // decelerations first
    if (/number of accelerations/i.test(k)) return 40;
    if (/^calories/i.test(k)) return 50;
    if (/training load score/i.test(k)) return 51;
    if (/^cardio load$/i.test(k)) return 52;
    if (/recovery time/i.test(k)) return 53;
    if (/time in power zone/i.test(k)) return 60;
    if (/muscle load in power zone/i.test(k)) return 61;
    if (/^muscle load$/i.test(k)) return 62;
    if (/rr interval/i.test(k)) return 70;
    if (/hrv|rmssd/i.test(k)) return 71;
    return 99;
};
export const gpsSortCols = (a: string, b: string) => {
    const pa = GPS_COL_PRIORITY(a), pb = GPS_COL_PRIORITY(b);
    return pa !== pb ? pa - pb : a.localeCompare(b);
};

// ── Module-level GPS helpers (stable component types — no scroll reset) ────────

// Format cell: strip date prefix from Polar datetime "DD-MM-YYYY HH:MM:SS" → "HH:MM:SS"
export const fmtGpsCell = (v: any): string => {
    if (v === undefined || v === null || v === '') return '—';
    if (typeof v === 'string') {
        const dt = v.match(/^\d{2}-\d{2}-\d{4}\s(\d{2}:\d{2}:\d{2})$/);
        if (dt) return dt[1];
        if (v.trim() === '') return '—';
    }
    const n = parseFloat(v as string);
    return isNaN(n) ? String(v) : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

interface GpsSessionTableProps {
    rows: any[];
    cols: string[];
    colLabel: (k: string) => string;
    onHideCol: (k: string) => void;
}

export const GpsSessionTable = React.memo(({ rows, cols, colLabel, onHideCol }: GpsSessionTableProps) => {
    const avgs: Record<string, string> = {};
    for (const k of cols) {
        const nums = rows.map((r: any) => parseFloat(r.rawColumns?.[k])).filter((n: number) => !isNaN(n));
        avgs[k] = nums.length ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—';
    }
    const sorted = [...rows].sort((a: any, b: any) => (a.matchedName || a.playerName).localeCompare(b.matchedName || b.playerName));
    return (
        <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: `${Math.max(640, (cols.length + 1) * 110)}px` }}>
                <thead>
                    <tr className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-200 dark:border-[#243A58]">
                        <th className="sticky left-0 z-10 bg-slate-50 dark:bg-[#0F1C30] px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide whitespace-nowrap min-w-[180px] border-r border-slate-200 dark:border-[#243A58] text-left">Athlete</th>
                        {cols.map(k => (
                            <th key={k} className="group px-3 py-3 text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide whitespace-nowrap text-center border-r border-slate-100 dark:border-[#1A2D48] last:border-r-0">
                                <div className="flex items-center justify-center gap-1">
                                    <span className="truncate max-w-[130px]" title={colLabel(k)}>{colLabel(k)}</span>
                                    <button onClick={() => onHideCol(k)} title="Hide column"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-[#1A2D48] text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]">
                                        <EyeOffIcon size={10} />
                                    </button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                    {sorted.map((r: any) => {
                        const playerNum = r.rawColumns?.['Player number'];
                        return (
                            <tr key={r.id} className="hover:bg-indigo-50/20 dark:hover:bg-[#1A2D48]/60 transition-colors group">
                                <td className="sticky left-0 z-10 bg-slate-50/80 dark:bg-[#132338] group-hover:bg-indigo-50/60 dark:group-hover:bg-[#1A2D48] px-4 py-2.5 whitespace-nowrap border-r border-slate-200 dark:border-[#243A58] text-left">
                                    <div className="flex items-center gap-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{r.matchedName || r.playerName}</span>
                                                {playerNum && (
                                                    <span className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1]">#{playerNum}</span>
                                                )}
                                            </div>
                                            <span className={`block text-[9px] font-bold uppercase tracking-wide ${r.athleteId === 'unknown' ? 'text-rose-400 dark:text-rose-300' : 'text-emerald-500 dark:text-emerald-400'}`}>
                                                {r.athleteId === 'unknown' ? 'unlinked' : 'verified'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                {cols.map(k => (
                                    <td key={k} className="px-3 py-2.5 text-sm text-slate-600 dark:text-[#CBD5E1] whitespace-nowrap tabular-nums text-center border-r border-slate-100 dark:border-[#1A2D48] last:border-r-0">{fmtGpsCell(r.rawColumns?.[k])}</td>
                                ))}
                            </tr>
                        );
                    })}
                    <tr className="bg-slate-50/80 dark:bg-[#1A2D48] border-t-2 border-slate-200 dark:border-[#243A58] font-semibold">
                        <td className="sticky left-0 z-10 bg-slate-100 dark:bg-[#1A2D48] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] whitespace-nowrap border-r border-slate-200 dark:border-[#243A58] text-left">Squad Avg</td>
                        {cols.map(k => (
                            <td key={k} className="px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-[#E2E8F0] whitespace-nowrap tabular-nums text-center border-r border-slate-100 dark:border-[#1A2D48] last:border-r-0">{avgs[k]}</td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
});

interface GpsDateRangeViewProps {
    records: any[];
    cols: string[];
    colLabel: (k: string) => string;
    onHideCol: (k: string) => void;
    categories: { id: string; label: string; color?: string }[];
    onChangeDateCategory: (date: string, categoryId: string) => void;
}

// Holds its own collapse state — clicking a section header does NOT re-render the parent
export const GpsDateRangeView = React.memo(({ records, cols, colLabel, onHideCol, categories, onChangeDateCategory }: GpsDateRangeViewProps) => {
    const [expandedDates, setExpandedDates] = useState<Set<string> | null>(null);
    const dateGroups = useMemo(() => [...new Set(records.map((r: any) => r.date))].sort((a, b) => b.localeCompare(a)) as string[], [records]);
    const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const isExpanded = (date: string, idx: number) => expandedDates === null ? idx === 0 : expandedDates.has(date);
    const toggle = (date: string) => {
        setExpandedDates(prev => {
            const current = prev === null ? new Set([dateGroups[0]]) : new Set(prev);
            current.has(date) ? current.delete(date) : current.add(date);
            return current;
        });
    };

    const CAT_COLORS: Record<string, string> = {
        match: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border-red-200 dark:border-red-500/30',
        recovery: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
        training: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">{dateGroups.length} sessions · {records.length} athlete records</p>
                <div className="flex items-center gap-2">
                    <button onClick={() => setExpandedDates(new Set())} className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0] px-2.5 py-1 border border-slate-200 dark:border-[#243A58] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">Collapse All</button>
                    <button onClick={() => setExpandedDates(new Set(dateGroups))} className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0] px-2.5 py-1 border border-slate-200 dark:border-[#243A58] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors">Expand All</button>
                </div>
            </div>
            {dateGroups.map((date, idx) => {
                const dateRows = records.filter((r: any) => r.date === date);
                const expanded = isExpanded(date, idx);
                const currentCat = dateRows[0]?.category || 'training';
                const catColor = CAT_COLORS[currentCat] || 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58]';
                return (
                    <div key={date} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48] flex items-center gap-3">
                            {/* Collapsible trigger (left section) */}
                            <button
                                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                                onClick={() => toggle(date)}
                            >
                                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <CalendarIcon size={13} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{fmtDate(date)}</h4>
                                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{dateRows.length} athletes</p>
                                </div>
                            </button>
                            {/* Session type dropdown */}
                            <CustomSelect
                                value={currentCat}
                                onChange={e => onChangeDateCategory(date, e.target.value)}
                                variant="filter"
                                size="xs"
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </CustomSelect>
                            {/* Chevron */}
                            <button onClick={() => toggle(date)} className="p-1 text-slate-300 dark:text-[#475569] hover:text-slate-500 transition-colors shrink-0">
                                <ChevronDownIcon size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        {expanded && <GpsSessionTable rows={dateRows} cols={cols} colLabel={colLabel} onHideCol={onHideCol} />}
                    </div>
                );
            })}
        </div>
    );
});
