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

export const ReportingHubPage = () => {
    const {
        teams, setTeams, loadRecords, wellnessData, habitRecords, scheduledSessions,
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
        isLoading,
    } = useAppState();

    // --- Local state for GPS Data report ---
    const [gpsFilterTarget, setGpsFilterTarget] = useState('All Athletes');
    const [gpsFilterDateMode, setGpsFilterDateMode] = useState<'range' | 'single'>('range');
    const [gpsRangeStart, setGpsRangeStart] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
    });
    const [gpsRangeEnd, setGpsRangeEnd] = useState(() => new Date().toISOString().split('T')[0]);
    const [gpsSpecificDate, setGpsSpecificDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [gpsImportStatus, setGpsImportStatus] = useState<'success' | 'error' | null>(null);
    const [gpsImportMessage, setGpsImportMessage] = useState('');

    // GPS Column Mapper state
    const [isGpsMapperOpen, setIsGpsMapperOpen] = useState(false);
    const [gpsCsvHeaders, setGpsCsvHeaders] = useState<string[]>([]);
    const [gpsCsvPreviewRows, setGpsCsvPreviewRows] = useState<Record<string, string>[]>([]);
    const [gpsCsvParsedData, setGpsCsvParsedData] = useState<Record<string, string>[]>([]);
    const [gpsAnomalyMode, setGpsAnomalyMode] = useState<{ profile: GpsProfile; newColumns: string[]; missingColumns: string[] } | null>(null);
    const [gpsImportTeamId, setGpsImportTeamId] = useState<string>('');
    const [gpsProfiles, setGpsProfiles] = useState<GpsProfile[]>(() => {
        try { return JSON.parse(localStorage.getItem('gps_column_profiles') || '[]'); } catch { return []; }
    });

    const [hrReportDateRange, setHrReportDateRange] = useState({ start: '2025-01-01', end: new Date().toISOString().split('T')[0] });
    const [hrImportStatus, setHrImportStatus] = useState<'success' | 'error' | null>(null);
    const [hrImportMessage, setHrImportMessage] = useState('');
    const [hrReportSelectedTeam, setHrReportSelectedTeam] = useState('');
    const hrFileRef = useRef<HTMLInputElement>(null);
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

    const processHrCSV = (csvText: string) => {
        const lines = csvText.split('\n').filter(l => l.trim());
        if (lines.length < 2) { setHrImportStatus('error'); setHrImportMessage('CSV file is empty or has no data rows.'); return; }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));

        // Map common header variations
        const findCol = (candidates: string[]) => headers.findIndex(h => candidates.some(c => h.includes(c)));
        const dateIdx = findCol(['date', 'session_date', 'timestamp']);
        const sessionIdx = findCol(['session', 'session_name', 'session_type', 'activity', 'type']);
        const athleteIdx = findCol(['athlete', 'player', 'name', 'athlete_name', 'player_name']);
        const avgHrIdx = findCol(['avg_hr', 'average_hr', 'avg_heart_rate', 'mean_hr', 'avghr']);
        const maxHrIdx = findCol(['max_hr', 'peak_hr', 'max_heart_rate', 'maxhr']);
        const minHrIdx = findCol(['min_hr', 'resting_hr', 'rest_hr', 'minhr']);
        const durationIdx = findCol(['duration', 'session_duration', 'time', 'total_time', 'duration_min']);
        const trimpIdx = findCol(['trimp', 'training_impulse']);
        const caloriesIdx = findCol(['calories', 'kcal', 'energy']);
        const z1Idx = findCol(['z1', 'zone_1', 'zone1', 'time_z1']);
        const z2Idx = findCol(['z2', 'zone_2', 'zone2', 'time_z2']);
        const z3Idx = findCol(['z3', 'zone_3', 'zone3', 'time_z3']);
        const z4Idx = findCol(['z4', 'zone_4', 'zone4', 'time_z4']);
        const z5Idx = findCol(['z5', 'zone_5', 'zone5', 'time_z5']);
        const recoveryIdx = findCol(['recovery_hr', 'hrr', 'hr_recovery', 'recovery']);

        if (avgHrIdx === -1 && maxHrIdx === -1) {
            setHrImportStatus('error');
            setHrImportMessage('CSV must contain at least avg_hr or max_hr columns. Supported columns: date, session, athlete, avg_hr, max_hr, min_hr, duration, trimp, calories, z1-z5, recovery_hr');
            return;
        }

        const rows = lines.slice(1);
        const parsed = [];
        for (const line of rows) {
            const cols = line.split(',').map(c => c.trim());
            const num = (idx: number) => idx >= 0 ? parseFloat(cols[idx]) || 0 : 0;
            const str = (idx: number) => idx >= 0 ? cols[idx] || '' : '';

            const avgHr = num(avgHrIdx);
            const maxHr = num(maxHrIdx);
            if (!avgHr && !maxHr) continue; // skip empty rows

            parsed.push({
                id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                date: str(dateIdx) || new Date().toISOString().split('T')[0],
                session: str(sessionIdx) || 'Session',
                athlete: str(athleteIdx) || '',
                avgHr, maxHr,
                minHr: num(minHrIdx),
                duration: num(durationIdx),
                trimp: num(trimpIdx),
                calories: num(caloriesIdx),
                zones: {
                    z1: num(z1Idx), z2: num(z2Idx), z3: num(z3Idx), z4: num(z4Idx), z5: num(z5Idx),
                },
                recoveryHr: num(recoveryIdx),
                zone: classifyZone(avgHr, maxHr || 200),
            });
        }

        if (parsed.length === 0) { setHrImportStatus('error'); setHrImportMessage('No valid HR rows found in CSV.'); return; }

        const updated = [...(Array.isArray(hrData) ? hrData : []), ...parsed];
        setHrData(updated);
        StorageService.saveHrData(updated);
        setHrImportStatus('success');
        setHrImportMessage(`Imported ${parsed.length} session${parsed.length > 1 ? 's' : ''} successfully.`);
        setTimeout(() => setHrImportStatus(null), 5000);
    };

    const handleHrFileUpload = (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => { processHrCSV(ev.target.result as string); };
        reader.readAsText(file);
        e.target.value = '';
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

        // --- GPS CSV Import with Column Mapper ---
        const handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            // Reset file input so re-uploading same file works
            event.target.value = '';

            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                parseAndOpenMapper(text);
            };
            reader.readAsText(file);
        };

        // Step 1: Parse CSV, check for matching profile, then route accordingly
        const parseAndOpenMapper = (csvText) => {
            const lines = csvText.split('\n');
            if (lines.length < 2) {
                setGpsImportStatus('error');
                setGpsImportMessage('CSV file is empty or invalid.');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).filter(line => line.trim() !== '');

            const parsedData = rows.map(row => {
                const values = row.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, i) => { obj[header] = values[i]; });
                return obj;
            });

            setGpsCsvHeaders(headers);
            setGpsCsvPreviewRows(parsedData.slice(0, 4));
            setGpsCsvParsedData(parsedData);

            // Try to auto-match against saved profiles
            const match = findMatchingProfile(headers, gpsProfiles, gpsImportTeamId || undefined);

            if (match && match.matchType === 'exact') {
                // Perfect match — auto-import, skip the mapper entirely
                setGpsImportStatus('success');
                setGpsImportMessage(`Auto-matched profile "${match.profile.name}". Importing...`);
                handleMapperConfirm(match.profile.mapping);
                return;
            }

            if (match && match.matchType === 'partial' && match.newColumns.length > 0) {
                // Partial match — new columns detected, show anomaly prompt
                setGpsAnomalyMode({
                    profile: match.profile,
                    newColumns: match.newColumns,
                    missingColumns: match.missingColumns,
                });
                setIsGpsMapperOpen(true);
                return;
            }

            // No match — show full mapper
            setGpsAnomalyMode(null);
            setIsGpsMapperOpen(true);
        };

        // Step 2: User confirms mapping → process data with their column choices
        const handleMapperConfirm = (mapping) => {
            setIsGpsMapperOpen(false);

            const allPlayers = teams.flatMap(t => t.players);

            const standardizedData = gpsCsvParsedData.map(entry => {
                const getVal = (fieldId) => {
                    const csvCol = mapping[fieldId];
                    return csvCol ? (entry[csvCol] || null) : null;
                };

                const name = getVal('athlete_name');
                const date = getVal('date') || new Date().toISOString().split('T')[0];

                return {
                    id: 'gps_' + Date.now() + Math.random().toString(36).substr(2, 5),
                    date,
                    playerName: name || 'Unknown',
                    totalDistance: parseFloat(getVal('total_distance')) || 0,
                    hsr: parseFloat(getVal('hsr') || getVal('sprint_distance')) || 0,
                    sprints: parseInt(getVal('sprints')) || 0,
                    maxSpeed: parseFloat(getVal('max_speed')) || 0,
                    accelerations: parseInt(getVal('accelerations')) || 0,
                    decelerations: parseInt(getVal('decelerations')) || 0,
                    playerLoad: parseFloat(getVal('player_load')) || 0,
                    heartRateAvg: parseFloat(getVal('heart_rate_avg')) || 0,
                    heartRateMax: parseFloat(getVal('heart_rate_max')) || 0,
                    durationMinutes: parseFloat(getVal('duration_minutes')) || 0,
                    metabolicPower: parseFloat(getVal('metabolic_power')) || 0,
                    impacts: parseInt(getVal('impacts')) || 0,
                    distancePerMin: parseFloat(getVal('distance_per_min')) || 0,
                    timestamp: new Date().toISOString()
                };
            });

            const alignedData = standardizedData.map(entry => {
                const player = allPlayers.find(p =>
                    p.name.toLowerCase().includes(entry.playerName.toLowerCase()) ||
                    entry.playerName.toLowerCase().includes(p.name.toLowerCase())
                );
                return {
                    ...entry,
                    athleteId: player ? player.id : 'unknown',
                    matchedName: player ? player.name : entry.playerName
                };
            });

            const updatedGpsData = [...gpsData, ...alignedData];
            setGpsData(updatedGpsData);
            StorageService.saveGpsData(updatedGpsData);

            setGpsImportStatus('success');
            setGpsImportMessage(`Imported ${alignedData.length} records (${Object.keys(mapping).length} fields mapped).`);
            setTimeout(() => setGpsImportStatus(null), 5000);
        };

        const handleSaveGpsProfile = (profile) => {
            // Ensure fingerprint is set from current headers
            if (!profile.headerFingerprint || profile.headerFingerprint.length === 0) {
                profile.headerFingerprint = gpsCsvHeaders.map(h => h.toLowerCase().trim());
            }
            const updated = [...gpsProfiles.filter(p => p.name !== profile.name), profile];
            setGpsProfiles(updated);
            localStorage.setItem('gps_column_profiles', JSON.stringify(updated));
            showToast?.(`Profile "${profile.name}" saved for ${profile.teamName}`);
        };

        const handleDeleteGpsProfile = (name) => {
            const updated = gpsProfiles.filter(p => p.name !== name);
            setGpsProfiles(updated);
            localStorage.setItem('gps_column_profiles', JSON.stringify(updated));
            showToast?.(`Profile deleted`);
        };

        const clearGpsData = () => {
            if (confirm('Are you sure you want to clear all GPS telemetry data?')) {
                setGpsData([]);
                StorageService.saveGpsData([]);
            }
        };

        const filteredGPSRecords = gpsData.filter(d => {
            // Date Filter
            let dateInRange = false;
            if (gpsFilterDateMode === 'single') {
                dateInRange = d.date === gpsSpecificDate;
            } else {
                // Custom Date Range
                dateInRange = d.date >= gpsRangeStart && d.date <= gpsRangeEnd;
            }

            if (!dateInRange) return false;

            // Target Filter
            if (gpsFilterTarget === 'All Athletes') return true;

            const targetTeam = teams.find(t => t.name === gpsFilterTarget);
            if (targetTeam) {
                return targetTeam.players.some(p => p.id === d.athleteId);
            }

            const targetPlayer = teams.flatMap(t => t.players).find(p => p.name === gpsFilterTarget);
            if (targetPlayer) {
                return d.athleteId === targetPlayer.id;
            }

            return false;
        });

        const stats = {
            avgDist: (filteredGPSRecords.reduce((acc, r) => acc + r.totalDistance, 0) / (filteredGPSRecords.length || 1)).toFixed(0),
            avgHsr: (filteredGPSRecords.reduce((acc, r) => acc + r.hsr, 0) / (filteredGPSRecords.length || 1)).toFixed(0),
            maxVelocity: Math.max(...filteredGPSRecords.map(r => r.maxSpeed), 0).toFixed(1),
            totalSprints: filteredGPSRecords.reduce((acc, r) => acc + r.sprints, 0)
        };

        // Team Aggregation Logic
        const isTeamSelected = teams.some(t => t.name === gpsFilterTarget);
        let displayRecords = filteredGPSRecords;

        if (isTeamSelected) {
            const playerGroups = filteredGPSRecords.reduce((acc, r) => {
                if (!acc[r.athleteId]) {
                    acc[r.athleteId] = {
                        athleteId: r.athleteId,
                        matchedName: r.matchedName,
                        records: []
                    };
                }
                acc[r.athleteId].records.push(r);
                return acc;
            }, {});

            displayRecords = Object.values(playerGroups).map(group => {
                const count = group.records.length;
                return {
                    athleteId: group.athleteId,
                    matchedName: group.matchedName,
                    date: `${count} Sessions`,
                    totalDistance: (group.records.reduce((sum, r) => sum + r.totalDistance, 0) / count).toFixed(0),
                    hsr: (group.records.reduce((sum, r) => sum + r.hsr, 0) / count).toFixed(0),
                    sprints: (group.records.reduce((sum, r) => sum + r.sprints, 0) / count).toFixed(1),
                    maxSpeed: Math.max(...group.records.map(r => r.maxSpeed), 0).toFixed(1),
                    isAggregated: true,
                    sessionCount: count
                };
            });
        }

        const formatDistance = (m) => {
            const val = Number(m);
            if (val >= 1000) {
                return (val / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'km';
            }
            return val.toLocaleString(undefined, { maximumFractionDigits: 0 }) + 'm';
        };

        return (
            <div className="space-y-10 animate-in fade-in duration-500">
                {/* Filter Control Hub */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
                    {/* Title + actions row */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900">GPS Intelligence Filters</h3>
                        <div className="flex items-center gap-2">
                            {gpsImportStatus && <span className={`text-[10px] font-bold ${gpsImportStatus === 'success' ? 'text-emerald-600' : 'text-rose-600'} animate-pulse`}>{gpsImportMessage}</span>}
                            <select
                                value={gpsImportTeamId}
                                onChange={e => setGpsImportTeamId(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[10px] font-medium text-slate-600"
                                title="Select team for this import"
                            >
                                <option value="">Team / Group...</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <label className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1.5 hover:bg-indigo-700 transition-all cursor-pointer active:scale-95">
                                <FileIcon size={13} /> Import Telemetry
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <button onClick={clearGpsData} title="Clear Records" className="p-2 text-slate-300 hover:text-rose-500 transition-colors border border-slate-200 rounded-lg hover:bg-rose-50"><Trash2Icon size={15} /></button>
                        </div>
                    </div>
                    {/* Filters row — all items baseline-aligned */}
                    <div className="flex flex-wrap items-end gap-4">
                        {/* Target Selector */}
                        <div className="space-y-1.5 min-w-[220px]">
                            <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide pl-1">Target Squad / Athlete</label>
                            <div className="relative">
                                <select
                                    value={gpsFilterTarget}
                                    onChange={(e) => setGpsFilterTarget(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none appearance-none hover:border-indigo-300 transition-all cursor-pointer pr-8 shadow-sm"
                                >
                                    <option>All Athletes</option>
                                    <optgroup label="Squads">
                                        {teams.map(t => <option key={t.id}>{t.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Individual Athletes">
                                        {teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)).map(p => <option key={p.id}>{p.name}</option>)}
                                    </optgroup>
                                </select>
                                <ChevronDownIcon size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date Mode Toggle */}
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide pl-1">Timeline Mode</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setGpsFilterDateMode('range')}
                                    className={`px-3 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${gpsFilterDateMode === 'range' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Date Range
                                </button>
                                <button
                                    onClick={() => setGpsFilterDateMode('single')}
                                    className={`px-3 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${gpsFilterDateMode === 'single' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    One Day
                                </button>
                            </div>
                        </div>

                        {/* Contextual Date Selectors */}
                        {gpsFilterDateMode === 'range' ? (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide pl-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={gpsRangeStart}
                                        onChange={(e) => setGpsRangeStart(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 transition-all shadow-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide pl-1">End Date</label>
                                    <input
                                        type="date"
                                        value={gpsRangeEnd}
                                        onChange={(e) => setGpsRangeEnd(e.target.value)}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 transition-all shadow-sm"
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="space-y-1.5 min-w-[180px]">
                                <label className="text-[10px] font-semibold uppercase text-slate-500 tracking-wide pl-1">Session Date</label>
                                <input
                                    type="date"
                                    value={gpsSpecificDate}
                                    onChange={(e) => setGpsSpecificDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-300 transition-all shadow-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 group hover:border-indigo-200 transition-all">
                        <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Avg Distance</div>
                        <div className="text-2xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{formatDistance(stats.avgDist)}</div>
                        <div className="text-[9px] text-slate-400 uppercase">Across Filter Selection</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 group hover:border-indigo-200 transition-all">
                        <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Avg HSR</div>
                        <div className="text-2xl font-bold text-indigo-600 group-hover:text-indigo-400 transition-colors">{formatDistance(stats.avgHsr)}</div>
                        <div className="text-[9px] text-slate-400 uppercase">High Speed Running</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 group hover:border-emerald-200 transition-all">
                        <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Max Velocity</div>
                        <div className="text-2xl font-bold text-emerald-600 group-hover:text-emerald-500 transition-colors">{stats.maxVelocity}<span className="text-xs ml-1 font-semibold">KM/H</span></div>
                        <div className="text-[9px] text-slate-400 uppercase">Squad Peak Velocity</div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2 group hover:border-orange-200 transition-all">
                        <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Total Sprints</div>
                        <div className="text-2xl font-bold text-orange-500 group-hover:text-orange-400 transition-colors">{stats.totalSprints}</div>
                        <div className="text-[9px] text-slate-400 uppercase">Frequency Count</div>
                    </div>
                </div>

                {/* Telemetry Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                                <TableIcon size={16} />
                            </div>
                            <div>
                                <h4 className="text-base font-semibold text-slate-900">GPS Telemetry Log</h4>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide">
                                    {isTeamSelected ? 'Team Aggregation View' : 'Individual Session Log'} · {gpsFilterTarget}
                                </p>
                            </div>
                        </div>
                        <div className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
                            {displayRecords.length} rows
                        </div>
                    </div>
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide">Athlete</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide text-center">{isTeamSelected ? 'Sessions' : 'Session Date'}</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide text-center">{isTeamSelected ? 'Avg Distance' : 'Total Distance'}</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide text-center">{isTeamSelected ? 'Avg HSR' : 'HSR'}</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide text-center">{isTeamSelected ? 'Avg Sprints' : 'Sprints'}</th>
                                    <th className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 tracking-wide text-center">{isTeamSelected ? 'Max Velocity' : 'Top Speed'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {(isTeamSelected ? displayRecords : displayRecords.slice().reverse()).map((r) => (
                                    <tr key={r.id || r.athleteId} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{r.matchedName}</span>
                                                <span className={`text-[8px] font-medium uppercase tracking-wide ${r.athleteId === 'unknown' ? 'text-rose-400' : 'text-slate-400'}`}>
                                                    {r.athleteId === 'unknown' ? 'UNLINKED PROFILE' : 'VERIFIED ATHLETE'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">{r.date}</td>
                                        <td className="px-4 py-3 text-center font-semibold text-slate-900">
                                            {formatDistance(r.totalDistance)}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                                            {formatDistance(r.hsr)}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-orange-500">
                                            {Number(r.sprints).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                                            {Number(r.maxSpeed).toLocaleString(undefined, { maximumFractionDigits: 1 })} KM/H
                                        </td>
                                    </tr>
                                ))}
                                {displayRecords.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="p-24 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <ActivityIcon size={48} className="text-slate-100" />
                                                <div>
                                                    <p className="text-slate-400 italic text-sm font-medium">No telemetry records match your current filter criteria.</p>
                                                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Try adjusting the Date Range or Target Selection</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* GPS Column Mapper Modal */}
                {isGpsMapperOpen && (
                    <GpsColumnMapper
                        csvHeaders={gpsCsvHeaders}
                        csvPreviewRows={gpsCsvPreviewRows}
                        onConfirm={(mapping) => { setIsGpsMapperOpen(false); setGpsAnomalyMode(null); handleMapperConfirm(mapping); }}
                        onCancel={() => { setIsGpsMapperOpen(false); setGpsAnomalyMode(null); }}
                        savedProfiles={gpsProfiles}
                        onSaveProfile={handleSaveGpsProfile}
                        onDeleteProfile={handleDeleteGpsProfile}
                        teams={teams.map(t => ({ id: t.id, name: t.name }))}
                        preSelectedTeamId={gpsImportTeamId}
                        anomalyMode={gpsAnomalyMode}
                    />
                )}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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

