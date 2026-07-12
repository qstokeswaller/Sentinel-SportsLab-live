/// <reference types="vite/client" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import './styles.css';

// Audit fix 13 (2026-07-12): in production, silence debug output so internal
// messages (occasionally including data) aren't readable in every user's
// browser console. Real errors still use console.error and reach Sentry.
// During local development everything logs as normal.
if (!import.meta.env.DEV) {
  console.log = () => {};
  console.debug = () => {};
  console.warn = () => {};
}

// Monitoring stack (audit fix 9, 2026-07-12): LogRocket removed — PostHog
// covers product analytics/replay and Sentry covers errors. One less ~300KB
// SDK in the critical bundle.
posthog.init('phc_vRxXGZt75W53r3539DQ2ani9DqmckdmMwYF43AVpzhuQ', {
  api_host: 'https://us.i.posthog.com',
  defaults: '2026-01-30',
});

Sentry.init({
  dsn: 'https://d1d86d480a3412765e032fb28641b95b@o4511249541431296.ingest.de.sentry.io/4511249566203984',
  sendDefaultPii: true,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost'],
  replaysSessionSampleRate: 0,      // no always-on replay — Sentry captures replay on errors only
  replaysOnErrorSampleRate: 1.0,
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
