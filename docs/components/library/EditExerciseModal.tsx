// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { XIcon, SaveIcon, ImagePlusIcon, Loader2Icon, AlertTriangleIcon } from 'lucide-react';
import { useCreateExercise, useUpdateExercise } from '../../hooks/useExercises';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    MUSCLE_GROUPS, BODY_REGIONS, CLASSIFICATIONS, POSTURES, GRIPS,
    MECHANICS, EQUIPMENT_LIST, MOVEMENT_PATTERNS, FORCE_TYPES,
    CNS_DEMAND_LEVELS, DIFFICULTY_LEVELS,
} from '../../utils/mocks';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '../ui/CustomSelect';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

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
    const { user } = useAuth();
    const [form, setForm] = useState(initialForm);
    const [saving, setSaving] = useState(false);
    const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) setForm(initialForm);
    }, [isOpen, initialForm]);

    const handleImageUpload = async (file: File, slotIdx: number) => {
        if (!user) { showToast('Sign in required to upload images', 'error'); return; }
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            showToast('Image must be JPG, PNG, WebP, or GIF', 'error');
            return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
            showToast('Image must be under 5 MB', 'error');
            return;
        }
        setUploadingSlot(slotIdx);
        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const path = `${user.id}/${filename}`;
            const { error: uploadErr } = await supabase.storage
                .from('exercise-images')
                .upload(path, file, { cacheControl: '3600', upsert: false });
            if (uploadErr) throw uploadErr;
            const { data } = supabase.storage.from('exercise-images').getPublicUrl(path);
            const publicUrl = data.publicUrl;
            // Place in the requested slot (replace if filled)
            setForm(prev => {
                const next = [...(prev.images || [])];
                while (next.length <= slotIdx) next.push(null);
                next[slotIdx] = publicUrl;
                return { ...prev, images: next.filter(Boolean).slice(0, MAX_IMAGES) };
            });
        } catch (err: any) {
            showToast(err.message || 'Image upload failed', 'error');
        } finally {
            setUploadingSlot(null);
        }
    };

    const removeImage = (idx: number) => {
        setForm(prev => {
            const next = (prev.images || []).filter((_, i) => i !== idx);
            return { ...prev, images: next };
        });
    };

    const onSlotPickFile = (slotIdx: number) => {
        const input = fileInputRefs.current[slotIdx];
        if (input) input.click();
    };

    const onSlotDrop = (e: React.DragEvent, slotIdx: number) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleImageUpload(file, slotIdx);
    };

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
            const secondary = (form.secondaryMuscles || [])
                .map((m: string) => m?.trim())
                .filter((m: string) => m && m !== 'Unsorted' && m !== form.primaryMuscle);
            const primary = form.primaryMuscle && form.primaryMuscle !== 'Unsorted' ? [form.primaryMuscle] : [];
            const bodyParts = [...primary, ...secondary];
            const tagsArr = typeof form.tags === 'string'
                ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : (Array.isArray(form.tags) ? form.tags.filter(Boolean) : []);
            const cleanImages = (form.images || []).filter(Boolean).slice(0, MAX_IMAGES);
            const payload = {
                name: form.name.trim(),
                body_parts: bodyParts.length ? bodyParts : null,
                categories: [form.bodyRegion, form.classification].filter(c => c && c !== 'Unsorted'),
                tags: tagsArr.length ? tagsArr : null,
                video_url: form.videoUrl || null,
                description: form.description || null,
                safety_cues: form.safetyCues?.trim() || null,
                images: cleanImages.length ? cleanImages : null,
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
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
                    {/* Name */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block">
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
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-2">Classification</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Primary Muscle</label>
                                <CustomSelect value={form.primaryMuscle ?? form.targetMuscle} onChange={e => set('primaryMuscle', e.target.value)} variant="form" size="sm">
                                    {MUSCLE_GROUPS.map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Secondary Muscles</label>
                                <input
                                    type="text"
                                    value={Array.isArray(form.secondaryMuscles) ? form.secondaryMuscles.join(', ') : (form.secondaryMuscles || '')}
                                    onChange={e => set('secondaryMuscles', e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                                    placeholder="e.g. Triceps, Shoulders"
                                    className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#365880] focus:border-indigo-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Body Region</label>
                                <CustomSelect value={form.bodyRegion} onChange={e => set('bodyRegion', e.target.value)} variant="form" size="sm">
                                    {BODY_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Classification</label>
                                <CustomSelect value={form.classification} onChange={e => set('classification', e.target.value)} variant="form" size="sm">
                                    {CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Movement Pattern</label>
                                <CustomSelect value={form.movementPattern ?? 'Unsorted'} onChange={e => set('movementPattern', e.target.value)} variant="form" size="sm">
                                    {MOVEMENT_PATTERNS.map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Force Type</label>
                                <CustomSelect value={form.forceType ?? 'Unsorted'} onChange={e => set('forceType', e.target.value)} variant="form" size="sm">
                                    {FORCE_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Equipment</label>
                                <CustomSelect value={form.primaryEquipment} onChange={e => set('primaryEquipment', e.target.value)} variant="form" size="sm">
                                    {EQUIPMENT_LIST.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    </div>

                    {/* Section: Demand */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-2">Demand & Difficulty</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">CNS Demand</label>
                                <CustomSelect value={form.cnsDemand ?? ''} onChange={e => set('cnsDemand', e.target.value)} variant="form" size="sm">
                                    <option value="">— Select —</option>
                                    {CNS_DEMAND_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Difficulty</label>
                                <CustomSelect value={form.difficulty ?? ''} onChange={e => set('difficulty', e.target.value)} variant="form" size="sm">
                                    <option value="">— Select —</option>
                                    {DIFFICULTY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    </div>

                    {/* Section: Technique */}
                    <div>
                        <p className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-2">Technique Details</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Posture</label>
                                <CustomSelect value={form.posture} onChange={e => set('posture', e.target.value)} variant="form" size="sm">
                                    {POSTURES.map(p => <option key={p} value={p}>{p}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Grip</label>
                                <CustomSelect value={form.grip} onChange={e => set('grip', e.target.value)} variant="form" size="sm">
                                    {GRIPS.map(g => <option key={g} value={g}>{g}</option>)}
                                </CustomSelect>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-700 dark:text-[#E2E8F0] mb-1 block">Mechanics</label>
                                <CustomSelect value={form.mechanics} onChange={e => set('mechanics', e.target.value)} variant="form" size="sm">
                                    {MECHANICS.map(m => <option key={m} value={m}>{m}</option>)}
                                </CustomSelect>
                            </div>
                        </div>
                    </div>

                    {/* Video URL */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block">Video URL</label>
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
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            rows={3}
                            placeholder="How the exercise is performed, technique notes, training intent..."
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#365880] focus:border-indigo-400 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                        />
                    </div>

                    {/* Safety & Cues */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block flex items-center gap-1.5">
                            <AlertTriangleIcon size={11} className="text-amber-500" />
                            Safety &amp; Cues
                        </label>
                        <textarea
                            value={form.safetyCues || ''}
                            onChange={e => set('safetyCues', e.target.value)}
                            rows={2}
                            placeholder="Coaching cues, form warnings, scaling options the athlete/coach should know..."
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#365880] focus:border-indigo-400 transition-all resize-none placeholder:text-slate-400 dark:placeholder:text-[#475569]"
                        />
                    </div>

                    {/* Images — up to 4 */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block">Images (up to {MAX_IMAGES})</label>
                        <div className="grid grid-cols-4 gap-2">
                            {Array.from({ length: MAX_IMAGES }).map((_, idx) => {
                                const img = (form.images || [])[idx];
                                const isUploading = uploadingSlot === idx;
                                if (img) {
                                    return (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] group">
                                            <img src={img} alt={`Image ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(idx)}
                                                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                                title="Remove image">
                                                <XIcon size={11} />
                                            </button>
                                            {idx === 0 && (
                                                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-indigo-600 text-white">Primary</div>
                                            )}
                                        </div>
                                    );
                                }
                                return (
                                    <div key={idx}
                                        onClick={() => !isUploading && onSlotPickFile(idx)}
                                        onDragOver={e => e.preventDefault()}
                                        onDrop={e => !isUploading && onSlotDrop(e, idx)}
                                        className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                                            isUploading
                                                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/15'
                                                : 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10'
                                        }`}>
                                        {isUploading ? (
                                            <Loader2Icon size={16} className="text-indigo-500 animate-spin" />
                                        ) : (
                                            <>
                                                <ImagePlusIcon size={16} className="text-slate-400 dark:text-[#475569]" />
                                                <span className="text-[9px] text-slate-400 dark:text-[#94A3B8]">Image {idx + 1}</span>
                                            </>
                                        )}
                                        <input
                                            ref={el => (fileInputRefs.current[idx] = el)}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                                            className="hidden"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageUpload(file, idx);
                                                if (e.target) e.target.value = '';
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1.5">Drag a file onto a slot or click to upload. JPG/PNG/WebP up to 5 MB. First image is the primary card thumbnail.</p>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-widest mb-1 block">Tags</label>
                        <input
                            type="text"
                            value={Array.isArray(form.tags) ? form.tags.join(', ') : (form.tags || '')}
                            onChange={e => set('tags', e.target.value)}
                            placeholder="Comma-separated, e.g. Power, Olympic, Unilateral"
                            className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 text-xs text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#365880] focus:border-indigo-400 transition-all"
                        />
                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-1">Separate tags with commas. Shown as pills on the exercise card.</p>
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
