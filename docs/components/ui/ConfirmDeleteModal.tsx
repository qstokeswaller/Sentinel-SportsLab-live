// @ts-nocheck
import React from 'react';
import { AlertTriangleIcon } from 'lucide-react';

interface ConfirmDeleteModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    warning?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
    isOpen, title, message, warning, onConfirm, onCancel, loading = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-7 w-full max-w-sm animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                        <AlertTriangleIcon size={18} className="text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone.</p>
                    </div>
                </div>
                <p className="text-sm text-slate-600 mb-2">{message}</p>
                {warning && (
                    <p className="text-xs text-amber-600 font-medium mb-4">{warning}</p>
                )}
                {!warning && <div className="mb-4" />}
                <div className="flex gap-2">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 py-2.5 rounded-xl bg-rose-500 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 transition-all"
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};
