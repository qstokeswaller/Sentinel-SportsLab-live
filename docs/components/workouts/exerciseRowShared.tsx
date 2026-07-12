// ── Shared exercise-row primitives used by BOTH the Packets builder and the Programs builder. ──
// Keeping these in one place ensures the two pages stay in lock-step for dropdown styling,
// intensity pill UX, and display-options toggles. CustomSelect is the platform dropdown.

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronUpIcon, ChevronDownIcon } from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';

// ═════════════════════════════════════════════════════════════════════════════
// Stepper — up/down arrows on numeric fields.
// Each metric has a sensible step + optional default so coaches can click
// instead of type. Defaults left empty (no defaultStart) mean the field keeps
// the dash until the user types OR clicks the arrow (which then starts from 0
// + step or a nudged null-safe seed).
// ═════════════════════════════════════════════════════════════════════════════

export interface StepperConfig {
    step: number;
    min?: number;
    max?: number;
    /** Decimals to format numeric output. 0 for ints. */
    decimals?: number;
    /** Value to seed with when the field is empty and the arrow is first pressed. */
    defaultStart?: number;
    /** Custom parser — override for rest field ("60s" / "2min" → seconds). */
    parseValue?: (stringValue: string) => number | null;
    /** Custom formatter — override for rest field (60 → "1min", 75 → "75s"). */
    formatValue?: (numericValue: number) => string;
}

// Top-row numeric fields
export const SETS_STEPPER: StepperConfig  = { step: 1, min: 1, max: 30, decimals: 0, defaultStart: 3 };
export const REPS_STEPPER: StepperConfig  = { step: 1, min: 1, max: 100, decimals: 0, defaultStart: 8 };

// Legacy Packet builder stores rest as plain seconds ("60") and its printable
// export adds the "s" suffix at render time. Using REST_STEPPER's formatter
// would double-up the suffix — so callers with raw-seconds storage use this
// simpler variant that never appends a unit.
//
// Parser also accepts minute-format input ("2min", "2.5min") so the popover
// preset picker can offer minute shortcuts that normalise to raw seconds on
// select — keeping the packet's HTML export clean while still giving coaches
// the same "5min" shortcut as the Program builder's rest popover.
export const SIMPLE_REST_STEPPER: StepperConfig = {
    step: 15, min: 0, max: 900, decimals: 0, defaultStart: 60,
    parseValue: (s) => {
        if (s == null) return null;
        const trimmed = String(s).trim().toLowerCase();
        if (!trimmed) return null;
        const minMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*min$/);
        if (minMatch) return Math.round(parseFloat(minMatch[1]) * 60);
        const secMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*s?$/);
        if (secMatch) return Math.round(parseFloat(secMatch[1]));
        return null;
    },
    // No custom formatValue — falls back to default (raw number, no suffix).
};

// Rest is time-formatted. Store as seconds internally but respect existing
// "60s" / "2min" string forms so previously-saved rows don't break.
export const REST_STEPPER: StepperConfig = {
    step: 15, min: 0, max: 900, decimals: 0, defaultStart: 60,
    parseValue: (s) => {
        if (s == null) return null;
        const trimmed = String(s).trim().toLowerCase();
        if (!trimmed) return null;
        // "2min", "2.5min"
        const minMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*min$/);
        if (minMatch) return Math.round(parseFloat(minMatch[1]) * 60);
        // "60s"
        const secMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*s?$/);
        if (secMatch) return Math.round(parseFloat(secMatch[1]));
        return null;
    },
    formatValue: (n) => {
        // Convert to minute-notation ONLY on exact multiples of 60 so the display
        // reads how coaches think ("60s = 1min", "90s stays 90s", "120s = 2min").
        // Avoids the jarring "1.5min" flip mid-nudge that a %30 check would cause.
        if (n >= 60 && n % 60 === 0) return `${n / 60}min`;
        return `${n}s`;
    },
};

