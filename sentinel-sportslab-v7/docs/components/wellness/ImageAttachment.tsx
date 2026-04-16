import React, { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface ImageAttachmentProps {
    imageUrl?: string;
    onUpload: (file: File) => Promise<void>;
    onRemove: () => Promise<void>;
}

const ImageAttachment: React.FC<ImageAttachmentProps> = ({ imageUrl, onUpload, onRemove }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            await onUpload(file);
        } catch (err) {
            console.error('Image upload failed:', err);
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    if (imageUrl) {
        return (
            <div className="mt-3 relative group">
                <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                    <img src={imageUrl} alt="Reference" className="w-full object-contain max-h-40" />
                </div>
                <button
                    type="button"
                    onClick={async () => {
                        setUploading(true);
                        try { await onRemove(); } finally { setUploading(false); }
                    }}
                    disabled={uploading}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                >
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                </button>
                <p className="text-[9px] text-slate-400 mt-1 text-center">Reference image attached</p>
            </div>
        );
    }

    return (
        <div className="mt-3">
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFile}
                className="hidden"
            />
            <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-200 rounded-xl text-[10px] font-semibold text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-all"
            >
                {uploading ? (
                    <><Loader2 size={12} className="animate-spin" /> Uploading...</>
                ) : (
                    <><ImagePlus size={12} /> Add Reference Image</>
                )}
            </button>
        </div>
    );
};

export default ImageAttachment;
