// @ts-nocheck
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayersIcon, PackageIcon, PrinterIcon } from 'lucide-react';

import { WorkoutProgramsPage } from './WorkoutProgramsPage';
import { WorkoutSessionsPage } from './WorkoutSessionsPage';
import { WeightroomSheetsPage } from './WeightroomSheetsPage';

type WorkoutTab = 'programs' | 'packets' | 'sheets';

const TABS: { id: WorkoutTab; label: string; icon: any; path: string }[] = [
    { id: 'programs', label: 'Programs', icon: LayersIcon,  path: '/workouts/programs' },
    { id: 'packets',  label: 'Packets',  icon: PackageIcon, path: '/workouts/sessions' },
    { id: 'sheets',   label: 'Sheets',   icon: PrinterIcon, path: '/workouts/sheets'   },
];

function pathToTab(pathname: string): WorkoutTab {
    if (pathname.startsWith('/workouts/sheets') || pathname.startsWith('/workouts/weightroom-sheets')) return 'sheets';
    if (pathname.startsWith('/workouts/sessions') || pathname.startsWith('/workouts/packets'))         return 'packets';
    return 'programs';
}

/**
 * Shared compact tab strip — each child page embeds this inside its OWN header card,
 * right below the page title. There is no longer a separate tab card above the page —
 * the title + tabs live in the same visual container for a tighter, more consistent look.
 */
export const WorkoutsTabsBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = pathToTab(location.pathname);
    const handleClick = (tab: WorkoutTab) => {
        const target = TABS.find(t => t.id === tab);
        if (target) navigate(target.path, { replace: false });
    };
    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0F1C30] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
            {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => handleClick(tab.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            isActive
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#1A2D48] hover:text-slate-900 dark:hover:text-[#E2E8F0]'
                        }`}>
                        <Icon size={13} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
};

export const WorkoutsPage = () => {
    const location = useLocation();
    const activeTab = pathToTab(location.pathname);
    // Each child page now renders its OWN header bar (with the WorkoutsTabsBar embedded under the title).
    return (
        <div className="animate-in fade-in duration-300">
            {activeTab === 'programs' && <WorkoutProgramsPage />}
            {activeTab === 'packets'  && <WorkoutSessionsPage />}
            {activeTab === 'sheets'   && <WeightroomSheetsPage />}
        </div>
    );
};
