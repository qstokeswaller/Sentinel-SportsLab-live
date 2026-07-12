import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';
import { useAuth } from '../../context/AuthContext';
import { useIsMobile } from '../../hooks/useIsMobile';
import { hasFeatureAccess, requiredTierFor, TIER_LABEL, type Feature } from '../../utils/tierFeatures';
import { UpgradePromptModal } from '../tier/UpgradePromptModal';

import {
    ActivityIcon, LayoutDashboardIcon, CalendarIcon, UsersIcon, BookOpenIcon, DumbbellIcon,
    ZapIcon, BarChart3Icon, FileIcon, FlaskConicalIcon, ChevronLeftIcon, ChevronRightIcon,
    SettingsIcon, HeartPulseIcon, ClipboardListIcon, XIcon, LockIcon
} from 'lucide-react';

// Each nav item declares a `feature` key from utils/tierFeatures so the sidebar can
// render locked rows for tiers that don't include it.
// Ordering: foundational pages first (dashboard → library), then hubs grouped by
// daily workflow (Conditioning → Wellness → Testing) before analysis-layer hubs
// (Reporting → Analytics → Performance Lab).
const NAV_ITEMS: { id: string; label: string; icon: any; feature: Feature }[] = [
    { id: 'dashboard',     label: 'Dashboard',        icon: LayoutDashboardIcon, feature: 'dashboard' },
    { id: 'periodization', label: 'Planner',          icon: CalendarIcon,        feature: 'planner' },
    { id: 'clients',       label: 'Roster',           icon: UsersIcon,           feature: 'roster' },
    { id: 'workouts',      label: 'Workouts',         icon: DumbbellIcon,        feature: 'workouts' },
    { id: 'library',       label: 'Library',          icon: BookOpenIcon,        feature: 'library' },
    { id: 'conditioning',  label: 'Conditioning',     icon: ZapIcon,             feature: 'conditioning' },
    { id: 'wellness',      label: 'Wellness',         icon: HeartPulseIcon,      feature: 'wellness' },
    { id: 'testing',       label: 'Testing',          icon: ClipboardListIcon,   feature: 'testing' },
    { id: 'reports',       label: 'Reporting',        icon: FileIcon,            feature: 'reporting' },
    { id: 'analytics',     label: 'Analytics',        icon: BarChart3Icon,       feature: 'analytics' },
    { id: 'lab',           label: 'Performance Lab',  icon: FlaskConicalIcon,    feature: 'lab' },
];

