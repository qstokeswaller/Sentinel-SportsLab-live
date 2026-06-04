// @ts-nocheck
/**
 * Public read-only Testing report. Loaded by id from /test-share/:shareId.
 * Branches on share_type:
 *   - 'team-comparison' — single test × team latest-results table
 *   - 'export-summary'  — date-range / multi-test grouped report
 *
 * Both variants share the same brand header (logo + "Shared Report" tag) and
 * Download PDF / Download CSV buttons. PDF download is window.print() against
 * the global @media print stylesheet (defined in docs/styles.css), so the
 * recipient lands on a print-ready layout and chooses "Save as PDF" from their
 * browser print dialog.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    AlertTriangleIcon, UsersIcon, FlaskConicalIcon, CalendarDaysIcon,
    Printer as PrinterIcon, DownloadIcon,
} from 'lucide-react';
import { DatabaseService } from '../services/databaseService';
import { useForceLightMode } from '../hooks/useForceLightMode';

const fmtDate = (s: string | null | undefined) => {
    if (!s) return '—';
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const NORM_COLORS: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sky:     'bg-sky-50 text-sky-700 border-sky-200',
    teal:    'bg-teal-50 text-teal-700 border-teal-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    orange:  'bg-orange-50 text-orange-700 border-orange-200',
    red:     'bg-rose-50 text-rose-700 border-rose-200',
};

// CSV string from a 2D array — handles quotes + commas + newlines.
const toCSV = (rows: any[][]): string =>
    rows.map(r => r.map(cell => {
        const s = cell == null ? '' : String(cell);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')).join('\n');

const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const PublicTestSharePage: React.FC = () => {
    useForceLightMode();
    const { shareId } = useParams<{ shareId: string }>();
    const [share, setShare] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!shareId) return;
        (async () => {
            try {
                const row = await DatabaseService.fetchTestShare(shareId);
                if (!row) { setError('not_found'); return; }
                if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
                    setError('expired');
                    return;
                }
                setShare(row);
            } catch (e) {
                console.error('[PublicTestSharePage] load failed:', e);
                setError('error');
            } finally {
                setLoading(false);
            }
        })();
    }, [shareId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Loading</p>
                </div>
            </div>
        );
    }

    if (error || !share) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
                <div className="max-w-md text-center bg-white border border-slate-200 rounded-xl p-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-rose-50 rounded-full mb-3">
                        <AlertTriangleIcon size={20} className="text-rose-500" />
                    </div>
                    <h2 className="text-base font-semibold text-slate-800">
                        {error === 'expired' ? 'This share link has expired' : 'Share link unavailable'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        {error === 'expired'
                            ? 'Ask the coach who shared this for a fresh link.'
                            : 'The link may have been revoked or never existed.'}
                    </p>
                </div>
            </div>
        );
    }

    const data = share.snapshot_data || {};
    const shareType = share.share_type as 'team-comparison' | 'export-summary';

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
                {/* Brand header */}
                <div className="flex items-center justify-between pb-2 print:pb-4 print:border-b print:border-slate-200">
                    <div className="flex items-center gap-2">
                        <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-11 w-auto select-none" />
                        <span className="text-sm font-semibold text-slate-800">Sentinel SportsLab</span>
                        <span className="text-[10px] uppercase tracking-wide text-slate-400 ml-1">Testing Report</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-slate-400">
                            Snapshot · {fmtDate(data.generatedAt)}
                        </span>
                        <button
                            onClick={() => exportCSV(shareType, data, share.title)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-[10px] font-semibold transition-all print:hidden"
                        >
                            <DownloadIcon size={12} /> Download CSV
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-semibold transition-all print:hidden"
                        >
                            <PrinterIcon size={12} /> Download PDF
                        </button>
                    </div>
                </div>

                {/* Report title */}
                <section className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            {shareType === 'team-comparison' ? <UsersIcon size={18} /> : <CalendarDaysIcon size={18} />}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold text-slate-900 truncate">{share.title}</h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {shareType === 'team-comparison' ? 'Team Comparison' : 'Multi-test export summary'}
                                {data.generatedAt && ` · Snapshot of ${fmtDate(data.generatedAt)}`}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Variant render */}
                {shareType === 'team-comparison' && <TeamComparisonView data={data} />}
                {shareType === 'export-summary' && <ExportSummaryView data={data} />}

                {/* Footer brand */}
                <div className="text-center pt-4 pb-8 print:pt-2">
                    <p className="text-[10px] text-slate-400">
                        Shared via Sentinel SportsLab · <a href="https://sentinelsportslab.com" className="text-indigo-500 hover:underline">sentinelsportslab.com</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

// ─── Variant: Team Comparison ──────────────────────────────────────────

