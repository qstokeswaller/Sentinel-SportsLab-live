import React, { useState } from 'react';
import {
    Trash2, Plus, BarChart3, List, ClipboardCheck, Pencil,
    CheckSquare, Type, ToggleLeft, MapPin, X, GripVertical, MousePointerClick
} from 'lucide-react';
import { DatabaseService } from '../../services/databaseService';
import { DEFAULT_WELLNESS_QUESTIONS, DEFAULT_BODY_MAP_CONFIG } from '../../utils/mocks';
import { BodyMapConfig } from '../../types/types';
import BodyMapSelector from '../wellness/BodyMapSelector';
import BodyMapAreaEditor from '../wellness/BodyMapAreaEditor';
import ImageAttachment from '../wellness/ImageAttachment';
import { uploadQuestionImage, deleteQuestionImage } from '../../utils/imageUpload';

// ─── Question type metadata ───────────────────────────────────────────────────
const QUESTION_TYPES = [
    { value: 'scale',           label: 'Scale',              desc: 'Numeric scale with custom range (0–20)' },
    { value: 'multiple_choice', label: 'Multiple Choice',    desc: 'Single selection with optional numeric values' },
    { value: 'checklist',       label: 'Checklist',          desc: 'Multiple selections' },
    { value: 'yes_no',          label: 'Yes / No',           desc: 'Binary response' },
    { value: 'text',            label: 'Free Text',          desc: 'Open text response' },
    { value: 'body_map',        label: 'Image Ref',          desc: 'Reference image with configurable input' },
    { value: 'buttons',          label: 'Buttons',            desc: 'Tappable buttons with optional severity' },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
    scale:           <BarChart3 size={14} />,
    // legacy keys — kept so old saved templates still show an icon in the list view
    scale_1_10:      <BarChart3 size={14} />,
    scale_1_5:       <BarChart3 size={14} />,
    scale_0_3:       <BarChart3 size={14} />,
    multiple_choice: <List size={14} />,
    checklist:       <CheckSquare size={14} />,
    yes_no:          <ToggleLeft size={14} />,
    text:            <Type size={14} />,
    body_map:        <MapPin size={14} />,
    buttons:         <MousePointerClick size={14} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const newQuestion = (type = 'scale') => ({
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    type,
    text: '',
    required: true,
    category: 'wellness',
    ...(type === 'multiple_choice' || type === 'checklist'
        ? { options: ['Option 1'], numericMap: [1] }
        : {}),
    ...(type === 'scale'
        ? { labels: ['', ''], scaleMin: 0, scaleMax: 10 }
        : {}),
    ...(type === 'body_map'
        ? { bodyMapConfig: { ...DEFAULT_BODY_MAP_CONFIG, areas: [...DEFAULT_BODY_MAP_CONFIG.areas], severityLevels: [...DEFAULT_BODY_MAP_CONFIG.severityLevels] } }
        : {}),
    ...(type === 'buttons'
        ? { bodyMapConfig: { areas: [...DEFAULT_BODY_MAP_CONFIG.areas], severityLevels: [...DEFAULT_BODY_MAP_CONFIG.severityLevels], subInputType: 'buttons' as const } }
        : {}),
});

// ─── Per-question config UI ───────────────────────────────────────────────────
const QuestionConfig = ({ q, idx, questions, setQuestions }: {
    q: any; idx: number; questions: any[]; setQuestions: (q: any[]) => void;
}) => {
    const update = (patch: Partial<any>) => {
        const updated = [...questions];
        updated[idx] = { ...updated[idx], ...patch };
        setQuestions(updated);
    };

    const addOption = () => {
        const options = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
        const numericMap = [...(q.numericMap || []), (q.numericMap?.length || 0) + 1];
        update({ options, numericMap });
    };

    const removeOption = (oi: number) => {
        const options = q.options.filter((_: any, i: number) => i !== oi);
        const numericMap = (q.numericMap || []).filter((_: any, i: number) => i !== oi);
        update({ options, numericMap });
    };

    const updateOption = (oi: number, val: string) => {
        const options = [...q.options];
        options[oi] = val;
        update({ options });
    };

    const updateNumericMap = (oi: number, val: string) => {
        const numericMap = [...(q.numericMap || [])];
        numericMap[oi] = val === '' ? null : Number(val);
        update({ numericMap });
    };

    // Scale — flexible range + optional end labels
    const isLegacyScale = q.type === 'scale_1_5' || q.type === 'scale_1_10' || q.type === 'scale_0_3';
    if (q.type === 'scale' || isLegacyScale) {
        // Derive display range for legacy types so the preview is accurate
        const legacyMin = q.type === 'scale_0_3' ? 0 : 1;
        const legacyMax = q.type === 'scale_1_10' ? 10 : q.type === 'scale_0_3' ? 3 : 5;
        const displayMin = isLegacyScale ? legacyMin : (q.scaleMin ?? 0);
        const displayMax = isLegacyScale ? legacyMax : (q.scaleMax ?? 10);

        return (
            <div className="mt-4 space-y-4">
                {/* Range inputs — only editable for new scale type */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Starting Number</label>
                        <input
                            type="number"
                            min={0}
                            max={19}
                            value={isLegacyScale ? legacyMin : (q.scaleMin ?? 0)}
                            disabled={isLegacyScale}
                            onChange={e => {
                                const v = Math.min(Math.max(0, parseInt(e.target.value) || 0), (q.scaleMax ?? 10) - 1);
                                update({ scaleMin: v });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Ending Number</label>
                        <input
                            type="number"
                            min={1}
                            max={20}
                            value={isLegacyScale ? legacyMax : (q.scaleMax ?? 10)}
                            disabled={isLegacyScale}
                            onChange={e => {
                                const v = Math.min(Math.max((q.scaleMin ?? 0) + 1, parseInt(e.target.value) || 10), 20);
                                update({ scaleMax: v });
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        />
                    </div>
                </div>

                {isLegacyScale && (
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">
                        Legacy fixed range ({legacyMin}–{legacyMax}). Delete and re-add as Scale to use a custom range.
                    </p>
                )}

                {/* Live preview strip */}
                <div>
                    <label className="text-[9px] font-semibold uppercase text-slate-400 mb-2 block">
                        Preview — {displayMax - displayMin + 1} steps
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: displayMax - displayMin + 1 }, (_, i) => displayMin + i).map(n => (
                            <span
                                key={n}
                                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-semibold flex items-center justify-center"
                            >
                                {n}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Min / Max labels */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">
                            Min Label <span className="text-slate-300">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={q.labels?.[0] || ''}
                            onChange={e => update({ labels: [e.target.value, q.labels?.[1] || ''] })}
                            placeholder={`e.g. None (${displayMin})`}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-cyan-400 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">
                            Max Label <span className="text-slate-300">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={q.labels?.[1] || ''}
                            onChange={e => update({ labels: [q.labels?.[0] || '', e.target.value] })}
                            placeholder={`e.g. Maximum (${displayMax})`}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-cyan-400 transition-colors"
                        />
                    </div>
                </div>
            </div>
        );
    }

    // Multiple choice — options with optional numeric values
    if (q.type === 'multiple_choice') {
        return (
            <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide">
                        Options <span className="text-cyan-500">+ Numeric Values</span>
                    </label>
                    <button
                        type="button"
                        onClick={addOption}
                        className="flex items-center gap-1 text-[9px] font-semibold uppercase text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                        <Plus size={12} /> Add Option
                    </button>
                </div>
                <div className="space-y-2">
                    {(q.options || []).map((opt: string, oi: number) => (
                        <div key={oi} className="flex items-center gap-2">
                            <GripVertical size={14} className="text-slate-200 shrink-0" />
                            <input
                                type="text"
                                value={opt}
                                onChange={e => updateOption(oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-cyan-400 transition-colors"
                            />
                            <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[9px] font-semibold text-slate-300 uppercase">=</span>
                                <input
                                    type="number"
                                    value={q.numericMap?.[oi] ?? ''}
                                    onChange={e => updateNumericMap(oi, e.target.value)}
                                    placeholder="val"
                                    className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-cyan-400 transition-colors text-center"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeOption(oi)}
                                disabled={(q.options?.length || 0) <= 1}
                                className="p-1 text-slate-200 hover:text-rose-400 transition-colors disabled:opacity-30"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
                <p className="text-[9px] text-slate-300 font-bold">
                    Numeric values are stored in the database for charting and averages.
                </p>
            </div>
        );
    }

    // Checklist — options only, no numeric values
    if (q.type === 'checklist') {
        return (
            <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-[9px] font-semibold uppercase text-slate-400 tracking-wide">Checkbox Options</label>
                    <button
                        type="button"
                        onClick={addOption}
                        className="flex items-center gap-1 text-[9px] font-semibold uppercase text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                        <Plus size={12} /> Add Option
                    </button>
                </div>
                <div className="space-y-2">
                    {(q.options || []).map((opt: string, oi: number) => (
                        <div key={oi} className="flex items-center gap-2">
                            <CheckSquare size={14} className="text-slate-200 shrink-0" />
                            <input
                                type="text"
                                value={opt}
                                onChange={e => updateOption(oi, e.target.value)}
                                placeholder={`Option ${oi + 1}`}
                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-cyan-400 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => removeOption(oi)}
                                disabled={(q.options?.length || 0) <= 1}
                                className="p-1 text-slate-200 hover:text-rose-400 transition-colors disabled:opacity-30"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Yes / No — auto-generated, show preview
    if (q.type === 'yes_no') {
        return (
            <div className="mt-4 flex items-center gap-3">
                <span className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-600">Yes</span>
                <span className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold text-rose-500">No</span>
                <span className="text-[9px] text-slate-300 font-bold uppercase tracking-wide">Auto-generated</span>
            </div>
        );
    }

    // Text — free response
    if (q.type === 'text') {
        return (
            <div className="mt-4 px-4 py-3 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[10px] font-bold text-slate-400 italic">Athletes will type a free text response.</p>
            </div>
        );
    }

    // Body map / Image Ref — live preview + config editor
    if (q.type === 'body_map') {
        const bmConfig: BodyMapConfig = q.bodyMapConfig ?? DEFAULT_BODY_MAP_CONFIG;
        const subType = bmConfig.subInputType || 'buttons';
        return (
            <div className="mt-4 space-y-4">
                {/* Live preview */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wide mb-3">Athlete Preview</p>
                    {subType === 'buttons' ? (
                        <BodyMapSelector
                            value={[]}
                            onChange={() => {}}
                            config={bmConfig}
                            readOnly
                        />
                    ) : (
                        <div className="space-y-3">
                            {bmConfig.referenceImageUrl && (
                                <div className="rounded-xl overflow-hidden border border-slate-100 bg-white">
                                    <img src={bmConfig.referenceImageUrl} alt="Reference" className="w-full object-contain max-h-40" />
                                </div>
                            )}
                            <div className="px-3 py-2.5 bg-white border border-slate-100 rounded-lg">
                                <p className="text-[10px] font-bold text-slate-400 italic">
                                    {subType === 'scale' && `Scale input (${bmConfig.subInputScaleMin ?? 0}–${bmConfig.subInputScaleMax ?? 10})`}
                                    {subType === 'multiple_choice' && `Multiple choice · ${(bmConfig.subInputOptions || []).length} options`}
                                    {subType === 'checklist' && `Checklist · ${(bmConfig.subInputOptions || []).length} options`}
                                    {subType === 'yes_no' && 'Yes / No response'}
                                    {subType === 'text' && 'Free text response'}
                                    {subType === 'none' && 'Image only — no input'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Config editor */}
                <BodyMapAreaEditor
                    config={bmConfig}
                    onChange={(newConfig) => update({ bodyMapConfig: newConfig })}
                />
            </div>
        );
    }

    // Buttons — standalone tappable buttons with optional severity
    if (q.type === 'buttons') {
        const bmConfig: BodyMapConfig = q.bodyMapConfig ?? { areas: [], severityLevels: [...DEFAULT_BODY_MAP_CONFIG.severityLevels], subInputType: 'buttons' };
        return (
            <div className="mt-4 space-y-4">
                {/* Live preview */}
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wide mb-3">Athlete Preview</p>
                    <BodyMapSelector
                        value={[]}
                        onChange={() => {}}
                        config={bmConfig}
                        readOnly
                    />
                </div>

                {/* Config editor (buttonsOnly hides image/sub-input picker) */}
                <BodyMapAreaEditor
                    config={bmConfig}
                    onChange={(newConfig) => update({ bodyMapConfig: newConfig })}
                    buttonsOnly
                />
            </div>
        );
    }

    return null;
};

// ─── Main component ───────────────────────────────────────────────────────────
const QuestionnaireManager = ({ wellnessTemplates, setWellnessTemplates }: any) => {
    const [viewMode, setViewMode] = useState('list'); // list | create
    const [newQuestTitle, setNewQuestTitle] = useState('');
    const [newQuestQuestions, setNewQuestQuestions] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const applyWellnessTemplate = () => {
        setNewQuestTitle('Daily Wellness Check');
        setNewQuestQuestions([...DEFAULT_WELLNESS_QUESTIONS]);
    };

    const handleSaveTemplate = async () => {
        if (!newQuestTitle) return;
        setLoading(true);
        try {
            const templateData = { name: newQuestTitle, questions: newQuestQuestions, is_active: true, is_default: false };
            await DatabaseService.saveQuestionnaireTemplate(
                selectedTemplate ? { ...templateData, id: selectedTemplate.id } : templateData
            );
            const updated = await DatabaseService.fetchQuestionnaireTemplates();
            setWellnessTemplates(updated);
            setViewMode('list');
            setNewQuestTitle('');
            setNewQuestQuestions([]);
            setSelectedTemplate(null);
        } catch (err) {
            console.error(err);
            alert('Failed to save template.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!window.confirm('Are you sure? This will hide the template.')) return;
        try {
            await DatabaseService.deleteQuestionnaireTemplate(id);
            const updated = await DatabaseService.fetchQuestionnaireTemplates();
            setWellnessTemplates(updated);
        } catch (err) {
            alert('Failed to delete.');
        }
    };

    const addQuestion = (type: string) => {
        setNewQuestQuestions(prev => [...prev, newQuestion(type)]);
    };

    const removeQuestion = (idx: number) => {
        setNewQuestQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    // ── List view ──────────────────────────────────────────────────────────────
    const renderListMode = () => (
        <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-2xl font-semibold uppercase tracking-tighter text-slate-900">Questionnaire Templates</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Build and manage athlete survey structures</p>
                </div>
                <button
                    type="button"
                    onClick={() => { setSelectedTemplate(null); setNewQuestTitle(''); setNewQuestQuestions([]); setViewMode('create'); }}
                    className="px-6 py-2.5 bg-cyan-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-wide shadow-lg hover:bg-cyan-700 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Plus size={16} /> New Template
                </button>
            </div>

            {wellnessTemplates.length === 0 ? (
                <div className="p-16 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                    <ClipboardCheck size={40} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-2">No templates yet</p>
                    <p className="text-slate-300 text-xs font-bold mb-6">Create your first questionnaire or load the default daily wellness template.</p>
                    <button
                        type="button"
                        onClick={() => { setNewQuestTitle('Daily Wellness Check'); setNewQuestQuestions([...DEFAULT_WELLNESS_QUESTIONS]); setViewMode('create'); }}
                        className="px-6 py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-semibold uppercase tracking-wide hover:bg-cyan-700 transition-all"
                    >
                        Load Default Wellness Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {wellnessTemplates.map((t: any) => (
                        <div key={t.id} className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                            <div className="space-y-4">
                                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 mb-2">
                                    <ClipboardCheck size={24} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-slate-900 leading-tight mb-1">{t.title || t.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t.questions?.length || 0} Questions • {t.status || 'Active'}</p>
                                </div>

                                {/* Question type breakdown */}
                                <div className="flex flex-wrap gap-1.5">
                                    {(['scale', 'scale_1_10', 'scale_1_5', 'scale_0_3', 'multiple_choice', 'body_map', 'buttons'] as string[])
                                        .filter(type => (t.questions || []).some((q: any) => q.type === type))
                                        .map(type => {
                                            const meta = QUESTION_TYPES.find(qt => qt.value === type);
                                            return (
                                                <span key={type} className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-semibold text-slate-400 uppercase">
                                                    {TYPE_ICONS[type]} {meta?.label}
                                                </span>
                                            );
                                        })}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    {t.user_id == null ? (
                                        <div className="flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wide text-slate-300">
                                            Platform Default
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedTemplate(t);
                                                    setNewQuestTitle(t.title || t.name || '');
                                                    setNewQuestQuestions(t.questions || []);
                                                    setViewMode('create');
                                                }}
                                                className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-semibold uppercase hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <Pencil size={12} /> Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteTemplate(t.id)}
                                                className="p-2 text-slate-200 hover:text-rose-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    // ── Create / Edit view ─────────────────────────────────────────────────────
    const renderCreateMode = () => (
        <div className="space-y-8 animate-in zoom-in-95 duration-300 max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                    <h3 className="text-2xl font-semibold uppercase tracking-tighter text-slate-900">
                        {selectedTemplate ? 'Edit Template' : 'New Template'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">
                        {newQuestQuestions.length} question{newQuestQuestions.length !== 1 ? 's' : ''} added
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => { setViewMode('list'); setSelectedTemplate(null); }}
                    className="px-6 py-3 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-semibold uppercase hover:bg-slate-200 transition-all"
                >
                    Cancel
                </button>
            </div>

            {/* Title */}
            <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase text-slate-400">Template Title</label>
                <input
                    type="text"
                    value={newQuestTitle}
                    onChange={e => setNewQuestTitle(e.target.value)}
                    placeholder="e.g. Daily Wellness Check"
                    className="w-full bg-white border border-slate-200 rounded-xl px-5 py-4 text-lg font-bold outline-none focus:ring-2 focus:ring-cyan-500/10 shadow-sm"
                />
            </div>

            {/* Question list */}
            <div className="space-y-4">
                <h4 className="text-[10px] font-semibold uppercase text-slate-400">Questions</h4>

                {newQuestQuestions.length === 0 ? (
                    <div className="p-10 border-2 border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
                        <p className="text-slate-400 text-sm font-bold mb-4">No questions added yet.</p>
                        <button
                            type="button"
                            onClick={applyWellnessTemplate}
                            className="text-cyan-600 text-[10px] font-semibold uppercase hover:underline"
                        >
                            Load Default "Daily Wellness" Template
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {newQuestQuestions.map((q, i) => (
                            <div
                                key={q.id || i}
                                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm group transition-all hover:border-cyan-200 hover:shadow-md"
                            >
                                {/* Question header */}
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-semibold text-slate-400 shrink-0 mt-1">
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        {/* Question text */}
                                        <input
                                            type="text"
                                            value={q.text}
                                            onChange={e => {
                                                const updated = [...newQuestQuestions];
                                                updated[i] = { ...updated[i], text: e.target.value };
                                                setNewQuestQuestions(updated);
                                            }}
                                            placeholder="Type your question here..."
                                            className="w-full text-base font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:border-cyan-500 outline-none py-1 transition-colors"
                                        />

                                        {/* Type + Required row */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Input Type</label>
                                                <select
                                                    value={q.type}
                                                    onChange={e => {
                                                        const type = e.target.value;
                                                        const updated = [...newQuestQuestions];
                                                        // Rebuild question with new type defaults
                                                        updated[i] = {
                                                            ...newQuestion(type),
                                                            id: q.id,
                                                            text: q.text,
                                                            required: q.required,
                                                            category: q.category,
                                                        };
                                                        setNewQuestQuestions(updated);
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-600 outline-none"
                                                >
                                                    {QUESTION_TYPES.map(qt => (
                                                        <option key={qt.value} value={qt.value}>{qt.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-semibold uppercase text-slate-400 mb-1 block">Category</label>
                                                <select
                                                    value={q.category || 'wellness'}
                                                    onChange={e => {
                                                        const updated = [...newQuestQuestions];
                                                        updated[i] = { ...updated[i], category: e.target.value };
                                                        setNewQuestQuestions(updated);
                                                    }}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs font-bold text-slate-600 outline-none"
                                                >
                                                    <option value="readiness">Readiness</option>
                                                    <option value="wellness">Wellness</option>
                                                    <option value="health">Health</option>
                                                    <option value="injury">Injury</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* Required toggle */}
                                        <label className="flex items-center gap-2 cursor-pointer w-fit">
                                            <input
                                                type="checkbox"
                                                checked={q.required}
                                                onChange={e => {
                                                    const updated = [...newQuestQuestions];
                                                    updated[i] = { ...updated[i], required: e.target.checked };
                                                    setNewQuestQuestions(updated);
                                                }}
                                                className="w-4 h-4 rounded border-slate-300 accent-cyan-600"
                                            />
                                            <span className="text-[10px] font-semibold uppercase text-slate-400">Required</span>
                                        </label>

                                        {/* Reference image attachment */}
                                        <ImageAttachment
                                            imageUrl={q.imageUrl}
                                            onUpload={async (file: File) => {
                                                const url = await uploadQuestionImage(file);
                                                const updated = [...newQuestQuestions];
                                                updated[i] = { ...updated[i], imageUrl: url };
                                                setNewQuestQuestions(updated);
                                            }}
                                            onRemove={async () => {
                                                if (q.imageUrl) await deleteQuestionImage(q.imageUrl);
                                                const updated = [...newQuestQuestions];
                                                updated[i] = { ...updated[i], imageUrl: undefined };
                                                setNewQuestQuestions(updated);
                                            }}
                                        />

                                        {/* Per-type config */}
                                        <QuestionConfig
                                            q={q}
                                            idx={i}
                                            questions={newQuestQuestions}
                                            setQuestions={setNewQuestQuestions}
                                        />

                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => removeQuestion(i)}
                                        className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Question toolbar */}
            <div className="bg-slate-900 p-4 rounded-xl flex flex-wrap items-center gap-2 shadow-xl">
                <span className="text-[10px] font-semibold uppercase text-slate-500 pl-1 mr-2">Add Question:</span>
                {[
                    { type: 'scale',           label: 'Scale',        icon: <BarChart3 size={13} /> },
                    { type: 'multiple_choice', label: 'Choice',       icon: <List size={13} /> },
                    { type: 'checklist',       label: 'Checklist',    icon: <CheckSquare size={13} /> },
                    { type: 'yes_no',          label: 'Yes/No',       icon: <ToggleLeft size={13} /> },
                    { type: 'text',            label: 'Text',         icon: <Type size={13} /> },
                    { type: 'body_map',        label: 'Image Ref',    icon: <MapPin size={13} /> },
                    { type: 'buttons',         label: 'Buttons',      icon: <MousePointerClick size={13} /> },
                ].map(({ type, label, icon }) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => addQuestion(type)}
                        className="px-3 py-2 bg-white/10 text-white rounded-lg text-[10px] font-bold uppercase hover:bg-white/20 transition-all flex items-center gap-1.5"
                    >
                        {icon} {label}
                    </button>
                ))}
            </div>

            {/* Save */}
            <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={loading || !newQuestTitle || newQuestQuestions.length === 0}
                className="w-full py-4 bg-cyan-600 text-white rounded-xl text-[11px] font-semibold uppercase tracking-wide shadow-lg hover:bg-cyan-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {loading ? 'Saving...' : (selectedTemplate ? 'Save Changes' : 'Create Template')}
            </button>
        </div>
    );

    return (
        <div className="h-full">
            {viewMode === 'list' && renderListMode()}
            {viewMode === 'create' && renderCreateMode()}
        </div>
    );
};

export default QuestionnaireManager;
