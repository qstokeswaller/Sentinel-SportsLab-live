// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';

import {
    ActivityIcon, LayoutDashboardIcon, CalendarIcon, UsersIcon, BookOpenIcon,
    ZapIcon, BarChart3Icon, FileIcon, FlaskConicalIcon, ChevronLeftIcon, ChevronRightIcon,
    SettingsIcon
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboardIcon },
    { id: 'periodization', label: 'Planner',           icon: CalendarIcon },
    { id: 'clients',       label: 'Roster',            icon: UsersIcon },
    { id: 'library',       label: 'Exercise Library',  icon: BookOpenIcon },
    { id: 'conditioning',  label: 'Conditioning Hub',  icon: ZapIcon },
    { id: 'analytics',     label: 'Analytics Hub',     icon: BarChart3Icon },
    { id: 'reports',       label: 'Reporting Hub',     icon: FileIcon },
    { id: 'lab',           label: 'Performance Lab',   icon: FlaskConicalIcon },
];

export const Sidebar = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        activeTab,
        setIsPerformanceLabOpen,
        setActiveAnalyticsModule,
        setActiveReport,
        setActiveConditioningModule
    } = useAppState();

    const collapsed = isSidebarCollapsed;
    const displayName = user?.user_metadata?.full_name || user?.email || '';
    const userInitial = displayName[0]?.toUpperCase() ?? '?';

    return (
        <nav className={`${collapsed ? 'w-16' : 'w-60'} bg-white border-r border-slate-200 flex flex-col shrink-0 z-30 transition-all duration-300 print:hidden`}>

            {/* Logo */}
            <div className={`flex items-center gap-3 border-b border-slate-100 shrink-0 ${collapsed ? 'justify-center px-3 py-5' : 'px-4 py-5'}`}>
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                    <ActivityIcon className="text-white w-4 h-4" />
                </div>
                {!collapsed && (
                    <div className="flex flex-col min-w-0">
                        <span className="font-bold text-sm text-slate-900 leading-tight">
                            trainer<span className="text-indigo-600">OS</span>
                        </span>
                        <span className="text-[10px] text-slate-400 leading-tight">S&C Platform</span>
                    </div>
                )}
            </div>

            {/* Nav Items */}
            <div className={`flex-1 py-3 overflow-y-auto no-scrollbar ${collapsed ? 'px-2' : 'px-3'}`}>
                <div className="space-y-0.5">
                    {NAV_ITEMS.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.id === 'lab') {
                                        setIsPerformanceLabOpen(true);
                                    } else {
                                        navigate('/' + item.id);
                                        setActiveAnalyticsModule(null);
                                        setActiveReport(null);
                                        if (item.id !== 'conditioning') setActiveConditioningModule(null);
                                    }
                                }}
                                title={collapsed ? item.label : ''}
                                className={`w-full flex items-center gap-3 rounded-lg transition-colors
                                    ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                                    ${isActive
                                        ? 'bg-indigo-600 text-white'
                                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon size={18} className="shrink-0" />
                                {!collapsed && (
                                    <span className="text-sm font-medium truncate">{item.label}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Bottom: User + Settings + Sign Out + Collapse */}
            <div className="border-t border-slate-100 shrink-0">
                {/* User profile strip */}
                <div className={`flex items-center gap-2.5 px-3 py-3 border-b border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-semibold text-indigo-600">{userInitial}</span>
                    </div>
                    {!collapsed && (
                        <p className="text-xs font-medium text-slate-600 truncate flex-1 min-w-0">{displayName}</p>
                    )}
                </div>

                <div className={`py-2 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
                    <button
                        onClick={() => navigate('/settings')}
                        title="Settings"
                        className={`w-full flex items-center gap-3 rounded-lg py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors
                            ${collapsed ? 'justify-center px-0' : 'px-2'}`}
                    >
                        <SettingsIcon size={16} className="shrink-0" />
                        {!collapsed && <span className="text-sm font-medium">Settings</span>}
                    </button>

                    <button
                        onClick={() => setIsSidebarCollapsed(!collapsed)}
                        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        className={`w-full flex items-center rounded-lg py-2 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors
                            ${collapsed ? 'justify-center px-0' : 'justify-end px-2'}`}
                    >
                        {collapsed ? <ChevronRightIcon size={14} /> : <ChevronLeftIcon size={14} />}
                    </button>
                </div>
            </div>
        </nav>
    );
};
