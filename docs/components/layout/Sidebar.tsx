// @ts-nocheck
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';

import {
    ActivityIcon, LayoutDashboardIcon, CalendarIcon, UsersIcon, BookOpenIcon, DumbbellIcon,
    ZapIcon, BarChart3Icon, FileIcon, FlaskConicalIcon, ChevronLeftIcon, ChevronRightIcon,
    SettingsIcon, HeartPulseIcon, ClipboardListIcon, XIcon
} from 'lucide-react';

const WORKOUTS_SUB_NAV = [
    { path: '/workouts',           label: 'Overview' },
    { path: '/workouts/programs',  label: 'Programs' },
    { path: '/workouts/sessions',  label: 'Packets' },
    { path: '/workouts/sheets',    label: 'Sheets' },
    { path: '/workouts/history',   label: 'History' },
];

const NAV_ITEMS = [
    { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboardIcon },
    { id: 'periodization', label: 'Planner',           icon: CalendarIcon },
    { id: 'clients',       label: 'Roster',            icon: UsersIcon },
    { id: 'workouts',      label: 'Workouts',           icon: DumbbellIcon },
    { id: 'library',       label: 'Library',            icon: BookOpenIcon },
    { id: 'conditioning',  label: 'Conditioning Hub',  icon: ZapIcon },
    { id: 'analytics',     label: 'Analytics Hub',     icon: BarChart3Icon },
    { id: 'reports',       label: 'Reporting Hub',     icon: FileIcon },
    { id: 'wellness',      label: 'Wellness Hub',      icon: HeartPulseIcon },
    { id: 'testing',       label: 'Testing Hub',       icon: ClipboardListIcon },
    { id: 'lab',           label: 'Performance Lab',   icon: FlaskConicalIcon },
];

