// @ts-nocheck — moved verbatim from DashboardPage.tsx (monolith restructure,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { Dumbbell as DumbbellIcon, XIcon } from 'lucide-react';

export const EditSessionModal: React.FC<any> = ({
    editingSession,
    handleUpdateSession,
    setEditingSession,
}) => {
                        const PHASES = ['Strength', 'Power', 'Hypertrophy', 'Endurance', 'Speed', 'Recovery', 'Testing', 'Pre-Season', 'In-Season', 'Off-Season'];
                        const LOADS = ['Low', 'Medium', 'High'];
                        const INPUT = 'w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors';
                        const LABEL = 'text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block mb-1.5';
                        return (
                            <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditingSession(null)}>
                                <div className="bg-white dark:bg-[#132338] rounded-xl shadow-xl border border-slate-200 dark:border-[#243A58] w-full max-w-md animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                                <DumbbellIcon size={16} />
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0]">Edit Session</h3>
                                        </div>
                                        <button onClick={() => setEditingSession(null)} aria-label="Close" className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 transition-colors">
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
                                                <CustomSelect value={editingSession.trainingPhase || ''} onChange={e => setEditingSession(p => ({ ...p, trainingPhase: e.target.value }))} variant="form">
                                                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                                                </CustomSelect>
                                            </div>
                                            <div>
                                                <label className={LABEL}>Load</label>
                                                <CustomSelect value={editingSession.load || 'Medium'} onChange={e => setEditingSession(p => ({ ...p, load: e.target.value }))} variant="form">
                                                    {LOADS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </CustomSelect>
                                            </div>
                                        </div>
                                        {/* Status */}
                                        <div>
                                            <label className={LABEL}>Status</label>
                                            <CustomSelect value={editingSession.status || 'Scheduled'} onChange={e => setEditingSession(p => ({ ...p, status: e.target.value }))} variant="form">
                                                <option value="Scheduled">Scheduled</option>
                                                <option value="Completed">Completed</option>
                                                <option value="Cancelled">Cancelled</option>
                                            </CustomSelect>
                                        </div>
                                    </div>
                                    {/* Footer */}
                                    <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                                        <button onClick={() => setEditingSession(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
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
                                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
};

export default EditSessionModal;
