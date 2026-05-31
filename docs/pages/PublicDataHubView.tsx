// @ts-nocheck
// ── Public Data Hub snapshot viewer ─────────────────────────────────────
// Read-only render of a frozen Data Hub view. Recipients hit this route
// without an account; the snapshot JSON was pre-resolved by the scientist's
// browser before being saved (no live DB queries from the public side).
//
// Designed for non-platform users: scrollable horizontally + sticky athlete
// column, printable, mobile-tolerant.

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DatabaseService } from '../services/databaseService';
import {
    AlertCircle, Printer, Activity as ActivityIcon,
    Shield, ShieldAlert,
} from 'lucide-react';
import { useForceLightMode } from '../hooks/useForceLightMode';

const BrandingBanner = () => (
    <div className="bg-white border-b border-slate-100 py-3 print:py-2 print:border-b print:border-slate-200">
        <div className="flex flex-col items-center justify-center gap-0.5">
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center shrink-0">
                    <ActivityIcon className="text-white w-3 h-3" />
                </div>
                <span className="font-bold text-sm text-slate-900 tracking-tight">
                    Sentinel <span className="text-indigo-600">SportsLab</span>
                </span>
            </div>
            <span className="text-[9px] text-slate-400 tracking-wide uppercase">Athlete Monitoring & Performance Intelligence</span>
        </div>
    </div>
);

const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
};

// ── Cell renderer mirroring the live DataHub's render hints ─────────────
function renderValue(col: any, value: any, notConfigured: boolean): React.ReactNode {
    if (value === null || value === undefined || value === '') {
        if (col.requiresConfig && notConfigured) {
            return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 text-slate-400" title="Team has not configured this data source">
                <AlertCircle size={9} /> Not configured
            </span>;
        }
        return <span className="text-slate-300 text-xs font-bold">—</span>;
    }
    switch (col.renderHint) {
        case 'injury':
            return value === 'Clear'
                ? <span className="flex items-center gap-1.5 text-emerald-600 font-semibold text-[11px]"><Shield size={13} /> Clear</span>
                : <span className="flex items-center gap-1.5 text-rose-600 font-semibold text-[11px]"><ShieldAlert size={13} /> {String(value)}</span>;
        case 'availability': {
            const map: Record<string, string> = {
                available: 'bg-emerald-100 text-emerald-700',
                modified: 'bg-amber-100 text-amber-700',
                unavailable: 'bg-rose-100 text-rose-700',
            };
            return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${map[value] || 'bg-slate-100 text-slate-500'}`}>{value}</span>;
        }
        case 'acwr': {
            const n = parseFloat(value);
            if (!Number.isFinite(n) || n === 0) return <span className="text-slate-300 text-xs font-bold">—</span>;
            const cls = n > 1.5 ? 'bg-rose-600 text-white' : n > 1.3 ? 'bg-rose-100 text-rose-700' : n < 0.8 ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700';
            return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{n > 1.5 ? `${n.toFixed(2)} ⚠` : n.toFixed(2)}</span>;
        }
        case 'rpe': {
            const n = parseFloat(value);
            const cls = n >= 9 ? 'bg-rose-100 text-rose-700' : n >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
            return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>RPE {value}</span>;
        }
        case 'dsi': {
            const n = parseFloat(value);
            const cls = n > 1.0 ? 'bg-rose-100 text-rose-700' : n >= 0.8 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
            return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{value}</span>;
        }
        case 'kg':
            return <span className="text-slate-700 text-xs font-semibold">{value} kg</span>;
        case 'percent': {
            const n = parseFloat(value);
            if (!Number.isFinite(n)) return <span className="text-slate-300 text-xs font-bold">—</span>;
            const cls = n >= 85 ? 'bg-emerald-100 text-emerald-700' : n >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
            return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{n.toFixed(0)}%</span>;
        }
        case 'load': {
            const v2 = String(value).toLowerCase();
            const cls = v2 === 'high' ? 'bg-rose-100 text-rose-700'
                : v2 === 'medium' ? 'bg-amber-100 text-amber-700'
                : v2 === 'low' ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500';
            return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${cls}`}>{value}</span>;
        }
        case 'numeric': {
            const n = typeof value === 'number' ? value : parseFloat(value);
            if (!Number.isFinite(n)) return <span className="text-slate-600 text-xs font-bold">{value}</span>;
            const fixed = col.fractionDigits != null ? n.toFixed(col.fractionDigits) : `${n}`;
            return <span className="text-slate-700 text-xs font-semibold">{fixed}{col.unit ? ` ${col.unit}` : ''}</span>;
        }
        default:
            if (col.key === 'lastCheckin' && value) return <span className="text-slate-500 text-xs font-bold">{formatDate(value)}</span>;
            return <span className="text-slate-600 text-xs font-bold">{value}</span>;
    }
}

