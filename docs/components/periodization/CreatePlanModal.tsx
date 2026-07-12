import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Users, User, CalendarDays, Plus } from 'lucide-react';
import { DEFAULT_MODALITY_PRESETS } from '../../utils/periodizationUtils';
import { CustomSelect } from '../ui/CustomSelect';
import DatePicker from '../../components/ui/DatePicker';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] text-sm text-slate-800 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1';

const STATUS_OPTIONS = [
    { key: 'draft',    label: 'Draft',    cls: 'border-slate-300 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] bg-slate-50 dark:bg-[#1A2D48]' },
    { key: 'upcoming', label: 'Upcoming', cls: 'border-blue-300 dark:border-blue-500/40 text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/15' },
    { key: 'active',   label: 'Active',   cls: 'border-green-300 dark:border-green-500/40 text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-500/15' },
    { key: 'at_risk',  label: 'At Risk',  cls: 'border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-500/15' },
];

export const CreatePlanModal = () => {
    const { isCreatePlanModalOpen, setIsCreatePlanModalOpen, handleCreatePlan, teams } = useAppState();

    const [name, setName] = useState('');
    const [targetType, setTargetType] = useState('Team');
    const [targetId, setTargetId] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [status, setStatus] = useState('draft');
    const [modalities, setModalities] = useState([...DEFAULT_MODALITY_PRESETS]);
    const [newModality, setNewModality] = useState('');

    if (!isCreatePlanModalOpen) return null;

    const allAthletes = teams.flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name })));

    const handleSubmit = () => {
        if (!name.trim()) return;
        handleCreatePlan({ name: name.trim(), targetType, targetId, startDate, endDate: endDate || undefined, status, modalities });
        setName(''); setTargetType('Team'); setTargetId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate(''); setStatus('draft'); setModalities([...DEFAULT_MODALITY_PRESETS]);
    };

    const addModality = () => {
        const m = newModality.trim();
        if (m && !modalities.includes(m)) { setModalities([...modalities, m]); setNewModality(''); }
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
                    <div className="flex items-center gap-2">
                        <CalendarDays size={18} className="text-indigo-500" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">Create Periodization Plan</h3>
                    </div>
                    <button onClick={() => setIsCreatePlanModalOpen(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[72vh] overflow-y-auto">
                    {/* Plan Name */}
                    <div>
                        <label className={LABEL}>Plan Name</label>
                        <input className={INPUT} placeholder="e.g. 2026/27 Season Plan" value={name} onChange={e => setName(e.target.value)} autoFocus />
                    </div>

                    {/* Status */}
                    <div>
                        <label className={LABEL}>Status</label>
                        <div className="grid grid-cols-4 gap-2">
                            {STATUS_OPTIONS.map(opt => (
                                <button key={opt.key} onClick={() => setStatus(opt.key)}
                                    className={`px-2 py-1.5 rounded-lg border-2 text-[11px] font-semibold transition-all ${status === opt.key ? opt.cls + ' border-current' : 'border-slate-200 dark:border-[#243A58] text-slate-400 dark:text-[#CBD5E1] bg-white dark:bg-[#132338]'}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target */}
                    <div>
                        <label className={LABEL}>Target</label>
                        <div className="flex gap-2 mb-2">
                            {['Team', 'Individual'].map(t => (
                                <button key={t} onClick={() => { setTargetType(t); setTargetId(''); }}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all border ${targetType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-[#132338] text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-indigo-300'}`}>
                                    {t === 'Team' ? <Users size={13} /> : <User size={13} />} {t}
                                </button>
                            ))}
                        </div>
                        <CustomSelect value={targetId} onChange={e => setTargetId(e.target.value)} variant="form" placeholder={`Select ${targetType === 'Team' ? 'a team' : 'an athlete'}...`}>
                            <option value="">Select {targetType === 'Team' ? 'a team' : 'an athlete'}...</option>
                            {targetType === 'Team'
                                ? teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                : allAthletes.map(a => <option key={a.id} value={a.id}>{a.name} ({a.teamName})</option>)
                            }
                        </CustomSelect>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Start Date</label>
                            <DatePicker value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div>
                            <label className={LABEL}>End Date <span className="text-slate-400 normal-case">(optional)</span></label>
                            <DatePicker value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    {/* Modalities */}
                    <div>
                        <label className={LABEL}>Training Modalities</label>
                        <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                            {modalities.map(mod => (
                                <span key={mod} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1A2D48] text-xs font-medium text-slate-700 dark:text-[#E2E8F0] border border-slate-200 dark:border-[#243A58]">
                                    {mod}
                                    <button onClick={() => setModalities(modalities.filter(m => m !== mod))} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input className={`${INPUT} flex-1`} placeholder="Add modality..." value={newModality}
                                onChange={e => setNewModality(e.target.value)} onKeyDown={e => e.key === 'Enter' && addModality()} />
                            <button aria-label="Add modality" onClick={addModality} className="px-3 py-2 bg-slate-100 dark:bg-[#1A2D48] rounded-lg text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#243A58] transition-colors">
                                <Plus size={14} />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                            {DEFAULT_MODALITY_PRESETS.filter(p => !modalities.includes(p)).map(preset => (
                                <button key={preset} onClick={() => setModalities([...modalities, preset])}
                                    className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-[#243A58] text-slate-400 dark:text-[#94A3B8] hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                                    + {preset}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/30">
                    <button onClick={() => setIsCreatePlanModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] transition-colors">Cancel</button>
                    <button onClick={handleSubmit} disabled={!name.trim()}
                        className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        Create Plan
                    </button>
                </div>
            </div>
        </div>
    );
};
