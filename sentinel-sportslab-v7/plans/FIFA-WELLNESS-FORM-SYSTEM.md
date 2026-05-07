# FIFA/IOC-Aligned Wellness Monitoring System — Build Plan

## Context

Based on Waldén et al. (2023, BJSM) — the FIFA/IOC consensus statement for recording and reporting epidemiological data in football — and the sport scientist partner's research-aligned wellness form document, this plan outlines a multi-tier wellness monitoring system.

The current platform has a flexible questionnaire builder that supports custom forms. This plan adds a **purpose-built FIFA-aligned system** as a default template option alongside the existing custom forms. It does not replace the current system — it extends it with structured, research-grade data collection.

---

## The Three-Tier Architecture

### Tier 1: Daily Quick Form (< 2 minutes)
**Purpose:** High-compliance daily check-in. Detect problems early.
**Who fills it in:** Every athlete, every day.
**Triggers:** Sent automatically or accessed via standing link.

**Fields:**
1. **Availability** (NON-NEGOTIABLE anchor variable)
   - Fully available
   - Modified training
   - Unavailable for training
   - Unavailable for match selection

2. **Health Problem Flag** (binary detection)
   - "Do you have any physical complaint?" → Yes / No
   - No detail here — just detection. Weekly form handles classification.

3. **Perceptual Wellness** (5 metrics, 1-10 scale)
   - Fatigue (1 = fully fresh, 10 = completely exhausted)
   - Muscle Soreness (1 = none, 10 = severe)
   - Sleep Quality (1 = very poor, 10 = excellent)
   - Stress (1 = none, 10 = extreme)
   - Mood (1 = very low, 10 = very positive)

4. **Sleep Duration**
   - Hours slept (numeric)

5. **Subjective Readiness**
   - Ready to train fully
   - Slightly compromised
   - Not ready

**Total: 8 inputs. Target completion: 60-90 seconds.**

### Tier 2: Weekly Deep Check (5-8 minutes)
**Purpose:** Full FIFA-aligned classification of any health problems detected in Tier 1.
**Who fills it in:** Only athletes flagged by the auto-detection system.
**Triggers:** Automatically assigned when daily flags breach thresholds.

**Fields:**
1. **Health Problem Classification** (FIFA/IOC aligned)
   - Type: Injury (musculoskeletal) / Illness
   - Onset: Sudden / Gradual
   - Status: New / Recurrence (same injury, fully healed before) / Exacerbation (never fully healed)

2. **Body Location** (football-specific breakdown from Waldén Table 4)
   - Head, Neck, Shoulder, Arm/Elbow, Wrist/Hand, Spine
   - Hip (separate from groin — per consensus)
   - Groin (adductor-specific)
   - Thigh (Hamstring / Quadriceps)
   - Knee, Lower Leg, Ankle, Foot

3. **Mechanism** (if sudden onset)
   - Running, Change of direction, Kicking, Landing, Tackle, Collision, Other
   - Contact type: Non-contact / Indirect contact / Direct contact (opponent/teammate/ball/goalpost)

4. **Impact on Performance**
   - No impact / Minor (can fully train) / Moderate (reduced) / Severe (cannot complete)

5. **Time-Loss Category** (consensus severity bins)
   - 0 days / 1-3 days / 4-7 days / 8-28 days / 29+ days

6. **Training Load Context**
   - Average RPE this week
   - Total session load
   - Matches played

7. **Wellness Trend Reflection**
   - Fatigue trend: Improving / Stable / Worsening
   - Sleep trend: Improving / Stable / Worsening

8. **Recovery & Lifestyle**
   - Nutrition consistency (1-10)
   - Hydration (1-10)
   - Stress sources: Football / Work-School / Personal / None

### Tier 3: Full Research-Grade Form (10-15 minutes)
**Purpose:** Complete data collection for research publications and comprehensive injury surveillance.
**Who fills it in:** Specific athletes at specific times (pre-season baseline, post-injury, research studies).
**Triggers:** Manually assigned by the sport scientist.

**Fields:** All of Tier 1 + Tier 2, plus:
- Player & session context (exposure context, minutes played, training duration)
- Detailed diagnosis input (medical/staff section)
- Return-to-training date
- Clinical notes
- Full recovery behaviour checklist (nutrition, hydration, modalities)
- External load factors (travel, academic stress, personal stress)

