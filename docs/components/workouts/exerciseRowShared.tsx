// @ts-nocheck
// ── Shared exercise-row primitives used by BOTH the Packets builder and the Programs builder. ──
// Keeping these in one place ensures the two pages stay in lock-step for dropdown styling,
// intensity pill UX, and display-options toggles. CustomSelect is the platform dropdown.

import React, { useState } from 'react';
import { CustomSelect } from '../ui/CustomSelect';

// ── Presets ──────────────────────────────────────────────────────────────────

// Sets — common values
export const SETS_PRESETS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '15', '20'];

// Reps — common values + endurance / AMRAP markers
export const REPS_PRESETS = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '15', '20', '25', '30', 'AMRAP', 'Max'];

// Rest — seconds + minute formatting; manual values still accepted
export const REST_PRESETS = ['10s', '15s', '20s', '30s', '45s', '60s', '90s', '2min', '2.5min', '3min', '3.5min', '4min', '5min'];

// Tempo — standard S&C tempo notation
export const TEMPO_PRESETS = ['Iso', 'Slow', 'Med', 'Fast', 'Expl', '2-0-2', '3-1-1', '3-0-1', '4-2-1'];

// Intensity prescription units
export const INTENSITY_UNITS = [
    'kg', 'lb', '%1RM', 'RPE', 'RIR', 'Load',
    '%effort', 'b-wgt', 'min', 'sec', 'km', 'm', 'cm', 'mi', 'yd', 'ft', 'in',
    'rpm', 'm/s', 'watts', 'bpm', 'km/h', 'mph', 'Cal',
];

export const DEFAULT_DISPLAY_FIELDS = ['sets', 'reps', 'rest', 'tempo', 'intensity1', 'intensity2', 'notes'];

export const DISPLAY_FIELD_OPTIONS = [
    { key: 'sets',       label: 'Sets' },
    { key: 'reps',       label: 'Reps' },
    { key: 'rest',       label: 'Rest' },
    { key: 'tempo',      label: 'Tempo' },
    { key: 'intensity1', label: 'Intensity 1' },
    { key: 'intensity2', label: 'Intensity 2' },
    { key: 'intensity3', label: 'Intensity 3' },
    { key: 'notes',      label: 'Notes' },
];

// ── Types ────────────────────────────────────────────────────────────────────

export interface IntensityPill {
    unit: string;   // 'kg', 'lb', '%1RM', 'RPE', 'RIR', etc.
    value: string;  // free-text value
}

// ── PresetSelect — CustomSelect with preset options + "Custom…" → text input ──
// Uses the platform CustomSelect, so visual styling is consistent across the app.

