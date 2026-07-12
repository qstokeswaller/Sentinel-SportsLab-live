// @ts-nocheck — LEGACY: references the pre-organisation 'clubs' table / 'club_id' column which no longer exist in the DB — the club path would fail at runtime. Page is orphaned (nothing navigates to /onboarding). Needs a product decision: delete or rebuild for orgs.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { ActivityIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AccountType = 'individual' | 'club' | null;

const OnboardingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AccountType>(null);
  const [clubName, setClubName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubNameError, setClubNameError] = useState(false);

  const handleContinue = async () => {
    if (!selected || !user) return;
    if (selected === 'club' && !clubName.trim()) {
      setError('Please enter your club name.');
      setClubNameError(true);
      return;
    }
    setClubNameError(false);

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
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F1C30] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/images/sentinel-sportslab-logo.png" alt="Sentinel SportsLab" className="h-12 w-auto shrink-0 select-none" />
          <span className="font-bold text-slate-900 dark:text-[#E2E8F0]">
            Sentinel <span className="text-indigo-600 dark:text-indigo-300">SportsLab</span>
          </span>
        </div>

        <div className="bg-white dark:bg-[#132338] border border-slate-200 dark:border-[#243A58] rounded-xl p-7 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-[#E2E8F0] mb-1">How are you using Sentinel SportsLab?</h2>
          <p className="text-sm text-slate-500 dark:text-[#CBD5E1] mb-6">This determines how your data is organised.</p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {/* Individual */}
            <button
              onClick={() => setSelected('individual')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                selected === 'individual'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] hover:border-slate-300'
              }`}
            >
              <div className="text-xl mb-2.5">🏃</div>
              <p className="text-slate-900 dark:text-[#E2E8F0] font-semibold text-sm mb-1">Individual Coach</p>
              <p className="text-slate-500 dark:text-[#CBD5E1] text-xs leading-relaxed">
                Personal coaching practice. Manage your own athletes directly.
              </p>
            </button>

            {/* Club */}
            <button
              onClick={() => setSelected('club')}
              className={`p-5 rounded-xl border-2 text-left transition-all ${
                selected === 'club'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-200 dark:border-[#243A58] bg-slate-50 dark:bg-[#0F1C30] hover:border-slate-300'
              }`}
            >
              <div className="text-xl mb-2.5">🏟️</div>
              <p className="text-slate-900 dark:text-[#E2E8F0] font-semibold text-sm mb-1">Club / Organisation</p>
              <p className="text-slate-500 dark:text-[#CBD5E1] text-xs leading-relaxed">
                Multi-coach setup. Invite staff and manage multiple squads.
              </p>
            </button>
          </div>

          {/* Club name input */}
          {selected === 'club' && (
            <div className="mb-5">
              <label className="text-xs font-medium text-slate-600 dark:text-[#CBD5E1] block mb-1.5">
                Club / Organisation name
              </label>
              <input
                type="text"
                value={clubName}
                onChange={e => { setClubName(e.target.value); setClubNameError(false); setError(null); }}
                className={`w-full bg-slate-50 dark:bg-[#0F1C30] rounded-lg px-3 py-2.5 text-sm text-slate-900 dark:text-[#E2E8F0] placeholder-slate-400 dark:placeholder-[#64748B] focus:outline-none focus:ring-2 transition-colors ${
                  clubNameError
                    ? 'border-2 border-red-400 focus:ring-red-500/20 focus:border-red-400'
                    : 'border border-slate-200 dark:border-[#243A58] focus:ring-indigo-500/20 focus:border-indigo-400'
                }`}
                placeholder="e.g. Northside FC"
                autoFocus
              />
              {clubNameError && <p className="text-red-500 text-xs mt-1">Please enter your club name.</p>}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2.5 mb-4">
              <p className="text-red-600 text-xs font-medium">{error}</p>
            </div>
          )}

          <Button
            onClick={handleContinue}
            disabled={!selected || loading}
            className="w-full"
            size="lg"
          >
            {loading ? 'Setting up...' : 'Continue to Sentinel SportsLab'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;