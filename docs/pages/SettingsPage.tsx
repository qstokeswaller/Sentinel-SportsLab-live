import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAppState } from '../context/AppStateContext';
import {
  ActivityIcon, SaveIcon, LogOutIcon, UserIcon, SettingsIcon,
  GaugeIcon, CheckIcon, UsersIcon, ToggleLeftIcon, ToggleRightIcon,
  SlidersHorizontalIcon, ShieldIcon, ChevronRightIcon,
} from 'lucide-react';
import { ACWR_METRIC_TYPES } from '../utils/constants';

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
const inputErrorCls = "w-full bg-slate-50 border-2 border-red-400 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors";
const labelCls = "text-xs font-medium text-slate-600 block mb-1.5";

const METHOD_OPTIONS = Object.entries(ACWR_METRIC_TYPES).map(([id, info]: [string, any]) => ({
  id, label: info.label, desc: info.desc,
}));

const DEFAULT_TEAM_SETTINGS = { enabled: false, method: 'sprint_distance', acuteWindow: 7, chronicWindow: 28, freezeRestDays: true, sprintThreshold: 25 };

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: UserIcon, desc: 'Name, organisation, contact' },
  { id: 'features', label: 'Feature Settings', icon: SlidersHorizontalIcon, desc: 'ACWR monitoring, modules' },
  { id: 'account', label: 'Account', icon: ShieldIcon, desc: 'Sign out, security' },
];

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();
  const { teams, acwrSettings, setAcwrSettings, showToast } = useAppState();
  const [activeSection, setActiveSection] = useState('profile');

  // Local draft of ACWR settings — only committed on Save
  const [draftAcwrSettings, setDraftAcwrSettings] = useState<Record<string, any>>(acwrSettings || {});
  const [acwrDirty, setAcwrDirty] = useState(false);
  const [acwrSaved, setAcwrSaved] = useState(false);

  // Sync draft when global settings change externally
  useEffect(() => {
    if (!acwrDirty) setDraftAcwrSettings(acwrSettings || {});
  }, [acwrSettings]);

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.user_metadata) {
      setFullName(user.user_metadata.full_name || '');
      setOrganization(user.user_metadata.organization || '');
      setPhone(user.user_metadata.phone || '');
    }
  }, [user]);

  const getSettings = (key: string) => {
    return draftAcwrSettings[key] || { ...DEFAULT_TEAM_SETTINGS };
  };

  const updateSettings = (key: string, patch: Record<string, any>) => {
    setDraftAcwrSettings(prev => ({
      ...prev,
      [key]: { ...DEFAULT_TEAM_SETTINGS, ...prev[key], ...patch },
    }));
    setAcwrDirty(true);
    setAcwrSaved(false);
  };

  const handleSaveAcwrSettings = () => {
    setAcwrSettings(draftAcwrSettings);
    setAcwrDirty(false);
    setAcwrSaved(true);
    showToast?.('ACWR settings saved');
    setTimeout(() => setAcwrSaved(false), 3000);
  };

  const clearFieldError = (field: string) => setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required.';
    if (!organization.trim()) errors.organization = 'Organisation is required.';
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      const firstRef = errors.fullName ? nameRef : orgRef;
      firstRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFieldErrors({});
    setSaving(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        organization: organization.trim(),
        phone: phone.trim() || null,
      },
    });
    setSaving(false);
    if (error) setError(error.message);
    else setMessage('Profile updated successfully.');
  };

  // ── Profile Section ─────────────────────────────────────────────────
  const renderProfile = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <p className="text-xs text-slate-400 mt-0.5">Your personal and organisation details.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div ref={nameRef}>
            <label className={labelCls}>Full name <span className="text-red-500">*</span></label>
            <input type="text" value={fullName}
              onChange={e => { setFullName(e.target.value); clearFieldError('fullName'); setMessage(null); setError(null); }}
              className={fieldErrors.fullName ? inputErrorCls : inputCls} placeholder="Alex Smith" />
            {fieldErrors.fullName && <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>}
          </div>
          <div ref={orgRef}>
            <label className={labelCls}>Organisation <span className="text-red-500">*</span></label>
            <input type="text" value={organization}
              onChange={e => { setOrganization(e.target.value); clearFieldError('organization'); setMessage(null); setError(null); }}
              className={fieldErrors.organization ? inputErrorCls : inputCls} placeholder="City FC / Elite Academy" />
            {fieldErrors.organization && <p className="text-red-500 text-xs mt-1">{fieldErrors.organization}</p>}
          </div>
          <div>
            <label className={labelCls}>Phone number <span className="text-slate-400 font-normal">(optional)</span></label>
            <input type="tel" value={phone}
              onChange={e => { setPhone(e.target.value); setMessage(null); setError(null); }}
              className={inputCls} placeholder="+44 7700 000000" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={user?.email || ''} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
            <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed here.</p>
          </div>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5"><p className="text-red-600 text-xs font-medium">{error}</p></div>}
          {message && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5"><p className="text-emerald-700 text-xs font-medium">{message}</p></div>}
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors">
            <SaveIcon size={14} />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );

  // Shared ACWR option controls (method, window, rest days, sprint threshold)
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
      </div>
    );
  };

  // ── Feature Settings Section ────────────────────────────────────────
  const renderFeatureSettings = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Feature Settings</h2>
        <p className="text-xs text-slate-400 mt-0.5">Configure platform features for your teams and athletes.</p>
      </div>

      {/* ACWR Monitoring */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <GaugeIcon size={14} className="text-indigo-500" />
          ACWR Monitoring
        </h3>
        <p className="text-xs text-slate-400 mb-5">Enable/disable ACWR monitoring and choose the load method per team. These settings lock the input method in the ACWR hub to prevent accidental changes.</p>

        {/* Regular Teams (not Private Clients) */}
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

        {/* Private Clients — each athlete individually */}
        {(() => {
          const privateTeam = teams.find(t => t.id === 't_private');
          const privateClients = privateTeam?.players || [];
          if (privateClients.length === 0) return null;
          return (
            <div className="mb-5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <UserIcon size={12} /> Private Clients
              </h4>
              <p className="text-[10px] text-slate-400 mb-3">Each private client can have their own ACWR method and settings.</p>
              <div className="space-y-3">
                {privateClients.map(athlete => {
                  const key = `ind_${athlete.id}`;
                  const s = getSettings(key);
                  const initials = athlete.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={key} className={`rounded-xl border p-4 transition-all ${s.enabled ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200 bg-slate-50/50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-200 rounded-lg flex items-center justify-center text-slate-600 text-[10px] font-bold">
                            {initials}
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

        <p className="text-[10px] text-slate-400 mt-4 mb-4 italic">Default: Sprint Distance for teams, sRPE for private clients. Freeze rest days recommended (Menaspà 2017).</p>

        {acwrSaved && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 mb-3">
            <p className="text-emerald-700 text-xs font-medium">ACWR settings saved successfully.</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveAcwrSettings}
          disabled={!acwrDirty}
          className={`w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors ${
            acwrDirty
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          <SaveIcon size={14} />
          {acwrDirty ? 'Save ACWR Settings' : 'No changes to save'}
        </button>
      </div>

      {/* EWMA Model Reference */}
      <div className="bg-slate-800 text-white p-5 rounded-xl shadow-sm">
        <h4 className="text-sm font-semibold text-emerald-400 mb-2">EWMA Model — Acute:Chronic Workload Ratio</h4>
        <p className="text-xs text-slate-300 leading-relaxed mb-3">
          ACWR is calculated using Exponentially Weighted Moving Averages (Williams et al. 2017). Acute window default = 7 days, Chronic window default = 28 days.
          sRPE = RPE × Duration in minutes (Foster et al. 1998). Rest days freeze EWMA to prevent false spikes (Menaspà 2017). Sprint threshold default 25 km/h for elite football (Bowen et al. 2017).
        </p>
        <div className="flex flex-wrap gap-3 text-[10px]">
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-sky-400" /> &lt;0.8 Undertrained</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /> 0.8–1.3 Optimal</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /> 1.31–1.5 Caution</span>
          <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-400" /> &gt;1.5 Danger (2-4× injury risk)</span>
        </div>
      </div>

      {/* Placeholder for future feature settings */}
      <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-5 text-center">
        <SlidersHorizontalIcon size={20} className="mx-auto text-slate-300 mb-2" />
        <p className="text-xs text-slate-400">More feature settings coming soon — GPS auto-feed, wellness composite scores, periodization integration.</p>
      </div>
    </div>
  );

  // ── Account Section ─────────────────────────────────────────────────
  const renderAccount = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Account</h2>
        <p className="text-xs text-slate-400 mt-0.5">Security and session management.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-sm font-bold">
            {(user?.user_metadata?.full_name || user?.email || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{user?.user_metadata?.full_name || 'User'}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-5">
          <button onClick={signOut}
            className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors border border-rose-200">
            <LogOutIcon size={14} />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex gap-6 max-w-4xl mx-auto py-6 px-4 min-h-[calc(100vh-80px)]">
      {/* Settings sidebar */}
      <div className="w-56 shrink-0">
        <div className="sticky top-6 space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 mb-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <SettingsIcon size={14} className="text-white" />
            </div>
            <h1 className="text-sm font-bold text-slate-900">Settings</h1>
          </div>

          {SETTINGS_SECTIONS.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button key={section.id} onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                    : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                }`}
              >
                <section.icon size={16} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                <div className="flex-1 min-w-0">
                  <span className={`text-sm font-medium block ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>{section.label}</span>
                  <span className="text-[10px] text-slate-400 block truncate">{section.desc}</span>
                </div>
                {isActive && <ChevronRightIcon size={12} className="text-indigo-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {activeSection === 'profile' && renderProfile()}
        {activeSection === 'features' && renderFeatureSettings()}
        {activeSection === 'account' && renderAccount()}
      </div>
    </div>
  );
};

export default SettingsPage;
