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
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#132338] border-b border-slate-200 dark:border-[#243A58] z-30 shrink-0 print:hidden">
            {/* Hamburger */}
            <button
                onClick={() => setIsMobileDrawerOpen(true)}
                className="p-2 -ml-1 rounded-lg text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-900 dark:hover:text-[#E2E8F0] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Open menu"
            >
                <MenuIcon size={20} />
            </button>

            {/* Logo mark */}
            <img
                src="/images/sentinel-sportslab-logo.png"
                alt="Sentinel SportsLab"
                className="h-11 w-auto shrink-0 cursor-pointer select-none"
                onClick={() => navigate('/dashboard')}
            />

            {/* Page title */}
            <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] truncate flex-1 min-w-0">{pageTitle}</span>

            {/* User avatar */}
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-600 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-indigo-600 dark:text-white">{userInitial}</span>
            </div>
        </header>
    );
};
