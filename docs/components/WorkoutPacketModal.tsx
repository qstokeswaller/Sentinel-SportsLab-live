// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    X as XIcon,
    Printer as PrinterIcon,
    Search as SearchIcon,
    Plus as PlusIcon,
    Check as CheckIcon,
    Layers as LayersIcon,
    CalendarDays as CalendarIcon,
    Dumbbell as DumbbellIcon,
    Users as UsersIcon,
} from 'lucide-react';

// ---- Types ----

interface PacketItem {
    type: 'protocol' | 'session' | 'exercise';
    data: any;
}

// ---- Component ----

const WorkoutPacketModal = () => {
    const {
        isWorkoutPacketModalOpen,
        setIsWorkoutPacketModalOpen,
        wpMode,
        setWpMode,
        wpSearch,
        setWpSearch,
        wpRangeStart,
        setWpRangeStart,
        wpRangeEnd,
        setWpRangeEnd,
        wpRangeTargetId,
        setWpRangeTargetId,
        wpRangeTargetType,
        setWpRangeTargetType,
        teams,
        exercises,
        scheduledSessions,
        resolveTargetName,
    } = useAppState();
    const protocols = [];

    const [packetItems, setPacketItems] = useState<PacketItem[]>([]);

    // ---- All useMemo hooks MUST be before any early return (Rules of Hooks) ----

    // ---- Filtered exercises (Manual Selection) ----
    const filteredExercises = useMemo(() => {
        const q = (wpSearch || '').toLowerCase();
        const all = exercises || [];
        if (!q) return all.slice(0, 50);
        return all.filter(e => e.name.toLowerCase().includes(q)).slice(0, 100);
    }, [exercises, wpSearch]);

    // ---- Sessions grouped by month then date (Calendar Sessions) ----
    const sessionsByMonth = useMemo(() => {
        const sorted = (scheduledSessions || [])
            .slice()
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const groups: Record<string, { date: string; sessions: any[] }[]> = {};
        for (const s of sorted) {
            const monthKey = new Date(s.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!groups[monthKey]) groups[monthKey] = [];
            let dayGroup = groups[monthKey].find(g => g.date === s.date);
            if (!dayGroup) {
                dayGroup = { date: s.date, sessions: [] };
                groups[monthKey].push(dayGroup);
            }
            dayGroup.sessions.push(s);
        }
        return groups;
    }, [scheduledSessions]);

    // ---- Range sessions (Client Selection) ----
    const rangeSessions = useMemo(() => {
        if (!wpRangeTargetId) return [];
        return (scheduledSessions || [])
            .filter(s => {
                const matchTarget = s.targetId === wpRangeTargetId;
                const afterStart = !wpRangeStart || s.date >= wpRangeStart;
                const beforeEnd = !wpRangeEnd || s.date <= wpRangeEnd;
                return matchTarget && afterStart && beforeEnd;
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [scheduledSessions, wpRangeTargetId, wpRangeStart, wpRangeEnd]);

    // ---- Early return after all hooks ----
    if (!isWorkoutPacketModalOpen) return null;

    // ---- Packet helpers ----

    const addItem = (item: PacketItem) => {
        const exists = packetItems.some(i => i.type === item.type && i.data.id === item.data.id);
        if (!exists) setPacketItems(prev => [...prev, item]);
    };

    const removeItem = (index: number) => {
        setPacketItems(prev => prev.filter((_, i) => i !== index));
    };

    const isSelected = (type: string, id: string) =>
        packetItems.some(i => i.type === type && i.data.id === id);

    // ---- Category badge colours ----

    const categoryColor = (cat: string) => {
        const map: Record<string, string> = {
            Strength: 'bg-indigo-100 text-indigo-700',
            Hypertrophy: 'bg-purple-100 text-purple-700',
            Power: 'bg-rose-100 text-rose-700',
            Speed: 'bg-amber-100 text-amber-700',
            Conditioning: 'bg-cyan-100 text-cyan-700',
            GPP: 'bg-emerald-100 text-emerald-700',
            Recovery: 'bg-blue-100 text-blue-700',
        };
        return map[cat] || 'bg-slate-100 text-slate-600';
    };

    // ---- Print ----

    const buildExerciseTable = (exs: any[]) => {
        if (!exs.length) return '<p style="color:#94a3b8;font-size:12px">No exercises assigned.</p>';
        const rows = exs
            .map(
                e => `<tr>
          <td>${e.name}</td>
          <td class="blank">___</td>
          <td class="blank">___</td>
          <td class="blank">___</td>
          <td class="blank">___</td>
        </tr>`
            )
            .join('');
        return `<table>
      <thead><tr><th>Exercise</th><th>Sets</th><th>Reps</th><th>Load</th><th>Notes</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
    };

    const handlePrint = () => {
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        const allExercises = exercises || [];
        const resolveExs = (ids: string[]) =>
            (ids || []).map(id => allExercises.find(e => e.id === id)).filter(Boolean);

        let sections = '';
        const manualExs: any[] = [];

        for (const item of packetItems) {
            if (item.type === 'protocol') {
                const exs = resolveExs(item.data.exerciseIds || []);
                sections += `<div class="section">
          <h2 class="section-title">${item.data.name}</h2>
          <p class="section-sub">${item.data.category || ''} Protocol</p>
          ${buildExerciseTable(exs)}
        </div>`;
            } else if (item.type === 'session') {
                const exs = resolveExs(item.data.exerciseIds || []);
                const dateStr = new Date(item.data.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                });
                sections += `<div class="section">
          <h2 class="section-title">${item.data.title || 'Session'}</h2>
          <p class="section-sub">${dateStr} — ${item.data.trainingPhase || ''}</p>
          ${buildExerciseTable(exs)}
        </div>`;
            } else if (item.type === 'exercise') {
                manualExs.push(item.data);
            }
        }

        if (manualExs.length > 0) {
            sections += `<div class="section">
        <h2 class="section-title">Additional Exercises</h2>
        ${buildExerciseTable(manualExs)}
      </div>`;
        }

        const html = `<!DOCTYPE html>
<html><head><title>Workout Packet</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
  h1 { font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 32px; }
  .section { margin-bottom: 32px; page-break-inside: avoid; }
  .section-title { font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 4px; }
  .section-sub { font-size: 11px; color: #64748b; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #1e293b; color: white; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: #f8fafc; }
  .blank { color: #cbd5e1; }
  @media print { button { display: none; } }
</style>
</head><body>
<h1>Workout Packet</h1>
<div class="meta">Generated: ${today}</div>
${sections || '<p style="color:#94a3b8">No items in packet.</p>'}
</body></html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
            w.print();
        }
    };

    // ---- Sidebar tab definitions ----

    const TABS = [
        { id: 'protocols', label: 'Protocols', icon: LayersIcon },
        { id: 'manual', label: 'Manual Selection', icon: DumbbellIcon },
        { id: 'sessions', label: 'Calendar Sessions', icon: CalendarIcon },
        { id: 'range', label: 'Client Selection', icon: UsersIcon },
    ];

    // ---- Content renderer (switches by wpMode) ----

    const renderContent = () => {
        // --- PROTOCOLS ---
        if (wpMode === 'protocols') {
            const prots = protocols || [];
            if (!prots.length)
                return (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        No protocols available.
                    </div>
                );
            return (
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar">
                    <div className="grid grid-cols-2 gap-3">
                        {prots.map(p => {
                            const sel = isSelected('protocol', p.id);
                            return (
                                <button
                                    key={p.id}
                                    onClick={() => addItem({ type: 'protocol', data: p })}
                                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                                        sel
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40'
                                    }`}
                                >
                                    <span
                                        className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider mb-2 ${categoryColor(p.category)}`}
                                    >
                                        {p.category}
                                    </span>
                                    <div className="font-bold text-[11px] uppercase text-slate-800 leading-tight mb-1">
                                        {p.name}
                                    </div>
                                    {p.description && (
                                        <div className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                                            {p.description}
                                        </div>
                                    )}
                                    {sel && <CheckIcon size={12} className="text-indigo-500 mt-2" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // --- MANUAL SELECTION ---
        if (wpMode === 'manual') {
            return (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 shrink-0">
                        <div className="relative">
                            <SearchIcon
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                type="text"
                                value={wpSearch || ''}
                                onChange={e => setWpSearch(e.target.value)}
                                placeholder="Search exercises..."
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-indigo-400"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
                        <div className="grid grid-cols-2 gap-2">
                            {filteredExercises.map(ex => {
                                const sel = isSelected('exercise', ex.id);
                                return (
                                    <div
                                        key={ex.id}
                                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                            sel ? 'border-cyan-400 bg-cyan-50' : 'border-slate-100 bg-white'
                                        }`}
                                    >
                                        <span className="text-[10px] font-semibold text-slate-700 leading-tight flex-1 pr-2">
                                            {ex.name}
                                        </span>
                                        <button
                                            onClick={() => addItem({ type: 'exercise', data: ex })}
                                            disabled={sel}
                                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs shrink-0 transition-all ${
                                                sel
                                                    ? 'bg-cyan-400 cursor-default'
                                                    : 'bg-slate-700 hover:bg-cyan-600'
                                            }`}
                                        >
                                            {sel ? <CheckIcon size={10} /> : <PlusIcon size={10} />}
                                        </button>
                                    </div>
                                );
                            })}
                            {filteredExercises.length === 0 && (
                                <div className="col-span-2 text-center text-slate-400 text-xs py-10">
                                    No exercises found. Try a different search term.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // --- CALENDAR SESSIONS ---
        if (wpMode === 'sessions') {
            const months = Object.entries(sessionsByMonth);
            if (!months.length)
                return (
                    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                        No sessions scheduled.
                    </div>
                );
            return (
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar space-y-6">
                    {months.map(([month, dayGroups]) => (
                        <div key={month}>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
                                {month}
                            </div>
                            <div className="space-y-1.5">
                                {dayGroups.flatMap(({ date, sessions: daySessions }) => {
                                    const dayNum = new Date(date).getDate();
                                    return daySessions.map(s => {
                                        const sel = isSelected('session', s.id);
                                        return (
                                            <button
                                                key={s.id}
                                                onClick={() => addItem({ type: 'session', data: s })}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                                    sel
                                                        ? 'border-cyan-400 bg-cyan-50'
                                                        : 'border-slate-100 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <div
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${
                                                        sel
                                                            ? 'bg-cyan-400 text-white'
                                                            : 'bg-slate-100 text-slate-700'
                                                    }`}
                                                >
                                                    {dayNum}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[11px] font-black uppercase text-slate-800 leading-tight truncate">
                                                        {resolveTargetName(s.targetId, s.targetType)} //{' '}
                                                        {s.trainingPhase || s.title}
                                                    </div>
                                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                                        {s.title}
                                                    </div>
                                                </div>
                                                <div className="text-[9px] font-black text-slate-400 shrink-0">
                                                    {(s.exerciseIds || []).length} EX
                                                </div>
                                            </button>
                                        );
                                    });
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // --- CLIENT SELECTION ---
        if (wpMode === 'range') {
            const targetOptions: { id: string; type: string; label: string }[] = [];
            (teams || []).forEach(t => {
                targetOptions.push({ id: t.id, type: 'Team', label: `${t.name} (Team)` });
                (t.players || []).forEach(p => {
                    targetOptions.push({ id: p.id, type: 'Individual', label: p.name });
                });
            });

            return (
                <div className="flex-1 overflow-y-auto p-5 no-scrollbar space-y-5">
                    {/* Target select */}
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                            Select Target
                        </label>
                        <select
                            value={wpRangeTargetId || ''}
                            onChange={e => {
                                const opt = targetOptions.find(o => o.id === e.target.value);
                                setWpRangeTargetId(e.target.value);
                                if (opt) setWpRangeTargetType(opt.type);
                            }}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-400"
                        >
                            <option value="">— Select a target —</option>
                            {targetOptions.map(o => (
                                <option key={o.id} value={o.id}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Period window */}
                    <div>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                            Period Window
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="date"
                                value={wpRangeStart || ''}
                                onChange={e => setWpRangeStart(e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400"
                            />
                            <input
                                type="date"
                                value={wpRangeEnd || ''}
                                onChange={e => setWpRangeEnd(e.target.value)}
                                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold outline-none focus:border-indigo-400"
                            />
                        </div>
                    </div>

                    {/* Found sessions */}
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                            Found Sessions in Range
                            {rangeSessions.length > 0 && (
                                <span className="bg-cyan-100 text-cyan-700 text-[8px] font-black px-1.5 py-0.5 rounded">
                                    {rangeSessions.length}
                                </span>
                            )}
                        </div>

                        {!wpRangeTargetId ? (
                            <div className="text-xs text-slate-400 py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                Select a target above to find sessions.
                            </div>
                        ) : rangeSessions.length === 0 ? (
                            <div className="text-xs text-slate-400 py-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                No matching sessions found.
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                {rangeSessions.map(s => {
                                    const sel = isSelected('session', s.id);
                                    const dateStr = new Date(s.date).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    });
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => addItem({ type: 'session', data: s })}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                                                sel
                                                    ? 'border-cyan-400 bg-cyan-50'
                                                    : 'border-slate-100 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            {sel && <CheckIcon size={12} className="text-cyan-500 shrink-0" />}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] font-black uppercase text-slate-800 truncate">
                                                    {resolveTargetName(s.targetId, s.targetType)} //{' '}
                                                    {s.trainingPhase || s.title}
                                                </div>
                                                <div className="text-[9px] text-slate-400">{dateStr}</div>
                                            </div>
                                            <div className="text-[9px] font-black text-slate-400 shrink-0">
                                                {(s.exerciseIds || []).length} EX
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return null;
    };

    // ---- Render ----

    return (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-6xl h-[88vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <LayersIcon size={16} className="text-white" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                Distribution Hub
                            </div>
                            <div className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">
                                Workout Packets
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handlePrint}
                            disabled={packetItems.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 hover:bg-indigo-700 transition-all"
                        >
                            <PrinterIcon size={13} />
                            Print Packet
                        </button>
                        <button
                            onClick={() => setIsWorkoutPacketModalOpen(false)}
                            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
                        >
                            <XIcon size={18} />
                        </button>
                    </div>
                </div>

                {/* Body: 3 panels */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Sidebar */}
                    <div className="w-52 shrink-0 bg-slate-50 border-r border-slate-100 flex flex-col py-4">
                        <div className="px-4 mb-2">
                            <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                                Packet Source
                            </div>
                        </div>
                        <div className="flex-1 px-3 space-y-1">
                            {TABS.map(tab => {
                                const Icon = tab.icon;
                                const active = wpMode === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setWpMode(tab.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                                            active
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                        }`}
                                    >
                                        <Icon size={14} />
                                        <span className="text-[10px] font-bold">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="px-3 mt-4 border-t border-slate-200 pt-3">
                            <button
                                onClick={() => setIsWorkoutPacketModalOpen(false)}
                                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                <XIcon size={13} />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Close Portal</span>
                            </button>
                        </div>
                    </div>

                    {/* Content panel */}
                    <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-100">
                        <div className="px-5 py-3 border-b border-slate-100 shrink-0">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                {TABS.find(t => t.id === wpMode)?.label}
                            </div>
                        </div>
                        {renderContent()}
                    </div>

                    {/* Right panel — Packet Preview */}
                    <div className="w-64 shrink-0 bg-slate-900 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700 shrink-0 flex items-center justify-between">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                Packet Preview
                            </div>
                            <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                Live
                            </span>
                        </div>
                        <div className="px-4 py-3 border-b border-slate-800 shrink-0 flex items-center gap-2">
                            <div className="text-[10px] font-black uppercase text-slate-300">
                                Selected Elements
                            </div>
                            {packetItems.length > 0 && (
                                <span className="bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">
                                    {packetItems.length}
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                            {packetItems.length === 0 ? (
                                <div className="h-full flex items-center justify-center p-4">
                                    <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center w-full">
                                        <LayersIcon size={24} className="text-slate-700 mx-auto mb-2" />
                                        <div className="text-[9px] font-bold uppercase text-slate-600 tracking-wider">
                                            Empty Packet
                                        </div>
                                        <div className="text-[8px] text-slate-700 mt-1">
                                            Select items from the left panel
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {packetItems.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-slate-800 rounded-xl p-3 flex items-start gap-2"
                                        >
                                            <div className="flex-1 min-w-0">
                                                {item.type === 'protocol' && (
                                                    <>
                                                        <span
                                                            className={`inline-block text-[7px] font-black uppercase px-1.5 py-0.5 rounded mb-1 ${categoryColor(item.data.category)}`}
                                                        >
                                                            {item.data.category}
                                                        </span>
                                                        <div className="text-[10px] font-black text-white leading-tight truncate">
                                                            {item.data.name}
                                                        </div>
                                                    </>
                                                )}
                                                {item.type === 'session' && (
                                                    <>
                                                        <div className="text-[8px] text-slate-400 mb-0.5">
                                                            {new Date(item.data.date).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                            })}
                                                        </div>
                                                        <div className="text-[10px] font-black text-white leading-tight truncate">
                                                            {resolveTargetName(item.data.targetId, item.data.targetType)}
                                                        </div>
                                                        <div className="text-[9px] text-slate-400">
                                                            {item.data.trainingPhase || item.data.title}
                                                        </div>
                                                    </>
                                                )}
                                                {item.type === 'exercise' && (
                                                    <>
                                                        <div className="text-[8px] text-slate-400 mb-0.5">
                                                            Exercise
                                                        </div>
                                                        <div className="text-[10px] font-black text-white leading-tight">
                                                            {item.data.name}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className="text-slate-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                                            >
                                                <XIcon size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkoutPacketModal;
