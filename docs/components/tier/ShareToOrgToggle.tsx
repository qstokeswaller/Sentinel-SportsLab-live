// @ts-nocheck
import React from 'react';
import { GlobeIcon, LockIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface ShareToOrgToggleProps {
    value: 'personal' | 'org';
    onChange: (v: 'personal' | 'org') => void;
    label?: string;
    disabled?: boolean;
    /** Hide on single-user orgs since there's no one to share with. */
    autoHideSingleUser?: boolean;
}

/**
 * "Share with organisation" toggle for program/packet/sheet editors.
 * Two-state pill — Personal vs Org. Hidden on single-user orgs by default
 * since sharing has no effect when you're the only seat.
 */
export const ShareToOrgToggle: React.FC<ShareToOrgToggleProps> = ({
    value, onChange, label = 'Visibility', disabled = false, autoHideSingleUser = true,
}) => {
    const { isMultiUserOrg } = useAppState();
    if (autoHideSingleUser && !isMultiUserOrg) return null;

    const baseBtn =
        'flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md transition-colors';
    const activeBtn = 'bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-indigo-300 shadow-sm';
    const inactiveBtn = 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-800 dark:hover:text-[#E2E8F0]';

    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1] mb-1.5">
                {label}
            </p>
            <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-[#0F1C30] rounded-lg border border-slate-200 dark:border-[#243A58]">
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange('personal')}
                    className={`${baseBtn} ${value === 'personal' ? activeBtn : inactiveBtn}`}
                >
                    <LockIcon size={11} /> Personal
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange('org')}
                    className={`${baseBtn} ${value === 'org' ? activeBtn : inactiveBtn}`}
                >
                    <GlobeIcon size={11} /> Share with Org
                </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1.5">
                {value === 'org'
                    ? 'Visible to every member of your organisation. Only you can edit.'
                    : 'Only visible to you.'}
            </p>
        </div>
    );
};
