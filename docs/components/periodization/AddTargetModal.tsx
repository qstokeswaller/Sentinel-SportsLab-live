// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Trash2 } from 'lucide-react';
import { METRIC_CATALOGUE } from '../../utils/periodizationUtils';
import { CustomSelect } from '../ui/CustomSelect';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] text-sm text-slate-800 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1';

const OPERATOR_OPTIONS = [
    { value: '>=',         label: '≥  Greater than or equal' },
    { value: '<=',         label: '≤  Less than or equal' },
    { value: '=',          label: '=  Equal to' },
    { value: 'between',    label: '↔  Between (range)' },
    { value: 'qualitative',label: '✎  Qualitative (text)' },
];

const STATUS_OPTIONS  = ['pending', 'on_track', 'at_risk', 'off_track'];
const PRIORITY_OPTIONS = ['high', 'medium', 'low'];
const STATUS_LABELS   = { pending: 'Pending', on_track: 'On Track', at_risk: 'At Risk', off_track: 'Off Track' };
const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

export const AddTargetModal = () => {
    const {
        isPlanTargetModalOpen, setIsPlanTargetModalOpen,
        editingPlanTarget,     setEditingPlanTarget,
        handleAddPlanTarget,   handleUpdatePlanTarget, handleDeletePlanTarget,
        activePlanId,          periodizationPlans,
    } = useAppState();

    const plan = periodizationPlans.find(p => p.id === activePlanId);

    const [scope,          setScope]          = useState('phase');
    const [phaseId,        setPhaseId]        = useState('');
    const [blockId,        setBlockId]        = useState('');
    const [category,       setCategory]       = useState('performance');
    const [metricKey,      setMetricKey]      = useState('');
    const [operator,       setOperator]       = useState('>=');
    const [targetValue,    setTargetValue]    = useState('');
    const [targetValueMax, setTargetValueMax] = useState('');
    const [currentValue,   setCurrentValue]   = useState('');
    const [priority,       setPriority]       = useState('medium');
    const [status,         setStatus]         = useState('pending');
    const [notes,          setNotes]          = useState('');

    const isEditing = !!(editingPlanTarget?.id);
    const catDef    = METRIC_CATALOGUE[category];
    const metricDef = catDef?.metrics.find(m => m.key === metricKey);
    const phaseBlocks = plan?.phases.find(ph => ph.id === phaseId)?.blocks || [];

    useEffect(() => {
        if (!isPlanTargetModalOpen) return;
        if (editingPlanTarget?.id) {
            const t = editingPlanTarget;
            setScope(t.scope || 'phase');
            setPhaseId(t.phaseId || '');
            setBlockId(t.blockId || '');
            setCategory(t.category || 'performance');
            setMetricKey(t.metricKey || '');
            setOperator(t.operator || '>=');
            setTargetValue(t.targetValue || '');
            setTargetValueMax(t.targetValueMax || '');
            setCurrentValue(t.currentValue || '');
            setPriority(t.priority || 'medium');
            setStatus(t.status || 'pending');
            setNotes(t.notes || '');
        } else {
            const firstPhaseId = editingPlanTarget?._phaseId || plan?.phases?.[0]?.id || '';
            const firstMetric  = METRIC_CATALOGUE.performance.metrics[0];
            setScope('phase');
            setPhaseId(firstPhaseId);
            setBlockId('');
            setCategory('performance');
            setMetricKey(firstMetric?.key || '');
            setOperator(firstMetric?.defaultOp || '>=');
            setTargetValue('');
            setTargetValueMax('');
            setCurrentValue('');
            setPriority('medium');
            setStatus('pending');
            setNotes('');
        }
    }, [editingPlanTarget, isPlanTargetModalOpen]);

    // When category changes on a NEW target, reset to first metric + its default operator.
    // Guard with isEditing so opening an edit target doesn't clobber the saved metric.
    const prevCategory = React.useRef(category);
    useEffect(() => {
        if (!isPlanTargetModalOpen) return;
        if (prevCategory.current === category) return;
        prevCategory.current = category;
        if (isEditing) return;
        const first = METRIC_CATALOGUE[category]?.metrics[0];
        if (first) { setMetricKey(first.key); setOperator(first.defaultOp); }
    }, [category, isPlanTargetModalOpen, isEditing]);

    // When metric changes (on new targets) update default operator
    useEffect(() => {
        if (!isPlanTargetModalOpen || isEditing) return;
        const m = METRIC_CATALOGUE[category]?.metrics.find(m => m.key === metricKey);
        if (m) setOperator(m.defaultOp);
    }, [metricKey]);

    if (!isPlanTargetModalOpen) return null;

    const canSubmit = metricKey && targetValue.trim() && (scope === 'plan' || phaseId);

    const handleSubmit = () => {
        if (!canSubmit) return;
        const m = catDef?.metrics.find(m => m.key === metricKey);
        const data = {
            category,
            metricKey,
            metricLabel:  m?.label || metricKey,
            metricUnit:   m?.unit  || '',
            metricSource: catDef?.source || '',
            operator,
            targetValue:    targetValue.trim(),
            targetValueMax: operator === 'between' ? (targetValueMax.trim() || undefined) : undefined,
            currentValue:   currentValue.trim() || undefined,
            scope,
            phaseId: scope !== 'plan' ? phaseId || undefined : undefined,
            blockId: scope === 'block' ? (blockId || undefined) : undefined,
            priority,
            status,
            notes: notes.trim() || undefined,
        };
        if (isEditing) {
            handleUpdatePlanTarget(editingPlanTarget.id, data);
        } else {
            handleAddPlanTarget(data);
        }
    };

    const handleClose = () => {
        setIsPlanTargetModalOpen(false);
        setEditingPlanTarget(null);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">
                        {isEditing ? 'Edit Target' : 'Add Target'}
                    </h3>
                    <button onClick={handleClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
                        <X size={14} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto">

                    {/* ── Scope ──────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>Scope</label>
                        <div className="flex gap-2">
                            {[
                                { v: 'plan',  l: 'Plan-wide' },
                                { v: 'phase', l: 'Phase' },
                                { v: 'block', l: 'Block' },
                            ].map(({ v, l }) => (
                                <button key={v} type="button"
                                    onClick={() => setScope(v)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                        scope === v
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-indigo-300'
                                    }`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Phase / Block pickers ───────────────────────────── */}
                    {scope !== 'plan' && (
                        <div className={scope === 'block' ? 'grid grid-cols-2 gap-3' : ''}>
                            <div>
                                <label className={LABEL}>Phase</label>
                                <CustomSelect value={phaseId} onChange={e => { setPhaseId(e.target.value); setBlockId(''); }} variant="form">
                                    <option value="">Select phase…</option>
                                    {plan?.phases?.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                                </CustomSelect>
                            </div>
                            {scope === 'block' && phaseId && (
                                <div>
                                    <label className={LABEL}>Block <span className="normal-case text-slate-400 dark:text-[#CBD5E1]">(optional)</span></label>
                                    <CustomSelect value={blockId} onChange={e => setBlockId(e.target.value)} variant="form">
                                        <option value="">All blocks (phase-level)</option>
                                        {phaseBlocks.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}{b.label ? ` · ${b.label}` : ''}</option>
                                        ))}
                                    </CustomSelect>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Category ────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>Category</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {Object.entries(METRIC_CATALOGUE).map(([key, def]) => (
                                <button key={key} type="button" onClick={() => setCategory(key)}
                                    className={`py-1.5 px-2 rounded-lg text-[8px] font-bold border transition-all text-center leading-tight ${
                                        category === key
                                            ? 'text-white border-transparent'
                                            : 'text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-current'
                                    }`}
                                    style={category === key ? { backgroundColor: def.color, borderColor: def.color } : {}}>
                                    {def.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Metric ──────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>Metric</label>
                        <CustomSelect value={metricKey} onChange={e => setMetricKey(e.target.value)} variant="form">
                            {catDef?.metrics.map(m => (
                                <option key={m.key} value={m.key}>
                                    {m.label}{m.unit ? ` (${m.unit})` : ''}
                                </option>
                            ))}
                        </CustomSelect>
                        {catDef && (
                            <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-1">
                                Source: <span className="font-semibold">{catDef.source}</span>
                            </p>
                        )}
                    </div>

                    {/* ── Operator + target value ──────────────────────────── */}
                    <div>
                        <label className={LABEL}>Target</label>
                        <div className={`grid gap-2 ${operator === 'between' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                            <CustomSelect value={operator} onChange={e => setOperator(e.target.value)} variant="form">
                                {OPERATOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </CustomSelect>
                            <input
                                className={INPUT}
                                placeholder={operator === 'qualitative'
                                    ? 'e.g. Moderate'
                                    : `Value${metricDef?.unit ? ` (${metricDef.unit})` : ''}`
                                }
                                value={targetValue}
                                onChange={e => setTargetValue(e.target.value)}
                            />
                            {operator === 'between' && (
                                <input
                                    className={INPUT}
                                    placeholder={`Max${metricDef?.unit ? ` (${metricDef.unit})` : ''}`}
                                    value={targetValueMax}
                                    onChange={e => setTargetValueMax(e.target.value)}
                                />
                            )}
                        </div>
                        {operator === 'between' && (
                            <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-1">
                                Useful for ACWR (e.g. 0.8 — 1.3), BMI ranges, and load windows.
                            </p>
                        )}
                    </div>

                    {/* ── Current value ───────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>
                            Current Value
                            <span className="normal-case font-normal text-slate-400 dark:text-[#CBD5E1] ml-1">(optional — enables progress tracking)</span>
                        </label>
                        <input
                            className={INPUT}
                            placeholder={`e.g. ${metricDef?.unit === 's' ? '4.12' : metricDef?.unit === '%' ? '72' : '18.4'}${metricDef?.unit ? ' ' + metricDef.unit : ''}`}
                            value={currentValue}
                            onChange={e => setCurrentValue(e.target.value)}
                        />
                    </div>

                    {/* ── Priority + Status ──────────────────────────────── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Priority</label>
                            <CustomSelect value={priority} onChange={e => setPriority(e.target.value)} variant="form">
                                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
                            </CustomSelect>
                        </div>
                        <div>
                            <label className={LABEL}>Status</label>
                            <CustomSelect value={status} onChange={e => setStatus(e.target.value)} variant="form">
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </CustomSelect>
                        </div>
                    </div>

                    {/* ── Notes ───────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>
                            Notes
                            <span className="normal-case font-normal text-slate-400 dark:text-[#CBD5E1] ml-1">(optional)</span>
                        </label>
                        <textarea className={`${INPUT} resize-none`} rows={2}
                            placeholder="Testing protocol, rationale, context…"
                            value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/30">
                    {isEditing ? (
                        <button
                            onClick={() => { handleDeletePlanTarget(editingPlanTarget.id); handleClose(); }}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={!canSubmit}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40 transition-colors">
                            {isEditing ? 'Update Target' : 'Add Target'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
