// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    AlertTriangleIcon, CalendarIcon, FilterIcon,
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, PlusIcon, CheckCircle2Icon,
    MapPinIcon, PencilIcon, Trash2Icon, XIcon,
} from 'lucide-react';

export const DashboardPage = () => {
    const {
        teams, scheduledSessions, wellnessData, bodyHeatmapData,
        dashboardFilterTarget, setDashboardFilterTarget,
        heatmapTeamFilter, setHeatmapTeamFilter,
        dashboardCalendarDate, setDashboardCalendarDate, dashboardCalendarDays,
        setIsAddEventModalOpen,
        calendarEvents,
        handleUpdateCalendarEvent,
        handleDeleteCalendarEvent,
        setViewingDate, setViewingSession,
        setSelectedInterventionAthlete, setIsInterventionModalOpen,
        calculateACWR, resolveTargetName, getSessionTypeColor,
    } = useAppState();

    const [activePopover, setActivePopover] = React.useState(null);
    const [editingEvent, setEditingEvent] = React.useState(null);
    const popoverRef = React.useRef(null);

    // Close popover on click outside
    React.useEffect(() => {
        if (!activePopover) return;
        const handler = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setActivePopover(null);
                setEditingEvent(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [activePopover]);

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

    const filteredSessionsForCalendar = scheduledSessions.filter(s => {
                    if (dashboardFilterTarget === 'All Athletes') return true;
                    // Check if target matches ID directly OR resolved name
                    if (s.targetId === dashboardFilterTarget) return true;
                    const name = resolveTargetName(s.targetId, s.targetType);
                    return name === dashboardFilterTarget;
                });

                return (
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
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
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
                                            <p className="text-xs text-slate-500">{dashboardFilterTarget}</p>
                                        </div>
                                    </div>

                                    {/* Filter Dropdown */}
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200 relative group shrink-0">
                                        <FilterIcon size={13} className="text-slate-400" />
                                        <div className="h-3 w-px bg-slate-200 mx-0.5"></div>
                                        <select value={dashboardFilterTarget} onChange={(e) => setDashboardFilterTarget(e.target.value)}
                                            className="bg-transparent text-xs text-slate-600 outline-none appearance-none pr-5 cursor-pointer"
                                        >
                                            <option>All Athletes</option>
                                            {teams.flatMap(t => t.players).map(p => <option key={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDownIcon size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>

                                {/* Add Event Button */}
                                <div className="flex justify-end">
                                    <button onClick={() => setIsAddEventModalOpen(true)}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-full text-xs font-medium shadow-sm flex items-center gap-1.5 hover:bg-indigo-700 transition-colors"
                                    >
                                        <PlusIcon size={13} /> Add Event
                                    </button>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="grid grid-cols-7 gap-2">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} className="text-[11px] font-medium text-slate-400 text-center pb-3">{day}</div>
                                    ))}
                                    {dashboardCalendarDays.map((dateObj, idx) => {
                                        const isToday = dateObj && dateObj.dateStr === new Date().toLocaleDateString('en-CA');
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
                                                            {filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr).slice(0, 3).map(session => (
                                                                <div key={session.id} onClick={(e) => { e.stopPropagation(); setViewingSession(session); }}
                                                                    className={`flex flex-col gap-0.5 p-1.5 rounded-md border transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${getSessionTypeColor(session.trainingPhase)}`}>
                                                                    <div className="flex justify-between items-center bg-white/40 px-1 py-0.5 rounded">
                                                                        <span className="text-[8px] font-medium uppercase tracking-wide">{session.trainingPhase}</span>
                                                                        {session.targetType === 'Individual' && <UserIcon size={7} />}
                                                                    </div>
                                                                    <div className="px-0.5">
                                                                        <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                        <div className="text-[8px] opacity-70 truncate mt-0.5">
                                                                            {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                            {resolveTargetName(session.targetId, session.targetType)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {/* Calendar Events — bubble cards */}
                                                            {calendarEvents
                                                                .filter(e => {
                                                                    const start = e.start_date;
                                                                    const end = e.end_date || e.start_date;
                                                                    return dateObj.dateStr >= start && dateObj.dateStr <= end;
                                                                })
                                                                .slice(0, Math.max(0, 3 - filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr).length))
                                                                .map(event => (
                                                                    <div key={event.id} className="relative">
                                                                        <div
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActivePopover(activePopover?.id === event.id ? null : { id: event.id, event });
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
                                                                        {activePopover?.id === event.id && (
                                                                            <div
                                                                                ref={popoverRef}
                                                                                className="absolute z-50 left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {/* Color accent bar */}
                                                                                <div className="h-1 rounded-t-lg" style={{ backgroundColor: event.color }} />
                                                                                <div className="p-3 space-y-2">
                                                                                    {editingEvent?.id === event.id ? (
                                                                                        /* Edit mode */
                                                                                        <div className="space-y-2">
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editingEvent.title}
                                                                                                onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                                                                                className="w-full text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                                                                                            />
                                                                                            <textarea
                                                                                                value={editingEvent.description || ''}
                                                                                                onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })}
                                                                                                placeholder="Description..."
                                                                                                rows={2}
                                                                                                className="w-full text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400 resize-none"
                                                                                            />
                                                                                            <input
                                                                                                type="text"
                                                                                                value={editingEvent.location || ''}
                                                                                                onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                                                                                placeholder="Location..."
                                                                                                className="w-full text-[10px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                                                                                            />
                                                                                            <div className="flex gap-1.5">
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        handleUpdateCalendarEvent(event.id, {
                                                                                                            title: editingEvent.title,
                                                                                                            description: editingEvent.description || null,
                                                                                                            location: editingEvent.location || null,
                                                                                                        });
                                                                                                        setActivePopover(null);
                                                                                                        setEditingEvent(null);
                                                                                                    }}
                                                                                                    className="flex-1 px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
                                                                                                >
                                                                                                    Save
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => setEditingEvent(null)}
                                                                                                    className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-medium hover:bg-slate-200 transition-colors"
                                                                                                >
                                                                                                    Cancel
                                                                                                </button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        /* View mode */
                                                                                        <>
                                                                                            <div className="flex items-start justify-between">
                                                                                                <h4 className="text-sm font-semibold text-slate-900 leading-tight">{event.title}</h4>
                                                                                                <button onClick={() => { setActivePopover(null); setEditingEvent(null); }} className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors">
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
                                                                                                    onClick={() => setEditingEvent({ ...event })}
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
                                                                                        </>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            {/* +X more count (sessions + events combined) */}
                                                            {(() => {
                                                                const sessionCount = filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr).length;
                                                                const eventCount = calendarEvents.filter(e => {
                                                                    const start = e.start_date;
                                                                    const end = e.end_date || e.start_date;
                                                                    return dateObj.dateStr >= start && dateObj.dateStr <= end;
                                                                }).length;
                                                                const total = sessionCount + eventCount;
                                                                return total > 3 ? (
                                                                    <div className="text-[9px] text-slate-400 text-center pt-0.5">
                                                                        +{total - 3} more
                                                                    </div>
                                                                ) : null;
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
                );
            }
