// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { Copy, CheckCircle2, Share2, Link2, XIcon, Clock } from 'lucide-react';

interface ShareWorkoutPopoverProps {
    workoutType: 'program' | 'template';
    workoutId: string;
    workoutName: string;
    onClose: () => void;
}

export const ShareWorkoutPopover: React.FC<ShareWorkoutPopoverProps> = ({
    workoutType,
    workoutId,
    workoutName,
    onClose,
}) => {
    const [copied, setCopied] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const shareUrl = `${window.location.origin}/workout/${workoutType}/${workoutId}`;

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const handleWhatsApp = () => {
        const message = `Check out this workout: ${workoutName}\n${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/30 backdrop-blur-[2px]">
            <div
                ref={ref}
                className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95 fade-in duration-150"
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <Link2 size={15} className="text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Share {workoutType === 'program' ? 'Program' : 'Workout'}</h3>
                            <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{workoutName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-all">
                        <XIcon size={14} />
                    </button>
                </div>

                {/* URL preview */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-2">
                    <p className="text-[10px] font-mono text-slate-400 truncate flex-1">{shareUrl}</p>
                    <button
                        onClick={handleCopy}
                        className={`p-1.5 rounded-md border transition-all shrink-0 ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}
                    >
                        {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                    </button>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2.5">
                    <button
                        onClick={handleCopy}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {copied ? <><CheckCircle2 size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
                    </button>
                    <button
                        onClick={handleWhatsApp}
                        className="w-full py-3 bg-[#25D366] text-white rounded-xl font-semibold text-[10px] uppercase tracking-wide hover:bg-[#1ebe5d] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <Share2 size={14} /> Share via WhatsApp
                    </button>
                </div>

                <p className="text-[9px] font-bold text-slate-300 uppercase text-center tracking-wide">
                    Anyone with this link can view the workout
                </p>
            </div>
        </div>
    );
};
