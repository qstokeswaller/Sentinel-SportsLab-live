// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuIcon, ActivityIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';

// Page title map — matches NAV_ITEMS ids + any sub-routes
const PAGE_TITLES: Record<string, string> = {
    dashboard:     'Dashboard',
    periodization: 'Planner',
    clients:       'Roster',
    workouts:      'Workouts',
    library:       'Library',
    conditioning:  'Conditioning Hub',
    analytics:     'Analytics Hub',
    reports:       'Reporting Hub',
    wellness:      'Wellness Hub',
    testing:       'Testing Hub',
    lab:           'Performance Lab',
    settings:      'Settings',
};

export const TopBar = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { setIsMobileDrawerOpen, activeTab } = useAppState();

    const displayName = user?.user_metadata?.full_name || user?.email || '';
    const userInitial = displayName[0]?.toUpperCase() ?? '?';
    const pageTitle = PAGE_TITLES[activeTab] ?? 'Sentinel SportsLab';

    return (
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#111827] border-b border-slate-200 dark:border-[#263044] z-30 shrink-0 print:hidden">
            {/* Hamburger */}
            <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="p-2 -ml-1 rounded-lg text-slate-500 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#1F2937] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Open menu"
            >
                <MenuIcon size={20} />
            </button>

            {/* Logo mark */}
            <div
                className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                onClick={() => navigate('/dashboard')}
            >
                <ActivityIcon className="text-white w-3.5 h-3.5" />
            </div>

            {/* Page title */}
            <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] truncate flex-1 min-w-0">{pageTitle}</span>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">{userInitial}</span>
            </div>
        </header>
    );
};
