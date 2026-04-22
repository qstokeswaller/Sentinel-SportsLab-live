// @ts-nocheck
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';

import {
    ActivityIcon, LayoutDashboardIcon, CalendarIcon, UsersIcon, BookOpenIcon, DumbbellIcon,
    ZapIcon, BarChart3Icon, FileIcon, FlaskConicalIcon, ChevronLeftIcon, ChevronRightIcon,
    SettingsIcon, HeartPulseIcon, ClipboardListIcon, XIcon
} from 'lucide-react';

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
            <div className={`flex items-center gap-3 border-b border-slate-100 shrink-0 ${!showLabels ? 'justify-center px-3 py-5' : 'px-4 py-5'}`}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <ActivityIcon className="text-white w-4 h-4" />
                </div>
                {showLabels && (
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-slate-900 leading-tight">
                            Sentinel <span className="text-indigo-600">SportsLab</span>
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">Athlete Monitoring</span>
                        <span className="text-[10px] text-slate-400 leading-tight">& Performance Intelligence</span>
                    </div>
                )}
                {/* Mobile: close button in logo row */}
                {isMobile && (
                    <button
                        onClick={() => setIsMobileDrawerOpen(false)}
                        className="ml-auto p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
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
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item)}
                                title={!showLabels ? item.label : ''}
                                className={`w-full flex items-center gap-3 rounded-lg transition-colors
                                    ${isMobile ? 'min-h-[44px]' : ''}
                                    ${!showLabels ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                                    ${isActive
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon size={18} className="shrink-0" />
                                {showLabels && (
                                    <span className="text-sm font-medium truncate">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom: User + Settings + Collapse */}
            <div className="border-t border-slate-100 shrink-0">
                <div className={`flex items-center gap-2.5 px-3 py-3 border-b border-slate-100 ${!showLabels ? 'justify-center' : ''}`}>
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">{userInitial}</span>
                    </div>
                    {showLabels && (
                        <p className="text-xs font-medium text-slate-600 truncate flex-1 min-w-0">{displayName}</p>
                    )}
                </div>

                <div className={`py-2 space-y-0.5 ${!showLabels ? 'px-2' : 'px-3'}`}>
                    <button
                        onClick={() => { navigate('/settings'); if (isMobile) setIsMobileDrawerOpen(false); }}
                        title="Settings"
                        className={`w-full flex items-center gap-3 rounded-lg py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors
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
                            className={`w-full flex items-center rounded-lg py-2 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors
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
                className={`${collapsed ? 'w-16' : 'w-60'} bg-white border-r border-slate-200 flex flex-col shrink-0 z-30 transition-all duration-300 print:hidden`}
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
                className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 flex flex-col z-50 transition-transform duration-300 print:hidden
                    ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {navContent(true)}
            </nav>
        </>
    );
};
