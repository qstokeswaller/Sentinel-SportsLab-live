// @ts-nocheck
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useAppState } from '../context/AppStateContext';
import { ACWRMetricCard } from '../components/analytics/ACWRMetricCard';
import { DataHub } from '../components/analytics/DataHub';
import { SupabaseStorageService as StorageService } from '../services/storageService';
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
    SparklesIcon, FileDownIcon, UndoIcon, FileEditIcon, UserIcon, MoonIcon, ClipboardListIcon
} from 'lucide-react';

export const ReportingHubPage = () => {
    const {
        teams, setTeams, loadRecords, wellnessData, habitRecords, scheduledSessions,
        gpsData, setGpsData, kpiRecords, volumeRecords,
        selectedAnalyticsAthleteId, setSelectedAnalyticsAthleteId,
        activeReport, setActiveReport, reportMode, setReportMode,
        activeTab, setActiveTab, questionnaires, setQuestionnaires,
        hrReportViewMode, setHrReportViewMode,
        dataHubTab, setDataHubTab,
        medicalReports, setMedicalReports, medicalFilterAthleteId, setMedicalFilterAthleteId,
        isMedicalModalOpen, setIsMedicalModalOpen, medicalModalMode, setMedicalModalMode,
        inspectingMedicalRecord, setInspectingMedicalRecord,
        optOutForm, setOptOutForm,
        optOuts, setOptOuts,
        showToast, wellnessDateRange, setWellnessDateRange, calculateACWR, calculateMonotony,
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

    const [hrReportDateRange, setHrReportDateRange] = useState({ start: '2025-01-01', end: new Date().toISOString().split('T')[0] });
    const [trackingTab, setTrackingTab] = useState('Max');

    const renderHeartRateMetricsReport = () => {

        // State hoisted to App level to avoid Hook errors in conditional render

        // Mock Data specific for HR Report
        const hrData = [
            { date: '2025-01-20', session: 'Strength', avgHr: 145, maxHr: 182, zone: 'Z3' },
            { date: '2025-01-22', session: 'Conditioning', avgHr: 168, maxHr: 195, zone: 'Z5' },
            { date: '2025-01-24', session: 'Recovery', avgHr: 110, maxHr: 130, zone: 'Z1' },
            { date: '2025-01-26', session: 'Match Sim', avgHr: 175, maxHr: 198, zone: 'Z5' },
        ];

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Controls Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit">
                        {['Team', 'Individual'].map(m => (
                            <button
                                key={m}
                                onClick={() => setHrReportViewMode(m)}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${hrReportViewMode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {m} View
                            </button>
                        ))}
                    </div>
                    {hrReportViewMode === 'Individual' && (
                        <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                            <UserIcon size={14} className="text-slate-400" />
                            <select
                                value={hrReportSelectedAthlete}
                                onChange={(e) => setHrReportSelectedAthlete(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase"
                            >
                                {teams.flatMap(t => t.players).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                        <CalendarIcon size={14} className="text-slate-400" />
                        <input
                            type="date"
                            value={hrReportDateRange.start}
                            onChange={(e) => setHrReportDateRange({ ...hrReportDateRange, start: e.target.value })}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase w-24"
                        />
                        <span className="text-slate-300">-</span>
                        <input
                            type="date"
                            value={hrReportDateRange.end}
                            onChange={(e) => setHrReportDateRange({ ...hrReportDateRange, end: e.target.value })}
                            className="bg-transparent text-xs font-bold text-slate-700 outline-none uppercase w-24"
                        />
                    </div>
                </div>

                {/* Main Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-indigo-200 transition-colors">
                        <div className="text-xs font-medium text-slate-500">Avg Session HR</div>
                        <div className="text-3xl font-bold text-slate-900">158 <span className="text-sm font-normal text-slate-400">BPM</span></div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 w-[70%]" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-indigo-200 transition-colors">
                        <div className="text-xs font-medium text-slate-500">Peak HR (Period)</div>
                        <div className="text-3xl font-bold text-slate-900">198 <span className="text-sm font-normal text-slate-400">BPM</span></div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 w-[95%]" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 hover:border-emerald-200 transition-colors">
                        <div className="text-xs font-medium text-slate-500">Recovery Score</div>
                        <div className="text-3xl font-bold text-emerald-600">92 <span className="text-sm font-normal text-emerald-300">/100</span></div>
                        <div className="text-xs text-slate-400">Based on HRR @ 2min</div>
                    </div>
                </div>

                {/* Session Timeline Chart */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-base font-semibold text-slate-800">Session Load Analysis</h4>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-xs text-slate-400">Avg HR</span></div>
                            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-300" /><span className="text-xs text-slate-400">Max HR</span></div>
                        </div>
                    </div>
                    <div className="h-64 flex items-end justify-between gap-6 px-4">
                        {hrData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-3 group cursor-pointer">
                                <div className="relative w-full flex items-end justify-center h-full">
                                    {/* Max HR Bar */}
                                    <div
                                        className="w-full max-w-[40px] bg-cyan-100 rounded-t-xl absolute bottom-0 transition-all duration-500 group-hover:bg-cyan-200"
                                        style={{ height: `${(d.maxHr / 220) * 100}%` }}
                                    ></div>
                                    {/* Avg HR Bar */}
                                    <div
                                        className="w-full max-w-[40px] bg-indigo-600 rounded-t-xl relative z-10 transition-all duration-500 group-hover:scale-y-105 origin-bottom shadow-lg shadow-indigo-200"
                                        style={{ height: `${(d.avgHr / 220) * 100}%` }}
                                    >
                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                            {d.avgHr} / {d.maxHr}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[9px] font-black uppercase text-slate-400 text-center">{d.date.slice(5)}</div>
                                    <div className="text-[8px] font-bold uppercase text-indigo-300 text-center mt-0.5">{d.session}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const renderTrackingHub = () => {
        const tabs = ['Max', 'Comparison', 'Assessment'];
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex bg-slate-100 p-0.5 rounded-lg w-fit border border-slate-200">
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setTrackingTab(tab)}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${trackingTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 border border-slate-100">
                        <SearchIcon size={22} />
                    </div>
                    <div className="space-y-1.5">
                        <h3 className="text-base font-semibold text-slate-800">{trackingTab} Analytics</h3>
                        <p className="text-slate-400 text-sm max-w-md mx-auto">This module is being restructured as part of the unified Tracking Hub.</p>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <div className="h-1 w-12 bg-indigo-100 rounded-full"></div>
                        <div className="h-1 w-12 bg-indigo-200 rounded-full"></div>
                        <div className="h-1 w-12 bg-indigo-300 rounded-full"></div>
                    </div>
                </div>
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

        const handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target.result;
                processGPSCSV(text);
            };
            reader.readAsText(file);
        };

        const processGPSCSV = (csvText) => {
            const lines = csvText.split('\n');
            if (lines.length < 2) {
                setGpsImportStatus('error');
                setGpsImportMessage('CSV file is empty or invalid.');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const rows = lines.slice(1).filter(line => line.trim() !== '');

            const parsedData = rows.map(row => {
                const values = row.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = values[i];
                });
                return obj;
            });

            const standardizedData = parsedData.map(entry => {
                const findValue = (possibleKeys) => {
                    const key = Object.keys(entry).find(k => possibleKeys.includes(k.toLowerCase()));
                    return key ? entry[key] : null;
                };

                const name = findValue(['player', 'name', 'athlete', 'full name', 'first name', 'surname']);
                const totalDist = parseFloat(findValue(['total distance', 'distance', 'total distance (m)', 'dist', 'distance (m)', 'meters'])) || 0;
                const hsr = parseFloat(findValue(['hsr', 'high speed running', 'hsr (m)', 'high speed dist'])) || 0;
                const sprints = parseInt(findValue(['sprints', 'sprint count', 'sprinting'])) || 0;
                const topSpeed = parseFloat(findValue(['top speed', 'max speed', 'velocity max', 'max speed (km/h)', 'v max'])) || 0;
                const accels = parseInt(findValue(['accels', 'accelerations', 'accel', 'total accelerations'])) || 0;
                const decels = parseInt(findValue(['decels', 'decelerations', 'decel', 'total decelerations'])) || 0;
                const date = findValue(['date', 'session date', 'day']) || new Date().toISOString().split('T')[0];

                return {
                    id: 'gps_' + Date.now() + Math.random().toString(36).substr(2, 5),
                    date,
                    playerName: name || 'Unknown',
                    totalDistance: totalDist,
                    hsr,
                    sprints,
                    maxSpeed: topSpeed,
                    accelerations: accels,
                    decelerations: decels,
                    timestamp: new Date().toISOString()
                };
            });

            const allPlayers = teams.flatMap(t => t.players);
            const alignedData = standardizedData.map(entry => {
                const player = allPlayers.find(p => p.name.toLowerCase().includes(entry.playerName.toLowerCase()) || entry.playerName.toLowerCase().includes(p.name.toLowerCase()));
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
            setGpsImportMessage(`Successfully imported ${alignedData.length} GPS records.`);
            setTimeout(() => setGpsImportStatus(null), 5000);
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

                <div className="min-h-[600px]">
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
                    { title: 'GPS Data', desc: 'Sprints, Distance & Velocity telemetry import', icon: ActivityIcon }
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

