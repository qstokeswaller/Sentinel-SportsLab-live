// Platform DatePicker (Phase 4a-2, 2026-07-12) — replaces every native
// <input type="date"> per Quintin's reference (calendar popover like his other
// platform, adapted to the SportsLab design system, dark + light).
// Field: [ 3 Jul 2026  📅 ] → popover: month header + ‹ › nav, SU–SA grid,
// adjacent-month days dimmed, selected day filled, today outlined,
// footer: Today · Clear. Collision-aware (flips up near the viewport bottom).
//
// Drop-in compatible with the native input contract:
//   <DatePicker value="2026-07-03" onChange={e => setDate(e.target.value)} />
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
    value: string;                                        // 'YYYY-MM-DD' or ''
    onChange: (e: { target: { value: string } }) => void; // native-input-shaped
    min?: string;
    max?: string;
    disabled?: boolean;
    className?: string;
    placeholder?: string;
}

const DOW = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseIso = (v: string): Date | null => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
};

export const DatePicker: React.FC<DatePickerProps> = ({
    value, onChange, min, max, disabled = false, className = '', placeholder = 'Select date',
}) => {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<React.CSSProperties>({});
    const selected = parseIso(value);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // The month shown in the grid — follows the selection, else today.
    const [view, setView] = useState<Date>(() => selected || today);
    const wrapRef = useRef<HTMLDivElement>(null);
    const popRef = useRef<HTMLDivElement>(null);

    useEffect(() => { if (open) setView(parseIso(value) || today); }, [open]); // eslint-disable-line

    // Outside click + Escape close.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            // Popover is portaled outside the wrapper, so check both.
            if (!wrapRef.current?.contains(t) && !popRef.current?.contains(t)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);

    // Collision-aware placement. The popover is portaled to <body> with fixed
    // positioning so it can never be clipped by a modal's overflow — it always
    // appears fully, flipping above the field when there's no room below, and
    // clamped within the viewport horizontally. Tracks the field on scroll/resize.
    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const el = wrapRef.current;
            if (!el) return;
            const r = el.getBoundingClientRect();
            const vw = window.innerWidth, vh = window.innerHeight;
            const width = 288; // w-72
            const openUp = vh - r.bottom < 360 && r.top > 360;
            const left = Math.min(Math.max(8, r.left), vw - width - 8);
            setPos({
                position: 'fixed',
                width,
                left,
                ...(openUp ? { bottom: vh - r.top + 4 } : { top: r.bottom + 4 }),
            });
        };
        place();
        window.addEventListener('scroll', place, true); // capture: also catches modal-body scroll
        window.addEventListener('resize', place);
        return () => {
            window.removeEventListener('scroll', place, true);
            window.removeEventListener('resize', place);
        };
    }, [open]);

    const minD = min ? parseIso(min) : null;
    const maxD = max ? parseIso(max) : null;
    const inRange = (d: Date) => (!minD || d >= minD) && (!maxD || d <= maxD);

    const pick = (d: Date) => {
        onChange({ target: { value: iso(d) } });
        setOpen(false);
    };

    // Build a 6-week grid starting on the Sunday before the 1st.
    const gridStart = new Date(view.getFullYear(), view.getMonth(), 1);
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    const days: Date[] = Array.from({ length: 42 }, (_, i) => {
        const d = new Date(gridStart);
        d.setDate(gridStart.getDate() + i);
        return d;
    });

    const label = selected
        ? `${selected.getDate()} ${MONTHS_SHORT[selected.getMonth()]} ${selected.getFullYear()}`
        : '';

    return (
        <div ref={wrapRef} className={`relative ${className}`}>
            {/* Field */}
            <button
                type="button"
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                aria-label="Choose date"
                className={`w-full flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm transition-colors
                    ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-300 dark:hover:border-indigo-500/50 cursor-pointer'}
                    ${open ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-500/15' : ''}`}
            >
                <span className={`flex-1 text-left whitespace-nowrap ${label ? 'text-slate-900 dark:text-[#E2E8F0] font-medium' : 'text-slate-400 dark:text-[#64748B]'}`}>
                    {label || placeholder}
                </span>
                <CalendarIcon size={14} className="text-slate-400 dark:text-[#94A3B8] shrink-0" />
            </button>

            {/* Calendar popover — portaled to <body> so it's never clipped by a modal's overflow */}
            {open && createPortal(
                <div ref={popRef} style={pos} className="z-[1300] bg-white dark:bg-[#1A2D48] rounded-xl shadow-xl border border-slate-200 dark:border-[#243A58] p-4 animate-in fade-in zoom-in-95 duration-150">
                    {/* Month header + nav */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">
                            {MONTHS[view.getMonth()]} {view.getFullYear()}
                        </span>
                        <div className="flex items-center gap-1">
                            <button type="button" aria-label="Previous month"
                                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
                                className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors">
                                <ChevronLeft size={15} />
                            </button>
                            <button type="button" aria-label="Next month"
                                onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
                                className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-colors">
                                <ChevronRight size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 mb-1">
                        {DOW.map(d => (
                            <span key={d} className="text-center text-[9px] font-bold tracking-wider text-slate-400 dark:text-[#64748B]">{d}</span>
                        ))}
                    </div>

                    {/* Day grid */}
                    <div className="grid grid-cols-7 gap-y-0.5">
                        {days.map((d, i) => {
                            const inMonth = d.getMonth() === view.getMonth();
                            const isSel = selected && iso(d) === iso(selected);
                            const isToday = iso(d) === iso(today);
                            const enabled = inRange(d);
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={!enabled}
                                    onClick={() => pick(d)}
                                    className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition-colors
                                        ${isSel
                                            ? 'bg-indigo-600 text-white font-bold shadow-sm'
                                            : isToday
                                                ? 'border border-indigo-400 dark:border-indigo-500 text-indigo-600 dark:text-indigo-300'
                                                : inMonth
                                                    ? 'text-slate-700 dark:text-[#CBD5E1] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-700 dark:hover:text-indigo-200'
                                                    : 'text-slate-300 dark:text-[#3B4F6E] hover:bg-slate-50 dark:hover:bg-[#243A58]'}
                                        ${!enabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}`}
                                >
                                    {d.getDate()}
                                </button>
                            );
                        })}
                    </div>

                    {/* Footer: Today · Clear */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 dark:border-[#243A58]">
                        <button type="button" onClick={() => inRange(today) && pick(today)}
                            className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-500 dark:hover:text-indigo-200 transition-colors">
                            Today
                        </button>
                        <button type="button" onClick={() => { onChange({ target: { value: '' } }); setOpen(false); }}
                            className="text-xs font-semibold text-slate-400 dark:text-[#94A3B8] hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                            Clear
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default DatePicker;
