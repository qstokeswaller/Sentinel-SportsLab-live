import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ActivityIcon, SaveIcon, LogOutIcon, UserIcon, BuildingIcon, PhoneIcon, MailIcon, GaugeIcon, CheckIcon } from 'lucide-react';

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
const inputErrorCls = "w-full bg-slate-50 border-2 border-red-400 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-colors";
const labelCls = "text-xs font-medium text-slate-600 block mb-1.5";

const SettingsPage: React.FC = () => {
  const { user, signOut } = useAuth();

  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);

  // ACWR Preferences
  const [acwrMetrics, setAcwrMetrics] = useState<string[]>(['srpe', 'sprint_distance']);
  const [acwrWindow, setAcwrWindow] = useState<'7_28' | '3_21'>('7_28');
  const [restDayHandling, setRestDayHandling] = useState<'freeze' | 'decay'>('freeze');
  const [sprintThreshold, setSprintThreshold] = useState(25);
  const [savingAcwr, setSavingAcwr] = useState(false);
  const [acwrMessage, setAcwrMessage] = useState<string | null>(null);

  const METRIC_OPTIONS = [
    { id: 'srpe', label: 'Session RPE (sRPE)', desc: 'RPE × Duration — universal' },
    { id: 'sprint_distance', label: 'Sprint Distance', desc: 'Metres above speed threshold' },
    { id: 'total_distance', label: 'Total Distance', desc: 'Total metres per session' },
    { id: 'tonnage', label: 'Tonnage', desc: 'Sets × Reps × Weight (kg)' },
    { id: 'duration', label: 'Training Duration', desc: 'Session minutes' },
    { id: 'trimp', label: 'TRIMP', desc: 'HR-zone weighted duration' },
    { id: 'player_load', label: 'PlayerLoad', desc: 'Accelerometer load (AU)' },
  ];

  useEffect(() => {
    if (user?.user_metadata) {
      setFullName(user.user_metadata.full_name || '');
      setOrganization(user.user_metadata.organization || '');
      setPhone(user.user_metadata.phone || '');
      // Load ACWR prefs
      if (user.user_metadata.acwr_metrics) setAcwrMetrics(user.user_metadata.acwr_metrics);
      if (user.user_metadata.acwr_window) setAcwrWindow(user.user_metadata.acwr_window);
      if (user.user_metadata.rest_day_handling) setRestDayHandling(user.user_metadata.rest_day_handling);
      if (user.user_metadata.sprint_threshold) setSprintThreshold(user.user_metadata.sprint_threshold);
    }
  }, [user]);

  const toggleMetric = (id: string) => {
    setAcwrMetrics(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
    setAcwrMessage(null);
  };

  const handleSaveAcwr = async () => {
    setSavingAcwr(true);
    setAcwrMessage(null);
    const { error: err } = await supabase.auth.updateUser({
      data: { acwr_metrics: acwrMetrics, acwr_window: acwrWindow, rest_day_handling: restDayHandling, sprint_threshold: sprintThreshold },
    });
    setSavingAcwr(false);
    if (err) setAcwrMessage('Failed to save ACWR preferences.');
    else setAcwrMessage('ACWR preferences saved.');
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

  return (
    <div className="max-w-lg mx-auto py-8 px-4">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
          <ActivityIcon className="text-white w-4 h-4" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">Settings</h1>
          <p className="text-xs text-slate-400">Manage your profile and account</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-5 flex items-center gap-2">
          <UserIcon size={14} className="text-slate-400" />
          Profile
        </h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div ref={nameRef}>
            <label className={labelCls}>Full name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={fullName}
              onChange={e => { setFullName(e.target.value); clearFieldError('fullName'); setMessage(null); setError(null); }}
              className={fieldErrors.fullName ? inputErrorCls : inputCls}
              placeholder="Alex Smith"
            />
            {fieldErrors.fullName && <p className="text-red-500 text-xs mt-1">{fieldErrors.fullName}</p>}
          </div>

          <div ref={orgRef}>
            <label className={labelCls}>Organisation <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={organization}
              onChange={e => { setOrganization(e.target.value); clearFieldError('organization'); setMessage(null); setError(null); }}
              className={fieldErrors.organization ? inputErrorCls : inputCls}
              placeholder="City FC / Elite Academy"
            />
            {fieldErrors.organization && <p className="text-red-500 text-xs mt-1">{fieldErrors.organization}</p>}
          </div>

          <div>
            <label className={labelCls}>
              Phone number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setMessage(null); setError(null); }}
              className={inputCls}
              placeholder="+44 7700 000000"
            />
          </div>

          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className={`${inputCls} opacity-50 cursor-not-allowed`}
            />
            <p className="text-[11px] text-slate-400 mt-1">Email cannot be changed here.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}
          {message && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5">
              <p className="text-emerald-700 text-xs font-medium">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
          >
            <SaveIcon size={14} />
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>

      {/* ACWR Preferences Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
          <GaugeIcon size={14} className="text-slate-400" />
          ACWR Monitoring Preferences
        </h2>
        <p className="text-xs text-slate-400 mb-5">Configure which load metrics to track and how EWMA is calculated.</p>

        {/* Metric checkboxes */}
        <div className="mb-5">
          <label className={labelCls}>Tracked Metrics</label>
          <div className="grid grid-cols-1 gap-2">
            {METRIC_OPTIONS.map(opt => {
              const active = acwrMetrics.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleMetric(opt.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                    active
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
                    active ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}>
                    {active && <CheckIcon size={12} className="text-white" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-slate-900">{opt.label}</span>
                    <span className="text-xs text-slate-400 ml-2">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* EWMA Window */}
        <div className="mb-5">
          <label className={labelCls}>EWMA Window</label>
          <div className="flex gap-2">
            {([['7_28', '7 / 28 days'], ['3_21', '3 / 21 days']] as const).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => { setAcwrWindow(val); setAcwrMessage(null); }}
                className={`flex-1 text-sm font-medium py-2.5 rounded-lg border transition-all ${
                  acwrWindow === val
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">7/28 is more reliable for most team sports.</p>
        </div>

        {/* Rest Day Handling */}
        <div className="mb-5">
          <label className={labelCls}>Rest Day Handling</label>
          <div className="flex gap-2">
            {([['freeze', 'Freeze EWMA'], ['decay', 'Allow Decay']] as const).map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => { setRestDayHandling(val); setAcwrMessage(null); }}
                className={`flex-1 text-sm font-medium py-2.5 rounded-lg border transition-all ${
                  restDayHandling === val
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Freeze prevents false ACWR spikes after rest days (Menaspa 2017).</p>
        </div>

        {/* Sprint Threshold */}
        <div className="mb-5">
          <label className={labelCls}>Sprint Speed Threshold (km/h)</label>
          <input
            type="number"
            min={15}
            max={35}
            step={0.5}
            value={sprintThreshold}
            onChange={e => { setSprintThreshold(Number(e.target.value)); setAcwrMessage(null); }}
            className={inputCls}
          />
          <p className="text-[11px] text-slate-400 mt-1">Default 25 km/h for elite football (Bowen et al. 2017). Adjust for your sport.</p>
        </div>

        {acwrMessage && (
          <div className={`rounded-lg px-3 py-2.5 mb-4 ${acwrMessage.includes('Failed') ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className={`text-xs font-medium ${acwrMessage.includes('Failed') ? 'text-red-600' : 'text-emerald-700'}`}>{acwrMessage}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSaveAcwr}
          disabled={savingAcwr}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
        >
          <SaveIcon size={14} />
          {savingAcwr ? 'Saving...' : 'Save ACWR Preferences'}
        </button>
      </div>

      {/* Sign Out Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Account</h2>
        <p className="text-xs text-slate-400 mb-5">Signed in as {user?.email}</p>
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors border border-rose-200"
        >
          <LogOutIcon size={14} />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
