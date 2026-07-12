import React, {
    useState, useRef, useEffect, useLayoutEffect,
    useCallback, Children, isValidElement,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, CheckIcon } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionItem { value: string; label: string; disabled?: boolean; }
interface GroupItem  { type: 'group'; label: string; items: OptionItem[]; }
type     Item = OptionItem | GroupItem;
const    isGroup = (i: Item): i is GroupItem => 'type' in i && (i as any).type === 'group';

export interface CustomSelectProps {
    value: string;
    // Accepts the same signature as a native <select> onChange so existing handlers work unchanged
    onChange: (e: { target: { value: string } }) => void;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    placeholder?: string;
    /** 'form'     — full-width card/input style (default)
     *  'filter'   — compact pill for toolbars & filter bars
     *  'inline'   — borderless / transparent, for use inside an already-styled container (e.g. IntensityPillEditor) */
    variant?: 'form' | 'filter' | 'inline';
    /** 'xs' = text-xs tight padding  'sm' = text-xs normal  'md' = text-sm (default) */
    size?: 'xs' | 'sm' | 'md';
    /** Leading icon element rendered before the label */
    prefixIcon?: React.ReactNode;
    /** Short text label rendered before the value, separated by a divider */
    prefixLabel?: string;
    minWidth?: string | number;
    id?: string;
    name?: string;
}

// ── Parse React <option> / <optgroup> children ────────────────────────────────

function childrenToText(c: React.ReactNode): string {
    if (c == null || c === false) return '';
    if (Array.isArray(c)) return c.map(childrenToText).join('');
    if (typeof c === 'object' && isValidElement(c)) return childrenToText((c as any).props?.children);
    return String(c);
}

function parseChildren(children: React.ReactNode) {
    const items: Item[]  = [];
    const labelMap: Record<string, string> = {};

    // Native <select> uses the option's text content as the value when `value` is
    // omitted (HTML spec). CustomSelect mirrors that fallback so call-sites that
    // forget the value= prop don't silently collapse every option to "" — that bug
    // hid in DataHub for a while because all options share value "" and selecting
    // any team blanked the filter.
    Children.forEach(children, child => {
        if (!isValidElement(child)) return;
        const el = child as React.ReactElement<any>;

        if (el.type === 'optgroup') {
            const group: GroupItem = { type: 'group', label: el.props.label || '', items: [] };
            Children.forEach(el.props.children, opt => {
                if (!isValidElement(opt)) return;
                const o = opt as React.ReactElement<any>;
                if (o.type !== 'option') return;
                const lbl = childrenToText(o.props.children);
                const val = o.props.value != null ? String(o.props.value) : lbl;
                group.items.push({ value: val, label: lbl || val, disabled: !!o.props.disabled });
                labelMap[val] = lbl || val;
            });
            items.push(group);
        } else if (el.type === 'option') {
            const lbl = childrenToText(el.props.children);
            const val = el.props.value != null ? String(el.props.value) : lbl;
            items.push({ value: val, label: lbl || val, disabled: !!el.props.disabled });
            labelMap[val] = lbl || val;
        }
    });

    return { items, labelMap };
}

function flatOptions(items: Item[]): OptionItem[] {
    return items.flatMap(i => isGroup(i) ? i.items : [i]).filter(o => !o.disabled);
}

// ── Single option row ─────────────────────────────────────────────────────────

interface OptionRowProps {
    opt: OptionItem;
    isSelected: boolean;
    isFocused: boolean;
    onSelect: (v: string) => void;
    textSize: string;
    indent?: boolean;
}

