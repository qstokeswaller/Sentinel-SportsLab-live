// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import type { TestDefinition, TestField } from '../../utils/testRegistry';
import { NormativeBar } from './NormativeBar';
import {
    UsersIcon, CheckCircleIcon, SaveIcon, CalendarIcon, ChevronDownIcon,
    FilterIcon, AlertCircleIcon,
} from 'lucide-react';

interface Props {
  test: TestDefinition;
  date: string;
  onDateChange?: (newDate: string) => void;
  onSaved?: () => void;
}

/**
 * Generic team batch entry component.
 * Select a team → table shows all athletes → enter values per row → save individually or all at once.
 */
export const TeamBatchEntry: React.FC<Props> = ({ test, date, onDateChange, onSaved }) => {
    const { teams, showToast } = useAppState();

    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [athleteFilter, setAthleteFilter] = useState(''); // '' = all, athleteId = single
    const [rowData, setRowData] = useState<Record<string, Record<string, any>>>({});
    const [savedRows, setSavedRows] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);
    const [batchTab, setBatchTab] = useState<'standard' | 'vbt'>('standard');
    const hasVbt = !!(test.vbtFields && test.vbtFields.length > 0);

    // Get team players
    const selectedTeam = useMemo(
        () => teams.find(t => t.id === selectedTeamId),
        [teams, selectedTeamId]
    );

    const teamPlayers = useMemo(() => {
        if (!selectedTeam) return [];
        let players = [...selectedTeam.players].sort((a, b) => a.name.localeCompare(b.name));
        if (athleteFilter) players = players.filter(p => p.id === athleteFilter);
        return players;
    }, [selectedTeam, athleteFilter]);

    // Only show required + number fields in table columns (skip text/notes)
    const tableFields = useMemo(
        () => {
            const fields = batchTab === 'vbt' && hasVbt ? (test.vbtFields || []) : test.fields;
            return fields.filter(f => f.type !== 'text' && f.key !== 'notes').slice(0, 8);
        },
        [test.fields, test.vbtFields, batchTab, hasVbt]
    );

    const setFieldValue = useCallback((athleteId: string, fieldKey: string, value: any) => {
        setRowData(prev => ({
            ...prev,
            [athleteId]: { ...(prev[athleteId] || {}), [fieldKey]: value },
        }));
        setSavedRows(prev => { const n = new Set(prev); n.delete(athleteId); return n; });
    }, []);

    // Calculate derived values for a row
    const getCalculated = useCallback((athleteId: string) => {
        const calcs = batchTab === 'vbt' && hasVbt ? (test.vbtCalculations || []) : (test.calculations || []);
        if (!calcs.length) return {};
        const values = rowData[athleteId] || {};
        const result: Record<string, any> = {};
        for (const calc of calcs) {
            result[calc.key] = calc.formula(values);
        }
        return result;
    }, [rowData, test.calculations, test.vbtCalculations, batchTab, hasVbt]);

    // Check if row has required fields filled
    const isRowReady = useCallback((athleteId: string) => {
        const values = rowData[athleteId] || {};
        const fields = batchTab === 'vbt' && hasVbt ? (test.vbtFields || []) : test.fields;
        return fields
            .filter(f => f.required)
            .every(f => values[f.key] != null && values[f.key] !== '');
    }, [rowData, test.fields, test.vbtFields, batchTab, hasVbt]);

    // Save single row
    const saveRow = useCallback(async (athleteId: string) => {
        const values = rowData[athleteId] || {};
        const calculated = getCalculated(athleteId);
        const metrics = batchTab === 'vbt' ? { ...values, ...calculated, _vbt: true, _date: date } : { ...values, ...calculated, _date: date };
        try {
            await DatabaseService.logAssessment(test.id, athleteId, metrics, date);
            setSavedRows(prev => new Set(prev).add(athleteId));
            showToast?.('Saved', 'success');
        } catch (err: any) {
            console.error('Save row error:', err);
            showToast?.('Failed to save', 'error');
        }
    }, [rowData, getCalculated, test.id, date, showToast]);

    // Save all ready rows
    const saveAllReady = useCallback(async () => {
        const readyIds = teamPlayers
            .filter(p => isRowReady(p.id) && !savedRows.has(p.id))
            .map(p => p.id);
        if (!readyIds.length) return;

        setSaving(true);
        try {
            const entries = readyIds.map(id => {
                const values = rowData[id] || {};
                const calculated = getCalculated(id);
                const metrics = batchTab === 'vbt' ? { ...values, ...calculated, _vbt: true, _date: date } : { ...values, ...calculated, _date: date };
                return { testType: test.id, athleteId: id, metrics, date };
            });
            await DatabaseService.batchLogAssessments(entries);
            setSavedRows(prev => {
                const n = new Set(prev);
                readyIds.forEach(id => n.add(id));
                return n;
            });
            showToast?.(`Saved ${readyIds.length} entries`, 'success');
            onSaved?.();
        } catch (err: any) {
            console.error('Batch save error:', err);
            showToast?.('Batch save failed', 'error');
        } finally {
            setSaving(false);
        }
    }, [teamPlayers, isRowReady, savedRows, rowData, getCalculated, test.id, date, showToast, onSaved]);

    const readyCount = teamPlayers.filter(p => isRowReady(p.id) && !savedRows.has(p.id)).length;

    return (
        <div className="space-y-4">
            {/* Team + date selection */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            <UsersIcon size={12} className="inline mr-1" />Team
                        </label>
                        <select
                            value={selectedTeamId}
                            onChange={e => { setSelectedTeamId(e.target.value); setAthleteFilter(''); setRowData({}); setSavedRows(new Set()); }}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-white"
                        >
                            <option value="">— Select Team —</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.players.length})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            <FilterIcon size={12} className="inline mr-1" />Filter Athlete
                        </label>
                        <select
                            value={athleteFilter}
                            onChange={e => setAthleteFilter(e.target.value)}
                            disabled={!selectedTeamId}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-white"
                        >
                            <option value="">All Athletes</option>
                            {selectedTeam?.players.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            <CalendarIcon size={12} className="inline mr-1" />Date
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => onDateChange?.(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                        />
                    </div>
                </div>
            </div>

            {/* VBT Tab Toggle (for barbell tests) */}
            {hasVbt && selectedTeamId && (
                <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Mode:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                        <button
                            onClick={() => { setBatchTab('standard'); setRowData({}); setSavedRows(new Set()); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${batchTab === 'standard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            1RM Test
                        </button>
                        <button
                            onClick={() => { setBatchTab('vbt'); setRowData({}); setSavedRows(new Set()); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${batchTab === 'vbt' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                            VBT Tracking
                        </button>
                    </div>
                    {batchTab === 'vbt' && (
                        <span className="text-[10px] text-indigo-500 ml-2">Enter bar velocity from your encoder — system estimates intensity and 1RM</span>
                    )}
                </div>
            )}

            {/* Batch table */}
            {selectedTeamId && teamPlayers.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                        <span className="text-xs text-slate-500">
                            {savedRows.size}/{teamPlayers.length} saved
                        </span>
                        <button
                            onClick={saveAllReady}
                            disabled={readyCount === 0 || saving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all
                                ${readyCount > 0 && !saving
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <SaveIcon size={14} />
                            {saving ? 'Saving...' : `Save All Ready (${readyCount})`}
                        </button>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 z-10">Athlete</th>
                                    {tableFields.map(f => (
                                        <th key={f.key} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                            {f.label}
                                            {f.unit && <span className="text-slate-400 ml-0.5 normal-case">({f.unit})</span>}
                                        </th>
                                    ))}
                                    {test.calculations?.slice(0, 2).map(c => (
                                        <th key={c.key} className="text-left px-3 py-2 text-xs font-semibold text-indigo-500 uppercase tracking-wide whitespace-nowrap">
                                            {c.label}
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamPlayers.map(player => {
                                    const isSaved = savedRows.has(player.id);
                                    const ready = isRowReady(player.id);
                                    const calculated = getCalculated(player.id);
                                    return (
                                        <tr
                                            key={player.id}
                                            className={`border-b border-slate-50 transition-colors ${isSaved ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="px-4 py-2.5 font-medium text-slate-800 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {isSaved && <CheckCircleIcon size={14} className="text-emerald-500 shrink-0" />}
                                                    <span className={isSaved ? 'text-emerald-700' : ''}>{player.name}</span>
                                                </div>
                                            </td>
                                            {tableFields.map(f => (
                                                <td key={f.key} className="px-3 py-1.5">
                                                    {f.type === 'select' ? (
                                                        <select
                                                            value={(rowData[player.id] || {})[f.key] ?? ''}
                                                            onChange={e => setFieldValue(player.id, f.key, e.target.value || null)}
                                                            disabled={isSaved}
                                                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400"
                                                        >
                                                            <option value="">—</option>
                                                            {f.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                        </select>
                                                    ) : f.type === 'score_pills' ? (
                                                        <div className="flex gap-1">
                                                            {(f.pillValues || []).map(pv => (
                                                                <button
                                                                    key={pv}
                                                                    onClick={() => !isSaved && setFieldValue(player.id, f.key, pv)}
                                                                    disabled={isSaved}
                                                                    className={`w-7 h-7 rounded text-xs font-bold border transition-all
                                                                        ${(rowData[player.id] || {})[f.key] === pv
                                                                            ? 'bg-indigo-500 text-white border-indigo-500'
                                                                            : 'bg-white text-slate-500 border-slate-200'
                                                                        } ${isSaved ? 'opacity-50' : ''}`}
                                                                >
                                                                    {pv}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            value={(rowData[player.id] || {})[f.key] ?? ''}
                                                            onChange={e => setFieldValue(player.id, f.key, e.target.value === '' ? null : parseFloat(e.target.value))}
                                                            disabled={isSaved}
                                                            step={f.step || (f.type === 'time_seconds' ? 0.01 : 1)}
                                                            min={f.min}
                                                            max={f.max}
                                                            className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-400 focus:ring-1 focus:ring-indigo-200 focus:border-indigo-400 outline-none"
                                                        />
                                                    )}
                                                </td>
                                            ))}
                                            {test.calculations?.slice(0, 2).map(c => (
                                                <td key={c.key} className="px-3 py-2 text-sm font-semibold text-indigo-600 tabular-nums">
                                                    {calculated[c.key] != null ? calculated[c.key] : '—'}
                                                    {c.unit && calculated[c.key] != null && <span className="text-indigo-400 text-xs ml-0.5">{c.unit}</span>}
                                                </td>
                                            ))}
                                            <td className="px-3 py-1.5 text-right">
                                                {isSaved ? (
                                                    <span className="text-xs text-emerald-600 font-semibold">Saved</span>
                                                ) : (
                                                    <button
                                                        onClick={() => saveRow(player.id)}
                                                        disabled={!ready}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                                                            ${ready
                                                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                                                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        Save
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {selectedTeamId && teamPlayers.length === 0 && (
                <div className="text-center py-8 text-sm text-slate-400">
                    <AlertCircleIcon size={20} className="mx-auto mb-2 text-slate-300" />
                    No athletes found in this team.
                </div>
            )}
            {!selectedTeamId && (
                <div className="text-center py-8 text-sm text-slate-400">
                    Select a team above to begin batch entry.
                </div>
            )}
        </div>
    );
};
