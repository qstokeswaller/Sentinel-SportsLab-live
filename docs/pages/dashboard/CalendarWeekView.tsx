// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarPopover, EventDetailPopover, DRAG_HINT_SESSION, DRAG_HINT_EVENT } from '../../components/calendar/CalendarPopovers';
import { Activity as ActivityIcon, Dumbbell as DumbbellIcon, EyeIcon, GripVertical as GripVerticalIcon, Link2 as Link2Icon, PencilIcon, Timer as TimerIcon, Trash2Icon, UserIcon, UsersIcon, XIcon } from 'lucide-react';

export const CalendarWeekView: React.FC<any> = ({
    activePopover,
    activeSessionPopover,
    darkenHex,
    dragOverDate,
    filteredCalendarEventsForView,
    filteredSessionsForCalendar,
    getEventAssignees,
    getTargetColor,
    handleDragEnd,
    handleDragLeave,
    handleDragOver,
    handleDragStart,
    handleDrop,
    isDark,
    overflowDay,
    overflowRef,
    popoverRef,
    resolveTargetName,
    sessionPopoverRef,
    setActivePopover,
    setActiveSessionPopover,
    setAddEventPresetDate,
    setConfirmDeleteItem,
    setEditingEvent,
    setEditingSession,
    setIsAddEventModalOpen,
    setOverflowDay,
    setViewingSession,
    weekDays,
}) => {
    return (<>
                                    <div>
                                        <div className="grid grid-cols-7 gap-2">
                                            {weekDays.map(wd => {
                                                const isToday = wd.dateStr === new Date().toLocaleDateString('en-CA');
                                                const daySessions = filteredSessionsForCalendar.filter(s => s.date === wd.dateStr);
                                                const dayEvents = filteredCalendarEventsForView.filter(e => e.start_date === wd.dateStr);
                                                const allItems = [
                                                    ...daySessions.map(s => ({ type: 'session' as const, time: s.time || '99:99', item: s })),
                                                    ...dayEvents.map(e => ({ type: 'event' as const, time: e.all_day ? '00:00' : (e.start_time || '99:99'), item: e })),
                                                ].sort((a, b) => a.time.localeCompare(b.time));
                                                // Any popover open inside this cell? Same lift-the-host trick as
                                                // month view so the popover doesn't get clipped by neighbouring days.
                                                const hasActivePopover = (
                                                    overflowDay === wd.dateStr ||
                                                    (activePopover?.id && activePopover.id.endsWith('_' + wd.dateStr)) ||
                                                    activeSessionPopover?.session?.date === wd.dateStr
                                                );
                                                return (
                                                    <div
                                                        key={wd.dateStr}
                                                        onClick={() => {
                                                            // If any popover is open, this click means "close it" —
                                                            // don't also fire the add-event modal. Google Calendar UX.
                                                            if (activePopover || activeSessionPopover || overflowDay) return;
                                                            setAddEventPresetDate(wd.dateStr); setIsAddEventModalOpen(true);
                                                        }}
                                                        onDragOver={(e) => handleDragOver(e, wd.dateStr)}
                                                        onDragLeave={handleDragLeave}
                                                        onDrop={(e) => handleDrop(e, wd.dateStr)}
                                                        className={`relative min-h-[140px] rounded-lg border p-2 flex flex-col gap-1.5 cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 ${hasActivePopover ? 'z-[60]' : ''} ${
                                                            dragOverDate === wd.dateStr
                                                                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-400 ring-2 ring-indigo-300'
                                                                : isToday
                                                                ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-300 dark:border-indigo-500/50 ring-1 ring-indigo-200 dark:ring-indigo-800/50 hover:border-indigo-400'
                                                                : 'bg-white dark:bg-[#132338] border-slate-100 dark:border-[#243A58] hover:border-indigo-300 dark:hover:border-indigo-500/50'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100 dark:border-[#243A58]/60">
                                                            <span className="text-[10px] font-semibold text-slate-400 dark:text-[#CBD5E1] uppercase">{wd.dayName}</span>
                                                            <span className={`text-sm font-bold leading-none inline-flex items-center justify-center ${isToday ? 'bg-indigo-600 text-white rounded-full w-5 h-5' : 'text-slate-700 dark:text-[#E2E8F0]'}`}>{wd.day}</span>
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            {allItems.length === 0 ? (
                                                                <p className="text-[9px] text-slate-300 dark:text-[#1A2D48] text-center pt-3">—</p>
                                                            ) : allItems.slice(0, 3).map(entry => {
                                                                if (entry.type === 'session') {
                                                                    const session = entry.item;
                                                                    const tc = getTargetColor(session.targetId);
                                                                    return (
                                                                        <div key={session.id} className="group relative"
                                                                            draggable
                                                                            title={DRAG_HINT_SESSION}
                                                                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'session', session, wd.dateStr); }}
                                                                            onDragEnd={handleDragEnd}
                                                                        >
                                                                            <GripVerticalIcon size={9} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none z-10" />
                                                                            <div
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const popKey = session.id;
                                                                                    setActiveSessionPopover(activeSessionPopover?.id === popKey ? null : { id: popKey, session });
                                                                                    setActivePopover(null);
                                                                                }}
                                                                                className={`flex flex-col gap-0.5 p-1.5 rounded-md border cursor-grab transition-all hover:scale-[1.01] active:scale-95 overflow-hidden ${tc.bg} ${tc.border} ${tc.text}`}
                                                                                style={isDark ? { backgroundColor: tc.darkBg, borderColor: tc.darkBorder, color: tc.darkText } : undefined}
                                                                            >
                                                                                <div className={`flex items-center gap-1 ${tc.pillBg} px-1 py-0.5 rounded overflow-hidden`} style={isDark ? { backgroundColor: tc.darkPillBg } : undefined}>
                                                                                    <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-hidden">
                                                                                        {session.session_type === 'wattbike' && <ActivityIcon size={7} className="text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                                                                        {session.session_type === 'conditioning' && <TimerIcon size={7} className="text-orange-500 shrink-0" />}
                                                                                        {(!session.session_type || session.session_type === 'workout') && <DumbbellIcon size={7} className="shrink-0" />}
                                                                                        <span className="text-[8px] font-medium uppercase tracking-wide truncate">{session.trainingPhase}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-0.5 shrink-0">
                                                                                        {(session.linked_sessions?.length > 0) && <span title="Has linked sessions" className="leading-none"><Link2Icon size={7} className="opacity-60" /></span>}
                                                                                        {session.load && (
                                                                                            <span className={`text-[7px] font-bold uppercase px-1 py-px rounded ${
                                                                                                session.load === 'High' ? 'bg-red-500 text-white' :
                                                                                                session.load === 'Medium' ? 'bg-amber-400 text-white' :
                                                                                                'bg-emerald-400 text-white'
                                                                                            }`}>{session.load[0]}</span>
                                                                                        )}
                                                                                        {session.targetType === 'Individual' && <UserIcon size={7} />}
                                                                                    </div>
                                                                                </div>
                                                                                <div className="px-0.5">
                                                                                    <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                                    <div className="text-[8px] opacity-70 truncate mt-0.5">
                                                                                        {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                        {resolveTargetName(session.targetId, session.targetType)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {/* Session Popover */}
                                                                            {activeSessionPopover?.id === session.id && (
                                                                                <CalendarPopover
                                                                                    ref={sessionPopoverRef}
                                                                                    width={224}
                                                                                    className="w-56 bg-white dark:bg-[#1A2D48] rounded-lg shadow-xl border border-slate-200 dark:border-[#243A58] animate-in fade-in zoom-in-95 duration-150"
                                                                                >
                                                                                    <div className={`h-1 rounded-t-lg ${tc.bg === 'bg-red-50' ? 'bg-red-400' : tc.bg === 'bg-blue-50' ? 'bg-blue-400' : tc.bg === 'bg-emerald-50' ? 'bg-emerald-400' : tc.bg === 'bg-orange-50' ? 'bg-orange-400' : tc.bg === 'bg-violet-50' ? 'bg-violet-400' : 'bg-indigo-400'}`} />
                                                                                    <div className="p-3 space-y-2">
                                                                                        <div className="flex items-start justify-between">
                                                                                            <h4 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0] leading-tight">{session.title}</h4>
                                                                                            <button onClick={() => setActiveSessionPopover(null)} aria-label="Close" className="p-0.5 text-slate-300 hover:text-slate-600 dark:hover:text-[#E2E8F0] dark:text-[#CBD5E1] transition-colors">
                                                                                                <XIcon size={12} />
                                                                                            </button>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                                            {(session.workout_template_id || session.workoutTemplateId) ? (
                                                                                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30 text-sky-700 dark:text-sky-300">Packet</span>
                                                                                            ) : (session.program_id || session.programId) ? (
                                                                                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/30 text-violet-700 dark:text-violet-300">Program</span>
                                                                                            ) : (
                                                                                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]">Workout</span>
                                                                                            )}
                                                                                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-300">{session.trainingPhase}</span>
                                                                                            {session.load && (
                                                                                                <span className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                                                                                                    session.load === 'High'   ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400' :
                                                                                                    session.load === 'Medium' ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-400' :
                                                                                                    'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                                                                                                }`}>{session.load} Load</span>
                                                                                            )}
                                                                                            {session.status && session.status !== 'Scheduled' && (
                                                                                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-slate-50 dark:bg-slate-500/10 border border-slate-200 dark:border-slate-500/25 text-slate-500 dark:text-[#CBD5E1]">{session.status}</span>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className="text-[10px] text-slate-500 space-y-1">
                                                                                            <div>
                                                                                                {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                                {new Date(session.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                                            </div>
                                                                                            <div>{resolveTargetName(session.targetId, session.targetType)}</div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-[#243A58]">
                                                                                            <button
                                                                                                onClick={() => { setViewingSession(session); setActiveSessionPopover(null); }}
                                                                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:text-white hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 rounded transition-colors"
                                                                                            >
                                                                                                <EyeIcon size={10} /> View
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => { setEditingSession({ ...session }); setActiveSessionPopover(null); }}
                                                                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 dark:text-white hover:bg-indigo-50 dark:bg-[#1A2D48] dark:hover:bg-indigo-500/15 rounded transition-colors"
                                                                                            >
                                                                                                <PencilIcon size={10} /> Edit
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setConfirmDeleteItem({ type: 'session', id: session.id, name: session.title || 'this session' });
                                                                                                    setActiveSessionPopover(null);
                                                                                                }}
                                                                                                className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 dark:text-[#CBD5E1] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/15 rounded transition-colors"
                                                                                            >
                                                                                                <Trash2Icon size={10} /> Delete
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>
                                                                                </CalendarPopover>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                } else {
                                                                    const event = entry.item;
                                                                    return (
                                                                        <div key={`${event.id}_${wd.dateStr}`} className="group relative"
                                                                            draggable
                                                                            title={DRAG_HINT_EVENT}
                                                                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'event', event, wd.dateStr); }}
                                                                            onDragEnd={handleDragEnd}
                                                                        >
                                                                            <GripVerticalIcon size={9} className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none z-10" />
                                                                            <div
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const popKey = `${event.id}_${wd.dateStr}`;
                                                                                    setActivePopover(activePopover?.id === popKey ? null : { id: popKey, event });
                                                                                    setActiveSessionPopover(null);
                                                                                }}
                                                                                className="flex items-center gap-1.5 px-1.5 py-1 rounded-md border cursor-grab transition-all hover:scale-[1.01] active:scale-95"
                                                                                style={{ backgroundColor: `${event.color}${isDark ? '6B' : '26'}`, borderColor: `${event.color}${isDark ? 'A8' : '55'}`, color: isDark ? '#ffffff' : darkenHex(event.color) }}
                                                                            >
                                                                                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                                    <span className="text-[9px] font-medium leading-tight truncate">
                                                                                        {!event.all_day && event.start_time && (
                                                                                            <span className="font-semibold">{event.start_time} </span>
                                                                                        )}
                                                                                        {event.title}
                                                                                    </span>
                                                                                    {(() => {
                                                                                        const assignees = getEventAssignees(event);
                                                                                        if (assignees.length === 0) return null;
                                                                                        // Week view gives a little more leeway than month (shows a
                                                                                        // couple of names) but is capped so a many-assignee event
                                                                                        // can't balloon the day cell.
                                                                                        const shown = assignees.slice(0, 2);
                                                                                        const extra = assignees.length - shown.length;
                                                                                        return (
                                                                                            <>
                                                                                                {shown.map((a, i) => (
                                                                                                    <span key={i} className="flex items-center gap-0.5 text-[8px] leading-tight opacity-75 min-w-0">
                                                                                                        {a.isTeam ? <UsersIcon size={7} className="shrink-0" /> : <UserIcon size={7} className="shrink-0" />}
                                                                                                        <span className="truncate">{a.name}</span>
                                                                                                    </span>
                                                                                                ))}
                                                                                                {extra > 0 && (
                                                                                                    <span className="text-[8px] leading-tight opacity-60 font-semibold">+{extra} more</span>
                                                                                                )}
                                                                                            </>
                                                                                        );
                                                                                    })()}
                                                                                </div>
                                                                            </div>
                                                                            {/* Event Popover */}
                                                                            {activePopover?.id === `${event.id}_${wd.dateStr}` && (
                                                                                <EventDetailPopover
                                                                                    ref={popoverRef}
                                                                                    event={event}
                                                                                    resolveAssignees={getEventAssignees}
                                                                                    onClose={() => setActivePopover(null)}
                                                                                    onEdit={() => { setEditingEvent({ ...event, all_day: event.all_day || false }); setActivePopover(null); }}
                                                                                    onDelete={() => { setConfirmDeleteItem({ type: 'event', id: event.id, name: event.title || 'this event' }); setActivePopover(null); }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }
                                                            })}
                                                            {/* +N more button + overflow panel — parity with month view, caps a day at 3 visible items */}
                                                            {(() => {
                                                                const total = allItems.length;
                                                                const hidden = total - 3;
                                                                if (hidden <= 0 && overflowDay !== wd.dateStr) return null;
                                                                return (
                                                                    <div className="relative">
                                                                        {hidden > 0 && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setOverflowDay(overflowDay === wd.dateStr ? null : wd.dateStr);
                                                                                    setActivePopover(null);
                                                                                    setActiveSessionPopover(null);
                                                                                }}
                                                                                className="w-full text-[9px] font-semibold text-center py-1 mt-0.5 rounded-md transition-colors cursor-pointer text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:text-white dark:bg-indigo-500/20 dark:hover:bg-indigo-500/40 dark:border dark:border-indigo-500/30"
                                                                            >
                                                                                +{hidden} more
                                                                            </button>
                                                                        )}
                                                                        {overflowDay === wd.dateStr && (
                                                                            <CalendarPopover
                                                                                ref={overflowRef}
                                                                                width={240}
                                                                                className="w-60 bg-white dark:bg-[#1A2D48] rounded-lg shadow-xl border border-slate-200 dark:border-[#243A58] animate-in fade-in zoom-in-95 duration-150 max-h-64 overflow-y-auto"
                                                                            >
                                                                                <div className="px-3 py-2 border-b border-slate-100 dark:border-[#243A58] bg-slate-50 dark:bg-[#243A58] rounded-t-lg">
                                                                                    <div className="flex items-center justify-between">
                                                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-[#CBD5E1] uppercase tracking-wider">
                                                                                            {new Date(wd.dateStr + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                                                                        </span>
                                                                                        <span className="text-[9px] text-slate-400">{total} items</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="p-2 space-y-1">
                                                                                    {allItems.map(entry => {
                                                                                        if (entry.type === 'session') {
                                                                                            const session = entry.item;
                                                                                            const tc = getTargetColor(session.targetId);
                                                                                            return (
                                                                                                <div
                                                                                                    key={session.id}
                                                                                                    draggable
                                                                                                    title={DRAG_HINT_SESSION}
                                                                                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'session', session, wd.dateStr); }}
                                                                                                    onDragEnd={() => { handleDragEnd(); setOverflowDay(null); }}
                                                                                                    onClick={() => { setViewingSession(session); setOverflowDay(null); }}
                                                                                                    className={`group relative flex items-center gap-2 p-1.5 rounded-md border cursor-grab transition-all hover:scale-[1.02] active:scale-95 ${tc.bg} ${tc.border} ${tc.text}`}
                                                                                                    style={isDark ? { backgroundColor: tc.darkBg, borderColor: tc.darkBorder, color: tc.darkText } : undefined}
                                                                                                >
                                                                                                    <GripVerticalIcon size={10} className="absolute top-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />
                                                                                                    <div className="flex-1 min-w-0">
                                                                                                        <div className="text-[9px] font-medium leading-tight truncate">{session.title}</div>
                                                                                                        <div className="text-[8px] opacity-70 truncate">
                                                                                                            {session.time && <span className="font-semibold">{session.time} · </span>}
                                                                                                            {resolveTargetName(session.targetId, session.targetType)}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {session.load && (
                                                                                                        <span className={`text-[7px] font-bold uppercase px-1 py-px rounded shrink-0 ${
                                                                                                            session.load === 'High' ? 'bg-red-500 text-white' :
                                                                                                            session.load === 'Medium' ? 'bg-amber-400 text-white' :
                                                                                                            'bg-emerald-400 text-white'
                                                                                                        }`}>{session.load[0]}</span>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        } else {
                                                                                            const event = entry.item;
                                                                                            return (
                                                                                                <div
                                                                                                    key={event.id}
                                                                                                    draggable
                                                                                                    title={DRAG_HINT_EVENT}
                                                                                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'event', event, wd.dateStr); }}
                                                                                                    onDragEnd={() => { handleDragEnd(); setOverflowDay(null); }}
                                                                                                    onClick={() => {
                                                                                                        setOverflowDay(null);
                                                                                                        const popKey = `${event.id}_${wd.dateStr}`;
                                                                                                        setActivePopover({ id: popKey, event });
                                                                                                    }}
                                                                                                    className="group relative flex items-center gap-1.5 px-1.5 py-1 rounded-md border cursor-grab transition-all hover:scale-[1.02] active:scale-95"
                                                                                                    style={{ backgroundColor: `${event.color}${isDark ? '6B' : '26'}`, borderColor: `${event.color}${isDark ? 'A8' : '55'}`, color: isDark ? '#ffffff' : darkenHex(event.color) }}
                                                                                                >
                                                                                                    <GripVerticalIcon size={10} className="absolute top-1 right-1 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none" />
                                                                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: event.color }} />
                                                                                                    <div className="flex flex-col min-w-0 flex-1">
                                                                                                        <span className="text-[9px] font-medium leading-tight truncate">
                                                                                                            {!event.all_day && event.start_time && (
                                                                                                                <span className="font-semibold">{event.start_time} </span>
                                                                                                            )}
                                                                                                            {event.title}
                                                                                                        </span>
                                                                                                        {(() => {
                                                                                                            const assignees = getEventAssignees(event);
                                                                                                            if (assignees.length === 0) return null;
                                                                                                            const shown = assignees.slice(0, 2);
                                                                                                            const extra = assignees.length - shown.length;
                                                                                                            return (
                                                                                                                <>
                                                                                                                    {shown.map((a, i) => (
                                                                                                                        <span key={i} className="flex items-center gap-0.5 text-[8px] leading-tight opacity-75 min-w-0">
                                                                                                                            {a.isTeam ? <UsersIcon size={7} className="shrink-0" /> : <UserIcon size={7} className="shrink-0" />}
                                                                                                                            <span className="truncate">{a.name}</span>
                                                                                                                        </span>
                                                                                                                    ))}
                                                                                                                    {extra > 0 && (
                                                                                                                        <span className="text-[8px] leading-tight opacity-60 font-semibold">+{extra} more</span>
                                                                                                                    )}
                                                                                                                </>
                                                                                                            );
                                                                                                        })()}
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        }
                                                                                    })}
                                                                                </div>
                                                                            </CalendarPopover>
                                                                        )}
                                                                        {/* Fallback popover for a hidden (+N more) event that has no on-page tile to anchor to */}
                                                                        {activePopover?.event
                                                                            && activePopover.id === `${activePopover.event.id}_${wd.dateStr}`
                                                                            && !allItems.slice(0, 3).some(e => e.type === 'event' && `${e.item.id}_${wd.dateStr}` === activePopover.id)
                                                                            && (
                                                                            <EventDetailPopover
                                                                                ref={popoverRef}
                                                                                event={activePopover.event}
                                                                                resolveAssignees={getEventAssignees}
                                                                                onClose={() => setActivePopover(null)}
                                                                                onEdit={() => { setEditingEvent({ ...activePopover.event, all_day: activePopover.event.all_day || false }); setActivePopover(null); }}
                                                                                onDelete={() => { setConfirmDeleteItem({ type: 'event', id: activePopover.event.id, name: activePopover.event.title || 'this event' }); setActivePopover(null); }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
    </>);
};

export default CalendarWeekView;
