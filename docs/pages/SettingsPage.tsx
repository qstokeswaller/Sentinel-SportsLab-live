// @ts-nocheck
// v7
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppStateContext';
import { DatabaseService } from '../services/databaseService';
import {
  SaveIcon, LogOutIcon, UserIcon, SettingsIcon,
  GaugeIcon, UsersIcon, ToggleLeftIcon, ToggleRightIcon,
  SlidersHorizontalIcon, ShieldIcon, ChevronRightIcon,
  FlaskConicalIcon, ChevronDownIcon, ChevronUpIcon, AlertTriangleIcon,
  MapIcon, CheckCircleIcon, CircleIcon, PlayIcon, RotateCcwIcon, LayoutGridIcon,
  ActivityIcon, TagIcon, CheckIcon, LinkIcon, XIcon, SunIcon, MoonIcon, MonitorIcon, CalendarIcon,
  KeyIcon, MailIcon, MessageSquareIcon, LifeBuoyIcon, SendIcon, AlertCircleIcon, CheckCircle2Icon,
  PlayCircleIcon, SparklesIcon, VideoIcon,
} from 'lucide-react';
import { ACWR_METRIC_TYPES } from '../utils/constants';
import { hasFeatureAccess, TIER_LABEL, type Tier } from '../utils/tierFeatures';
import { TEST_CATEGORIES, getTestsByCategory } from '../utils/testRegistry';
import { PAGE_TOURS, WORKFLOW_TOURS, getDefaultTourState } from '../utils/tourSteps';
import { SupabaseStorageService as StorageService } from '../services/storageService';
import { useOnboarding } from '../hooks/useOnboarding';
import { GpsConfigModal, GpsCategoryManager, loadGpsProfiles, saveGpsProfiles, getProfileForTeam } from '../components/performance/GpsConfigModal';
import { CustomSelect } from '../components/ui/CustomSelect';
import { AthleteAvatar } from '../components/roster/AthleteAvatar';
import type { GpsTeamProfile } from '../components/performance/GpsConfigModal';

const inputCls = "w-full bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
const inputErrorCls = "w-full bg-slate-50 dark:bg-[#0F1C30] border-2 border-red-400 rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors";
const labelCls = "text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block mb-1.5";

const METHOD_OPTIONS = Object.entries(ACWR_METRIC_TYPES).map(([id, info]: [string, any]) => ({
  id, label: info.label, desc: info.desc,
}));

const DEFAULT_TEAM_SETTINGS = { enabled: false, method: 'sprint_distance', acuteWindow: 7, chronicWindow: 28, freezeRestDays: true, sprintThreshold: 25 };

const SETTINGS_TABS = [
  { id: 'account',     label: 'Account',          icon: ShieldIcon,           desc: 'Profile, security' },
  { id: 'organisation',label: 'Organisation',     icon: UsersIcon,            desc: 'Tier, members, billing' },
  { id: 'appearance',  label: 'Appearance',        icon: SunIcon,              desc: 'Theme, display' },
  { id: 'features',   label: 'Feature Settings',  icon: SlidersHorizontalIcon,desc: 'ACWR, Heatmap, Testing, GPS' },
  { id: 'walkthrough',label: 'Walkthrough',        icon: MapIcon,              desc: 'Page tours' },
  { id: 'support',    label: 'Help & Support',     icon: LifeBuoyIcon,         desc: 'Contact us, report a bug' },
];

