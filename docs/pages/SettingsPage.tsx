import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ActivityIcon, SaveIcon, LogOutIcon, UserIcon, BuildingIcon, PhoneIcon, MailIcon } from 'lucide-react';

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

  useEffect(() => {
    if (user?.user_metadata) {
      setFullName(user.user_metadata.full_name || '');
      setOrganization(user.user_metadata.organization || '');
      setPhone(user.user_metadata.phone || '');
    }
  }, [user]);

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
