// @ts-nocheck
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';
import { ACWRMetricCard } from '../components/analytics/ACWRMetricCard';
import { DataHub } from '../components/analytics/DataHub';
import { SupabaseStorageService as StorageService } from '../services/storageService';
import { DatabaseService } from '../services/databaseService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { useExerciseMap } from '../hooks/useExerciseMap';
import { RunningMechanicsLibrary } from '../components/conditioning/RunningMechanicsLibrary';
import GpsColumnMapper, { findMatchingProfile } from '../components/performance/GpsColumnMapper';
import type { GpsProfile, ProfileMatchResult } from '../components/performance/GpsColumnMapper';
import { loadGpsProfiles, loadGpsCategories, saveGpsCategories, getProfileForTeam } from '../components/performance/GpsConfigModal';
import type { GpsTeamProfile, GpsCategory } from '../components/performance/GpsConfigModal';
import SmartCsvMapper from '../components/ui/SmartCsvMapper';
import { HR_SCHEMA } from '../utils/csvSchemas';
import {
    UsersIcon, TrendingUpIcon, ActivityIcon, AlertTriangleIcon, SearchIcon, AlertCircleIcon,
    CalendarIcon, HeartPulseIcon, DumbbellIcon, FlameIcon, BatteryIcon, ShieldAlertIcon,
    TargetIcon, ZapIcon, InfoIcon, AwardIcon, BrainIcon, MicroscopeIcon,
    StethoscopeIcon, TestTubeIcon, DnaIcon, HeartIcon, PlusIcon, MapPinIcon, UploadIcon,
    PrinterIcon, DownloadIcon, SaveIcon, XIcon, CheckIcon, ChevronRightIcon, PlayIcon,
    FastForwardIcon, FileTextIcon, MoreVerticalIcon, HashIcon, PhoneIcon, MailIcon, StarIcon,
    FilterIcon, RefreshCcwIcon, Share2Icon, UploadCloudIcon, ExternalLinkIcon, ListIcon,
    BookOpenIcon, ClockIcon, PenToolIcon, TrashIcon, ChevronDownIcon, PlayCircleIcon,
    ShieldIcon, CheckCircleIcon, LayoutDashboardIcon, BarChart3Icon, FileIcon, FlaskConicalIcon,
    PanelLeftIcon, PanelLeftCloseIcon, ChevronUpIcon, EyeIcon, EyeOffIcon, CopyIcon,
    GridIcon, TableIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon, MaximizeIcon, AlertOctagonIcon,
    EditIcon, Edit2Icon, Edit3Icon, UserPlusIcon, UserMinusIcon, UserCheckIcon, SettingsIcon,
    LayersIcon, FolderIcon, TagIcon, LinkIcon, GripVerticalIcon, MoveIcon, RotateCcwIcon,
    Trash2Icon, PlusCircleIcon, MinusCircleIcon, ArrowLeftIcon, ArrowRightIcon, MenuIcon,
    SlidersIcon, DatabaseIcon, WifiIcon, WifiOffIcon, CloudIcon, CloudOffIcon, BellIcon,
    LogOutIcon, LogInIcon, KeyIcon, LockIcon, UnlockIcon, ImageIcon, VideoIcon, MicIcon,
    Volume2Icon, VolumeXIcon, GlobeIcon, MapIcon, NavigationIcon, CompassIcon, CameraIcon,
    SparklesIcon, FileDownIcon, UndoIcon, FileEditIcon, UserIcon, MoonIcon, ClipboardListIcon, FootprintsIcon
} from 'lucide-react';

// ── GPS meta-columns: handled specially, never shown as data columns ──────────
const GPS_META_COLS = new Set([
    'Player number', 'Player name', 'Session name', 'Phase name', 'Type',
]);

