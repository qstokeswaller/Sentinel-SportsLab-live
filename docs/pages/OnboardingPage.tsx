import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type AccountType = 'individual' | 'club' | null;

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AccountType>(null);
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    if (!selected || !user) return;
    if (selected === 'club' && !clubName.trim()) {
      setError('Please enter your club name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (selected === 'club') {
        // Create the club row
        const { data: club, error: clubErr } = await supabase
          .from('clubs')
          .insert({ name: clubName.trim() })
          .select()
          .single();
        if (clubErr) throw clubErr;

        // Write user_profiles row linking this user to their club
        const { error: profileErr } = await supabase
          .from('user_profiles')
          .upsert({ id: user!.id, club_id: club.id, account_type: 'club', role: 'coach' });
        if (profileErr) throw profileErr;

        // Store in auth metadata as well (for quick access without a DB round-trip)
        await supabase.auth.updateUser({
          data: { account_type: 'club', club_id: club.id, onboarded: true }
        });
      } else {
        // Individual coaches get their own personal club so RLS rules work consistently
        const emailName = user!.email?.split('@')[0] ?? 'My';
        const { data: club, error: clubErr } = await supabase
          .from('clubs')
          .insert({ name: `${emailName}'s Coaching Practice` })
          .select()
          .single();
        if (clubErr) throw clubErr;

        // Write user_profiles row
        const { error: profileErr } = await supabase
          .from('user_profiles')
          .upsert({ id: user!.id, club_id: club.id, account_type: 'individual', role: 'coach' });
        if (profileErr) throw profileErr;

        await supabase.auth.updateUser({
          data: { account_type: 'individual', club_id: club.id, onboarded: true }
        });
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M4 16 L16 4 L28 16 L16 28 Z" stroke="#06b6d4" strokeWidth="2" fill="none" />
              <path d="M10 16 L16 10 L22 16 L16 22 Z" fill="#06b6d4" opacity="0.4" />
            </svg>
            <span className="text-2xl font-black text-slate-900 uppercase tracking-tighter">trainerOS</span>
          </div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Setup</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-xl">
          <h2 className="text-slate-900 font-black uppercase tracking-tight text-lg mb-1">How are you using TrainerOS?</h2>
          <p className="text-slate-500 text-xs font-medium mb-8">This determines how your data is organised</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Individual */}
            <button
              onClick={() => setSelected('individual')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${selected === 'individual'
                  ? 'border-cyan-500 bg-cyan-50/50'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
            >
              <div className="text-2xl mb-3">🏃</div>
              <p className="text-slate-900 font-black uppercase tracking-tight text-sm mb-1">Individual Coach</p>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                Personal coaching practice. Manage your own athletes directly.
              </p>
            </button>

            {/* Club */}
            <button
              onClick={() => setSelected('club')}
              className={`p-6 rounded-2xl border-2 text-left transition-all ${selected === 'club'
                  ? 'border-cyan-500 bg-cyan-50/50'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                }`}
            >
              <div className="text-2xl mb-3">🏟️</div>
              <p className="text-slate-900 font-black uppercase tracking-tight text-sm mb-1">Club / Organisation</p>
              <p className="text-slate-500 text-xs font-medium leading-relaxed">
                Multi-coach setup. Invite staff and manage multiple squads.
              </p>
            </button>
          </div>

          {/* Club name input */}
          {selected === 'club' && (
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">
                Club / Organisation Name
              </label>
              <input
                type="text"
                value={clubName}
                onChange={e => setClubName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="e.g. Northside FC"
                autoFocus
              />
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <p className="text-red-400 text-xs font-medium">{error}</p>
            </div>
          )}

          <button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black uppercase tracking-widest text-[11px] py-4 rounded-xl transition-colors"
          >
            {loading ? 'Setting up...' : 'Continue to TrainerOS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
