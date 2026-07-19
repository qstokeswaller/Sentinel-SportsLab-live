import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * BottomSheet — a full-width panel that slides up from the bottom of the screen.
 *
 * The mobile replacement for edge-anchored popovers: because it's anchored to the
 * viewport (not to a tiny element like a 50px calendar day column), its content
 * can never be clipped off-screen. Portalled to <body> and rendered `fixed`, so it
 * is unaffected by the global `overflow-x: clip` guard (plain overflow-clip on body
 * is not a containing block for fixed-position elements).
 *
 * Dismiss: backdrop tap, the grab-handle area, or Escape. Body scroll is locked
 * while open. Respects the iOS safe-area inset for PWA/home-screen use.
 */
interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({ isOpen, onClose, children }) => {
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[800] flex items-end justify-center bg-black/40 dark:bg-black/60 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full sm:max-w-md bg-white dark:bg-[#132338] rounded-t-2xl sm:rounded-2xl sm:mb-4 shadow-2xl border border-slate-200 dark:border-[#243A58] max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Grab handle */}
                <div className="sticky top-0 z-10 bg-white dark:bg-[#132338] pt-2.5 pb-1.5 flex justify-center cursor-pointer" onClick={onClose}>
                    <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-[#364E6E]" />
                </div>
                {children}
            </div>
        </div>,
        document.body
    );
};

export default BottomSheet;
