// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { CalendarDays, Users, User, Clock, Layers, Plus, X, Trophy, Target } from 'lucide-react';
import { formatDateShort } from '../../utils/periodizationUtils';
import { DEFAULT_MODALITY_PRESETS } from '../../utils/periodizationUtils';

const STATUS_STYLES = {
    active:   'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40',
    draft:    'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58]',
    upcoming: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    at_risk:  'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40',
};
const STATUS_LABELS = { active: 'Active', draft: 'Draft', upcoming: 'Upcoming', at_risk: 'At Risk' };

export const OverviewTab = ({ plan, teams, onSwitchToTab }) => {
    const { handleUpdatePlan, setIsPlanPhaseModalOpen, setEditingPlanPhase } = useAppState();
    const [newModality, setNewModality] = useState('');
    const [editingModalities, setEditingModalities] = useState(false);

    const totalPeriods    = plan.phases.reduce((s, ph) => s + ph.blocks.length, 0);
    const totalWeeks      = plan.phases.reduce((s, ph) => ph.blocks.reduce((bs, b) => bs + (b.weeks || []).length, s), 0);
    const competitionCount = plan.events.filter(e => e.type === 'competition').length;
    const totalEvents     = plan.events.length;

    const getTargetName = () => {
        if (plan.targetType === 'Team') return teams.find(t => t.id === plan.targetId)?.name || 'Unknown Team';
        return teams.flatMap(t => t.players || []).find(p => p.id === plan.targetId)?.name || 'Unknown Athlete';
    };

    const addModality = (preset) => {
        const m = (preset || newModality).trim();
        if (!m) return;
        const current = plan.modalities || [];
        if (current.includes(m)) return;
        handleUpdatePlan(plan.id, { modalities: [...current, m] });
        if (!preset) setNewModality('');
    };

    const removeModality = (mod) => {
        handleUpdatePlan(plan.id, { modalities: (plan.modalities || []).filter(m => m !== mod) });
    };

    const STATS = [
        { label: 'Phases',   value: plan.phases.length },
        { label: 'Periods',  value: totalPeriods },
        { label: 'Wk Planned', value: totalWeeks },
        { label: 'Fixtures', value: competitionCount },
    ];

    return (
        <div className="space-y-4">
            {/* Plan info + stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Info */}
                <div className="md:col-span-2 bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-[#E2E8F0]">{plan.name}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                {plan.targetType === 'Team' ? <Users size={12} className="text-slate-400" /> : <User size={12} className="text-slate-400" />}
                                <span className="text-xs text-slate-500 dark:text-[#94A3B8]">{getTargetName()}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase border ${plan.targetType === 'Team' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800/40' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-800/40'}`}>
                                    {plan.targetType}
                                </span>
                            </div>
                        </div>
                        {plan.status && (
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide border ${STATUS_STYLES[plan.status] || STATUS_STYLES.draft}`}>
                                {STATUS_LABELS[plan.status] || plan.status}
                            </span>
                        )}
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-[#243A58]">
                        {STATS.map(({ label, value }) => (
                            <div key={label}>
                                <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wide mb-0.5">{label}</p>
                                <p className="text-2xl font-bold text-slate-800 dark:text-[#E2E8F0]">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Date + created */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-[#243A58]">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                            <CalendarDays size={12} />
                            <span>{formatDateShort(plan.startDate)}{plan.endDate ? ` — ${formatDateShort(plan.endDate)}` : ' — Open-ended'}</span>
                        </div>
                        {plan.createdAt && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#64748B]">
                                <Clock size={12} />
                                <span>Created {formatDateShort(plan.createdAt.split('T')[0])}</span>
                            </div>
                        )}
                        {totalEvents > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-[#64748B]">
                                <Trophy size={12} />
                                <span>{totalEvents} event{totalEvents !== 1 ? 's' : ''}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modalities */}
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Layers size={14} className="text-slate-400" />
                            <span className="text-xs font-semibold text-slate-600 dark:text-[#CBD5E1]">Training Modalities</span>
                        </div>
                        <button onClick={() => setEditingModalities(v => !v)}
                            className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                            {editingModalities ? 'Done' : 'Edit'}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
                        {(plan.modalities || []).length === 0 && (
                            <span className="text-[10px] text-slate-400 dark:text-[#64748B] italic">No modalities set</span>
                        )}
                        {(plan.modalities || []).map(mod => (
                            <span key={mod} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1A2D48] text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] border border-slate-200 dark:border-[#243A58]">
                                {mod}
                                {editingModalities && (
                                    <button onClick={() => removeModality(mod)} className="hover:text-red-500 transition-colors"><X size={9} /></button>
                                )}
                            </span>
                        ))}
                    </div>

                    {editingModalities && (
                        <>
                            <div className="flex gap-1.5 mb-2">
                                <input
                                    className="flex-1 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0]"
                                    placeholder="Add modality..."
                                    value={newModality}
                                    onChange={e => setNewModality(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addModality()}
                                />
                                <button onClick={() => addModality()} className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium">Add</button>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {DEFAULT_MODALITY_PRESETS.filter(p => !(plan.modalities || []).includes(p)).map(preset => (
                                    <button key={preset} onClick={() => addModality(preset)}
                                        className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-[#243A58] text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-colors">
                                        + {preset}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Phases summary */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-[#243A58]">
                    <h4 className="text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide">Phases</h4>
                    <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors">
                        <Plus size={11} /> Add Phase
                    </button>
                </div>

                {plan.phases.length === 0 ? (
                    <div className="p-10 text-center">
                        <Target size={28} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-500 dark:text-[#94A3B8] mb-1">No phases yet</p>
                        <p className="text-xs text-slate-400 dark:text-[#64748B] mb-4">Add your first phase to begin structuring the plan.</p>
                        <button onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                            + Add First Phase
                        </button>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-[#243A58]">
                        {plan.phases.map(phase => (
                            <div key={phase.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors group">
                                <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: phase.color }} />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{phase.name}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-[#64748B]">
                                        {formatDateShort(phase.startDate)}{phase.endDate ? ` — ${formatDateShort(phase.endDate)}` : ''}
                                        {' · '}{phase.blocks.length} period{phase.blocks.length !== 1 ? 's' : ''}
                                        {phase.blocks.length > 0 && ' · ' + phase.blocks.reduce((s, b) => s + (b.weeks || []).length, 0) + ' weeks'}
                                    </p>
                                </div>
                                <button onClick={() => onSwitchToTab('periods')}
                                    className="text-[10px] font-semibold text-indigo-500 opacity-0 group-hover:opacity-100 transition-all hover:text-indigo-700">
                                    View Periods →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