function OptionRow({ opt, isSelected, isFocused, onSelect, textSize, indent }: OptionRowProps) {
    const rowRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isFocused && rowRef.current) rowRef.current.scrollIntoView({ block: 'nearest' });
    }, [isFocused]);

    const bg = isSelected
        ? 'bg-indigo-50 dark:bg-indigo-600 text-indigo-600 dark:text-white font-medium'
        : isFocused
        ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-900 dark:text-[#E2E8F0]'
        : opt.disabled
        ? 'text-slate-300 dark:text-[#475569] cursor-not-allowed'
        : 'text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48]';

    return (
        <div
            ref={rowRef}
            role="option"
            aria-selected={isSelected}
            onMouseDown={e => { e.preventDefault(); if (!opt.disabled) onSelect(opt.value); }}
            className={`flex items-center justify-between select-none rounded-md mx-1 ${indent ? 'px-4 py-1.5' : 'px-2.5 py-1.5'} ${textSize} ${bg} ${opt.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span className="truncate">{opt.label}</span>
            {isSelected && <CheckIcon size={11} className="shrink-0 ml-2 text-indigo-500 dark:text-indigo-400" />}
        </div>
    );
}

// ── Dropdown panel (portalled) ────────────────────────────────────────────────

interface DropdownProps {
    triggerRef: React.RefObject<HTMLButtonElement>;
    items: Item[];
    value: string;
    focusedValue: string | null;
    onSelect: (val: string) => void;
    onClose: () => void;
    size: 'xs' | 'sm' | 'md';
}

function Dropdown({ triggerRef, items, value, focusedValue, onSelect, onClose, size }: DropdownProps) {
    const panelRef  = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden', position: 'fixed', zIndex: 9999 });

    const textSize = size === 'md' ? 'text-sm' : 'text-xs';

    // Position the panel anchored to the trigger. Run on mount, and re-run after the
    // panel actually mounts so panelH reflects the real height (not the 280px fallback
    // used on the first pass). Also re-position on scroll/resize so the menu doesn't
    // detach when the user scrolls the parent.
    useLayoutEffect(() => {
        let raf = 0;
        const position = () => {
            if (!triggerRef.current) return;
            const r = triggerRef.current.getBoundingClientRect();
            const panelH = panelRef.current?.offsetHeight ?? 280;
            const gap = 4;
            const viewH = window.innerHeight;
            const spaceBelow = viewH - r.bottom - 8;
            const spaceAbove = r.top - 8;
            const openUp = panelH > spaceBelow && spaceAbove > spaceBelow;
            const maxHeight = Math.max(120, Math.min(panelH, openUp ? spaceAbove - gap : spaceBelow - gap));
            setStyle({
                position: 'fixed',
                left: r.left,
                width: Math.max(r.width, 160),
                maxHeight,
                ...(openUp
                    ? { bottom: Math.max(8, viewH - r.top + gap) }
                    : { top: Math.max(8, r.bottom + gap) }),
                zIndex: 9999,
                visibility: 'visible',
            });
        };
        // First pass with fallback panelH, then a second pass once the panel has mounted
        position();
        raf = requestAnimationFrame(position);
        const onResize = () => position();
        const onScroll = () => position();
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onScroll, true);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    // Close on outside click
    useEffect(() => {
        const fn = (e: MouseEvent) => {
            if (
                panelRef.current  && !panelRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) onClose();
        };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [onClose]);

    const panel = (
        <div
            ref={panelRef}
            role="listbox"
            style={style}
            className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
        >
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar py-1.5 space-y-px">
                {items.map((item, i) =>
                    isGroup(item) ? (
                        <div key={i}>
                            <div className={`px-3 pt-2.5 pb-1 ${textSize} font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide`}>
                                {item.label}
                            </div>
                            {item.items.map(opt => (
                                <OptionRow
                                    key={opt.value}
                                    opt={opt}
                                    isSelected={value === opt.value}
                                    isFocused={focusedValue === opt.value}
                                    onSelect={onSelect}
                                    textSize={textSize}
                                    indent
                                />
                            ))}
                        </div>
                    ) : (
                        <OptionRow
                            key={item.value}
                            opt={item}
                            isSelected={value === item.value}
                            isFocused={focusedValue === item.value}
                            onSelect={onSelect}
                            textSize={textSize}
                        />
                    )
                )}
            </div>
        </div>
    );

    return createPortal(panel, document.body);
}

// ── Main component ────────────────────────────────────────────────────────────

export function CustomSelect({
    value,
    onChange,
    children,
    className = '',
    disabled = false,
    placeholder = 'Select…',
    variant = 'form',
    size = 'md',
    prefixIcon,
    prefixLabel,
    minWidth,
    id,
    name,
}: CustomSelectProps) {
    const [isOpen,       setIsOpen]       = useState(false);
    const [focusedValue, setFocusedValue] = useState<string | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    const { items, labelMap } = parseChildren(children);
    const flat = flatOptions(items);
    const selectedLabel = value !== '' && value != null ? (labelMap[value] ?? value) : null;

    const handleSelect = useCallback((val: string) => {
        onChange({ target: { value: val } });
        setIsOpen(false);
        setFocusedValue(null);
        triggerRef.current?.focus();
    }, [onChange]);

    const open = () => {
        if (disabled) return;
        setIsOpen(true);
        setFocusedValue(value || flat[0]?.value || null);
    };

    const close = useCallback(() => { setIsOpen(false); setFocusedValue(null); }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (!isOpen) {
            if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); open(); }
            return;
        }
        const idx = flat.findIndex(o => o.value === focusedValue);
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedValue((flat[idx + 1] ?? flat[0])?.value ?? null);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedValue((flat[idx - 1] ?? flat[flat.length - 1])?.value ?? null);
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (focusedValue != null) handleSelect(focusedValue);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    };

    // Size tokens
    const S = {
        xs: { pad: 'px-2.5 py-1.5', text: 'text-xs',  chevron: 12 },
        sm: { pad: 'px-3   py-2',   text: 'text-xs',  chevron: 13 },
        md: { pad: 'px-3   py-2.5', text: 'text-sm',  chevron: 15 },
    }[size];

    // Trigger class
    const base = `flex items-center gap-2 transition-all outline-none ${S.pad} ${S.text} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;

    const formCls = `w-full ${base} rounded-lg border ${
        isOpen
            ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-white dark:bg-[#132338]'
            : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] hover:border-slate-300 dark:hover:border-[#475569]'
    } ${className}`;

    const filterCls = `${base} rounded-lg border ${
        isOpen
            ? 'border-indigo-400 ring-2 ring-indigo-500/20 bg-slate-50 dark:bg-[#0F1C30]'
            : 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] hover:border-slate-300 dark:hover:border-[#475569]'
    } ${className}`;

    // Inline (borderless) — for use INSIDE an already-styled container so we don't get nested borders/bg.
    const inlineCls = `w-full ${base} bg-transparent border-0 ${
        isOpen ? 'text-indigo-600 dark:text-indigo-300' : 'hover:bg-slate-100/60 dark:hover:bg-[#1A2D48]/60'
    } ${className}`;

    const triggerCls = variant === 'filter' ? filterCls : variant === 'inline' ? inlineCls : formCls;

    const labelColor = selectedLabel
        ? 'text-slate-800 dark:text-[#E2E8F0]'
        : 'text-slate-400 dark:text-[#CBD5E1]';

    return (
        <>
            <button
                ref={triggerRef}
                id={id}
                type="button"
                disabled={disabled}
                className={triggerCls}
                style={minWidth ? { minWidth } : undefined}
                onClick={() => isOpen ? close() : open()}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={name}
            >
                {/* Left slot: icon + prefixLabel + value */}
                <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                    {prefixIcon && (
                        <span className="shrink-0 text-slate-400 dark:text-[#CBD5E1] flex items-center">
                            {prefixIcon}
                        </span>
                    )}
                    {prefixLabel && (
                        <>
                            <span className="shrink-0 text-slate-500 dark:text-[#CBD5E1] font-medium">{prefixLabel}</span>
                            <span className="shrink-0 w-px h-3 bg-slate-200 dark:bg-[#243A58]" />
                        </>
                    )}
                    <span className={`truncate font-medium ${labelColor}`}>
                        {selectedLabel ?? placeholder}
                    </span>
                </span>

                {/* Chevron */}
                <ChevronDownIcon
                    size={S.chevron}
                    className={`shrink-0 text-slate-400 dark:text-[#CBD5E1] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <Dropdown
                    triggerRef={triggerRef}
                    items={items}
                    value={value}
                    focusedValue={focusedValue}
                    onSelect={handleSelect}
                    onClose={close}
                    size={size}
                />
            )}
        </>
    );
}

export default CustomSelect;
