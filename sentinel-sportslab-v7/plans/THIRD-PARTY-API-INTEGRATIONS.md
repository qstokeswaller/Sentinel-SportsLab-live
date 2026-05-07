# Sentinel SportsLab — Third-Party API Integration Plan

---

## Introduction: How Third-Party APIs Work (The Basics)

If you've never built a third-party API integration before, here's what you need to know.

### What is a third-party API?

An API (Application Programming Interface) is a way for two software systems to talk to each other. When Polar collects heart rate data on a watch, and you want that data to appear in Sentinel SportsLab automatically — that happens through Polar's API. Instead of the user manually exporting a CSV and importing it, the data flows directly from Polar's servers to your app's servers.

### What do YOU (the developer) need?

1. **A developer account with the third-party company.** Most companies have a "developer portal" where you register your app. This is free for most platforms (Polar, Oura, Whoop, Garmin). Some enterprise platforms (Catapult, VALD, Kinexon) require you to sign a partnership agreement first.

2. **API credentials.** When you register, you get a **Client ID** and **Client Secret** — think of these as your app's username and password for talking to their system. These go in your server's environment variables (never exposed to the browser).

3. **API documentation.** Every company publishes docs describing what endpoints exist, what data you can request, and what format it comes back in (almost always JSON).

### What do YOUR USERS need?

1. **An account with the third-party service.** The user must have their own Polar/Whoop/VALD account where their data lives.

2. **To grant permission (OAuth2 flow).** The first time a user connects, they'll see something like: "Sentinel SportsLab wants to access your Polar data. Allow?" They click "Allow", and your app gets a **token** that lets it read their data. The user never shares their password with you.

3. **Nothing else.** After the one-time connection, data flows automatically. The user just uses their devices normally.

### The OAuth2 flow (how the connection works)

```
1. User clicks "Connect Polar" in Sentinel SportsLab settings
2. Browser redirects to Polar's login page
3. User logs in to Polar and clicks "Allow"
4. Polar redirects back to your app with an authorization code
5. Your SERVER exchanges that code for an access token + refresh token
6. You store the tokens securely in your database
7. From now on, your server uses the access token to pull data from Polar
8. When the token expires, you use the refresh token to get a new one automatically
```

This is the same flow used by "Sign in with Google" or "Connect with Strava" — it's an industry standard called OAuth 2.0.

### What about companies without APIs?

Many sport science devices (Freelap timing, Tendo units, Brower gates) don't have APIs at all. For these, the only integration path is **CSV import** — which we've already built with the SmartCsvMapper. The user exports from the device's software and imports into Sentinel SportsLab, and the smart mapper handles the column matching automatically.

### What infrastructure do you need?

- **A backend server** — API integrations can't run from the browser (security: you can't expose your Client Secret in frontend JavaScript). You need a small server or serverless function (Supabase Edge Functions work perfectly for this) that handles the OAuth flow and data fetching.
- **A database table for tokens** — To store each user's connection tokens securely.
- **Webhook support (optional)** — Some APIs (Polar, Garmin) can PUSH data to your server when new data is available, instead of you pulling it on a schedule.

### The two integration patterns

| Pattern | How it works | Best for | Examples |
|---------|-------------|----------|----------|
| **Pull (polling)** | Your server periodically requests new data from the API | APIs without webhooks, batch data | Hawkin Dynamics, InBody |
| **Push (webhooks)** | The third-party sends data TO your server when it's available | Real-time or near-real-time data | Polar, Garmin, Whoop, Oura |

### Cost

Most sport science APIs are **free to use** — the company wants their devices to integrate with platforms like yours. You pay nothing for API access. The exceptions are enterprise platforms (Catapult, Kitman Labs) that may charge integration fees as part of a commercial partnership.

---

## Architecture: How Integrations Fit Into Sentinel SportsLab

### Current data flow (CSV-based)
```
Device → Export CSV → User uploads → SmartCsvMapper → App State / Supabase
```

### Future data flow (API-based)
```
Device → Third-Party Cloud → API → Supabase Edge Function → Supabase DB → App reads on load
                                         ↑
                              User connects once via OAuth
```

