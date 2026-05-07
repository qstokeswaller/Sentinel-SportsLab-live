// @ts-nocheck
import React, { useState, useCallback, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import { getTestById, ALL_TESTS } from '../../utils/testRegistry';
import {
    DownloadIcon, PrinterIcon, CalendarIcon, UsersIcon, FilterIcon,
    FileTextIcon, CheckCircleIcon,
} from 'lucide-react';

/**
 * Export/Print testing session results.
 * Select date range + team/athlete + tests → CSV download or print view.
 */
export const TestSessionExport: React.FC = () => {
    const { teams } = useAppState();

    const [dateStart, setDateStart] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
    });
    const [dateEnd, setDateEnd] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);
    const allAthletes = useMemo(() => teams.flatMap(t => t.players), [teams]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const playerIds = selectedTeamId && selectedTeam
                ? selectedTeam.players.map(p => p.id)
                : allAthletes.map(p => p.id);
            const data = await DatabaseService.fetchAssessmentsByTeam(playerIds);
            // Filter by date range
            const filtered = (data || []).filter(r => {
                if (!r.date) return false;
                return r.date >= dateStart && r.date <= dateEnd;
            });
            setResults(filtered);
            setLoaded(true);
        } catch (err) {
            console.error('Export load error:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTeamId, selectedTeam, allAthletes, dateStart, dateEnd]);

    // Group results by test type
    const groupedByTest = useMemo(() => {
        const groups: Record<string, { test: any; entries: any[] }> = {};
        for (const r of results) {
            if (!groups[r.test_type]) {
                groups[r.test_type] = { test: getTestById(r.test_type), entries: [] };
            }
            groups[r.test_type].entries.push(r);
        }
        return Object.values(groups).sort((a, b) => (a.test?.name || '').localeCompare(b.test?.name || ''));
    }, [results]);

    const getAthleteName = useCallback((athleteId: string) => {
        return allAthletes.find(a => a.id === athleteId)?.name || 'Unknown';
    }, [allAthletes]);

    // CSV export
    const exportCSV = useCallback(() => {
        if (!results.length) return;
        const headers = ['Date', 'Athlete', 'Test', 'Metrics (JSON)'];
        const csvRows = results.map(r => [
            r.date,
            getAthleteName(r.athlete_id),
            getTestById(r.test_type)?.name || r.test_type,
            JSON.stringify(r.metrics),
        ]);
        const csv = [headers, ...csvRows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `testing_export_${dateStart}_to_${dateEnd}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [results, getAthleteName, dateStart, dateEnd]);

    // Detailed CSV with individual metric columns per test type
    const exportDetailedCSV = useCallback(() => {
        if (!groupedByTest.length) return;
        let csv = '';
        for (const group of groupedByTest) {
            if (!group.test) continue;
            const fields = group.test.fields.filter(f => f.type !== 'text' || f.key === 'notes');
            const calcs = group.test.calculations || [];
            const headers = ['Date', 'Athlete', ...fields.map(f => f.label), ...calcs.map(c => c.label)];
            csv += `\n--- ${group.test.name} ---\n`;
            csv += headers.map(h => `"${h}"`).join(',') + '\n';
            for (const entry of group.entries) {
                const m = entry.metrics || {};
                const calculated: Record<string, any> = {};
                for (const calc of calcs) { calculated[calc.key] = calc.formula(m); }
                const row = [
                    entry.date,
                    getAthleteName(entry.athlete_id),
                    ...fields.map(f => m[f.key] ?? ''),
                    ...calcs.map(c => calculated[c.key] ?? ''),
                ];
                csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
            }
        }
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `testing_detailed_${dateStart}_to_${dateEnd}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [groupedByTest, getAthleteName, dateStart, dateEnd]);

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            <CalendarIcon size={12} className="inline mr-1" />From
                        </label>
                        <input
                            type="date"
                            value={dateStart}
                            onChange={e => { setDateStart(e.target.value); setLoaded(false); }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            <CalendarIcon size={12} className="inline mr-1" />To
                        </label>
                        <input
                            type="date"
                            value={dateEnd}
                            onChange={e => { setDateEnd(e.target.value); setLoaded(false); }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            <UsersIcon size={12} className="inline mr-1" />Team
                        </label>
                        <select
                            value={selectedTeamId}
                            onChange={e => { setSelectedTeamId(e.target.value); setLoaded(false); }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white"
                        >
                            <option value="">All Teams</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={loadData}
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50"
                        >
                            <FilterIcon size={14} />
                            {loading ? 'Loading...' : 'Load Data'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results summary + export buttons */}
            {loaded && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <FileTextIcon size={14} className="text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">
                                {results.length} assessments across {groupedByTest.length} tests
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportCSV}
                                disabled={!results.length}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                <DownloadIcon size={12} />CSV (Flat)
                            </button>
                            <button
                                onClick={exportDetailedCSV}
                                disabled={!results.length}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                <DownloadIcon size={12} />CSV (Detailed)
                            </button>
                            <button
                                onClick={() => window.print()}
                                disabled={!results.length}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                <PrinterIcon size={12} />Print
                            </button>
                        </div>
                    </div>

                    {/* Grouped results */}
                    {groupedByTest.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400">
                            No assessments found for this date range.
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {groupedByTest.map(group => {
                                if (!group.test) return null;
                                const fields = group.test.fields.filter(f => f.type !== 'text' && f.key !== 'notes').slice(0, 6);
                                const calcs = (group.test.calculations || []).slice(0, 2);
                                return (
                                    <div key={group.test.id} className="px-4 py-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-semibold text-slate-800">{group.test.name}</h4>
                                            <span className="text-xs text-slate-400">{group.entries.length} entries</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-left">
                                                        <th className="px-2 py-1 text-slate-500 font-semibold uppercase tracking-wide">Athlete</th>
                                                        <th className="px-2 py-1 text-slate-500 font-semibold uppercase tracking-wide">Date</th>
                                                        {fields.map(f => (
                                                            <th key={f.key} className="px-2 py-1 text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">
                                                                {f.label}
                                                            </th>
                                                        ))}
                                                        {calcs.map(c => (
                                                            <th key={c.key} className="px-2 py-1 text-indigo-500 font-semibold uppercase tracking-wide whitespace-nowrap">
                                                                {c.label}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.entries.map(entry => {
                                                        const m = entry.metrics || {};
                                                        const calculated: Record<string, any> = {};
                                                        for (const calc of calcs) { calculated[calc.key] = calc.formula(m); }
                                                        return (
                                                            <tr key={entry.id} className="border-t border-slate-50">
                                                                <td className="px-2 py-1.5 font-medium text-slate-800 whitespace-nowrap">{getAthleteName(entry.athlete_id)}</td>
                                                                <td className="px-2 py-1.5 text-slate-500">{entry.date}</td>
                                                                {fields.map(f => (
                                                                    <td key={f.key} className="px-2 py-1.5 tabular-nums text-slate-700">
                                                                        {m[f.key] ?? <span className="text-slate-300">—</span>}
                                                                    </td>
                                                                ))}
                                                                {calcs.map(c => (
                                                                    <td key={c.key} className="px-2 py-1.5 tabular-nums font-semibold text-indigo-600">
                                                                        {calculated[c.key] ?? <span className="text-slate-300">—</span>}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