// ── GPS column priority — matches Polar CSV order ─────────────────────────────
const GPS_COL_PRIORITY = (k: string): number => {
    if (/^duration$/i.test(k)) return 0;
    if (/end time/i.test(k)) return 1;
    if (/^hr (min|avg|max) \[bpm\]/i.test(k)) return 10;
    if (/^hr (min|avg|max) \[%\]/i.test(k)) return 11;
    if (/time in hr zone/i.test(k)) return 12;
    if (/total distance/i.test(k)) return 20;
    if (/distance \/ min/i.test(k)) return 21;
    if (/maximum speed/i.test(k)) return 22;
    if (/average speed/i.test(k)) return 23;
    if (/^sprints?$/i.test(k)) return 24;
    if (/distance in speed zone/i.test(k)) return 30;
    if (/number of accelerations \(-/i.test(k)) return 41; // decelerations first
    if (/number of accelerations/i.test(k)) return 40;
    if (/^calories/i.test(k)) return 50;
    if (/training load score/i.test(k)) return 51;
    if (/^cardio load$/i.test(k)) return 52;
    if (/recovery time/i.test(k)) return 53;
    if (/time in power zone/i.test(k)) return 60;
    if (/muscle load in power zone/i.test(k)) return 61;
    if (/^muscle load$/i.test(k)) return 62;
    if (/rr interval/i.test(k)) return 70;
    if (/hrv|rmssd/i.test(k)) return 71;
    return 99;
};
const gpsSortCols = (a: string, b: string) => {
    const pa = GPS_COL_PRIORITY(a), pb = GPS_COL_PRIORITY(b);
    return pa !== pb ? pa - pb : a.localeCompare(b);
};

// ── Module-level GPS helpers (stable component types — no scroll reset) ────────

// Format cell: strip date prefix from Polar datetime "DD-MM-YYYY HH:MM:SS" → "HH:MM:SS"
const fmtGpsCell = (v: any): string => {
    if (v === undefined || v === null || v === '') return '—';
    if (typeof v === 'string') {
        const dt = v.match(/^\d{2}-\d{2}-\d{4}\s(\d{2}:\d{2}:\d{2})$/);
        if (dt) return dt[1];
        if (v.trim() === '') return '—';
    }
    const n = parseFloat(v as string);
    return isNaN(n) ? String(v) : n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

interface GpsSessionTableProps {
    rows: any[];
    cols: string[];
    colLabel: (k: string) => string;
    onHideCol: (k: string) => void;
}

const GpsSessionTable = React.memo(({ rows, cols, colLabel, onHideCol }: GpsSessionTableProps) => {
    const avgs: Record<string, string> = {};
    for (const k of cols) {
        const nums = rows.map((r: any) => parseFloat(r.rawColumns?.[k])).filter((n: number) => !isNaN(n));
        avgs[k] = nums.length ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toLocaleString(undefined, { maximumFractionDigits: 1 }) : '—';
    }
    const sorted = [...rows].sort((a: any, b: any) => (a.matchedName || a.playerName).localeCompare(b.matchedName || b.playerName));
    return (
        <div className="overflow-x-auto">
            <table className="text-left w-full" style={{ minWidth: `${Math.max(640, (cols.length + 1) * 110)}px` }}>
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide whitespace-nowrap min-w-[180px]">Athlete</th>
                        {cols.map(k => (
                            <th key={k} className="group px-3 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                    <span className="truncate max-w-[130px]" title={colLabel(k)}>{colLabel(k)}</span>
                                    <button onClick={() => onHideCol(k)} title="Hide column"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                                        <EyeOffIcon size={10} />
                                    </button>
                                </div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {sorted.map((r: any) => {
                        const playerNum = r.rawColumns?.['Player number'];
                        return (
                            <tr key={r.id} className="hover:bg-indigo-50/30 transition-colors group">
                                <td className="sticky left-0 z-10 bg-white group-hover:bg-indigo-50 px-4 py-2.5 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        {playerNum && (
                                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-[9px] font-bold flex items-center justify-center shrink-0">
                                                {playerNum}
                                            </span>
                                        )}
                                        <div>
                                            <span className="text-sm font-semibold text-slate-900">{r.matchedName || r.playerName}</span>
                                            <span className={`block text-[9px] font-bold uppercase tracking-wide ${r.athleteId === 'unknown' ? 'text-rose-400' : 'text-emerald-500'}`}>
                                                {r.athleteId === 'unknown' ? 'unlinked' : 'verified'}
                                            </span>
                                        </div>
                                    </div>
                                </td>
                                {cols.map(k => (
                                    <td key={k} className="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap tabular-nums">{fmtGpsCell(r.rawColumns?.[k])}</td>
                                ))}
                            </tr>
                        );
                    })}
                    <tr className="bg-slate-50/80 border-t-2 border-slate-200 font-semibold">
                        <td className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap">Squad Avg</td>
                        {cols.map(k => (
                            <td key={k} className="px-3 py-2.5 text-sm font-semibold text-slate-700 whitespace-nowrap tabular-nums">{avgs[k]}</td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
});

interface GpsDateRangeViewProps {
    records: any[];
    cols: string[];
    colLabel: (k: string) => string;
    onHideCol: (k: string) => void;
    categories: { id: string; label: string; color?: string }[];
    onChangeDateCategory: (date: string, categoryId: string) => void;
}

// Holds its own collapse state — clicking a section header does NOT re-render the parent
const GpsDateRangeView = React.memo(({ records, cols, colLabel, onHideCol, categories, onChangeDateCategory }: GpsDateRangeViewProps) => {
    const [expandedDates, setExpandedDates] = useState<Set<string> | null>(null);
    const dateGroups = useMemo(() => [...new Set(records.map((r: any) => r.date))].sort((a, b) => b.localeCompare(a)) as string[], [records]);
    const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

    const isExpanded = (date: string, idx: number) => expandedDates === null ? idx === 0 : expandedDates.has(date);
    const toggle = (date: string) => {
        setExpandedDates(prev => {
            const current = prev === null ? new Set([dateGroups[0]]) : new Set(prev);
            current.has(date) ? current.delete(date) : current.add(date);
            return current;
        });
    };

    const CAT_COLORS: Record<string, string> = {
        match: 'bg-red-50 text-red-600 border-red-200',
        recovery: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        training: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{dateGroups.length} sessions · {records.length} athlete records</p>
                <div className="flex items-center gap-2">
                    <button onClick={() => setExpandedDates(new Set())} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Collapse All</button>
                    <button onClick={() => setExpandedDates(new Set(dateGroups))} className="text-[10px] font-semibold text-slate-400 hover:text-slate-600 px-2.5 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Expand All</button>
                </div>
            </div>
            {dateGroups.map((date, idx) => {
                const dateRows = records.filter((r: any) => r.date === date);
                const expanded = isExpanded(date, idx);
                const currentCat = dateRows[0]?.category || 'training';
                const catColor = CAT_COLORS[currentCat] || 'bg-slate-50 text-slate-600 border-slate-200';
                return (
                    <div key={date} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                            {/* Collapsible trigger (left section) */}
                            <button
                                className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                                onClick={() => toggle(date)}
                            >
                                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white shrink-0">
                                    <CalendarIcon size={13} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-900">{fmtDate(date)}</h4>
                                    <p className="text-[10px] text-slate-400">{dateRows.length} athletes</p>
                                </div>
                            </button>
                            {/* Session type dropdown */}
                            <select
                                value={currentCat}
                                onChange={e => onChangeDateCategory(date, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${catColor}`}
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                            </select>
                            {/* Chevron */}
                            <button onClick={() => toggle(date)} className="p-1 text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                                <ChevronDownIcon size={16} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                        {expanded && <GpsSessionTable rows={dateRows} cols={cols} colLabel={colLabel} onHideCol={onHideCol} />}
                    </div>
                );
            })}
        </div>
    );
});

export const ReportingHubPage = () => {
    const {
        teams, setTeams, loadRecords, setLoadRecords, wellnessData, habitRecords, scheduledSessions,
        gpsData, setGpsData, hrData, setHrData, kpiRecords, volumeRecords,
        selectedAnalyticsAthleteId, setSelectedAnalyticsAthleteId,
        activeReport, setActiveReport, reportMode, setReportMode,
        activeTab, setActiveTab, questionnaires, setQuestionnaires,
        hrReportViewMode, setHrReportViewMode, hrReportSelectedAthlete, setHrReportSelectedAthlete,
        dataHubTab, setDataHubTab,
        medicalReports, setMedicalReports, medicalFilterAthleteId, setMedicalFilterAthleteId,
        isMedicalModalOpen, setIsMedicalModalOpen, medicalModalMode, setMedicalModalMode,
        inspectingMedicalRecord, setInspectingMedicalRecord,
        optOutForm, setOptOutForm,
        optOuts, setOptOuts,
        showToast, wellnessDateRange, setWellnessDateRange, calculateACWR, calculateMonotony,
        acwrSettings,
        isLoading,
        polarIntegration, gpsDataSources,
    } = useAppState();

    // --- Local state for GPS Data report ---
    const [gpsFilterTarget, setGpsFilterTarget] = useState('All Athletes');
    const [gpsFilterDateMode, setGpsFilterDateMode] = useState<'range' | 'single'>('range');
    const [gpsRangeStart, setGpsRangeStart] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0];
    });
    const [gpsRangeEnd, setGpsRangeEnd] = useState(() => new Date().toISOString().split('T')[0]);
    const [gpsSpecificDate, setGpsSpecificDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [gpsImportStatus, setGpsImportStatus] = useState<'success' | 'error' | null>(null);
    const [gpsImportMessage, setGpsImportMessage] = useState('');
    const [gpsImportTeamId, setGpsImportTeamId] = useState<string>('');
    const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());
    const [polarSyncStatus, setPolarSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
    const [polarSyncMessage, setPolarSyncMessage] = useState('');

    // Smart GPS import dialog state
    const [gpsSmartDialog, setGpsSmartDialog] = useState<{
        headers: string[];
        rows: Record<string, string>[];
        athleteCol: string;
        dateCol: string;
        phaseCol: string;
    } | null>(null);

    // GPS dialog field selections (proper state, not IIFE hooks)
    const [gpsDialogAthleteCol, setGpsDialogAthleteCol] = useState('');
    const [gpsDialogDateCol, setGpsDialogDateCol] = useState('');
    const [gpsDialogPhaseCol, setGpsDialogPhaseCol] = useState('');

    // GPS column visibility config (persisted to localStorage)
    const [gpsColumnConfig, setGpsColumnConfig] = useState<{key: string; visible: boolean; retired?: boolean}[]>(() => {
        try { return JSON.parse(localStorage.getItem('gps_col_cfg') || '[]'); } catch { return []; }
    });
    const [gpsColConfigOpen, setGpsColConfigOpen] = useState(false);

    // Post-import unlinked athlete dialog
    const [gpsUnlinkedDialog, setGpsUnlinkedDialog] = useState<{name: string}[] | null>(null);

    // GPS tab: 'import' | 'manual'
    const [gpsTab, setGpsTab] = useState<'import' | 'manual'>('import');

    // Separate warning state for missing columns (non-blocking, distinct from import success/error)
    const [gpsMissingColWarning, setGpsMissingColWarning] = useState<string[]>([]);

    // GPS profile + category state for import dialog
    const [gpsImportCategory, setGpsImportCategory]   = useState<string>('training');
    const [gpsNewCatLabel, setGpsNewCatLabel]         = useState('');
    const [gpsShowNewCat, setGpsShowNewCat]           = useState(false);
    const [gpsDialogCategories, setGpsDialogCategories] = useState<GpsCategory[]>(() => loadGpsCategories());
    const [gpsMatchedProfile, setGpsMatchedProfile]   = useState<GpsTeamProfile | null>(null);
    const [gpsNewColumns, setGpsNewColumns]           = useState<string[]>([]); // columns in file not in saved profile

    // Column manager search
    const [gpsColSearch, setGpsColSearch] = useState('');

    // Manual entry state
    const [manualDate, setManualDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [manualTeamId, setManualTeamId] = useState('');
    const [manualRows, setManualRows] = useState<Record<string, Record<string, string>>>({});
    const [manualColConfig, setManualColConfig] = useState<{key: string; label: string}[]>([]);
    const [manualColPickerOpen, setManualColPickerOpen] = useState(false);
    const [newManualColName, setNewManualColName] = useState('');

    // All unique session dates in stored GPS data (most recent first)
    const gpsSessionDates = useMemo(() =>
        [...new Set((Array.isArray(gpsData) ? gpsData : []).map(r => r.date).filter(Boolean))].sort((a, b) => b.localeCompare(a))
    , [gpsData]);

    // ── GPS → ACWR auto-sync ─────────────────────────────────────────────────
    // Runs once on mount and whenever gpsData changes to ensure GPS records
    // with a configured ACWR column are reflected in training_loads.
    const gpsSyncedRef = useRef(false);

    const syncGpsToLoadRecords = useCallback(async (records: any[]) => {
        const profiles = loadGpsProfiles();
        const toSync: any[] = [];
        for (const rec of records) {
            if (!rec.athleteId || rec.athleteId === 'unknown') continue;
            // Find team this athlete belongs to
            const team = teams.find(t => (t.players || []).some((p: any) => p.id === rec.athleteId));
            if (!team) continue;
            // Find GPS profile for that team
            const profile = profiles.find(p => p.teamId === team.id);
            if (!profile?.acwrColumn) continue;
            // Get value: use pre-computed acwrValue, or extract from rawColumns
            let val = rec.acwrValue;
            if ((val === null || val === undefined) && rec.rawColumns?.[profile.acwrColumn] !== undefined) {
                val = parseFloat(rec.rawColumns[profile.acwrColumn]);
            }
            if (val === null || val === undefined || isNaN(val)) continue;
            // Metric type: use the team's configured ACWR method (default sprint_distance)
            const metric_type = acwrSettings?.[team.id]?.method || 'sprint_distance';
            toSync.push({
                athlete_id: rec.athleteId,
                team_id: team.id,
                date: rec.date,
                metric_type,
                value: val,
                session_type: rec.category || 'training',
            });
        }
        if (toSync.length === 0) return;
        try {
            await DatabaseService.saveTrainingLoadsBatch(toSync);
            // Refresh load records in state
            const fresh = await DatabaseService.fetchTrainingLoads();
            const mapped = fresh.map((r: any) => ({
                athleteId: r.athlete_id,
                athlete_id: r.athlete_id,
                date: r.date,
                sRPE: r.metric_type === 'srpe' ? Number(r.value) : 0,
                value: Number(r.value),
                metric_type: r.metric_type,
                session_type: r.session_type,
            }));
            setLoadRecords((prev: any[]) => {
                const dbKeys = new Set(mapped.map((r: any) => `${r.athlete_id}_${(r.date||'').split('T')[0]}_${r.metric_type}`));
                const localOnly = (prev || []).filter((r: any) => {
                    const key = `${r.athleteId || r.athlete_id}_${(r.date||'').split('T')[0]}_${r.metric_type || 'srpe'}`;
                    return !dbKeys.has(key);
                });
                return [...localOnly, ...mapped];
            });
        } catch (e) {
            console.warn('GPS→ACWR sync failed:', e);
        }
    }, [teams, acwrSettings, setLoadRecords]);

    // Auto-sync on mount (covers existing GPS data already in storage)
    useEffect(() => {
        if (gpsSyncedRef.current || !gpsData?.length || !teams?.length) return;
        gpsSyncedRef.current = true;
        syncGpsToLoadRecords(gpsData);
    }, [gpsData, teams]);

    // Stable derivation of all column keys ever seen across gpsData (memoised — avoids stale reads inside render fn)
    const gpsHistoricalColKeys = useMemo(() => {
        const keys: string[] = [];
        const seen = new Set<string>();
        for (const r of Array.isArray(gpsData) ? gpsData : []) {
            for (const k of Object.keys(r.rawColumns || {})) {
                if (!seen.has(k)) { keys.push(k); seen.add(k); }
            }
        }
        return keys;
    }, [gpsData]);

    // Merged column config: stable, excludes meta-columns (Player number, Phase name, Type, etc.)
    const gpsMergedColConfig = useMemo(() => {
        const existing = new Map(gpsColumnConfig.map(c => [c.key, c]));
        const seen = new Set(gpsHistoricalColKeys);
        for (const k of gpsHistoricalColKeys) {
            if (!existing.has(k) && !GPS_META_COLS.has(k)) existing.set(k, { key: k, visible: true });
        }
        return [...existing.values()]
            .filter(c => !GPS_META_COLS.has(c.key))
            .map(c => ({ ...c, retired: !seen.has(c.key) }));
    }, [gpsHistoricalColKeys, gpsColumnConfig]);

    // Pre-filtered GPS records — computed once, used by the render fn (not recomputed inside it)
    const gpsFilteredRecords = useMemo(() => {
        const data = Array.isArray(gpsData) ? gpsData : [];
        return data.filter(d => {
            const dateOk = gpsFilterDateMode === 'single'
                ? d.date === gpsSpecificDate
                : d.date >= gpsRangeStart && d.date <= gpsRangeEnd;
            if (!dateOk) return false;
            if (gpsFilterTarget === 'All Athletes') return true;
            const targetTeam = teams.find(t => t.name === gpsFilterTarget);
            if (targetTeam) return targetTeam.players.some(p => p.id === d.athleteId);
            const targetPlayer = teams.flatMap(t => t.players).find(p => p.name === gpsFilterTarget);
            if (targetPlayer) return d.athleteId === targetPlayer.id;
            return false;
        });
    }, [gpsData, gpsFilterDateMode, gpsSpecificDate, gpsRangeStart, gpsRangeEnd, gpsFilterTarget, teams]);

    // Visible column keys for the GPS table — derived from filtered records
    const gpsVisibleColKeys = useMemo(() => {
        const keys: string[] = [];
        const seen = new Set<string>();
        for (const r of gpsFilteredRecords) {
            for (const k of Object.keys(r.rawColumns || {})) {
                if (!seen.has(k)) { keys.push(k); seen.add(k); }
            }
        }
        return keys
            .filter(k => {
                const cfg = gpsMergedColConfig.find(c => c.key === k);
                return cfg ? cfg.visible !== false : true;
            })
            .sort(gpsSortCols);
    }, [gpsFilteredRecords, gpsMergedColConfig]);

    // Stable GPS callbacks passed to module-level components (prevent unnecessary re-renders)
    const gpsActiveProfile = useMemo(() =>
        gpsImportTeamId ? getProfileForTeam(gpsImportTeamId) : null
    , [gpsImportTeamId]);

    const gpsColLabel = useCallback((k: string) => {
        if (gpsActiveProfile) {
            const mapping = Array.isArray(gpsActiveProfile.columnMapping) ? gpsActiveProfile.columnMapping.find((m: any) => m.csvColumn === k) : undefined;
            if (mapping?.displayName && mapping.displayName !== k) return mapping.displayName;
        }
        return k.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    }, [gpsActiveProfile]);

    const gpsSaveColConfig = useCallback((cfg: {key: string; visible: boolean; retired?: boolean}[]) => {
        setGpsColumnConfig(cfg);
        try { localStorage.setItem('gps_col_cfg', JSON.stringify(cfg)); } catch {}
    }, []);

    const gpsHideCol = useCallback((k: string) => {
        setGpsColumnConfig(prev => {
            const updated = prev.map(c => c.key === k ? { ...c, visible: false } : c);
            try { localStorage.setItem('gps_col_cfg', JSON.stringify(updated)); } catch {}
            return updated;
        });
    }, []);

    const gpsChangeDateCategory = useCallback((date: string, categoryId: string) => {
        setGpsData((prev: any[]) => {
            const updated = prev.map((r: any) => r.date === date ? { ...r, category: categoryId } : r);
            StorageService.saveGpsData(updated);
            return updated;
        });
    }, [setGpsData]);

    const [hrReportDateRange, setHrReportDateRange] = useState({ start: '2025-01-01', end: new Date().toISOString().split('T')[0] });
    const [hrImportStatus, setHrImportStatus] = useState<'success' | 'error' | null>(null);
    const [hrImportMessage, setHrImportMessage] = useState('');
    const [hrReportSelectedTeam, setHrReportSelectedTeam] = useState('');
    const hrFileRef = useRef<HTMLInputElement>(null);
    const [isHrMapperOpen, setIsHrMapperOpen] = useState(false);
    const [hrCsvHeaders, setHrCsvHeaders] = useState<string[]>([]);
    const [hrCsvRows, setHrCsvRows] = useState<Record<string, string>[]>([]);
    const [trackingTab, setTrackingTab] = useState('Tonnage Trends');
    const [trackingSelectedAthlete, setTrackingSelectedAthlete] = useState('');
    const [trackingDateRange, setTrackingDateRange] = useState(() => {
        const end = new Date().toISOString().split('T')[0];
        const d = new Date(); d.setDate(d.getDate() - 30);
        return { start: d.toISOString().split('T')[0], end };
    });
    const [trackingSelectedTeam, setTrackingSelectedTeam] = useState('');
    const [trackingPeriod, setTrackingPeriod] = useState<'This Week' | 'This Month' | 'Custom'>('This Month');
    const [trackingLoadPeriod, setTrackingLoadPeriod] = useState<'Day' | 'Week' | 'Month' | 'Custom'>('Month');
    const [trackingLoadView, setTrackingLoadView] = useState<'body_part' | 'region'>('body_part');
    const [trackingLoadCustomRange, setTrackingLoadCustomRange] = useState(() => {
        const end = new Date().toISOString().split('T')[0];
        const d = new Date(); d.setDate(d.getDate() - 30);
        return { start: d.toISOString().split('T')[0], end };
    });
    const [trackingSortCol, setTrackingSortCol] = useState('totalTonnage');
    const [trackingSortDir, setTrackingSortDir] = useState<'asc' | 'desc'>('desc');

    // ── HR CSV Import ──────────────────────────────────────────────────────
    const HR_ZONE_DEFS = [
        { zone: 'Z1', label: 'Recovery', min: 0, max: 60, color: 'bg-sky-400' },
        { zone: 'Z2', label: 'Aerobic', min: 60, max: 70, color: 'bg-emerald-400' },
        { zone: 'Z3', label: 'Tempo', min: 70, max: 80, color: 'bg-amber-400' },
        { zone: 'Z4', label: 'Threshold', min: 80, max: 90, color: 'bg-orange-500' },
        { zone: 'Z5', label: 'VO2 Max', min: 90, max: 100, color: 'bg-red-500' },
    ];

    const classifyZone = (hr: number, maxHr: number) => {
        if (!maxHr || maxHr <= 0) return 'Z3';
        const pct = (hr / maxHr) * 100;
        for (const z of HR_ZONE_DEFS) { if (pct < z.max) return z.zone; }
        return 'Z5';
    };

    // HR CSV — Step 1: read file, open SmartCsvMapper
    const handleHrFileUpload = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = (ev.target.result as string).trim();
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { setHrImportStatus('error'); setHrImportMessage('CSV file is empty.'); return; }
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).filter(l => l.trim()).map(line => {
                const cols = line.split(',').map(c => c.trim());
                const obj: Record<string, string> = {};
                headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
                return obj;
            });
            setHrCsvHeaders(headers);
            setHrCsvRows(rows);
            setIsHrMapperOpen(true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // HR CSV — Step 2: SmartCsvMapper confirmed → process mapped data
    const handleHrMapperConfirm = ({ rows, mapping }: { rows: Record<string, string>[]; mapping: Record<string, string> }) => {
        setIsHrMapperOpen(false);
        const getVal = (row: Record<string, string>, fieldId: string) => mapping[fieldId] ? row[mapping[fieldId]] : '';
        const parsed = [];

        for (const row of rows) {
            const num = (fieldId: string) => parseFloat(getVal(row, fieldId)) || 0;
            const str = (fieldId: string) => getVal(row, fieldId) || '';

            const avgHr = num('avg_hr');
            const maxHr = num('max_hr');
            if (!avgHr && !maxHr) continue;

            parsed.push({
                id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                date: str('date') || new Date().toISOString().split('T')[0],
                session: str('session') || 'Session',
                athlete: str('athlete') || '',
                avgHr, maxHr,
                minHr: num('min_hr'),
                duration: num('duration'),
                trimp: num('trimp'),
                calories: num('calories'),
                zones: {
                    z1: num('z1'), z2: num('z2'), z3: num('z3'), z4: num('z4'), z5: num('z5'),
                },
                recoveryHr: num('recovery_hr'),
                zone: classifyZone(avgHr, maxHr || 200),
            });
        }

        if (parsed.length === 0) { setHrImportStatus('error'); setHrImportMessage('No valid HR rows found after mapping.'); return; }

        const updated = [...(Array.isArray(hrData) ? hrData : []), ...parsed];
        setHrData(updated);
        StorageService.saveHrData(updated);
        setHrImportStatus('success');
        setHrImportMessage(`Imported ${parsed.length} session${parsed.length > 1 ? 's' : ''} successfully.`);
        setTimeout(() => setHrImportStatus(null), 5000);
    };

    const handleClearHrData = () => {
        if (!confirm('Clear all imported HR data?')) return;
        setHrData([]);
        StorageService.saveHrData([]);
        showToast('HR data cleared', 'success');
    };

    const renderHeartRateMetricsReport = () => {
        // Filter data by date range and athlete
        const allPlayers = teams.flatMap(t => t.players || []);
        const safeHrData = Array.isArray(hrData) ? hrData : [];
        const selectedTeamPlayers = hrReportSelectedTeam
            ? (teams.find(t => t.id === hrReportSelectedTeam)?.players || []).map(p => p.name.toLowerCase())
            : [];
        const filtered = safeHrData.filter(d => {
            if (d.date < hrReportDateRange.start || d.date > hrReportDateRange.end) return false;
            if (hrReportViewMode === 'Team' && hrReportSelectedTeam && d.athlete) {
                if (!selectedTeamPlayers.some(name => d.athlete.toLowerCase().includes(name))) return false;
            }
            if (hrReportViewMode === 'Individual' && hrReportSelectedAthlete) {
                const player = allPlayers.find(p => p.id === hrReportSelectedAthlete);
                if (player && d.athlete && !d.athlete.toLowerCase().includes(player.name.toLowerCase())) return false;
            }
            return true;
        }).sort((a, b) => a.date.localeCompare(b.date));

        // Compute KPIs from real data
        const avgSessionHr = filtered.length > 0 ? Math.round(filtered.reduce((s, d) => s + d.avgHr, 0) / filtered.length) : 0;
        const peakHr = filtered.length > 0 ? Math.max(...filtered.map(d => d.maxHr || d.avgHr)) : 0;
        const avgTrimp = filtered.length > 0 ? Math.round(filtered.reduce((s, d) => s + (d.trimp || 0), 0) / filtered.length) : 0;
        const totalSessions = filtered.length;

        // Zone distribution across all sessions
        const zoneTotals = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
        const zoneSessionCount = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
        for (const d of filtered) {
            if (d.zones) { for (const k of Object.keys(zoneTotals)) zoneTotals[k] += d.zones[k] || 0; }
            if (d.zone) zoneSessionCount[d.zone] = (zoneSessionCount[d.zone] || 0) + 1;
        }
        const hasZoneTime = Object.values(zoneTotals).some(v => v > 0);
        const totalZoneTime = Object.values(zoneTotals).reduce((a, b) => a + b, 0);

        // Avg recovery HR
        const recoveryEntries = filtered.filter(d => d.recoveryHr > 0);
        const avgRecoveryHr = recoveryEntries.length > 0 ? Math.round(recoveryEntries.reduce((s, d) => s + d.recoveryHr, 0) / recoveryEntries.length) : 0;

        // Chart data — limit to last 20 sessions for readability
        const chartData = filtered.slice(-20);

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Controls Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit">
                        {['Team', 'Individual'].map(m => (
                            <button key={m} onClick={() => setHrReportViewMode(m)}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${hrReportViewMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                {m} View
                            </button>
                        ))}
                    </div>
                    {hrReportViewMode === 'Team' && (
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <UsersIcon size={14} className="text-slate-400" />
                            <select value={hrReportSelectedTeam} onChange={(e) => setHrReportSelectedTeam(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase">
                                <option value="">All Teams</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}
                    {hrReportViewMode === 'Individual' && (
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <UserIcon size={14} className="text-slate-400" />
                            <select value={hrReportSelectedAthlete} onChange={(e) => setHrReportSelectedAthlete(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase">
                                <option value="">All Athletes</option>
                                {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <CalendarIcon size={14} className="text-slate-400" />
                        <input type="date" value={hrReportDateRange.start} onChange={(e) => setHrReportDateRange({ ...hrReportDateRange, start: e.target.value })}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase w-24" />
                        <span className="text-slate-300">-</span>
                        <input type="date" value={hrReportDateRange.end} onChange={(e) => setHrReportDateRange({ ...hrReportDateRange, end: e.target.value })}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input ref={hrFileRef} type="file" accept=".csv" className="hidden" onChange={handleHrFileUpload} />
                        <button onClick={() => hrFileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-[10px] font-semibold uppercase tracking-wide hover:bg-indigo-700 transition-all">
                            <UploadIcon size={13} /> Import CSV
                        </button>
                        {safeHrData.length > 0 && (
                            <button onClick={handleClearHrData} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-semibold hover:bg-red-50 hover:text-red-500 transition-all">
                                <Trash2Icon size={12} /> Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Import status */}
                {hrImportStatus && (
                    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold ${hrImportStatus === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                        {hrImportStatus === 'success' ? <CheckIcon size={14} /> : <AlertCircleIcon size={14} />}
                        {hrImportMessage}
                    </div>
                )}

                {/* CSV format help */}
                {safeHrData.length === 0 && !hrImportStatus && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-3">
                        <HeartPulseIcon size={32} className="mx-auto text-slate-300" />
                        <h4 className="text-sm font-semibold text-slate-700">Import Heart Rate Data</h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">Upload a CSV file from your HR monitoring system (Polar, Garmin, Catapult, FirstBeat, etc). Supported columns:</p>
                        <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                            {['date', 'session', 'athlete', 'avg_hr', 'max_hr', 'min_hr', 'duration', 'trimp', 'calories', 'z1-z5', 'recovery_hr'].map(c => (
                                <span key={c} className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-mono text-slate-600">{c}</span>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400">Minimum required: <strong>avg_hr</strong> or <strong>max_hr</strong>. All other columns are optional.</p>
                        <button onClick={() => hrFileRef.current?.click()} className="mt-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-all">
                            <UploadIcon size={14} className="inline mr-1.5" /> Choose CSV File
                        </button>
                    </div>
                )}

                {/* ── Dashboard (only shown when data exists) ── */}
                {filtered.length > 0 && (
                    <>
                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-indigo-200 transition-colors">
                                <div className="text-xs font-medium text-slate-500">Avg Session HR</div>
                                <div className="text-3xl font-bold text-slate-900">{avgSessionHr} <span className="text-sm font-normal text-slate-400">BPM</span></div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-600 rounded-full" style={{ width: `${Math.min((avgSessionHr / 200) * 100, 100)}%` }} /></div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-indigo-200 transition-colors">
                                <div className="text-xs font-medium text-slate-500">Peak HR (Period)</div>
                                <div className="text-3xl font-bold text-slate-900">{peakHr} <span className="text-sm font-normal text-slate-400">BPM</span></div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min((peakHr / 220) * 100, 100)}%` }} /></div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-emerald-200 transition-colors">
                                <div className="text-xs font-medium text-slate-500">{avgRecoveryHr > 0 ? 'Avg Recovery HR' : 'Total Sessions'}</div>
                                {avgRecoveryHr > 0
                                    ? <div className="text-3xl font-bold text-emerald-600">{avgRecoveryHr} <span className="text-sm font-normal text-emerald-300">BPM</span></div>
                                    : <div className="text-3xl font-bold text-slate-900">{totalSessions}</div>
                                }
                                <div className="text-xs text-slate-400">{avgRecoveryHr > 0 ? 'Post-session 2min recovery' : `In selected date range`}</div>
                            </div>
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 hover:border-amber-200 transition-colors">
                                <div className="text-xs font-medium text-slate-500">{avgTrimp > 0 ? 'Avg TRIMP' : 'Total Sessions'}</div>
                                {avgTrimp > 0
                                    ? <div className="text-3xl font-bold text-amber-600">{avgTrimp} <span className="text-sm font-normal text-amber-300">AU</span></div>
                                    : <div className="text-3xl font-bold text-slate-900">{totalSessions}</div>
                                }
                                <div className="text-xs text-slate-400">{avgTrimp > 0 ? 'Training impulse per session' : 'Across period'}</div>
                            </div>
                        </div>

                        {/* Session Load Chart */}
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="text-base font-semibold text-slate-800">Session Load Analysis</h4>
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-xs text-slate-400">Avg HR</span></div>
                                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-300" /><span className="text-xs text-slate-400">Max HR</span></div>
                                </div>
                            </div>
                            <div className="h-64 flex items-end gap-1 px-2 overflow-x-auto">
                                {chartData.map((d, i) => (
                                    <div key={d.id || i} className="flex flex-col items-center gap-2 group cursor-pointer" style={{ minWidth: chartData.length > 12 ? 36 : undefined, flex: chartData.length <= 12 ? 1 : undefined }}>
                                        <div className="relative w-full flex items-end justify-center h-56">
                                            <div className="w-full max-w-[36px] bg-cyan-100 rounded-t-lg absolute bottom-0 transition-all duration-500 group-hover:bg-cyan-200"
                                                style={{ height: `${((d.maxHr || d.avgHr) / 220) * 100}%` }} />
                                            <div className="w-full max-w-[36px] bg-indigo-600 rounded-t-lg relative z-10 transition-all duration-500 group-hover:scale-y-105 origin-bottom shadow-md shadow-indigo-200"
                                                style={{ height: `${(d.avgHr / 220) * 100}%` }}>
                                                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                                    {d.avgHr} / {d.maxHr || '—'} BPM{d.trimp ? ` · TRIMP ${d.trimp}` : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full text-center">
                                            <div className="text-[8px] font-black uppercase text-slate-400 truncate">{d.date.slice(5)}</div>
                                            <div className="text-[7px] font-bold uppercase text-indigo-300 truncate">{d.session}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Zone Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h4 className="text-sm font-semibold text-slate-800">HR Zone Distribution</h4>
                                {hasZoneTime ? (
                                    <div className="space-y-2.5">
                                        {HR_ZONE_DEFS.map(z => {
                                            const val = zoneTotals[z.zone.toLowerCase()] || 0;
                                            const pct = totalZoneTime > 0 ? (val / totalZoneTime) * 100 : 0;
                                            return (
                                                <div key={z.zone} className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-slate-500 w-6">{z.zone}</span>
                                                    <span className="text-[9px] text-slate-400 w-16">{z.label}</span>
                                                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${z.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-600 w-10 text-right">{Math.round(pct)}%</span>
                                                    <span className="text-[9px] text-slate-400 w-12 text-right">{Math.round(val)}m</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {HR_ZONE_DEFS.map(z => {
                                            const count = zoneSessionCount[z.zone] || 0;
                                            const pct = totalSessions > 0 ? (count / totalSessions) * 100 : 0;
                                            return (
                                                <div key={z.zone} className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-slate-500 w-6">{z.zone}</span>
                                                    <span className="text-[9px] text-slate-400 w-16">{z.label}</span>
                                                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className={`h-full ${z.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-bold text-slate-600 w-12 text-right">{count} sess</span>
                                                </div>
                                            );
                                        })}
                                        <p className="text-[9px] text-slate-400 italic">Based on avg HR per session. Import z1–z5 columns for time-in-zone breakdown.</p>
                                    </div>
                                )}
                            </div>
                            {/* Session Table */}
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-sm font-semibold text-slate-800">Session Log ({filtered.length})</h4>
                                <div className="max-h-64 overflow-y-auto -mx-1">
                                    <table className="w-full text-xs">
                                        <thead className="sticky top-0 bg-white">
                                            <tr className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-100">
                                                <th className="text-left py-2 px-2">Date</th>
                                                <th className="text-left py-2 px-2">Session</th>
                                                {hrReportViewMode === 'Team' && <th className="text-left py-2 px-2">Athlete</th>}
                                                <th className="text-right py-2 px-2">Avg</th>
                                                <th className="text-right py-2 px-2">Max</th>
                                                <th className="text-right py-2 px-2">Zone</th>
                                                {avgTrimp > 0 && <th className="text-right py-2 px-2">TRIMP</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.slice(-30).reverse().map((d, i) => {
                                                const zDef = HR_ZONE_DEFS.find(z => z.zone === d.zone);
                                                return (
                                                    <tr key={d.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                        <td className="py-2 px-2 text-slate-600 font-medium">{d.date}</td>
                                                        <td className="py-2 px-2 text-slate-700 font-semibold">{d.session}</td>
                                                        {hrReportViewMode === 'Team' && <td className="py-2 px-2 text-slate-500">{d.athlete || '—'}</td>}
                                                        <td className="py-2 px-2 text-right font-bold text-indigo-600">{d.avgHr}</td>
                                                        <td className="py-2 px-2 text-right font-bold text-slate-700">{d.maxHr || '—'}</td>
                                                        <td className="py-2 px-2 text-right"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${zDef?.color || 'bg-slate-400'}`}>{d.zone}</span></td>
                                                        {avgTrimp > 0 && <td className="py-2 px-2 text-right text-amber-600 font-semibold">{d.trimp || '—'}</td>}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        );
    };

    // ─── Tracking Hub: Exercise Map for body-part resolution ────
    const { exerciseFullMap } = useExerciseMap();

    // ─── Tracking Hub: Real Data Fetch ────
    const [completedSessions, setCompletedSessions] = useState<any[]>([]);
    useEffect(() => {
        DatabaseService.fetchCompletedSessionResults()
            .then(setCompletedSessions)
            .catch((err) => console.error('Failed to fetch completed sessions:', err));
    }, [scheduledSessions]);

    // Flatten real completed sessions into tonnage rows
    const realTonnageData = useMemo(() => {
        const allPlayers = teams.flatMap(t => t.players);
        const playerMap: Record<string, string> = {};
        for (const p of allPlayers) playerMap[p.id] = p.name;

        const rows: { date: string; athleteId: string; athleteName: string; exerciseId: string; exercise: string; sets: number; reps: number; weight: number; tonnage: number }[] = [];
        for (const session of completedSessions) {
            if (!session.actual_results || session.track_tonnage === false) continue;
            const date = session.date;
            for (const [athleteId, exercises] of Object.entries(session.actual_results as Record<string, any[]>)) {
                const athleteName = playerMap[athleteId] || 'Unknown';
                for (const ex of (exercises || [])) {
                    rows.push({
                        date,
                        athleteId,
                        athleteName,
                        exerciseId: ex.exerciseId || '',
                        exercise: ex.exerciseName || 'Unknown',
                        sets: ex.sets || 0,
                        reps: ex.reps || 0,
                        weight: ex.weight || 0,
                        tonnage: ex.tonnage || (ex.sets * ex.reps * ex.weight) || 0,
                    });
                }
            }
        }
        return rows;
    }, [completedSessions, teams]);

    // All athletes across all teams (including Private Clients synthetic team)
    const allTrackingAthletes = useMemo(() => teams.flatMap(t => t.players), [teams]);

    const TONNAGE_DATA = realTonnageData;

    // Auto-select first athlete/team if not set
    if (!trackingSelectedAthlete && allTrackingAthletes.length > 0) {
        setTimeout(() => setTrackingSelectedAthlete(allTrackingAthletes[0].id), 0);
    }
    if (!trackingSelectedTeam && teams.length > 0) {
        setTimeout(() => setTrackingSelectedTeam(teams[0].id), 0);
    }

    // Tab 1: Tonnage Trends computations
    const trackingAthleteData = useMemo(() =>
        TONNAGE_DATA.filter(d =>
            d.athleteId === trackingSelectedAthlete &&
            d.date >= trackingDateRange.start && d.date <= trackingDateRange.end
        ), [TONNAGE_DATA, trackingSelectedAthlete, trackingDateRange]);

    const trackingSessionTonnage = useMemo(() => {
        const map: Record<string, number> = {};
        trackingAthleteData.forEach(d => { map[d.date] = (map[d.date] || 0) + d.tonnage; });
        return Object.entries(map).map(([date, tonnage]) => ({
            date, tonnage, label: new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })).sort((a, b) => a.date.localeCompare(b.date));
    }, [trackingAthleteData]);

    const trackingKpis = useMemo(() => {
        const now = new Date();
        const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        const weekStr = weekAgo.toISOString().split('T')[0];
        const weeklyTotal = trackingAthleteData.filter(d => d.date >= weekStr).reduce((s, d) => s + d.tonnage, 0);
        const monthlyTotal = trackingAthleteData.reduce((s, d) => s + d.tonnage, 0);
        const sessionCount = new Set(trackingAthleteData.map(d => d.date)).size;
        const avgPerSession = sessionCount > 0 ? Math.round(monthlyTotal / sessionCount) : 0;
        const peak = trackingSessionTonnage.reduce((best, s) => s.tonnage > best.tonnage ? s : best, { tonnage: 0, date: '', label: '' });
        return { weeklyTotal, monthlyTotal, avgPerSession, peakTonnage: peak.tonnage, peakDate: peak.label };
    }, [trackingAthleteData, trackingSessionTonnage]);

    const trackingExerciseBreakdown = useMemo(() => {
        const map: Record<string, { sets: number; reps: number; totalWeight: number; tonnage: number; count: number }> = {};
        trackingAthleteData.forEach(d => {
            if (!map[d.exercise]) map[d.exercise] = { sets: 0, reps: 0, totalWeight: 0, tonnage: 0, count: 0 };
            const e = map[d.exercise];
            e.sets += d.sets; e.reps += d.reps; e.totalWeight += d.weight; e.tonnage += d.tonnage; e.count++;
        });
        return Object.entries(map).map(([exercise, v]) => ({
            exercise, sets: v.sets, reps: v.reps, avgWeight: Math.round(v.totalWeight / v.count), tonnage: v.tonnage
        })).sort((a, b) => b.tonnage - a.tonnage);
    }, [trackingAthleteData]);

    // Tab 2: Team Overview computations
    const trackingTeamPeriodRange = useMemo(() => {
        const now = new Date();
        let periodStart: string, periodEnd: string, priorStart: string, priorEnd: string;
        if (trackingPeriod === 'This Week') {
            const day = now.getDay() || 7;
            const monday = new Date(now); monday.setDate(now.getDate() - day + 1);
            periodStart = monday.toISOString().split('T')[0];
            periodEnd = now.toISOString().split('T')[0];
            const priorMonday = new Date(monday); priorMonday.setDate(priorMonday.getDate() - 7);
            const priorSunday = new Date(monday); priorSunday.setDate(priorSunday.getDate() - 1);
            priorStart = priorMonday.toISOString().split('T')[0];
            priorEnd = priorSunday.toISOString().split('T')[0];
        } else if (trackingPeriod === 'This Month') {
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            periodEnd = now.toISOString().split('T')[0];
            const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            priorStart = pm.toISOString().split('T')[0];
            priorEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        } else {
            periodStart = trackingDateRange.start;
            periodEnd = trackingDateRange.end;
            const days = Math.max(1, (new Date(periodEnd).getTime() - new Date(periodStart).getTime()) / 86400000);
            const ps = new Date(new Date(periodStart).getTime() - days * 86400000);
            priorStart = ps.toISOString().split('T')[0];
            priorEnd = new Date(new Date(periodStart).getTime() - 86400000).toISOString().split('T')[0];
        }
        return { periodStart, periodEnd, priorStart, priorEnd };
    }, [trackingPeriod, trackingDateRange]);

    const trackingTeamStats = useMemo(() => {
        const team = teams.find(t => t.id === trackingSelectedTeam);
        if (!team) return [];
        const { periodStart, periodEnd, priorStart, priorEnd } = trackingTeamPeriodRange;
        return team.players.map(player => {
            const current = TONNAGE_DATA.filter(d => d.athleteId === player.id && d.date >= periodStart && d.date <= periodEnd);
            const prior = TONNAGE_DATA.filter(d => d.athleteId === player.id && d.date >= priorStart && d.date <= priorEnd);
            const totalTonnage = current.reduce((s, d) => s + d.tonnage, 0);
            const priorTonnage = prior.reduce((s, d) => s + d.tonnage, 0);
            const sessions = new Set(current.map(d => d.date)).size;
            const avgPerSession = sessions > 0 ? Math.round(totalTonnage / sessions) : 0;
            const trend = priorTonnage > 0 ? Math.round(((totalTonnage - priorTonnage) / priorTonnage) * 100) : 0;
            return { id: player.id, name: player.name, sessions, totalTonnage, avgPerSession, trend };
        });
    }, [teams, trackingSelectedTeam, TONNAGE_DATA, trackingTeamPeriodRange]);

    const trackingSortedTeamStats = useMemo(() => {
        return [...trackingTeamStats].sort((a, b) => {
            const aVal = (a as any)[trackingSortCol] ?? 0;
            const bVal = (b as any)[trackingSortCol] ?? 0;
            return trackingSortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });
    }, [trackingTeamStats, trackingSortCol, trackingSortDir]);

    const handleTrackingSort = (col: string) => {
        if (trackingSortCol === col) setTrackingSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setTrackingSortCol(col); setTrackingSortDir('desc'); }
    };
    const TrackingSortIcon = ({ col }: { col: string }) => trackingSortCol === col
        ? (trackingSortDir === 'asc' ? <ArrowUpIcon size={10} /> : <ArrowDownIcon size={10} />)
        : <MinusIcon size={8} className="opacity-30" />;

    // Tab 3: Load Distribution — body part / region tonnage breakdown
    const BODY_PART_COLORS_MAP: Record<string, string> = {
        'Chest': '#f43f5e', 'Back': '#0ea5e9', 'Shoulders': '#f59e0b', 'Biceps': '#06b6d4',
        'Triceps': '#8b5cf6', 'Quadriceps': '#10b981', 'Hamstrings': '#84cc16', 'Glutes': '#ec4899',
        'Calves': '#14b8a6', 'Abdominals': '#f97316', 'Forearms': '#78716c', 'Trapezius': '#6366f1',
        'Hip Flexors': '#d946ef', 'Adductors': '#3b82f6', 'Abductors': '#a855f7', 'Shins': '#22c55e',
    };
    const BODY_PART_BG: Record<string, string> = {
        'Chest': 'bg-rose-100 text-rose-700', 'Back': 'bg-sky-100 text-sky-700', 'Shoulders': 'bg-amber-100 text-amber-700',
        'Biceps': 'bg-cyan-100 text-cyan-700', 'Triceps': 'bg-violet-100 text-violet-700', 'Quadriceps': 'bg-emerald-100 text-emerald-700',
        'Hamstrings': 'bg-lime-100 text-lime-700', 'Glutes': 'bg-pink-100 text-pink-700', 'Calves': 'bg-teal-100 text-teal-700',
        'Abdominals': 'bg-orange-100 text-orange-700', 'Forearms': 'bg-stone-100 text-stone-600', 'Trapezius': 'bg-indigo-100 text-indigo-700',
        'Hip Flexors': 'bg-fuchsia-100 text-fuchsia-700', 'Adductors': 'bg-blue-100 text-blue-700', 'Abductors': 'bg-purple-100 text-purple-700',
        'Shins': 'bg-green-100 text-green-700',
    };
    const REGION_COLORS_MAP: Record<string, string> = {
        'Upper Body': '#6366f1', 'Lower Body': '#10b981', 'Core': '#f59e0b', 'Full Body': '#a855f7',
    };
    const REGION_BG: Record<string, string> = {
        'Upper Body': 'bg-indigo-100 text-indigo-700', 'Lower Body': 'bg-emerald-100 text-emerald-700',
        'Core': 'bg-amber-100 text-amber-700', 'Full Body': 'bg-purple-100 text-purple-700',
    };
    // Map body parts → regions
    const BODY_PART_TO_REGION: Record<string, string> = {
        'Chest': 'Upper Body', 'Back': 'Upper Body', 'Shoulders': 'Upper Body', 'Biceps': 'Upper Body',
        'Triceps': 'Upper Body', 'Forearms': 'Upper Body', 'Trapezius': 'Upper Body',
        'Quadriceps': 'Lower Body', 'Hamstrings': 'Lower Body', 'Glutes': 'Lower Body',
        'Calves': 'Lower Body', 'Hip Flexors': 'Lower Body', 'Adductors': 'Lower Body',
        'Abductors': 'Lower Body', 'Shins': 'Lower Body',
        'Abdominals': 'Core',
    };

    const trackingLoadData = useMemo(() => {
        const team = teams.find(t => t.id === trackingSelectedTeam);
        const players = team ? team.players : allTrackingAthletes;
        const playerIds = new Set(players.map(p => p.id));
        const now = new Date();
        let start: string, end: string;
        if (trackingLoadPeriod === 'Day') {
            start = end = now.toISOString().split('T')[0];
        } else if (trackingLoadPeriod === 'Week') {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString().split('T')[0];
            end = now.toISOString().split('T')[0];
        } else if (trackingLoadPeriod === 'Custom') {
            start = trackingLoadCustomRange.start;
            end = trackingLoadCustomRange.end;
        } else {
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30).toISOString().split('T')[0];
            end = now.toISOString().split('T')[0];
        }

        const filtered = TONNAGE_DATA.filter(d => playerIds.has(d.athleteId) && d.date >= start && d.date <= end);

        // Aggregate tonnage and sets by body part
        const byBodyPart: Record<string, { tonnage: number; sets: number; exercises: Set<string> }> = {};
        const byRegion: Record<string, { tonnage: number; sets: number }> = {};
        let totalTonnage = 0;
        let totalSets = 0;

        for (const row of filtered) {
            totalTonnage += row.tonnage;
            totalSets += row.sets;

            // Resolve body parts from exercise map
            const exInfo = exerciseFullMap[row.exerciseId];
            const bodyParts = exInfo?.body_parts || [];

            if (bodyParts.length === 0) {
                // Fallback: tag as 'Unsorted'
                if (!byBodyPart['Unsorted']) byBodyPart['Unsorted'] = { tonnage: 0, sets: 0, exercises: new Set() };
                byBodyPart['Unsorted'].tonnage += row.tonnage;
                byBodyPart['Unsorted'].sets += row.sets;
                byBodyPart['Unsorted'].exercises.add(row.exercise);

                if (!byRegion['Full Body']) byRegion['Full Body'] = { tonnage: 0, sets: 0 };
                byRegion['Full Body'].tonnage += row.tonnage;
                byRegion['Full Body'].sets += row.sets;
            } else {
                // Split tonnage evenly across body parts (if exercise targets multiple)
                const share = row.tonnage / bodyParts.length;
                const setShare = row.sets / bodyParts.length;
                for (const bp of bodyParts) {
                    if (!byBodyPart[bp]) byBodyPart[bp] = { tonnage: 0, sets: 0, exercises: new Set() };
                    byBodyPart[bp].tonnage += share;
                    byBodyPart[bp].sets += setShare;
                    byBodyPart[bp].exercises.add(row.exercise);

                    const region = BODY_PART_TO_REGION[bp] || 'Full Body';
                    if (!byRegion[region]) byRegion[region] = { tonnage: 0, sets: 0 };
                    byRegion[region].tonnage += share;
                    byRegion[region].sets += setShare;
                }
            }
        }

        const bodyPartList = Object.entries(byBodyPart)
            .map(([name, v]) => ({ name, tonnage: Math.round(v.tonnage), sets: Math.round(v.sets), exerciseCount: v.exercises.size, pct: totalTonnage > 0 ? Math.round((v.tonnage / totalTonnage) * 100) : 0 }))
            .sort((a, b) => b.tonnage - a.tonnage);

        const regionList = Object.entries(byRegion)
            .map(([name, v]) => ({ name, tonnage: Math.round(v.tonnage), sets: Math.round(v.sets), pct: totalTonnage > 0 ? Math.round((v.tonnage / totalTonnage) * 100) : 0 }))
            .sort((a, b) => b.tonnage - a.tonnage);

        return { bodyPartList, regionList, totalTonnage: Math.round(totalTonnage), totalSets: Math.round(totalSets) };
    }, [teams, trackingSelectedTeam, TONNAGE_DATA, trackingLoadPeriod, trackingLoadCustomRange, allTrackingAthletes, exerciseFullMap]);

    const TrackingTrendArrow = ({ value }: { value: number }) => {
        if (value > 2) return <span className="flex items-center gap-0.5 text-emerald-600 text-xs font-bold"><ArrowUpIcon size={12} />+{value}%</span>;
        if (value < -2) return <span className="flex items-center gap-0.5 text-rose-600 text-xs font-bold"><ArrowDownIcon size={12} />{value}%</span>;
        return <span className="flex items-center gap-0.5 text-slate-400 text-xs font-bold"><MinusIcon size={12} />0%</span>;
    };

    // (trackingMedalColors removed — leaderboard replaced with load distribution)

    // ─── Tracking Hub Render ─────────────────────────────────────────
    const renderTrackingHub = () => {
        const tabs = ['Tonnage Trends', 'Team Overview', 'Load Distribution'];
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Tab pills */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit border border-slate-200">
                    {tabs.map(tab => (
                        <button key={tab} onClick={() => setTrackingTab(tab)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${trackingTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                {/* ═══ TAB 1: TONNAGE TRENDS ═══ */}
                {trackingTab === 'Tonnage Trends' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-4 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">Athlete</label>
                                <select value={trackingSelectedAthlete} onChange={e => setTrackingSelectedAthlete(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 min-w-[180px]">
                                    {allTrackingAthletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">From</label>
                                <input type="date" value={trackingDateRange.start} onChange={e => setTrackingDateRange(r => ({ ...r, start: e.target.value }))}
                                    className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50" />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">To</label>
                                <input type="date" value={trackingDateRange.end} onChange={e => setTrackingDateRange(r => ({ ...r, end: e.target.value }))}
                                    className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50" />
                            </div>
                        </div>

                        {/* KPI Cards */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Weekly Total', value: `${trackingKpis.weeklyTotal.toLocaleString()} kg`, icon: <CalendarIcon size={16} className="text-indigo-500" />, sub: 'Last 7 days' },
                                { label: 'Monthly Total', value: `${trackingKpis.monthlyTotal.toLocaleString()} kg`, icon: <DumbbellIcon size={16} className="text-indigo-500" />, sub: 'Selected range' },
                                { label: 'Avg / Session', value: `${trackingKpis.avgPerSession.toLocaleString()} kg`, icon: <TrendingUpIcon size={16} className="text-indigo-500" />, sub: `${new Set(trackingAthleteData.map(d => d.date)).size} sessions` },
                                { label: 'Peak Session', value: `${trackingKpis.peakTonnage.toLocaleString()} kg`, icon: <ZapIcon size={16} className="text-amber-500" />, sub: trackingKpis.peakDate || '—' },
                            ].map(kpi => (
                                <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">{kpi.icon}</div>
                                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{kpi.label}</span>
                                    </div>
                                    <div className="text-2xl font-black text-slate-900">{kpi.value}</div>
                                    <div className="text-[10px] text-slate-400 mt-1">{kpi.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* Bar Chart */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                            <h4 className="text-sm font-bold text-slate-800 mb-4">Session Tonnage Over Time</h4>
                            {trackingSessionTonnage.length > 0 ? (
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={trackingSessionTonnage} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="label" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                                        <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}t`} />
                                        <Tooltip formatter={(value: number) => [`${value.toLocaleString()} kg`, 'Tonnage']}
                                            contentStyle={{ fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                        <Bar dataKey="tonnage" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">No data for selected range</div>
                            )}
                        </div>

                        {/* Exercise Breakdown Table */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <h4 className="text-sm font-bold text-slate-800">Exercise Breakdown</h4>
                            </div>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase text-slate-400 tracking-wide">Exercise</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wide">Sets</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wide">Reps</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-slate-400 tracking-wide">Avg Weight</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-slate-400 tracking-wide">Tonnage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackingExerciseBreakdown.map((row, i) => (
                                        <tr key={row.exercise} className={`border-b border-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                                            <td className="px-5 py-3 text-xs font-semibold text-slate-700">{row.exercise}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 text-center">{row.sets}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 text-center">{row.reps}</td>
                                            <td className="px-4 py-3 text-xs text-slate-600 text-center">{row.avgWeight} kg</td>
                                            <td className="px-4 py-3 text-xs font-bold text-indigo-700 text-right">{row.tonnage.toLocaleString()} kg</td>
                                        </tr>
                                    ))}
                                    {trackingExerciseBreakdown.length > 0 && (
                                        <tr className="bg-indigo-50/50 border-t border-indigo-100">
                                            <td className="px-5 py-3 text-xs font-bold text-indigo-900">Total</td>
                                            <td className="px-4 py-3 text-xs font-bold text-indigo-700 text-center">{trackingExerciseBreakdown.reduce((s, r) => s + r.sets, 0)}</td>
                                            <td className="px-4 py-3 text-xs font-bold text-indigo-700 text-center">{trackingExerciseBreakdown.reduce((s, r) => s + r.reps, 0)}</td>
                                            <td className="px-4 py-3"></td>
                                            <td className="px-4 py-3 text-xs font-black text-indigo-900 text-right">{trackingExerciseBreakdown.reduce((s, r) => s + r.tonnage, 0).toLocaleString()} kg</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ TAB 2: TEAM OVERVIEW ═══ */}
                {trackingTab === 'Team Overview' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-4 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">Team</label>
                                <select value={trackingSelectedTeam} onChange={e => setTrackingSelectedTeam(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 min-w-[180px]">
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                {(['This Week', 'This Month', 'Custom'] as const).map(p => (
                                    <button key={p} onClick={() => setTrackingPeriod(p)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${trackingPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                            {trackingPeriod === 'Custom' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">From</label>
                                        <input type="date" value={trackingDateRange.start} onChange={e => setTrackingDateRange(r => ({ ...r, start: e.target.value }))}
                                            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">To</label>
                                        <input type="date" value={trackingDateRange.end} onChange={e => setTrackingDateRange(r => ({ ...r, end: e.target.value }))}
                                            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50" />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Table */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                        {[
                                            { key: 'name', label: 'Athlete', align: 'left' },
                                            { key: 'sessions', label: 'Sessions', align: 'center' },
                                            { key: 'totalTonnage', label: 'Total Tonnage', align: 'center' },
                                            { key: 'avgPerSession', label: 'Avg / Session', align: 'center' },
                                            { key: 'trend', label: 'Trend', align: 'center' },
                                        ].map(col => (
                                            <th key={col.key} onClick={() => handleTrackingSort(col.key)}
                                                className={`px-5 py-3 text-${col.align} text-[10px] font-bold uppercase text-slate-400 tracking-wide cursor-pointer hover:text-slate-600 transition-colors select-none`}>
                                                <span className="inline-flex items-center gap-1">{col.label} <TrackingSortIcon col={col.key} /></span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackingSortedTeamStats.length > 0 ? trackingSortedTeamStats.map((row, i) => (
                                        <tr key={row.id} className={`border-b border-slate-50 hover:bg-indigo-50/30 transition-colors ${i % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                                            <td className="px-5 py-3.5 text-xs font-semibold text-slate-700">{row.name}</td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600 text-center">{row.sessions}</td>
                                            <td className="px-4 py-3.5 text-xs font-bold text-indigo-700 text-center">{row.totalTonnage.toLocaleString()} kg</td>
                                            <td className="px-4 py-3.5 text-xs text-slate-600 text-center">{row.avgPerSession.toLocaleString()} kg</td>
                                            <td className="px-4 py-3.5 text-center"><TrackingTrendArrow value={row.trend} /></td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">Select a team to view tonnage data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══ TAB 3: LOAD DISTRIBUTION ═══ */}
                {trackingTab === 'Load Distribution' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {/* Controls */}
                        <div className="flex flex-wrap items-end gap-4 bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                            <div>
                                <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">Team</label>
                                <select value={trackingSelectedTeam} onChange={e => setTrackingSelectedTeam(e.target.value)}
                                    className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 min-w-[180px]">
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                {(['Day', 'Week', 'Month', 'Custom'] as const).map(p => (
                                    <button key={p} onClick={() => setTrackingLoadPeriod(p)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${trackingLoadPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {p}
                                    </button>
                                ))}
                            </div>
                            {trackingLoadPeriod === 'Custom' && (
                                <div className="flex items-end gap-2">
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">From</label>
                                        <input type="date" value={trackingLoadCustomRange.start}
                                            onChange={e => setTrackingLoadCustomRange(prev => ({ ...prev, start: e.target.value }))}
                                            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide block mb-1">To</label>
                                        <input type="date" value={trackingLoadCustomRange.end}
                                            onChange={e => setTrackingLoadCustomRange(prev => ({ ...prev, end: e.target.value }))}
                                            min={trackingLoadCustomRange.start}
                                            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50" />
                                    </div>
                                </div>
                            )}
                            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                {([['body_part', 'By Muscle'], ['region', 'By Region']] as const).map(([key, label]) => (
                                    <button key={key} onClick={() => setTrackingLoadView(key as any)}
                                        className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${trackingLoadView === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Summary KPI Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1">Total Tonnage</div>
                                <div className="text-2xl font-black text-slate-900">{trackingLoadData.totalTonnage.toLocaleString()} <span className="text-xs font-semibold text-slate-400">kg</span></div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1">Total Sets</div>
                                <div className="text-2xl font-black text-slate-900">{trackingLoadData.totalSets.toLocaleString()}</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1">{trackingLoadView === 'body_part' ? 'Muscle Groups' : 'Regions'} Trained</div>
                                <div className="text-2xl font-black text-slate-900">{trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList.length : trackingLoadData.regionList.length}</div>
                            </div>
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                                <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1">Top {trackingLoadView === 'body_part' ? 'Muscle' : 'Region'}</div>
                                <div className="text-lg font-black text-slate-900 truncate">
                                    {(trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList[0]?.name : trackingLoadData.regionList[0]?.name) || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Chart + Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Bar chart */}
                            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">
                                    Tonnage {trackingLoadView === 'body_part' ? 'by Muscle Group' : 'by Region'}
                                </div>
                                {(() => {
                                    const items = trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList : trackingLoadData.regionList;
                                    const colorsMap = trackingLoadView === 'body_part' ? BODY_PART_COLORS_MAP : REGION_COLORS_MAP;
                                    if (items.length === 0) return <div className="text-center py-12 text-sm text-slate-400">No tonnage data for this period</div>;
                                    return (
                                        <ResponsiveContainer width="100%" height={Math.max(200, items.length * 36)}>
                                            <BarChart data={items} layout="vertical" margin={{ left: 10, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                                <XAxis type="number" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                                                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10, fontWeight: 600 }} />
                                                <Tooltip
                                                    formatter={(v: number) => [`${v.toLocaleString()} kg`, 'Tonnage']}
                                                    contentStyle={{ borderRadius: 8, fontSize: 11, fontWeight: 600 }}
                                                />
                                                <Bar dataKey="tonnage" radius={[0, 6, 6, 0]}>
                                                    {items.map(item => (
                                                        <Cell key={item.name} fill={colorsMap[item.name] || '#94a3b8'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    );
                                })()}
                            </div>

                            {/* Breakdown list */}
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4">Breakdown</div>
                                <div className="space-y-3">
                                    {(trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList : trackingLoadData.regionList).map(item => {
                                        const bgClass = trackingLoadView === 'body_part'
                                            ? (BODY_PART_BG[item.name] || 'bg-slate-100 text-slate-600')
                                            : (REGION_BG[item.name] || 'bg-slate-100 text-slate-600');
                                        return (
                                            <div key={item.name} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-semibold ${bgClass}`}>{item.name}</span>
                                                    <span className="text-xs font-black text-slate-800">{item.tonnage.toLocaleString()} kg</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{
                                                                width: `${item.pct}%`,
                                                                backgroundColor: (trackingLoadView === 'body_part' ? BODY_PART_COLORS_MAP : REGION_COLORS_MAP)[item.name] || '#94a3b8',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[9px] font-bold text-slate-400 w-8 text-right">{item.pct}%</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[9px] text-slate-400">
                                                    <span>{item.sets} sets</span>
                                                    {'exerciseCount' in item && <span>{(item as any).exerciseCount} exercises</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(trackingLoadView === 'body_part' ? trackingLoadData.bodyPartList : trackingLoadData.regionList).length === 0 && (
                                        <div className="text-center py-8 text-sm text-slate-400">No data for this period</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderDataHub = () => {
        return <DataHub />;
    };

    const renderReadinessHub = () => {
        const wellness = (habitRecords || []).filter(d => d.athleteId === selectedAnalyticsAthleteId).slice(-1)[0] || { sleep: 8, energy: 7, stress: 3, mood: 'Neutral' };
        const acwr = calculateACWR(selectedAnalyticsAthleteId);
        const monotony = calculateMonotony(selectedAnalyticsAthleteId);

        // Simple readiness score calculation
        const readinessScore = Math.round(((wellness.energy / 10) * 40) + ((1 - (wellness.stress / 10)) * 30) + (acwr > 0.8 && acwr < 1.3 ? 30 : 15));

        const risks = [
            { label: 'Workload', status: acwr > 1.3 ? 'High' : acwr < 0.8 ? 'Low' : 'Optimal', color: acwr > 1.3 ? 'rose' : acwr < 0.8 ? 'indigo' : 'emerald' },
            { label: 'Fatigue', status: wellness.energy < 5 ? 'High' : 'Low', color: wellness.energy < 5 ? 'rose' : 'emerald' },
            { label: 'Strain', status: monotony > 2.0 ? 'Critical' : 'Safe', color: monotony > 2.0 ? 'rose' : 'emerald' }
        ];

        return (
            <div className="space-y-10 animate-in fade-in duration-500">
                {/* HEADING & CORE SCORE */}
                <div className="bg-white p-12 rounded-xl border border-indigo-100 shadow-xl flex flex-col md:flex-row gap-12 items-center">
                    <div className="relative shrink-0">
                        <svg viewBox="0 0 100 100" className="w-48 h-48 transform -rotate-90">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke={readinessScore > 75 ? '#10b981' : readinessScore > 50 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="8" strokeDasharray={`${readinessScore * 2.83} 283`} strokeLinecap="round" className="transition-all duration-1000" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-90">
                            <span className="text-5xl font-black tracking-tighter text-indigo-900">{readinessScore}</span>
                            <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mt-1">Readiness</span>
                        </div>
                    </div>
                    <div className="space-y-6 flex-1 text-center md:text-left">
                        <h4 className="text-3xl font-black uppercase tracking-tighter text-indigo-900 leading-tight">Elite Readiness Intelligence</h4>
                        <p className="text-sm font-medium text-indigo-400 leading-relaxed">
                            A holistic composite score blending <span className="text-indigo-600 font-bold">Internal Load (sRPE)</span>,
                            <span className="text-indigo-600 font-bold"> External Response (Wellness)</span>, and <span className="text-indigo-600 font-bold">Workload Dynamics (ACWR)</span>.
                        </p>
                        <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                            {risks.map(r => (
                                <div key={r.label} className={`px-5 py-2 rounded-xl border bg-${r.color}-50 border-${r.color}-100 flex items-center gap-3`}>
                                    <div className={`w-2 h-2 rounded-full bg-${r.color}-500 shadow-sm`}></div>
                                    <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{r.label}: <span className={`text-${r.color}-600`}>{r.status}</span></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* WELLNESS TELEMETRY WIDGET */}
                    <div className="bg-white p-10 rounded-xl border border-indigo-100 shadow-sm space-y-8">
                        <div className="flex justify-between items-center">
                            <h5 className="text-lg font-black uppercase tracking-tight text-indigo-900 flex items-center gap-3">
                                <HeartIcon size={20} className="text-rose-500" /> Wellness Telemetry
                            </h5>
                            <button onClick={() => { setActiveReport('Wellness Report'); setReportMode('analytics'); }} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">Full Analytics</button>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-900 shadow-sm"><MoonIcon size={20} /></div>
                                <div>
                                    <div className="text-[9px] font-black uppercase text-indigo-400">Sleep</div>
                                    <div className="text-xl font-black text-indigo-900">{wellness.sleep}h</div>
                                </div>
                            </div>
                            <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-900 shadow-sm"><ZapIcon size={20} /></div>
                                <div>
                                    <div className="text-[9px] font-black uppercase text-indigo-400">Energy</div>
                                    <div className="text-xl font-black text-indigo-900">{wellness.energy}/10</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* EVALUATION & QUESTIONNAIRE WIDGET */}
                    <div className="bg-white p-10 rounded-xl border border-indigo-100 shadow-sm space-y-8">
                        <div className="flex justify-between items-center">
                            <h5 className="text-lg font-black uppercase tracking-tight text-indigo-900 flex items-center gap-3">
                                <ClipboardListIcon size={20} className="text-indigo-500" /> Active Evaluations
                            </h5>
                            <button onClick={() => { setActiveReport('Evaluation Report'); setReportMode('analytics'); }} className="text-[10px] font-black uppercase text-indigo-600 hover:underline">View All</button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Lower Body Power', date: '21 Oct', score: '8.4', status: 'Optimal' },
                                { name: 'Reactive Strength', date: '15 Oct', score: '6.2', status: 'Warning' }
                            ].map((ev, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-100">
                                    <div>
                                        <div className="text-xs font-black text-indigo-900">{ev.name}</div>
                                        <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{ev.date}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-black text-indigo-900">{ev.score}</div>
                                        <div className={`text-[8px] font-black uppercase ${ev.status === 'Optimal' ? 'text-emerald-500' : 'text-amber-500'}`}>{ev.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // REPORT 1: Activity Report
    const renderActivityReport = () => {
        const activityStats = {
            sessions: scheduledSessions.filter(s => s.status === 'Completed').length,
            planned: scheduledSessions.length,
            duration: scheduledSessions.reduce((acc, s) => acc + (s.actualDuration || 0), 0),
            load: loadRecords.reduce((acc, l) => acc + (l.plannedLoad * 10), 0) // Mock calculation
        };

        const weeklyActivity = [4, 5, 3, 6, 5, 2, 0]; // Mock weekly trend

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Total Sessions</div>
                        <div className="text-3xl font-black text-indigo-900">{activityStats.sessions} <span className="text-sm text-indigo-300 font-medium">/ {activityStats.planned}</span></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Total Duration</div>
                        <div className="text-3xl font-black text-indigo-900">{activityStats.duration} <span className="text-sm text-indigo-300 font-medium">min</span></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Volume Load</div>
                        <div className="text-3xl font-black text-indigo-900">{(activityStats.load / 1000).toFixed(1)}k <span className="text-sm text-indigo-300 font-medium">AU</span></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Active Days</div>
                        <div className="text-3xl font-black text-indigo-900">5 <span className="text-sm text-indigo-300 font-medium">/ 7</span></div>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-xl border border-indigo-100 shadow-sm space-y-8">
                    <h4 className="text-xl font-black uppercase tracking-tighter text-indigo-900">Weekly Activity Volume</h4>
                    <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-slate-100 pb-4">
                        {weeklyActivity.map((count, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="relative w-full bg-slate-100 rounded-xl overflow-hidden flex items-end group-hover:bg-slate-200 transition-colors" style={{ height: '200px' }}>
                                    <div className="w-full bg-indigo-600 rounded-t-2xl transition-all duration-1000" style={{ height: `${count * 15}%` }}></div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase">Day {i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };
    const renderGPSDataReport = () => {

        // ── Helper: fuzzy detect a column from headers ──────────────────────
        const normStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const detectColFromHeaders = (headers: string[], aliases: string[]): string => {
            for (const alias of aliases) {
                const a = normStr(alias);
                const exact = headers.find(h => normStr(h) === a);
                if (exact) return exact;
            }
            for (const alias of aliases) {
                const a = normStr(alias);
                const partial = headers.find(h => normStr(h).includes(a) || a.includes(normStr(h)));
                if (partial) return partial;
            }
            return '';
        };

        // Use memoised derivations from component scope (not re-derived on every render)
        const historicalColKeys = gpsHistoricalColKeys;
        const mergedColConfig = gpsMergedColConfig;
        const saveColConfig = gpsSaveColConfig;
        const colLabel = gpsColLabel;

        // ── Polar Sync ────────────────────────────────────────────────
        const handlePolarSync = async () => {
            if (!polarIntegration?.accessToken) {
                setPolarSyncStatus('error');
                setPolarSyncMessage('Polar not connected — go to Settings → GPS Configuration to connect.');
                return;
            }
            setPolarSyncStatus('syncing');
            setPolarSyncMessage('Fetching exercises from Polar...');
            try {
                // Call server-side proxy to avoid CORS issues with Polar's API
                const res = await fetch('/api/polar-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: polarIntegration.accessToken,
                        type: polarIntegration.type || 'team_pro',
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(err.error || `Sync failed (${res.status})`);
                }
                const { sessions: list } = await res.json();
                if (!list || list.length === 0) {
                    setPolarSyncStatus('success');
                    setPolarSyncMessage('No exercises found.');
                    setTimeout(() => setPolarSyncStatus('idle'), 5000);
                    return;
                }
                // Map Polar sessions to GPS records format (handles both team_pro and individual)
                const newRecords = [];
                for (const s of list) {
                    const { session, players } = s;
                    for (const p of players) {
                        newRecords.push({
                            id: `polar_${session.id}_${p.playerId || 'self'}`,
                            source: s.source || 'polar',
                            playerName: p.playerName || 'Polar Athlete',
                            playerNumber: p.playerNumber || '',
                            athleteId: 'unknown',
                            date: session.date || new Date().toISOString().split('T')[0],
                            category: 'training',
                            teamId: selectedTeam?.id || '',
                            rawColumns: p.rawColumns || {},
                        });
                    }
                }
                setGpsData(prev => {
                    const existingIds = new Set(prev.map((r: any) => r.id));
                    const fresh = newRecords.filter((r: any) => !existingIds.has(r.id));
                    return [...prev, ...fresh];
                });
                setPolarSyncStatus('success');
                setPolarSyncMessage(`Synced ${newRecords.length} exercise${newRecords.length !== 1 ? 's' : ''} from Polar`);
                setTimeout(() => setPolarSyncStatus('idle'), 8000);
            } catch (err: any) {
                console.error('Polar sync error:', err);
                setPolarSyncStatus('error');
                setPolarSyncMessage(err.message || 'Polar sync failed');
                setTimeout(() => setPolarSyncStatus('idle'), 8000);
            }
        };

        // Derive whether the currently selected team uses Polar
        const selectedTeam = teams.find(t => t.name === gpsFilterTarget);
        const teamDataSource = selectedTeam ? (gpsDataSources?.[selectedTeam.id] || 'csv') : 'csv';
        const isPolarSource = teamDataSource === 'polar' && polarIntegration?.connected === true;

        const handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = (e.target.result as string);
                const lines = text.split('\n').filter(l => l.trim() !== '');
                if (lines.length < 2) { setGpsImportStatus('error'); setGpsImportMessage('CSV file is empty.'); return; }
                const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const rows = lines.slice(1).map(row => {
                    const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    const obj: Record<string, string> = {};
                    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
                    return obj;
                });
                const ac = detectColFromHeaders(headers, ['player name','player','athlete','name','athlete name','full name','athlete_name','player_name']);
                const dc = detectColFromHeaders(headers, ['session_date','session date','date','start time','match date','activity date']);
                const pc = detectColFromHeaders(headers, ['phase name','phase','period','section','drill','split']);

                // ── Profile detection ────────────────────────────────────────
                // Try selected team's profile first, then scan all profiles by header fingerprint
                const normalised = headers.map(h => h.toLowerCase().trim()).sort();
                let matchedProfile: GpsTeamProfile | null = null;
                let newCols: string[] = [];

                const tryProfile = (p: GpsTeamProfile | null) => {
                    if (!p || !p.headerFingerprint?.length) return false;
                    const saved = new Set(p.headerFingerprint.map(h => h.toLowerCase().trim()));
                    const overlap = normalised.filter(h => saved.has(h)).length;
                    if (overlap / p.headerFingerprint.length >= 0.8) {
                        matchedProfile = p;
                        newCols = normalised.filter(h => !saved.has(h));
                        return true;
                    }
                    return false;
                };

                // Check selected team first
                if (gpsImportTeamId) {
                    tryProfile(getProfileForTeam(gpsImportTeamId));
                }
                // Fallback: scan all profiles
                if (!matchedProfile) {
                    for (const p of loadGpsProfiles()) { if (tryProfile(p)) break; }
                }

                setGpsMatchedProfile(matchedProfile);
                setGpsNewColumns(newCols);

                // Detect columns missing vs history (appeared before, not in this file)
                const missingFromFile = historicalColKeys.filter(k => !headers.includes(k));
                setGpsSmartDialog({ headers, rows, athleteCol: ac, dateCol: dc, phaseCol: pc });
                setGpsDialogAthleteCol(ac);
                setGpsDialogDateCol(dc);
                setGpsDialogPhaseCol(pc);
                // Refresh categories in case settings changed
                setGpsDialogCategories(loadGpsCategories());
                // Warn about missing historical columns — separate state, non-blocking
                setGpsMissingColWarning(missingFromFile);
            };
            reader.readAsText(file);
        };

        const handleSmartImport = (athleteCol: string, dateCol: string, phaseCol: string) => {
            if (!gpsSmartDialog) return;
            const { rows, headers } = gpsSmartDialog;
            const allPlayers = teams.flatMap(t => t.players);
            const normaliseDate = (s: string): string => {
                if (!s) return new Date().toISOString().split('T')[0];
                if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
                const dmY = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
                if (dmY) return `${dmY[3]}-${dmY[2].padStart(2,'0')}-${dmY[1].padStart(2,'0')}`;
                const mdY = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (mdY) return `${mdY[3]}-${mdY[1].padStart(2,'0')}-${mdY[2].padStart(2,'0')}`;
                const d = new Date(s); return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
            };
            // Resolve ACWR column from matched profile
            const acwrCol = gpsMatchedProfile?.acwrColumn || '';

            const newRecords = rows.map(row => {
                const athleteName = row[athleteCol] || 'Unknown';
                const date = normaliseDate(row[dateCol] || '');
                const phase = phaseCol ? (row[phaseCol] || '') : '';
                const rawColumns: Record<string, string> = {};
                for (const h of headers) {
                    if (h === athleteCol || h === dateCol) continue;
                    const val = row[h];
                    if (val === undefined || val === null || val === '') continue;
                    const hms = val.match(/^(\d+):(\d{2}):(\d{2})$/);
                    rawColumns[h] = hms ? String((parseInt(hms[1])*60 + parseInt(hms[2]) + parseInt(hms[3])/60).toFixed(1)) : val;
                }
                const player = allPlayers.find(p =>
                    p.name.toLowerCase().includes(athleteName.toLowerCase()) ||
                    athleteName.toLowerCase().includes(p.name.toLowerCase())
                );
                return {
                    id: `gps_${crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substr(2,9))}`,
                    date, playerName: athleteName, phase,
                    athleteId: player ? player.id : 'unknown',
                    matchedName: player ? player.name : athleteName,
                    rawColumns,
                    category: gpsImportCategory || 'training',
                    acwrValue: acwrCol && rawColumns[acwrCol] ? parseFloat(rawColumns[acwrCol]) || 0 : null,
                    timestamp: new Date().toISOString(),
                };
            });
            const updated = [...gpsData, ...newRecords];
            setGpsData(updated);
            StorageService.saveGpsData(updated);
            // Auto-sync new GPS records to training_loads for ACWR
            syncGpsToLoadRecords(newRecords);
            setGpsSmartDialog(null);
            // Detect names that didn't match roster
            const unlinked = [...new Set(newRecords.filter(r => r.athleteId === 'unknown').map(r => r.playerName))];
            if (unlinked.length > 0) {
                setGpsUnlinkedDialog(unlinked.map(name => ({ name })));
            }
            setGpsMissingColWarning([]); // clear pre-import warning once data lands
            setGpsImportStatus('success');
            setGpsImportMessage(`Imported ${newRecords.length} rows · ${headers.length} columns`);
            setTimeout(() => setGpsImportStatus(null), 8000);
        };

        const clearGpsData = () => {
            if (confirm('Clear all GPS telemetry data?')) { setGpsData([]); StorageService.saveGpsData([]); }
        };

        // ── Manual entry helpers ─────────────────────────────────────────────
        const manualTeam = teams.find(t => t.id === manualTeamId);
        const manualAthletes = manualTeam ? manualTeam.players : [];

        const handleManualSave = () => {
            if (!manualTeamId || !manualDate) return;
            const newRecords = manualAthletes.map(p => {
                const row = manualRows[p.id] || {};
                const rawColumns: Record<string, string> = {};
                for (const col of manualColConfig) {
                    if (row[col.key] !== undefined && row[col.key] !== '') rawColumns[col.key] = row[col.key];
                }
                return {
                    id: `gps_${crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substr(2,9))}`,
                    date: manualDate, playerName: p.name, phase: '',
                    athleteId: p.id, matchedName: p.name, rawColumns,
                    timestamp: new Date().toISOString(),
                };
            }).filter(r => Object.keys(r.rawColumns).length > 0);
            if (newRecords.length === 0) return;
            const updated = [...gpsData, ...newRecords];
            setGpsData(updated);
            StorageService.saveGpsData(updated);
            setManualRows({});
            setGpsImportStatus('success');
            setGpsImportMessage(`Saved ${newRecords.length} manual rows`);
            setTimeout(() => setGpsImportStatus(null), 5000);
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">

                {/* ── Smart CSV Import Dialog ──────────────────────────────── */}
                {gpsSmartDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGpsSmartDialog(null)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 rounded-t-2xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
                                    <ActivityIcon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Smart GPS Import</h3>
                                    <p className="text-xs text-slate-400">{gpsSmartDialog.rows.length} rows · {gpsSmartDialog.headers.length} columns — all imported as-is</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">

                                {/* ── Profile match banner ── */}
                                {gpsMatchedProfile ? (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <CheckCircleIcon size={16} className="text-emerald-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-emerald-800">
                                                Profile matched — {gpsMatchedProfile.teamName}{gpsMatchedProfile.provider ? ` · ${gpsMatchedProfile.provider}` : ''}
                                            </p>
                                            <p className="text-[10px] text-emerald-600 mt-0.5">
                                                {Array.isArray(gpsMatchedProfile.columnMapping) ? gpsMatchedProfile.columnMapping.filter(m => m.platformField).length : 0} columns pre-mapped
                                                {gpsMatchedProfile.acwrColumn ? ` · ACWR bound to "${gpsMatchedProfile.acwrColumn.slice(0,40)}${gpsMatchedProfile.acwrColumn.length > 40 ? '…' : ''}"` : ' · ACWR column not bound'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <AlertTriangleIcon size={16} className="text-amber-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-amber-800">No profile found for this file</p>
                                            <p className="text-[10px] text-amber-600 mt-0.5">
                                                ACWR won't read GPS data until a profile is configured in Settings → GPS Data. Import will still proceed.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── New columns warning ── */}
                                {gpsNewColumns.length > 0 && (
                                    <div className="bg-sky-50 border border-sky-200 rounded-xl px-4 py-3 flex items-start gap-3">
                                        <InfoIcon size={15} className="text-sky-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-sky-800">{gpsNewColumns.length} new column{gpsNewColumns.length > 1 ? 's' : ''} not in saved profile</p>
                                            <p className="text-[10px] text-sky-600 mt-0.5">
                                                {gpsNewColumns.slice(0, 3).join(', ')}{gpsNewColumns.length > 3 ? ` +${gpsNewColumns.length - 3} more` : ''} — imported as-is. Update the profile in Settings to map them.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── Team + Category row ── */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Team <span className="text-slate-400 font-normal">(for profile lookup)</span></label>
                                        <select
                                            value={gpsImportTeamId}
                                            onChange={e => setGpsImportTeamId(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none"
                                        >
                                            <option value="">— Select team —</option>
                                            {teams.filter(t => t.id !== 't_private').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Session Category</label>
                                        {gpsShowNewCat ? (
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={gpsNewCatLabel}
                                                    onChange={e => setGpsNewCatLabel(e.target.value)}
                                                    placeholder="Category name…"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && gpsNewCatLabel.trim()) {
                                                            const id = gpsNewCatLabel.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
                                                            const newCat: GpsCategory = { id, label: gpsNewCatLabel.trim(), color: 'indigo' };
                                                            const updated = [...gpsDialogCategories, newCat];
                                                            setGpsDialogCategories(updated);
                                                            saveGpsCategories(updated);
                                                            setGpsImportCategory(id);
                                                            setGpsNewCatLabel('');
                                                            setGpsShowNewCat(false);
                                                            showToast(`Category "${newCat.label}" added`, 'success');
                                                        }
                                                        if (e.key === 'Escape') { setGpsShowNewCat(false); setGpsNewCatLabel(''); }
                                                    }}
                                                    className="flex-1 bg-white border border-indigo-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500"
                                                />
                                                <button onClick={() => { setGpsShowNewCat(false); setGpsNewCatLabel(''); }} className="px-2 py-2 text-slate-400 hover:text-slate-600 text-xs">✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <select
                                                    value={gpsImportCategory}
                                                    onChange={e => setGpsImportCategory(e.target.value)}
                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none"
                                                >
                                                    {gpsDialogCategories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.label}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => setGpsShowNewCat(true)}
                                                    title="Add new category"
                                                    className="px-2.5 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-500 rounded-lg border border-slate-200 transition-colors text-xs font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Athlete Column', required: true, val: gpsDialogAthleteCol, set: setGpsDialogAthleteCol, color: 'indigo' },
                                        { label: 'Date Column', required: true, val: gpsDialogDateCol, set: setGpsDialogDateCol, color: 'emerald' },
                                        { label: 'Phase / Section', required: false, val: gpsDialogPhaseCol, set: setGpsDialogPhaseCol, color: 'amber' },
                                    ].map(({ label, required, val, set, color }) => (
                                        <div key={label} className="space-y-1.5">
                                            <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide">
                                                {label} {required && <span className="text-rose-400">*</span>}
                                            </label>
                                            <select value={val} onChange={e => set(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none">
                                                <option value="">— {required ? 'select' : 'none'} —</option>
                                                {gpsSmartDialog.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </select>
                                            {val
                                                ? <p className={`text-[10px] text-${color}-600 font-medium`}>✓ {val}</p>
                                                : !required && <p className="text-[10px] text-slate-400">Optional — enables section grouping</p>
                                            }
                                        </div>
                                    ))}
                                </div>
                                {/* Missing columns warning */}
                                {gpsMissingColWarning.length > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
                                        <AlertTriangleIcon size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-700">Columns from previous imports not in this file</p>
                                            <p className="text-[10px] text-amber-600 mt-0.5">{gpsMissingColWarning.join(', ')}</p>
                                            <p className="text-[10px] text-amber-500 mt-1">These will show as empty for rows from this import. Manage visibility in the Columns panel.</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide mb-2">Preview — first 3 rows</p>
                                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                        <table className="text-left text-xs w-full">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    {gpsSmartDialog.headers.slice(0, 8).map(h => (
                                                        <th key={h} className={`px-3 py-2 font-semibold whitespace-nowrap ${h === gpsDialogAthleteCol ? 'text-indigo-600 bg-indigo-50' : h === gpsDialogDateCol ? 'text-emerald-600 bg-emerald-50' : h === gpsDialogPhaseCol ? 'text-amber-600 bg-amber-50' : 'text-slate-500'}`}>{h}</th>
                                                    ))}
                                                    {gpsSmartDialog.headers.length > 8 && <th className="px-3 py-2 text-slate-300 italic">+{gpsSmartDialog.headers.length - 8} more…</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {gpsSmartDialog.rows.slice(0, 3).map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        {gpsSmartDialog.headers.slice(0, 8).map(h => <td key={h} className="px-3 py-2 text-slate-600 whitespace-nowrap">{row[h] || '—'}</td>)}
                                                        {gpsSmartDialog.headers.length > 8 && <td className="px-3 py-2 text-slate-300">…</td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                    <p className="text-xs text-slate-400">All {gpsSmartDialog.headers.length} columns imported. Nothing discarded.</p>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => setGpsSmartDialog(null)} className="px-4 py-2.5 text-xs font-semibold text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">Cancel</button>
                                        <button
                                            disabled={!gpsDialogAthleteCol || !gpsDialogDateCol}
                                            onClick={() => handleSmartImport(gpsDialogAthleteCol, gpsDialogDateCol, gpsDialogPhaseCol)}
                                            className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                            Import {gpsSmartDialog.rows.length} Rows
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Unlinked athlete quick-add dialog ───────────────────── */}
                {gpsUnlinkedDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGpsUnlinkedDialog(null)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 bg-amber-50 rounded-t-2xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0">
                                    <AlertTriangleIcon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900">Unlinked Athletes</h3>
                                    <p className="text-xs text-slate-500">These names in the CSV didn't match your roster</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-3">
                                {gpsUnlinkedDialog.map(({ name }) => (
                                    <div key={name} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
                                        <span className="text-sm font-medium text-slate-700">{name}</span>
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">UNLINKED</span>
                                    </div>
                                ))}
                                <p className="text-[11px] text-slate-400 pt-1">GPS data was still imported. Go to Roster to add these athletes, then re-import to link them.</p>
                                <div className="flex justify-end pt-2">
                                    <button onClick={() => setGpsUnlinkedDialog(null)} className="px-5 py-2.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-all">OK</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Column Manager Panel ─────────────────────────────────── */}
                {gpsColConfigOpen && (() => {
                    const getColGroup = (k: string) => {
                        if (/number of acceleration/i.test(k)) return 'accel';
                        if (/time in hr zone/i.test(k)) return 'hr_zones';
                        if (/time in power zone|muscle load in power zone/i.test(k)) return 'power_zones';
                        if (/distance in speed zone/i.test(k)) return 'speed_zones';
                        if (/\bhr (min|avg|max)\b|\bhr\b.*\b(bpm|%)\b/i.test(k)) return 'hr';
                        if (/load|recovery time|calorie/i.test(k)) return 'load';
                        if (/hrv|rmssd|rr interval/i.test(k)) return 'hrv';
                        if (/distance|speed|sprint|km.h|m.min/i.test(k)) return 'speed';
                        return 'other';
                    };
                    const COL_GROUPS = [
                        { id: 'speed',       label: 'Speed & Distance' },
                        { id: 'speed_zones', label: 'Speed Zones' },
                        { id: 'hr',          label: 'Heart Rate' },
                        { id: 'hr_zones',    label: 'HR Zones' },
                        { id: 'accel',       label: 'Accelerations' },
                        { id: 'load',        label: 'Load & Recovery' },
                        { id: 'power_zones', label: 'Power Zones' },
                        { id: 'hrv',         label: 'HRV' },
                        { id: 'other',       label: 'Other' },
                    ];
                    const searchLower = gpsColSearch.toLowerCase();
                    const filteredCols = mergedColConfig
                        .filter(c => !searchLower || c.key.toLowerCase().includes(searchLower) || colLabel(c.key).toLowerCase().includes(searchLower))
                        .sort((a, b) => gpsSortCols(a.key, b.key));
                    const visibleCount = mergedColConfig.filter(c => c.visible !== false).length;
                    const toggleAll = (visible: boolean) => saveColConfig(mergedColConfig.map(c => ({ ...c, visible })));
                    const toggleGroup = (gid: string, visible: boolean) => saveColConfig(mergedColConfig.map(c =>
                        getColGroup(c.key) === gid ? { ...c, visible } : c
                    ));
                    return (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                                <div className="flex-1 relative">
                                    <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={gpsColSearch}
                                        onChange={e => setGpsColSearch(e.target.value)}
                                        placeholder="Search columns…"
                                        className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-indigo-400"
                                    />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-slate-400">{visibleCount}/{mergedColConfig.length} shown</span>
                                    <button onClick={() => toggleAll(true)} className="px-2.5 py-1.5 text-[10px] font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors">Show All</button>
                                    <button onClick={() => toggleAll(false)} className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 border border-slate-200 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors">Hide All</button>
                                    <button onClick={() => { setGpsColConfigOpen(false); setGpsColSearch(''); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><XIcon size={14} /></button>
                                </div>
                            </div>
                            {/* Grouped columns */}
                            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                                {mergedColConfig.length === 0 ? (
                                    <p className="text-xs text-slate-400 text-center py-8">No columns yet — import a CSV first</p>
                                ) : COL_GROUPS.map(grp => {
                                    const grpCols = filteredCols.filter(c => getColGroup(c.key) === grp.id);
                                    if (grpCols.length === 0) return null;
                                    const grpAllVisible = grpCols.every(c => c.visible !== false);
                                    return (
                                        <div key={grp.id} className="px-5 py-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{grp.label}</span>
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => toggleGroup(grp.id, true)} className="text-[9px] font-semibold text-indigo-500 hover:text-indigo-700 px-1.5 py-0.5 rounded hover:bg-indigo-50 transition-colors">Show</button>
                                                    <button onClick={() => toggleGroup(grp.id, false)} className="text-[9px] font-semibold text-slate-400 hover:text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-100 transition-colors">Hide</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {grpCols.map(col => (
                                                    <label key={col.key} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all text-xs ${col.visible !== false ? 'border-indigo-200 bg-indigo-50/60 text-slate-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>
                                                        <input type="checkbox" checked={col.visible !== false} onChange={() => {
                                                            saveColConfig(mergedColConfig.map(c => c.key === col.key ? { ...c, visible: c.visible === false } : c));
                                                        }} className="rounded accent-indigo-600 shrink-0" />
                                                        <span className="flex-1 min-w-0 truncate font-medium">{colLabel(col.key)}</span>
                                                        {col.retired && <span className="text-[8px] font-bold text-slate-400 bg-slate-200 px-1 py-0.5 rounded shrink-0">OLD</span>}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* ── Top bar: tabs + status + actions ────────────────────── */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setGpsTab('import')} className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${gpsTab === 'import' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <span className="flex items-center gap-1.5"><UploadIcon size={12} />Data Import</span>
                            </button>
                            <button onClick={() => setGpsTab('manual')} className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${gpsTab === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                <span className="flex items-center gap-1.5"><Edit3Icon size={12} />Manual Entry</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {gpsImportStatus && (
                                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${gpsImportStatus === 'success' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                                    {gpsImportMessage}
                                </span>
                            )}
                            {historicalColKeys.length > 0 && (
                                <button onClick={() => setGpsColConfigOpen(v => !v)} className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-semibold transition-all ${gpsColConfigOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                                    <SlidersIcon size={13} />Columns
                                </button>
                            )}
                            <button onClick={clearGpsData} title="Clear all GPS data" className="p-2 text-slate-300 hover:text-rose-500 transition-colors border border-slate-200 rounded-lg hover:bg-rose-50"><Trash2Icon size={15} /></button>
                        </div>
                    </div>

                    {/* ── TAB: DATA IMPORT ── */}
                    {gpsTab === 'import' && (() => {
                        // Date navigation helpers (computed here, not in every render)
                        const sessionIdx = gpsSessionDates.indexOf(gpsSpecificDate);
                        const effectiveSessionDate = sessionIdx >= 0 ? gpsSpecificDate : (gpsSessionDates[gpsSessionDates.length - 1] || gpsSpecificDate);
                        const effectiveIdx = gpsSessionDates.indexOf(effectiveSessionDate);
                        const fmtSessionDate = (d: string) => {
                            if (!d) return '—';
                            const dt = new Date(d + 'T12:00:00');
                            return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                        };
                        return (
                        <div className="space-y-4 pt-1">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Squad / Athlete filter */}
                                <div className="relative min-w-[200px]">
                                    <select value={gpsFilterTarget} onChange={e => setGpsFilterTarget(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none appearance-none pr-8">
                                        <option>All Athletes</option>
                                        <optgroup label="Squads">{teams.filter(t => t.id !== 't_private').map(t => <option key={t.id}>{t.name}</option>)}</optgroup>
                                        <optgroup label="Individual Athletes">
                                            {teams.flatMap(t => t.players).sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id}>{p.name}</option>)}
                                        </optgroup>
                                    </select>
                                    <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>

                                {/* View mode toggle */}
                                <div className="flex bg-slate-100 p-1 rounded-lg">
                                    <button onClick={() => setGpsFilterDateMode('single')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${gpsFilterDateMode === 'single' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>Session</button>
                                    <button onClick={() => setGpsFilterDateMode('range')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${gpsFilterDateMode === 'range' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}>Range</button>
                                </div>

                                {/* Session mode: date navigation */}
                                {gpsFilterDateMode === 'single' && (
                                    <div className="flex items-center gap-2 flex-1">
                                        <button
                                            disabled={effectiveIdx >= gpsSessionDates.length - 1}
                                            onClick={() => setGpsSpecificDate(gpsSessionDates[effectiveIdx + 1])}
                                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        ><ArrowLeftIcon size={14} /></button>
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                                            <CalendarIcon size={13} className="text-slate-400 shrink-0" />
                                            <input
                                                type="date"
                                                value={effectiveSessionDate}
                                                onChange={e => setGpsSpecificDate(e.target.value)}
                                                className="bg-transparent text-xs font-semibold text-slate-700 outline-none"
                                            />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700">{fmtSessionDate(effectiveSessionDate)}</span>
                                        {gpsSessionDates.length > 0 && (
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                                                {effectiveIdx + 1} / {gpsSessionDates.length} sessions
                                            </span>
                                        )}
                                        <button
                                            disabled={effectiveIdx <= 0}
                                            onClick={() => setGpsSpecificDate(gpsSessionDates[effectiveIdx - 1])}
                                            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        ><ArrowRightIcon size={14} /></button>
                                    </div>
                                )}

                                {/* Range mode: date pickers */}
                                {gpsFilterDateMode === 'range' && (
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={gpsRangeStart} onChange={e => setGpsRangeStart(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none" />
                                        <span className="text-xs text-slate-400">to</span>
                                        <input type="date" value={gpsRangeEnd} onChange={e => setGpsRangeEnd(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none" />
                                    </div>
                                )}

                                <div className="ml-auto flex items-center gap-2">
                                    {/* Sync Polar — shown as primary when team data source is Polar */}
                                    {isPolarSource && (
                                        <button
                                            onClick={handlePolarSync}
                                            disabled={polarSyncStatus === 'syncing'}
                                            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-all whitespace-nowrap"
                                        >
                                            {polarSyncStatus === 'syncing'
                                                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Syncing...</>
                                                : <><ActivityIcon size={13} /> Sync Polar</>
                                            }
                                        </button>
                                    )}
                                    {/* Import CSV — always available as fallback */}
                                    <label className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${isPolarSource ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                                        <UploadIcon size={13} /> Import CSV
                                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>

                            {/* Polar sync status */}
                            {polarSyncStatus !== 'idle' && (
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold ${
                                    polarSyncStatus === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                                    polarSyncStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-700' :
                                    'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                }`}>
                                    {polarSyncStatus === 'syncing' && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                                    {polarSyncStatus === 'success' && <CheckIcon size={13} />}
                                    {polarSyncStatus === 'error' && <AlertCircleIcon size={13} />}
                                    {polarSyncMessage}
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    {/* ── TAB: MANUAL ENTRY ── */}
                    {gpsTab === 'manual' && (
                        <div className="space-y-4 pt-1">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide pl-1">Team</label>
                                    <div className="relative">
                                        <select value={manualTeamId} onChange={e => { setManualTeamId(e.target.value); setManualRows({}); }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none appearance-none pr-8">
                                            <option value="">— select team —</option>
                                            {teams.filter(t => t.id !== 't_private').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                        <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide pl-1">Session Date</label>
                                    <input type="date" value={manualDate} onChange={e => setManualDate(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none" />
                                </div>
                                <button onClick={() => setManualColPickerOpen(v => !v)} className={`px-3 py-2.5 rounded-lg border text-xs flex items-center gap-1.5 font-semibold transition-all ${manualColPickerOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                    <PlusCircleIcon size={13} /> Configure Columns
                                </button>
                                {manualAthletes.length > 0 && manualColConfig.length > 0 && (
                                    <button onClick={handleManualSave} className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1.5">
                                        <CheckIcon size={13} /> Save Session
                                    </button>
                                )}
                            </div>

                            {/* Column picker */}
                            {manualColPickerOpen && (
                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide">Active Columns</p>
                                    <div className="flex flex-wrap gap-2">
                                        {manualColConfig.map(col => (
                                            <div key={col.key} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700">
                                                {col.label}
                                                <button onClick={() => setManualColConfig(prev => prev.filter(c => c.key !== col.key))} className="text-slate-300 hover:text-rose-500 transition-colors"><XIcon size={11} /></button>
                                            </div>
                                        ))}
                                        {manualColConfig.length === 0 && <p className="text-xs text-slate-400">No columns configured yet</p>}
                                    </div>
                                    {/* Add from history or new */}
                                    {historicalColKeys.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] text-slate-400">Add from import history:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {historicalColKeys.filter(k => !manualColConfig.some(c => c.key === k)).map(k => (
                                                    <button key={k} onClick={() => setManualColConfig(prev => [...prev, { key: k, label: k.replace(/_/g, ' ') }])}
                                                        className="text-[10px] bg-white border border-slate-200 rounded-md px-2.5 py-1 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                                                        + {k}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input value={newManualColName} onChange={e => setNewManualColName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && newManualColName.trim()) { setManualColConfig(prev => [...prev, { key: newManualColName.trim().replace(/\s+/g,'_'), label: newManualColName.trim() }]); setNewManualColName(''); }}}
                                            placeholder="Or type a new column name…" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
                                        <button onClick={() => { if (newManualColName.trim()) { setManualColConfig(prev => [...prev, { key: newManualColName.trim().replace(/\s+/g,'_'), label: newManualColName.trim() }]); setNewManualColName(''); }}}
                                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-all">Add</button>
                                    </div>
                                </div>
                            )}

                            {/* Manual entry grid */}
                            {manualTeamId && manualColConfig.length > 0 && manualAthletes.length > 0 && (
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="text-left w-full" style={{ minWidth: `${(manualColConfig.length + 1) * 140}px` }}>
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide whitespace-nowrap">Athlete</th>
                                                {manualColConfig.map(col => (
                                                    <th key={col.key} className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide whitespace-nowrap">{col.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {manualAthletes.map(p => (
                                                <tr key={p.id} className="hover:bg-slate-50/50">
                                                    <td className="sticky left-0 z-10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 whitespace-nowrap">{p.name}</td>
                                                    {manualColConfig.map(col => (
                                                        <td key={col.key} className="px-4 py-2">
                                                            <input
                                                                type="number"
                                                                value={manualRows[p.id]?.[col.key] || ''}
                                                                onChange={e => setManualRows(prev => ({
                                                                    ...prev,
                                                                    [p.id]: { ...(prev[p.id] || {}), [col.key]: e.target.value }
                                                                }))}
                                                                placeholder="—"
                                                                className="w-28 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-center outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {manualTeamId && manualAthletes.length === 0 && (
                                <p className="text-sm text-slate-400 text-center py-6">No athletes in this team yet</p>
                            )}
                            {!manualTeamId && (
                                <p className="text-sm text-slate-400 text-center py-6">Select a team to start entering data</p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Data view (import tab only) ──────────────────────────── */}
                {gpsTab === 'import' && (() => {
                    const records = gpsFilteredRecords;
                    const cols = gpsVisibleColKeys;

                    if (records.length === 0 && gpsData.length === 0) return (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-20 flex flex-col items-center gap-4 text-center">
                            <ActivityIcon size={48} className="text-slate-100" />
                            <div>
                                <p className="text-sm font-semibold text-slate-600">No GPS telemetry data</p>
                                <p className="text-xs text-slate-400 mt-1">Click "Import CSV" to upload from any GPS provider — all columns imported as-is</p>
                            </div>
                        </div>
                    );

                    if (records.length === 0) return (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm font-semibold text-slate-600">No records for this {gpsFilterDateMode === 'single' ? 'session date' : 'date range'}</p>
                            <p className="text-xs text-slate-400">{gpsData.length} total records — {gpsFilterDateMode === 'single' ? 'use the arrows to navigate to a session date with data' : 'adjust the date range'}</p>
                        </div>
                    );

                    const sessionDate = records[0]?.date;
                    const sessionCat = records[0]?.category || 'training';
                    const CAT_COLORS: Record<string, string> = {
                        match: 'bg-red-50 text-red-600 border-red-200',
                        recovery: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                        training: 'bg-indigo-50 text-indigo-600 border-indigo-200',
                    };

                    // Session mode: single date table
                    if (gpsFilterDateMode === 'single') {
                        const fmtFull = (d: string) => {
                            if (!d) return d;
                            const dt = new Date(d + 'T12:00:00');
                            return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        };
                        return (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                                        <ActivityIcon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-slate-900">{fmtFull(sessionDate)}</h4>
                                        <p className="text-[10px] text-slate-400">{records.length} athletes · {cols.length} columns visible</p>
                                    </div>
                                    <select
                                        value={sessionCat}
                                        onChange={e => gpsChangeDateCategory(sessionDate, e.target.value)}
                                        className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${CAT_COLORS[sessionCat] || 'bg-slate-50 text-slate-600 border-slate-200'}`}
                                    >
                                        {gpsDialogCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <GpsSessionTable rows={records} cols={cols} colLabel={gpsColLabel} onHideCol={gpsHideCol} />
                            </div>
                        );
                    }

                    // Range mode: date-grouped, collapse state managed inside GpsDateRangeView
                    return (
                        <GpsDateRangeView
                            records={records}
                            cols={cols}
                            colLabel={gpsColLabel}
                            onHideCol={gpsHideCol}
                            categories={gpsDialogCategories}
                            onChangeDateCategory={gpsChangeDateCategory}
                        />
                    );
                })()}

                <SmartCsvMapper
                    isOpen={isHrMapperOpen}
                    onClose={() => setIsHrMapperOpen(false)}
                    onConfirm={handleHrMapperConfirm}
                    schema={HR_SCHEMA}
                    csvHeaders={hrCsvHeaders}
                    csvRows={hrCsvRows}
                />
            </div>
        );
    };

    // REPORT 5: Max Report - Input View

    // REPORT 9: Opt Out/Notes Report
    // REPORT 9: Opt Out/Notes Report
    const renderMedicalInput = () => {
        const handleSaveOptOut = () => {
            if (!optOutForm.reason) return;
            const newOptOut = {
                athleteId: selectedAnalyticsAthleteId || 'p1',
                date: new Date().toISOString().split('T')[0],
                ...optOutForm
            };
            setOptOuts([newOptOut, ...optOuts]);
            setReportMode('analytics');
        };

        return (
            <div className="space-y-10 animate-in fade-in duration-500">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-slate-900">Athlete Status</h4>
                            <p className="text-slate-500 text-sm">Update availability and log opt-out reasons.</p>
                        </div>
                    </div>

                    <div className="space-y-6 max-w-2xl">
                        <div>
                            <label className="text-xs font-black uppercase text-indigo-400 tracking-widest pl-2 mb-2 block">Status</label>
                            <div className="flex gap-4">
                                {['Available', 'Modified', 'Unavailable'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => setOptOutForm({ ...optOutForm, status })}
                                        className={`flex-1 py-4 rounded-xl font-black uppercase text-xs transition-all ${optOutForm.status === status ? (status === 'Available' ? 'bg-emerald-500 text-white shadow-lg' : status === 'Modified' ? 'bg-amber-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') : 'bg-indigo-50 text-indigo-300 hover:bg-indigo-100/50'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-2 mb-2 block">Reason</label>
                            <input
                                type="text"
                                placeholder="e.g. Flu, Ankle Sprain"
                                value={optOutForm.reason}
                                onChange={(e) => setOptOutForm({ ...optOutForm, reason: e.target.value })}
                                className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-2 mb-2 block">Notes</label>
                            <textarea
                                placeholder="Additional context..."
                                value={optOutForm.notes}
                                onChange={(e) => setOptOutForm({ ...optOutForm, notes: e.target.value })}
                                className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium h-32 resize-none"
                            />
                        </div>

                        <div className="pt-4">
                            <button onClick={handleSaveOptOut} className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Save Status</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMedicalReport = () => {
        const filteredReports = medicalReports.filter(report => {
            if (!medicalFilterAthleteId || medicalFilterAthleteId === 'All Athletes') return true;
            if (medicalFilterAthleteId.startsWith('team_')) {
                return report.targetId === medicalFilterAthleteId;
            }
            return report.targetId === medicalFilterAthleteId;
        });

        const filteredOptOuts = optOuts.filter(log => {
            if (!medicalFilterAthleteId || medicalFilterAthleteId === 'All Athletes') return true;
            if (medicalFilterAthleteId.startsWith('team_')) {
                // Find if athlete belongs to team
                const teamId = medicalFilterAthleteId.replace('team_', '');
                const team = teams.find(t => t.id === teamId);
                return team && team.players.some(p => p.id === log.athleteId);
            }
            return log.athleteId === medicalFilterAthleteId;
        });

        // Merge and sort by date (recency)
        const timeline = [
            ...filteredReports.map(r => ({ ...r, timelineType: 'medical' })),
            ...filteredOptOuts.map(o => ({ ...o, timelineType: 'optout', title: o.reason, description: o.notes, targetName: teams.flatMap(t => t.players).find(p => p.id === o.athleteId)?.name || 'Unknown' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                {/* ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                            <StethoscopeIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-slate-900">Medical Hub</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Intelligence & Availability</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                            <button
                                onClick={() => { setMedicalModalMode('upload'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-semibold uppercase tracking-wide shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2 border border-slate-200"
                            >
                                <UploadCloudIcon size={14} /> Upload Doc
                            </button>
                            <button
                                onClick={() => { setMedicalModalMode('text'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all flex items-center gap-2"
                            >
                                <FileTextIcon size={14} /> Quick Log
                            </button>
                        </div>

                        <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>

                        <div className="relative group">
                            <label className="text-[9px] font-medium text-slate-400 uppercase tracking-wide absolute -top-5 left-2">Filter View</label>
                            <select
                                value={medicalFilterAthleteId}
                                onChange={(e) => setMedicalFilterAthleteId(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-700 outline-none appearance-none hover:border-indigo-300 transition-all cursor-pointer pr-10 shadow-sm min-w-[180px]"
                            >
                                <option>All Athletes</option>
                                <optgroup label="Squads">
                                    {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                                </optgroup>
                                <optgroup label="Athletes">
                                    {teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            </select>
                            <ChevronDownIcon size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <ActivityIcon size={200} className="text-slate-900" />
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h5 className="text-sm font-semibold text-slate-600">Medical Timeline</h5>
                        <div className="px-3 py-1.5 bg-slate-100 rounded-full text-[9px] font-semibold text-slate-600">
                            {timeline.length} Records
                        </div>
                    </div>

                    <div className="relative pl-12 border-l-2 border-slate-100 space-y-8 pb-8">
                        {timeline.length > 0 ? timeline.map((entry, i) => (
                            <div key={entry.id || i} className="relative group/item">
                                {/* Date indicator */}
                                <div className="absolute -left-[76px] top-1 text-right w-12 text-[10px] font-black text-slate-300 group-hover/item:text-indigo-400 transition-colors uppercase leading-tight">
                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>

                                {/* Connector dot */}
                                <div className={`absolute -left-[57px] top-5 w-5 h-5 rounded-full border-4 border-white shadow-md z-10 transition-transform group-hover/item:scale-125 ${entry.timelineType === 'medical' ? 'bg-indigo-600' : (entry.status === 'Available' ? 'bg-emerald-500' : entry.status === 'Modified' ? 'bg-amber-500' : 'bg-rose-500')
                                    }`}></div>

                                <div
                                    onClick={() => entry.timelineType === 'medical' && setInspectingMedicalRecord(entry)}
                                    className={`p-5 rounded-xl border transition-all ${entry.timelineType === 'medical'
                                        ? 'bg-slate-50/50 border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer'
                                        : 'bg-white border-indigo-50 shadow-sm'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg tracking-widest ${entry.timelineType === 'medical' ? 'bg-indigo-100 text-indigo-600' : (entry.status === 'Available' ? 'bg-emerald-100 text-emerald-600' : entry.status === 'Modified' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600')
                                                }`}>
                                                {entry.timelineType === 'medical' ? (entry.type === 'upload' ? 'DOCUMENT' : 'LOG') : entry.status}
                                            </span>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                                                <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-black text-white">{entry.targetName?.charAt(0) || 'A'}</div>
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{entry.targetName}</span>
                                            </div>
                                        </div>
                                        {entry.timelineType === 'medical' && entry.type === 'upload' && <FileIcon size={18} className="text-indigo-300" />}
                                    </div>

                                    <h6 className="text-base font-semibold text-slate-900 group-hover/item:text-indigo-900 transition-colors">{entry.title}</h6>

                                    {entry.description && (
                                        <p className="text-sm font-medium text-slate-400 mt-3 leading-relaxed max-w-xl line-clamp-2">
                                            {entry.description}
                                        </p>
                                    )}

                                    {entry.timelineType === 'medical' && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-400">S</div>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Logged by Medical Staff</span>
                                            </div>
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest group-hover/item:translate-x-1 transition-transform flex items-center gap-1">View Details <ChevronRightIcon size={12} /></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 flex flex-col items-center text-center opacity-30">
                                <SearchIcon size={48} className="mb-4" />
                                <div className="text-sm font-black uppercase tracking-widest">No matching records found</div>
                                <div className="text-xs font-bold">Try adjusting your filters</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };












    // REPORT 11: Raw Data Report
    const renderRawDataReport = () => {
        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="bg-white p-12 rounded-xl border border-indigo-100 shadow-sm text-center space-y-8">
                    <div className="max-w-lg mx-auto space-y-4">
                        <div className="w-20 h-20 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-400 mx-auto mb-6">
                            <TableIcon size={32} />
                        </div>
                        <h4 className="text-3xl font-black uppercase tracking-tighter text-indigo-900">Data Export Portal</h4>
                        <p className="text-sm text-indigo-400 font-medium leading-relaxed">Download normalized CSV datasets for external analysis in Python, R, or Excel.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto pt-8 border-t border-indigo-50">
                        {[
                            { name: 'Session Telemetry', size: '2.4MB' },
                            { name: 'Wellness Logs', size: '1.1MB' },
                            { name: 'Load Registry', size: '850KB' },
                            { name: 'Strength Metrics', size: '3.2MB' },
                            { name: 'Force Plate Data', size: '128MB' },
                            { name: 'GPS Exports', size: '45MB' }
                        ].map((file, i) => (
                            <button key={i} className="flex justify-between items-center bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 hover:border-indigo-600 hover:shadow-lg transition-all group">
                                <div className="text-left">
                                    <div className="text-xs font-black uppercase text-indigo-900">{file.name}</div>
                                    <div className="text-[10px] font-bold text-indigo-400 mt-1">{file.size} â€¢ CSV</div>
                                </div>
                                <FileDownIcon size={18} className="text-indigo-300 group-hover:text-indigo-600 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Main Reporting Hub View Switcher
    if (activeReport) {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setActiveReport(null); setReportMode('analytics'); }}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                        >
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Reporting Hub</div>
                            <h2 className="text-base font-semibold text-slate-900">{activeReport}</h2>
                        </div>
                    </div>
                </div>

                <div className="min-h-[600px] relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl">
                            <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400">Loading {activeReport?.toLowerCase()} data...</span>
                        </div>
                    )}
                    {activeReport === 'Heart Rate Metrics' && renderHeartRateMetricsReport()}
                    {activeReport === 'Tracking Hub' && renderTrackingHub()}
                    {activeReport === 'GPS Data' && renderGPSDataReport()}
                    {activeReport === 'Data Hub' && renderDataHub()}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Reporting Hub</h2>
                <p className="text-sm text-slate-500 mt-0.5">Performance intelligence reports and data exports.</p>
            </div>

            <div data-tour="report-cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                    { title: 'Heart Rate Metrics', desc: 'Session Intensity, Peaks & Zone Distribution', icon: HeartIcon },
                    { title: 'Data Hub', desc: 'Daily Activity Logs & Raw Registry Export', icon: TableIcon },
                    { title: 'Tracking Hub', desc: 'Consolidated Performance & Benchmark Tracking', icon: SearchIcon },
                    { title: 'GPS Data', desc: 'Sprints, Distance & Velocity telemetry import', icon: ActivityIcon },
                ].map((report, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveReport(report.title)}
                        className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col text-left h-[150px]"
                    >
                        <div className="flex items-start gap-4 h-full">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all shrink-0">
                                <report.icon size={20} />
                            </div>
                            <div className="flex flex-col justify-center h-full">
                                <h3 className="text-base font-semibold text-slate-900 mb-1 leading-tight">{report.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">{report.desc}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