// ── Collapsible Section wrapper ──────────────────────────────────────
const CollapsibleSection = ({ id, icon: Icon, title, subtitle, children, openSections, setOpenSections }) => {
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
const UnsavedChangesModal = ({ isOpen, onSave, onDiscard, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#132338] rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <AlertTriangleIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Unsaved Changes</h3>
            <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">You have unsaved changes that will be lost.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onDiscard} className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-[#CBD5E1] bg-slate-100 hover:bg-slate-200 dark:hover:bg-[#1A2D48] rounded-lg transition-colors">Discard</button>
          <button onClick={onSave} className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">Save & Continue</button>
        </div>
      </div>
    </div>
  );
};

// ── GPS Column Rename Modal ──────────────────────────────────────────
const GPS_META_NAMES = new Set(['Player number', 'Player name', 'Session name', 'Phase name', 'Type']);

const GpsColumnRenameModal: React.FC<{
  profile: GpsTeamProfile;
  onClose: () => void;
  onSaved: () => void;
}> = ({ profile, onClose, onSaved }) => {
  const mappings = Array.isArray(profile.columnMapping) ? profile.columnMapping : [];
  const [drafts, setDrafts] = useState<Record<string, string>>(
    Object.fromEntries(mappings.map(m => [m.csvColumn, m.displayName || m.csvColumn]))
  );
  const visible = mappings.filter(m => !GPS_META_NAMES.has(m.csvColumn));

  const handleSave = () => {
    const updated: GpsTeamProfile = {
      ...profile,
      columnMapping: mappings.map(m => ({ ...m, displayName: drafts[m.csvColumn] ?? m.displayName })),
    };
    const all = loadGpsProfiles();
    const idx = all.findIndex(p => p.teamId === profile.teamId);
    if (idx >= 0) all[idx] = updated; else all.push(updated);
    saveGpsProfiles(all);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#132338] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#1A2D48] shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Column Display Names — {profile.teamName}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">{visible.length} columns · CSV import name (left) → how it appears in GPS Hub (right)</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:hover:bg-[#1A2D48] flex items-center justify-center text-slate-500 transition-colors">
            <XIcon size={14} />
          </button>
        </div>

        {/* Column list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {visible.length === 0 && (
            <p className="text-xs text-slate-400 italic">No column mappings found. Upload a CSV in Configure first.</p>
          )}
          {visible.map(m => (
            <div key={m.csvColumn} className="flex items-center gap-3 group">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-slate-400 font-mono truncate mb-0.5" title={m.csvColumn}>{m.csvColumn}</p>
              </div>
              <div className="text-slate-300 text-xs shrink-0">→</div>
              <input
                value={drafts[m.csvColumn] ?? ''}
                onChange={e => setDrafts(prev => ({ ...prev, [m.csvColumn]: e.target.value }))}
                placeholder={m.csvColumn}
                className="flex-1 text-xs border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-slate-50 dark:bg-[#0F1C30] text-slate-900 dark:text-[#E2E8F0]"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-[#132338]/40">
          <p className="text-[10px] text-slate-400">Changes apply immediately in GPS Hub after saving.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-[#CBD5E1] bg-white dark:bg-[#1A2D48] border border-slate-200 dark:border-[#243A58] hover:bg-slate-50 dark:hover:bg-[#243A58] rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors">Save Names</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// Appearance Tab (isolated so it can hold local pending state)
// ══════════════════════════════════════════════════════════════════════

function AppearanceTab({ isDarkMode, toggleDarkMode }: { isDarkMode: boolean; toggleDarkMode: () => void }) {
  const [pending, setPending] = React.useState<boolean>(isDarkMode);
  const [calendarDefault, setCalendarDefault] = React.useState<'week' | 'month'>(() => (localStorage.getItem('dash_calendar_view') as 'week' | 'month') || 'week');
  const [savedCalendar, setSavedCalendar] = React.useState<'week' | 'month'>(() => (localStorage.getItem('dash_calendar_view') as 'week' | 'month') || 'week');

  const isDirty = pending !== isDarkMode || calendarDefault !== savedCalendar;

  function save() {
    if (pending !== isDarkMode) toggleDarkMode();
    if (calendarDefault !== savedCalendar) {
      localStorage.setItem('dash_calendar_view', calendarDefault);
      setSavedCalendar(calendarDefault);
    }
  }

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Appearance</h2>
        <p className="text-xs text-slate-500 dark:text-[#CBD5E1] mt-0.5">Customise how Sentinel SportsLab looks on your device.</p>
      </div>

      <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1A2D48] flex items-center justify-center shrink-0">
              {isDarkMode ? <MoonIcon size={16} className="text-indigo-400" /> : <SunIcon size={16} className="text-amber-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Theme</h3>
              <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Switch between light and dark mode. Preference is saved per device.</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Light card */}
            <button
              onClick={() => setPending(false)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${!pending ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-[#1A2D48] bg-white dark:bg-[#1A2D48]'}`}
            >
              <div className="w-full aspect-video rounded-lg bg-slate-100 border border-slate-200 mb-3 overflow-hidden flex flex-col p-2 gap-1.5">
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded bg-white border border-slate-200" />
                  <div className="flex-1 h-6 rounded bg-white border border-slate-200" />
                </div>
                <div className="flex-1 rounded bg-white border border-slate-200" />
              </div>
              <div className="flex items-center gap-2">
                <SunIcon size={13} className="text-amber-500 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Light</span>
                {!pending && <CheckIcon size={13} className="ml-auto text-indigo-500" />}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">Clean, high-contrast for indoor use</p>
            </button>

            {/* Dark card */}
            <button
              onClick={() => setPending(true)}
              className={`relative rounded-xl border-2 p-4 text-left transition-all ${pending ? 'border-indigo-500 bg-indigo-900/20' : 'border-slate-200 dark:border-[#243A58] hover:border-slate-300 dark:hover:border-[#1A2D48] bg-white dark:bg-[#1A2D48]'}`}
            >
              <div className="w-full aspect-video rounded-lg bg-[#0D1829] border border-[#243A58] mb-3 overflow-hidden flex flex-col p-2 gap-1.5">
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded bg-[#132338] border border-[#243A58]" />
                  <div className="flex-1 h-6 rounded bg-[#132338] border border-[#243A58]" />
                </div>
                <div className="flex-1 rounded bg-[#132338] border border-[#243A58]" />
              </div>
              <div className="flex items-center gap-2">
                <MoonIcon size={13} className="text-indigo-400 shrink-0" />
                <span className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Dark</span>
                {pending && <CheckIcon size={13} className="ml-auto text-indigo-500" />}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">Navy dark — better in bright conditions</p>
            </button>
          </div>

        </div>
      </div>

      {/* Calendar Default View */}
      <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-[#243A58]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1A2D48] flex items-center justify-center shrink-0">
              <CalendarIcon size={16} className="text-indigo-500 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0]">Dashboard Calendar Default</h3>
              <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Choose which view opens by default on the Dashboard calendar.</p>
            </div>
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="flex gap-2">
            {(['week', 'month'] as const).map(v => (
              <button
                key={v}
                onClick={() => setCalendarDefault(v)}
                className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold transition-all ${calendarDefault === v ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white dark:bg-[#1A2D48] border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-700'}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)} View
              </button>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-[#CBD5E1] mt-2">Takes effect on next page load.</p>
        </div>
      </div>

      {/* Single save row for all appearance settings */}
      <div className="flex items-center justify-between py-3 px-1">
        <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">
          {isDirty ? 'Unsaved changes' : 'All changes saved'}
        </p>
        <button
          onClick={save}
          disabled={!isDirty}
          className="px-5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save Appearance
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SupportTab — in-platform contact form for authenticated users.
// Auto-fills name/email/org/tier/role into the submission so support
// gets meaningful context out of the box. Posts to the same /api/contact
// endpoint as the public form.
// ══════════════════════════════════════════════════════════════════════

const SUPPORT_CATEGORIES = [
  { id: 'bug',      label: 'Report a bug',       icon: AlertCircleIcon,   desc: 'Something is broken or behaving unexpectedly' },
  { id: 'feature',  label: 'Feature request',    icon: MessageSquareIcon, desc: 'Idea or improvement you would like to see' },
  { id: 'support',  label: 'General support',    icon: LifeBuoyIcon,      desc: 'Need help using a feature, account, or data' },
  { id: 'sales',    label: 'Billing & plans',    icon: MailIcon,          desc: 'Tier changes, invoices, seats, renewals' },
] as const;

type SupportCategory = typeof SUPPORT_CATEGORIES[number]['id'];

interface SupportTabProps {
  currentOrg: any;
  authUserEmail?: string;
  authUserName?: string;
  currentUserRole?: 'admin' | 'member' | null;
  showToast?: (msg: string, kind?: string) => void;
}

const SupportTab: React.FC<SupportTabProps> = ({ currentOrg, authUserEmail, authUserName, currentUserRole, showToast }) => {
  const [category, setCategory]   = useState<SupportCategory>('support');
  const [name, setName]           = useState(authUserName || '');
  const [email, setEmail]         = useState(authUserEmail || '');
  const [subject, setSubject]     = useState('');
  const [message, setMessage]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Re-sync defaults when org/user info finishes loading
  useEffect(() => { if (authUserName && !name) setName(authUserName); }, [authUserName]);
  useEffect(() => { if (authUserEmail && !email) setEmail(authUserEmail); }, [authUserEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!message.trim()) { setError('Please describe your request.'); return; }
    setError(null);
    setSubmitting(true);
    // Compose a rich message body that includes platform context so support has
    // everything they need without asking follow-up questions.
    const contextLines = [
      `[Submitted from Settings → Help & Support]`,
      currentOrg?.name      ? `Organisation: ${currentOrg.name}`          : null,
      currentOrg?.tier      ? `Tier: ${currentOrg.tier}`                  : null,
      currentUserRole       ? `Role: ${currentUserRole}`                  : null,
      typeof window !== 'undefined' ? `Current URL: ${window.location.href}` : null,
      navigator?.userAgent  ? `User Agent: ${navigator.userAgent}`         : null,
    ].filter(Boolean).join('\n');
    const bodyText = `${subject ? `Subject: ${subject}\n\n` : ''}${message.trim()}\n\n---\n${contextLines}`;

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: category,
          name: name.trim() || (authUserEmail?.split('@')[0] ?? 'Platform user'),
          email: email.trim() || authUserEmail,
          organisation: currentOrg?.name || '',
          message: bodyText,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || 'Could not send your message. Please try again.');
      } else {
        setSent(true);
        showToast?.('Message sent — we will reply soon', 'success');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error — check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-white dark:bg-[#132338] border-2 border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-8 text-center shadow-sm">
        <CheckCircle2Icon size={42} className="text-emerald-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0] mb-1">Message received</h3>
        <p className="text-[13px] text-slate-500 dark:text-[#CBD5E1] leading-relaxed mb-5 max-w-md mx-auto">
          Thanks {name.split(' ')[0] || 'there'} — we'll reply within one business day. If urgent, email
          <a href="mailto:support@sentinelsportslab.com" className="text-indigo-600 dark:text-indigo-300 font-semibold"> support@sentinelsportslab.com</a>.
        </p>
        <button
          onClick={() => { setSent(false); setSubject(''); setMessage(''); }}
          className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-300 hover:text-indigo-700"
        >
          Send another message →
        </button>
      </div>
    );
  }

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Help & Support</h2>
        <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">
          Reach us directly from the platform. We auto-attach your organisation + tier so we have context.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 space-y-5 shadow-sm">
        {/* Context summary — read-only badges so user can confirm what we'll receive */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-600 dark:text-[#CBD5E1]">
            <strong>Org:</strong> {currentOrg?.name || '—'}
          </span>
          {currentOrg?.tier && (
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-semibold">
              {(TIER_LABEL[currentOrg.tier as Tier] || currentOrg.tier)} plan
            </span>
          )}
          {currentUserRole && (
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] text-slate-500 dark:text-[#94A3B8] capitalize">
              {currentUserRole}
            </span>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">What's this about?</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SUPPORT_CATEGORIES.map(c => {
              const isSel = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border-[1.5px] text-left transition-all ${
                    isSel
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] text-slate-600 dark:text-[#CBD5E1] hover:border-indigo-300 dark:hover:border-indigo-500/40'
                  }`}
                >
                  <c.icon size={14} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold">{c.label}</div>
                    <div className="text-[10.5px] text-slate-500 dark:text-[#94A3B8] leading-snug mt-0.5">{c.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Your name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Reply-to email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputCls} />
          </div>
        </div>

        {/* Subject (optional one-liner) */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Subject (optional)</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={category === 'bug' ? 'e.g. ACWR chart blank for Tshepo' : category === 'feature' ? 'e.g. Add Catapult v2 column mapper' : 'A short headline for your message'}
            className={inputCls}
            maxLength={120}
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-[10.5px] font-bold uppercase tracking-[0.04em] text-slate-500 dark:text-[#CBD5E1] mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            required
            rows={6}
            maxLength={5000}
            placeholder={category === 'bug'
              ? 'Steps to reproduce, what you expected, what happened, any screenshots you can email us as a follow-up...'
              : 'Tell us what you need — the more detail the faster we can help.'}
            className={inputCls + ' resize-y'}
          />
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mt-1">{message.length}/5000</p>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-[12px]">
            <AlertCircleIcon size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-[#1A2D48]">
          <p className="text-[11px] text-slate-400 dark:text-[#94A3B8]">
            We reply within one business day. Reply-to is set to your email.
          </p>
          <button
            type="submit"
            disabled={submitting || !message.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-[#243A58] dark:disabled:text-[#475569] text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
          >
            <SendIcon size={13} /> {submitting ? 'Sending…' : 'Send Message'}
          </button>
        </div>
      </form>
    </>
  );
};

// ══════════════════════════════════════════════════════════════════════
// Main Settings Page
// ══════════════════════════════════════════════════════════════════════

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { teams, acwrSettings, setAcwrSettings, acwrRecalcAnchors, setAcwrRecalcAnchors, testVisibility, setTestVisibility, tourState, setTourState, showToast, gpsProfiles, setGpsProfiles, polarIntegration, setPolarIntegration, gpsDataSources, setGpsDataSources, isDarkMode, toggleDarkMode, currentOrg, isOrgAdmin, currentUserRole, refreshCurrentOrg } = useAppState();
  const { replayOnboarding } = useOnboarding();
  const [activeTab, setActiveTab] = useState('account');

  // ── Organisation tab state (Phase C) ────────────────────────────────────
  const [orgMembers, setOrgMembers] = useState<any[]>([]);
  const [orgInvitations, setOrgInvitations] = useState<any[]>([]);
  const [orgListLoading, setOrgListLoading] = useState(false);
  const [orgNameDraft, setOrgNameDraft] = useState<string>('');
  const [orgNameSaving, setOrgNameSaving] = useState(false);

  // Keep the org-name input in sync with the live org name whenever it changes
  React.useEffect(() => {
    setOrgNameDraft(currentOrg?.name || '');
  }, [currentOrg?.name]);

  // Fetch members + invitations whenever the Organisation tab opens.
  React.useEffect(() => {
    if (activeTab !== 'organisation') return;
    let cancelled = false;
    (async () => {
      setOrgListLoading(true);
      try {
        const [members, invitations] = await Promise.all([
          DatabaseService.getOrgMembers().catch(() => []),
          DatabaseService.getOrgPendingInvitations().catch(() => []),
        ]);
        if (cancelled) return;
        setOrgMembers(members || []);
        setOrgInvitations(invitations || []);
      } finally {
        if (!cancelled) setOrgListLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  const handleSaveOrgName = async () => {
    const trimmed = orgNameDraft.trim();
    if (!trimmed || trimmed === currentOrg?.name) return;
    setOrgNameSaving(true);
    try {
      await DatabaseService.updateOrgName(trimmed);
      await refreshCurrentOrg();
      showToast?.('Organisation name updated');
    } catch (e: any) {
      showToast?.(e?.message || 'Failed to update organisation name', 'error');
    } finally {
      setOrgNameSaving(false);
    }
  };

  const seatUsage = (orgMembers?.length || 0) + (orgInvitations?.length || 0);
  const seatCap = currentOrg?.seat_cap || 1;
  const atCap = seatUsage >= seatCap;
  const tierLabel: Record<string, string> = {
    basic:        'Basic',
    performance:  'Performance',
    elite:        'Elite',
    custom:       'Custom',
  };

  // ── Phase D: invite form + member action state ──────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteSending, setInviteSending] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);
  // Pre-flight check result for the invite email — surfaces a clear warning if
  // the email is tied to a user who is already in another org with data, since
  // the accept flow would fail (multi-org membership is not yet supported).
  const [inviteEmailCheck, setInviteEmailCheck] = useState<null | {
    user_exists: boolean;
    has_other_org: boolean;
    other_org_name: string | null;
    other_org_has_data: boolean;
  }>(null);
  const [inviteEmailChecking, setInviteEmailChecking] = useState(false);

  // Generic confirm-action modal — replaces the ugly native window.confirm()
  // calls we previously used for revoke / remove / transfer-admin actions.
  const [pendingConfirm, setPendingConfirm] = useState<null | {
    title: string;
    body: string;
    confirmLabel: string;
    confirmTone: 'danger' | 'primary';
    onConfirm: () => void | Promise<void>;
  }>(null);
  const askConfirm = (opts: typeof pendingConfirm) => setPendingConfirm(opts);
  const [memberActionBusy, setMemberActionBusy] = useState<string | null>(null); // member_id being acted on

  // ── Phase E: audit log state ────────────────────────────────────────────
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  React.useEffect(() => {
    if (activeTab !== 'organisation') return;
    let cancelled = false;
    (async () => {
      setAuditLoading(true);
      try {
        const rows = await DatabaseService.getOrgAuditLog(50).catch(() => []);
        if (!cancelled) setAuditLog(rows || []);
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab, orgMembers.length, orgInvitations.length]); // refresh after member-list changes

  // Debounced pre-flight check on the invite email — runs once the user has
  // typed a plausibly-complete email, surfaces "already in another org" warnings
  // before they hit Send. Self-cancelling on input change.
  useEffect(() => {
    const trimmed = inviteEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setInviteEmailCheck(null);
      return;
    }
    let cancelled = false;
    setInviteEmailChecking(true);
    const t = setTimeout(async () => {
      try {
        const res = await DatabaseService.checkInviteEmail(trimmed);
        if (!cancelled) setInviteEmailCheck(res);
      } catch {
        if (!cancelled) setInviteEmailCheck(null);
      } finally {
        if (!cancelled) setInviteEmailChecking(false);
      }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); setInviteEmailChecking(false); };
  }, [inviteEmail]);

  const reloadOrgLists = React.useCallback(async () => {
    setOrgListLoading(true);
    try {
      const [members, invitations] = await Promise.all([
        DatabaseService.getOrgMembers().catch(() => []),
        DatabaseService.getOrgPendingInvitations().catch(() => []),
      ]);
      setOrgMembers(members || []);
      setOrgInvitations(invitations || []);
    } finally {
      setOrgListLoading(false);
    }
  }, []);

  const handleSendInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showToast?.('Please enter a valid email address', 'error');
      return;
    }
    if (atCap) {
      showToast?.('Seat cap reached — upgrade tier or revoke a pending invitation first', 'error');
      return;
    }
    setInviteSending(true);
    try {
      const res = await DatabaseService.createOrgInvitation(email, inviteRole);
      const acceptUrl = `${window.location.origin}/accept-invite/${res.token}`;
      setLastInviteLink(acceptUrl);
      setInviteEmail('');
      await reloadOrgLists();

      // Fire-and-forget send via Resend. Failure here doesn't undo the invitation —
      // the link is still valid and shown in the UI as a manual fallback.
      const inviterName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.email as string | undefined) ||
        'A teammate';
      try {
        const emailRes = await fetch('/api/send-org-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            role: inviteRole,
            acceptUrl,
            orgName: currentOrg?.name || 'Sentinel SportsLab',
            inviterName,
          }),
        });
        if (emailRes.ok) {
          showToast?.(`Invitation email sent to ${email}`, 'success');
        } else {
          const data = await emailRes.json().catch(() => ({}));
          showToast?.(data?.error || `Invitation created — copy the link below to send to ${email} manually`, 'info');
        }
      } catch {
        showToast?.(`Invitation created — copy the link below to send to ${email} manually`, 'info');
      }
    } catch (e: any) {
      showToast?.(e?.message || 'Failed to create invitation', 'error');
    } finally {
      setInviteSending(false);
    }
  };

  const handleRevokeInvite = (invId: string) => {
    askConfirm({
      title: 'Revoke invitation?',
      body: 'The invite link will stop working immediately. You can always send a new invitation later.',
      confirmLabel: 'Revoke invitation',
      confirmTone: 'danger',
      onConfirm: async () => {
        setMemberActionBusy(invId);
        try {
          await DatabaseService.revokeOrgInvitation(invId);
          await reloadOrgLists();
          showToast?.('Invitation revoked');
        } catch (e: any) {
          showToast?.(e?.message || 'Failed to revoke invitation', 'error');
        } finally {
          setMemberActionBusy(null);
        }
      },
    });
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    askConfirm({
      title: `Remove ${memberName}?`,
      body: `${memberName}'s account remains, but they lose access to your workspace and all athletes/data scoped to this organisation. You can re-invite them later.`,
      confirmLabel: 'Remove from organisation',
      confirmTone: 'danger',
      onConfirm: async () => {
        setMemberActionBusy(memberId);
        try {
          await DatabaseService.removeOrgMember(memberId);
          await reloadOrgLists();
          showToast?.(`${memberName} removed`);
        } catch (e: any) {
          showToast?.(e?.message || 'Failed to remove member', 'error');
        } finally {
          setMemberActionBusy(null);
        }
      },
    });
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member', memberName: string) => {
    setMemberActionBusy(memberId);
    try {
      await DatabaseService.changeMemberRole(memberId, newRole);
      await reloadOrgLists();
      showToast?.(`${memberName} is now ${newRole === 'admin' ? 'an admin' : 'a member'}`);
    } catch (e: any) {
      showToast?.(e?.message || 'Failed to change role', 'error');
    } finally {
      setMemberActionBusy(null);
    }
  };

  const handleTransferAdmin = (memberId: string, memberName: string) => {
    askConfirm({
      title: `Transfer admin to ${memberName}?`,
      body: `You'll be demoted to member. ${memberName} will gain full admin control of this organisation. This can only be reversed if they transfer admin back to you.`,
      confirmLabel: 'Transfer admin role',
      confirmTone: 'primary',
      onConfirm: async () => {
        setMemberActionBusy(memberId);
        try {
          await DatabaseService.transferAdmin(memberId);
          await Promise.all([reloadOrgLists(), refreshCurrentOrg()]);
          showToast?.(`Admin transferred to ${memberName}`);
        } catch (e: any) {
          showToast?.(e?.message || 'Failed to transfer admin', 'error');
        } finally {
          setMemberActionBusy(null);
        }
      },
    });
  };
  // All sections start collapsed (GPS sections also collapsed by default)
  // Tracks which sections the user has explicitly opened. Empty set = everything
  // collapsed by default; user clicks the section header to expand it.
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());

  // ── Unsaved changes guard ──────────────────────────────────────────
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // ── ACWR draft state ───────────────────────────────────────────────
  const [draftAcwrSettings, setDraftAcwrSettings] = useState<Record<string, any>>(acwrSettings || {});
  const [acwrDirty, setAcwrDirty] = useState(false);

  useEffect(() => {
    if (!acwrDirty) setDraftAcwrSettings(acwrSettings || {});
  }, [acwrSettings]);

  const getSettings = (key: string) => draftAcwrSettings[key] || { ...DEFAULT_TEAM_SETTINGS };
  const updateSettings = (key: string, patch: Record<string, any>) => {
    setDraftAcwrSettings(prev => ({ ...prev, [key]: { ...DEFAULT_TEAM_SETTINGS, ...prev[key], ...patch } }));
    setAcwrDirty(true);
  };
  const handleSaveAcwr = () => {
    setAcwrSettings(draftAcwrSettings);
    setAcwrDirty(false);
    showToast?.('ACWR settings saved');
  };

  // ── Profile state ──────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [profileDirty, setProfileDirty] = useState(false);
  const nameRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);

  const origProfile = useRef({ fullName: '', organization: '', phone: '' });

  // ── Change password state ──────────────────────────────────────────
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      showToast?.('Password must be at least 8 characters', 'error');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast?.('Passwords do not match', 'error');
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwSaving(false);
    if (error) {
      showToast?.(error.message || 'Could not change password', 'error');
    } else {
      setNewPassword('');
      setConfirmNewPassword('');
      showToast?.('Password updated. Check your inbox for the security notification.', 'success');
    }
  };

  // ── Change email state ────────────────────────────────────────────
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailConfirmSent, setEmailConfirmSent] = useState(false);

  const handleChangeEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast?.('Please enter a valid email address', 'error');
      return;
    }
    if (trimmed === user?.email?.toLowerCase()) {
      showToast?.('That is already your current email', 'error');
      return;
    }
    setEmailSaving(true);
    const { error } = await supabase.auth.updateUser({ email: trimmed });
    setEmailSaving(false);
    if (error) {
      showToast?.(error.message || 'Could not request email change', 'error');
    } else {
      setEmailConfirmSent(true);
      showToast?.(`Confirmation link sent to ${trimmed}`, 'success');
    }
  };

  useEffect(() => {
    if (user?.user_metadata) {
      const fn = user.user_metadata.full_name || '';
      const org = user.user_metadata.organization || '';
      const ph = user.user_metadata.phone || '';
      setFullName(fn); setOrganization(org); setPhone(ph);
      origProfile.current = { fullName: fn, organization: org, phone: ph };
    }
  }, [user]);

  useEffect(() => {
    const o = origProfile.current;
    setProfileDirty(fullName !== o.fullName || organization !== o.organization || phone !== o.phone);
  }, [fullName, organization, phone]);

  const clearFieldError = (field: string) => setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const handleSaveProfile = async () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required.';
    if (!organization.trim()) errors.organization = 'Organisation is required.';
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setProfileSaving(true); setProfileError(null);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim(), organization: organization.trim(), phone: phone.trim() || null },
    });
    setProfileSaving(false);
    if (error) { setProfileError(error.message); showToast?.(error.message, 'error'); }
    else {
      origProfile.current = { fullName, organization, phone };
      setProfileDirty(false);
      showToast?.('Profile updated');
    }
  };

  // ── GPS Data tab state ─────────────────────────────────────────────
  const [gpsConfigTarget, setGpsConfigTarget] = useState<{ teamId: string; teamName: string } | null>(null);
  const [gpsPreviewProfile, setGpsPreviewProfile] = useState<GpsTeamProfile | null>(null);
  // GPS profiles come directly from AppStateContext (populated from Supabase in initData)
  // No localStorage race condition — React state is always up to date
  const allGpsProfiles = gpsProfiles;

  // ── Global dirty check ─────────────────────────────────────────────
  const isDirty = acwrDirty || profileDirty;

  const handleTabSwitch = (tabId: string) => {
    if (tabId === activeTab) return;
    if (isDirty) {
      setPendingTab(tabId);
    } else {
      setActiveTab(tabId);
    }
  };

  const handleUnsavedSave = async () => {
    if (acwrDirty) handleSaveAcwr();
    if (profileDirty) await handleSaveProfile();
    if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
  };

  const handleUnsavedDiscard = () => {
    // Revert ACWR
    setDraftAcwrSettings(acwrSettings || {});
    setAcwrDirty(false);
    // Revert profile
    const o = origProfile.current;
    setFullName(o.fullName); setOrganization(o.organization); setPhone(o.phone);
    setProfileDirty(false);
    if (pendingTab) { setActiveTab(pendingTab); setPendingTab(null); }
  };

  // ── Update GPS acwrColumn on a team profile ───────────────────────
  const handleUpdateAcwrColumn = (teamId: string, column: string) => {
    const all = [...allGpsProfiles];
    const idx = all.findIndex(p => p.teamId === teamId);
    if (idx < 0) return;
    all[idx] = { ...all[idx], acwrColumn: column };
    saveGpsProfiles(all);   // localStorage + Supabase
    setGpsProfiles(all);    // React state — instant UI update
    showToast?.('ACWR GPS column updated');
  };

  // ── GPS Data Source per team ──────────────────────────────────────
  const handleSetGpsDataSource = async (teamId: string, source: 'csv' | 'polar') => {
    const updated = { ...gpsDataSources, [teamId]: source };
    setGpsDataSources(updated);
    await StorageService.saveGpsDataSources(updated);
    showToast?.(`Data source set to ${source === 'polar' ? 'Polar' : 'CSV'}`);
  };

  // ── Connect Polar OAuth ────────────────────────────────────────────
  const handleConnectPolar = (type: 'team_pro' | 'individual') => {
    const clientId = import.meta.env.VITE_POLAR_CLIENT_ID;
    const redirectUri = `${window.location.origin}/polar/callback`;
    const scope = type === 'team_pro' ? 'team_read' : 'accesslink.read_all';
    // Pass type via OAuth state param so callback knows which type was used
    const state = encodeURIComponent(JSON.stringify({ type }));
    const authBase = type === 'team_pro'
      ? 'https://auth.polar.com/oauth/authorize'
      : 'https://flow.polar.com/oauth2/authorization';
    const url = `${authBase}?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
    window.location.href = url;
  };

  const handleDisconnectPolar = async () => {
    const updated = { connected: false, accessToken: '', polarUserId: '', connectedAt: '', type: null };
    setPolarIntegration(updated);
    await StorageService.savePolarIntegration(updated);
    showToast?.('Polar disconnected');
  };

  const isPolarConnected = polarIntegration?.connected === true;
  const polarType = polarIntegration?.type ?? null;

  // ── Shared ACWR option controls ────────────────────────────────────
  const renderAcwrOptions = (key: string) => {
    const s = getSettings(key);

    return (
      <div className="space-y-3 pt-2 border-t border-slate-200/60">
        <div>
          <label className={labelCls}>Load Method</label>
          <CustomSelect value={s.method} onChange={e => updateSettings(key, { method: e.target.value })} variant="form">
            {METHOD_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>)}
          </CustomSelect>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>EWMA Window</label>
            <div className="flex gap-1.5">
              {([['7_28', '7/28d'], ['3_21', '3/21d']] as const).map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => updateSettings(key, { acuteWindow: val === '7_28' ? 7 : 3, chronicWindow: val === '7_28' ? 28 : 21 })}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-all ${
                    s.acuteWindow === (val === '7_28' ? 7 : 3) ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white' : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]'
                  }`}>{lbl}</button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelCls}>Rest Days</label>
            <div className="flex gap-1.5">
              {([['freeze', 'Freeze'], ['decay', 'Decay']] as const).map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => updateSettings(key, { freezeRestDays: val === 'freeze' })}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-all ${
                    (s.freezeRestDays && val === 'freeze') || (!s.freezeRestDays && val === 'decay')
                      ? 'border-indigo-300 bg-indigo-50 dark:bg-indigo-600 text-indigo-700 dark:text-white' : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#1A2D48] text-slate-500 dark:text-[#CBD5E1]'
                  }`}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>
        {s.method === 'sprint_distance' && (
          <div>
            <label className={labelCls}>Sprint Threshold (km/h)</label>
            <input type="number" min={15} max={35} step={0.5} value={s.sprintThreshold || 25}
              onChange={e => updateSettings(key, { sprintThreshold: Number(e.target.value) })} className={inputCls} />
          </div>
        )}

        {/* Recalculation anchor — reset EWMA from a chosen date without deleting data */}
        <div className="pt-2 border-t border-slate-100">
          <label className={labelCls}>Recalculate From Date</label>
          <p className="text-[10px] text-slate-400 mb-2">Historical data is kept. EWMA restarts from this date. Leave blank to use all data.</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={acwrRecalcAnchors[key] || ''}
              onChange={e => setAcwrRecalcAnchors(prev => ({ ...prev, [key]: e.target.value }))}
              className={inputCls + ' flex-1'}
            />
            {acwrRecalcAnchors[key] && (
              <button
                type="button"
                onClick={() => {
                  setAcwrRecalcAnchors(prev => { const n = { ...prev }; delete n[key]; return n; });
                  showToast?.('Recalculation anchor cleared — using all data');
                }}
                className="px-3 py-2 text-xs text-rose-600 border border-rose-200 dark:border-rose-900/50 dark:border-rose-800/50 rounded-lg hover:bg-rose-50 dark:hover:bg-[#1A2D48] transition-colors"
              >Clear</button>
            )}
          </div>
          {acwrRecalcAnchors[key] && (
            <p className="text-[10px] text-indigo-500 mt-1">
              EWMA calculates from {new Date(acwrRecalcAnchors[key] + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} onwards
            </p>
          )}
        </div>

      </div>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-4xl mx-auto py-6 px-4 min-h-[calc(100vh-80px)]">
      {/* Sidebar — vertical list on md+, horizontal pill tabs on mobile */}
      <div className="md:w-56 md:shrink-0">
        {/* Mobile: horizontal tab strip */}
        <div className="flex md:hidden gap-1 bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-1 shadow-sm mb-2">
          {SETTINGS_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => handleTabSwitch(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-slate-500 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#1A2D48]'
                }`}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* Desktop: vertical list */}
        <div className="hidden md:block sticky top-6 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <SettingsIcon size={14} className="text-white" />
            </div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-[#E2E8F0]">Settings</h1>
          </div>

          {SETTINGS_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} data-tour={`settings-${tab.id}`} onClick={() => handleTabSwitch(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-600 border border-indigo-200 dark:border-indigo-600 text-indigo-700 dark:text-white'
                    : 'hover:bg-slate-50 dark:hover:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border border-transparent'
                }`}
              >
                <tab.icon size={16} className={isActive ? 'text-indigo-600 dark:text-white' : 'text-slate-400 dark:text-[#CBD5E1]'} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium block ${isActive ? 'text-indigo-700 dark:text-white' : 'text-slate-700 dark:text-[#E2E8F0]'}`}>{tab.label}</span>
                  <span className="text-[10px] text-slate-400 dark:text-[#CBD5E1] block truncate">{tab.desc}</span>
                </div>
                {isActive && <ChevronRightIcon size={12} className="text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* ── APPEARANCE TAB ────────────────────────────────────────── */}
        {activeTab === 'appearance' && (
          <AppearanceTab isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
        )}

        {/* ── FEATURE SETTINGS TAB ──────────────────────────────────── */}
        {activeTab === 'features' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Feature Settings</h2>
              <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Configure platform features for your teams and athletes.</p>
            </div>

            {/* ACWR Section — gated behind Elite tier */}
            {!hasFeatureAccess((currentOrg?.tier as Tier) || null, 'acwr') ? (
              <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <GaugeIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">ACWR Monitoring</h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">Elite</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Upgrade to Elite to enable individualised ACWR load monitoring with EWMA + safe-band thresholds.</p>
                </div>
              </div>
            ) : (
            <CollapsibleSection id="acwr" icon={GaugeIcon} title="ACWR Monitoring"
              subtitle="Enable/disable ACWR and choose load method per team"
              openSections={openSections} setOpenSections={setOpenSections}>

              <div className="bg-slate-800 text-white p-4 rounded-xl mb-5">
                <h4 className="text-xs font-semibold text-emerald-400 mb-1.5">EWMA Model Reference</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                  ACWR uses Exponentially Weighted Moving Averages (Williams et al. 2017). Acute = 7d, Chronic = 28d default.
                  sRPE = RPE x Duration (Foster et al. 1998). Rest days freeze EWMA (Menaspa 2017). Sprint threshold 25 km/h for elite football (Bowen et al. 2017).
                </p>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /> &lt;0.8 Underexposed</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> 0.8-1.3 Optimal</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> 1.31-1.5 Caution</span>
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400" /> &gt;1.5 Danger (2-4x injury risk)</span>
                </div>
              </div>

              {teams.filter(t => t.id !== 't_private').length > 0 && (
                <div className="mb-5">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <UsersIcon size={12} /> Teams / Squads
                  </h4>
                  <div className="space-y-3">
                    {teams.filter(t => t.id !== 't_private').map(team => {
                      const key = team.id;
                      const s = getSettings(key);
                      return (
                        <div key={key} className={`rounded-xl border p-4 transition-all ${s.enabled ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-indigo-100 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-indigo-600 dark:text-white text-[10px] font-bold">
                                {team.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{team.name}</span>
                                <span className="text-[10px] text-slate-400 ml-2">{(team.players || []).length} athletes</span>
                              </div>
                            </div>
                            <button type="button" onClick={() => updateSettings(key, { enabled: !s.enabled })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${s.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                              {s.enabled ? <><ToggleRightIcon size={14} /> On</> : <><ToggleLeftIcon size={14} /> Off</>}
                            </button>
                          </div>
                          {s.enabled && renderAcwrOptions(key)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(() => {
                const privateTeam = teams.find(t => t.id === 't_private');
                const privateClients = privateTeam?.players || [];
                if (privateClients.length === 0) return null;
                return (
                  <div className="mb-5">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <UserIcon size={12} /> Private Clients
                    </h4>
                    <div className="space-y-3">
                      {privateClients.map(athlete => {
                        const key = `ind_${athlete.id}`;
                        const s = getSettings(key);
                        return (
                          <div key={key} className={`rounded-xl border p-4 transition-all ${s.enabled ? 'border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <AthleteAvatar
                                  player={athlete}
                                  size="xs"
                                  shape="rounded-lg"
                                  className="w-7 h-7"
                                  fallbackClass="bg-slate-200 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]"
                                  fallbackTextSize="text-[10px]"
                                />
                                <span className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0]">{athlete.name}</span>
                              </div>
                              <button type="button" onClick={() => updateSettings(key, { enabled: !s.enabled })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${s.enabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                {s.enabled ? <><ToggleRightIcon size={14} /> On</> : <><ToggleLeftIcon size={14} /> Off</>}
                              </button>
                            </div>
                            {s.enabled && renderAcwrOptions(key)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {teams.length === 0 && (
                <p className="text-xs text-slate-400 italic">No teams or athletes found. Add them in the Roster first.</p>
              )}

              <button type="button" onClick={handleSaveAcwr} disabled={!acwrDirty}
                className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors mt-4 ${
                  acwrDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                }`}>
                <SaveIcon size={14} />
                {acwrDirty ? 'Save ACWR Settings' : 'No changes'}
              </button>
            </CollapsibleSection>
            )}

            {/* Readiness Heatmap Section */}
            <CollapsibleSection id="heatmap_settings" icon={LayoutGridIcon} title="Readiness Heatmap"
              subtitle="Set the default team shown on the dashboard heatmap"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Choose which team is displayed by default when you open the dashboard, or prompt to select each time.</p>
                <div>
                  <label className={labelCls}>Default team</label>
                  <CustomSelect
                    value={draftAcwrSettings._heatmapDefault || 'All Teams'}
                    onChange={e => { setDraftAcwrSettings(prev => ({ ...prev, _heatmapDefault: e.target.value })); setAcwrDirty(true); }}
                    variant="form"
                  >
                    <option value="All Teams">All Teams</option>
                    <option value="prompt">Prompt on open</option>
                    {teams.filter(t => t.id !== 't_private').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </CustomSelect>
                </div>
                <button type="button" onClick={handleSaveAcwr} disabled={!acwrDirty}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    acwrDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                  }`}>
                  <SaveIcon size={14} />
                  {acwrDirty ? 'Save Settings' : 'No changes'}
                </button>
              </div>
            </CollapsibleSection>

            {/* Testing Hub Section */}
            <CollapsibleSection id="testing" icon={FlaskConicalIcon} title="Testing Hub"
              subtitle="Show or hide test categories and individual tests"
              openSections={openSections} setOpenSections={setOpenSections}>
              <TestingHubSettings testVisibility={testVisibility} setTestVisibility={setTestVisibility} />
            </CollapsibleSection>

            {/* GPS Configuration (Import Profiles + ACWR Column + Session Categories) — Elite only */}
            {!hasFeatureAccess((currentOrg?.tier as Tier) || null, 'gps') ? (
              <div className="bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-5 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0">
                  <LinkIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">GPS Configuration</h3>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded">Elite</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#CBD5E1]">Upgrade to Elite to connect Polar AccessLink and configure GPS import profiles per team.</p>
                </div>
              </div>
            ) : (
            <CollapsibleSection
              id="gps_config" icon={LinkIcon}
              title="GPS Configuration"
              subtitle="Import profiles, ACWR column binding, and session categories"
              openSections={openSections} setOpenSections={setOpenSections}
            >
              <div className="space-y-4">

                {/* ── Polar Connection Status ── */}
                <div className={`rounded-xl border px-4 py-3.5 flex items-center gap-4 ${isPolarConnected ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPolarConnected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <ActivityIcon size={16} className={isPolarConnected ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">Polar AccessLink</p>
                    {isPolarConnected ? (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                        <CheckIcon size={10} />
                        {polarType === 'team_pro' ? 'Team Pro' : 'Individual Device'} · Connected {polarIntegration.connectedAt ? new Date(polarIntegration.connectedAt).toLocaleDateString() : ''}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">Not connected — choose <strong>Team Pro</strong> for GPS vests or <strong>Individual</strong> for personal devices</p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {isPolarConnected ? (
                      <button
                        onClick={handleDisconnectPolar}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-rose-50 dark:hover:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] hover:text-rose-600 border border-slate-200 hover:border-rose-200 dark:border-rose-800/50 transition-all"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleConnectPolar('team_pro')}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all whitespace-nowrap"
                        >
                          Team Pro
                        </button>
                        <button
                          onClick={() => handleConnectPolar('individual')}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:hover:bg-[#1A2D48] text-slate-700 dark:text-[#CBD5E1] border border-slate-200 transition-all whitespace-nowrap"
                        >
                          Individual
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* ── Import Profiles ── */}
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <LinkIcon size={11} /> Import Profiles
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">
                    Click <strong>Configure</strong> next to a team to upload a sample CSV and map its columns.
                    Once saved, every future import auto-applies the mapping. Set the <strong>ACWR column</strong> to tell the platform which GPS field drives training load.
                  </p>

                  {teams.filter(t => t.id !== 't_private').length === 0 && (
                    <p className="text-xs text-slate-400 italic">No teams found — add teams in the Roster first.</p>
                  )}

                  <div className="space-y-3">
                    {teams.filter(t => t.id !== 't_private').map(team => {
                      const profile = allGpsProfiles.find(p => p.teamId === team.id);
                      const gpsColumns = profile && Array.isArray(profile.columnMapping)
                        ? profile.columnMapping.filter(m => !GPS_META_NAMES.has(m.csvColumn))
                        : [];
                      return (
                        <div key={team.id} className={`rounded-xl border transition-all ${profile ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50 dark:bg-[#132338]/40'}`}>
                          {/* Header row */}
                          <div
                            onClick={() => profile && setGpsPreviewProfile(profile)}
                            className={`flex items-center gap-4 px-4 py-3.5 ${profile ? 'hover:bg-emerald-50/40 cursor-pointer' : ''} rounded-t-xl transition-all`}
                          >
                            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-indigo-600 dark:text-white text-[10px] font-bold shrink-0">
                              {team.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 dark:text-[#E2E8F0]">{team.name}</p>
                              {profile ? (
                                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                                  <CheckIcon size={10} />
                                  {profile.provider ? `${profile.provider} — ` : ''}
                                  {Array.isArray(profile.columnMapping) ? profile.columnMapping.filter(m => m.platformField).length : 0} columns mapped
                                  · saved {profile.savedAt ? new Date(profile.savedAt).toLocaleDateString() : '—'}
                                </p>
                              ) : (
                                <p className="text-[10px] text-slate-400 mt-0.5">No profile configured — GPS data won't feed ACWR until set up</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              {profile && (
                                <button
                                  onClick={() => setGpsPreviewProfile(profile)}
                                  className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/25 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 dark:bg-emerald-900/35 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 transition-all"
                                >
                                  Rename Cols
                                </button>
                              )}
                              <button
                                onClick={() => setGpsConfigTarget({ teamId: team.id, teamName: team.name })}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                  profile
                                    ? 'bg-slate-100 hover:bg-slate-200 dark:hover:bg-[#1A2D48] text-slate-700 dark:text-[#CBD5E1]'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                                }`}
                              >
                                {profile ? 'Reconfigure' : 'Configure'}
                              </button>
                            </div>
                          </div>

                          {/* Data Source selector */}
                          <div className="px-4 pt-3 pb-3 border-t border-slate-200/60">
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                              <ActivityIcon size={10} className="text-indigo-400" /> Data Source
                            </label>
                            <div className="flex gap-2">
                              {[
                                { value: 'csv', label: 'CSV Import', desc: 'Upload GPS files manually' },
                                { value: 'polar', label: 'Polar Sync', desc: 'Pull from Polar AccessLink', disabled: !isPolarConnected },
                              ].map(opt => {
                                const selected = (gpsDataSources[team.id] || 'csv') === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    disabled={opt.disabled}
                                    onClick={() => handleSetGpsDataSource(team.id, opt.value as 'csv' | 'polar')}
                                    title={opt.disabled ? 'Connect Polar above to enable this option' : ''}
                                    className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg border text-left transition-all ${
                                      opt.disabled
                                        ? 'opacity-40 cursor-not-allowed border-slate-200 bg-slate-50'
                                        : selected
                                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-600 text-indigo-700'
                                          : 'border-slate-200 dark:border-[#243A58] bg-white dark:bg-[#1A2D48] hover:border-slate-300 dark:hover:border-[#2D4A6A] hover:bg-slate-50 dark:hover:bg-[#243A58] text-slate-700 dark:text-[#CBD5E1]'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold">{opt.label}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {(gpsDataSources[team.id] || 'csv') === 'polar' && isPolarConnected && (
                              <p className="text-[10px] text-indigo-600 dark:text-indigo-300 mt-1.5 flex items-center gap-1">
                                <CheckIcon size={9} /> GPS Data Hub will show a Sync Polar button for this team. CSV import remains available as a fallback.
                              </p>
                            )}
                          </div>

                          {/* ACWR column binding — always visible when profile exists */}
                          <div className={`px-4 pb-4 border-t border-slate-200/60 pt-3 ${!profile ? 'opacity-50 pointer-events-none' : ''}`}>
                            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                              <GaugeIcon size={10} className="text-indigo-400" /> ACWR Load Column
                            </label>
                            {!profile ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg">
                                <span className="text-xs text-slate-400 italic">Configure profile first to bind an ACWR column</span>
                              </div>
                            ) : gpsColumns.length === 0 ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                                <AlertTriangleIcon size={12} className="text-amber-400 shrink-0" />
                                <span className="text-xs text-amber-600">Profile has no column mappings — click Reconfigure above</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <CustomSelect
                                  value={profile.acwrColumn || ''}
                                  onChange={e => handleUpdateAcwrColumn(team.id, e.target.value)}
                                  variant="form"
                                  placeholder="— Select load column —"
                                >
                                  <option value="">— Select load column —</option>
                                  {gpsColumns.map(m => (
                                    <option key={m.csvColumn} value={m.csvColumn}>
                                      {m.displayName || m.csvColumn}
                                    </option>
                                  ))}
                                </CustomSelect>
                                {profile.acwrColumn && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 flex items-center gap-1 whitespace-nowrap">
                                    <CheckIcon size={10} /> Bound
                                  </span>
                                )}
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1.5">
                              The selected GPS column's value is used as the daily training load for ACWR calculations on import.
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Session Categories divider ── */}
                <div className="border-t border-slate-200 pt-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <TagIcon size={11} /> Session Categories
                  </h4>
                  <GpsCategoryManager />
                </div>
              </div>
            </CollapsibleSection>
            )}

          </>
        )}

        {/* ── ACCOUNT TAB ───────────────────────────────────────────── */}
        {activeTab === 'account' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Account</h2>
              <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Your profile, organisation and session management.</p>
            </div>

            {/* Profile Section */}
            <CollapsibleSection id="profile" icon={UserIcon} title="Profile"
              subtitle="Name, organisation, contact details"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-4">
                <div ref={nameRef}>
                  <label className={labelCls}>Full name <span className="text-red-500">*</span></label>
                  <input type="text" value={fullName}
                    onChange={e => { setFullName(e.target.value); clearFieldError('fullName'); setProfileMessage(null); setProfileError(null); }}
                    className={fieldErrors.fullName ? inputErrorCls : inputCls} placeholder="Alex Smith" />
                  {fieldErrors.fullName && <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>}
                </div>
                <div ref={orgRef}>
                  <label className={labelCls}>Organisation <span className="text-red-500">*</span></label>
                  <input type="text" value={organization}
                    onChange={e => { setOrganization(e.target.value); clearFieldError('organization'); setProfileMessage(null); setProfileError(null); }}
                    className={fieldErrors.organization ? inputErrorCls : inputCls} placeholder="City FC / Elite Academy" />
                  {fieldErrors.organization && <p className="text-red-500 text-xs mt-1">{fieldErrors.organization}</p>}
                </div>
                <div>
                  <label className={labelCls}>Phone number <span className="text-slate-400 font-normal">(optional)</span></label>
                  <input type="tel" value={phone}
                    onChange={e => { setPhone(e.target.value); setProfileMessage(null); setProfileError(null); }}
                    className={inputCls} placeholder="+44 7700 000000" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input type="email" value={user?.email || ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                  <p className="text-[11px] text-slate-400 mt-1">To change your sign-in email, use the <strong>Change email</strong> section below.</p>
                </div>
                {profileError && <div className="bg-red-50 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2.5"><p className="text-red-600 text-xs font-medium">{profileError}</p></div>}
                <button onClick={handleSaveProfile} disabled={profileSaving || !profileDirty}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    profileDirty ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                  }`}>
                  <SaveIcon size={14} />
                  {profileSaving ? 'Saving...' : profileDirty ? 'Save Profile' : 'No changes'}
                </button>
              </div>
            </CollapsibleSection>

            {/* Change password */}
            <CollapsibleSection id="change-password" icon={KeyIcon} title="Change password"
              subtitle="Set a new password — you stay signed in"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>New password</label>
                  <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className={inputCls} placeholder="Min 8 characters" autoComplete="new-password" />
                </div>
                <div>
                  <label className={labelCls}>Confirm new password</label>
                  <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)}
                    className={inputCls} placeholder="Repeat new password" autoComplete="new-password" />
                </div>
                <button onClick={handleChangePassword}
                  disabled={pwSaving || !newPassword || !confirmNewPassword}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    pwSaving || !newPassword || !confirmNewPassword
                      ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}>
                  <KeyIcon size={14} />
                  {pwSaving ? 'Updating…' : 'Update password'}
                </button>
                <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] leading-relaxed">
                  A confirmation email will be sent from <strong>noreply@sentinelsportslab.com</strong> letting you know your password changed.
                  If you didn't make this change, contact <a href="mailto:support@sentinelsportslab.com" className="text-indigo-600 hover:underline">support@sentinelsportslab.com</a> immediately.
                </p>
              </div>
            </CollapsibleSection>

            {/* Change email */}
            <CollapsibleSection id="change-email" icon={MailIcon} title="Change email"
              subtitle="Update your sign-in email — confirmation required"
              openSections={openSections} setOpenSections={setOpenSections}>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Current email</label>
                  <input type="email" value={user?.email || ''} disabled
                    className={`${inputCls} opacity-50 cursor-not-allowed`} />
                </div>
                <div>
                  <label className={labelCls}>New email</label>
                  <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailConfirmSent(false); }}
                    className={inputCls} placeholder="new-email@example.com" autoComplete="email" />
                </div>
                {emailConfirmSent ? (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-3 py-3">
                    <p className="text-[12px] text-emerald-700 dark:text-emerald-300 font-medium">
                      Confirmation link sent to <strong>{newEmail}</strong>. Click the link in that inbox to complete the change. Until you do, your current email stays active.
                    </p>
                  </div>
                ) : (
                  <button onClick={handleChangeEmail}
                    disabled={emailSaving || !newEmail.trim()}
                    className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                      emailSaving || !newEmail.trim()
                        ? 'bg-slate-100 dark:bg-[#1A2D48] text-slate-400 dark:text-[#475569] border border-slate-200 dark:border-[#243A58] cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}>
                    <MailIcon size={14} />
                    {emailSaving ? 'Sending…' : 'Send confirmation link'}
                  </button>
                )}
                <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] leading-relaxed">
                  We'll send a confirmation link to the new email address. Your sign-in email only changes once you click that link.
                  Both your old and new inboxes will receive a security notification when the change completes.
                </p>
              </div>
            </CollapsibleSection>

            {/* Security — always visible, not collapsible */}
            <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-600 rounded-xl flex items-center justify-center text-indigo-600 dark:text-white text-sm font-bold">
                  {(user?.user_metadata?.full_name || user?.email || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-[#E2E8F0]">{user?.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-400 dark:text-[#CBD5E1]">{user?.email}</p>
                </div>
              </div>
              <button onClick={signOut}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 dark:bg-rose-600 hover:bg-rose-100 dark:hover:bg-rose-500 text-rose-600 dark:text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors border border-rose-200 dark:border-rose-500/50">
                <LogOutIcon size={14} /> Sign out
              </button>
            </div>
          </>
        )}

        {/* ── ORGANISATION TAB (Phase C) ───────────────────────────── */}
        {activeTab === 'organisation' && (
          <>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0]">Organisation</h2>
                <p className="text-xs text-slate-400 dark:text-[#CBD5E1] mt-0.5">Plan, seat usage, team members. Admin-only sections are marked.</p>
              </div>
              {currentUserRole && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                  isOrgAdmin
                    ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40'
                    : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1] border border-slate-200 dark:border-[#243A58]'
                }`}>
                  Your role: {currentUserRole}
                </span>
              )}
            </div>

            {!currentOrg ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl px-5 py-4 text-sm text-amber-800 dark:text-amber-300">
                Organisation details are still loading. If this persists, sign out and back in.
              </div>
            ) : (
              <>
                {/* Plan + seat usage tile */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1] mb-1">Subscription tier</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">
                        {tierLabel[currentOrg.tier] || currentOrg.tier}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-1 capitalize">
                        Status: {currentOrg.subscription_status || 'active'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1] mb-1">Seat usage</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-[#E2E8F0]">
                        {seatUsage} <span className="text-slate-400 dark:text-[#CBD5E1] text-base font-medium">/ {seatCap}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-[#CBD5E1] mt-1">
                        {orgInvitations.length > 0
                          ? `${orgMembers.length} active, ${orgInvitations.length} pending invitation${orgInvitations.length === 1 ? '' : 's'}`
                          : `${orgMembers.length} active`}
                      </p>
                    </div>
                  </div>
                  {seatUsage >= seatCap && (
                    <div className="mt-4 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
                      You're at your seat cap. Upgrade your tier to add more team members.
                    </div>
                  )}
                </div>

                {/* Org name editor (admin only) */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1] mb-2">Organisation name</p>
                  {isOrgAdmin ? (
                    <div className="flex items-stretch gap-2">
                      <input
                        type="text"
                        value={orgNameDraft}
                        onChange={(e) => setOrgNameDraft(e.target.value)}
                        className="flex-1 min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        maxLength={120}
                      />
                      <button
                        onClick={handleSaveOrgName}
                        disabled={orgNameSaving || !orgNameDraft.trim() || orgNameDraft.trim() === currentOrg.name}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {orgNameSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <p className="text-base font-semibold text-slate-700 dark:text-[#E2E8F0]">{currentOrg.name}</p>
                  )}
                </div>

                {/* Invite form (admin only) */}
                {isOrgAdmin && (
                  <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0] mb-3">Invite a member</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="alex@club.com"
                        disabled={inviteSending || atCap}
                        className="flex-1 min-w-0 px-3.5 py-2 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg text-sm text-slate-900 dark:text-[#E2E8F0] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                      />
                      <div className="sm:w-40">
                        <CustomSelect
                          value={inviteRole}
                          onChange={(e: any) => setInviteRole(e.target.value as 'admin' | 'member')}
                          disabled={inviteSending || atCap}
                          variant="form"
                          size="sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </CustomSelect>
                      </div>
                      <button
                        onClick={handleSendInvite}
                        disabled={inviteSending || atCap || !inviteEmail.trim()}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {inviteSending ? 'Creating…' : 'Create invite'}
                      </button>
                    </div>

                    {/* Pre-flight email status — shows existing-account + other-org conflicts before the admin commits */}
                    {inviteEmailCheck && !inviteSending && (
                      inviteEmailCheck.has_other_org && inviteEmailCheck.other_org_has_data ? (
                        <div className="mt-2.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                          <AlertCircleIcon size={14} className="text-rose-600 dark:text-rose-300 shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-rose-700 dark:text-rose-300 leading-relaxed">
                            <strong>This person is already a member of "{inviteEmailCheck.other_org_name}"</strong> which has athletes/training data.
                            They <strong>can't accept</strong> this invite until they leave that organisation first (multi-org membership isn't supported yet).
                            Either send the invite to a different email, or ask them to leave their current org before accepting.
                          </div>
                        </div>
                      ) : inviteEmailCheck.has_other_org ? (
                        <div className="mt-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                          <AlertCircleIcon size={14} className="text-amber-600 dark:text-amber-300 shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-amber-700 dark:text-amber-300 leading-relaxed">
                            This person already has an account in "{inviteEmailCheck.other_org_name}" but that org has no data, so accepting will silently migrate them to {currentOrg?.name || 'this org'}.
                          </div>
                        </div>
                      ) : inviteEmailCheck.user_exists ? (
                        <div className="mt-2.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-lg px-3 py-2 flex items-start gap-2">
                          <CheckCircleIcon size={14} className="text-emerald-600 dark:text-emerald-300 shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                            This person already has an account and isn't in any other organisation — invite should accept cleanly.
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 bg-slate-50 dark:bg-[#0F1C30] border border-slate-200 dark:border-[#243A58] rounded-lg px-3 py-2 flex items-start gap-2">
                          <MailIcon size={14} className="text-slate-500 dark:text-[#CBD5E1] shrink-0 mt-0.5" />
                          <div className="text-[11.5px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
                            No existing account for this email. They'll be prompted to sign up + set a password when they accept.
                            <span className="block mt-0.5 text-[10.5px] text-slate-500 dark:text-[#94A3B8]">
                              If they already use a different email for an existing account, send the invite to <em>that</em> email instead.
                            </span>
                          </div>
                        </div>
                      )
                    )}
                    {inviteEmailChecking && (
                      <p className="mt-2 text-[11px] text-slate-400 dark:text-[#94A3B8]">Checking email…</p>
                    )}

                    {atCap && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-2">
                        Seat cap reached. Upgrade your tier or revoke a pending invitation to add another member.
                      </p>
                    )}
                    {lastInviteLink && (
                      <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/40 rounded-lg">
                        <p className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">
                          Invitation link — copy and send to your invitee
                        </p>
                        <div className="flex items-stretch gap-2">
                          <input
                            type="text"
                            readOnly
                            value={lastInviteLink}
                            onFocus={(e) => e.currentTarget.select()}
                            className="flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-[#0F1C30] border border-indigo-200 dark:border-indigo-500/40 rounded-md text-[12px] text-slate-800 dark:text-[#E2E8F0] font-mono"
                          />
                          <button
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(lastInviteLink); showToast?.('Link copied'); }
                              catch { showToast?.('Copy failed — select and copy manually', 'error'); }
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[12px] font-semibold rounded-md transition-colors"
                          >
                            Copy
                          </button>
                        </div>
                        <p className="text-[10.5px] text-slate-500 dark:text-[#CBD5E1] mt-2">
                          The link expires in 7 days. Once they click it and sign in with the invited email, they'll join your organisation.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Members list */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">Team members</h3>
                  </div>
                  {orgListLoading ? (
                    <div className="px-5 py-8 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">Loading…</div>
                  ) : orgMembers.length === 0 ? (
                    <div className="px-5 py-8 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">No members found.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-[#243A58]">
                      {orgMembers.map((m) => {
                        const isSelf = m.user_id === user?.id;
                        const isBusy = memberActionBusy === m.member_id;
                        return (
                          <li key={m.member_id} className="px-5 py-3 flex items-center gap-3 flex-wrap">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                                {(m.full_name || m.email || '?')[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-[#E2E8F0] truncate flex items-center gap-2">
                                {m.full_name || m.email}
                                {isSelf && <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#CBD5E1]">You</span>}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] truncate">{m.email}</p>
                            </div>
                            <span className={`shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              m.role === 'admin'
                                ? 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-[#1A2D48] text-slate-600 dark:text-[#CBD5E1]'
                            }`}>
                              {m.role}
                            </span>
                            {isOrgAdmin && !isSelf && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                {m.role === 'member' && (
                                  <button
                                    onClick={() => handleChangeRole(m.member_id, 'admin', m.full_name || m.email)}
                                    disabled={isBusy}
                                    title="Make admin (alongside you)"
                                    className="text-[10.5px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                  >
                                    Make admin
                                  </button>
                                )}
                                {m.role === 'admin' && (
                                  <button
                                    onClick={() => handleChangeRole(m.member_id, 'member', m.full_name || m.email)}
                                    disabled={isBusy}
                                    title="Demote to member"
                                    className="text-[10.5px] font-semibold text-slate-600 dark:text-[#CBD5E1] bg-slate-100 dark:bg-[#1A2D48] hover:bg-slate-200 dark:hover:bg-[#243A58] px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                  >
                                    Demote
                                  </button>
                                )}
                                {m.role === 'member' && (
                                  <button
                                    onClick={() => handleTransferAdmin(m.member_id, m.full_name || m.email)}
                                    disabled={isBusy}
                                    title="Transfer your admin role to this member (you become member)"
                                    className="text-[10.5px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100 dark:hover:bg-amber-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                  >
                                    Transfer admin
                                  </button>
                                )}
                                <button
                                  onClick={() => handleRemoveMember(m.member_id, m.full_name || m.email)}
                                  disabled={isBusy}
                                  title="Remove from organisation"
                                  className="text-[10.5px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Pending invitations (only shown if any exist) */}
                {orgInvitations.length > 0 && (
                  <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">Pending invitations</h3>
                    </div>
                    <ul className="divide-y divide-slate-100 dark:divide-[#243A58]">
                      {orgInvitations.map((inv) => {
                        const isBusy = memberActionBusy === inv.id;
                        return (
                          <li key={inv.id} className="px-5 py-3 flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0] truncate">{inv.email}</p>
                              <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1]">
                                Expires {new Date(inv.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                            <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                              {inv.role}
                            </span>
                            {isOrgAdmin && (
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                disabled={isBusy}
                                className="shrink-0 text-[10.5px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 px-2.5 py-1 rounded-md disabled:opacity-50 transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Activity log */}
                <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-[#243A58]">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#E2E8F0]">Activity</h3>
                    <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">Audit log of organisation actions — invitations, role changes, removals.</p>
                  </div>
                  {auditLoading ? (
                    <div className="px-5 py-6 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">Loading…</div>
                  ) : auditLog.length === 0 ? (
                    <div className="px-5 py-6 text-center text-xs text-slate-400 dark:text-[#CBD5E1]">No activity yet.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-[#243A58] max-h-80 overflow-y-auto">
                      {auditLog.map((row) => {
                        const summary = (() => {
                          const target = row.target_email || 'member';
                          const fromR = row.metadata?.from;
                          const toR = row.metadata?.to;
                          switch (row.action) {
                            case 'org_renamed':       return `Organisation renamed${row.metadata?.from && row.metadata?.to ? ` (${row.metadata.from} → ${row.metadata.to})` : ''}`;
                            case 'invite_created':    return `Invited ${target} as ${row.metadata?.role || 'member'}`;
                            case 'invite_revoked':    return `Revoked invitation to ${target}`;
                            case 'invite_accepted':   return `${target} accepted invitation`;
                            case 'member_removed':    return `Removed ${target}`;
                            case 'role_changed':      return `Changed ${target}'s role${fromR && toR ? ` (${fromR} → ${toR})` : ''}`;
                            case 'admin_transferred': return `Transferred admin to ${target}`;
                            default:                  return row.action;
                          }
                        })();
                        return (
                          <li key={row.id} className="px-5 py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-800 dark:text-[#E2E8F0]">{summary}</p>
                              <p className="text-[10.5px] text-slate-400 dark:text-[#CBD5E1] mt-0.5">
                                by {row.actor_email || 'unknown'} · {new Date(row.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Footnote — what's coming next */}
                <p className="text-[11px] text-slate-400 dark:text-[#CBD5E1] mt-2">
                  Email-sending automation arrives once your support inbox is configured — for now, copy the invitation link and send it manually. Subscription / billing portal opens once Paystack is connected.
                </p>
              </>
            )}
          </>
        )}

        {/* ── WALKTHROUGH TAB ──────────────────────────────────────── */}
        {activeTab === 'walkthrough' && (
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
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
              >
                <RotateCcwIcon size={12} /> Reset all page tours
              </button>
            </div>
          </>
        )}

        {/* ── HELP & SUPPORT TAB ───────────────────────────────────── */}
        {activeTab === 'support' && (
          <SupportTab
            currentOrg={currentOrg}
            authUserEmail={user?.email}
            authUserName={user?.user_metadata?.full_name || ''}
            currentUserRole={currentUserRole}
            showToast={showToast}
          />
        )}
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={!!pendingTab}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onCancel={() => setPendingTab(null)}
      />

      {/* Confirm-action modal — styled replacement for the native window.confirm()
          dialogs we used to pop for revoke / remove / transfer-admin actions. */}
      {pendingConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setPendingConfirm(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-white dark:bg-[#132338] rounded-2xl shadow-2xl border border-slate-200 dark:border-[#243A58] p-6"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-[#E2E8F0] mb-2">{pendingConfirm.title}</h3>
            <p className="text-sm text-slate-600 dark:text-[#CBD5E1] leading-relaxed mb-5">{pendingConfirm.body}</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingConfirm(null)}
                className="px-4 py-2 border border-slate-200 dark:border-[#243A58] text-slate-700 dark:text-[#CBD5E1] text-sm font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-[#1A2D48] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const fn = pendingConfirm.onConfirm;
                  setPendingConfirm(null);
                  await fn();
                }}
                className={`px-4 py-2 text-white text-sm font-semibold rounded-lg transition-colors ${
                  pendingConfirm.confirmTone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {pendingConfirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GPS Config Modal */}
      {gpsConfigTarget && (
        <GpsConfigModal
          teamId={gpsConfigTarget.teamId}
          teamName={gpsConfigTarget.teamName}
          onClose={() => setGpsConfigTarget(null)}
          onSaved={() => { setGpsProfiles(loadGpsProfiles()); showToast?.('GPS profile saved', 'success'); }}
        />
      )}

      {/* GPS Column Rename Modal */}
      {gpsPreviewProfile && (
        <GpsColumnRenameModal
          profile={gpsPreviewProfile}
          onClose={() => setGpsPreviewProfile(null)}
          onSaved={() => { setGpsProfiles(loadGpsProfiles()); showToast?.('Column names updated', 'success'); setGpsPreviewProfile(null); }}
        />
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// Testing Hub Visibility Settings (unchanged logic, just no outer card)
// ══════════════════════════════════════════════════════════════════════

const TestingHubSettings: React.FC<{
  testVisibility: Record<string, boolean>;
  setTestVisibility: (v: Record<string, boolean>) => void;
}> = ({ testVisibility, setTestVisibility }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const isTestVisible = (testId: string) => testVisibility[testId] !== false;

  const toggleTest = (testId: string) => {
    setTestVisibility({ ...testVisibility, [testId]: !isTestVisible(testId) });
  };

  const toggleCategory = (categoryId: string) => {
    const tests = getTestsByCategory(categoryId as any);
    const allVisible = tests.every(t => isTestVisible(t.id));
    const next = { ...testVisibility };
    tests.forEach(t => { next[t.id] = !allVisible; });
    setTestVisibility(next);
  };

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId); else next.add(categoryId);
      return next;
    });
  };

  const totalTests = TEST_CATEGORIES.reduce((sum, c) => sum + getTestsByCategory(c.id as any).length, 0);
  const hiddenCount = Object.values(testVisibility).filter(v => v === false).length;

  return (
    <div className="space-y-2">
      {hiddenCount > 0 && (
        <p className="text-xs text-orange-500 font-medium mb-3">{hiddenCount} of {totalTests} tests hidden.</p>
      )}
      {TEST_CATEGORIES.map(cat => {
        const tests = getTestsByCategory(cat.id as any);
        const visibleCount = tests.filter(t => isTestVisible(t.id)).length;
        const allVisible = visibleCount === tests.length;
        const noneVisible = visibleCount === 0;
        const isExpanded = expandedCategories.has(cat.id);

        return (
          <div key={cat.id} className={`rounded-xl border transition-all ${noneVisible ? 'border-slate-200 bg-slate-50/50 dark:bg-[#132338]/40 opacity-60' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleCategory(cat.id)}
                className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${!noneVisible ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${!noneVisible ? 'left-4' : 'left-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(cat.id)}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${noneVisible ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-[#E2E8F0]'}`}>{cat.name}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    allVisible ? 'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600' : noneVisible ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600'
                  }`}>{visibleCount}/{tests.length}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{cat.description}</p>
              </div>
              <button onClick={() => toggleExpand(cat.id)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#1A2D48] rounded-lg transition-colors text-slate-400 shrink-0">
                {isExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
              </button>
            </div>
            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-2 space-y-0.5">
                {tests.map(test => {
                  const visible = isTestVisible(test.id);
                  return (
                    <div key={test.id} className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-all ${visible ? '' : 'opacity-50'}`}>
                      <span className={`text-xs font-medium ${visible ? 'text-slate-700 dark:text-[#CBD5E1]' : 'text-slate-400'}`}>{test.name}</span>
                      <button onClick={() => toggleTest(test.id)}
                        className={`w-9 h-5 rounded-full transition-all relative ${visible ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${visible ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SettingsPage;