export const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const isSettingsActive = location.pathname.startsWith('/settings');
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
        setActiveConditioningModule,
        currentOrg,
        isOrgAdmin,
        orgLoading,
    } = useAppState();

    const collapsed = isSidebarCollapsed;
    const displayName = user?.user_metadata?.full_name || user?.email || '';
    const userInitial = displayName[0]?.toUpperCase() ?? '?';

    // Tier gating — if the current org's tier doesn't unlock a nav feature, render it
    // locked and open the upgrade modal on click instead of navigating. Until the
    // org's tier has actually loaded, render everything as unlocked: a freshly-
    // signed-in member who hasn't had `currentOrg` populated yet would otherwise
    // see every hub flash as "locked" (this caused real reports of dashboards
    // appearing inaccessible right after invite acceptance).
    const currentTier = currentOrg?.tier || null;
    const tierResolved = !orgLoading && !!currentOrg;
    const [upgradePrompt, setUpgradePrompt] = useState<{ feature: Feature; tier: any } | null>(null);

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
        // If the user's tier doesn't unlock this feature, open the upgrade modal
        // instead of routing — avoids broken landing pages and surfaces the upsell.
        // Skip this gate entirely until org info has resolved (otherwise an org
        // member sees their own dashboard nav-click open the upgrade prompt
        // during the bootstrap second).
        if (tierResolved && !hasFeatureAccess(currentTier, item.feature)) {
            setUpgradePrompt({ feature: item.feature, tier: requiredTierFor(item.feature) });
            return;
        }
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
            <div className={`flex items-center gap-2.5 border-b border-slate-100 dark:border-[#243A58] shrink-0 ${!showLabels ? 'justify-center px-3 py-3.5' : 'px-4 py-3.5'}`}>
                <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-9 w-auto shrink-0 select-none" />
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
                        // Only show locked state once we know the user's tier — otherwise
                        // freshly-authed members see every hub flash as "locked" until
                        // currentOrg.tier loads from the server.
                        const locked = tierResolved && !hasFeatureAccess(currentTier, item.feature);
                        const lockedTitle = locked
                            ? `${item.label} — ${TIER_LABEL[requiredTierFor(item.feature)]} only`
                            : item.label;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavClick(item)}
                                title={!showLabels ? lockedTitle : ''}
                                aria-disabled={locked}
                                className={`w-full flex items-center gap-3 rounded-lg transition-colors
                                    ${isMobile ? 'min-h-[44px]' : ''}
                                    ${!showLabels ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'}
                                    ${isActive && !locked
                                        ? 'bg-indigo-600 text-white'
                                        : locked
                                            ? 'text-slate-300 dark:text-[#475569] hover:bg-slate-50 dark:hover:bg-[#1A2D48]/40 cursor-pointer'
                                            : 'text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-900 dark:hover:text-[#E2E8F0]'
                                    }`}
                            >
                                <item.icon size={18} className="shrink-0" />
                                {showLabels && (
                                    <>
                                        <span className="text-sm font-medium truncate flex-1 text-left">{item.label}</span>
                                        {locked && (
                                            <span className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#475569] shrink-0">
                                                <LockIcon size={10} />
                                                {TIER_LABEL[requiredTierFor(item.feature)]}
                                            </span>
                                        )}
                                    </>
                                )}
                                {!showLabels && locked && (
                                    <LockIcon size={9} className="shrink-0 absolute right-1 top-1 text-slate-300 dark:text-[#475569]" />
                                )}
                            </button>
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
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] truncate flex items-center gap-1.5">
                                <span className="truncate">{displayName}</span>
                                {isOrgAdmin && (
                                    <span title="Organisation admin"
                                        className="shrink-0 text-[8.5px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">
                                        Admin
                                    </span>
                                )}
                            </p>
                            {currentOrg?.name && (
                                <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] truncate mt-0.5">
                                    {currentOrg.name}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className={`py-2 space-y-0.5 ${!showLabels ? 'px-2' : 'px-3'}`}>
                    <button
                        data-tour="settings-button"
                        onClick={() => { navigate('/settings'); if (isMobile) setIsMobileDrawerOpen(false); }}
                        title="Settings"
                        className={`w-full flex items-center gap-3 rounded-lg py-2 transition-colors
                            ${isMobile ? 'min-h-[44px]' : ''}
                            ${!showLabels ? 'justify-center px-0' : 'px-2'}
                            ${isSettingsActive
                                ? 'bg-indigo-600 text-white'
                                : 'text-slate-400 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] hover:text-slate-700 dark:hover:text-[#94A3B8]'
                            }`}
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

    const upgradeModal = (
        <UpgradePromptModal
            isOpen={!!upgradePrompt}
            onClose={() => setUpgradePrompt(null)}
            feature={upgradePrompt?.feature ?? null}
            requiredTier={upgradePrompt?.tier ?? null}
            currentTier={currentTier}
        />
    );

    // ── Desktop: fixed sidebar (unchanged behaviour) ──────────────────────────
    if (!isMobile) {
        return (
            <>
                <nav
                    data-tour="sidebar-nav"
                    className={`${collapsed ? 'w-14' : 'w-52'} bg-white dark:bg-[#132338] border-r border-slate-200 dark:border-[#243A58] flex flex-col shrink-0 transition-all duration-300 print:hidden`}
                >
                    {navContent(!collapsed)}
                </nav>
                {upgradeModal}
            </>
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
            {upgradeModal}
        </>
    );
};
