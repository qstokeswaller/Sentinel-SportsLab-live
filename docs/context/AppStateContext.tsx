
// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { SupabaseStorageService as StorageService } from '../services/storageService';
import { DatabaseService } from '../services/databaseService';

// Import icons commonly used
import {
    ActivityIcon, ZapIcon, FlaskConicalIcon, CalendarIcon, FocusIcon, BarChart2Icon, UsersIcon,
    FlameIcon, LineChartIcon, ActivitySquareIcon, CalculatorIcon, MoonIcon, DropletsIcon, SunIcon,
    CheckCircleIcon, ArrowUpRightIcon, ArrowDownLeftIcon, CheckCircle2Icon, AlertTriangleIcon,
    InfoIcon, TargetIcon, UserPlusIcon, XIcon, PlusIcon, FileStackIcon, TrendingUpIcon
} from 'lucide-react';

import { ACWR_UTILS, BORG_RPE_SCALE, DSI_NORMS, RSI_NORMS, RM_EXERCISE_MAP } from '../utils/constants';
import { DEFAULT_WATTBIKE_SESSIONS } from '../utils/wattbikeSessions';
import { normalisePlan } from '../utils/periodizationUtils';
import usePlanHandlers from './appState/usePlanHandlers';
import useSessionCalendarHandlers from './appState/useSessionCalendarHandlers';
import useTeamHandlers from './appState/useTeamHandlers';
import useMetricHandlers from './appState/useMetricHandlers';
import {
    MOCK_INDIVIDUAL_PLAN_BLOCKS,
    MOCK_TEAMS,
    MOCK_EXERCISES,
    MOCK_KPI_DATA,
    MOCK_HEATMAP_DATA,
    MOCK_HABIT_DATA,
    MOCK_VOLUME_DATA,
    MOCK_INJURY_REPORTS
} from '../utils/mocks';

export const AppStateContext = createContext<any>(null);

