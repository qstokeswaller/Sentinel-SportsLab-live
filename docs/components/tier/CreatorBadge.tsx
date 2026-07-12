import React, { useEffect, useState } from 'react';
import { GlobeIcon, PencilIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { supabase } from '../../lib/supabase';

interface CreatorBadgeProps {
    creatorUserId: string | null | undefined;
    /** Last editor (NULL if never edited or edited by the same user as creator). */
    lastModifiedByUserId?: string | null;
    /**
     * 'shared-only' (default) shows the badge only when visibility==='org' —
     * used for workout_programs / templates / sheets that toggle between personal + shared.
     * 'always' shows the badge whenever org is multi-user — used for inherently
     * org-shared items like custom exercises, collections, questionnaire templates.
     */
    mode?: 'shared-only' | 'always';
    visibility?: 'personal' | 'org';
    className?: string;
}

// Single in-memory cache for creator first-name lookups. Keyed by user_id.
const nameCache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

async function fetchFirstName(userId: string): Promise<string> {
    if (nameCache.has(userId)) return nameCache.get(userId)!;
    if (inflight.has(userId)) return inflight.get(userId)!;
    const promise = (async () => {
        try {
            // Org members RPC returns auth.users metadata (first_name, full_name, email)
            const { data } = await (supabase as any).rpc('get_org_members_with_users');
            const match = (data || []).find((m: any) => m.user_id === userId);
            const raw =
                match?.first_name ||
                match?.full_name?.split(' ')[0] ||
                match?.email?.split('@')[0] ||
                'Colleague';
            nameCache.set(userId, raw);
            return raw;
        } catch {
            nameCache.set(userId, 'Colleague');
            return 'Colleague';
        }
    })();
    inflight.set(userId, promise);
    const name = await promise;
    inflight.delete(userId);
    return name;
}

/**
 * Attribution pill for org-shared library items. Renders nothing on single-user
 * orgs so Basic-tier users never see clutter. Shows the creator's first name and
 * a "(edited by X)" hint when a colleague last modified it.
 */
export const CreatorBadge: React.FC<CreatorBadgeProps> = ({
    creatorUserId,
    lastModifiedByUserId,
    mode = 'shared-only',
    visibility,
    className = '',
}) => {
    const { isMultiUserOrg } = useAppState();
    const [creator, setCreator] = useState<string>('');
    const [editor, setEditor] = useState<string>('');

    // Show only if org has more than one member
    const show = isMultiUserOrg
        && !!creatorUserId
        && (mode === 'always' || visibility === 'org');

    // Whether to render an "edited by" hint — only when editor differs from creator
    const showEditor = !!lastModifiedByUserId && lastModifiedByUserId !== creatorUserId;

    useEffect(() => {
        if (!show) return;
        let cancelled = false;
        fetchFirstName(creatorUserId!).then(n => { if (!cancelled) setCreator(n); });
        if (showEditor) {
            fetchFirstName(lastModifiedByUserId!).then(n => { if (!cancelled) setEditor(n); });
        }
        return () => { cancelled = true; };
    }, [creatorUserId, lastModifiedByUserId, show, showEditor]);

    if (!show) return null;

    return (
        <span
            title={showEditor
                ? `Created by ${creator || '…'} · Last edited by ${editor || '…'}`
                : `Created by ${creator || '…'} — shared with the organisation`}
            className={`inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 px-2 py-0.5 rounded-full whitespace-nowrap ${className}`}
        >
            <GlobeIcon size={9} />
            <span className="truncate max-w-[120px]">
                By {creator || '…'}
                {showEditor && (
                    <span className="text-indigo-400 dark:text-indigo-300/70">
                        {' '}· <PencilIcon size={8} className="inline-block -mt-0.5" /> {editor || '…'}
                    </span>
                )}
            </span>
        </span>
    );
};
