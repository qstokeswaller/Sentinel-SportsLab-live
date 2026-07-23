import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { BLOCK_COLOR_PRESETS, formatDateShort } from '../../utils/periodizationUtils';
import { CustomSelect } from '../ui/CustomSelect';
import DatePicker from '../../components/ui/DatePicker';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] text-sm text-slate-800 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1';

const BLOCK_TYPES   = ['Low Intensity', 'Medium Intensity', 'Maximal Load', 'Anthropometrics', 'General', 'Recovery'];
const CUSTOM_SENTINEL = '__custom__';
const LEVEL_OPTIONS = ['Low', 'Moderate', 'High', 'Very High'];

export const AddBlockModal = () => {
    const {
        isPlanBlockModalOpenNew, setIsPlanBlockModalOpenNew,
        editingPlanBlock, setEditingPlanBlock,
        handleAddPlanBlock, handleUpdatePlanBlock, handleDeletePlanBlock,
        activePlanId, periodizationPlans,
    } = useAppState();

    const plan = periodizationPlans.find(p => p.id === activePlanId);

    const [name,              setName]              = useState('');
    const [label,             setLabel]             = useState('');
    const [blockType,         setBlockType]         = useState('General');
    const [customTypeInput,   setCustomTypeInput]   = useState('');
    const [goals,             setGoals]             = useState('');
    const [startDate,         setStartDate]         = useState('');
    const [endDate,           setEndDate]           = useState('');
    const [color,             setColor]             = useState(BLOCK_COLOR_PRESETS[0]);
    const [phaseId,           setPhaseId]           = useState('');
    const [intensityLevel,    setIntensityLevel]    = useState('Moderate');
    const [volumeLevel,       setVolumeLevel]       = useState('Moderate');
    const [modalityLevels,    setModalityLevels]    = useState({});
    const [customModInput,    setCustomModInput]    = useState('');

    const isCustomType = blockType !== '' && !BLOCK_TYPES.includes(blockType);

    const isEditing = editingPlanBlock?.id && !editingPlanBlock?._phaseId?.startsWith?.('new');

    useEffect(() => {
        if (editingPlanBlock?.id) {
            setName(editingPlanBlock.name || '');
            setLabel(editingPlanBlock.label || '');
            const bt = editingPlanBlock.blockType || 'General';
            const isPreset = BLOCK_TYPES.includes(bt);
            setBlockType(isPreset ? bt : CUSTOM_SENTINEL);
            setCustomTypeInput(isPreset ? '' : bt);
            setGoals(editingPlanBlock.goals || '');
            setStartDate(editingPlanBlock.startDate || '');
            setEndDate(editingPlanBlock.endDate || '');
            setColor(editingPlanBlock.color || BLOCK_COLOR_PRESETS[0]);
            setPhaseId(editingPlanBlock._phaseId || '');
            setIntensityLevel(editingPlanBlock.intensityLevel || 'Moderate');
            setVolumeLevel(editingPlanBlock.volumeLevel || 'Moderate');
            setModalityLevels(editingPlanBlock.modalities || {});
        } else {
            setName('');
            setLabel('');
            setBlockType('General');
            setCustomTypeInput('');
            setGoals('');
            setStartDate('');
            setEndDate('');
            setColor(BLOCK_COLOR_PRESETS[0]);
            setPhaseId(editingPlanBlock?._phaseId || plan?.phases?.[0]?.id || '');
            setIntensityLevel('Moderate');
            setVolumeLevel('Moderate');
            setModalityLevels({});
        }
        setCustomModInput('');
    }, [editingPlanBlock, isPlanBlockModalOpenNew]);

    if (!isPlanBlockModalOpenNew) return null;

    // All modality rows = plan-level modalities + any already set on this block not in plan list
    const planMods    = plan?.modalities || [];
    const blockOnlyMods = Object.keys(modalityLevels).filter(m => !planMods.includes(m));
    const allMods     = [...planMods, ...blockOnlyMods];

    // Non-blocking date sanity checks: reversed range + dates falling outside the
    // assigned phase. Purely advisory — the coach can still save intentionally.
    const selectedPhase = plan?.phases?.find(ph => ph.id === phaseId);
    const dateWarnings = (() => {
        const w: string[] = [];
        if (startDate && endDate && endDate < startDate) {
            w.push('End date is before the start date — this saves as a single-week block.');
        }
        if (selectedPhase?.startDate) {
            const ps = selectedPhase.startDate;
            const pe = selectedPhase.endDate;
            const nm = selectedPhase.name || 'the phase';
            if (startDate && startDate < ps) w.push(`Starts before ${nm} begins (${formatDateShort(ps)}).`);
            if (pe && startDate && startDate > pe) w.push(`Starts after ${nm} ends (${formatDateShort(pe)}).`);
            if (pe && endDate && endDate > pe) w.push(`Ends after ${nm} ends (${formatDateShort(pe)}).`);
            if (!(startDate && endDate && endDate < startDate) && endDate && endDate < ps) {
                w.push(`Ends before ${nm} begins (${formatDateShort(ps)}).`);
            }
        }
        return w;
    })();

    const addCustomMod = () => {
        const val = customModInput.trim();
        if (!val || allMods.includes(val)) { setCustomModInput(''); return; }
        setModalityLevels(prev => ({ ...prev, [val]: '' }));
        setCustomModInput('');
    };

    const removeCustomMod = (mod) => {
        setModalityLevels(prev => {
            const next = { ...prev };
            delete next[mod];
            return next;
        });
    };

    const handleSubmit = () => {
        if (!name.trim() || !startDate || !phaseId) return;
        const resolvedType = blockType === CUSTOM_SENTINEL ? (customTypeInput.trim() || 'General') : blockType;
        const modalities = Object.fromEntries(Object.entries(modalityLevels).filter(([, v]) => v && v !== ''));
        const data = {
            name: name.trim(), label: label.trim(), blockType: resolvedType,
            goals: goals.trim(), startDate, endDate: endDate || undefined,
            color, intensityLevel, volumeLevel, modalities,
        };
        if (isEditing) {
            handleUpdatePlanBlock(phaseId, editingPlanBlock.id, data);
        } else {
            handleAddPlanBlock(phaseId, data);
        }
    };

    const handleClose = () => {
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-md shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">
                        {isEditing ? 'Edit Training Block' : 'Add Training Block'}
                    </h3>
                    <button onClick={handleClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
                        <X size={14} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[68vh] overflow-y-auto">

                    {/* Phase */}
                    <div>
                        <label className={LABEL}>Phase</label>
                        <CustomSelect value={phaseId} onChange={e => setPhaseId(e.target.value)} variant="form">
                            <option value="">Select phase...</option>
                            {plan?.phases?.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
                        </CustomSelect>
                    </div>

                    {/* Block ID + Block Name */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Block ID</label>
                            <input className={INPUT} placeholder="e.g. B1" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className={LABEL}>Block Name</label>
                            <input className={INPUT} placeholder="e.g. Build Up" value={label} onChange={e => setLabel(e.target.value)} />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className={LABEL}>Category</label>
                        <CustomSelect value={blockType} onChange={e => { setBlockType(e.target.value); if (e.target.value !== CUSTOM_SENTINEL) setCustomTypeInput(''); }} variant="form">
                            {BLOCK_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
                            <option value={CUSTOM_SENTINEL}>Custom…</option>
                        </CustomSelect>
                        {blockType === CUSTOM_SENTINEL && (
                            <input
                                className={`${INPUT} mt-1.5`}
                                placeholder="Enter custom category name…"
                                value={customTypeInput}
                                onChange={e => setCustomTypeInput(e.target.value)}
                                autoFocus
                            />
                        )}
                        {isCustomType && blockType !== CUSTOM_SENTINEL && (
                            <p className="text-[9px] text-violet-500 dark:text-violet-400 mt-1">Custom: <span className="font-semibold">{blockType}</span></p>
                        )}
                    </div>

                    {/* Intensity + Volume */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Intensity Level</label>
                            <CustomSelect value={intensityLevel} onChange={e => setIntensityLevel(e.target.value)} variant="form">
                                {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </CustomSelect>
                        </div>
                        <div>
                            <label className={LABEL}>Volume Level</label>
                            <CustomSelect value={volumeLevel} onChange={e => setVolumeLevel(e.target.value)} variant="form">
                                {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </CustomSelect>
                        </div>
                    </div>

                    {/* Dates */}
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

                    {/* Date sanity warnings (non-blocking) */}
                    {dateWarnings.length > 0 && (
                        <div className="flex gap-2 rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/15 px-3 py-2.5">
                            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed space-y-0.5">
                                {dateWarnings.map((msg, i) => <p key={i}>{msg}</p>)}
                                <p className="text-amber-500/80 dark:text-amber-400/70 italic mt-1">You can still save — this is just a heads-up.</p>
                            </div>
                        </div>
                    )}

                    {/* Goals */}
                    <div>
                        <label className={LABEL}>Goals & Objectives <span className="text-slate-400 dark:text-[#CBD5E1] normal-case">(optional)</span></label>
                        <textarea className={`${INPUT} resize-none`} rows={3}
                            placeholder="Block goals and key objectives..."
                            value={goals} onChange={e => setGoals(e.target.value)} />
                    </div>

                    {/* Modality Emphasis */}
                    <div>
                        <label className={LABEL}>
                            Modality Emphasis
                            <span className="text-slate-400 dark:text-[#CBD5E1] normal-case ml-1">(per training type)</span>
                        </label>

                        {allMods.length > 0 ? (
                            <div className="mt-1 space-y-1.5">
                                {allMods.map(mod => {
                                    const isCustom = !planMods.includes(mod);
                                    return (
                                        <div key={mod} className="flex items-center gap-2">
                                            <span className={`text-xs font-medium min-w-0 flex-1 truncate ${isCustom ? 'text-violet-600 dark:text-violet-400' : 'text-slate-600 dark:text-[#CBD5E1]'}`}>
                                                {mod}
                                                {isCustom && <span className="text-[8px] text-violet-400 dark:text-violet-500 ml-1">(custom)</span>}
                                            </span>
                                            <div className="shrink-0 w-32">
                                                <CustomSelect
                                                    value={modalityLevels[mod] || ''}
                                                    onChange={e => setModalityLevels(prev => ({ ...prev, [mod]: e.target.value }))}
                                                    variant="form">
                                                    <option value="">— Not used</option>
                                                    {LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </CustomSelect>
                                            </div>
                                            {isCustom && (
                                                <button type="button" onClick={() => removeCustomMod(mod)}
                                                    className="p-1 text-slate-300 dark:text-[#475569] hover:text-red-400 transition-colors shrink-0">
                                                    <X size={11} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-1 italic">
                                No plan modalities defined yet. Add custom ones below, or define them in the Overview tab.
                            </p>
                        )}

                        {/* Add custom modality */}
                        <div className="flex gap-1.5 mt-2">
                            <input
                                className="flex-1 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-300 bg-white dark:bg-[#0F1C30] text-slate-800 dark:text-[#E2E8F0] placeholder-slate-400"
                                placeholder="Add custom modality…"
                                value={customModInput}
                                onChange={e => setCustomModInput(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomMod(); } }}
                            />
                            <button aria-label="Add custom modality" type="button" onClick={addCustomMod}
                                disabled={!customModInput.trim()}
                                className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40">
                                <Plus size={12} />
                            </button>
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-[#CBD5E1] mt-1">
                            Custom modalities here are for this block only. To share across blocks, add them in the Overview tab.
                        </p>
                    </div>

                    {/* Color */}
                    <div>
                        <label className={LABEL}>Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {BLOCK_COLOR_PRESETS.map(c => (
                                <button key={c} type="button" onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all ${color === c ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }} />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/30">
                    {isEditing ? (
                        <button onClick={() => handleDeletePlanBlock(phaseId, editingPlanBlock.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={!name.trim() || !startDate || !phaseId}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 disabled:opacity-40">
                            {isEditing ? 'Update Block' : 'Add Block'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
