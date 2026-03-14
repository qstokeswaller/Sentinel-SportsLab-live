import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ActivityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';

type Mode = 'signin' | 'signup' | 'reset' | 'update-password';

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors";
const labelCls = "text-xs font-medium text-slate-600 block mb-1.5";

const LoginPage: React.FC<{ forceMode?: 'update-password' }> = ({ forceMode }) => {
  const { clearPasswordUpdate } = useAuth();
  const [mode, setMode] = useState<Mode>(forceMode ?? 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const switchMode = (m: Mode) => { setMode(m); setError(null); setMessage(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const siteUrl = (import.meta as any).env?.VITE_SITE_URL || window.location.origin;

    if (mode === 'update-password') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); setLoading(false); return; }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setError(error.message);
      else {
        setMessage('Password updated successfully! Redirecting…');
        clearPasswordUpdate();
      }
    } else if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === 'signup') {
      if (!fullName.trim()) { setError('Please enter your full name.'); setLoading(false); return; }
      if (!organization.trim()) { setError('Please enter your organisation.'); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: siteUrl,
          data: {
            full_name: fullName.trim(),
            organization: organization.trim(),
            phone: phone.trim() || null,
          },
        },
      });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account, then sign in.');
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: siteUrl });
      if (error) setError(error.message);
      else setMessage('Password reset link sent — check your email.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
            <ActivityIcon className="text-white w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900">
            Sentinel <span className="text-indigo-600">SportsLab</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            {mode === 'signin' && 'Sign in'}
            {mode === 'signup' && 'Create account'}
            {mode === 'reset' && 'Reset password'}
            {mode === 'update-password' && 'Set new password'}
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            {mode === 'signin' && 'Welcome back — enter your details below.'}
            {mode === 'signup' && 'Tell us about yourself to get started.'}
            {mode === 'reset' && "We'll send a reset link to your email."}
            {mode === 'update-password' && 'Enter your new password below.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Signup-only profile fields */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className={labelCls}>Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="Alex Smith"
                  />
                </div>
                <div>
                  <label className={labelCls}>Organisation</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="City FC / Elite Academy"
                  />
                </div>
                <div>
                  <label className={labelCls}>
                    Phone number <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className={inputCls}
                    placeholder="+44 7700 000000"
                  />
                </div>
              </>
            )}

            {mode !== 'update-password' && (
              <div>
                <label className={labelCls}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={inputCls}
                  placeholder="coach@club.com"
                />
              </div>
            )}

            {mode !== 'reset' && (
              <div>
                <label className={labelCls}>{mode === 'update-password' ? 'New password' : 'Password'}</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
            )}

            {mode === 'update-password' && (
              <div>
                <label className={labelCls}>Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </div>
            )}

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

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading
                ? 'Please wait...'
                : mode === 'signin' ? 'Sign in'
                : mode === 'signup' ? 'Create account'
                : mode === 'update-password' ? 'Update password'
                : 'Send reset link'}
            </Button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 space-y-2.5 text-center">
            {mode === 'signin' && (
              <>
                <button onClick={() => switchMode('signup')} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors block w-full">
                  Create a new account
                </button>
                <button onClick={() => switchMode('reset')} className="text-slate-500 hover:text-slate-700 text-sm transition-colors block w-full">
                  Forgot password?
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <button onClick={() => switchMode('signin')} className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