---

## Auto-Flag System (The Engine)

The system value comes from automated threshold detection that triggers the weekly deep check. No human bottleneck.

### Red Flags (immediate weekly trigger)
| Trigger | Condition |
|---------|-----------|
| Unavailable | Availability = Unavailable (training or match) |
| New complaint | Health problem flag = Yes |
| Extreme fatigue | Fatigue ≥ 8 |
| Sleep deprivation | Sleep hours ≤ 5 |
| Sudden mood crash | Mood drops ≥ 3 points from 7-day rolling average |

### Amber Flags (tracked, weekly trigger if sustained ≥ 2 consecutive days)
| Trigger | Condition |
|---------|-----------|
| Modified training | Availability = Modified |
| High soreness | Soreness ≥ 7 |
| High stress | Stress ≥ 7 |
| Poor readiness | Readiness = "Not ready" |

### Flag logic
- Flags are computed automatically after each daily form submission
- Red flag → immediate: weekly deep check form is assigned to the athlete
- Amber flag sustained 2+ days → weekly form triggered
- Sport scientist dashboard shows flagged athletes with flag type and count
- Athlete receives the weekly form via their normal form access (not a separate scary notification)

### Connection to Individualized Thresholds
Instead of fixed thresholds (fatigue ≥ 8), the system can use the athlete's personal baseline:
- Personal mean fatigue over 28 days = 4.2, SD = 1.1
- Red flag at: mean + 2 SD = 6.4 (instead of generic 8)
- This catches athletes who are normally low-fatigue but spike to 7, which would be missed by a generic threshold

This connects directly to the Individualized Load Thresholds feature already built in the Wellness Hub.

---

## User Flow: Athlete Experience

### Daily (every morning)
```
1. Athlete opens form (standing link, push notification, or QR code at training ground)
2. Selects their name from team roster
3. Taps availability status (1 tap)
4. Taps "Any physical complaint?" Yes/No (1 tap)
5. Slides 5 wellness metrics (5 quick slides, ~30 sec)
6. Types sleep hours (5 sec)
7. Taps readiness (1 tap)
8. Submit → "Thank you" screen → done

Total: ~60-90 seconds
```

### Weekly (only when flagged)
```
1. Athlete opens form → system detects they've been flagged
2. Form shows: "Based on your recent responses, we'd like a bit more detail to help manage your load better"
   (NOT: "You've been flagged because something is wrong")
3. Steps through the classification questions:
   - What type of problem? (Injury/Illness)
   - How did it start? (Sudden/Gradual)
   - Is this new or returning? (New/Recurrence/Exacerbation)
   - Where is it? (Body map with football-specific areas)
   - How did it happen? (Mechanism — if sudden)
   - How much is it affecting you? (Impact scale)
   - How long do you expect to miss? (Time-loss bins)
4. Load context + wellness trends + recovery behaviours
5. Submit → "Got it. Your coaching staff will review this." → done

Total: ~5-8 minutes (only when needed)
```

### Key UX principles
- **The athlete should never feel punished for honest reporting**
- Weekly form is framed as "helping staff manage you better" not "you're in trouble"
- Visible feedback loop: athlete sees that their flag resulted in modified training or recovery focus
- If an athlete is never flagged, they only ever see the 60-second daily form

---

## Workflow: Sport Scientist / Trainer Experience