// Intensity-pill unit configs. Coaches expect predictable "quick nudge" steps
// per metric. Defaults come from typical S&C prescriptions — kept null where
// the metric is too situational (cm, ft, m/s, general Load).
export const UNIT_STEPPER_CONFIG: Record<string, StepperConfig> = {
    kg:        { step: 2.5, min: 0, decimals: 1 },
    lb:        { step: 5,   min: 0, decimals: 0 },
    '%1RM':    { step: 5,   min: 0, max: 100, decimals: 0, defaultStart: 70 },
    RPE:       { step: 1,   min: 1, max: 10,  decimals: 0, defaultStart: 7 },
    RIR:       { step: 1,   min: 0, max: 10,  decimals: 0, defaultStart: 2 },
    Load:      { step: 2.5, min: 0, decimals: 1 },
    '%effort': { step: 5,   min: 0, max: 100, decimals: 0, defaultStart: 75 },
    'b-wgt':   { step: 2.5, min: 0, decimals: 1, defaultStart: 60 },
    min:       { step: 1,   min: 0, decimals: 0, defaultStart: 5 },
    sec:       { step: 15,  min: 0, decimals: 0, defaultStart: 30 },
    km:        { step: 0.5, min: 0, decimals: 1, defaultStart: 1 },
    m:         { step: 50,  min: 0, decimals: 0, defaultStart: 400 },
    cm:        { step: 5,   min: 0, decimals: 0 },
    mi:        { step: 0.25, min: 0, decimals: 2, defaultStart: 1 },
    yd:        { step: 10,  min: 0, decimals: 0, defaultStart: 40 },
    ft:        { step: 1,   min: 0, decimals: 0 },
    in:        { step: 1,   min: 0, decimals: 0 },
    rpm:       { step: 5,   min: 0, decimals: 0, defaultStart: 90 },
    'm/s':     { step: 0.1, min: 0, decimals: 1 },
    watts:     { step: 25,  min: 0, decimals: 0, defaultStart: 200 },
    bpm:       { step: 5,   min: 30, max: 220, decimals: 0, defaultStart: 150 },
    'km/h':    { step: 1,   min: 0, decimals: 0, defaultStart: 12 },
    mph:       { step: 1,   min: 0, decimals: 0, defaultStart: 8 },
    Cal:       { step: 5,   min: 0, decimals: 0, defaultStart: 15 },
};

/**
 * Compute the next value for a stepper input.
 * - Empty field → seeds with defaultStart (falls back to step so arrows never no-op).
 * - Non-numeric text (e.g. "AMRAP", "Max") → no-op (return original).
 * - Otherwise apply direction × step, clamped to [min, max].
 */
export function stepValue(currentValue: string, config: StepperConfig, direction: 1 | -1): string {
    const parse = config.parseValue || ((s: string) => {
        if (s == null || s === '' || s === '__CUSTOM__') return null;
        // Strict — only accept the ENTIRE string as numeric. parseFloat is too
        // permissive (parseFloat("8-10") = 8), which would silently overwrite
        // coach-authored rep ranges like "8-10" or "5x5" the moment they nudge
        // an arrow. Anything with trailing text falls through to the nonNumeric
        // guard below and is returned untouched.
        const trimmed = String(s).trim();
        if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
        const n = parseFloat(trimmed);
        return isNaN(n) ? null : n;
    });
    const formatDefault = (n: number) => {
        const d = config.decimals != null ? config.decimals : 0;
        // Strip trailing zeros for 2.5-style values without losing "70" for integers.
        const fixed = n.toFixed(d);
        return d > 0 ? fixed.replace(/\.?0+$/, '') : fixed;
    };
    const format = config.formatValue || formatDefault;

    // Non-numeric free-text (AMRAP, Max, etc.) → don't step, respect coach's intent.
    const nonNumeric = currentValue && parse(currentValue) === null && !/^\s*$/.test(currentValue) && currentValue !== '__CUSTOM__';
    if (nonNumeric) return currentValue;

    let current = parse(currentValue);
    if (current === null) {
        // Empty — seed. Prefer defaultStart; else lift from min (or 0) by one step.
        current = config.defaultStart != null
            ? config.defaultStart
            : ((config.min ?? 0) + (direction === 1 ? config.step : 0));
    } else {
        current = current + config.step * direction;
    }
    if (config.max != null && current > config.max) current = config.max;
    if (config.min != null && current < config.min) current = config.min;
    return format(current);
}

