// ── Data Hub: Column Selector Modal ──────────────────────────────────────
// Large modal for picking which columns the table renders, with:
//   • Grouped sections (Athlete · Wellness · Availability · ACWR · Performance · GPS)
//   • Subsections inside groups (Performance → Hamstring / 1RM / DSI / RSI)
//   • Multi-level bulk select (tri-state group + subsection master checkboxes)
//   • Search box across every column
//   • Per-column "# of dates" picker (1-5) for columns that support history
//   • Per-column last-data-date display (selector-only, never exported)
//   • Date window per data source (latest N days)
//   • Saved presets via localStorage
//
// Closing the modal commits the draft state to the parent. While open, all
// edits are kept locally so the user can cancel without polluting the table.

import React, { useEffect, useMemo, useState } from 'react';
import { Search as SearchIcon, X as XIcon, Check as CheckIcon, ChevronDown, Save as SaveIcon, Trash2 as TrashIcon, Plus as PlusIcon } from 'lucide-react';
import { COLUMNS, GROUP_ORDER, GROUP_DESCRIPTIONS, getSubsectionsForGroup, getColumnsForGroup, ColumnDef } from './dataHubColumns';

const PRESETS_KEY = 'sentinel:dataHub:presets:v1';

export interface ColumnsConfig {
    /** Array of column keys currently visible, in display order */
    visibleKeys: string[];
    /** Per-column override of how many history points to render */
    dateCounts: Record<string, number>;
}

export interface Preset {
    id: string;
    name: string;
    config: ColumnsConfig;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onCommit: (cfg: ColumnsConfig) => void;
    initial: ColumnsConfig;
    /** Resolves the last-data date for a given column across the current athlete scope */
    lastDateForColumn: (key: string) => string | null;
}

const formatDate = (iso: string | null | undefined): string => {
    if (!iso) return 'No data';
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
};

const daysSince = (iso: string | null | undefined): number | null => {
    if (!iso) return null;
    const d = new Date(iso).getTime();
    if (Number.isNaN(d)) return null;
    return Math.floor((Date.now() - d) / 86400000);
};

const checkboxCls = (state: 'on' | 'off' | 'partial') => {
    if (state === 'on') return 'bg-indigo-600 border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500';
    if (state === 'partial') return 'bg-indigo-100 dark:bg-indigo-500/30 border-indigo-400 dark:border-indigo-500';
    return 'border-slate-300 dark:border-[#475569]';
};

