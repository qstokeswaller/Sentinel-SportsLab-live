import React, { useState, useEffect } from 'react';
import { XIcon } from 'lucide-react';
import { AthleteAvatar } from '../roster/AthleteAvatar';
import { CustomSelect } from '../ui/CustomSelect';
import { useAppState } from '../../context/AppStateContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    athlete: any;
}

// Edit Athlete Profile — modal that mirrors the add-athlete fields so a coach can
// update every piece of identity/profile info from the athlete page. Photo upload
// is handled by AthleteAvatar's `editable` mode (writes through to DB on file pick).
export const EditAthleteProfileModal: React.FC<Props> = ({ isOpen, onClose, athlete }) => {
    const { teams, handleUpdateAthlete, showToast } = useAppState();

    const [form, setForm] = useState({
        name: '',
        team_id: '',
        sport: '',
        position: '',
        age: '',
        gender: '',
        height_cm: '',
        weight_kg: '',
        goals: '',
        notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !athlete) return;
        setForm({
            name:      athlete.name      ?? '',
            team_id:   athlete.team_id   ?? athlete.teamId ?? '',
            sport:     athlete.sport     ?? '',
            position:  athlete.position  ?? '',
            age:       athlete.age != null ? String(athlete.age) : '',
            gender:    athlete.gender    ?? '',
            height_cm: athlete.height_cm != null ? String(athlete.height_cm) : '',
            weight_kg: athlete.weight_kg != null ? String(athlete.weight_kg) : '',
            goals:     athlete.goals     ?? '',
            notes:     athlete.notes     ?? '',
        });
        setImageUrl(athlete.image_url ?? null);
    }, [isOpen, athlete]);

    if (!isOpen) return null;

    const update = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        if (!form.name.trim()) { showToast('Name is required', 'error'); return; }
        setSaving(true);
        try {
            const updates: Record<string, any> = {
                name:      form.name.trim(),
                sport:     form.sport.trim()    || null,
                position:  form.position.trim() || null,
                age:       form.age       === '' ? null : Number(form.age),
                gender:    form.gender    || null,
                height_cm: form.height_cm === '' ? null : Number(form.height_cm),
                weight_kg: form.weight_kg === '' ? null : Number(form.weight_kg),
                goals:     form.goals.trim()    || null,
                notes:     form.notes.trim()    || null,
            };
            if (form.team_id) updates.team_id = form.team_id;
            await handleUpdateAthlete(athlete.id, updates);
            showToast('Athlete updated', 'success');
            onClose();
        } catch (err) {
            // handleUpdateAthlete surfaces its own toast on error
        } finally {
            setSaving(false);
        }
    };

    const realTeams = (teams || []).filter((t: any) => t.id !== 't_private');

    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150" onClick={onClose}>
            <div
                className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#243A58] shrink-0">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Edit athlete profile</h3>
                        <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-0.5">Identity, biometrics, sport &amp; notes</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors">
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                    {/* Avatar — click to upload (writes through immediately via AthleteAvatar) */}
                    <div className="flex items-center gap-4">
                        <AthleteAvatar
                            player={{ ...athlete, image_url: imageUrl }}
                            size="xl"
                            editable
                            onChange={(url) => setImageUrl(url)}
                        />
                        <div className="text-[11px] text-slate-500 dark:text-[#CBD5E1] leading-snug">
                            Click the photo to upload a new image.<br/>
                            <span className="text-slate-400 dark:text-[#94A3B8]">PNG, JPG or WebP · 5 MB max.</span>
                        </div>
                    </div>

                    {/* Name */}
                    <label className="block">
                        <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Name *</span>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => update('name', e.target.value)}
                            placeholder="Athlete name"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-indigo-400"
                        />
                    </label>

                    {/* Team */}
                    {realTeams.length > 0 && (
                        <label className="block">
                            <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Team</span>
                            <CustomSelect value={form.team_id} onChange={(e: any) => update('team_id', e.target.value)}>
                                {realTeams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </CustomSelect>
                        </label>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Age</span>
                            <input type="number" min="10" max="80" value={form.age} onChange={e => update('age', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400" />
                        </label>
                        <label className="block">
                            <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Gender</span>
                            <CustomSelect value={form.gender} onChange={(e: any) => update('gender', e.target.value)}>
                                <option value="">—</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </CustomSelect>
                        </label>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                            <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Height (cm)</span>
                            <input type="number" min="100" max="250" value={form.height_cm} onChange={e => update('height_cm', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400" />
                        </label>
                        <label className="block">
                            <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Weight (kg)</span>
                            <input type="number" min="30" max="200" value={form.weight_kg} onChange={e => update('weight_kg', e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none focus:border-indigo-400" />
                        </label>
                    </div>

                    <label className="block">
                        <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Sport</span>
                        <input type="text" value={form.sport} onChange={e => update('sport', e.target.value)}
                            placeholder="e.g. Football"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-indigo-400" />
                    </label>

                    <label className="block">
                        <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Position</span>
                        <input type="text" value={form.position} onChange={e => update('position', e.target.value)}
                            placeholder="e.g. Striker, Midfielder"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-indigo-400" />
                    </label>

                    <label className="block">
                        <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Goals</span>
                        <textarea value={form.goals} onChange={e => update('goals', e.target.value)} rows={2}
                            placeholder="What is this athlete working toward?"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-indigo-400 resize-none" />
                    </label>

                    <label className="block">
                        <span className="block text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] mb-1 uppercase tracking-wide">Notes</span>
                        <textarea value={form.notes} onChange={e => update('notes', e.target.value)} rows={3}
                            placeholder="Coaching notes, medical caveats, anything to remember."
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] outline-none focus:border-indigo-400 resize-none" />
                    </label>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 dark:border-[#243A58] shrink-0 bg-slate-50/50 dark:bg-[#0F1C30]/40">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-[#CBD5E1] hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !form.name.trim()}
                        className="px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-indigo-300 disabled:cursor-not-allowed shadow-sm transition-colors"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditAthleteProfileModal;
