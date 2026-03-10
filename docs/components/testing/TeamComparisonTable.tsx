// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import { getTestsByCategory, getTestById, TEST_CATEGORIES, getNormBands } from '../../utils/testRegistry';
import type { TestDefinition, TestCategory } from '../../utils/testRegistry';
import { NormativeBar } from './NormativeBar';
import {
    UsersIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon, DownloadIcon,
    PrinterIcon, FilterIcon, SearchIcon,
} from 'lucide-react';

interface Props {
    initialTestId?: string;
    initialTeamId?: string;
}

/**
 * Team-wide comparison table for a selected test.
 * Shows all athletes' latest results side-by-side with normative classification.
 */
export const TeamComparisonTable: React.FC<Props> = ({ initialTestId, initialTeamId }) => {
    const { teams } = useAppState();

    const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId || '');
    const [selectedTestId, setSelectedTestId] = useState(initialTestId || '');
    const [selectedCategory, setSelectedCategory] = useState<TestCategory | ''>('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [sortField, setSortField] = useState<string>('');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const selectedTeam = useMemo(() => teams.find(t => t.id === selectedTeamId), [teams, selectedTeamId]);
    const selectedTest = useMemo(() => selectedTestId ? getTestById(selectedTestId) : null, [selectedTestId]);
    const categoryTests = useMemo(
        () => selectedCategory ? getTestsByCategory(selectedCategory).filter(t => !t.customComponent) : [],
        [selectedCategory]
    );

    // Metric columns to display
    const displayFields = useMemo(() => {
        if (!selectedTest) return [];
        const fields = selectedTest.fields
            .filter(f => f.type !== 'text' && f.key !== 'notes')
            .map(f => ({ key: f.key, label: f.label, unit: f.unit }));
        const calcs = (selectedTest.calculations || [])
            .map(c => ({ key: c.key, label: c.label, unit: c.unit, isCalc: true }));
        return [...fields, ...calcs].slice(0, 8);
    }, [selectedTest]);

    // Load results
    const loadResults = useCallback(async () => {
        if (!selectedTeamId || !selectedTestId || !selectedTeam) return;
        setLoading(true);
        try {
            const playerIds = selectedTeam.players.map(p => p.id);
            const data = await DatabaseService.fetchAssessmentsByTeam(playerIds, selectedTestId);
            setResults(data || []);
        } catch (err) {
            console.error('Load comparison data error:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [selectedTeamId, selectedTestId, selectedTeam]);

    useEffect(() => { loadResults(); }, [loadResults]);

    // Build rows: one per athlete with their LATEST result
    const rows = useMemo(() => {
        if (!selectedTeam || !selectedTest) return [];
        return selectedTeam.players
            .map(player => {
                const playerResults = results.filter(r => r.athlete_id === player.id);
                const latest = playerResults[0]; // already sorted desc by date
                const metrics = latest?.metrics || {};

                // Run calculations
                const calculated: Record<string, any> = {};
                if (selectedTest.calculations) {
                    for (const calc of selectedTest.calculations) {
                        calculated[calc.key] = calc.formula(metrics);
                    }
                }

                const allValues = { ...metrics, ...calculated };

                // Get normative classification
                let normLabel = '';
                let normColor = '';
                if (selectedTest.norms) {
                    const bands = getNormBands(selectedTest.norms, player.gender);
                    const val = allValues[selectedTest.norms.primaryField];
                    if (val != null) {
                        const band = bands.find(b => {
                            const aboveMin = b.min == null || val >= b.min;
                            const belowMax = b.max == null || val < b.max;
                            return aboveMin && belowMax;
                        });
                        if (band) { normLabel = band.label; normColor = band.color; }
                    }
                }

                return {
                    player,
                    date: latest?.date || null,
                    metrics,
                    calculated,
                    allValues,
                    normLabel,
                    normColor,
                    hasData: !!latest,
                };
            })
            .sort((a, b) => {
                if (!sortField) return a.player.name.localeCompare(b.player.name);
                const va = a.allValues[sortField];
                const vb = b.allValues[sortField];
                if (va == null && vb == null) return 0;
                if (va == null) return 1;
                if (vb == null) return -1;
                return sortDir === 'asc' ? va - vb : vb - va;
            });
    }, [selectedTeam, selectedTest, results, sortField, sortDir]);

    const toggleSort = (key: string) => {
        if (sortField === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(key);
            setSortDir('desc');
        }
    };

    // CSV export
    const exportCSV = useCallback(() => {
        if (!selectedTest || !rows.length) return;
        const headers = ['Athlete', 'Date', ...displayFields.map(f => `${f.label}${f.unit ? ` (${f.unit})` : ''}`), 'Classification'];
        const csvRows = rows.map(r => [
            r.player.name,
            r.date || '',
            ...displayFields.map(f => r.allValues[f.key] ?? ''),
            r.normLabel,
        ]);
        const csv = [headers, ...csvRows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedTest.id}_team_comparison_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [selectedTest, rows, displayFields]);

    const NORM_COLORS: Record<string, string> = {
        emerald: 'bg-emerald-100 text-emerald-700',
        sky: 'bg-sky-100 text-sky-700',
        teal: 'bg-teal-100 text-teal-700',
        amber: 'bg-amber-100 text-amber-700',
        orange: 'bg-orange-100 text-orange-700',
        red: 'bg-red-100 text-red-700',
    };

    return (
        <div className="space-y-4">
            {/* Selection controls */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Team</label>
                        <select
                            value={selectedTeamId}
                            onChange={e => { setSelectedTeamId(e.target.value); setResults([]); }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white"
                        >
                            <option value="">— Select Team —</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.players.length})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                        <select
                            value={selectedCategory}
                            onChange={e => { setSelectedCategory(e.target.value as TestCategory); setSelectedTestId(''); setResults([]); }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white"
                        >
                            <option value="">— Select Category —</option>
                            {TEST_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Test</label>
                        <select
                            value={selectedTestId}
                            onChange={e => { setSelectedTestId(e.target.value); setResults([]); }}
                            disabled={!selectedCategory}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-white disabled:bg-slate-50"
                        >
                            <option value="">— Select Test —</option>
                            {categoryTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results table */}
            {selectedTeamId && selectedTestId && selectedTest && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <div className="flex items-center gap-2">
                            <UsersIcon size={14} className="text-slate-400" />
                            <span className="text-sm font-semibold text-slate-700">{selectedTest.name}</span>
                            <span className="text-xs text-slate-400">— {selectedTeam?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <DownloadIcon size={12} />CSV
                            </button>
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                <PrinterIcon size={12} />Print
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-8 text-sm text-slate-400">Loading comparison data...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100">
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 z-10">
                                            Athlete
                                        </th>
                                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                                        {displayFields.map(f => (
                                            <th
                                                key={f.key}
                                                onClick={() => toggleSort(f.key)}
                                                className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-slate-700 select-none"
                                            >
                                                <span className="flex items-center gap-1">
                                                    {f.label}
                                                    {f.unit && <span className="text-slate-400 normal-case">({f.unit})</span>}
                                                    {sortField === f.key && (
                                                        sortDir === 'asc' ? <ArrowUpIcon size={10} /> : <ArrowDownIcon size={10} />
                                                    )}
                                                </span>
                                            </th>
                                        ))}
                                        {selectedTest.norms && (
                                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Classification</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(row => (
                                        <tr key={row.player.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                                            <td className="px-4 py-2.5 font-medium text-slate-800 sticky left-0 bg-white z-10 whitespace-nowrap">
                                                {row.player.name}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-500 text-xs whitespace-nowrap">
                                                {row.date || <span className="text-slate-300">No data</span>}
                                            </td>
                                            {displayFields.map(f => (
                                                <td key={f.key} className="px-3 py-2.5 tabular-nums">
                                                    {row.allValues[f.key] != null ? (
                                                        <span className={f.isCalc ? 'font-semibold text-indigo-600' : 'text-slate-800'}>
                                                            {row.allValues[f.key]}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            ))}
                                            {selectedTest.norms && (
                                                <td className="px-3 py-2.5">
                                                    {row.normLabel ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${NORM_COLORS[row.normColor] || 'bg-slate-100 text-slate-500'}`}>
                                                            {row.normLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={99} className="text-center py-8 text-sm text-slate-400">
                                                No athletes in this team
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Summary row */}
                    {rows.filter(r => r.hasData).length > 0 && (
                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex flex-wrap gap-4 text-xs">
                                <span className="text-slate-400">
                                    {rows.filter(r => r.hasData).length}/{rows.length} athletes tested
                                </span>
                                {selectedTest.norms && (() => {
                                    const classified = rows.filter(r => r.normLabel);
                                    const counts: Record<string, number> = {};
                                    classified.forEach(r => { counts[r.normLabel] = (counts[r.normLabel] || 0) + 1; });
                                    return Object.entries(counts).map(([label, count]) => (
                                        <span key={label} className="text-slate-500">
                                            {label}: <span className="font-semibold">{count}</span>
                                        </span>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty state */}
            {(!selectedTeamId || !selectedTestId) && (
                <div className="text-center py-12 text-sm text-slate-400">
                    Select a team, category, and test above to compare athletes.
                </div>
            )}
        </div>
    );
};
