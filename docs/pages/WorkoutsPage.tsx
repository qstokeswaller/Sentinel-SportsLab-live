// @ts-nocheck
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    SearchIcon, PlusIcon, GridIcon, ListIcon,
} from 'lucide-react';

import { WorkoutProgramsPage } from './WorkoutProgramsPage';
import { WorkoutSessionsPage } from './WorkoutSessionsPage';
import { WeightroomSheetsPage } from './WeightroomSheetsPage';
import {
    WorkoutsLayoutProvider, useWorkoutsLayout, TAB_THEMES,
    type WorkoutsTabId,
} from '../context/WorkoutsLayoutContext';

// ── Path ⇄ tab mapping ──────────────────────────────────────────────────────
// Two legacy aliases (/workouts/sessions and /workouts/weightroom-sheets) are
// kept so existing deep links don't break.
function pathToTab(pathname: string): WorkoutsTabId {
    if (pathname.startsWith('/workouts/sheets') || pathname.startsWith('/workouts/weightroom-sheets')) return 'sheets';
    if (pathname.startsWith('/workouts/sessions') || pathname.startsWith('/workouts/packets'))         return 'packets';
    return 'programs';
}

// Kept as a thin re-export only for any legacy imports — the layout now owns the tab bar.
// (After the refactor below none of the three pages import this; safe to delete in a future cleanup.)
export const WorkoutsTabsBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = pathToTab(location.pathname);
    return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0F1C30] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
            {(Object.values(TAB_THEMES) as any[]).map(theme => {
                const Icon = theme.icon;
                const isActive = activeTab === theme.id;
                return (
                    <button
                        key={theme.id}
                        onClick={() => navigate(theme.path)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            isActive
                                ? `${theme.activeTabBg} text-white shadow-sm`
                                : 'text-slate-600 dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#1A2D48] hover:text-slate-900 dark:hover:text-[#E2E8F0]'
                        }`}
                    >
                        <Icon size={13} />
                        {theme.label}
                    </button>
                );
            })}
        </div>
    );
};

// ── Persistent shell header ─────────────────────────────────────────────────
// Stays mounted across tab switches. Only the title text, search placeholder,
// theme colour and Create label change per tab — positions never move.
const ShellHeader = () => {
    const navigate = useNavigate();
    const {
        activeTab, theme,
        search, setSearch,
        view, setView,
        fireCreate,
    } = useWorkoutsLayout();
    const Icon = theme.icon;

    return (
        <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
            {/* Row 1 — title (left)  ·  flex spacer (empty middle)  ·  search + view + create (right cluster).
                Search is anchored next to the actions on the right; the middle is intentionally empty
                because workout/packet/sheet names are short and a long search input wasted space. */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 shrink-0 min-w-0">
                    <div className={`w-9 h-9 ${theme.iconBg} rounded-lg flex items-center justify-center shrink-0 transition-colors`}>
                        <Icon size={18} className="text-white" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0] truncate leading-tight">{theme.title}</h2>
                        <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5 truncate">{theme.description}</p>
                    </div>
                </div>

                <div className="flex-1" />

                <div className="relative w-64 shrink-0">
                    <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#CBD5E1]" />
                    <input
                        type="text"
                        placeholder={theme.searchPlaceholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-sm text-slate-800 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none ${theme.searchFocusBorder} focus:ring-2 ${theme.searchFocusRing} transition-colors`}
                    />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {theme.showViewToggle && (
                        <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#1A2D48] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58]">
                            <button
                                onClick={() => setView('list')}
                                title="List view"
                                className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}
                            >
                                <ListIcon size={13} />
                            </button>
                            <button
                                onClick={() => setView('grid')}
                                title="Grid view"
                                className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}
                            >
                                <GridIcon size={13} />
                            </button>
                        </div>
                    )}
                    <button
                        onClick={fireCreate}
                        className={`flex items-center gap-1.5 px-3 py-2 ${theme.createBtnBg} ${theme.createBtnHover} text-white rounded-lg text-xs font-semibold transition-all shadow-sm`}
                    >
                        <PlusIcon size={13} /> {theme.createLabel}
                    </button>
                </div>
            </div>

            {/* Row 2 — top-level tabs, left-aligned under the title */}
            <div className="flex items-center gap-1 mt-3 bg-slate-100 dark:bg-[#0F1C30] p-0.5 rounded-lg border border-slate-200 dark:border-[#243A58] w-fit">
                {(Object.values(TAB_THEMES) as any[]).map(t => {
                    const TIcon = t.icon;
                    const isActive = activeTab === t.id;
                    return (
                        <button
                            key={t.id}
                            onClick={() => navigate(t.path)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                isActive
                                    ? `${t.activeTabBg} text-white shadow-sm`
                                    : 'text-slate-600 dark:text-[#CBD5E1] hover:bg-white dark:hover:bg-[#1A2D48] hover:text-slate-900 dark:hover:text-[#E2E8F0]'
                            }`}
                        >
                            <TIcon size={13} />
                            {t.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ── Overview tile (top-right corner, height-matched to the shell header) ────
// h-full + internal flex-col makes the tile stretch to the header's height
// when both live in a `flex items-stretch` row. Each stat row uses flex-1 so
// the available vertical space is distributed evenly instead of pooling at the bottom.

const OverviewTile = ({ rows }: { rows: { label: string; value: number | string; hint?: string }[] }) => (
    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden w-full h-full flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1A2D48] shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Overview</span>
        </div>
        <div className="flex-1 flex flex-col divide-y divide-slate-100 dark:divide-[#1A2D48]">
            {rows.map(row => (
                <div key={row.label} className="flex-1 flex items-center justify-between px-4 py-2.5">
                    <span className="text-xs text-slate-500 dark:text-[#CBD5E1]" title={row.hint}>{row.label}</span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-[#E2E8F0]">{row.value}</span>
                </div>
            ))}
        </div>
    </div>
);

// ── Shell + child mounting ──────────────────────────────────────────────────
// Layout: left column = header (top) + page main content (below);
//         right column = overview tile (top, aligned with header) + page sidebar extras (below).

const Shell = () => {
    const location = useLocation();
    const activeTab = pathToTab(location.pathname);
    const { hideShell, overviewRows, sidebarExtra } = useWorkoutsLayout();

    // The tree shape stays constant whether the shell is shown or hidden — we toggle
    // visibility via the `hidden` Tailwind class instead of conditional rendering. This
    // prevents React from unmounting/remounting the page component when a page enters
    // its fullscreen builder (e.g., Sheets / Programs builders), which previously caused
    // the page to lose its local state and oscillate between modes (the flicker bug).
    // Library-style fixed-viewport layout: the shell occupies the available main-area height
    // and never overflows the page. Internal scrolling happens INSIDE the list (left) and INSIDE
    // the descriptor's body (right) — so the user never has to scroll the whole page.
    // Matches the ExerciseLibraryPage outer wrapper exactly so the list bottoms align across pages.
    return (
        <div className="animate-in fade-in duration-300 h-[calc(100vh-40px)] flex flex-col gap-4">
            {/* Top row — header (left) + Overview tile (right), height-matched via `items-stretch` */}
            <div className={hideShell ? 'hidden' : 'flex items-stretch gap-5 shrink-0'}>
                <div className="flex-1 min-w-0">
                    <ShellHeader />
                </div>
                <div className="w-80 shrink-0 flex">
                    {overviewRows.length > 0 && <OverviewTile rows={overviewRows} />}
                </div>
            </div>

            {/* Body row — page main content (left) + sidebar extras (right).
                Both columns share the same row height (via items-stretch on the row + min-h-0
                so flex children can shrink). Internal scrolling lives inside each column. */}
            <div className="flex items-stretch gap-5 flex-1 min-h-0">
                <div className="flex-1 min-w-0 min-h-0 flex flex-col">
                    {activeTab === 'programs' && <WorkoutProgramsPage />}
                    {activeTab === 'packets'  && <WorkoutSessionsPage />}
                    {activeTab === 'sheets'   && <WeightroomSheetsPage />}
                </div>
                <div className={hideShell ? 'hidden' : 'w-80 shrink-0 min-h-0 flex flex-col gap-4'}>
                    {sidebarExtra}
                </div>
            </div>
        </div>
    );
};

export const WorkoutsPage = () => {
    const location = useLocation();
    const activeTab = pathToTab(location.pathname);
    // Remember which Workouts tab the user was on most recently so deep builders (Packets, etc.)
    // can fall back to the right tab when a navigation didn't pass an explicit returnTo.
    useEffect(() => {
        try { sessionStorage.setItem('sentinel:lastWorkoutsTab', location.pathname); } catch {}
    }, [location.pathname]);
    return (
        <WorkoutsLayoutProvider activeTab={activeTab}>
            <Shell />
        </WorkoutsLayoutProvider>
    );
};
