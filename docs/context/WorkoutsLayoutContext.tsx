import React, {
    createContext, useContext, useState, useRef, useCallback, useEffect, useMemo,
    type ReactNode,
} from 'react';
import { LayersIcon, PackageIcon, PrinterIcon } from 'lucide-react';

export type OverviewRow = { label: string; value: number | string; hint?: string };

// ── Theme registry ──────────────────────────────────────────────────────────
// One source of truth for the visible identity of each Workouts sub-page.
// The shell (WorkoutsPage) reads `TAB_THEMES[activeTab]` to render the header,
// the active-tab indicator, and the Create button consistently per tab.

export type WorkoutsTabId = 'programs' | 'packets' | 'sheets';

export type WorkoutsTabTheme = {
    id: WorkoutsTabId;
    label: string;             // tab label
    title: string;             // page H2
    description: string;       // page H2 subtitle
    icon: any;                 // lucide icon component
    path: string;              // canonical route
    // visual identity — Tailwind class fragments
    iconBg: string;            // small icon square in header
    activeTabBg: string;       // background of selected tab in tab bar
    createBtnBg: string;
    createBtnHover: string;
    searchFocusBorder: string;
    searchFocusRing: string;
    // copy
    createLabel: string;
    searchPlaceholder: string;
    // behavior
    showViewToggle: boolean;
};

export const TAB_THEMES: Record<WorkoutsTabId, WorkoutsTabTheme> = {
    programs: {
        id: 'programs',
        label: 'Programs',
        title: 'Programs',
        description: 'Build, manage and periodize long-term training programs',
        icon: LayersIcon,
        path: '/workouts/programs',
        iconBg: 'bg-indigo-600',
        activeTabBg: 'bg-indigo-600',
        createBtnBg: 'bg-indigo-600',
        createBtnHover: 'hover:bg-indigo-500',
        searchFocusBorder: 'focus:border-indigo-400',
        searchFocusRing: 'focus:ring-indigo-500/10',
        createLabel: 'Create Program',
        searchPlaceholder: 'Search programs...',
        showViewToggle: true,
    },
    packets: {
        id: 'packets',
        label: 'Packets',
        title: 'Packets',
        description: 'Saved workout packets — assign & schedule to athletes',
        icon: PackageIcon,
        path: '/workouts/sessions',
        iconBg: 'bg-emerald-600',
        activeTabBg: 'bg-emerald-600',
        createBtnBg: 'bg-emerald-600',
        createBtnHover: 'hover:bg-emerald-500',
        searchFocusBorder: 'focus:border-emerald-400',
        searchFocusRing: 'focus:ring-emerald-500/10',
        createLabel: 'Create Packet',
        searchPlaceholder: 'Search packets...',
        showViewToggle: true,
    },
    sheets: {
        id: 'sheets',
        label: 'Sheets',
        title: 'Sheets',
        description: 'Saved weightroom sheets — load, print and reuse with any squad',
        icon: PrinterIcon,
        path: '/workouts/sheets',
        iconBg: 'bg-teal-500',
        activeTabBg: 'bg-teal-500',
        createBtnBg: 'bg-teal-500',
        createBtnHover: 'hover:bg-teal-400',
        searchFocusBorder: 'focus:border-teal-400',
        searchFocusRing: 'focus:ring-teal-500/10',
        createLabel: 'Create Sheet',
        searchPlaceholder: 'Search sheets...',
        showViewToggle: true,
    },
};

// ── Context ────────────────────────────────────────────────────────────────

type Ctx = {
    activeTab: WorkoutsTabId;
    theme: WorkoutsTabTheme;
    // Per-tab search — automatically reset on tab change so each page starts clean
    search: string;
    setSearch: (v: string) => void;
    // Shared view mode (grid/list)
    view: 'grid' | 'list';
    setView: (v: 'grid' | 'list') => void;
    // Whether the shell renders the header — pages can hide it when they enter a full-screen builder
    hideShell: boolean;
    setHideShell: (v: boolean) => void;
    // Pages register their "Create" handler on mount; the shell's Create button fires it
    registerCreate: (handler: () => void) => () => void;
    fireCreate: () => void;
    // Top-right Overview tile (Total + Drafts) — sits next to the header at the same height
    overviewRows: OverviewRow[];
    setOverviewRows: (rows: OverviewRow[]) => void;
    // Anything the page wants in the sidebar BELOW the Overview tile (Most Assigned, Phase Distribution, …)
    sidebarExtra: ReactNode;
    setSidebarExtra: (node: ReactNode) => void;
};

const WorkoutsLayoutContext = createContext<Ctx | null>(null);

export const useWorkoutsLayout = (): Ctx => {
    const ctx = useContext(WorkoutsLayoutContext);
    if (!ctx) throw new Error('useWorkoutsLayout must be used within <WorkoutsLayoutProvider>');
    return ctx;
};

export const WorkoutsLayoutProvider = ({
    activeTab,
    children,
}: { activeTab: WorkoutsTabId; children: ReactNode }) => {
    const [search, setSearchInternal] = useState('');
    const [view, setView] = useState<'grid' | 'list'>('list');
    const [hideShell, setHideShell] = useState(false);
    const [overviewRows, setOverviewRows] = useState<OverviewRow[]>([]);
    const [sidebarExtra, setSidebarExtra] = useState<ReactNode>(null);
    const createHandlerRef = useRef<(() => void) | null>(null);

    // Reset transient per-tab state when switching tabs so the shell starts clean.
    // NOTE: `overviewRows`, `sidebarExtra`, AND `createHandlerRef` are NOT cleared here
    // on purpose. Each page sets them via a useLayoutEffect / useEffect and clears them
    // via its cleanup. If we cleared them here too, this parent effect would fire AFTER
    // the child's setup (React runs child effects before parent effects) and wipe out
    // the just-registered values — making the tiles invisible and the Create button no-op.
    useEffect(() => {
        setSearchInternal('');
        setHideShell(false);
    }, [activeTab]);

    const setSearch = useCallback((v: string) => setSearchInternal(v), []);

    const registerCreate = useCallback((handler: () => void) => {
        createHandlerRef.current = handler;
        return () => {
            if (createHandlerRef.current === handler) createHandlerRef.current = null;
        };
    }, []);

    const fireCreate = useCallback(() => {
        createHandlerRef.current?.();
    }, []);

    const theme = TAB_THEMES[activeTab];

    const value = useMemo<Ctx>(() => ({
        activeTab, theme,
        search, setSearch,
        view, setView,
        hideShell, setHideShell,
        registerCreate, fireCreate,
        overviewRows, setOverviewRows,
        sidebarExtra, setSidebarExtra,
    }), [activeTab, theme, search, setSearch, view, hideShell, registerCreate, fireCreate, overviewRows, sidebarExtra]);

    return (
        <WorkoutsLayoutContext.Provider value={value}>
            {children}
        </WorkoutsLayoutContext.Provider>
    );
};
