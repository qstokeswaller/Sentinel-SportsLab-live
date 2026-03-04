// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import { Button } from '@/components/ui/button';
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
        const filteredBlocks = planBlocks.filter(b => {
            if (planningLevel === 'Team') return b.targetType === 'Team' || !b.targetType;
            if (planningLevel === 'Individual') return b.targetType === 'Individual' && b.targetId === selectedPlannerAthleteId;
            return true;
        });

        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1);

        let maxDate = new Date(startOfWeek);
        maxDate.setDate(maxDate.getDate() + (12 * 7));

        filteredBlocks.forEach(b => {
            const blockEnd = new Date(b.endDate);
            if (blockEnd > maxDate) maxDate = blockEnd;
        });

        const totalDaysDiff = (maxDate - startOfWeek) / (1000 * 60 * 60 * 24);
        const totalWeeks = Math.ceil(totalDaysDiff / 7) + 2;

        const weeks = [];
        for (let i = 0; i < totalWeeks; i++) {
            const wStart = new Date(startOfWeek);
            wStart.setDate(startOfWeek.getDate() + (i * 7));
            const wEnd = new Date(wStart);
            wEnd.setDate(wStart.getDate() + 6);
            weeks.push({ start: wStart, end: wEnd, index: i + 1 });
        }

        return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[650px] animate-in fade-in duration-300">
                <div className="flex h-full overflow-hidden relative">
                    {/* LEFT STICKY SIDEBAR */}
                    <div className="w-44 flex flex-col shrink-0 bg-white z-30 border-r border-slate-100 shadow-[4px_0_12px_-8px_rgba(0,0,0,0.08)]">
                        <div className="h-14 flex items-center justify-center border-b border-slate-100 bg-slate-50">
                            <span className="text-xs font-medium text-slate-400">Timeline</span>
                        </div>
                        <div className="flex-1 py-4 space-y-6 bg-slate-50/30">
                            <div className="h-32 flex flex-col items-start justify-center px-5 text-rose-600">
                                <span className="text-xs font-semibold">Interventions</span>
                                <p className="text-[10px] text-slate-400 mt-1">Coach/S&C decisions</p>
                            </div>
                            <div className="h-32 flex flex-col items-start justify-center px-5 text-slate-900 border-t border-slate-100">
                                <span className="text-xs font-semibold">Mesocycles</span>
                                <p className="text-[10px] text-slate-400 mt-1">Training phases</p>
                            </div>
                            <div className="h-32 flex flex-col items-start justify-center px-5 text-indigo-600 border-t border-slate-100">
                                <span className="text-xs font-semibold">Testing Gates</span>
                                <p className="text-[10px] text-slate-400 mt-1">KPI verification</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SCROLLABLE AREA */}
                    <div className="flex-1 overflow-x-auto relative custom-scrollbar">
                        <div className="h-full flex flex-col" style={{ minWidth: (totalWeeks * 180) + 'px' }}>
                            {/* TIMELINE HEADER */}
                            <div className="h-14 flex border-b border-slate-100 sticky top-0 bg-white z-20">
                                {weeks.map((week, i) => (
                                    <div key={i} className={`flex-1 min-w-[180px] border-r border-slate-100 flex flex-col items-center justify-center relative group hover:bg-slate-50 transition-colors ${i === 0 ? 'bg-indigo-50/30' : ''}`}>
                                        <span className="text-[10px] font-medium text-slate-300 mb-0.5">Week {week.index}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-medium text-slate-500">{week.start.getDate()} {week.start.toLocaleString('default', { month: 'short' })}</span>
                                            <ChevronRightIcon size={9} className="text-slate-300" />
                                            <span className="text-xs font-medium text-slate-500">{week.end.getDate()} {week.end.toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* TRACKS CONTENT */}
                            <div className="flex-1 py-4 space-y-6 bg-slate-50/20 relative">
                                <div className="absolute inset-0 flex pointer-events-none z-0">
                                    {weeks.map((_, i) => (
                                        <div key={i} className="flex-1 min-w-[180px] border-r border-slate-100/50 h-full"></div>
                                    ))}
                                </div>

                                {/* TRACK 1: Interventions */}
                                <div className="flex items-center h-32 relative z-10"></div>

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
                                                    className={`absolute h-20 top-6 rounded-xl border-2 flex flex-col justify-center px-4 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all shadow-sm ${block.color}`}
                                                    style={{ left: `${Math.max(0, leftPx)}px`, width: `${widthPx}px` }}
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-medium opacity-70 mb-0.5">{block.blockType}</span>
                                                        <h4 className="text-sm font-semibold leading-none truncate">{block.title}</h4>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* TRACK 3: Testing Gates */}
                                <div className="flex items-center h-32 relative z-10 border-t border-slate-100/50">
                                    <div className="absolute top-0 h-full w-[180px] left-0 border-r-4 border-r-indigo-500/20 bg-indigo-50/30 flex items-center justify-center">
                                        <span className="text-xs font-medium text-indigo-600">Baseline Testing</span>
                                    </div>
                                    <div className="absolute top-0 h-full w-[180px] left-[1080px] border-r-4 border-r-emerald-500/20 bg-emerald-50/30 flex items-center justify-center">
                                        <span className="text-xs font-medium text-emerald-600">Outcome Review</span>
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
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="flex justify-between items-center bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-semibold text-slate-900">The Planner</h2>
                    <p className="text-sm text-slate-500 mt-0.5">Periodization — macro management</p>
                </div>
                <div className="flex items-center gap-3">
                    {planningLevel === 'Individual' && (
                        <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2">
                            <UserIcon size={13} className="text-slate-400" />
                            <select
                                value={selectedPlannerAthleteId || ''}
                                onChange={(e) => setSelectedPlannerAthleteId(e.target.value)}
                                className="bg-transparent text-sm text-slate-700 outline-none cursor-pointer"
                            >
                                {teams.flatMap(t => t.players).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        {['Team', 'Individual'].map(lvl => (
                            <button key={lvl} onClick={() => {
                                setPlanningLevel(lvl);
                                if (lvl === 'Individual' && !selectedPlannerAthleteId) {
                                    setSelectedPlannerAthleteId(teams[0]?.players[0]?.id);
                                }
                            }}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${planningLevel === lvl ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                    <Button size="sm" onClick={() => {
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
                    }}>
                        <PlusIcon size={13} className="mr-1.5" /> New Phase
                    </Button>
                </div>
            </div>
            {renderTimeline()}
        </div>
    );
};
