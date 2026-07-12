// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect } from 'react';
import { PLATFORM_FIELDS, fuzzyMatchHeader } from '../../components/performance/GpsColumnMapper';
import { GpsCategory, GpsTeamProfile, getProfileForTeam, loadGpsCategories, loadGpsProfiles, saveGpsCategories, saveGpsProfiles } from '../../components/performance/GpsConfigModal';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { SupabaseStorageService as StorageService } from '../../services/storageService';
import { normaliseDate } from '../../utils/csvSchemas';
import { fuzzySearch } from '../../utils/fuzzySearch';
import { GpsDateRangeView, GpsSessionTable, gpsSortCols } from './gpsTables';
import { ActivityIcon, AlertCircleIcon, AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon, CalendarIcon, CheckCircleIcon, CheckIcon, Edit3Icon, InfoIcon, PlusCircleIcon, SearchIcon, SlidersIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react';
import DatePicker from '../../components/ui/DatePicker';

export const GpsDataReport: React.FC<any> = ({
    acwrSettings,
    gpsChangeDateCategory,
    gpsColConfigOpen,
    gpsColLabel,
    gpsColSearch,
    gpsData,
    gpsDataSources,
    gpsDialogAthleteCol,
    gpsDialogCategories,
    gpsDialogDateCol,
    gpsDialogPhaseCol,
    gpsFilterDateMode,
    gpsFilterTarget,
    gpsFilteredRecords,
    gpsHideCol,
    gpsHistoricalColKeys,
    gpsImportCategory,
    gpsImportDateOverride,
    gpsImportMessage,
    gpsImportStatus,
    gpsImportTeamId,
    gpsMatchedProfile,
    gpsMergedColConfig,
    gpsMissingColWarning,
    gpsNewCatLabel,
    gpsNewColumns,
    gpsRangeEnd,
    gpsRangeStart,
    gpsSaveColConfig,
    gpsSessionDates,
    gpsShowNewCat,
    gpsSmartDialog,
    gpsSpecificDate,
    gpsTab,
    gpsUnlinkedDialog,
    gpsVisibleColKeys,
    manualColConfig,
    manualColPickerOpen,
    manualDate,
    manualRows,
    manualTeamId,
    newManualColName,
    polarIntegration,
    polarSyncMessage,
    polarSyncStatus,
    renderGpsInsights,
    setGpsColConfigOpen,
    setGpsColSearch,
    setGpsData,
    setGpsDialogAthleteCol,
    setGpsDialogCategories,
    setGpsDialogDateCol,
    setGpsDialogPhaseCol,
    setGpsFilterDateMode,
    setGpsFilterTarget,
    setGpsImportCategory,
    setGpsImportDateOverride,
    setGpsImportMessage,
    setGpsImportStatus,
    setGpsImportTeamId,
    setGpsMatchedProfile,
    setGpsMissingColWarning,
    setGpsNewCatLabel,
    setGpsNewColumns,
    setGpsRangeEnd,
    setGpsRangeStart,
    setGpsShowNewCat,
    setGpsSmartDialog,
    setGpsSpecificDate,
    setGpsTab,
    setGpsUnlinkedDialog,
    setManualColConfig,
    setManualColPickerOpen,
    setManualDate,
    setManualRows,
    setManualTeamId,
    setNewManualColName,
    setPolarSyncMessage,
    setPolarSyncStatus,
    showToast,
    syncGpsToLoadRecords,
    teams,
}) => {

        // ── Helper: fuzzy detect a column from headers ──────────────────────
        const normStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
        const detectColFromHeaders = (headers: string[], aliases: string[]): string => {
            for (const alias of aliases) {
                const a = normStr(alias);
                const exact = headers.find(h => normStr(h) === a);
                if (exact) return exact;
            }
            for (const alias of aliases) {
                const a = normStr(alias);
                const partial = headers.find(h => normStr(h).includes(a) || a.includes(normStr(h)));
                if (partial) return partial;
            }
            return '';
        };

        // Use memoised derivations from component scope (not re-derived on every render)
        const historicalColKeys = gpsHistoricalColKeys;
        const mergedColConfig = gpsMergedColConfig;
        const saveColConfig = gpsSaveColConfig;
        const colLabel = gpsColLabel;

        // ── Polar Sync ────────────────────────────────────────────────
        const handlePolarSync = async () => {
            if (!polarIntegration?.accessToken) {
                setPolarSyncStatus('error');
                setPolarSyncMessage('Polar not connected — go to Settings → GPS Configuration to connect.');
                return;
            }
            setPolarSyncStatus('syncing');
            setPolarSyncMessage('Fetching exercises from Polar...');
            try {
                // Call server-side proxy to avoid CORS issues with Polar's API
                const res = await fetch('/api/polar-sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: polarIntegration.accessToken,
                        type: polarIntegration.type || 'team_pro',
                    }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                    throw new Error(err.error || `Sync failed (${res.status})`);
                }
                const { sessions: list } = await res.json();
                if (!list || list.length === 0) {
                    setPolarSyncStatus('success');
                    setPolarSyncMessage('No exercises found.');
                    setTimeout(() => setPolarSyncStatus('idle'), 5000);
                    return;
                }
                // Map Polar sessions to GPS records format (handles both team_pro and individual)
                const newRecords = [];
                for (const s of list) {
                    const { session, players } = s;
                    for (const p of players) {
                        newRecords.push({
                            id: `polar_${session.id}_${p.playerId || 'self'}`,
                            source: s.source || 'polar',
                            playerName: p.playerName || 'Polar Athlete',
                            playerNumber: p.playerNumber || '',
                            athleteId: 'unknown',
                            date: session.date || new Date().toISOString().split('T')[0],
                            category: 'training',
                            teamId: selectedTeam?.id || '',
                            rawColumns: p.rawColumns || {},
                        });
                    }
                }
                setGpsData(prev => {
                    const existingIds = new Set(prev.map((r: any) => r.id));
                    const fresh = newRecords.filter((r: any) => !existingIds.has(r.id));
                    return [...prev, ...fresh];
                });

                // Auto-create a GPS team profile on first sync using the actual columns
                // returned by Polar so all fields (zones, HRV, load metrics, etc.) are
                // available in the GPS Data Hub and ACWR without manual configuration.
                if (selectedTeam?.id && newRecords.length > 0) {
                    const existingProfiles = loadGpsProfiles();
                    if (!existingProfiles.some(p => p.teamId === selectedTeam.id)) {
                        const sampleColumns = Object.keys(newRecords[0]?.rawColumns || {});
                        const columnMapping = sampleColumns.map(col => {
                            const { fieldId } = fuzzyMatchHeader(col);
                            const field = PLATFORM_FIELDS.find(f => f.id === fieldId);
                            return {
                                csvColumn:     col,
                                platformField: fieldId || '',
                                displayName:   field?.label || col,
                                autoMapped:    !!fieldId,
                            };
                        });
                        const teamAcwrMethod = acwrSettings?.[selectedTeam.id]?.method || 'total_distance';
                        const POLAR_ACWR_COLS: Record<string, string> = {
                            total_distance:  'Total distance [m]',
                            sprint_distance: 'Total distance [m]',
                            player_load:     'Training load score',
                            hml:             'Total distance [m]',
                            srpe:            'Training load score',
                        };
                        saveGpsProfiles([...existingProfiles, {
                            teamId:            selectedTeam.id,
                            teamName:          selectedTeam.name,
                            provider:          'Polar Team Pro',
                            columnMapping,
                            acwrColumn:        POLAR_ACWR_COLS[teamAcwrMethod] || 'Total distance [m]',
                            headerFingerprint: sampleColumns.map(h => h.toLowerCase().trim()).sort(),
                            savedAt:           new Date().toISOString(),
                        }]);
                    }
                }

                setPolarSyncStatus('success');
                setPolarSyncMessage(`Synced ${newRecords.length} exercise${newRecords.length !== 1 ? 's' : ''} from Polar`);
                setTimeout(() => setPolarSyncStatus('idle'), 8000);
            } catch (err: any) {
                console.error('Polar sync error:', err);
                setPolarSyncStatus('error');
                setPolarSyncMessage(err.message || 'Polar sync failed');
                setTimeout(() => setPolarSyncStatus('idle'), 8000);
            }
        };

        // Derive whether the currently selected team uses Polar
        const selectedTeam = teams.find(t => t.name === gpsFilterTarget);
        const teamDataSource = selectedTeam ? (gpsDataSources?.[selectedTeam.id] || 'csv') : 'csv';
        const isPolarSource = teamDataSource === 'polar' && polarIntegration?.connected === true;

        const handleFileUpload = (event) => {
            const file = event.target.files[0];
            if (!file) return;
            event.target.value = '';
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = (e.target.result as string);
                const lines = text.split('\n').filter(l => l.trim() !== '');
                if (lines.length < 2) { setGpsImportStatus('error'); setGpsImportMessage('CSV file is empty.'); return; }
                const headers = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const rows = lines.slice(1).map(row => {
                    const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                    const obj: Record<string, string> = {};
                    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
                    return obj;
                });
                const ac = detectColFromHeaders(headers, ['player name','player','athlete','name','athlete name','full name','athlete_name','player_name']);
                const dc = detectColFromHeaders(headers, ['session_date','session date','date','start time','match date','activity date']);
                const pc = detectColFromHeaders(headers, ['phase name','phase','period','section','drill','split']);

                // ── Profile detection ────────────────────────────────────────
                // Try selected team's profile first, then scan all profiles by header fingerprint
                const normalised = headers.map(h => h.toLowerCase().trim()).sort();
                let matchedProfile: GpsTeamProfile | null = null;
                let newCols: string[] = [];

                const tryProfile = (p: GpsTeamProfile | null) => {
                    if (!p || !p.headerFingerprint?.length) return false;
                    const saved = new Set(p.headerFingerprint.map(h => h.toLowerCase().trim()));
                    const overlap = normalised.filter(h => saved.has(h)).length;
                    if (overlap / p.headerFingerprint.length >= 0.8) {
                        matchedProfile = p;
                        newCols = normalised.filter(h => !saved.has(h));
                        return true;
                    }
                    return false;
                };

                // Check selected team first
                if (gpsImportTeamId) {
                    tryProfile(getProfileForTeam(gpsImportTeamId));
                }
                // Fallback: scan all profiles
                if (!matchedProfile) {
                    for (const p of loadGpsProfiles()) { if (tryProfile(p)) break; }
                }

                setGpsMatchedProfile(matchedProfile);
                setGpsNewColumns(newCols);

                // Detect columns missing vs history (appeared before, not in this file)
                const missingFromFile = historicalColKeys.filter(k => !headers.includes(k));
                setGpsSmartDialog({ headers, rows, athleteCol: ac, dateCol: dc, phaseCol: pc });
                setGpsDialogAthleteCol(ac);
                setGpsDialogDateCol(dc);
                setGpsDialogPhaseCol(pc);
                // Refresh categories in case settings changed
                setGpsDialogCategories(loadGpsCategories());
                // Warn about missing historical columns — separate state, non-blocking
                setGpsMissingColWarning(missingFromFile);
            };
            reader.readAsText(file);
        };

        const handleSmartImport = (athleteCol: string, dateCol: string, phaseCol: string) => {
            if (!gpsSmartDialog) return;
            const { rows, headers } = gpsSmartDialog;
            const allPlayers = teams.flatMap(t => t.players);
            // Resolve ACWR column from matched profile
            const acwrCol = gpsMatchedProfile?.acwrColumn || '';

            const newRecords = rows.map(row => {
                const athleteName = row[athleteCol] || 'Unknown';
                const date = gpsImportDateOverride || normaliseDate(row[dateCol] || '');
                const phase = phaseCol ? (row[phaseCol] || '') : '';
                const rawColumns: Record<string, string> = {};
                for (const h of headers) {
                    if (h === athleteCol || h === dateCol) continue;
                    const val = row[h];
                    if (val === undefined || val === null || val === '') continue;
                    const hms = val.match(/^(\d+):(\d{2}):(\d{2})$/);
                    rawColumns[h] = hms ? String((parseInt(hms[1])*60 + parseInt(hms[2]) + parseInt(hms[3])/60).toFixed(1)) : val;
                }
                const player = allPlayers.find(p =>
                    p.name.toLowerCase().includes(athleteName.toLowerCase()) ||
                    athleteName.toLowerCase().includes(p.name.toLowerCase())
                );
                return {
                    id: `gps_${crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substr(2,9))}`,
                    date, playerName: athleteName, phase,
                    athleteId: player ? player.id : 'unknown',
                    matchedName: player ? player.name : athleteName,
                    rawColumns,
                    category: gpsImportCategory || 'training',
                    acwrValue: acwrCol && rawColumns[acwrCol] ? parseFloat(rawColumns[acwrCol]) || 0 : null,
                    timestamp: new Date().toISOString(),
                };
            });
            const updated = [...gpsData, ...newRecords];
            setGpsData(updated);
            StorageService.saveGpsData(updated);
            // Auto-sync new GPS records to training_loads for ACWR
            syncGpsToLoadRecords(newRecords);
            setGpsSmartDialog(null);
            setGpsImportDateOverride('');
            // Detect names that didn't match roster
            const unlinked = [...new Set(newRecords.filter(r => r.athleteId === 'unknown').map(r => r.playerName))];
            if (unlinked.length > 0) {
                setGpsUnlinkedDialog(unlinked.map(name => ({ name })));
            }
            setGpsMissingColWarning([]); // clear pre-import warning once data lands
            setGpsImportStatus('success');
            setGpsImportMessage(`Imported ${newRecords.length} rows · ${headers.length} columns`);
            setTimeout(() => setGpsImportStatus(null), 8000);
        };

        const clearGpsData = () => {
            if (confirm('Clear all GPS telemetry data?')) { setGpsData([]); StorageService.saveGpsData([]); }
        };

        // ── Manual entry helpers ─────────────────────────────────────────────
        const manualTeam = teams.find(t => t.id === manualTeamId);
        const manualAthletes = manualTeam ? manualTeam.players : [];

        const handleManualSave = () => {
            if (!manualTeamId || !manualDate) return;
            const newRecords = manualAthletes.map(p => {
                const row = manualRows[p.id] || {};
                const rawColumns: Record<string, string> = {};
                for (const col of manualColConfig) {
                    if (row[col.key] !== undefined && row[col.key] !== '') rawColumns[col.key] = row[col.key];
                }
                return {
                    id: `gps_${crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).substr(2,9))}`,
                    date: manualDate, playerName: p.name, phase: '',
                    athleteId: p.id, matchedName: p.name, rawColumns,
                    timestamp: new Date().toISOString(),
                };
            }).filter(r => Object.keys(r.rawColumns).length > 0);
            if (newRecords.length === 0) return;
            const updated = [...gpsData, ...newRecords];
            setGpsData(updated);
            StorageService.saveGpsData(updated);
            setManualRows({});
            setGpsImportStatus('success');
            setGpsImportMessage(`Saved ${newRecords.length} manual rows`);
            setTimeout(() => setGpsImportStatus(null), 5000);
        };

        return (
            <div className="space-y-6 animate-in fade-in duration-500">

                {/* ── Smart CSV Import Dialog ──────────────────────────────── */}
                {gpsSmartDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setGpsSmartDialog(null); setGpsImportDateOverride(''); }} />
                        <div className="relative bg-white dark:bg-[#132338] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50 dark:bg-[#0F1C30] rounded-t-2xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
                                    <ActivityIcon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">Smart GPS Import</h3>
                                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">{gpsSmartDialog.rows.length} rows · {gpsSmartDialog.headers.length} columns — all imported as-is</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">

                                {/* ── Profile match banner ── */}
                                {gpsMatchedProfile ? (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <CheckCircleIcon size={16} className="text-emerald-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-emerald-800">
                                                Profile matched — {gpsMatchedProfile.teamName}{gpsMatchedProfile.provider ? ` · ${gpsMatchedProfile.provider}` : ''}
                                            </p>
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                {Array.isArray(gpsMatchedProfile.columnMapping) ? gpsMatchedProfile.columnMapping.filter(m => m.platformField).length : 0} columns pre-mapped
                                                {gpsMatchedProfile.acwrColumn ? ` · ACWR bound to "${gpsMatchedProfile.acwrColumn.slice(0,40)}${gpsMatchedProfile.acwrColumn.length > 40 ? '…' : ''}"` : ' · ACWR column not bound'}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
                                        <AlertTriangleIcon size={16} className="text-amber-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-amber-800">No profile found for this file</p>
                                            <p className="text-[10px] text-amber-600 mt-0.5">
                                                ACWR won't read GPS data until a profile is configured in Settings → GPS Data. Import will still proceed.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── New columns warning ── */}
                                {gpsNewColumns.length > 0 && (
                                    <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-900/50 rounded-xl px-4 py-3 flex items-start gap-3">
                                        <InfoIcon size={15} className="text-sky-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-semibold text-sky-800">{gpsNewColumns.length} new column{gpsNewColumns.length > 1 ? 's' : ''} not in saved profile</p>
                                            <p className="text-[10px] text-sky-600 mt-0.5">
                                                {gpsNewColumns.slice(0, 3).join(', ')}{gpsNewColumns.length > 3 ? ` +${gpsNewColumns.length - 3} more` : ''} — imported as-is. Update the profile in Settings to map them.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ── Team + Category row ── */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide">Team <span className="text-slate-400 dark:text-[#CBD5E1] font-normal">(for profile lookup)</span></label>
                                        <CustomSelect
                                            value={gpsImportTeamId}
                                            onChange={e => setGpsImportTeamId(e.target.value)}
                                            variant="form"
                                            size="xs"
                                            placeholder="— Select team —"
                                        >
                                            <option value="">— Select team —</option>
                                            {teams.filter(t => t.id !== 't_private').map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </CustomSelect>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide">Session Category</label>
                                        {gpsShowNewCat ? (
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={gpsNewCatLabel}
                                                    onChange={e => setGpsNewCatLabel(e.target.value)}
                                                    placeholder="Category name…"
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && gpsNewCatLabel.trim()) {
                                                            const id = gpsNewCatLabel.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
                                                            const newCat: GpsCategory = { id, label: gpsNewCatLabel.trim(), color: 'indigo' };
                                                            const updated = [...gpsDialogCategories, newCat];
                                                            setGpsDialogCategories(updated);
                                                            saveGpsCategories(updated);
                                                            setGpsImportCategory(id);
                                                            setGpsNewCatLabel('');
                                                            setGpsShowNewCat(false);
                                                            showToast(`Category "${newCat.label}" added`, 'success');
                                                        }
                                                        if (e.key === 'Escape') { setGpsShowNewCat(false); setGpsNewCatLabel(''); }
                                                    }}
                                                    className="flex-1 bg-white dark:bg-[#132338] border border-indigo-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 dark:text-[#E2E8F0] outline-none focus:border-indigo-500"
                                                />
                                                <button onClick={() => { setGpsShowNewCat(false); setGpsNewCatLabel(''); }} className="px-2 py-2 text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0] text-xs">✕</button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <CustomSelect
                                                    value={gpsImportCategory}
                                                    onChange={e => setGpsImportCategory(e.target.value)}
                                                    variant="form"
                                                    size="xs"
                                                >
                                                    {gpsDialogCategories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.label}</option>
                                                    ))}
                                                </CustomSelect>
                                                <button
                                                    onClick={() => setGpsShowNewCat(true)}
                                                    title="Add new category"
                                                    className="px-2.5 py-2 bg-slate-100 dark:bg-[#1A2D48] hover:bg-indigo-50 dark:hover:bg-indigo-500/15 hover:text-indigo-600 dark:text-white text-slate-500 rounded-lg border border-slate-200 dark:border-indigo-600 transition-colors text-xs font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: 'Athlete Column', required: true, val: gpsDialogAthleteCol, set: setGpsDialogAthleteCol, color: 'indigo' },
                                        { label: 'Date Column', required: true, val: gpsDialogDateCol, set: setGpsDialogDateCol, color: 'emerald' },
                                        { label: 'Phase / Section', required: false, val: gpsDialogPhaseCol, set: setGpsDialogPhaseCol, color: 'amber' },
                                    ].map(({ label, required, val, set, color }) => (
                                        <div key={label} className="space-y-1.5">
                                            <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide">
                                                {label} {required && <span className="text-rose-400">*</span>}
                                            </label>
                                            <CustomSelect value={val} onChange={e => set(e.target.value)} variant="form" size="xs" placeholder={`— ${required ? 'select' : 'none'} —`}>
                                                <option value="">— {required ? 'select' : 'none'} —</option>
                                                {gpsSmartDialog.headers.map(h => <option key={h} value={h}>{h}</option>)}
                                            </CustomSelect>
                                            {val
                                                ? <p className={`text-[10px] text-${color}-600 font-medium`}>✓ {val}</p>
                                                : !required && <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Optional — enables section grouping</p>
                                            }
                                        </div>
                                    ))}
                                </div>
                                {/* Missing columns warning */}
                                {gpsMissingColWarning.length > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-3 flex items-start gap-3">
                                        <AlertTriangleIcon size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Columns from previous imports not in this file</p>
                                            <p className="text-[10px] text-amber-600 mt-0.5">{gpsMissingColWarning.join(', ')}</p>
                                            <p className="text-[10px] text-amber-500 mt-1">These will show as empty for rows from this import. Manage visibility in the Columns panel.</p>
                                        </div>
                                    </div>
                                )}
                                <div>
                                    <p className="text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide mb-2">Preview — first 3 rows</p>
                                    <div className="overflow-x-auto border border-slate-200 dark:border-[#243A58] rounded-lg">
                                        <table className="text-left text-xs w-full">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-200 dark:border-[#243A58]">
                                                    {gpsSmartDialog.headers.slice(0, 8).map(h => (
                                                        <th key={h} className={`px-3 py-2 font-semibold whitespace-nowrap ${h === gpsDialogAthleteCol ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50' : h === gpsDialogDateCol ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50' : h === gpsDialogPhaseCol ? 'text-amber-600 bg-amber-50' : 'text-slate-500 dark:text-[#CBD5E1]'}`}>{h}</th>
                                                    ))}
                                                    {gpsSmartDialog.headers.length > 8 && <th className="px-3 py-2 text-slate-300 dark:text-[#475569] italic">+{gpsSmartDialog.headers.length - 8} more…</th>}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                                {gpsSmartDialog.rows.slice(0, 3).map((row, i) => (
                                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#1A2D48]">
                                                        {gpsSmartDialog.headers.slice(0, 8).map(h => <td key={h} className="px-3 py-2 text-slate-600 dark:text-[#CBD5E1] whitespace-nowrap">{row[h] || '—'}</td>)}
                                                        {gpsSmartDialog.headers.length > 8 && <td className="px-3 py-2 text-slate-300 dark:text-[#475569]">…</td>}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 pt-2 border-t border-slate-100 dark:border-[#1A2D48]">
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-2.5">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-semibold text-slate-900 dark:text-[#E2E8F0] uppercase tracking-wide">Override Import Date</p>
                                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">Leave blank to read dates from the selected date column. Set a date to apply it to all rows.</p>
                                        </div>
                                        <DatePicker value={gpsImportDateOverride} onChange={e => setGpsImportDateOverride(e.target.value)} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">All {gpsSmartDialog.headers.length} columns imported. Nothing discarded.</p>
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => { setGpsSmartDialog(null); setGpsImportDateOverride(''); }} className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-all">Cancel</button>
                                            <button
                                                disabled={!gpsDialogAthleteCol || (!gpsDialogDateCol && !gpsImportDateOverride)}
                                                onClick={() => handleSmartImport(gpsDialogAthleteCol, gpsDialogDateCol, gpsDialogPhaseCol)}
                                                className="px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                                                Import {gpsSmartDialog.rows.length} Rows
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Unlinked athlete quick-add dialog ───────────────────── */}
                {gpsUnlinkedDialog && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setGpsUnlinkedDialog(null)} />
                        <div className="relative bg-white dark:bg-[#132338] rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-[#1A2D48] bg-amber-50 dark:bg-amber-900/20 rounded-t-2xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shrink-0">
                                    <AlertTriangleIcon size={18} />
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">Unlinked Athletes</h3>
                                    <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">These names in the CSV didn't match your roster</p>
                                </div>
                            </div>
                            <div className="p-6 space-y-3">
                                {gpsUnlinkedDialog.map(({ name }) => (
                                    <div key={name} className="flex items-center justify-between bg-slate-50 dark:bg-[#0F1C30] rounded-lg px-4 py-3 border border-slate-200 dark:border-[#243A58]">
                                        <span className="text-sm font-medium text-slate-700 dark:text-[#E2E8F0]">{name}</span>
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">UNLINKED</span>
                                    </div>
                                ))}
                                <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] pt-1">GPS data was still imported. Go to Roster to add these athletes, then re-import to link them.</p>
                                <div className="flex justify-end pt-2">
                                    <button onClick={() => setGpsUnlinkedDialog(null)} className="px-5 py-2.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700 transition-all">OK</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Column Manager Panel ─────────────────────────────────── */}
                {gpsColConfigOpen && (() => {
                    const getColGroup = (k: string) => {
                        if (/number of acceleration/i.test(k)) return 'accel';
                        if (/time in hr zone/i.test(k)) return 'hr_zones';
                        if (/time in power zone|muscle load in power zone/i.test(k)) return 'power_zones';
                        if (/distance in speed zone/i.test(k)) return 'speed_zones';
                        if (/\bhr (min|avg|max)\b|\bhr\b.*\b(bpm|%)\b/i.test(k)) return 'hr';
                        if (/load|recovery time|calorie/i.test(k)) return 'load';
                        if (/hrv|rmssd|rr interval/i.test(k)) return 'hrv';
                        if (/distance|speed|sprint|km.h|m.min/i.test(k)) return 'speed';
                        return 'other';
                    };
                    const COL_GROUPS = [
                        { id: 'speed',       label: 'Speed & Distance' },
                        { id: 'speed_zones', label: 'Speed Zones' },
                        { id: 'hr',          label: 'Heart Rate' },
                        { id: 'hr_zones',    label: 'HR Zones' },
                        { id: 'accel',       label: 'Accelerations' },
                        { id: 'load',        label: 'Load & Recovery' },
                        { id: 'power_zones', label: 'Power Zones' },
                        { id: 'hrv',         label: 'HRV' },
                        { id: 'other',       label: 'Other' },
                    ];
                    // Fuzzy column search — same util as Library / Workouts / Testing.
                    // Exact-substring first (so progressive narrowing works as the
                    // user types), trigram per-word fallback for typo tolerance.
                    const filteredCols = fuzzySearch(
                        mergedColConfig,
                        gpsColSearch,
                        (c: any) => [c.key, colLabel(c.key)].join(' '),
                        (c: any) => colLabel(c.key),
                    ).results.sort((a, b) => gpsSortCols(a.key, b.key));
                    const visibleCount = mergedColConfig.filter(c => c.visible !== false).length;
                    const toggleAll = (visible: boolean) => saveColConfig(mergedColConfig.map(c => ({ ...c, visible })));
                    const toggleGroup = (gid: string, visible: boolean) => saveColConfig(mergedColConfig.map(c =>
                        getColGroup(c.key) === gid ? { ...c, visible } : c
                    ));
                    return (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-lg overflow-hidden">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1A2D48] bg-slate-50 dark:bg-[#0F1C30] flex items-center justify-between gap-4">
                                <div className="flex-1 relative">
                                    <SearchIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#CBD5E1]" />
                                    <input
                                        value={gpsColSearch}
                                        onChange={e => setGpsColSearch(e.target.value)}
                                        placeholder="Search columns…"
                                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg text-xs text-slate-700 dark:text-[#E2E8F0] outline-none focus:border-indigo-400"
                                    />
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{visibleCount}/{mergedColConfig.length} shown</span>
                                    <button onClick={() => toggleAll(true)} className="px-2.5 py-1.5 text-[10px] font-semibold text-indigo-600 dark:text-white border border-indigo-200 dark:border-indigo-600 bg-indigo-50 dark:bg-[#1A2D48] rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-500/15 transition-colors">Show All</button>
                                    <button onClick={() => toggleAll(false)} className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] rounded-md hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">Hide All</button>
                                    <button onClick={() => { setGpsColConfigOpen(false); setGpsColSearch(''); }} className="p-1.5 text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0] rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2D48]"><XIcon size={14} /></button>
                                </div>
                            </div>
                            {/* Grouped columns */}
                            <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-50">
                                {mergedColConfig.length === 0 ? (
                                    <p className="text-xs text-slate-400 dark:text-[#CBD5E1] text-center py-8">No columns yet — import a CSV first</p>
                                ) : COL_GROUPS.map(grp => {
                                    const grpCols = filteredCols.filter(c => getColGroup(c.key) === grp.id);
                                    if (grpCols.length === 0) return null;
                                    const grpAllVisible = grpCols.every(c => c.visible !== false);
                                    return (
                                        <div key={grp.id} className="px-5 py-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-[#CBD5E1]">{grp.label}</span>
                                                <div className="flex gap-1.5">
                                                    <button onClick={() => toggleGroup(grp.id, true)} className="text-[9px] font-semibold text-indigo-500 hover:text-indigo-700 dark:text-white px-1.5 py-0.5 rounded hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 transition-colors">Show</button>
                                                    <button onClick={() => toggleGroup(grp.id, false)} className="text-[9px] font-semibold text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0] px-1.5 py-0.5 rounded hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">Hide</button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                {grpCols.map(col => (
                                                    <label key={col.key} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all text-xs ${col.visible !== false ? 'border-indigo-200 dark:border-indigo-600 bg-indigo-50/60 text-slate-700 dark:text-[#E2E8F0]' : 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] text-slate-400 dark:text-[#CBD5E1]'}`}>
                                                        <input type="checkbox" checked={col.visible !== false} onChange={() => {
                                                            saveColConfig(mergedColConfig.map(c => c.key === col.key ? { ...c, visible: c.visible === false } : c));
                                                        }} className="rounded accent-indigo-600 shrink-0" />
                                                        <span className="flex-1 min-w-0 truncate font-medium">{colLabel(col.key)}</span>
                                                        {col.retired && <span className="text-[8px] font-bold text-slate-400 dark:text-[#CBD5E1] bg-slate-200 dark:bg-[#243A58] px-1 py-0.5 rounded shrink-0">OLD</span>}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* ── Top bar: tabs + status + actions ────────────────────── */}
                <div className="bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#1A2D48] p-1 rounded-lg">
                            <button onClick={() => setGpsTab('import')} className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${gpsTab === 'import' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>
                                <span className="flex items-center gap-1.5"><UploadIcon size={12} />Data Import</span>
                            </button>
                            <button onClick={() => setGpsTab('manual')} className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${gpsTab === 'manual' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>
                                <span className="flex items-center gap-1.5"><Edit3Icon size={12} />Manual Entry</span>
                            </button>
                            <button onClick={() => setGpsTab('insights')} className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${gpsTab === 'insights' ? 'bg-white dark:bg-[#132338] text-slate-900 dark:text-[#E2E8F0] shadow-sm' : 'text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0]'}`}>
                                <span className="flex items-center gap-1.5"><ActivityIcon size={12} />GPS Insights</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            {gpsImportStatus && (
                                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${gpsImportStatus === 'success' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50' : 'text-amber-700 dark:text-amber-400 bg-amber-50'}`}>
                                    {gpsImportMessage}
                                </span>
                            )}
                            {historicalColKeys.length > 0 && (
                                <button onClick={() => setGpsColConfigOpen(v => !v)} className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 font-semibold transition-all ${gpsColConfigOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-500 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'}`}>
                                    <SlidersIcon size={13} />Columns
                                </button>
                            )}
                            <button onClick={clearGpsData} title="Clear all GPS data" className="p-2 text-slate-300 dark:text-[#475569] hover:text-rose-500 transition-colors border border-slate-200 dark:border-[#243A58] rounded-lg hover:bg-rose-50 dark:hover:bg-[#1A2D48]"><Trash2Icon size={15} /></button>
                        </div>
                    </div>

                    {/* ── TAB: DATA IMPORT ── */}
                    {gpsTab === 'import' && (() => {
                        // Date navigation helpers (computed here, not in every render)
                        const sessionIdx = gpsSessionDates.indexOf(gpsSpecificDate);
                        const effectiveSessionDate = sessionIdx >= 0 ? gpsSpecificDate : (gpsSessionDates[gpsSessionDates.length - 1] || gpsSpecificDate);
                        const effectiveIdx = gpsSessionDates.indexOf(effectiveSessionDate);
                        const fmtSessionDate = (d: string) => {
                            if (!d) return '—';
                            const dt = new Date(d + 'T12:00:00');
                            return dt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                        };
                        return (
                        <div className="space-y-4 pt-1">
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Squad / Athlete filter */}
                                <CustomSelect value={gpsFilterTarget} onChange={e => setGpsFilterTarget(e.target.value)} variant="filter" size="xs">
                                    <option value="All Athletes">All Athletes</option>
                                    <optgroup label="Squads">{teams.filter(t => t.id !== 't_private').map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</optgroup>
                                    <optgroup label="Individual Athletes">
                                        {teams.flatMap(t => t.players).sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </optgroup>
                                </CustomSelect>

                                {/* View mode toggle */}
                                <div className="flex bg-slate-100 dark:bg-[#1A2D48] p-1 rounded-lg">
                                    <button onClick={() => setGpsFilterDateMode('single')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${gpsFilterDateMode === 'single' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'}`}>Session</button>
                                    <button onClick={() => setGpsFilterDateMode('range')} className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${gpsFilterDateMode === 'range' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 dark:text-[#CBD5E1] hover:text-slate-600 dark:hover:text-[#E2E8F0]'}`}>Range</button>
                                </div>

                                {/* Session mode: date navigation */}
                                {gpsFilterDateMode === 'single' && (
                                    <div className="flex items-center gap-2 flex-1">
                                        <button
                                            disabled={effectiveIdx >= gpsSessionDates.length - 1}
                                            onClick={() => setGpsSpecificDate(gpsSessionDates[effectiveIdx + 1])}
                                            className="p-2 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        ><ArrowLeftIcon size={14} /></button>
                                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2">
                                            <CalendarIcon size={13} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />
                                            <DatePicker value={effectiveSessionDate} onChange={e => setGpsSpecificDate(e.target.value)} />
                                        </div>
                                        <span className="text-xs font-semibold text-slate-700 dark:text-[#E2E8F0]">{fmtSessionDate(effectiveSessionDate)}</span>
                                        {gpsSessionDates.length > 0 && (
                                            <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#1A2D48] px-2 py-1 rounded-full">
                                                {effectiveIdx + 1} / {gpsSessionDates.length} sessions
                                            </span>
                                        )}
                                        <button
                                            disabled={effectiveIdx <= 0}
                                            onClick={() => setGpsSpecificDate(gpsSessionDates[effectiveIdx - 1])}
                                            className="p-2 rounded-lg border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        ><ArrowRightIcon size={14} /></button>
                                    </div>
                                )}

                                {/* Range mode: date pickers */}
                                {gpsFilterDateMode === 'range' && (
                                    <div className="flex items-center gap-2">
                                        <DatePicker value={gpsRangeStart} onChange={e => setGpsRangeStart(e.target.value)} />
                                        <span className="text-xs text-slate-400 dark:text-[#CBD5E1]">to</span>
                                        <DatePicker value={gpsRangeEnd} onChange={e => setGpsRangeEnd(e.target.value)} />
                                    </div>
                                )}

                                <div className="ml-auto flex items-center gap-2">
                                    {/* Sync Polar — shown as primary when team data source is Polar */}
                                    {isPolarSource && (
                                        <button
                                            onClick={handlePolarSync}
                                            disabled={polarSyncStatus === 'syncing'}
                                            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 disabled:opacity-60 transition-all whitespace-nowrap"
                                        >
                                            {polarSyncStatus === 'syncing'
                                                ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Syncing...</>
                                                : <><ActivityIcon size={13} /> Sync Polar</>
                                            }
                                        </button>
                                    )}
                                    {/* Import CSV — always available as fallback */}
                                    <label className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${isPolarSource ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-200 dark:hover:bg-[#1A2D48]/60' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                                        <UploadIcon size={13} /> Import CSV
                                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                </div>
                            </div>

                            {/* Polar sync status */}
                            {polarSyncStatus !== 'idle' && (
                                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold ${
                                    polarSyncStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/25 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700' :
                                    polarSyncStatus === 'error' ? 'bg-red-50 border border-red-200 dark:border-red-900/50 text-red-700' :
                                    'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300'
                                }`}>
                                    {polarSyncStatus === 'syncing' && <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />}
                                    {polarSyncStatus === 'success' && <CheckIcon size={13} />}
                                    {polarSyncStatus === 'error' && <AlertCircleIcon size={13} />}
                                    {polarSyncMessage}
                                </div>
                            )}
                        </div>
                        );
                    })()}

                    {/* ── TAB: MANUAL ENTRY ── */}
                    {gpsTab === 'manual' && (
                        <div className="space-y-4 pt-1">
                            <div className="flex flex-wrap items-end gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide pl-1">Team</label>
                                    <CustomSelect value={manualTeamId} onChange={e => { setManualTeamId(e.target.value); setManualRows({}); }} variant="form" size="xs" placeholder="— select team —">
                                        <option value="">— select team —</option>
                                        {teams.filter(t => t.id !== 't_private').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </CustomSelect>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide pl-1">Session Date</label>
                                    <DatePicker value={manualDate} onChange={e => setManualDate(e.target.value)} />
                                </div>
                                <button onClick={() => setManualColPickerOpen(v => !v)} className={`px-3 py-2.5 rounded-lg border text-xs flex items-center gap-1.5 font-semibold transition-all ${manualColPickerOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'text-slate-600 dark:text-[#CBD5E1] border-slate-200 dark:border-[#243A58] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'}`}>
                                    <PlusCircleIcon size={13} /> Configure Columns
                                </button>
                                {manualAthletes.length > 0 && manualColConfig.length > 0 && (
                                    <button onClick={handleManualSave} className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500 transition-all flex items-center gap-1.5">
                                        <CheckIcon size={13} /> Save Session
                                    </button>
                                )}
                            </div>

                            {/* Column picker */}
                            {manualColPickerOpen && (
                                <div className="bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl p-4 space-y-3">
                                    <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-[#CBD5E1] tracking-wide">Active Columns</p>
                                    <div className="flex flex-wrap gap-2">
                                        {manualColConfig.map(col => (
                                            <div key={col.key} className="flex items-center gap-1.5 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-[#E2E8F0]">
                                                {col.label}
                                                <button onClick={() => setManualColConfig(prev => prev.filter(c => c.key !== col.key))} className="text-slate-300 dark:text-[#475569] hover:text-rose-500 transition-colors"><XIcon size={11} /></button>
                                            </div>
                                        ))}
                                        {manualColConfig.length === 0 && <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">No columns configured yet</p>}
                                    </div>
                                    {/* Add from history or new */}
                                    {historicalColKeys.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">Add from import history:</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {historicalColKeys.filter(k => !manualColConfig.some(c => c.key === k)).map(k => (
                                                    <button key={k} onClick={() => setManualColConfig(prev => [...prev, { key: k, label: k.replace(/_/g, ' ') }])}
                                                        className="text-[10px] bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-md px-2.5 py-1 text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 hover:text-indigo-600 dark:text-indigo-300 transition-all">
                                                        + {k}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <input value={newManualColName} onChange={e => setNewManualColName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && newManualColName.trim()) { setManualColConfig(prev => [...prev, { key: newManualColName.trim().replace(/\s+/g,'_'), label: newManualColName.trim() }]); setNewManualColName(''); }}}
                                            placeholder="Or type a new column name…" className="flex-1 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400" />
                                        <button onClick={() => { if (newManualColName.trim()) { setManualColConfig(prev => [...prev, { key: newManualColName.trim().replace(/\s+/g,'_'), label: newManualColName.trim() }]); setNewManualColName(''); }}}
                                            className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition-all">Add</button>
                                    </div>
                                </div>
                            )}

                            {/* Manual entry grid */}
                            {manualTeamId && manualColConfig.length > 0 && manualAthletes.length > 0 && (
                                <div className="overflow-x-auto border border-slate-200 dark:border-[#243A58] rounded-xl">
                                    <table className="w-full" style={{ minWidth: `${(manualColConfig.length + 1) * 140}px` }}>
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-[#0F1C30] border-b border-slate-200 dark:border-[#243A58]">
                                                <th className="sticky left-0 z-10 bg-slate-50 dark:bg-[#0F1C30] px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide whitespace-nowrap text-left border-r border-slate-200 dark:border-[#243A58]">Athlete</th>
                                                {manualColConfig.map(col => (
                                                    <th key={col.key} className="px-4 py-3 text-[10px] font-semibold uppercase text-slate-400 dark:text-[#CBD5E1] tracking-wide whitespace-nowrap text-center border-r border-slate-100 dark:border-[#1A2D48] last:border-r-0">{col.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-[#1A2D48]">
                                            {manualAthletes.map(p => (
                                                <tr key={p.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-500/15 transition-colors">
                                                    <td className="sticky left-0 z-10 bg-slate-50/80 px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] whitespace-nowrap border-r border-slate-200 dark:border-[#243A58] text-left">{p.name}</td>
                                                    {manualColConfig.map(col => (
                                                        <td key={col.key} className="px-4 py-2 text-center border-r border-slate-100 dark:border-[#1A2D48] last:border-r-0">
                                                            <input
                                                                type="number"
                                                                value={manualRows[p.id]?.[col.key] || ''}
                                                                onChange={e => setManualRows(prev => ({
                                                                    ...prev,
                                                                    [p.id]: { ...(prev[p.id] || {}), [col.key]: e.target.value }
                                                                }))}
                                                                placeholder="—"
                                                                className="w-28 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-1.5 text-xs text-center outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100"
                                                            />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {manualTeamId && manualAthletes.length === 0 && (
                                <p className="text-sm text-slate-400 dark:text-[#CBD5E1] text-center py-6">No athletes in this team yet</p>
                            )}
                            {!manualTeamId && (
                                <p className="text-sm text-slate-400 dark:text-[#CBD5E1] text-center py-6">Select a team to start entering data</p>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Data view (import tab only) ──────────────────────────── */}
                {gpsTab === 'import' && (() => {
                    const records = gpsFilteredRecords;
                    const cols = gpsVisibleColKeys;

                    if (records.length === 0 && gpsData.length === 0) return (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-20 flex flex-col items-center gap-4 text-center">
                            <ActivityIcon size={48} className="text-slate-100 dark:text-[#243A58]" />
                            <div>
                                <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">No GPS telemetry data</p>
                                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-1">Click "Import CSV" to upload from any GPS provider — all columns imported as-is</p>
                            </div>
                        </div>
                    );

                    if (records.length === 0) return (
                        <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm p-12 flex flex-col items-center gap-3 text-center">
                            <p className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">No records for this {gpsFilterDateMode === 'single' ? 'session date' : 'date range'}</p>
                            <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">{gpsData.length} total records — {gpsFilterDateMode === 'single' ? 'use the arrows to navigate to a session date with data' : 'adjust the date range'}</p>
                        </div>
                    );

                    const sessionDate = records[0]?.date;
                    const sessionCat = records[0]?.category || 'training';
                    const CAT_COLORS: Record<string, string> = {
                        match: 'bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-300 border-red-200 dark:border-red-500/30',
                        recovery: 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30',
                        training: 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30',
                    };

                    // Session mode: single date table
                    if (gpsFilterDateMode === 'single') {
                        const fmtFull = (d: string) => {
                            if (!d) return d;
                            const dt = new Date(d + 'T12:00:00');
                            return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        };
                        return (
                            <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100 dark:border-[#1A2D48] flex items-center gap-3">
                                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shrink-0">
                                        <ActivityIcon size={14} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{fmtFull(sessionDate)}</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1]">{records.length} athletes · {cols.length} columns visible</p>
                                    </div>
                                    <CustomSelect
                                        value={sessionCat}
                                        onChange={e => gpsChangeDateCategory(sessionDate, e.target.value)}
                                        variant="filter"
                                        size="xs"
                                    >
                                        {gpsDialogCategories.map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </CustomSelect>
                                </div>
                                <GpsSessionTable rows={records} cols={cols} colLabel={gpsColLabel} onHideCol={gpsHideCol} />
                            </div>
                        );
                    }

                    // Range mode: date-grouped, collapse state managed inside GpsDateRangeView
                    return (
                        <GpsDateRangeView
                            records={records}
                            cols={cols}
                            colLabel={gpsColLabel}
                            onHideCol={gpsHideCol}
                            categories={gpsDialogCategories}
                            onChangeDateCategory={gpsChangeDateCategory}
                        />
                    );
                })()}

                {/* ── GPS INSIGHTS TAB ── */}
                {gpsTab === 'insights' && renderGpsInsights()}
            </div>
        );
};

export default GpsDataReport;
