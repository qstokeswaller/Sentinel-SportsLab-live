// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { WEIGHTROOM_1RM_EXERCISES } from '../../utils/constants';
import { buildMaxLookup, getSheetCellValue, matchWorkoutExercisesTo1RM, printSheet } from '../../utils/weightroomUtils';
import {
    X as XIcon,
    Plus as PlusIcon,
    Trash2 as Trash2Icon,
    Printer as PrinterIcon,
    Check as CheckIcon,
    Sparkles as SparklesIcon,
} from 'lucide-react';

const WeightroomSheetPanel = ({ workoutExercises, sheetConfig, targetType, targetId, onSave, onRemove, onClose }) => {
    const { teams, maxHistory } = useAppState();

    const [columns, setColumns] = useState(sheetConfig?.columns || []);
    const [orientation, setOrientation] = useState(sheetConfig?.orientation || 'portrait');

    // Auto-suggest on first open (no existing config)
    useEffect(() => {
        if (!sheetConfig && workoutExercises.length > 0 && columns.length === 0) {
            const suggestions = matchWorkoutExercisesTo1RM(workoutExercises);
            if (suggestions.length > 0) {
                setColumns(suggestions);
            }
        }
    }, []);

    const athletes = useMemo(() => {
        if (!targetId) return [];
        if (targetType === 'Team') {
            const team = teams.find(t => t.id === targetId);
            return [...(team?.players || [])].sort((a, b) => a.name.localeCompare(b.name));
        }
        // Individual — find athlete across teams
        for (const t of teams) {
            const p = (t.players || []).find(p => p.id === targetId);
            if (p) return [p];
        }
        return [];
    }, [teams, targetId, targetType]);

    const maxLookup = useMemo(() => buildMaxLookup(maxHistory), [maxHistory]);

    const suggestions = useMemo(() => matchWorkoutExercisesTo1RM(workoutExercises), [workoutExercises]);
    const activeExerciseIds = new Set(columns.map(c => c.exerciseId));

    const addExercise = (name) => {
        if (activeExerciseIds.has(name)) return;
        setColumns(prev => [...prev, { id: 'c' + Date.now(), label: name, exerciseId: name, percentage: 100 }]);
    };

    const removeColumn = (id) => {
        setColumns(prev => prev.filter(c => c.id !== id));
    };

    const updatePercentage = (id, pct) => {
        setColumns(prev => prev.map(c => c.id === id ? { ...c, percentage: Number(pct) || 100 } : c));
    };

    const handleAttach = () => {
        if (columns.length === 0) return;
        onSave({ columns, orientation });
    };

    const handlePrint = () => {
        if (columns.length === 0 || athletes.length === 0) return;
        printSheet({ columns, orientation }, athletes, maxLookup);
    };

    return (
        <div className="bg-white rounded-xl border border-teal-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 fade-in duration-300">
            {/* Header */}
            <div className="px-5 py-3 bg-teal-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-white">
                    <PrinterIcon size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Weightroom Sheet</span>
                    {sheetConfig && <span className="px-2 py-0.5 bg-teal-500 rounded text-[8px] font-bold uppercase">Attached</span>}
                </div>
                <button onClick={onClose} className="text-teal-200 hover:text-white transition-colors"><XIcon size={16} /></button>
            </div>

            <div className="p-5 space-y-4">
                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <SparklesIcon size={12} className="text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Suggested from workout</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestions.map(s => (
                                <button
                                    key={s.exerciseId}
                                    onClick={() => activeExerciseIds.has(s.exerciseId) ? removeColumn(columns.find(c => c.exerciseId === s.exerciseId)?.id) : addExercise(s.exerciseId)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                        activeExerciseIds.has(s.exerciseId)
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-white border border-amber-300 text-amber-700 hover:bg-amber-100'
                                    }`}
                                >
                                    {activeExerciseIds.has(s.exerciseId) && <CheckIcon size={10} />}
                                    {s.exerciseId}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Add from full list */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">All 1RM Exercises</span>
                        <span className="text-[10px] text-slate-400">{columns.length} selected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {WEIGHTROOM_1RM_EXERCISES.map(name => (
                            <button
                                key={name}
                                onClick={() => activeExerciseIds.has(name) ? removeColumn(columns.find(c => c.exerciseId === name)?.id) : addExercise(name)}
                                className={`px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                    activeExerciseIds.has(name)
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                                }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Column percentage config */}
                {columns.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Percentage of 1RM</span>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {columns.map(col => (
                                <div key={col.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                                    <span className="text-[10px] font-semibold text-slate-700 flex-1 truncate">{col.label}</span>
                                    <input
                                        type="number"
                                        value={col.percentage}
                                        onChange={(e) => updatePercentage(col.id, e.target.value)}
                                        min={1} max={200}
                                        className="w-14 bg-white border border-slate-200 rounded px-1.5 py-1 text-xs text-center outline-none focus:border-teal-400"
                                    />
                                    <span className="text-[9px] text-slate-400">%</span>
                                    <button onClick={() => removeColumn(col.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2Icon size={11} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Live Preview Table */}
                {columns.length > 0 && athletes.length > 0 && (
                    <div className="border border-dashed border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preview</span>
                            <span className="text-[10px] text-slate-400">{athletes.length} athletes</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">Name</th>
                                        {columns.map(col => (
                                            <th key={col.id} className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">
                                                {col.label} ({col.percentage}%)
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {athletes.map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50">
                                            <td className="px-3 py-1.5 font-semibold text-slate-800 uppercase text-[10px] border border-slate-200 whitespace-nowrap">{a.name}</td>
                                            {columns.map(col => (
                                                <td key={col.id} className="px-3 py-1.5 text-slate-600 border border-slate-200 text-center">
                                                    {getSheetCellValue(col, a.id, maxLookup) || '\u00A0'}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {columns.length > 0 && athletes.length === 0 && targetId && (
                    <p className="text-[10px] text-slate-400 text-center py-3">No athletes found for this target. Preview will show once athletes are loaded.</p>
                )}

                {!targetId && columns.length > 0 && (
                    <p className="text-[10px] text-amber-600 text-center py-3">Select a target team/athlete above to preview 1RM values.</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                        {/* Orientation */}
                        <div className="flex rounded-lg overflow-hidden border border-slate-200">
                            {['portrait', 'landscape'].map(o => (
                                <button
                                    key={o}
                                    onClick={() => setOrientation(o)}
                                    className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${
                                        orientation === o ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'
                                    }`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>
                        {columns.length > 0 && athletes.length > 0 && (
                            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 text-[10px] font-semibold transition-colors">
                                <PrinterIcon size={11} /> Print Preview
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {sheetConfig && (
                            <button onClick={onRemove} className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-[10px] font-semibold transition-all">
                                Remove Sheet
                            </button>
                        )}
                        <button onClick={onClose} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleAttach}
                            disabled={columns.length === 0}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all"
                        >
                            <CheckIcon size={12} /> {sheetConfig ? 'Update Sheet' : 'Attach Sheet'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeightroomSheetPanel;
