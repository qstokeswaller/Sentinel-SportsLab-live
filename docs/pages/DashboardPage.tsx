// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    AlertTriangleIcon, CalendarIcon, FilterIcon,
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, PlusIcon, CheckCircle2Icon,
    MapPinIcon, PencilIcon, Trash2Icon, XIcon, ClockIcon, CheckIcon,
} from 'lucide-react';

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
        teams, scheduledSessions, wellnessData, bodyHeatmapData,
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
        calculateACWR, resolveTargetName, getSessionTypeColor,
    } = useAppState();

    const [activePopover, setActivePopover] = React.useState(null);
    const [editingEvent, setEditingEvent] = React.useState(null);
    const [overflowDay, setOverflowDay] = React.useState(null); // dateStr of day showing overflow popover
    const popoverRef = React.useRef(null);
    const overflowRef = React.useRef(null);

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
        if (!activePopover && !overflowDay) return;
        const handler = (e) => {
            if (activePopover && popoverRef.current && !popoverRef.current.contains(e.target)) {
                setActivePopover(null);
                setEditingEvent(null);
            }
            if (overflowDay && overflowRef.current && !overflowRef.current.contains(e.target)) {
                setOverflowDay(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activePopover, overflowDay]);

    const renderMorningReport = () => {
        const atRiskAthletes = teams.flatMap(t => t.players).map(player => {
            const acwr = parseFloat(calculateACWR(player.id));
            const lastWellness = wellnessData.filter(d => d.athleteId === player.id).slice(-1)[0];
            const heatmapLogs = bodyHeatmapData.filter(d => d.athleteId === player.id);
            const recentPain = heatmapLogs.some(log => (log.type === 'Acute Pain' || log.intensity > 7) && (new Date() - new Date(log.timestamp)) < 86400000);
            let riskLevel = 'Stable';
            let flags = [];
            let score = 0;

            if (acwr > 1.5) { score += 50; flags.push('ACWR Critical Spike'); }
            else if (acwr > 1.3) { score += 30; flags.push('ACWR Elevated'); }
            else if (acwr < 0.8) { score += 10; flags.push('Low Chronic Loading'); }

            if (lastWellness) {
                if (lastWellness.energy < 3) { score += 40; flags.push('Severe Fatigue'); }
                else if (lastWellness.energy < 5) { score += 20; flags.push('Low Energy'); }
                if (lastWellness.stress > 8) { score += 30; flags.push('High Stress'); }
                if (lastWellness.sleep < 5) { score += 25; flags.push('Poor Sleep'); }
            }

            if (recentPain) { score += 60; flags.push('Acute Pain Event'); }

            if (score >= 50) riskLevel = 'Critical';
            else if (score >= 20) riskLevel = 'Warning';

            return { ...player, riskLevel, flags, acwr, riskScore: score };
        }).filter(p => p.riskLevel !== 'Stable').sort((a, b) => b.riskScore - a.riskScore);

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="px-5 py-4 border-b border-slate-100 bg-rose-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-600 rounded-lg flex items-center justify-center text-white shrink-0">
                            <AlertTriangleIcon size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Morning Performance Report</h3>
                            <p className="text-xs text-slate-500 mt-0.5">High-priority readiness screening</p>
                        </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white border border-rose-200 rounded-full text-xs font-medium text-rose-600 shrink-0">{atRiskAthletes.length} at risk</span>
                </div>
                <div className="p-3 space-y-2 flex-1 overflow-y-auto">
                    {atRiskAthletes.length > 0 ? atRiskAthletes.map(player => {
                        const isFocused = dashboardFilterTarget === player.name;
                        return (
                            <div key={player.id} className={`flex items-center justify-between p-3.5 rounded-lg border transition-all cursor-pointer group ${isFocused ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/10' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-sm'}`}
                                onClick={() => { setSelectedInterventionAthlete(player); setIsInterventionModalOpen(true); }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-9 h-9 bg-slate-200 rounded-lg overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} />
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${player.riskLevel === 'Critical' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                                        {isFocused && <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-indigo-600 rounded-full border-2 border-white" />}
                                    </div>
                                    <div>
                                        <h4 className={`text-sm font-medium transition-colors ${isFocused ? 'text-indigo-900' : 'text-slate-900 group-hover:text-rose-600'}`}>{player.name}</h4>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {player.flags.map((flag, idx) => (
                                                <span key={idx} className={`px-1.5 py-0.5 bg-white border rounded text-[9px] font-medium transition-all ${isFocused ? 'border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-500'}`}>{flag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center flex flex-col items-center gap-1.5 shrink-0">
                                    <div>
                                        <div className="text-[9px] font-medium text-slate-400 uppercase tracking-wide">ACWR</div>
                                        <div className={`text-lg font-bold ${player.acwr > 1.5 ? 'text-red-500' : 'text-orange-500'}`}>{player.acwr}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedInterventionAthlete(player); setIsInterventionModalOpen(true); }}
                                        className={`px-3 py-1 text-white text-[10px] font-medium rounded-full transition-colors ${isFocused ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                                    >Intervene</button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-14 flex flex-col items-center justify-center text-slate-300 gap-3">
                            <CheckCircle2Icon size={36} className="text-emerald-400/40" />
                            <p className="text-xs text-slate-400">All squad members cleared</p>
                        </div>
                    )}
                </div>
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
                            <div className="lg:col-span-1">
                                {renderMorningReport()}
                            </div>

                            {/* Main Dashboard Actions Column */}
                            <div className="lg:col-span-2">
                                {/* Squad Readiness Heatmap */}
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 h-full flex flex-col">
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
                                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                                        {teams.flatMap(team => team.players.map(p => ({ ...p, teamName: team.name })))
                                            .filter(p => heatmapTeamFilter === 'All Teams' || p.teamName === heatmapTeamFilter)
                                            .sort((a, b) => {
                                                const wA = wellnessData.filter(d => d.athleteId === a.id).slice(-1)[0] || { energy: 5, stress: 5 };
                                                const wB = wellnessData.filter(d => d.athleteId === b.id).slice(-1)[0] || { energy: 5, stress: 5 };
                                                return (wA.energy - wA.stress) - (wB.energy - wB.stress);
                                            })
                                            .map(p => {
                                                const isSelected = dashboardFilterTarget === 'All Athletes' || p.name === dashboardFilterTarget;
                                                const isStrictFocus = p.name === dashboardFilterTarget;
                                                const lastW = wellnessData.filter(d => d.athleteId === p.id).slice(-1)[0];
                                                const energy = lastW ? lastW.energy : 5;
                                                const stress = lastW ? lastW.stress : 5;
                                                const readiness = energy - stress;
                                                const color = readiness >= 4 ? 'bg-emerald-500' :
                                                    readiness >= 1 ? 'bg-amber-400' :
                                                        readiness >= -2 ? 'bg-orange-400' : 'bg-rose-500';
                                                const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                                                return (
                                                    <div key={p.id} className={`group relative transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-20 scale-90 grayscale'}`}>
                                                        <div onClick={() => setDashboardFilterTarget(isStrictFocus ? 'All Athletes' : p.name)}
                                                            className={`aspect-square rounded-xl ${color} shadow-sm border-2 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center ${isStrictFocus ? 'border-slate-900 ring-2 ring-slate-900/10' : 'border-white'}`}
                                                        >
                                                            <span className="text-[10px] font-semibold text-white mix-blend-overlay opacity-80">{initials}</span>
                                                        </div>
                                                        <div className={`absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-medium px-2.5 py-2 rounded-lg whitespace-nowrap transition-all z-10 shadow-xl flex flex-col items-center gap-1 border border-slate-700 ${isStrictFocus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                                                            <div className="text-slate-400 leading-none mb-0.5 text-[9px]">{p.teamName}</div>
                                                            <div>{p.name}</div>
                                                            <div className="flex gap-2 text-slate-400">
                                                                <span>Energy: {energy}/10</span>
                                                                <span className="w-px h-2 bg-slate-700"></span>
                                                                <span>Stress: {stress}/10</span>
                                                            </div>
                                                        </div>
                                                        {isStrictFocus && <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 text-[8px] font-medium text-indigo-600">Focus</div>}
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Full Size Calendar */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
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

                            <div className="p-4">
                                <div className="grid grid-cols-7 gap-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-[11px] font-medium text-slate-400 text-center pb-3">{day}</div>
                                    ))}
                                    {dashboardCalendarDays.map((dateObj, idx) => {
                                        const isToday = dateObj && dateObj.dateStr === new Date().toLocaleDateString('en-CA');
                                        const calendarRow = Math.floor(idx / 7);
                                        const totalRows = Math.ceil(dashboardCalendarDays.length / 7);
                                        const isBottomRows = calendarRow >= totalRows - 2;
                                        return (
                                            <div key={idx} className={`relative min-h-[96px] rounded-lg border transition-all group p-2.5 flex flex-col justify-between ${dateObj
                                                    ? 'hover:shadow-md cursor-pointer'
                                                    : 'bg-slate-50/30 border-transparent'} ${isToday
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
                                                            {/* Workout Sessions */}
                                                            {filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr).slice(0, 3).map(session => {
                                                                const tc = getTargetColor(session.targetId);
                                                                return (
                                                                <div key={session.id} onClick={(e) => { e.stopPropagation(); setViewingSession(session); }}
                                                                    className={`flex flex-col gap-0.5 p-1.5 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${tc.bg} ${tc.border} ${tc.text}`}>
                                                                    <div className={`flex justify-between items-center ${tc.pillBg} px-1 py-0.5 rounded`}>
                                                                        <span className="text-[8px] font-medium uppercase tracking-wide">{session.trainingPhase}</span>
                                                                        <div className="flex items-center gap-1">
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
                                                                );
                                                            })}
                                                            {/* Calendar Events — bubble cards (hidden when filtering teams/athletes) */}
                                                            {showCalendarEvents && calendarEvents
                                                                .filter(e => e.start_date === dateObj.dateStr)
                                                                .slice(0, Math.max(0, 3 - filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr).length))
                                                                .map(event => (
                                                                    <div key={`${event.id}_${dateObj.dateStr}`} className="relative">
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const popKey = `${event.id}_${dateObj.dateStr}`;
                                                                                setActivePopover(activePopover?.id === popKey ? null : { id: popKey, event });
                                                                                setEditingEvent(null);
                                                                            }}
                                                                            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
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
                                                                                                handleDeleteCalendarEvent(event.id);
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
                                                                ))}
                                                            {/* +X more count (sessions + events combined) */}
                                                            {(() => {
                                                                const daySessions = filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr);
                                                                const dayEvents = showCalendarEvents ? calendarEvents.filter(e => e.start_date === dateObj.dateStr) : [];
                                                                const total = daySessions.length + dayEvents.length;
                                                                const hidden = total - 3;
                                                                if (hidden <= 0) return null;

                                                                // Items not shown: sessions beyond first 3, then events beyond remaining slots
                                                                const shownSessions = daySessions.slice(0, 3);
                                                                const eventSlots = Math.max(0, 3 - daySessions.length);
                                                                const shownEvents = dayEvents.slice(0, eventSlots);
                                                                const hiddenSessions = daySessions.slice(3);
                                                                const hiddenEvents = dayEvents.slice(eventSlots);

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
                                                                                    {/* All sessions for this day */}
                                                                                    {daySessions.map(session => {
                                                                                        const tc = getTargetColor(session.targetId);
                                                                                        return (
                                                                                            <div
                                                                                                key={session.id}
                                                                                                onClick={() => { setViewingSession(session); setOverflowDay(null); }}
                                                                                                className={`flex items-center gap-2 p-1.5 rounded-md border cursor-pointer transition-all hover:scale-[1.02] active:scale-95 ${tc.bg} ${tc.border} ${tc.text}`}
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
                                                                                    })}
                                                                                    {/* All events for this day */}
                                                                                    {dayEvents.map(event => (
                                                                                        <div
                                                                                            key={event.id}
                                                                                            onClick={() => {
                                                                                                setOverflowDay(null);
                                                                                                const popKey = `${event.id}_${dateObj.dateStr}`;
                                                                                                setActivePopover({ id: popKey, event });
                                                                                            }}
                                                                                            className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
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
                                                                                    ))}
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
                </>);
            }