### Database additions needed

```sql
-- Store user's third-party connections
CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    provider TEXT NOT NULL,           -- 'polar', 'whoop', 'vald', etc.
    access_token TEXT NOT NULL,       -- encrypted
    refresh_token TEXT,               -- encrypted
    token_expires_at TIMESTAMPTZ,
    provider_user_id TEXT,            -- their ID on the third-party platform
    scopes TEXT[],                    -- what permissions were granted
    settings JSONB DEFAULT '{}',     -- provider-specific config
    connected_at TIMESTAMPTZ DEFAULT now(),
    last_sync_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',     -- 'active', 'expired', 'revoked'
    UNIQUE(user_id, provider)
);

-- Log sync events for debugging
CREATE TABLE sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    provider TEXT NOT NULL,
    event TEXT NOT NULL,               -- 'sync_started', 'sync_completed', 'sync_failed', 'webhook_received'
    records_synced INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### Supabase Edge Functions (serverless backend)

Each integration gets its own Edge Function:

```
supabase/functions/
├── integrations-oauth/       # Handles OAuth callback for all providers
├── integrations-polar/       # Polar-specific sync + webhook handler
├── integrations-whoop/       # Whoop sync
├── integrations-oura/        # Oura sync
├── integrations-garmin/      # Garmin Health sync
├── integrations-vald/        # VALD Health sync
├── integrations-hawkin/      # Hawkin Dynamics sync
└── integrations-sync/        # Scheduled pull for all active connections
```

### Settings page addition

A new "Integrations" section in the Settings page where users can:
- See available providers with connect/disconnect buttons
- See sync status (last synced, records count)
- Configure per-provider settings (which teams to sync to, which metrics to import)

---

## Provider Catalogue

### Tier 1 — Public APIs, Self-Service (Build First)

These have documented APIs with free developer accounts. You can build and test without any commercial agreements.

---

#### Polar (GPS, HR, Recovery, Sleep)

| Detail | Value |
|--------|-------|
| **Products** | Team Pro, Vantage V3, Ignite, Grit X |
| **API** | Polar AccessLink API (REST) |
| **Docs** | https://www.polar.com/accesslink-api/ |
| **Auth** | OAuth2 — free developer account at admin.polaraccesslink.com |
| **Data push** | Yes — webhooks notify when new data is available |
| **Data available** | Daily activity, training sessions, HR zones, GPS routes, sleep, Nightly Recharge (HRV + ANS), continuous HR |
| **Rate limits** | Moderate — suitable for team-sized loads |
| **Maps to in our app** | GPS data (PLATFORM_FIELDS), HR data, training loads (TRIMP, duration), wellness (sleep, recovery) |

**Implementation priority: HIGH** — Most widely used HR/GPS platform in sport science. Webhook support means near-real-time data. Covers HR zones, TRIMP, GPS tracking, and recovery metrics all in one.

**How to build:**
1. Register app at Polar AccessLink developer portal
2. Edge Function handles OAuth2 callback
3. Register webhook URL for training session notifications
4. On webhook: fetch session data → map to GPS/HR/training_load models → insert to Supabase
5. Map: `heart_rate.average` → `heart_rate_avg`, `distance` → `total_distance`, `duration` → `duration_minutes`, `training_load.sport_zones` → HR zone times

---

#### Whoop (Strain, Recovery, HRV, Sleep)

| Detail | Value |
|--------|-------|
| **Products** | Whoop 4.0 strap |
| **API** | Whoop Developer API (REST) |
| **Docs** | https://developer.whoop.com |
| **Auth** | OAuth2 — developer account registration |
| **Data push** | Webhooks available |
| **Data available** | Strain score, recovery score, HRV (rMSSD), resting HR, respiratory rate, sleep performance, sleep stages, skin temperature |
| **Maps to** | Wellness data (recovery, HRV, sleep), training loads (strain as proxy) |

**Implementation priority: HIGH** — Extremely popular with elite athletes. Recovery and HRV data fills a gap no other device covers as well.

**How to build:**
1. Register at developer.whoop.com
2. OAuth2 flow → get access token
3. Poll `/v1/cycle` for daily strain, `/v1/recovery` for recovery scores, `/v1/sleep` for sleep data
4. Map: `recovery.score` → wellness readiness, `recovery.hrv.rmssd_milli` → HRV metric, `strain.score` → training load proxy

---

#### Oura (Sleep, Readiness, HRV, Temperature)

| Detail | Value |
|--------|-------|
| **Products** | Oura Ring Gen 3 |
| **API** | Oura API v2 (REST) |
| **Docs** | https://cloud.ouraring.com/v2/docs |
| **Auth** | OAuth2 or Personal Access Token — free developer account |
| **Data push** | Webhooks available (v2) |
| **Data available** | Sleep score, sleep stages, readiness score, HRV, resting HR, body temperature deviation, activity, SpO2 |
| **Maps to** | Wellness data (sleep, readiness, HRV), biometrics (temperature) |

**Implementation priority: MEDIUM-HIGH** — Growing in sport science for sleep and readiness tracking. Excellent API documentation.

**How to build:**
1. Register app at cloud.ouraring.com
2. OAuth2 flow
3. Fetch `/v2/usercollection/daily_readiness`, `/v2/usercollection/daily_sleep`, `/v2/usercollection/heartrate`
4. Map: `readiness.score` → wellness readiness, `sleep.score` → wellness sleep, `readiness.contributors.hrv_balance` → HRV

---

#### Garmin (GPS, HR, Recovery, Wellness)

| Detail | Value |
|--------|-------|
| **Products** | Forerunner, Fenix, Enduro, Venu, HRM-Pro |
| **API** | Garmin Health API + Garmin Connect API |
| **Docs** | https://developer.garmin.com |
| **Auth** | Health API: enterprise/partner agreement required. Connect IQ SDK: free |
| **Data push** | Yes — push notifications for new activities |
| **Data available** | GPS tracks, HR, VO2max, training status, training load, body battery, stress, sleep, steps, HRV status |
| **Maps to** | GPS data, HR data, training loads, wellness |

**Implementation priority: MEDIUM** — Huge user base, but Health API requires a partnership agreement. Can use Garmin Connect's FIT file export as CSV fallback.

**How to build:**
1. Apply for Garmin Health API access (business form on developer.garmin.com)
2. Once approved: OAuth1.0a flow (note: Garmin uses OAuth 1.0a, not 2.0 — slightly more complex)
3. Register push endpoint for activity uploads
4. On push: fetch activity summary → map GPS, HR, training effect, VO2max data

---

#### Hawkin Dynamics (Force Plates — Jump Testing, Isometric Testing)

| Detail | Value |
|--------|-------|
| **Products** | Wireless force plates |
| **API** | REST API |
| **Docs** | https://api.hawkindynamics.com/docs |
| **Auth** | API key provided with device subscription |
| **Data push** | No — pull-based |
| **Data available** | Force-time data, CMJ metrics (jump height, RSI, peak force, rate of force development, impulse), IMTP metrics, drop jump, squat jump, all with left/right breakdown |
| **Maps to** | Assessments (cmj, squat_jump, drop_jump, imtp_basic, imtp_advanced, rsi), hamstring metrics |

**Implementation priority: HIGH** — Direct data feed for all force plate testing. Eliminates manual entry for the most common lab tests. API key auth is simpler than OAuth.

**How to build:**
1. Get API key from Hawkin account (comes with device subscription)
2. User enters their Hawkin API key in Sentinel SportsLab settings
3. Edge Function calls `GET /tests` with date range filter
4. Map each test type: `CMJ` → `cmj` assessment, `IMTP` → `imtp_advanced`, `SJ` → `squat_jump`, `DJ` → `drop_jump`
5. Map metrics: `jumpHeight_m` → jump height, `peakForce_N` → peak force, `rsi` → RSI, `peakForce_left_N`/`peakForce_right_N` → bilateral asymmetry

---

### Tier 2 — Partner/Enterprise APIs (Build Second)

These require a signed agreement or commercial relationship but have well-documented APIs.

---

#### VALD Health (NordBord, ForceDecks, ForceFrame, SmartSpeed, HumanTrak, DynaMo, AirBands)

| Detail | Value |
|--------|-------|
| **Products** | NordBord (hamstring), ForceDecks (force plates), ForceFrame (isometric), SmartSpeed (timing gates), HumanTrak (movement screening), DynaMo (grip/strength), AirBands (blood flow restriction) |
| **API** | VALD API (REST) |
| **Docs** | Available via partner portal (valdperformance.com) |
| **Auth** | Partner agreement required — contact VALD sales |
| **Data push** | Webhooks available for some data |
| **Data available** | Force-time curves, hamstring L/R force, asymmetry %, isometric peak force, sprint splits (10/20/30/40m), reactive agility, joint ROM, grip strength |
| **Maps to** | Assessments (nordbord_hamstring, imtp_*, sprint_*, agility_*, fms_*, y_balance), hamstring report data |

**Implementation priority: VERY HIGH** — VALD is the industry standard for hamstring testing (NordBord), force plates (ForceDecks), and timing (SmartSpeed). Would automate the entire Testing Hub data flow.

**How to build:**
1. Contact VALD sales/partnerships for API access
2. Once approved: OAuth2 flow via VALD Hub
3. Sync athlete profiles (map VALD athletes → Sentinel SportsLab athletes by name/ID)
4. Pull test results by date range per athlete
5. Map NordBord data: `leftPeakForce_N` → left, `rightPeakForce_N` → right, compute asymmetry, store as hamstring assessment
6. Map ForceDecks: jump metrics → cmj/squat_jump assessments
7. Map SmartSpeed: split times → sprint_10m, sprint_20m, sprint_40m assessments

---

#### Catapult Sports (GPS, PlayerLoad, AMS)

| Detail | Value |
|--------|-------|
| **Products** | ClearSky, Vector, PlayerTek, OpenField, AMS (Kinduct) |
| **API** | Catapult Cloud API v3 (REST) |
| **Docs** | Partner portal (support.catapultsports.com) |
| **Auth** | Enterprise/partner agreement required |
| **Data push** | Available for session completion events |
| **Data available** | All GPS metrics, PlayerLoad, IMA events, speed zones, HR zones, session metadata, athlete profiles |
| **Maps to** | GPS data (all PLATFORM_FIELDS), training loads (player_load, sprint_distance, total_distance), HR data |

**Implementation priority: HIGH** — Catapult is the dominant GPS tracking provider in professional sport. Direct API integration would eliminate the current CSV import workflow entirely for Catapult users.

**How to build:**
1. Apply for Catapult developer partnership
2. OAuth2 flow via Catapult Cloud
3. Sync activities/sessions by date
4. Map all fields to existing PLATFORM_FIELDS (already have aliases defined in GpsColumnMapper.tsx)

---

#### InBody (Body Composition)

| Detail | Value |
|--------|-------|
| **Products** | InBody 770, 580, 270, S10 |
| **API** | InBody API (REST) |
| **Docs** | Partner portal (inbody.com) |
| **Auth** | Enterprise/partner agreement |
| **Data available** | Body fat %, skeletal muscle mass, segmental lean mass, body water, BMR, visceral fat, ECW ratio |
| **Maps to** | Biometrics (weight, body_fat_pct), assessments (body composition) |

**Implementation priority: MEDIUM** — Widely used in professional sport. Would automate body composition tracking.

---

#### Smartabase / Fusion Sport (AMS Platform)

| Detail | Value |
|--------|-------|
| **Products** | Smartabase (Athlete Management System) |
| **API** | REST API |
| **Docs** | Provided to enterprise clients |
| **Auth** | Enterprise license required |
| **Data available** | Everything user-configured: wellness, workload, testing, medical, custom forms |
| **Maps to** | Wellness data, training loads, assessments — depends on configuration |

**Implementation priority: LOW** — Smartabase is a competing AMS platform. Integration would be for data migration or co-existence scenarios.

---

### Tier 3 — CSV Import Only (Already Supported)

These devices have no API. The SmartCsvMapper we've already built handles these via manual file upload.

| Device | Company | Data Type | CSV Export? |
|--------|---------|-----------|-------------|
| **Apex / Sonra** | STATSports | GPS tracking | Yes — from Sonra desktop software |
| **Tendo Power Analyzer** | Tendo | Bar velocity, power | Yes — from Tendo software |
| **Freelap** | Freelap | Sprint timing | Yes — from Freelap app |
| **Brower TC-Gates** | Brower | Sprint timing | Yes — from Brower software |
| **Dashr** | Dashr | Sprint timing, agility | Yes — from Dashr app |
| **OpenBarbell** | OVR Performance | Bar velocity | Yes — open source app export |
| **Vitruve Encoder** | Vitruve | VBT metrics | Yes — from Vitruve app |
| **RepOne** | RepOne | VBT metrics | Yes — from RepOne app |
| **Perch** | Perch | VBT metrics | Yes — enterprise CSV export |
| **Bod Pod** | COSMED | Body composition | Yes — from Bod Pod software |
| **DEXA** | Hologic/GE | Body composition | Yes — from clinical software |
| **GymAware RS** | GymAware | VBT metrics | Yes — from GymAware Cloud (also has API for enterprise) |
| **Skulpt** | Skulpt | Body fat, muscle quality | Discontinued |
| **HRV4Training** | HRV4Training | HRV, wellness | Yes — CSV export from app |
| **Dartfish** | Dartfish | Video analysis tags | Yes — CSV/XML export |

**Our SmartCsvMapper already handles these** with fuzzy header matching and schema-based column mapping. No additional development needed — users upload the CSV, the mapper detects the columns.

---

## Implementation Roadmap

### Phase 1: Infrastructure (1-2 days)
- Create `integrations` and `sync_log` database tables
- Build generic OAuth2 Edge Function handler (`integrations-oauth`)
- Add "Integrations" section to Settings page with connect/disconnect UI
- Store tokens encrypted in Supabase

### Phase 2: First Integration — Hawkin Dynamics (1-2 days)
- Simplest auth (API key, no OAuth)
- Direct mapping to existing assessment types
- Proves the full pipeline: settings → sync → data appears in Testing Hub

### Phase 3: Polar AccessLink (2-3 days)
- First OAuth2 integration
- Webhook receiver for real-time session data
- Maps to GPS, HR, training load, and wellness models
- Proves the webhook + OAuth pattern that other providers will reuse

### Phase 4: Whoop + Oura (2-3 days)
- Reuse OAuth2 infrastructure from Phase 3
- Both are wellness/recovery focused — fills readiness data gap
- Webhook support for both

### Phase 5: VALD Health (3-5 days)
- Requires partnership agreement (start conversations early)
- Most complex mapping — covers hamstring, force plates, timing, movement screening
- Largest data volume per sync

### Phase 6: Catapult Sports (3-5 days)
- Requires partnership agreement
- Replaces CSV import workflow entirely for Catapult users
- Maps to all existing PLATFORM_FIELDS

### Phase 7: Garmin Health (2-3 days)
- Requires partnership application
- OAuth 1.0a (slightly different from OAuth 2.0)
- Covers GPS, HR, recovery, wellness

### Phase 8: InBody + remaining providers (as needed)
- Enterprise partnerships as user demand dictates

---

## Data Mapping Reference

### How third-party data maps to our existing models

| Third-Party Data | Our Table | Our Fields | Example |
|-----------------|-----------|------------|---------|
| GPS session metrics | GPS data (via StorageService) | All PLATFORM_FIELDS (45+ fields) | Catapult PlayerLoad → `player_load` |
| Heart rate zones | HR data / training_loads | hr_zone_1..5, trimp, heart_rate_avg/max | Polar HR zones → zone time fields |
| Jump test results | assessments | test_type: 'cmj', metrics: {height, peakForce, rsi...} | Hawkin CMJ → cmj assessment |
| Hamstring force | assessments | test_type: 'hamstring', metrics: {left, right, asymmetry} | VALD NordBord → hamstring report |
| Sprint times | assessments | test_type: 'sprint_10m', metrics: {time} | VALD SmartSpeed → sprint assessment |
| Isometric strength | assessments | test_type: 'imtp_advanced', metrics: {peakForce, rfd} | Hawkin/VALD IMTP → IMTP assessment |
| Recovery scores | wellness_responses | responses: {readiness: score} | Whoop recovery → wellness readiness |
| Sleep data | wellness_responses | responses: {sleep: score, sleep_hours: X} | Oura sleep → wellness sleep |
| HRV | wellness_responses | responses: {hrv: rmssd_value} | Whoop/Oura HRV → wellness HRV |
| Body composition | assessments / biometrics | test_type: 'body_fat_pct', metrics: {fat_pct, smm, ...} | InBody scan → body comp assessment |
| Training load | training_loads | metric_type, value, date | Polar TRIMP → trimp load record |
| Strain/exertion | training_loads | metric_type: 'srpe', value | Whoop strain → training load |
| Bar velocity (VBT) | assessments | test_type: 'rm_*', metrics: {vbt_mean_velocity, vbt_load} | GymAware → VBT assessment data |

---

## Settings UI Design

### Integrations section in Settings → Feature Settings

```
┌─────────────────────────────────────────────┐
│ 🔗 Integrations                              │
│    Connect third-party devices and platforms  │
├─────────────────────────────────────────────┤
│                                               │
│  ┌─ GPS & Wearables ──────────────────────┐  │
│  │ 🟢 Polar          Connected · Synced 2h │  │
│  │ ⚪ Garmin         Connect →             │  │
│  │ ⚪ Catapult       Requires partnership   │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─ Testing & Force Plates ───────────────┐  │
│  │ 🟢 Hawkin Dynamics  Connected · 142 tests│  │
│  │ ⚪ VALD Health      Connect →           │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─ Recovery & Wellness ──────────────────┐  │
│  │ 🟢 Whoop           Connected · Synced 6h│  │
│  │ 🟢 Oura            Connected · Synced 1h│  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ┌─ Body Composition ────────────────────┐   │
│  │ ⚪ InBody           Requires partnership│   │
│  └─────────────────────────────────────────┘  │
│                                               │
│  CSV Import still available for all devices   │
│  that don't have API integrations.            │
└─────────────────────────────────────────────┘
```

Each connected provider shows:
- Connection status (green dot = active, yellow = token expiring, red = error)
- Last sync time
- Number of records synced
- Settings button (which team to sync to, which metrics to import)
- Disconnect button

---

## Costs Summary

| Item | Cost | Notes |
|------|------|-------|
| Polar API access | Free | Self-service developer account |
| Whoop API access | Free | Developer account registration |
| Oura API access | Free | Developer account or personal access token |
| Hawkin API access | Free | Included with device subscription |
| Garmin Health API | Free (requires partnership) | Apply via developer.garmin.com |
| VALD API access | Contact sales | Requires partnership agreement |
| Catapult API access | Contact sales | Requires enterprise partnership |
| InBody API access | Contact sales | Requires partnership |
| Supabase Edge Functions | Free tier (500K invocations/mo) | More than enough for team-sized syncs |
| Token encryption | Built into Supabase | Use Vault or pgcrypto |

---

## Key Decisions Before Implementation

| Decision | Options | Recommendation |
|----------|---------|----------------|
| Where to run sync logic? | Supabase Edge Functions vs external server | Edge Functions — already using Supabase, zero extra infra |
| How to store tokens? | Plain text vs encrypted | Encrypted — use Supabase Vault or pgcrypto |
| Sync frequency for pull-based APIs? | Real-time vs hourly vs daily | Hourly for testing data, daily for wellness/recovery |
| How to match athletes across platforms? | By name vs by email vs manual mapping | By name (fuzzy match) with manual override in settings |
| What happens when API data conflicts with manual entry? | API wins vs manual wins vs merge | API data supplements — never overwrites manual entries. Show both with source label. |
