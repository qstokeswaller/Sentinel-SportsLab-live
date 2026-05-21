// @ts-nocheck
// ── Athlete Data Hub ─────────────────────────────────────────────────────
// Container layout: consolidated banner on top, contained-scroll table that
// fills the viewport. Page itself never scrolls in single-table mode; the
// table container handles vertical overflow so the header row stays pinned.
// Athlete column is sticky on horizontal scroll.
//
// Display modes:
//   • Single table — metric-first or date-first column grouping
//   • Multi-table — one stacked table per scientist-picked date (page can scroll)
//
// Selector commits via DataHubColumnsModal. All current limitations and
// future enhancements (GPS resolvers, ACWR history, share link) are flagged
// inline so the data-plumbing pass after this knows exactly where to hook in.

import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
    Download as DownloadIcon, Search as SearchIcon, ChevronDown, ChevronUp,
    LayoutGrid as GridIcon, Calendar as CalendarIcon, Columns as ColumnsIcon,
    Shield, ShieldAlert, ArrowLeft as ArrowLeftIcon, GripVertical as GripIcon,
    AlertCircle, X as XIcon, Filter as FilterIcon, Share2 as Share2Icon,
    ArrowUp as ArrowUpIcon, ArrowDown as ArrowDownIcon, RotateCcw as RotateCcwIcon,
    Copy as CopyIcon, CheckCircle2 as CheckCircle2Icon,
} from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useExerciseMap } from '../../hooks/useExerciseMap';
import { CustomSelect } from '../ui/CustomSelect';
import { COLUMNS, ColumnDef, DEFAULT_VISIBLE_KEYS, findColumn, ResolveCtx, DataPoint } from './dataHubColumns';
import { DataHubColumnsModal, ColumnsConfig } from './DataHubColumnsModal';
import { DatabaseService } from '../../services/databaseService';

// ─── Cell-level rendering ─────────────────────────────────────────────────
const DASH = <span className="text-slate-300 dark:text-[#94A3B8] text-xs font-bold">—</span>;

const NOT_CONFIGURED = (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#94A3B8]" title="Team has not configured this data source in Settings">
        <AlertCircle size={9} /> Not configured
    </span>
);

const formatDate = (iso: string | undefined | null): string => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};
const daysSince = (iso: string | undefined | null): number | null => {
    if (!iso) return null;
    const d = new Date(iso).getTime();
    return Number.isFinite(d) ? Math.floor((Date.now() - d) / 86400000) : null;
};

