// (monolith restructure, 2026-07-12).
import React from 'react';
import { ChevronDownIcon } from 'lucide-react';

export const inputCls = "w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
export const inputErrorCls = "w-full bg-slate-50 dark:bg-[#0F1C30] border-2 border-red-400 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors";
export const labelCls = "text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block mb-1.5";

export const CollapsibleSection = ({ id, icon: Icon, title, subtitle, children, openSections, setOpenSections }) => {
  // Inverted semantics: openSections tracks IDs that are OPEN. Default state is
  // an empty set, so every collapsible section starts collapsed by default.
  const isOpen = openSections.has(id);
  const toggle = () => setOpenSections(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return (
    <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/50 dark:bg-[#132338]/40 dark:hover:bg-[#1A2D48]/50 transition-colors">
        {Icon && <Icon size={15} className="text-indigo-500 dark:text-indigo-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">{subtitle}</p>}
        </div>
        <div className={`text-slate-400 dark:text-[#CBD5E1] transition-transform ${isOpen ? '' : '-rotate-90'}`}>
          <ChevronDownIcon size={16} />
        </div>
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-slate-100 dark:border-[#243A58] pt-4">{children}</div>}
    </div>
  );
};

// ── Unsaved Changes Modal ────────────────────────────────────────────

export const GPS_META_NAMES = new Set(['Player number', 'Player name', 'Session name', 'Phase name', 'Type']);