/** Small pair of up/down arrow buttons — used inside PresetSelect, IntensityPillEditor, and SteppableTextInput. */
const StepperArrows: React.FC<{
    onIncrement: () => void;
    onDecrement: () => void;
    disabled?: boolean;
}> = ({ onIncrement, onDecrement, disabled }) => (
    <div className="shrink-0 flex flex-col border-l border-slate-200 dark:border-[#243A58] select-none">
        <button
            type="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onIncrement(); }}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
            aria-label="Increase"
            className="flex-1 min-h-[13px] px-1.5 flex items-center justify-center text-slate-400 hover:text-indigo-500 dark:text-[#94A3B8] dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
            <ChevronUpIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
        </button>
        <div className="h-px bg-slate-200 dark:bg-[#243A58]" />
        <button
            type="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onDecrement(); }}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
            aria-label="Decrease"
            className="flex-1 min-h-[13px] px-1.5 flex items-center justify-center text-slate-400 hover:text-indigo-500 dark:text-[#94A3B8] dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
            <ChevronDownIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
        </button>
    </div>
);

/**
 * SteppableTextInput — thin wrapper around a plain text input that adds up/down
 * stepper arrows. Used by the legacy Packet builder where the row layout is a
 * grid of vanilla `<input>` fields (not PresetSelect / IntensityPillEditor).
 * Purely additive — the input itself still accepts arbitrary text.
 *
 * With `presets` also supplied, renders a small chevron popover between input
 * and arrows for special-case picks (AMRAP/Max on reps, minute shortcuts on
 * rest). Popover selection is auto-normalised through stepper.parseValue +
 * formatValue so callers with raw-seconds storage (packet's rest) receive
 * "120" when the user picks "2min", keeping downstream printers/CSV clean.
 */
export const SteppableTextInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    stepper?: StepperConfig;
    presets?: string[];
    placeholder?: string;
    className?: string;
    /** Inner input classes — packet builder passes its own styling here. */
    inputClassName?: string;
}> = ({ value, onChange, stepper, presets, placeholder = '—', className = '', inputClassName = '' }) => {
    if (!stepper) {
        return (
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={inputClassName || className}
            />
        );
    }
    // Preset select handler — if the stepper has a parser+formatter, run the
    // selected preset through both to normalise to the storage format that the
    // rest of the row / CSV / print export expects. Falls back to raw select
    // when the stepper uses the default (numeric) parser.
    const handlePresetSelect = (p: string) => {
        if (stepper.parseValue && stepper.formatValue) {
            const parsed = stepper.parseValue(p);
            if (parsed !== null) {
                onChange(stepper.formatValue(parsed));
                return;
            }
        } else if (stepper.parseValue) {
            const parsed = stepper.parseValue(p);
            if (parsed !== null) {
                const d = stepper.decimals != null ? stepper.decimals : 0;
                const fixed = parsed.toFixed(d);
                onChange(d > 0 ? fixed.replace(/\.?0+$/, '') : fixed);
                return;
            }
        }
        onChange(p);
    };
    return (
        <div className={`flex items-stretch bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all ${className}`}>
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`flex-1 min-w-0 bg-transparent px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-[#E2E8F0] outline-none border-0 placeholder:text-slate-300 dark:placeholder:text-[#475569] ${inputClassName}`}
            />
            {presets && presets.length > 0 && (
                <PresetPopover presets={presets} currentValue={value} onSelect={handlePresetSelect} />
            )}
            <StepperArrows
                onIncrement={() => onChange(stepValue(value, stepper, 1))}
                onDecrement={() => onChange(stepValue(value, stepper, -1))}
            />
        </div>
    );
};

// ── Presets ──────────────────────────────────────────────────────────────────

// Sets — common values (used in the legacy non-stepper mode; stepper mode uses SETS_PRESETS_SPECIAL below)
export const SETS_PRESETS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '12', '15', '20'];

// Reps — common values + endurance / AMRAP markers
export const REPS_PRESETS = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '15', '20', '25', '30', 'AMRAP', 'Max'];

