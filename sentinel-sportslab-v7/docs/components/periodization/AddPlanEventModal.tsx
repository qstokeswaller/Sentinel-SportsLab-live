// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { X, Trash2, Trophy, FlaskConical, Star, Plane, Heart, Tent, Flag, Stethoscope, MapPin, AlignLeft, Calendar } from 'lucide-react';
import { EVENT_TYPE_LABELS, EVENT_TYPE_COLORS } from '../../utils/periodizationUtils';

const INPUT = 'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#0F1C30] text-sm text-slate-800 dark:text-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
const LABEL = 'block text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide mb-1';

const EVENT_TYPE_ICONS = {
    competition: Trophy,
    testing:     FlaskConical,
    custom:      Star,
    travel:      Plane,
    recovery:    Heart,
    camp:        Tent,
    deadline:    Flag,
    medical:     Stethoscope,
};

const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS);

export const AddPlanEventModal = () => {
    const {
        isPlanEventModalOpen, setIsPlanEventModalOpen,
        editingPlanEvent, setEditingPlanEvent,
        handleAddPlanEvent, handleUpdatePlanEvent, handleDeletePlanEvent,
    } = useAppState();

    const [eventLabel,   setEventLabel]   = useState('');
    const [eventType,    setEventType]    = useState('competition');
    const [date,         setDate]         = useState('');
    const [endDate,      setEndDate]      = useState('');
    const [description,  setDescription]  = useState('');
    const [location,     setLocation]     = useState('');
    const [importance,   setImportance]   = useState('major');
    const [customColor,  setCustomColor]  = useState('');

    const isEditing = !!(editingPlanEvent?.id);
    const derivedColor = customColor || EVENT_TYPE_COLORS[eventType] || '#6366f1';

    useEffect(() => {
        if (!isPlanEventModalOpen) return;
        if (editingPlanEvent?.id) {
            const e = editingPlanEvent;
            setEventLabel(e.label || '');
            setEventType(e.type || 'competition');
            setDate(e.date || '');
            setEndDate(e.endDate || '');
            setDescription(e.description || '');
            setLocation(e.location || '');
            setImportance(e.importance || 'major');
            setCustomColor(e.color && e.color !== EVENT_TYPE_COLORS[e.type] ? e.color : '');
        } else {
            setEventLabel('');
            setEventType('competition');
            setDate(editingPlanEvent?._prefillDate || '');
            setEndDate('');
            setDescription('');
            setLocation('');
            setImportance('major');
            setCustomColor('');
        }
    }, [editingPlanEvent, isPlanEventModalOpen]);

    if (!isPlanEventModalOpen) return null;

    const canSubmit = eventLabel.trim() && date;

    const handleSubmit = () => {
        if (!canSubmit) return;
        const data = {
            label:       eventLabel.trim(),
            type:        eventType,
            date,
            endDate:     endDate || undefined,
            description: description.trim() || undefined,
            location:    location.trim() || undefined,
            importance,
            color:       customColor || EVENT_TYPE_COLORS[eventType],
        };
        if (isEditing) {
            handleUpdatePlanEvent(editingPlanEvent.id, data);
        } else {
            handleAddPlanEvent(data);
        }
    };

    const handleClose = () => {
        setIsPlanEventModalOpen(false);
        setEditingPlanEvent(null);
    };

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-md shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: derivedColor }} />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">
                            {isEditing ? 'Edit Event' : 'Add Event'}
                        </h3>
                    </div>
                    <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48]">
                        <X size={14} className="text-slate-400" />
                    </button>
                </div>

                <div className="p-5 space-y-4 max-h-[74vh] overflow-y-auto">

                    {/* ── Event Type ──────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>Event Type</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {EVENT_TYPES.map(et => {
                                const Icon = EVENT_TYPE_ICONS[et] || Star;
                                const color = EVENT_TYPE_COLORS[et];
                                const isActive = eventType === et;
                                return (
                                    <button key={et} type="button" onClick={() => setEventType(et)}
                                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all`}
                                        style={isActive
                                            ? { borderColor: color, backgroundColor: color + '20' }
                                            : { borderColor: 'transparent', backgroundColor: 'transparent' }}>
                                        <span className="p-1.5 rounded-lg" style={{ backgroundColor: color + '20' }}>
                                            <Icon size={12} style={{ color }} />
                                        </span>
                                        <span className={`text-[8px] font-semibold text-center leading-tight ${isActive ? '' : 'text-slate-500 dark:text-[#94A3B8]'}`}
                                            style={{ color: isActive ? color : undefined }}>
                                            {EVENT_TYPE_LABELS[et].split(' / ')[0]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Event Name ──────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>Event Name</label>
                        <input className={INPUT} placeholder="e.g. Cup Final, Pre-Season Camp…"
                            value={eventLabel} onChange={e => setEventLabel(e.target.value)} autoFocus />
                    </div>

                    {/* ── Dates ───────────────────────────────────────────────── */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Start Date</label>
                            <input type="date" className={INPUT} value={date} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label className={LABEL}>
                                End Date
                                <span className="normal-case font-normal text-slate-400 dark:text-[#64748B] ml-1">(optional)</span>
                            </label>
                            <input type="date" className={INPUT} value={endDate}
                                min={date || undefined}
                                onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>

                    {/* ── Importance ──────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>Importance</label>
                        <div className="flex gap-2">
                            {[{ v: 'major', l: 'Major' }, { v: 'minor', l: 'Minor' }].map(({ v, l }) => (
                                <button key={v} type="button" onClick={() => setImportance(v)}
                                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                        importance === v
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'text-slate-500 dark:text-[#94A3B8] border-slate-200 dark:border-[#243A58] hover:border-indigo-300'
                                    }`}>
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Location ────────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>
                            Location
                            <span className="normal-case font-normal text-slate-400 dark:text-[#64748B] ml-1">(optional)</span>
                        </label>
                        <div className="relative">
                            <MapPin size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input className={INPUT + ' pl-8'} placeholder="e.g. Stamford Bridge, Dubai…"
                                value={location} onChange={e => setLocation(e.target.value)} />
                        </div>
                    </div>

                    {/* ── Description ─────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>
                            Notes
                            <span className="normal-case font-normal text-slate-400 dark:text-[#64748B] ml-1">(optional)</span>
                        </label>
                        <textarea className={`${INPUT} resize-none`} rows={2}
                            placeholder="Any relevant context, preparation notes…"
                            value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    {/* ── Custom color ─────────────────────────────────────────── */}
                    <div>
                        <label className={LABEL}>
                            Custom Colour
                            <span className="normal-case font-normal text-slate-400 dark:text-[#64748B] ml-1">(optional — overrides type default)</span>
                        </label>
                        <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                                <input type="color" value={customColor || EVENT_TYPE_COLORS[eventType]}
                                    onChange={e => setCustomColor(e.target.value)}
                                    className="w-9 h-9 rounded-lg border border-slate-200 dark:border-[#243A58] cursor-pointer p-0.5 bg-transparent" />
                            </div>
                            {customColor && (
                                <button type="button" onClick={() => setCustomColor('')}
                                    className="text-[10px] text-slate-400 hover:text-slate-600 underline">
                                    Reset to type default
                                </button>
                            )}
                            {!customColor && (
                                <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                                    Using {EVENT_TYPE_LABELS[eventType]} default
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/30">
                    {isEditing ? (
                        <button onClick={() => { handleDeletePlanEvent(editingPlanEvent.id); handleClose(); }}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                            <Trash2 size={12} /> Delete
                        </button>
                    ) : <div />}
                    <div className="flex gap-2">
                        <button onClick={handleClose} className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-[#94A3B8] hover:text-slate-700">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} disabled={!canSubmit}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                            {isEditing ? 'Update Event' : 'Add Event'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
