// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    UserIcon, PlusIcon, ChevronRightIcon
} from 'lucide-react';

export const PeriodizationPage = () => {
    const {
        planningLevel,
        setPlanningLevel,
        selectedPlannerAthleteId,
        setSelectedPlannerAthleteId,
        teams,
        selectedPlanBlock,
        setSelectedPlanBlock,
        setPlanBlockTab,
        setIsPlanBlockModalOpen,
        planBlocks
    } = useAppState();

    const renderTimeline = () => {
        // Filter blocks based on current view mode
        const filteredBlocks = planBlocks.filter(b => {
            if (planningLevel === 'Team') return b.targetType === 'Team' || !b.targetType; // Legacy blocks default to Team
            if (planningLevel === 'Individual') return b.targetType === 'Individual' && b.targetId === selectedPlannerAthleteId;
            return true;
        });

        // Calculate timeline duration (Total Weeks)
        // Find the latest end date in all filtered blocks, default to 12 weeks from today if empty
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Normalize to Monday

        let maxDate = new Date(startOfWeek);
        maxDate.setDate(maxDate.getDate() + (12 * 7)); // Default min 12 weeks

        filteredBlocks.forEach(b => {
            const blockEnd = new Date(b.endDate);
            if (blockEnd > maxDate) maxDate = blockEnd;
        });

        // Calculate total weeks needed
        const totalDaysDiff = (maxDate - startOfWeek) / (1000 * 60 * 60 * 24);
        const totalWeeks = Math.ceil(totalDaysDiff / 7) + 2; // Add 2 weeks buffer

        const weeks = [];
        for (let i = 0; i < totalWeeks; i++) {
            const wStart = new Date(startOfWeek);
            wStart.setDate(startOfWeek.getDate() + (i * 7));
            const wEnd = new Date(wStart);
            wEnd.setDate(wStart.getDate() + 6);
            weeks.push({ start: wStart, end: wEnd, index: i + 1 });
        }

        return (
            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px] animate-in fade-in duration-500">
                {/* Fixed Header & Tracks Layout using Flexbox for proper scrolling */}
                <div className="flex h-full overflow-hidden relative">
                    {/* LEFT STICKY SIDEBAR (Labels) */}
                    <div className="w-48 flex flex-col shrink-0 bg-white z-30 border-r border-slate-100 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                        {/* Header Corner */}
                        <div className="h-16 flex items-center justify-center border-b border-slate-100 bg-slate-50/50">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Timeline</span>
                        </div>
                        {/* Track Labels */}
                        <div className="flex-1 py-4 space-y-6 bg-slate-50/30">
                            <div className="h-32 flex flex-col items-start justify-center px-8 text-rose-600">
                                <span className="text-[10px] font-black uppercase tracking-widest">Interventions</span>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase leading-tight">Coach/S&C Decisions</p>
                            </div>
                            <div className="h-32 flex flex-col items-start justify-center px-8 text-slate-900 border-t border-slate-100/50">
                                <span className="text-[10px] font-black uppercase tracking-widest">Mesocycles</span>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase leading-tight">Training Phases</p>
                            </div>
                            <div className="h-32 flex flex-col items-start justify-center px-8 text-indigo-600 border-t border-slate-100/50">
                                <span className="text-[10px] font-black uppercase tracking-widest">Testing Gates</span>
                                <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase leading-tight">KPI Verification</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SCROLLABLE AREA (Header + Content) */}
                    <div className="flex-1 overflow-x-auto relative custom-scrollbar">
                        <div className="h-full flex flex-col" style={{ minWidth: (totalWeeks * 180) + 'px' }}>
                            {/* TIMELINE HEADER (Weeks) */}
                            <div className="h-16 flex border-b border-slate-100 sticky top-0 bg-white z-20">
                                {weeks.map((week, i) => (
                                    <div key={i} className={`flex-1 min-w-[180px] border-r border-slate-100 flex flex-col items-center justify-center relative group hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-blue-50/30' : ''}`}>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-1">Week {week.index}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-500">{week.start.getDate()} {week.start.toLocaleString('default', { month: 'short' })}</span>
                                            <ChevronRightIcon size={10} className="text-slate-300" />
                                            <span className="text-xs font-bold text-slate-500">{week.end.getDate()} {week.end.toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* TRACKS CONTENT */}
                            <div className="flex-1 py-4 space-y-6 bg-slate-50/20 relative">
                                {/* Vertical Grid Lines */}
                                <div className="absolute inset-0 flex pointer-events-none z-0">
                                    {weeks.map((_, i) => (
                                        <div key={i} className="flex-1 min-w-[180px] border-r border-slate-100/50 h-full"></div>
                                    ))}
                                </div>

                                {/* TRACK 1: Interventions */}
                                <div className="flex items-center h-32 relative z-10">
                                </div>

                                {/* TRACK 2: Mesocycles */}
                                <div className="flex items-center h-32 relative z-10 border-t border-slate-100/50">
                                    <div className="absolute inset-0 flex items-center">
                                        {filteredBlocks.map((block) => {
                                            const start = new Date(block.startDate);
                                            const end = new Date(block.endDate);
                                            const totalDays = (end - start) / (1000 * 60 * 60 * 24);
                                            const startDiff = (start - startOfWeek) / (1000 * 60 * 60 * 24);
                                            const widthPx = Math.max(100, totalDays * 25.7);
                                            const leftPx = startDiff * 25.7;

                                            return (
                                                <div key={block.id} onClick={() => {
                                                    setSelectedPlanBlock(block);
                                                    setPlanBlockTab('info');
                                                    setIsPlanBlockModalOpen(true);
                                                }}
                                                    className={`absolute h-20 top-6 rounded-2xl border-2 flex flex-col justify-center px-5 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm ${block.color}`}
                                                    style={{ left: `${Math.max(0, leftPx)}px`, width: `${widthPx}px` }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5">{block.blockType}</span>
                                                        <h4 className="text-sm font-black uppercase tracking-tight leading-none truncate">{block.title}</h4>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* TRACK 3: Testing Gates */}
                                <div className="flex items-center h-32 relative z-10 border-t border-slate-100/50">
                                    <div className="absolute top-0 h-full w-[180px] left-0 border-r-4 border-r-cyan-500/20 bg-cyan-50/30 flex items-center justify-center">
                                        <span className="text-[9px] font-black text-cyan-600 uppercase">Baseline Testing</span>
                                    </div>
                                    <div className="absolute top-0 h-full w-[180px] left-[1080px] border-r-4 border-r-emerald-500/20 bg-emerald-50/30 flex items-center justify-center">
                                        <span className="text-[9px] font-black text-emerald-600 uppercase">Outcome Review</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-12 animate-in fade-in duration-500">
            <div className="flex justify-between items-end bg-white p-10 rounded-[3rem] border border-indigo-100 shadow-sm relative overflow-hidden border-t-8 border-t-indigo-900">
                <div className="space-y-4 relative z-10">
                    <h2 className="text-4xl font-extrabold text-indigo-900 uppercase tracking-tighter leading-none">The Planner</h2>
                    <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest">Periodization Terminal // Macro Management</p>
                </div>
                <div className="flex items-center gap-6 z-10">
                    {planningLevel === 'Individual' && (
                        <div className="flex items-center gap-2 bg-indigo-50/50 rounded-xl px-4 py-3 border border-indigo-100">
                            <UserIcon size={14} className="text-indigo-400" />
                            <select value={selectedPlannerAthleteId || ''} onChange={(e) => setSelectedPlannerAthleteId(e.target.value)}
                                className="bg-transparent text-[11px] font-bold uppercase tracking-widest text-indigo-900 outline-none cursor-pointer"
                            >
                                {teams.flatMap(t => t.players).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {['Team', 'Individual'].map(lvl => (
                            <button key={lvl} onClick={() => {
                                setPlanningLevel(lvl);
                                if (lvl === 'Individual' && !selectedPlannerAthleteId) {
                                    setSelectedPlannerAthleteId(teams[0]?.players[0]?.id);
                                }
                            }}
                                className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${planningLevel === lvl ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-indigo-900'}`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => {
                        const newBlock = {
                            id: 'block_' + Date.now(),
                            title: 'New Phase',
                            startDate: new Date().toISOString().split('T')[0],
                            endDate: new Date(Date.now() + 28 * 86400000).toISOString().split('T')[0],
                            blockType: 'Accumulation',
                            color: 'bg-blue-100 border-blue-200 text-blue-700',
                            notes: '',
                            targetType: planningLevel,
                            targetId: planningLevel === 'Individual' ? selectedPlannerAthleteId : 'all'
                        };
                        setSelectedPlanBlock(newBlock);
                        setPlanBlockTab('edit');
                        setIsPlanBlockModalOpen(true);
                    }}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-xl flex items-center gap-3 active:scale-95 transition-all hover:bg-indigo-700"
                    >
                        <PlusIcon size={16} /> New Phase
                    </button>
                </div>
            </div>
            {renderTimeline()}
        </div>
    );
};
