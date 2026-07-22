import React, { useState } from 'react';
import { XIcon, ShieldIcon } from 'lucide-react';
import { SportPicker } from './SportPicker';

interface EditTeamModalProps {
    team: { id: string; name: string; sport?: string };
    onSave: (updates: { name: string; sport: string }) => void | Promise<void>;
    onClose: () => void;
}

// Styled in-app modal for editing a team's name + sporting code after creation.
export const EditTeamModal: React.FC<EditTeamModalProps> = ({ team, onSave, onClose }) => {
    const [name, setName] = useState(team.name || '');
    const [sport, setSport] = useState(team.sport || '');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        try {
            await onSave({ name: name.trim(), sport: sport.trim() });
            onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/40 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 fade-in duration-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-600 flex items-center justify-center shrink-0">
                            <ShieldIcon size={16} className="text-indigo-500 dark:text-white" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Edit Team</h3>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                        <XIcon size={16} />
                    </button>
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block">Team Name</label>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Team name…"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                        className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block">Sport</label>
                    <SportPicker value={sport} onChange={setSport} />
                </div>

                <div className="flex gap-2 pt-1">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#243A58] text-sm font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-all">Cancel</button>
                    <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all">{saving ? 'Saving…' : 'Save Changes'}</button>
                </div>
            </div>
        </div>
    );
};

export default EditTeamModal;
