// @ts-nocheck
import React, { useState, useMemo, useRef } from 'react';
import { useAppState } from '../../context/AppStateContext';
import BodyMapSelector from './BodyMapSelector';
import {
    ShieldAlertIcon, PlusIcon, HistoryIcon, UserIcon,
    CalendarIcon, ChevronDownIcon, UploadCloudIcon, XIcon,
    Trash2Icon, PencilIcon, Loader2Icon, ImageIcon,
    Link2Icon, CopyIcon, Share2Icon, CheckCircle2Icon
} from 'lucide-react';
import { uploadQuestionImage, deleteQuestionImage } from '../../utils/imageUpload';
import {
    INJURY_CLASSIFICATIONS, SEVERITY_GRADES, LATERALITY_OPTIONS,
    INJURY_ACTIVITIES, PAIN_KINDS, RANGE_OF_MOTION_OPTIONS,
    WEIGHT_BEARING_OPTIONS, TRAINING_STATUS_OPTIONS, TREATMENT_OPTIONS, RTP_PHASES
} from '../../utils/mocks';

// ─── Helpers ────────────────────────────────────────────────────────────────

const createEmptyForm = () => ({
    athleteId: '',
    athleteName: '',
    teamId: undefined,
    areas: [],
    classification: undefined,
    severityGrade: undefined,
    laterality: undefined,
    recurrence: undefined,
    activity: undefined,
    dateOfInjury: new Date().toISOString().split('T')[0],
    mechanism: '',
    painLevel: undefined,
    painKinds: [],
    hasSwelling: false,
    swellingSeverity: undefined,
    hasBruising: false,
    bruisingSeverity: undefined,
    rangeOfMotion: undefined,
    weightBearing: undefined,
    stoppedTraining: undefined,
    currentStatus: undefined,
    treatmentPrescribed: [],
    treatmentRecommendations: '',
    followUpDate: '',
    returnToPlayPhase: undefined,
    expectedTimeOut: '',
    comments: '',
    attachmentUrls: [],
});

const toggleMulti = (arr, value) => arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

// ─── Reusable pill button row ───────────────────────────────────────────────

const PillRow = ({ options, value, onChange, colorMap }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => {
            const label = typeof opt === 'string' ? opt : opt.label;
            const val = typeof opt === 'string' ? opt : opt.value;
            const isActive = value === val;
            const activeColor = colorMap?.[val] || 'bg-indigo-600 text-white';
            return (
                <button
                    key={val}
                    type="button"
                    onClick={() => onChange(isActive ? undefined : val)}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? activeColor + ' shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                >
                    {label}
                </button>
            );
        })}
    </div>
);

const MultiPillRow = ({ options, value = [], onChange }) => (
    <div className="flex flex-wrap gap-2">
        {options.map(opt => {
            const isActive = value.includes(opt);
            return (
                <button
                    key={opt}
                    type="button"
                    onClick={() => onChange(toggleMulti(value, opt))}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'}`}
                >
                    {opt}
                </button>
            );
        })}
    </div>
);

const Label = ({ children }) => (
    <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest pl-1 mb-1.5 block">{children}</label>
);

const SectionCard = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
        <h5 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">{title}</h5>
        {children}
    </div>
);

// ─── Main Component ─────────────────────────────────────────────────────────

