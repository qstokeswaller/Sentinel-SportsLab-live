// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import {
    X as XIcon,
    CalendarPlus as CalendarPlusIcon,
    MapPin as MapPinIcon,
    Clock as ClockIcon,
    Plus as PlusIcon,
    Check as CheckIcon,
    Repeat as RepeatIcon,
    Calendar as CalendarIcon,
    Trash2 as Trash2Icon,
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
        showToast,
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

    // Schedule mode
    const [scheduleMode, setScheduleMode] = useState<'range' | 'dates'>('range');
    const [selectedDates, setSelectedDates] = useState<string[]>([]);
    const [dateToAdd, setDateToAdd] = useState(new Date().toISOString().split('T')[0]);
    const [creating, setCreating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const titleRef = React.useRef(null);
    const datesRef = React.useRef(null);

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
        setScheduleMode('range');
        setSelectedDates([]);
        setDateToAdd(new Date().toISOString().split('T')[0]);
        setShowCustomTypeForm(false);
        setNewTypeLabel('');
        setCreating(false);
        setValidationErrors({});
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

    const addSelectedDate = () => {
        if (!dateToAdd || selectedDates.includes(dateToAdd)) return;
        setSelectedDates(prev => [...prev, dateToAdd].sort());
    };

    const removeSelectedDate = (d: string) => {
        setSelectedDates(prev => prev.filter(x => x !== d));
    };

    const formatDateChip = (d: string) => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { day: 'numeric', month: 'short', weekday: 'short' });
    };

    const handleSubmit = async () => {
        const errors: Record<string, string> = {};
        if (!title.trim()) errors.title = 'Please enter an event title';
        if (scheduleMode === 'dates' && selectedDates.length === 0) errors.dates = 'Please select at least one date';
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            const firstRef = errors.title ? titleRef : datesRef;
            firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setValidationErrors({});

        const basePayload = {
            title: title.trim(),
            event_type: eventType,
            color,
            description: description.trim() || null,
            location: location.trim() || null,
            all_day: allDay,
            start_time: allDay ? null : startTime || null,
            end_time: allDay ? null : endTime || null,
        };

        if (scheduleMode === 'dates' && selectedDates.length > 0) {
            // Batch create: one event per selected date — all through handler for instant UI update
            setCreating(true);
            try {
                const sorted = [...selectedDates].sort();
                for (const d of sorted) {
                    await handleAddCalendarEvent({
                        ...basePayload,
                        start_date: d,
                        end_date: d,
                    });
                }
                resetForm();
            } catch (err) {
                showToast('Failed to create events', 'error');
            } finally {
                setCreating(false);
            }
        } else {
            // Range mode — split into individual events per day
            const effectiveEnd = endDate || startDate;
            if (effectiveEnd > startDate) {
                // Multiple days: create one event per day — all through handler
                setCreating(true);
                try {
                    const dates: string[] = [];
                    const cur = new Date(startDate + 'T00:00:00');
                    const end = new Date(effectiveEnd + 'T00:00:00');
                    while (cur <= end) {
                        dates.push(cur.toISOString().split('T')[0]);
                        cur.setDate(cur.getDate() + 1);
                    }
                    for (const d of dates) {
                        await handleAddCalendarEvent({
                            ...basePayload,
                            start_date: d,
                            end_date: d,
                        });
                    }
                    resetForm();
                } catch (err) {
                    showToast('Failed to create events', 'error');
                } finally {
                    setCreating(false);
                }
            } else {
                // Single day
                handleAddCalendarEvent({
                    ...basePayload,
                    start_date: startDate,
                    end_date: startDate,
                });
                resetForm();
            }
        }
    };

    const canSubmit = !creating;

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
                    <div ref={titleRef}>
                        <label className={LABEL}>Event Name <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => { setTitle(e.target.value); if (validationErrors.title) setValidationErrors(p => { const n = { ...p }; delete n.title; return n; }); }}
                            placeholder="e.g. Team Meeting, Physio Appointment..."
                            className={`${INPUT} ${validationErrors.title ? '!border-red-400 ring-2 ring-red-100' : ''}`}
                            autoFocus
                        />
                        {validationErrors.title && <p className="text-red-500 text-[10px] font-semibold mt-1 pl-1">{validationErrors.title}</p>}
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

                    {/* Schedule Mode Toggle */}
                    <div>
                        <label className={LABEL}>Schedule</label>
                        <div className="flex rounded-lg overflow-hidden border border-slate-200 w-fit">
                            <button
                                onClick={() => setScheduleMode('range')}
                                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all ${scheduleMode === 'range' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                <CalendarIcon size={12} /> Date Range
                            </button>
                            <button
                                onClick={() => setScheduleMode('dates')}
                                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all ${scheduleMode === 'dates' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                            >
                                <RepeatIcon size={12} /> Specific Dates
                            </button>
                        </div>
                    </div>

                    {/* Date Range Mode */}
                    {scheduleMode === 'range' && (
                        <div className="grid grid-cols-2 gap-3 animate-in fade-in duration-150">
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
                    )}

                    {/* Specific Dates Mode */}
                    {scheduleMode === 'dates' && (
                        <div className="space-y-3 animate-in fade-in duration-150">
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className={LABEL}>Pick a Date</label>
                                    <input
                                        type="date"
                                        value={dateToAdd}
                                        onChange={e => setDateToAdd(e.target.value)}
                                        className={INPUT}
                                    />
                                </div>
                                <button
                                    onClick={addSelectedDate}
                                    disabled={!dateToAdd || selectedDates.includes(dateToAdd)}
                                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0"
                                >
                                    <PlusIcon size={14} /> Add
                                </button>
                            </div>

                            {selectedDates.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {selectedDates.map(d => (
                                        <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-700">
                                            {formatDateChip(d)}
                                            <button onClick={() => removeSelectedDate(d)} className="text-indigo-400 hover:text-red-500 transition-colors">
                                                <XIcon size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-400 text-center py-2">No dates selected yet. Pick dates above to add them.</p>
                            )}

                            <p className="text-[10px] text-slate-400">
                                Each date creates a separate event that can be edited or deleted individually.
                            </p>
                        </div>
                    )}

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
                        disabled={!canSubmit}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {creating ? 'Creating...' : scheduleMode === 'dates' && selectedDates.length > 1 ? `Create ${selectedDates.length} Events` : 'Create Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddEventModal;
