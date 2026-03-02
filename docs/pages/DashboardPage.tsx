// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    AlertTriangleIcon, CalendarIcon, PackageIcon, PrinterIcon, FilterIcon,
    ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, UserIcon, PlusIcon, CheckCircle2Icon
} from 'lucide-react';

export const DashboardPage = () => {
    const {
        teams, scheduledSessions, wellnessData, bodyHeatmapData,
        dashboardFilterTarget, setDashboardFilterTarget,
        heatmapTeamFilter, setHeatmapTeamFilter,
        dashboardCalendarDate, setDashboardCalendarDate, dashboardCalendarDays,
        isWorkoutPacketModalOpen, setIsWorkoutPacketModalOpen,
        setIsWeightroomSheetModalOpen,
        setIsAddSessionModalOpen,
        newSession, setNewSession,
        setViewingDate, setViewingSession,
        setSelectedInterventionAthlete, setIsInterventionModalOpen,
        calculateACWR, resolveTargetName, getSessionTypeColor,
    } = useAppState();

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
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-100 bg-rose-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-100">
                            <AlertTriangleIcon size={24} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Morning Performance Report</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">High-Priority Readiness Screening</p>
                        </div>
                    </div>
                    <span className="px-5 py-2 bg-white border border-rose-100 rounded-xl text-[10px] font-black text-rose-600 uppercase tracking-widest">{atRiskAthletes.length} Athletes at Risk</span>
                </div>
                <div className="p-4 space-y-4">
                    {atRiskAthletes.length > 0 ? atRiskAthletes.map(player => {
                        const isFocused = dashboardFilterTarget === player.name;
                        return (
                            <div key={player.id} className={`flex items-center justify-between p-6 rounded-[2rem] border transition-all cursor-pointer group ${isFocused ? 'bg-indigo-50 border-indigo-200 shadow-lg scale-[1.02] ring-4 ring-indigo-500/10' : 'bg-slate-50/50 border-slate-100 hover:bg-white hover:shadow-md'}`}
                                onClick={() => { setSelectedInterventionAthlete(player); setIsInterventionModalOpen(true); }}
                            >
                                <div className="flex items-center gap-6">
                                    <div className="relative">
                                        <div className="w-14 h-14 bg-slate-200 rounded-2xl overflow-hidden grayscale group-hover:grayscale-0 transition-all">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} alt={player.name} />
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-white ${player.riskLevel === 'Critical' ? 'bg-red-500' : 'bg-orange-400'}`}></div>
                                        {isFocused && <div className="absolute -top-1 -left-1 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-sm" />}
                                    </div>
                                    <div>
                                        <h4 className={`font-black transition-colors ${isFocused ? 'text-indigo-900' : 'text-slate-900 group-hover:text-rose-600'}`}>{player.name}</h4>
                                        <div className="flex gap-2 mt-1">
                                            {player.flags.map((flag, idx) => (
                                                <span key={idx} className={`px-2 py-0.5 bg-white border rounded-md text-[8px] font-black uppercase tracking-tighter transition-all ${isFocused ? 'border-indigo-200 text-indigo-600' : 'border-slate-200 text-slate-400 group-hover:text-slate-600'}`}>{flag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-center flex flex-col items-center gap-2">
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-slate-400">ACWR</div>
                                        <div className={`text-xl font-black ${player.acwr > 1.5 ? 'text-red-500' : 'text-orange-500'}`}>{player.acwr}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedInterventionAthlete(player); setIsInterventionModalOpen(true); }}
                                        className={`px-4 py-1.5 text-white text-[9px] font-black uppercase rounded-lg shadow-sm transition-colors ${isFocused ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                                    >Intervene</button>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                            <CheckCircle2Icon size={48} className="text-emerald-500/20" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-50">All Squad Members Cleared</p>
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
                    <div className="space-y-10 animate-in fade-in duration-700">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            {/* Morning Readiness Report Column */}
                            <div className="lg:col-span-1">
                                {renderMorningReport()}
                            </div>

                            {/* Main Dashboard Actions Column */}
                            <div className="lg:col-span-2 space-y-10">
                                {/* Top Row: Preparation Actions */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button onClick={(e) => {
                                        console.log('--- WORKOUT PACKET CLICK START ---');
                                        console.log('Current State:', isWorkoutPacketModalOpen);
                                        console.log('Event Phase:', e.eventPhase);
                                        setIsWorkoutPacketModalOpen(true);
                                        console.log('State Setter Called');
                                        window.WP_FORCE_OPEN = true; // Global flag for backup
                                    }} className="bg-indigo-600 p-8
                                    rounded-[3rem] shadow-lg space-y-4 hover:scale-[1.02] transition-all text-left">
                                        <div className="flex justify-between items-center text-indigo-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest">Workout Packets
                                            </h3>
                                            <PackageIcon size={16} />
                                        </div>
                                        <div className="text-white">
                                            <div className="text-lg font-black leading-tight">Digital Distribution</div>
                                            <div
                                                className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-tighter leading-relaxed">
                                                Generate QR-linked PDF packets for the session, streamlining off-site
                                                training with instructional video integration for every prescribed movement.
                                            </div>
                                        </div>
                                    </button>

                                    <button onClick={() => setIsWeightroomSheetModalOpen(true)} className="bg-cyan-600 p-8
                                    rounded-[3rem] shadow-lg space-y-4 hover:scale-[1.02] transition-all text-left">
                                        <div className="flex justify-between items-center text-cyan-100">
                                            <h3 className="text-xs font-black uppercase tracking-widest">Weightroom Sheets
                                            </h3>
                                            <PrinterIcon size={16} />
                                        </div>
                                        <div className="text-white">
                                            <div className="text-lg font-black leading-tight">Generate Sheets</div>
                                            <div
                                                className="text-[10px] font-bold opacity-70 mt-1 uppercase tracking-tighter leading-relaxed">
                                                Daily prescribed loads for squads. High-density team sheets with calculated
                                                percentages based on 1RM testing data for precise intensity control.</div>
                                        </div>
                                    </button>
                                </div>


                                {/* Squad Readiness Heatmap (The Vibe Check) */}
                                <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm space-y-5">
                                    {/* HEADING */}
                                    <div>
                                        <h4 className="text-xl font-black uppercase tracking-tighter text-indigo-900">
                                            {dashboardFilterTarget === 'All Athletes' ? 'Squad Readiness Heatmap' :
                                                'Individual Readiness Heatmap'}
                                        </h4>
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">
                                            {dashboardFilterTarget === 'All Athletes' ? 'Daily Team Energy & Stress Distribution' : `Deep-Dive Performance Readiness // ${dashboardFilterTarget}`}
                                        </p>
                                    </div>

                                    {/* CONTROLS: Filter (Left) & Legend (Right) */}
                                    <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                                        <div className="flex-1">
                                            {dashboardFilterTarget === 'All Athletes' && (
                                                <div className="space-y-2">
                                                    <label
                                                        className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Team
                                                        Filter</label>
                                                    <div className="relative group/filter max-w-[200px]">
                                                        <select value={heatmapTeamFilter} onChange={(e) =>
                                                            setHeatmapTeamFilter(e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl
                                                    px-4 py-2.5 text-[10px] font-black uppercase tracking-widest
                                                    outline-none appearance-none pr-10 hover:border-slate-300
                                                    transition-all cursor-pointer"
                                                        >
                                                            <option>All Teams</option>
                                                            {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>
                                                            )}
                                                        </select>
                                                        <div
                                                            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover/filter:text-slate-600 transition-colors">
                                                            <ChevronDownIcon size={14} />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col items-end gap-2 text-right">
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span
                                                        className="text-[8px] font-black uppercase text-slate-400">Optimal
                                                        Adaptation</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-amber-400 rounded-full"></div><span
                                                        className="text-[8px] font-black uppercase text-slate-400">Accumulated
                                                        Fatigue</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-orange-400 rounded-full"></div><span
                                                        className="text-[8px] font-black uppercase text-slate-400">Functional
                                                        Overreaching</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 bg-rose-500 rounded-full"></div><span
                                                        className="text-[8px] font-black uppercase text-slate-400">High Risk
                                                        / NF Overreaching</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-6 sm:grid-cols-10 gap-3">
                                        {teams.flatMap(team => team.players.map(p => ({ ...p, teamName: team.name })))
                                            .filter(p => heatmapTeamFilter === 'All Teams' || p.teamName === heatmapTeamFilter)
                                            .sort((a, b) => {
                                                const wA = wellnessData.filter(d => d.athleteId === a.id).slice(-1)[0] || {
                                                    energy:
                                                        5, stress: 5
                                                };
                                                const wB = wellnessData.filter(d => d.athleteId === b.id).slice(-1)[0] || {
                                                    energy:
                                                        5, stress: 5
                                                };
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

                                                // Calculate Initials
                                                const initials = p.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                                                return (
                                                    <div key={p.id} className={`group relative transition-all duration-300 ${isSelected ? 'opacity-100 scale-100' : 'opacity-20 scale-90 grayscale'}`}>
                                                        <div onClick={() => setDashboardFilterTarget(isStrictFocus ? 'All Athletes' :
                                                            p.name)}
                                                            className={`aspect-square rounded-2xl ${color} shadow-sm border-2 transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center ${isStrictFocus ? 'border-slate-900 ring-4 ring-slate-900/10' : 'border-white'}`}
                                                        >
                                                            <span
                                                                className="text-[10px] font-black text-white mix-blend-overlay opacity-80">{initials}</span>
                                                        </div>
                                                        <div className={`absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-3 py-2 rounded-xl whitespace-nowrap transition-all z-10 shadow-2xl flex flex-col items-center gap-1 border border-slate-700 ${isStrictFocus ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                                                            <div className="text-slate-400 uppercase tracking-widest leading-none mb-1">
                                                                {p.teamName}</div>
                                                            <div className="text-[10px]">{p.name}</div>
                                                            <div className="flex gap-2 text-slate-400">
                                                                <span>Energy: {energy}/10</span>
                                                                <span className="w-px h-2 bg-slate-700"></span>
                                                                <span>Stress: {stress}/10</span>
                                                            </div>
                                                        </div>
                                                        {
                                                            isStrictFocus && <div
                                                                className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-black text-indigo-900 uppercase">
                                                                Focus</div>
                                                        }
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>


                                {/* Calendar Moved Below for Full Width Layout */}
                            </div>
                        </div>

                        {/* Full Size Calendar Container */}
                        <div
                            className="bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                            {/* Calendar Header/Toolbar */}
                            <div
                                className="p-8 border-b border-slate-100 flex flex-col gap-4 bg-white">
                                {/* Row 1: Calendar Nav & Athlete Filter (Aligned) */}
                                <div className="flex flex-col xl:flex-row justify-between items-center gap-8">
                                    <div className="flex items-center gap-6">
                                        <div
                                            className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shrink-0 -rotate-3">
                                            <CalendarIcon size={24} />
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <h3
                                                className="text-2xl font-black uppercase tracking-tight text-indigo-900 leading-none">
                                                {dashboardCalendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>

                                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/50 shadow-inner">
                                                <button onClick={() => {
                                                    const newDate = new Date(dashboardCalendarDate);
                                                    newDate.setMonth(newDate.getMonth() - 1);
                                                    setDashboardCalendarDate(newDate);
                                                }}
                                                    className="p-1 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                >
                                                    <ChevronLeftIcon size={16} className="text-slate-600" />
                                                </button>
                                                <button onClick={() => {
                                                    const newDate = new Date(dashboardCalendarDate);
                                                    newDate.setMonth(newDate.getMonth() + 1);
                                                    setDashboardCalendarDate(newDate);
                                                }}
                                                    className="p-1 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                >
                                                    <ChevronRightIcon size={16} className="text-slate-600" />
                                                </button>
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-0">
                                                {dashboardFilterTarget}</p>
                                        </div>
                                    </div>

                                    {/* Filter Dropdown */}
                                    <div
                                        className="flex items-center gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200/60 shadow-sm relative group shrink-0">
                                        <FilterIcon size={14} className="text-slate-400" />
                                        <div className="h-3 w-px bg-slate-200 mx-1"></div>
                                        <select value={dashboardFilterTarget} onChange={(e) =>
                                            setDashboardFilterTarget(e.target.value)}
                                            className="bg-transparent text-[10px] font-black uppercase tracking-widest
                                        text-slate-600 outline-none appearance-none pr-6 cursor-pointer"
                                        >
                                            <option>All Athletes</option>
                                            {teams.flatMap(t => t.players).map(p => <option key={p.id}>{p.name}</option>)}
                                        </select>
                                        <ChevronDownIcon size={12}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-hover:text-slate-500 transition-colors" />
                                    </div>
                                </div>

                                {/* Row 2: Add Session Button (Right Aligned) */}
                                <div className="flex justify-end">
                                    {/* Add Session Button */}
                                    <button onClick={() => {
                                        setNewSession({ ...newSession, date: new Date().toISOString().split('T')[0] });
                                        setIsAddSessionModalOpen(true);
                                    }}
                                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black
                                    uppercase tracking-widest shadow-lg flex items-center gap-2 hover:bg-indigo-700
                                    transition-all active:scale-95"
                                    >
                                        <PlusIcon size={14} /> Add Session
                                    </button>
                                </div>
                            </div>

                            <div className="p-10">
                                <div className="grid grid-cols-7 gap-6">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day}
                                            className="text-[11px] font-black text-slate-300 uppercase tracking-[0.2em] text-center pb-4">
                                            {day}</div>
                                    ))}
                                    {dashboardCalendarDays.map((dateObj, idx) => {
                                        const isToday = dateObj && dateObj.dateStr === new Date().toLocaleDateString('en-CA');
                                        return (
                                            <div key={idx} className={`relative min-h-[140px] rounded-3xl border transition-all
                                    group p-4 py-5 flex flex-col justify-between ${dateObj
                                                    ? 'hover:shadow-lg cursor-pointer'
                                                    : 'bg-slate-50/30 border-transparent animate-pulse'} ${isToday
                                                        ? 'bg-cyan-50 border-cyan-500 shadow-md ring-1 ring-cyan-200'
                                                        : 'bg-white border-slate-100 hover:border-slate-300'}`} onClick={() => dateObj &&
                                                            setViewingDate(dateObj.dateStr)}>
                                                {dateObj && (
                                                    <>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <span className={`text-sm font-black transition-colors ${isToday
                                                                ? 'text-cyan-700' : 'text-slate-300 group-hover:text-slate-900'
                                                                }`}>{dateObj.day}</span>
                                                            {isToday && <span
                                                                className="text-[8px] font-black uppercase bg-cyan-600 text-white px-2 py-0.5 rounded-full">Today</span>}
                                                        </div>
                                                        <div className="space-y-1">
                                                            {filteredSessionsForCalendar.filter(s => s.date ===
                                                                dateObj.dateStr).slice(0, 3).map(session => (
                                                                    <div key={session.id} onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setViewingSession(session);
                                                                    }}
                                                                        className={`flex flex-col gap-1 p-2 rounded-xl border transition-all
                                                hover:scale-[1.02] active:scale-95 cursor-pointer shadow-sm
                                                ${getSessionTypeColor(session.trainingPhase)}`}>
                                                                        <div
                                                                            className="flex justify-between items-center bg-white/40 p-1 rounded-lg">
                                                                            <span
                                                                                className="text-[8px] font-black uppercase tracking-widest">{session.trainingPhase}</span>
                                                                            {session.targetType === 'Individual' &&
                                                                                <UserIcon size={8} />}
                                                                        </div>
                                                                        <div className="px-0.5">
                                                                            <div className="text-[9px] font-black leading-tight truncate">
                                                                                {session.title}</div>
                                                                            <div className="text-[8px] font-bold opacity-70 truncate mt-0.5">
                                                                                {resolveTargetName(session.targetId, session.targetType)}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            {filteredSessionsForCalendar.filter(s => s.date === dateObj.dateStr).length
                                                                > 3 && (
                                                                    <div
                                                                        className="text-[8px] font-black text-slate-400 uppercase tracking-tighter text-center pt-1">
                                                                        +{filteredSessionsForCalendar.filter(s => s.date ===
                                                                            dateObj.dateStr).length - 3} More</div>
                                                                )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div >
                );
            }