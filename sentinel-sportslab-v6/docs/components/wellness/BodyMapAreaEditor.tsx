import React, { useRef, useState } from 'react';
import { Plus, Trash2, RotateCcw, ChevronDown, ChevronUp, ImagePlus, X, Loader2 } from 'lucide-react';
import { BodyMapConfig, BodyMapAreaDef, SeverityLevel, ImageRefInputType } from '../../types/types';
import { DEFAULT_BODY_MAP_CONFIG, DEFAULT_SEVERITY_LEVELS } from '../../utils/mocks';
import { uploadQuestionImage, deleteQuestionImage } from '../../utils/imageUpload';

interface BodyMapAreaEditorProps {
    config: BodyMapConfig;
    onChange: (config: BodyMapConfig) => void;
    buttonsOnly?: boolean; // hide sub-input picker, sub-input config, and ref image sections
}

const SUB_INPUT_OPTIONS: { value: ImageRefInputType; label: string; desc: string }[] = [
    { value: 'buttons',          label: 'Buttons',          desc: 'Tappable buttons with optional severity' },
    { value: 'scale',           label: 'Scale',            desc: 'Numeric scale below the image' },
    { value: 'multiple_choice', label: 'Multiple Choice',  desc: 'Single-select options below the image' },
    { value: 'checklist',       label: 'Checklist',        desc: 'Multi-select checkboxes below the image' },
    { value: 'yes_no',          label: 'Yes / No',         desc: 'Binary response below the image' },
    { value: 'text',            label: 'Free Text',        desc: 'Open text response below the image' },
    { value: 'none',            label: 'Image Only',       desc: 'Just the reference image, no input' },
];