// ── One read-only snapshot table ────────────────────────────────────────
const SnapshotTable: React.FC<{ snapshot: any; titleSuffix?: string; rows: any[] }> = ({ snapshot, titleSuffix, rows }) => {
    const cols = snapshot.colDefs as any[];
    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {titleSuffix && (
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-700">{titleSuffix}</h3>
                </div>
            )}
            <div className="overflow-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900 text-white sticky top-0">
                        <tr>
                            <th className="sticky left-0 z-10 bg-slate-900 p-3 text-[9px] font-semibold uppercase tracking-[0.15em] border-r border-slate-700">Athlete</th>
                            {cols.map(c => (
                                <th key={c.key} colSpan={c.dateCount || 1} className="p-3 text-[9px] font-semibold uppercase tracking-[0.15em] text-center whitespace-nowrap">
                                    {c.label}
                                </th>
                            ))}
                        </tr>
                        {cols.some(c => (c.dateCount || 1) > 1) && (
                            <tr className="bg-slate-800">
                                <th className="sticky left-0 z-10 bg-slate-800 p-2 border-r border-slate-700" />
                                {cols.flatMap(c => {
                                    const n = c.dateCount || 1;
                                    return Array.from({ length: n }).map((_, i) => (
                                        <th key={`${c.key}__${i}`} className="bg-slate-800 p-2 text-[8px] font-semibold uppercase tracking-wider text-slate-300 text-center whitespace-nowrap">
                                            {n === 1 ? '' : i === 0 ? 'Latest' : `L-${i}`}
                                        </th>
                                    ));
                                })}
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.length === 0 ? (
                            <tr><td colSpan={1 + cols.length} className="p-12 text-center text-xs text-slate-400">No athletes in this snapshot.</td></tr>
                        ) : rows.map((r, ri) => (
                            <tr key={ri} className="hover:bg-slate-50">
                                <td className="sticky left-0 z-[1] bg-white group-hover:bg-slate-50 p-3 whitespace-nowrap border-r border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-900">{r.athleteName}</span>
                                        <span className="text-[9px] text-slate-400">{r.squad}</span>
                                    </div>
                                </td>
                                {cols.flatMap(c => {
                                    const cells = (r.cells || {})[c.key] || [];
                                    const n = c.dateCount || 1;
                                    return Array.from({ length: n }).map((_, i) => {
                                        const cell = cells[i] || { value: null, date: null };
                                        const stale = c.staleAfterDays != null && cell.date && (((Date.now() - new Date(cell.date).getTime()) / 86400000) > c.staleAfterDays);
                                        return (
                                            <td key={`${c.key}__${i}`} className={`p-3 whitespace-nowrap text-center ${stale ? 'bg-amber-50/40' : ''}`}>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    {renderValue(c, cell.value, cell._notConfigured === true)}
                                                    {cell.date && n > 1 && (
                                                        <span className="text-[8px] text-slate-300 font-medium">{formatDate(cell.date)}</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    });
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ── Page ─────────────────────────────────────────────────────────────────
const PublicDataHubView: React.FC = () => {
    useForceLightMode();
    const { snapshotId } = useParams<{ snapshotId: string }>();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [snapshot, setSnapshot] = useState<any | null>(null);

    useEffect(() => {
        const load = async () => {
            if (!snapshotId) { setError('Invalid link.'); setLoading(false); return; }
            try {
                const data = await DatabaseService.getDataHubSnapshot(snapshotId);
                if (!data) { setError('Snapshot not found.'); return; }
                setSnapshot(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load snapshot. The link may be invalid.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [snapshotId]);

    const handlePrint = () => window.print();

    if (loading) {
        return (
            <div className="h-screen bg-[#F8F9FF] flex items-center justify-center">
                <div className="text-center">
                    <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-medium">Loading snapshot…</p>
                </div>
            </div>
        );
    }
    if (error || !snapshot) {
        return (
            <div className="h-screen bg-[#F8F9FF] flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Invalid Link</h2>
                    <p className="text-sm text-slate-500">{error || 'This snapshot could not be found.'}</p>
                </div>
            </div>
        );
    }

    const isMultiTable = snapshot.viewMode === 'multi-table' && Array.isArray(snapshot.multiTableDates) && snapshot.multiTableDates.length >= 1;

    return (
        <div className="bg-[#F8F9FF] min-h-screen print:bg-white" id="print-content">
            <BrandingBanner />
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                <div>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Athlete Data Hub Snapshot</p>
                    <h1 className="text-sm font-bold text-slate-900">{snapshot.name || 'Snapshot'}</h1>
                    <p className="text-[10px] text-slate-400">
                        {snapshot.rows?.length || 0} athletes · {snapshot.colDefs?.length || 0} columns
                        {snapshot.snapshotDate ? ` · frozen at ${snapshot.snapshotDate}` : ''}
                        {snapshot.redacted ? ' · wellness redacted' : ''}
                        · captured {formatDate(snapshot.createdAt)}
                    </p>
                </div>
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold transition-all print:hidden"
                >
                    <Printer size={12} /> Download PDF
                </button>
            </div>

            <div className="max-w-[1400px] mx-auto p-4 space-y-4">
                {isMultiTable
                    ? snapshot.multiTableDates.map((d: any) => (
                        <SnapshotTable
                            key={typeof d === 'string' ? d : d.iso}
                            snapshot={snapshot}
                            titleSuffix={`Snapshot — ${typeof d === 'string' ? formatDate(d) : (d.label || formatDate(d.iso))}`}
                            rows={snapshot.rows}
                        />
                    ))
                    : <SnapshotTable snapshot={snapshot} rows={snapshot.rows} />
                }
            </div>

            <div className="text-center py-4 print:hidden">
                <p className="text-[9px] text-slate-400 uppercase tracking-wide">Anyone with this link can view this snapshot.</p>
            </div>
        </div>
    );
};

export default PublicDataHubView;
