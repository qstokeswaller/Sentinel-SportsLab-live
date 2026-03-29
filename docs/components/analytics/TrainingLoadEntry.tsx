// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import { ACWR_METRIC_TYPES } from '../../utils/constants';
import {
    PlusIcon, SaveIcon, Loader2Icon, XIcon, UsersIcon,
    CalendarIcon, ActivityIcon, ChevronDownIcon,
} from 'lucide-react';

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
const labelCls = "text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1";

interface TrainingLoadEntryProps {
    onClose?: () => void;
    onSaved?: () => void;
}

const SESSION_TYPES = [
    { id: 'training', label: 'Training' },
    { id: 'match', label: 'Match' },
    { id: 'gym', label: 'Gym' },
    { id: 'recovery', label: 'Recovery' },
];

const TrainingLoadEntry: React.FC<TrainingLoadEntryProps> = ({ onClose, onSaved }) => {
    const { teams, showToast } = useAppState();
    const athletes = useMemo(() => teams.flatMap(t => t.players.map(p => ({ ...p, teamId: t.id, teamName: t.name }))), [teams]);

    const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [metricType, setMetricType] = useState<string>('srpe');
    const [sessionType, setSessionType] = useState<string>('training');
    const [rpe, setRpe] = useState<number | ''>('');
    const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
    const [distanceMetres, setDistanceMetres] = useState<number | ''>('');
    const [sprintDistanceMetres, setSprintDistanceMetres] = useState<number | ''>('');
    const [manualValue, setManualValue] = useState<number | ''>('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [bulkMode, setBulkMode] = useState(false);

    // Auto-compute value based on metric type
    const computedValue = useMemo(() => {
        if (manualValue !== '') return Number(manualValue);
        switch (metricType) {
            case 'srpe':
                return (Number(rpe) || 0) * (Number(durationMinutes) || 0);
            case 'sprint_distance':
                return Number(sprintDistanceMetres) || 0;
            case 'total_distance':
                return Number(distanceMetres) || 0;
            case 'duration':
                return Number(durationMinutes) || 0;
            case 'tonnage':
                return Number(manualValue) || 0;
            default:
                return Number(manualValue) || 0;
        }
    }, [metricType, rpe, durationMinutes, distanceMetres, sprintDistanceMetres, manualValue]);

    const filteredAthletes = useMemo(() => {
        if (!selectedTeamId) return athletes;
        return athletes.filter(a => a.teamId === selectedTeamId);
    }, [athletes, selectedTeamId]);

    const toggleAthlete = (id: string) => {
        setSelectedAthleteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const selectAllFiltered = () => {
        const ids = filteredAthletes.map(a => a.id);
        setSelectedAthleteIds(prev => {
            const allSelected = ids.every(id => prev.includes(id));
            if (allSelected) return prev.filter(id => !ids.includes(id));
            return [...new Set([...prev, ...ids])];
        });
    };

    const handleSave = async () => {
        if (selectedAthleteIds.length === 0) {
            showToast?.('Select at least one athlete');
            return;
        }
        if (computedValue <= 0) {
            showToast?.('Load value must be greater than 0');
            return;
        }

        setSaving(true);
        try {
            const records = selectedAthleteIds.map(athleteId => {
                const athlete = athletes.find(a => a.id === athleteId);
                return {
                    athlete_id: athleteId,
                    team_id: athlete?.teamId || selectedTeamId || null,
                    date,
                    metric_type: metricType,
                    value: computedValue,
                    session_type: sessionType,
                    rpe: rpe !== '' ? Number(rpe) : null,
                    duration_minutes: durationMinutes !== '' ? Number(durationMinutes) : null,
                    distance_metres: distanceMetres !== '' ? Number(distanceMetres) : null,
                    sprint_distance_metres: sprintDistanceMetres !== '' ? Number(sprintDistanceMetres) : null,
                    notes: notes.trim() || null,
                };
            });

            if (records.length === 1) {
                await DatabaseService.saveTrainingLoad(records[0]);
            } else {
                await DatabaseService.saveTrainingLoadsBatch(records);
            }

            showToast?.(`Saved ${records.length} load record${records.length > 1 ? 's' : ''}`);
            onSaved?.();

            // Reset form for next entry
            setSelectedAthleteIds([]);
            setRpe('');
            setDurationMinutes('');
            setDistanceMetres('');
            setSprintDistanceMetres('');
            setManualValue('');
            setNotes('');
        } catch (err: any) {
            console.error('Save training load failed:', err);
            showToast?.('Failed to save training load');
        } finally {
            setSaving(false);
        }
    };

    const metricInfo = ACWR_METRIC_TYPES[metricType];

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                        <PlusIcon size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Log Training Load</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Manual entry for ACWR monitoring</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <XIcon size={16} className="text-slate-400" />
                    </button>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* Date + Session Type row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className={labelCls}>Date</label>
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                        <label className={labelCls}>Session Type</label>
                        <select value={sessionType} onChange={e => setSessionType(e.target.value)} className={inputCls}>
                            {SESSION_TYPES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Metric Type */}
                <div>
                    <label className={labelCls}>Load Metric</label>
                    <select value={metricType} onChange={e => setMetricType(e.target.value)} className={inputCls}>
                        {Object.entries(ACWR_METRIC_TYPES).map(([id, info]) => (
                            <option key={id} value={id}>{info.label} ({info.unit})</option>
                        ))}
                    </select>
                    {metricInfo && <p className="text-[11px] text-slate-400 mt-1">{metricInfo.desc}</p>}
                </div>

                {/* Contextual input fields based on metric */}
                <div className="grid grid-cols-2 gap-3">
                    {(metricType === 'srpe' || metricType === 'trimp') && (
                        <>
                            <div>
                                <label className={labelCls}>RPE (1-10)</label>
                                <input type="number" min={1} max={10} value={rpe} onChange={e => { setRpe(e.target.value === '' ? '' : Number(e.target.value)); setManualValue(''); }} className={inputCls} placeholder="7" />
                            </div>
                            <div>
                                <label className={labelCls}>Duration (min)</label>
                                <input type="number" min={0} value={durationMinutes} onChange={e => { setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value)); setManualValue(''); }} className={inputCls} placeholder="90" />
                            </div>
                        </>
                    )}
                    {metricType === 'sprint_distance' && (
                        <>
                            <div>
                                <label className={labelCls}>Sprint Distance (m)</label>
                                <input type="number" min={0} value={sprintDistanceMetres} onChange={e => { setSprintDistanceMetres(e.target.value === '' ? '' : Number(e.target.value)); setManualValue(''); }} className={inputCls} placeholder="320" />
                            </div>
                            <div>
                                <label className={labelCls}>Total Distance (m)</label>
                                <input type="number" min={0} value={distanceMetres} onChange={e => setDistanceMetres(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="9500" />
                            </div>
                        </>
                    )}
                    {metricType === 'total_distance' && (
                        <div className="col-span-2">
                            <label className={labelCls}>Total Distance (m)</label>
                            <input type="number" min={0} value={distanceMetres} onChange={e => { setDistanceMetres(e.target.value === '' ? '' : Number(e.target.value)); setManualValue(''); }} className={inputCls} placeholder="9500" />
                        </div>
                    )}
                    {metricType === 'duration' && (
                        <div className="col-span-2">
                            <label className={labelCls}>Duration (min)</label>
                            <input type="number" min={0} value={durationMinutes} onChange={e => { setDurationMinutes(e.target.value === '' ? '' : Number(e.target.value)); setManualValue(''); }} className={inputCls} placeholder="90" />
                        </div>
                    )}
                    {(metricType === 'tonnage' || metricType === 'player_load') && (
                        <div className="col-span-2">
                            <label className={labelCls}>{metricInfo?.label} ({metricInfo?.unit})</label>
                            <input type="number" min={0} value={manualValue} onChange={e => setManualValue(e.target.value === '' ? '' : Number(e.target.value))} className={inputCls} placeholder="Enter value" />
                        </div>
                    )}
                </div>

                {/* Computed value display */}
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-indigo-600">Computed Load Value</span>
                    <span className="text-lg font-bold text-indigo-900">{computedValue} <span className="text-xs font-normal text-indigo-400">{metricInfo?.unit}</span></span>
                </div>

                {/* Team filter + athlete selector */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className={labelCls + ' mb-0'}>Athletes</label>
                        <div className="flex items-center gap-2">
                            <select
                                value={selectedTeamId}
                                onChange={e => setSelectedTeamId(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600"
                            >
                                <option value="">All Teams</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <button
                                type="button"
                                onClick={selectAllFiltered}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 bg-indigo-50 rounded-lg"
                            >
                                Toggle All
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2 bg-slate-50/50">
                        {filteredAthletes.map(athlete => {
                            const selected = selectedAthleteIds.includes(athlete.id);
                            return (
                                <button
                                    key={athlete.id}
                                    type="button"
                                    onClick={() => toggleAthlete(athlete.id)}
                                    className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all text-xs ${
                                        selected
                                            ? 'bg-indigo-100 border border-indigo-300 text-indigo-900 font-medium'
                                            : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                                        selected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-400'
                                    }`}>
                                        {athlete.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="truncate">{athlete.name}</span>
                                </button>
                            );
                        })}
                    </div>
                    {selectedAthleteIds.length > 0 && (
                        <p className="text-[11px] text-indigo-500 mt-1 font-medium">{selectedAthleteIds.length} athlete{selectedAthleteIds.length > 1 ? 's' : ''} selected</p>
                    )}
                </div>

                {/* Notes */}
                <div>
                    <label className={labelCls}>Notes (optional)</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        className={inputCls + ' resize-none'}
                        placeholder="e.g. match day, reduced session, GPS data..."
                    />
                </div>

                {/* Save */}
                <button
                    onClick={handleSave}
                    disabled={saving || selectedAthleteIds.length === 0 || computedValue <= 0}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors"
                >
                    {saving
                        ? <><Loader2Icon size={14} className="animate-spin" /> Saving...</>
                        : <><SaveIcon size={14} /> Save Training Load{selectedAthleteIds.length > 1 ? ` (×${selectedAthleteIds.length})` : ''}</>
                    }
                </button>
            </div>
        </div>
    );
};

export default TrainingLoadEntry;
