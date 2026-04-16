// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Trash2 } from 'lucide-react';
import { BLOCK_COLOR_PRESETS } from '../../utils/periodizationUtils';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1';

const BLOCK_TYPES = ['Low Intensity', 'Medium Intensity', 'Maximal Load', 'Anthropometrics', 'General', 'Recovery'];

export const AddBlockModal = () => {
    const {
        isPlanBlockModalOpenNew, setIsPlanBlockModalOpenNew,
        editingPlanBlock, setEditingPlanBlock,
        handleAddPlanBlock, handleUpdatePlanBlock, handleDeletePlanBlock,
        activePlanId, periodizationPlans,
    } = useAppState();

    const plan = periodizationPlans.find(p => p.id === activePlanId);

    const [name, setName] = useState('');
    const [label, setLabel] = useState('');
    const [blockType, setBlockType] = useState('General');
    const [goals, setGoals] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [color, setColor] = useState(BLOCK_COLOR_PRESETS[0]);
    const [phaseId, setPhaseId] = useState('');

    const isEditing = editingPlanBlock?.id && !editingPlanBlock?._phaseId?.startsWith?.('new');

    useEffect(() => {
        if (editingPlanBlock?.id) {
            setName(editingPlanBlock.name || '');
            setLabel(editingPlanBlock.label || '');
            setBlockType(editingPlanBlock.blockType || 'General');
            setGoals(editingPlanBlock.goals || '');
            setStartDate(editingPlanBlock.startDate || '');
            setEndDate(editingPlanBlock.endDate || '');
            setColor(editingPlanBlock.color || BLOCK_COLOR_PRESETS[0]);
            setPhaseId(editingPlanBlock._phaseId || '');
        } else {
            setName('');
            setLabel('');
            setBlockType('General');
            setGoals('');
            setStartDate('');
            setEndDate('');
            setColor(BLOCK_COLOR_PRESETS[0]);
            setPhaseId(editingPlanBlock?._phaseId || plan?.phases?.[0]?.id || '');
        }
    }, [editingPlanBlock, isPlanBlockModalOpenNew]);

    if (!isPlanBlockModalOpenNew) return null;

    const handleSubmit = () => {
        if (!name.trim() || !startDate || !phaseId) return;
        if (isEditing) {
            handleUpdatePlanBlock(phaseId, editingPlanBlock.id, { name: name.trim(), label: label.trim(), blockType, goals: goals.trim(), startDate, endDate: endDate || undefined, color });
        } else {
            handleAddPlanBlock(phaseId, { name: name.trim(), label: label.trim(), blockType, goals: goals.trim(), startDate, endDate: endDate || undefined, color });
        }
    };

    const handleClose = () => {
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">{isEditing ? 'Edit Block' : 'Add Training Block'}</h3>
                    <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={14} className="text-slate-400" /></button>
                </div>

                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    {/* Phase Selector */}
                    <div>
                        <label className={LABEL}>Phase</label>
                        <select className={INPUT} value={phaseId} onChange={e => setPhaseId(e.target.value)}>
                            <option value="">Select phase...</option>
                            {plan?.phases?.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Block Name</label>
                            <input className={INPUT} placeholder="e.g. Block 1" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className={LABEL}>Label / Focus</label>
                            <input className={INPUT} placeholder="e.g. Hypertrophy" value={label} onChange={e => setLabel(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className={LABEL}>Block Type</label>
                        <select className={INPUT} value={blockType} onChange={e => setBlockType(e.target.value)}>
                            {BLOCK_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
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
                        <label className={LABEL}>Goals</label>
                        <textarea className={`${INPUT} resize-none`} rows={3} placeholder="Block goals and objectives..." value={goals} onChange={e => setGoals(e.target.value)} />
                    </div>

                    <div>
                        <label className={LABEL}>Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {BLOCK_COLOR_PRESETS.map(c => (
                                <button key={c} onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                    {isEditing ? (
                        <button onClick={() => handleDeletePlanBlock(phaseId, editingPlanBlock.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                        <button onClick={handleSubmit} disabled={!name.trim() || !startDate || !phaseId}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40">
                            {isEditing ? 'Update' : 'Add Block'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