const TeamComparisonView: React.FC<{ data: any }> = ({ data }) => {
    const team = data.team || {};
    const test = data.test || {};
    const rows: any[] = data.rows || [];
    const displayFields: any[] = data.displayFields || [];
    const tested = rows.filter(r => r.hasData).length;

    // Classification distribution
    const counts = useMemo(() => {
        const c: Record<string, number> = {};
        rows.forEach(r => { if (r.normLabel) c[r.normLabel] = (c[r.normLabel] || 0) + 1; });
        return c;
    }, [rows]);

    return (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                    <FlaskConicalIcon size={14} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700">{test.name}</span>
                    <span className="text-xs text-slate-400">— {team.name}</span>
                </div>
                <span className="text-[10px] text-slate-500">{tested}/{rows.length} athletes tested</span>
            </header>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Athlete</th>
                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                            {displayFields.map((f: any) => (
                                <th key={f.key} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                    {f.label}{f.unit && <span className="text-slate-400 normal-case"> ({f.unit})</span>}
                                </th>
                            ))}
                            {test.hasNorms && <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Classification</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r: any) => (
                            <tr key={r.player.id} className="border-b border-slate-50">
                                <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.player.name}</td>
                                <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                                    {r.date || <span className="text-slate-300">No data</span>}
                                </td>
                                {displayFields.map((f: any) => (
                                    <td key={f.key} className="px-3 py-2.5 tabular-nums">
                                        {r.allValues?.[f.key] != null
                                            ? <span className={f.isCalc ? 'font-semibold text-indigo-600' : 'text-slate-800'}>{r.allValues[f.key]}</span>
                                            : <span className="text-slate-300">—</span>}
                                    </td>
                                ))}
                                {test.hasNorms && (
                                    <td className="px-3 py-2.5">
                                        {r.normLabel ? (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${NORM_COLORS[r.normColor] || 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                {r.normLabel}
                                            </span>
                                        ) : <span className="text-slate-300">—</span>}
                                    </td>
                                )}
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr><td colSpan={99} className="text-center py-8 text-sm text-slate-400">No athletes in this team</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {tested > 0 && Object.keys(counts).length > 0 && (
                <footer className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex flex-wrap gap-4 text-xs">
                    {Object.entries(counts).map(([label, count]) => (
                        <span key={label} className="text-slate-500">
                            {label}: <span className="font-semibold text-slate-800">{count}</span>
                        </span>
                    ))}
                </footer>
            )}
        </section>
    );
};

// ─── Variant: Export Summary ───────────────────────────────────────────

const ExportSummaryView: React.FC<{ data: any }> = ({ data }) => {
    const groups: any[] = data.groupedByTest || [];
    const dateStart = data.dateRange?.start;
    const dateEnd = data.dateRange?.end;
    const teamLabel = data.team?.name || 'All athletes';

    return (
        <>
            <section className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex flex-wrap items-center gap-3">
                <span className="text-xs text-slate-500">Range:</span>
                <span className="text-xs font-semibold text-slate-700">{fmtDate(dateStart)} → {fmtDate(dateEnd)}</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500">Scope:</span>
                <span className="text-xs font-semibold text-slate-700">{teamLabel}</span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500">Tests included:</span>
                <span className="text-xs font-semibold text-slate-700">{groups.length}</span>
            </section>

            {groups.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-400">
                    No test data in the selected range.
                </div>
            )}

            {groups.map((group: any) => {
                const t = group.test || {};
                const entries: any[] = group.entries || [];
                const fields: any[] = group.displayFields || [];
                return (
                    <section key={t.id || t.name} className="bg-white border border-slate-200 rounded-xl overflow-hidden break-inside-avoid">
                        <header className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-2">
                                <FlaskConicalIcon size={14} className="text-indigo-500" />
                                <span className="text-sm font-semibold text-slate-700">{t.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
                        </header>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                                        <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Athlete</th>
                                        {fields.map((f: any) => (
                                            <th key={f.key} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                                {f.label}{f.unit && <span className="text-slate-400 normal-case"> ({f.unit})</span>}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((e: any, i: number) => (
                                        <tr key={`${e.athlete_id}-${e.date}-${i}`} className="border-b border-slate-50">
                                            <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">{e.date}</td>
                                            <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">{e.athleteName}</td>
                                            {fields.map((f: any) => (
                                                <td key={f.key} className="px-3 py-2 tabular-nums text-slate-800">
                                                    {e.allValues?.[f.key] != null
                                                        ? <span className={f.isCalc ? 'font-semibold text-indigo-600' : ''}>{e.allValues[f.key]}</span>
                                                        : <span className="text-slate-300">—</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                );
            })}
        </>
    );
};

// ─── CSV builders ─────────────────────────────────────────────────────

function exportCSV(shareType: string, data: any, title: string) {
    const today = new Date().toISOString().split('T')[0];
    const safeTitle = (title || 'testing_report').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

    if (shareType === 'team-comparison') {
        const rows: any[] = data.rows || [];
        const fields: any[] = data.displayFields || [];
        const test = data.test || {};
        const headers = ['Athlete', 'Date', ...fields.map((f: any) => `${f.label}${f.unit ? ` (${f.unit})` : ''}`)];
        if (test.hasNorms) headers.push('Classification');
        const dataRows = rows.map((r: any) => {
            const out: any[] = [r.player.name, r.date || ''];
            for (const f of fields) out.push(r.allValues?.[f.key] ?? '');
            if (test.hasNorms) out.push(r.normLabel || '');
            return out;
        });
        downloadCSV(`${safeTitle}_${today}.csv`, toCSV([headers, ...dataRows]));
        return;
    }

    if (shareType === 'export-summary') {
        const groups: any[] = data.groupedByTest || [];
        let csv = '';
        for (const g of groups) {
            const t = g.test || {};
            const fields: any[] = g.displayFields || [];
            const headers = ['Date', 'Athlete', ...fields.map((f: any) => `${f.label}${f.unit ? ` (${f.unit})` : ''}`)];
            csv += `\n--- ${t.name || 'Test'} ---\n`;
            csv += toCSV([headers]) + '\n';
            for (const e of (g.entries || [])) {
                const row: any[] = [e.date, e.athleteName];
                for (const f of fields) row.push(e.allValues?.[f.key] ?? '');
                csv += toCSV([row]) + '\n';
            }
        }
        downloadCSV(`${safeTitle}_${today}.csv`, csv);
    }
}

export default PublicTestSharePage;