export const AppStateProvider = ({ children }: { children: React.ReactNode }) => {
    // ---- Extracted State and Hooks ----
    const navigate = useNavigate();

    const location = useLocation();

    const [activeTab, setActiveTab] = useState(() => {
        const path = window.location.pathname.slice(1).split('/')[0];
        const valid = ['dashboard', 'periodization', 'clients', 'workouts', 'library', 'conditioning', 'analytics', 'reports', 'wellness', 'testing'];
        return valid.includes(path) ? path : 'dashboard';
    });

    const [isPerformanceLabOpen, setIsPerformanceLabOpen] = useState(false);

    // Public routes that should never trigger tab sync or app state.
    // (Broader list: includes authenticated app pages like /settings
    // that just shouldn't run the tab-sync redirect.)
    const isPublicRoute = (path: string) =>
        path.startsWith('/workout/') || path.startsWith('/wellness-form') ||
        path.startsWith('/daily-wellness') || path.startsWith('/weekly-wellness') ||
        path.startsWith('/injury-form') || path.startsWith('/protocol/') ||
        path.startsWith('/data-hub/snapshot') ||
        path.startsWith('/athlete-share/') ||
        path.startsWith('/test-share/') ||
        path.startsWith('/accept-invite/') ||
        path.startsWith('/login') || path.startsWith('/settings') ||
        path === '/';

    // Athlete-facing public SHARE routes — these are links the scientist sends
    // to athletes (no login). They should always render in light mode regardless
    // of the scientist's theme, because athletes open the URL in the same browser
    // and were inheriting the platform's dark class. Narrower than isPublicRoute
    // because /settings + /login are authenticated app pages that
    // must respect the user's theme.
    const isPublicShareRoute = (path: string) =>
        path.startsWith('/workout/') || path.startsWith('/wellness-form') ||
        path.startsWith('/daily-wellness') || path.startsWith('/weekly-wellness') ||
        path.startsWith('/injury-form') || path.startsWith('/protocol/') ||
        path.startsWith('/data-hub/snapshot') ||
        path.startsWith('/athlete-share/') ||
        path.startsWith('/test-share/');

    // Sync URL → activeTab when user navigates back/forward
    useEffect(() => {
        if (isPublicRoute(location.pathname)) return;
        const topSegment = location.pathname.slice(1).split('/')[0];
        const valid = ['dashboard', 'periodization', 'clients', 'workouts', 'library', 'conditioning', 'analytics', 'reports', 'wellness', 'testing'];
        if (valid.includes(topSegment) && topSegment !== activeTab)
            setActiveTab(topSegment);
    }, [location.pathname]);

    // Sync activeTab → URL (skip on public/standalone routes and sub-routes)
    useEffect(() => {
        if (isPublicRoute(location.pathname)) return;
        const current = location.pathname.slice(1) || 'dashboard';
        // Don't redirect if we're on a sub-route of the activeTab (e.g. /workouts/packets)
        if (current.startsWith(activeTab + '/')) return;
        if (activeTab && activeTab !== current)
            navigate('/' + activeTab, { replace: true });
    }, [activeTab]);

    const [recentDeletions, setRecentDeletions] = useState([]); // Track deletions for Undo

    // ── Organisation context (Phase B) ───────────────────────────────────────
    // currentOrg = { id, name, tier, seat_cap, subscription_status, ... } | null
    // currentUserRole = 'admin' | 'member' | null
    // isOrgAdmin = boolean
    // These fetched once on auth state change; available to all consumers via context.
    const { user: authUser } = useAuth();
    const [currentOrg, setCurrentOrg] = useState<any>(null);
    const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'member' | null>(null);
    const [orgMemberCount, setOrgMemberCount] = useState<number>(1);
    const [orgLoading, setOrgLoading] = useState<boolean>(false);

    const refreshCurrentOrg = useCallback(async () => {
        if (!authUser?.id) {
            setCurrentOrg(null);
            setCurrentUserRole(null);
            setOrgMemberCount(1);
            return;
        }
        setOrgLoading(true);
        try {
            const info = await DatabaseService.getCurrentOrgInfo();
            setCurrentOrg(info?.organisation ?? null);
            setCurrentUserRole(info?.role ?? null);
            // Member count drives whether multi-user UI affordances (Mine/Org filter,
            // Share-to-Org toggle, creator badges) are shown. Single-user orgs hide
            // them so the experience stays clean for Basic-tier (1 seat) users.
            setOrgMemberCount(info?.memberCount ?? 1);
        } catch (err) {
            console.warn('[org] getCurrentOrgInfo failed:', (err as any)?.message || err);
            setCurrentOrg(null);
            setCurrentUserRole(null);
            setOrgMemberCount(1);
        } finally {
            setOrgLoading(false);
        }
    }, [authUser?.id]);

    useEffect(() => { refreshCurrentOrg(); }, [refreshCurrentOrg]);

    const isOrgAdmin = currentUserRole === 'admin';
    const isMultiUserOrg = orgMemberCount > 1;

    // ── Dark Mode ─────────────────────────────────────────────────────────────
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        try { return localStorage.getItem('sentinel_dark_mode') === 'true'; } catch { return false; }
    });
    const toggleDarkMode = () => setIsDarkMode(prev => !prev);
    useEffect(() => {
        const root = document.documentElement;
        // Athlete-facing public share routes ALWAYS render in light mode regardless
        // of the scientist's theme. /settings / /login are NOT in
        // this set — they're authenticated app pages and must respect dark mode.
        const isShared = isPublicShareRoute(location.pathname);
        if (isShared) {
            root.classList.remove('dark');
        } else if (isDarkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        // Persist the scientist's preference — only on non-shared routes (which
        // covers /settings etc. where the toggle actually lives).
        if (!isShared) {
            try { localStorage.setItem('sentinel_dark_mode', String(isDarkMode)); } catch {}
        }
    }, [isDarkMode, location.pathname]);

    // --- WATTBIKE HUB STATE ---
    const [wattbikeSessions, setWattbikeSessions] = useState(DEFAULT_WATTBIKE_SESSIONS);

    const [wattbikeView, setWattbikeView] = useState('grid'); // 'grid', 'detail', 'create'


    const [selectedWattbikeSession, setSelectedWattbikeSession] = useState(null);

    const [newWattbikeSession, setNewWattbikeSession] = useState({
        title: '',
        duration: '',
        type: 'Conditioning',
        sections: [],
        linkedSessions: []
    });


    // --- CONDITIONING SESSIONS STATE ---
    const [conditioningSessions, setConditioningSessions] = useState([]);
    const [conditioningView, setConditioningView] = useState('grid'); // 'grid', 'view', 'create'
    const [selectedConditioningSession, setSelectedConditioningSession] = useState(null);
    const [newConditioningSession, setNewConditioningSession] = useState({
        title: '',
        energySystem: 'aerobic', // 'alactic', 'glycolytic', 'aerobic', 'mixed'
        modality: 'Running', // Running, Bike, Sled, Rowing, etc.
        totalDuration: '',
        notes: '',
        sets: [],
        linkedSessions: []
    });


    // --- IMPORT STATE (SHARED) ---
    const [importStaging, setImportStaging] = useState([]);

    const [isImportResolverOpen, setIsImportResolverOpen] = useState(false);

    const [importStatus, setImportStatus] = useState(null);





    const calculateHamstringResults = () => {
        const bw = parseFloat(hamBodyWeight);

        if (hamAssessmentMode === 'split') {
            const l = parseFloat(hamLeft);
            const r = parseFloat(hamRight);
            if (!l || !r) return null;
            const max = Math.max(l, r);
            const total = l + r;
            const avg = total / 2;
            let relativeStrength = null;
            const asymmetry = Math.abs(l - r) / max * 100;

            if (bw && bw > 0) {
                relativeStrength = (avg / bw).toFixed(2);
            }

            const rs = parseFloat(relativeStrength || 0);
            let riskText = 'Low Risk';
            let riskColor = 'text-emerald-500';
            if (rs > 0 && rs < 3.37) {
                riskText = 'High Risk';
                riskColor = 'text-rose-500';
            } else if (rs >= 3.37 && rs < 4.47) {
                riskText = 'Moderate Risk';
                riskColor = 'text-amber-500';
            }

            return {
                avg,
                relativeStrength,
                asymmetry: asymmetry.toFixed(1),
                riskText,
                color: riskColor
            };
        } else {
            // Average mode: the entered value IS the average force across both limbs
            const avgForce = parseFloat(hamAggregate);
            if (!avgForce) return null;

            let relativeStrength = null;
            if (bw && bw > 0) {
                relativeStrength = (avgForce / bw).toFixed(2);
            }

            return {
                total: avgForce,
                relativeStrength,
                avg: avgForce
            };
        }
    };


    // --- TOAST SYSTEM ---
    const [toasts, setToasts] = useState([]);
    // Monotonic counter — Date.now() collided when several toasts fired in the
    // same millisecond (rapid event creation), producing duplicate React keys and
    // a cleanup that removed multiple toasts at once. A counter guarantees unique ids.
    const toastIdRef = useRef(0);

    const showToast = (message, typeOrActionLabel = null, actionHandler = null) => {
        const id = ++toastIdRef.current;
        const isType = ['success', 'error', 'info'].includes(typeOrActionLabel);
        const type = isType ? typeOrActionLabel : null;
        const actionLabel = isType ? null : typeOrActionLabel;
        setToasts(prev => [...prev, { id, message, type, actionLabel, actionHandler }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    };

    // --- EXERCISE LIBRARY STATE ---
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All');

    const [libraryPage, setLibraryPage] = useState(1);

    const ITEMS_PER_PAGE = 50;

    // --- PERSISTENCE STATE ---
    const exercisesLoadedRef = useRef(false); // Prevents re-fetching 3,242 exercises on every initData() call
    const dataLoadedRef = useRef(false); // Guards ALL save effects — prevents writing empty data during stale session
    const [isLoading, setIsLoading] = useState(true);
    // Phase 2 (2026-07-12): tier-2 (background) domains still loading. Pages
    // consuming non-critical data (exercises, templates, GPS, medical, plans…)
    // show skeletons while this is true instead of empty states.
    const [isSecondaryLoading, setIsSecondaryLoading] = useState(true);
    // Audit fix 10: names of data areas that failed to load at boot. Previously
    // these failures were silent (user saw empty lists with no explanation).
    const [initLoadErrors, setInitLoadErrors] = useState<string[]>([]);
    const [saveStatus, setSaveStatus] = useState(null);

    const showSaveStatus = (status) => {
        setSaveStatus(status);
        setTimeout(() => setSaveStatus(null), 3000);
    };

    const [teams, setTeams] = useState([]);

    const [exercises, setExercises] = useState([]);

    const [scheduledSessions, setScheduledSessions] = useState([]);

    const [questionnaires, setQuestionnaires] = useState([]);





    // --- PERSISTENCE EFFECTS ---
    // All save effects are guarded by dataLoadedRef to prevent writing empty data
    // during stale auth sessions where fetches return empty but the app renders

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveSessions(scheduledSessions);
    }, [scheduledSessions, isLoading]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveQuestionnaires(questionnaires);
    }, [questionnaires, isLoading]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveWattbikeSessions(wattbikeSessions);
    }, [wattbikeSessions, isLoading]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveConditioningSessions(conditioningSessions);
    }, [conditioningSessions, isLoading]);




    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

    const [dashboardFilterTarget, setDashboardFilterTarget] = useState('All Athletes');
    const [calendarFilterCategory, setCalendarFilterCategory] = useState('all');
    const [calendarFilterTeamId, setCalendarFilterTeamId] = useState(null);
    const [calendarFilterAthleteId, setCalendarFilterAthleteId] = useState(null);

    const [exerciseCategories, setExerciseCategories] = useState(["Animal Flow", "Balance", "Ballistics", "Bodybuilding", "Calisthenics", "Core", "Full Body", "Grinds", "Lower Body", "Mobility", "Olympic Weightlifting", "Plyometric", "Postural", "Powerlifting", "Unsorted", "Upper Body"]);

    const [trackingMetrics, setTrackingMetrics] = useState(['1RM', 'Highest Weight', 'Time', 'Distance', 'Reps only', '--']);

    const [isLibrarySettingsModalOpen, setIsLibrarySettingsModalOpen] = useState(false);

    const [activeLibrarySettingsTab, setActiveLibrarySettingsTab] = useState('health');

    const [newMetricName, setNewMetricName] = useState('');

    const [trackingTab, setTrackingTab] = useState('Max');

    const [dataHubTab, setDataHubTab] = useState('Activity');

    // --- HAMSTRING REPORT STATE ---
    const [hamstringReportTab, setHamstringReportTab] = useState('Analysis');

    const [hamstringReportSelectedAthlete, setHamstringReportSelectedAthlete] = useState('All');

    const [inspectHamEntry, setInspectHamEntry] = useState(null);

    const [isHamstringEditMode, setIsHamstringEditMode] = useState(false);

    const [hamDateFilterStart, setHamDateFilterStart] = useState('');

    const [hamDateFilterEnd, setHamDateFilterEnd] = useState('');

    const [hamLeft, setHamLeft] = useState('');

    const [hamRight, setHamRight] = useState('');

    const [hamDate, setHamDate] = useState(new Date().toISOString().split('T')[0]);

    const [hamAthleteId, setHamAthleteId] = useState('');

    const [hamBodyWeight, setHamBodyWeight] = useState('');

    const [hamAssessmentMode, setHamAssessmentMode] = useState('split');

    const [hamAggregate, setHamAggregate] = useState('');


    const [planBlocks, setPlanBlocks] = useState(MOCK_INDIVIDUAL_PLAN_BLOCKS);

    // --- PERIODIZATION PLANNER STATE ---
    const [periodizationPlans, setPeriodizationPlans] = useState([]);
    const [activePlanId, setActivePlanId] = useState(null);
    const [planDrillPath, setPlanDrillPath] = useState([]);
    const [isCreatePlanModalOpen, setIsCreatePlanModalOpen] = useState(false);
    const [isPlanPhaseModalOpen, setIsPlanPhaseModalOpen] = useState(false);
    const [isPlanBlockModalOpenNew, setIsPlanBlockModalOpenNew] = useState(false);
    const [isPlanEventModalOpen, setIsPlanEventModalOpen] = useState(false);
    const [isPlanTargetModalOpen, setIsPlanTargetModalOpen] = useState(false);
    const [editingPlanPhase, setEditingPlanPhase] = useState(null);
    const [editingPlanBlock, setEditingPlanBlock] = useState(null);
    const [editingPlanEvent, setEditingPlanEvent] = useState(null);
    const [editingPlanTarget, setEditingPlanTarget] = useState(null);

    // Weightroom Sheet State
    const [wrSelectedTeam, setWrSelectedTeam] = useState('All');

    const [wrSelectedExercise, setWrSelectedExercise] = useState('s1');

    const [wrCalcWeight, setWrCalcWeight] = useState(100);

    const [wrCalcReps, setWrCalcReps] = useState(1);

    const [wrTargetPercentage, setWrTargetPercentage] = useState(80);

    const [wsMode, setWsMode] = useState('blank'); // 'blank' or 'advanced'


    const [wsColumns, setWsColumns] = useState([
        { id: 'c1', label: 'Exercise 1', type: 'blank', exerciseId: '', metric: '' },
        { id: 'c2', label: 'Exercise 2', type: 'blank', exerciseId: '', metric: '' },
        { id: 'c3', label: 'Exercise 3', type: 'blank', exerciseId: '', metric: '' }
    ]);

    // Workout Packet State
    const [isWorkoutPacketModalOpen, setIsWorkoutPacketModalOpen] = useState(false);

    const [wpActiveTarget, setWpActiveTarget] = useState('All');

    const [wpStartDate, setWpStartDate] = useState('2025-01-01');

    const [wpEndDate, setWpEndDate] = useState('2025-01-31');

    const [wpMode, setWpMode] = useState('sessions'); // protocols, manual, sessions, range


    const [wpSelectedProtocol, setWpSelectedProtocol] = useState(null);

    const [wpSelectedSessions, setWpSelectedSessions] = useState([]);

    const [wpManualExercises, setWpManualExercises] = useState([]);

    const [wpSearch, setWpSearch] = useState('');

    const [wpRangeStart, setWpRangeStart] = useState(new Date().toISOString().split('T')[0]);

    const [wpRangeEnd, setWpRangeEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);

    const [wpRangeTargetId, setWpRangeTargetId] = useState('');

    const [wpRangeTargetType, setWpRangeTargetType] = useState('Team');

    const [wpSelectedRangeSessions, setWpSelectedRangeSessions] = useState([]);

    const [isEditLiftModalOpen, setIsEditLiftModalOpen] = useState(false);

    // Enhanced Debug for Workout Packet Modal
    useEffect(() => {
        console.log('REACT EFFECT: isWorkoutPacketModalOpen changed to:', isWorkoutPacketModalOpen);
        const modalEl = document.getElementById('workout-packet-modal');
        console.log('DOM Check - Modal Element Found:', !!modalEl);
        if (modalEl) {
            console.log('DOM Check - Modal Display:', window.getComputedStyle(modalEl).display);
        }
    }, [isWorkoutPacketModalOpen]);

    // Debug Hook: Allow manually opening the modal from console
    useEffect(() => {
        const checkForceOpen = setInterval(() => {
            if (window.WP_FORCE_OPEN) {
                console.log('--- FORCING WORKOUT PACKET MODAL OPEN ---');
                setIsWorkoutPacketModalOpen(true);
                window.WP_FORCE_OPEN = false;
            }
        }, 1000);
        return () => clearInterval(checkForceOpen);
    }, []);

    const [isPlanBlockModalOpen, setIsPlanBlockModalOpen] = useState(false);

    const [selectedPlanBlock, setSelectedPlanBlock] = useState(null);

    const [planBlockTab, setPlanBlockTab] = useState('info');

    const [dashboardCalendarDate, setDashboardCalendarDate] = useState(new Date());

    const [isDashboardCalendarOpen, setIsDashboardCalendarOpen] = useState(false);

    const [isWeightroomSheetModalOpen, setIsWeightroomSheetModalOpen] = useState(false);

    const [isAddSessionModalOpen, setIsAddSessionModalOpen] = useState(false);

    const [addSessionTab, setAddSessionTab] = useState('info');

    const [addSessionSearch, setAddSessionSearch] = useState('');

    const [addSessionCategory, setAddSessionCategory] = useState('All');

    // --- GPS PROFILES STATE (source of truth — populated from Supabase in initData) ---
    const [gpsProfiles, setGpsProfiles] = useState<any[]>([]);

    // --- CALENDAR EVENTS STATE ---
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    // When set, AddEventModal opens with startDate pre-filled to this YYYY-MM-DD.
    // Cleared by the modal on close. Drives the click-a-day-to-add-event UX.
    const [addEventPresetDate, setAddEventPresetDate] = useState<string | null>(null);
    const [customEventTypes, setCustomEventTypes] = useState([]);

    const [newSession, setNewSession] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        targetType: 'Team',
        targetId: '',
        trainingPhase: 'Strength',
        load: 'Medium',
        exercises: []
    });

    const [activeAnalyticsModule, setActiveAnalyticsModule] = useState(null);

    const [activeReport, setActiveReport] = useState(null);

    const [gpsData, setGpsData] = useState([]);
    const [hrData, setHrData] = useState([]);

    const [gpsImportStatus, setGpsImportStatus] = useState(null);

    const [gpsImportMessage, setGpsImportMessage] = useState('');

    const [gpsFilterTarget, setGpsFilterTarget] = useState('All Athletes');

    const [gpsFilterDateMode, setGpsFilterDateMode] = useState('range'); // 'range' | 'single'


    const [gpsSpecificDate, setGpsSpecificDate] = useState(new Date().toISOString().split('T')[0]);

    const [gpsRangeStart, setGpsRangeStart] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });

    const [gpsRangeEnd, setGpsRangeEnd] = useState(new Date().toISOString().split('T')[0]);

    // Analytics State
    const [biometricsRecords, setBiometricsRecords] = useState([]);

    const [loadRecords, setLoadRecords] = useState([]);

    // ACWR Feature Settings — per team/individual
    // { [teamId_or_'ind_'+athleteId]: { enabled: bool, method: string, acuteWindow: 7, chronicWindow: 28, freezeRestDays: bool, sprintThreshold: 25 } }
    const [acwrSettings, setAcwrSettings] = useState<Record<string, any>>({});

    // ACWR Exclusions — injured/excluded athletes + per-day rest freezes
    // { [athleteId]: { excluded: bool, excludeType: 'injured'|'rest', excludedDate: string, returnDate?: string,
    //                  frozenChronic?: number, frozenAcute?: number, restDays?: string[] } }
    const [acwrExclusions, setAcwrExclusions] = useState<Record<string, any>>({});

    // ACWR Recalc Anchors — per team/individual: start date for EWMA recalculation
    // { [teamId_or_'ind_'+athleteId]: string (ISO date) }
    const [acwrRecalcAnchors, setAcwrRecalcAnchors] = useState<Record<string, string>>({});

    // Testing Hub visibility — which tests are hidden
    // { [testId]: false } means hidden; absent or true means visible
    const [testVisibility, setTestVisibility] = useState<Record<string, boolean>>({});
    const [tourState, setTourState] = useState<Record<string, string>>({});

    // --- POLAR INTEGRATION STATE ---
    const [polarIntegration, setPolarIntegration] = useState<Record<string, any>>({});
    // --- GPS DATA SOURCES — per team: { [teamId]: 'csv' | 'polar' } ---
    const [gpsDataSources, setGpsDataSources] = useState<Record<string, string>>({});

    const [kpiRecords, setKpiRecords] = useState(MOCK_KPI_DATA);

    const [heatmapRecords, setHeatmapRecords] = useState(MOCK_HEATMAP_DATA);

    const [habitRecords, setHabitRecords] = useState(MOCK_HABIT_DATA);

    const [volumeRecords, setVolumeRecords] = useState(MOCK_VOLUME_DATA);

    const [heatmapTeamFilter, setHeatmapTeamFilter] = useState('All Teams');

    const [isAnalyticsManualEntryOpen, setIsAnalyticsManualEntryOpen] = useState(false);

    const [analyticsManualEntryModule, setAnalyticsManualEntryModule] = useState(null);

    const [wellnessQuestionnaireStep, setWellnessQuestionnaireStep] = useState(1);

    const [selectedAnalyticsAthleteId, setSelectedAnalyticsAthleteId] = useState(null);
    const [athleteAssessments, setAthleteAssessments] = useState([]);
    const [selectedAthleteId, setSelectedAthleteId] = useState(null);

    // --- WELLNESS HUB V2 STATE ---
    const [wellnessTemplates, setWellnessTemplates] = useState<any[]>([]);
    const [wellnessResponses, setWellnessResponses] = useState<any[]>([]);
    // Planned tonnage log — written on packet/program schedule (new tracking model).
    // Used by Tracking Hub and Data Hub for all tonnage reporting.
    const [plannedTonnageLog, setPlannedTonnageLog] = useState<any[]>([]);
    const [wellnessSelectedTeamId, setWellnessSelectedTeamId] = useState<string>('all');
    const [wellnessDateRange, setWellnessDateRange] = useState<string>('today');

    const athletes = useMemo(() => teams.flatMap(t => t.players), [teams]);

    const [analyticsStartDate, setAnalyticsStartDate] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]); // Jan 1st of current year


    const [analyticsEndDate, setAnalyticsEndDate] = useState(new Date().toISOString().split('T')[0]); // Today


    const [viewingPlayer, setViewingPlayer] = useState(null);

    const [viewingSession, setViewingSession] = useState(null);

    const [kpiDefinitions, setKpiDefinitions] = useState([
        { id: 'kpi1', name: 'Vertical Jump', unit: 'cm', category: 'Power', direction: 'high' },
        { id: 'kpi2', name: '10m Sprint', unit: 's', category: 'Speed', direction: 'low' },
        { id: 'kpi3', name: 'Max Velocity', unit: 'km/h', category: 'Speed', direction: 'high' },
        { id: 'kpi4', name: 'CMJ RSI', unit: 'ratio', category: 'Power', direction: 'high' },
        { id: 'kpi5', name: 'Back Squat 1RM', unit: 'kg', category: 'Strength', direction: 'high' },
    ]);

    const [isAddKpiModalOpen, setIsAddKpiModalOpen] = useState(false);

    const [newKpiName, setNewKpiName] = useState('');

    const [newKpiUnit, setNewKpiUnit] = useState('');

    const [newKpiCategory, setNewKpiCategory] = useState('Power');

    const [watchedKpiIds, setWatchedKpiIds] = useState(['kpi1', 'kpi2']);

    const [isKpiWatchlistModalOpen, setIsKpiWatchlistModalOpen] = useState(false);

    // Custom Metrics System (for all modules)
    const [customMetrics, setCustomMetrics] = useState({
        biometrics: [],
        load: [],
        kpi: [],
        heatmap: [],
        habit: [],
        volume: []
    });

    const [isAddMetricModalOpen, setIsAddMetricModalOpen] = useState(false);

    const [targetMetricModule, setTargetMetricModule] = useState(null);

    const [reportMode, setReportMode] = useState('analytics'); // 'analytics' | 'input'


    const [customMetricName, setCustomMetricName] = useState('');

    const [customMetricUnit, setCustomMetricUnit] = useState('');

    const [customMetricType, setCustomMetricType] = useState('number'); // number, text, scale, boolean


    // Enhanced Body Heatmap
    const [bodyHeatmapData, setBodyHeatmapData] = useState([]);

    const [heatmapView, setHeatmapView] = useState('front'); // 'front' or 'back'


    const [selectedBodyPart, setSelectedBodyPart] = useState(null);

    const [isPainSelectorOpen, setIsPainSelectorOpen] = useState(false);

    const [painType, setPainType] = useState('Soreness');

    const [painIntensity, setPainIntensity] = useState(5);

    const [painNotes, setPainNotes] = useState('');

    // Heart Rate Report State (Hoisted)
    const [hrReportViewMode, setHrReportViewMode] = useState('Team');

    const [hrReportSelectedAthlete, setHrReportSelectedAthlete] = useState(''); // Initialized in effect or valid check


    const [hrReportDateRange, setHrReportDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    // MODULES CONFIGURATION
    // Note: the old "Baseline & Trend Analysis" module was merged into Performance
    // Intelligence on 2026-05-28 (summary tiles + Load-vs-Wellness chart now live at
    // the top of PI). Removed from this registry.
    const modules = [
        { id: 'kpi', title: 'Performance Intelligence', icon: LineChartIcon, description: 'Readiness composite, baselines & trend insights — the rolled-up state of athlete' },
        { id: 'scenario', title: 'Scenario Modelling', icon: ZapIcon, description: 'Simulate training decisions and assess future risk/readiness.' },
        { id: 'dose_response', title: 'Dose-Response Analysis', icon: ActivityIcon, description: 'Did the training block produce performance gains? Compare load vs test deltas.' },
        { id: 'fv_profile', title: 'Force-Velocity Profile', icon: ZapIcon, description: 'F-V profiling from CMJ, IMTP & sprint data. Identifies force/velocity deficits.' },
    ];

    const [wellnessData, setWellnessData] = useState([]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveLoadRecords(loadRecords);
    }, [loadRecords, isLoading]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveWellnessData(wellnessData);
    }, [wellnessData, isLoading]);

    // Persist ACWR feature settings → Supabase user_data
    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveAcwrSettings(acwrSettings);
    }, [acwrSettings, isLoading]);

    // Persist ACWR exclusions → Supabase user_data
    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveAcwrExclusions(acwrExclusions);
    }, [acwrExclusions, isLoading]);

    // Persist ACWR recalc anchors → Supabase user_data
    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveAcwrRecalcAnchors(acwrRecalcAnchors);
    }, [acwrRecalcAnchors, isLoading]);

    // Persist testing hub visibility → Supabase user_data
    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveTestVisibility(testVisibility);
    }, [testVisibility, isLoading]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveBiometrics(biometricsRecords);
    }, [biometricsRecords, isLoading]);

    // Evaluation & Assessment State
    const [evaluationData, setEvaluationData] = useState([]);
    // TODO: Implement save handler that uses DatabaseService.logAssessment('evaluation', ...)
    // which then calls initData() to update this state.

    const [evaluationForm, setEvaluationForm] = useState({ power: 5, speed: 5, strength: 5, stamina: 5, agility: 5, mobility: 5 });

    const [maxHistory, setMaxHistory] = useState([]);

    const [maxForm, setMaxForm] = useState({ exercise: 'Back Squat', weight: '', date: new Date().toISOString().split('T')[0] });

    const [comparisonConfig, setComparisonConfig] = useState({ athleteA: 'p1', athleteB: null });

    // Questionnaire & Opt Out State
    const [questionnaireConfig, setQuestionnaireConfig] = useState([
        { id: 'q1', text: 'How well did you sleep?', type: 'scale' },
        { id: 'q2', text: 'Any muscle soreness?', type: 'yesno' }
    ]);

    const [optOuts, setOptOuts] = useState([]);

    const [optOutForm, setOptOutForm] = useState({ reason: '', notes: '', status: 'Available' });

    const [medicalReports, setMedicalReports] = useState([]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveMedicalReports(medicalReports);
    }, [medicalReports, isLoading]);

    const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);

    const [medicalModalMode, setMedicalModalMode] = useState('upload'); // 'upload' or 'text'


    const [medicalFilterAthleteId, setMedicalFilterAthleteId] = useState('All');

    const [inspectingMedicalRecord, setInspectingMedicalRecord] = useState(null);

    const [medicalForm, setMedicalForm] = useState({ targetId: '', targetName: '', date: new Date().toISOString().split('T')[0], title: '', description: '', fileName: '', fileSize: '' });

    // --- INJURY REPORTS STATE ---
    const [injuryReports, setInjuryReports] = useState([]);
    const [injuryFilterAthleteId, setInjuryFilterAthleteId] = useState('All');

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveInjuryReports(injuryReports);
    }, [injuryReports, isLoading]);

    // Save an injury report to Supabase DB + update local state
    const saveInjuryReportToDB = async (report) => {
        try {
            const { id, athleteId, athleteName, teamId, dateOfInjury, createdAt, updatedAt, ...reportFields } = report;
            const dbPayload = {
                team_id: teamId || '',
                athlete_id: athleteId,
                athlete_name: athleteName,
                date_of_injury: dateOfInjury || new Date().toISOString().split('T')[0],
                report_data: reportFields,
            };
            if (report._dbId) {
                // Update existing DB row
                await DatabaseService.updateInjuryReport(report._dbId, { report_data: reportFields, date_of_injury: dbPayload.date_of_injury });
            } else {
                await DatabaseService.saveInjuryReport(dbPayload);
            }
        } catch (err) {
            console.warn('Could not save injury report to DB (will persist in localStorage):', err.message);
        }
    };

    const deleteInjuryReportFromDB = async (id) => {
        try {
            await DatabaseService.deleteInjuryReport(id);
        } catch (err) {
            console.warn('Could not delete injury report from DB:', err.message);
        }
    };

    // Phase 4: Training Analytics State
    const [activityLog, setActivityLog] = useState([
        { date: '2023-11-24', status: 'Present', notes: '' },
    ]);

    // --- CONDITIONING HUB STATE ---
    const [activeConditioningModule, setActiveConditioningModule] = useState(null);

    // --- WATTBIKE HUB MAP CALCULATOR STATE ---
    const [isWattbikeMapCalculatorOpen, setIsWattbikeMapCalculatorOpen] = useState(false);

    const [wbMapTab, setWbMapTab] = useState('calc'); // 'calc' or 'entry'


    const [wbMapTargetId, setWbMapTargetId] = useState(''); // Team or individual ID


    const [wbMapTargetType, setWbMapTargetType] = useState('Team'); // 'Team' or 'Individual'


    const [wbMapPercentage, setWbMapPercentage] = useState('100');

    const [wbMapBikeModel, setWbMapBikeModel] = useState('Pro');

    const [wbMapManualRPM, setWbMapManualRPM] = useState('');

    const [wbMapManualFan, setWbMapManualFan] = useState('');

    const [wbMapAthleteData, setWbMapAthleteData] = useState({}); // { athleteId: { map: 400, model: 'Pro' } }


    const [wbMapDate, setWbMapDate] = useState(new Date().toISOString().split('T')[0]);

    const [wbMapStandaloneWatts, setWbMapStandaloneWatts] = useState('');

    const [wbMapStandaloneInput, setWbMapStandaloneInput] = useState('');

    const [completionLog, setCompletionLog] = useState([
        { date: '2023-11-20', percentage: 100, type: 'Full' },
        { date: '2023-11-21', percentage: 85, type: 'Partial' },
        { date: '2023-11-24', percentage: 95, type: 'Full' },
    ]);

    const [workoutLog, setWorkoutLog] = useState([]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveWorkoutLog(workoutLog);
    }, [workoutLog, isLoading]);

    const [workoutTemplates, setWorkoutTemplates] = useState([]);

    // Workout templates are now persisted to Supabase workout_templates table.
    // Legacy auto-save to StorageService kept as backup only.
    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.saveWorkoutTemplates(workoutTemplates);
    }, [workoutTemplates, isLoading]);

    // ── Personal Exercise Library ────────────────────────────────────────
    const [personalExerciseIds, setPersonalExerciseIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isLoading && dataLoadedRef.current)
            StorageService.savePersonalExercises(personalExerciseIds);
    }, [personalExerciseIds, isLoading]);

    const addToPersonalLibrary = (exerciseId: string) => {
        setPersonalExerciseIds(prev => prev.includes(exerciseId) ? prev : [...prev, exerciseId]);
    };
    const removeFromPersonalLibrary = (exerciseId: string) => {
        setPersonalExerciseIds(prev => prev.filter(id => id !== exerciseId));
    };
    const isInPersonalLibrary = (exerciseId: string) => personalExerciseIds.includes(exerciseId);

    const [programExerciseIds, setProgramExerciseIds] = useState<string[]>([]);

    // Fetch exercise IDs used in workout programs (stored in workout_day_exercises table)
    useEffect(() => {
        if (isLoading) return;
        let cancelled = false;
        (async () => {
            try {
                const ids = await DatabaseService.fetchProgramExerciseIds();
                if (!cancelled) setProgramExerciseIds(ids);
            } catch { /* non-critical */ }
        })();
        return () => { cancelled = true; };
    }, [isLoading]);

    const recentlyUsedExerciseIds = useMemo(() => {
        const idSet = new Set<string>();
        // From workout packets (in AppState)
        (workoutTemplates || []).forEach((tpl: any) => {
            const sections = tpl.sections || {};
            ['warmup', 'workout', 'cooldown'].forEach(sec => {
                (sections[sec] || []).forEach((row: any) => {
                    if (row.exerciseId) idSet.add(row.exerciseId);
                });
            });
        });
        // From workout programs (fetched from DB)
        programExerciseIds.forEach(id => idSet.add(id));
        return Array.from(idSet);
    }, [workoutTemplates, programExerciseIds]);

    const [quickLogForm, setQuickLogForm] = useState({ exercise: '', sets: '', reps: '', weight: '', rpe: '', pattern: 'Squat' });

    const [assessmentData, setAssessmentData] = useState([
        { athleteId: 'p1', date: '2023-10-15', jump: 1.2, sprint: 0.8, yoyo: -0.5, squat: 2.1, bench: 0.2, pullups: -1.2 }
    ]);

    const [assessmentForm, setAssessmentForm] = useState({ jump: 0, sprint: 0, yoyo: 0, squat: 0, bench: 0, pullups: 0 });

    const [evaluationDateA, setEvaluationDateA] = useState('2023-10-01');

    const [evaluationDateB, setEvaluationDateB] = useState('2023-09-01');


    const [isWellnessModalOpen, setIsWellnessModalOpen] = useState(false);

    const [wellnessSleep, setWellnessSleep] = useState(7);

    const [wellnessSleepQuality, setWellnessSleepQuality] = useState(7);

    const [wellnessEnergy, setWellnessEnergy] = useState(7);

    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // --- HELPER FUNCTIONS ---
    const resolveTargetName = (id, type) => {
        if (!id)
            return '';
        if (type === 'Team') {
            const team = teams.find(t => t.id === id);
            return team ? team.name : id;
        }
        else if (type === 'Individual') {
            const player = teams.flatMap(t => t.players).find(p => p.id === id);
            return player ? player.name : id;
        }
        return id;
    };

    const getSessionTypeColor = (phase) => {
        const map = {
            'Strength': 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300',
            'Hypertrophy': 'bg-purple-50 border-purple-200 dark:border-purple-800/50 text-purple-700',
            'Power': 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50 dark:border-rose-800/50 text-rose-700',
            'Speed': 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-700',
            'Conditioning': 'bg-cyan-50 border-cyan-200 text-cyan-700',
            'GPP': 'bg-emerald-50 dark:bg-emerald-900/25 border-emerald-200 dark:border-emerald-800/50 text-emerald-700',
            'Technical': 'bg-slate-100 border-slate-200 text-slate-700 dark:text-[#CBD5E1]',
            'Tactical': 'bg-slate-800 border-slate-900 text-slate-100',
            'Recovery': 'bg-sky-50 dark:bg-sky-900/20 border-sky-100 dark:border-sky-900/40 text-sky-600',
            'Rehab': 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-700',
            'Competition': 'bg-rose-600 border-rose-700 text-white',
            'Match Prep': 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50 dark:border-rose-800/50 text-rose-700',
            'Maintenance': 'bg-slate-100 border-slate-200 text-slate-600 dark:text-[#CBD5E1]',
            'Tempo': 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-900/50 text-sky-700'
        };
        return map[phase] || 'bg-slate-50 border-slate-100 text-slate-500';
    };

    const [wellnessStress, setWellnessStress] = useState(5);

    const [wellnessHydration, setWellnessHydration] = useState(2);

    const [wellnessMood, setWellnessMood] = useState('Good');

    const [viewingDate, setViewingDate] = useState(null); // New state for day overview


    const [librarySearch, setLibrarySearch] = useState('');

    const [selectedCategory, setSelectedCategory] = useState('All');

    const [newExercise, setNewExercise] = useState({
        name: '',
        bodyRegion: 'Unsorted',
        classification: 'Strength',
        primaryMuscle: 'Unsorted',
        secondaryMuscles: [],
        posture: 'Standing',
        grip: 'Neutral',
        mechanics: 'Compound',
        execution: 'Continuous',
        primaryEquipment: 'Bodyweight',
        targetMuscle: 'Full Body',
        movementPattern: 'Unsorted',
        forceType: 'Unsorted',
        cnsDemand: '',
        difficulty: '',
        videoUrl: '',
        description: '',
        tags: [],
    });

    const [editingExercise, setEditingExercise] = useState(null);

    const [planningLevel, setPlanningLevel] = useState('Individual');

    const [selectedPlannerAthleteId, setSelectedPlannerAthleteId] = useState(null);

    const [isAddAthleteModalOpen, setIsAddAthleteModalOpen] = useState(false);

    const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);

    const [addAthleteMode, setAddAthleteMode] = useState('athlete'); // 'athlete' | 'team'


    const [newAthleteName, setNewAthleteName] = useState('');

    const [newAthleteTeam, setNewAthleteTeam] = useState(teams.find(t => t.id !== 't_private')?.id || '');

    const [newAthleteProfile, setNewAthleteProfile] = useState({
        age: '', gender: 'Male', height_cm: '', weight_kg: '', sport: '', position: '', goals: '', notes: '', image_url: ''
    });

    const [newTeamName, setNewTeamName] = useState('');

    const [deletingExercise, setDeletingExercise] = useState(null);

    const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);

    const [isExerciseInfoModalOpen, setIsExerciseInfoModalOpen] = useState(false);

    const [viewingExerciseInfo, setViewingExerciseInfo] = useState(null);

    // --- Sport Scientist Decision Support State ---
    const [isInterventionModalOpen, setIsInterventionModalOpen] = useState(false);

    const [selectedInterventionAthlete, setSelectedInterventionAthlete] = useState(null);

    const [interventions, setInterventions] = useState([
        { id: 1, athleteId: 'p1', date: '2025-01-14', type: 'Load Reduction', note: 'Acute stress flags detected, reduced session volume by 20%.' }
    ]);

    const [matchDays, setMatchDays] = useState(['2025-01-18', '2025-01-25']);

    const [microcycleIntents, setMicrocycleIntents] = useState({
        'W0': 'Accumulation',
        'W1': 'Transformation',
        'W2': 'Realization',
        'W3': 'Peaking'
    });

    // --- Dynamic Registries (The Sport Scientist's Palette) ---
    const [kpiRegistry, setKpiRegistry] = useState([
        { id: 'vj', name: 'Vertical Jump', unit: 'cm', direction: 'high', group: 'Power' },
        { id: 's10', name: '10m Sprint', unit: 's', direction: 'low', group: 'Speed' },
        { id: 'rs', name: 'RS Index', unit: 'idx', direction: 'high', group: 'Power' },
        { id: 'yoyo', name: 'Yo-Yo IR2', unit: 'm', direction: 'high', group: 'Capacity' }
    ]);

    const [loadRegistry, setLoadRegistry] = useState([
        { id: 'total_dist', name: 'Total Distance', unit: 'km', color: 'indigo', icon: 'Map' },
        { id: 'hsr', name: 'High Speed Running', unit: 'm', color: 'cyan', icon: 'Zap' },
        { id: 'accels', name: 'Accelerations', unit: 'cnt', color: 'orange', icon: 'ArrowUpRight' },
        { id: 'decels', name: 'Decelerations', unit: 'cnt', color: 'rose', icon: 'ArrowDownLeft' }
    ]);

    const [habitRegistry, setHabitRegistry] = useState([
        { id: 'sleep_hygiene', name: 'Sleep Hygiene', icon: 'Moon' },
        { id: 'nutrition', name: 'Nutrition Compliance', icon: 'Utensils' },
        { id: 'hydration', name: 'Hydration Target', icon: 'Droplets' },
        { id: 'meditation', name: 'Mental Reset', icon: 'Focus' }
    ]);

    const [volumeRegistry, setVolumeRegistry] = useState(['Strength', 'Power', 'Plyometrics', 'Conditioning', 'Core']);

    // --- Weightroom Sheets State (Hoisted for V3) ---
    const [wsPrintOrientation, setWsPrintOrientation] = useState('portrait');

    const [wsBlankModeType, setWsBlankModeType] = useState('labeled'); // 'labeled' | 'open'


    const [isKpiRegistryModalOpen, setIsKpiRegistryModalOpen] = useState(false);

    const [activeRegistryTab, setActiveRegistryTab] = useState('kpi'); // 'kpi', 'load', 'habits', 'volume'


    const [newKpiEntry, setNewKpiEntry] = useState({ name: '', unit: '', direction: 'high', group: 'Other' });

    const [newLoadEntry, setNewLoadEntry] = useState({ name: '', unit: '', color: 'indigo' });

    const [newHabitEntry, setNewHabitEntry] = useState({ name: '', icon: 'CheckCircle' });

    // --- Intelligence Layer (Sport Science Math) ---
    /**
     * Calculates the Acute:Chronic Work Rate Ratio (ACWR)
     * Acute (7-day rolling avg) vs Chronic (28-day rolling avg)
     */
    // Resolve ACWR settings for a given athlete
    const getAthleteAcwrOptions = (athleteId) => {
        // Find the athlete's team
        const playerTeam = teams.find(t => (t.players || []).some(p => p.id === athleteId));
        const teamId = playerTeam?.id;
        const settingsKey = (teamId === 't_private') ? `ind_${athleteId}` : teamId;
        const settings = acwrSettings[settingsKey] || {};
        // Recalc anchor: per-athlete return-from-injury anchor takes priority, then team anchor
        const exclusion = acwrExclusions[athleteId];
        const recalcAnchorDate = acwrRecalcAnchors[`rfi_${athleteId}`]
            || exclusion?.returnAnchorDate
            || acwrRecalcAnchors[settingsKey]
            || acwrRecalcAnchors[teamId]
            || undefined;
        // Per-day rest freezes from exclusions
        const additionalRestDays = exclusion?.restDays ? new Set(exclusion.restDays) : undefined;
        return {
            metricType: settings.method || 'srpe',
            acuteN: settings.acuteWindow || 7,
            chronicN: settings.chronicWindow || 28,
            freezeRestDays: settings.freezeRestDays !== false,
            recalcAnchorDate,
            additionalRestDays,
        };
    };

    const calculateACWR = (athleteId, options) => {
        const logs = loadRecords || [];
        const opts = options || getAthleteAcwrOptions(athleteId);
        const result = ACWR_UTILS.calculateAthleteACWR(logs, athleteId, opts);
        return parseFloat(result.ratio.toFixed(2));
    };

    const calculateMonotony = (athleteId) => {
        const athleteLogs = loadRecords.filter(l => (l.athleteId === athleteId || l.athlete_id === athleteId));
        const now = new Date();
        const dailyLoads = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const daySum = athleteLogs
                .filter(l => (l.date || '').split('T')[0] === dateStr)
                .reduce((acc, l) => acc + (l.value || l.sRPE || 0), 0);
            dailyLoads.push(daySum);
        }
        const mean = dailyLoads.reduce((a, b) => a + b, 0) / 7;
        if (mean === 0) return 0.0;
        const variance = dailyLoads.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / 7;
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0) return 2.0;
        return (mean / stdDev).toFixed(2);
    };

    const calculateStrain = (athleteId) => {
        const athleteLogs = loadRecords.filter(l => (l.athleteId === athleteId || l.athlete_id === athleteId));
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        const weeklyLoad = athleteLogs
            .filter(l => new Date(l.date) >= start)
            .reduce((acc, l) => acc + (l.value || l.sRPE || 0), 0);
        const monotony = parseFloat(calculateMonotony(athleteId));
        return (weeklyLoad * monotony).toFixed(0);
    };

    const getSmartRecommendation = (athleteId) => {
        const acwr = parseFloat(calculateACWR(athleteId));
        const monotony = parseFloat(calculateMonotony(athleteId));
        const wellness = wellnessData.filter(d => d.athleteId === athleteId).slice(-1)[0] || { energy: 7, sleep: 8 };
        if (acwr > 1.5) {
            return {
                title: 'CRITICAL: Immediate De-load Required',
                message: `Acute workload (${acwr}) has surged beyond 1.5x chronic average. High spike in injury risk detected.`,
                action: 'Recommend total rest or 50% intensity reduction for the next 48 hours.',
                color: 'text-rose-600',
                bg: 'bg-rose-50',
                border: 'border-rose-100 dark:border-rose-900/40'
            };
        }
        if (acwr > 1.3) {
            return {
                title: 'WARNING: Rapid Loading Detected',
                message: `Workload (${acwr}) is climbing faster than recommended (1.3+). Monitor for signs of fatigue.`,
                action: 'Reduce volume in upcoming sessions. Focus on recovery and mobility.',
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100 dark:border-amber-800/40'
            };
        }
        if (monotony > 2.0 && acwr > 1.1) {
            return {
                title: 'ALERT: Training Monotony High',
                message: `Load variance is too low (${monotony}). The athlete is being exposed to high constant strain.`,
                action: 'Introduce a low-intensity active recovery day or change movement patterns.',
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100 dark:border-amber-800/40'
            };
        }
        if (wellness.energy < 4 || wellness.sleep < 5) {
            return {
                title: 'READINESS: Internal Response Low',
                message: 'Wellness metrics indicate poor recovery despite workload status.',
                action: 'Modify session to "Technical" focus only. Avoid heavy CNS loading.',
                color: 'text-cyan-600',
                bg: 'bg-cyan-50',
                border: 'border-cyan-100'
            };
        }
        if (acwr < 0.8) {
            return {
                title: 'OPTIMIZATION: Under-training Risk',
                message: `Chronic load is declining (${acwr}). The athlete may be losing fitness adaptations.`,
                action: 'Gradually increase total weekly tonnage to return to the 0.8-1.3 safe zone.',
                color: 'text-indigo-600',
                bg: 'bg-indigo-50',
                border: 'border-indigo-100 dark:border-indigo-800/40'
            };
        }
        return {
            title: 'STABLE: Continue Planned Program',
            message: 'Workload indices and wellness responses are within optimal ranges.',
            action: 'Maintain current periodization. No modifications required.',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100 dark:border-emerald-800/40'
        };
    };

    /**
     * Standard Benchmarking using Z-Scores
     * (Value - Mean) / StdDev
     */
    const calculateZScore = (metricName, value) => {
        const kpi = kpiRegistry.find(k => k.name === metricName || k.id === metricName);
        const direction = kpi ? kpi.direction : 'high';
        // Calculate Squad Mean and StdDev for this specific metric
        const allValues = teams.flatMap(t => t.players)
            .flatMap(p => p.performanceHistory)
            .filter(h => h.metric === metricName)
            .map(h => h.value);
        if (allValues.length < 2)
            return 0;
        const mean = allValues.reduce((a, b) => a + b) / allValues.length;
        const stdDev = Math.sqrt(allValues.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / allValues.length);
        if (stdDev === 0)
            return 0;
        const rawZ = (value - mean) / stdDev;
        return (direction === 'high' ? rawZ : -rawZ).toFixed(2);
    };

    /**
     * Predicted ACWR based on future planned sessions
     * This helps coaches foresee risk before it happens
     */
    const calculatePredictedACWR = (athleteId, targetDateStr) => {
        const athleteLogs = loadRecords.filter(l => l.athleteId === athleteId);
        const targetDate = new Date(targetDateStr);
        const acuteWindow = 7;
        // 1. Calculate Chronic Load (Past 28 days from now)
        const now = new Date();
        const chronicStart = new Date(now);
        chronicStart.setDate(now.getDate() - 28);
        const chronicSum = athleteLogs
            .filter(l => new Date(l.date) >= chronicStart && new Date(l.date) <= now)
            .reduce((acc, l) => acc + (l.sRPE || 0), 0);
        const chronicAvg = chronicSum / 4;
        // 2. Calculate Predicted Acute Load (7 days leading to targetDate combining history + future)
        const acuteStart = new Date(targetDate);
        acuteStart.setDate(targetDate.getDate() - 7);
        // History part of prediction
        const historyInAcute = athleteLogs
            .filter(l => new Date(l.date) >= acuteStart && new Date(l.date) <= now)
            .reduce((acc, l) => acc + (l.sRPE || 0), 0);
        // Future part of prediction (from scheduled sessions)
        const loadMap = { 'Maximal': 100 * 60, 'High': 80 * 60, 'Medium': 50 * 60, 'Low': 20 * 60 }; // Educated guess load
        const futureInAcute = scheduledSessions
            .filter(s => s.targetId.includes(athleteId) && new Date(s.date) > now && new Date(s.date) <= targetDate)
            .reduce((acc, s) => acc + (loadMap[s.load] || 3000), 0);
        const predictedAcute = historyInAcute + futureInAcute;
        if (chronicAvg === 0)
            return 1.0;
        return (predictedAcute / chronicAvg).toFixed(2);
    };

    const getLoadColor = (load) => {
        switch (load) {
            case 'Maximal': return 'bg-rose-600 text-white';
            case 'High': return 'bg-rose-500 text-white';
            case 'Medium': return 'bg-amber-400 text-white';
            case 'Low': return 'bg-emerald-400 text-white';
            default: return 'bg-slate-400 text-white';
        }
    };

    const dashboardCalendarDays = useMemo(() => {
        const year = dashboardCalendarDate.getFullYear();
        const month = dashboardCalendarDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun
        const days = [];
        // Pad empty days
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }
        // Fill actual days
        for (let d = 1; d <= daysInMonth; d++) {
            days.push({ day: d, dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` });
        }
        return days;
    }, [dashboardCalendarDate]);

    // RESTORED: Professional Multi-track Planner Timeline
    const exportToCSV = (data, filename) => {
        if (!data || !data.length)
            return;
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(obj => Object.values(obj).map(val => `"${val.toString().replace(/"/g, '""')}"`).join(',')).join('\n');
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // KPI-metric handlers — extracted to appState/useMetricHandlers.ts (Phase 3).
    const {
        handleCommitImport,
        handleSaveMetricWithType,
        handleSaveMetric,
        handleDeleteMetric,
        handleUndoDelete,
    } = useMetricHandlers({
        calculateHamstringResults, hamAggregate, hamAssessmentMode, hamAthleteId, hamBodyWeight, hamLeft, hamRight, importStaging, recentDeletions, setAthleteAssessments, setImportStaging, setIsImportResolverOpen, setRecentDeletions, setTeams, showSaveStatus, showToast, teams,
    });

    // Session + calendar handlers — extracted to appState/useSessionCalendarHandlers.ts
    // (Phase 3). Same handlers, same behaviour; state stays here.
    const {
        handleAddSession,
        scheduleWorkoutSession,
        handleUpdateSession,
        handleDeleteSession,
        addEventModalGenRef,
        handleAddCalendarEvent,
        handleUpdateCalendarEvent,
        handleDeleteCalendarEvent,
        handleSaveCustomEventTypes,
    } = useSessionCalendarHandlers({
        calendarEvents, exercises, isAddEventModalOpen, isLoading, newSession, scheduledSessions, setAddSessionCategory, setAddSessionSearch, setAddSessionTab, setCalendarEvents, setCustomEventTypes, setIsAddEventModalOpen, setIsAddSessionModalOpen, setIsLoading, setNewSession, setPeriodizationPlans, setPlannedTonnageLog, setScheduledSessions, showToast,
    });

    const _uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const savePlans = async (updated) => {
        // Normalise on every save → if any caller builds a plan with a missing
        // nested array, it's repaired before it ever lands in state or storage.
        const normalised = (updated || []).map(normalisePlan);
        setPeriodizationPlans(normalised);
        await StorageService.savePeriodizationPlans(normalised);
    };

    // Periodization-plan handlers — extracted to appState/usePlanHandlers.ts
    // (Phase 3). Same handlers, same behaviour; state stays here.
    const {
        handleCreatePlan,
        handleUpdatePlan,
        handleDeletePlan,
        handleAddPlanPhase,
        handleUpdatePlanPhase,
        handleDeletePlanPhase,
        handleAddPlanBlock,
        handleUpdatePlanBlock,
        handleDeletePlanBlock,
        handleAddPlanTarget,
        handleUpdatePlanTarget,
        handleDeletePlanTarget,
        handleUpdateBlockModality,
        handleUpdatePlanWeek,
        handleAddPlanWeek,
        handleAddSessionWithWeek,
        handleAddPlanSession,
        handleUpdatePlanSession,
        handleDeletePlanSession,
        handleAddPlanEvent,
        handleUpdatePlanEvent,
        handleDeletePlanEvent,
    } = usePlanHandlers({
        _uid, activePlanId, periodizationPlans, savePlans, setActivePlanId, setEditingPlanBlock, setEditingPlanEvent, setEditingPlanPhase, setEditingPlanTarget, setIsCreatePlanModalOpen, setIsPlanBlockModalOpenNew, setIsPlanEventModalOpen, setIsPlanPhaseModalOpen, setIsPlanTargetModalOpen, setPlanDrillPath,
    });

    // ── TIER 2 loader (Phase 2, 2026-07-12): non-critical domains fetched in the
    // background AFTER first paint. Consumer pages show skeletons while
    // `isSecondaryLoading` is true. Setters use keep-if-already-populated guards
    // so a user edit made during the gap is never clobbered by arriving data.
    const loadSecondaryData = useCallback(async () => {
        setIsSecondaryLoading(true);
        const failedDomains: string[] = [];
        const trackFail = (label: string) => { if (!failedDomains.includes(label)) failedDomains.push(label); };
        try {
            const [
                exercisesResult,
                loadedQuestionnaires, loadedGps, loadedMedical, loadedTemplates, loadedGpsCategories,
                dbTemplatesResult, loadedPersonalExercises, dbInjuryResult, dbWellnessTemplates,
                loadedWattbike, loadedConditioning,
                loadedWellness, loadedBiometrics, loadedWorkoutLog,
                loadedPlans, dbEvaluations, dbMaxHistory,
                tonnageRows,
            ] = await Promise.all([
                exercisesLoadedRef.current ? Promise.resolve(null) : DatabaseService.fetchExercises().catch(() => { trackFail('Exercises'); return null; }),
                StorageService.getQuestionnaires().catch(e => { console.warn('Questionnaires load failed:', e.message); return []; }),
                StorageService.getGpsData().catch(e => { console.warn('GPS data load failed:', e.message); trackFail('GPS data'); return []; }),
                StorageService.getMedicalReports().catch(e => { console.warn('Medical reports load failed:', e.message); return []; }),
                StorageService.getWorkoutTemplates().catch(e => { console.warn('Workout templates load failed:', e.message); return []; }),
                StorageService.getGpsCategories().catch(() => []),
                DatabaseService.fetchWorkoutTemplates().catch(e => { console.warn("fetchWorkoutTemplates failed:", e.message); trackFail('Workouts'); return null; }),
                StorageService.getPersonalExercises().catch(() => []),
                DatabaseService.fetchInjuryReports().catch(e => { console.warn("fetchInjuryReports failed:", e.message); trackFail('Injury reports'); return null; }),
                DatabaseService.fetchQuestionnaireTemplates().catch(e => { console.error("fetchQuestionnaireTemplates failed:", e); trackFail('Wellness templates'); return null; }),
                StorageService.getWattbikeSessions().catch(() => []),
                StorageService.getConditioningSessions().catch(() => []),
                StorageService.getWellnessData().catch(() => []),
                StorageService.getBiometrics().catch(() => []),
                StorageService.getWorkoutLog().catch(() => []),
                StorageService.getPeriodizationPlans().catch(e => { console.warn("getPeriodizationPlans failed:", e.message); trackFail('Periodization plans'); return []; }),
                DatabaseService.fetchAssessments('evaluation').catch(() => null),
                DatabaseService.fetchRmAssessments().catch(() => null),
                DatabaseService.fetchPlannedTonnage(new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0]).catch(e => { console.warn('Planned tonnage fetch failed (non-fatal):', e); return null; }),
            ]);

            // ── Exercises (first load only; fallback to bundled JSON/mocks) ──
            if (!exercisesLoadedRef.current) {
                let finalExercises = exercisesResult || [];
                if (finalExercises.length === 0) {
                    try {
                        const response = await fetch('./exercises_data.json');
                        finalExercises = response.ok ? await response.json() : MOCK_EXERCISES;
                    } catch { finalExercises = MOCK_EXERCISES; }
                }
                setExercises(finalExercises.sort((a, b) => a.name.localeCompare(b.name)));
                exercisesLoadedRef.current = true;
            }

            // ── GPS categories ──
            if (Array.isArray(loadedGpsCategories) && loadedGpsCategories.length > 0) {
                try { localStorage.setItem('gps_categories', JSON.stringify(loadedGpsCategories)); } catch {}
            }

            setQuestionnaires(prev => (prev && prev.length ? prev : (loadedQuestionnaires || [])));
            setGpsData(prev => (prev && prev.length ? prev : (loadedGps || [])));
            const rawHr = StorageService.getHrData();
            setHrData(Array.isArray(rawHr) ? rawHr : []);
            setMedicalReports(prev => (prev && prev.length ? prev : (loadedMedical || [])));

            // ── Workout templates ──
            const incomingTemplates = (dbTemplatesResult && dbTemplatesResult.length > 0)
                ? dbTemplatesResult.map(t => ({
                    id: t.id, name: t.name, trainingPhase: t.training_phase,
                    load: t.load, sections: t.sections || { warmup: [], workout: [], cooldown: [] },
                    createdAt: t.created_at,
                    user_id: t.user_id,
                    visibility: t.visibility,
                    organisation_id: t.organisation_id,
                }))
                : (loadedTemplates || []);
            setWorkoutTemplates(prev => (prev && prev.length ? prev : incomingTemplates));

            setPersonalExerciseIds(loadedPersonalExercises || []);

            // ── Injury reports ──
            if (dbInjuryResult && dbInjuryResult.length > 0) {
                setInjuryReports(prev => (prev && prev.length ? prev : dbInjuryResult.map(r => ({
                    id: r.id, athleteId: r.athlete_id, athleteName: r.athlete_name,
                    teamId: r.team_id, dateOfInjury: r.date_of_injury,
                    ...(r.report_data || {}), createdAt: r.created_at, updatedAt: r.updated_at,
                }))));
            } else {
                const loadedInjuryReports = await StorageService.getInjuryReports();
                setInjuryReports(prev => (prev && prev.length ? prev : (loadedInjuryReports?.length ? loadedInjuryReports : MOCK_INJURY_REPORTS)));
            }

            setWellnessTemplates(prev => (prev && prev.length ? prev : (dbWellnessTemplates || [])));

            // ── Wattbike & Conditioning ──
            setWattbikeSessions(prev => {
                if (!loadedWattbike || loadedWattbike.length === 0) return prev;
                const existingIds = new Set(loadedWattbike.map(s => s.id));
                return [...loadedWattbike, ...prev.filter(s => !existingIds.has(s.id))];
            });
            if (loadedConditioning && loadedConditioning.length > 0) {
                setConditioningSessions(prev => (prev && prev.length ? prev : loadedConditioning));
            }

            setWellnessData(prev => (prev && prev.length ? prev : (loadedWellness || [])));
            setBiometricsRecords(prev => (prev && prev.length ? prev : (loadedBiometrics || [])));
            setWorkoutLog(prev => (prev && prev.length ? prev : (loadedWorkoutLog || [])));

            // ── Periodization plans + evaluations + RM history ──
            // Normalise on the way in so every nested array (phases / blocks /
            // weeks / sessions / sections / exercises) is guaranteed to exist.
            setPeriodizationPlans(prev => (prev && prev.length ? prev : (loadedPlans || []).map(normalisePlan)));

            if (dbEvaluations) {
                setEvaluationData(dbEvaluations.map(raw => ({
                    athleteId: raw.athlete_id,
                    date: raw.date,
                    ...(raw.metrics || {})
                })));
            }

            if (dbMaxHistory) {
                setMaxHistory(dbMaxHistory.map(raw => {
                    const m = raw.metrics || {};
                    let exerciseName, maxWeight;
                    if (raw.test_type === '1rm') {
                        // Performance Lab: exerciseLabel has the name, value has the estimated 1RM
                        exerciseName = m.exerciseLabel || RM_EXERCISE_MAP[m.exerciseId] || 'Unknown';
                        maxWeight = m.value || 0;
                    } else {
                        // Testing Hub: test_type is the key (e.g. 'rm_back_squat'), metrics.weight is actual 1RM
                        exerciseName = RM_EXERCISE_MAP[raw.test_type] || raw.test_type;
                        maxWeight = m.weight || 0;
                    }
                    return { athleteId: raw.athlete_id, date: raw.date, exercise: exerciseName, weight: maxWeight };
                }));
            }

            // Planned tonnage log — Tracking Hub + Data Hub read this from state.
            if (tonnageRows) setPlannedTonnageLog(tonnageRows);
        } catch (error) {
            console.error("Error in loadSecondaryData:", error);
        } finally {
            if (failedDomains.length > 0) {
                setInitLoadErrors(prev => [...prev, ...failedDomains.filter(f => !prev.includes(f))]);
            }
            setIsSecondaryLoading(false);
        }
    }, []);

    const initData = useCallback(async () => {
        // Skip initialization entirely for public form routes — they don't need app state
        const path = window.location.pathname;
        if (path.startsWith('/daily-wellness') || path.startsWith('/weekly-wellness') ||
            path.startsWith('/wellness-form') || path.startsWith('/injury-form') ||
            path.startsWith('/workout/') || path.startsWith('/protocol/') ||
            path.startsWith('/data-hub/snapshot') ||
            path.startsWith('/athlete-share/') || path.startsWith('/test-share/')) {
            setIsLoading(false);
            setIsSecondaryLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            // Initialise storage wrapper (synchronous after first call)
            await StorageService.init();

            // ── Single parallel fetch: ALL independent data sources fire at once ──
            // None of these calls use results from each other as inputs — only the
            // processing/mapping below needs the data. Merging 5 sequential rounds
            // into one batch means we wait for the slowest call once, not 5 times.
            const localDate = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
            const wrFrom = localDate(new Date(Date.now() - 30 * 86400000));

            // Audit fix 10: record which core data areas fail so the UI can show a
            // "some data failed to load — Retry" banner instead of silently
            // rendering empty lists.
            const failedDomains: string[] = [];
            const trackFail = (label: string) => { if (!failedDomains.includes(label)) failedDomains.push(label); };

            // ── PHASE 2 (2026-07-12): two-tier boot ──
            // TIER 1 (below, gates first paint): only what the shell + Dashboard
            // need — teams/athletes/sessions/assessments, calendar, training
            // loads, wellness check-ins, and the (cheap) settings bundle.
            // TIER 2 (loadSecondaryData, fired after paint): everything else —
            // exercises, workout templates, GPS, medical, wattbike/conditioning,
            // plans, evaluations… Pages that consume tier-2 data show skeletons
            // while `isSecondaryLoading` is true.
            const [
                // Core DB
                teamsResult, athletesResult, sessionsResult, assessmentsResult,
                // Calendar
                calEventsResult, storedCustomTypes,
                // Legacy storage sessions + load records
                loadedSessions, loadedLoad, dbTrainingLoadsResult,
                // Settings + wellness heatmap
                savedGpsProfiles, savedAcwr, savedEx, savedAnchors,
                savedVis, savedTour, savedPolar, savedGdsSrc, wrRecords,
            ] = await Promise.all([
                // Core DB
                DatabaseService.fetchTeams().catch(e => { console.warn("fetchTeams failed:", e.message); trackFail('Teams'); return null; }),
                DatabaseService.fetchAthletes().catch(e => { console.warn("fetchAthletes failed:", e.message); trackFail('Athletes'); return null; }),
                DatabaseService.fetchSessions().catch(e => { console.warn("fetchSessions failed:", e.message); trackFail('Sessions'); return null; }),
                DatabaseService.fetchAssessments().catch(e => { console.warn("fetchAssessments failed:", e.message); trackFail('Assessments'); return null; }),
                // Calendar
                DatabaseService.fetchCalendarEvents().catch(e => { console.warn("fetchCalendarEvents failed:", e.message); trackFail('Calendar'); return []; }),
                StorageService.getCustomEventTypes().catch(() => []),
                // Legacy storage sessions + load records
                StorageService.getSessions().catch(e => { console.warn('Sessions load failed:', e.message); return []; }),
                StorageService.getLoadRecords().catch(() => []),
                DatabaseService.fetchTrainingLoads().catch(e => { console.error("[ACWR] fetchTrainingLoads failed:", e); trackFail('Training loads'); return null; }),
                // Settings
                StorageService.getGpsProfiles().catch(() => null),
                StorageService.getAcwrSettings().catch(() => null),
                StorageService.getAcwrExclusions().catch(() => null),
                StorageService.getAcwrRecalcAnchors().catch(() => null),
                StorageService.getTestVisibility().catch(() => null),
                StorageService.getTourState().catch(() => null),
                StorageService.getPolarIntegration().catch(() => null),
                StorageService.getGpsDataSources().catch(() => null),
                DatabaseService.fetchAllWellnessResponses(wrFrom, localDate()).catch(() => { trackFail('Wellness check-ins'); return []; }),
            ]);

            // Surface any boot-load failures to the UI banner (audit fix 10).
            setInitLoadErrors(failedDomains);

            // ── Process core DB results ──
            let dbTeams = [];
            let dbAthletes = [];
            let dbSessions = [];
            let allAssessments = [];

            if (teamsResult !== null && athletesResult !== null) {
                dbTeams = teamsResult || [];
                dbAthletes = (athletesResult || []).map(a => ({ ...a, teamId: a.team_id }));
                dbSessions = (sessionsResult || []).map(s => ({
                    ...s,
                    trainingPhase: s.training_phase,
                    targetType: s.target_type,
                    targetId: s.target_id,
                    plannedDuration: s.planned_duration,
                }));
                allAssessments = assessmentsResult || [];
                const dbAssessments = allAssessments
                    .filter(a => a.test_type === 'kpi')
                    .map(a => ({
                        athleteId: a.athlete_id,
                        id: a.metrics?.id,
                        name: a.metrics?.name,
                        value: a.metrics?.value,
                        unit: a.metrics?.unit,
                        date: a.date,
                        bikeModel: a.metrics?.bikeModel,
                    }));
                setKpiRecords(dbAssessments);
            } else {
                console.warn("Core DB fetch failed — falling back to mocks");
                dbTeams = MOCK_TEAMS;
            }

            // ── Calendar events (retry once on cold-start empty response) ──
            let finalCalEvents = calEventsResult || [];
            if (finalCalEvents.length === 0) {
                try { finalCalEvents = await DatabaseService.fetchCalendarEvents(); } catch (e) { /* silent */ }
            }
            setCalendarEvents(finalCalEvents);
            if (storedCustomTypes && storedCustomTypes.length > 0) setCustomEventTypes(storedCustomTypes);

            // ── Map teams + players ──
            const mappedTeams = dbTeams.map(t => {
                const teamAthletes = dbAthletes.filter(a => a.team_id === t.id || a.teamId === t.id);
                return {
                    ...t,
                    players: teamAthletes.map(a => ({
                        id: a.id,
                        name: a.name,
                        position: a.gender || 'Athlete',
                        image: null,
                        readiness: 100,
                        status: 'Active',
                        trend: 'stable',
                        teamId: a.team_id || a.teamId,
                        ...a,
                    })),
                };
            });

            const independentAthletes = dbAthletes.filter(a => !a.team_id && !a.teamId);
            if (independentAthletes.length > 0) {
                mappedTeams.push({
                    id: 't_private',
                    name: 'Private Clients',
                    sport: 'Personal Training',
                    players: independentAthletes.map(a => ({
                        id: a.id,
                        name: a.name,
                        position: a.gender || 'Athlete',
                        image: null,
                        readiness: 100,
                        status: 'Active',
                        trend: 'stable',
                        ...a,
                    })),
                });
            }

            const perfAssessments = allAssessments.filter(a => a.test_type !== 'kpi');
            mappedTeams.forEach(team => {
                team.players.forEach(player => {
                    player.performanceMetrics = perfAssessments
                        .filter(a => a.athlete_id === player.id)
                        .map(a => ({ ...a.metrics, id: a.id, date: a.date, type: a.test_type }))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                });
            });
            setTeams(mappedTeams);

            // ── Merge sessions (DB takes precedence over legacy) ──
            const mergedSessions = [...dbSessions];
            if (loadedSessions && loadedSessions.length > 0) {
                const dbIds = new Set(dbSessions.map(s => s.id));
                loadedSessions.forEach(ls => { if (!dbIds.has(ls.id)) mergedSessions.push(ls); });
            }
            setScheduledSessions(mergedSessions);

            // ── Training loads (merge DB + local, deduplicated) ──
            let mergedLoadRecords = loadedLoad || [];
            if (dbTrainingLoadsResult && dbTrainingLoadsResult.length > 0) {
                const mapped = dbTrainingLoadsResult.map(r => ({
                    id: r.id, athleteId: r.athlete_id, athlete_id: r.athlete_id, date: r.date,
                    sRPE: r.metric_type === 'srpe' ? Number(r.value) : 0,
                    value: Number(r.value), metric_type: r.metric_type, session_type: r.session_type,
                    rpe: r.rpe, duration_minutes: r.duration_minutes,
                }));
                const dbKeys = new Set(mapped.map(r => `${r.athlete_id}_${(r.date||'').split('T')[0]}_${r.metric_type}`));
                mergedLoadRecords = [
                    ...mergedLoadRecords.filter(r => {
                        const key = `${r.athleteId || r.athlete_id}_${(r.date||'').split('T')[0]}_${r.metric_type || 'srpe'}`;
                        return !dbKeys.has(key);
                    }),
                    ...mapped,
                ];
            }
            setLoadRecords(mergedLoadRecords);

            // ── Settings (results from the main Promise.all above) ──
            if (Array.isArray(savedGpsProfiles) && savedGpsProfiles.length > 0) {
                setGpsProfiles(savedGpsProfiles);
                try { localStorage.setItem('gps_team_profiles', JSON.stringify(savedGpsProfiles)); } catch {}
            }
            if (savedAcwr && Object.keys(savedAcwr).length > 0) {
                setAcwrSettings(savedAcwr);
                if (savedAcwr._heatmapDefault) setHeatmapTeamFilter(savedAcwr._heatmapDefault);
            } else {
                const legacyAcwr = localStorage.getItem('acwr_feature_settings');
                if (legacyAcwr) { const parsed = JSON.parse(legacyAcwr); setAcwrSettings(parsed); localStorage.removeItem('acwr_feature_settings'); }
            }
            if (savedEx && Object.keys(savedEx).length > 0) setAcwrExclusions(savedEx);
            else {
                const legacyEx = localStorage.getItem('acwr_exclusions');
                if (legacyEx) { const parsed = JSON.parse(legacyEx); setAcwrExclusions(parsed); localStorage.removeItem('acwr_exclusions'); }
            }
            if (savedAnchors && Object.keys(savedAnchors).length > 0) setAcwrRecalcAnchors(savedAnchors);
            if (savedVis && Object.keys(savedVis).length > 0) setTestVisibility(savedVis);
            else {
                const legacyVis = localStorage.getItem('test_visibility');
                if (legacyVis) { const parsed = JSON.parse(legacyVis); setTestVisibility(parsed); localStorage.removeItem('test_visibility'); }
            }
            if (savedTour && Object.keys(savedTour).length > 0) setTourState(savedTour);
            if (savedPolar && Object.keys(savedPolar).length > 0) setPolarIntegration(savedPolar);
            if (savedGdsSrc && Object.keys(savedGdsSrc).length > 0) setGpsDataSources(savedGdsSrc);
            setWellnessResponses(wrRecords || []);

            // If we got here, the try block succeeded
            dataLoadedRef.current = true;
        } catch (error) {
            console.error("Critical error in initData:", error);
            // dataLoadedRef stays false — save effects won't overwrite with empty data
        } finally {
            setIsLoading(false);
        }

        // ── TIER 2: everything else loads in the background after first paint ──
        loadSecondaryData();
    }, [setIsLoading, setTeams, setScheduledSessions, setLoadRecords, setGpsProfiles, setPolarIntegration, setGpsDataSources]);

    // Team + athlete handlers — extracted to appState/useTeamHandlers.ts
    // (Phase 3). Placed AFTER initData so passing it as a dep is TDZ-safe.
    const {
        handleAddAthlete,
        handleAddTeam,
        handleDeleteAthlete,
        handleDeleteTeam,
        handleOpenPlayerProfile,
        handleUpdateAthlete,
    } = useTeamHandlers({
        addAthleteMode, athletes, initData, newAthleteName, newAthleteProfile, newAthleteTeam, newTeamName, setAddAthleteMode, setIsAddAthleteModalOpen, setIsAddTeamModalOpen, setNewAthleteName, setNewAthleteProfile, setNewTeamName, setTeams, setViewingPlayer, showToast, teams,
    });

    const handleLoadWellnessResponses = useCallback(async (teamId: string, rangeOrStart?: any, endDate?: string) => {
        if (!teamId || teamId === 'all') return;

        // Convert shortcut string or legacy {start,end} object to actual local date strings
        const localDate = (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const today = localDate();
        let dateFrom: string | undefined;
        let dateTo: string | undefined = today;

        if (!rangeOrStart) {
            dateFrom = localDate(new Date(Date.now() - 7 * 86400000));
        } else if (typeof rangeOrStart === 'string') {
            if (rangeOrStart === 'today') {
                dateFrom = today;
            } else if (rangeOrStart === '7d') {
                dateFrom = localDate(new Date(Date.now() - 7 * 86400000));
            } else if (rangeOrStart === '30d') {
                dateFrom = localDate(new Date(Date.now() - 30 * 86400000));
            } else {
                dateFrom = rangeOrStart;
                dateTo = endDate ?? today;
            }
        } else if (typeof rangeOrStart === 'object' && rangeOrStart.start) {
            dateFrom = rangeOrStart.start;
            dateTo = rangeOrStart.end ?? today;
        }

        // Don't block the entire app with global isLoading — wellness is a sub-section
        try {
            const records = await DatabaseService.fetchWellnessResponses(teamId, dateFrom, dateTo);
            setWellnessResponses(records || []);
        } catch (err) {
            console.error("Error loading wellness responses:", err);
            showToast("Failed to load wellness data", "error");
        }
    }, [setIsLoading, showToast]);

    // Initial load
    useEffect(() => {
        initData();
    }, [initData]);

    const contextValue = {
        navigate,
        location,
        activeTab,
        setActiveTab,
        // Boot-load failure banner (audit fix 10)
        initLoadErrors,
        retryInitData: initData,
        // Phase 2: background-tier loading flag (pages key skeletons off this)
        isSecondaryLoading,
        isPerformanceLabOpen,
        setIsPerformanceLabOpen,
        // Organisation context (Phase B)
        currentOrg,
        currentUserRole,
        isOrgAdmin,
        orgMemberCount,
        isMultiUserOrg,
        orgLoading,
        refreshCurrentOrg,
        recentDeletions,
        setRecentDeletions,
        wattbikeSessions,
        setWattbikeSessions,
        wattbikeView,
        setWattbikeView,
        selectedWattbikeSession,
        setSelectedWattbikeSession,
        newWattbikeSession,
        setNewWattbikeSession,
        importStaging,
        setImportStaging,
        isImportResolverOpen,
        setIsImportResolverOpen,
        importStatus,
        setImportStatus,
        handleCommitImport,
        handleSaveMetricWithType,
        calculateHamstringResults,
        toasts,
        setToasts,
        showToast,
        selectedMuscleGroup,
        setSelectedMuscleGroup,
        libraryPage,
        setLibraryPage,
        ITEMS_PER_PAGE,
        isLoading,
        setIsLoading,
        saveStatus,
        showSaveStatus,
        teams,
        setTeams,
        exercises,
        setExercises,
        scheduledSessions,
        setScheduledSessions,
        questionnaires,
        setQuestionnaires,
        handleSaveMetric,
        handleDeleteMetric,
        handleUndoDelete,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        dashboardFilterTarget,
        setDashboardFilterTarget,
        calendarFilterCategory, setCalendarFilterCategory,
        calendarFilterTeamId, setCalendarFilterTeamId,
        calendarFilterAthleteId, setCalendarFilterAthleteId,
        exerciseCategories,
        setExerciseCategories,
        trackingMetrics,
        setTrackingMetrics,
        isLibrarySettingsModalOpen,
        setIsLibrarySettingsModalOpen,
        activeLibrarySettingsTab,
        setActiveLibrarySettingsTab,
        newMetricName,
        setNewMetricName,
        trackingTab,
        setTrackingTab,
        dataHubTab,
        setDataHubTab,
        hamstringReportTab,
        setHamstringReportTab,
        hamstringReportSelectedAthlete,
        setHamstringReportSelectedAthlete,
        inspectHamEntry,
        setInspectHamEntry,
        isHamstringEditMode,
        setIsHamstringEditMode,
        hamDateFilterStart,
        setHamDateFilterStart,
        hamDateFilterEnd,
        setHamDateFilterEnd,
        hamLeft,
        setHamLeft,
        hamRight,
        setHamRight,
        hamDate,
        setHamDate,
        hamAthleteId,
        setHamAthleteId,
        hamBodyWeight,
        setHamBodyWeight,
        hamAssessmentMode,
        setHamAssessmentMode,
        hamAggregate,
        setHamAggregate,
        planBlocks,
        setPlanBlocks,
        wrSelectedTeam,
        setWrSelectedTeam,
        wrSelectedExercise,
        setWrSelectedExercise,
        wrCalcWeight,
        setWrCalcWeight,
        wrCalcReps,
        setWrCalcReps,
        wrTargetPercentage,
        setWrTargetPercentage,
        wsMode,
        setWsMode,
        wsColumns,
        setWsColumns,
        isWorkoutPacketModalOpen,
        setIsWorkoutPacketModalOpen,
        wpActiveTarget,
        setWpActiveTarget,
        wpStartDate,
        setWpStartDate,
        wpEndDate,
        setWpEndDate,
        wpMode,
        setWpMode,
        wpSelectedProtocol,
        setWpSelectedProtocol,
        wpSelectedSessions,
        setWpSelectedSessions,
        wpManualExercises,
        setWpManualExercises,
        wpSearch,
        setWpSearch,
        wpRangeStart,
        setWpRangeStart,
        wpRangeEnd,
        setWpRangeEnd,
        wpRangeTargetId,
        setWpRangeTargetId,
        wpRangeTargetType,
        setWpRangeTargetType,
        wpSelectedRangeSessions,
        setWpSelectedRangeSessions,
        isEditLiftModalOpen,
        setIsEditLiftModalOpen,
        isPlanBlockModalOpen,
        setIsPlanBlockModalOpen,
        selectedPlanBlock,
        setSelectedPlanBlock,
        planBlockTab,
        setPlanBlockTab,
        dashboardCalendarDate,
        setDashboardCalendarDate,
        isDashboardCalendarOpen,
        setIsDashboardCalendarOpen,
        isWeightroomSheetModalOpen,
        setIsWeightroomSheetModalOpen,
        isAddSessionModalOpen,
        setIsAddSessionModalOpen,
        addSessionTab,
        setAddSessionTab,
        addSessionSearch,
        setAddSessionSearch,
        addSessionCategory,
        setAddSessionCategory,
        newSession,
        setNewSession,
        activeAnalyticsModule,
        setActiveAnalyticsModule,
        activeReport,
        setActiveReport,
        gpsData,
        setGpsData,
        hrData,
        setHrData,
        gpsImportStatus,
        setGpsImportStatus,
        gpsImportMessage,
        setGpsImportMessage,
        gpsFilterTarget,
        setGpsFilterTarget,
        gpsFilterDateMode,
        setGpsFilterDateMode,
        gpsSpecificDate,
        setGpsSpecificDate,
        gpsRangeStart,
        setGpsRangeStart,
        gpsRangeEnd,
        setGpsRangeEnd,
        biometricsRecords,
        setBiometricsRecords,
        loadRecords,
        setLoadRecords,
        kpiRecords,
        setKpiRecords,
        heatmapRecords,
        setHeatmapRecords,
        habitRecords,
        setHabitRecords,
        volumeRecords,
        setVolumeRecords,
        heatmapTeamFilter,
        setHeatmapTeamFilter,
        isAnalyticsManualEntryOpen,
        setIsAnalyticsManualEntryOpen,
        analyticsManualEntryModule,
        setAnalyticsManualEntryModule,
        wellnessQuestionnaireStep,
        setWellnessQuestionnaireStep,
        selectedAnalyticsAthleteId,
        setSelectedAnalyticsAthleteId,
        analyticsStartDate,
        setAnalyticsStartDate,
        analyticsEndDate,
        setAnalyticsEndDate,
        viewingPlayer,
        setViewingPlayer,
        viewingSession,
        setViewingSession,
        kpiDefinitions,
        setKpiDefinitions,
        isAddKpiModalOpen,
        setIsAddKpiModalOpen,
        newKpiName,
        setNewKpiName,
        newKpiUnit,
        setNewKpiUnit,
        newKpiCategory,
        setNewKpiCategory,
        watchedKpiIds,
        setWatchedKpiIds,
        isKpiWatchlistModalOpen,
        setIsKpiWatchlistModalOpen,
        customMetrics,
        setCustomMetrics,
        isAddMetricModalOpen,
        setIsAddMetricModalOpen,
        targetMetricModule,
        setTargetMetricModule,
        reportMode,
        setReportMode,
        customMetricName,
        setCustomMetricName,
        customMetricUnit,
        setCustomMetricUnit,
        customMetricType,
        setCustomMetricType,
        bodyHeatmapData,
        setBodyHeatmapData,
        heatmapView,
        setHeatmapView,
        selectedBodyPart,
        setSelectedBodyPart,
        isPainSelectorOpen,
        setIsPainSelectorOpen,
        painType,
        setPainType,
        painIntensity,
        setPainIntensity,
        painNotes,
        setPainNotes,
        hrReportViewMode,
        setHrReportViewMode,
        hrReportSelectedAthlete,
        setHrReportSelectedAthlete,
        hrReportDateRange,
        setHrReportDateRange,
        modules,
        wellnessData,
        setWellnessData,
        evaluationData,
        setEvaluationData,
        evaluationForm,
        setEvaluationForm,
        maxHistory,
        setMaxHistory,
        maxForm,
        setMaxForm,
        comparisonConfig,
        setComparisonConfig,
        questionnaireConfig,
        setQuestionnaireConfig,
        optOuts,
        setOptOuts,
        optOutForm,
        setOptOutForm,
        medicalReports,
        setMedicalReports,
        isMedicalModalOpen,
        setIsMedicalModalOpen,
        medicalModalMode,
        setMedicalModalMode,
        medicalFilterAthleteId,
        setMedicalFilterAthleteId,
        inspectingMedicalRecord,
        setInspectingMedicalRecord,
        medicalForm,
        setMedicalForm,
        injuryReports,
        setInjuryReports,
        saveInjuryReportToDB,
        deleteInjuryReportFromDB,
        injuryFilterAthleteId,
        setInjuryFilterAthleteId,
        activityLog,
        setActivityLog,
        activeConditioningModule,
        setActiveConditioningModule,
        conditioningSessions,
        setConditioningSessions,
        conditioningView,
        setConditioningView,
        selectedConditioningSession,
        setSelectedConditioningSession,
        newConditioningSession,
        setNewConditioningSession,
        isWattbikeMapCalculatorOpen,
        setIsWattbikeMapCalculatorOpen,
        wbMapTab,
        setWbMapTab,
        wbMapTargetId,
        setWbMapTargetId,
        wbMapTargetType,
        setWbMapTargetType,
        wbMapPercentage,
        setWbMapPercentage,
        wbMapBikeModel,
        setWbMapBikeModel,
        wbMapManualRPM,
        setWbMapManualRPM,
        wbMapManualFan,
        setWbMapManualFan,
        wbMapAthleteData,
        setWbMapAthleteData,
        wbMapDate,
        setWbMapDate,
        wbMapStandaloneWatts,
        setWbMapStandaloneWatts,
        wbMapStandaloneInput,
        setWbMapStandaloneInput,
        completionLog,
        setCompletionLog,
        workoutLog,
        setWorkoutLog,
        workoutTemplates,
        setWorkoutTemplates,
        personalExerciseIds,
        addToPersonalLibrary,
        removeFromPersonalLibrary,
        isInPersonalLibrary,
        recentlyUsedExerciseIds,
        quickLogForm,
        setQuickLogForm,
        assessmentData,
        setAssessmentData,
        assessmentForm,
        setAssessmentForm,
        evaluationDateA,
        setEvaluationDateA,
        evaluationDateB,
        setEvaluationDateB,
        wellnessTemplates,
        setWellnessTemplates,
        wellnessResponses,
        setWellnessResponses,
        plannedTonnageLog,
        setPlannedTonnageLog,
        wellnessSelectedTeamId,
        setWellnessSelectedTeamId,
        wellnessDateRange,
        setWellnessDateRange,
        handleLoadWellnessResponses,
        isWellnessModalOpen,
        setIsWellnessModalOpen,
        wellnessSleep,
        setWellnessSleep,
        wellnessSleepQuality,
        setWellnessSleepQuality,
        wellnessEnergy,
        setWellnessEnergy,
        currentTime,
        setCurrentTime,
        resolveTargetName,
        getSessionTypeColor,
        wellnessStress,
        setWellnessStress,
        wellnessHydration,
        setWellnessHydration,
        wellnessMood,
        setWellnessMood,
        viewingDate,
        setViewingDate,
        librarySearch,
        setLibrarySearch,
        selectedCategory,
        setSelectedCategory,
        newExercise,
        setNewExercise,
        editingExercise,
        setEditingExercise,
        planningLevel,
        setPlanningLevel,
        selectedPlannerAthleteId,
        setSelectedPlannerAthleteId,
        isAddAthleteModalOpen,
        setIsAddAthleteModalOpen,
        isAddTeamModalOpen,
        setIsAddTeamModalOpen,
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
        deletingExercise,
        setDeletingExercise,
        isDeleteConfirmModalOpen,
        setIsDeleteConfirmModalOpen,
        isExerciseInfoModalOpen,
        setIsExerciseInfoModalOpen,
        viewingExerciseInfo,
        setViewingExerciseInfo,
        isInterventionModalOpen,
        setIsInterventionModalOpen,
        selectedInterventionAthlete,
        setSelectedInterventionAthlete,
        interventions,
        setInterventions,
        matchDays,
        setMatchDays,
        microcycleIntents,
        setMicrocycleIntents,
        kpiRegistry,
        setKpiRegistry,
        loadRegistry,
        setLoadRegistry,
        habitRegistry,
        setHabitRegistry,
        volumeRegistry,
        setVolumeRegistry,
        wsPrintOrientation,
        setWsPrintOrientation,
        wsBlankModeType,
        setWsBlankModeType,
        isKpiRegistryModalOpen,
        setIsKpiRegistryModalOpen,
        activeRegistryTab,
        setActiveRegistryTab,
        newKpiEntry,
        setNewKpiEntry,
        newLoadEntry,
        setNewLoadEntry,
        newHabitEntry,
        setNewHabitEntry,
        acwrSettings,
        setAcwrSettings,
        acwrExclusions,
        setAcwrExclusions,
        acwrRecalcAnchors,
        setAcwrRecalcAnchors,
        testVisibility,
        tourState, setTourState,
        polarIntegration, setPolarIntegration,
        gpsDataSources, setGpsDataSources,
        setTestVisibility,
        getAthleteAcwrOptions,
        calculateACWR,
        calculateMonotony,
        calculateStrain,
        getSmartRecommendation,
        calculateZScore,
        calculatePredictedACWR,
        getLoadColor,
        handleOpenPlayerProfile,
        handleAddAthlete,
        handleAddTeam,
        handleUpdateAthlete,
        handleDeleteAthlete,
        handleDeleteTeam,
        handleAddSession,
        scheduleWorkoutSession,
        handleDeleteSession,
        handleUpdateSession,
        dashboardCalendarDays,
        exportToCSV,
        athleteAssessments,
        setAthleteAssessments,
        selectedAthleteId,
        setSelectedAthleteId,
        athletes,
        // GPS profiles (React state — no localStorage race condition)
        gpsProfiles,
        setGpsProfiles,
        // Calendar events
        calendarEvents,
        setCalendarEvents,
        isAddEventModalOpen,
        setIsAddEventModalOpen,
        addEventPresetDate,
        setAddEventPresetDate,
        customEventTypes,
        handleAddCalendarEvent,
        handleUpdateCalendarEvent,
        handleDeleteCalendarEvent,
        handleSaveCustomEventTypes,
        // Periodization Planner
        periodizationPlans,
        setPeriodizationPlans,
        activePlanId,
        setActivePlanId,
        planDrillPath,
        setPlanDrillPath,
        isCreatePlanModalOpen,
        setIsCreatePlanModalOpen,
        isPlanPhaseModalOpen,
        setIsPlanPhaseModalOpen,
        isPlanBlockModalOpenNew,
        setIsPlanBlockModalOpenNew,
        isPlanEventModalOpen,
        setIsPlanEventModalOpen,
        isPlanTargetModalOpen,
        setIsPlanTargetModalOpen,
        editingPlanPhase,
        setEditingPlanPhase,
        editingPlanBlock,
        setEditingPlanBlock,
        editingPlanEvent,
        setEditingPlanEvent,
        editingPlanTarget,
        setEditingPlanTarget,
        handleCreatePlan,
        handleUpdatePlan,
        handleDeletePlan,
        handleAddPlanPhase,
        handleUpdatePlanPhase,
        handleDeletePlanPhase,
        handleAddPlanBlock,
        handleUpdatePlanBlock,
        handleDeletePlanBlock,
        handleUpdateBlockModality,
        handleUpdatePlanWeek,
        handleAddPlanWeek,
        handleAddSessionWithWeek,
        handleAddPlanSession,
        handleUpdatePlanSession,
        handleDeletePlanSession,
        handleAddPlanEvent,
        handleUpdatePlanEvent,
        handleDeletePlanEvent,
        handleAddPlanTarget,
        handleUpdatePlanTarget,
        handleDeletePlanTarget,
        isDarkMode,
        toggleDarkMode,
    };

    return (
        <AppStateContext.Provider value={contextValue}>
            {children}
        </AppStateContext.Provider>
    );
};

export const useAppState = () => {
    const context = useContext(AppStateContext);
    if (context === undefined || context === null) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context;
};
