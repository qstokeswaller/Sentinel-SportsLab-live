// @ts-nocheck
import React, { useState } from 'react';
import { PlusIcon, XIcon, ActivityIcon, TimerIcon, DumbbellIcon, ClockIcon, ChevronDownIcon } from 'lucide-react';

export type LinkedSession = {
    id: string;
    title: string;
    source: 'wattbike' | 'conditioning' | 'workout-template' | 'workout-program';
    meta?: string; // short description shown on the chip
};

type SourceConfig = {
    key: string;
    label: string;
    icon: React.ReactNode;
    color: string;       // tailwind bg color for badge
    textColor: string;   // tailwind text color
    items: { id: string; title: string; meta?: string }[];
};

interface LinkedSessionsPickerProps {
    linked: LinkedSession[];
    onChange: (updated: LinkedSession[]) => void;
    sources: SourceConfig[];
    label?: string;
}

export const LinkedSessionsPicker: React.FC<LinkedSessionsPickerProps> = ({
    linked,
    onChange,
    sources,
    label = 'Linked Sessions',
}) => {
    const [open, setOpen] = useState(false);
    const [activeSource, setActiveSource] = useState(sources[0]?.key || '');
    const [search, setSearch] = useState('');

    const linkedIds = new Set(linked.map(l => l.id));

    const addSession = (source: SourceConfig, item: { id: string; title: string; meta?: string }) => {
        if (linkedIds.has(item.id)) return;
        onChange([...linked, { id: item.id, title: item.title, source: source.key as LinkedSession['source'], meta: item.meta }]);
    };

    const removeSession = (id: string) => {
        onChange(linked.filter(l => l.id !== id));
    };

    const sourceConfig = (key: string) => sources.find(s => s.key === key);
    const activeSrc = sourceConfig(activeSource);
    const filtered = activeSrc?.items.filter(i =>
        !linkedIds.has(i.id) && i.title.toLowerCase().includes(search.toLowerCase())
    ) || [];

    const sourceIcon = (key: string) => {
        const s = sourceConfig(key);
        return s?.icon || <PlusIcon size={12} />;
    };

    const sourceBadge = (key: string) => {
        const s = sourceConfig(key);
        return s ? `${s.color} ${s.textColor}` : 'bg-slate-100 text-slate-600';
    };

    const sourceLabel = (key: string) => {
        const s = sourceConfig(key);
        return s?.label || key;
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</h4>
                <button
                    onClick={() => setOpen(!open)}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-all"
                >
                    <PlusIcon size={13} /> Attach Session
                </button>
            </div>

            {/* Linked chips */}
            {linked.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {linked.map(l => (
                        <div key={l.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm group">
                            <div className={`w-5 h-5 rounded flex items-center justify-center ${sourceBadge(l.source)}`}>
                                {sourceIcon(l.source)}
                            </div>
                            <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-800 block truncate max-w-[180px]">{l.title}</span>
                                <span className="text-[9px] text-slate-400">{sourceLabel(l.source)}{l.meta ? ` · ${l.meta}` : ''}</span>
                            </div>
                            <button onClick={() => removeSession(l.id)} className="p-0.5 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                <XIcon size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {linked.length === 0 && !open && (
                <div
                    onClick={() => setOpen(true)}
                    className="py-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-slate-400 cursor-pointer hover:bg-slate-50 transition-all"
                >
                    <PlusIcon size={16} />
                    <p className="text-[10px] font-medium">Attach sessions from other modules to create mixed workouts</p>
                </div>
            )}

            {/* Picker dropdown */}
            {open && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden animate-in slide-in-from-top-2 duration-200">
                    {/* Source tabs */}
                    <div className="flex border-b border-slate-100">
                        {sources.map(s => (
                            <button
                                key={s.key}
                                onClick={() => { setActiveSource(s.key); setSearch(''); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-all ${activeSource === s.key ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {s.icon}
                                {s.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="p-2.5 border-b border-slate-100">
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={`Search ${activeSrc?.label || ''}...`}
                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-500/10"
                            autoFocus
                        />
                    </div>

                    {/* Items list */}
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.length === 0 && (
                            <div className="py-6 text-center text-xs text-slate-400">
                                {(activeSrc?.items.length || 0) === 0 ? 'No sessions available in this module' : 'No matching sessions'}
                            </div>
                        )}
                        {filtered.map(item => (
                            <button
                                key={item.id}
                                onClick={() => addSession(activeSrc!, item)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-all text-left border-b border-slate-50 last:border-0"
                            >
                                <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${activeSrc?.color} ${activeSrc?.textColor}`}>
                                    {activeSrc?.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-xs font-medium text-slate-800 block truncate">{item.title}</span>
                                    {item.meta && <span className="text-[10px] text-slate-400">{item.meta}</span>}
                                </div>
                                <PlusIcon size={12} className="text-slate-300 shrink-0" />
                            </button>
                        ))}
                    </div>

                    {/* Close */}
                    <div className="border-t border-slate-100 p-2 flex justify-end">
                        <button onClick={() => setOpen(false)} className="text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-all px-2 py-1">
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
