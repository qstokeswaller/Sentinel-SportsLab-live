
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

    // Sync URL → activeTab when user navigates back/forward
    useEffect(() => {
        if (location.pathname.startsWith('/workout/')) return;
        if (location.pathname.startsWith('/wellness-form')) return;
        if (location.pathname.startsWith('/injury-form')) return;
        if (location.pathname.startsWith('/protocol/')) return;
        if (location.pathname.startsWith('/login')) return;
        if (location.pathname.startsWith('/onboarding')) return;
        if (location.pathname.startsWith('/settings')) return;
        const topSegment = location.pathname.slice(1).split('/')[0];
        const valid = ['dashboard', 'periodization', 'clients', 'workouts', 'library', 'conditioning', 'analytics', 'reports', 'wellness', 'testing'];
        if (valid.includes(topSegment) && topSegment !== activeTab)
            setActiveTab(topSegment);
    }, [location.pathname]);

    // Sync activeTab → URL (skip on public/standalone routes and sub-routes)
    useEffect(() => {
        if (location.pathname.startsWith('/workout/')) return;
        if (location.pathname.startsWith('/wellness-form')) return;
        if (location.pathname.startsWith('/injury-form')) return;
        if (location.pathname.startsWith('/protocol/')) return;
        if (location.pathname.startsWith('/login')) return;
        if (location.pathname.startsWith('/onboarding')) return;
        if (location.pathname.startsWith('/settings')) return;
        const current = location.pathname.slice(1) || 'dashboard';
        // Don't redirect if we're on a sub-route of the activeTab (e.g. /workouts/packets)
        if (current.startsWith(activeTab + '/')) return;
        if (activeTab && activeTab !== current)
            navigate('/' + activeTab, { replace: true });
    }, [activeTab]);

    const [recentDeletions, setRecentDeletions] = useState([]); // Track deletions for Undo


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



    const handleCommitImport = () => {
        let successCount = 0;
        importStaging.forEach(item => {
            let targetId = item.matchedId;
            if (targetId && item.data) {
                handleSaveMetric(targetId, item.data);
                successCount++;
            }
        });
        setIsImportResolverOpen(false);
        setImportStaging([]);
        showToast(`Successfully imported ${successCount} records.`);
    };

    const handleSaveMetricWithType = (type) => {
        let data = null;
        let athleteId = null;

        if (type === '1rm') {
            if (!oneRmAthleteId || !oneRmExerciseId || !oneRepMax) return showSaveStatus('error');
            athleteId = oneRmAthleteId;
            data = { type: '1rm', exerciseId: oneRmExerciseId, value: oneRepMax };
        } else if (type === 'dsi') {
            if (!dsiAthleteId || !dsiScore) return showSaveStatus('error');
            athleteId = dsiAthleteId;
            data = { type: 'dsi', value: dsiScore, ballistic: dsiBallistic, isometric: dsiIsometric, category: dsiCategory.label };
        } else if (type === 'rsi') {
            if (!rsiAthleteId || !rsiScore) return showSaveStatus('error');
            athleteId = rsiAthleteId;
            data = { type: 'rsi', value: rsiScore, height: rsiHeight, contactTime: rsiContactTime };
        } else if (type === 'hamstring') {
            const hamResults = calculateHamstringResults();
            if (!hamAthleteId || !hamResults) return showSaveStatus('error');
            athleteId = hamAthleteId;
            if (hamAssessmentMode === 'split') {
                data = {
                    type: 'hamstring',
                    mode: 'split',
                    left: hamLeft,
                    right: hamRight,
                    asymmetry: hamResults.asymmetry,
                    avgForce: hamResults.avg.toFixed(1),
                    bodyWeight: hamBodyWeight,
                    relativeStrength: hamResults.relativeStrength
                };
            } else {
                data = {
                    type: 'hamstring',
                    mode: 'aggregate',
                    aggregate: hamAggregate,
                    avgForce: hamResults.avg.toFixed(1),
                    bodyWeight: hamBodyWeight,
                    relativeStrength: hamResults.relativeStrength
                };
            }
        }

        if (athleteId && data) {
            handleSaveMetric(athleteId, data);
            showSaveStatus('success');
        }
    };

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
                riskColor = 'text-orange-500';
            }

            return {
                avg,
                relativeStrength,
                asymmetry: asymmetry.toFixed(1),
                riskText,
                color: riskColor
            };
        } else {
            const agg = parseFloat(hamAggregate);
            if (!agg) return null;

            let relativeStrength = null;
            if (bw && bw > 0) {
                relativeStrength = (agg / bw).toFixed(2);
            }

            return {
                total: agg,
                relativeStrength,
                avg: agg / 2
            };
        }
    };


    // --- TOAST SYSTEM ---
    const [toasts, setToasts] = useState([]);

    const showToast = (message, actionLabel = null, actionHandler = null) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, actionLabel, actionHandler }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    };

    // --- EXERCISE LIBRARY STATE ---
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('All');

    const [libraryPage, setLibraryPage] = useState(1);

    const ITEMS_PER_PAGE = 50;

    // --- PERSISTENCE STATE ---
    const exercisesLoadedRef = useRef(false); // Prevents re-fetching 3,242 exercises on every initData() call
    const [isLoading, setIsLoading] = useState(true);
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
    // Removed JSON auto-saving hooks for teams & exercises because they are now SQL-driven!

    useEffect(() => {
        if (!isLoading)
            StorageService.saveSessions(scheduledSessions);
    }, [scheduledSessions, isLoading]);

    useEffect(() => {
        if (!isLoading)
            StorageService.saveQuestionnaires(questionnaires);
    }, [questionnaires, isLoading]);

    useEffect(() => {
        if (!isLoading)
            StorageService.saveWattbikeSessions(wattbikeSessions);
    }, [wattbikeSessions, isLoading]);

    useEffect(() => {
        if (!isLoading)
            StorageService.saveConditioningSessions(conditioningSessions);
    }, [conditioningSessions, isLoading]);

    const handleSaveMetric = async (athleteId: string, data: any) => {
        if (!athleteId) {
            alert("No athlete selected. Please select an athlete first.");
            return;
        }
        try {
            await DatabaseService.logAssessment(data.type, athleteId, data);
            // Reload assessments for this athlete
            const records = await DatabaseService.fetchAssessmentsByAthlete(athleteId);
            setAthleteAssessments(records);
            showToast?.(`${data.type.toUpperCase()} saved successfully`);
        } catch (err) {
            console.error("Error saving metric:", err);
            alert("Failed to save metric. Check Supabase connection.");
        }
    };

    const handleDeleteMetric = (athleteId, metricId) => {
        if (!metricId)
            return;
        // Find the record to delete and store it in history
        const athlete = teams.flatMap(t => t.players).find(p => p.id === athleteId);
        const recordToDelete = athlete?.performanceMetrics?.find(m => m.id === metricId);
        if (recordToDelete) {
            setRecentDeletions(prev => [{ athleteId, ...recordToDelete }, ...prev].slice(0, 10));
            showToast(`Deleted ${recordToDelete.metric || recordToDelete.type}`, 'Undo', handleUndoDelete);
        }
        const newTeams = teams.map(t => ({
            ...t,
            players: t.players.map(p => {
                if (p.id === athleteId) {
                    return {
                        ...p,
                        performanceMetrics: (p.performanceMetrics || []).filter(m => m.id && m.id !== metricId)
                    };
                }
                return p;
            })
        }));
        setTeams(newTeams);
    };

    const handleUndoDelete = () => {
        if (recentDeletions.length === 0)
            return;
        const lastDeleted = recentDeletions[0];
        const { athleteId, ...record } = lastDeleted;
        const newTeams = teams.map(t => ({
            ...t,
            players: t.players.map(p => {
                if (p.id === athleteId) {
                    return {
                        ...p,
                        performanceMetrics: [...(p.performanceMetrics || []), record].sort((a, b) => new Date(b.date) - new Date(a.date))
                    };
                }
                return p;
            })
        }));
        setTeams(newTeams);
        setRecentDeletions(prev => prev.slice(1));
    };

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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
    const [editingPlanPhase, setEditingPlanPhase] = useState(null);
    const [editingPlanBlock, setEditingPlanBlock] = useState(null);
    const [editingPlanEvent, setEditingPlanEvent] = useState(null);

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

    // --- CALENDAR EVENTS STATE ---
    const [calendarEvents, setCalendarEvents] = useState([]);
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
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
    const [wellnessSelectedTeamId, setWellnessSelectedTeamId] = useState<string>('all');
    const [wellnessDateRange, setWellnessDateRange] = useState<string>('7d');

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
    const modules = [
        { id: 'load', title: 'Baseline & Trend Analysis', icon: TrendingUpIcon, description: 'Diagnostic baselines & trend classification' },
        { id: 'kpi', title: 'Performance Intelligence', icon: LineChartIcon, description: 'KPI trendlines & progression predictors' },
        { id: 'scenario', title: 'Scenario Modelling', icon: ZapIcon, description: 'Simulate training decisions and assess future risk/readiness.' }
    ];

    const [wellnessData, setWellnessData] = useState([]);

    useEffect(() => {
        if (!isLoading)
            StorageService.saveLoadRecords(loadRecords);
    }, [loadRecords, isLoading]);

    useEffect(() => {
        if (!isLoading)
            StorageService.saveWellnessData(wellnessData);
    }, [wellnessData, isLoading]);

    useEffect(() => {
        if (!isLoading)
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
        if (!isLoading)
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
        if (!isLoading)
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
        if (!isLoading)
            StorageService.saveWorkoutLog(workoutLog);
    }, [workoutLog, isLoading]);

    const [workoutTemplates, setWorkoutTemplates] = useState([]);

    // Workout templates are now persisted to Supabase workout_templates table.
    // Legacy auto-save to StorageService kept as backup only.
    useEffect(() => {
        if (!isLoading)
            StorageService.saveWorkoutTemplates(workoutTemplates);
    }, [workoutTemplates, isLoading]);

    // ── Personal Exercise Library ────────────────────────────────────────
    const [personalExerciseIds, setPersonalExerciseIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isLoading)
            StorageService.savePersonalExercises(personalExerciseIds);
    }, [personalExerciseIds, isLoading]);

    const addToPersonalLibrary = (exerciseId: string) => {
        setPersonalExerciseIds(prev => prev.includes(exerciseId) ? prev : [...prev, exerciseId]);
    };
    const removeFromPersonalLibrary = (exerciseId: string) => {
        setPersonalExerciseIds(prev => prev.filter(id => id !== exerciseId));
    };
    const isInPersonalLibrary = (exerciseId: string) => personalExerciseIds.includes(exerciseId);

    const recentlyUsedExerciseIds = useMemo(() => {
        const idSet = new Set<string>();
        (workoutTemplates || []).forEach((tpl: any) => {
            const sections = tpl.sections || {};
            ['warmup', 'workout', 'cooldown'].forEach(sec => {
                (sections[sec] || []).forEach((row: any) => {
                    if (row.exerciseId) idSet.add(row.exerciseId);
                });
            });
        });
        return Array.from(idSet);
    }, [workoutTemplates]);

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
            'Strength': 'bg-indigo-50 border-indigo-200 text-indigo-700',
            'Hypertrophy': 'bg-purple-50 border-purple-200 text-purple-700',
            'Power': 'bg-rose-50 border-rose-200 text-rose-700',
            'Speed': 'bg-amber-50 border-amber-200 text-amber-700',
            'Conditioning': 'bg-cyan-50 border-cyan-200 text-cyan-700',
            'GPP': 'bg-emerald-50 border-emerald-200 text-emerald-700',
            'Technical': 'bg-slate-100 border-slate-200 text-slate-700',
            'Tactical': 'bg-slate-800 border-slate-900 text-slate-100',
            'Recovery': 'bg-blue-50 border-blue-100 text-blue-600',
            'Rehab': 'bg-orange-50 border-orange-200 text-orange-700',
            'Competition': 'bg-red-600 border-red-700 text-white',
            'Match Prep': 'bg-red-50 border-red-200 text-red-700',
            'Maintenance': 'bg-gray-50 border-gray-200 text-gray-700',
            'Tempo': 'bg-lime-50 border-lime-200 text-lime-700'
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
        posture: 'Standing',
        grip: 'Neutral',
        mechanics: 'Compound',
        execution: 'Continuous',
        primaryEquipment: 'Bodyweight',
        targetMuscle: 'Full Body',
        videoUrl: '',
        description: ''
    });

    const [editingExercise, setEditingExercise] = useState(null);

    const [planningLevel, setPlanningLevel] = useState('Individual');

    const [selectedPlannerAthleteId, setSelectedPlannerAthleteId] = useState(null);

    const [isAddAthleteModalOpen, setIsAddAthleteModalOpen] = useState(false);

    const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);

    const [addAthleteMode, setAddAthleteMode] = useState('athlete'); // 'athlete' | 'team'


    const [newAthleteName, setNewAthleteName] = useState('');

    const [newAthleteTeam, setNewAthleteTeam] = useState(teams[0]?.id || '');

    const [newAthleteProfile, setNewAthleteProfile] = useState({
        age: '', gender: 'Male', height_cm: '', weight_kg: '', sport: '', position: '', goals: '', notes: ''
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
    const calculateACWR = (athleteId, options = {}) => {
        const logs = loadRecords || [];
        const result = ACWR_UTILS.calculateAthleteACWR(logs, athleteId, options);
        return result.ratio.toFixed(2);
    };

    const calculateMonotony = (athleteId) => {
        const athleteLogs = loadRecords.filter(l => l.athleteId === athleteId);
        const now = new Date();
        const dailyLoads = [];
        // Get daily loads for the last 7 days
        for (let i = 0; i < 7; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const daySum = athleteLogs
                .filter(l => l.date === dateStr)
                .reduce((acc, l) => acc + (l.sRPE || 0), 0);
            dailyLoads.push(daySum);
        }
        const mean = dailyLoads.reduce((a, b) => a + b, 0) / 7;
        if (mean === 0)
            return 0.0;
        const variance = dailyLoads.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / 7;
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0)
            return 2.0; // High monotony if no variation in training
        return (mean / stdDev).toFixed(2);
    };

    const calculateStrain = (athleteId) => {
        const athleteLogs = loadRecords.filter(l => l.athleteId === athleteId);
        const now = new Date();
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        const weeklyLoad = athleteLogs
            .filter(l => new Date(l.date) >= start)
            .reduce((acc, l) => acc + (l.sRPE || 0), 0);
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
                border: 'border-rose-100'
            };
        }
        if (acwr > 1.3) {
            return {
                title: 'WARNING: Rapid Loading Detected',
                message: `Workload (${acwr}) is climbing faster than recommended (1.3+). Monitor for signs of fatigue.`,
                action: 'Reduce volume in upcoming sessions. Focus on recovery and mobility.',
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                border: 'border-amber-100'
            };
        }
        if (monotony > 2.0 && acwr > 1.1) {
            return {
                title: 'ALERT: Training Monotony High',
                message: `Load variance is too low (${monotony}). The athlete is being exposed to high constant strain.`,
                action: 'Introduce a low-intensity active recovery day or change movement patterns.',
                color: 'text-orange-600',
                bg: 'bg-orange-50',
                border: 'border-orange-100'
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
                border: 'border-indigo-100'
            };
        }
        return {
            title: 'STABLE: Continue Planned Program',
            message: 'Workload indices and wellness responses are within optimal ranges.',
            action: 'Maintain current periodization. No modifications required.',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'border-emerald-100'
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
            case 'Maximal': return 'bg-red-500 text-white';
            case 'High': return 'bg-orange-400 text-white';
            case 'Medium': return 'bg-amber-400 text-white';
            case 'Low': return 'bg-emerald-400 text-white';
            default: return 'bg-slate-400 text-white';
        }
    };

    const handleOpenPlayerProfile = (name) => {
        const player = teams.flatMap(t => t.players).find(p => p.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.name.toLowerCase()));
        if (player) {
            setViewingPlayer(player);
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

    const handleAddAthlete = async () => {
        if (!newAthleteName.trim()) return;
        try {
            if (addAthleteMode === 'athlete') {
                await DatabaseService.createAthlete({
                    name: newAthleteName,
                    team_id: newAthleteTeam && newAthleteTeam !== 'All' ? newAthleteTeam : null,
                    age: newAthleteProfile.age ? parseInt(newAthleteProfile.age) : undefined,
                    gender: newAthleteProfile.gender || undefined,
                    height_cm: newAthleteProfile.height_cm ? parseFloat(newAthleteProfile.height_cm) : undefined,
                    weight_kg: newAthleteProfile.weight_kg ? parseFloat(newAthleteProfile.weight_kg) : undefined,
                    sport: newAthleteProfile.sport || undefined,
                    position: newAthleteProfile.position || undefined,
                    goals: newAthleteProfile.goals || undefined,
                    notes: newAthleteProfile.notes || undefined,
                });
            } else {
                await DatabaseService.createTeam(newAthleteName, 'Football');
            }
            setIsAddAthleteModalOpen(false);
            setNewAthleteName('');
            setNewAthleteProfile({ age: '', gender: 'Male', height_cm: '', weight_kg: '', sport: '', position: '', goals: '', notes: '' });
            initData(); // refresh roster in background — don't block modal close
        } catch (err) {
            console.error("Error adding athlete/team:", err);
            alert("Failed to add. Ensure the database schema has been applied.");
        }
    };

    const handleAddTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            await DatabaseService.createTeam(newTeamName, 'Football');
            setIsAddTeamModalOpen(false);
            setNewTeamName('');
            await initData(); // refresh teams before switching mode
            setAddAthleteMode('athlete'); // auto-switch back so user can add athlete to new team
        } catch (err) {
            console.error("Error adding team:", err);
            alert("Failed to add team. Ensure the database schema has been applied.");
        }
    };

    const handleDeleteAthlete = async (athleteId: string) => {
        try {
            await DatabaseService.deleteAthlete(athleteId);
            initData();
        } catch (err) {
            console.error("Error deleting athlete:", err);
            alert("Failed to delete athlete.");
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        try {
            await DatabaseService.deleteTeam(teamId);
            initData();
        } catch (err) {
            console.error("Error deleting team:", err);
            alert("Failed to delete team. Make sure all athletes are removed first.");
        }
    };

    const handleAddSession = async () => {
        if (!newSession.title || !newSession.targetId) {
            setAddSessionTab('info');
            return;
        }

        try {
            setIsLoading(true);
            const sessionData = {
                title: newSession.title,
                date: newSession.date,
                target_type: newSession.targetType,
                target_id: newSession.targetId,
                training_phase: newSession.trainingPhase,
                load: newSession.load,
                status: 'Scheduled',
                planned_duration: 60,
                exercises: newSession.exercises // Assuming the DB table can handle this JSONB or similar
            };

            await DatabaseService.createSession(sessionData);
            await initData();

            setIsAddSessionModalOpen(false);
            setNewSession({
                title: '',
                date: new Date().toISOString().split('T')[0],
                targetType: 'Team',
                targetId: '',
                trainingPhase: 'Strength',
                load: 'Medium',
                exercises: []
            });
            setAddSessionTab('info');
            setAddSessionSearch('');
            setAddSessionCategory('All');
            showToast("Session created successfully", "success");
        } catch (err) {
            console.error("Error creating session:", err);
            showToast("Failed to create session", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const scheduleWorkoutSession = async (sessionPayload) => {
        try {
            setIsLoading(true);
            await DatabaseService.createSession(sessionPayload);
            await initData();
            showToast("Workout scheduled successfully", "success");
        } catch (err) {
            console.error("Error scheduling workout:", err);
            showToast("Failed to schedule workout", "error");
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateSession = async (sessionId, updates) => {
        try {
            // Optimistic: update local state immediately
            setScheduledSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...updates } : s));
            // Map camelCase → snake_case for DB
            const dbUpdates: any = {};
            if (updates.date !== undefined) dbUpdates.date = updates.date;
            if (updates.time !== undefined) dbUpdates.time = updates.time;
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.trainingPhase !== undefined) dbUpdates.training_phase = updates.trainingPhase;
            if (updates.load !== undefined) dbUpdates.load = updates.load;
            if (updates.targetType !== undefined) dbUpdates.target_type = updates.targetType;
            if (updates.targetId !== undefined) dbUpdates.target_id = updates.targetId;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            await DatabaseService.updateSession(sessionId, dbUpdates);
            showToast("Session updated", "success");
        } catch (err) {
            console.error("Error updating session:", err);
            showToast("Failed to update session", "error");
            // Rollback: refetch
            try {
                const sessions = await DatabaseService.fetchSessions();
                if (sessions) setScheduledSessions(sessions.map(s => ({ ...s, trainingPhase: s.training_phase, targetType: s.target_type, targetId: s.target_id, plannedDuration: s.planned_duration })));
            } catch (_) {}
        }
    };

    const handleDeleteSession = async (sessionId) => {
        if (!confirm("Are you sure you want to delete this session?")) return;
        try {
            setIsLoading(true);
            await DatabaseService.deleteSession(sessionId);
            await initData();
            showToast("Session deleted", "success");
        } catch (err) {
            console.error("Error deleting session:", err);
            showToast("Failed to delete session", "error");
        } finally {
            setIsLoading(false);
        }
    };

    // --- CALENDAR EVENT HANDLERS ---
    const addEventModalGenRef = useRef(0); // increments each time modal opens — prevents stale close
    useEffect(() => {
        if (isAddEventModalOpen) addEventModalGenRef.current += 1;
    }, [isAddEventModalOpen]);

    const handleAddCalendarEvent = async (eventData) => {
        const gen = addEventModalGenRef.current; // snapshot generation before async work
        try {
            const result = await DatabaseService.createCalendarEvent(eventData);
            // Optimistic: append to local state so calendar updates instantly
            if (result) {
                setCalendarEvents(prev => [...prev, ...(Array.isArray(result) ? result : [result])]);
            }
            showToast("Event created successfully", "success");
            // Close modal only if user hasn't reopened it since this save started
            if (addEventModalGenRef.current === gen) {
                setIsAddEventModalOpen(false);
            }
            // Refresh calendar events in background
            DatabaseService.fetchCalendarEvents().then(events => {
                if (events) setCalendarEvents(events);
            }).catch(() => {});
        } catch (err) {
            console.error("Error creating calendar event:", err);
            showToast("Failed to create event", "error");
        }
    };

    const handleUpdateCalendarEvent = async (id, updates) => {
        try {
            setIsLoading(true);
            await DatabaseService.updateCalendarEvent(id, updates);
            await initData();
            showToast("Event updated", "success");
        } catch (err) {
            console.error("Error updating calendar event:", err);
            showToast("Failed to update event", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteCalendarEvent = async (id) => {
        if (!confirm("Are you sure you want to delete this event?")) return;
        try {
            setIsLoading(true);
            await DatabaseService.deleteCalendarEvent(id);
            await initData();
            showToast("Event deleted", "success");
        } catch (err) {
            console.error("Error deleting calendar event:", err);
            showToast("Failed to delete event", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveCustomEventTypes = async (types) => {
        setCustomEventTypes(types);
        await StorageService.saveCustomEventTypes(types);
    };

    // --- PERIODIZATION PLAN CRUD HANDLERS ---
    const _uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const savePlans = async (updated) => {
        setPeriodizationPlans(updated);
        await StorageService.savePeriodizationPlans(updated);
    };

    const handleCreatePlan = async (planData) => {
        const plan = {
            id: _uid(),
            name: planData.name || 'Untitled Plan',
            targetType: planData.targetType || 'Team',
            targetId: planData.targetId || '',
            startDate: planData.startDate || new Date().toISOString().split('T')[0],
            endDate: planData.endDate || undefined,
            viewMode: planData.viewMode || 'timeline',
            modalities: planData.modalities || ['Strength', 'Plyometrics', 'Speed', 'Conditioning', 'Loaded Power'],
            phases: [],
            events: [],
            volumeOverrides: {},
            intensityOverrides: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const updated = [...periodizationPlans, plan];
        await savePlans(updated);
        setActivePlanId(plan.id);
        setPlanDrillPath([]);
        setIsCreatePlanModalOpen(false);
        return plan;
    };

    const handleUpdatePlan = async (planId, updates) => {
        const updated = periodizationPlans.map(p =>
            p.id === planId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
        );
        await savePlans(updated);
    };

    const handleDeletePlan = async (planId) => {
        const updated = periodizationPlans.filter(p => p.id !== planId);
        await savePlans(updated);
        if (activePlanId === planId) {
            setActivePlanId(null);
            setPlanDrillPath([]);
        }
    };

    const _updateActivePlan = async (updater) => {
        const updated = periodizationPlans.map(p => {
            if (p.id !== activePlanId) return p;
            return { ...updater(p), updatedAt: new Date().toISOString() };
        });
        await savePlans(updated);
    };

    const handleAddPlanPhase = async (phaseData) => {
        const phase = {
            id: _uid(),
            name: phaseData.name || 'New Phase',
            startDate: phaseData.startDate,
            endDate: phaseData.endDate,
            color: phaseData.color || '#6366f1',
            trainingPhase: phaseData.trainingPhase || 'General Preparation',
            blocks: [],
        };
        await _updateActivePlan(p => ({ ...p, phases: [...p.phases, phase] }));
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    const handleUpdatePlanPhase = async (phaseId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId ? { ...ph, ...updates } : ph)
        }));
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    const handleDeletePlanPhase = async (phaseId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.filter(ph => ph.id !== phaseId)
        }));
        setIsPlanPhaseModalOpen(false);
        setEditingPlanPhase(null);
    };

    const handleAddPlanBlock = async (phaseId, blockData) => {
        const startDate = new Date(blockData.startDate);
        const msPerWeek = 7 * 24 * 60 * 60 * 1000;
        const weekCount = blockData.endDate
            ? Math.max(1, Math.ceil((new Date(blockData.endDate) - startDate) / msPerWeek))
            : 1;
        const weeks = Array.from({ length: weekCount }, (_, i) => {
            const wStart = new Date(startDate.getTime() + i * msPerWeek);
            return {
                id: _uid(),
                weekNumber: i + 1,
                startDate: wStart.toISOString().split('T')[0],
                intent: '',
                sessions: [],
            };
        });
        const block = {
            id: _uid(),
            name: blockData.name || 'New Block',
            label: blockData.label || '',
            startDate: blockData.startDate,
            endDate: blockData.endDate,
            color: blockData.color || '#8b5cf6',
            blockType: blockData.blockType || 'General',
            goals: blockData.goals || '',
            modalities: blockData.modalities || {},
            weeks,
        };
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? { ...ph, blocks: [...ph.blocks, block] }
                : ph
            )
        }));
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    const handleUpdatePlanBlock = async (phaseId, blockId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? { ...ph, blocks: ph.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b) }
                : ph
            )
        }));
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    const handleDeletePlanBlock = async (phaseId, blockId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? { ...ph, blocks: ph.blocks.filter(b => b.id !== blockId) }
                : ph
            )
        }));
        setIsPlanBlockModalOpenNew(false);
        setEditingPlanBlock(null);
    };

    const handleUpdateBlockModality = async (phaseId, blockId, modality, value) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, modalities: { ...b.modalities, [modality]: value } }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleUpdatePlanWeek = async (phaseId, blockId, weekId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId ? { ...w, ...updates } : w) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleAddPlanWeek = async (phaseId, blockId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => {
                        if (b.id !== blockId) return b;
                        const lastWeek = b.weeks[b.weeks.length - 1];
                        const nextStart = lastWeek
                            ? new Date(new Date(lastWeek.startDate).getTime() + 7 * 86400000).toISOString().split('T')[0]
                            : b.startDate;
                        const newWeek = {
                            id: _uid(),
                            weekNumber: (lastWeek?.weekNumber || 0) + 1,
                            startDate: nextStart,
                            intent: '',
                            sessions: [],
                        };
                        return { ...b, weeks: [...b.weeks, newWeek] };
                    })
                }
                : ph
            )
        }));
    };

    const handleAddPlanSession = async (phaseId, blockId, weekId, sessionData) => {
        const session = {
            id: _uid(),
            date: sessionData.date,
            name: sessionData.name || 'New Session',
            sections: sessionData.sections || [],
            plannedDuration: sessionData.plannedDuration || null,
            plannedRPE: sessionData.plannedRPE || null,
            load: sessionData.load || null,
            workoutTemplateId: sessionData.workoutTemplateId || null,
            notes: sessionData.notes || '',
        };
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId ? { ...w, sessions: [...w.sessions, session] } : w) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleUpdatePlanSession = async (phaseId, blockId, weekId, sessionId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId
                            ? { ...w, sessions: w.sessions.map(s => s.id === sessionId ? { ...s, ...updates } : s) }
                            : w
                        ) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleDeletePlanSession = async (phaseId, blockId, weekId, sessionId) => {
        await _updateActivePlan(p => ({
            ...p,
            phases: p.phases.map(ph => ph.id === phaseId
                ? {
                    ...ph, blocks: ph.blocks.map(b => b.id === blockId
                        ? { ...b, weeks: b.weeks.map(w => w.id === weekId
                            ? { ...w, sessions: w.sessions.filter(s => s.id !== sessionId) }
                            : w
                        ) }
                        : b
                    )
                }
                : ph
            )
        }));
    };

    const handleAddPlanEvent = async (eventData) => {
        const event = {
            id: _uid(),
            date: eventData.date,
            type: eventData.type || 'custom',
            label: eventData.label || '',
            color: eventData.color,
        };
        await _updateActivePlan(p => ({ ...p, events: [...p.events, event] }));
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    const handleUpdatePlanEvent = async (eventId, updates) => {
        await _updateActivePlan(p => ({
            ...p,
            events: p.events.map(e => e.id === eventId ? { ...e, ...updates } : e)
        }));
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    const handleDeletePlanEvent = async (eventId) => {
        await _updateActivePlan(p => ({
            ...p,
            events: p.events.filter(e => e.id !== eventId)
        }));
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    // --- DATA LOADING ---
    const initData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Keep the JSON wrapper alive for legacy items we haven't migrated yet
            await StorageService.init();

            // 1. Fetch live PostgreSQL data using the Sport Scientist API wrapper
            let dbTeams = [];
            let dbAthletes = [];
            let dbExercises = [];
            let dbSessions = [];
            let dbAssessments = [];
            let allAssessments = []; // All assessments (all types), for attaching to player objects

            try {
                const teamsResult = await DatabaseService.fetchTeams();
                const athletesResult = await DatabaseService.fetchAthletes();
                const sessionsResult = await DatabaseService.fetchSessions();
                const assessmentsResult = await DatabaseService.fetchAssessments();
                // Only fetch 3,242 exercises on first load — skip on subsequent refreshes
                const exercisesResult = exercisesLoadedRef.current
                    ? null
                    : await DatabaseService.fetchExercises();

                // Map snake_case to camelCase
                dbTeams = teamsResult || [];
                dbAthletes = (athletesResult || []).map(a => ({
                    ...a,
                    teamId: a.team_id // Add camelCase version for frontend compat
                }));
                dbExercises = exercisesResult || []; // null means skip (already loaded)
                dbSessions = (sessionsResult || []).map(s => ({
                    ...s,
                    trainingPhase: s.training_phase,
                    targetType: s.target_type,
                    targetId: s.target_id,
                    plannedDuration: s.planned_duration
                }));
                // Keep ALL assessments accessible for attaching to player objects
                allAssessments = assessmentsResult || [];
                // Map KPI assessments into the kpiRecords shape the MAP Calculator expects
                dbAssessments = allAssessments
                    .filter(a => a.test_type === 'kpi')
                    .map(a => ({
                        athleteId: a.athlete_id,
                        id: a.metrics?.id,
                        name: a.metrics?.name,
                        value: a.metrics?.value,
                        unit: a.metrics?.unit,
                        date: a.date,
                        bikeModel: a.metrics?.bikeModel
                    }));
                setKpiRecords(dbAssessments);
            } catch (e) {
                console.warn("Could not fetch DB tables. User might strictly not be authenticated:", e.message);
                // Fallback to mocks only if DB fails
                dbTeams = MOCK_TEAMS;
                dbExercises = MOCK_EXERCISES;
            }

            // 1b. Fetch calendar events + custom event types
            try {
                const calEventsResult = await DatabaseService.fetchCalendarEvents();
                setCalendarEvents(calEventsResult || []);
            } catch (e) {
                console.warn("Could not fetch calendar events:", e.message);
            }
            try {
                const storedCustomTypes = await StorageService.getCustomEventTypes();
                if (storedCustomTypes && storedCustomTypes.length > 0) {
                    setCustomEventTypes(storedCustomTypes);
                }
            } catch (e) {
                console.warn("Could not load custom event types:", e.message);
            }

            // 2. Map strict relational data back into the frontend state shape
            const mappedTeams = dbTeams.map(t => {
                const teamAthletes = dbAthletes.filter(a => a.team_id === t.id || a.teamId === t.id);
                return {
                    ...t,
                    players: teamAthletes.map(a => ({
                        id: a.id,
                        name: a.name,
                        position: a.gender || 'Athlete',
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.name.replace(/\s+/g, '')}`,
                        readiness: 100,
                        status: 'Active',
                        trend: 'stable',
                        teamId: a.team_id || a.teamId,
                        ...a
                    }))
                };
            });

            // 3. Catch independent Private Clients (Athletes with no Team)
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
                        image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${a.name.replace(/\s+/g, '')}`,
                        readiness: 100,
                        status: 'Active',
                        trend: 'stable',
                        ...a
                    }))
                });
            }

            // Attach performance assessments (hamstring, 1rm, dsi, rsi) to each player as
            // performanceMetrics so Reporting Hub and Analytics Hub can read them without
            // additional DB calls. KPI records are excluded (they live in kpiRecords state).
            const perfAssessments = allAssessments.filter(a => a.test_type !== 'kpi');
            mappedTeams.forEach(team => {
                team.players.forEach(player => {
                    player.performanceMetrics = perfAssessments
                        .filter(a => a.athlete_id === player.id)
                        .map(a => ({
                            ...a.metrics,
                            id: a.id,
                            date: a.date,
                            type: a.test_type, // 'hamstring' | '1rm' | 'dsi' | 'rsi'
                        }))
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                });
            });

            setTeams(mappedTeams);

            // 4. Map Exercises — only on first load
            if (!exercisesLoadedRef.current) {
                let finalExercises = dbExercises;
                if (finalExercises.length === 0) {
                    try {
                        const response = await fetch('./exercises_data.json');
                        if (response.ok) {
                            finalExercises = await response.json();
                        } else {
                            finalExercises = MOCK_EXERCISES;
                        }
                    } catch (error) {
                        finalExercises = MOCK_EXERCISES;
                    }
                }
                setExercises(finalExercises.sort((a, b) => a.name.localeCompare(b.name)));
                exercisesLoadedRef.current = true;
            }

            // 5. Load unmigrated Legacy Data (Schedules, Questionnaires)
            const [loadedSessions, loadedQuestionnaires, loadedGps, loadedMedical, loadedTemplates] = await Promise.all([
                StorageService.getSessions(),
                StorageService.getQuestionnaires(),
                StorageService.getGpsData(),
                StorageService.getMedicalReports(),
                StorageService.getWorkoutTemplates()
            ]);

            // Merge Sessions (Database data takes precedence over legacy)
            const mergedSessions = [...dbSessions];
            if (loadedSessions && loadedSessions.length > 0) {
                const dbIds = new Set(dbSessions.map(s => s.id));
                loadedSessions.forEach(ls => {
                    if (!dbIds.has(ls.id)) {
                        mergedSessions.push(ls);
                    }
                });
            }

            setScheduledSessions(mergedSessions);
            setQuestionnaires(loadedQuestionnaires || []);
            setGpsData(loadedGps || []);
            const rawHr = StorageService.getHrData();
            setHrData(Array.isArray(rawHr) ? rawHr : []);
            setMedicalReports(loadedMedical || []);

            // Workout Templates — prefer Supabase DB, fallback to StorageService
            try {
                const dbTemplates = await DatabaseService.fetchWorkoutTemplates();
                if (dbTemplates && dbTemplates.length > 0) {
                    const mapped = dbTemplates.map(t => ({
                        id: t.id,
                        name: t.name,
                        trainingPhase: t.training_phase,
                        load: t.load,
                        sections: t.sections || { warmup: [], workout: [], cooldown: [] },
                        createdAt: t.created_at,
                    }));
                    setWorkoutTemplates(mapped);
                } else if (loadedTemplates && loadedTemplates.length > 0) {
                    // Migrate legacy templates from StorageService to DB
                    setWorkoutTemplates(loadedTemplates);
                    for (const tpl of loadedTemplates) {
                        try {
                            await DatabaseService.createWorkoutTemplate({
                                name: tpl.name,
                                training_phase: tpl.trainingPhase,
                                load: tpl.load,
                                sections: tpl.sections,
                            });
                        } catch (e) {
                            console.warn("Could not migrate template to DB:", e.message);
                        }
                    }
                } else {
                    setWorkoutTemplates([]);
                }
            } catch (e) {
                console.warn("Could not fetch workout templates from DB:", e.message);
                setWorkoutTemplates(loadedTemplates || []);
            }

            // Personal Exercise Library
            const loadedPersonalExercises = await StorageService.getPersonalExercises();
            setPersonalExerciseIds(loadedPersonalExercises || []);

            // Injury Reports — prefer Supabase DB, fallback to StorageService/mocks
            try {
                const dbInjury = await DatabaseService.fetchInjuryReports();
                if (dbInjury && dbInjury.length > 0) {
                    // Map DB rows into frontend shape
                    const mapped = dbInjury.map(r => ({
                        id: r.id,
                        athleteId: r.athlete_id,
                        athleteName: r.athlete_name,
                        teamId: r.team_id,
                        dateOfInjury: r.date_of_injury,
                        ...(r.report_data || {}),
                        createdAt: r.created_at,
                        updatedAt: r.updated_at,
                    }));
                    setInjuryReports(mapped);
                } else {
                    const loadedInjuryReports = await StorageService.getInjuryReports();
                    setInjuryReports(loadedInjuryReports?.length ? loadedInjuryReports : MOCK_INJURY_REPORTS);
                }
            } catch (e) {
                console.warn('Could not load injury reports from DB, using StorageService fallback:', e.message);
                const loadedInjuryReports = await StorageService.getInjuryReports();
                setInjuryReports(loadedInjuryReports?.length ? loadedInjuryReports : MOCK_INJURY_REPORTS);
            }

            // 6. Wellness Templates from Supabase
            try {
                const dbTemplates = await DatabaseService.fetchQuestionnaireTemplates();
                setWellnessTemplates(dbTemplates || []);
            } catch (err) {
                console.error("Error loading wellness templates:", err);
            }

            const loadedWattbike = await StorageService.getWattbikeSessions();
            setWattbikeSessions(prev => {
                if (!loadedWattbike || loadedWattbike.length === 0) return prev;
                const existingIds = new Set(loadedWattbike.map(s => s.id));
                const missingDefaults = prev.filter(s => !existingIds.has(s.id));
                return [...loadedWattbike, ...missingDefaults];
            });

            const loadedConditioning = await StorageService.getConditioningSessions();
            if (loadedConditioning && loadedConditioning.length > 0) setConditioningSessions(loadedConditioning);

            // 6. Load Training & Wellness records from Storage
            const [loadedLoad, loadedWellness, loadedBiometrics, loadedWorkoutLog] = await Promise.all([
                StorageService.getLoadRecords(),
                StorageService.getWellnessData(),
                StorageService.getBiometrics(),
                StorageService.getWorkoutLog()
            ]);
            // Merge local storage load records with Supabase training_loads
            let mergedLoadRecords = loadedLoad || [];
            try {
                const dbTrainingLoads = await DatabaseService.fetchTrainingLoads();
                if (dbTrainingLoads && dbTrainingLoads.length > 0) {
                    // Map DB records to the loadRecords shape used by ACWR_UTILS
                    const mapped = dbTrainingLoads.map(r => ({
                        athleteId: r.athlete_id,
                        athlete_id: r.athlete_id,
                        date: r.date,
                        sRPE: r.metric_type === 'srpe' ? r.value : 0,
                        value: r.value,
                        metric_type: r.metric_type,
                        session_type: r.session_type,
                    }));
                    mergedLoadRecords = [...mergedLoadRecords, ...mapped];
                }
            } catch (e) {
                console.warn("Could not fetch training_loads:", e.message);
            }
            setLoadRecords(mergedLoadRecords);
            setWellnessData(loadedWellness || []);
            setBiometricsRecords(loadedBiometrics || []);
            setWorkoutLog(loadedWorkoutLog || []);

            // 6b. Load Periodization Plans
            try {
                const loadedPlans = await StorageService.getPeriodizationPlans();
                setPeriodizationPlans(loadedPlans || []);
            } catch (e) {
                console.warn("Could not load periodization plans:", e.message);
            }

            // 7. Load Assessments and Evaluations from Database
            const [dbEvaluations, dbMaxHistory] = await Promise.all([
                DatabaseService.fetchAssessments('evaluation'),
                DatabaseService.fetchRmAssessments()
            ]);

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

        } catch (error) {
            console.error("Critical error in initData:", error);
        } finally {
            setIsLoading(false);
        }
    }, [setIsLoading, setTeams, setExercises, setScheduledSessions, setQuestionnaires, setGpsData, setMedicalReports, setWattbikeSessions, setLoadRecords, setWellnessData, setBiometricsRecords, setEvaluationData, setMaxHistory, setWorkoutLog]);

    const handleLoadWellnessResponses = useCallback(async (teamId: string, rangeOrStart?: any, endDate?: string) => {
        if (!teamId || teamId === 'all') return;

        // Convert shortcut string or legacy {start,end} object to actual ISO date strings
        const today = new Date().toISOString().split('T')[0];
        let dateFrom: string | undefined;
        let dateTo: string | undefined = today;

        if (!rangeOrStart) {
            dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
        } else if (typeof rangeOrStart === 'string') {
            if (rangeOrStart === 'today') {
                dateFrom = today;
            } else if (rangeOrStart === '7d') {
                dateFrom = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
            } else if (rangeOrStart === '30d') {
                dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
            } else {
                dateFrom = rangeOrStart;
                dateTo = endDate ?? today;
            }
        } else if (typeof rangeOrStart === 'object' && rangeOrStart.start) {
            dateFrom = rangeOrStart.start;
            dateTo = rangeOrStart.end ?? today;
        }

        setIsLoading(true);
        try {
            const records = await DatabaseService.fetchWellnessResponses(teamId, dateFrom, dateTo);
            setWellnessResponses(records || []);
        } catch (err) {
            console.error("Error loading wellness responses:", err);
            showToast("Failed to load wellness data", "error");
        } finally {
            setIsLoading(false);
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
        isPerformanceLabOpen,
        setIsPerformanceLabOpen,
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
        // Calendar events
        calendarEvents,
        isAddEventModalOpen,
        setIsAddEventModalOpen,
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
        editingPlanPhase,
        setEditingPlanPhase,
        editingPlanBlock,
        setEditingPlanBlock,
        editingPlanEvent,
        setEditingPlanEvent,
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
        handleAddPlanSession,
        handleUpdatePlanSession,
        handleDeletePlanSession,
        handleAddPlanEvent,
        handleUpdatePlanEvent,
        handleDeletePlanEvent,
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
