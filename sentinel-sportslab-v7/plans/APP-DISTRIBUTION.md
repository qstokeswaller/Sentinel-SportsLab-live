# Sentinel SportsLab — App Distribution & Update Strategy

## Current State
- **Stack**: React 19.2.3 + Vite 6.2.0 + TypeScript 5.8, deployed on Vercel
- **Root**: `./docs`, build output: `./archive/dist`
- **Auth**: Supabase with auto-refresh, persisted sessions, URL-based recovery tokens
- **Routing**: BrowserRouter (react-router-dom v6), SPA rewrite on Vercel
- **No installability yet**: No manifest, no service worker, no native wrapper

---

## Three Distribution Paths

| Path | Install Method | Store Listing | Effort | Update Speed |
|------|---------------|---------------|--------|-------------|
| **PWA** | Browser install prompt | No | ~1 hour | Instant (deploy to Vercel) |
| **Capacitor** | App Store / Google Play | Yes | 1-2 days | Hours (live update) or 1-3 days (store review) |
| **Tauri** | Direct download (.exe/.dmg) | No | 1-2 days | Minutes (auto-updater) |

---

## Phase 1: Progressive Web App (PWA)

### What users get
- Home screen icon on phone/tablet/desktop
- Full-screen app experience (no browser chrome)
- Offline app shell (UI loads instantly, data needs internet)
- Auto-update on each visit

### Step-by-step implementation

#### 1.1 Install dependency
```bash
npm install -D vite-plugin-pwa@^0.21.0
```

