// @ts-nocheck — moved verbatim from SettingsPage.tsx (monolith restructure,
// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { SupabaseStorageService as StorageService } from '../../services/storageService';
import { PAGE_TOURS, WORKFLOW_TOURS, getDefaultTourState } from '../../utils/tourSteps';
import { CheckCircleIcon, ChevronDownIcon, CircleIcon, PlayCircleIcon, PlayIcon, RotateCcwIcon, SparklesIcon, VideoIcon } from 'lucide-react';

export const SettingsWalkthrough: React.FC<any> = ({
    replayOnboarding,
    name,
    navigate,
    openSections,
    setOpenSections,
    setTourState,
    showToast,
    tourState,
    user,
}) => {
    return (<>
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Walkthrough</h2>
              <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                The welcome tour, per-page interactive walkthroughs and (soon) video tutorials, all in one place.
              </p>
            </div>

            {/* Top feature card — Replay welcome tour */}
            <div className="relative overflow-hidden rounded-xl border border-indigo-200 dark:border-indigo-500/40 bg-gradient-to-br from-indigo-50 via-white to-white dark:from-indigo-900/30 dark:via-[#132338] dark:to-[#132338] shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <SparklesIcon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Welcome tour</h3>
                  <p className="text-[12px] text-slate-500 dark:text-[#CBD5E1] mt-0.5 leading-relaxed">
                    Replay the first-login walkthrough — sidebar, top KPIs, Performance Report, Wellness Summary, Calendar, theme picker, and where Settings lives.
                  </p>
                  <button
                    onClick={async () => {
                      await replayOnboarding();
                      showToast?.('Welcome tour starting…', 'success');
                    }}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                  >
                    <PlayIcon size={13} /> Replay welcome tour
                  </button>
                </div>
              </div>
            </div>

            {/* Per-page sections — each collapsed by default. Inside each: a video
                placeholder + the page tour + any workflow sub-tours. The
                video-placeholder + tour-buttons live together so the user finds
                "how do I learn about Wellness Hub" in one place, not split. */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-slate-400 dark:text-[#CBD5E1] uppercase tracking-wide px-1">Pages & hubs</h3>
              {PAGE_TOURS.map(tour => {
                const isSectionOpen = openSections.has(`wt-${tour.pageId}`);
                const status = tourState?.[tour.pageId] || 'pending';
                const isCompleted = status === 'completed';
                const isSkipped = status === 'skipped';
                const workflowsForPage = WORKFLOW_TOURS.filter(wf => wf.parentPageId === tour.pageId);

                return (
                  <div key={tour.pageId} className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm overflow-hidden">
                    {/* Collapsible header */}
                    <button
                      onClick={() => setOpenSections(prev => {
                        const next = new Set(prev);
                        const key = `wt-${tour.pageId}`;
                        if (next.has(key)) next.delete(key); else next.add(key);
                        return next;
                      })}
                      className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/60 dark:hover:bg-[#1A2D48]/50 transition-colors"
                    >
                      {isCompleted ? (
                        <CheckCircleIcon size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <CircleIcon size={16} className="text-slate-300 dark:text-[#1A2D48] shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">{tour.pageName}</h3>
                        <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                          {tour.steps.length} step{tour.steps.length !== 1 ? 's' : ''}
                          {workflowsForPage.length > 0 && ` · ${workflowsForPage.length} sub-tour${workflowsForPage.length !== 1 ? 's' : ''}`}
                          {isSkipped && <span className="text-amber-500 font-medium ml-1.5">· Skipped</span>}
                          {isCompleted && <span className="text-emerald-500 font-medium ml-1.5">· Completed</span>}
                        </p>
                      </div>
                      <div className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isSectionOpen ? '' : '-rotate-90'}`}>
                        <ChevronDownIcon size={16} />
                      </div>
                    </button>

                    {isSectionOpen && (
                      <div className="px-5 pb-5 border-t border-slate-100 dark:border-[#243A58] pt-4 space-y-3">

                        {/* Video walkthrough — placeholder until recordings ship.
                            Lives inside each page section so the user finds the
                            "how do I learn about Wellness Hub" video right next
                            to the interactive tour for that same hub. */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-[#0F1C30] border border-dashed border-slate-200 dark:border-[#243A58]">
                          <div className="w-9 h-9 rounded-md bg-slate-200/70 dark:bg-[#1A2D48] flex items-center justify-center text-slate-400 dark:text-[#475569] shrink-0">
                            <VideoIcon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-slate-600 dark:text-[#CBD5E1]">Video walkthrough</p>
                            <p className="text-[10.5px] text-slate-400 dark:text-[#64748B] leading-snug">
                              A short screen-recorded tour of this hub and its sub-pages. Coming soon — we'll wire YouTube links here as each video lands.
                            </p>
                          </div>
                          <button
                            disabled
                            className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#64748B] border border-slate-200 dark:border-[#243A58] cursor-not-allowed shrink-0"
                          >
                            <PlayCircleIcon size={12} className="inline mr-1" /> Coming soon
                          </button>
                        </div>

                        {/* Page tour row */}
                        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58]">
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-semibold text-slate-700 dark:text-[#E2E8F0]">{tour.pageName} — page tour</p>
                            <p className="text-[10.5px] text-slate-400 dark:text-[#CBD5E1]">{tour.steps.length} step{tour.steps.length !== 1 ? 's' : ''}, ~1 minute</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isCompleted && (
                              <button
                                onClick={() => {
                                  const updated = { ...tourState, [tour.pageId]: 'pending' };
                                  setTourState(updated);
                                  StorageService.saveTourState(updated);
                                  showToast?.(`${tour.pageName} tour reset`);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] text-slate-600 dark:text-[#CBD5E1] rounded-md text-[11px] font-medium transition-colors"
                              >
                                <RotateCcwIcon size={11} /> Reset
                              </button>
                            )}
                            <button
                              onClick={() => {
                                const updated = { ...tourState, [tour.pageId]: 'pending' };
                                setTourState(updated);
                                StorageService.saveTourState(updated);
                                navigate(tour.route);
                              }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-semibold transition-colors"
                            >
                              <PlayIcon size={11} /> {isCompleted ? 'Restart' : isSkipped ? 'Resume' : 'Start tour'}
                            </button>
                          </div>
                        </div>

                        {/* Hub / workflow sub-tours */}
                        {workflowsForPage.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#64748B] pl-1">Hub tours</p>
                            {workflowsForPage.map(wf => {
                              const wfStatus = tourState?.[wf.id] || 'pending';
                              const wfCompleted = wfStatus === 'completed';
                              const wfSkipped = wfStatus === 'skipped';
                              return (
                                <div key={wf.id} className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-slate-50 dark:bg-[#0F1C30] border border-slate-100 dark:border-[#243A58]">
                                  <div className="flex items-center gap-2 min-w-0">
                                    {wfCompleted ? (
                                      <CheckCircleIcon size={13} className="text-emerald-500 shrink-0" />
                                    ) : (
                                      <CircleIcon size={13} className="text-slate-300 dark:text-[#1A2D48] shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-[11.5px] font-medium text-slate-700 dark:text-[#E2E8F0] truncate">{wf.name}</p>
                                      <p className="text-[9.5px] text-slate-400 dark:text-[#64748B]">
                                        {wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}
                                        {wfSkipped && <span className="text-amber-500 ml-1">· Skipped</span>}
                                        {wfCompleted && <span className="text-emerald-500 ml-1">· Completed</span>}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const updated = { ...tourState, [wf.id]: 'pending' };
                                      setTourState(updated);
                                      StorageService.saveTourState(updated);
                                      // Prefer the workflow's explicit route (e.g. /wellness?section=ACWR+Monitoring)
                                      // so the trigger element actually mounts. Fall back to parent page route.
                                      const parentRoute = PAGE_TOURS.find(p => p.pageId === wf.parentPageId)?.route || '/';
                                      navigate(wf.route || parentRoute);
                                    }}
                                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-300 rounded-md text-[10.5px] font-semibold transition-colors shrink-0 border border-indigo-100 dark:border-indigo-500/30"
                                  >
                                    <PlayIcon size={10} /> Start tour
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Reset All */}
            <div className="pt-3 border-t border-slate-100 dark:border-[#243A58]">
              <button
                onClick={() => {
                  const fresh = getDefaultTourState();
                  setTourState(fresh);
                  StorageService.saveTourState(fresh);
                  showToast?.('All tours reset');
                }}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-[#94A3B8] hover:text-rose-500 transition-colors"
              >
                <RotateCcwIcon size={12} /> Reset all page tours
              </button>
            </div>
          </>
    </>);
};

export default SettingsWalkthrough;
