import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'reset';

const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      // On success, AuthContext detects the session change and Router redirects to /
    } else if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account, then sign in.');
    } else if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) setError(error.message);
      else setMessage('Password reset link sent — check your email.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 16 L16 4 L28 16 L16 28 Z" stroke="#06b6d4" strokeWidth="2" fill="none" />
              <path d="M10 16 L16 10 L22 16 L16 22 Z" fill="#06b6d4" opacity="0.4" />
            </svg>
            <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">trainerOS</span>
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">S&C Terminal</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl">
          <h2 className="text-slate-900 font-black uppercase tracking-tight text-lg mb-1">
            {mode === 'signin' && 'Sign In'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="text-slate-500 text-xs font-medium mb-8">
            {mode === 'signin' && 'Access your coaching terminal'}
            {mode === 'signup' && 'Start your free TrainerOS account'}
            {mode === 'reset' && 'We\'ll send a reset link to your email'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="coach@club.com"
              />
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
                <p className="text-emerald-400 text-xs font-medium">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-colors"
            >
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          {/* Mode switchers */}
          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3 text-center">
            {mode === 'signin' && (
              <>
                <button onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                  className="text-cyan-500 hover:text-cyan-400 text-xs font-bold uppercase tracking-widest transition-colors block w-full">
                  Create a new account
                </button>
                <button onClick={() => { setMode('reset'); setError(null); setMessage(null); }}
                  className="text-slate-500 hover:text-slate-400 text-xs font-medium transition-colors block w-full">
                  Forgot password?
                </button>
              </>
            )}
            {(mode === 'signup' || mode === 'reset') && (
              <button onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                className="text-cyan-500 hover:text-cyan-400 text-xs font-bold uppercase tracking-widest transition-colors">
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
