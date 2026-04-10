// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    AlertTriangleIcon, CalendarIcon, FilterIcon,
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, PlusIcon, CheckCircle2Icon,
    MapPinIcon, PencilIcon, Trash2Icon, XIcon, ClockIcon, CheckIcon,
    Activity as ActivityIcon, Timer as TimerIcon, Dumbbell as DumbbellIcon, Link2 as Link2Icon, EyeIcon,
} from 'lucide-react';
import InterventionModal from '../components/analytics/InterventionModal';
import { DatabaseService } from '../services/databaseService';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { computeComposite, computeAthleteBaseline, scoreToHex } from '../utils/wellnessScoring';

// ── Constants for Edit Event Modal ────────────────────────────────────
const DEFAULT_EVENT_TYPES = [
    { label: 'Appointment', color: '#3b82f6' },
    { label: 'Meeting', color: '#6366f1' },
    { label: 'Note', color: '#64748b' },
];
const PRESET_COLORS = [
    '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
    '#ec4899', '#8b5cf6', '#ef4444', '#64748b',
];

export const DashboardPage = () => {
    const {
        teams, scheduledSessions, setScheduledSessions, wellnessData, wellnessResponses, bodyHeatmapData, isLoading,
        dashboardFilterTarget, setDashboardFilterTarget,
        calendarFilterCategory, setCalendarFilterCategory,
        calendarFilterTeamId, setCalendarFilterTeamId,
        calendarFilterAthleteId, setCalendarFilterAthleteId,
        heatmapTeamFilter, setHeatmapTeamFilter,
        dashboardCalendarDate, setDashboardCalendarDate, dashboardCalendarDays,
        setIsAddEventModalOpen,
        calendarEvents,
        handleUpdateCalendarEvent,
        handleDeleteCalendarEvent,
        customEventTypes,
        setViewingDate, setViewingSession,
        setSelectedInterventionAthlete, setIsInterventionModalOpen,
        isInterventionModalOpen, selectedInterventionAthlete,
        loadRecords, acwrSettings, acwrExclusions, getAthleteAcwrOptions,
        calculateACWR, resolveTargetName, getSessionTypeColor,
        handleUpdateSession, handleDeleteSession, handleAddCalendarEvent, showToast,
    } = useAppState();

    // Check if any ACWR monitoring is enabled
    const hasAnyAcwrEnabled = Object.values(acwrSettings || {}).some((s: any) => s?.enabled);

    // Build set of ACWR-enabled athlete IDs
    const acwrEnabledAthleteIds = React.useMemo(() => {
        const ids = new Set<string>();
        if (!acwrSettings) return ids;
        teams.forEach(t => {
            if (t.id === 't_private') {
                // Private clients: check individual settings
                (t.players || []).forEach(p => {
                    if (acwrSettings[`ind_${p.id}`]?.enabled) ids.add(p.id);
                });
            } else if (acwrSettings[t.id]?.enabled) {
                (t.players || []).forEach(p => ids.add(p.id));
            }
        });
        return ids;
    }, [acwrSettings, teams]);

    const [activePopover, setActivePopover] = React.useState(null);
    const [isMorningReportExpanded, setIsMorningReportExpanded] = React.useState(false);
    const [activeSessionPopover, setActiveSessionPopover] = React.useState(null); // { id, session }
    const [completingSession, setCompletingSession] = React.useState(null);
    const [confirmDeleteItem, setConfirmDeleteItem] = React.useState<{ type: 'session' | 'event'; id: string; name: string } | null>(null);

    const handleCompleteSession = async (sessionId, actualResults, actualRpe) => {
        try {
            await DatabaseService.completeSession(sessionId, actualResults, actualRpe);
            setScheduledSessions(prev => prev.map(s =>
                s.id === sessionId ? { ...s, status: 'Completed', actual_results: actualResults, actual_rpe: actualRpe } : s
            ));
            showToast('Session completed');
        } catch (err) {
            showToast(err.message || 'Failed to complete session');
        } finally {
            setCompletingSession(null);
        }
    };

    const resolveSessionAthletes = (session) => {
        if (session?.targetType === 'Individual') {
            const player = teams.flatMap(t => t.players || []).find(p => p.id === session.targetId);
            return player ? [player] : [];
        }
        const team = teams.find(t => t.id === session?.targetId);
        return team?.players || [];
    };
    const [editingSession, setEditingSession] = React.useState(null);
    const [editingEvent, setEditingEvent] = React.useState(null);
    const [overflowDay, setOverflowDay] = React.useState(null); // dateStr of day showing overflow popover
    const [dragOverDate, setDragOverDate] = React.useState(null); // highlight drop target
    const popoverRef = React.useRef(null);
    const sessionPopoverRef = React.useRef(null);
    const overflowRef = React.useRef(null);
    const dragDataRef = React.useRef(null); // { type: 'session'|'event', item, sourceDate }

    // ── Drag & Drop handlers ──────────────────────────────────────────
    const handleDragStart = (e, type, item, sourceDate) => {
        dragDataRef.current = { type, item, sourceDate };
        e.dataTransfer.effectAllowed = 'copyMove';
        e.dataTransfer.setData('text/plain', ''); // required for Firefox
    };
    const handleDragOver = (e, dateStr) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        if (dragOverDate !== dateStr) setDragOverDate(dateStr);
    };
    const handleDragLeave = () => setDragOverDate(null);
    const handleDrop = async (e, targetDate) => {
        e.preventDefault();
        setDragOverDate(null);
        const drag = dragDataRef.current;
        if (!drag || drag.sourceDate === targetDate) return;
        dragDataRef.current = null;

        if (e.ctrlKey && drag.type === 'event') {
            // Ctrl+drop = copy event
            const ev = drag.item;
            await handleAddCalendarEvent({
                title: ev.title,
                event_type: ev.event_type,
                color: ev.color,
                description: ev.description || null,
                location: ev.location || null,
                all_day: ev.all_day,
                start_time: ev.start_time || null,
                end_time: ev.end_time || null,
                start_date: targetDate,
                end_date: targetDate,
            });
            showToast('Event copied', 'success');
        } else if (drag.type === 'event') {
            handleUpdateCalendarEvent(drag.item.id, { start_date: targetDate, end_date: targetDate });
        } else if (drag.type === 'session') {
            handleUpdateSession(drag.item.id, { date: targetDate });
        }
    };
    const handleDragEnd = () => { dragDataRef.current = null; setDragOverDate(null); };

    // Deterministic color palette for targets (athletes/teams)
    const TARGET_COLORS = [
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', pillBg: 'bg-red-100' },
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', pillBg: 'bg-blue-100' },
        { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', pillBg: 'bg-emerald-100' },
        { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', pillBg: 'bg-orange-100' },
        { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', pillBg: 'bg-violet-100' },
        { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700', pillBg: 'bg-pink-100' },
        { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', pillBg: 'bg-cyan-100' },
        { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', pillBg: 'bg-amber-100' },
        { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700', pillBg: 'bg-lime-100' },
        { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', pillBg: 'bg-rose-100' },
    ];

    // Build stable targetId → color index mapping from all sessions
    const targetColorMap = React.useMemo(() => {
        const map = new Map();
        const uniqueTargets = [...new Set(scheduledSessions.map(s => s.targetId))];
        uniqueTargets.forEach((id, i) => { map.set(id, TARGET_COLORS[i % TARGET_COLORS.length]); });
        return map;
    }, [scheduledSessions]);

    const getTargetColor = (targetId) => targetColorMap.get(targetId) || TARGET_COLORS[0];

    // Close popover on click outside
    React.useEffect(() => {
        if (!activePopover && !activeSessionPopover && !overflowDay) return;
        const handler = (e) => {
            if (activePopover && popoverRef.current && !popoverRef.current.contains(e.target)) {
                setActivePopover(null);
                setEditingEvent(null);
            }
            if (activeSessionPopover && sessionPopoverRef.current && !sessionPopoverRef.current.contains(e.target)) {
                setActiveSessionPopover(null);
            }
            if (overflowDay && overflowRef.current && !overflowRef.current.contains(e.target)) {
                setOverflowDay(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activePopover, activeSessionPopover, overflowDay]);

    const renderMorningReport = () => {
        // Show empty state when ACWR is not enabled
        if (!hasAnyAcwrEnabled) return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                        <AlertTriangleIcon size={14} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-slate-900">Morning Report</h3>
                        <p className="text-[10px] text-slate-500">ACWR readiness</p>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <p className="text-xs text-slate-400">No ACWR monitoring enabled.</p>
                    <p className="text-[10px] text-slate-300 mt-1">Enable ACWR for your teams in Settings → Feature Settings to see the morning readiness report.</p>
                </div>
            </div>
        );

        // Active at-risk athletes
        const activeAtRisk = teams.flatMap(t => t.players)
            .filter(player => acwrEnabledAthleteIds.has(player.id))
            .filter(player => !acwrExclusions?.[player.id]?.excluded)
            .map(player => {
                const acwr = parseFloat(calculateACWR(player.id));
                let riskLevel = 'Stable';
                const ex = acwrExclusions?.[player.id];
                const isReturning = ex?.returnDate && !ex.excluded && ((Date.now() - new Date(ex.returnDate + 'T00:00:00').getTime()) / 86400000) <= 7;
                if (acwr > 1.5) riskLevel = 'Critical';
                else if (acwr > 1.3) riskLevel = 'Warning';
                else if (acwr < 0.8 && acwr > 0) riskLevel = 'Warning';
                else if (isReturning) riskLevel = 'Warning';
                return { ...player, riskLevel, acwr, isReturning, isInjured: false };
            }).filter(p => p.riskLevel !== 'Stable').sort((a, b) => b.acwr - a.acwr);

        // Injured/excluded athletes (at the bottom)
        const injuredAthletes = teams.flatMap(t => t.players)
            .filter(player => acwrEnabledAthleteIds.has(player.id))
            .filter(player => acwrExclusions?.[player.id]?.excluded)
            .map(player => ({ ...player, riskLevel: 'Injured', acwr: 0, isReturning: false, isInjured: true }));

        const atRiskAthletes = [...activeAtRisk, ...injuredAthletes];
        const totalCount = atRiskAthletes.length;

        const visible = atRiskAthletes.slice(0, 5);
        const remaining = atRiskAthletes.length - 5;

        const renderCompactRow = (player, onClick) => {
            const initials = player.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const isInjured = player.isInjured;
            const acwrColor = isInjured ? 'text-slate-400' : player.acwr > 1.5 ? 'text-rose-600' : player.acwr > 1.3 ? 'text-amber-600' : 'text-sky-600';
            const bgColor = isInjured ? 'bg-slate-200 text-slate-500' : player.acwr > 1.5 ? 'bg-rose-100 text-rose-700' : player.acwr > 1.3 ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700';
            const borderColor = isInjured ? 'border-l-slate-400' : player.acwr > 1.5 ? 'border-l-rose-500' : player.acwr > 1.3 ? 'border-l-amber-400' : 'border-l-sky-400';
            return (
                <div key={player.id}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-l-[3px] ${borderColor} ${isInjured ? 'bg-slate-50/80 opacity-70' : 'bg-slate-50/50'} hover:bg-white hover:shadow-sm transition-all cursor-pointer`}
                    onClick={onClick}
                >
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 ${bgColor}`}>
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className="text-[12px] font-medium text-slate-900 truncate">{player.name}</h4>
                    </div>
                    {isInjured ? (
                        <span className="text-[10px] font-semibold text-slate-400 italic shrink-0">Injured</span>
                    ) : (
                        <div className={`text-sm font-bold ${acwrColor} shrink-0`}>{player.acwr.toFixed(2)}</div>
                    )}
                </div>
            );
        };

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-4 py-3 border-b border-slate-100 bg-rose-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <AlertTriangleIcon size={14} />
                        </div>
                        <div>
                            <h3 className="text-[13px] font-semibold text-slate-900">Morning Report</h3>
                            <p className="text-[10px] text-slate-500">ACWR readiness</p>
                        </div>
                    </div>
                    <span className="px-2 py-0.5 bg-white border border-rose-200 rounded-full text-[10px] font-medium text-rose-600 shrink-0">{atRiskAthletes.length}</span>
                </div>
                <div className="p-2.5 space-y-1.5 flex-1 overflow-y-auto">
                    {atRiskAthletes.length > 0 ? (
                        <>
                            {visible.map(player => renderCompactRow(player, () => {
                                setSelectedInterventionAthlete(player);
                                setIsInterventionModalOpen(true);
                            }))}
                            {remaining > 0 && (
                                <button
                                    onClick={() => setIsMorningReportExpanded(true)}
                                    className="w-full py-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                >
                                    +{remaining} more athlete{remaining > 1 ? 's' : ''}
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-300 gap-2">
                            {(loadRecords || []).length === 0 ? (
                                <>
                                    <AlertTriangleIcon size={22} className="text-slate-300" />
                                    <p className="text-[11px] text-slate-400 text-center">No training load data recorded yet.</p>
                                    <p className="text-[10px] text-slate-300 text-center">Log sessions or import CSV data in the ACWR Monitoring hub to see the morning readiness report.</p>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2Icon size={28} className="text-emerald-400/40" />
                                    <p className="text-[11px] text-slate-400">All monitored athletes within safe range</p>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Expanded popup showing all at-risk athletes */}
                {isMorningReportExpanded && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMorningReportExpanded(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-5 py-4 border-b border-slate-100 bg-rose-50/60 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">All At-Risk Athletes</h3>
                                    <p className="text-[10px] text-slate-500">Click an athlete to see their risk analysis</p>
                                </div>
                                <button onClick={() => setIsMorningReportExpanded(false)} className="p-1.5 hover:bg-white/60 rounded-lg">
                                    <XIcon size={16} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
                                {atRiskAthletes.map(player => renderCompactRow(player, () => {
                                    setSelectedInterventionAthlete(player);
                                    setIsInterventionModalOpen(true);
                                    setIsMorningReportExpanded(false);
                                }))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Build list of athlete IDs in selected team for filtering
    const selectedTeamPlayerIds = React.useMemo(() => {
        if (!calendarFilterTeamId) return [];
        const team = teams.find(t => t.id === calendarFilterTeamId);
        return team ? team.players.map(p => p.id) : [];
    }, [calendarFilterTeamId, teams]);

    const filteredSessionsForCalendar = scheduledSessions.filter(s => {
        if (calendarFilterCategory === 'all') return true;
        if (calendarFilterCategory === 'trainer') return false; // trainer events only, no sessions
        if (calendarFilterCategory === 'teams') {
            if (s.targetType !== 'Team') return false;
            return !calendarFilterTeamId || s.targetId === calendarFilterTeamId;
        }
        if (calendarFilterCategory === 'athletes') {
            if (calendarFilterAthleteId) {
                return s.targetId === calendarFilterAthleteId;
            }
            if (calendarFilterTeamId) {
                return s.targetId === calendarFilterTeamId || selectedTeamPlayerIds.includes(s.targetId);
            }
            return true;
        }
        return true;
    });

    const showCalendarEvents = calendarFilterCategory === 'all' || calendarFilterCategory === 'trainer';

    // Filter label for display
    const calendarFilterLabel = React.useMemo(() => {
        if (calendarFilterCategory === 'all') return 'All';
        if (calendarFilterCategory === 'trainer') return 'Trainer Events';
        if (calendarFilterCategory === 'teams') {
            if (calendarFilterTeamId) {
                const t = teams.find(t => t.id === calendarFilterTeamId);
                return t ? t.name : 'All Teams';
            }
            return 'All Teams';
        }
        if (calendarFilterCategory === 'athletes') {
            if (calendarFilterAthleteId) {
                const team = teams.find(t => t.players.some(p => p.id === calendarFilterAthleteId));
                const player = team?.players.find(p => p.id === calendarFilterAthleteId);
                return player ? player.name : 'All Athletes';
            }
            if (calendarFilterTeamId) {
                const t = teams.find(t => t.id === calendarFilterTeamId);
                return t ? `${t.name} Athletes` : 'All Athletes';
            }
            return 'All Athletes';
        }
        return 'All';
    }, [calendarFilterCategory, calendarFilterTeamId, calendarFilterAthleteId, teams]);

                return (<>
                    <div className="space-y-6 animate-in fade-in duration-700">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Morning Readiness Report Column */}
                            <div data-tour="morning-report" className="lg:col-span-1 relative">
                                {isLoading && (
                                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                                        <div className="px-4 py-3 border-b border-slate-100 bg-rose-50/60 flex items-center gap-2.5">
                                            <div className="w-8 h-8 bg-rose-200 rounded-lg animate-pulse" />
                                            <div className="space-y-1">
                                                <div className="h-3 w-24 bg-rose-100 rounded animate-pulse" />
                                                <div className="h-2 w-16 bg-rose-50 rounded animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="p-2.5 space-y-1.5 flex-1">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-50/50">
                                                    <div className="w-7 h-7 rounded-md bg-slate-100 animate-pulse" />
                                                    <div className="flex-1 h-3 bg-slate-100 rounded animate-pulse" />
                                                    <div className="w-8 h-4 bg-slate-100 rounded animate-pulse" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex flex-col items-center py-4">
                                            <div className="w-5 h-5 border-2 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-1.5" />
                                            <span className="text-[10px] font-medium text-slate-400">Loading morning performance report...</span>
                                        </div>
                                    </div>
                                )}
                                {!isLoading && renderMorningReport()}
                            </div>

                            {/* Main Dashboard Actions Column */}
                            <div className="lg:col-span-2">
                                {/* Squad Readiness Heatmap */}
                                <div data-tour="heatmap" className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-full flex flex-col">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-900">
                                            {dashboardFilterTarget === 'All Athletes' ? 'Squad Readiness Heatmap' : 'Individual Readiness Heatmap'}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {dashboardFilterTarget === 'All Athletes' ? 'Daily team energy & stress distribution' : `Deep-dive performance readiness — ${dashboardFilterTarget}`}
                                        </p>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex justify-between items-end border-t border-slate-100 pt-3">
                                        <div className="flex-1">
                                            {dashboardFilterTarget === 'All Athletes' && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-medium text-slate-500">Team filter</label>
                                                    <div className="relative group/filter max-w-[180px]">
                                                        <select value={heatmapTeamFilter} onChange={(e) => setHeatmapTeamFilter(e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none appearance-none pr-8 hover:border-slate-300 transition-all cursor-pointer"
                                                        >
                                                            <option>All Teams</option>
                                                            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                                        </select>
                                                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                            <ChevronDownIcon size={12} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 text-right">
                                            <div className="flex gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[10px] text-slate-400">Optimal</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div><span className="text-[10px] text-slate-400">Fatigue</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div><span className="text-[10px] text-slate-400">Overreaching</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div><span className="text-[10px] text-slate-400">High Risk</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-2 relative">
                                        {isLoading && (
                                            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 rounded-lg col-span-full">
                                                <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                                <span className="text-[10px] font-medium text-slate-400">Loading squad readiness heatmap...</span>
                                            </div>
                                        )}
                                        {(() => {
                                            // Build per-athlete baselines from wellnessResponses (daily tier only)
                                            const dailyResponses = (wellnessResponses || []).filter(r => !r.tier || r.tier === 'daily');
                                            const baselineMap = new Map();
                                            const groupedByAthlete = new Map();
                                            for (const r of dailyResponses) {
                                                const aid = r.athlete_id || r.athleteId;
                                                if (!aid || !r.responses) continue;
                                                if (!groupedByAthlete.has(aid)) groupedByAthlete.set(aid, []);
                                                groupedByAthlete.get(aid).push(r.responses);
                                            }
                                            for (const [aid, respObjects] of groupedByAthlete.entries()) {
                                                baselineMap.set(aid, computeAthleteBaseline(respObjects));
                                            }

                                            // Get most recent daily response per athlete
                                            const latestByAthlete = new Map();
                                            for (const r of [...dailyResponses].sort((a, b) =>
                                                (a.session_date || a.date || '').localeCompare(b.session_date || b.date || ''))) {
                                                const aid = r.athlete_id || r.athleteId;
                                                if (aid) latestByAthlete.set(aid, r);
                                            }

                                            return teams.flatMap(team => team.players.map(p => ({ ...p, teamName: team.name })))
                                                .filter(p => heatmapTeamFilter === 'All Teams' || p.teamName === heatmapTeamFilter)
                                                .sort((a, b) => {
                                                    const rA = latestByAthlete.get(a.id);
                                                    const rB = latestByAthlete.get(b.id);
                                                    const sA = rA ? (computeComposite(rA.responses || {}, baselineMap.get(a.id)) ?? 5) : 5;
                                                    const sB = rB ? (computeComposite(rB.responses || {}, baselineMap.get(b.id)) ?? 5) : 5;
                                                    return sA - sB; // ascending: worst first (most attention needed)
                                                })
                                                .map(p => {
                                                    const isSelected = dashboardFilterTarget === 'All Athletes' || p.name === dashboardFilterTarget;
                                                    const isStrictFocus = p.name === dashboardFilterTarget;
                                                    const lastR = latestByAthlete.get(p.id);
                                                    const score = lastR
                                                        ? (computeComposite(lastR.responses || {}, baselineMap.get(p.id)) ?? null)
                                                        : null;
                                                    const dotColor = scoreToHex(score);
                                                    const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                                                    const scoreLabel = score !== null ? `${score.toFixed(1)}/10` : 'No data';
                                                    const dateLabel = lastR ? (lastR.session_date || lastR.date || '').split('T')[0] : '—';

                                                    return (
                                                        <div key={p.id} className={`group relative transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-20 scale-90 grayscale'}`}>
                                                            <div onClick={() => setDashboardFilterTarget(isStrictFocus ? 'All Athletes' : p.name)}
                                                                style={{ backgroundColor: dotColor }}
                                                                className={`aspect-square rounded-xl shadow-sm border-2 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center ${isStrictFocus ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-white'}`}
                                                            >
                                                                <span className="text-[10px] font-semibold text-white mix-blend-overlay opacity-80">{initials}</span>
                                                            </div>
                                                            <div className={`absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-medium px-2.5 py-2 rounded-lg whitespace-nowrap transition-all z-10 shadow-xl flex flex-col items-center gap-1 border border-slate-700 ${isStrictFocus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                                                                <div className="text-slate-400 leading-none mb-0.5 text-[9px]">{p.teamName}</div>
                                                                <div>{p.name}</div>
                                                                <div className="flex gap-2 text-slate-400">
                                                                    <span>Readiness: {scoreLabel}</span>
                                                                    <span className="w-px h-2 bg-slate-700"></span>
                                                                    <span>{dateLabel}</span>
                                                                </div>
                                                            </div>
                                                            {isStrictFocus && <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[8px] font-medium text-indigo-600">Focus</div>}
                                                        </div>
                                                    );
                                                });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Full Size Calendar */}
                        <div data-tour="calendar" className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                            {/* Calendar Header */}
                            <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3 bg-white">
                                <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
                                            <CalendarIcon size={16} />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-base font-semibold text-slate-900">
                                                {dashboardCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                            </h3>
                                            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                                                <button onClick={() => {
                                                    const newDate = new Date(dashboardCalendarDate);
                                                    newDate.setMonth(newDate.getMonth() - 1);
                                                    setDashboardCalendarDate(newDate);
                                                }} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all">
                                                    <ChevronLeftIcon size={14} className="text-slate-600" />
                                                </button>
                                                <button onClick={() => {
                                                    const newDate = new Date(dashboardCalendarDate);
                                                    newDate.setMonth(newDate.getMonth() + 1);
                                                    setDashboardCalendarDate(newDate);
                                                }} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all">
                                                    <ChevronRightIcon size={14} className="text-slate-600" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-slate-500">{calendarFilterLabel}</p>
                                        </div>
                                    </div>

                                    {/* Cascading Filter Dropdowns + Add Event */}
                                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                                        {/* Category Filter */}
                                        <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 relative">
                                            <FilterIcon size={13} className="text-slate-400" />
                                            <select value={calendarFilterCategory} onChange={(e) => {
                                                setCalendarFilterCategory(e.target.value);
                                                setCalendarFilterTeamId(null);
                                                setCalendarFilterAthleteId(null);
                                            }}
                                                className="bg-transparent text-xs text-slate-600 outline-none appearance-none pr-4 cursor-pointer font-medium"
                                            >
                                                <option value="all">All</option>
                                                <option value="teams">Teams</option>
                                                <option value="athletes">Athletes</option>
                                                <option value="trainer">Trainer Events</option>
                                            </select>
                                            <ChevronDownIcon size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>

                                        {/* Team Filter — shown for 'teams' category */}
                                        {calendarFilterCategory === 'teams' && (
                                            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 relative">
                                                <select value={calendarFilterTeamId || ''} onChange={(e) => {
                                                    setCalendarFilterTeamId(e.target.value || null);
                                                }}
                                                    className="bg-transparent text-xs text-slate-600 outline-none appearance-none pr-4 cursor-pointer"
                                                >
                                                    <option value="">All Teams</option>
                                                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                                <ChevronDownIcon size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                            </div>
                                        )}

                                        {/* Athletes: Team picker then athlete picker */}
                                        {calendarFilterCategory === 'athletes' && (
                                            <>
                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 relative">
                                                    <select value={calendarFilterTeamId || ''} onChange={(e) => {
                                                        setCalendarFilterTeamId(e.target.value || null);
                                                        setCalendarFilterAthleteId(null);
                                                    }}
                                                        className="bg-transparent text-xs text-slate-600 outline-none appearance-none pr-4 cursor-pointer"
                                                    >
                                                        <option value="">All Teams</option>
                                                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                    </select>
                                                    <ChevronDownIcon size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 relative">
                                                    <UserIcon size={12} className="text-slate-400" />
                                                    <select value={calendarFilterAthleteId || ''} onChange={(e) => setCalendarFilterAthleteId(e.target.value || null)}
                                                        className="bg-transparent text-xs text-slate-600 outline-none appearance-none pr-4 cursor-pointer"
                                                    >
                                                        <option value="">All Athletes</option>
                                                        {(calendarFilterTeamId
                                                            ? (teams.find(t => t.id === calendarFilterTeamId)?.players || [])
                                                            : teams.flatMap(t => t.players)
                                                        ).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                    </select>
                                                    <ChevronDownIcon size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                </div>
                                            </>
                                        )}

                                        <button onClick={() => setIsAddEventModalOpen(true)}
                                            className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-1.5 hover:bg-indigo-700 transition-colors"
                                        >
                                            <PlusIcon size={13} /> Add Event
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 relative">
                                {/* Calendar loading skeleton */}
                                {isLoading && (!calendarEvents || calendarEvents.length === 0) && (
                                    <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-lg">
                                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                        <span className="text-xs font-medium text-slate-400">Loading calendar...</span>
                                    </div>
                                )}
                                <div className="grid grid-cols-7 gap-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-[11px] font-medium text-slate-400 text-center pb-3">{day}</div>
                                    ))}
                                    {dashboardCalendarDays.map((dateObj, idx) => {
                                        const isToday = dateObj && dateObj.dateStr === new Date().toLocaleDateString('en-CA');
                                        const calendarRow = Math.floor(idx / 7);
                                        const totalRows = Math.ceil(dashboardCalendarDays.length / 7);
                                        const isBottomRows = calendarRow >= totalRows - 2;
                                        const isDragOver = dateObj && dragOverDate === dateObj.dateStr;
                                        return (
                                            <div key={idx}
                                                onDragOver={dateObj ? (e) => handleDragOver(e, dateObj.dateStr) : undefined}
                                                onDragLeave={dateObj ? handleDragLeave : undefined}
                                                onDrop={dateObj ? (e) => handleDrop(e, dateObj.dateStr) : undefined}
                                                className={`relative min-h-[96px] rounded-lg border transition-all duration-200 ease-out group p-2.5 flex flex-col justify-between ${dateObj
                                                    ? 'hover:shadow-md cursor-pointer'
                                                    : 'bg-slate-50/30 border-transparent'} ${isDragOver
                                                        ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-300 shadow-lg scale-[1.02]'
                                                        : isToday
                                                        ? 'bg-indigo-50 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                                                        : 'bg-white border-slate-100 hover:border-slate-300'}`}
                                                onClick={() => dateObj && setViewingDate(dateObj.dateStr)}>
                                                {dateObj && (
                                                    <>
                                                        <div className="flex justify-between items-start mb-1.5">
                                                            <span className={`text-xs font-medium transition-colors ${isToday ? 'text-indigo-700' : 'text-slate-400 group-hover:text-slate-800'}`}>{dateObj.day}</span>
                                                            {isToday && <span className="text-[9px] font-medium bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">Today</span>}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {/* Merged sessions + events, sorted by time */}
                                                            {(() => {
                                                                const daySessions = filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr)
                                                                    .map(s => ({ type: 'session' as const, time: s.time || '99:99', item: s }));
                                                                const dayEvents = showCalendarEvents
                                                                    ? (calendarEvents || []).filter(e => e.start_date === dateObj.dateStr)
                                                                        .map(e => ({ type: 'event' as const, time: e.all_day ? '00:00' : (e.start_time || '99:99'), item: e }))
                                                                    : [];
                                                                const merged = [...daySessions, ...dayEvents]
                                                                    .sort((a, b) => a.time.localeCompare(b.time))
                                                                    .slice(0, 3);
                                                                return merged.map(entry => {
                                                                    if (entry.type === 'session') {
                                                                        const session = entry.item;
                                                                        const tc = getTargetColor(session.targetId);
                                                                        return (
                                                                <div key={session.id} className="relative"
                                                                    draggable
                                                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'session', session, dateObj.dateStr); }}
                                                                    onDragEnd={handleDragEnd}
                                                                >
                                                                <div
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const popKey = session.id;
                                                                        setActiveSessionPopover(activeSessionPopover?.id === popKey ? null : { id: popKey, session });
                                                                        setActivePopover(null);
                                                                    }}
                                                                    className={`flex flex-col gap-0.5 p-1.5 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-grab ${tc.bg} ${tc.border} ${tc.text}`}>
                                                                    <div className={`flex justify-between items-center ${tc.pillBg} px-1 py-0.5 rounded`}>
                                                                        <div className="flex items-center gap-1">
                                                                            {session.session_type === 'wattbike' && <ActivityIcon size={7} className="text-emerald-600" />}
                                                                            {session.session_type === 'conditioning' && <TimerIcon size={7} className="text-orange-500" />}
                                                                            {(!session.session_type || session.session_type === 'workout') && <DumbbellIcon size={7} />}
                                                                            <span className="text-[8px] font-medium uppercase tracking-wide">{session.trainingPhase}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            {(session.linked_sessions?.length > 0) && <Link2Icon size={7} className="opacity-60" title="Has linked sessions" />}
                                                                            {session.load && (
                                                                                <span className={`text-[7px] font-bold uppercase px-1 py-px rounded ${
                                                                                    session.load === 'High' ? 'bg-red-500 text-white' :
                                                                                    session.load === 'Medium' ? 'bg-amber-400 text-white' :
                                                                                    'bg-emerald-400 text-white'
                                                                                }`}>{session.load[0]}</span>
                                                                            )}
                                                                            {session.targetType === 'Individual' && <UserIcon size={7} />}
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-0.5">
                                                                        <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                        <div className="text-[8px] opacity-70 truncate mt-0.5">
                                                                            {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                            {resolveTargetName(session.targetId, session.targetType)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {/* Session Popover */}
                                                                {activeSessionPopover?.id === session.id && (
                                                                    <div
                                                                        ref={sessionPopoverRef}
                                                                        className={`absolute z-50 left-0 w-56 bg-white rounded-lg shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 ${isBottomRows ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <div className={`h-1 rounded-t-lg ${tc.bg === 'bg-red-50' ? 'bg-red-400' : tc.bg === 'bg-blue-50' ? 'bg-blue-400' : tc.bg === 'bg-emerald-50' ? 'bg-emerald-400' : tc.bg === 'bg-orange-50' ? 'bg-orange-400' : tc.bg === 'bg-violet-50' ? 'bg-violet-400' : 'bg-indigo-400'}`} />
                                                                        <div className="p-3 space-y-2">
                                                                            <div className="flex items-start justify-between">
                                                                                <h4 className="text-sm font-semibold text-slate-900 leading-tight">{session.title}</h4>
                                                                                <button onClick={() => setActiveSessionPopover(null)} className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors">
                                                                                    <XIcon size={12} />
                                                                                </button>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-600">{session.trainingPhase}</span>
                                                                                {session.load && (
                                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                                                                                        session.load === 'High' ? 'bg-red-50 text-red-600' :
                                                                                        session.load === 'Medium' ? 'bg-amber-50 text-amber-600' :
                                                                                        'bg-emerald-50 text-emerald-600'
                                                                                    }`}>{session.load} Load</span>
                                                                                )}
                                                                                {session.status && session.status !== 'Scheduled' && (
                                                                                    <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500">{session.status}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 space-y-1">
                                                                                <div>
                                                                                    {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                    {new Date(session.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                                </div>
                                                                                <div>{resolveTargetName(session.targetId, session.targetType)}</div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                                                                <button
                                                                                    onClick={() => { setViewingSession(session); setActiveSessionPopover(null); }}
                                                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                                                >
                                                                                    <EyeIcon size={10} /> View
                                                                                </button>
                                                                                {session.status !== 'Completed' && (
                                                                                    <button
                                                                                        onClick={() => { setCompletingSession(session); setActiveSessionPopover(null); }}
                                                                                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                                                    >
                                                                                        <CheckCircle2Icon size={10} /> Complete
                                                                                    </button>
                                                                                )}
                                                                                <button
                                                                                    onClick={() => { setEditingSession({ ...session }); setActiveSessionPopover(null); }}
                                                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                                                >
                                                                                    <PencilIcon size={10} /> Edit
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => {
                                                                                        setConfirmDeleteItem({ type: 'session', id: session.id, name: session.title || 'this session' });
                                                                                        setActiveSessionPopover(null);
                                                                                    }}
                                                                                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                >
                                                                                    <Trash2Icon size={10} /> Delete
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                                </div>
                                                                        );
                                                                    } else {
                                                                        const event = entry.item;
                                                                        return (
                                                                    <div key={`${event.id}_${dateObj.dateStr}`} className="relative"
                                                                        draggable
                                                                        onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'event', event, dateObj.dateStr); }}
                                                                        onDragEnd={handleDragEnd}
                                                                    >
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const popKey = `${event.id}_${dateObj.dateStr}`;
                                                                                setActivePopover(activePopover?.id === popKey ? null : { id: popKey, event });
                                                                                setEditingEvent(null);
                                                                            }}
                                                                            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-grab"
                                                                            style={{
                                                                                backgroundColor: `${event.color}12`,
                                                                                borderColor: `${event.color}30`,
                                                                            }}
                                                                        >
                                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                                                                            <span className="text-[9px] font-medium leading-tight truncate" style={{ color: event.color }}>
                                                                                {!event.all_day && event.start_time && (
                                                                                    <span className="font-semibold">{event.start_time} </span>
                                                                                )}
                                                                                {event.title}
                                                                            </span>
                                                                        </div>
                                                                        {/* Event Popover */}
                                                                        {activePopover?.id === `${event.id}_${dateObj.dateStr}` && (
                                                                            <div
                                                                                ref={popoverRef}
                                                                                className={`absolute z-50 left-0 w-56 bg-white rounded-lg shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 ${isBottomRows ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {/* Color accent bar */}
                                                                                <div className="h-1 rounded-t-lg" style={{ backgroundColor: event.color }} />
                                                                                <div className="p-3 space-y-2">
                                                                                    <div className="flex items-start justify-between">
                                                                                        <h4 className="text-sm font-semibold text-slate-900 leading-tight">{event.title}</h4>
                                                                                        <button onClick={() => { setActivePopover(null); }} className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors">
                                                                                            <XIcon size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                    <span
                                                                                        className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold"
                                                                                        style={{ backgroundColor: `${event.color}20`, color: event.color }}
                                                                                    >
                                                                                        {event.event_type}
                                                                                    </span>
                                                                                    <div className="text-[10px] text-slate-500 space-y-1">
                                                                                        <div>
                                                                                            {event.all_day
                                                                                                ? `All Day · ${new Date(event.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                                                                : `${event.start_time || ''}${event.end_time ? ' – ' + event.end_time : ''} · ${new Date(event.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                                                                            }
                                                                                        </div>
                                                                                        {event.location && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <MapPinIcon size={9} className="text-slate-400 shrink-0" />
                                                                                                {event.location}
                                                                                            </div>
                                                                                        )}
                                                                                        {event.description && (
                                                                                            <p className="text-slate-400 leading-relaxed">{event.description}</p>
                                                                                        )}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                                                                                        <button
                                                                                            onClick={() => { setEditingEvent({ ...event, all_day: event.all_day || false }); setActivePopover(null); }}
                                                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                                                        >
                                                                                            <PencilIcon size={10} /> Edit
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setConfirmDeleteItem({ type: 'event', id: event.id, name: event.title || 'this event' });
                                                                                                setActivePopover(null);
                                                                                            }}
                                                                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                        >
                                                                                            <Trash2Icon size={10} /> Delete
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                        );
                                                                    }
                                                                });
                                                            })()}
                                                            {/* +X more count (sessions + events combined, sorted by time) */}
                                                            {(() => {
                                                                const daySessions = filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr)
                                                                    .map(s => ({ type: 'session' as const, time: s.time || '99:99', item: s }));
                                                                const dayEvents = showCalendarEvents
                                                                    ? (calendarEvents || []).filter(e => e.start_date === dateObj.dateStr)
                                                                        .map(e => ({ type: 'event' as const, time: e.all_day ? '00:00' : (e.start_time || '99:99'), item: e }))
                                                                    : [];
                                                                const allItems = [...daySessions, ...dayEvents].sort((a, b) => a.time.localeCompare(b.time));
                                                                const total = allItems.length;
                                                                const hidden = total - 3;
                                                                if (hidden <= 0) return null;

                                                                return (
                                                                    <div className="relative">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setOverflowDay(overflowDay === dateObj.dateStr ? null : dateObj.dateStr);
                                                                                setActivePopover(null);
                                                                            }}
                                                                            className="w-full text-[9px] text-indigo-500 hover:text-indigo-700 font-semibold text-center pt-0.5 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                                                                        >
                                                                            +{hidden} more
                                                                        </button>
                                                                        {overflowDay === dateObj.dateStr && (
                                                                            <div
                                                                                ref={overflowRef}
                                                                                className={`absolute z-50 left-0 w-60 bg-white rounded-lg shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto ${isBottomRows ? 'bottom-full mb-1' : 'top-full mt-1'}`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 rounded-t-lg">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                                                                                            {new Date(dateObj.dateStr + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                                        </span>
                                                                                        <span className="text-[9px] text-slate-400">{total} items</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="p-2 space-y-1">
                                                                                    {allItems.map(entry => {
                                                                                        if (entry.type === 'session') {
                                                                                            const session = entry.item;
                                                                                            const tc = getTargetColor(session.targetId);
                                                                                            return (
                                                                                            <div
                                                                                                key={session.id}
                                                                                                draggable
                                                                                                onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'session', session, dateObj.dateStr); }}
                                                                                                onDragEnd={() => { handleDragEnd(); setOverflowDay(null); }}
                                                                                                onClick={() => { setViewingSession(session); setOverflowDay(null); }}
                                                                                                className={`flex items-center gap-2 p-1.5 rounded-md border cursor-grab transition-all hover:scale-[1.02] active:scale-95 ${tc.bg} ${tc.border} ${tc.text}`}
                                                                                            >
                                                                                                <div className="flex-1 min-w-0">
                                                                                                    <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                                                    <div className="text-[8px] opacity-70 truncate">
                                                                                                        {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                                        {resolveTargetName(session.targetId, session.targetType)}
                                                                                                    </div>
                                                                                                </div>
                                                                                                {session.load && (
                                                                                                    <span className={`text-[7px] font-bold uppercase px-1 py-px rounded shrink-0 ${
                                                                                                        session.load === 'High' ? 'bg-red-500 text-white' :
                                                                                                        session.load === 'Medium' ? 'bg-amber-400 text-white' :
                                                                                                        'bg-emerald-400 text-white'
                                                                                                    }`}>{session.load[0]}</span>
                                                                                                )}
                                                                                            </div>
                                                                                            );
                                                                                        } else {
                                                                                            const event = entry.item;
                                                                                            return (
                                                                                        <div
                                                                                            key={event.id}
                                                                                            draggable
                                                                                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'event', event, dateObj.dateStr); }}
                                                                                            onDragEnd={() => { handleDragEnd(); setOverflowDay(null); }}
                                                                                            onClick={() => {
                                                                                                setOverflowDay(null);
                                                                                                const popKey = `${event.id}_${dateObj.dateStr}`;
                                                                                                setActivePopover({ id: popKey, event });
                                                                                            }}
                                                                                            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border cursor-grab transition-all hover:scale-[1.02] active:scale-95"
                                                                                            style={{
                                                                                                backgroundColor: `${event.color}12`,
                                                                                                borderColor: `${event.color}30`,
                                                                                            }}
                                                                                        >
                                                                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                                                                                            <span className="text-[9px] font-medium leading-tight truncate flex-1" style={{ color: event.color }}>
                                                                                                {!event.all_day && event.start_time && (
                                                                                                    <span className="font-semibold">{event.start_time} </span>
                                                                                                )}
                                                                                                {event.title}
                                                                                            </span>
                                                                                        </div>
                                                                                            );
                                                                                        }
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Edit Event Modal ── */}
                    {editingEvent && (() => {
                        const allEventTypes = [...DEFAULT_EVENT_TYPES, ...(customEventTypes || [])];
                        const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors';
                        const LABEL = 'text-xs font-medium text-slate-600 block mb-1.5';
                        return (
                            <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingEvent(null)}>
                                <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: editingEvent.color || '#6366f1' }}>
                                                <PencilIcon size={16} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-semibold text-slate-900">Edit Event</h2>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Update event details</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setEditingEvent(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                            <XIcon size={18} />
                                        </button>
                                    </div>

                                    {/* Form */}
                                    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                                        {/* Title */}
                                        <div>
                                            <label className={LABEL}>Event Name</label>
                                            <input type="text" value={editingEvent.title || ''} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} className={INPUT} />
                                        </div>

                                        {/* Event Type */}
                                        <div>
                                            <label className={LABEL}>Event Type</label>
                                            <select
                                                value={editingEvent.event_type || 'Appointment'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const match = allEventTypes.find(t => t.label === val);
                                                    setEditingEvent({ ...editingEvent, event_type: val, ...(match ? { color: match.color } : {}) });
                                                }}
                                                className={INPUT + ' appearance-none'}
                                            >
                                                {allEventTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                            </select>
                                        </div>

                                        {/* Color */}
                                        <div>
                                            <label className={LABEL}>Color</label>
                                            <div className="flex items-center gap-2">
                                                {PRESET_COLORS.map(c => (
                                                    <button key={c} onClick={() => setEditingEvent({ ...editingEvent, color: c })}
                                                        className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${editingEvent.color === c ? 'border-slate-900 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
                                                        style={{ backgroundColor: c }}
                                                    >
                                                        {editingEvent.color === c && <CheckIcon size={12} className="text-white" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className={LABEL}>Description</label>
                                            <textarea value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} placeholder="Add event details..." rows={3} className={INPUT + ' resize-none'} />
                                        </div>

                                        {/* Location */}
                                        <div>
                                            <label className={LABEL}>Location</label>
                                            <div className="relative">
                                                <MapPinIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input type="text" value={editingEvent.location || ''} onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })} placeholder="e.g. Training Facility..." className={INPUT + ' pl-9'} />
                                            </div>
                                        </div>

                                        {/* All Day Toggle */}
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setEditingEvent({ ...editingEvent, all_day: !editingEvent.all_day })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${editingEvent.all_day ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editingEvent.all_day ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                            <span className="text-xs font-medium text-slate-700">All Day</span>
                                        </div>

                                        {/* Date */}
                                        <div>
                                            <label className={LABEL}>Date</label>
                                            <input type="date" value={editingEvent.start_date || ''} onChange={e => setEditingEvent({ ...editingEvent, start_date: e.target.value, end_date: e.target.value })} className={INPUT} />
                                        </div>

                                        {/* Time */}
                                        {!editingEvent.all_day && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className={LABEL}>Start Time</label>
                                                    <div className="relative">
                                                        <ClockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="time" value={editingEvent.start_time || ''} onChange={e => setEditingEvent({ ...editingEvent, start_time: e.target.value })} className={INPUT + ' pl-9'} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={LABEL}>End Time</label>
                                                    <div className="relative">
                                                        <ClockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                                        <input type="time" value={editingEvent.end_time || ''} onChange={e => setEditingEvent({ ...editingEvent, end_time: e.target.value })} className={INPUT + ' pl-9'} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                                        <button onClick={() => setEditingEvent(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleUpdateCalendarEvent(editingEvent.id, {
                                                    title: editingEvent.title,
                                                    event_type: editingEvent.event_type,
                                                    color: editingEvent.color,
                                                    description: editingEvent.description || null,
                                                    location: editingEvent.location || null,
                                                    all_day: editingEvent.all_day,
                                                    start_date: editingEvent.start_date,
                                                    end_date: editingEvent.start_date,
                                                    start_time: editingEvent.all_day ? null : (editingEvent.start_time || null),
                                                    end_time: editingEvent.all_day ? null : (editingEvent.end_time || null),
                                                });
                                                setEditingEvent(null);
                                            }}
                                            disabled={!editingEvent.title?.trim()}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Edit Session Modal ── */}
                    {editingSession && (() => {
                        const PHASES = ['Strength', 'Power', 'Hypertrophy', 'Endurance', 'Speed', 'Recovery', 'Testing', 'Pre-Season', 'In-Season', 'Off-Season'];
                        const LOADS = ['Low', 'Medium', 'High'];
                        const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors';
                        const LABEL = 'text-xs font-medium text-slate-600 block mb-1.5';
                        return (
                            <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingSession(null)}>
                                <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                                <DumbbellIcon size={16} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900">Edit Session</h3>
                                        </div>
                                        <button onClick={() => setEditingSession(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                                            <XIcon size={16} />
                                        </button>
                                    </div>
                                    <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                                        {/* Title */}
                                        <div>
                                            <label className={LABEL}>Title</label>
                                            <input value={editingSession.title || ''} onChange={e => setEditingSession(p => ({ ...p, title: e.target.value }))} className={INPUT} />
                                        </div>
                                        {/* Date & Time */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={LABEL}>Date</label>
                                                <input type="date" value={editingSession.date || ''} onChange={e => setEditingSession(p => ({ ...p, date: e.target.value }))} className={INPUT} />
                                            </div>
                                            <div>
                                                <label className={LABEL}>Time</label>
                                                <input type="time" value={editingSession.time || ''} onChange={e => setEditingSession(p => ({ ...p, time: e.target.value }))} className={INPUT} />
                                            </div>
                                        </div>
                                        {/* Phase & Load */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className={LABEL}>Training Phase</label>
                                                <select value={editingSession.trainingPhase || ''} onChange={e => setEditingSession(p => ({ ...p, trainingPhase: e.target.value }))} className={INPUT}>
                                                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className={LABEL}>Load</label>
                                                <select value={editingSession.load || 'Medium'} onChange={e => setEditingSession(p => ({ ...p, load: e.target.value }))} className={INPUT}>
                                                    {LOADS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        {/* Status */}
                                        <div>
                                            <label className={LABEL}>Status</label>
                                            <select value={editingSession.status || 'Scheduled'} onChange={e => setEditingSession(p => ({ ...p, status: e.target.value }))} className={INPUT}>
                                                <option value="Scheduled">Scheduled</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </select>
                                        </div>
                                    </div>
                                    {/* Footer */}
                                    <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                                        <button onClick={() => setEditingSession(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                handleUpdateSession(editingSession.id, {
                                                    title: editingSession.title,
                                                    date: editingSession.date,
                                                    time: editingSession.time || null,
                                                    trainingPhase: editingSession.trainingPhase,
                                                    load: editingSession.load,
                                                    status: editingSession.status,
                                                });
                                                setEditingSession(null);
                                            }}
                                            disabled={!editingSession.title?.trim()}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                    {/* Intervention Modal */}
                    <InterventionModal
                        athlete={selectedInterventionAthlete}
                        isOpen={isInterventionModalOpen}
                        onClose={() => { setIsInterventionModalOpen(false); setSelectedInterventionAthlete(null); }}
                        loadRecords={loadRecords || []}
                        wellnessData={wellnessData || []}
                        acwrOptions={selectedInterventionAthlete ? getAthleteAcwrOptions(selectedInterventionAthlete.id) : {}}
                    />
                    {/* Quick Complete Session Modal */}
                    {completingSession && (
                        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-slate-200 overflow-hidden">
                                <div className="px-5 py-3.5 bg-emerald-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-white">
                                        <CheckCircle2Icon size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wide">Complete Session</span>
                                    </div>
                                    <button onClick={() => setCompletingSession(null)} className="text-emerald-200 hover:text-white">
                                        <XIcon size={16} />
                                    </button>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900">{completingSession.title || 'Untitled Session'}</h3>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {new Date(completingSession.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            {completingSession.time ? ` at ${completingSession.time}` : ''}
                                            {' · '}{resolveTargetName(completingSession.targetId, completingSession.targetType)}
                                        </p>
                                    </div>
                                    <p className="text-xs text-slate-500">Mark this session as completed?</p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setCompletingSession(null)}
                                            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleCompleteSession(completingSession.id, {}, null)}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors">
                                            <CheckCircle2Icon size={14} /> Complete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <ConfirmDeleteModal
                        isOpen={!!confirmDeleteItem}
                        title={confirmDeleteItem?.type === 'session' ? 'Delete Session' : 'Delete Event'}
                        message={`Are you sure you want to delete "${confirmDeleteItem?.name}"?`}
                        onConfirm={() => {
                            if (confirmDeleteItem?.type === 'session') handleDeleteSession(confirmDeleteItem.id);
                            else handleDeleteCalendarEvent(confirmDeleteItem.id);
                            setConfirmDeleteItem(null);
                        }}
                        onCancel={() => setConfirmDeleteItem(null)}
                    />
                </>);
            }
