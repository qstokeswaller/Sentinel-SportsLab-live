import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import App from './App';
import LoginPage from './pages/LoginPage';
import PublicWellnessForm from './pages/PublicWellnessForm';
import FifaDailyWellnessForm from './pages/FifaDailyWellnessForm';
import FifaWeeklyWellnessForm from './pages/FifaWeeklyWellnessForm';
import PublicInjuryForm from './pages/PublicInjuryForm';
import PublicWorkoutView from './pages/PublicWorkoutView';
import PublicProtocolView from './pages/PublicProtocolView';
import PublicDataHubView from './pages/PublicDataHubView';
import PublicAthleteSharePage from './pages/PublicAthleteSharePage';
import PublicTestSharePage from './pages/PublicTestSharePage';
import PublicConditioningSharePage from './pages/PublicConditioningSharePage';
import LandingPage from './pages/LandingPage';
import PolarCallbackPage from './pages/PolarCallbackPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import DataProcessingPage from './pages/DataProcessingPage';
import ContactPage from './pages/ContactPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import { isInstalledApp } from './utils/appMode';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest">Loading</p>
        </div>
      </div>
    );
  }

  // In the installed app, unauthenticated users go to sign-in — the
  // marketing landing page is a browser-only surface.
  if (!user) return <Navigate to={isInstalledApp() ? '/login' : '/'} replace />;
  return <>{children}</>;
};

const PENDING_INVITE_KEY = 'sentinel_pending_invite_token';

/**
 * Returns the pending invite token from localStorage (set by AcceptInvitePage
 * when an unauthenticated user lands on the magic link). Cleared once the user
 * lands back on /accept-invite/:token by AcceptInvitePage itself.
 */
const readPendingInviteToken = (): string | null => {
  try { return localStorage.getItem(PENDING_INVITE_KEY); } catch { return null; }
};

const AppRouter: React.FC = () => {
  const { user, loading, needsPasswordUpdate } = useAuth();

  // If the user arrived via a password-recovery link, show the update-password form
  if (needsPasswordUpdate && user) {
    return <LoginPage forceMode="update-password" />;
  }

  // POST-SIGN-IN INVITE RESUME — if the user just signed in/up and there's a
  // pending invite token in localStorage (stashed by AcceptInvitePage before
  // we sent them to login/signup), bounce them back to /accept-invite/:token
  // instead of /dashboard so the invitation actually gets accepted. Without this
  // every new-user signup via an invite link gets orphaned into an empty org.
  const pendingInviteToken = user && !loading ? readPendingInviteToken() : null;

  return (
    <Routes>
      {/* PUBLIC FORM ROUTES — must be first and completely independent of auth */}
      <Route path="/wellness-form/:templateId/:teamId" element={<PublicWellnessForm />} />
      <Route path="/daily-wellness/:teamId" element={<FifaDailyWellnessForm />} />
      <Route path="/weekly-wellness/:teamId/:athleteId" element={<FifaWeeklyWellnessForm />} />
      <Route path="/weekly-wellness/:teamId" element={<FifaWeeklyWellnessForm />} />
      <Route path="/injury-form/:teamId" element={<PublicInjuryForm />} />
      <Route path="/injury-form/:teamId/:athleteId" element={<PublicInjuryForm />} />
      <Route path="/workout/:workoutType/:workoutId" element={<PublicWorkoutView />} />
      <Route path="/protocol/:protocolId" element={<PublicProtocolView />} />
      <Route path="/data-hub/snapshot/:snapshotId" element={<PublicDataHubView />} />
      <Route path="/athlete-share/:shareId" element={<PublicAthleteSharePage />} />
      <Route path="/test-share/:shareId" element={<PublicTestSharePage />} />
      <Route path="/session-share/:shareId" element={<PublicConditioningSharePage />} />

      {/* POLAR OAUTH CALLBACK — public route, handles redirect from Polar */}
      <Route path="/polar/callback" element={<PolarCallbackPage />} />

      {/* LEGAL + CONTACT — public, no auth required */}
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="/data-processing" element={<DataProcessingPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* INVITATION ACCEPT — public landing for /accept-invite/:token magic links.
          Auth-aware: if signed in with matching email, accepts immediately;
          otherwise prompts to sign in/up with the invited email. */}
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />

      {/* AUTH ROUTES */}
      <Route
        path="/"
        element={loading ? null : user ? (pendingInviteToken ? <Navigate to={`/accept-invite/${pendingInviteToken}`} replace /> : <Navigate to="/dashboard" replace />) : (isInstalledApp() ? <Navigate to="/login" replace /> : <LandingPage />)}
      />
      <Route
        path="/login"
        element={loading ? null : user ? (pendingInviteToken ? <Navigate to={`/accept-invite/${pendingInviteToken}`} replace /> : <Navigate to="/dashboard" replace />) : <LoginPage />}
      />

      {/* APP CATCH-ALL */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

export default AppRouter;
