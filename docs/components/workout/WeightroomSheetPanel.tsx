import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { useCreateSheet, useUpdateSheet } from '../../hooks/useWeightroomSheets';
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

const WeightroomSheetPanel = ({
    workoutExercises, sheetConfig, targetType, targetId, onSave, onRemove, onClose,
    // Provenance for the Sheets library — packet name / session date / target name.
    // When provided + `saveToLibrary` is true on Attach, the inline packet config
    // is also persisted as a standalone library row tagged with this source_context.
    sourceContext,
}) => {
    const { teams, maxHistory, showToast } = useAppState();
    const createSheet = useCreateSheet();
    const updateSheet = useUpdateSheet();

    const [columns, setColumns] = useState(sheetConfig?.columns || []);
    const [orientation, setOrientation] = useState(sheetConfig?.orientation || 'portrait');
    // Default ON when we have provenance to write — keeps the library populated
    // automatically. The packet builder is the only caller passing sourceContext today,
    // so this defaults to off (no library write) in any other context.
    const [saveToLibrary, setSaveToLibrary] = useState(!!sourceContext);
    // Track the library row we already created during THIS panel session, so
    // edit-and-reattach updates the same row instead of inserting duplicates.
    const libraryIdRef = useRef<string | null>(sheetConfig?.libraryId ?? null);

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
        setColumns(prev => prev.map(c => c.id === id ? { ...c, percentage: pct === '' ? '' : (Number(pct) || 0) } : c));
    };

    // On blur, snap empty/zero back to 100
    const commitPercentage = (id) => {
        setColumns(prev => prev.map(c => c.id === id && (!c.percentage || c.percentage === '') ? { ...c, percentage: 100 } : c));
    };

    const handleAttach = async () => {
        if (columns.length === 0) return;
        let libraryId = libraryIdRef.current;

        // Mirror the inline config into the Sheets library when provenance is present
        // and the user opted in. First attach creates a new row; subsequent attaches
        // update the row already created in this panel session.
        if (saveToLibrary && sourceContext) {
            try {
                const libraryPayload = {
                    name: sourceContext.packetName?.trim() || 'Untitled Sheet',
                    ws_mode: 'advanced' as const,
                    ws_orientation: orientation,
                    ws_columns: columns,
                    team_id: sourceContext.targetType === 'Team' ? (sourceContext.targetId || null) : null,
                    notes: null,
                    source_context: sourceContext,
                };
                if (libraryId) {
                    await updateSheet.mutateAsync({ id: libraryId, ...libraryPayload });
                } else {
                    const created = await createSheet.mutateAsync(libraryPayload);
                    libraryId = created.id;
                    libraryIdRef.current = libraryId;
                    showToast?.('Sheet saved to library', 'success');
                }
            } catch (e: any) {
                showToast?.(e?.message || 'Failed to save sheet to library', 'error');
            }
        }

        // libraryId is threaded back into the inline config so re-opening the panel
        // (or the packet's auto-save / reload cycle) can keep updating the same row.
        onSave({ columns, orientation, libraryId: libraryId ?? undefined });
    };

    const handlePrint = () => {
        if (columns.length === 0 || athletes.length === 0) return;
        printSheet({ columns, orientation }, athletes, maxLookup);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#132338] rounded-xl border border-teal-200 dark:border-teal-800/50 shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-3 bg-teal-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5 text-white">
                    <PrinterIcon size={16} />
                    <span className="text-xs font-black uppercase tracking-widest">Weightroom Sheet</span>
                    {sheetConfig && <span className="px-2 py-0.5 bg-teal-500 rounded text-[8px] font-bold uppercase">Attached</span>}
                </div>
                <button onClick={onClose} aria-label="Close" className="text-teal-200 hover:text-white transition-colors"><XIcon size={16} /></button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <SparklesIcon size={12} className="text-amber-600" />
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">Suggested from workout</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {suggestions.map(s => (
                                <button
                                    key={s.exerciseId}
                                    onClick={() => activeExerciseIds.has(s.exerciseId) ? removeColumn(columns.find(c => c.exerciseId === s.exerciseId)?.id) : addExercise(s.exerciseId)}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                        activeExerciseIds.has(s.exerciseId)
                                            ? 'bg-teal-600 text-white'
                                            : 'bg-white dark:bg-[#132338] border border-amber-300 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/15'
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
                                        : 'bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-500 hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1]'
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
                                <div key={col.id} className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] rounded-lg px-3 py-2 border border-slate-100 dark:border-[#243A58]">
                                    <span className="text-[10px] font-semibold text-slate-700 dark:text-[#CBD5E1] flex-1 truncate">{col.label}</span>
                                    <input
                                        type="number"
                                        value={col.percentage}
                                        onChange={(e) => updatePercentage(col.id, e.target.value)}
                                        onBlur={() => commitPercentage(col.id)}
                                        min={1} max={200}
                                        className="w-14 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded px-1.5 py-1 text-xs text-center outline-none focus:border-teal-400"
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
                    <div className="border border-dashed border-slate-200 dark:border-[#243A58] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Preview</span>
                            <span className="text-[10px] text-slate-400">{athletes.length} athletes</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                                <thead>
                                    <tr>
                                        <th className="px-3 py-2 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">Name</th>
                                        {columns.map(col => (
                                            <th key={col.id} className="px-3 py-2 bg-slate-900 dark:bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">
                                                {col.label} ({col.percentage}%)
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {athletes.map(a => (
                                        <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                            <td className="px-3 py-1.5 font-semibold text-slate-800 dark:text-[#E2E8F0] uppercase text-[10px] border border-slate-200 dark:border-[#243A58] whitespace-nowrap">{a.name}</td>
                                            {columns.map(col => (
                                                <td key={col.id} className="px-3 py-1.5 text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] text-center">
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
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#243A58]">
                    <div className="flex items-center gap-2">
                        {/* Orientation */}
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#243A58]">
                            {['portrait', 'landscape'].map(o => (
                                <button
                                    key={o}
                                    onClick={() => setOrientation(o)}
                                    className={`px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all ${
                                        orientation === o ? 'bg-slate-900 dark:bg-indigo-600 text-white' : 'bg-white text-slate-400 dark:text-[#94A3B8] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                                    }`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>
                        {columns.length > 0 && athletes.length > 0 && (
                            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] text-[10px] font-semibold transition-colors">
                                <PrinterIcon size={11} /> Print Preview
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {sourceContext && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={saveToLibrary}
                                    onChange={(e) => setSaveToLibrary(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
                                />
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1]">
                                    Save copy to Sheets library
                                </span>
                            </label>
                        )}
                        {sheetConfig && (
                            <button onClick={onRemove} className="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/15 rounded-lg text-[10px] font-semibold transition-all">
                                Remove Sheet
                            </button>
                        )}
                        <button onClick={onClose} className="px-3 py-2 bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] rounded-lg text-[10px] font-semibold transition-all">
                            Cancel
                        </button>
                        <button
                            onClick={handleAttach}
                            disabled={columns.length === 0 || createSheet.isPending || updateSheet.isPending}
                            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest disabled:opacity-40 transition-all"
                        >
                            <CheckIcon size={12} /> {sheetConfig ? 'Update Sheet' : 'Attach Sheet'}
                        </button>
                    </div>
                </div>
            </div>
          </div>
        </div>
    );
};

export default WeightroomSheetPanel;