### Daily Dashboard View
```
┌─────────────────────────────────────────────────────┐
│ WELLNESS MONITORING — Today (4 Apr 2026)            │
│                                                       │
│ ┌─ AmaTuks 25/26 ────────────────────────────────┐  │
│ │ 38/42 submitted (90%)                           │  │
│ │                                                   │  │
│ │ 🟢 Available: 32  🟡 Modified: 4  🔴 Unavail: 2 │  │
│ │                                                   │  │
│ │ ⚠️ FLAGS (6 athletes)                            │  │
│ │ ┌────────────────────────────────────────────┐   │  │
│ │ │ 🔴 J. Mokoena — Fatigue 9, Sleep 4hrs      │   │  │
│ │ │    → Weekly check ASSIGNED (pending)        │   │  │
│ │ │ 🔴 S. Dlamini — Unavailable, Complaint: Yes│   │  │
│ │ │    → Weekly check COMPLETED ✓               │   │  │
│ │ │ 🟡 K. Nkosi — Soreness 8 (2nd day)         │   │  │
│ │ │    → Weekly check ASSIGNED (pending)        │   │  │
│ │ │ 🟡 T. Mahlangu — Modified, Stress 8         │   │  │
│ │ └────────────────────────────────────────────┘   │  │
│ │                                                   │  │
│ │ TEAM AVERAGES                                     │  │
│ │ Fatigue: 4.8  Soreness: 3.2  Sleep: 7.1hrs      │  │
│ │ Mood: 7.4  Stress: 3.8                           │  │
│ └───────────────────────────────────────────────────┘  │
│                                                       │
│ ┌─ Weekly Classifications (completed) ────────────┐  │
│ │ S. Dlamini: Groin adductor injury, Gradual onset │  │
│ │   Recurrence, Moderate impact, 4-7 days expected │  │
│ │   → Action: Modified training, physio referral    │  │
│ └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Weekly Classification Review
When a weekly deep check is completed, the sport scientist sees:
- Full FIFA-aligned injury classification
- Time-loss estimate
- Body area with the hip/groin split
- Recurrence vs new vs exacerbation distinction
- Suggested action (auto-generated from severity + location + history)

### Trend Visualisations
- **Team heatmap**: Rows = athletes, Columns = days, Colour = composite wellness score (green → red)
- **Individual sparklines**: 14-day rolling line per wellness metric
- **Flag timeline**: When flags were raised, what type, what action was taken
- **Injury burden**: Days lost per 1000 training hours (Waldén Table 4 format)
- **Compliance tracker**: % daily form completion by team, by week

---

## Data Model Changes

### New database fields/tables needed

```sql
-- Extend wellness_responses with structured FIFA fields
ALTER TABLE wellness_responses ADD COLUMN IF NOT EXISTS
    tier TEXT DEFAULT 'daily';  -- 'daily', 'weekly', 'research'

ALTER TABLE wellness_responses ADD COLUMN IF NOT EXISTS
    health_problem_flag BOOLEAN;

ALTER TABLE wellness_responses ADD COLUMN IF NOT EXISTS
    readiness TEXT;  -- 'ready', 'compromised', 'not_ready'

-- New table: wellness flags (auto-generated)
CREATE TABLE IF NOT EXISTS wellness_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    athlete_id UUID NOT NULL,
    team_id TEXT NOT NULL,
    flag_date DATE NOT NULL,
    flag_type TEXT NOT NULL,          -- 'red', 'amber'
    trigger_field TEXT NOT NULL,      -- 'fatigue', 'soreness', 'availability', etc.
    trigger_value TEXT,               -- the actual value that triggered
    threshold_used TEXT,              -- 'generic' or 'individualized'
    weekly_assigned BOOLEAN DEFAULT false,
    weekly_completed BOOLEAN DEFAULT false,
    weekly_response_id UUID,          -- links to the weekly response when completed
    created_at TIMESTAMPTZ DEFAULT now()
);

-- New table: weekly classifications (structured injury data)
CREATE TABLE IF NOT EXISTS injury_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    athlete_id UUID NOT NULL,
    wellness_response_id UUID,        -- links to the weekly response
    problem_type TEXT,                -- 'injury', 'illness'
    onset TEXT,                       -- 'sudden', 'gradual'
    status TEXT,                      -- 'new', 'recurrence', 'exacerbation'
    body_area TEXT,                   -- from FIFA body area list
    body_side TEXT,                   -- 'left', 'right', 'bilateral', 'central'
    mechanism TEXT,                   -- 'running', 'tackle', 'landing', etc.
    contact_type TEXT,                -- 'non_contact', 'indirect', 'direct'
    contact_object TEXT,              -- 'opponent', 'teammate', 'ball', etc.
    performance_impact TEXT,          -- 'none', 'minor', 'moderate', 'severe'
    time_loss_category TEXT,          -- '0', '1-3', '4-7', '8-28', '29+'
    diagnosis TEXT,                   -- optional clinical diagnosis
    return_date DATE,                -- expected or actual return
    notes TEXT,
    classification_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### How it connects to existing features

