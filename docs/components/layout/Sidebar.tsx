// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';

// Import icons commonly used
import {
    ActivityIcon, LayoutDashboardIcon, CalendarIcon, UsersIcon, BookOpenIcon,
    ZapIcon, BarChart3Icon, FileIcon, FlaskConicalIcon, PanelLeftIcon, PanelLeftCloseIcon
} from 'lucide-react';

export const Sidebar = () => {
    const navigate = useNavigate();
    const {
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        activeTab,
        setIsPerformanceLabOpen,
        setActiveAnalyticsModule,
        setActiveReport,
        setActiveConditioningModule
    } = useAppState();

    return (
        <nav className={`${isSidebarCollapsed ? 'w-24' : 'w-72'} bg-white border-r border-indigo-100 flex flex-col shrink-0 z-30 transition-all duration-300 shadow-sm print:hidden`}>
            <div className="p-8 flex items-center justify-between border-b border-indigo-50 min-h-[100px]">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-900 rounded-[1.25rem] flex items-center justify-center shadow-xl shrink-0">
                        <ActivityIcon className="text-white w-7 h-7" />
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col">
                            <span className="font-extrabold text-2xl tracking-tighter leading-none">
                                trainer<span className="text-indigo-600">OS</span>
                            </span>
                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">S&C Terminal</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 px-5 space-y-3 pt-10 overflow-y-auto no-scrollbar">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
                    { id: 'periodization', label: 'Planner', icon: CalendarIcon },
                    { id: 'clients', label: 'Roster', icon: UsersIcon },
                    { id: 'library', label: 'Exercise Library', icon: BookOpenIcon },
                    { id: 'conditioning', label: 'Conditioning Hub', icon: ZapIcon },
                    { id: 'analytics', label: 'Analytics Hub', icon: BarChart3Icon },
                    { id: 'reports', label: 'Reporting Hub', icon: FileIcon },
                    { id: 'lab', label: 'Performance Lab', icon: FlaskConicalIcon }
                ].map(item => (
                    <button key={item.id} onClick={() => {
                        if (item.id === 'lab') {
                            setIsPerformanceLabOpen(true);
                        } else {
                            navigate('/' + item.id);
                            setActiveAnalyticsModule(null);
                            setActiveReport(null);
                            if (item.id !== 'conditioning') setActiveConditioningModule(null);
                        }
                    }} title={isSidebarCollapsed ? item.label : ""}
                        className={`w-full flex items-center gap-5 px-5 py-4 rounded-[1.25rem] transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white font-bold shadow-2xl scale-[1.02]' : 'text-indigo-300 hover:text-indigo-900 hover:bg-indigo-50'}`}
                    >
                        <item.icon size={22} />{!isSidebarCollapsed && <span
                            className="text-[14px] uppercase tracking-wider font-bold">{item.label}</span>}
                    </button>
                ))}
            </div>
            <div className="p-5 border-t border-slate-100">
                <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"} className="w-full flex items-center justify-center py-4 rounded-[1.25rem] text-slate-400 hover:bg-slate-50 transition-all">
                    {isSidebarCollapsed ? <PanelLeftIcon size={22} /> : <PanelLeftCloseIcon size={22} />}
                </button>
            </div>
        </nav>
    );
};
