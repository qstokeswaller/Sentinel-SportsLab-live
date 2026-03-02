// @ts-nocheck
import React from 'react';
import { XIcon, CheckCircle2Icon, AlertTriangleIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

const ImportResolverModal = () => {
    const {
        teams,
        importStaging,
        setImportStaging,
        isImportResolverOpen,
        setIsImportResolverOpen,
        handleCommitImport
    } = useAppState();

    if (!isImportResolverOpen) return null;

    const allAthletes = teams.flatMap(t => t.players);

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Import Resolution</h3>
                    <button onClick={() => setIsImportResolverOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <XIcon size={20} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-0 no-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100 font-black text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="p-4">Import Name</th>
                                <th className="p-4">Type/Value</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {importStaging.map((item, idx) => (
                                <tr key={item.id} className={item.status === 'conflict' ? 'bg-orange-50/50' : ''}>
                                    <td className="p-4 font-bold text-slate-900">{item.originalName}</td>
                                    <td className="p-4 text-slate-500">
                                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded mr-2 uppercase text-[10px]">{item.data.type}</span>
                                        <span className="font-bold">{item.data.value}</span> {item.data.type === 'map' && 'W'}
                                        {item.data.exerciseLabel && <span className="text-[10px] text-slate-400 ml-2">({item.data.exerciseLabel})</span>}
                                    </td>
                                    <td className="p-4">
                                        {item.status === 'matched' && <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2Icon size={14} /> Matched</span>}
                                        {item.status === 'conflict' && <span className="text-orange-600 font-bold flex items-center gap-1"><AlertTriangleIcon size={14} /> Unmatched</span>}
                                    </td>
                                    <td className="p-4">
                                        <select
                                            className={`bg-white border rounded-lg px-3 py-2 outline-none font-bold w-full max-w-[200px] ${item.status === 'conflict' ? 'border-orange-200 ring-2 ring-orange-100' : 'border-slate-200'}`}
                                            value={item.matchedId}
                                            onChange={(e) => {
                                                const newStaging = [...importStaging];
                                                newStaging[idx].matchedId = e.target.value;
                                                setImportStaging(newStaging);
                                            }}
                                        >
                                            <option value="">-- Select Action --</option>
                                            <optgroup label="Map to Existing">
                                                {allAthletes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </optgroup>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {importStaging.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest italic">
                                        No records to resolve.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={() => setIsImportResolverOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-200 uppercase tracking-wider text-xs transition-colors">Cancel</button>
                    <button onClick={handleCommitImport} disabled={importStaging.length === 0} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">Commit Import</button>
                </div>
            </div>
        </div>
    );
};

export default ImportResolverModal;
