import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import App from './App';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import PublicWellnessForm from './pages/PublicWellnessForm';
import PublicInjuryForm from './pages/PublicInjuryForm';
import PublicWorkoutView from './pages/PublicWorkoutView';
import PublicProtocolView from './pages/PublicProtocolView';

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

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? null : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/wellness-form/:templateId/:teamId" element={<PublicWellnessForm />} />
      <Route path="/injury-form/:teamId" element={<PublicInjuryForm />} />
      <Route path="/injury-form/:teamId/:athleteId" element={<PublicInjuryForm />} />
      <Route path="/workout/:workoutType/:workoutId" element={<PublicWorkoutView />} />
      <Route path="/protocol/:protocolId" element={<PublicProtocolView />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
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
