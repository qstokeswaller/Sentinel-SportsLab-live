import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LogRocket from 'logrocket';
import * as Sentry from '@sentry/react';
import './styles.css';

LogRocket.init('wpqus2/sentinel-sportslab');

Sentry.init({
  dsn: 'https://d1d86d480a3412765e032fb28641b95b@o4511249541431296.ingest.de.sentry.io/4511249566203984',
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost'],
  replaysSessionSampleRate: 0,      // LogRocket handles normal session replay
  replaysOnErrorSampleRate: 1.0,    // Sentry captures replay on errors
  enableLogs: true,
});
import { AuthProvider } from './context/AuthContext';
import { AppStateProvider } from './context/AppStateContext';
import ErrorBoundary from './components/ErrorBoundary';
import AppRouter from './Router';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <AuthProvider>
            <AppStateProvider>
              <AppRouter />
            </AppStateProvider>
          </AuthProvider>
        </ErrorBoundary>
      </QueryClientProvider>
    </BrowserRouter>
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
);
