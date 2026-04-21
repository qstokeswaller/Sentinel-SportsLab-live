// @ts-nocheck
import React, { useState, useMemo, useEffect, useLayoutEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useAppState } from './context/AppStateContext';
import { DatabaseService } from './services/databaseService';
import { SupabaseStorageService } from './services/storageService';
import PerformanceLab from './components/performance/PerformanceLab';
import ImportResolverModal from './components/performance/ImportResolverModal';
import WattbikeMapCalculator from './components/performance/WattbikeMapCalculator';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
// Pages are lazy-loaded so each is its own JS chunk — only downloaded on first visit
const DashboardPage      = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const RosterPage         = lazy(() => import('./pages/RosterPage').then(m => ({ default: m.RosterPage })));
const PeriodizationPage  = lazy(() => import('./pages/PeriodizationPage').then(m => ({ default: m.PeriodizationPage })));
const ExerciseLibraryPage = lazy(() => import('./pages/ExerciseLibraryPage').then(m => ({ default: m.ExerciseLibraryPage })));
const WorkoutsPage       = lazy(() => import('./pages/WorkoutsPage').then(m => ({ default: m.WorkoutsPage })));
const AnalyticsHubPage   = lazy(() => import('./pages/AnalyticsHubPage').then(m => ({ default: m.AnalyticsHubPage })));
const ReportingHubPage   = lazy(() => import('./pages/ReportingHubPage').then(m => ({ default: m.ReportingHubPage })));
const ConditioningHubPage = lazy(() => import('./pages/ConditioningHubPage').then(m => ({ default: m.ConditioningHubPage })));
const WellnessHubPage    = lazy(() => import('./pages/WellnessHubPage').then(m => ({ default: m.WellnessHubPage })));
const SettingsPage       = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.default })));
const WorkoutPacketsPage = lazy(() => import('./pages/WorkoutPacketsPage').then(m => ({ default: m.WorkoutPacketsPage })));
const WeightroomSheetsPage = lazy(() => import('./pages/WeightroomSheetsPage').then(m => ({ default: m.WeightroomSheetsPage })));
const WorkoutHistoryPage = lazy(() => import('./pages/WorkoutHistoryPage').then(m => ({ default: m.WorkoutHistoryPage })));
const TestingHubPage     = lazy(() => import('./pages/TestingHubPage').then(m => ({ default: m.TestingHubPage })));
import WorkoutPacketModal from './components/WorkoutPacketModal';
import AddEventModal from './components/calendar/AddEventModal';
import { WEIGHTROOM_1RM_EXERCISES } from './utils/constants';
import PageTour from './components/ui/PageTour';

import {
    Activity as ActivityIcon,
    BadgeCheck as BadgeCheckIcon,
    BarChart as BarChartIcon,
    CalendarDays as CalendarDaysIcon,
    Dumbbell as DumbbellIcon,
    Filter as FilterIcon,
    Layers as LayersIcon,
    Plus as PlusIcon,
    Printer as PrinterIcon,
    Search as SearchIcon,
    Settings as SettingsIcon,
    Table as TableIcon,
    Timer as TimerIcon,
    Trash2 as Trash2Icon,
    UserPlus as UserPlusIcon,
    X as XIcon,
    Zap as ZapIcon,
    Heart as HeartIcon,
    Shield as ShieldIcon,
    FlaskConical as FlaskConicalIcon,
    ChevronRight as ChevronRightIcon,
    AlertTriangle as AlertTriangleIcon,
    TrendingUp as TrendingUpIcon,
    Gauge as GaugeIcon,
    CheckCircle2 as CheckCircle2Icon,
    XCircle as XCircleIcon,
    Info as InfoIcon,
} from 'lucide-react';
import { ACWR_METRIC_TYPES } from './utils/constants';
import { useAuth } from './context/AuthContext';

// Extracted Components (None used directly in App.tsx)

// --- 3. App Component ---

// --- DATA PERSISTENCE SERVICE ---
// StorageService — replaced by Supabase implementation (docs/services/storageService.ts)
const StorageService = SupabaseStorageService;
StorageService.init();


