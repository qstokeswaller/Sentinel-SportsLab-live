// @ts-nocheck
import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { useWorkoutsLayout } from '../context/WorkoutsLayoutContext';
import { WEIGHTROOM_1RM_EXERCISES } from '../utils/constants';
import { buildMaxLookup, getSheetCellValue, roundTo2_5, printSheet } from '../utils/weightroomUtils';
import { CustomSelect } from '../components/ui/CustomSelect';
import {
    useWeightroomSheets, useCreateSheet, useUpdateSheet, useDeleteSheet,
    type WeightroomSheet,
} from '../hooks/useWeightroomSheets';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { OwnershipFilter, matchesOwnershipScope, type OwnershipScope } from '../components/tier/OwnershipFilter';
import { CreatorBadge } from '../components/tier/CreatorBadge';
import { ShareToOrgToggle } from '../components/tier/ShareToOrgToggle';
import { useAuth } from '../context/AuthContext';
import { fuzzySearch } from '../utils/fuzzySearch';
import {
    ArrowLeft as ArrowLeftIcon,
    Printer as PrinterIcon,
    Plus as PlusIcon,
    Trash2 as Trash2Icon,
    Save as SaveIcon,
    Pencil as PencilIcon,
    Link2 as LinkIcon,
    ChevronRight as ChevronRightIcon,
    Eye as EyeIcon,
    SlidersHorizontal as SlidersHorizontalIcon,
    X as XIcon,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const WS_MODES = [
    { id: 'blank', label: 'Blank Form' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'labeled', label: 'Labeled' },
    { id: 'empty-header', label: 'Empty Header' },
];

// Special sentinel for the Target Squad selector. Picking this leaves the athlete
// rows blank for handwriting — useful for printable templates that aren't tied to
// any squad. We store this string in `team_id` (text column) rather than NULL so it
// stays distinct from "All Athletes" (which prints every athlete across every team).
const BLANK_TEAM_ID = '__BLANK__';
const BLANK_ROW_COUNT = 18;   // how many empty name rows to print in handwritten mode

const tempColumnId = () => 'c' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

const defaultColumns = () => [
    { id: 'c1', label: 'Exercise 1', exerciseId: '', percentage: 100 },
    { id: 'c2', label: 'Exercise 2', exerciseId: '', percentage: 100 },
    { id: 'c3', label: 'Exercise 3', exerciseId: '', percentage: 100 },
];

// Short, compact source-line formatter — used in both card + row variants.
// Returns null when there's no packet provenance, so callers can skip rendering.
function formatSourceLine(src?: { packetName?: string; sessionDate?: string | null } | null): string | null {
    if (!src?.packetName) return null;
    if (!src.sessionDate) return src.packetName;
    const d = new Date(src.sessionDate);
    if (Number.isNaN(d.getTime())) return src.packetName;
    return `${src.packetName} · ${d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
}

// ── Page Component ───────────────────────────────────────────────────────────

export const WeightroomSheetsPage = () => {
    const navigate = useNavigate();
    const { teams, exercises, maxHistory, isLoading, scheduledSessions, showToast } = useAppState();
    const { data: savedSheets = [] } = useWeightroomSheets();
    const createSheet = useCreateSheet();
    const updateSheet = useUpdateSheet();
    const deleteSheet = useDeleteSheet();

    // ── Mode + currently-loaded sheet ──────────────────────────────────────
    // 'list' = saved sheets table; 'builder' = active build/edit UI
    const [mode, setMode] = useState<'list' | 'builder'>('list');
    const [editingSheetId, setEditingSheetId] = useState<string | null>(null);
    const [sheetName, setSheetName] = useState('');
    const [sheetVisibility, setSheetVisibility] = useState<'personal' | 'org'>('personal');
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    // Selected sheet drives the right-rail descriptor (Library-style master-detail).
    const [selectedSheet, setSelectedSheet] = useState<WeightroomSheet | null>(null);
    // Popover filters — Mode + Target + Source. 'All' on each axis = no constraint.
    const [modeFilter, setModeFilter] = useState<string>('All');
    const [targetFilter, setTargetFilter] = useState<string>('All');   // 'All' | team_id | '__BLANK__' | '__STANDALONE__'
    const [sourceFilter, setSourceFilter] = useState<'All' | 'Standalone' | 'FromPacket'>('All');
    const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
    const filterPopoverRef = useRef<HTMLDivElement | null>(null);
    const [ownershipScope, setOwnershipScope] = useState<OwnershipScope>('all');
    const { user: authUser } = useAuth();
    // search + view live in the Workouts shell layout (persistent across tab switches).
    // The shell's "Create Sheet" button opens our local builder via registerCreate.
    const { search, setSearch, view, registerCreate, setHideShell, setOverviewRows, setSidebarExtra } = useWorkoutsLayout();

    // ── Builder state ──────────────────────────────────────────────────────
    const [wrSelectedTeam, setWrSelectedTeam] = useState('All');
    const [wsMode, setWsMode] = useState('blank');
    const [wsColumns, setWsColumns] = useState(defaultColumns);
    const [wsOrientation, setWsOrientation] = useState('portrait');

    // Derived: drafts = sheets created but never used in a packet (heuristic: not referenced by scheduled session's weightroom attach)
    // For simplicity here: a sheet is a draft if it was created in the last 7 days AND name still contains 'Untitled' or 'Draft'.
    // Wire this later when sessions persist a sheet reference; for now report blanks as drafts.
    const sidebarStats = useMemo(() => {
        const total = savedSheets.length;
        const drafts = savedSheets.filter(s => !s.name || s.name.toLowerCase().startsWith('untitled')).length;
        return { total, drafts };
    }, [savedSheets]);

    // Search uses fuzzySearch — exact-substring first (so typing narrows
    // progressively), then per-word trigram fallback for typo tolerance.
    // Matches against sheet name + mode + any saved column labels.
    const sheetsSearch = useMemo(
        () => fuzzySearch(
            savedSheets,
            search,
            (s: any) => [s.name, s.ws_mode || '', ...(s.columns?.map((c: any) => c.label || c.exerciseId) || [])].join(' '),
            (s: any) => s.name,
        ),
        [savedSheets, search]
    );

    const filteredSheets = useMemo(() => {
        let list = sheetsSearch.results;
        if (modeFilter !== 'All') list = list.filter(s => s.ws_mode === modeFilter);
        if (targetFilter !== 'All') {
            list = list.filter(s => {
                if (targetFilter === '__BLANK__') return s.team_id === BLANK_TEAM_ID;
                if (targetFilter === '__STANDALONE__') return s.team_id == null || s.team_id === '';
                return s.team_id === targetFilter;
            });
        }
        if (sourceFilter !== 'All') {
            list = list.filter(s => {
                if (sourceFilter === 'Standalone') return !s.source_context;
                if (sourceFilter === 'FromPacket') return !!s.source_context;
                return true;
            });
        }
        if (ownershipScope !== 'all') {
            list = list.filter(s => matchesOwnershipScope(s as any, ownershipScope, authUser?.id));
        }
        return list;
    }, [savedSheets, search, modeFilter, targetFilter, sourceFilter, ownershipScope, authUser?.id]);

    // Build a unique team list from the sheets themselves so the dropdown only shows teams in use
    const sheetTeamOptions = useMemo(() => {
        const seen: Record<string, string> = {};
        savedSheets.forEach(s => {
            if (!s.team_id || s.team_id === BLANK_TEAM_ID) return;
            if (seen[s.team_id]) return;
            seen[s.team_id] = teams.find((t: any) => t.id === s.team_id)?.name || s.team_id;
        });
        return Object.entries(seen)
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [savedSheets, teams]);

    const activeFilterCount =
        (modeFilter !== 'All' ? 1 : 0) +
        (targetFilter !== 'All' ? 1 : 0) +
        (sourceFilter !== 'All' ? 1 : 0);

    const clearAllFilters = () => {
        setModeFilter('All');
        setTargetFilter('All');
        setSourceFilter('All');
    };

    useEffect(() => {
        if (!filterPopoverOpen) return;
        const onDocClick = (e: MouseEvent) => {
            if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
                setFilterPopoverOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [filterPopoverOpen]);

    const athletes = useMemo(() => {
        // Blank/handwritten sheet — render a fixed number of empty rows for hand-filling
        if (wrSelectedTeam === BLANK_TEAM_ID) {
            return Array.from({ length: BLANK_ROW_COUNT }, (_, i) => ({ id: `__blank_${i}`, name: '' }));
        }
        const list = wrSelectedTeam === 'All'
            ? teams.flatMap(t => t.players || [])
            : (teams.find(t => t.id === wrSelectedTeam)?.players || []);
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }, [teams, wrSelectedTeam]);

    const maxLookup = useMemo(() => buildMaxLookup(maxHistory), [maxHistory]);

    const trackableExercises = useMemo(() =>
        WEIGHTROOM_1RM_EXERCISES.map(name => ({ id: name, name })),
        []
    );

    // ── Mode transitions ─────────────────────────────────────────────────
    const openNewSheet = () => {
        setEditingSheetId(null);
        setSheetName('');
        setWrSelectedTeam('All');
        setWsMode('blank');
        setWsColumns(defaultColumns());
        setWsOrientation('portrait');
        setMode('builder');
    };

    // Wire the shell's "Create Sheet" button to our local builder
    useEffect(() => {
        return registerCreate(() => openNewSheet());
    }, [registerCreate]);

    // Hide the shell header when the builder takes over the canvas
    useEffect(() => {
        setHideShell(mode === 'builder');
    }, [mode, setHideShell]);

    // Push Overview rows to the shell's top-right tile (Total + Drafts to match Programs/Packets).
    // useLayoutEffect so the rows land in the first paint (not one frame late on initial nav).
    useLayoutEffect(() => {
        setOverviewRows([
            { label: 'Total Sheets', value: sidebarStats.total },
            { label: 'Drafts', value: sidebarStats.drafts, hint: 'Sheets named Untitled (unnamed drafts)' },
        ]);
        return () => setOverviewRows([]);
    }, [sidebarStats.total, sidebarStats.drafts, setOverviewRows]);

    const openExistingSheet = (s: WeightroomSheet) => {
        setEditingSheetId(s.id);
        setSheetName(s.name || '');
        setWrSelectedTeam(s.team_id || 'All');
        setWsMode(s.ws_mode || 'blank');
        setWsColumns((s.ws_columns?.length ? s.ws_columns : defaultColumns()));
        setWsOrientation(s.ws_orientation || 'portrait');
        setSheetVisibility((s as any).visibility === 'org' ? 'org' : 'personal');
        setMode('builder');
    };

    // Opens the saved sheet in a print-preview window (read-only "View" experience).
    // Builds the athlete list from the sheet's team_id so the cells render with the
    // correct 1RM math without entering the builder.
    const previewSheet = useCallback((s: WeightroomSheet) => {
        let athletes: { id: string; name: string }[] = [];
        if (s.team_id === BLANK_TEAM_ID) {
            athletes = Array.from({ length: BLANK_ROW_COUNT }, (_, i) => ({ id: `__blank_${i}`, name: '' }));
        } else if (!s.team_id) {
            athletes = teams.flatMap((t: any) => t.players || []);
        } else {
            athletes = teams.find((t: any) => t.id === s.team_id)?.players || [];
        }
        athletes = [...athletes].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        printSheet(
            { columns: s.ws_columns || [], orientation: (s.ws_orientation as 'portrait' | 'landscape') || 'portrait' },
            athletes,
            maxLookup,
            s.name || 'Weightroom Sheet'
        );
    }, [teams, maxLookup]);

    // Right-rail descriptor — empty state when nothing selected, full breakdown
    // (columns + 1RM %, target, source provenance) when a row is picked.
    const sidebarExtraNode = useMemo<React.ReactNode>(() => {
        if (!selectedSheet) {
            return (
                <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                    <div className="px-4 py-8 text-center">
                        <PrinterIcon size={28} className="mx-auto mb-2 text-slate-300 dark:text-[#475569]" />
                        <div className="text-xs font-semibold text-slate-500 dark:text-[#CBD5E1]">No sheet selected</div>
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1 leading-relaxed">Click a sheet on the left to see its columns and metadata.</div>
                    </div>
                </div>
            );
        }
        const s = selectedSheet;
        const targetLabel = s.team_id === BLANK_TEAM_ID
            ? 'No names (handwritten)'
            : s.team_id
                ? (teams.find(t => t.id === s.team_id)?.name || s.team_id)
                : 'All Teams';
        const sourceLine = formatSourceLine(s.source_context);
        const cols = s.ws_columns || [];
        // Only the original creator can edit/delete a shared sheet (matches RLS).
        const canModify = !(s as any).user_id || !authUser?.id || (s as any).user_id === authUser.id;
        return (
            <div className="relative bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                {/* Subtle delete */}
                {canModify && (
                    <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="absolute top-2.5 right-2.5 p-1.5 rounded-md text-slate-300 dark:text-[#475569] hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all z-10"
                        title="Delete sheet"
                    >
                        <Trash2Icon size={12} />
                    </button>
                )}

                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-[#1A2D48] shrink-0">
                    <div className="flex items-center gap-1.5 pr-7">
                        {s.source_context && <LinkIcon size={12} className="shrink-0 text-teal-500 dark:text-teal-400" />}
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight truncate">{s.name || 'Untitled'}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-300 uppercase">
                            {s.ws_mode}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]">
                            {targetLabel}
                        </span>
                    </div>
                    {sourceLine && (
                        <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-2 truncate" title={s.source_context?.packetName}>
                            From: {sourceLine}
                        </div>
                    )}
                    {(s.created_at || s.updated_at) && (
                        <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-1.5">
                            {cols.length} column{cols.length !== 1 ? 's' : ''} · {s.ws_orientation}
                        </div>
                    )}
                </div>

                {/* Column list with % of 1RM */}
                <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] mb-2">Columns</div>
                    {cols.length === 0 ? (
                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] italic text-center py-4">No columns configured</div>
                    ) : (
                        <div className="space-y-1.5">
                            {cols.map((col: any, idx: number) => (
                                <div key={col.id || idx} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#1A2D48]">
                                    <span className="text-[11px] text-slate-700 dark:text-[#E2E8F0] truncate">{col.label || col.exerciseId || `Exercise ${idx + 1}`}</span>
                                    {col.percentage !== undefined && col.percentage !== null && (
                                        <span className="shrink-0 text-[10px] font-semibold text-teal-700 dark:text-teal-400">{col.percentage}%</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer — Edit (opens builder, owner only) + View (opens print preview, anyone) */}
                <div className="border-t border-slate-100 dark:border-[#1A2D48] p-2.5 flex items-center gap-1.5 shrink-0 bg-slate-50/40 dark:bg-[#0F1C30]/40">
                    {canModify && (
                        <button
                            onClick={() => openExistingSheet(s)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[11px] font-semibold transition-all shadow-sm"
                        >
                            <PencilIcon size={12} /> Edit Sheet
                        </button>
                    )}
                    <button
                        onClick={() => previewSheet(s)}
                        className={`${canModify ? 'px-2.5' : 'flex-1'} py-2 bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#364E6E] text-slate-600 dark:text-[#CBD5E1] rounded-lg hover:border-sky-400 dark:hover:border-sky-500/60 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/15 transition-all flex items-center justify-center gap-1.5`}
                        title="View / print preview"
                    >
                        <EyeIcon size={13} /> {!canModify && <span className="text-[11px] font-semibold">View / Print</span>}
                    </button>
                </div>
            </div>
        );
    }, [selectedSheet, teams, previewSheet, authUser?.id]);

    useLayoutEffect(() => {
        setSidebarExtra(sidebarExtraNode);
        return () => setSidebarExtra(null);
    }, [sidebarExtraNode, setSidebarExtra]);

    const handleSaveSheet = async () => {
        if (!sheetName.trim()) { showToast('Sheet name is required', 'error'); return; }
        const payload = {
            name: sheetName.trim(),
            ws_mode: wsMode,
            ws_orientation: wsOrientation,
            ws_columns: wsColumns,
            team_id: wrSelectedTeam === 'All' ? null : wrSelectedTeam,
            notes: null,
            visibility: sheetVisibility,
        };
        try {
            if (editingSheetId) {
                await updateSheet.mutateAsync({ id: editingSheetId, ...payload });
                showToast(`"${sheetName}" updated`, 'success');
            } else {
                const created = await createSheet.mutateAsync(payload);
                setEditingSheetId(created.id);
                showToast(`"${sheetName}" saved`, 'success');
            }
        } catch (e: any) {
            showToast(e.message || 'Save failed', 'error');
        }
    };

    const handleDeleteSheet = async () => {
        if (!confirmDeleteId) return;
        try {
            await deleteSheet.mutateAsync(confirmDeleteId);
            showToast('Sheet deleted', 'success');
            if (editingSheetId === confirmDeleteId) {
                setMode('list');
                setEditingSheetId(null);
            }
        } catch {
            showToast('Failed to delete sheet', 'error');
        }
        setConfirmDeleteId(null);
    };

    // ── Column helpers ───────────────────────────────────────────────────
    const addColumn = () => {
        const n = wsColumns.length + 1;
        setWsColumns(prev => [...prev, { id: tempColumnId(), label: `Exercise ${n}`, exerciseId: '', percentage: 100 }]);
    };

    const removeColumn = (id) => {
        if (wsColumns.length <= 1) return;
        setWsColumns(prev => prev.filter(c => c.id !== id));
    };

    const updateColumn = (id, field, value) => {
        setWsColumns(prev => prev.map(c => {
            if (c.id !== id) return c;
            const updated = { ...c, [field]: value };
            if (field === 'exerciseId' && wsMode === 'advanced') {
                if (value) updated.label = value;
            }
            return updated;
        }));
    };

    const getColumnHeader = (col, idx) => {
        if (wsMode === 'empty-header') return '';
        if (wsMode === 'blank') return `Exercise ${idx + 1}`;
        if (wsMode === 'labeled' || wsMode === 'advanced') return col.label || `Exercise ${idx + 1}`;
        return col.label;
    };

    const getCellValue = (col, athlete) => {
        if (wsMode !== 'advanced' || !col.exerciseId) return '';
        return getSheetCellValue(col, athlete.id, maxLookup);
    };

    const handlePrint = () => {
        const headers = wsColumns.map((col, i) => getColumnHeader(col, i));
        const rows = athletes.map(a => ({
            name: a.name,
            cells: wsColumns.map(col => getCellValue(col, a))
        }));

        const thStyle = 'padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:#1e293b;color:white;border:1px solid #334155;';
        const tdStyle = 'padding:8px 12px;font-size:12px;border:1px solid #e2e8f0;';
        const tdNameStyle = 'padding:8px 12px;font-size:12px;font-weight:600;border:1px solid #e2e8f0;text-transform:uppercase;';

        const headerRow = `<tr><th style="${thStyle}">Name</th>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr>`;
        const bodyRows = rows.map(r =>
            `<tr><td style="${tdNameStyle}">${r.name}</td>${r.cells.map(c => `<td style="${tdStyle}">${c}</td>`).join('')}</tr>`
        ).join('');

        const html = `<!DOCTYPE html><html><head><title>${sheetName || 'Weightroom Sheet'}</title>
<style>
@page { size: ${wsOrientation}; margin: 15mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
h1 { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin: 0 0 4px; }
.divider { border: none; border-top: 2px solid #1e293b; margin: 8px auto 20px; width: 60%; }
table { width: 100%; border-collapse: collapse; }
@media print { button { display: none; } }
</style></head><body>
<h1>${sheetName || 'Weight Training - Record Sheet'}</h1>
<hr class="divider" />
<table>${headerRow}${bodyRows}</table>
</body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    // ── List view ──────────────────────────────────────────────────────
    if (mode === 'list') {
        return (
            <>
                <div className="flex-1 min-h-0 flex flex-col gap-4">
                    {/* Filter button — Sheets has no sub-tab strip, so this lives in its own thin row above the list */}
                    <div className="flex items-center justify-end gap-2 shrink-0 relative" ref={filterPopoverRef}>
                        <OwnershipFilter value={ownershipScope} onChange={setOwnershipScope} />
                        <button
                            onClick={() => setFilterPopoverOpen(v => !v)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                                filterPopoverOpen || activeFilterCount > 0
                                    ? 'bg-teal-50 dark:bg-teal-500/15 border-teal-300 dark:border-teal-500/50 text-teal-700 dark:text-teal-300'
                                    : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1] hover:border-slate-300 dark:hover:border-[#364E6E]'
                            }`}
                        >
                            <SlidersHorizontalIcon size={12} />
                            Filter
                            {activeFilterCount > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[9px] font-bold leading-none">{activeFilterCount}</span>
                            )}
                        </button>

                        {filterPopoverOpen && (
                            <div className="absolute top-full right-0 mt-1.5 w-80 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-xl z-30 p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">Filters</span>
                                    <div className="flex items-center gap-2">
                                        {activeFilterCount > 0 && (
                                            <button onClick={clearAllFilters} className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Clear all</button>
                                        )}
                                        <button onClick={() => setFilterPopoverOpen(false)} aria-label="Close" className="p-1 rounded text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
                                            <XIcon size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <CustomSelect value={modeFilter} onChange={(e: any) => setModeFilter(e.target.value)} variant="filter" size="xs" prefixLabel="Mode">
                                        <option value="All">All modes</option>
                                        {WS_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <CustomSelect value={targetFilter} onChange={(e: any) => setTargetFilter(e.target.value)} variant="filter" size="xs" prefixLabel="Target">
                                        <option value="All">Any target</option>
                                        <option value="__STANDALONE__">All Teams (standalone)</option>
                                        <option value="__BLANK__">No names (handwritten)</option>
                                        {sheetTeamOptions.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </CustomSelect>
                                </div>
                                <div>
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-[#CBD5E1] block mb-1">Source</label>
                                    <div className="grid grid-cols-3 gap-1">
                                        {([
                                            { v: 'All', label: 'All' },
                                            { v: 'Standalone', label: 'Standalone' },
                                            { v: 'FromPacket', label: 'From packet' },
                                        ] as const).map(opt => (
                                            <button
                                                key={opt.v}
                                                onClick={() => setSourceFilter(opt.v as any)}
                                                className={`px-2 py-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                                    sourceFilter === opt.v
                                                        ? 'bg-teal-600 text-white shadow-sm'
                                                        : 'bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48]'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Persistent list container — fills available height, scrolls internally. */}
                    <div className="bg-white dark:bg-[#132338] rounded-xl overflow-hidden border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col flex-1 min-h-0">
                        <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {filteredSheets.length === 0 ? (
                            <div className="py-20 px-5 text-center">
                                <div className="w-14 h-14 bg-teal-50 dark:bg-teal-900/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <PrinterIcon size={24} className="text-teal-400 dark:text-teal-500" />
                                </div>
                                <p className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1]">
                                    {search ? `No sheets matching "${search}"` : 'No sheets saved yet'}
                                </p>
                                {!search && (
                                    <>
                                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-1 mb-4">Build your first weightroom sheet to reuse it across squads</p>
                                        <button
                                            onClick={openNewSheet}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-all"
                                        >
                                            <PlusIcon size={13} /> Build Your First Sheet
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : view === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-3">
                                {filteredSheets.map(s => {
                                    const isSelected = selectedSheet?.id === s.id;
                                    return (
                                    <div
                                        key={s.id}
                                        className={`bg-white dark:bg-[#132338] rounded-xl border p-4 hover:shadow-md transition-all group cursor-pointer flex flex-col ${
                                            isSelected
                                                ? 'border-teal-400 dark:border-teal-500/60 ring-2 ring-teal-500/15'
                                                : 'border-slate-200 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-[#364E6E]'
                                        }`}
                                        onClick={() => setSelectedSheet(s)}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0 mb-2">
                                            {s.source_context && (
                                                <LinkIcon size={11} className="shrink-0 text-teal-500 dark:text-teal-400" />
                                            )}
                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">{s.name || 'Untitled'}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1] rounded text-[9px] font-medium uppercase">
                                                {s.ws_mode}
                                            </span>
                                            <CreatorBadge
                                                creatorUserId={s.user_id}
                                                lastModifiedByUserId={(s as any).last_modified_by}
                                                visibility={(s as any).visibility}
                                            />
                                        </div>
                                        <div className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-2 truncate">
                                            {s.team_id === BLANK_TEAM_ID
                                                ? 'No names (handwritten)'
                                                : s.team_id
                                                    ? (teams.find(t => t.id === s.team_id)?.name || s.team_id)
                                                    : 'All Teams'}
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-slate-50 dark:bg-[#0F1C30] z-10">
                                        <tr className="border-b border-slate-200 dark:border-[#243A58]">
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Sheet</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Target</th>
                                            <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">Mode</th>
                                            <th className="px-3 py-3 w-8" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                        {filteredSheets.map(s => {
                                            const isSelected = selectedSheet?.id === s.id;
                                            const targetLabel = s.team_id === BLANK_TEAM_ID
                                                ? 'No names (handwritten)'
                                                : s.team_id
                                                    ? (teams.find(t => t.id === s.team_id)?.name || s.team_id)
                                                    : 'All Teams';
                                            return (
                                            <tr
                                                key={s.id}
                                                className={`group transition-colors cursor-pointer ${
                                                    isSelected
                                                        ? 'bg-teal-50/60 dark:bg-teal-500/10'
                                                        : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                                                }`}
                                                onClick={() => setSelectedSheet(s)}
                                            >
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {s.source_context && (
                                                            <LinkIcon size={12} className="shrink-0 text-teal-500 dark:text-teal-400" />
                                                        )}
                                                        <div className={`font-medium text-sm transition-colors ${
                                                            isSelected
                                                                ? 'text-teal-700 dark:text-teal-400'
                                                                : 'text-slate-800 dark:text-[#E2E8F0] group-hover:text-teal-700 dark:group-hover:text-teal-400'
                                                        }`}>{s.name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="text-xs text-slate-600 dark:text-[#E2E8F0]">{targetLabel}</span>
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1] rounded-md text-[10px] font-medium uppercase">
                                                        {s.ws_mode}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3.5 text-right">
                                                    <ChevronRightIcon size={14} className="inline text-slate-300 dark:text-[#475569] group-hover:text-slate-500 dark:group-hover:text-[#CBD5E1] group-hover:translate-x-0.5 transition-all" />
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                        )}
                        </div>{/* end scroll area */}
                    </div>{/* end persistent list container */}
                </div>
                <ConfirmDeleteModal
                    isOpen={!!confirmDeleteId}
                    title="Delete Sheet"
                    message="This will permanently delete this saved sheet."
                    onConfirm={handleDeleteSheet}
                    onCancel={() => setConfirmDeleteId(null)}
                />
            </>
        );
    }

    // ── Builder view (existing builder, with name input + Save) ─────────
    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 dark:text-[#CBD5E1] transition-all" title="Back to saved sheets">
                            <ArrowLeftIcon size={18} />
                        </button>
                        <div className="w-9 h-9 bg-slate-900 dark:bg-slate-700 rounded-lg flex items-center justify-center text-white shrink-0">
                            <PrinterIcon size={16} />
                        </div>
                        <div className="min-w-0">
                            <input
                                type="text"
                                value={sheetName}
                                onChange={(e) => setSheetName(e.target.value)}
                                placeholder="Sheet name (e.g. Squad A — Hypertrophy)"
                                className="w-full bg-transparent border-0 border-b border-transparent focus:border-slate-300 dark:focus:border-[#243A58] text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none transition-colors"
                            />
                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">{editingSheetId ? 'Editing saved sheet' : 'New sheet — not yet saved'}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleSaveSheet}
                        disabled={!sheetName.trim() || createSheet.isPending || updateSheet.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <SaveIcon size={13} /> {editingSheetId ? 'Save Changes' : 'Save Sheet'}
                    </button>
                </div>
                <div className="mt-3 max-w-md">
                    <ShareToOrgToggle value={sheetVisibility} onChange={setSheetVisibility} />
                </div>
            </div>

            {/* Top Controls */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                <div className="flex items-start gap-5 flex-wrap">
                    {/* Target Squad */}
                    <div className="space-y-1.5 min-w-[180px]">
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest">Target Squad</label>
                        <CustomSelect value={wrSelectedTeam} onChange={(e) => setWrSelectedTeam(e.target.value)} variant="form">
                            <option value="All">All Athletes</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            <option value={BLANK_TEAM_ID}>No names (fill in by hand)</option>
                        </CustomSelect>
                        {wrSelectedTeam === BLANK_TEAM_ID && (
                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] italic">
                                Sheet prints {BLANK_ROW_COUNT} empty name rows for handwritten filling.
                            </p>
                        )}
                    </div>

                    {/* Sheet Mode */}
                    <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest">Sheet Mode</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {WS_MODES.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setWsMode(m.id)}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                        wsMode === m.id
                                            ? 'bg-slate-900 dark:bg-teal-600 text-white border-slate-900 dark:border-teal-600'
                                            : 'bg-white dark:bg-[#132338] text-slate-400 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-[#364E6E] hover:text-slate-600 dark:hover:text-[#E2E8F0]'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Column */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-transparent uppercase tracking-widest">Action</label>
                        <button
                            onClick={addColumn}
                            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-teal-500 transition-colors shadow-sm"
                        >
                            <PlusIcon size={14} /> Add Column
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content: Preview + Sidebar */}
            <div className="flex gap-4 items-start">
                {/* Left: Live Preview */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-5">
                        <div className="border border-dashed border-slate-200 dark:border-[#243A58] rounded-xl bg-white dark:bg-[#0F1C30] p-5">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest">
                                    Live Print Preview ({wsOrientation})
                                </p>
                                <p className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] uppercase tracking-widest">
                                    {athletes.length} Athletes Listed
                                </p>
                            </div>

                            <h2 className="text-sm font-black text-slate-900 dark:text-[#E2E8F0] uppercase tracking-widest text-center mb-1">
                                {sheetName || 'Weight Training - Record Sheet'}
                            </h2>
                            <div className="w-40 h-0.5 bg-slate-900 dark:bg-[#E2E8F0] mx-auto mb-4" />

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">Name</th>
                                            {wsColumns.map((col, i) => (
                                                <th key={col.id} className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">
                                                    {getColumnHeader(col, i)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {isLoading ? (
                                            <>
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <tr key={i}>
                                                        <td className="px-3 py-2 border border-slate-200 dark:border-[#243A58]"><div className="h-4 w-24 bg-slate-100 dark:bg-[#1A2D48] rounded animate-pulse" /></td>
                                                        {wsColumns.map(col => (
                                                            <td key={col.id} className="px-3 py-2 border border-slate-200 dark:border-[#243A58] text-center"><div className="h-4 w-12 bg-slate-50 dark:bg-[#0F1C30] rounded animate-pulse mx-auto" /></td>
                                                        ))}
                                                    </tr>
                                                ))}
                                                <tr>
                                                    <td colSpan={wsColumns.length + 1} className="py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-5 h-5 border-2 border-indigo-200 dark:border-indigo-800/50 border-t-indigo-600 rounded-full animate-spin" />
                                                            <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading athlete data...</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            </>
                                        ) : athletes.length === 0 ? (
                                            <tr><td colSpan={wsColumns.length + 1} className="px-3 py-6 text-center text-slate-300 dark:text-[#475569] text-xs">No athletes in selected squad</td></tr>
                                        ) : athletes.map(a => (
                                            <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                <td className="px-3 py-2 font-semibold text-slate-800 dark:text-[#E2E8F0] uppercase text-[11px] border border-slate-200 dark:border-[#243A58] whitespace-nowrap">{a.name}</td>
                                                {wsColumns.map(col => (
                                                    <td key={col.id} className="px-3 py-2 text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] text-center min-w-[80px]">
                                                        {getCellValue(col, a) || <span className="text-slate-200 dark:text-[#475569]">&nbsp;</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-64 shrink-0 space-y-4">
                    {/* Sheet Ready Card */}
                    <div className="bg-teal-700 dark:bg-teal-700/80 rounded-xl p-5 text-white space-y-4">
                        <div className="flex items-center gap-2.5">
                            <PrinterIcon size={22} />
                            <span className="text-sm font-black uppercase tracking-widest">Sheet Ready</span>
                        </div>
                        <div className="flex rounded-lg overflow-hidden border border-teal-500">
                            {['portrait', 'landscape'].map(o => (
                                <button
                                    key={o}
                                    onClick={() => setWsOrientation(o)}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        wsOrientation === o ? 'bg-teal-500 text-white' : 'bg-teal-800/50 text-teal-300 hover:bg-teal-600'
                                    }`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handlePrint}
                            className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            <PrinterIcon size={14} /> Print Sheet
                        </button>
                    </div>

                    {/* Active Columns */}
                    <div className="border border-slate-200 dark:border-[#243A58] rounded-xl bg-white dark:bg-[#132338] p-4 space-y-3 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest">Active Columns ({wsColumns.length})</p>
                        <div className="space-y-2.5 max-h-[400px] overflow-y-auto no-scrollbar">
                            {wsColumns.map((col, i) => (
                                <div key={col.id} className="border border-slate-100 dark:border-[#1A2D48] rounded-lg p-3 space-y-2 bg-slate-50/40 dark:bg-[#0F1C30]/40">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Column {i + 1}</span>
                                        <button onClick={() => removeColumn(col.id)} className="text-slate-300 dark:text-[#475569] hover:text-red-400 dark:hover:text-rose-400 transition-colors"><Trash2Icon size={13} /></button>
                                    </div>
                                    {wsMode !== 'empty-header' && (
                                        <input
                                            type="text"
                                            value={col.label}
                                            onChange={(e) => updateColumn(col.id, 'label', e.target.value)}
                                            placeholder={`Exercise ${i + 1}`}
                                            className="w-full bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-md px-2.5 py-1.5 text-xs text-slate-800 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-slate-400 dark:focus:border-[#364E6E] transition-colors"
                                        />
                                    )}
                                    {wsMode === 'advanced' && (
                                        <>
                                            <CustomSelect
                                                value={col.exerciseId}
                                                onChange={(e) => updateColumn(col.id, 'exerciseId', e.target.value)}
                                                variant="form"
                                                size="xs"
                                                placeholder="Select Exercise"
                                            >
                                                <option value="">Select Exercise</option>
                                                {trackableExercises.map(ex => (
                                                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                                                ))}
                                            </CustomSelect>
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    value={col.percentage}
                                                    onChange={(e) => updateColumn(col.id, 'percentage', Number(e.target.value) || 100)}
                                                    min={1} max={200}
                                                    className="w-16 bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-md px-2 py-1.5 text-xs text-slate-800 dark:text-[#E2E8F0] outline-none text-center focus:border-slate-400 dark:focus:border-[#364E6E]"
                                                />
                                                <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] font-medium">% of 1RM</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeightroomSheetsPage;
