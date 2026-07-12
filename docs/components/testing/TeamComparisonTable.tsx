import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import { getTestsByCategory, getTestById, TEST_CATEGORIES, getNormBands } from '../../utils/testRegistry';
import type { TestDefinition, TestCategory } from '../../utils/testRegistry';
import { NormativeBar } from './NormativeBar';
import {
    UsersIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon, DownloadIcon,
    Share2Icon, FilterIcon, SearchIcon,
} from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import { ShareTestReportModal } from './ShareTestReportModal';

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
    const [shareOpen, setShareOpen] = useState(false);

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
            .map(f => ({ key: f.key, label: f.label, unit: f.unit, isCalc: false }));
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

    // Build the snapshot payload persisted in test_share_sessions.snapshot_data.
    // Shape is consumed by PublicTestSharePage > TeamComparisonView.
    const buildSnapshot = useCallback(() => {
        if (!selectedTest || !selectedTeam) return null;
        return {
            type: 'team-comparison',
            generatedAt: new Date().toISOString(),
            team: { id: selectedTeam.id, name: selectedTeam.name },
            test: {
                id: selectedTest.id,
                name: selectedTest.name,
                hasNorms: !!selectedTest.norms,
            },
            displayFields,
            rows: rows.map(r => ({
                player: { id: r.player.id, name: r.player.name },
                date: r.date,
                allValues: r.allValues,
                normLabel: r.normLabel,
                normColor: r.normColor,
                hasData: r.hasData,
            })),
        };
    }, [selectedTest, selectedTeam, displayFields, rows]);

    const shareTitle = selectedTest && selectedTeam
        ? `${selectedTest.name} — ${selectedTeam.name}`
        : 'Team Comparison';

    const NORM_COLORS: Record<string, string> = {
        emerald: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30',
        sky: 'bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-500/30',
        teal: 'bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/30',
        amber: 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30',
        orange: 'bg-orange-50 dark:bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-500/30',
        red: 'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30',
    };

    return (
        <div className="space-y-4">
            {/* Selection controls */}
            <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-[#CBD5E1] mb-1">Team</label>
                        <CustomSelect value={selectedTeamId} onChange={e => { setSelectedTeamId(e.target.value); setResults([]); }} variant="form" placeholder="— Select Team —">
                            <option value="">— Select Team —</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.players.length})</option>)}
                        </CustomSelect>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-[#CBD5E1] mb-1">Category</label>
                        <CustomSelect value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value as TestCategory); setSelectedTestId(''); setResults([]); }} variant="form" placeholder="— Select Category —">
                            <option value="">— Select Category —</option>
                            {TEST_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </CustomSelect>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-[#CBD5E1] mb-1">Test</label>
                        <CustomSelect value={selectedTestId} onChange={e => { setSelectedTestId(e.target.value); setResults([]); }} disabled={!selectedCategory} variant="form" placeholder="— Select Test —">
                            <option value="">— Select Test —</option>
                            {categoryTests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </CustomSelect>
                    </div>
                </div>
            </div>

            {/* Results table */}
            {selectedTeamId && selectedTestId && selectedTest && (
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50 dark:bg-[#0F1C30]">
                        <div className="flex items-center gap-2">
                            <UsersIcon size={14} className="text-slate-400 dark:text-[#94A3B8]" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-[#CBD5E1]">{selectedTest.name}</span>
                            <span className="text-xs text-slate-400 dark:text-[#94A3B8]">— {selectedTeam?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={exportCSV}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors"
                            >
                                <DownloadIcon size={12} />CSV
                            </button>
                            <button
                                onClick={() => setShareOpen(true)}
                                disabled={!rows.length}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Share2Icon size={12} />Share
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-8 text-sm text-slate-400 dark:text-[#94A3B8]">Loading comparison data...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-100 dark:border-[#1A2D48]">
                                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide sticky left-0 bg-slate-50 dark:bg-[#0F1C30] z-10">
                                            Athlete
                                        </th>
                                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Date</th>
                                        {displayFields.map(f => (
                                            <th
                                                key={f.key}
                                                onClick={() => toggleSort(f.key)}
                                                className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide whitespace-nowrap cursor-pointer hover:text-slate-700 dark:hover:text-[#E2E8F0] select-none"
                                            >
                                                <span className="flex items-center gap-1">
                                                    {f.label}
                                                    {f.unit && <span className="text-slate-400 dark:text-[#94A3B8] normal-case">({f.unit})</span>}
                                                    {sortField === f.key && (
                                                        sortDir === 'asc' ? <ArrowUpIcon size={10} /> : <ArrowDownIcon size={10} />
                                                    )}
                                                </span>
                                            </th>
                                        ))}
                                        {selectedTest.norms && (
                                            <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Classification</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map(row => (
                                        <tr key={row.player.id} className="border-b border-slate-50 dark:border-[#1A2D48] hover:bg-slate-50/50 dark:hover:bg-[#1A2D48]">
                                            <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-[#E2E8F0] sticky left-0 bg-white dark:bg-[#132338] z-10 whitespace-nowrap">
                                                {row.player.name}
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-500 dark:text-[#CBD5E1] text-xs whitespace-nowrap">
                                                {row.date || <span className="text-slate-300 dark:text-[#475569]">No data</span>}
                                            </td>
                                            {displayFields.map(f => (
                                                <td key={f.key} className="px-3 py-2.5 tabular-nums">
                                                    {row.allValues[f.key] != null ? (
                                                        <span className={f.isCalc ? 'font-semibold text-indigo-600 dark:text-indigo-300' : 'text-slate-800 dark:text-[#E2E8F0]'}>
                                                            {row.allValues[f.key]}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-[#475569]">—</span>
                                                    )}
                                                </td>
                                            ))}
                                            {selectedTest.norms && (
                                                <td className="px-3 py-2.5">
                                                    {row.normLabel ? (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${NORM_COLORS[row.normColor] || 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58]'}`}>
                                                            {row.normLabel}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 dark:text-[#475569]">—</span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {rows.length === 0 && (
                                        <tr>
                                            <td colSpan={99} className="text-center py-8 text-sm text-slate-400 dark:text-[#94A3B8]">
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
                        <div className="px-4 py-3 border-t border-slate-100 dark:border-[#1A2D48] bg-slate-50/50 dark:bg-[#0F1C30]">
                            <div className="flex flex-wrap gap-4 text-xs">
                                <span className="text-slate-400 dark:text-[#94A3B8]">
                                    {rows.filter(r => r.hasData).length}/{rows.length} athletes tested
                                </span>
                                {selectedTest.norms && (() => {
                                    const classified = rows.filter(r => r.normLabel);
                                    const counts: Record<string, number> = {};
                                    classified.forEach(r => { counts[r.normLabel] = (counts[r.normLabel] || 0) + 1; });
                                    return Object.entries(counts).map(([label, count]) => (
                                        <span key={label} className="text-slate-500 dark:text-[#CBD5E1]">
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
                <div className="text-center py-12 text-sm text-slate-400 dark:text-[#94A3B8]">
                    Select a team, category, and test above to compare athletes.
                </div>
            )}

            <ShareTestReportModal
                isOpen={shareOpen}
                onClose={() => setShareOpen(false)}
                shareType="team-comparison"
                title={shareTitle}
                buildSnapshot={buildSnapshot}
            />
        </div>
    );
};
