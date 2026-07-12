// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    UserIcon, StethoscopeIcon, UploadCloudIcon, FileTextIcon, ActivityIcon,
    SearchIcon, ChevronRightIcon, ChevronDownIcon, FileIcon, XIcon, Trash2Icon, DownloadIcon,
    PencilIcon, Loader2Icon, AlertCircleIcon,
} from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';
import { SkCard, SkBlock, SkText, SkListCards } from '../ui/Skeleton';
import {
    uploadMedicalDocument,
    deleteMedicalDocument,
    getMedicalDocumentSignedUrl,
} from '../../utils/pdfUpload';

const MedicalReports: React.FC = () => {
    const {
        teams,
        medicalReports, setMedicalReports, medicalFilterAthleteId, setMedicalFilterAthleteId,
        isSecondaryLoading,
        isMedicalModalOpen, setIsMedicalModalOpen, medicalModalMode, setMedicalModalMode,
        inspectingMedicalRecord, setInspectingMedicalRecord,
        medicalForm, setMedicalForm,
        optOutForm, setOptOutForm, optOuts, setOptOuts,
        reportMode, setReportMode,
    } = useAppState();

    const fileInputRef = useRef<HTMLInputElement>(null);
    // We keep a REAL File in state now (was a base64 dataUrl). The upload
    // happens on save so mid-form cancels don't consume Storage quota.
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [editingReportId, setEditingReportId] = useState<string | null>(null);
    const [editingOptOutId, setEditingOptOutId] = useState<string | null>(null);

    const allPlayers = teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name));

    const resetModal = () => {
        setIsMedicalModalOpen(false);
        setEditingReportId(null);
        setMedicalForm({ targetId: '', targetName: '', date: new Date().toISOString().split('T')[0], title: '', description: '', fileName: '', fileSize: '' });
        setPendingFile(null);
        setUploadError(null);
        setUploading(false);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Client-side pre-check so oversized files don't waste the round trip.
        if (file.size > 52_428_800) {
            setUploadError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 50 MB.`);
            return;
        }
        setUploadError(null);
        setPendingFile(file);
        setMedicalForm(prev => ({ ...prev, fileName: file.name, fileSize: `${(file.size / 1024).toFixed(1)} KB` }));
    };

    const handleTargetChange = (value: string) => {
        if (value.startsWith('team_')) {
            const teamId = value.replace('team_', '');
            const team = teams.find(t => t.id === teamId);
            setMedicalForm(prev => ({ ...prev, targetId: value, targetName: team?.name || 'Unknown Team' }));
        } else {
            const player = allPlayers.find(p => p.id === value);
            setMedicalForm(prev => ({ ...prev, targetId: value, targetName: player?.name || 'Unknown' }));
        }
    };

    const handleSaveReport = async () => {
        if (!medicalForm.title || !medicalForm.targetId) return;

        // Upload the file first (if one is queued). Only after Storage confirms
        // the write do we mutate the medical_reports array — otherwise a network
        // failure would leave a record pointing at nothing.
        let uploadResult: Awaited<ReturnType<typeof uploadMedicalDocument>> | null = null;
        if (pendingFile) {
            setUploading(true);
            setUploadError(null);
            try {
                uploadResult = await uploadMedicalDocument(pendingFile);
            } catch (err: any) {
                setUploadError(err?.message || 'Upload failed. Please try again.');
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        if (editingReportId) {
            // Editing an existing record. If a NEW file was uploaded, tidy up
            // the old file from Storage so we don't leak orphans.
            const oldRecord = medicalReports.find(r => r.id === editingReportId);
            if (uploadResult && oldRecord?.fileUrl) {
                deleteMedicalDocument(oldRecord.fileUrl);  // fire-and-forget
            }
            setMedicalReports(medicalReports.map(r => r.id === editingReportId ? {
                ...r,
                targetId: medicalForm.targetId,
                targetName: medicalForm.targetName,
                date: medicalForm.date,
                title: medicalForm.title,
                description: medicalForm.description,
                fileName: uploadResult?.filename || medicalForm.fileName || r.fileName,
                fileSize: uploadResult ? `${(uploadResult.size / 1024).toFixed(1)} KB` : (medicalForm.fileSize || r.fileSize),
                fileUrl: uploadResult?.path || r.fileUrl,
                mimeType: uploadResult?.mimeType || r.mimeType,
            } : r));
        } else {
            // New record
            const newReport = {
                id: `med_${Date.now()}`,
                type: medicalModalMode === 'upload' ? 'upload' : 'log',
                targetId: medicalForm.targetId,
                targetName: medicalForm.targetName,
                date: medicalForm.date,
                title: medicalForm.title,
                description: medicalForm.description,
                fileName: uploadResult?.filename || medicalForm.fileName || '',
                fileSize: uploadResult ? `${(uploadResult.size / 1024).toFixed(1)} KB` : (medicalForm.fileSize || ''),
                fileUrl: uploadResult?.path || '',       // Storage path, NOT a URL. Signed URL generated on view.
                mimeType: uploadResult?.mimeType || '',
                createdAt: new Date().toISOString(),
            };
            setMedicalReports([newReport, ...medicalReports]);
        }
        resetModal();
    };

    const handleEditReport = (record: any) => {
        setEditingReportId(record.id);
        setMedicalModalMode(record.type === 'upload' ? 'upload' : 'text');
        setMedicalForm({
            targetId: record.targetId,
            targetName: record.targetName,
            date: record.date,
            title: record.title,
            description: record.description || '',
            fileName: record.fileName || '',
            fileSize: record.fileSize || '',
        });
        // Don't repopulate pendingFile on edit — the existing file lives in
        // Storage. Only set pendingFile if the coach picks a replacement.
        setPendingFile(null);
        setUploadError(null);
        setInspectingMedicalRecord(null);
        setIsMedicalModalOpen(true);
    };

    const handleDeleteReport = (id: string) => {
        if (!confirm('Delete this record?')) return;
        const record = medicalReports.find(r => r.id === id);
        // Best-effort cleanup of the Storage file so it doesn't linger and count
        // against the bucket quota. Legacy records with fileData (base64) or
        // records without any file are silently skipped.
        if (record?.fileUrl) {
            deleteMedicalDocument(record.fileUrl);  // fire-and-forget
        }
        setMedicalReports(medicalReports.filter(r => r.id !== id));
        setInspectingMedicalRecord(null);
    };

    // --- Opt-out handlers ---

    const handleSaveOptOut = () => {
        if (!optOutForm.reason) return;

        if (editingOptOutId) {
            // Update existing opt-out
            setOptOuts(optOuts.map(o => o.id === editingOptOutId ? {
                ...o,
                athleteId: optOutForm.targetId || o.athleteId,
                status: optOutForm.status,
                reason: optOutForm.reason,
                notes: optOutForm.notes,
            } : o));
            setEditingOptOutId(null);
        } else {
            // Create new opt-out
            const newOptOut = {
                id: `optout_${Date.now()}`,
                athleteId: optOutForm.targetId || 'p1',
                date: new Date().toISOString().split('T')[0],
                ...optOutForm
            };
            setOptOuts([newOptOut, ...optOuts]);
        }
        setOptOutForm({ targetId: '', status: 'Available', reason: '', notes: '' });
        setReportMode('analytics');
    };

    const handleEditOptOut = (entry: any) => {
        setEditingOptOutId(entry.id || null);
        setOptOutForm({
            targetId: entry.athleteId || '',
            status: entry.status || 'Available',
            reason: entry.reason || '',
            notes: entry.notes || '',
        });
        setReportMode('input');
    };

    const handleDeleteOptOut = (entry: any) => {
        if (!confirm('Delete this status record?')) return;
        if (entry.id) {
            setOptOuts(optOuts.filter(o => o.id !== entry.id));
        } else {
            // Legacy opt-outs without id — match by fields
            setOptOuts(optOuts.filter(o =>
                !(o.athleteId === entry.athleteId && o.date === entry.date && o.reason === entry.reason)
            ));
        }
    };

    // --- UPLOAD / QUICK LOG MODAL ---
    const renderMedicalModal = () => {
        if (!isMedicalModalOpen) return null;
        const isUpload = medicalModalMode === 'upload';
        const isEditing = !!editingReportId;

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetModal}>
                <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-[#243A58] overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className={`px-6 py-4 flex items-center justify-between ${isUpload ? 'bg-indigo-50 dark:bg-indigo-500/15 border-b border-indigo-100 dark:border-indigo-500/30' : 'bg-emerald-50 dark:bg-emerald-500/15 border-b border-emerald-100 dark:border-emerald-500/30'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${isUpload ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                {isEditing ? <PencilIcon size={16} /> : isUpload ? <UploadCloudIcon size={16} /> : <FileTextIcon size={16} />}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">
                                    {isEditing ? 'Edit Record' : isUpload ? 'Upload Document' : 'Quick Log'}
                                </h3>
                                <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                                    {isEditing ? 'Update the details of this record' : isUpload ? 'Attach a medical document to a player or team' : 'Log a quick medical note'}
                                </p>
                            </div>
                        </div>
                        <button onClick={resetModal} className="p-2 hover:bg-white dark:hover:bg-[#1A2D48] rounded-lg transition-colors"><XIcon size={16} className="text-slate-400 dark:text-[#94A3B8]" /></button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {/* Target */}
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Assign To</label>
                            <CustomSelect
                                variant="form"
                                value={medicalForm.targetId}
                                onChange={e => handleTargetChange(e.target.value)}
                                placeholder="Select player or team..."
                            >
                                <option value="">Select player or team...</option>
                                <optgroup label="Teams">
                                    {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                                </optgroup>
                                <optgroup label="Athletes">
                                    {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            </CustomSelect>
                        </div>

                        {/* Date + Title row */}
                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Date</label>
                                <input
                                    type="date"
                                    value={medicalForm.date}
                                    onChange={e => setMedicalForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#364E6E] focus:border-indigo-400 transition-all"
                                />
                            </div>
                            <div className="col-span-3">
                                <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Title</label>
                                <input
                                    type="text"
                                    placeholder={isUpload ? 'e.g. MRI Scan Results' : 'e.g. Post-match assessment'}
                                    value={medicalForm.title}
                                    onChange={e => setMedicalForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#364E6E] focus:border-indigo-400 transition-all placeholder:text-slate-300 dark:placeholder:text-[#475569]"
                                />
                            </div>
                        </div>

                        {/* File upload area (upload mode only) */}
                        {isUpload && (
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Document</label>
                                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" onChange={handleFileChange} />
                                {pendingFile || (isEditing && medicalForm.fileName) ? (
                                    <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-4 py-3">
                                        <FileIcon size={18} className="text-indigo-500 dark:text-indigo-300 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0] truncate">
                                                {pendingFile?.name || medicalForm.fileName}
                                            </p>
                                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">
                                                {pendingFile
                                                    ? `${(pendingFile.size / 1024).toFixed(1)} KB · Will upload on save`
                                                    : `${medicalForm.fileSize} · Keep existing file`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => { setPendingFile(null); setUploadError(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                            className="p-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 rounded-lg transition-colors"
                                            title={pendingFile ? 'Clear pending upload' : 'Remove file from record'}
                                        >
                                            <XIcon size={14} className="text-indigo-400 dark:text-indigo-300" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-slate-50 dark:bg-[#0F1C30] border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl py-8 flex flex-col items-center gap-2 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/10 transition-all group"
                                    >
                                        <UploadCloudIcon size={28} className="text-slate-300 dark:text-[#475569] group-hover:text-indigo-400 transition-colors" />
                                        <span className="text-xs text-slate-500 dark:text-[#CBD5E1] group-hover:text-indigo-500">Click to browse files</span>
                                        <span className="text-[10px] text-slate-400 dark:text-[#94A3B8]">PDF or image (PNG, JPG) · Max 50 MB</span>
                                    </button>
                                )}
                                {uploadError && (
                                    <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
                                        <AlertCircleIcon size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-rose-700 dark:text-rose-300">{uploadError}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Description / Notes */}
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">{isUpload ? 'Notes (optional)' : 'Notes'}</label>
                            <textarea
                                placeholder="Additional details..."
                                value={medicalForm.description}
                                onChange={e => setMedicalForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-[#E2E8F0] outline-none hover:border-slate-300 dark:hover:border-[#364E6E] focus:border-indigo-400 transition-all resize-none h-24 placeholder:text-slate-300 dark:placeholder:text-[#475569]"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 dark:border-[#243A58] flex items-center justify-end gap-3">
                        <button
                            onClick={resetModal}
                            disabled={uploading}
                            className="px-4 py-2.5 text-sm font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveReport}
                            disabled={!medicalForm.title || !medicalForm.targetId || uploading}
                            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-sm flex items-center gap-2 ${(!medicalForm.title || !medicalForm.targetId || uploading) ? 'bg-slate-300 dark:bg-[#243A58] dark:text-[#475569] cursor-not-allowed' : isUpload ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                        >
                            {uploading && <Loader2Icon size={14} className="animate-spin" />}
                            {uploading ? 'Uploading…' : isEditing ? 'Save Changes' : isUpload ? 'Upload Document' : 'Save Log'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- INSPECT RECORD DETAIL VIEW ---
    // Signed URL for the current record's file. Fetched on open + refreshed if
    // the record changes. Signed URLs have a 1h TTL — plenty for a modal.
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [signedUrlLoading, setSignedUrlLoading] = useState(false);
    const [signedUrlError, setSignedUrlError] = useState<string | null>(null);
    useEffect(() => {
        // Reset immediately on record change
        setSignedUrl(null);
        setSignedUrlError(null);
        const record = inspectingMedicalRecord;
        if (!record?.fileUrl) return;
        // Legacy records stored a full URL under fileData (base64) or in
        // fileUrl (public URL from a previous experiment). If fileUrl already
        // looks like http(s), use it directly. Otherwise treat it as a path
        // and fetch a signed URL.
        if (/^https?:\/\//i.test(record.fileUrl)) {
            setSignedUrl(record.fileUrl);
            return;
        }
        let cancelled = false;
        setSignedUrlLoading(true);
        getMedicalDocumentSignedUrl(record.fileUrl)
            .then(url => { if (!cancelled) setSignedUrl(url); })
            .catch(err => { if (!cancelled) setSignedUrlError(err?.message || 'Could not load the file.'); })
            .finally(() => { if (!cancelled) setSignedUrlLoading(false); });
        return () => { cancelled = true; };
    }, [inspectingMedicalRecord?.id, inspectingMedicalRecord?.fileUrl]);

    const renderInspectModal = () => {
        if (!inspectingMedicalRecord) return null;
        const record = inspectingMedicalRecord;
        const isUpload = record.type === 'upload';
        // The URL we hand to the iframe/download link. New records = signedUrl.
        // Legacy base64 records = record.fileData (still works as data URL).
        const viewableUrl = signedUrl || record.fileData || '';
        const isPdf = (record.mimeType || '').includes('pdf')
            || /\.pdf$/i.test(record.fileName || '')
            || /\.pdf$/i.test(record.fileUrl || '');
        const isImage = (record.mimeType || '').startsWith('image/')
            || /\.(png|jpe?g|gif|webp)$/i.test(record.fileName || '');

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setInspectingMedicalRecord(null)}>
                <div className="bg-white dark:bg-[#132338] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] border border-slate-200 dark:border-[#243A58] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                    {/* Header — fixed, doesn't scroll */}
                    <div className="shrink-0 px-6 py-4 bg-slate-50 dark:bg-[#1A2D48] border-b border-slate-100 dark:border-[#243A58] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${isUpload ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                {isUpload ? <FileIcon size={16} /> : <FileTextIcon size={16} />}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{record.title}</h3>
                                <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">{isUpload ? 'Document' : 'Medical Log'} — {new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <button onClick={() => setInspectingMedicalRecord(null)} aria-label="Close" className="p-2 hover:bg-white dark:hover:bg-[#243A58] rounded-lg transition-colors"><XIcon size={16} className="text-slate-400 dark:text-[#94A3B8]" /></button>
                    </div>

                    {/* Body — flex-1 + overflow-y-auto so the content scrolls when tall
                        (previously the whole modal was clipped by `overflow-hidden`
                        and long previews got cut off top and bottom). */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-[#243A58] flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-[#CBD5E1]">
                                {record.targetName?.charAt(0) || 'A'}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{record.targetName}</p>
                                <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]">Assigned target</p>
                            </div>
                        </div>

                        {record.description && (
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Notes</label>
                                <p className="text-sm text-slate-700 dark:text-[#CBD5E1] bg-slate-50 dark:bg-[#0F1C30] rounded-xl p-4 border border-slate-100 dark:border-[#243A58] leading-relaxed">{record.description}</p>
                            </div>
                        )}

                        {isUpload && record.fileName && (
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide mb-1 block">Attached File</label>
                                <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 rounded-xl px-4 py-3">
                                    <FileIcon size={18} className="text-indigo-500 dark:text-indigo-300 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0] truncate">{record.fileName}</p>
                                        {record.fileSize && <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1]">{record.fileSize}</p>}
                                    </div>
                                    {viewableUrl && (
                                        <>
                                            <a
                                                href={viewableUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 rounded-lg transition-colors"
                                                title="Open in new tab"
                                            >
                                                <UploadCloudIcon size={14} className="text-indigo-500 dark:text-indigo-300 rotate-180" />
                                            </a>
                                            <a
                                                href={viewableUrl}
                                                download={record.fileName}
                                                className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 rounded-lg transition-colors"
                                                title="Download"
                                            >
                                                <DownloadIcon size={14} className="text-indigo-500 dark:text-indigo-300" />
                                            </a>
                                        </>
                                    )}
                                </div>
                                {/* Inline preview area */}
                                {signedUrlLoading && (
                                    <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#CBD5E1]">
                                        <Loader2Icon size={12} className="animate-spin" /> Loading preview…
                                    </div>
                                )}
                                {signedUrlError && (
                                    <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30">
                                        <AlertCircleIcon size={14} className="text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[11px] text-rose-700 dark:text-rose-300">{signedUrlError}</p>
                                    </div>
                                )}
                                {viewableUrl && !signedUrlLoading && !signedUrlError && isPdf && (
                                    // Full-height preview — takes ~65% of viewport height so the
                                    // reader isn't fighting a tiny window. Modal itself is
                                    // scrollable so this can be as tall as it needs.
                                    <iframe
                                        src={viewableUrl}
                                        title={record.fileName}
                                        className="mt-3 w-full h-[65vh] min-h-[500px] rounded-lg border border-slate-200 dark:border-[#243A58] bg-white"
                                    />
                                )}
                                {viewableUrl && !signedUrlLoading && !signedUrlError && isImage && (
                                    <img
                                        src={viewableUrl}
                                        alt={record.fileName}
                                        className="mt-3 w-full max-h-[65vh] object-contain rounded-lg border border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30]"
                                    />
                                )}
                                {/* File-type hint for formats browsers can't preview inline (doc/docx). */}
                                {viewableUrl && !signedUrlLoading && !signedUrlError && !isPdf && !isImage && (
                                    <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58]">
                                        <FileIcon size={16} className="text-slate-400 shrink-0" />
                                        <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1]">
                                            Inline preview isn't available for this file type. Use the download or open-in-new-tab buttons above to view it.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] pt-2">
                            Created {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'Unknown'}
                        </div>
                    </div>

                    {/* Footer — fixed at bottom, doesn't scroll with body */}
                    <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-[#243A58] flex items-center justify-between bg-white dark:bg-[#132338]">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleDeleteReport(record.id)}
                                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-rose-500 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 rounded-lg transition-colors"
                            >
                                <Trash2Icon size={12} /> Delete
                            </button>
                            <button
                                onClick={() => handleEditReport(record)}
                                className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-indigo-500 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 rounded-lg transition-colors"
                            >
                                <PencilIcon size={12} /> Edit
                            </button>
                        </div>
                        <button onClick={() => setInspectingMedicalRecord(null)} className="px-5 py-2.5 bg-slate-900 dark:bg-[#1A2D48] dark:border dark:border-[#243A58] text-white dark:text-[#E2E8F0] text-sm font-medium rounded-xl hover:bg-black dark:hover:bg-[#243A58] transition-colors">Close</button>
                    </div>
                </div>
            </div>
        );
    };

    // --- INPUT VIEW (opt-out logging) ---
    const renderMedicalInput = () => (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm space-y-6">
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 dark:border-[#243A58] pb-6">
                    <div className="w-10 h-10 bg-slate-800 dark:bg-[#1A2D48] rounded-xl flex items-center justify-center text-white">
                        <UserIcon size={20} />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">
                            {editingOptOutId ? 'Edit Athlete Status' : 'Athlete Status'}
                        </h4>
                        <p className="text-slate-500 dark:text-[#CBD5E1] text-sm">
                            {editingOptOutId ? 'Update availability and opt-out details.' : 'Update availability and log opt-out reasons.'}
                        </p>
                    </div>
                </div>

                <div className="space-y-6 max-w-2xl">
                    {/* Target athlete */}
                    <div>
                        <label className="text-xs font-black uppercase text-indigo-400 tracking-widest pl-2 mb-2 block">Athlete</label>
                        <CustomSelect
                            variant="form"
                            value={optOutForm.targetId || ''}
                            onChange={e => setOptOutForm({ ...optOutForm, targetId: e.target.value })}
                            placeholder="Select athlete..."
                        >
                            <option value="">Select athlete...</option>
                            {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </CustomSelect>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-indigo-400 dark:text-indigo-300 tracking-widest pl-2 mb-2 block">Status</label>
                        <div className="flex gap-4">
                            {['Available', 'Modified', 'Unavailable'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setOptOutForm({ ...optOutForm, status })}
                                    className={`flex-1 py-4 rounded-xl font-black uppercase text-xs transition-all ${optOutForm.status === status ? (status === 'Available' ? 'bg-emerald-500 text-white shadow-lg' : status === 'Modified' ? 'bg-amber-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') : 'bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/50 dark:hover:bg-indigo-500/25 border border-indigo-200 dark:border-indigo-500/30'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-slate-500 dark:text-[#CBD5E1] tracking-widest pl-2 mb-2 block">Reason</label>
                        <input
                            type="text"
                            placeholder="e.g. Flu, Ankle Sprain"
                            value={optOutForm.reason}
                            onChange={(e) => setOptOutForm({ ...optOutForm, reason: e.target.value })}
                            className="w-full p-4 bg-slate-50 dark:bg-[#0F1C30] hover:bg-white dark:hover:bg-[#1A2D48] focus:bg-white dark:focus:bg-[#1A2D48] border border-transparent dark:border-[#243A58] focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 dark:text-[#E2E8F0] placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-[#94A3B8]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-slate-500 dark:text-[#CBD5E1] tracking-widest pl-2 mb-2 block">Notes</label>
                        <textarea
                            placeholder="Additional context..."
                            value={optOutForm.notes}
                            onChange={(e) => setOptOutForm({ ...optOutForm, notes: e.target.value })}
                            className="w-full p-4 bg-slate-50 dark:bg-[#0F1C30] hover:bg-white dark:hover:bg-[#1A2D48] focus:bg-white dark:focus:bg-[#1A2D48] border border-transparent dark:border-[#243A58] focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 dark:text-[#E2E8F0] placeholder:font-medium placeholder:text-slate-400 dark:placeholder:text-[#94A3B8] h-32 resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        {editingOptOutId && (
                            <button
                                onClick={() => { setEditingOptOutId(null); setOptOutForm({ targetId: '', status: 'Available', reason: '', notes: '' }); setReportMode('analytics'); }}
                                className="flex-1 py-5 bg-slate-200 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] rounded-xl font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-[#243A58] transition-all"
                            >
                                Cancel
                            </button>
                        )}
                        <button onClick={handleSaveOptOut} className="flex-1 py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-black dark:hover:bg-indigo-500 transition-all">
                            {editingOptOutId ? 'Save Changes' : 'Save Status'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    // --- ANALYTICS VIEW (timeline) ---
    const renderMedicalReport = () => {
        const filteredReports = medicalReports.filter(report => {
            if (!medicalFilterAthleteId || medicalFilterAthleteId === 'All Athletes' || medicalFilterAthleteId === 'All') return true;
            if (medicalFilterAthleteId.startsWith('team_')) {
                return report.targetId === medicalFilterAthleteId;
            }
            return report.targetId === medicalFilterAthleteId;
        });

        const filteredOptOuts = optOuts.filter(log => {
            if (!medicalFilterAthleteId || medicalFilterAthleteId === 'All Athletes' || medicalFilterAthleteId === 'All') return true;
            if (medicalFilterAthleteId.startsWith('team_')) {
                const teamId = medicalFilterAthleteId.replace('team_', '');
                const team = teams.find(t => t.id === teamId);
                return team && team.players.some(p => p.id === log.athleteId);
            }
            return log.athleteId === medicalFilterAthleteId;
        });

        const timeline = [
            ...filteredReports.map(r => ({ ...r, timelineType: 'medical' })),
            ...filteredOptOuts.map(o => ({ ...o, timelineType: 'optout', title: o.reason, description: o.notes, targetName: allPlayers.find(p => p.id === o.athleteId)?.name || 'Unknown' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        // Skeleton (Phase 2): medical documents are background-tier — mirror the
        // Medical Hub layout (action bar + document timeline cards)
        if (isSecondaryLoading && medicalReports.length === 0) {
            return (
                <div className="space-y-10">
                    <SkCard className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-4">
                            <SkBlock className="w-10 h-10 rounded-xl" />
                            <div className="space-y-2">
                                <SkText w="w-28" />
                                <SkText w="w-40" className="h-2.5" />
                            </div>
                        </div>
                        <SkBlock className="h-10 w-48 rounded-xl" />
                    </SkCard>
                    <SkListCards count={3} />
                </div>
            );
        }

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                {/* ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-6 bg-white dark:bg-[#132338] p-5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 dark:bg-[#1A2D48] rounded-xl flex items-center justify-center text-white">
                            <StethoscopeIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Medical Hub</h4>
                            <p className="text-[10px] text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide">Intelligence & Availability</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 dark:bg-[#0F1C30] p-1.5 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-inner">
                            <button
                                onClick={() => { setMedicalModalMode('upload'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 bg-white dark:bg-[#1A2D48] text-indigo-600 dark:text-indigo-300 rounded-xl text-[10px] font-semibold uppercase tracking-wide shadow-sm hover:bg-indigo-50 dark:hover:bg-indigo-500/25 transition-all flex items-center gap-2 border border-slate-200 dark:border-[#243A58]"
                            >
                                <UploadCloudIcon size={14} /> Upload Doc
                            </button>
                            <button
                                onClick={() => { setMedicalModalMode('text'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 text-slate-600 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all flex items-center gap-2"
                            >
                                <FileTextIcon size={14} /> Quick Log
                            </button>
                        </div>

                        <div className="h-10 w-[1px] bg-slate-200 dark:bg-[#243A58] mx-2"></div>

                        <div className="relative group">
                            <label className="text-[9px] font-medium text-slate-500 dark:text-[#CBD5E1] uppercase tracking-wide absolute -top-5 left-2">Filter View</label>
                            <CustomSelect
                                variant="filter"
                                size="xs"
                                value={medicalFilterAthleteId}
                                onChange={(e) => setMedicalFilterAthleteId(e.target.value)}
                                minWidth={180}
                            >
                                <option value="All">All Athletes</option>
                                <optgroup label="Squads">
                                    {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                                </optgroup>
                                <optgroup label="Athletes">
                                    {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            </CustomSelect>
                        </div>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="bg-white dark:bg-[#132338] p-6 rounded-xl border border-slate-200 dark:border-[#243A58] shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <ActivityIcon size={200} className="text-slate-900 dark:text-[#E2E8F0]" />
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h5 className="text-sm font-semibold text-slate-600 dark:text-[#CBD5E1]">Medical Timeline</h5>
                        <div className="px-3 py-1.5 bg-slate-100 dark:bg-[#1A2D48] rounded-full text-[9px] font-semibold text-slate-600 dark:text-[#CBD5E1]">
                            {timeline.length} Records
                        </div>
                    </div>

                    <div className="relative pl-12 border-l-2 border-slate-100 dark:border-[#243A58] space-y-8 pb-8">
                        {timeline.length > 0 ? timeline.map((entry, i) => (
                            <div key={entry.id || i} className="relative group/item">
                                <div className="absolute -left-[76px] top-1 text-right w-12 text-[10px] font-black text-slate-400 dark:text-[#94A3B8] group-hover/item:text-indigo-400 transition-colors uppercase leading-tight">
                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>

                                <div className={`absolute -left-[57px] top-5 w-5 h-5 rounded-full border-4 border-white dark:border-[#132338] shadow-md z-10 transition-transform group-hover/item:scale-125 ${entry.timelineType === 'medical' ? 'bg-indigo-600' : (entry.status === 'Available' ? 'bg-emerald-500' : entry.status === 'Modified' ? 'bg-amber-500' : 'bg-rose-500')
                                    }`}></div>

                                <div
                                    onClick={() => entry.timelineType === 'medical' && setInspectingMedicalRecord(entry)}
                                    className={`p-5 rounded-xl border transition-all ${entry.timelineType === 'medical'
                                        ? 'bg-slate-50/50 dark:bg-[#1A2D48] border-slate-100 dark:border-[#243A58] hover:border-indigo-200 dark:hover:border-indigo-500/40 hover:bg-white dark:hover:bg-[#243A58] hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer'
                                        : 'bg-white dark:bg-[#1A2D48] border-indigo-50 dark:border-[#243A58] shadow-sm'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg tracking-widest border ${entry.timelineType === 'medical' ? 'bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30' : (entry.status === 'Available' ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' : entry.status === 'Modified' ? 'bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' : 'bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-500/30')
                                                }`}>
                                                {entry.timelineType === 'medical' ? (entry.type === 'upload' ? 'DOCUMENT' : 'LOG') : entry.status}
                                            </span>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#0F1C30] rounded-lg border border-transparent dark:border-[#243A58]">
                                                <div className="w-4 h-4 rounded-full bg-slate-300 dark:bg-[#475569] flex items-center justify-center text-[8px] font-black text-white">{entry.targetName?.charAt(0) || 'A'}</div>
                                                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-[#CBD5E1] tracking-widest">{entry.targetName}</span>
                                            </div>
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            {entry.timelineType === 'medical' && entry.type === 'upload' && <FileIcon size={14} className="text-indigo-300 mr-1" />}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    entry.timelineType === 'medical' ? handleEditReport(entry) : handleEditOptOut(entry);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 transition-all"
                                                title="Edit"
                                            >
                                                <PencilIcon size={13} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    entry.timelineType === 'medical' ? handleDeleteReport(entry.id) : handleDeleteOptOut(entry);
                                                }}
                                                className="p-1.5 rounded-lg text-slate-400 dark:text-[#CBD5E1] hover:text-rose-500 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15 transition-all"
                                                title="Delete"
                                            >
                                                <Trash2Icon size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    <h6 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0] group-hover/item:text-indigo-900 dark:group-hover/item:text-indigo-300 transition-colors">{entry.title}</h6>

                                    {entry.description && (
                                        <p className="text-sm font-medium text-slate-500 dark:text-[#CBD5E1] mt-3 leading-relaxed max-w-xl line-clamp-2">
                                            {entry.description}
                                        </p>
                                    )}

                                    {entry.timelineType === 'medical' && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-[#243A58] flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-100 dark:bg-[#0F1C30] rounded-full flex items-center justify-center text-[8px] font-black text-slate-400 dark:text-[#94A3B8]">S</div>
                                                <span className="text-[9px] font-black text-slate-500 dark:text-[#CBD5E1] uppercase tracking-widest">Logged by Medical Staff</span>
                                            </div>
                                            <span className="text-[9px] font-black text-indigo-400 dark:text-indigo-300 uppercase tracking-widest group-hover/item:translate-x-1 transition-transform flex items-center gap-1">View Details <ChevronRightIcon size={12} /></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 flex flex-col items-center text-center bg-slate-50 dark:bg-[#0F1C30] border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl">
                                <SearchIcon size={48} className="mb-4 text-slate-300 dark:text-[#475569]" />
                                <div className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-[#CBD5E1]">No matching records found</div>
                                <div className="text-xs font-bold text-slate-400 dark:text-[#94A3B8] mt-1">Try adjusting your filters</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div data-tour="wellness-medical-overview">
            {reportMode === 'input' ? renderMedicalInput() : renderMedicalReport()}
            {renderMedicalModal()}
            {renderInspectModal()}
        </div>
    );
};

export default MedicalReports;
