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
import SettingsFeatures from './settings/SettingsFeatures';
import SettingsOrganisation from './settings/SettingsOrganisation';
import SettingsWalkthrough from './settings/SettingsWalkthrough';
import SettingsSupport from './settings/SettingsSupport';
import SettingsAccount from './settings/SettingsAccount';
import { CollapsibleSection, inputCls, inputErrorCls, labelCls, GPS_META_NAMES } from './settings/shared';


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
          <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:hover:bg-[#1A2D48] flex items-center justify-center text-slate-500 transition-colors">
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
        // The email endpoint requires proof the caller is a signed-in org admin
        // (same rule the DB enforces for creating the invitation itself).
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        const emailRes = await fetch('/api/send-org-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
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
    // Pass type via OAuth state param so callback knows which type was used.
    // The random nonce is verified on return (standard CSRF protection) so a
    // crafted callback link can't complete a connection this user never started.
    const nonce = crypto.randomUUID();
    try { sessionStorage.setItem('polar_oauth_nonce', nonce); } catch {}
    const state = encodeURIComponent(JSON.stringify({ type, nonce }));
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
      <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-[#243A58]/60">
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
        <div className="pt-2 border-t border-slate-100 dark:border-[#1A2D48]">
          <label className={labelCls}>Recalculate From Date</label>
          <p className="text-[10px] text-slate-400 dark:text-[#94A3B8] mb-2">Historical data is kept. EWMA restarts from this date. Leave blank to use all data.</p>
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
        {activeTab === 'features' && <SettingsFeatures {...{ acwrDirty, allGpsProfiles, currentOrg, draftAcwrSettings, getSettings, gpsDataSources, handleConnectPolar, handleDisconnectPolar, handleSaveAcwr, handleSetGpsDataSource, handleUpdateAcwrColumn, isPolarConnected, name, openSections, polarIntegration, polarType, renderAcwrOptions, setAcwrDirty, setDraftAcwrSettings, setGpsConfigTarget, setGpsPreviewProfile, setOpenSections, setTestVisibility, teams, testVisibility, updateSettings }} />}

        {/* ── ACCOUNT TAB ───────────────────────────────────────────── */}
        {activeTab === 'account' && <SettingsAccount {...{ clearFieldError, confirmNewPassword, emailConfirmSent, emailSaving, fieldErrors, fullName, handleChangeEmail, handleChangePassword, handleSaveProfile, name, nameRef, newEmail, newPassword, openSections, orgRef, organization, phone, profileDirty, profileError, profileSaving, pwSaving, setConfirmNewPassword, setEmailConfirmSent, setFullName, setNewEmail, setNewPassword, setOpenSections, setOrganization, setPhone, setProfileError, signOut, user }} />}

        {/* ── ORGANISATION TAB (Phase C) ───────────────────────────── */}
        {activeTab === 'organisation' && <SettingsOrganisation {...{ atCap, auditLoading, auditLog, currentOrg, currentUserRole, handleChangeRole, handleRemoveMember, handleRevokeInvite, handleSaveOrgName, handleSendInvite, handleTransferAdmin, inviteEmail, inviteEmailCheck, inviteEmailChecking, inviteRole, inviteSending, isOrgAdmin, lastInviteLink, memberActionBusy, name, orgInvitations, orgListLoading, orgMembers, orgNameDraft, orgNameSaving, seatCap, seatUsage, setInviteEmail, setInviteRole, setOrgNameDraft, showToast, tierLabel, user }} />}

        {/* ── WALKTHROUGH TAB ──────────────────────────────────────── */}
        {activeTab === 'walkthrough' && <SettingsWalkthrough {...{ replayOnboarding, name, navigate, openSections, setOpenSections, setTourState, showToast, tourState, user }} />}

        {/* ── HELP & SUPPORT TAB ───────────────────────────────────── */}
        {activeTab === 'support' && <SettingsSupport {...{ currentOrg, currentUserRole, showToast, user }} />}
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

export default SettingsPage;
