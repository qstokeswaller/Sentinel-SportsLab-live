import React from 'react';
import { UserIcon, GlobeIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

export type OwnershipScope = 'all' | 'mine' | 'org';

interface OwnershipFilterProps {
    value: OwnershipScope;
    onChange: (v: OwnershipScope) => void;
    className?: string;
    /** Hide if the org has only one member (no filtering value). */
    autoHideSingleUser?: boolean;
}

/**
 * Three-way pill: All / Mine / Org. Hidden on single-user orgs by default
 * since "Mine" === "Org" === "All" when there's one seat. Shown above any list
 * of org-shareable library items (programs, packets, sheets) to let users
 * narrow to what they own vs. what the team shared.
 */
export const OwnershipFilter: React.FC<OwnershipFilterProps> = ({
    value, onChange, className = '', autoHideSingleUser = true,
}) => {
    const { isMultiUserOrg } = useAppState();
    if (autoHideSingleUser && !isMultiUserOrg) return null;

    const buttonCls = (active: boolean) =>
        `flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
            active
                ? 'bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-indigo-300 shadow-sm'
                : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-800 dark:hover:text-[#E2E8F0]'
        }`;

    return (
        <div className={`inline-flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-[#0F1C30] rounded-lg border border-slate-200 dark:border-[#243A58] ${className}`}>
            <button type="button" onClick={() => onChange('all')} className={buttonCls(value === 'all')}>
                All
            </button>
            <button type="button" onClick={() => onChange('mine')} className={buttonCls(value === 'mine')}>
                <UserIcon size={10} /> Mine
            </button>
            <button type="button" onClick={() => onChange('org')} className={buttonCls(value === 'org')}>
                <GlobeIcon size={10} /> Org
            </button>
        </div>
    );
};

/** Predicate to apply the active scope to a row that has user_id.
 *  All  = everything the user can see (own + org-shared by others).
 *  Mine = created by the current user.
 *  Org  = created by anyone OTHER than the current user (i.e. not mine). */
export function matchesOwnershipScope(
    row: { user_id?: string; visibility?: string },
    scope: OwnershipScope,
    currentUserId: string | null | undefined,
): boolean {
    if (scope === 'all') return true;
    if (scope === 'mine') return !!currentUserId && row.user_id === currentUserId;
    if (scope === 'org') return !!currentUserId && !!row.user_id && row.user_id !== currentUserId;
    return true;
}