export const DataHubColumnsModal: React.FC<Props> = ({ isOpen, onClose, onCommit, initial, lastDateForColumn }) => {
    const [draftVisible, setDraftVisible] = useState<string[]>(initial.visibleKeys);
    const [draftDates, setDraftDates] = useState<Record<string, number>>(initial.dateCounts);
    const [activeGroup, setActiveGroup] = useState<string>(GROUP_ORDER[0]);
    const [search, setSearch] = useState('');
    const [presets, setPresets] = useState<Preset[]>([]);
    const [presetNameDraft, setPresetNameDraft] = useState('');

    // Reset draft when the modal opens — only commit on Save
    useEffect(() => {
        if (isOpen) {
            setDraftVisible(initial.visibleKeys);
            setDraftDates(initial.dateCounts);
            setSearch('');
        }
    }, [isOpen, initial]);

    // Load presets from localStorage on mount
    useEffect(() => {
        try {
            const raw = localStorage.getItem(PRESETS_KEY);
            if (raw) setPresets(JSON.parse(raw));
        } catch { /* corrupt JSON — start with empty list */ }
    }, []);

    // Persist presets on change
    useEffect(() => {
        try { localStorage.setItem(PRESETS_KEY, JSON.stringify(presets)); } catch { /* quota or private mode */ }
    }, [presets]);

    const visibleSet = useMemo(() => new Set(draftVisible), [draftVisible]);

    const toggleColumn = (key: string) => {
        setDraftVisible(prev => {
            if (prev.includes(key)) return prev.filter(k => k !== key);
            return [...prev, key];
        });
    };

    const setColumnDates = (key: string, n: number) => {
        setDraftDates(prev => ({ ...prev, [key]: Math.max(1, Math.min(5, n)) }));
    };

    // Tri-state derivation for a column group / subsection
    const stateForKeys = (keys: string[]): 'on' | 'off' | 'partial' => {
        if (keys.length === 0) return 'off';
        const on = keys.filter(k => visibleSet.has(k)).length;
        if (on === 0) return 'off';
        if (on === keys.length) return 'on';
        return 'partial';
    };

    const setKeysAll = (keys: string[], on: boolean) => {
        setDraftVisible(prev => {
            const without = prev.filter(k => !keys.includes(k));
            return on ? [...without, ...keys] : without;
        });
    };

    // Filtered column list for the active group, respecting search
    const visibleInGroup = useMemo(() => {
        const cols = COLUMNS.filter(c => c.group === activeGroup);
        if (!search.trim()) return cols;
        const q = search.toLowerCase();
        return cols.filter(c => c.label.toLowerCase().includes(q));
    }, [activeGroup, search]);

    // Global search overrides the active group when the user types
    const globalSearchResults = useMemo(() => {
        if (!search.trim()) return null;
        const q = search.toLowerCase();
        return COLUMNS.filter(c => c.label.toLowerCase().includes(q));
    }, [search]);

    const groupCount = (g: string) => {
        const keys = getColumnsForGroup(g).map(c => c.key);
        return { total: keys.length, on: keys.filter(k => visibleSet.has(k)).length };
    };

    // ── Render a column row inside the right pane ────────────────────────
    const ColumnRow = ({ col }: { col: ColumnDef }) => {
        const checked = visibleSet.has(col.key);
        const lastDate = lastDateForColumn(col.key);
        const since = daysSince(lastDate);
        const stale = since != null && col.staleAfterDays != null && since > col.staleAfterDays;
        const dateLabel = formatDate(lastDate) + (since != null ? ` · ${since}d` : '');
        return (
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${checked ? 'bg-indigo-50/40 dark:bg-indigo-500/5 border-indigo-200 dark:border-indigo-500/30' : 'bg-white dark:bg-[#0F1C30] border-slate-200 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-[#3B5478]'}`}>
                {/* Checkbox */}
                <button
                    onClick={() => toggleColumn(col.key)}
                    className={`w-4 h-4 rounded flex items-center justify-center border-2 shrink-0 transition-all ${checkboxCls(checked ? 'on' : 'off')}`}
                >
                    {checked && <CheckIcon size={10} className="text-white" />}
                </button>
                {/* Label + freshness */}
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-[#E2E8F0] truncate">{col.label}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-medium ${stale ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-[#94A3B8]'}`}>
                            {lastDate ? `Last: ${dateLabel}` : col.requiresConfig ? 'Not configured for this team' : 'No data yet'}
                        </span>
                        {stale && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Stale data" />}
                    </div>
                </div>
                {/* Per-column # of dates picker */}
                {col.supportsHistory && checked && (
                    <div className="flex items-center gap-1 shrink-0">
                        <span className="hidden sm:inline text-[9px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide">Dates</span>
                        {[1, 2, 3, 4, 5].map(n => (
                            <button
                                key={n}
                                onClick={() => setColumnDates(col.key, n)}
                                className={`w-6 h-6 rounded text-[10px] font-bold transition-all ${
                                    (draftDates[col.key] || 1) === n
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1] hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                                }`}>
                                {n}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ── Preset save / load ───────────────────────────────────────────────
    const saveCurrentAsPreset = () => {
        const name = presetNameDraft.trim();
        if (!name) return;
        const preset: Preset = {
            id: `p_${Date.now()}`,
            name,
            config: { visibleKeys: [...draftVisible], dateCounts: { ...draftDates } },
        };
        setPresets(prev => [...prev, preset]);
        setPresetNameDraft('');
    };

    const loadPreset = (p: Preset) => {
        setDraftVisible(p.config.visibleKeys);
        setDraftDates(p.config.dateCounts);
    };

    const deletePreset = (id: string) => {
        setPresets(prev => prev.filter(p => p.id !== id));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm p-0 sm:p-6">
            <div className="bg-white dark:bg-[#132338] rounded-none sm:rounded-2xl shadow-2xl border-0 sm:border border-slate-200 dark:border-[#243A58] w-full max-w-5xl h-full sm:h-[80vh] flex flex-col animate-in zoom-in-95 fade-in duration-150">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-[#243A58] shrink-0">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-[#E2E8F0]">Configure Data Hub Columns</h3>
                        <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">
                            {draftVisible.length} column{draftVisible.length === 1 ? '' : 's'} selected<span className="hidden sm:inline"> · dates shown beside each column are for selector use only and never appear in the export</span>
                        </p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Search + bulk-clear */}
                <div className="px-5 py-3 border-b border-slate-200 dark:border-[#243A58] flex items-center gap-3 shrink-0">
                    <div className="relative flex-1">
                        <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#CBD5E1]" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search every column across all groups…"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-xs font-medium text-slate-700 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-indigo-400"
                        />
                    </div>
                    <button
                        onClick={() => setDraftVisible([])}
                        className="px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-colors"
                    >
                        Clear all
                    </button>
                </div>

                {/* Body — left rail + right pane. Stacks on mobile: the vertical rail
                    becomes a wrapping chip bar above the pane. */}
                <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
                    {/* Mobile group chips (<lg) — replaces the vertical rail */}
                    {!globalSearchResults && (
                        <div className="lg:hidden shrink-0 border-b border-slate-200 dark:border-[#243A58] p-2 flex flex-wrap gap-1.5 bg-slate-50/50 dark:bg-[#0F1C30]/40">
                            {GROUP_ORDER.map(g => {
                                const { total, on } = groupCount(g);
                                const isActive = activeGroup === g;
                                return (
                                    <button
                                        key={g}
                                        onClick={() => setActiveGroup(g)}
                                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
                                            isActive
                                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                                : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1]'
                                        }`}
                                    >
                                        {g} <span className={`ml-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400 dark:text-[#94A3B8]'}`}>{on}/{total}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    {/* Left rail — groups (desktop only) */}
                    {!globalSearchResults && (
                        <div className="hidden lg:block w-56 shrink-0 border-r border-slate-200 dark:border-[#243A58] overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-[#0F1C30]/40 p-2 space-y-1">
                            {GROUP_ORDER.map(g => {
                                const { total, on } = groupCount(g);
                                const isActive = activeGroup === g;
                                return (
                                    <button
                                        key={g}
                                        onClick={() => setActiveGroup(g)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all border ${
                                            isActive
                                                ? 'bg-white dark:bg-[#1A2D48] border-indigo-300 dark:border-indigo-500/40 shadow-sm'
                                                : 'border-transparent hover:bg-white dark:hover:bg-[#1A2D48]/60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className={`text-xs font-bold ${isActive ? 'text-slate-900 dark:text-[#E2E8F0]' : 'text-slate-600 dark:text-[#CBD5E1]'}`}>{g}</span>
                                            <span className="text-[9px] font-bold text-slate-400 dark:text-[#94A3B8]">{on}/{total}</span>
                                        </div>
                                        <p className="text-[9px] text-slate-400 dark:text-[#94A3B8] mt-1 leading-snug line-clamp-2">{GROUP_DESCRIPTIONS[g]}</p>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Right pane */}
                    <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar p-5 space-y-4">
                        {/* Global search results */}
                        {globalSearchResults ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8]">
                                        {globalSearchResults.length} match{globalSearchResults.length === 1 ? '' : 'es'} for "{search}"
                                    </h4>
                                </div>
                                {globalSearchResults.length === 0
                                    ? <p className="text-xs text-slate-400 dark:text-[#CBD5E1] py-8 text-center">No columns match that search.</p>
                                    : globalSearchResults.map(c => <ColumnRow key={c.key} col={c} />)
                                }
                            </div>
                        ) : (
                            <>
                                {/* Group header with bulk-select-all */}
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-[#243A58]">
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">{activeGroup}</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-0.5">{GROUP_DESCRIPTIONS[activeGroup]}</p>
                                    </div>
                                    {(() => {
                                        const keys = getColumnsForGroup(activeGroup).map(c => c.key);
                                        const state = stateForKeys(keys);
                                        return (
                                            <button
                                                onClick={() => setKeysAll(keys, state !== 'on')}
                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#243A58] text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-500/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                                            >
                                                <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border-2 ${checkboxCls(state)}`}>
                                                    {state === 'on' && <CheckIcon size={9} className="text-white" />}
                                                    {state === 'partial' && <div className="w-1.5 h-0.5 bg-indigo-600 dark:bg-indigo-300 rounded-full" />}
                                                </div>
                                                {state === 'on' ? 'Deselect all' : 'Select all'}
                                            </button>
                                        );
                                    })()}
                                </div>

                                {/* Subsections (if any) */}
                                {(() => {
                                    const subs = getSubsectionsForGroup(activeGroup);
                                    if (subs.length === 0) {
                                        // No subsections — flat list
                                        return (
                                            <div className="space-y-2">
                                                {visibleInGroup.map(c => <ColumnRow key={c.key} col={c} />)}
                                                {visibleInGroup.length === 0 && (
                                                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] py-8 text-center">No columns in this group yet.</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return subs.map(sub => {
                                        const subKeys = getColumnsForGroup(activeGroup, sub).map(c => c.key);
                                        const subState = stateForKeys(subKeys);
                                        return (
                                            <div key={sub} className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">{sub}</h5>
                                                    <button
                                                        onClick={() => setKeysAll(subKeys, subState !== 'on')}
                                                        className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                                                    >
                                                        <div className={`w-3 h-3 rounded flex items-center justify-center border-2 ${checkboxCls(subState)}`}>
                                                            {subState === 'on' && <CheckIcon size={8} className="text-white" />}
                                                            {subState === 'partial' && <div className="w-1 h-0.5 bg-indigo-600 dark:bg-indigo-300 rounded-full" />}
                                                        </div>
                                                        {subState === 'on' ? 'Deselect' : 'Select'} all
                                                    </button>
                                                </div>
                                                {getColumnsForGroup(activeGroup, sub).map(c => <ColumnRow key={c.key} col={c} />)}
                                            </div>
                                        );
                                    });
                                })()}
                            </>
                        )}
                    </div>
                </div>

                {/* Footer — presets + actions */}
                <div className="border-t border-slate-200 dark:border-[#243A58] px-5 py-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-[#0F1C30]/40 rounded-b-none sm:rounded-b-2xl">
                    {/* Presets cluster */}
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8] shrink-0">Presets</span>
                        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                            {presets.length === 0 && <span className="text-[10px] text-slate-300 dark:text-[#475569] italic">none saved yet</span>}
                            {presets.map(p => (
                                <div key={p.id} className="group flex items-center gap-1 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-2 py-1 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors">
                                    <button onClick={() => loadPreset(p)} className="text-[10px] font-semibold text-slate-700 dark:text-[#E2E8F0] whitespace-nowrap">{p.name}</button>
                                    <button onClick={() => deletePreset(p.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-[#94A3B8] hover:text-rose-500 transition-all"><TrashIcon size={10} /></button>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <input
                                type="text"
                                value={presetNameDraft}
                                onChange={e => setPresetNameDraft(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') saveCurrentAsPreset(); }}
                                placeholder="Save as…"
                                className="w-28 px-2 py-1 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg text-[10px] outline-none focus:border-indigo-400"
                            />
                            <button
                                onClick={saveCurrentAsPreset}
                                disabled={!presetNameDraft.trim()}
                                className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Save current selection as preset"
                            >
                                <PlusIcon size={11} />
                            </button>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <button onClick={onClose} className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] sm:border-0 hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">Cancel</button>
                        <button
                            onClick={() => { onCommit({ visibleKeys: draftVisible, dateCounts: draftDates }); onClose(); }}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors"
                        >
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
