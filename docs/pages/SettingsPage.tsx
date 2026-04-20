// @ts-nocheck
// v7
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppStateContext';
import {
  SaveIcon, LogOutIcon, UserIcon, SettingsIcon,
  GaugeIcon, UsersIcon, ToggleLeftIcon, ToggleRightIcon,
  SlidersHorizontalIcon, ShieldIcon, ChevronRightIcon,
  FlaskConicalIcon, ChevronDownIcon, ChevronUpIcon, AlertTriangleIcon,
  MapIcon, CheckCircleIcon, CircleIcon, PlayIcon, RotateCcwIcon, LayoutGridIcon,
  ActivityIcon, TagIcon, CheckIcon, LinkIcon, XIcon,
} from 'lucide-react';
import { ACWR_METRIC_TYPES } from '../utils/constants';
import { TEST_CATEGORIES, getTestsByCategory } from '../utils/testRegistry';
import { PAGE_TOURS, WORKFLOW_TOURS, getDefaultTourState } from '../utils/tourSteps';
import { SupabaseStorageService as StorageService } from '../services/storageService';
import { GpsConfigModal, GpsCategoryManager, loadGpsProfiles, saveGpsProfiles, getProfileForTeam } from '../components/performance/GpsConfigModal';
import type { GpsTeamProfile } from '../components/performance/GpsConfigModal';

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
const inputErrorCls = "w-full bg-slate-50 border-2 border-red-400 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors";
const labelCls = "text-xs font-medium text-slate-600 block mb-1.5";

const METHOD_OPTIONS = Object.entries(ACWR_METRIC_TYPES).map(([id, info]: [string, any]) => ({
  id, label: info.label, desc: info.desc,
}));

const DEFAULT_TEAM_SETTINGS = { enabled: false, method: 'sprint_distance', acuteWindow: 7, chronicWindow: 28, freezeRestDays: true, sprintThreshold: 25 };

const SETTINGS_TABS = [
  { id: 'account',     label: 'Account',          icon: ShieldIcon,           desc: 'Profile, security' },
  { id: 'features',   label: 'Feature Settings',  icon: SlidersHorizontalIcon,desc: 'ACWR, Heatmap, Testing, GPS' },
  { id: 'walkthrough',label: 'Walkthrough',        icon: MapIcon,              desc: 'Page tours' },
];

