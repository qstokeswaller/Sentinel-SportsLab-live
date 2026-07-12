import React, { useRef, useState } from 'react';
import { CameraIcon, Loader2Icon } from 'lucide-react';
import { DatabaseService } from '../../services/databaseService';
import { useAppState } from '../../context/AppStateContext';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<Size, { box: string; text: string; icon: number; rounded: string }> = {
    xs: { box: 'w-6 h-6', text: 'text-[9px]', icon: 10, rounded: 'rounded-full' },
    sm: { box: 'w-8 h-8', text: 'text-xs', icon: 12, rounded: 'rounded-full' },
    md: { box: 'w-11 h-11', text: 'text-sm', icon: 14, rounded: 'rounded-xl' },
    lg: { box: 'w-14 h-14', text: 'text-lg', icon: 18, rounded: 'rounded-full' },
    xl: { box: 'w-20 h-20', text: 'text-2xl', icon: 22, rounded: 'rounded-full' },
};

interface AthletePartial {
    id?: string;
    name: string;
    image_url?: string | null;
}

interface AthleteAvatarProps {
    player: AthletePartial;
    size?: Size;
    className?: string;
    editable?: boolean;
    onChange?: (url: string) => void;
    /** When true, upload only — doesn't call updateAthlete (used in create flow before athlete exists). */
    uploadOnly?: boolean;
    /** Override the rounded shape (e.g. 'rounded-xl' for header avatars). */
    shape?: string;
    /** Override the fallback (no-photo) bg + text colors. Useful for risk-encoded chips. */
    fallbackClass?: string;
    /** Override the fallback initials text size class. */
    fallbackTextSize?: string;
}

export const AthleteAvatar: React.FC<AthleteAvatarProps> = ({
    player,
    size = 'md',
    className = '',
    editable = false,
    onChange,
    uploadOnly = false,
    shape,
    fallbackClass,
    fallbackTextSize,
}) => {
    const fileRef = useRef<HTMLInputElement>(null);
    const { showToast } = useAppState();
    const [uploading, setUploading] = useState(false);
    const dims = SIZE_MAP[size];
    const rounded = shape ?? dims.rounded;
    const name = player?.name || '?';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const url = await DatabaseService.uploadAthleteAvatar(file);
            if (!uploadOnly && player.id) {
                await DatabaseService.updateAthlete(player.id, { image_url: url });
            }
            onChange?.(url);
        } catch (err) {
            console.error('Avatar upload failed:', err);
            showToast?.(err instanceof Error ? err.message : 'Failed to upload photo — please try again.', 'error');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleClick = () => {
        if (editable && !uploading) fileRef.current?.click();
    };

    const baseClasses = `${dims.box} ${rounded} overflow-hidden shrink-0 flex items-center justify-center relative ${className}`;
    const bgClass = player.image_url
        ? ''
        : (fallbackClass ?? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-600 dark:text-white');

    return (
        <div
            className={`${baseClasses} ${bgClass} ${editable ? 'cursor-pointer group' : ''}`}
            onClick={handleClick}
            title={editable ? 'Click to change photo' : undefined}
        >
            {player.image_url ? (
                <img
                    src={player.image_url}
                    alt={name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fall back to initials if the image fails to load
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
            ) : (
                <span className={`${fallbackTextSize ?? dims.text} font-semibold ${fallbackClass ? '' : 'text-indigo-600 dark:text-white'}`}>{initials}</span>
            )}

            {editable && (
                <>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFile}
                    />
                    <div
                        className={`absolute inset-0 bg-black/55 flex items-center justify-center transition-opacity ${
                            uploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                    >
                        {uploading ? (
                            <Loader2Icon size={dims.icon} className="text-white animate-spin" />
                        ) : (
                            <CameraIcon size={dims.icon} className="text-white" />
                        )}
                    </div>
                </>
            )}
        </div>
    );
};
