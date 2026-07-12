// Calendar popover components — moved verbatim from DashboardPage.tsx
// (monolith restructure, 2026-07-12). CalendarPopover = collision-aware
// positioning; EventDetailPopover = event detail card (used by week + month
// views and the hidden-event fallback).
import React from 'react';

// Hover affordance hints for draggable calendar tiles (moved from DashboardPage).
export const DRAG_HINT_SESSION = 'Drag to reschedule';
export const DRAG_HINT_EVENT   = 'Drag to reschedule · Hold Ctrl to copy';
import {
    MapPinIcon, PencilIcon, Trash2Icon, UserIcon, UsersIcon, XIcon,
} from 'lucide-react';

// Collision-aware popover for calendar tiles. It positions itself relative to its
// parent (which MUST be `position: relative`) and flips vertically / horizontally
// so it never runs off the viewport. The dashboard must not scroll to reveal a
// cut-off popover, and the rightmost day columns would otherwise push a left-
// anchored popover off the right edge — this handles both by measuring before
// paint (useLayoutEffect) and choosing up/down + left/right.
export const CalendarPopover = React.forwardRef(function CalendarPopover(
    { children, className = '', width = 224 }: { children: React.ReactNode; className?: string; width?: number },
    forwardedRef: React.Ref<HTMLDivElement>
) {
    const localRef = React.useRef<HTMLDivElement>(null);
    const [style, setStyle] = React.useState<React.CSSProperties>({
        position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 50, visibility: 'hidden',
    });

    const setRefs = (node: HTMLDivElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) (forwardedRef as any).current = node;
    };

    React.useLayoutEffect(() => {
        const place = () => {
            const el = localRef.current;
            const anchor = el?.parentElement;
            if (!el || !anchor) return;
            const a = anchor.getBoundingClientRect();
            const h = el.offsetHeight;
            const w = el.offsetWidth || width;
            const margin = 8;
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const roomBelow = vh - a.bottom - margin;
            const roomAbove = a.top - margin;
            const openUp = roomBelow < h && roomAbove > roomBelow;
            const overflowRight = a.left + w + margin > vw;
            const next: React.CSSProperties = { position: 'absolute', zIndex: 50, visibility: 'visible' };
            if (openUp) { next.bottom = '100%'; next.marginBottom = 4; }
            else { next.top = '100%'; next.marginTop = 4; }
            if (overflowRight) { next.right = 0; } else { next.left = 0; }
            setStyle(next);
        };
        place();
        window.addEventListener('resize', place);
        return () => window.removeEventListener('resize', place);
    }, []);

    return (
        <div ref={setRefs} style={style} className={className} onClick={(e) => e.stopPropagation()}>
            {children}
        </div>
    );
});

// Event detail popover, extracted so it can render both anchored to a visible
// event tile AND as a fallback for events that only live inside the "+N more"
// overflow list (those have no on-page tile to anchor to). Wraps CalendarPopover
// so it inherits the collision-aware positioning.
export const EventDetailPopover = React.forwardRef(function EventDetailPopover(
    { event, resolveAssignees, onClose, onEdit, onDelete }:
    { event: any; resolveAssignees: (e: any) => { name: string; isTeam: boolean }[]; onClose: () => void; onEdit: () => void; onDelete: () => void },
    ref: React.Ref<HTMLDivElement>
) {
    const assignees = resolveAssignees(event);
    return (
        <CalendarPopover
            ref={ref}
            width={224}
            className="w-56 bg-white dark:bg-[#1A2D48] rounded-lg shadow-xl border border-slate-200 dark:border-[#243A58] animate-in fade-in zoom-in-95 duration-150"
        >
            <div className="h-1 rounded-t-lg" style={{ backgroundColor: event.color }} />
            <div className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{event.title}</h4>
                    <button onClick={onClose} aria-label="Close" className="p-0.5 text-slate-300 hover:text-slate-600 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] transition-colors">
                        <XIcon size={12} />
                    </button>
                </div>
                <span
                    className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold"
                    style={{ backgroundColor: `${event.color}20`, color: event.color }}
                >
                    {event.event_type}
                </span>
                <div className="text-[10px] text-slate-500 dark:text-[#CBD5E1] space-y-1">
                    <div>
                        {event.all_day
                            ? `All Day · ${new Date(event.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                            : `${event.start_time || ''}${event.end_time ? ' – ' + event.end_time : ''} · ${new Date(event.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        }
                    </div>
                    {assignees.length > 0 && (
                        <div className="flex flex-col gap-0.5 max-h-24 overflow-y-auto">
                            {assignees.map((a, i) => (
                                <div key={i} className="flex items-center gap-1 min-w-0">
                                    {a.isTeam
                                        ? <UsersIcon size={9} className="text-slate-400 dark:text-[#94A3B8] shrink-0" />
                                        : <UserIcon size={9} className="text-slate-400 dark:text-[#94A3B8] shrink-0" />}
                                    <span className="truncate">{a.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    {event.location && (
                        <div className="flex items-center gap-1 min-w-0">
                            <MapPinIcon size={9} className="text-slate-400 shrink-0" />
                            <span className="truncate">{event.location}</span>
                        </div>
                    )}
                    {event.description && (
                        <p className="text-slate-400 dark:text-[#94A3B8] leading-relaxed">{event.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-[#243A58]">
                    <button
                        onClick={onEdit}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:text-white hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 rounded transition-colors"
                    >
                        <PencilIcon size={10} /> Edit
                    </button>
                    <button
                        onClick={onDelete}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 rounded transition-colors"
                    >
                        <Trash2Icon size={10} /> Delete
                    </button>
                </div>
            </div>
        </CalendarPopover>
    );
});

type KpiInfoKey = 'flagged' | 'acwr' | 'sleep' | 'readiness';
