// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Users, User, CalendarDays, LayoutGrid, GanttChart, Plus, Minus } from 'lucide-react';
import { DEFAULT_MODALITY_PRESETS } from '../../utils/periodizationUtils';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1';

export const CreatePlanModal = () => {
    const { isCreatePlanModalOpen, setIsCreatePlanModalOpen, handleCreatePlan, teams } = useAppState();

    const [name, setName] = useState('');
    const [targetType, setTargetType] = useState('Team');
    const [targetId, setTargetId] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [viewMode, setViewMode] = useState('timeline');
    const [modalities, setModalities] = useState([...DEFAULT_MODALITY_PRESETS]);
    const [newModality, setNewModality] = useState('');

    if (!isCreatePlanModalOpen) return null;

    const allAthletes = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name })));

    const handleSubmit = () => {
        if (!name.trim()) return;
        handleCreatePlan({
            name: name.trim(),
            targetType,
            targetId,
            startDate,
            endDate: endDate || undefined,
            viewMode,
            modalities,
        });
        // Reset
        setName('');
        setTargetType('Team');
        setTargetId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setViewMode('timeline');
        setModalities([...DEFAULT_MODALITY_PRESETS]);
    };

    const addModality = () => {
        const m = newModality.trim();
        if (m && !modalities.includes(m)) {
            setModalities([...modalities, m]);
            setNewModality('');
        }
    };

    const removeModality = (mod: string) => {
        setModalities(modalities.filter(m => m !== mod));
    };

    const addPreset = (preset: string) => {
        if (!modalities.includes(preset)) {
            setModalities([...modalities, preset]);
        }
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-indigo-500" />
                        <h3 className="text-base font-bold text-slate-900">Create Periodization Plan</h3>
                    </div>
                    <button onClick={() => setIsCreatePlanModalOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Plan Name */}
                    <div>
                        <label className={LABEL}>Plan Name</label>
                        <input className={INPUT} placeholder="e.g. 2026 Season Plan" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    </div>

                    {/* Target Type */}
                    <div>
                        <label className={LABEL}>Target</label>
                        <div className="flex gap-2 mb-2">
                            {['Team', 'Individual'].map(t => (
                                <button key={t} onClick={() => { setTargetType(t); setTargetId(''); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${targetType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}>
                                    {t === 'Team' ? <Users size={13} /> : <User size={13} />}
                                    {t}
                                </button>
                            ))}
                        </div>
                        <select className={INPUT} value={targetId} onChange={e => setTargetId(e.target.value)}>
                            <option value="">Select {targetType === 'Team' ? 'a team' : 'an athlete'}...</option>
                            {targetType === 'Team'
                                ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                : allAthletes.map(a => <option key={a.id} value={a.id}>{a.name} ({a.teamName})</option>)
                            }
                        </select>
                    </div>

                    {/* Dates */}
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

                    {/* View Mode */}
                    <div>
                        <label className={LABEL}>View Mode</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setViewMode('timeline')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${viewMode === 'timeline' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                <GanttChart size={24} className={viewMode === 'timeline' ? 'text-indigo-600' : 'text-slate-400'} />
                                <div className="text-center">
                                    <p className={`text-xs font-bold ${viewMode === 'timeline' ? 'text-indigo-700' : 'text-slate-700'}`}>Timeline View</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Gantt chart with drill-down</p>
                                </div>
                            </button>
                            <button onClick={() => setViewMode('cards')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${viewMode === 'cards' ? 'border-indigo-500 bg-indigo-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                                <LayoutGrid size={24} className={viewMode === 'cards' ? 'text-indigo-600' : 'text-slate-400'} />
                                <div className="text-center">
                                    <p className={`text-xs font-bold ${viewMode === 'cards' ? 'text-indigo-700' : 'text-slate-700'}`}>Card View</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">Card-based drill-down</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Modalities */}
                    <div>
                        <label className={LABEL}>Training Modalities</label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {modalities.map(mod => (
                                <span key={mod} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200">
                                    {mod}
                                    <button onClick={() => removeModality(mod)} className="hover:text-red-500 transition-colors">
                                        <X size={10} />
                                    </button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input className={`${INPUT} flex-1`} placeholder="Add custom modality..." value={newModality}
                                onChange={e => setNewModality(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addModality()} />
                            <button onClick={addModality} className="px-3 py-2 bg-slate-100 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                        {/* Preset quick-add */}
                        <div className="flex flex-wrap gap-1 mt-2">
                            {DEFAULT_MODALITY_PRESETS.filter(p => !modalities.includes(p)).map(preset => (
                                <button key={preset} onClick={() => addPreset(preset)}
                                    className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                                    + {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                    <button onClick={() => setIsCreatePlanModalOpen(false)}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} disabled={!name.trim()}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        Create Plan
                    </button>
                </div>
            </div>
        </div>
    );
};