// Rest — seconds + minute formatting; manual values still accepted
export const REST_PRESETS = ['10s', '15s', '20s', '30s', '45s', '60s', '90s', '2min', '2.5min', '3min', '3.5min', '4min', '5min'];

// ── SPECIAL-CASE presets — used with the stepper flavour of PresetSelect ────
// The rule: if the value is a plain number the user can type it directly or
// nudge via arrows — no dropdown needed. The popover surfaces ONLY things that
// aren't easy to type / step: non-numeric markers (AMRAP, Max) or long-form
// shortcuts (typing "5min" is faster than clicking an arrow 20 times).
export const SETS_PRESETS_SPECIAL: string[] = [];  // nothing special — hide the popover entirely
export const REPS_PRESETS_SPECIAL = ['AMRAP', 'Max'];
export const REST_PRESETS_SPECIAL = ['1min', '2min', '2.5min', '3min', '3.5min', '4min', '5min'];

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

// ── PresetPopover — small chevron button that opens a preset picker ──────────
// Used in the stepper-flavoured PresetSelect so the value is a text input by
// default (free typing works from the first click) but coaches can still jump
// to a preset — including non-numeric ones like "AMRAP" / "Max" — via the
// chevron. Click-outside + ESC close.

const PresetPopover: React.FC<{
    presets: string[];
    currentValue: string;
    onSelect: (v: string) => void;
}> = ({ presets, currentValue, onSelect }) => {
    const [open, setOpen] = useState(false);
    // Portal-rendered dropdown position — recalculated when opened. Portalling
    // dodges the `overflow-hidden` on both the row wrapper (Program builder) and
    // the SteppableTextInput wrapper (Packet builder), which would otherwise clip
    // the dropdown to nothing.
    const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
    const btnRef = React.useRef<HTMLButtonElement>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const openMenu = () => {
        if (!btnRef.current) return;
        const rect = btnRef.current.getBoundingClientRect();
        setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
        setOpen(true);
    };

    React.useEffect(() => {
        if (!open) return;
        const onMouse = (e: MouseEvent) => {
            const target = e.target as Node;
            if (btnRef.current?.contains(target)) return; // toggling button
            if (dropdownRef.current?.contains(target)) return; // clicking a preset
            setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        // Close on scroll/resize since our pos is fixed at open-time.
        const onScrollOrResize = () => setOpen(false);
        document.addEventListener('mousedown', onMouse);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', onScrollOrResize, true);
        window.addEventListener('resize', onScrollOrResize);
        return () => {
            document.removeEventListener('mousedown', onMouse);
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', onScrollOrResize, true);
            window.removeEventListener('resize', onScrollOrResize);
        };
    }, [open]);

    return (
        <div className="shrink-0 relative flex border-l border-slate-200 dark:border-[#243A58]">
            <button
                ref={btnRef}
                type="button"
                tabIndex={-1}
                onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openMenu(); }}
                onMouseDown={(e) => e.preventDefault()}
                aria-label="Show presets"
                className="px-1.5 flex items-center justify-center text-slate-400 hover:text-indigo-500 dark:text-[#94A3B8] dark:hover:text-indigo-300 hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
            >
                <ChevronDownIcon className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} />
            </button>
            {open && pos && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={{ top: pos.top, right: pos.right }}
                    className="fixed z-[1000] bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg shadow-xl overflow-hidden min-w-[100px] max-h-[240px] overflow-y-auto"
                >
                    {presets.map(p => (
                        <button
                            key={p}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onSelect(p); setOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                                p === currentValue
                                    ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

// ── PresetSelect ─────────────────────────────────────────────────────────────
// Two flavours:
//   - Without `stepper`: original CustomSelect dropdown + "Custom…" text mode.
//     Used for fields like Tempo where the presets are the primary UX.
//   - With `stepper`:    always-visible text input (free typing works immediately)
//     + small chevron button that opens the preset picker + up/down arrows.
//     Used for Sets / Reps / Rest so coaches can type numbers directly OR pick
//     "AMRAP" / "Max" from the preset menu OR nudge via arrows.

export const PresetSelect: React.FC<{
    value: string;
    onChange: (v: string) => void;
    presets: string[];
    placeholder?: string;
    className?: string;
    /** Optional prefix label (e.g. "Sets") shown inside the select to remove the need for an outer label */
    prefixLabel?: string;
    size?: 'xs' | 'sm' | 'md';
    /** When provided, switches to text-input-first mode with arrows + preset popover. */
    stepper?: StepperConfig;
}> = ({ value, onChange, presets, placeholder = '—', className = '', prefixLabel, size = 'sm', stepper }) => {
    // ALL hooks must run unconditionally on every render (Rules of Hooks). We
    // keep customMode declared up top even in stepper mode where it's unused,
    // so the hook order stays stable if a caller ever swaps between modes.
    const [customMode, setCustomMode] = useState(false);

    // Stepper-flavoured mode: text input primary, preset popover secondary (only
    // when there ARE special-case presets to show), arrows tertiary.
    if (stepper) {
        return (
            <div className={`flex items-stretch rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 ${className}`}>
                {prefixLabel && (
                    <span className="shrink-0 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] bg-slate-50/60 dark:bg-[#132338]/60 border-r border-slate-200 dark:border-[#243A58] flex items-center">{prefixLabel}</span>
                )}
                <input
                    type="text"
                    value={value}
                    placeholder={placeholder}
                    onChange={e => onChange(e.target.value)}
                    className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-[#E2E8F0] outline-none placeholder:text-slate-300 dark:placeholder:text-[#475569]"
                />
                {presets && presets.length > 0 && (
                    <PresetPopover presets={presets} currentValue={value} onSelect={onChange} />
                )}
                <StepperArrows
                    onIncrement={() => onChange(stepValue(value, stepper, 1))}
                    onDecrement={() => onChange(stepValue(value, stepper, -1))}
                />
            </div>
        );
    }

    // Non-stepper mode: original preset-dropdown-first UX (Tempo etc.)
    const isCustom = customMode || (value && !presets.includes(value));
    if (isCustom) {
        return (
            <div className={`flex items-stretch rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 ${className}`}>
                {prefixLabel && (
                    <span className="shrink-0 px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] bg-slate-50/60 dark:bg-[#132338]/60 border-r border-slate-200 dark:border-[#243A58] flex items-center">{prefixLabel}</span>
                )}
                <input
                    type="text"
                    value={value === '__CUSTOM__' ? '' : value}
                    placeholder={placeholder}
                    autoFocus={customMode}
                    onChange={e => onChange(e.target.value)}
                    onBlur={() => setCustomMode(false)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') (e.target as HTMLInputElement).blur(); }}
                    className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-[#E2E8F0] outline-none placeholder:text-slate-300 dark:placeholder:text-[#475569]"
                />
            </div>
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
            size={size}
            placeholder={placeholder}
            prefixLabel={prefixLabel}
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
    // Look up stepper config by unit — arrows only appear for units we have
    // sensible increments for (all currently listed units have configs).
    const stepper = UNIT_STEPPER_CONFIG[pill.unit];
    const stepperArrows = stepper ? (
        <StepperArrows
            onIncrement={() => onChange({ ...pill, value: stepValue(pill.value, stepper, 1) })}
            onDecrement={() => onChange({ ...pill, value: stepValue(pill.value, stepper, -1) })}
        />
    ) : null;

    return (
        <div className="group flex items-stretch rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <div className="w-16 shrink-0 border-r border-slate-200 dark:border-[#243A58] bg-slate-50/60 dark:bg-[#132338]/60">
                <CustomSelect
                    value={pill.unit}
                    onChange={(e: any) => onChange({ ...pill, unit: e.target.value })}
                    variant="inline"
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
                className="flex-1 min-w-0 bg-transparent px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-[#E2E8F0] outline-none placeholder:text-slate-300 dark:placeholder:text-[#475569]"
            />
            {stepperArrows}
            {canRemove && (
                <button
                    onClick={onRemove}
                    className="shrink-0 px-1.5 text-slate-300 dark:text-[#475569] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
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
