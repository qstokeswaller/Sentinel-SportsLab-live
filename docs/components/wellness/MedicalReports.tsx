// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useAppState } from '../../context/AppStateContext';
import {
    UserIcon, StethoscopeIcon, UploadCloudIcon, FileTextIcon, ActivityIcon,
    SearchIcon, ChevronRightIcon, ChevronDownIcon, FileIcon, XIcon, Trash2Icon, DownloadIcon
} from 'lucide-react';

const MedicalReports: React.FC = () => {
    const {
        teams,
        medicalReports, setMedicalReports, medicalFilterAthleteId, setMedicalFilterAthleteId,
        isMedicalModalOpen, setIsMedicalModalOpen, medicalModalMode, setMedicalModalMode,
        inspectingMedicalRecord, setInspectingMedicalRecord,
        medicalForm, setMedicalForm,
        optOutForm, setOptOutForm, optOuts, setOptOuts,
        reportMode, setReportMode,
    } = useAppState();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileData, setFileData] = useState<{ name: string; size: number; dataUrl: string } | null>(null);

    const allPlayers = teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name));

    const resetModal = () => {
        setIsMedicalModalOpen(false);
        setMedicalForm({ targetId: '', targetName: '', date: new Date().toISOString().split('T')[0], title: '', description: '', fileName: '', fileSize: '' });
        setFileData(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            setFileData({ name: file.name, size: file.size, dataUrl: reader.result as string });
            setMedicalForm(prev => ({ ...prev, fileName: file.name, fileSize: `${(file.size / 1024).toFixed(1)} KB` }));
        };
        reader.readAsDataURL(file);
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

    const handleSaveReport = () => {
        if (!medicalForm.title || !medicalForm.targetId) return;
        const newReport = {
            id: `med_${Date.now()}`,
            type: medicalModalMode === 'upload' ? 'upload' : 'log',
            targetId: medicalForm.targetId,
            targetName: medicalForm.targetName,
            date: medicalForm.date,
            title: medicalForm.title,
            description: medicalForm.description,
            fileName: medicalForm.fileName || '',
            fileSize: medicalForm.fileSize || '',
            fileData: fileData?.dataUrl || '',
            createdAt: new Date().toISOString(),
        };
        setMedicalReports([newReport, ...medicalReports]);
        resetModal();
    };

    const handleDeleteReport = (id: string) => {
        setMedicalReports(medicalReports.filter(r => r.id !== id));
        setInspectingMedicalRecord(null);
    };

    const handleSaveOptOut = () => {
        if (!optOutForm.reason) return;
        const newOptOut = {
            athleteId: optOutForm.targetId || 'p1',
            date: new Date().toISOString().split('T')[0],
            ...optOutForm
        };
        setOptOuts([newOptOut, ...optOuts]);
        setReportMode('analytics');
    };

    // --- UPLOAD / QUICK LOG MODAL ---
    const renderMedicalModal = () => {
        if (!isMedicalModalOpen) return null;
        const isUpload = medicalModalMode === 'upload';

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={resetModal}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className={`px-6 py-4 flex items-center justify-between ${isUpload ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${isUpload ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                {isUpload ? <UploadCloudIcon size={16} /> : <FileTextIcon size={16} />}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">{isUpload ? 'Upload Document' : 'Quick Log'}</h3>
                                <p className="text-[10px] text-slate-500">{isUpload ? 'Attach a medical document to a player or team' : 'Log a quick medical note'}</p>
                            </div>
                        </div>
                        <button onClick={resetModal} className="p-2 hover:bg-white rounded-lg transition-colors"><XIcon size={16} className="text-slate-400" /></button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-4">
                        {/* Target */}
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Assign To</label>
                            <div className="relative">
                                <select
                                    value={medicalForm.targetId}
                                    onChange={e => handleTargetChange(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none appearance-none pr-10 hover:border-slate-300 focus:border-indigo-400 transition-all"
                                >
                                    <option value="">Select player or team...</option>
                                    <optgroup label="Teams">
                                        {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Athletes">
                                        {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </optgroup>
                                </select>
                                <ChevronDownIcon size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* Date + Title row */}
                        <div className="grid grid-cols-5 gap-3">
                            <div className="col-span-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Date</label>
                                <input
                                    type="date"
                                    value={medicalForm.date}
                                    onChange={e => setMedicalForm(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none hover:border-slate-300 focus:border-indigo-400 transition-all"
                                />
                            </div>
                            <div className="col-span-3">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Title</label>
                                <input
                                    type="text"
                                    placeholder={isUpload ? 'e.g. MRI Scan Results' : 'e.g. Post-match assessment'}
                                    value={medicalForm.title}
                                    onChange={e => setMedicalForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none hover:border-slate-300 focus:border-indigo-400 transition-all placeholder:text-slate-300"
                                />
                            </div>
                        </div>

                        {/* File upload area (upload mode only) */}
                        {isUpload && (
                            <div>
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Document</label>
                                <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.csv" onChange={handleFileChange} />
                                {fileData ? (
                                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                                        <FileIcon size={18} className="text-indigo-500 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-900 truncate">{fileData.name}</p>
                                            <p className="text-[10px] text-slate-500">{(fileData.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                        <button onClick={() => { setFileData(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors">
                                            <XIcon size={14} className="text-indigo-400" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center gap-2 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                                    >
                                        <UploadCloudIcon size={28} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                        <span className="text-xs text-slate-400 group-hover:text-indigo-500">Click to browse files</span>
                                        <span className="text-[10px] text-slate-300">PDF, DOC, PNG, JPG, TXT, CSV</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Description / Notes */}
                        <div>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{isUpload ? 'Notes (optional)' : 'Notes'}</label>
                            <textarea
                                placeholder="Additional details..."
                                value={medicalForm.description}
                                onChange={e => setMedicalForm(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none hover:border-slate-300 focus:border-indigo-400 transition-all resize-none h-24 placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
                        <button onClick={resetModal} className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                        <button
                            onClick={handleSaveReport}
                            disabled={!medicalForm.title || !medicalForm.targetId}
                            className={`px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-all shadow-sm ${(!medicalForm.title || !medicalForm.targetId) ? 'bg-slate-300 cursor-not-allowed' : isUpload ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                        >
                            {isUpload ? 'Upload Document' : 'Save Log'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- INSPECT RECORD DETAIL VIEW ---
    const renderInspectModal = () => {
        if (!inspectingMedicalRecord) return null;
        const record = inspectingMedicalRecord;
        const isUpload = record.type === 'upload';

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setInspectingMedicalRecord(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white ${isUpload ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                                {isUpload ? <FileIcon size={16} /> : <FileTextIcon size={16} />}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">{record.title}</h3>
                                <p className="text-[10px] text-slate-500">{isUpload ? 'Document' : 'Medical Log'} — {new Date(record.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                            </div>
                        </div>
                        <button onClick={() => setInspectingMedicalRecord(null)} className="p-2 hover:bg-white rounded-lg transition-colors"><XIcon size={16} className="text-slate-400" /></button>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {record.targetName?.charAt(0) || 'A'}
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-900">{record.targetName}</p>
                                <p className="text-[10px] text-slate-400">Assigned target</p>
                            </div>
                        </div>

                        {record.description && (
                            <div>
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Notes</label>
                                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-100 leading-relaxed">{record.description}</p>
                            </div>
                        )}

                        {isUpload && record.fileName && (
                            <div>
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1 block">Attached File</label>
                                <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                                    <FileIcon size={18} className="text-indigo-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{record.fileName}</p>
                                        {record.fileSize && <p className="text-[10px] text-slate-500">{record.fileSize}</p>}
                                    </div>
                                    {record.fileData && (
                                        <a href={record.fileData} download={record.fileName} className="p-2 hover:bg-indigo-100 rounded-lg transition-colors">
                                            <DownloadIcon size={14} className="text-indigo-500" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="text-[10px] text-slate-300 pt-2">
                            Created {record.createdAt ? new Date(record.createdAt).toLocaleString() : 'Unknown'}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                        <button
                            onClick={() => handleDeleteReport(record.id)}
                            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                            <Trash2Icon size={12} /> Delete Record
                        </button>
                        <button onClick={() => setInspectingMedicalRecord(null)} className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-black transition-colors">Close</button>
                    </div>
                </div>
            </div>
        );
    };

    // --- INPUT VIEW (opt-out logging) ---
    const renderMedicalInput = () => (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                        <UserIcon size={20} />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-slate-900">Athlete Status</h4>
                        <p className="text-slate-500 text-sm">Update availability and log opt-out reasons.</p>
                    </div>
                </div>

                <div className="space-y-6 max-w-2xl">
                    {/* Target athlete */}
                    <div>
                        <label className="text-xs font-black uppercase text-indigo-400 tracking-widest pl-2 mb-2 block">Athlete</label>
                        <div className="relative">
                            <select
                                value={optOutForm.targetId || ''}
                                onChange={e => setOptOutForm({ ...optOutForm, targetId: e.target.value })}
                                className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 appearance-none pr-10"
                            >
                                <option value="">Select athlete...</option>
                                {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <ChevronDownIcon size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-indigo-400 tracking-widest pl-2 mb-2 block">Status</label>
                        <div className="flex gap-4">
                            {['Available', 'Modified', 'Unavailable'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setOptOutForm({ ...optOutForm, status })}
                                    className={`flex-1 py-4 rounded-xl font-black uppercase text-xs transition-all ${optOutForm.status === status ? (status === 'Available' ? 'bg-emerald-500 text-white shadow-lg' : status === 'Modified' ? 'bg-amber-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') : 'bg-indigo-50 text-indigo-300 hover:bg-indigo-100/50'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-2 mb-2 block">Reason</label>
                        <input
                            type="text"
                            placeholder="e.g. Flu, Ankle Sprain"
                            value={optOutForm.reason}
                            onChange={(e) => setOptOutForm({ ...optOutForm, reason: e.target.value })}
                            className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest pl-2 mb-2 block">Notes</label>
                        <textarea
                            placeholder="Additional context..."
                            value={optOutForm.notes}
                            onChange={(e) => setOptOutForm({ ...optOutForm, notes: e.target.value })}
                            className="w-full p-4 bg-slate-50 hover:bg-white focus:bg-white border border-transparent focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-slate-900 placeholder:font-medium h-32 resize-none"
                        />
                    </div>

                    <div className="pt-4">
                        <button onClick={handleSaveOptOut} className="w-full py-5 bg-slate-900 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all">Save Status</button>
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

        return (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-8 duration-500">
                {/* ACTION BAR */}
                <div className="flex flex-wrap items-center justify-between gap-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-white">
                            <StethoscopeIcon size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-slate-900">Medical Hub</h4>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Intelligence & Availability</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                            <button
                                onClick={() => { setMedicalModalMode('upload'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 bg-white text-indigo-600 rounded-xl text-[10px] font-semibold uppercase tracking-wide shadow-sm hover:bg-indigo-50 transition-all flex items-center gap-2 border border-slate-200"
                            >
                                <UploadCloudIcon size={14} /> Upload Doc
                            </button>
                            <button
                                onClick={() => { setMedicalModalMode('text'); setIsMedicalModalOpen(true); }}
                                className="px-4 py-2.5 text-slate-500 hover:text-indigo-600 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-all flex items-center gap-2"
                            >
                                <FileTextIcon size={14} /> Quick Log
                            </button>
                        </div>

                        <div className="h-10 w-[1px] bg-slate-200 mx-2"></div>

                        <div className="relative group">
                            <label className="text-[9px] font-medium text-slate-400 uppercase tracking-wide absolute -top-5 left-2">Filter View</label>
                            <select
                                value={medicalFilterAthleteId}
                                onChange={(e) => setMedicalFilterAthleteId(e.target.value)}
                                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-700 outline-none appearance-none hover:border-indigo-300 transition-all cursor-pointer pr-10 shadow-sm min-w-[180px]"
                            >
                                <option value="All">All Athletes</option>
                                <optgroup label="Squads">
                                    {teams.map(t => <option key={t.id} value={`team_${t.id}`}>{t.name}</option>)}
                                </optgroup>
                                <optgroup label="Athletes">
                                    {allPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </optgroup>
                            </select>
                            <ChevronDownIcon size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                        <ActivityIcon size={200} className="text-slate-900" />
                    </div>

                    <div className="flex items-center justify-between mb-6">
                        <h5 className="text-sm font-semibold text-slate-600">Medical Timeline</h5>
                        <div className="px-3 py-1.5 bg-slate-100 rounded-full text-[9px] font-semibold text-slate-600">
                            {timeline.length} Records
                        </div>
                    </div>

                    <div className="relative pl-12 border-l-2 border-slate-100 space-y-8 pb-8">
                        {timeline.length > 0 ? timeline.map((entry, i) => (
                            <div key={entry.id || i} className="relative group/item">
                                <div className="absolute -left-[76px] top-6 text-right w-12 text-[10px] font-black text-slate-300 group-hover/item:text-indigo-400 transition-colors uppercase leading-tight">
                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>

                                <div className={`absolute -left-[57px] top-6 w-5 h-5 rounded-full border-4 border-white shadow-md z-10 transition-transform group-hover/item:scale-125 ${entry.timelineType === 'medical' ? 'bg-indigo-600' : (entry.status === 'Available' ? 'bg-emerald-500' : entry.status === 'Modified' ? 'bg-amber-500' : 'bg-rose-500')
                                    }`}></div>

                                <div
                                    onClick={() => entry.timelineType === 'medical' && setInspectingMedicalRecord(entry)}
                                    className={`p-5 rounded-xl border transition-all ${entry.timelineType === 'medical'
                                        ? 'bg-slate-50/50 border-slate-100 hover:border-indigo-200 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer'
                                        : 'bg-white border-indigo-50 shadow-sm'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-lg tracking-widest ${entry.timelineType === 'medical' ? 'bg-indigo-100 text-indigo-600' : (entry.status === 'Available' ? 'bg-emerald-100 text-emerald-600' : entry.status === 'Modified' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600')
                                                }`}>
                                                {entry.timelineType === 'medical' ? (entry.type === 'upload' ? 'DOCUMENT' : 'LOG') : entry.status}
                                            </span>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                                                <div className="w-4 h-4 rounded-full bg-slate-300 flex items-center justify-center text-[8px] font-black text-white">{entry.targetName?.charAt(0) || 'A'}</div>
                                                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{entry.targetName}</span>
                                            </div>
                                        </div>
                                        {entry.timelineType === 'medical' && entry.type === 'upload' && <FileIcon size={18} className="text-indigo-300" />}
                                    </div>

                                    <h6 className="text-base font-semibold text-slate-900 group-hover/item:text-indigo-900 transition-colors">{entry.title}</h6>

                                    {entry.description && (
                                        <p className="text-sm font-medium text-slate-400 mt-3 leading-relaxed max-w-xl line-clamp-2">
                                            {entry.description}
                                        </p>
                                    )}

                                    {entry.timelineType === 'medical' && (
                                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[8px] font-black text-slate-400">S</div>
                                                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Logged by Medical Staff</span>
                                            </div>
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest group-hover/item:translate-x-1 transition-transform flex items-center gap-1">View Details <ChevronRightIcon size={12} /></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="py-20 flex flex-col items-center text-center opacity-30">
                                <SearchIcon size={48} className="mb-4" />
                                <div className="text-sm font-black uppercase tracking-widest">No matching records found</div>
                                <div className="text-xs font-bold">Try adjusting your filters</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {reportMode === 'input' ? renderMedicalInput() : renderMedicalReport()}
            {renderMedicalModal()}
            {renderInspectModal()}
        </>
    );
};

export default MedicalReports;