| Existing Feature | How FIFA Wellness Feeds It |
|---|---|
| **ACWR Monitoring** | Daily RPE/availability → training load context. Weekly load data enriches ACWR calculation. |
| **Individualized Load Thresholds** | Daily wellness scores feed the personal threshold calculation. Injury classifications feed negative event detection. |
| **Injury Report (Wellness Hub)** | Weekly classifications auto-populate injury records with FIFA-grade detail. |
| **RTP Decision Support (future)** | Time-loss categories + recurrence tracking + body area → structured RTP trigger with severity-aware protocols. |
| **Athlete Profile Modal** | Latest availability status + flag count + current injury classification shown in status bar. |
| **Performance Intelligence** | Recovery domain score uses the weighted wellness metrics (sleep 35%, energy 30%, etc.). |
| **Dose-Response Terminal** | Wellness trend data contextualizes why some athletes are non-responders (high load + poor wellness = fatigue). |

---

## Connection to RTP Decision Support

The injury_classifications table directly feeds the future RTP system:

1. **When** a weekly classification records time-loss ≥ 8 days → auto-suggest creating an RTP protocol
2. **Recurrence vs exacerbation** determines which RTP template to use (more conservative for exacerbations)
3. **Body area** maps to sport-specific RTP templates (hamstring protocol, knee protocol, groin protocol)
4. **Time-loss category** sets expected phase durations
5. **Daily wellness pain scores** feed Phase 1 criteria (pain-free for X consecutive days)
6. **Availability status returning to "fully available"** is a gate criterion for Phase 4

---

## Build Phases

### Phase 1: FIFA Daily Template (3-4 days)
- Create the Tier 1 daily form as a default template in QuestionnaireManager
- Add `health_problem_flag`, `readiness`, and `tier` fields to wellness_responses
- Build the auto-flag engine (runs after each daily submission)
- Create the wellness_flags table + RLS policies
- Update WellnessHub dashboard to show flags with athlete name + trigger

### Phase 2: Weekly Deep Check (3-4 days)
- Create the Tier 2 weekly form with FIFA-aligned classification fields
- Build the auto-assignment system (flag → assigns weekly form to athlete)
- Create the injury_classifications table + RLS policies
- Build the weekly classification review UI for the sport scientist
- Auto-populate injury reports from completed weekly classifications

### Phase 3: Visualisations & Insights (2-3 days)
- Team wellness heatmap (athletes × days)
- Individual sparklines (14-day rolling per metric)
- Flag timeline per athlete
- Compliance tracking dashboard
- Injury burden calculation (days lost / 1000 hours — per Waldén)

### Phase 4: Smart Thresholds Integration (1-2 days)
- Connect auto-flag engine to individualized thresholds (personal baselines instead of generic cutoffs)
- Personal flag sensitivity: athletes with normally low fatigue get flagged at lower values

### Phase 5: Research Form + RTP Connection (2-3 days)
- Tier 3 full research-grade form
- Auto-suggest RTP protocol creation from weekly classifications with time-loss ≥ 8 days
- Feed injury_classifications into RTP system

**Total estimated effort: 11-16 days across 5 phases**

---

## Key Design Decisions

1. **The daily form is NOT a new questionnaire system** — it's a pre-built default template within the existing QuestionnaireManager, with structured fields that save to specific database columns for reliable querying.

2. **The weekly form is NOT sent to everyone** — only flagged athletes. This prevents survey fatigue and keeps compliance high.

3. **Auto-flags run server-side** (Supabase Edge Function or database trigger), not client-side. This ensures flags fire even if the sport scientist isn't logged in.

4. **The athlete sees ONE form** — not "daily form" and "weekly form" separately. If flagged, the weekly questions appear as additional steps at the end of their next daily submission. They don't need to know about tiers.

5. **Framing matters** — "Quick check to help us manage your load better" not "You've been flagged." The language in the form UI is empowering, not clinical.

6. **Backward compatible** — existing custom questionnaires continue to work. The FIFA-aligned system is an opt-in default template, not a replacement.
