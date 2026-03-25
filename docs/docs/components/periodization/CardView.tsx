// @ts-nocheck
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../context/AppStateContext';
import {
    Plus, ChevronRight, Clock, Calendar, Dumbbell, LinkIcon,
    PencilIcon, Check, Trash2, X,
} from 'lucide-react';
import { formatDateShort, dateToWeekIndex } from '../../utils/periodizationUtils';

// Intensity badge colors
const LOAD_BADGE = {
    Low:     { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Low' },
    Medium:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Moderate' },
    High:    { bg: 'bg-red-100',    text: 'text-red-700',    label: 'High' },
    Maximal: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Very High' },
};
const LOAD_OPTIONS = ['Low', 'Medium', 'High', 'Maximal'];

const LoadBadge = ({ load }) => {
    if (!load) return null;
    const b = LOAD_BADGE[load] || LOAD_BADGE.Medium;
    return (
        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${b.bg} ${b.text}`}>
            {b.label}
        </span>
    );
};

const globalWeekNum = (dateStr, planStartDate) => dateToWeekIndex(dateStr, planStartDate) + 1;

const weekRange = (startDate, endDate, planStart) => {
    const s = globalWeekNum(startDate, planStart);
    if (!endDate) return `Week ${s}`;
    const e = globalWeekNum(endDate, planStart);
    return `Week ${s} — ${e}`;
};

const weekCount = (startDate, endDate) => {
    if (!endDate) return null;
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.ceil(ms / (7 * 86400000)));
};

// Small inline edit pencil button
const EditBtn = ({ onClick }) => (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }}
        className="p-1 rounded-md hover:bg-slate-100 opacity-0 group-hover/edit:opacity-100 transition-opacity shrink-0">
        <PencilIcon size={11} className="text-slate-400" />
    </button>
);

export const CardView = ({ plan }) => {
    const navigate = useNavigate();
    const {
        planDrillPath, setPlanDrillPath,
        setIsPlanPhaseModalOpen, setEditingPlanPhase,
        setIsPlanBlockModalOpenNew, setEditingPlanBlock,
        setIsPlanEventModalOpen,
        handleUpdatePlanWeek, handleAddPlanWeek,
        handleAddPlanSession, handleUpdatePlanSession, handleDeletePlanSession,
    } = useAppState();

    // Inline editing state
    const [editingWeekId, setEditingWeekId] = useState(null);
    const [editWeekIntent, setEditWeekIntent] = useState('');
    const [editingSessionId, setEditingSessionId] = useState(null);
    const [editSessionData, setEditSessionData] = useState({ name: '', load: '', duration: '' });
    const [addingSessionDate, setAddingSessionDate] = useState(null);
    const [newSessionData, setNewSessionData] = useState({ name: '', load: '', duration: '' });

    // ─── LEVEL 4: Week → Daily Sessions ──────────────────────────────
    if (planDrillPath.length >= 3) {
        const phase = plan.phases.find(p => p.id === planDrillPath[0]);
        const block = phase?.blocks.find(b => b.id === planDrillPath[1]);
        const weekNum = planDrillPath[2];
        const week = block?.weeks.find(w => w.weekNumber === weekNum);

        if (!week) return <div className="text-sm text-slate-400 p-4">Week not found.</div>;

        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        const weekStart = new Date(week.startDate);
        const totalExercises = (s) => s.sections.reduce((sum, sec) => sum + sec.exercises.length, 0);
        const gw = globalWeekNum(week.startDate, plan.startDate);

        const isEditingWeekHeader = editingWeekId === week.id;
        const saveWeekEdit = () => {
            handleUpdatePlanWeek(phase.id, block.id, week.id, { intent: editWeekIntent });
            setEditingWeekId(null);
        };

        const saveSessionEdit = (sessionId) => {
            handleUpdatePlanSession(phase.id, block.id, week.id, sessionId, {
                name: editSessionData.name,
                load: editSessionData.load || null,
                plannedDuration: editSessionData.duration ? parseInt(editSessionData.duration) : null,
            });
            setEditingSessionId(null);
        };

        const createSession = (dateStr) => {
            if (!newSessionData.name.trim()) return;
            handleAddPlanSession(phase.id, block.id, week.id, {
                date: dateStr,
                name: newSessionData.name.trim(),
                load: newSessionData.load || null,
                plannedDuration: newSessionData.duration ? parseInt(newSessionData.duration) : null,
                sections: [],
            });
            setAddingSessionDate(null);
            setNewSessionData({ name: '', load: '', duration: '' });
        };

        return (
            <div className="space-y-4 animate-in fade-in duration-200">
                {/* Editable Week Header */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center gap-3">
                        <Calendar size={18} className="text-slate-400" />
                        <div className="flex-1">
                            {isEditingWeekHeader ? (
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-slate-900">Week {gw} —</span>
                                    <input autoFocus value={editWeekIntent}
                                        onChange={e => setEditWeekIntent(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') saveWeekEdit(); if (e.key === 'Escape') setEditingWeekId(null); }}
                                        className="text-base font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-2 py-0.5 outline-none focus:border-indigo-400 flex-1"
                                        placeholder="e.g. Loading, Deload, Peak..." />
                                    <button onClick={saveWeekEdit} className="p-1 rounded-md hover:bg-indigo-50 text-indigo-600"><Check size={14} /></button>
                                    <button onClick={() => setEditingWeekId(null)} className="p-1 rounded-md hover:bg-slate-100 text-slate-400"><X size={14} /></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 group/edit">
                                    <h3 className="text-base font-bold text-slate-900">
                                        Week {gw} — {week.intent || 'Untitled'}
                                    </h3>
                                    <EditBtn onClick={() => { setEditingWeekId(week.id); setEditWeekIntent(week.intent || ''); }} />
                                </div>
                            )}
                            <p className="text-xs text-slate-400 mt-0.5">
                                {week.sessions.length} session{week.sessions.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Day Cards — All 7 days equal */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                    {days.map((dayName, i) => {
                        const dayDate = new Date(weekStart);
                        dayDate.setDate(weekStart.getDate() + i);
                        const dateStr = dayDate.toISOString().split('T')[0];
                        const session = week.sessions.find(s => s.date === dateStr);
                        const isEditingThis = session && editingSessionId === session.id;
                        const isAddingThis = addingSessionDate === dateStr;

                        return (
                            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[140px] flex flex-col">
                                {/* Day header */}
                                <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-600">{dayName}</span>
                                    {session?.load && !isEditingThis && <LoadBadge load={session.load} />}
                                </div>
                                {/* Day content */}
                                <div className="p-3 flex-1 flex flex-col">
                                    {isEditingThis ? (
                                        /* Inline session editor */
                                        <div className="space-y-2 flex-1">
                                            <input value={editSessionData.name} onChange={e => setEditSessionData(d => ({ ...d, name: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') saveSessionEdit(session.id); if (e.key === 'Escape') setEditingSessionId(null); }}
                                                autoFocus className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                                                placeholder="Session name" />
                                            <select value={editSessionData.load} onChange={e => setEditSessionData(d => ({ ...d, load: e.target.value }))}
                                                className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none">
                                                <option value="">No intensity</option>
                                                {LOAD_OPTIONS.map(l => <option key={l} value={l}>{LOAD_BADGE[l].label}</option>)}
                                            </select>
                                            <input type="number" value={editSessionData.duration} onChange={e => setEditSessionData(d => ({ ...d, duration: e.target.value }))}
                                                className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none" placeholder="Duration (min)" />
                                            <div className="flex gap-1">
                                                <button onClick={() => saveSessionEdit(session.id)}
                                                    className="flex-1 text-[10px] font-semibold bg-indigo-600 text-white rounded py-1 hover:bg-indigo-700">Save</button>
                                                <button onClick={() => setEditingSessionId(null)}
                                                    className="text-[10px] text-slate-400 px-2 py-1 hover:bg-slate-100 rounded">Cancel</button>
                                            </div>
                                            <button onClick={() => { handleDeletePlanSession(phase.id, block.id, week.id, session.id); setEditingSessionId(null); }}
                                                className="flex items-center gap-1 text-[9px] text-red-400 hover:text-red-600 mt-1">
                                                <Trash2 size={9} /> Remove
                                            </button>
                                        </div>
                                    ) : isAddingThis ? (
                                        /* Inline new session form */
                                        <div className="space-y-2 flex-1">
                                            <input value={newSessionData.name} onChange={e => setNewSessionData(d => ({ ...d, name: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') createSession(dateStr); if (e.key === 'Escape') setAddingSessionDate(null); }}
                                                autoFocus className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                                                placeholder="Session name" />
                                            <select value={newSessionData.load} onChange={e => setNewSessionData(d => ({ ...d, load: e.target.value }))}
                                                className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none">
                                                <option value="">No intensity</option>
                                                {LOAD_OPTIONS.map(l => <option key={l} value={l}>{LOAD_BADGE[l].label}</option>)}
                                            </select>
                                            <input type="number" value={newSessionData.duration} onChange={e => setNewSessionData(d => ({ ...d, duration: e.target.value }))}
                                                className="w-full text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none" placeholder="Duration (min)" />
                                            <div className="flex gap-1">
                                                <button onClick={() => createSession(dateStr)} disabled={!newSessionData.name.trim()}
                                                    className="flex-1 text-[10px] font-semibold bg-indigo-600 text-white rounded py-1 hover:bg-indigo-700 disabled:opacity-40">Create</button>
                                                <button onClick={() => setAddingSessionDate(null)}
                                                    className="text-[10px] text-slate-400 px-2 py-1 hover:bg-slate-100 rounded">Cancel</button>
                                            </div>
                                        </div>
                                    ) : session ? (
                                        /* Display session */
                                        <div className="space-y-2 flex-1 group/edit">
                                            <div className="flex items-start justify-between">
                                                <p className="text-xs font-bold text-slate-800">{session.name}</p>
                                                <EditBtn onClick={() => {
                                                    setEditingSessionId(session.id);
                                                    setEditSessionData({ name: session.name, load: session.load || '', duration: session.plannedDuration?.toString() || '' });
                                                }} />
                                            </div>
                                            <div className="space-y-1">
                                                {totalExercises(session) > 0 && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                        <Dumbbell size={10} />
                                                        <span>{totalExercises(session)} exercises</span>
                                                    </div>
                                                )}
                                                {session.plannedDuration && (
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                                        <Clock size={10} />
                                                        <span>{session.plannedDuration} min</span>
                                                    </div>
                                                )}
                                            </div>
                                            {session.workoutTemplateId ? (
                                                <button onClick={(e) => { e.stopPropagation(); navigate('/workouts/packets'); }}
                                                    className="mt-auto flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-medium transition-colors">
                                                    <LinkIcon size={9} /> View Workout
                                                </button>
                                            ) : (
                                                <button onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate('/workouts/packets', { state: { assignToPlanSession: { sessionId: session.id, date: dateStr, weekId: week.id, blockId: block.id, phaseId: phase.id, planId: plan.id } } });
                                                }}
                                                    className="mt-auto flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 font-medium transition-colors">
                                                    <LinkIcon size={9} /> Assign Workout
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        /* Empty day */
                                        <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                            <p className="text-xs text-slate-300 italic">Rest day</p>
                                            <button onClick={() => { setAddingSessionDate(dateStr); setNewSessionData({ name: '', load: '', duration: '' }); }}
                                                className="text-[10px] text-slate-400 hover:text-indigo-500 font-medium flex items-center gap-1 transition-colors">
                                                <Plus size={10} /> Add Session
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ─── LEVEL 3: Block → Weeks ──────────────────────────────────────
    if (planDrillPath.length >= 2) {
        const phase = plan.phases.find(p => p.id === planDrillPath[0]);
        const block = phase?.blocks.find(b => b.id === planDrillPath[1]);

        if (!block) return <div className="text-sm text-slate-400 p-4">Block not found.</div>;

        const bwRange = weekRange(block.startDate, block.endDate, plan.startDate);
        const bwCount = block.weeks.length;
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        return (
            <div className="space-y-4 animate-in fade-in duration-200">
                {/* Block Header — editable via modal */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3 group/edit">
                    <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: block.color }} />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{block.label || block.name}</h3>
                            <EditBtn onClick={() => { setEditingPlanBlock({ ...block, _phaseId: phase.id }); setIsPlanBlockModalOpenNew(true); }} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {bwRange} · {bwCount} week{bwCount !== 1 ? 's' : ''}
                        </p>
                        {block.goals && (
                            <p className="text-xs text-slate-500 mt-2">{block.goals}</p>
                        )}
                    </div>
                </div>

                {/* Week Cards — editable intent inline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {block.weeks.map(week => {
                        const gw = globalWeekNum(week.startDate, plan.startDate);
                        const weekStart = new Date(week.startDate);
                        const isEditingThisWeek = editingWeekId === week.id;

                        return (
                            <div key={week.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all group/edit">
                                {/* Week title — editable */}
                                <div className="p-4 pb-2">
                                    {isEditingThisWeek ? (
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-sm font-bold text-slate-800">Week {gw} —</span>
                                            <input autoFocus value={editWeekIntent}
                                                onChange={e => setEditWeekIntent(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') { handleUpdatePlanWeek(phase.id, block.id, week.id, { intent: editWeekIntent }); setEditingWeekId(null); }
                                                    if (e.key === 'Escape') setEditingWeekId(null);
                                                }}
                                                onClick={e => e.stopPropagation()}
                                                className="text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-indigo-400 flex-1 min-w-0"
                                                placeholder="Intent..." />
                                            <button onClick={(e) => { e.stopPropagation(); handleUpdatePlanWeek(phase.id, block.id, week.id, { intent: editWeekIntent }); setEditingWeekId(null); }}
                                                className="p-0.5 rounded hover:bg-indigo-50 text-indigo-600"><Check size={12} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <Calendar size={14} className="text-slate-400" />
                                            <span className="text-sm font-bold text-slate-800 truncate">
                                                Week {gw} — {week.intent || 'Untitled'}
                                            </span>
                                            <EditBtn onClick={() => { setEditingWeekId(week.id); setEditWeekIntent(week.intent || ''); }} />
                                        </div>
                                    )}
                                </div>

                                {/* Daily session list */}
                                <div className="px-4 pb-2 space-y-1">
                                    {days.map((dayName, i) => {
                                        const dayDate = new Date(weekStart);
                                        dayDate.setDate(weekStart.getDate() + i);
                                        const dateStr = dayDate.toISOString().split('T')[0];
                                        const session = week.sessions.find(s => s.date === dateStr);
                                        if (!session) return null;

                                        return (
                                            <div key={i} className="flex items-center justify-between py-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-medium text-slate-400 w-6">{dayName}</span>
                                                    <span className="text-[10px] font-medium text-slate-700 truncate max-w-[120px]">{session.name}</span>
                                                </div>
                                                {session.load && <LoadBadge load={session.load} />}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer — drill in */}
                                <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setPlanDrillPath([...planDrillPath, week.weekNumber])}>
                                    <span className="text-[10px] text-slate-400">
                                        {week.sessions.length} session{week.sessions.length !== 1 ? 's' : ''}
                                    </span>
                                    <ChevronRight size={12} className="text-slate-300 group-hover/edit:text-indigo-400 transition-colors" />
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Week */}
                    <div onClick={() => handleAddPlanWeek(phase.id, block.id)}
                        className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center min-h-[160px]">
                        <Plus size={20} className="text-slate-300 mb-2" />
                        <span className="text-xs font-semibold text-slate-400">Add Week</span>
                    </div>
                </div>
            </div>
        );
    }

    // ─── LEVEL 2: Phase → Blocks ─────────────────────────────────────
    if (planDrillPath.length >= 1) {
        const phase = plan.phases.find(p => p.id === planDrillPath[0]);

        if (!phase) return <div className="text-sm text-slate-400 p-4">Phase not found.</div>;

        const phaseWRange = weekRange(phase.startDate, phase.endDate, plan.startDate);
        const pwCount = phase.endDate ? weekCount(phase.startDate, phase.endDate) : null;

        return (
            <div className="space-y-4 animate-in fade-in duration-200">
                {/* Phase Header — editable via modal */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-start gap-3 group/edit">
                    <div className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: phase.color }} />
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">{phase.name}</h3>
                            <EditBtn onClick={() => { setEditingPlanPhase(phase); setIsPlanPhaseModalOpen(true); }} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {phaseWRange}{pwCount ? ` (${pwCount} weeks)` : ''} · {phase.blocks.length} training block{phase.blocks.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Block Cards — editable via modal from pencil */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {phase.blocks.map((block, idx) => {
                        const bwRange = weekRange(block.startDate, block.endDate, plan.startDate);
                        const bwCount = block.endDate ? weekCount(block.startDate, block.endDate) : null;

                        return (
                            <div key={block.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all group/edit">
                                {/* Block content */}
                                <div className="p-5 flex items-start gap-3">
                                    <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Block {idx + 1}</span>
                                            <EditBtn onClick={() => { setEditingPlanBlock({ ...block, _phaseId: phase.id }); setIsPlanBlockModalOpenNew(true); }} />
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">{block.label || block.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {bwRange}{bwCount ? ` (${bwCount} weeks)` : ''}
                                        </p>
                                        {block.goals && (
                                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">{block.goals}</p>
                                        )}
                                        <p className="text-[10px] text-slate-400 mt-2">
                                            {block.weeks.length > 0
                                                ? `${block.weeks.length} week${block.weeks.length !== 1 ? 's' : ''} planned`
                                                : 'No weeks planned'}
                                        </p>
                                    </div>
                                </div>
                                {/* Footer */}
                                <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-end cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => setPlanDrillPath([...planDrillPath, block.id])}>
                                    <span className="text-[10px] font-semibold text-slate-500 mr-1">Open</span>
                                    <ChevronRight size={12} className="text-slate-400" />
                                </div>
                            </div>
                        );
                    })}

                    {/* Add Block Card */}
                    <div onClick={() => { setEditingPlanBlock({ _phaseId: phase.id }); setIsPlanBlockModalOpenNew(true); }}
                        className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center min-h-[180px]">
                        <Plus size={20} className="text-slate-300 mb-2" />
                        <span className="text-xs font-semibold text-slate-400">Add Training Block</span>
                    </div>
                </div>
            </div>
        );
    }

    // ─── LEVEL 1: Plan Overview → Phases ─────────────────────────────
    const planStartMs = new Date(plan.startDate).getTime();
    const getBlockEnd = (b) => b.endDate ? new Date(b.endDate).getTime() : new Date(b.startDate).getTime() + (Math.max(b.weeks?.length || 1, 1)) * 7 * 86400000;
    const getPhaseEnd = (p) => p.endDate ? new Date(p.endDate).getTime() : (p.blocks.length > 0 ? Math.max(...p.blocks.map(getBlockEnd)) : new Date(p.startDate).getTime() + 28 * 86400000);
    const planEndMs = plan.endDate ? new Date(plan.endDate).getTime() : (plan.phases.length > 0 ? Math.max(...plan.phases.map(getPhaseEnd)) : planStartMs + 365 * 86400000);

    return (
        <div className="space-y-4 animate-in fade-in duration-200">
            {/* Phase Cards — editable via modal from pencil */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {plan.phases.map(phase => {
                    const phaseWRange = weekRange(phase.startDate, phase.endDate, plan.startDate);
                    const pwCount = phase.endDate ? weekCount(phase.startDate, phase.endDate) : null;

                    return (
                        <div key={phase.id}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-200 transition-all group/edit">
                            {/* Phase header */}
                            <div className="p-5 pb-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: phase.color }} />
                                    <h3 className="text-base font-bold text-slate-900 flex-1">{phase.name}</h3>
                                    <EditBtn onClick={() => { setEditingPlanPhase(phase); setIsPlanPhaseModalOpen(true); }} />
                                </div>
                                <p className="text-[10px] text-slate-400 ml-5">
                                    {phaseWRange}{pwCount ? ` (${pwCount} weeks)` : ''}
                                </p>
                            </div>

                            {/* Blocks list inside phase card */}
                            {phase.blocks.length > 0 && (
                                <div className="px-5 pb-3 space-y-1.5">
                                    {phase.blocks.map(block => {
                                        const bStartWk = globalWeekNum(block.startDate, plan.startDate);
                                        const bEndWk = block.endDate ? globalWeekNum(block.endDate, plan.startDate) : bStartWk + Math.max(block.weeks.length, 1) - 1;

                                        return (
                                            <div key={block.id} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                                                    <span className="text-xs text-slate-700 font-medium">{block.label || block.name}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium">W{bStartWk}-{bEndWk}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Events in this phase */}
                            {plan.events.filter(e => e.date >= phase.startDate && (!phase.endDate || e.date <= phase.endDate)).length > 0 && (
                                <div className="px-5 pb-3 flex flex-wrap gap-1">
                                    {plan.events.filter(e => e.date >= phase.startDate && (!phase.endDate || e.date <= phase.endDate)).map(event => (
                                        <span key={event.id} className={`text-[9px] px-1.5 py-0.5 rounded-md font-medium ${event.type === 'competition' ? 'bg-yellow-50 text-yellow-700' : event.type === 'testing' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                            {event.type === 'competition' ? '🏆' : event.type === 'testing' ? '🧪' : '⭐'} {event.label}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* View details footer */}
                            <div className="px-5 py-2.5 border-t border-slate-100 flex items-center justify-end cursor-pointer hover:bg-slate-50 transition-colors"
                                onClick={() => setPlanDrillPath([phase.id])}>
                                <span className="text-[10px] font-semibold text-slate-500 mr-1">View details</span>
                                <ChevronRight size={12} className="text-slate-400 group-hover/edit:text-indigo-400 transition-colors" />
                            </div>
                        </div>
                    );
                })}

                {/* Add Phase Card */}
                <div onClick={() => { setEditingPlanPhase(null); setIsPlanPhaseModalOpen(true); }}
                    className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-5 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center min-h-[180px]">
                    <Plus size={20} className="text-slate-300 mb-2" />
                    <span className="text-xs font-semibold text-slate-400">Add Phase</span>
                </div>
            </div>

            {/* Annual Overview Timeline Bar */}
            {plan.phases.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 block">Annual Overview</span>
                    <div className="flex items-center h-8 rounded-lg overflow-hidden">
                        {plan.phases.map(phase => {
                            const pStart = new Date(phase.startDate).getTime();
                            const pEnd = getPhaseEnd(phase);
                            const totalDuration = planEndMs - planStartMs || 1;
                            const width = Math.max(((pEnd - pStart) / totalDuration) * 100, 2);

                            return (
                                <div key={phase.id}
                                    onClick={() => setPlanDrillPath([phase.id])}
                                    className="h-full flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity first:rounded-l-lg last:rounded-r-lg"
                                    style={{ width: `${width}%`, backgroundColor: phase.color }}>
                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider truncate px-2 drop-shadow-sm">{phase.name}</span>
                                </div>
                            );
                        })}
                    </div>
                    {/* Month labels */}
                    <div className="flex mt-2">
                        {(() => {
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            const startMonth = new Date(plan.startDate).getMonth();
                            const endMonth = new Date(planEndMs).getMonth();
                            const startYear = new Date(plan.startDate).getFullYear();
                            const endYear = new Date(planEndMs).getFullYear();
                            const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
                            const labels = [];
                            for (let i = 0; i < totalMonths; i++) {
                                const m = (startMonth + i) % 12;
                                labels.push(
                                    <span key={i} className="text-[9px] text-slate-400 text-center" style={{ width: `${100 / totalMonths}%` }}>
                                        {months[m]}
                                    </span>
                                );
                            }
                            return labels;
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};
