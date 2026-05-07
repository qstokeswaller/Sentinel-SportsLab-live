# Error Tracking & Performance Monitoring — Implementation Plan

## Context
When the platform goes live, errors like the roster page crash (DeleteModal undefined) need to be detected automatically without users having to report them. This plan covers setting up frontend error tracking, performance monitoring, and alerting — similar to Grafana dashboards in DevOps but for the SaaS frontend.

## Recommended Stack

### Primary: Sentry (Free Tier)
- **Cost:** Free — 5K errors/mo, 1 user, 30-day retention
- **Upgrade:** Team $26/mo for 50K errors + unlimited users when needed
- **Why Sentry:** Industry standard, best error grouping, native Linear/GitHub/Slack integrations, React Error Boundary, Vite source map plugin

### What it captures automatically (no user action needed)
| Signal | How it works |
|---|---|
| JavaScript errors | Global error handlers (`window.onerror`, `unhandledrejection`) |
| React render crashes | Sentry `<ErrorBoundary>` component wraps the app |
| Failed Supabase API calls | Fetch/XHR instrumentation |
| Stack traces with exact line numbers | Source maps uploaded at build time |
| User context | Which user, which page, which browser/device |
| Breadcrumbs | What the user clicked/navigated before the error |
| Affected user count | Errors grouped — same bug from 50 users = 1 issue |
| Slow page loads | Performance monitoring (LCP, FID, CLS) |
| Slow API calls | Transaction tracing on fetch requests |

### Integrations to configure
- **Linear** — auto-create tickets from new errors (native integration)
- **GitHub** — link errors to commits, suggest suspect commits, auto-resolve on deploy
- **Slack** — real-time alerts for new/regression errors
- **Vercel** — release tracking tied to deployments

## Implementation

### Step 1: Install SDK (~5 minutes)
```bash
npm install @sentry/react @sentry/vite-plugin
```

### Step 2: Initialize in entry file (~10 lines)
```typescript
// docs/index.tsx — add before ReactDOM.createRoot
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://YOUR_DSN@sentry.io/PROJECT_ID",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false }),
  ],
  tracesSampleRate: 0.2,     // 20% of page loads for performance monitoring
  replaysSessionSampleRate: 0, // Don't record all sessions
  replaysOnErrorSampleRate: 1.0, // Record 100% of sessions WITH errors
  environment: import.meta.env.MODE, // 'development' or 'production'
});
```

### Step 3: Wrap app with Error Boundary
```typescript
// docs/index.tsx — wrap the app root
<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppStateProvider>
          <AppRouter />
        </AppStateProvider>
      </AuthProvider>
    </QueryClientProvider>
  </BrowserRouter>
</Sentry.ErrorBoundary>
```

### Step 4: Upload source maps at build time
```typescript
// vite.config.ts — add to plugins array
import { sentryVitePlugin } from "@sentry/vite-plugin";

plugins: [
  react(),
  // ... existing plugins
  sentryVitePlugin({
    org: "sentinel-sportstech",
    project: "sportslab",
    authToken: process.env.SENTRY_AUTH_TOKEN,
  }),
],
build: {
  sourcemap: true, // Required for Sentry source maps
},
```

### Step 5: Add user context (identify who hit the error)
```typescript
// After login — in AuthContext or AppStateContext
Sentry.setUser({ id: user.id, email: user.email });

// On logout
Sentry.setUser(null);
```

### Step 6: Optional — User Feedback Widget
```typescript
// Simple "Report a Bug" button that attaches error context
Sentry.showReportDialog({
  eventId: Sentry.lastEventId(),
  title: "Something went wrong",
  subtitle: "Help us fix this by describing what happened.",
});
```

## What the Developer Dashboard Shows

### Error Feed
- Every error in real time, grouped by type
- Stack trace with exact file and line number (human-readable via source maps)
- Number of occurrences and affected users
- First seen / last seen timestamps

### Most Frequent Errors (ranked)
- Top 10 errors by occurrence count
- Trend arrows (increasing/decreasing)
- Which release introduced each error

### Performance Dashboard
- Page load times per route: `/roster` 1.2s, `/analytics` 3.8s, `/wellness` 2.1s
- Slowest API calls: which Supabase queries take longest
- Web Vitals: LCP, CLS, FID per page
- P50 / P75 / P95 response times

### Release Health
- After each Vercel deploy, see:
  - Did this release introduce new errors?
  - Did this release fix existing errors?
  - Crash-free session percentage
  - Adoption rate (how many users are on the new version)

### Alerts
- Slack notification for: new error types, error regressions (fixed bug reappearing), error spikes (>10 of same error in 1 hour)
- Linear ticket auto-created for high-impact errors (>5 users affected)

## Real-World Example: Roster Crash

Without Sentry:
```
Sport scientist: "The roster page crashed when I opened it"
You: "What did you click? What browser? Can you send a screenshot?"
Sport scientist: "I don't remember, it just crashed"
→ 30 minutes of back-and-forth debugging
```

With Sentry:
```
Slack alert: "New error — ReferenceError: DeleteModal is not defined"
  → File: pages/RosterPage.tsx:537
  → 2 users affected
  → Browser: Chrome 124, Windows 11
  → Last good version: v7.2.1 (before today's deploy)
  → Suspect commit: "Add collapsible teams to roster"
→ 5 minutes to identify, fix, and deploy
```

## Cost Projection

| Stage | Plan | Cost | What you get |
|---|---|---|---|
| **Launch** | Sentry Free | $0/mo | 5K errors, 1 user, basic dashboard |
| **Growth (100+ users)** | Sentry Team | $26/mo | 50K errors, unlimited users, performance monitoring |
| **Scale (1000+ users)** | Sentry Business | $80/mo | 100K errors, session replay, release health |

## Timeline
- **Setup:** 30 minutes (install SDK, configure, deploy)
- **Linear/Slack integration:** 15 minutes each
- **Source map upload:** 10 minutes (Vite plugin config)
- **Total:** Under 1 hour

## When to implement
- Ideally **before going live** — catch issues from day one
- At minimum, before inviting beta users or the sport scientist partner for testing
- The free tier has no cost, so there's no reason to delay
