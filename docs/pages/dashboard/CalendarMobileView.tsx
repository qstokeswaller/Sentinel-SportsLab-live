import React, { useState, useEffect, useMemo } from 'react';
import { BottomSheet } from '../../components/ui/BottomSheet';
import {
    Activity as ActivityIcon, Dumbbell as DumbbellIcon, Timer as TimerIcon,
    User as UserIcon, Users as UsersIcon, MapPin as MapPinIcon,
    Pencil as PencilIcon, Trash2 as Trash2Icon, Eye as EyeIcon, Link2 as Link2Icon,
} from 'lucide-react';

/**
 * CalendarMobileView — the phone/tablet-portrait (<lg) calendar. Renders instead
 * of CalendarWeekView / CalendarMonthView (which stay untouched for desktop).
 *
 *  • Month  → a compact dot-grid navigator; tap a day to select it, its events
 *             appear in an agenda list below. No add-event on day tap.
 *  • Week   → a vertical agenda of the 7 days, each with its events listed.
 *
 * Tapping any item opens a BottomSheet with the full detail + actions. All add/
 * edit/delete/view handlers are the SAME ones the desktop views use (passed in),
 * so behaviour never diverges. "+ Add Event" lives in the shared header above.
 */

const todayStr = () => new Date().toLocaleDateString('en-CA');
const fmtLong = (dateStr: string) =>
    new Date(dateStr + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

const loadBadge = (load: string) =>
    load === 'High'
        ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400'
        : load === 'Medium'
        ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400'
        : 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400';

export const CalendarMobileView: React.FC<any> = ({
    calendarViewMode,
    weekDays,
    dashboardCalendarDays,
    filteredCalendarEventsForView,
    filteredSessionsForCalendar,
    getEventAssignees,
    getTargetColor,
    resolveTargetName,
    setEditingEvent,
    setEditingSession,
    setConfirmDeleteItem,
    setViewingSession,
}) => {
    const [selectedDay, setSelectedDay] = useState<string>(todayStr());
    const [sheet, setSheet] = useState<{ type: 'event' | 'session'; item: any } | null>(null);

    // The dates currently on screen (drives keeping the selected day in range as
    // the user navigates months/weeks via the shared header arrows).
    const visibleDays: string[] = useMemo(() => {
        if (calendarViewMode === 'week') return weekDays.map((d: any) => d.dateStr);
        return dashboardCalendarDays.filter(Boolean).map((d: any) => d.dateStr);
    }, [calendarViewMode, weekDays, dashboardCalendarDays]);

    useEffect(() => {
        if (visibleDays.length === 0) return;
        if (!visibleDays.includes(selectedDay)) {
            setSelectedDay(visibleDays.includes(todayStr()) ? todayStr() : visibleDays[0]);
        }
    }, [visibleDays]); // eslint-disable-line react-hooks/exhaustive-deps

    const itemsFor = (dateStr: string) => {
        const ds = filteredSessionsForCalendar
            .filter((s: any) => s.date === dateStr)
            .map((s: any) => ({ type: 'session' as const, time: s.time || '99:99', item: s }));
        const de = filteredCalendarEventsForView
            .filter((e: any) => e.start_date === dateStr)
            .map((e: any) => ({ type: 'event' as const, time: e.all_day ? '00:00' : (e.start_time || '99:99'), item: e }));
        return [...ds, ...de].sort((a, b) => a.time.localeCompare(b.time));
    };

    const dotColor = (entry: { type: string; item: any }) =>
        entry.type === 'session' ? getTargetColor(entry.item.targetId).dot : entry.item.color;

    // ── Agenda row (tappable) ────────────────────────────────────────────────
    const AgendaRow = ({ entry }: { entry: { type: 'event' | 'session'; item: any } }) => {
        if (entry.type === 'session') {
            const s = entry.item;
            const color = getTargetColor(s.targetId).dot;
            const TypeIcon = s.session_type === 'wattbike' ? ActivityIcon : s.session_type === 'conditioning' ? TimerIcon : DumbbellIcon;
            return (
                <button
                    onClick={() => setSheet({ type: 'session', item: s })}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] active:scale-[0.99] transition-transform"
                >
                    <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <TypeIcon size={15} className="text-slate-400 dark:text-[#CBD5E1] shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{s.title}</div>
                        <div className="text-xs text-slate-500 dark:text-[#CBD5E1] truncate">
                            {s.time && <span className="font-medium">{s.time} · </span>}
                            {resolveTargetName(s.targetId, s.targetType)}
                        </div>
                    </div>
                    {s.load && (
                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0 ${loadBadge(s.load)}`}>{s.load[0]}</span>
                    )}
                </button>
            );
        }
        const e = entry.item;
        const assignees = getEventAssignees(e);
        return (
            <button
                onClick={() => setSheet({ type: 'event', item: e })}
                className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#132338] active:scale-[0.99] transition-transform"
            >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] truncate">{e.title}</div>
                    <div className="text-xs text-slate-500 dark:text-[#CBD5E1] truncate">
                        {e.all_day ? 'All day' : (e.start_time || '')}
                        {assignees.length > 0 && (
                            <span> · {assignees[0].name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ''}</span>
                        )}
                    </div>
                </div>
            </button>
        );
    };

    const DayAgenda = ({ dateStr }: { dateStr: string }) => {
        const items = itemsFor(dateStr);
        if (items.length === 0) {
            return <div className="text-center text-xs text-slate-400 dark:text-[#64748B] py-6">No sessions or events</div>;
        }
        return <div className="space-y-2">{items.map((entry, i) => <AgendaRow key={i} entry={entry} />)}</div>;
    };

    // ── Month: dot-grid navigator + selected-day agenda ──────────────────────
    const renderMonth = () => (
        <div>
            <div className="grid grid-cols-7 gap-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                    <div key={i} className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] text-center pb-1.5">{d}</div>
                ))}
                {dashboardCalendarDays.map((d: any, idx: number) => {
                    if (!d) return <div key={idx} className="aspect-square" />;
                    const isToday = d.dateStr === todayStr();
                    const isSel = d.dateStr === selectedDay;
                    const items = itemsFor(d.dateStr);
                    return (
                        <button
                            key={idx}
                            onClick={() => setSelectedDay(d.dateStr)}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 border transition-colors ${
                                isSel
                                    ? 'border-indigo-500 dark:border-indigo-400 ring-1 ring-indigo-400/60 bg-indigo-50 dark:bg-indigo-600/20'
                                    : isToday
                                    ? 'border-indigo-200 dark:border-indigo-500/40 bg-white dark:bg-[#132338]'
                                    : 'border-slate-100 dark:border-[#243A58] bg-white dark:bg-[#132338]'
                            }`}
                        >
                            <span className={`text-xs font-semibold leading-none inline-flex items-center justify-center ${
                                isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5' : 'text-slate-700 dark:text-[#E2E8F0]'
                            }`}>{d.day}</span>
                            <div className="flex items-center gap-0.5 h-1.5">
                                {items.slice(0, 3).map((entry, i) => (
                                    <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor(entry) }} />
                                ))}
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1] mb-2.5">
                    {fmtLong(selectedDay)}
                </div>
                <DayAgenda dateStr={selectedDay} />
            </div>
        </div>
    );

    // ── Week: vertical agenda of the 7 days ──────────────────────────────────
    const renderWeek = () => (
        <div className="space-y-5">
            {weekDays.map((wd: any) => {
                const isToday = wd.dateStr === todayStr();
                const items = itemsFor(wd.dateStr);
                return (
                    <div key={wd.dateStr}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-sm font-bold leading-none inline-flex items-center justify-center ${
                                isToday ? 'bg-indigo-600 text-white rounded-full w-6 h-6' : 'text-slate-700 dark:text-[#E2E8F0]'
                            }`}>{wd.day}</span>
                            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-[#CBD5E1]">{wd.dayName}</span>
                            {items.length > 0 && (
                                <span className="text-[10px] text-slate-400 dark:text-[#64748B]">{items.length} item{items.length > 1 ? 's' : ''}</span>
                            )}
                        </div>
                        {items.length === 0
                            ? <div className="text-xs text-slate-300 dark:text-[#475569] pl-1">—</div>
                            : <div className="space-y-2">{items.map((entry, i) => <AgendaRow key={i} entry={entry} />)}</div>}
                    </div>
                );
            })}
        </div>
    );

    // ── Detail bottom sheet ──────────────────────────────────────────────────
    const renderSheet = () => {
        if (!sheet) return null;
        const close = () => setSheet(null);

        if (sheet.type === 'event') {
            const e = sheet.item;
            const assignees = getEventAssignees(e);
            return (
                <BottomSheet isOpen onClose={close}>
                    <div className="h-1 rounded-full mx-4 mb-3" style={{ backgroundColor: e.color }} />
                    <div className="px-4 pb-4 space-y-3">
                        <h4 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">{e.title}</h4>
                        {e.event_type && (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold" style={{ backgroundColor: `${e.color}20`, color: e.color }}>{e.event_type}</span>
                        )}
                        <div className="text-xs text-slate-500 dark:text-[#CBD5E1] space-y-1.5">
                            <div>
                                {e.all_day
                                    ? `All Day · ${new Date(e.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                    : `${e.start_time || ''}${e.end_time ? ' – ' + e.end_time : ''} · ${new Date(e.start_date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                            </div>
                            {assignees.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    {assignees.map((a: any, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5">
                                            {a.isTeam ? <UsersIcon size={12} className="text-slate-400 shrink-0" /> : <UserIcon size={12} className="text-slate-400 shrink-0" />}
                                            <span className="truncate">{a.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {e.location && (
                                <div className="flex items-center gap-1.5"><MapPinIcon size={12} className="text-slate-400 shrink-0" /><span>{e.location}</span></div>
                            )}
                            {e.description && <p className="text-slate-400 dark:text-[#94A3B8] leading-relaxed">{e.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#243A58]">
                            <button
                                onClick={() => { setEditingEvent({ ...e, all_day: e.all_day || false }); close(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-100 dark:bg-[#1A2D48] text-slate-700 dark:text-[#E2E8F0] text-sm font-semibold active:scale-95 transition-transform"
                            >
                                <PencilIcon size={14} /> Edit
                            </button>
                            <button
                                onClick={() => { setConfirmDeleteItem({ type: 'event', id: e.id, name: e.title || 'this event' }); close(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-rose-400 text-sm font-semibold active:scale-95 transition-transform"
                            >
                                <Trash2Icon size={14} /> Delete
                            </button>
                        </div>
                    </div>
                </BottomSheet>
            );
        }

        // session
        const s = sheet.item;
        const isPacket = s.workout_template_id || s.workoutTemplateId;
        const isProgram = s.program_id || s.programId;
        return (
            <BottomSheet isOpen onClose={close}>
                <div className="px-4 pb-4 space-y-3">
                    <h4 className="text-base font-semibold text-slate-900 dark:text-[#E2E8F0]">{s.title}</h4>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]">
                            {isPacket ? 'Packet' : isProgram ? 'Program' : 'Workout'}
                        </span>
                        {s.trainingPhase && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300">{s.trainingPhase}</span>
                        )}
                        {s.load && (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${loadBadge(s.load)}`}>{s.load} Load</span>
                        )}
                        {s.status && s.status !== 'Scheduled' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]">{s.status}</span>
                        )}
                        {s.linked_sessions?.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Link2Icon size={11} /> {s.linked_sessions.length} linked</span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-[#CBD5E1] space-y-1">
                        <div>{s.time && <span className="font-semibold">{s.time} · </span>}{fmtLong(s.date)}</div>
                        <div>{resolveTargetName(s.targetId, s.targetType)}</div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#243A58]">
                        <button
                            onClick={() => { setViewingSession(s); close(); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold active:scale-95 transition-transform"
                        >
                            <EyeIcon size={14} /> View
                        </button>
                        <button
                            onClick={() => { setEditingSession({ ...s }); close(); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-slate-100 dark:bg-[#1A2D48] text-slate-700 dark:text-[#E2E8F0] text-sm font-semibold active:scale-95 transition-transform"
                        >
                            <PencilIcon size={14} /> Edit
                        </button>
                        <button
                            onClick={() => { setConfirmDeleteItem({ type: 'session', id: s.id, name: s.title || 'this session' }); close(); }}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-rose-400 text-sm font-semibold active:scale-95 transition-transform"
                        >
                            <Trash2Icon size={14} />
                        </button>
                    </div>
                </div>
            </BottomSheet>
        );
    };

    return (
        <div>
            {calendarViewMode === 'week' ? renderWeek() : renderMonth()}
            {renderSheet()}
        </div>
    );
};

export default CalendarMobileView;
