// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import { DatabaseService } from '../../services/databaseService';
import { ACWR_METRIC_TYPES } from '../../utils/constants';
import {
    SaveIcon, Loader2Icon, XIcon, ChevronLeftIcon, ChevronRightIcon,
    CalendarIcon, ActivityIcon, PauseIcon,
} from 'lucide-react';

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
const labelCls = "text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1";

interface TrainingLoadEntryProps {
    teamId?: string;
    onClose?: () => void;
    onSaved?: () => void;
}

const SESSION_TYPES = [
    { id: 'training', label: 'Training' },
    { id: 'match', label: 'Match' },
    { id: 'gym', label: 'Gym' },
    { id: 'recovery', label: 'Recovery' },
];

const TrainingLoadEntry: React.FC<TrainingLoadEntryProps> = ({ teamId: preSelectedTeamId, onClose, onSaved }) => {
    const { teams, acwrSettings, acwrExclusions, showToast, loadRecords } = useAppState();

    const [selectedTeamId, setSelectedTeamId] = useState<string>(preSelectedTeamId || '');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [sessionType, setSessionType] = useState<string>('training');
    const [saving, setSaving] = useState(false);
    const [notes, setNotes] = useState('');

    // Per-athlete row data: { [athleteId]: { rpe, duration, value, skip } }
    const [rowData, setRowData] = useState<Record<string, { rpe: string; duration: string; value: string; skip: boolean }>>({});

    // Private team reference (needed before other computations)
    const privateTeam = teams.find(t => t.id === 't_private');

    // Determine if selection is a private client (ind_xxx) or a team
    const isPrivateClient = selectedTeamId.startsWith('ind_');
    const privateClientId = isPrivateClient ? selectedTeamId.replace('ind_', '') : null;

    // Get settings — team-level or individual
    const teamSettings = useMemo(() => {
        if (!selectedTeamId) return null;
        return acwrSettings[selectedTeamId] || null;
    }, [selectedTeamId, acwrSettings]);

    const lockedMethod = teamSettings?.method || 'srpe';
    const metricInfo = ACWR_METRIC_TYPES[lockedMethod];

    // Players for the selected team or individual
    const selectedTeam = isPrivateClient ? privateTeam : teams.find(t => t.id === selectedTeamId);
    const players = useMemo(() => {
        if (isPrivateClient && privateClientId) {
            const client = (privateTeam?.players || []).find(p => p.id === privateClientId);
            return client ? [client] : [];
        }
        if (!selectedTeam) return [];
        return (selectedTeam.players || []).sort((a, b) => a.name?.localeCompare(b.name));
    }, [selectedTeam, isPrivateClient, privateClientId, privateTeam]);

    // Check which athletes already have data for this date
    const existingDataForDate = useMemo(() => {
        const map: Record<string, any> = {};
        if (!loadRecords) return map;
        loadRecords.forEach(r => {
            const d = (r.date || '').split('T')[0];
            if (d === date) {
                const aid = r.athleteId || r.athlete_id;
                map[aid] = r;
            }
        });
        return map;
    }, [loadRecords, date]);

    // Pre-fill inputs from existing records whenever date or team changes
    useEffect(() => {
        const newRowData: Record<string, any> = {};
        players.forEach(p => {
            const ex = existingDataForDate[p.id];
            if (!ex) return;
            if (ex.session_type === 'rest') {
                newRowData[p.id] = { rpe: '', duration: '', value: '', skip: true };
            } else if (needsRpeDuration) {
                newRowData[p.id] = {
                    rpe: ex.rpe != null ? String(ex.rpe) : '',
                    duration: ex.duration_minutes != null ? String(ex.duration_minutes) : '',
                    value: '', skip: false,
                };
            } else {
                newRowData[p.id] = { rpe: '', duration: '', value: ex.value != null ? String(ex.value) : '', skip: false };
            }
        });
        setRowData(newRowData);
        const firstNonRest = Object.values(existingDataForDate).find((r: any) => r.session_type !== 'rest');
        if ((firstNonRest as any)?.session_type) setSessionType((firstNonRest as any).session_type);
    }, [date, selectedTeamId]); // eslint-disable-line react-hooks/exhaustive-deps

    const getRow = (id: string) => rowData[id] || { rpe: '', duration: '', value: '', skip: false };

    const updateRow = (id: string, field: string, val: any) => {
        setRowData(prev => ({
            ...prev,
            [id]: { ...getRow(id), [field]: val },
        }));
    };

    // Compute load value for a row
    const computeValue = (row: { rpe: string; duration: string; value: string }) => {
        if (row.value) return Number(row.value) || 0;
        if (lockedMethod === 'srpe' || lockedMethod === 'trimp') {
            return (Number(row.rpe) || 0) * (Number(row.duration) || 0);
        }
        return Number(row.value) || 0;
    };

    // Navigate date (timezone-safe)
    const shiftDate = (days: number) => {
        const [y, m, d] = date.split('-').map(Number);
        const dt = new Date(y, m - 1, d + days);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        setDate(`${yyyy}-${mm}-${dd}`);
    };

    const handleSaveAll = async () => {
        const records = players
            .filter(p => {
                const row = getRow(p.id);
                return !row.skip && computeValue(row) > 0;
            })
            .map(p => {
                const row = getRow(p.id);
                const val = computeValue(row);
                return {
                    athlete_id: p.id,
                    team_id: isPrivateClient ? 't_private' : selectedTeamId,
                    date,
                    metric_type: lockedMethod,
                    value: val,
                    session_type: sessionType,
                    rpe: row.rpe ? Number(row.rpe) : null,
                    duration_minutes: row.duration ? Number(row.duration) : null,
                    notes: notes.trim() || null,
                };
            });

        // Also save rest day records for skipped athletes (value=0) so EWMA knows it's a rest day
        const restRecords = players
            .filter(p => getRow(p.id).skip)
            .map(p => ({
                athlete_id: p.id,
                team_id: isPrivateClient ? 't_private' : selectedTeamId,
                date,
                metric_type: lockedMethod,
                value: 0,
                session_type: 'rest',
                rpe: null,
                duration_minutes: null,
                notes: 'Rest day',
            }));

        const allRecords = [...records, ...restRecords];
        if (allRecords.length === 0) {
            showToast?.('No load data to save. Enter values or mark rest days.');
            return;
        }

        setSaving(true);
        try {
            await DatabaseService.saveTrainingLoadsBatch(allRecords);
            showToast?.(`Saved ${records.length} load records + ${restRecords.length} rest days for ${new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`);
            onSaved?.();
        } catch (err: any) {
            console.error('Save training load batch failed:', err);
            showToast?.('Failed to save training loads');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAndNext = async () => {
        await handleSaveAll();
        // Clear row data and advance to next day
        setRowData({});
        shiftDate(1);
    };

    // Teams that have ACWR enabled (excluding t_private)
    const enabledTeams = teams.filter(t => t.id !== 't_private' && acwrSettings[t.id]?.enabled);

    // Private clients with individual ACWR enabled
    const enabledPrivateClients = (privateTeam?.players || []).filter(p => acwrSettings[`ind_${p.id}`]?.enabled);

    // Input columns based on locked method
    const needsRpeDuration = lockedMethod === 'srpe' || lockedMethod === 'trimp';
    const needsDirectValue = !needsRpeDuration;

    const filledCount = players.filter(p => computeValue(getRow(p.id)) > 0).length;
    const skippedCount = players.filter(p => getRow(p.id).skip).length;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                        <ActivityIcon size={16} />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900">Log Training Load</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Inline roster entry — fill in each athlete's load</p>
                    </div>
                </div>
                {onClose && (
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <XIcon size={16} className="text-slate-400" />
                    </button>
                )}
            </div>

            <div className="p-5 space-y-4">
                {/* Team selector + Date + Session Type */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className={labelCls}>Team / Group</label>
                        <select
                            value={selectedTeamId}
                            onChange={e => { setSelectedTeamId(e.target.value); setRowData({}); }}
                            className={inputCls}
                        >
                            <option value="">Select team...</option>
                            {enabledTeams.length > 0 && (
                                <optgroup label="Teams">
                                    {enabledTeams.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </optgroup>
                            )}
                            {enabledPrivateClients.length > 0 && (
                                <optgroup label="Private Clients">
                                    {enabledPrivateClients.map(p => (
                                        <option key={`ind_${p.id}`} value={`ind_${p.id}`}>{p.name}</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Date</label>
                        <div className="flex items-center gap-1">
                            <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg shrink-0">
                                <ChevronLeftIcon size={14} className="text-slate-400" />
                            </button>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls + ' text-center'} />
                            <button onClick={() => shiftDate(1)} className="p-2 hover:bg-slate-100 rounded-lg shrink-0">
                                <ChevronRightIcon size={14} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className={labelCls}>Session Type</label>
                        <select value={sessionType} onChange={e => setSessionType(e.target.value)} className={inputCls}>
                            {SESSION_TYPES.map(st => <option key={st.id} value={st.id}>{st.label}</option>)}
                        </select>
                    </div>
                </div>

                {/* Method indicator (locked from settings) */}
                {selectedTeamId && teamSettings && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                        <span className="text-xs font-medium text-indigo-600">
                            Method: <span className="font-bold">{metricInfo?.label}</span> — {metricInfo?.desc}
                        </span>
                        <span className="text-[9px] text-indigo-400 uppercase">Locked via Settings</span>
                    </div>
                )}

                {/* No team selected */}
                {!selectedTeamId && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                        <ActivityIcon size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Select a team with ACWR enabled to begin logging.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Enable ACWR for teams in Settings → ACWR Monitoring.</p>
                    </div>
                )}

                {/* No ACWR settings for this team */}
                {selectedTeamId && !teamSettings?.enabled && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
                        <p className="text-sm text-amber-700 font-medium">ACWR is not enabled for this team.</p>
                        <p className="text-[10px] text-amber-500 mt-1">Go to Settings → ACWR Monitoring to enable it.</p>
                    </div>
                )}

                {/* Roster spreadsheet */}
                {selectedTeamId && teamSettings?.enabled && players.length > 0 && (
                    <>
                        {/* Column headers */}
                        <div className={`grid gap-2 items-end px-1 ${needsRpeDuration ? 'grid-cols-[1fr_60px_60px_70px_50px]' : 'grid-cols-[1fr_100px_70px_50px]'}`}>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Athlete</span>
                            {needsRpeDuration ? (
                                <>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase text-center">RPE</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Min</span>
                                </>
                            ) : (
                                <span className="text-[9px] font-bold text-slate-400 uppercase text-center">{metricInfo?.unit || 'Value'}</span>
                            )}
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Load</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase text-center">Rest</span>
                        </div>

                        {/* Athlete rows */}
                        <div className="space-y-1 max-h-[400px] overflow-y-auto">
                            {players.map(player => {
                                const row = getRow(player.id);
                                const computed = computeValue(row);
                                const existing = existingDataForDate[player.id];
                                const initials = player.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                const exclusion = acwrExclusions?.[player.id];
                                const isPlayerExcluded = exclusion?.excluded === true;
                                const excludeLabel = exclusion?.excludeType === 'non_injury' ? 'Excluded' : 'Injured';

                                // Excluded players: show greyed row, no inputs
                                if (isPlayerExcluded) {
                                    return (
                                        <div
                                            key={player.id}
                                            className={`grid gap-2 items-center px-1 py-1.5 rounded-lg bg-slate-50 opacity-50 ${needsRpeDuration ? 'grid-cols-[1fr_60px_60px_70px_50px]' : 'grid-cols-[1fr_100px_70px_50px]'}`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-400 shrink-0">
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-sm font-medium text-slate-400 truncate block">{player.name}</span>
                                                    <span className="text-[9px] text-indigo-400 font-medium">{excludeLabel} — remove from ACWR Hub to log</span>
                                                </div>
                                            </div>
                                            {needsRpeDuration ? (
                                                <><div className="text-center text-slate-200 text-xs">—</div><div className="text-center text-slate-200 text-xs">—</div></>
                                            ) : (
                                                <div className="text-center text-slate-200 text-xs">—</div>
                                            )}
                                            <div className="text-center text-slate-200 text-xs">—</div>
                                            <div className="flex justify-center"><div className="w-7 h-7" /></div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={player.id}
                                        className={`grid gap-2 items-center px-1 py-1.5 rounded-lg transition-all ${
                                            row.skip ? 'bg-slate-100 opacity-60' : existing ? 'bg-emerald-50/50' : 'hover:bg-slate-50'
                                        } ${needsRpeDuration ? 'grid-cols-[1fr_60px_60px_70px_50px]' : 'grid-cols-[1fr_100px_70px_50px]'}`}
                                    >
                                        {/* Athlete name */}
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                                                {initials}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-sm font-medium text-slate-900 truncate block">{player.name}</span>
                                                {existing && <span className="text-[9px] text-emerald-600 font-medium">Editing existing</span>}
                                            </div>
                                        </div>

                                        {/* Input fields */}
                                        {needsRpeDuration ? (
                                            <>
                                                <input
                                                    type="number" min={1} max={10} placeholder="RPE"
                                                    value={row.rpe}
                                                    onChange={e => updateRow(player.id, 'rpe', e.target.value)}
                                                    disabled={row.skip}
                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center w-full focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-40"
                                                />
                                                <input
                                                    type="number" min={0} placeholder="min"
                                                    value={row.duration}
                                                    onChange={e => updateRow(player.id, 'duration', e.target.value)}
                                                    disabled={row.skip}
                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center w-full focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-40"
                                                />
                                            </>
                                        ) : (
                                            <input
                                                type="number" min={0} placeholder={metricInfo?.unit || '0'}
                                                value={row.value}
                                                onChange={e => updateRow(player.id, 'value', e.target.value)}
                                                disabled={row.skip}
                                                className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-center w-full focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-40"
                                            />
                                        )}

                                        {/* Computed load */}
                                        <div className={`text-center text-sm font-bold ${
                                            row.skip ? 'text-slate-400' : computed > 0 ? 'text-indigo-600' : 'text-slate-300'
                                        }`}>
                                            {row.skip ? '—' : computed > 0 ? computed : '—'}
                                        </div>

                                        {/* Skip / Rest day toggle */}
                                        <div className="flex justify-center">
                                            <button
                                                type="button"
                                                onClick={() => updateRow(player.id, 'skip', !row.skip)}
                                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                                    row.skip ? 'bg-amber-100 text-amber-600 border border-amber-300' : 'bg-slate-100 text-slate-300 border border-slate-200 hover:text-slate-500'
                                                }`}
                                                title={row.skip ? 'Marked as rest day' : 'Mark as rest/skip'}
                                            >
                                                <PauseIcon size={12} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary + Notes */}
                        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
                            <span className="text-xs text-slate-500">{filledCount} logged · {skippedCount} rest · {players.length - filledCount - skippedCount} empty</span>
                            <div className="flex-1" />
                            <input
                                type="text"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Session notes (optional)"
                                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 w-48 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveAll}
                                disabled={saving || (filledCount === 0 && skippedCount === 0)}
                                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors"
                            >
                                {saving
                                    ? <><Loader2Icon size={14} className="animate-spin" /> Saving...</>
                                    : <><SaveIcon size={14} /> Save</>
                                }
                            </button>
                            <button
                                onClick={handleSaveAndNext}
                                disabled={saving || (filledCount === 0 && skippedCount === 0)}
                                className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-5 py-3 transition-colors"
                            >
                                {saving
                                    ? <><Loader2Icon size={14} className="animate-spin" /> Saving...</>
                                    : <><CalendarIcon size={14} /> Save & Next Day</>
                                }
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TrainingLoadEntry;
