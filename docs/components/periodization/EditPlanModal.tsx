import React, { useState } from 'react';
import { XIcon } from 'lucide-react';
import DatePicker from '../ui/DatePicker';
import { addDaysToDate } from '../../utils/periodizationUtils';
import type { PeriodizationPlan, PlanStatus } from '../../types/types';

interface EditPlanModalProps {
    plan: PeriodizationPlan;
    onSave: (updates: Partial<PeriodizationPlan>) => void | Promise<void>;
    onShift: (days: number) => void | Promise<void>;
    onClose: () => void;
}

// Status modes:
//   draft  → manual, static (never auto-changes)
//   auto   → non-draft; badge follows dates (Upcoming → Active → Completed)
//   manual → non-draft; a fixed status you pick that overrides the dates
type StatusMode = 'draft' | 'auto' | 'manual';

const MANUAL_OPTIONS: PlanStatus[] = ['active', 'upcoming', 'completed', 'at_risk'];

export const EditPlanModal: React.FC<EditPlanModalProps> = ({ plan, onSave, onShift, onClose }) => {
    const [name, setName] = useState(plan.name || '');
    const [startDate, setStartDate] = useState(plan.startDate || '');
    const [endDate, setEndDate] = useState(plan.endDate || '');
    const [mode, setMode] = useState<StatusMode>(
        plan.status === 'draft' ? 'draft' : (plan.autoProgress === false ? 'manual' : 'auto')
    );
    const [manualStatus, setManualStatus] = useState<PlanStatus>(
        plan.status && plan.status !== 'draft' ? plan.status : 'active'
    );
    const [shiftDays, setShiftDays] = useState<number>(0);
    const [saving, setSaving] = useState(false);
    const [shifting, setShifting] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        let status: PlanStatus; let autoProgress: boolean;
        if (mode === 'draft')      { status = 'draft';        autoProgress = false; }
        else if (mode === 'auto')  { status = 'active';       autoProgress = true;  }
        else                       { status = manualStatus;   autoProgress = false; }
        try {
            await onSave({ name: name.trim(), startDate, endDate: endDate || undefined, status, autoProgress });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    const applyShift = async () => {
        if (!shiftDays || shifting) return;
        setShifting(true);
        try {
            await onShift(shiftDays);
            // Keep the modal's date fields in sync so a later Save doesn't undo the shift.
            setStartDate(sd => (sd ? addDaysToDate(sd, shiftDays) : sd));
            setEndDate(ed => (ed ? addDaysToDate(ed, shiftDays) : ed));
            setShiftDays(0);
        } finally {
            setShifting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-md max-h-[88vh] overflow-y-auto p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Edit Plan</h3>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block">Plan Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                    />
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block">Start Date</label>
                        <DatePicker value={startDate} onChange={e => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block">End Date</label>
                        <DatePicker value={endDate} onChange={e => setEndDate(e.target.value)} />
                    </div>
                </div>

                {/* Status */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block">Status</label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {([['draft', 'Draft'], ['auto', 'Auto (dates)'], ['manual', 'Manual']] as const).map(([m, label]) => (
                            <button key={m} type="button" onClick={() => setMode(m)}
                                className={`px-2 py-2 rounded-lg border text-[11px] font-semibold transition-all ${mode === m ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-[#364E6E]'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    {mode === 'draft' && (
                        <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Stays a draft until you activate it — dates never change the badge.</p>
                    )}
                    {mode === 'auto' && (
                        <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Badge follows the dates automatically: Upcoming → Active → Completed.</p>
                    )}
                    {mode === 'manual' && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {MANUAL_OPTIONS.map(s => (
                                <button key={s} type="button" onClick={() => setManualStatus(s)}
                                    className={`px-2.5 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide transition-all ${manualStatus === s ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1]'}`}>
                                    {s.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Shift entire plan */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-[#1A2D48]">
                    <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block">Shift entire plan</label>
                    <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Moves the plan and every phase, block, week &amp; session by this many days (negative = earlier). Applies immediately.</p>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={shiftDays}
                            onChange={e => setShiftDays(parseInt(e.target.value, 10) || 0)}
                            className="w-24 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400"
                        />
                        <span className="text-xs text-slate-400 dark:text-[#CBD5E1]">days</span>
                        <button
                            type="button"
                            onClick={applyShift}
                            disabled={!shiftDays || shifting}
                            className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] text-xs font-semibold hover:bg-slate-200 dark:hover:bg-[#243A58] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {shifting ? 'Shifting…' : 'Apply shift'}
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#243A58] text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-all">Cancel</button>
                    <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all">{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
            </div>
        </div>
    );
};

export default EditPlanModal;