const BodyMapAreaEditor: React.FC<BodyMapAreaEditorProps> = ({ config, onChange, buttonsOnly }) => {
    const [severityOpen, setSeverityOpen] = useState(false);
    const [imgUploading, setImgUploading] = useState(false);
    const imgInputRef = useRef<HTMLInputElement>(null);

    const updateArea = (idx: number, patch: Partial<BodyMapAreaDef>) => {
        const areas = [...config.areas];
        areas[idx] = { ...areas[idx], ...patch };
        onChange({ ...config, areas });
    };

    const removeArea = (idx: number) => {
        onChange({ ...config, areas: config.areas.filter((_, i) => i !== idx) });
    };

    const addArea = () => {
        const key = 'area_' + Date.now().toString(36);
        const newArea: BodyMapAreaDef = { key, label: 'New Area', view: 'front', color: '#6366f1', hasSeverity: true };
        onChange({ ...config, areas: [...config.areas, newArea] });
    };

    const updateSeverity = (idx: number, patch: Partial<SeverityLevel>) => {
        const levels = [...config.severityLevels];
        levels[idx] = { ...levels[idx], ...patch };
        onChange({ ...config, severityLevels: levels });
    };

    const addSeverity = () => {
        const maxVal = config.severityLevels.length > 0
            ? Math.max(...config.severityLevels.map(s => s.value))
            : 0;
        const newLevel: SeverityLevel = {
            value: maxVal + 1,
            label: `Level ${maxVal + 1}`,
            shortLabel: `L${maxVal + 1}`,
            style: 'bg-purple-500 border-purple-500 text-white',
            legendColor: '#a855f7',
        };
        onChange({ ...config, severityLevels: [...config.severityLevels, newLevel] });
    };

    const removeSeverity = (idx: number) => {
        if (config.severityLevels.length <= 1) return;
        onChange({ ...config, severityLevels: config.severityLevels.filter((_, i) => i !== idx) });
    };

    const resetToDefaults = () => {
        onChange({ ...DEFAULT_BODY_MAP_CONFIG });
    };

    // Reference image handlers
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImgUploading(true);
        try {
            const url = await uploadQuestionImage(file);
            onChange({ ...config, referenceImageUrl: url });
        } catch (err) {
            console.error('Image upload failed:', err);
        } finally {
            setImgUploading(false);
            if (imgInputRef.current) imgInputRef.current.value = '';
        }
    };

    const handleImageRemove = async () => {
        setImgUploading(true);
        try {
            // Only delete from storage if it's a Supabase URL (not the default static file)
            if (config.referenceImageUrl && !config.referenceImageUrl.startsWith('/')) {
                await deleteQuestionImage(config.referenceImageUrl);
            }
            onChange({ ...config, referenceImageUrl: undefined });
        } finally {
            setImgUploading(false);
        }
    };

    const frontAreas = config.areas.map((a, i) => ({ ...a, _idx: i })).filter(a => a.view === 'front');
    const backAreas = config.areas.map((a, i) => ({ ...a, _idx: i })).filter(a => a.view === 'back');

    const AreaRow = ({ area, idx }: { area: BodyMapAreaDef; idx: number }) => (
        <div className="flex items-center gap-2 group">
            <input
                type="color"
                value={area.color}
                onChange={e => updateArea(idx, { color: e.target.value })}
                className="w-5 h-5 rounded border-0 cursor-pointer shrink-0"
                title="Area color"
            />
            <input
                type="text"
                value={area.label}
                onChange={e => updateArea(idx, { label: e.target.value })}
                className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                placeholder="Area label"
            />
            <select
                value={area.view}
                onChange={e => updateArea(idx, { view: e.target.value as 'front' | 'back' })}
                className="text-[10px] px-1.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-cyan-400"
            >
                <option value="front">Front</option>
                <option value="back">Back</option>
            </select>
            <button
                type="button"
                onClick={() => removeArea(idx)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all shrink-0"
                title="Remove area"
            >
                <Trash2 size={13} />
            </button>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Configuration</p>
                <button
                    type="button"
                    onClick={resetToDefaults}
                    className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                    title="Reset to default areas"
                >
                    <RotateCcw size={11} /> Reset Defaults
                </button>
            </div>

            {/* Sub-input type selector — hidden in buttonsOnly mode */}
            {!buttonsOnly && (<div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Input Below Image</p>
                <select
                    value={config.subInputType || 'buttons'}
                    onChange={e => onChange({ ...config, subInputType: e.target.value as ImageRefInputType })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-600 outline-none focus:border-cyan-400"
                >
                    {SUB_INPUT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <p className="text-[9px] text-slate-400 mt-1">
                    {SUB_INPUT_OPTIONS.find(o => o.value === (config.subInputType || 'buttons'))?.desc}
                </p>
            </div>)}

            {/* Sub-input config for choice/checklist — hidden in buttonsOnly mode */}
            {!buttonsOnly && (config.subInputType === 'multiple_choice' || config.subInputType === 'checklist') && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                            {config.subInputType === 'multiple_choice' ? 'Choice Options' : 'Checklist Options'}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                const opts = [...(config.subInputOptions || ['Option 1'])];
                                opts.push(`Option ${opts.length + 1}`);
                                const nums = [...(config.subInputNumericMap || [1])];
                                nums.push(nums.length + 1);
                                onChange({ ...config, subInputOptions: opts, subInputNumericMap: nums });
                            }}
                            className="flex items-center gap-1 text-[9px] font-semibold uppercase text-cyan-600 hover:text-cyan-700"
                        >
                            <Plus size={11} /> Add
                        </button>
                    </div>
                    {(config.subInputOptions || ['Option 1']).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={opt}
                                onChange={e => {
                                    const opts = [...(config.subInputOptions || [])];
                                    opts[oi] = e.target.value;
                                    onChange({ ...config, subInputOptions: opts });
                                }}
                                className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                                placeholder={`Option ${oi + 1}`}
                            />
                            {config.subInputType === 'multiple_choice' && (
                                <input
                                    type="number"
                                    value={config.subInputNumericMap?.[oi] ?? ''}
                                    onChange={e => {
                                        const nums = [...(config.subInputNumericMap || [])];
                                        nums[oi] = e.target.value === '' ? 0 : Number(e.target.value);
                                        onChange({ ...config, subInputNumericMap: nums });
                                    }}
                                    className="w-12 text-xs px-2 py-1.5 border border-slate-200 rounded-lg text-center focus:outline-none focus:border-cyan-400"
                                    placeholder="val"
                                />
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    const opts = (config.subInputOptions || []).filter((_, i) => i !== oi);
                                    const nums = (config.subInputNumericMap || []).filter((_, i) => i !== oi);
                                    onChange({ ...config, subInputOptions: opts, subInputNumericMap: nums });
                                }}
                                disabled={(config.subInputOptions?.length || 1) <= 1}
                                className="text-slate-300 hover:text-red-400 transition-colors disabled:opacity-30"
                            >
                                <X size={13} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Sub-input config for scale */}
            {!buttonsOnly && config.subInputType === 'scale' && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Min</p>
                        <input
                            type="number"
                            value={config.subInputScaleMin ?? 0}
                            onChange={e => onChange({ ...config, subInputScaleMin: parseInt(e.target.value) || 0 })}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                        />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Max</p>
                        <input
                            type="number"
                            value={config.subInputScaleMax ?? 10}
                            onChange={e => onChange({ ...config, subInputScaleMax: parseInt(e.target.value) || 10 })}
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                        />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Min Label</p>
                        <input
                            type="text"
                            value={config.subInputLabels?.[0] || ''}
                            onChange={e => onChange({ ...config, subInputLabels: [e.target.value, config.subInputLabels?.[1] || ''] })}
                            placeholder="e.g. None"
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                        />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase text-slate-500 mb-1">Max Label</p>
                        <input
                            type="text"
                            value={config.subInputLabels?.[1] || ''}
                            onChange={e => onChange({ ...config, subInputLabels: [config.subInputLabels?.[0] || '', e.target.value] })}
                            placeholder="e.g. Maximum"
                            className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                        />
                    </div>
                </div>
            )}

            {/* Reference image management — hidden in buttonsOnly mode */}
            {!buttonsOnly && (<div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Reference Image</p>
                <input
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleImageUpload}
                    className="hidden"
                />
                {config.referenceImageUrl ? (
                    <div className="relative group">
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                            <img src={config.referenceImageUrl} alt="Reference" className="w-full object-contain max-h-32" />
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={() => imgInputRef.current?.click()}
                                disabled={imgUploading}
                                className="w-6 h-6 rounded-full bg-cyan-500 text-white flex items-center justify-center hover:bg-cyan-600"
                                title="Replace image"
                            >
                                <ImagePlus size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={handleImageRemove}
                                disabled={imgUploading}
                                className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                                title="Remove image"
                            >
                                {imgUploading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => imgInputRef.current?.click()}
                        disabled={imgUploading}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-semibold text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-all"
                    >
                        {imgUploading ? (
                            <><Loader2 size={12} className="animate-spin" /> Uploading...</>
                        ) : (
                            <><ImagePlus size={12} /> Add Reference Image</>
                        )}
                    </button>
                )}
            </div>)}

            {/* Buttons config — shown when subInputType is buttons OR in buttonsOnly mode */}
            {(buttonsOnly || !config.subInputType || config.subInputType === 'buttons') && (<>
            {/* Areas by view */}
            <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-2">Areas</p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-500 px-1">Front</p>
                        {frontAreas.map(a => <AreaRow key={a.key} area={a} idx={a._idx} />)}
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-cyan-500 px-1">Back</p>
                        {backAreas.map(a => <AreaRow key={a.key} area={a} idx={a._idx} />)}
                    </div>
                </div>
            </div>

            {/* Add area */}
            <button
                type="button"
                onClick={addArea}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-semibold text-slate-400 hover:border-cyan-300 hover:text-cyan-500 transition-all"
            >
                <Plus size={12} /> Add Area
            </button>

            {/* Instruction text */}
            <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Instruction Text</p>
                <input
                    type="text"
                    value={config.instructionText || ''}
                    onChange={e => onChange({ ...config, instructionText: e.target.value })}
                    placeholder="Tap an area to mark it..."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                />
            </div>

            {/* Enable severity toggle */}
            <label className="flex items-center gap-2 cursor-pointer px-1">
                <input
                    type="checkbox"
                    checked={config.areas.some(a => a.hasSeverity !== false)}
                    onChange={e => {
                        const val = e.target.checked;
                        onChange({ ...config, areas: config.areas.map(a => ({ ...a, hasSeverity: val })) });
                    }}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-cyan-600"
                />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Enable Severity</span>
                <span className="text-[9px] text-slate-400">— buttons cycle through severity levels instead of simple on/off</span>
            </label>

            {/* Severity levels (collapsible) — only shown when severity is enabled */}
            {config.areas.some(a => a.hasSeverity !== false) && (
            <div className="border border-slate-100 rounded-xl overflow-hidden">
                <button
                    type="button"
                    onClick={() => setSeverityOpen(!severityOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors"
                >
                    Severity Levels ({config.severityLevels.length})
                    {severityOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {severityOpen && (
                    <div className="p-3 space-y-2">
                        {config.severityLevels.map((s, i) => (
                            <div key={s.value} className="flex items-center gap-2 group">
                                <input
                                    type="color"
                                    value={s.legendColor}
                                    onChange={e => {
                                        const hex = e.target.value;
                                        // Auto-generate a Tailwind-like style from the hex color
                                        updateSeverity(i, {
                                            legendColor: hex,
                                            style: `bg-[${hex}] border-[${hex}] text-white`,
                                        });
                                    }}
                                    className="w-5 h-5 rounded border-0 cursor-pointer shrink-0"
                                />
                                <input
                                    type="text"
                                    value={s.label}
                                    onChange={e => {
                                        const label = e.target.value;
                                        updateSeverity(i, { label, shortLabel: label.length > 4 ? label.slice(0, 3) : label });
                                    }}
                                    className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-cyan-400"
                                    placeholder="Level label"
                                />
                                <span className="text-[9px] font-mono text-slate-400 shrink-0">= {s.value}</span>
                                <button
                                    type="button"
                                    onClick={() => removeSeverity(i)}
                                    disabled={config.severityLevels.length <= 1}
                                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all shrink-0 disabled:opacity-10"
                                    title="Remove level"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addSeverity}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 border-2 border-dashed border-slate-200 rounded-lg text-[10px] font-semibold text-slate-400 hover:border-cyan-300 hover:text-cyan-500 transition-all mt-1"
                        >
                            <Plus size={11} /> Add Level
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ ...config, severityLevels: [...DEFAULT_SEVERITY_LEVELS] })}
                            className="w-full flex items-center justify-center gap-1 text-[9px] font-semibold text-slate-400 hover:text-slate-600 transition-colors mt-1"
                        >
                            <RotateCcw size={10} /> Reset Severity Defaults
                        </button>
                    </div>
                )}
            </div>
            )}
            </>)}
        </div>
    );
};

export default BodyMapAreaEditor;