#### 1.2 Update `vite.config.ts`
Current file has `plugins: [react()]` at line 23. Add PWA plugin:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // ... existing config
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',  // Shows "Update available" toast
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sentinel SportsLab',
        short_name: 'SportsLab',
        description: 'Sports performance platform for coaches and trainers',
        theme_color: '#4f46e5',  // Indigo-600 (matches app accent)
        background_color: '#f8fafc',  // Slate-50 (matches app bg)
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['sports', 'fitness', 'health'],
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Cache Supabase API responses for offline resilience
            urlPattern: /^https:\/\/zlrpqcftufaljpwfsxbt\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },  // 1 hour
            },
          },
          {
            // Cache Google Fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
});
```

#### 1.3 Update `docs/index.html`
Add after line 6 (`<title>` tag):

```html
<meta name="theme-color" content="#4f46e5" />
<meta name="description" content="Sports performance platform for coaches and trainers" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Sentinel SportsLab" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
```

Note: `vite-plugin-pwa` auto-injects the manifest link and service worker registration — no manual `<link rel="manifest">` needed.

#### 1.4 Add update prompt to `docs/index.tsx`
After imports, before `const queryClient`:

```typescript
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version is available. Reload to update?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});
```

Or for a nicer UX, integrate with the existing `showToast` system via AppStateContext.

#### 1.5 Create app icons
Place in `docs/public/`:
- `favicon.ico` (32x32)
- `favicon-32x32.png` (32x32)
- `apple-touch-icon.png` (180x180)
- `icon-192x192.png` (192x192)
- `icon-512x512.png` (512x512)

Generate from a single high-res source using https://favicon.io or https://realfavicongenerator.net

#### 1.6 No Vercel changes needed
Current `vercel.json` already has SPA rewrites. Service worker files are static assets served from root — Vercel handles this automatically.

#### 1.7 Build and verify
```bash
npm run build
# Check archive/dist/ contains:
# - sw.js (service worker)
# - workbox-*.js (workbox runtime)
# - manifest.webmanifest
# - All icon files
```

Test in Chrome DevTools → Application → Manifest / Service Workers tabs.

#### 1.8 How updates work after PWA is live
1. You push code to git → Vercel builds and deploys
2. User opens the app → service worker checks for new version in background
3. If `registerType: 'prompt'` → user sees "Update available" → clicks refresh → new version
4. If `registerType: 'autoUpdate'` → silently updates on next navigation (no prompt)

---

## Phase 2: Landing Page Architecture

### URL structure
```
sentinelsportslab.com/              ← Landing page (public marketing site)
sentinelsportslab.com/pricing       ← Pricing page
sentinelsportslab.com/features      ← Feature showcase
sentinelsportslab.com/login         ← Login → redirects to app
app.sentinelsportslab.com/          ← The PWA (what we've built)
```

### Implementation options

**Option A: Subdomain split (recommended)**
- Landing page: separate repo, deployed to `sentinelsportslab.com` on Vercel
- App: current repo, deployed to `app.sentinelsportslab.com` on Vercel
- Two separate Vercel projects, two domains
- Clean separation of concerns

**Option B: Path-based**
- Landing page at `/` with marketing routes
- App at `/app/*`
- Single repo, single deploy
- More complex routing but simpler DNS

### Landing page tech options
- **Astro** — Static site, fast, good for marketing pages with minimal JS
- **Next.js** — If you need server-side rendering, API routes, or dynamic content
- **Plain HTML + Tailwind** — Simplest, fastest to build, no framework overhead

---

## Phase 3: Capacitor (App Store / Google Play)

### What it does
Wraps the existing web app in a native iOS/Android shell. Same code, native distribution.

### Prerequisites
- Apple Developer Account: $99/year (for iOS App Store)
- Google Play Console: $25 one-time (for Google Play)
- Xcode (Mac only — required for iOS builds)
- Android Studio (any OS — for Android builds)

### Step-by-step setup

#### 3.1 Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Sentinel SportsLab" "com.sentinelsportstech.sportslab" --web-dir archive/dist
```

This creates `capacitor.config.ts` at project root.

#### 3.2 Configure Capacitor
```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.sentinelsportstech.sportslab',
  appName: 'Sentinel SportsLab',
  webDir: 'archive/dist',
  server: {
    // For development: proxy to Vite dev server
    // url: 'http://localhost:8081',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#f8fafc',
    },
  },
};

export default config;
```

#### 3.3 Add platforms
```bash
npx cap add ios
npx cap add android
```

Creates `ios/` and `android/` directories.

#### 3.4 Build and sync
```bash
npm run build          # Build the web app
npx cap sync           # Copy web assets to native projects + sync plugins
npx cap open ios       # Open in Xcode
npx cap open android   # Open in Android Studio
```

#### 3.5 Handle deep links (OAuth, password recovery)
The app uses URL hash tokens for password recovery (`#type=recovery&token=...`). In Capacitor:

```typescript
// Add to docs/index.tsx or a new capacitor-init.ts
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  CapApp.addListener('appUrlOpen', (event) => {
    // Handle deep links — forward to React Router
    const url = new URL(event.url);
    window.location.hash = url.hash;
    window.location.pathname = url.pathname;
  });
}
```

Also register your app's URL scheme in:
- **iOS**: `ios/App/App/Info.plist` → add `CFBundleURLSchemes`
- **Android**: `android/app/src/main/AndroidManifest.xml` → add `<intent-filter>`

#### 3.6 Environment variables in native builds
Vite replaces `import.meta.env.VITE_*` at build time, so the Supabase URL and key are already baked into the JS bundle. No additional native env setup needed.

#### 3.7 Supabase auth in native WebView
The current auth config already works in WebView:
- `persistSession: true` → uses localStorage (available in WebView)
- `autoRefreshToken: true` → handles token refresh
- `detectSessionInUrl: true` → picks up OAuth redirects

For OAuth providers (Google, GitHub), you'll need to:
1. Configure redirect URLs in Supabase dashboard to include your app's URL scheme
2. Use `@capacitor/browser` for OAuth flows (opens system browser, returns to app)

### Live Updates (skip App Store review for web changes)

#### Using Capgo (recommended — open source)
```bash
npm install @capgo/capacitor-updater
npx cap sync
```

Configure in `capacitor.config.ts`:
```typescript
plugins: {
  CapacitorUpdater: {
    autoUpdate: true,
  },
}
```

Push updates:
```bash
npx @capgo/cli upload --channel production
```

Users get the update on next app open — no store submission needed. Only native plugin changes require store review.

### App Store submission checklist
- [ ] App icons (1024x1024 for App Store, 512x512 for Play Store)
- [ ] Screenshots (iPhone 6.7", 6.1", iPad; Pixel phone for Android)
- [ ] App description, keywords, categories
- [ ] Privacy policy URL (required by both stores)
- [ ] Review guidelines compliance (no hidden features, no web-only content)
- [ ] TestFlight beta testing (iOS) / Internal testing track (Android)

---

## Phase 4: Tauri (Desktop App — Optional)

### When to use
Only if you need standalone desktop downloads (.exe, .dmg) outside the browser. PWA covers most desktop use cases already.

### Setup
```bash
npm install -D @tauri-apps/cli
npx tauri init
```

Configure `src-tauri/tauri.conf.json`:
```json
{
  "build": {
    "distDir": "../archive/dist",
    "devPath": "http://localhost:8081"
  },
  "app": {
    "windows": [{
      "title": "Sentinel SportsLab",
      "width": 1280,
      "height": 800,
      "resizable": true
    }]
  },
  "bundle": {
    "identifier": "com.sentinelsportstech.sportslab",
    "icon": ["icons/icon.ico", "icons/icon.png"]
  }
}
```

Build:
```bash
npx tauri build  # Produces .exe (Windows), .dmg (Mac), .AppImage (Linux)
```

### Auto-updater
Tauri has a built-in updater that checks a URL for new versions:
```json
"updater": {
  "active": true,
  "endpoints": ["https://releases.sentinelsportslab.com/{{target}}/{{current_version}}"],
  "dialog": true
}
```

Host update files on GitHub Releases, S3, or your own server.

### Requirements
- Rust toolchain (install via rustup.rs)
- Code signing certificate for Windows ($200-400/yr from DigiCert/Sectigo)
- Apple Developer ID certificate for Mac ($99/yr — same as iOS dev account)

---

## Update Mechanisms Summary

| Distribution | How to Push Update | User Experience | Delay |
|-------------|-------------------|-----------------|-------|
| **PWA** | `git push` → Vercel auto-deploys | "Update available" toast or silent | Seconds |
| **Capacitor + Capgo** | `npx @capgo/cli upload` | Silent or prompt on next open | Minutes |
| **Capacitor + Store** | Submit to App Store / Play Console | Manual download from store | 1-3 days (review) |
| **Tauri** | Upload binary to release server | Auto-download prompt | Minutes |

---

## Recommended Implementation Order

```
Phase 1: PWA                    ← Do this first (~1 hour)
   ↓ Already installable on all devices, auto-updates
Phase 2: Landing page           ← When ready to go public (1-2 weeks)
   ↓ Marketing site + install instructions
Phase 3: Capacitor              ← When you want App Store presence (1-2 days)
   ↓ iOS + Android store listings
Phase 3b: Capgo live updates    ← Same time as Capacitor (~1 day)
   ↓ Push updates without store review
Phase 4: Tauri                  ← Only if desktop download requested (1-2 days)
   ↓ Standalone .exe/.dmg
```

---

## Key Decision Points

| Question | If Yes | If No |
|----------|--------|-------|
| Need App Store presence? | Phase 3 (Capacitor) | PWA is sufficient |
| Need offline data entry? | Add offline-first sync layer (complex) | Current setup fine |
| Enterprise/team distribution? | Apple Business Manager + MDM | Public store or PWA |
| Revenue via subscription? | Stripe (PWA, 0% platform fee) or in-app purchase (store, 15-30% cut) | N/A |
| Desktop standalone download? | Phase 4 (Tauri) | PWA covers desktop |

---

## Costs

| Item | Cost | Notes |
|------|------|-------|
| PWA | Free | Just code changes |
| Vercel (hosting) | Free tier or $20/mo Pro | Already using |
| Apple Developer Account | $99/year | Required for iOS App Store |
| Google Play Console | $25 one-time | Required for Google Play |
| Capgo (live updates) | Free tier (1,000 devices) or $14/mo | Optional but recommended |
| Code signing (Windows) | $200-400/year | Only for Tauri desktop |
| Domain (landing page) | ~$12/year | sentinelsportslab.com |
