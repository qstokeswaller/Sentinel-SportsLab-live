// @ts-nocheck
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SupabaseStorageService as StorageService } from '../../services/storageService';
import { useAppState } from '../../context/AppStateContext';
import { uploadPdf, deletePdf } from '../../utils/pdfUpload';
import {
    UploadIcon, FileTextIcon, Trash2Icon, ExternalLinkIcon,
    CalendarIcon, PlusIcon,
} from 'lucide-react';

interface RunningMechanicsDoc {
    id: string;
    title: string;
    uploadedAt: string;
    fileName: string;
    fileSize: number;
    url: string;
}

export const RunningMechanicsLibrary: React.FC = () => {
    const [docs, setDocs] = useState<RunningMechanicsDoc[]>([]);
    const { showToast } = useAppState();
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Load docs on mount
    useEffect(() => {
        (async () => {
            try {
                const data = await StorageService.getRunningMechanicsDocs();
                setDocs(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Load running mechanics docs error:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const saveDocs = useCallback(async (updated: RunningMechanicsDoc[]) => {
        setDocs(updated);
        try {
            await StorageService.saveRunningMechanicsDocs(updated);
        } catch (err) {
            console.error('Save running mechanics docs error:', err);
        }
    }, []);

    const handleUpload = useCallback(async () => {
        const file = fileRef.current?.files?.[0];
        if (!file || !title.trim()) return;

        setUploading(true);
        try {
            const url = await uploadPdf(file);
            const newDoc: RunningMechanicsDoc = {
                id: 'rmd_' + Date.now(),
                title: title.trim(),
                uploadedAt: new Date().toISOString(),
                fileName: file.name,
                fileSize: file.size,
                url,
            };
            await saveDocs([newDoc, ...docs]);
            setTitle('');
            setShowUpload(false);
            if (fileRef.current) fileRef.current.value = '';
        } catch (err) {
            console.error('Upload error:', err);
            showToast?.('Failed to upload PDF. Please try again.', 'error');
        } finally {
            setUploading(false);
        }
    }, [title, docs, saveDocs]);

    const handleDelete = useCallback(async (doc: RunningMechanicsDoc) => {
        if (!confirm(`Delete "${doc.title}"?`)) return;
        try {
            await deletePdf(doc.url);
        } catch (err) {
            console.error('Delete from storage error:', err);
        }
        await saveDocs(docs.filter(d => d.id !== doc.id));
    }, [docs, saveDocs]);

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (iso: string) => {
        return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return <div className="text-center py-12 text-sm text-slate-400">Loading documents...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                <button
                    onClick={() => setShowUpload(!showUpload)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 dark:bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 dark:hover:bg-indigo-500 transition-all"
                >
                    <PlusIcon size={13} /> Upload PDF
                </button>
            </div>

            {/* Upload form */}
            {showUpload && (
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-[#CBD5E1] mb-1">Document Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Sprint Mechanics Analysis — March 2026"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#1A2D48] text-slate-900 dark:text-[#E2E8F0] placeholder:text-slate-400 dark:placeholder:text-[#475569] text-sm focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-800/50 focus:border-indigo-400 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 dark:text-[#CBD5E1] mb-1">PDF File</label>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/pdf"
                            className="w-full text-sm text-slate-500 dark:text-[#CBD5E1] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                        />
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleUpload}
                            disabled={uploading || !title.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500 dark:hover:bg-indigo-500 transition-all disabled:opacity-50"
                        >
                            <UploadIcon size={13} />
                            {uploading ? 'Uploading...' : 'Upload'}
                        </button>
                        <button
                            onClick={() => { setShowUpload(false); setTitle(''); }}
                            className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-slate-700 dark:hover:text-[#E2E8F0] transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Document list */}
            {docs.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-[#243A58] rounded-xl">
                    <FileTextIcon size={32} className="mx-auto text-slate-300 dark:text-[#334155] mb-3" />
                    <p className="text-sm text-slate-400 dark:text-[#CBD5E1] font-medium">No documents uploaded yet</p>
                    <p className="text-xs text-slate-300 dark:text-[#475569] mt-1">Upload PDF reports for gait analysis, sprint mechanics & more</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {docs.map(doc => (
                        <div
                            key={doc.id}
                            className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl px-4 py-3.5 flex items-center justify-between hover:shadow-sm hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-all group"
                        >
                            <div
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                onClick={() => window.open(doc.url, '_blank')}
                            >
                                <div className="w-9 h-9 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center shrink-0">
                                    <FileTextIcon size={16} className="text-red-500 dark:text-red-400" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                                        {doc.title}
                                    </h4>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <CalendarIcon size={10} />
                                            {formatDate(doc.uploadedAt)}
                                        </span>
                                        <span>{formatFileSize(doc.fileSize)}</span>
                                        <span className="truncate">{doc.fileName}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-3">
                                <button
                                    onClick={() => window.open(doc.url, '_blank')}
                                    className="p-2 text-slate-300 hover:text-indigo-500 transition-colors"
                                    title="Open PDF"
                                >
                                    <ExternalLinkIcon size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(doc)}
                                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2Icon size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
