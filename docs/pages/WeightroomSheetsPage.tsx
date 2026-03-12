// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppStateContext';
import { WEIGHTROOM_1RM_EXERCISES } from '../utils/constants';
import { buildMaxLookup, getSheetCellValue, roundTo2_5 } from '../utils/weightroomUtils';
import {
    ArrowLeft as ArrowLeftIcon,
    Printer as PrinterIcon,
    Plus as PlusIcon,
    Trash2 as Trash2Icon,
    X as XIcon,
} from 'lucide-react';

// ── Constants ────────────────────────────────────────────────────────────────

const WS_MODES = [
    { id: 'blank', label: 'Blank Form' },
    { id: 'advanced', label: 'Advanced' },
    { id: 'labeled', label: 'Labeled' },
    { id: 'empty-header', label: 'Empty Header' },
];

// ── Page Component ───────────────────────────────────────────────────────────

export const WeightroomSheetsPage = () => {
    const navigate = useNavigate();
    const { teams, exercises, maxHistory } = useAppState();

    const [wrSelectedTeam, setWrSelectedTeam] = useState('All');
    const [wsMode, setWsMode] = useState('blank');
    const [wsColumns, setWsColumns] = useState([
        { id: 'c1', label: 'Exercise 1', exerciseId: '', percentage: 100 },
        { id: 'c2', label: 'Exercise 2', exerciseId: '', percentage: 100 },
        { id: 'c3', label: 'Exercise 3', exerciseId: '', percentage: 100 },
    ]);
    const [wsOrientation, setWsOrientation] = useState('portrait');

    const athletes = useMemo(() => {
        const list = wrSelectedTeam === 'All'
            ? teams.flatMap(t => t.players || [])
            : (teams.find(t => t.id === wrSelectedTeam)?.players || []);
        return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }, [teams, wrSelectedTeam]);

    const maxLookup = useMemo(() => buildMaxLookup(maxHistory), [maxHistory]);

    const trackableExercises = useMemo(() =>
        WEIGHTROOM_1RM_EXERCISES.map(name => ({ id: name, name })),
        []
    );

    const addColumn = () => {
        const n = wsColumns.length + 1;
        setWsColumns(prev => [...prev, { id: 'c' + Date.now(), label: `Exercise ${n}`, exerciseId: '', percentage: 100 }]);
    };

    const removeColumn = (id) => {
        if (wsColumns.length <= 1) return;
        setWsColumns(prev => prev.filter(c => c.id !== id));
    };

    const updateColumn = (id, field, value) => {
        setWsColumns(prev => prev.map(c => {
            if (c.id !== id) return c;
            const updated = { ...c, [field]: value };
            if (field === 'exerciseId' && wsMode === 'advanced') {
                if (value) updated.label = value;
            }
            return updated;
        }));
    };

    const getColumnHeader = (col, idx) => {
        if (wsMode === 'empty-header') return '';
        if (wsMode === 'blank') return `Exercise ${idx + 1}`;
        if (wsMode === 'labeled' || wsMode === 'advanced') return col.label || `Exercise ${idx + 1}`;
        return col.label;
    };

    const getCellValue = (col, athlete) => {
        if (wsMode !== 'advanced' || !col.exerciseId) return '';
        return getSheetCellValue(col, athlete.id, maxLookup);
    };

    const handlePrint = () => {
        const headers = wsColumns.map((col, i) => getColumnHeader(col, i));
        const rows = athletes.map(a => ({
            name: a.name,
            cells: wsColumns.map(col => getCellValue(col, a))
        }));

        const thStyle = 'padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;background:#1e293b;color:white;border:1px solid #334155;';
        const tdStyle = 'padding:8px 12px;font-size:12px;border:1px solid #e2e8f0;';
        const tdNameStyle = 'padding:8px 12px;font-size:12px;font-weight:600;border:1px solid #e2e8f0;text-transform:uppercase;';

        const headerRow = `<tr><th style="${thStyle}">Name</th>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join('')}</tr>`;
        const bodyRows = rows.map(r =>
            `<tr><td style="${tdNameStyle}">${r.name}</td>${r.cells.map(c => `<td style="${tdStyle}">${c}</td>`).join('')}</tr>`
        ).join('');

        const html = `<!DOCTYPE html><html><head><title>Weightroom Sheet</title>
<style>
@page { size: ${wsOrientation}; margin: 15mm; }
body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #1e293b; }
h1 { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin: 0 0 4px; }
.divider { border: none; border-top: 2px solid #1e293b; margin: 8px auto 20px; width: 60%; }
table { width: 100%; border-collapse: collapse; }
@media print { button { display: none; } }
</style></head><body>
<h1>Weight Training - Record Sheet</h1>
<hr class="divider" />
<table>${headerRow}${bodyRows}</table>
</body></html>`;

        const w = window.open('', '_blank');
        if (w) { w.document.write(html); w.document.close(); w.print(); }
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header */}
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/workouts')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all" title="Back to Workouts">
                            <ArrowLeftIcon size={18} />
                        </button>
                        <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
                            <PrinterIcon size={16} />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-slate-900">Weightroom Sheets</h2>
                            <p className="text-[10px] text-slate-400 mt-0.5">Generate daily prescribed load sheets for your squads</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Controls */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-start gap-5 flex-wrap">
                    {/* Target Squad */}
                    <div className="space-y-1.5 min-w-[180px]">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Target Squad</label>
                        <select value={wrSelectedTeam} onChange={(e) => setWrSelectedTeam(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-slate-400 transition-colors">
                            <option value="All">All Athletes</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    {/* Sheet Mode */}
                    <div className="space-y-1.5 flex-1">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Sheet Mode</label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {WS_MODES.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setWsMode(m.id)}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                        wsMode === m.id
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
                                    }`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Column */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-transparent uppercase tracking-widest">Action</label>
                        <button
                            onClick={addColumn}
                            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-colors shadow-sm"
                        >
                            <PlusIcon size={14} /> Add Column
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content: Preview + Sidebar */}
            <div className="flex gap-4 items-start">
                {/* Left: Live Preview */}
                <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="border border-dashed border-slate-200 rounded-xl bg-white p-5">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Live Print Preview ({wsOrientation})
                                </p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
                                    {athletes.length} Athletes Listed
                                </p>
                            </div>

                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest text-center mb-1">
                                Weight Training - Record Sheet
                            </h2>
                            <div className="w-40 h-0.5 bg-slate-900 mx-auto mb-4" />

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-xs">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">Name</th>
                                            {wsColumns.map((col, i) => (
                                                <th key={col.id} className="px-3 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-wider text-left border border-slate-700">
                                                    {getColumnHeader(col, i)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {athletes.length === 0 ? (
                                            <tr><td colSpan={wsColumns.length + 1} className="px-3 py-6 text-center text-slate-300 text-xs">No athletes in selected squad</td></tr>
                                        ) : athletes.map(a => (
                                            <tr key={a.id} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 font-semibold text-slate-800 uppercase text-[11px] border border-slate-200 whitespace-nowrap">{a.name}</td>
                                                {wsColumns.map(col => (
                                                    <td key={col.id} className="px-3 py-2 text-slate-600 border border-slate-200 text-center min-w-[80px]">
                                                        {getCellValue(col, a) || <span className="text-slate-200">&nbsp;</span>}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="w-64 shrink-0 space-y-4">
                    {/* Sheet Ready Card */}
                    <div className="bg-teal-700 rounded-xl p-5 text-white space-y-4">
                        <div className="flex items-center gap-2.5">
                            <PrinterIcon size={22} />
                            <span className="text-sm font-black uppercase tracking-widest">Sheet Ready</span>
                        </div>
                        <div className="flex rounded-lg overflow-hidden border border-teal-500">
                            {['portrait', 'landscape'].map(o => (
                                <button
                                    key={o}
                                    onClick={() => setWsOrientation(o)}
                                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        wsOrientation === o ? 'bg-teal-500 text-white' : 'bg-teal-800/50 text-teal-300 hover:bg-teal-600'
                                    }`}
                                >
                                    {o}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={handlePrint}
                            className="w-full py-3 bg-white text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            <PrinterIcon size={14} /> Print Sheet
                        </button>
                    </div>

                    {/* Active Columns */}
                    <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-3 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Columns ({wsColumns.length})</p>
                        <div className="space-y-2.5 max-h-[400px] overflow-y-auto no-scrollbar">
                            {wsColumns.map((col, i) => (
                                <div key={col.id} className="border border-slate-100 rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-widest">Column {i + 1}</span>
                                        <button onClick={() => removeColumn(col.id)} className="text-slate-300 hover:text-red-400 transition-colors"><Trash2Icon size={13} /></button>
                                    </div>
                                    {wsMode !== 'empty-header' && (
                                        <input
                                            type="text"
                                            value={col.label}
                                            onChange={(e) => updateColumn(col.id, 'label', e.target.value)}
                                            placeholder={`Exercise ${i + 1}`}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors"
                                        />
                                    )}
                                    {wsMode === 'advanced' && (
                                        <>
                                            <select
                                                value={col.exerciseId}
                                                onChange={(e) => updateColumn(col.id, 'exerciseId', e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-slate-400 transition-colors"
                                            >
                                                <option value="">Select Exercise</option>
                                                {trackableExercises.map(ex => (
                                                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                                                ))}
                                            </select>
                                            <div className="flex items-center gap-1.5">
                                                <input
                                                    type="number"
                                                    value={col.percentage}
                                                    onChange={(e) => updateColumn(col.id, 'percentage', Number(e.target.value) || 100)}
                                                    min={1} max={200}
                                                    className="w-16 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5 text-xs outline-none text-center focus:border-slate-400"
                                                />
                                                <span className="text-[10px] text-slate-400 font-medium">% of 1RM</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeightroomSheetsPage;
