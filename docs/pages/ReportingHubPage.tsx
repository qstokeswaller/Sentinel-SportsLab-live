import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useAppState } from '../context/AppStateContext';
import { ACWRMetricCard } from '../components/analytics/ACWRMetricCard';
import { DataHub } from '../components/analytics/DataHub';
import { SupabaseStorageService as StorageService } from '../services/storageService';
import { DatabaseService } from '../services/databaseService';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell,
    LineChart, Line, Legend, ReferenceLine,
} from 'recharts';
import { useExerciseMap } from '../hooks/useExerciseMap';
import { RunningMechanicsLibrary } from '../components/conditioning/RunningMechanicsLibrary';
import GpsColumnMapper, { findMatchingProfile, fuzzyMatchHeader, PLATFORM_FIELDS } from '../components/performance/GpsColumnMapper';
import type { GpsProfile, ProfileMatchResult } from '../components/performance/GpsColumnMapper';
import { loadGpsProfiles, saveGpsProfiles, loadGpsCategories, saveGpsCategories, getProfileForTeam } from '../components/performance/GpsConfigModal';
import type { GpsTeamProfile, GpsCategory } from '../components/performance/GpsConfigModal';
import { normaliseDate } from '../utils/csvSchemas';
import { fuzzySearch } from '../utils/fuzzySearch';
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
import { CustomSelect } from '../components/ui/CustomSelect';
import { GPS_META_COLS, GPS_COL_PRIORITY, gpsSortCols, fmtGpsCell, GpsSessionTable, GpsDateRangeView } from './reporting/gpsTables';
import GpsDataReport from './reporting/GpsDataReport';
import GpsInsights from './reporting/GpsInsights';
import TrackingHub from './reporting/TrackingHub';
import { SkStatCards, SkChart, SkTable } from '../components/ui/Skeleton';