export const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const isMobile = useIsMobile();
    const {
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        activeTab,
        setIsPerformanceLabOpen,
        setActiveAnalyticsModule,
        setActiveReport,
        setActiveConditioningModule
    } = useAppState();

    const collapsed = isSidebarCollapsed;
    const displayName = user?.user_metadata?.full_name || user?.email || '';
    const userInitial = displayName[0]?.toUpperCase() ?? '?';

    // Lock body scroll when drawer is open on mobile
    useEffect(() => {
        if (isMobile && isMobileDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isMobile, isMobileDrawerOpen]);

    // Close drawer when switching to desktop
    useEffect(() => {
        if (!isMobile && isMobileDrawerOpen) {
            setIsMobileDrawerOpen(false);
        }
    }, [isMobile]);

    const handleNavClick = (item) => {
        if (item.id === 'lab') {
            setIsPerformanceLabOpen(true);
        } else {
            navigate('/' + item.id);
            setActiveAnalyticsModule(null);
            setActiveReport(null);
            if (item.id !== 'conditioning') setActiveConditioningModule(null);
        }
        // Close drawer on navigation (mobile)
        if (isMobile) setIsMobileDrawerOpen(false);
    };

    const navContent = (showLabels: boolean) => (
        <>
            {/* Logo */}
            <div className={`flex items-center gap-3 border-b border-slate-100 dark:border-[#243A58] shrink-0 ${!showLabels ? 'justify-center px-3 py-5' : 'px-4 py-5'}`}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <ActivityIcon className="text-white w-4 h-4" />
                </div>
                {showLabels && (
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-slate-900 dark:text-[#E2E8F0] leading-tight">
                            Sentinel <span className="text-indigo-600 dark:text-indigo-300">SportsLab</span>
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] leading-tight">Athlete Monitoring</span>
                        <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] leading-tight">& Performance Intelligence</span>
                    </div>
                )}
                {/* Mobile: close button in logo row */}
                {isMobile && (
                    <button
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="ml-auto p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors"
                        aria-label="Close menu"
                    >
                        <XIcon size={18} />
                    </button>
                )}
            </div>

            {/* Nav Items */}
            <div className={`flex-1 py-3 overflow-y-auto no-scrollbar ${!showLabels ? 'px-2' : 'px-3'}`}>
                <div className="space-y-0.5">
                    {NAV_ITEMS.map(item => {
                        const isActive = activeTab === item.id;
                        const hasSubNav = item.id === 'workouts';
                        return (
                            <div key={item.id}>
                                <button
                                    onClick={() => handleNavClick(item)}
                                    title={!showLabels ? item.label : ''}
                                    className={`w-full flex items-center gap-3 rounded-lg transition-colors
                                        ${isMobile ? 'min-h-[44px]' : ''}
                                        ${!showLabels ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                                        ${isActive
                                            ? 'bg-indigo-600 text-white'
                                            : 'text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-900 dark:hover:text-[#E2E8F0]'
                                        }`}
                                >
                                    <item.icon size={18} className="shrink-0" />
                                    {showLabels && (
                                        <span className="text-sm font-medium truncate">{item.label}</span>
                                    )}
                                </button>

                                {/* Workouts sub-nav — shown when active and expanded */}
                                {hasSubNav && isActive && showLabels && (
                                    <div className="ml-3 mt-0.5 mb-1 border-l-2 border-indigo-300/40 dark:border-indigo-700/50 pl-3 space-y-0.5">
                                        {WORKOUTS_SUB_NAV.map(sub => {
                                            const subActive = sub.path === '/workouts'
                                                ? location.pathname === '/workouts'
                                                : location.pathname.startsWith(sub.path);
                                            return (
                                                <button
                                                    key={sub.path}
                                                    onClick={() => { navigate(sub.path); if (isMobile) setIsMobileDrawerOpen(false); }}
                                                    className={`w-full text-left py-1.5 px-2.5 rounded-md text-[11px] font-medium transition-colors ${
                                                        subActive
                                                            ? 'text-indigo-700 dark:text-white bg-indigo-50 dark:bg-indigo-600'
                                                            : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                                                    }`}
                                                >
                                                    {sub.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Bottom: User + Settings + Collapse */}
            <div className="border-t border-slate-100 dark:border-[#243A58] shrink-0">
                <div className={`flex items-center gap-2.5 px-3 py-3 border-b border-slate-100 dark:border-[#243A58] ${!showLabels ? 'justify-center' : ''}`}>
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">{userInitial}</span>
                    </div>
                    {showLabels && (
                        <p className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] truncate flex-1 min-w-0">{displayName}</p>
                    )}
                </div>

                <div className={`py-2 space-y-0.5 ${!showLabels ? 'px-2' : 'px-3'}`}>
                    <button
                        onClick={() => { navigate('/settings'); if (isMobile) setIsMobileDrawerOpen(false); }}
                        title="Settings"
                        className={`w-full flex items-center gap-3 rounded-lg py-2 text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#94A3B8] transition-colors
                            ${isMobile ? 'min-h-[44px]' : ''}
                            ${!showLabels ? 'justify-center px-0' : 'px-2'}`}
                    >
                        <SettingsIcon size={16} className="shrink-0" />
                        {showLabels && <span className="text-sm font-medium">Settings</span>}
                    </button>

                    {/* Collapse toggle — desktop only */}
                    {!isMobile && (
                        <button
                            onClick={() => setIsSidebarCollapsed(!collapsed)}
                            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                            className={`w-full flex items-center rounded-lg py-2 text-slate-300 dark:text-[#475569] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-500 dark:hover:text-[#94A3B8] transition-colors
                                ${!showLabels ? 'justify-center px-0' : 'justify-end px-2'}`}
                        >
                            {collapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
                        </button>
                    )}
                </div>
            </div>
        </>
    );

    // ── Desktop: fixed sidebar (unchanged behaviour) ──────────────────────────
    if (!isMobile) {
        return (
            <nav
                data-tour="sidebar-nav"
                className={`${collapsed ? 'w-14' : 'w-52'} bg-white dark:bg-[#132338] border-r border-slate-200 dark:border-[#243A58] flex flex-col shrink-0 z-30 transition-all duration-300 print:hidden`}
            >
                {navContent(!collapsed)}
            </nav>
        );
    }

    // ── Mobile: drawer overlay ────────────────────────────────────────────────
    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 print:hidden
                    ${isMobileDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileDrawerOpen(false)}
                aria-hidden="true"
            />

            {/* Drawer panel */}
            <nav
                data-tour="sidebar-nav"
                className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#132338] border-r border-slate-200 dark:border-[#243A58] flex flex-col z-50 transition-transform duration-300 print:hidden
                    ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {navContent(true)}
            </nav>
        </>
    );
};
