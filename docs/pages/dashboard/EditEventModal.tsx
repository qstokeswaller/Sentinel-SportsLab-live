// @ts-nocheck — moved verbatim from DashboardPage.tsx (monolith restructure,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';

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
import { AssigneePicker } from '../../components/calendar/AssigneePicker';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CheckIcon, ClockIcon, MapPinIcon, PencilIcon, XIcon } from 'lucide-react';

export const EditEventModal: React.FC<any> = ({
    customEventTypes,
    editingEvent,
    handleUpdateCalendarEvent,
    setEditingEvent,
    teams,
}) => {
                        const allEventTypes = [...DEFAULT_EVENT_TYPES, ...(customEventTypes || [])];
                        const INPUT = 'w-full bg-slate-50 dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] text-slate-900 dark:text-[#E2E8F0] rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors';
                        const LABEL = 'text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block mb-1.5';
                        return (
                            <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingEvent(null)}>
                                <div className="bg-white dark:bg-[#1A2D48] rounded-xl shadow-xl border border-slate-200 dark:border-[#243A58] w-full max-w-lg animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                                    {/* Header */}
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#243A58]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: editingEvent.color || '#6366f1' }}>
                                                <PencilIcon size={16} />
                                            </div>
                                            <div>
                                                <h2 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Edit Event</h2>
                                                <p className="text-[10px] text-slate-400 mt-0.5">Update event details</p>
                                            </div>
                                        </div>
                                        <button onClick={() => setEditingEvent(null)} aria-label="Close" className="p-2 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg text-slate-400 transition-colors">
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
                                            <CustomSelect
                                                value={editingEvent.event_type || 'Appointment'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    const match = allEventTypes.find(t => t.label === val);
                                                    setEditingEvent({ ...editingEvent, event_type: val, ...(match ? { color: match.color } : {}) });
                                                }}
                                                variant="form"
                                            >
                                                {allEventTypes.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                            </CustomSelect>
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

                                        {/* Assign To — multiple teams and/or athletes */}
                                        <div>
                                            <label className={LABEL}>Assign To</label>
                                            <AssigneePicker
                                                value={
                                                    Array.isArray(editingEvent.assignees) && editingEvent.assignees.length > 0
                                                        ? editingEvent.assignees
                                                        : (editingEvent.assigned_to_type && editingEvent.assigned_to_id
                                                            ? [{ type: editingEvent.assigned_to_type, id: editingEvent.assigned_to_id }]
                                                            : [])
                                                }
                                                onChange={next => setEditingEvent({ ...editingEvent, assignees: next })}
                                                teams={teams}
                                            />
                                        </div>

                                        {/* All Day Toggle */}
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setEditingEvent({ ...editingEvent, all_day: !editingEvent.all_day })}
                                                className={`w-10 h-5 rounded-full transition-colors relative ${editingEvent.all_day ? 'bg-indigo-600' : 'bg-slate-200'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editingEvent.all_day ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                            </button>
                                            <span className="text-xs font-medium text-slate-700 dark:text-[#CBD5E1]">All Day</span>
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
                                        <button onClick={() => setEditingEvent(null)} className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => {
                                                const nextAssignees = Array.isArray(editingEvent.assignees)
                                                    ? editingEvent.assignees
                                                    : (editingEvent.assigned_to_type && editingEvent.assigned_to_id
                                                        ? [{ type: editingEvent.assigned_to_type, id: editingEvent.assigned_to_id }]
                                                        : []);
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
                                                    // Canonical array + legacy single mirror (first assignee)
                                                    assignees: nextAssignees,
                                                    assigned_to_type: nextAssignees[0]?.type ?? null,
                                                    assigned_to_id: nextAssignees[0]?.id ?? null,
                                                });
                                                setEditingEvent(null);
                                            }}
                                            disabled={!editingEvent.title?.trim()}
                                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-40"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
};

export default EditEventModal;
