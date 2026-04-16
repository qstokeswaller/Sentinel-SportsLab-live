import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import App from './App';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import PublicWellnessForm from './pages/PublicWellnessForm';
import FifaDailyWellnessForm from './pages/FifaDailyWellnessForm';
import FifaWeeklyWellnessForm from './pages/FifaWeeklyWellnessForm';
import PublicInjuryForm from './pages/PublicInjuryForm';
import PublicWorkoutView from './pages/PublicWorkoutView';
import PublicProtocolView from './pages/PublicProtocolView';
import LandingPage from './pages/LandingPage';

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

  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  const { user, loading, needsPasswordUpdate } = useAuth();

  // If the user arrived via a password-recovery link, show the update-password form
  if (needsPasswordUpdate && user) {
    return <LoginPage forceMode="update-password" />;
  }

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

      {/* AUTH ROUTES */}
      <Route
        path="/"
        element={loading ? null : user ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />
      <Route
        path="/login"
        element={loading ? null : user ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
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
