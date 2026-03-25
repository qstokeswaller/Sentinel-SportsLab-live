// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Trash2 } from 'lucide-react';
import { PHASE_COLOR_PRESETS } from '../../utils/periodizationUtils';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1';

const TRAINING_PHASES = [
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

    const [name, setName] = useState('');
    const [trainingPhase, setTrainingPhase] = useState('General Preparation');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [color, setColor] = useState(PHASE_COLOR_PRESETS[0]);

    const isEditing = editingPlanPhase?.id;

    useEffect(() => {
        if (editingPlanPhase?.id) {
            setName(editingPlanPhase.name || '');
            setTrainingPhase(editingPlanPhase.trainingPhase || 'General Preparation');
            setStartDate(editingPlanPhase.startDate || '');
            setEndDate(editingPlanPhase.endDate || '');
            setColor(editingPlanPhase.color || PHASE_COLOR_PRESETS[0]);
        } else {
            setName('');
            setTrainingPhase('General Preparation');
            setStartDate(plan?.startDate || '');
            setEndDate('');
            setColor(PHASE_COLOR_PRESETS[(plan?.phases?.length || 0) % PHASE_COLOR_PRESETS.length]);
        }
    }, [editingPlanPhase, isPlanPhaseModalOpen]);

    if (!isPlanPhaseModalOpen) return null;

    const handleSubmit = () => {
        if (!name.trim() || !startDate) return;
        if (isEditing) {
            handleUpdatePlanPhase(editingPlanPhase.id, { name: name.trim(), trainingPhase, startDate, endDate: endDate || undefined, color });
        } else {
            handleAddPlanPhase({ name: name.trim(), trainingPhase, startDate, endDate: endDate || undefined, color });
        }
    };

    const handleClose = () => {
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">{isEditing ? 'Edit Phase' : 'Add Phase'}</h3>
                    <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={14} className="text-slate-400" /></button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className={LABEL}>Phase Name</label>
                        <input className={INPUT} placeholder="e.g. Pre-Season" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    </div>

                    <div>
                        <label className={LABEL}>Training Phase</label>
                        <select className={INPUT} value={trainingPhase} onChange={e => setTrainingPhase(e.target.value)}>
                            {TRAINING_PHASES.map(tp => <option key={tp} value={tp}>{tp}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Start Date</label>
                            <input type="date" className={INPUT} value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className={LABEL}>End Date <span className="text-slate-400 normal-case">(optional)</span></label>
                            <input type="date" className={INPUT} value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className={LABEL}>Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {PHASE_COLOR_PRESETS.map(c => (
                                <button key={c} onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                    {isEditing ? (
                        <button onClick={() => handleDeletePlanPhase(editingPlanPhase.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                        <button onClick={handleSubmit} disabled={!name.trim() || !startDate}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40">
                            {isEditing ? 'Update' : 'Add Phase'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
