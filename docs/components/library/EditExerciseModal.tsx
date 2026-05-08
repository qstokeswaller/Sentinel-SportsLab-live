// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { XIcon, SaveIcon } from 'lucide-react';
import { useCreateExercise, useUpdateExercise } from '../../hooks/useExercises';
import {
    MUSCLE_GROUPS, BODY_REGIONS, CLASSIFICATIONS, POSTURES, GRIPS,
    MECHANICS, EQUIPMENT_LIST, MOVEMENT_PATTERNS, FORCE_TYPES,
    CNS_DEMAND_LEVELS, DIFFICULTY_LEVELS,
} from '../../utils/mocks';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '../ui/CustomSelect';

interface EditExerciseModalProps {
    isOpen: boolean;
    onClose: () => void;
    exercise: any;
    initialForm: any;
    showToast: (msg: string, type?: string) => void;
}

export const EditExerciseModal = ({ isOpen, onClose, exercise, initialForm, showToast }: EditExerciseModalProps) => {
    const createExercise = useCreateExercise();
    const updateExercise = useUpdateExercise();
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) setForm(initialForm);
    }, [isOpen, initialForm]);

    if (!isOpen) return null;

    const isEditing = !!exercise;
    const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        if (!form.name?.trim()) {
            showToast('Exercise name is required', 'error');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                body_parts: form.primaryMuscle && form.primaryMuscle !== 'Unsorted' ? [form.primaryMuscle] : null,
                categories: [form.bodyRegion, form.classification].filter(c => c && c !== 'Unsorted'),
                video_url: form.videoUrl || null,
                description: form.description || null,
                equipment: form.primaryEquipment && form.primaryEquipment !== 'Unsorted' ? [form.primaryEquipment] : null,
                options: {
                    posture:         form.posture !== 'Unsorted' ? form.posture : null,
                    grip:            form.grip !== 'Unsorted' ? form.grip : null,
                    mechanics:       form.mechanics !== 'Unsorted' ? form.mechanics : null,
                    alternating:     form.execution === 'Alternating',
                    movementPattern: form.movementPattern !== 'Unsorted' ? form.movementPattern : null,
                    forceType:       form.forceType !== 'Unsorted' ? form.forceType : null,
                    cnsDemand:       form.cnsDemand || null,
                    difficulty:      form.difficulty || null,
                },
            };
            if (isEditing) {
                await updateExercise.mutateAsync({ id: exercise.id, ...payload });
                showToast(`${form.name} updated`, 'success');
            } else {
                await createExercise.mutateAsync(payload);
                showToast(`${form.name} created`, 'success');
            }
            onClose();
        } catch (err: any) {
            showToast(err.message || 'Failed to save exercise', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#132338] rounded-xl w-full max-w-2xl shadow-xl border border-slate-200 dark:border-[#243A58] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1A2D48] flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">
                        {isEditing ? 'Edit Exercise' : 'New Exercise'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1A2D48] transition-colors"
                    >
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Form */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 custom-scrollbar">
                    {/* Name */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1.5 block">
                            Exercise Name *
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder="e.g. Barbell Bench Press"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#365880] focus:border-indigo-400 transition-all"
                        />
                    </div>

                    {/* Section: Classification */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-2.5">Classification</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Primary Muscle</label>
                                <CustomSelect value={form.primaryMuscle ?? form.targetMuscle} onChange={e => set('primaryMuscle', e.target.value)} variant="form" size="sm">
                                    {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Body Region</label>
                                <CustomSelect value={form.bodyRegion} onChange={e => set('bodyRegion', e.target.value)} variant="form" size="sm">
                                    {BODY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Classification</label>
                                <CustomSelect value={form.classification} onChange={e => set('classification', e.target.value)} variant="form" size="sm">
                                    {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Movement Pattern</label>
                                <CustomSelect value={form.movementPattern ?? 'Unsorted'} onChange={e => set('movementPattern', e.target.value)} variant="form" size="sm">
                                    {MOVEMENT_PATTERNS.map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Force Type</label>
                                <CustomSelect value={form.forceType ?? 'Unsorted'} onChange={e => set('forceType', e.target.value)} variant="form" size="sm">
                                    {FORCE_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Equipment</label>
                                <CustomSelect value={form.primaryEquipment} onChange={e => set('primaryEquipment', e.target.value)} variant="form" size="sm">
                                    {EQUIPMENT_LIST.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    </div>

                    {/* Section: Demand */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-2.5">Demand & Difficulty</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">CNS Demand</label>
                                <CustomSelect value={form.cnsDemand ?? ''} onChange={e => set('cnsDemand', e.target.value)} variant="form" size="sm">
                                    <option value="">— Select —</option>
                                    {CNS_DEMAND_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Difficulty</label>
                                <CustomSelect value={form.difficulty ?? ''} onChange={e => set('difficulty', e.target.value)} variant="form" size="sm">
                                    <option value="">— Select —</option>
                                    {DIFFICULTY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    </div>

                    {/* Section: Technique */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-2.5">Technique Details</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Posture</label>
                                <CustomSelect value={form.posture} onChange={e => set('posture', e.target.value)} variant="form" size="sm">
                                    {POSTURES.map(p => <option key={p} value={p}>{p}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Grip</label>
                                <CustomSelect value={form.grip} onChange={e => set('grip', e.target.value)} variant="form" size="sm">
                                    {GRIPS.map(g => <option key={g} value={g}>{g}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-400 dark:text-[#64748B] mb-1.5 block">Mechanics</label>
                                <CustomSelect value={form.mechanics} onChange={e => set('mechanics', e.target.value)} variant="form" size="sm">
                                    {MECHANICS.map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    </div>

                    {/* Video URL */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1.5 block">Video URL</label>
                        <input
                            type="url"
                            value={form.videoUrl}
                            onChange={e => set('videoUrl', e.target.value)}
                            placeholder="https://youtube.com/..."
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#365880] focus:border-indigo-400 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-widest mb-1.5 block">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            rows={3}
                            placeholder="Optional exercise notes..."
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#365880] focus:border-indigo-400 transition-all resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-100 dark:border-[#1A2D48] flex justify-end gap-2 shrink-0">
                    <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                        <SaveIcon size={13} className="mr-1.5" />
                        {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Exercise'}
                    </Button>
                </div>
            </div>
        </div>
    );
};