export const ReportingHubPage = () => {
    const {
        teams, setTeams, loadRecords, setLoadRecords, wellnessData, habitRecords, scheduledSessions,
        gpsData, setGpsData, kpiRecords, volumeRecords,
        selectedAnalyticsAthleteId, setSelectedAnalyticsAthleteId,
        activeReport, setActiveReport, reportMode, setReportMode,
        activeTab, setActiveTab, questionnaires, setQuestionnaires,
        dataHubTab, setDataHubTab,
        medicalReports, setMedicalReports, medicalFilterAthleteId, setMedicalFilterAthleteId,
        isMedicalModalOpen, setIsMedicalModalOpen, medicalModalMode, setMedicalModalMode,
        inspectingMedicalRecord, setInspectingMedicalRecord,
        optOutForm, setOptOutForm,
        optOuts, setOptOuts,
        showToast, wellnessDateRange, setWellnessDateRange, calculateACWR, calculateMonotony,
        acwrSettings,
        acwrExclusions,
        isLoading,
        polarIntegration, gpsDataSources,
        plannedTonnageLog,
        isSecondaryLoading,
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
    const [gpsImportDateOverride, setGpsImportDateOverride] = useState('');

    // GPS column visibility config (persisted to localStorage)
    const [gpsColumnConfig, setGpsColumnConfig] = useState<{key: string; visible: boolean; retired?: boolean}[]>(() => {
        try { return JSON.parse(localStorage.getItem('gps_col_cfg') || '[]'); } catch { return []; }
    });
    const [gpsColConfigOpen, setGpsColConfigOpen] = useState(false);

    // Post-import unlinked athlete dialog
    const [gpsUnlinkedDialog, setGpsUnlinkedDialog] = useState<{name: string}[] | null>(null);

    // GPS tab: 'import' | 'manual' | 'insights'
    const [gpsTab, setGpsTab] = useState<'import' | 'manual' | 'insights'>('import');

    // GPS Insights tab state
    const [insightMetric, setInsightMetric] = useState<string>('');
    const [insightScope, setInsightScope] = useState<'team' | 'individual'>('team');
    const [insightAthleteId, setInsightAthleteId] = useState<string>('');
    const [insightShowPerAthlete, setInsightShowPerAthlete] = useState<boolean>(false);
    const [insightRollingAvg, setInsightRollingAvg] = useState<boolean>(false);
    const [insightDateMode, setInsightDateMode] = useState<'range' | 'single'>('range');
    const [insightSingleDate, setInsightSingleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [insightTeamFilter, setInsightTeamFilter] = useState<string>('All Athletes');

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

    // Numeric GPS columns — only keys that have at least one parseable number (used by Insights tab)
    const numericGpsCols = useMemo(() => {
        const data = Array.isArray(gpsData) ? gpsData : [];
        return gpsHistoricalColKeys.filter(k => {
            if (GPS_META_COLS.has(k)) return false;
            return data.some(r => !isNaN(parseFloat(r.rawColumns?.[k])));
        });
    }, [gpsHistoricalColKeys, gpsData]);

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
                if (GPS_META_COLS.has(k)) return false;
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


    // ─── Tracking Hub: Exercise Map for body-part resolution ────
    const { exerciseFullMap } = useExerciseMap();

    // ─── Tracking Hub: Tonnage from planned_tonnage_log ────
    // New tracking model: tonnage is computed at packet/program SCHEDULE time
    // and written to planned_tonnage_log. The Tracking Hub reads from there
    // directly — no per-session aggregation, no actual_results join needed.
    // Each log row already carries a pre-aggregated by_body_part split, so
    // body-part / region breakdowns later in this page work without changes.
    const realTonnageData = useMemo(() => {
        const allPlayers = teams.flatMap(t => t.players);
        const playerMap: Record<string, string> = {};
        for (const p of allPlayers) playerMap[p.id] = p.name;

        const rows: { date: string; athleteId: string; athleteName: string; exerciseId: string; exercise: string; sets: number; reps: number; weight: number; tonnage: number; byBodyPart: Record<string, number> }[] = [];
        for (const r of (plannedTonnageLog || [])) {
            const athleteName = playerMap[r.athlete_id] || 'Unknown';
            // Synthesize one tonnage "row" per body-part bucket so downstream
            // aggregation (which keys by exerciseId / body parts) still works.
            const byBp: Record<string, number> = r.by_body_part || {};
            const keys = Object.keys(byBp).length > 0 ? Object.keys(byBp) : ['_unassigned'];
            for (const bp of keys) {
                const t = byBp[bp] ?? r.total_tonnage;
                rows.push({
                    date: r.date,
                    athleteId: r.athlete_id,
                    athleteName,
                    exerciseId: '',
                    // Use the body-part label as the "exercise" so the existing
                    // exerciseFullMap-based grouping in trackingLoadData still
                    // produces sensible per-region splits.
                    exercise: bp === '_unassigned' ? 'Unassigned' : bp,
                    sets: 0, reps: 0, weight: 0,
                    tonnage: Math.round(t),
                    byBodyPart: { [bp]: t },
                });
            }
        }
        return rows;
    }, [plannedTonnageLog, teams]);

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
        'Biceps': 'bg-cyan-100 text-cyan-700', 'Triceps': 'bg-violet-100 text-violet-700', 'Quadriceps': 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700',
        'Hamstrings': 'bg-lime-100 text-lime-700', 'Glutes': 'bg-pink-100 text-pink-700', 'Calves': 'bg-teal-100 text-teal-700',
        'Abdominals': 'bg-orange-100 text-orange-700', 'Forearms': 'bg-stone-100 text-stone-600', 'Trapezius': 'bg-indigo-100 dark:bg-indigo-900/35 text-indigo-700 dark:text-indigo-300',
        'Hip Flexors': 'bg-fuchsia-100 text-fuchsia-700', 'Adductors': 'bg-blue-100 text-blue-700', 'Abductors': 'bg-purple-100 text-purple-700',
        'Shins': 'bg-green-100 text-green-700',
    };
    const REGION_COLORS_MAP: Record<string, string> = {
        'Upper Body': '#6366f1', 'Lower Body': '#10b981', 'Core': '#f59e0b', 'Full Body': '#a855f7',
    };
    const REGION_BG: Record<string, string> = {
        'Upper Body': 'bg-indigo-100 dark:bg-indigo-900/35 text-indigo-700 dark:text-indigo-300', 'Lower Body': 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700',
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

        // Aggregate tonnage and sets by body part.
        // With the new tracking model each row carries a pre-aggregated `byBodyPart`
        // object (computed at packet/program schedule time and persisted in
        // planned_tonnage_log). We just sum it up; no exerciseFullMap lookup needed.
        // Exercises that had no tagged body parts arrive under the `_unassigned` key
        // and roll into Full Body so general tonnage stays accounted for.
        const byBodyPart: Record<string, { tonnage: number; sets: number; exercises: Set<string> }> = {};
        const byRegion: Record<string, { tonnage: number; sets: number }> = {};
        let totalTonnage = 0;
        let totalSets = 0;

        for (const row of filtered) {
            const rowByBp: Record<string, number> = (row as any).byBodyPart || {};
            for (const [bp, v] of Object.entries(rowByBp)) {
                const ton = Number(v) || 0;
                if (ton <= 0) continue;
                totalTonnage += ton;
                if (bp === '_unassigned' || bp === 'Unassigned') {
                    if (!byBodyPart['Unsorted']) byBodyPart['Unsorted'] = { tonnage: 0, sets: 0, exercises: new Set() };
                    byBodyPart['Unsorted'].tonnage += ton;
                    byBodyPart['Unsorted'].exercises.add(row.exercise || 'Unsorted');
                    if (!byRegion['Full Body']) byRegion['Full Body'] = { tonnage: 0, sets: 0 };
                    byRegion['Full Body'].tonnage += ton;
                    continue;
                }
                if (!byBodyPart[bp]) byBodyPart[bp] = { tonnage: 0, sets: 0, exercises: new Set() };
                byBodyPart[bp].tonnage += ton;
                byBodyPart[bp].exercises.add(row.exercise || bp);
                const region = BODY_PART_TO_REGION[bp] || 'Full Body';
                if (!byRegion[region]) byRegion[region] = { tonnage: 0, sets: 0 };
                byRegion[region].tonnage += ton;
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
        if (value > 2) return <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold"><ArrowUpIcon size={12} />+{value}%</span>;
        if (value < -2) return <span className="flex items-center gap-0.5 text-rose-600 text-xs font-bold"><ArrowDownIcon size={12} />{value}%</span>;
        return <span className="flex items-center gap-0.5 text-slate-400 dark:text-[#CBD5E1] text-xs font-bold"><MinusIcon size={12} />0%</span>;
    };

    // (trackingMedalColors removed — leaderboard replaced with load distribution)

    // ─── Tracking Hub Render ─────────────────────────────────────────

    const renderDataHub = () => {
        // Pass the back action through so DataHub can render its own consolidated
        // banner (which absorbs the parent's "REPORTING HUB / Data Hub" breadcrumb).
        return <DataHub onBack={() => { setActiveReport(null); setReportMode('analytics'); }} />;
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
                <div className="bg-white dark:bg-[#132338] p-12 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-xl flex flex-col md:flex-row gap-12 items-center">
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
                            A holistic composite score blending <span className="text-indigo-600 dark:text-indigo-300 font-bold">Internal Load (sRPE)</span>,
                            <span className="text-indigo-600 dark:text-indigo-300 font-bold"> External Response (Wellness)</span>, and <span className="text-indigo-600 dark:text-indigo-300 font-bold">Workload Dynamics (ACWR)</span>.
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
                    <div className="bg-white dark:bg-[#132338] p-10 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm space-y-8">
                        <div className="flex justify-between items-center">
                            <h5 className="text-lg font-black uppercase tracking-tight text-indigo-900 flex items-center gap-3">
                                <HeartIcon size={20} className="text-rose-500" /> Wellness Telemetry
                            </h5>
                            <button onClick={() => { setActiveReport('Wellness Report'); setReportMode('analytics'); }} className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-300 hover:underline">Full Analytics</button>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 dark:border-indigo-800/40 flex items-center gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-[#132338] rounded-xl flex items-center justify-center text-indigo-900 shadow-sm"><MoonIcon size={20} /></div>
                                <div>
                                    <div className="text-[9px] font-black uppercase text-indigo-400">Sleep</div>
                                    <div className="text-xl font-black text-indigo-900">{wellness.sleep}h</div>
                                </div>
                            </div>
                            <div className="p-6 bg-indigo-50/50 rounded-xl border border-indigo-100 dark:border-indigo-800/40 flex items-center gap-4">
                                <div className="w-10 h-10 bg-white dark:bg-[#132338] rounded-xl flex items-center justify-center text-indigo-900 shadow-sm"><ZapIcon size={20} /></div>
                                <div>
                                    <div className="text-[9px] font-black uppercase text-indigo-400">Energy</div>
                                    <div className="text-xl font-black text-indigo-900">{wellness.energy}/10</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* EVALUATION & QUESTIONNAIRE WIDGET */}
                    <div className="bg-white dark:bg-[#132338] p-10 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm space-y-8">
                        <div className="flex justify-between items-center">
                            <h5 className="text-lg font-black uppercase tracking-tight text-indigo-900 flex items-center gap-3">
                                <ClipboardListIcon size={20} className="text-indigo-500" /> Active Evaluations
                            </h5>
                            <button onClick={() => { setActiveReport('Evaluation Report'); setReportMode('analytics'); }} className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-300 hover:underline">View All</button>
                        </div>
                        <div className="space-y-4">
                            {[
                                { name: 'Lower Body Power', date: '21 Oct', score: '8.4', status: 'Optimal' },
                                { name: 'Reactive Strength', date: '15 Oct', score: '6.2', status: 'Warning' }
                            ].map((ev, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 transition-colors cursor-pointer border border-indigo-100 dark:border-indigo-800/40">
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
    // Note: the per-session completion flow was removed; every scheduled session
    // is auto-tracked. "sessions" now counts sessions whose date has already
    // passed (i.e. effectively "delivered") so the metric stays useful without
    // depending on a manual coach action.
    const renderActivityReport = () => {
        const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
        const activityStats = {
            sessions: scheduledSessions.filter(s => s.date && s.date <= todayStr).length,
            planned: scheduledSessions.length,
            duration: scheduledSessions.reduce((acc, s) => acc + (s.actualDuration || s.plannedDuration || 0), 0),
            load: loadRecords.reduce((acc, l) => acc + (l.plannedLoad * 10), 0) // Mock calculation
        };

        const weeklyActivity = [4, 5, 3, 6, 5, 2, 0]; // Mock weekly trend

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Total Sessions</div>
                        <div className="text-3xl font-black text-indigo-900">{activityStats.sessions} <span className="text-sm text-indigo-300 font-medium">/ {activityStats.planned}</span></div>
                    </div>
                    <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Total Duration</div>
                        <div className="text-3xl font-black text-indigo-900">{activityStats.duration} <span className="text-sm text-indigo-300 font-medium">min</span></div>
                    </div>
                    <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Volume Load</div>
                        <div className="text-3xl font-black text-indigo-900">{(activityStats.load / 1000).toFixed(1)}k <span className="text-sm text-indigo-300 font-medium">AU</span></div>
                    </div>
                    <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm space-y-2">
                        <div className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Active Days</div>
                        <div className="text-3xl font-black text-indigo-900">5 <span className="text-sm text-indigo-300 font-medium">/ 7</span></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#132338] p-10 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm space-y-8">
                    <h4 className="text-xl font-black uppercase tracking-tighter text-indigo-900">Weekly Activity Volume</h4>
                    <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-slate-100 dark:border-[#1A2D48] pb-4">
                        {weeklyActivity.map((count, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                                <div className="relative w-full bg-slate-100 dark:bg-[#1A2D48] rounded-xl overflow-hidden flex items-end group-hover:bg-slate-200 dark:hover:bg-[#1A2D48] transition-colors" style={{ height: '200px' }}>
                                    <div className="w-full bg-indigo-600 rounded-t-2xl transition-all duration-1000" style={{ height: `${count * 15}%` }}></div>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 dark:text-[#CBD5E1] uppercase">Day {i + 1}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };
    // ─────────────────────────────────────────────────────────────────────────
    // GPS INSIGHTS TAB
    // ─────────────────────────────────────────────────────────────────────────
    // Thin wrapper: GpsInsights extracted to reporting/GpsInsights.tsx; still
    // passed down as a render prop to GpsDataReport.
    const renderGpsInsights = () => <GpsInsights {...{ acwrExclusions, gpsColLabel, gpsData, gpsRangeEnd, gpsRangeStart, insightAthleteId, insightDateMode, insightMetric, insightRollingAvg, insightScope, insightShowPerAthlete, insightSingleDate, insightTeamFilter, numericGpsCols, setGpsRangeEnd, setGpsRangeStart, setGpsTab, setInsightAthleteId, setInsightDateMode, setInsightMetric, setInsightRollingAvg, setInsightScope, setInsightShowPerAthlete, setInsightSingleDate, setInsightTeamFilter, teams }} />;
    // ─────────────────────────────────────────────────────────────────────────


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
                <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-6">
                    <div className="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-[#1A2D48] pb-6">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Athlete Status</h4>
                            <p className="text-slate-500 dark:text-[#CBD5E1] text-sm">Update availability and log opt-out reasons.</p>
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
                                        className={`flex-1 py-4 rounded-xl font-black uppercase text-xs transition-all ${optOutForm.status === status ? (status === 'Available' ? 'bg-emerald-500 text-white shadow-lg' : status === 'Modified' ? 'bg-amber-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') : 'bg-indigo-50 dark:bg-indigo-600 text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-500/15'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase text-slate-400 dark:text-[#CBD5E1] tracking-widest pl-2 mb-2 block">Reason</label>
                            <input
                                type="text"
                                placeholder="e.g. Flu, Ankle Sprain"
                                value={optOutForm.reason}
                                onChange={(e) => setOptOutForm({ ...optOutForm, reason: e.target.value })}
                                className="w-full p-4 bg-slate-50 dark:bg-[#0F1C30] hover:bg-white dark:hover:bg-[#1A2D48] focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 dark:text-[#E2E8F0] placeholder:font-medium"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-black uppercase text-slate-400 dark:text-[#CBD5E1] tracking-widest pl-2 mb-2 block">Notes</label>
                            <textarea
                                placeholder="Additional context..."
                                value={optOutForm.notes}
                                onChange={(e) => setOptOutForm({ ...optOutForm, notes: e.target.value })}
                                className="w-full p-4 bg-slate-50 dark:bg-[#0F1C30] hover:bg-white dark:hover:bg-[#1A2D48] focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 dark:text-[#E2E8F0] placeholder:font-medium h-32 resize-none"
                            />
                        </div>

                        <div className="pt-4">
                            <button onClick={handleSaveOptOut} className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-black dark:hover:bg-indigo-500 transition-all">Save Status</button>
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
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                {/* ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-6 bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                            <StethoscopeIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Medical Hub</h4>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Intelligence & Availability</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-1.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-inner">
                            <button
                                onClick={() => { setMedicalModalMode('upload'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-white rounded-xl text-[10px] font-semibold uppercase tracking-wide shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all flex items-center gap-2 border border-slate-200 dark:border-indigo-600"
                            >
                                <UploadCloudIcon size={14} /> Upload Doc
                            </button>
                            <button
                                onClick={() => { setMedicalModalMode('text'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 text-slate-500 dark:text-[#CBD5E1] hover:text-indigo-600 dark:text-indigo-300 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all flex items-center gap-2"
                            >
                                <FileTextIcon size={14} /> Quick Log
                            </button>
                        </div>

                        <div className="h-10 w-[1px] bg-slate-200 dark:bg-[#243A58] mx-2"></div>

                        <div>
                            <label className="text-[9px] font-medium text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide block mb-1">Filter View</label>
                            <CustomSelect
                                value={medicalFilterAthleteId}
                                onChange={(e) => setMedicalFilterAthleteId(e.target.value)}
                                variant="filter"
                                size="xs"
                                placeholder="All Athletes"
                            >
                                <option>All Athletes</option>
                                <optgroup label="Squads">
                                    {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                                </optgroup>
                                <optgroup label="Athletes">
                                    {teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            </CustomSelect>
                        </div>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <ActivityIcon size={200} className="text-slate-900 dark:text-[#E2E8F0]" />
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h5 className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">Medical Timeline</h5>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-full text-[9px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                            {timeline.length} Records
                        </div>
                    </div>

                    <div className="relative pl-12 border-l-2 border-slate-100 dark:border-[#1A2D48] space-y-8 pb-8">
                        {timeline.length > 0 ? timeline.map((entry, i) => (
                            <div key={entry.id || i} className="relative group/item">
                                {/* Date indicator */}
                                <div className="absolute -left-[76px] top-1 text-right w-12 text-[10px] font-black text-slate-300 dark:text-[#475569] group-hover/item:text-indigo-400 transition-colors uppercase leading-tight">
                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>

                                {/* Connector dot */}
                                <div className={`absolute -left-[57px] top-5 w-5 h-5 rounded-full border-4 border-white shadow-md z-10 transition-transform group-hover/item:scale-125 ${entry.timelineType === 'medical' ? 'bg-indigo-600' : (entry.status === 'Available' ? 'bg-emerald-500' : entry.status === 'Modified' ? 'bg-amber-500' : 'bg-rose-500')
                                    }`}></div>

                                <div
                                    onClick={() => entry.timelineType === 'medical' && setInspectingMedicalRecord(entry)}
                                    className={`p-5 rounded-xl border transition-all ${entry.timelineType === 'medical'
                                        ? 'bg-slate-50/50 dark:bg-[#132338]/40 border-slate-100 dark:border-[#1A2D48] hover:border-indigo-200 dark:border-indigo-600 hover:bg-white dark:hover:bg-[#1A2D48] hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer'
                                        : 'bg-white dark:bg-[#132338] border-indigo-50 shadow-sm'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg tracking-widest border ${entry.timelineType === 'medical' ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300' : (entry.status === 'Available' ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-600 dark:text-emerald-400' : entry.status === 'Modified' ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-600 dark:text-amber-400' : 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400')
                                                }`}>
                                                {entry.timelineType === 'medical' ? (entry.type === 'upload' ? 'DOCUMENT' : 'LOG') : entry.status}
                                            </span>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-lg">
                                                <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-black text-white">{entry.targetName?.charAt(0) || 'A'}</div>
                                                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-[#CBD5E1] tracking-widest">{entry.targetName}</span>
                                            </div>
                                        </div>
                                        {entry.timelineType === 'medical' && entry.type === 'upload' && <FileIcon size={18} className="text-indigo-300" />}
                                    </div>

                                    <h6 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover/item:text-indigo-900 transition-colors">{entry.title}</h6>

                                    {entry.description && (
                                        <p className="text-sm font-medium text-slate-400 dark:text-[#CBD5E1] mt-3 leading-relaxed max-w-xl line-clamp-2">
                                            {entry.description}
                                        </p>
                                    )}

                                    {entry.timelineType === 'medical' && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-[#1A2D48] flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-100 dark:bg-[#1A2D48] rounded-full flex items-center justify-center text-[8px] font-black text-slate-400 dark:text-[#CBD5E1]">S</div>
                                                <span className="text-[9px] font-black text-slate-300 dark:text-[#475569] uppercase tracking-widest">Logged by Medical Staff</span>
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
                <div className="bg-white dark:bg-[#132338] p-12 rounded-xl border border-indigo-100 dark:border-indigo-800/40 shadow-sm text-center space-y-8">
                    <div className="max-w-lg mx-auto space-y-4">
                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-indigo-400 mx-auto mb-6">
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
                            <button key={i} className="flex justify-between items-center bg-indigo-50/50 p-6 rounded-xl border border-indigo-100 dark:border-indigo-800/40 hover:border-indigo-600 hover:shadow-lg transition-all group">
                                <div className="text-left">
                                    <div className="text-xs font-black uppercase text-indigo-900">{file.name}</div>
                                    <div className="text-[10px] font-bold text-indigo-400 mt-1">{file.size} â€¢ CSV</div>
                                </div>
                                <FileDownIcon size={18} className="text-indigo-300 group-hover:text-indigo-600 dark:text-indigo-300 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    // Main Reporting View Switcher
    if (activeReport) {
        // Data Hub owns its own consolidated banner (back button + title + filters +
        // actions) so we skip the parent breadcrumb header and the outer spacing to
        // give it the full viewport height. Other reports keep the standard shell.
        const isDataHubReport = activeReport === 'Data Hub';
        if (isDataHubReport) {
            return (
                <div className="animate-in fade-in duration-300">
                    {renderDataHub()}
                </div>
            );
        }
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white dark:bg-[#132338] px-5 py-3.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setActiveReport(null); setReportMode('analytics'); }}
                            className="p-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg flex items-center justify-center text-slate-500 dark:text-[#CBD5E1] hover:text-slate-900 dark:hover:text-[#E2E8F0] hover:border-slate-300 transition-all"
                        >
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div>
                            <div className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] uppercase tracking-wide">Reporting</div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">{activeReport}</h2>
                        </div>
                    </div>
                </div>

                <div className="min-h-[600px] relative">
                    {isLoading && (
                        <div className="absolute inset-0 z-10 bg-white/80 dark:bg-[#132338]/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl">
                            <div className="w-6 h-6 border-2 border-indigo-200 dark:border-indigo-600 border-t-indigo-600 rounded-full animate-spin" />
                            <span className="text-xs font-medium text-slate-400 dark:text-[#CBD5E1]">Loading {activeReport?.toLowerCase()} data...</span>
                        </div>
                    )}
                    {/* Skeleton (Phase 2): tonnage log is background-tier — mirror the
                        Tracking Hub layout (KPI tiles + chart + athlete table) */}
                    {activeReport === 'Tracking Hub' && isSecondaryLoading && (plannedTonnageLog || []).length === 0 && (
                        <div className="space-y-4">
                            <SkStatCards count={4} />
                            <SkChart />
                            <SkTable rows={6} cols={5} />
                        </div>
                    )}
                    {activeReport === 'Tracking Hub' && !(isSecondaryLoading && (plannedTonnageLog || []).length === 0) && <TrackingHub {...{ BODY_PART_BG, BODY_PART_COLORS_MAP, REGION_BG, REGION_COLORS_MAP, TrackingSortIcon, TrackingTrendArrow, allTrackingAthletes, handleTrackingSort, setTrackingDateRange, setTrackingLoadCustomRange, setTrackingLoadPeriod, setTrackingLoadView, setTrackingPeriod, setTrackingSelectedAthlete, setTrackingSelectedTeam, setTrackingTab, teams, trackingAthleteData, trackingDateRange, trackingExerciseBreakdown, trackingKpis, trackingLoadCustomRange, trackingLoadData, trackingLoadPeriod, trackingLoadView, trackingPeriod, trackingSelectedAthlete, trackingSelectedTeam, trackingSessionTonnage, trackingSortedTeamStats, trackingTab }} />}
                    {/* Skeleton (Phase 2): GPS records are background-tier */}
                    {activeReport === 'GPS Data' && isSecondaryLoading && (gpsData || []).length === 0 && (
                        <div className="space-y-4">
                            <SkStatCards count={3} />
                            <SkTable rows={8} cols={6} />
                        </div>
                    )}
                    {activeReport === 'GPS Data' && !(isSecondaryLoading && (gpsData || []).length === 0) && <GpsDataReport {...{ acwrSettings, gpsChangeDateCategory, gpsColConfigOpen, gpsColLabel, gpsColSearch, gpsData, gpsDataSources, gpsDialogAthleteCol, gpsDialogCategories, gpsDialogDateCol, gpsDialogPhaseCol, gpsFilterDateMode, gpsFilterTarget, gpsFilteredRecords, gpsHideCol, gpsHistoricalColKeys, gpsImportCategory, gpsImportDateOverride, gpsImportMessage, gpsImportStatus, gpsImportTeamId, gpsMatchedProfile, gpsMergedColConfig, gpsMissingColWarning, gpsNewCatLabel, gpsNewColumns, gpsRangeEnd, gpsRangeStart, gpsSaveColConfig, gpsSessionDates, gpsShowNewCat, gpsSmartDialog, gpsSpecificDate, gpsTab, gpsUnlinkedDialog, gpsVisibleColKeys, manualColConfig, manualColPickerOpen, manualDate, manualRows, manualTeamId, newManualColName, polarIntegration, polarSyncMessage, polarSyncStatus, renderGpsInsights, setGpsColConfigOpen, setGpsColSearch, setGpsData, setGpsDialogAthleteCol, setGpsDialogCategories, setGpsDialogDateCol, setGpsDialogPhaseCol, setGpsFilterDateMode, setGpsFilterTarget, setGpsImportCategory, setGpsImportDateOverride, setGpsImportMessage, setGpsImportStatus, setGpsImportTeamId, setGpsMatchedProfile, setGpsMissingColWarning, setGpsNewCatLabel, setGpsNewColumns, setGpsRangeEnd, setGpsRangeStart, setGpsShowNewCat, setGpsSmartDialog, setGpsSpecificDate, setGpsTab, setGpsUnlinkedDialog, setManualColConfig, setManualColPickerOpen, setManualDate, setManualRows, setManualTeamId, setNewManualColName, setPolarSyncMessage, setPolarSyncStatus, showToast, syncGpsToLoadRecords, teams }} />}
                    {activeReport === 'Running Mechanics' && <RunningMechanicsLibrary />}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#132338] px-5 py-4 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-[#E2E8F0]">Reporting</h2>
                <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mt-0.5">Performance intelligence reports and data exports.</p>
            </div>

            <div data-tour="report-cards" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[
                    { title: 'Data Hub', desc: 'Daily Activity Logs & Raw Registry Export', icon: TableIcon },
                    { title: 'Tracking Hub', desc: 'Consolidated Performance & Benchmark Tracking', icon: SearchIcon },
                    { title: 'GPS Data', desc: 'Sprints, Distance & Velocity telemetry import', icon: ActivityIcon },
                    { title: 'Running Mechanics', desc: 'Gait analysis, sprint mechanics & movement documents', icon: FootprintsIcon },
                ].map((report, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveReport(report.title)}
                        data-tour={`report-card-${report.title.toLowerCase().replace(/\s+/g, '-')}`}
                        className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm hover:shadow-md hover:border-indigo-200 dark:border-indigo-800/50 transition-all group flex flex-col text-left h-[150px]"
                    >
                        <div className="flex items-start gap-4 h-full">
                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/15 text-indigo-500 dark:text-indigo-300 group-hover:bg-indigo-600 group-hover:text-white dark:group-hover:bg-indigo-500 dark:group-hover:text-white flex items-center justify-center transition-all shrink-0">
                                <report.icon size={20} />
                            </div>
                            <div className="flex flex-col justify-center h-full">
                                <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] mb-1 leading-tight">{report.title}</h3>
                                <p className="text-xs text-slate-500 dark:text-[#CBD5E1] leading-relaxed">{report.desc}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