// ── Welcome Splash Screen ─────────────────────────────────────────────────────
const WelcomeSplash = () => {
    const { isLoading } = useAppState();
    const { user } = useAuth();
    const [visible, setVisible] = useState(true);
    const [fading, setFading] = useState(false);

    useEffect(() => {
        if (!isLoading && visible) {
            // Small grace period before fading so the screen doesn't flash away immediately
            const fadeTimer = setTimeout(() => setFading(true), 400);
            const hideTimer = setTimeout(() => setVisible(false), 900);
            return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
        }
    }, [isLoading, visible]);

    if (!visible) return null;

    const firstName = user?.user_metadata?.full_name
        ? user.user_metadata.full_name.split(' ')[0]
        : user?.user_metadata?.name
        ? user.user_metadata.name.split(' ')[0]
        : user?.email
        ? user.email.split('@')[0]
        : 'Coach';

    return (
        <div
            className={`fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-950 transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
        >
            {/* Logo mark */}
            <div className="flex flex-col items-center gap-6">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                    <ActivityIcon size={30} className="text-white" />
                </div>

                <div className="text-center space-y-1">
                    <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">Sentinel <span className="text-indigo-400">SportsLab</span></p>
                </div>

                {/* Welcome text */}
                <div className="text-center space-y-2 mt-2">
                    <h1 className="text-2xl font-bold text-white">Welcome, {firstName}</h1>
                    <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                        We are getting your Sentinel SportsLab ready for you,<br />please wait a moment
                    </p>
                </div>

                {/* Spinner */}
                <div className="mt-4 flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
                    <span className="text-slate-500 text-xs font-medium tracking-wide">Loading your data…</span>
                </div>
            </div>
        </div>
    );
};

// ── Toast Notification Container ─────────────────────────────────────────────
const ToastContainer = () => {
    const { toasts, setToasts } = useAppState();
    if (!toasts || toasts.length === 0) return null;

    const dismiss = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

    return (
        <div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2 items-end pointer-events-none">
            {toasts.map(t => {
                const isSuccess = t.type === 'success';
                const isError   = t.type === 'error';
                return (
                    <div
                        key={t.id}
                        className="pointer-events-auto flex items-center gap-3 min-w-[260px] max-w-sm bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-3 border border-white/10 animate-in slide-in-from-bottom-2 fade-in duration-300"
                    >
                        {isSuccess && <CheckCircle2Icon size={16} className="text-emerald-400 shrink-0" />}
                        {isError   && <XCircleIcon      size={16} className="text-rose-400 shrink-0" />}
                        {!isSuccess && !isError && <InfoIcon size={16} className="text-slate-400 shrink-0" />}
                        <span className="text-sm font-medium flex-1 leading-tight">{t.message}</span>
                        {t.actionLabel && t.actionHandler && (
                            <button
                                onClick={() => { t.actionHandler(); dismiss(t.id); }}
                                className="text-xs font-bold text-indigo-300 hover:text-indigo-200 shrink-0 transition-colors"
                            >
                                {t.actionLabel}
                            </button>
                        )}
                        <button
                            onClick={() => dismiss(t.id)}
                            className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                        >
                            <XIcon size={13} />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const AddAthleteModal = () => {
    const {
        isAddAthleteModalOpen,
        setIsAddAthleteModalOpen,
        addAthleteMode,
        setAddAthleteMode,
        newAthleteName,
        setNewAthleteName,
        newAthleteTeam,
        setNewAthleteTeam,
        newAthleteProfile,
        setNewAthleteProfile,
        newTeamName,
        setNewTeamName,
        teams,
        handleAddAthlete,
        handleAddTeam
    } = useAppState();

    const [step, setStep] = useState(1);
    const [addingNext, setAddingNext] = useState(false);

    // Reset to step 1 before paint every time the modal opens — useLayoutEffect prevents flash of step 2
    useLayoutEffect(() => {
        if (isAddAthleteModalOpen) setStep(1);
    }, [isAddAthleteModalOpen]);

    // Auto-select newest real team when teams list changes (e.g. after creating a team)
    useEffect(() => {
        const realTeams = teams.filter(t => t.id !== 't_private');
        if (realTeams.length > 0 && (!newAthleteTeam || newAthleteTeam === 't_private' || !realTeams.some(t => t.id === newAthleteTeam))) {
            setNewAthleteTeam(realTeams[realTeams.length - 1]?.id || '');
        }
    }, [teams]);

    if (!isAddAthleteModalOpen) return null;

    const setProfile = (key, val) => setNewAthleteProfile(prev => ({ ...prev, [key]: val }));

    const canProceed = newAthleteName.trim().length > 0;

    const handleClose = () => { setIsAddAthleteModalOpen(false); setStep(1); };

    const handleAddAndNext = async () => {
        setAddingNext(true);
        const ok = await handleAddAthlete(true); // keep modal open
        setAddingNext(false);
        if (ok) setStep(1); // only go back to step 1 if save succeeded
    };

    const INPUT = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
    const LABEL = "text-xs font-medium text-slate-600 block mb-1.5";

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] shadow-xl border border-slate-200 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <UserPlusIcon size={16} />
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">
                                {addAthleteMode === 'athlete' ? 'Add New Athlete' : 'Create New Team'}
                            </h3>
                            <span className="text-xs text-slate-500">
                                {addAthleteMode === 'athlete' ? (step === 1 ? 'Step 1 of 2 — Identity' : 'Step 2 of 2 — Profile') : 'Team Setup'}
                            </span>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><XIcon size={18} /></button>
                </div>

                {/* Mode toggle */}
                <div className="px-5 pt-4">
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        <button onClick={() => { setAddAthleteMode('athlete'); setStep(1); }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${addAthleteMode === 'athlete' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            Athlete
                        </button>
                        <button onClick={() => { setAddAthleteMode('team'); setStep(1); }}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${addAthleteMode === 'team' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                            Team
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4 flex-1 overflow-y-auto no-scrollbar">

                    {/* TEAM mode */}
                    {addAthleteMode === 'team' && (
                        <div className="space-y-1.5">
                            <label className={LABEL}>Team Name</label>
                            <input type="text" value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                                className={INPUT} placeholder="Enter team name..." />
                        </div>
                    )}

                    {/* ATHLETE step 1 — identity */}
                    {addAthleteMode === 'athlete' && step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className={LABEL}>Full Name</label>
                                <input type="text" value={newAthleteName} onChange={e => setNewAthleteName(e.target.value)}
                                    className={INPUT} placeholder="Enter full name..." autoFocus />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Assign to Team</label>
                                <select value={newAthleteTeam} onChange={e => setNewAthleteTeam(e.target.value)} className={INPUT}>
                                    <option value="">Individual (Private Client)</option>
                                    {teams.filter(t => t.id !== 't_private').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* ATHLETE step 2 — profile */}
                    {addAthleteMode === 'athlete' && step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className={LABEL}>Age</label>
                                    <input type="number" min="10" max="80" value={newAthleteProfile.age}
                                        onChange={e => setProfile('age', e.target.value)}
                                        className={INPUT} placeholder="e.g. 24" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LABEL}>Gender</label>
                                    <select value={newAthleteProfile.gender} onChange={e => setProfile('gender', e.target.value)} className={INPUT}>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                        <option value="">Prefer not to say</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LABEL}>Height (cm)</label>
                                    <input type="number" min="100" max="250" value={newAthleteProfile.height_cm}
                                        onChange={e => setProfile('height_cm', e.target.value)}
                                        className={INPUT} placeholder="e.g. 182" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className={LABEL}>Weight (kg)</label>
                                    <input type="number" min="30" max="200" value={newAthleteProfile.weight_kg}
                                        onChange={e => setProfile('weight_kg', e.target.value)}
                                        className={INPUT} placeholder="e.g. 78" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Sport</label>
                                <input type="text" value={newAthleteProfile.sport}
                                    onChange={e => setProfile('sport', e.target.value)}
                                    className={INPUT} placeholder="e.g. Rugby, Athletics, Football..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Position / Event</label>
                                <input type="text" value={newAthleteProfile.position}
                                    onChange={e => setProfile('position', e.target.value)}
                                    className={INPUT} placeholder="e.g. Prop, Sprinter, Midfielder..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Training Goals</label>
                                <textarea value={newAthleteProfile.goals}
                                    onChange={e => setProfile('goals', e.target.value)}
                                    className={INPUT + " resize-none h-20"} placeholder="e.g. Increase power, reduce injury risk, improve speed..." />
                            </div>
                            <div className="space-y-1.5">
                                <label className={LABEL}>Notes</label>
                                <textarea value={newAthleteProfile.notes}
                                    onChange={e => setProfile('notes', e.target.value)}
                                    className={INPUT + " resize-none h-20"} placeholder="Any relevant background, history, or flags..." />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white flex justify-between items-center gap-3 shrink-0">
                    <button onClick={handleClose} className="px-4 py-2 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition-colors">
                        Cancel
                    </button>
                    <div className="flex gap-2">
                        {addAthleteMode === 'athlete' && step === 2 && (
                            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                                Back
                            </button>
                        )}
                        {addAthleteMode === 'athlete' && step === 1 && (
                            <button onClick={() => setStep(2)} disabled={!canProceed}
                                className="px-5 py-2 bg-indigo-600 text-white rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40">
                                Next — Profile
                            </button>
                        )}
                        {(addAthleteMode === 'team' || (addAthleteMode === 'athlete' && step === 2)) && (
                            <>
                                {addAthleteMode === 'athlete' && (
                                    <button
                                        onClick={handleAddAndNext}
                                        disabled={addingNext}
                                        className="px-5 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <UserPlusIcon size={14} /> Add &amp; Next
                                    </button>
                                )}
                                <button
                                    onClick={addAthleteMode === 'athlete' ? () => handleAddAthlete() : handleAddTeam}
                                    className="px-5 py-2 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-black transition-colors flex items-center gap-2"
                                >
                                    <UserPlusIcon size={14} /> {addAthleteMode === 'athlete' ? 'Add Athlete' : 'Create Team'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const App = () => {
    const {
        isPerformanceLabOpen, setIsPerformanceLabOpen,
        tourState, setTourState,
    } = useAppState();

    // Prefetch all page chunks in the background after the app mounts so
    // navigation to any page is instant — no spinner on subsequent visits.
    useEffect(() => {
        const t = setTimeout(() => {
            import('./pages/DashboardPage');
            import('./pages/WellnessHubPage');
            import('./pages/ReportingHubPage');
            import('./pages/AnalyticsHubPage');
            import('./pages/RosterPage');
            import('./pages/WorkoutsPage');
            import('./pages/WorkoutPacketsPage');
            import('./pages/TestingHubPage');
            import('./pages/SettingsPage');
            import('./pages/ConditioningHubPage');
            import('./pages/ExerciseLibraryPage');
            import('./pages/PeriodizationPage');
            import('./pages/WeightroomSheetsPage');
            import('./pages/WorkoutHistoryPage');
        }, 2000); // wait 2s so initial render + data load isn't competing with chunk fetches
        return () => clearTimeout(t);
    }, []);

    return (
        <div className="flex h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500/30 overflow-hidden relative">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <TopBar />
                <main className="flex-1 overflow-y-auto no-scrollbar relative pb-6">
                    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
                    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/periodization" element={<PeriodizationPage />} />
                        <Route path="/clients" element={<RosterPage />} />
                        <Route path="/workouts" element={<WorkoutsPage />} />
                        <Route path="/workouts/packets" element={<WorkoutPacketsPage />} />
                        <Route path="/workouts/weightroom-sheets" element={<WeightroomSheetsPage />} />
                        <Route path="/workouts/history" element={<WorkoutHistoryPage />} />
                        <Route path="/library" element={<ExerciseLibraryPage />} />
                        <Route path="/conditioning" element={<ConditioningHubPage />} />
                        <Route path="/analytics" element={<AnalyticsHubPage />} />
                        <Route path="/reports" element={<ReportingHubPage />} />
                        <Route path="/wellness" element={<WellnessHubPage />} />
                        <Route path="/testing" element={<TestingHubPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={(() => {
                            // Don't redirect public form routes — they're handled by the outer Router
                            const path = window.location.pathname;
                            if (path.startsWith('/daily-wellness') || path.startsWith('/weekly-wellness') || path.startsWith('/wellness-form') || path.startsWith('/injury-form') || path.startsWith('/workout/') || path.startsWith('/protocol/')) {
                                return null;
                            }
                            return <Navigate to="/dashboard" replace />;
                        })()} />
                    </Routes>
                    </Suspense>
                    </div>
                </main>
            </div>
            <AddAthleteModal />
            <AthleteProfileModal />
            <ACWRDetailModal />
            <AddSessionModal />
            <SessionModal />
            <AddEventModal />
            <WorkoutPacketModal />
            <WeightroomSheetModal />
            <PerformanceLab isOpen={isPerformanceLabOpen} onClose={() => setIsPerformanceLabOpen(false)} />
            <WattbikeMapCalculator />
            <PageTour tourState={tourState || {}} setTourState={setTourState} />
            <ToastContainer />
            <WelcomeSplash />
        </div>
    );
};


const WS_MODES = [
    { id: 'blank', label: 'Blank Form' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'labeled', label: 'Labeled' },
    { id: 'empty-header', label: 'Empty Header' },
];

const roundTo2_5 = (v) => Math.round(v / 2.5) * 2.5;

const WeightroomSheetModal = () => {
    const { isWeightroomSheetModalOpen, setIsWeightroomSheetModalOpen, teams, exercises, maxHistory } = useAppState();
    const [wrSelectedTeam, setWrSelectedTeam] = useState('All');
    const [wsMode, setWsMode] = useState('blank');
    const [wsColumns, setWsColumns] = useState([
        { id: 'c1', label: 'Exercise 1', exerciseId: '', percentage: 100 },
        { id: 'c2', label: 'Exercise 2', exerciseId: '', percentage: 100 },
        { id: 'c3', label: 'Exercise 3', exerciseId: '', percentage: 100 },
    ]);
    const [wsOrientation, setWsOrientation] = useState('portrait');

    const athletes = useMemo(() => {
        const list = wrSelectedTeam === 'All'
            ? teams.flatMap(t => t.players || [])
            : (teams.find(t => t.id === wrSelectedTeam)?.players || []);
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }, [teams, wrSelectedTeam]);

    // For advanced mode: build a lookup { athleteId -> { exerciseName -> latestWeight } }
    const maxLookup = useMemo(() => {
        const map = {};
        (maxHistory || []).forEach(r => {
            if (!map[r.athleteId]) map[r.athleteId] = {};
            const existing = map[r.athleteId][r.exercise];
            if (!existing || r.date > existing.date) {
                map[r.athleteId][r.exercise] = { weight: r.weight, date: r.date };
            }
        });
        return map;
    }, [maxHistory]);

    // Trackable exercises for advanced mode picker — curated 1RM-testable exercises
    const trackableExercises = useMemo(() =>
        WEIGHTROOM_1RM_EXERCISES.map(name => ({ id: name, name })),
        []
    );

    const addColumn = () => {
        const n = wsColumns.length + 1;
        setWsColumns(prev => [...prev, { id: 'c' + Date.now(), label: `Exercise ${n}`, exerciseId: '', percentage: 100 }]);
    };

    const removeColumn = (id) => {
        if (wsColumns.length <= 1) return;
        setWsColumns(prev => prev.filter(c => c.id !== id));
    };

    const updateColumn = (id, field, value) => {
        setWsColumns(prev => prev.map(c => {
            if (c.id !== id) return c;
            const updated = { ...c, [field]: value };
            // If exercise changed in advanced mode, update label to exercise name
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
        const athleteMax = maxLookup[athlete.id]?.[col.exerciseId];
        if (!athleteMax) return '—';
        const load = roundTo2_5(athleteMax.weight * (col.percentage / 100));
        return `${load}`;
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

        const html = `<!DOCTYPE html><html><head><title>Weightroom Sheet</title>
<style>
@page { size: ${wsOrientation}; margin: 15mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
h1 { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin: 0 0 4px; }
.divider { border: none; border-top: 2px solid #1e293b; margin: 8px auto 20px; width: 60%; }
table { width: 100%; border-collapse: collapse; }
@media print { button { display: none; } }
</style></head><body>
<h1>Weight Training - Record Sheet</h1>
<hr class="divider" />
<table>${headerRow}${bodyRows}</table>
</body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    if (!isWeightroomSheetModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 lg:p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-none lg:rounded-xl w-full lg:max-w-6xl h-full lg:h-auto lg:max-h-[90vh] shadow-xl border-0 lg:border border-slate-200 overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0"><PrinterIcon size={16} /></div>
                        <h3 className="text-base font-semibold text-slate-900">Weightroom Sheets</h3>
                    </div>
                    <button onClick={() => setIsWeightroomSheetModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><XIcon size={18} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto no-scrollbar bg-slate-50/30">
                    {/* Top Controls */}
                    <div className="p-5 border-b border-slate-100 bg-white">
                        <div className="flex items-start gap-5 flex-wrap">
                            {/* Target Squad */}
                            <div className="space-y-1.5 min-w-[180px]">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Target Squad</label>
                                <select value={wrSelectedTeam} onChange={(e) => setWrSelectedTeam(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors">
                                    <option value="All">All Athletes</option>
                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            {/* Sheet Mode */}
                            <div className="space-y-1.5 flex-1">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sheet Mode</label>
                                <div className="grid grid-cols-4 gap-1.5">
                                    {WS_MODES.map(m => (
                                        <button
                                            key={m.id}
                                            onClick={() => setWsMode(m.id)}
                                            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                                wsMode === m.id
                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
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
                                    className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-colors shadow-sm"
                                >
                                    <PlusIcon size={14} /> Add Column
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Preview + Sidebar */}
                    <div className="p-5 flex gap-5 items-start">
                        {/* Left: Live Preview */}
                        <div className="flex-1 min-w-0">
                            <div className="border border-dashed border-slate-200 rounded-xl bg-white p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        Live Print Preview ({wsOrientation})
                                    </p>
                                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                        {athletes.length} Athletes Listed
                                    </p>
                                </div>

                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest text-center mb-1">
                                    Weight Training - Record Sheet
                                </h2>
                                <div className="w-40 h-0.5 bg-slate-900 mx-auto mb-4" />

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
                                            {athletes.length === 0 ? (
                                                <tr><td colSpan={wsColumns.length + 1} className="px-3 py-6 text-center text-slate-300 text-xs">No athletes in selected squad</td></tr>
                                            ) : athletes.map(a => (
                                                <tr key={a.id} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 font-semibold text-slate-800 uppercase text-[11px] border border-slate-200 whitespace-nowrap">{a.name}</td>
                                                    {wsColumns.map(col => (
                                                        <td key={col.id} className="px-3 py-2 text-slate-600 border border-slate-200 text-center min-w-[80px]">
                                                            {getCellValue(col, a) || <span className="text-slate-200">&nbsp;</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="w-64 shrink-0 space-y-4">
                            {/* Sheet Ready Card */}
                            <div className="bg-teal-700 rounded-xl p-5 text-white space-y-4">
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
                            <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Columns ({wsColumns.length})</p>
                                <div className="space-y-2.5 max-h-[300px] overflow-y-auto no-scrollbar">
                                    {wsColumns.map((col, i) => (
                                        <div key={col.id} className="border border-slate-100 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Column {i + 1}</span>
                                                <button onClick={() => removeColumn(col.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2Icon size={13} /></button>
                                            </div>
                                            {wsMode !== 'empty-header' && (
                                                <input
                                                    type="text"
                                                    value={col.label}
                                                    onChange={(e) => updateColumn(col.id, 'label', e.target.value)}
                                                    placeholder={`Exercise ${i + 1}`}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors"
                                                />
                                            )}
                                            {wsMode === 'advanced' && (
                                                <>
                                                    <select
                                                        value={col.exerciseId}
                                                        onChange={(e) => updateColumn(col.id, 'exerciseId', e.target.value)}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors"
                                                    >
                                                        <option value="">Select Exercise</option>
                                                        {trackableExercises.map(ex => (
                                                            <option key={ex.id} value={ex.id}>{ex.name}</option>
                                                        ))}
                                                    </select>
                                                    <div className="flex items-center gap-1.5">
                                                        <input
                                                            type="number"
                                                            value={col.percentage}
                                                            onChange={(e) => updateColumn(col.id, 'percentage', Number(e.target.value) || 100)}
                                                            min={1} max={200}
                                                            className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none text-center focus:border-slate-400"
                                                        />
                                                        <span className="text-[10px] text-slate-400 font-medium">% of 1RM</span>
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
            </div>
        </div>
    );
};


const AddSessionModal = () => {
    const {
        isAddSessionModalOpen, setIsAddSessionModalOpen,
        addSessionTab, setAddSessionTab,
        addSessionSearch, setAddSessionSearch,
        addSessionCategory, setAddSessionCategory,
        newSession, setNewSession,
        handleAddSession,
        teams, exercises, exerciseCategories
    } = useAppState();

    if (!isAddSessionModalOpen) return null;

    const INPUT = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
    const LABEL = "text-xs font-medium text-slate-600 block mb-1.5";

    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-slate-100 text-slate-900 rounded-lg flex items-center justify-center shrink-0"><CalendarDaysIcon size={16} /></div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900">New Session</h3>
                            <p className="text-xs text-slate-500">Quick schedule</p>
                        </div>
                    </div>
                    <button onClick={() => setIsAddSessionModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><XIcon size={18} /></button>
                </div>

                {/* TAB SWITCHER */}
                <div className="flex px-5 pt-3 bg-white border-b border-slate-100">
                    <button
                        onClick={() => setAddSessionTab('info')}
                        className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${addSessionTab === 'info' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        1. Basic Info
                    </button>
                    <button
                        onClick={() => setAddSessionTab('exercises')}
                        className={`flex-1 py-3 text-xs font-medium border-b-2 transition-all ${addSessionTab === 'exercises' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        2. Exercises ({newSession.exercises.length})
                    </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto no-scrollbar max-h-[50vh]">
                    {addSessionTab === 'info' ? (
                        <div className="space-y-4">
                            <div>
                                <label className={LABEL}>Session Title</label>
                                <input
                                    type="text"
                                    value={newSession.title}
                                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                                    className={INPUT}
                                    placeholder="e.g. Upper Body Power"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={LABEL}>Date</label>
                                    <input
                                        type="date"
                                        value={newSession.date}
                                        onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
                                        className={INPUT}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>Phase</label>
                                    <select
                                        value={newSession.trainingPhase}
                                        onChange={(e) => setNewSession({ ...newSession, trainingPhase: e.target.value })}
                                        className={INPUT + " appearance-none"}
                                    >
                                        {['Strength', 'Power', 'Hypertrophy', 'Speed', 'Conditioning', 'Recovery', 'Technical', 'GPP'].map(p => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={LABEL}>Target Type</label>
                                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                                        {['Team', 'Individual'].map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setNewSession({ ...newSession, targetType: t, targetId: '' })}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${newSession.targetType === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL}>Target</label>
                                    <select
                                        value={newSession.targetId}
                                        onChange={(e) => setNewSession({ ...newSession, targetId: e.target.value })}
                                        className={INPUT + " appearance-none"}
                                    >
                                        <option value="" disabled>Select {newSession.targetType}</option>
                                        {newSession.targetType === 'Team' ? (
                                            teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)
                                        ) : (
                                            teams.flatMap(t => t.players).map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={LABEL}>Expected Load</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Low', 'Medium', 'High'].map(l => (
                                        <button
                                            key={l}
                                            onClick={() => setNewSession({ ...newSession, load: l })}
                                            className={`py-2.5 rounded-lg border-2 text-xs font-medium transition-all ${newSession.load === l
                                                ? (l === 'High' ? 'bg-red-50 border-red-400 text-red-600' : l === 'Medium' ? 'bg-amber-50 border-amber-400 text-amber-600' : 'bg-emerald-50 border-emerald-400 text-emerald-600')
                                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                                }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* SEARCH & FILTER */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search library..."
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                                        value={addSessionSearch}
                                        onChange={(e) => setAddSessionSearch(e.target.value)}
                                    />
                                </div>
                                <div className="relative w-28">
                                    <FilterIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2 py-2.5 text-xs outline-none appearance-none"
                                        value={addSessionCategory}
                                        onChange={(e) => setAddSessionCategory(e.target.value)}
                                    >
                                        <option>All</option>
                                        {exerciseCategories.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* EXERCISE LIST */}
                            <div className="space-y-2.5">
                                {exercises
                                    .filter(ex => {
                                        const matchesSearch = (ex.name || "").toLowerCase().includes(addSessionSearch.toLowerCase());
                                        const matchesCategory = addSessionCategory === 'All' || (ex.categories || []).includes(addSessionCategory);
                                        return matchesSearch && matchesCategory;
                                    })
                                    .map(ex => {
                                        const selectedEx = newSession.exercises.find(e => e.id === ex.id);
                                        const isSelected = !!selectedEx;
                                        return (
                                            <div key={ex.id} className={`p-3.5 rounded-lg border transition-all ${isSelected ? 'bg-slate-50 border-indigo-200 ring-1 ring-indigo-500/10' : 'bg-white border-slate-200'}`}>
                                                <div className="flex items-center justify-between mb-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                            <DumbbellIcon size={14} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-medium text-slate-900">{ex.name}</h4>
                                                            <p className="text-[10px] text-slate-400">{(ex.categories || [])[0] || 'Strength'}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            const newExList = isSelected
                                                                ? newSession.exercises.filter(e => e.id !== ex.id)
                                                                : [...newSession.exercises, { id: ex.id, name: ex.name, sets: 3, reps: '10', weight: '-', rpe: 8, notes: '' }];
                                                            setNewSession({ ...newSession, exercises: newExList });
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                                    >
                                                        {isSelected ? 'Selected' : 'Add'}
                                                    </button>
                                                </div>

                                                {/* INPUTS FOR SETS/REPS IF SELECTED */}
                                                {isSelected && (
                                                    <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-2.5 animate-in slide-in-from-top-2">
                                                        <div>
                                                            <label className="text-[9px] font-medium text-slate-400 block mb-1">Sets</label>
                                                            <input type="number" value={selectedEx.sets} onChange={(e) => {
                                                                const updated = newSession.exercises.map(item => item.id === ex.id ? { ...item, sets: parseInt(e.target.value) } : item);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none text-center" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-medium text-slate-400 block mb-1">Reps</label>
                                                            <input type="text" value={selectedEx.reps} onChange={(e) => {
                                                                const updated = newSession.exercises.map(item => item.id === ex.id ? { ...item, reps: e.target.value } : item);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none text-center" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-medium text-slate-400 block mb-1">RPE</label>
                                                            <input type="number" value={selectedEx.rpe} onChange={(e) => {
                                                                const updated = newSession.exercises.map(item => item.id === ex.id ? { ...item, rpe: parseInt(e.target.value) } : item);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none text-center" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-medium text-slate-400 block mb-1">Config</label>
                                                            <button onClick={() => {
                                                                const updated = newSession.exercises.filter(item => item.id !== ex.id);
                                                                setNewSession({ ...newSession, exercises: updated });
                                                            }} className="w-full bg-red-50 text-red-500 border border-red-100 rounded-md py-1.5 text-[9px] font-medium hover:bg-red-100">Remove</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-5 py-4 border-t border-slate-100 bg-white flex gap-3">
                    <button onClick={() => setIsAddSessionModalOpen(false)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">Cancel</button>
                    <button
                        onClick={handleAddSession}
                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-full text-sm font-medium hover:bg-black transition-colors"
                    >
                        Create Session
                    </button>
                </div>
            </div>
        </div>
    );
};

const SessionModal = () => {
    const {
        viewingSession,
        setViewingSession,
        setScheduledSessions,
        resolveTargetName,
        navigate,
        showToast,
    } = useAppState();

    if (!viewingSession) return null;

    const targetName = resolveTargetName(viewingSession.targetId, viewingSession.targetType);
    const loadColor = viewingSession.load === 'High' ? 'text-red-600 bg-red-50 border-red-100' : viewingSession.load === 'Medium' ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-green-600 bg-green-50 border-green-100';
    const dateStr = new Date(viewingSession.date).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const sessionType = viewingSession.session_type || 'workout';
    const isWattbike = sessionType === 'wattbike';
    const isConditioning = sessionType === 'conditioning';
    const linkedSessions = viewingSession.linked_sessions || [];
    const headerIcon = isWattbike ? <ActivityIcon size={16} /> : isConditioning ? <TimerIcon size={16} /> : <DumbbellIcon size={16} />;
    const headerBg = isWattbike ? 'bg-emerald-600' : isConditioning ? 'bg-orange-500' : 'bg-slate-800';
    const typeLabel = isWattbike ? 'Wattbike Session' : isConditioning ? 'Conditioning Session' : (viewingSession.targetType === 'Team' ? 'Team Session' : 'Individual Session');

    const handleDeleteAndClose = async () => {
        const id = viewingSession.id;
        if (!confirm('Are you sure you want to delete this session?')) return;
        try {
            await DatabaseService.deleteSession(id);
            setViewingSession(null);
            setScheduledSessions(prev => prev.filter(s => s.id !== id));
            showToast('Session deleted', 'success');
        } catch (err) {
            showToast('Failed to delete session', 'error');
        }
    };

    const handleViewWorkout = () => {
        const session = viewingSession;
        setViewingSession(null);
        navigate('/workouts/packets', { state: { editSession: session, returnTo: '/' } });
    };

    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-md shadow-xl border border-slate-200 overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${headerBg} rounded-lg flex items-center justify-center text-white shrink-0`}>
                            {headerIcon}
                        </div>
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 leading-tight">{viewingSession.title}</h3>
                            <p className="text-xs text-slate-400 mt-0.5">{typeLabel}</p>
                        </div>
                    </div>
                    <button onClick={() => setViewingSession(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><XIcon size={18} /></button>
                </div>

                {/* Details */}
                <div className="p-5 space-y-4">
                    {/* Meta row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {viewingSession.time && (
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium">{viewingSession.time}</span>
                        )}
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${loadColor}`}>{viewingSession.load} Load</span>
                        {viewingSession.trainingPhase && (
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-md text-xs font-semibold">{viewingSession.trainingPhase}</span>
                        )}
                        {viewingSession.status === 'Completed' && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-xs font-semibold">Completed</span>
                        )}
                    </div>

                    {/* Info grid */}
                    <div className="bg-slate-50 rounded-lg border border-slate-100 p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">Athlete / Team</span>
                            <span className="text-sm font-semibold text-slate-900">{targetName}</span>
                        </div>
                        <div className="h-px bg-slate-200" />
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-400 font-medium">Date</span>
                            <span className="text-sm text-slate-700">{dateStr}</span>
                        </div>
                        {viewingSession.time && (
                            <>
                                <div className="h-px bg-slate-200" />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400 font-medium">Start Time</span>
                                    <span className="text-sm text-slate-700">{viewingSession.time}</span>
                                </div>
                            </>
                        )}
                        {viewingSession.plannedDuration && (
                            <>
                                <div className="h-px bg-slate-200" />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400 font-medium">Duration</span>
                                    <span className="text-sm text-slate-700">{viewingSession.actual_duration || viewingSession.plannedDuration} mins</span>
                                </div>
                            </>
                        )}
                        {viewingSession.notes && (
                            <>
                                <div className="h-px bg-slate-200" />
                                <div>
                                    <span className="text-xs text-slate-400 font-medium block mb-1">Notes</span>
                                    <p className="text-sm text-slate-600">{viewingSession.notes}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Session-type specific details */}
                    {isWattbike && viewingSession.exercises?.meta && (
                        <div className="bg-emerald-50 rounded-lg border border-emerald-100 p-3 space-y-1">
                            <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide">Wattbike Protocol</span>
                            <div className="flex items-center gap-3 text-xs text-emerald-700">
                                {viewingSession.exercises.meta.type && <span className="font-medium">{viewingSession.exercises.meta.type}</span>}
                                {viewingSession.exercises.meta.duration && <span>· {viewingSession.exercises.meta.duration}</span>}
                            </div>
                        </div>
                    )}
                    {isConditioning && viewingSession.exercises?.meta && (
                        <div className="bg-orange-50 rounded-lg border border-orange-100 p-3 space-y-1">
                            <span className="text-[10px] font-semibold text-orange-600 uppercase tracking-wide">Conditioning Protocol</span>
                            <div className="flex items-center gap-3 text-xs text-orange-700">
                                {viewingSession.exercises.meta.modality && <span className="font-medium">{viewingSession.exercises.meta.modality}</span>}
                                {viewingSession.exercises.meta.energySystem && <span>· {viewingSession.exercises.meta.energySystem}</span>}
                                {viewingSession.exercises.meta.totalDuration && <span>· {viewingSession.exercises.meta.totalDuration}</span>}
                            </div>
                        </div>
                    )}

                    {/* Linked sessions */}
                    {linkedSessions.length > 0 && (
                        <div className="space-y-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Linked Sessions</span>
                            <div className="flex flex-wrap gap-2">
                                {linkedSessions.map(l => {
                                    const srcColor = l.source === 'wattbike' ? 'bg-emerald-100 text-emerald-700'
                                        : l.source === 'conditioning' ? 'bg-orange-100 text-orange-700'
                                        : l.source === 'workout-template' ? 'bg-indigo-100 text-indigo-700'
                                        : 'bg-slate-100 text-slate-600';
                                    const srcIcon = l.source === 'wattbike' ? <ActivityIcon size={10} />
                                        : l.source === 'conditioning' ? <TimerIcon size={10} />
                                        : <DumbbellIcon size={10} />;
                                    return (
                                        <div key={l.id} className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5">
                                            <div className={`w-4 h-4 rounded flex items-center justify-center ${srcColor}`}>{srcIcon}</div>
                                            <span className="text-xs font-medium text-slate-700">{l.title}</span>
                                            {l.meta && <span className="text-[10px] text-slate-400">· {l.meta}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setViewingSession(null)} className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Close</button>
                        <button onClick={handleDeleteAndClose} className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors">
                            <Trash2Icon size={14} /> Delete
                        </button>
                    </div>
                    {!isWattbike && !isConditioning && (
                        <button onClick={handleViewWorkout} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-black transition-colors">
                            <DumbbellIcon size={14} /> View Workout
                        </button>
                    )}
                    {isWattbike && (
                        <button onClick={() => { setViewingSession(null); navigate('/conditioning'); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                            <ActivityIcon size={14} /> View in Wattbike Hub
                        </button>
                    )}
                    {isConditioning && (
                        <button onClick={() => { setViewingSession(null); navigate('/conditioning'); }} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                            <TimerIcon size={14} /> View in Conditioning Hub
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const AthleteProfileModal = () => {
    const {
        viewingPlayer, setViewingPlayer, teams,
        loadRecords, wellnessData, injuryReports, acwrSettings,
        calculateACWR, getAthleteAcwrOptions,
    } = useAppState();
    if (!viewingPlayer) return null;

    const p = viewingPlayer;
    const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const playerTeam = teams.find(t => (t.players || []).some(pl => pl.id === p.id));
    const teamId = playerTeam?.id;

    // ── Derived data (all flexible — only shows if data exists) ──

    // ACWR
    const acwrEnabled = teamId && (teamId === 't_private'
        ? acwrSettings[`ind_${p.id}`]?.enabled
        : acwrSettings[teamId]?.enabled);
    let acwrValue = null, acwrZone = null, acwrColor = '';
    if (acwrEnabled) {
        try {
            acwrValue = calculateACWR(p.id);
            if (acwrValue < 0.8) { acwrZone = 'Underexposed'; acwrColor = 'text-sky-600 bg-sky-50 border-sky-200'; }
            else if (acwrValue <= 1.3) { acwrZone = 'Optimal'; acwrColor = 'text-emerald-600 bg-emerald-50 border-emerald-200'; }
            else if (acwrValue <= 1.5) { acwrZone = 'Caution'; acwrColor = 'text-amber-600 bg-amber-50 border-amber-200'; }
            else { acwrZone = 'Danger'; acwrColor = 'text-rose-600 bg-rose-50 border-rose-200'; }
        } catch { acwrValue = null; }
    }

    // Latest wellness (flexible — shows whatever fields the response has)
    const latestWellness = [...(wellnessData || [])].filter(d =>
        d.athleteId === p.id || d.athlete_id === p.id
    ).sort((a, b) => new Date(b.date || b.session_date || 0).getTime() - new Date(a.date || a.session_date || 0).getTime())[0];
    const wellnessFields = latestWellness?.responses ? Object.entries(latestWellness.responses).filter(([k, v]) => typeof v === 'number') : [];

    // Injuries (current)
    const currentInjuries = (injuryReports || []).filter(r =>
        (r.athleteId === p.id || r.athlete_id === p.id) && r.status !== 'resolved'
    );

    // Performance metrics (latest per test type — fully flexible)
    const metrics = p.performanceMetrics || [];
    const latestByType = new Map();
    for (const m of metrics) {
        const key = m.type;
        if (!latestByType.has(key) || new Date(m.date) > new Date(latestByType.get(key).date)) {
            latestByType.set(key, m);
        }
    }
    const testResults = Array.from(latestByType.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

    // ACWR method + unit for this athlete's team
    const acwrOpts = acwrEnabled ? getAthleteAcwrOptions(p.id) : null;
    const loadMethod = acwrOpts?.metricType || 'srpe';
    const loadUnit = ACWR_METRIC_TYPES[loadMethod]?.unit || 'AU';

    // Recent load (last 7 days)
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
    const recentLoads = (loadRecords || []).filter(l =>
        (l.athleteId === p.id || l.athlete_id === p.id) && new Date(l.date) >= weekAgo
    );
    const weeklyLoad = recentLoads.reduce((sum, l) => sum + (l.value || l.sRPE || 0), 0);

    const bmi = p.height_cm && p.weight_kg ? (p.weight_kg / ((p.height_cm / 100) ** 2)).toFixed(1) : null;

    const NoData = ({ text = 'No current data' }) => (
        <p className="text-xs text-slate-300 italic py-1">{text}</p>
    );

    // ── Helpers ──
    const Stat = ({ label, value, unit = '' }) => (
        <div className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
            <div className="text-[10px] font-medium text-slate-400">{label}</div>
            <div className="text-sm font-semibold text-slate-800 mt-0.5">{value != null ? `${value}${unit}` : <span className="text-slate-300">—</span>}</div>
        </div>
    );

    const SectionHeader = ({ icon: Icon, label }) => (
        <div className="flex items-center gap-2 mb-2">
            {Icon && <Icon size={12} className="text-slate-400" />}
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
        </div>
    );

    const formatTestValue = (m) => {
        if (m.type === 'hamstring') {
            const avg = m.avgForce || m.value;
            return avg ? `${parseFloat(avg).toFixed(0)}N avg` : '—';
        }
        if (m.value != null) return `${m.value}${m.unit ? ` ${m.unit}` : ''}`;
        if (m.weight) return `${m.weight}kg`;
        if (m.time) return `${m.time}s`;
        if (m.height) return `${m.height}cm`;
        return '—';
    };

    const formatTestName = (m) => {
        const names = {
            hamstring: 'Nordic Force', '1rm': '1RM', dsi: 'DSI', rsi: 'RSI', cmj: 'CMJ',
            cmj_advanced: 'CMJ Adv', squat_jump: 'Squat Jump', imtp_basic: 'IMTP',
            imtp_advanced: 'IMTP Adv', drop_jump: 'Drop Jump', broad_jump: 'Broad Jump',
        };
        if (names[m.type]) return names[m.type];
        // For RM tests: show exercise name
        if (m.type?.startsWith('rm_')) return m.exerciseLabel || m.type.replace('rm_', '').replace(/_/g, ' ');
        // For sprint tests
        if (m.type?.startsWith('sprint_')) return m.type.replace('sprint_', '').replace('m', 'm Sprint');
        return m.type?.replace(/_/g, ' ') || 'Test';
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/50 backdrop-blur-sm p-0 lg:p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-none lg:rounded-xl w-full lg:max-w-2xl h-full lg:h-auto lg:max-h-[90vh] shadow-xl border-0 lg:border border-slate-200 overflow-hidden flex flex-col text-slate-900">

                {/* ── Header ── */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold shadow-sm shrink-0">
                            {initials}
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">{p.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {playerTeam && <span className="text-[10px] text-slate-400">{playerTeam.name}</span>}
                                {p.sport && <span className="text-[10px] text-slate-400">· {p.sport}</span>}
                                {p.position && <span className="text-[10px] bg-indigo-50 text-indigo-600 font-medium px-1.5 py-0.5 rounded-full">{p.position}</span>}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setViewingPlayer(null)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-slate-100 transition-colors">
                        <XIcon size={16} />
                    </button>
                </div>

                {/* ── Status bar (only shows if data exists) ── */}
                {(acwrValue != null || currentInjuries.length > 0 || latestWellness) && (
                    <div className="px-5 py-2.5 border-b border-slate-100 flex items-center gap-2 flex-wrap bg-slate-50/50">
                        {acwrValue != null && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${acwrColor}`}>
                                ACWR {acwrValue} · {acwrZone}
                            </span>
                        )}
                        {currentInjuries.length > 0 && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-600">
                                {currentInjuries.length} Active Injur{currentInjuries.length > 1 ? 'ies' : 'y'}
                            </span>
                        )}
                        {latestWellness && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-500">
                                Wellness: {latestWellness.date || latestWellness.session_date || '—'}
                            </span>
                        )}
                    </div>
                )}

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* Physical Profile */}
                    <div>
                        <SectionHeader icon={BadgeCheckIcon} label="Physical Profile" />
                        {(p.age || p.gender || p.height_cm || p.weight_kg) ? (
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {p.age && <Stat label="Age" value={p.age} unit=" yrs" />}
                                {p.gender && <Stat label="Gender" value={p.gender} />}
                                {p.height_cm && <Stat label="Height" value={p.height_cm} unit=" cm" />}
                                {p.weight_kg && <Stat label="Weight" value={p.weight_kg} unit=" kg" />}
                                {bmi && <Stat label="BMI" value={bmi} />}
                            </div>
                        ) : <NoData text="No physical profile recorded" />}
                    </div>

                    {/* Training Load */}
                    <div>
                        <SectionHeader icon={GaugeIcon} label="Training Load" />
                        {(acwrValue != null || weeklyLoad > 0) ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {acwrValue != null && <Stat label="ACWR" value={acwrValue} />}
                                {weeklyLoad > 0 && <Stat label={`7-Day Load`} value={Math.round(weeklyLoad)} unit={` ${loadUnit}`} />}
                                {recentLoads.length > 0 && <Stat label="Sessions (7d)" value={recentLoads.length} />}
                                {acwrOpts && <Stat label="Method" value={ACWR_METRIC_TYPES[loadMethod]?.label || loadMethod} />}
                            </div>
                        ) : <NoData text="No training load data" />}
                    </div>

                    {/* Wellness (flexible — shows whatever fields exist in the latest response) */}
                    <div>
                        <SectionHeader icon={HeartIcon} label="Latest Wellness" />
                        {wellnessFields.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {wellnessFields.slice(0, 8).map(([key, val]) => (
                                    <Stat key={key} label={key.replace(/_/g, ' ')} value={val} />
                                ))}
                            </div>
                        ) : <NoData text="No wellness responses" />}
                    </div>

                    {/* Injuries */}
                    <div>
                        <SectionHeader icon={AlertTriangleIcon} label="Injuries" />
                        {currentInjuries.length > 0 ? (
                            <div className="space-y-1.5">
                                {currentInjuries.slice(0, 3).map((inj, i) => (
                                    <div key={i} className="flex items-center justify-between px-3 py-2 bg-rose-50 border border-rose-100 rounded-lg">
                                        <div>
                                            <span className="text-xs font-medium text-rose-700">{inj.body_area || inj.area || 'Injury'}</span>
                                            {inj.severity && <span className="text-[10px] text-rose-400 ml-2">Severity: {inj.severity}</span>}
                                        </div>
                                        {inj.date && <span className="text-[10px] text-rose-400">{inj.date}</span>}
                                    </div>
                                ))}
                            </div>
                        ) : <NoData text="No active injuries" />}
                    </div>

                    {/* Performance Testing (flexible — shows latest result per unique test type) */}
                    <div>
                        <SectionHeader icon={FlaskConicalIcon} label="Latest Test Results" />
                        {testResults.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {testResults.map((m, i) => (
                                    <div key={i} className="bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100">
                                        <div className="text-[10px] font-medium text-slate-400 capitalize">{formatTestName(m)}</div>
                                        <div className="text-sm font-semibold text-slate-800 mt-0.5">{formatTestValue(m)}</div>
                                        <div className="text-[9px] text-slate-300 mt-0.5">{m.date?.slice(0, 10)}</div>
                                    </div>
                                ))}
                            </div>
                        ) : <NoData text="No test results" />}
                    </div>

                    {/* Goals & Notes */}
                    <div>
                        <SectionHeader icon={null} label="Notes & Goals" />
                        {(p.goals || p.notes) ? (
                            <>
                                {p.goals && (
                                    <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 mb-2">
                                        <div className="text-[10px] font-medium text-indigo-500 mb-1">Training Goals</div>
                                        <p className="text-xs text-slate-700 leading-relaxed">{p.goals}</p>
                                    </div>
                                )}
                                {p.notes && (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                        <div className="text-[10px] font-medium text-slate-400 mb-1">Notes</div>
                                        <p className="text-xs text-slate-600 leading-relaxed">{p.notes}</p>
                                    </div>
                                )}
                            </>
                        ) : <NoData text="No notes or goals recorded" />}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ACWRDetailModal = () => {
    const { acwrDetailAthlete, setAcwrDetailAthlete } = useAppState();
    if (!acwrDetailAthlete) return null;

    // These would normally be calculated by utility functions, using placeholders for now
    const status = { status: 'Optimal', color: 'text-emerald-600', bgColor: 'bg-emerald-100', risk: 'Sweet spot' };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[500] p-0 lg:p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-none lg:rounded-xl shadow-xl lg:max-w-5xl w-full h-full lg:h-auto lg:max-h-[90vh] overflow-hidden flex flex-col text-slate-900">
                <div className="px-5 py-4 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">{acwrDetailAthlete.name}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{acwrDetailAthlete.subsection} · ACWR Analysis</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1.5 rounded-lg ${status.bgColor} border ${status.color.replace('text-', 'border-')}`}>
                                <span className={`text-sm font-semibold ${status.color}`}>{status.status}</span>
                            </div>
                            <button onClick={() => setAcwrDetailAthlete(null)} className="w-9 h-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors">
                                <XIcon size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <span className="text-xs font-medium text-slate-500 block mb-1.5">Current ACWR</span>
                            <span className="text-2xl font-bold text-slate-900">1.12</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <span className="text-xs font-medium text-slate-500 block mb-1.5">Acute Load (7d)</span>
                            <span className="text-2xl font-bold text-slate-900">420</span>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <span className="text-xs font-medium text-slate-500 block mb-1.5">Chronic Load (28d)</span>
                            <span className="text-2xl font-bold text-slate-900">375</span>
                        </div>
                    </div>

                    <div className={`p-4 rounded-lg ${status.bgColor} border ${status.color.replace('text-', 'border-')}`}>
                        <h4 className={`text-sm font-semibold mb-1.5 ${status.color}`}>Risk Assessment</h4>
                        <p className="text-sm text-slate-700">{status.risk} — Athlete is in the sweet spot for adaptation and performance gains.</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <h4 className="text-sm font-medium text-slate-500 mb-3">Load Progression (Last 28 Days)</h4>
                        <div className="h-44 flex items-center justify-center text-slate-300 text-sm italic">
                            Terminal processing telemetry...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
