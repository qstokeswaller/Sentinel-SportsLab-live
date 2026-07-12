// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Trash2, Plus } from 'lucide-react';
import { PHASE_COLOR_PRESETS } from '../../utils/periodizationUtils';
import { formatDateShort } from '../../utils/periodizationUtils';
import DatePicker from '../../components/ui/DatePicker';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] text-sm text-slate-800 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1';

const PRESET_FOCUSES = [
    'General Preparation', 'Specific Preparation', 'Pre-Competition',
    'Competition', 'Tapering', 'Active Recovery', 'Return to Play',
];

export const AddPhaseModal = () => {
    const {
        isPlanPhaseModalOpen, setIsPlanPhaseModalOpen,
        editingPlanPhase, setEditingPlanPhase,
        handleAddPlanPhase, handleUpdatePlanPhase, handleDeletePlanPhase,
        activePlanId, periodizationPlans,
    } = useAppState();

    const plan = periodizationPlans.find(p => p.id === activePlanId);

    const [name,            setName]            = useState('');
    const [focuses,         setFocuses]         = useState([]);
    const [customFocusInput, setCustomFocusInput] = useState('');
    const [startDate,       setStartDate]       = useState('');
    const [endDate,         setEndDate]         = useState('');
    const [color,           setColor]           = useState(PHASE_COLOR_PRESETS[0]);
    const [goals,           setGoals]           = useState('');
    const [notes,           setNotes]           = useState('');

    const isEditing = !!editingPlanPhase?.id;

    // Phases to show as date reference (all except the one being edited)
    const otherPhases = (plan?.phases || []).filter(ph => ph.id !== editingPlanPhase?.id);

    useEffect(() => {
        if (editingPlanPhase?.id) {
            setName(editingPlanPhase.name || '');
            const existing = editingPlanPhase.focuses?.length
                ? editingPlanPhase.focuses
                : editingPlanPhase.trainingPhase ? [editingPlanPhase.trainingPhase] : [];
            setFocuses(existing);
            setStartDate(editingPlanPhase.startDate || '');
            setEndDate(editingPlanPhase.endDate || '');
            setColor(editingPlanPhase.color || PHASE_COLOR_PRESETS[0]);
            setGoals(editingPlanPhase.goals || '');
            setNotes(editingPlanPhase.notes || '');
        } else {
            setName('');
            setFocuses([]);
            setStartDate(plan?.startDate || '');
            setEndDate('');
            setColor(PHASE_COLOR_PRESETS[(plan?.phases?.length || 0) % PHASE_COLOR_PRESETS.length]);
            setGoals('');
            setNotes('');
        }
        setCustomFocusInput('');
    }, [editingPlanPhase, isPlanPhaseModalOpen]);

    if (!isPlanPhaseModalOpen) return null;

    const toggleFocus = (tp) => {
        setFocuses(prev => prev.includes(tp) ? prev.filter(f => f !== tp) : [...prev, tp]);
    };

    const addCustomFocus = () => {
        const val = customFocusInput.trim();
        if (!val || focuses.includes(val)) { setCustomFocusInput(''); return; }
        setFocuses(prev => [...prev, val]);
        setCustomFocusInput('');
    };

    // Custom focuses = ones not in the preset list
    const customFocuses = focuses.filter(f => !PRESET_FOCUSES.includes(f));

    const handleSubmit = () => {
        if (!name.trim() || !startDate) return;
        const payload = {
            name: name.trim(),
            focuses: focuses.length ? focuses : ['General Preparation'],
            trainingPhase: focuses[0] || 'General Preparation',
            startDate,
            endDate: endDate || undefined,
            color,
            goals: goals.trim(),
            notes: notes.trim(),
        };
        if (isEditing) {
            handleUpdatePlanPhase(editingPlanPhase.id, payload);
        } else {
            handleAddPlanPhase(payload);
        }
    };

    const handleClose = () => {
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-md shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">{isEditing ? 'Edit Phase' : 'Add Phase'}</h3>
                    <button onClick={handleClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48]"><X size={14} className="text-slate-400" /></button>
                </div>

                <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">

                    {/* Phase Name */}
                    <div>
                        <label className={LABEL}>Phase Name</label>
                        <input className={INPUT} placeholder="e.g. Pre-Season" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    </div>

                    {/* Training Focuses */}
                    <div>
                        <label className={LABEL}>
                            Training Focuses
                            <span className="text-slate-400 dark:text-[#CBD5E1] normal-case ml-1">(first selected = primary)</span>
                        </label>

                        {/* Preset chips */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {PRESET_FOCUSES.map(tp => {
                                const selected  = focuses.includes(tp);
                                const isPrimary = focuses[0] === tp;
                                return (
                                    <button key={tp} type="button" onClick={() => toggleFocus(tp)}
                                        className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                                            selected
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-700'
                                        }`}>
                                        {tp}
                                        {isPrimary && selected && <span className="ml-1 text-indigo-200 text-[8px]">·1st</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom focuses (non-preset ones already selected) */}
                        {customFocuses.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {customFocuses.map(f => (
                                    <span key={f}
                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                                            focuses[0] === f
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-violet-100 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800/40'
                                        }`}>
                                        {f}
                                        {focuses[0] === f && <span className="text-indigo-200 text-[8px]">·1st</span>}
                                        <button type="button" onClick={() => toggleFocus(f)} className="hover:opacity-70 ml-0.5">
                                            <X size={9} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Add custom input */}
                        <div className="flex gap-1.5 mt-2">
                            <input
                                className="flex-1 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400"
                                placeholder="Add custom focus…"
                                value={customFocusInput}
                                onChange={e => setCustomFocusInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomFocus(); } }}
                            />
                            <button type="button" onClick={addCustomFocus}
                                disabled={!customFocusInput.trim()}
                                className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40">
                                <Plus size={12} />
                            </button>
                        </div>

                        {focuses.length === 0 && (
                            <p className="text-[9px] text-amber-500 dark:text-amber-400 mt-1">Select or add at least one focus.</p>
                        )}
                    </div>

                    {/* Dates + existing phase reference */}
                    <div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={LABEL}>Start Date</label>
                                <DatePicker value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </div>
                            <div>
                                <label className={LABEL}>End Date <span className="text-slate-400 dark:text-[#CBD5E1] normal-case">(optional)</span></label>
                                <DatePicker value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </div>
                        </div>

                        {/* Existing phase dates reference */}
                        {otherPhases.length > 0 && (
                            <div className="mt-2.5 bg-slate-50 dark:bg-[#0F1C30]/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-[#243A58]">
                                <p className="text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide mb-2">Other phases</p>
                                <div className="space-y-1.5">
                                    {otherPhases.map(ph => (
                                        <div key={ph.id} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ph.color || '#6366f1' }} />
                                            <span className="text-[10px] font-medium text-slate-600 dark:text-[#CBD5E1] truncate flex-1">{ph.name}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] shrink-0 tabular-nums">
                                                {ph.startDate ? formatDateShort(ph.startDate) : '—'}
                                                {ph.endDate ? ` – ${formatDateShort(ph.endDate)}` : ' →'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Color */}
                    <div>
                        <label className={LABEL}>Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {PHASE_COLOR_PRESETS.map(c => (
                                <button key={c} type="button" onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>

                    {/* Goals */}
                    <div>
                        <label className={LABEL}>Goals & Objectives <span className="text-slate-400 dark:text-[#CBD5E1] normal-case">(optional)</span></label>
                        <textarea className={INPUT + ' resize-none'} rows={3}
                            placeholder="e.g. Build aerobic base, improve strength foundation..."
                            value={goals} onChange={e => setGoals(e.target.value)} />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={LABEL}>Notes <span className="text-slate-400 dark:text-[#CBD5E1] normal-case">(optional)</span></label>
                        <textarea className={INPUT + ' resize-none'} rows={2}
                            placeholder="Any additional notes for this phase..."
                            value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#132338]/40">
                    {isEditing ? (
                        <button onClick={() => handleDeletePlanPhase(editingPlanPhase.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]">Cancel</button>
                        <button onClick={handleSubmit} disabled={!name.trim() || !startDate}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40">
                            {isEditing ? 'Update' : 'Add Phase'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
