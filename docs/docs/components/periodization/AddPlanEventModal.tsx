// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Trash2, Trophy, FlaskConical, Star } from 'lucide-react';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1';

const EVENT_TYPES = [
    { value: 'competition', label: 'Competition', icon: Trophy, color: 'text-yellow-500' },
    { value: 'testing', label: 'Testing', icon: FlaskConical, color: 'text-indigo-500' },
    { value: 'custom', label: 'Custom', icon: Star, color: 'text-emerald-500' },
];

export const AddPlanEventModal = () => {
    const {
        isPlanEventModalOpen, setIsPlanEventModalOpen,
        editingPlanEvent, setEditingPlanEvent,
        handleAddPlanEvent, handleUpdatePlanEvent, handleDeletePlanEvent,
    } = useAppState();

    const [eventLabel, setEventLabel] = useState('');
    const [eventType, setEventType] = useState('competition');
    const [date, setDate] = useState('');

    const isEditing = editingPlanEvent?.id;

    useEffect(() => {
        if (editingPlanEvent?.id) {
            setEventLabel(editingPlanEvent.label || '');
            setEventType(editingPlanEvent.type || 'competition');
            setDate(editingPlanEvent.date || '');
        } else {
            setEventLabel('');
            setEventType('competition');
            setDate(editingPlanEvent?._prefillDate || '');
        }
    }, [editingPlanEvent, isPlanEventModalOpen]);

    if (!isPlanEventModalOpen) return null;

    const handleSubmit = () => {
        if (!eventLabel.trim() || !date) return;
        if (isEditing) {
            handleUpdatePlanEvent(editingPlanEvent.id, { label: eventLabel.trim(), type: eventType, date });
        } else {
            handleAddPlanEvent({ label: eventLabel.trim(), type: eventType, date });
        }
    };

    const handleClose = () => {
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-xl w-full max-w-sm shadow-xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900">{isEditing ? 'Edit Event' : 'Add Event'}</h3>
                    <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X size={14} className="text-slate-400" /></button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className={LABEL}>Event Type</label>
                        <div className="flex gap-2">
                            {EVENT_TYPES.map(et => {
                                const Icon = et.icon;
                                return (
                                    <button key={et.value} onClick={() => setEventType(et.value)}
                                        className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${eventType === et.value ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                        <Icon size={16} className={et.color} />
                                        <span className="text-[10px] font-semibold text-slate-600">{et.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className={LABEL}>Event Name</label>
                        <input className={INPUT} placeholder="e.g. Cup Final" value={eventLabel} onChange={e => setEventLabel(e.target.value)} autoFocus />
                    </div>

                    <div>
                        <label className={LABEL}>Date</label>
                        <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                </div>

                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
                    {isEditing ? (
                        <button onClick={() => handleDeletePlanEvent(editingPlanEvent.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-500">Cancel</button>
                        <button onClick={handleSubmit} disabled={!eventLabel.trim() || !date}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40">
                            {isEditing ? 'Update' : 'Add Event'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