// ── Collapsible Section wrapper ──────────────────────────────────────
const CollapsibleSection = ({ id, icon: Icon, title, subtitle, defaultOpen = true, children, collapsedSections, setCollapsedSections }) => {
  const isOpen = !collapsedSections.has(id);
  const toggle = () => setCollapsedSections(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      <button onClick={toggle} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors">
        {Icon && <Icon size={15} className="text-indigo-500 shrink-0" />}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
          {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className={`text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`}>
          <ChevronDownIcon size={16} />
        </div>
      </button>
      {isOpen && <div className="px-5 pb-5 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
};

// ── Unsaved Changes Modal ────────────────────────────────────────────
const UnsavedChangesModal = ({ isOpen, onSave, onDiscard, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
            <AlertTriangleIcon size={20} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Unsaved Changes</h3>
            <p className="text-xs text-slate-400">You have unsaved changes that will be lost.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onDiscard} className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">Discard</button>
          <button onClick={onSave} className="flex-1 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Save & Continue</button>
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
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Column Display Names — {profile.teamName}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">{visible.length} columns · CSV import name (left) → how it appears in GPS Hub (right)</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors">
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
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors bg-slate-50 text-slate-900"
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <p className="text-[10px] text-slate-400">Changes apply immediately in GPS Hub after saving.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">Save Names</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════
// Main Settings Page
// ══════════════════════════════════════════════════════════════════════

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { teams, acwrSettings, setAcwrSettings, acwrRecalcAnchors, setAcwrRecalcAnchors, testVisibility, setTestVisibility, tourState, setTourState, showToast, gpsProfiles, setGpsProfiles, polarIntegration, setPolarIntegration, gpsDataSources, setGpsDataSources } = useAppState();
  const [activeTab, setActiveTab] = useState('account');
  // All sections start collapsed (GPS sections also collapsed by default)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['acwr', 'testing', 'heatmap_settings', 'profile', 'gps_config']));

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
    const url = `https://flow.polar.com/oauth2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
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
          <select value={s.method} onChange={e => updateSettings(key, { method: e.target.value })} className={inputCls}>
            {METHOD_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>EWMA Window</label>
            <div className="flex gap-1.5">
              {([['7_28', '7/28d'], ['3_21', '3/21d']] as const).map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => updateSettings(key, { acuteWindow: val === '7_28' ? 7 : 3, chronicWindow: val === '7_28' ? 28 : 21 })}
                  className={`flex-1 text-xs font-medium py-2 rounded-lg border transition-all ${
                    s.acuteWindow === (val === '7_28' ? 7 : 3) ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'
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
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-500'
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
                className="px-3 py-2 text-xs text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors"
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
    <div className="flex gap-6 max-w-4xl mx-auto py-6 px-4 min-h-[calc(100vh-80px)]">
      {/* Sidebar */}
      <div className="w-56 shrink-0">
        <div className="sticky top-6 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <SettingsIcon size={14} className="text-white" />
            </div>
            <h1 className="text-sm font-bold text-slate-900">Settings</h1>
          </div>

          {SETTINGS_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} data-tour={`settings-${tab.id}`} onClick={() => handleTabSwitch(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                    : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                }`}
              >
                <tab.icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium block ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>{tab.label}</span>
                  <span className="text-[10px] text-slate-400 block truncate">{tab.desc}</span>
                </div>
                {isActive && <ChevronRightIcon size={12} className="text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* ── FEATURE SETTINGS TAB ──────────────────────────────────── */}
        {activeTab === 'features' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Feature Settings</h2>
              <p className="text-xs text-slate-400 mt-0.5">Configure platform features for your teams and athletes.</p>
            </div>

            {/* ACWR Section */}
            <CollapsibleSection id="acwr" icon={GaugeIcon} title="ACWR Monitoring"
              subtitle="Enable/disable ACWR and choose load method per team"
              collapsedSections={collapsedSections} setCollapsedSections={setCollapsedSections}>

              <div className="bg-slate-800 text-white p-4 rounded-xl mb-5">
                <h4 className="text-xs font-semibold text-emerald-400 mb-1.5">EWMA Model Reference</h4>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
                  ACWR uses Exponentially Weighted Moving Averages (Williams et al. 2017). Acute = 7d, Chronic = 28d default.
                  sRPE = RPE x Duration (Foster et al. 1998). Rest days freeze EWMA (Menaspa 2017). Sprint threshold 25 km/h for elite football (Bowen et al. 2017).
                </p>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /> &lt;0.8 Undertrained</span>
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
                        <div key={key} className={`rounded-xl border p-4 transition-all ${s.enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-[10px] font-bold">
                                {team.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-900">{team.name}</span>
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
                          <div key={key} className={`rounded-xl border p-4 transition-all ${s.enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 text-[10px] font-bold">
                                  {athlete.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-slate-900">{athlete.name}</span>
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
                  acwrDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}>
                <SaveIcon size={14} />
                {acwrDirty ? 'Save ACWR Settings' : 'No changes'}
              </button>
            </CollapsibleSection>

            {/* Readiness Heatmap Section */}
            <CollapsibleSection id="heatmap_settings" icon={LayoutGridIcon} title="Readiness Heatmap"
              subtitle="Set the default team shown on the dashboard heatmap"
              collapsedSections={collapsedSections} setCollapsedSections={setCollapsedSections}>
              <div className="space-y-3">
                <p className="text-xs text-slate-500">Choose which team is displayed by default when you open the dashboard, or prompt to select each time.</p>
                <div>
                  <label className={labelCls}>Default team</label>
                  <select
                    value={draftAcwrSettings._heatmapDefault || 'All Teams'}
                    onChange={e => { setDraftAcwrSettings(prev => ({ ...prev, _heatmapDefault: e.target.value })); setAcwrDirty(true); }}
                    className={inputCls}
                  >
                    <option value="All Teams">All Teams</option>
                    <option value="prompt">Prompt on open</option>
                    {teams.filter(t => t.id !== 't_private').map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={handleSaveAcwr} disabled={!acwrDirty}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    acwrDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}>
                  <SaveIcon size={14} />
                  {acwrDirty ? 'Save Settings' : 'No changes'}
                </button>
              </div>
            </CollapsibleSection>

            {/* Testing Hub Section */}
            <CollapsibleSection id="testing" icon={FlaskConicalIcon} title="Testing Hub"
              subtitle="Show or hide test categories and individual tests"
              collapsedSections={collapsedSections} setCollapsedSections={setCollapsedSections}>
              <TestingHubSettings testVisibility={testVisibility} setTestVisibility={setTestVisibility} />
            </CollapsibleSection>

            {/* GPS Configuration (Import Profiles + ACWR Column + Session Categories) */}
            <CollapsibleSection
              id="gps_config" icon={LinkIcon}
              title="GPS Configuration"
              subtitle="Import profiles, ACWR column binding, and session categories"
              collapsedSections={collapsedSections} setCollapsedSections={setCollapsedSections}
            >
              <div className="space-y-4">

                {/* ── Polar Connection Status ── */}
                <div className={`rounded-xl border px-4 py-3.5 flex items-center gap-4 ${isPolarConnected ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isPolarConnected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <ActivityIcon size={16} className={isPolarConnected ? 'text-emerald-600' : 'text-slate-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Polar AccessLink</p>
                    {isPolarConnected ? (
                      <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
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
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-all"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleConnectPolar('team_pro')}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all whitespace-nowrap"
                        >
                          Team Pro
                        </button>
                        <button
                          onClick={() => handleConnectPolar('individual')}
                          className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all whitespace-nowrap"
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
                        <div key={team.id} className={`rounded-xl border transition-all ${profile ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200 bg-slate-50/50'}`}>
                          {/* Header row */}
                          <div
                            onClick={() => profile && setGpsPreviewProfile(profile)}
                            className={`flex items-center gap-4 px-4 py-3.5 ${profile ? 'hover:bg-emerald-50/40 cursor-pointer' : ''} rounded-t-xl transition-all`}
                          >
                            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 text-[10px] font-bold shrink-0">
                              {team.name?.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900">{team.name}</p>
                              {profile ? (
                                <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
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
                                  className="px-3 py-2 rounded-lg text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all"
                                >
                                  Rename Cols
                                </button>
                              )}
                              <button
                                onClick={() => setGpsConfigTarget({ teamId: team.id, teamName: team.name })}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                  profile
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
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
                                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                                    }`}
                                  >
                                    <span className="text-xs font-semibold">{opt.label}</span>
                                    <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                            {(gpsDataSources[team.id] || 'csv') === 'polar' && isPolarConnected && (
                              <p className="text-[10px] text-indigo-600 mt-1.5 flex items-center gap-1">
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
                              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                <AlertTriangleIcon size={12} className="text-amber-400 shrink-0" />
                                <span className="text-xs text-amber-600">Profile has no column mappings — click Reconfigure above</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <select
                                  value={profile.acwrColumn || ''}
                                  onChange={e => handleUpdateAcwrColumn(team.id, e.target.value)}
                                  className={inputCls}
                                >
                                  <option value="">— Select load column —</option>
                                  {gpsColumns.map(m => (
                                    <option key={m.csvColumn} value={m.csvColumn}>
                                      {m.displayName || m.csvColumn}
                                    </option>
                                  ))}
                                </select>
                                {profile.acwrColumn && (
                                  <span className="text-[10px] text-emerald-600 font-medium shrink-0 flex items-center gap-1 whitespace-nowrap">
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

          </>
        )}

        {/* ── ACCOUNT TAB ───────────────────────────────────────────── */}
        {activeTab === 'account' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Account</h2>
              <p className="text-xs text-slate-400 mt-0.5">Your profile, organisation and session management.</p>
            </div>

            {/* Profile Section */}
            <CollapsibleSection id="profile" icon={UserIcon} title="Profile"
              subtitle="Name, organisation, contact details"
              collapsedSections={collapsedSections} setCollapsedSections={setCollapsedSections}>
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
                  <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed here.</p>
                </div>
                {profileError && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5"><p className="text-red-600 text-xs font-medium">{profileError}</p></div>}
                <button onClick={handleSaveProfile} disabled={profileSaving || !profileDirty}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
                    profileDirty ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}>
                  <SaveIcon size={14} />
                  {profileSaving ? 'Saving...' : profileDirty ? 'Save Profile' : 'No changes'}
                </button>
              </div>
            </CollapsibleSection>

            {/* Security — always visible, not collapsible */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-sm font-bold">
                  {(user?.user_metadata?.full_name || user?.email || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{user?.user_metadata?.full_name || 'User'}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <button onClick={signOut}
                className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors border border-rose-200">
                <LogOutIcon size={14} /> Sign out
              </button>
            </div>
          </>
        )}

        {/* ── WALKTHROUGH TAB ──────────────────────────────────────── */}
        {activeTab === 'walkthrough' && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Walkthrough</h2>
              <p className="text-xs text-slate-400 mt-0.5">Page-by-page guided tours of the platform. Start, resume, or reset tours for each section.</p>
            </div>

            {/* Page Tours */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">Page Tours</h3>
              {PAGE_TOURS.map(tour => {
                const status = tourState?.[tour.pageId] || 'pending';
                const isCompleted = status === 'completed';
                const isSkipped = status === 'skipped';
                const workflowsForPage = WORKFLOW_TOURS.filter(wf => wf.parentPageId === tour.pageId);

                return (
                  <div key={tour.pageId} className="space-y-1">
                    <div className={`bg-white border rounded-xl p-4 flex items-center justify-between transition-all ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        {isCompleted ? (
                          <CheckCircleIcon size={18} className="text-emerald-500 shrink-0" />
                        ) : (
                          <CircleIcon size={18} className="text-slate-300 shrink-0" />
                        )}
                        <div>
                          <span className={`text-sm font-medium ${isCompleted ? 'text-emerald-700' : 'text-slate-800'}`}>{tour.pageName}</span>
                          <span className="text-[10px] text-slate-400 ml-2">{tour.steps.length} step{tour.steps.length !== 1 ? 's' : ''}</span>
                          {isSkipped && <span className="text-[10px] text-amber-500 font-medium ml-2">Skipped</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCompleted && (
                          <button
                            onClick={() => {
                              const updated = { ...tourState, [tour.pageId]: 'pending' };
                              setTourState(updated);
                              StorageService.saveTourState(updated);
                              showToast?.(`${tour.pageName} tour reset`);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition-colors"
                          >
                            <RotateCcwIcon size={12} /> Reset
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const updated = { ...tourState, [tour.pageId]: 'pending' };
                            setTourState(updated);
                            StorageService.saveTourState(updated);
                            navigate(tour.route);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <PlayIcon size={12} /> {isCompleted ? 'Restart' : isSkipped ? 'Resume' : 'Start Tour'}
                        </button>
                      </div>
                    </div>

                    {/* Workflow tours under this page */}
                    {workflowsForPage.map(wf => {
                      const wfStatus = tourState?.[wf.id] || 'pending';
                      const wfCompleted = wfStatus === 'completed';
                      const wfSkipped = wfStatus === 'skipped';
                      return (
                        <div key={wf.id} className={`ml-8 bg-white border rounded-lg px-3 py-2.5 flex items-center justify-between transition-all ${wfCompleted ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-100'}`}>
                          <div className="flex items-center gap-2.5">
                            {wfCompleted ? (
                              <CheckCircleIcon size={14} className="text-emerald-400 shrink-0" />
                            ) : (
                              <CircleIcon size={14} className="text-slate-200 shrink-0" />
                            )}
                            <div>
                              <span className={`text-xs font-medium ${wfCompleted ? 'text-emerald-600' : 'text-slate-600'}`}>{wf.name}</span>
                              <span className="text-[9px] text-slate-300 ml-1.5">{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
                              {wfSkipped && <span className="text-[9px] text-amber-400 font-medium ml-1.5">Skipped</span>}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const updated = { ...tourState, [wf.id]: 'pending' };
                              setTourState(updated);
                              StorageService.saveTourState(updated);
                              showToast?.(`${wf.name} reset`);
                              navigate(PAGE_TOURS.find(p => p.pageId === wf.parentPageId)?.route || '/');
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-md text-[10px] font-medium transition-colors"
                          >
                            <RotateCcwIcon size={10} /> Reset
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Reset All */}
            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const fresh = getDefaultTourState();
                  setTourState(fresh);
                  StorageService.saveTourState(fresh);
                  showToast?.('All tours reset');
                }}
                className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
              >
                <RotateCcwIcon size={12} /> Reset all tours
              </button>
            </div>
          </>
        )}
      </div>

      {/* Unsaved Changes Modal */}
      <UnsavedChangesModal
        isOpen={!!pendingTab}
        onSave={handleUnsavedSave}
        onDiscard={handleUnsavedDiscard}
        onCancel={() => setPendingTab(null)}
      />

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
          <div key={cat.id} className={`rounded-xl border transition-all ${noneVisible ? 'border-slate-200 bg-slate-50/50 opacity-60' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
              <button onClick={() => toggleCategory(cat.id)}
                className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${!noneVisible ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${!noneVisible ? 'left-4' : 'left-0.5'}`} />
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(cat.id)}>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${noneVisible ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{cat.name}</span>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                    allVisible ? 'bg-emerald-50 text-emerald-600' : noneVisible ? 'bg-slate-100 text-slate-400' : 'bg-amber-50 text-amber-600'
                  }`}>{visibleCount}/{tests.length}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{cat.description}</p>
              </div>
              <button onClick={() => toggleExpand(cat.id)}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 shrink-0">
                {isExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
              </button>
            </div>
            {isExpanded && (
              <div className="border-t border-slate-100 px-4 py-2 space-y-0.5">
                {tests.map(test => {
                  const visible = isTestVisible(test.id);
                  return (
                    <div key={test.id} className={`flex items-center justify-between py-1.5 px-2 rounded-lg transition-all ${visible ? '' : 'opacity-50'}`}>
                      <span className={`text-xs font-medium ${visible ? 'text-slate-700' : 'text-slate-400'}`}>{test.name}</span>
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
