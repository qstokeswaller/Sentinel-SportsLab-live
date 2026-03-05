// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    X as XIcon,
    CalendarPlus as CalendarPlusIcon,
    MapPin as MapPinIcon,
    Clock as ClockIcon,
    Plus as PlusIcon,
    Check as CheckIcon,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────

const DEFAULT_EVENT_TYPES = [
    { label: 'Appointment', color: '#3b82f6' },
    { label: 'Meeting', color: '#6366f1' },
    { label: 'Note', color: '#64748b' },
];

const PRESET_COLORS = [
    '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
    '#ec4899', '#8b5cf6', '#ef4444', '#64748b',
];

const INPUT = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors';
const LABEL = 'text-xs font-medium text-slate-600 block mb-1.5';

// ── Component ────────────────────────────────────────────────────────────

const AddEventModal = () => {
    const {
        isAddEventModalOpen, setIsAddEventModalOpen,
        customEventTypes,
        handleAddCalendarEvent,
        handleSaveCustomEventTypes,
    } = useAppState();

    // Form state
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState('Appointment');
    const [color, setColor] = useState('#3b82f6');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [allDay, setAllDay] = useState(false);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');

    // Custom type inline form
    const [showCustomTypeForm, setShowCustomTypeForm] = useState(false);
    const [newTypeLabel, setNewTypeLabel] = useState('');
    const [newTypeColor, setNewTypeColor] = useState('#8b5cf6');

    if (!isAddEventModalOpen) return null;

    const allEventTypes = [...DEFAULT_EVENT_TYPES, ...customEventTypes];

    const resetForm = () => {
        setTitle('');
        setEventType('Appointment');
        setColor('#3b82f6');
        setDescription('');
        setLocation('');
        setAllDay(false);
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setStartTime('09:00');
        setEndTime('10:00');
        setShowCustomTypeForm(false);
        setNewTypeLabel('');
    };

    const handleClose = () => {
        resetForm();
        setIsAddEventModalOpen(false);
    };

    const handleTypeChange = (value: string) => {
        if (value === '__add_custom__') {
            setShowCustomTypeForm(true);
            return;
        }
        setEventType(value);
        setShowCustomTypeForm(false);
        // Auto-set color to the type's default
        const match = allEventTypes.find(t => t.label === value);
        if (match) setColor(match.color);
    };

    const handleAddCustomType = () => {
        if (!newTypeLabel.trim()) return;
        const newType = { label: newTypeLabel.trim(), color: newTypeColor };
        handleSaveCustomEventTypes([...customEventTypes, newType]);
        setEventType(newType.label);
        setColor(newType.color);
        setShowCustomTypeForm(false);
        setNewTypeLabel('');
    };

    const handleSubmit = () => {
        if (!title.trim()) return;
        handleAddCalendarEvent({
            title: title.trim(),
            event_type: eventType,
            color,
            description: description.trim() || null,
            location: location.trim() || null,
            all_day: allDay,
            start_date: startDate,
            end_date: endDate || startDate,
            start_time: allDay ? null : startTime || null,
            end_time: allDay ? null : endTime || null,
        });
        resetForm();
    };

    return (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                            <CalendarPlusIcon size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Add a New Event</h2>
                            <p className="text-[10px] text-slate-400 mt-0.5">Schedule an appointment, meeting, or note</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                        <XIcon size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {/* Event Name */}
                    <div>
                        <label className={LABEL}>Event Name <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Team Meeting, Physio Appointment..."
                            className={INPUT}
                            autoFocus
                        />
                    </div>

                    {/* Event Type */}
                    <div>
                        <label className={LABEL}>Event Type <span className="text-red-400">*</span></label>
                        <select
                            value={showCustomTypeForm ? '__add_custom__' : eventType}
                            onChange={e => handleTypeChange(e.target.value)}
                            className={INPUT + ' appearance-none'}
                        >
                            {allEventTypes.map(t => (
                                <option key={t.label} value={t.label}>{t.label}</option>
                            ))}
                            <option value="__add_custom__">+ Add custom type...</option>
                        </select>

                        {/* Inline custom type form */}
                        {showCustomTypeForm && (
                            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 animate-in slide-in-from-top-2 duration-150">
                                <input
                                    type="text"
                                    value={newTypeLabel}
                                    onChange={e => setNewTypeLabel(e.target.value)}
                                    placeholder="Type name, e.g. Travel, Clinic..."
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                                    autoFocus
                                />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-medium">Color:</span>
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setNewTypeColor(c)}
                                            className={`w-5 h-5 rounded-full border-2 transition-all ${newTypeColor === c ? 'border-slate-900 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleAddCustomType} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors">
                                        Save Type
                                    </button>
                                    <button onClick={() => setShowCustomTypeForm(false)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Event Color */}
                    <div>
                        <label className={LABEL}>Event Color</label>
                        <div className="flex items-center gap-2">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setColor(c)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all flex items-center justify-center ${color === c ? 'border-slate-900 scale-110' : 'border-slate-200 hover:border-slate-400'}`}
                                    style={{ backgroundColor: c }}
                                >
                                    {color === c && <CheckIcon size={12} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className={LABEL}>Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add event details..."
                            rows={3}
                            className={INPUT + ' resize-none'}
                        />
                    </div>

                    {/* Location */}
                    <div>
                        <label className={LABEL}>Location</label>
                        <div className="relative">
                            <MapPinIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="e.g. Training Facility, Room 204..."
                                className={INPUT + ' pl-9'}
                            />
                        </div>
                    </div>

                    {/* All Day Toggle */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setAllDay(!allDay)}
                            className={`w-10 h-5 rounded-full transition-colors relative ${allDay ? 'bg-indigo-600' : 'bg-slate-200'}`}
                        >
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allDay ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                        <span className="text-xs font-medium text-slate-700">All Day</span>
                    </div>

                    {/* Date / Time Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={LABEL}>Start Date <span className="text-red-400">*</span></label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className={INPUT}
                            />
                        </div>
                        <div>
                            <label className={LABEL}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                min={startDate}
                                className={INPUT}
                            />
                        </div>
                    </div>

                    {!allDay && (
                        <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2 duration-150">
                            <div>
                                <label className={LABEL}>Start Time</label>
                                <div className="relative">
                                    <ClockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={e => setStartTime(e.target.value)}
                                        className={INPUT + ' pl-9'}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>End Time</label>
                                <div className="relative">
                                    <ClockIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={e => setEndTime(e.target.value)}
                                        className={INPUT + ' pl-9'}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
                    <button
                        onClick={handleClose}
                        className="flex-1 py-2.5 bg-slate-50 text-slate-500 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!title.trim()}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Create Event
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEventModal;