// Render a single cell value (no date — date is shown separately when in multi-date mode)
function renderCellValue(col: ColumnDef, point: DataPoint, ctx?: { hasConfig: boolean }): React.ReactNode {
    if (point.value === null || point.value === undefined || point.value === '') {
        // Only show "Not configured" when the team genuinely lacks the data source;
        // otherwise (config exists, athlete just has no data yet) show an em-dash.
        if (col.requiresConfig && ctx && !ctx.hasConfig) return NOT_CONFIGURED;
        return DASH;
    }
    const v = point.value;
    switch (col.renderHint) {
        case 'injury': {
            // Active Injury column returns either 'Clear' or a string like 'Hamstring (Severe)'.
            const isClear = v === 'Clear';
            if (isClear) return <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]"><Shield size={13} /> Clear</span>;
            return <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold text-[11px]"><ShieldAlert size={13} /> {String(v)}</span>;
        }
        case 'percent': {
            const n = parseFloat(v);
            if (!Number.isFinite(n)) return DASH;
            const cls = n >= 85 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : n >= 60 ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300';
            return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{n.toFixed(0)}%</span>;
        }
        case 'load': {
            // Coach-tagged planned intensity (Low / Medium / High)
            const v2 = String(v).toLowerCase();
            const cls = v2 === 'high' ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : v2 === 'medium' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : v2 === 'low' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]';
            return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${cls}`}>{v}</span>;
        }
        case 'availability': {
            const map: Record<string, string> = {
                available:   'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
                modified:    'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300',
                unavailable: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300',
            };
            return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${map[v] || 'bg-slate-100 dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]'}`}>{v}</span>;
        }
        case 'acwr': {
            const n = parseFloat(v);
            if (!Number.isFinite(n) || n === 0) return DASH;
            const cls = n > 1.5 ? 'bg-rose-600 dark:bg-rose-500 text-white'
                : n > 1.3 ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : n < 0.8 ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
            const label = n > 1.5 ? `${n.toFixed(2)} ⚠` : n.toFixed(2);
            return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{label}</span>;
        }
        case 'rpe': {
            const n = parseFloat(v);
            const cls = n >= 9 ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : n >= 7 ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
            return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>RPE {v}</span>;
        }
        case 'dsi': {
            const n = parseFloat(v);
            const cls = n > 1.0 ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300'
                : n >= 0.8 ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300';
            return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cls}`}>{v}</span>;
        }
        case 'kg':
            return <span className="text-slate-700 dark:text-[#CBD5E1] text-xs font-semibold">{v} kg</span>;
        case 'numeric': {
            const num = typeof v === 'number' ? v : parseFloat(v);
            if (!Number.isFinite(num)) return <span className="text-slate-600 dark:text-[#CBD5E1] text-xs font-bold">{v}</span>;
            const fixed = col.fractionDigits != null ? num.toFixed(col.fractionDigits) : `${num}`;
            return <span className="text-slate-700 dark:text-[#CBD5E1] text-xs font-semibold">{fixed}{col.unit ? ` ${col.unit}` : ''}</span>;
        }
        case 'plain':
        default:
            // Dates render in the shorter en-GB form
            if (col.key === 'lastCheckin' && v) return <span className="text-slate-500 dark:text-[#CBD5E1] text-xs font-bold">{new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}</span>;
            return <span className="text-slate-600 dark:text-[#CBD5E1] text-xs font-bold">{v}</span>;
    }
}

// ─── Component ─────────────────────────────────────────────────────────────
export const DataHub: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const {
        teams,
        wellnessResponses,
        calculateACWR,
        injuryReports,
        scheduledSessions,
        loadRecords,
        maxHistory,
        gpsData,
        plannedTonnageLog,
    } = useAppState();
    // Exercise metadata lookup — provides body_parts/categories for per-region tonnage
    const { exerciseFullMap } = useExerciseMap();

    // ── Selection state ──
    const [config, setConfig] = useState<ColumnsConfig>({
        visibleKeys: DEFAULT_VISIBLE_KEYS,
        dateCounts: {},
    });
    const [search, setSearch] = useState('');
    const [teamFilter, setTeamFilter] = useState('All');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [modalOpen, setModalOpen] = useState(false);
    const [showLegend, setShowLegend] = useState(false);

    // ── Display mode ──
    type ViewMode = 'metric-first' | 'date-first' | 'multi-table';
    const [viewMode, setViewMode] = useState<ViewMode>('metric-first');

    // ── Snapshot date (freeze-on-date) ──
    const [snapshotDate, setSnapshotDate] = useState<string>(''); // '' = live

    // ── Column drag-to-reorder ──
    const [dragKey, setDragKey] = useState<string | null>(null);
    const [dragOverKey, setDragOverKey] = useState<string | null>(null);

    // ── Per-column menu popover state ──
    const [openMenuColKey, setOpenMenuColKey] = useState<string | null>(null);

    // ── Share-link state ──
    const [sharePopoverOpen, setSharePopoverOpen] = useState(false);
    const [shareWorking, setShareWorking] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [shareCopied, setShareCopied] = useState(false);
    const [redactWellness, setRedactWellness] = useState(false);

    // ── Container scroll state ──
    const tableWrapRef = useRef<HTMLDivElement>(null);
    const [scrollPct, setScrollPct] = useState(0);
    const handleScroll = () => {
        const el = tableWrapRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setScrollPct(max > 0 ? (el.scrollLeft / max) * 100 : 0);
    };

    // ── Build all athletes + their pre-sorted history once ──
    const athleteCtxs = useMemo(() => {
        const ctxs: { player: any; squad: string; teamId: string; ctx: ResolveCtx }[] = [];
        const cutoff = snapshotDate ? new Date(snapshotDate).getTime() + 86400000 : Infinity;
        const beforeCutoff = (iso: string | null | undefined) => {
            if (!iso) return false;
            const t = new Date(iso).getTime();
            return Number.isFinite(t) && t < cutoff;
        };
        const sortDesc = (a: any, b: any, k: string) => new Date(b[k]).getTime() - new Date(a[k]).getTime();

        (teams || []).forEach(team => {
            (team.players || []).forEach(player => {
                // Wellness responses for this athlete
                const wAll = (wellnessResponses || [])
                    .filter(r => r.athlete_id === player.id)
                    .filter(r => beforeCutoff(r.session_date))
                    .sort((a, b) => sortDesc(a, b, 'session_date'));
                // Performance metrics (testing hub assessments)
                const pAll = (player.performanceMetrics || [])
                    .filter(m => beforeCutoff(m.date))
                    .sort((a, b) => sortDesc(a, b, 'date'));
                // Active injuries — formal injury reports for this athlete, status != 'resolved'.
                // Matches the existing pattern in App.tsx (`status !== 'resolved'`).
                const matchAthlete = (r: any) => r.athleteId === player.id || r.athlete_id === player.id;
                const injuriesForAthlete = (injuryReports || [])
                    .filter(matchAthlete)
                    .filter(r => beforeCutoff(r.dateOfInjury || r.date_of_injury))
                    .sort((a, b) => sortDesc(
                        { d: a.dateOfInjury || a.date_of_injury },
                        { d: b.dateOfInjury || b.date_of_injury },
                        'd',
                    ));
                const activeInjuries = injuriesForAthlete.filter(r => r.status !== 'resolved');
                // Past-or-current scheduled sessions where this athlete was on the roster.
                // Used by the "Session Load (planned)" column to surface the most recent
                // session's planned intensity tag. We no longer filter on status==='Completed'
                // because the coach-side completion flow was removed — every scheduled
                // session that's already happened (or is today) counts.
                const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
                const completedSessions = (scheduledSessions || [])
                    .filter(s => s.date && s.date <= todayStr)
                    .filter(s => {
                        if (s.targetType === 'Team' || s.target_type === 'Team') {
                            const tid = s.targetId || s.target_id;
                            return tid === team.id;
                        }
                        const tid = s.targetId || s.target_id;
                        return tid === player.id;
                    })
                    .filter(s => beforeCutoff(s.date))
                    .sort((a, b) => sortDesc(a, b, 'date'));
                // Per-athlete training load + GPS + 1RM history
                const athleteLoads = (loadRecords || [])
                    .filter(l => l.athleteId === player.id || l.athlete_id === player.id)
                    .filter(l => beforeCutoff(l.date))
                    .sort((a, b) => sortDesc(a, b, 'date'));
                const athleteMaxes = (maxHistory || [])
                    .filter(m => m.athleteId === player.id || m.athlete_id === player.id)
                    .filter(m => beforeCutoff(m.date))
                    .sort((a, b) => sortDesc(a, b, 'date'));
                const athleteGps = (gpsData || [])
                    .filter(g => g.athleteId === player.id || g.athlete_id === player.id || g.playerId === player.id)
                    .filter(g => beforeCutoff(g.date))
                    .sort((a, b) => sortDesc(a, b, 'date'));
                const athleteTonnage = (plannedTonnageLog || [])
                    .filter((r: any) => r.athlete_id === player.id)
                    .filter((r: any) => beforeCutoff(r.date))
                    .sort((a: any, b: any) => sortDesc(a, b, 'date'));
                // Annotate squad on the player so the Athlete-group resolvers can read it
                const playerCopy = { ...player, __squad: team.name };
                ctxs.push({
                    player: playerCopy,
                    squad: team.name,
                    teamId: team.id,
                    ctx: {
                        player: playerCopy,
                        wellnessSorted: wAll,
                        perfSorted: pAll,
                        activeInjuries,
                        allInjuries: injuriesForAthlete,
                        completedSessions,
                        loadRecords: athleteLoads,
                        maxHistory: athleteMaxes,
                        gpsRecords: athleteGps,
                        plannedTonnage: athleteTonnage,
                        acwrScalar: calculateACWR ? calculateACWR(player.id) : '0',
                        teamConfig: {
                            hasACWR: true, // assume true; per-team gating is a future Settings hookup
                            // Treat GPS as "configured" if this athlete (or team) has ANY GPS rows imported
                            hasGPS: athleteGps.length > 0,
                        },
                        exerciseFullMap,
                    },
                });
            });
        });
        return ctxs;
    }, [teams, wellnessResponses, calculateACWR, snapshotDate, injuryReports, scheduledSessions, loadRecords, maxHistory, gpsData, exerciseFullMap, plannedTonnageLog]);

    // ── Team filter options ──
    const teamOptions = useMemo(() => ['All', ...new Set((teams || []).map(t => t.name))], [teams]);

    // ── Per-column quick filters (set of allowed values; empty set = no filter) ──
    // Keys are column.key; values are the set of cell-value strings the user has ticked.
    const [colFilters, setColFilters] = useState<Record<string, Set<string>>>({});

    // ── Apply search + team filter + per-column filters ──
    const filteredCtxs = useMemo(() => {
        let list = athleteCtxs;
        if (teamFilter !== 'All') list = list.filter(c => c.squad === teamFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(c => c.player.name?.toLowerCase().includes(q) || c.squad?.toLowerCase().includes(q));
        }
        // Apply per-column "include only these values" filters using the latest data point.
        const activeColFilters = Object.entries(colFilters).filter(([, s]) => s && s.size > 0);
        if (activeColFilters.length > 0) {
            list = list.filter(rc => {
                return activeColFilters.every(([colKey, allowed]) => {
                    const col = findColumn(colKey);
                    if (!col) return true;
                    const point = col.resolve(rc.ctx, 0);
                    const cellStr = point.value == null ? '' : String(point.value);
                    return allowed.has(cellStr);
                });
            });
        }
        return list;
    }, [athleteCtxs, teamFilter, search, colFilters]);

    // ── Visible column descriptors with date counts ──
    const visibleCols = useMemo(() => {
        return config.visibleKeys
            .map(k => findColumn(k))
            .filter((c): c is ColumnDef => !!c);
    }, [config.visibleKeys]);

    // Drag-to-reorder helpers
    const handleDragStart = (key: string) => (e: React.DragEvent) => {
        setDragKey(key);
        e.dataTransfer.effectAllowed = 'move';
        // Tag the payload so this doesn't get confused with other DnD systems
        // (workouts, library) if anything ever bubbles up to the document.
        try { e.dataTransfer.setData('text/plain', `dh-col:${key}`); } catch { /* ie11 */ }
    };
    const handleDragOver = (key: string) => (e: React.DragEvent) => {
        e.preventDefault();
        if (dragOverKey !== key) setDragOverKey(key);
    };
    // Always clear drag state when the gesture ends, even if the user dropped
    // outside any valid target. Without this, dragKey stays stuck and the next
    // drag would short-circuit immediately.
    const handleDragEnd = () => {
        setDragKey(null);
        setDragOverKey(null);
    };
    const handleDrop = (overKey: string) => (e: React.DragEvent) => {
        e.preventDefault();
        if (!dragKey || dragKey === overKey) { setDragKey(null); setDragOverKey(null); return; }
        setConfig(prev => {
            const next = [...prev.visibleKeys];
            const from = next.indexOf(dragKey);
            const to = next.indexOf(overKey);
            if (from < 0 || to < 0) return prev;
            next.splice(from, 1);
            next.splice(to, 0, dragKey);
            return { ...prev, visibleKeys: next };
        });
        setDragKey(null); setDragOverKey(null);
    };

    // ── Sort + comparable scalar ──
    const sortedCtxs = useMemo(() => {
        if (!sortKey) return filteredCtxs;
        return [...filteredCtxs].sort((a, b) => {
            // Sort by name explicitly
            if (sortKey === '__name') {
                const cmp = String(a.player.name).localeCompare(String(b.player.name));
                return sortDir === 'asc' ? cmp : -cmp;
            }
            const col = findColumn(sortKey);
            if (!col) return 0;
            const av = col.resolve(a.ctx, 0).value;
            const bv = col.resolve(b.ctx, 0).value;
            const cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filteredCtxs, sortKey, sortDir]);

    const handleSort = (key: string) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    // ── Last-data resolver for the column-modal display ──
    // For each column, the modal shows the most recent date across the
    // current filtered athlete scope. Memoized so 60 columns × 50 athletes
    // doesn't recompute on every modal keystroke.
    const lastDateCache = useMemo(() => {
        const cache: Record<string, string | null> = {};
        for (const col of COLUMNS) {
            let best = 0;
            for (const c of filteredCtxs) {
                const p = col.resolve(c.ctx, 0);
                if (p.date) {
                    const t = new Date(p.date).getTime();
                    if (Number.isFinite(t) && t > best) best = t;
                }
            }
            cache[col.key] = best > 0 ? new Date(best).toISOString() : null;
        }
        return cache;
    }, [filteredCtxs]);
    const lastDateForColumn = useCallback((key: string) => lastDateCache[key] ?? null, [lastDateCache]);

    // ── Snapshot serializer (used by both share-link + as a future "save state" feature) ──
    // Fully resolves every visible cell so the recipient doesn't need to call any
    // resolver (and crucially doesn't need access to the live DB). Includes optional
    // redaction for wellness/availability columns when sharing outside the staff.
    const buildSnapshotPayload = (opts: { name: string; redactWellness: boolean }) => {
        const SENSITIVE_GROUPS = new Set(['Wellness', 'Availability']);
        const cols = visibleCols.filter(c => !(opts.redactWellness && SENSITIVE_GROUPS.has(c.group)));
        const colDefs = cols.map(c => ({
            key: c.key,
            label: c.label,
            group: c.group,
            subsection: c.subsection ?? null,
            renderHint: c.renderHint ?? 'plain',
            unit: c.unit ?? null,
            fractionDigits: c.fractionDigits ?? null,
            dateCount: c.supportsHistory ? Math.max(1, config.dateCounts[c.key] || 1) : 1,
            requiresConfig: c.requiresConfig ?? null,
            staleAfterDays: c.staleAfterDays ?? null,
        }));
        const rows = sortedCtxs.map(rc => {
            const cells: Record<string, DataPoint[]> = {};
            cols.forEach(c => {
                const n = c.supportsHistory ? Math.max(1, config.dateCounts[c.key] || 1) : 1;
                const hasConfig = c.requiresConfig === 'gps' ? !!rc.ctx.teamConfig?.hasGPS
                    : c.requiresConfig === 'acwr' ? !!rc.ctx.teamConfig?.hasACWR
                    : true;
                cells[c.key] = Array.from({ length: n }).map((_, i) => {
                    const p = c.resolve(rc.ctx, i);
                    return { value: p.value, date: p.date, _notConfigured: !hasConfig && (p.value == null || p.value === '') } as any;
                });
            });
            return { athleteName: rc.player.name, squad: rc.squad, cells };
        });
        return {
            v: 1,
            createdAt: new Date().toISOString(),
            name: opts.name,
            viewMode,
            snapshotDate: snapshotDate || null,
            search: search || null,
            teamFilter,
            redacted: opts.redactWellness,
            colDefs,
            rows,
            multiTableDates: viewMode === 'multi-table' ? multiTableDates : null,
        };
    };

    // ── Generate share link ──
    const handleShare = async () => {
        setShareWorking(true);
        setShareUrl(null);
        setShareCopied(false);
        try {
            const name = `Data Hub — ${new Date().toLocaleDateString('en-GB')}${teamFilter !== 'All' ? ` · ${teamFilter}` : ''}`;
            const payload = buildSnapshotPayload({ name, redactWellness });
            const id = await DatabaseService.createDataHubSnapshot(name, payload);
            const url = `${window.location.origin}/data-hub/snapshot/${id}`;
            setShareUrl(url);
        } catch (err: any) {
            console.error('Share failed', err);
            setShareUrl(null);
            alert('Failed to create share link. Check console.');
        } finally {
            setShareWorking(false);
        }
    };

    const copyShareUrl = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShareCopied(true);
            setTimeout(() => setShareCopied(false), 2200);
        } catch {/* clipboard blocked */}
    };

    // ── CSV export ──
    // Date columns are always included alongside each value column so the export
    // is forensically clean — recipients can see exactly when each metric was
    // recorded without needing a second sheet or any DB access. Respects the
    // live filters, search, sort, snapshot date, multi-date count, and the new
    // per-column filters (because we run through sortedCtxs which carries them).
    const handleExportCSV = () => {
        const includeDateCols = true;
        const headers: string[] = ['Athlete'];
        visibleCols.forEach(c => {
            const dateCount = Math.max(1, config.dateCounts[c.key] || 1);
            for (let i = 0; i < dateCount; i++) {
                const suffix = dateCount > 1 ? ` (#${i + 1})` : '';
                headers.push(`${c.label}${suffix}`);
                if (includeDateCols) headers.push(`${c.label}${suffix} Date`);
            }
        });
        const lines: string[][] = sortedCtxs.map(rc => {
            const row: string[] = [rc.player.name];
            visibleCols.forEach(c => {
                const dateCount = Math.max(1, config.dateCounts[c.key] || 1);
                for (let i = 0; i < dateCount; i++) {
                    const p = c.resolve(rc.ctx, i);
                    row.push(p.value == null ? '' : String(p.value));
                    if (includeDateCols) row.push(p.date || '');
                }
            });
            return row;
        });
        const csv = [headers, ...lines].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `athlete_data_hub_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
        URL.revokeObjectURL(url);
    };

    // ── Multi-table mode: pick the last N global dates from each column with history ──
    // For v1 of multi-table we anchor on the max date_count among visible columns and pull
    // global timeline rows. Per-row alignment still uses each athlete's own latest.
    const multiTableDates: { iso: string; label: string }[] = useMemo(() => {
        if (viewMode !== 'multi-table') return [];
        // Gather every visible col's most-recent date list across all filtered athletes
        const maxN = Math.max(1, ...visibleCols.map(c => config.dateCounts[c.key] || 1));
        const dateSet = new Set<string>();
        filteredCtxs.forEach(rc => {
            visibleCols.forEach(c => {
                if (!c.supportsHistory) return;
                for (let i = 0; i < (config.dateCounts[c.key] || 1); i++) {
                    const p = c.resolve(rc.ctx, i);
                    if (p.date) dateSet.add(p.date.slice(0, 10));
                }
            });
        });
        const all = [...dateSet].sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, Math.max(maxN, 1));
        return all.map(d => ({ iso: d, label: new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }) }));
    }, [viewMode, filteredCtxs, visibleCols, config.dateCounts]);

    // ── Resolve a cell's data point for multi-table (find the closest record on or before that date) ──
    // For each backing data source, we synthesise a context where index 0 is the matched record so the
    // existing column resolver runs unchanged. Sources that don't store dated history (ACWR scalar,
    // athlete identity, rolling averages anchored on "now") fall back to the live latest value.
    const resolveOnDate = (col: ColumnDef, rc: typeof filteredCtxs[number], iso: string): DataPoint => {
        if (col.group === 'Wellness' || col.key === 'availability' || col.key === 'painFlags') {
            const match = rc.ctx.wellnessSorted.find(w => w.session_date && w.session_date.slice(0, 10) <= iso);
            if (!match) return { value: null, date: null };
            const synthCtx = { ...rc.ctx, wellnessSorted: [match, ...rc.ctx.wellnessSorted.filter(w => w !== match)] };
            return col.resolve(synthCtx, 0);
        }
        if (col.key === 'activeInjury') {
            // Active at point in time = an injury whose dateOfInjury <= iso AND (status !== 'resolved' OR resolvedDate > iso)
            const matches = rc.ctx.allInjuries.filter(r => {
                const start = (r.dateOfInjury || r.date_of_injury || '').slice(0, 10);
                if (!start || start > iso) return false;
                if (r.status === 'resolved') {
                    const end = (r.resolvedDate || r.resolved_date || r.endDate || r.end_date || '').slice(0, 10);
                    if (end && end <= iso) return false;
                }
                return true;
            });
            const synthCtx = { ...rc.ctx, activeInjuries: matches };
            return col.resolve(synthCtx, 0);
        }
        if (col.group === 'Performance' && col.subsection === '1RM') {
            // Per-exercise 1RM — walk maxHistory for that exercise
            const exMatch = col.key.replace(/^oneRM_/, '').replace(/_/g, ' ').toLowerCase();
            const match = rc.ctx.maxHistory.find(m => m.exercise && m.exercise.toLowerCase() === exMatch && m.date && m.date.slice(0, 10) <= iso);
            if (!match) return { value: null, date: null };
            const synthCtx = { ...rc.ctx, maxHistory: [match, ...rc.ctx.maxHistory.filter(m => m !== match)] };
            return col.resolve(synthCtx, 0);
        }
        if (col.group === 'Performance') {
            const typeMap: Record<string, string> = { Hamstring: 'hamstring', DSI: 'dsi', RSI: 'rsi' };
            const t = typeMap[col.subsection || ''];
            if (!t) return col.resolve(rc.ctx, 0);
            const match = rc.ctx.perfSorted.filter(m => m.type === t).find(m => m.date && m.date.slice(0, 10) <= iso);
            if (!match) return { value: null, date: null };
            const synthCtx = { ...rc.ctx, perfSorted: [match, ...rc.ctx.perfSorted.filter(m => m !== match)] };
            return col.resolve(synthCtx, 0);
        }
        if (col.group === 'Workouts') {
            const match = rc.ctx.completedSessions.find(s => s.date && s.date.slice(0, 10) <= iso);
            if (!match) return { value: null, date: null };
            const synthCtx = { ...rc.ctx, completedSessions: [match, ...rc.ctx.completedSessions.filter(s => s !== match)] };
            return col.resolve(synthCtx, 0);
        }
        if (col.group === 'GPS') {
            const match = rc.ctx.gpsRecords.find(g => g.date && g.date.slice(0, 10) <= iso);
            if (!match) return { value: null, date: null };
            const synthCtx = { ...rc.ctx, gpsRecords: [match, ...rc.ctx.gpsRecords.filter(g => g !== match)] };
            return col.resolve(synthCtx, 0);
        }
        // ACWR scalar, Athlete identity, rolling averages — latest only
        return col.resolve(rc.ctx, 0);
    };

    // ─── Render ────────────────────────────────────────────────────────────
    const totalCols = 1 + visibleCols.length;
    // Multi-table mode renders as long as the scientist picked it AND we found
    // at least one date in history. With 0 unique dates (no history at all),
    // we fall back to single-table mode and surface a hint banner so the
    // selector understands why.
    const isMultiTable = viewMode === 'multi-table' && multiTableDates.length >= 1;
    const multiTableEmpty = viewMode === 'multi-table' && multiTableDates.length === 0;

    return (
        <div className={`flex flex-col gap-3 ${isMultiTable ? '' : 'h-[calc(100vh-40px)]'} animate-in fade-in duration-200`}>

            {/* ─── Consolidated banner (back · title · filters · actions) ─── */}
            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm shrink-0">
                <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-slate-500 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] hover:border-slate-300 dark:hover:border-indigo-500/40 transition-all shrink-0"
                            title="Back to Reporting Hub"
                        >
                            <ArrowLeftIcon size={14} />
                        </button>
                    )}
                    <div className="min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8]">Reporting Hub</p>
                        <h2 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">
                            Athlete Data Hub
                            <span className="ml-2 text-[10px] font-medium text-slate-400 dark:text-[#94A3B8]">
                                {filteredCtxs.length} athlete{filteredCtxs.length === 1 ? '' : 's'} · {totalCols} column{totalCols === 1 ? '' : 's'}
                                {snapshotDate && ` · frozen at ${snapshotDate}`}
                            </span>
                        </h2>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Search */}
                    <div className="relative">
                        <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#94A3B8]" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search athletes…"
                            className="pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-[11px] font-medium text-slate-700 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-indigo-400 w-40"
                        />
                    </div>

                    {/* Team filter */}
                    <CustomSelect variant="filter" size="xs" value={teamFilter} onChange={e => setTeamFilter(e.target.value)} prefixLabel="Team">
                        {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </CustomSelect>

                    {/* Snapshot date */}
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg" title="Freeze data at a specific date. Leave blank for live.">
                        <CalendarIcon size={12} className="text-slate-400 dark:text-[#CBD5E1]" />
                        <input
                            type="date"
                            value={snapshotDate}
                            onChange={e => setSnapshotDate(e.target.value)}
                            className="bg-transparent text-[11px] font-medium text-slate-700 dark:text-[#E2E8F0] outline-none w-28"
                        />
                        {snapshotDate && (
                            <button onClick={() => setSnapshotDate('')} className="text-slate-400 hover:text-rose-500 dark:text-[#CBD5E1]" title="Clear snapshot date"><XIcon size={11} /></button>
                        )}
                    </div>

                    {/* View mode */}
                    <div className="flex bg-slate-100 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg p-0.5">
                        {([
                            { id: 'metric-first', label: 'By Metric', title: 'Group sub-columns under each metric (best for trend studies)' },
                            { id: 'date-first',  label: 'By Date',   title: 'Group sub-columns by date (best for snapshot studies)' },
                            { id: 'multi-table', label: 'Tables',    title: 'One table per date — page scrolls vertically' },
                        ] as const).map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => setViewMode(opt.id)}
                                title={opt.title}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${viewMode === opt.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Active column-filters indicator + clear-all */}
                    {Object.keys(colFilters).length > 0 && (
                        <button
                            onClick={() => setColFilters({})}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 transition-colors"
                            title="Clear all per-column filters"
                        >
                            <FilterIcon size={11} /> {Object.keys(colFilters).length} active · clear
                        </button>
                    )}

                    {/* Columns modal trigger */}
                    <button
                        onClick={() => setModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-lg text-[11px] font-semibold text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-200 dark:hover:bg-[#243A58] transition-colors"
                    >
                        <ColumnsIcon size={12} /> Columns ({visibleCols.length})
                    </button>

                    {/* Legend toggle */}
                    <button
                        onClick={() => setShowLegend(s => !s)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-[11px] font-semibold transition-colors ${showLegend ? 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-700 dark:text-[#E2E8F0] border-slate-200 dark:border-[#243A58] hover:bg-slate-200 dark:hover:bg-[#243A58]'}`}
                    >
                        <GridIcon size={12} /> Legend
                    </button>

                    {/* Share */}
                    <div className="relative">
                        <button
                            onClick={() => { setSharePopoverOpen(o => !o); if (!sharePopoverOpen) { setShareUrl(null); setShareCopied(false); } }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] rounded-lg text-[11px] font-semibold text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-200 dark:hover:bg-[#243A58] transition-colors"
                        >
                            <Share2Icon size={12} /> Share
                        </button>
                        {sharePopoverOpen && (
                            <div className="absolute left-0 top-full mt-1.5 w-80 max-w-[calc(100vw-260px)] bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-2xl z-[100] p-4 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-[#E2E8F0]">Share Data Hub snapshot</h4>
                                    <button onClick={() => setSharePopoverOpen(false)} className="p-0.5 text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]"><XIcon size={12} /></button>
                                </div>
                                <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] leading-snug">
                                    Freezes the current view (columns, filters, dates, athlete order) and gives you a read-only link. Recipients don't need a Sentinel account.
                                </p>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={redactWellness}
                                        onChange={e => setRedactWellness(e.target.checked)}
                                        className="accent-indigo-600"
                                    />
                                    <span className="text-[11px] text-slate-700 dark:text-[#E2E8F0]">Redact wellness & availability columns</span>
                                </label>
                                {!shareUrl && (
                                    <button
                                        onClick={handleShare}
                                        disabled={shareWorking || visibleCols.length === 0}
                                        className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-wide shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {shareWorking ? 'Generating…' : 'Generate share link'}
                                    </button>
                                )}
                                {shareUrl && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg p-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={shareUrl}
                                                onClick={e => (e.target as HTMLInputElement).select()}
                                                className="flex-1 bg-transparent text-[10px] text-slate-700 dark:text-[#E2E8F0] outline-none font-mono truncate"
                                            />
                                            <button
                                                onClick={copyShareUrl}
                                                className={`p-1.5 rounded-md border transition-colors ${shareCopied ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-white dark:bg-[#132338] border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-500/40'}`}
                                                title="Copy link"
                                            >
                                                {shareCopied ? <CheckCircle2Icon size={11} /> : <CopyIcon size={11} />}
                                            </button>
                                            <a
                                                href={shareUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-1.5 rounded-md border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] text-slate-500 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-colors"
                                                title="Open in new tab"
                                            >
                                                <Share2Icon size={11} />
                                            </a>
                                        </div>
                                        <p className="text-[9px] text-slate-400 dark:text-[#94A3B8]">Anyone with this link can view the snapshot — it does not expire automatically.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Export */}
                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-semibold shadow-sm transition-all"
                    >
                        <DownloadIcon size={12} /> Export CSV
                    </button>
                </div>

                {/* Legend strip (collapsible) */}
                {showLegend && (
                    <div className="px-4 py-2.5 border-t border-slate-100 dark:border-[#243A58] flex flex-wrap items-center gap-3 text-[10px]">
                        <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8]">ACWR</span>
                        {[
                            { label: '< 0.8 Detraining',  cls: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' },
                            { label: '0.8–1.3 Optimal',   cls: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
                            { label: '1.3–1.5 Caution',   cls: 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300' },
                            { label: '> 1.5 Danger',       cls: 'bg-rose-600 dark:bg-rose-500 text-white' },
                        ].map(l => (
                            <span key={l.label} className={`font-semibold px-2 py-0.5 rounded-full uppercase ${l.cls}`}>{l.label}</span>
                        ))}
                        <span className="text-slate-300 dark:text-[#475569]">·</span>
                        <span className="font-bold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8]">Cell states</span>
                        <span className="font-semibold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#94A3B8]">Not configured</span>
                        <span className="text-slate-400 dark:text-[#CBD5E1] font-bold">— No data</span>
                    </div>
                )}
            </div>

            {/* Empty-state hint when scientist picks Tables mode but no history is available
                across the visible column set. Falls back to single-table render below. */}
            {multiTableEmpty && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-4 py-2.5 flex items-center gap-2 text-[11px] text-amber-700 dark:text-amber-300 shrink-0">
                    <AlertCircle size={14} />
                    No date history available for the visible columns yet — Tables mode needs at least one history-supporting column with data. Showing the latest snapshot below.
                </div>
            )}

            {/* ─── Table container ─── */}
            {isMultiTable ? (
                <div className="flex flex-col gap-4">
                    {multiTableDates.map(d => (
                        <DataHubTable
                            key={d.iso}
                            title={`Snapshot — ${d.label}`}
                            cols={visibleCols}
                            ctxs={sortedCtxs}
                            resolveCell={(col, rc) => resolveOnDate(col, rc, d.iso)}
                            mode="single"
                            dateCounts={{}}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                            dragKey={dragKey}
                            dragOverKey={dragOverKey}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            onDrop={handleDrop}
                            scrollPct={null}
                            onScroll={null}
                            colFilters={colFilters}
                            onOpenColMenu={setOpenMenuColKey}
                        />
                    ))}
                </div>
            ) : (
                <DataHubTable
                    cols={visibleCols}
                    ctxs={sortedCtxs}
                    resolveCell={(col, rc, idx) => col.resolve(rc.ctx, idx || 0)}
                    mode={viewMode}
                    dateCounts={config.dateCounts}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    dragKey={dragKey}
                    dragOverKey={dragOverKey}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    scrollPct={scrollPct}
                    onScroll={handleScroll}
                    tableWrapRef={tableWrapRef}
                    colFilters={colFilters}
                    onOpenColMenu={setOpenMenuColKey}
                />
            )}

            {/* Per-column menu (sort + quick filter) */}
            {openMenuColKey && (() => {
                const col = findColumn(openMenuColKey);
                if (!col) return null;
                // Build the set of distinct values for this column across the unfiltered athlete scope.
                // Used to render the quick-filter checklist. Capped at 50 distinct values.
                const distinctValues: string[] = (() => {
                    const seen = new Set<string>();
                    for (const c of athleteCtxs) {
                        const v = col.resolve(c.ctx, 0).value;
                        if (v != null && v !== '') {
                            seen.add(String(v));
                            if (seen.size > 50) break;
                        }
                    }
                    return [...seen].sort();
                })();
                const activeSet = colFilters[openMenuColKey] || new Set<string>();
                const toggleVal = (v: string) => {
                    setColFilters(prev => {
                        const next = { ...prev };
                        const set = new Set(next[openMenuColKey] || []);
                        if (set.has(v)) set.delete(v); else set.add(v);
                        if (set.size === 0) delete next[openMenuColKey]; else next[openMenuColKey] = set;
                        return next;
                    });
                };
                const clearFilter = () => {
                    setColFilters(prev => {
                        const next = { ...prev };
                        delete next[openMenuColKey];
                        return next;
                    });
                };
                return (
                    <div className="fixed inset-0 z-[800]" onClick={() => setOpenMenuColKey(null)}>
                        <div
                            className="absolute top-32 right-10 w-72 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-3 py-2 border-b border-slate-200 dark:border-[#243A58] flex items-center justify-between">
                                <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-700 dark:text-[#E2E8F0]">{col.label}</h4>
                                <button onClick={() => setOpenMenuColKey(null)} className="p-1 text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]"><XIcon size={12} /></button>
                            </div>
                            {/* Sort options */}
                            <div className="p-2 border-b border-slate-100 dark:border-[#243A58] space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8] px-2 mb-1">Sort</p>
                                <button
                                    onClick={() => { setSortKey(openMenuColKey); setSortDir('asc'); setOpenMenuColKey(null); }}
                                    className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-[11px] font-semibold transition-colors ${sortKey === openMenuColKey && sortDir === 'asc' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'}`}
                                >
                                    <ArrowUpIcon size={11} /> Sort ascending
                                </button>
                                <button
                                    onClick={() => { setSortKey(openMenuColKey); setSortDir('desc'); setOpenMenuColKey(null); }}
                                    className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-[11px] font-semibold transition-colors ${sortKey === openMenuColKey && sortDir === 'desc' ? 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-[#E2E8F0] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'}`}
                                >
                                    <ArrowDownIcon size={11} /> Sort descending
                                </button>
                                {sortKey === openMenuColKey && (
                                    <button
                                        onClick={() => { setSortKey(null); setOpenMenuColKey(null); }}
                                        className="w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]"
                                    >
                                        <RotateCcwIcon size={11} /> Clear sort
                                    </button>
                                )}
                            </div>
                            {/* Quick filter */}
                            <div className="p-2 max-h-72 overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between px-2 mb-1">
                                    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#94A3B8]">
                                        Filter ({distinctValues.length} value{distinctValues.length === 1 ? '' : 's'})
                                    </p>
                                    {activeSet.size > 0 && (
                                        <button onClick={clearFilter} className="text-[9px] font-bold text-indigo-500 dark:text-indigo-300 uppercase">Clear</button>
                                    )}
                                </div>
                                {distinctValues.length === 0 && (
                                    <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] italic px-2 py-2">No values to filter — this column may have only empty cells in the current scope.</p>
                                )}
                                {distinctValues.map(v => {
                                    const checked = activeSet.has(v);
                                    return (
                                        <button
                                            key={v}
                                            onClick={() => toggleVal(v)}
                                            className="w-full text-left px-2 py-1 rounded flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
                                        >
                                            <span className={`w-3.5 h-3.5 rounded flex items-center justify-center border-2 shrink-0 ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-[#475569]'}`}>
                                                {checked && <CheckCircle2Icon size={8} className="text-white" />}
                                            </span>
                                            <span className="text-[11px] text-slate-700 dark:text-[#E2E8F0] truncate">{v}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Selector modal */}
            <DataHubColumnsModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onCommit={setConfig}
                initial={config}
                lastDateForColumn={lastDateForColumn}
            />
        </div>
    );
};

// ─── Inner table component (shared between single and multi modes) ─────────
interface TableProps {
    title?: string;
    cols: ColumnDef[];
    ctxs: any[];
    resolveCell: (col: ColumnDef, ctx: any, dateIdx?: number) => DataPoint;
    mode: 'metric-first' | 'date-first' | 'single';
    dateCounts: Record<string, number>;
    sortKey: string | null;
    sortDir: 'asc' | 'desc';
    onSort: (key: string) => void;
    dragKey: string | null;
    dragOverKey: string | null;
    onDragStart: (key: string) => (e: React.DragEvent) => void;
    onDragOver: (key: string) => (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDrop: (key: string) => (e: React.DragEvent) => void;
    scrollPct: number | null;
    onScroll: ((e: React.UIEvent) => void) | null;
    tableWrapRef?: React.RefObject<HTMLDivElement>;
    /** Per-column filter map keyed by column.key */
    colFilters?: Record<string, Set<string>>;
    /** Callback when scientist clicks the filter icon on a column header */
    onOpenColMenu?: (key: string) => void;
    /** Read-only mode disables drag/click-to-sort + menu (for shared snapshots) */
    readOnly?: boolean;
}

const DataHubTable: React.FC<TableProps> = ({
    title, cols, ctxs, resolveCell, mode, dateCounts, sortKey, sortDir, onSort,
    dragKey, dragOverKey, onDragStart, onDragOver, onDragEnd, onDrop, scrollPct, onScroll, tableWrapRef,
    colFilters, onOpenColMenu, readOnly,
}) => {
    // Determine the effective "date count" per column for multi-date display.
    // Single-date columns always render once. History-supporting columns use the count.
    const dateCount = (c: ColumnDef): number => c.supportsHistory ? Math.max(1, dateCounts[c.key] || 1) : 1;

    return (
        <div className={`bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm flex flex-col min-h-0 overflow-hidden ${mode === 'single' ? '' : 'flex-1'}`}>
            {title && (
                <div className="px-4 py-2.5 border-b border-slate-200 dark:border-[#243A58] flex items-center gap-2 shrink-0">
                    <CalendarIcon size={12} className="text-indigo-500 dark:text-indigo-300" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-700 dark:text-[#E2E8F0]">{title}</h3>
                </div>
            )}

            {/* Horizontal scroll progress line */}
            {scrollPct != null && (
                <div className="h-0.5 w-full bg-slate-100 dark:bg-[#0F1C30] relative shrink-0">
                    <div className="h-full bg-indigo-500 transition-all duration-75 ease-linear" style={{ width: `${scrollPct}%` }} />
                </div>
            )}

            {/* Scroll body — sticky athlete column, sticky header row */}
            <div
                ref={tableWrapRef}
                onScroll={onScroll || undefined}
                className="flex-1 min-h-0 overflow-auto custom-scrollbar"
            >
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-900 dark:bg-[#0F1C30] text-white dark:text-[#CBD5E1]">
                        <tr>
                            {/* Athlete header — sticky left + top */}
                            <th
                                onClick={() => onSort('__name')}
                                className="sticky left-0 z-30 bg-slate-900 dark:bg-[#0F1C30] p-3 text-[9px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap cursor-pointer select-none border-r border-slate-700 dark:border-[#1A2D48]"
                            >
                                <div className="flex items-center gap-1">
                                    Athlete
                                    {sortKey === '__name'
                                        ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                                        : <ChevronDown size={10} className="opacity-20" />
                                    }
                                </div>
                            </th>
                            {cols.map(c => {
                                const n = dateCount(c);
                                const activeFilter = (colFilters && colFilters[c.key] && colFilters[c.key].size > 0);
                                return (
                                    <th
                                        key={c.key}
                                        colSpan={n}
                                        draggable={!readOnly}
                                        onDragStart={!readOnly ? onDragStart(c.key) : undefined}
                                        onDragOver={!readOnly ? onDragOver(c.key) : undefined}
                                        onDragEnd={!readOnly ? onDragEnd : undefined}
                                        onDrop={!readOnly ? onDrop(c.key) : undefined}
                                        className={`p-3 text-[9px] font-semibold uppercase tracking-[0.15em] whitespace-nowrap select-none hover:bg-slate-800 dark:hover:bg-[#1A2D48] transition-colors text-center relative ${dragOverKey === c.key && dragKey !== c.key ? 'ring-2 ring-inset ring-indigo-400' : ''}`}
                                    >
                                        <div className="flex items-center gap-1 justify-center">
                                            {!readOnly && <GripIcon size={9} className="opacity-30 cursor-grab shrink-0" />}
                                            <button onClick={(e) => { e.stopPropagation(); onSort(c.key); }} className="hover:text-indigo-300 transition-colors flex items-center gap-1">
                                                {c.label}
                                                {sortKey === c.key
                                                    ? sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                                                    : <ChevronDown size={10} className="opacity-20" />
                                                }
                                            </button>
                                            {/* Per-column menu (sort + quick filter). Filter icon turns indigo when active. */}
                                            {!readOnly && onOpenColMenu && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onOpenColMenu(c.key); }}
                                                    className={`p-0.5 rounded transition-colors ${activeFilter ? 'text-indigo-300' : 'text-slate-500 hover:text-white'}`}
                                                    title="Sort & filter"
                                                >
                                                    <FilterIcon size={10} />
                                                </button>
                                            )}
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                        {/* Sub-header row for multi-date columns (only when any column has >1).
                            Each sub-th carries its own bg so sticky scrolling never reveals the
                            scrolling body row underneath. */}
                        {cols.some(c => dateCount(c) > 1) && (
                            <tr className="bg-slate-800 dark:bg-[#0A1628]">
                                <th className="sticky left-0 z-30 bg-slate-800 dark:bg-[#0A1628] p-2 border-r border-slate-700 dark:border-[#1A2D48]" />
                                {cols.flatMap(c => {
                                    const n = dateCount(c);
                                    return Array.from({ length: n }).map((_, i) => (
                                        <th
                                            key={`${c.key}__${i}`}
                                            className="bg-slate-800 dark:bg-[#0A1628] p-2 text-[8px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] whitespace-nowrap text-center"
                                        >
                                            {n === 1 ? '' : i === 0 ? 'Latest' : `L-${i}`}
                                        </th>
                                    ));
                                })}
                            </tr>
                        )}
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                        {ctxs.length === 0 ? (
                            <tr>
                                <td colSpan={1 + cols.reduce((s, c) => s + dateCount(c), 0)} className="p-12 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wide">No athletes match the current filters.</p>
                                </td>
                            </tr>
                        ) : ctxs.map((rc, ri) => (
                            <tr key={rc.player.id || ri} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]/50 transition-colors group">
                                {/* Athlete sticky cell */}
                                <td className="sticky left-0 z-10 bg-white dark:bg-[#132338] group-hover:bg-slate-50 dark:group-hover:bg-[#1A2D48]/50 transition-colors border-r border-slate-100 dark:border-[#1A2D48] p-3 whitespace-nowrap">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-900 dark:text-[#E2E8F0]">{rc.player.name}</span>
                                        <span className="text-[9px] text-slate-400 dark:text-[#94A3B8]">{rc.squad}</span>
                                    </div>
                                </td>
                                {cols.flatMap(c => {
                                    const n = dateCount(c);
                                    // Per-athlete config check — used to distinguish "Not configured" from "No data yet"
                                    const hasConfig = c.requiresConfig === 'gps' ? !!rc.ctx.teamConfig?.hasGPS
                                        : c.requiresConfig === 'acwr' ? !!rc.ctx.teamConfig?.hasACWR
                                        : true;
                                    return Array.from({ length: n }).map((_, i) => {
                                        const point = resolveCell(c, rc, i);
                                        const stale = c.staleAfterDays != null && point.date && (daysSince(point.date) ?? 0) > c.staleAfterDays;
                                        return (
                                            <td key={`${c.key}__${i}`} className={`p-3 whitespace-nowrap text-center ${stale ? 'bg-amber-50/40 dark:bg-amber-500/5' : ''}`}>
                                                <div className="flex flex-col items-center gap-0.5">
                                                    {renderCellValue(c, point, { hasConfig })}
                                                    {point.date && n > 1 && (
                                                        <span className="text-[8px] text-slate-300 dark:text-[#475569] font-medium">{formatDate(point.date)}</span>
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    });
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
