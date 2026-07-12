// Platform TimePicker (Phase 4a, 2026-07-12; inline redesign per Quintin's
// reference from his other platform): a single sleek field containing
// [HH segment + slim ▲▼] : [MM segment + slim ▲▼] and a clock icon — no popup.
// - Direct TEXT INPUT in both segments (digits only; hour auto-advances to
//   minutes after 2 digits; ArrowUp/Down keys also step)
// - Stepper chevrons: hours ±1 with wrap; minutes on a stepped grid
//   (default 5-min) with snapping — 09:07 + step → 09:10
//
// Drop-in compatible with the native input contract:
//   <TimePicker value="09:00" onChange={e => setTime(e.target.value)} />
import React, { useEffect, useRef, useState } from 'react';
import { Clock as ClockIcon, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerProps {
    value: string;                                        // 'HH:MM' or ''
    onChange: (e: { target: { value: string } }) => void; // native-input-shaped
    minuteStep?: number;                                  // default 5
    disabled?: boolean;
    className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n));

const parseValue = (v: string): { h: string; m: string } => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(v || '');
    if (!m) return { h: '', m: '' };
    return { h: pad(clamp(parseInt(m[1], 10), 23)), m: pad(clamp(parseInt(m[2], 10), 59)) };
};

export const TimePicker: React.FC<TimePickerProps> = ({
    value, onChange, minuteStep = 5, disabled = false, className = '',
}) => {
    // Segment text state — allows free typing; synced from the value prop.
    const [hh, setHh] = useState(() => parseValue(value).h);
    const [mm, setMm] = useState(() => parseValue(value).m);
    const hRef = useRef<HTMLInputElement>(null);
    const mRef = useRef<HTMLInputElement>(null);
    const lastEmitted = useRef(value);

    // External value changed (e.g. form reset) → resync segments.
    useEffect(() => {
        if (value !== lastEmitted.current) {
            const p = parseValue(value);
            setHh(p.h); setMm(p.m);
            lastEmitted.current = value;
        }
    }, [value]);

    const emit = (h: string, m: string) => {
        const out = h !== '' && m !== '' ? `${pad(clamp(parseInt(h, 10) || 0, 23))}:${pad(clamp(parseInt(m, 10) || 0, 59))}` : '';
        lastEmitted.current = out;
        onChange({ target: { value: out } });
    };

    // ── Steppers ──
    const curH = () => (hh === '' ? 8 : clamp(parseInt(hh, 10) || 0, 23)); // empty → first step lands on 09
    const curM = () => (mm === '' ? 0 : clamp(parseInt(mm, 10) || 0, 59));

    const stepHour = (d: number) => {
        const nh = pad((((hh === '' ? (d > 0 ? 8 : 10) : curH()) + d) % 24 + 24) % 24);
        const nm = mm === '' ? '00' : pad(curM());
        setHh(nh); setMm(nm); emit(nh, nm);
    };
    const stepMinute = (d: number) => {
        const base = curM();
        const snapped = d > 0 ? Math.floor(base / minuteStep) * minuteStep : Math.ceil(base / minuteStep) * minuteStep;
        let nmv = mm === '' ? (d > 0 ? 0 : 60 - minuteStep) : snapped + d * minuteStep;
        let nhv = hh === '' ? 9 : curH();
        if (nmv >= 60) { nmv -= 60; nhv = (nhv + 1) % 24; }
        if (nmv < 0)   { nmv += 60; nhv = (nhv + 23) % 24; }
        const nh = pad(nhv), nm = pad(nmv);
        setHh(nh); setMm(nm); emit(nh, nm);
    };

    // ── Typing ──
    const onHhChange = (raw: string) => {
        const t = raw.replace(/\D/g, '').slice(0, 2);
        setHh(t);
        if (t.length === 2) {
            const h = pad(clamp(parseInt(t, 10), 23));
            setHh(h);
            if (mm !== '') emit(h, mm);
            mRef.current?.focus(); mRef.current?.select();
        } else if (t === '' && mm === '') {
            emit('', '');
        }
    };
    const onMmChange = (raw: string) => {
        const t = raw.replace(/\D/g, '').slice(0, 2);
        setMm(t);
        if (t.length === 2 && hh !== '') emit(hh === '' ? '' : pad(clamp(parseInt(hh, 10) || 0, 23)), pad(clamp(parseInt(t, 10), 59)));
        else if (t === '' && hh === '') emit('', '');
    };
    const commitBlur = () => {
        // Normalise partial entries on blur: '9' → '09'; lone segment pairs with 00.
        let h = hh, m = mm;
        if (h === '' && m === '') { emit('', ''); return; }
        if (h === '') h = '00';
        if (m === '') m = '00';
        h = pad(clamp(parseInt(h, 10) || 0, 23));
        m = pad(clamp(parseInt(m, 10) || 0, 59));
        setHh(h); setMm(m); emit(h, m);
    };
    const onKey = (which: 'h' | 'm') => (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp')   { e.preventDefault(); which === 'h' ? stepHour(1)  : stepMinute(1); }
        if (e.key === 'ArrowDown') { e.preventDefault(); which === 'h' ? stepHour(-1) : stepMinute(-1); }
    };

    // Slim stacked chevrons (like the reference design)
    const Chevrons = ({ onUp, onDown, label }: { onUp: () => void; onDown: () => void; label: string }) => (
        <span className="flex flex-col -space-y-0.5 shrink-0">
            <button type="button" tabIndex={-1} disabled={disabled} onClick={onUp} aria-label={`Increase ${label}`}
                className="h-3 flex items-center text-slate-300 dark:text-[#64748B] hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                <ChevronUp size={11} strokeWidth={2.5} />
            </button>
            <button type="button" tabIndex={-1} disabled={disabled} onClick={onDown} aria-label={`Decrease ${label}`}
                className="h-3 flex items-center text-slate-300 dark:text-[#64748B] hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                <ChevronDown size={11} strokeWidth={2.5} />
            </button>
        </span>
    );

    const seg = 'w-7 bg-transparent text-center text-sm font-medium tabular-nums outline-none ' +
        'text-slate-900 dark:text-[#E2E8F0] placeholder-slate-300 dark:placeholder-[#475569] ' +
        'focus:bg-indigo-50 dark:focus:bg-indigo-500/15 rounded';

    return (
        <div
            className={`inline-flex items-center gap-1 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-2.5 py-2 transition-colors focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`}
        >
            <input ref={hRef} type="text" inputMode="numeric" value={hh} placeholder="––"
                onChange={e => onHhChange(e.target.value)} onBlur={commitBlur} onKeyDown={onKey('h')}
                onFocus={e => e.target.select()} disabled={disabled} aria-label="Hours" className={seg} />
            <Chevrons label="hours" onUp={() => stepHour(1)} onDown={() => stepHour(-1)} />
            <span className="text-slate-300 dark:text-[#475569] text-sm font-semibold px-0.5">:</span>
            <input ref={mRef} type="text" inputMode="numeric" value={mm} placeholder="––"
                onChange={e => onMmChange(e.target.value)} onBlur={commitBlur} onKeyDown={onKey('m')}
                onFocus={e => e.target.select()} disabled={disabled} aria-label="Minutes" className={seg} />
            <Chevrons label="minutes" onUp={() => stepMinute(1)} onDown={() => stepMinute(-1)} />
            <ClockIcon size={13} className="ml-1 text-slate-400 dark:text-[#94A3B8] shrink-0" />
        </div>
    );
};

export default TimePicker;
