# Plan: Dashboard Heatmap Replacement + Automated Wellness/Injury Report

> Status: PENDING — Part 1 design finalised, awaiting two open questions before building. Part 2 awaiting sport scientist scope answers.

---

## Background

Sport scientist feedback (April 2026):
- The Squad Readiness Heatmap feels decorative rather than actionable
- Wants priority alerts + wellness data in that space instead, with a shortcut directly to the Wellness Hub
- Wants the ability to pull a report that links wellness and injury data — a narrative "write-up" of what the app sees (at-risk players by hamstring load, illness/medical flags, etc.)
- Coaches rarely open the app but should be able to navigate to a snapshot for any specific day when needed

---

## Part 1 — Replace Heatmap with Priority Flags Panel

### Decision
Replace the Squad Readiness Heatmap card with a **"Priority Flags"** panel. The heatmap is visually appealing but doesn't tell staff *who to act on* or *why*.

### Current heatmap location
Right column (`lg:col-span-2`) in [DashboardPage.tsx](docs/pages/DashboardPage.tsx) ~line 492. Sits alongside the Morning Report card. Requires team filter selection before anything loads. Uses `computeComposite` + `scoreToHex` from `wellnessScoring.ts` to colour athlete dots.

### Panel design

Replace the heatmap div entirely. Two sections stacked inside the new card:

**1. Flagged Athletes list**
Athlete appears if any of these are true:
- ACWR ratio > 1.3 (Elevated) or > 1.5 (Critical) — from `calculateACWR` + `acwrExclusions`
- Health complaint flagged in last 48h (Q3 `health_complaint === true` in `wellnessResponses`)
- Wellness score below threshold (energy < 3 or stress > 8 in last submission in `wellnessData`)
- Acute pain in body heatmap data last 24h (`bodyHeatmapData`)
- Player in "Returning from Injury" phase (`acwrExclusions[id].returnAnchorDate` set)

Sorted: Critical first → Elevated → wellness flags → returning. Each row: avatar + name + team badge + flag chip + relative timestamp ("2h ago", "Yesterday"). Clicking a row → navigate to `/wellness` and open that athlete's ACWR drill-down.

**2. Team compliance strip**
One line per ACWR-enabled team: `Rugby · 8 / 12 responded · 2 flagged`. Clicking team name → navigate to `/wellness` filtered to that team.

**Top-right of the card header:**
- "View Wellness Hub →" link — context-aware: goes to the team currently focused in Morning Report if one is selected, otherwise to the hub landing.

### What changes in the Morning Report
Nothing — the Morning Report card is untouched. The athlete focus click behaviour (`dashboardFilterTarget`) moves from heatmap dot click to flagged athlete row click in the new panel.

### Open questions before building
1. **Time window** — Flagged list shows flags from **today only** or **last 48h**? (48h recommended — catches athletes who submitted last night but haven't yet today)
2. **Heatmap fate** — **Fully replace** (sport scientist said it feels decorative) or keep a smaller collapsed version below the new panel?

---

## Part 2 — Automated Wellness + Injury Report ("Write-up")

> NOT STARTED — needs answers to scope questions below before planning.

### Concept
An automated narrative report that:
- Identifies at-risk players (load/hamstring risk, illness, medical flags)
- Pulls from wellness submissions + injury classifications + ACWR + session load
- Provides a date-specific snapshot for coaches
- Is accessible without needing to navigate the full app

### Questions to take back to sport scientist

1. **Format** — PDF download, a screen inside the app, or an email/notification delivered before training?
2. **Frequency** — Daily auto-generated, on-demand (pick a date), or both?
3. **Audience** — Is this for the sport scientist to send to the coach, or does the coach log in and view it themselves? (If coaches don't open the app, is the goal to *deliver* a summary rather than require a login?)
4. **Injury linkage depth** — "Hamstring standpoint" = athletes flagged with a hamstring classification + their ACWR trend? Or predictive (identifying athletes statistically at risk based on load patterns before a flag exists)?
5. **Wellness linkage** — Which fields feed the report? ACWR, subjective scores (sleep/fatigue/mood), health complaint flags, URTI symptom data?

### Pre-planned technical approach (once scope confirmed)

- `ReportPage` or modal that accepts a `date` param, assembles data from: wellness submissions, injury classifications, ACWR calculations, session load — all already in Supabase
- Structured template with sections: **At-Risk (Load)** / **Flagged (Medical)** / **Illness Watch** / **All Clear**
- Write-up language: **template-driven** (not AI) — faster, cheaper, consistent. Claude API call is an option if narrative quality needs to be higher, but adds cost + latency
- PDF export: `window.print()` + print stylesheet for simplicity, or `jsPDF` if precise formatting is required
