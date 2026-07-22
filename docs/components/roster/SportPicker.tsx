import React, { useState } from 'react';
import { CustomSelect } from '../ui/CustomSelect';

// Preset sporting codes offered when creating/editing a team. "Other…" reveals a
// free-text box so any discipline can still be entered (dropdown + custom).
export const SPORTS = [
    'Football', 'Rugby', 'Cricket', 'Netball', 'Hockey', 'Basketball',
    'Athletics', 'Tennis', 'Swimming', 'Cycling', 'Volleyball', 'Golf',
];

interface SportPickerProps {
    value: string;
    onChange: (v: string) => void;
}

export const SportPicker: React.FC<SportPickerProps> = ({ value, onChange }) => {
    // Custom mode when the current value isn't one of the presets (e.g. editing a
    // team whose sport was typed manually). Initialised once from the value.
    const [custom, setCustom] = useState(() => !!value && !SPORTS.includes(value));

    return (
        <div className="space-y-2">
            <CustomSelect
                value={custom ? '__other' : value}
                onChange={e => {
                    if (e.target.value === '__other') { setCustom(true); onChange(''); }
                    else { setCustom(false); onChange(e.target.value); }
                }}
            >
                <option value="">— select sport —</option>
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
                <option value="__other">Other…</option>
            </CustomSelect>
            {custom && (
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder="Enter sport / discipline…"
                    autoFocus
                    className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                />
            )}
        </div>
    );
};

export default SportPicker;