export const PresetSelect: React.FC<{
    value: string;
    onChange: (v: string) => void;
    presets: string[];
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, presets, placeholder = '—', className = '' }) => {
    const [customMode, setCustomMode] = useState(false);
    const isCustom = customMode || (value && !presets.includes(value));
    if (isCustom) {
        return (
            <input
                type="text"
                value={value === '__CUSTOM__' ? '' : value}
                placeholder={placeholder}
                autoFocus={customMode}
                onChange={e => onChange(e.target.value)}
                onBlur={() => setCustomMode(false)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
                className={`w-full bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-2 text-xs font-medium text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400 placeholder:text-slate-300 dark:placeholder:text-[#475569] ${className}`}
            />
        );
    }
    return (
        <CustomSelect
            value={value}
            onChange={(e: any) => {
                if (e.target.value === '__CUSTOM__') {
                    setCustomMode(true);
                    onChange('');
                } else {
                    onChange(e.target.value);
                }
            }}
            variant="form"
            size="sm"
            placeholder={placeholder}
            className={className}
        >
            <option value="">{placeholder}</option>
            {presets.map(p => <option key={p} value={p}>{p}</option>)}
            <option value="__CUSTOM__">Custom…</option>
        </CustomSelect>
    );
};

// ── IntensityPillEditor — split pill (unit CustomSelect + value input + remove) ──

export const IntensityPillEditor: React.FC<{
    pill: IntensityPill;
    onChange: (next: IntensityPill) => void;
    onRemove: () => void;
    canRemove: boolean;
}> = ({ pill, onChange, onRemove, canRemove }) => {
    return (
        <div className="flex items-stretch rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] overflow-hidden">
            <div className="w-20 shrink-0 border-r border-slate-200 dark:border-[#243A58]">
                <CustomSelect
                    value={pill.unit}
                    onChange={(e: any) => onChange({ ...pill, unit: e.target.value })}
                    variant="form"
                    size="xs"
                    placeholder="unit"
                >
                    {INTENSITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </CustomSelect>
            </div>
            <input
                type="text"
                value={pill.value}
                onChange={e => onChange({ ...pill, value: e.target.value })}
                placeholder="—"
                className="flex-1 min-w-0 bg-transparent px-2 py-2 text-xs font-medium text-slate-900 dark:text-[#E2E8F0] outline-none placeholder:text-slate-300 dark:placeholder:text-[#475569]"
            />
            {canRemove && (
                <button
                    onClick={onRemove}
                    className="shrink-0 px-1.5 text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors"
                    title="Remove">
                    <span className="text-[14px] leading-none">×</span>
                </button>
            )}
        </div>
    );
};

// ── DisplayOptionsModal — per-row column toggle checkboxes ──────────────────

export const DisplayOptionsModal: React.FC<{
    row: { displayFields?: string[]; exerciseName: string };
    onSave: (fields: string[]) => void;
    onClose: () => void;
}> = ({ row, onSave, onClose }) => {
    const [selected, setSelected] = useState<string[]>(
        Array.isArray(row.displayFields) ? row.displayFields : DEFAULT_DISPLAY_FIELDS
    );
    const toggle = (k: string) => setSelected(prev =>
        prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
    );
    return (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-[#1A2D48] rounded-xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Display Options</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-[#CBD5E1] dark:hover:text-[#E2E8F0]">
                        <span style={{ fontSize: '16px', lineHeight: 1 }}>×</span>
                    </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mb-3 truncate">For: <strong>{row.exerciseName}</strong></p>
                <div className="space-y-1.5 mb-4">
                    {DISPLAY_FIELD_OPTIONS.map(opt => (
                        <label key={opt.key} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-[#243A58] cursor-pointer">
                            <input
                                type="checkbox"
                                checked={selected.includes(opt.key)}
                                onChange={() => toggle(opt.key)}
                                className="accent-indigo-600"
                            />
                            <span className="text-xs text-slate-700 dark:text-[#E2E8F0]">{opt.label}</span>
                        </label>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setSelected(DEFAULT_DISPLAY_FIELDS); }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#243A58] rounded-md transition-colors">
                        Reset defaults
                    </button>
                    <button
                        onClick={() => { onSave(selected); onClose(); }}
                        className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-md transition-colors">
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Default intensity pills for a brand-new row (kg + RPE) ───────────────────
export const DEFAULT_INTENSITIES: IntensityPill[] = [
    { unit: 'kg', value: '' },
    { unit: 'RPE', value: '' },
];

// ── Section presets — VCP-style colored bars coaches insert into builders ────

export const SECTION_PRESETS: { name: string; color: string }[] = [
    { name: 'Warm-Up',     color: '#f59e0b' },  // amber
    { name: 'Activation',  color: '#eab308' },  // yellow
    { name: 'Main',        color: '#6366f1' },  // indigo
    { name: 'Strength',    color: '#6366f1' },  // indigo
    { name: 'Power',       color: '#f97316' },  // orange
    { name: 'Speed',       color: '#f97316' },  // orange
    { name: 'Conditioning',color: '#10b981' },  // emerald
    { name: 'Cool-Down',   color: '#0ea5e9' },  // sky
    { name: 'Mobility',    color: '#14b8a6' },  // teal
    { name: 'Recovery',    color: '#14b8a6' },  // teal
];

// Default section layout for new builders (matches the legacy warmup/workout/cooldown DB enum)
export const DEFAULT_SECTION_META: Record<string, { label: string; color: string }> = {
    warmup:   { label: 'Warm-Up',   color: '#f59e0b' },
    workout:  { label: 'Main',      color: '#6366f1' },
    cooldown: { label: 'Cool-Down', color: '#0ea5e9' },
};
export const DEFAULT_SECTION_ORDER = ['warmup', 'workout', 'cooldown'];
export const isDefaultSection = (sec: string) =>
    sec === 'warmup' || sec === 'workout' || sec === 'cooldown';

// ── AddSectionPopover — preset picker + custom name/color input ──────────────

export const AddSectionPopover: React.FC<{
    onSelect: (name: string, color: string) => void;
    onClose: () => void;
}> = ({ onSelect, onClose }) => {
    const [customName, setCustomName] = useState('');
    const [customColor, setCustomColor] = useState('#6366f1');
    const COLOR_SWATCHES = ['#f59e0b', '#eab308', '#6366f1', '#f97316', '#10b981', '#0ea5e9', '#14b8a6', '#ec4899', '#8b5cf6', '#ef4444'];

    return (
        <div className="absolute z-30 top-12 right-2 w-72 bg-white dark:bg-[#1A2D48] rounded-xl shadow-2xl border border-slate-200 dark:border-[#243A58] p-3">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 dark:text-[#E2E8F0]">Add Section</span>
                <button onClick={onClose} className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#243A58] text-slate-400 dark:text-[#CBD5E1]">
                    <span style={{ fontSize: '14px', lineHeight: 1 }}>×</span>
                </button>
            </div>
            <p className="text-[9px] text-slate-500 dark:text-[#CBD5E1] mb-2">Pick a preset or define custom</p>
            <div className="grid grid-cols-2 gap-1 mb-3">
                {SECTION_PRESETS.map(preset => (
                    <button
                        key={preset.name}
                        onClick={() => onSelect(preset.name, preset.color)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#243A58] transition-colors border border-slate-100 dark:border-[#243A58]"
                        style={{ backgroundColor: `${preset.color}10` }}>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: preset.color }} />
                        {preset.name}
                    </button>
                ))}
            </div>
            <div className="border-t border-slate-100 dark:border-[#243A58] pt-2">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1] mb-1.5">Custom</p>
                <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Section name..."
                    className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] rounded-md px-2 py-1.5 text-[11px] outline-none focus:border-indigo-400"
                />
                <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {COLOR_SWATCHES.map(c => (
                        <button
                            key={c}
                            onClick={() => setCustomColor(c)}
                            className={`w-5 h-5 rounded-full border-2 ${customColor === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                            title={c}
                        />
                    ))}
                </div>
                <button
                    onClick={() => onSelect(customName, customColor)}
                    disabled={!customName.trim()}
                    className="mt-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-semibold rounded-md transition-colors">
                    Add Custom Section
                </button>
            </div>
        </div>
    );
};