const InjuryReportComponent = () => {
    const { teams, injuryReports, setInjuryReports, saveInjuryReportToDB, deleteInjuryReportFromDB, injuryFilterAthleteId, setInjuryFilterAthleteId } = useAppState();

    const [activeTab, setActiveTab] = useState('new');
    const [form, setForm] = useState(createEmptyForm());
    const [editingId, setEditingId] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const fileRef = useRef(null);
    const sectionRefs = {
        athlete: useRef(null),
        bodyMap: useRef(null),
        classification: useRef(null),
        dateOfInjury: useRef(null),
    };

    // Flatten all athletes
    const allAthletes = useMemo(() =>
        teams.flatMap(t => t.players.map(p => ({ ...p, teamId: t.id, teamName: t.name }))),
        [teams]
    );

    // Filtered reports for history
    const filteredReports = useMemo(() => {
        let reports = [...injuryReports];
        if (injuryFilterAthleteId && injuryFilterAthleteId !== 'All') {
            if (injuryFilterAthleteId.startsWith('team_')) {
                const teamId = injuryFilterAthleteId.replace('team_', '');
                const team = teams.find(t => t.id === teamId);
                const playerIds = new Set(team?.players.map(p => p.id) || []);
                reports = reports.filter(r => playerIds.has(r.athleteId));
            } else {
                reports = reports.filter(r => r.athleteId === injuryFilterAthleteId);
            }
        }
        return reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [injuryReports, injuryFilterAthleteId, teams]);

    const patch = (updates) => setForm(prev => ({ ...prev, ...updates }));

    const handleAthleteSelect = (id) => {
        const athlete = allAthletes.find(a => a.id === id);
        if (athlete) patch({ athleteId: athlete.id, athleteName: athlete.name, teamId: athlete.teamId });
    };

    // Clear a specific validation error when user interacts with that field
    const clearError = (field: string) => {
        if (validationErrors[field]) setValidationErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    };

    const handleSave = () => {
        const errors: Record<string, string> = {};
        if (!form.athleteId) errors.athlete = 'Please select an athlete';
        if (form.areas.length === 0) errors.bodyMap = 'Please select at least one injury location on the body map';
        if (!form.classification) errors.classification = 'Please select an injury classification';
        if (!form.dateOfInjury) errors.dateOfInjury = 'Please enter the date of injury';

        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            // Scroll to first error
            const firstKey = Object.keys(errors)[0];
            sectionRefs[firstKey]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        setValidationErrors({});
        const now = new Date().toISOString();
        let savedReport;
        if (editingId) {
            savedReport = { ...form, id: editingId, updatedAt: now };
            setInjuryReports(prev => prev.map(r => r.id === editingId ? { ...r, ...form, updatedAt: now } : r));
        } else {
            savedReport = { ...form, id: 'ir_' + Date.now().toString(36), createdAt: now };
            setInjuryReports(prev => [savedReport, ...prev]);
        }
        // Persist to Supabase DB (fire-and-forget, localStorage auto-save is the safety net)
        saveInjuryReportToDB(savedReport);
        setForm(createEmptyForm());
        setEditingId(null);
        setActiveTab('history');
    };

    const handleEdit = (report) => {
        const { id, createdAt, updatedAt, ...rest } = report;
        setForm(rest);
        setEditingId(id);
        setActiveTab('new');
    };

    const handleDelete = (id) => {
        setInjuryReports(prev => prev.filter(r => r.id !== id));
        deleteInjuryReportFromDB(id);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await uploadQuestionImage(file);
            patch({ attachmentUrls: [...(form.attachmentUrls || []), url] });
        } catch (err) { console.error('Upload failed:', err); }
        setUploading(false);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleRemoveAttachment = async (url) => {
        try { await deleteQuestionImage(url); } catch {}
        patch({ attachmentUrls: (form.attachmentUrls || []).filter(u => u !== url) });
    };

    // ─── RENDER ─────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            {/* ACTION BAR */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                        <ShieldAlertIcon size={20} />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-slate-900">Injury Report</h4>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">Injury Tracking & Return to Play</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Tab toggle */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setActiveTab('new')}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'new' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <PlusIcon size={12} /> New Report
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <HistoryIcon size={12} /> History ({filteredReports.length})
                        </button>
                    </div>

                    <div className="h-10 w-[1px] bg-slate-200" />

                    {/* Filter */}
                    <div className="relative">
                        <label className="text-[9px] font-medium text-slate-400 uppercase tracking-wide absolute -top-5 left-2">Filter</label>
                        <select
                            value={injuryFilterAthleteId}
                            onChange={e => setInjuryFilterAthleteId(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-700 outline-none appearance-none hover:border-indigo-300 transition-all cursor-pointer pr-10 shadow-sm min-w-[180px]"
                        >
                            <option value="All">All Athletes</option>
                            <optgroup label="Squads">
                                {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                            </optgroup>
                            <optgroup label="Athletes">
                                {allAthletes.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </optgroup>
                        </select>
                        <ChevronDownIcon size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* ═══ NEW REPORT TAB ═══ */}
            {activeTab === 'new' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* LEFT — Form */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Athlete Selection */}
                        <div ref={sectionRefs.athlete}>
                        <SectionCard title="Athlete Selection">
                            <div>
                                <Label>Player <span className="text-red-400">*</span></Label>
                                <select
                                    value={form.athleteId}
                                    onChange={e => { handleAthleteSelect(e.target.value); clearError('athlete'); }}
                                    className={`w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border rounded-xl outline-none transition-all font-bold text-slate-900 ${validationErrors.athlete ? 'border-red-400 ring-2 ring-red-100' : 'border-transparent focus:border-indigo-500'}`}
                                >
                                    <option value="">Select athlete...</option>
                                    {teams.map(t => (
                                        <optgroup key={t.id} label={t.name}>
                                            {t.players.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>
                                {validationErrors.athlete && <p className="text-red-500 text-[10px] font-semibold mt-1.5 pl-1">{validationErrors.athlete}</p>}
                            </div>
                        </SectionCard>
                        </div>

                        {/* Share Link Panel — shown when athlete is selected */}
                        {form.athleteId && form.teamId && (
                            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center">
                                        <Link2Icon size={16} className="text-emerald-600" />
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-semibold text-slate-700">Share with Physio</h5>
                                        <p className="text-[9px] text-slate-400 uppercase tracking-wide font-medium">No login required</p>
                                    </div>
                                </div>
                                {(() => {
                                    const shareLink = `${window.location.origin}/injury-form/${form.teamId}/${form.athleteId}`;
                                    const teamLink = `${window.location.origin}/injury-form/${form.teamId}`;
                                    const waUrl = `https://wa.me/?text=${encodeURIComponent(`Complete the injury report for ${form.athleteName}: ${shareLink}`)}`;
                                    const handleCopy = async (link) => {
                                        await navigator.clipboard.writeText(link);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2500);
                                    };
                                    return (
                                        <div className="space-y-3">
                                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-2">
                                                <p className="text-[10px] font-mono text-slate-400 truncate flex-1">{shareLink}</p>
                                                <button onClick={() => handleCopy(shareLink)}
                                                    className={`p-1.5 rounded-lg border transition-all shrink-0 ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}
                                                >
                                                    {copied ? <CheckCircle2Icon size={13} /> : <CopyIcon size={13} />}
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleCopy(shareLink)}
                                                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5">
                                                    <CopyIcon size={12} /> {copied ? 'Copied!' : 'Copy Link'}
                                                </button>
                                                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                                                    className="flex-1 py-2.5 bg-[#25D366] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#1ebe5d] transition-all flex items-center justify-center gap-1.5">
                                                    <Share2Icon size={12} /> WhatsApp
                                                </a>
                                            </div>
                                            <button onClick={() => handleCopy(teamLink)} className="w-full text-[9px] font-medium text-slate-400 hover:text-indigo-500 transition-colors text-center">
                                                Or copy team link (physio selects athlete)
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Classification & Context */}
                        <div ref={sectionRefs.classification}>
                        <SectionCard title="Classification & Context">
                            <div>
                                <Label>Injury Classification <span className="text-red-400">*</span></Label>
                                <select
                                    value={form.classification || ''}
                                    onChange={e => { patch({ classification: e.target.value || undefined }); clearError('classification'); }}
                                    className={`w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border rounded-xl outline-none transition-all font-bold text-slate-900 ${validationErrors.classification ? 'border-red-400 ring-2 ring-red-100' : 'border-transparent focus:border-indigo-500'}`}
                                >
                                    <option value="">Select type...</option>
                                    {INJURY_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {validationErrors.classification && <p className="text-red-500 text-[10px] font-semibold mt-1.5 pl-1">{validationErrors.classification}</p>}
                            </div>

                            <div>
                                <Label>Severity Grade</Label>
                                <PillRow
                                    options={SEVERITY_GRADES}
                                    value={form.severityGrade}
                                    onChange={v => patch({ severityGrade: v })}
                                    colorMap={{ 1: 'bg-yellow-500 text-white', 2: 'bg-orange-500 text-white', 3: 'bg-red-600 text-white' }}
                                />
                            </div>

                            <div>
                                <Label>Laterality</Label>
                                <PillRow options={[...LATERALITY_OPTIONS]} value={form.laterality} onChange={v => patch({ laterality: v })} />
                            </div>

                            <div>
                                <Label>Recurrence</Label>
                                <PillRow options={['New', 'Recurrence']} value={form.recurrence} onChange={v => patch({ recurrence: v })} />
                            </div>

                            <div>
                                <Label>Activity at Time of Injury</Label>
                                <PillRow options={[...INJURY_ACTIVITIES]} value={form.activity} onChange={v => patch({ activity: v })} />
                            </div>
                        </SectionCard>
                        </div>

                        {/* Clinical Assessment */}
                        <div ref={sectionRefs.dateOfInjury}>
                        <SectionCard title="Clinical Assessment">
                            <div>
                                <Label>Date of Injury <span className="text-red-400">*</span></Label>
                                <input
                                    type="date"
                                    value={form.dateOfInjury}
                                    onChange={e => { patch({ dateOfInjury: e.target.value }); clearError('dateOfInjury'); }}
                                    className={`w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border rounded-xl outline-none transition-all font-bold text-slate-900 ${validationErrors.dateOfInjury ? 'border-red-400 ring-2 ring-red-100' : 'border-transparent focus:border-indigo-500'}`}
                                />
                                {validationErrors.dateOfInjury && <p className="text-red-500 text-[10px] font-semibold mt-1.5 pl-1">{validationErrors.dateOfInjury}</p>}
                            </div>

                            <div>
                                <Label>Mechanism — How did it happen?</Label>
                                <textarea
                                    placeholder="Describe how the injury occurred..."
                                    value={form.mechanism}
                                    onChange={e => patch({ mechanism: e.target.value })}
                                    className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium h-24 resize-none"
                                />
                            </div>

                            <div>
                                <Label>Perceived Pain (0–10)</Label>
                                <div className="flex gap-1.5">
                                    {Array.from({ length: 11 }, (_, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => patch({ painLevel: form.painLevel === i ? undefined : i })}
                                            className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${form.painLevel === i
                                                ? (i <= 3 ? 'bg-emerald-500 text-white shadow-md' : i <= 6 ? 'bg-amber-500 text-white shadow-md' : 'bg-red-600 text-white shadow-md')
                                                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                        >
                                            {i}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <Label>Kind of Pain</Label>
                                <MultiPillRow options={[...PAIN_KINDS]} value={form.painKinds} onChange={v => patch({ painKinds: v })} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Swelling</Label>
                                    <PillRow options={['Yes', 'No']} value={form.hasSwelling === true ? 'Yes' : form.hasSwelling === false ? 'No' : undefined} onChange={v => patch({ hasSwelling: v === 'Yes', swellingSeverity: v === 'No' ? undefined : form.swellingSeverity })} />
                                    {form.hasSwelling && (
                                        <div className="mt-2">
                                            <PillRow options={['Mild', 'Moderate', 'Severe']} value={form.swellingSeverity} onChange={v => patch({ swellingSeverity: v })}
                                                colorMap={{ 'Mild': 'bg-yellow-500 text-white', 'Moderate': 'bg-orange-500 text-white', 'Severe': 'bg-red-600 text-white' }} />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <Label>Bruising</Label>
                                    <PillRow options={['Yes', 'No']} value={form.hasBruising === true ? 'Yes' : form.hasBruising === false ? 'No' : undefined} onChange={v => patch({ hasBruising: v === 'Yes', bruisingSeverity: v === 'No' ? undefined : form.bruisingSeverity })} />
                                    {form.hasBruising && (
                                        <div className="mt-2">
                                            <PillRow options={['Mild', 'Moderate', 'Severe']} value={form.bruisingSeverity} onChange={v => patch({ bruisingSeverity: v })}
                                                colorMap={{ 'Mild': 'bg-yellow-500 text-white', 'Moderate': 'bg-orange-500 text-white', 'Severe': 'bg-red-600 text-white' }} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label>Range of Motion</Label>
                                <PillRow options={[...RANGE_OF_MOTION_OPTIONS]} value={form.rangeOfMotion} onChange={v => patch({ rangeOfMotion: v })}
                                    colorMap={{ 'Full': 'bg-emerald-500 text-white', 'Limited': 'bg-amber-500 text-white', 'None': 'bg-red-600 text-white' }} />
                            </div>

                            <div>
                                <Label>Weight Bearing Status</Label>
                                <PillRow options={[...WEIGHT_BEARING_OPTIONS]} value={form.weightBearing} onChange={v => patch({ weightBearing: v })}
                                    colorMap={{ 'Full': 'bg-emerald-500 text-white', 'Partial': 'bg-amber-500 text-white', 'Non-weight-bearing': 'bg-red-600 text-white' }} />
                            </div>

                            <div>
                                <Label>Stopped Training?</Label>
                                <PillRow options={['Yes', 'No']} value={form.stoppedTraining === true ? 'Yes' : form.stoppedTraining === false ? 'No' : undefined}
                                    onChange={v => patch({ stoppedTraining: v === 'Yes' })}
                                    colorMap={{ 'Yes': 'bg-red-600 text-white', 'No': 'bg-emerald-500 text-white' }} />
                            </div>
                        </SectionCard>
                        </div>

                        {/* Management */}
                        <SectionCard title="Management">
                            <div>
                                <Label>Current Status</Label>
                                <PillRow options={[...TRAINING_STATUS_OPTIONS]} value={form.currentStatus} onChange={v => patch({ currentStatus: v })}
                                    colorMap={{ 'Full Training': 'bg-emerald-500 text-white', 'Modified Training': 'bg-amber-500 text-white', 'Rehab Only': 'bg-orange-500 text-white', 'Complete Rest': 'bg-red-600 text-white' }} />
                            </div>

                            <div>
                                <Label>Treatment Prescribed</Label>
                                <MultiPillRow options={[...TREATMENT_OPTIONS]} value={form.treatmentPrescribed} onChange={v => patch({ treatmentPrescribed: v })} />
                            </div>

                            <div>
                                <Label>Treatment Recommendations</Label>
                                <textarea
                                    placeholder="Rehabilitation protocol, exercises, restrictions..."
                                    value={form.treatmentRecommendations}
                                    onChange={e => patch({ treatmentRecommendations: e.target.value })}
                                    className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium h-24 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Follow-up Date</Label>
                                    <input
                                        type="date"
                                        value={form.followUpDate}
                                        onChange={e => patch({ followUpDate: e.target.value })}
                                        className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900"
                                    />
                                </div>
                                <div>
                                    <Label>Expected Time Out</Label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 2-3 weeks"
                                        value={form.expectedTimeOut}
                                        onChange={e => patch({ expectedTimeOut: e.target.value })}
                                        className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label>Return-to-Play Phase</Label>
                                <div className="flex gap-1">
                                    {RTP_PHASES.map((phase, i) => {
                                        const idx = RTP_PHASES.indexOf(form.returnToPlayPhase);
                                        const isActive = form.returnToPlayPhase === phase;
                                        const isPast = idx >= 0 && i < idx;
                                        return (
                                            <button
                                                key={phase}
                                                type="button"
                                                onClick={() => patch({ returnToPlayPhase: isActive ? undefined : phase })}
                                                className={`flex-1 py-3 text-[9px] font-black uppercase tracking-widest transition-all ${i === 0 ? 'rounded-l-xl' : ''} ${i === RTP_PHASES.length - 1 ? 'rounded-r-xl' : ''}
                                                    ${isActive ? 'bg-indigo-600 text-white shadow-md' : isPast ? 'bg-indigo-100 text-indigo-500' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            >
                                                {phase.split(' - ')[1] || phase}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </SectionCard>

                        {/* Evaluation */}
                        <SectionCard title="Evaluation & Notes">
                            <div>
                                <Label>Comments</Label>
                                <textarea
                                    placeholder="Clinical observations, prognosis, additional notes..."
                                    value={form.comments}
                                    onChange={e => patch({ comments: e.target.value })}
                                    className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium h-32 resize-none"
                                />
                            </div>
                        </SectionCard>

                        {/* Attachments */}
                        <SectionCard title="Attachments (Scans / Imaging)">
                            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />

                            {(form.attachmentUrls || []).length > 0 && (
                                <div className="grid grid-cols-3 gap-3">
                                    {form.attachmentUrls.map((url, i) => (
                                        <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-28">
                                            <img src={url} alt="" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(url)}
                                                className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <XIcon size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading}
                                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all flex items-center justify-center gap-2"
                            >
                                {uploading ? <><Loader2Icon size={14} className="animate-spin" /> Uploading...</> : <><UploadCloudIcon size={14} /> Upload Scan or Image</>}
                            </button>
                        </SectionCard>

                        {/* Save */}
                        {Object.keys(validationErrors).length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
                                <ShieldAlertIcon size={14} className="text-red-500 shrink-0" />
                                <p className="text-red-600 text-[10px] font-semibold">Please fill in the required fields highlighted in red above</p>
                            </div>
                        )}
                        <button
                            onClick={handleSave}
                            className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                        >
                            {editingId ? 'Update Injury Report' : 'Save Injury Report'}
                        </button>
                    </div>

                    {/* RIGHT — Body Map (sticky) */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-5 space-y-5" ref={sectionRefs.bodyMap}>
                            <div className={`bg-white p-6 rounded-xl border shadow-sm space-y-4 ${validationErrors.bodyMap ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'}`}>
                                <h5 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3">Body Map — Injury Location <span className="text-red-400">*</span></h5>
                                {validationErrors.bodyMap && <p className="text-red-500 text-[10px] font-semibold pl-1">{validationErrors.bodyMap}</p>}
                                <BodyMapSelector
                                    value={form.areas}
                                    onChange={areas => { patch({ areas }); clearError('bodyMap'); }}
                                />
                                {form.areas.length > 0 && (
                                    <div className="space-y-2 pt-3 border-t border-slate-100">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Selected Areas</p>
                                        {form.areas.map(a => (
                                            <div key={a.area} className="flex items-center justify-between text-xs">
                                                <span className="font-semibold text-slate-700 capitalize">{a.area.replace(/_/g, ' ')}</span>
                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${a.severity === 3 ? 'bg-red-100 text-red-600' : a.severity === 2 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    {a.severity === 3 ? 'Severe' : a.severity === 2 ? 'Moderate' : 'Mild'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ HISTORY TAB ═══ */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Athlete</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Area</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Severity</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">RTP Phase</th>
                                    <th className="text-left px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map(report => (
                                    <tr key={report.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap">
                                            {new Date(report.dateOfInjury).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">{report.athleteName}</td>
                                        <td className="px-4 py-3.5 text-slate-600 capitalize">
                                            {report.areas.map(a => a.area.replace(/_/g, ' ')).join(', ')}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{report.classification || '—'}</td>
                                        <td className="px-4 py-3.5">
                                            {report.severityGrade ? (
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest ${report.severityGrade === 3 ? 'bg-red-100 text-red-600' : report.severityGrade === 2 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    Grade {report.severityGrade}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {report.currentStatus ? (
                                                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg tracking-widest ${report.currentStatus === 'Full Training' ? 'bg-emerald-100 text-emerald-600' : report.currentStatus === 'Modified Training' ? 'bg-amber-100 text-amber-600' : report.currentStatus === 'Rehab Only' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                                                    {report.currentStatus}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 text-[10px] whitespace-nowrap">{report.returnToPlayPhase || '—'}</td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(report)} className="p-1.5 rounded-lg bg-slate-100 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-700 transition-all" title="Edit">
                                                    <PencilIcon size={13} />
                                                </button>
                                                <button onClick={() => handleDelete(report.id)} className="p-1.5 rounded-lg bg-slate-100 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Delete">
                                                    <Trash2Icon size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredReports.length === 0 && (
                        <div className="py-20 text-center">
                            <ShieldAlertIcon size={40} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-sm font-semibold text-slate-400">No injury reports found</p>
                            <p className="text-xs text-slate-300 mt-1">Create a new report or adjust filters</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InjuryReportComponent;
