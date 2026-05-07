# Responsive Design Research — Sentinel SportsLab (Tablet-First)

**Researched:** 2026-04-21
**Domain:** React 19 + Tailwind CSS — tablet-responsive dashboard design
**Confidence:** HIGH (verified against official Tailwind docs, shadcn/ui docs, TanStack Table docs, MDN)

---

## Summary

Sentinel SportsLab has no existing mobile/tablet strategy. The minimum target is 768px (tablet portrait), with
landscape tablet at 1024px. Smartphones are explicitly out of scope. The app has a fixed sidebar (240px / 64px),
data-heavy tables including 40+ column GPS data, and 8+ modals with fixed max-widths.

The industry-standard pattern for data dashboards at this screen size is: **sidebar collapses to an off-canvas
drawer at < 1024px**, triggered by a hamburger in a top nav bar. Tables use **horizontal scroll + sticky first
column** as the primary strategy — card-view transforms are a mobile-first pattern and are not needed here.
Modals become **full-viewport on tablet portrait** by removing the max-w constraint below `lg:` breakpoint.
Touch targets must be bumped to a minimum of 44px height/width on all interactive elements.

**Primary recommendation:** Use `lg:` (1024px) as the primary drawer-vs-sidebar threshold. Below `lg:` the
sidebar hides and a top bar appears with hamburger + logo + page title. Above `lg:` the existing sidebar
behavior is unchanged. The `md:` breakpoint (768px) handles internal layout adjustments within pages.

---

## 1. Tailwind Breakpoint Strategy

### Default Tailwind Breakpoints (v3 and v4 — identical)

| Prefix | Min Width | Covers |
|--------|-----------|--------|
| (none) | 0px | — base styles (we never target phones, so base = tablet portrait floor) |
| `sm:` | 640px | Below our minimum — do not use for layout |
| `md:` | 768px | Tablet portrait (768–1023px) |
| `lg:` | 1024px | Tablet landscape + small desktop (1024–1279px) |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktop |

**Source:** https://tailwindcss.com/docs/responsive-design (verified 2026-04-21)

### Tablet-First Strategy for This App

Tailwind is mobile-first by design: unprefixed utilities apply to all sizes, prefixed utilities apply
at that breakpoint and above. Since this app targets tablet as the minimum, the strategy is:

- **Base (unprefixed):** Write for **tablet portrait** (768px). This is the new "mobile-first" baseline.
- **`md:`:** Use for adjustments at exactly 768px+ where needed (e.g., padding, column count within pages).
- **`lg:`:** The primary responsive breakpoint for **layout structure** — sidebar vs. drawer, column grids,
  modal sizing. Think of `lg:` as the "desktop mode unlocks here" prefix.
- **`xl:`:** Additional density/spacing for full desktop.
- **`sm:`:** Almost never used — would target below our minimum. Avoid except for rare edge cases.

```
Pattern:          Base                  md:               lg:               xl:
                  (≥0px, tablet floor)  (≥768px portrait) (≥1024px desktop) (≥1280px)
Sidebar:          hidden (drawer)       hidden (drawer)   visible fixed     visible fixed
Top bar:          visible               visible           hidden            hidden
Modal max-w:      full-screen           full-screen       max-w-2xl         max-w-2xl
Grid cols:        1-2                   2                 3-4               4
Table padding:    compact               compact           normal            normal
```

### Portrait vs. Landscape Strategy

**Recommendation: use width breakpoints only, not `orientation:` media queries.**

The reason: An iPad in portrait is 768–820px wide. An iPad in landscape is 1024–1180px wide. These map
cleanly to `md:` and `lg:` respectively. Width-based breakpoints are simpler, more predictable, and
better supported in Tailwind than orientation media queries.

If you ever need orientation-specific overrides (rare), add to `tailwind.config.js`:

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      screens: {
        // Only add if you truly need orientation-specific CSS
        portrait: { raw: '(orientation: portrait)' },
        landscape: { raw: '(orientation: landscape)' },
      },
    },
  },
};
```

Usage: `portrait:hidden`, `landscape:block`. Use sparingly — width breakpoints cover most cases.

**Decision: `lg:` (1024px) is the primary layout breakpoint.**
- Below `lg:` → drawer sidebar, top bar visible, full-width modals
- At `lg:` and above → fixed sidebar, top bar hidden, standard modal max-widths

---

## 2. Sidebar Drawer Pattern

### Current State

`Sidebar.tsx` renders a `<nav>` with hardcoded `w-16` or `w-60` width. It is always visible. The root layout
in `App.tsx` (line 424) is:

```jsx
<div className="flex h-screen bg-slate-50 overflow-hidden">
  <Sidebar />
  <main className="flex-1 overflow-y-auto ...">
```

There is no drawer, overlay, or top bar. The sidebar has no knowledge of viewport size.

### Industry-Standard Drawer Pattern

The standard pattern for data dashboards (Linear, Vercel, Supabase, shadcn admin demos):

1. **Desktop (≥ 1024px):** Fixed sidebar always visible, `w-60` or `w-16` collapsed.
2. **Tablet (< 1024px):** Sidebar hidden. Top bar with hamburger appears. Clicking hamburger opens a left-edge
   slide-in drawer with a semi-transparent overlay behind it. Clicking overlay or pressing Escape closes it.

shadcn/ui implements this pattern exactly via the `Sheet` component (`side="left"`), which is built on Radix UI
Dialog (focus trapping, Escape key handling, accessibility built in).

### Recommended Implementation (vanilla React + Tailwind, no new library deps)

Since the project does not currently use shadcn/ui, implement as a custom hook + component:

#### `useIsMobile` hook (add to `docs/hooks/useIsMobile.ts`)

```typescript
import { useEffect, useState } from 'react';

// Returns true when viewport is below the desktop sidebar threshold (lg = 1024px)
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
```

#### AppStateContext additions

Add two new state values to `AppStateContext.tsx`:

```typescript
// In AppStateContext state:
const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

// Expose in context value:
isMobileDrawerOpen,
setIsMobileDrawerOpen,
```

#### Updated `Sidebar.tsx` structure

```tsx
import { useIsMobile } from '../../hooks/useIsMobile';

export const Sidebar = () => {
  const isMobile = useIsMobile();
  const { isMobileDrawerOpen, setIsMobileDrawerOpen, isSidebarCollapsed, ... } = useAppState();

  // Mobile: render as overlay drawer
  if (isMobile) {
    return (
      <>
        {/* Backdrop overlay */}
        {isMobileDrawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />
        )}
        {/* Drawer panel */}
        <nav
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200
            flex flex-col transition-transform duration-300 ease-in-out
            ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
          aria-label="Navigation"
        >
          {/* Close button inside drawer */}
          <button
            onClick={() => setIsMobileDrawerOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <XIcon size={18} />
          </button>
          {/* ...same nav items as existing sidebar... */}
        </nav>
      </>
    );
  }

  // Desktop: existing fixed sidebar (unchanged)
  return (
    <nav className={`${isSidebarCollapsed ? 'w-16' : 'w-60'} bg-white border-r ...`}>
      {/* existing content unchanged */}
    </nav>
  );
};
```

#### Top navigation bar (`docs/components/layout/TopBar.tsx`)

Only rendered when `isMobile === true` (i.e., below 1024px):

```tsx
import { MenuIcon, ActivityIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';
import { useIsMobile } from '../../hooks/useIsMobile';

export const TopBar = () => {
  const isMobile = useIsMobile();
  const { setIsMobileDrawerOpen, activeTab } = useAppState();

  if (!isMobile) return null;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0 z-30">
      {/* Hamburger */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="Open navigation"
      >
        <MenuIcon size={20} />
      </button>

      {/* Logo mark */}
      <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
        <ActivityIcon className="text-white w-4 h-4" />
      </div>

      {/* Page title — derive from activeTab */}
      <span className="text-sm font-semibold text-slate-900 truncate flex-1">
        {pageTitleFromTab(activeTab)}
      </span>

      {/* User avatar — right side */}
      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
        <span className="text-xs font-semibold text-indigo-600">{userInitial}</span>
      </div>
    </header>
  );
};
```

#### Root layout update (`App.tsx`, line 423–426)

```tsx
// Before:
<div className="flex h-screen bg-slate-50 overflow-hidden">
  <Sidebar />
  <main className="flex-1 overflow-y-auto ...">

// After:
<div className="flex h-screen bg-slate-50 overflow-hidden">
  <Sidebar />  {/* Desktop sidebar — hidden on mobile via its own isMobile check */}
  <div className="flex-1 flex flex-col overflow-hidden">
    <TopBar />  {/* Only renders when < 1024px */}
    <main className="flex-1 overflow-y-auto no-scrollbar relative pb-6">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
        {/* routes */}
      </div>
    </main>
  </div>
</div>
```

#### Escape key handler

Add to `Sidebar.tsx` or a top-level `useEffect` in the drawer branch:

```typescript
useEffect(() => {
  if (!isMobileDrawerOpen) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setIsMobileDrawerOpen(false);
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, [isMobileDrawerOpen]);
```

#### Close drawer on navigation

In the nav item `onClick` handlers within the mobile drawer branch, call `setIsMobileDrawerOpen(false)`
after navigating. This ensures the drawer closes when the user picks a page.

### Why Not Use shadcn Sheet / headlessui Dialog

The project has no shadcn/ui installed. Adding it for one component introduces a significant dependency.
The vanilla pattern above achieves identical UX with no new libraries. It handles:
- Slide animation via `translate-x` transition
- Overlay dismiss via backdrop `onClick`
- Keyboard dismiss via Escape `keydown` listener
- Focus trapping can be added with `inert` attribute on main content when open (HTML native, no library needed)

---

## 3. Dense Data Table Patterns on Tablet

### Current State

The app has GPS data tables with 40+ columns and ACWR roster tables. Current approach appears to be ad-hoc —
no systematic overflow or sticky column strategy detected in RosterPage.tsx.

### Industry Recommendation for Analytics Dashboards

**Primary pattern (confirmed by Grafana, Datadog, analytics tools): horizontal scroll + sticky first column.**

This is the correct strategy for tablet. Card-view transforms are a smartphone pattern. Sports analytics
professionals on tablets expect to be able to scroll through the data — they do not want cards.

Quote from artofstyleframe.com dashboard research (2026):
> "A horizontal scroll with a fixed first column handles the rare tablet user. Don't stack table rows into
> cards unless mobile is a primary use case."

### Sticky First Column + Horizontal Scroll Pattern

```tsx
{/* Table container */}
<div className="overflow-x-auto rounded-lg border border-slate-200">
  <table className="min-w-full text-sm border-collapse">
    <thead className="bg-slate-50 sticky top-0 z-20">
      <tr>
        {/* Sticky first column header */}
        <th className="sticky left-0 z-30 bg-slate-50 border-r border-slate-200
                       px-3 py-2.5 text-left font-semibold text-slate-700 min-w-[140px]">
          Athlete
        </th>
        {/* Scrolling columns */}
        <th className="px-3 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap min-w-[80px]">
          Total Distance
        </th>
        {/* ...more columns */}
      </tr>
    </thead>
    <tbody>
      <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        {/* Sticky first column cell — MUST have solid bg, same as table bg */}
        <td className="sticky left-0 z-10 bg-white border-r border-slate-200
                       px-3 py-2.5 font-medium text-slate-900">
          James M.
        </td>
        <td className="px-3 py-2.5 text-right text-slate-600 whitespace-nowrap">8,234m</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Critical rule:** Sticky cells MUST have a solid, opaque background color (e.g., `bg-white`, `bg-slate-50`).
Transparent or missing background causes cells to render through each other during scroll — one of the most
common implementation bugs.

### Column Visibility Toggles (TanStack Table approach)

For the GPS table specifically (40+ columns), add a "Columns" button that opens a dropdown panel letting the
user show/hide columns. TanStack Table has first-class support for this.

```typescript
// In GPS table component — managed state for column visibility
const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({
  // Hidden by default on tablet (shown on desktop)
  playerLoad: window.innerWidth >= 1024,
  accelerationDensity: window.innerWidth >= 1024,
  decelerationDensity: window.innerWidth >= 1024,
  // Always visible (locked columns)
  athleteName: true,
  totalDistance: true,
  hsrDistance: true,
  maxVelocity: true,
});

const table = useReactTable({
  data,
  columns,
  state: { columnVisibility },
  onColumnVisibilityChange: setColumnVisibility,
  getCoreRowModel: getCoreRowModel(),
});
```

Column visibility dropdown UI:
```tsx
<div className="relative">
  <button className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg
                     hover:bg-slate-50 min-h-[44px]">
    <Columns3Icon size={14} />
    <span>Columns</span>
  </button>
  {/* Dropdown with checkboxes for each column */}
</div>
```

**Source:** https://tanstack.com/table/v8/docs/guide/column-visibility (verified 2026-04-21)

### Priority Column Strategy (without TanStack)

For simpler tables that don't use TanStack, use CSS `hidden` + breakpoint utilities to hide
lower-priority columns on smaller viewports:

```tsx
// In table headers and cells — hide non-essential GPS columns on portrait tablet
<th className="hidden lg:table-cell px-3 py-2.5 ...">Acceleration Count</th>
<td className="hidden lg:table-cell px-3 py-2.5 ...">24</td>

// Always visible
<th className="px-3 py-2.5 ...">Total Distance</th>
<td className="px-3 py-2.5 ...">8,234m</td>
```

**Recommended priority tiers for GPS/performance tables:**

| Tier | Always visible | Hidden below lg: | Hidden below xl: |
|------|---------------|-------------------|-------------------|
| 1 | Athlete name, Total Distance, HSR Distance, Max Velocity | — | — |
| 2 | — | Player Load, Accel Count, Decel Count | — |
| 3 | — | — | Accel Density, Decel Density, Distance Zones 1-6 |

### Row Height for Touch

All `<tr>` elements should have a minimum row height of 44px to meet touch target guidelines:
```tsx
<tr className="h-11 ...">  {/* h-11 = 44px */}
```

Or via cell padding: `py-2.5` on `<td>` elements (10px top + 10px bottom + ~24px text = ~44px).

---

## 4. Modal Responsive Patterns

### Current State

Modals in `App.tsx` use a consistent structure:
```
fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4
  └── div: bg-white rounded-xl w-full max-w-{lg|2xl|5xl|6xl} max-h-[90vh] overflow-hidden flex flex-col
```

Problem: `max-w-lg` (512px) works fine on tablet. But `max-w-2xl` (672px) and `max-w-5xl` (1024px) on a
768px portrait tablet viewport leaves only ~48px of padding — cramped. `max-w-6xl` (1152px) overflows.

### Industry Standard for Tablet

The pattern used by Linear, Vercel, Supabase, and similar SaaS apps:
- **Tablet portrait (< 1024px):** Modal takes full viewport width, full or near-full height.
  Remove horizontal padding. Use `rounded-none` or reduce rounding.
- **Tablet landscape / desktop (≥ 1024px):** Standard centered modal with max-width.

```tsx
{/* Modal backdrop — same as before */}
<div className="fixed inset-0 z-[600] flex items-center justify-center
                bg-black/50 backdrop-blur-sm p-0 lg:p-4">

  {/* Modal panel — full-width on tablet portrait, constrained on desktop */}
  <div className="bg-white w-full h-full lg:h-auto lg:rounded-xl
                  lg:max-w-2xl lg:max-h-[90vh]
                  overflow-hidden flex flex-col shadow-xl border border-slate-200">
    {/* header, body, footer unchanged */}
  </div>
</div>
```

**Key Tailwind class changes per modal size:**

| Current | Tablet fix | Desktop (lg:) |
|---------|-----------|---------------|
| `p-4` on wrapper | `p-0 lg:p-4` | `p-4` |
| `rounded-xl` on panel | `rounded-none lg:rounded-xl` | `rounded-xl` |
| `max-w-2xl` | remove, add `lg:max-w-2xl` | `max-w-2xl` |
| `max-w-5xl` | remove, add `lg:max-w-5xl` | `max-w-5xl` |
| `max-h-[90vh]` | `h-full lg:h-auto lg:max-h-[90vh]` | `max-h-[90vh]` |

**Exception for small modals:** `max-w-md` (448px) and `max-w-lg` (512px) fit comfortably on 768px
portrait with `p-4` padding. These can keep their current structure with just `rounded-xl` being retained.
Only the large modals (`max-w-2xl` and above) need the full-screen treatment.

**Large modal inventory in the codebase requiring full-screen treatment:**
- `WeightroomSheetModal` — `max-w-6xl` — definitely needs full-screen tablet
- `ACWRDetailModal` — `max-w-5xl` — needs full-screen tablet
- `AthleteProfileModal` — `max-w-2xl` — needs full-screen tablet

**Small modals that are fine as-is:**
- `AddAthleteModal` — `max-w-lg` — OK
- `AddSessionModal` — `max-w-lg` — OK
- `SessionModal` — `max-w-md` — OK

---

## 5. Top Navigation Bar on Tablet

### What Goes in the Top Bar

Based on industry patterns (Linear, Vercel dashboard, shadcn admin blocks):

```
[ Hamburger ]  [ Logo mark ]  [ Page Title ]  ............  [ User Avatar ]
```

Recommended contents (left to right):
1. **Hamburger button** — `MenuIcon` from lucide-react, 44x44px minimum hit area
2. **Logo mark** — just the icon (`ActivityIcon` in indigo square), not full text
3. **Current page title** — derived from `activeTab` state, truncated with `truncate`
4. **Spacer** — `flex-1`
5. **User avatar** — initials in indigo circle, tappable to navigate to Settings

**Do NOT include in top bar:** Breadcrumbs (only useful in hierarchical apps with deep pages; this
app is flat-navigation), search (each page has its own search), notification bell (not in current design).

### Page title mapping

```typescript
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  periodization: 'Planner',
  clients: 'Roster',
  workouts: 'Workouts',
  library: 'Library',
  conditioning: 'Conditioning Hub',
  analytics: 'Analytics Hub',
  reports: 'Reporting Hub',
  wellness: 'Wellness Hub',
  testing: 'Testing Hub',
  lab: 'Performance Lab',
  settings: 'Settings',
};
```

### Top bar height

Use `h-14` (56px). This matches industry standard (e.g., Linear uses 48px, GitHub uses 58px).
The sidebar currently has a logo area that is approximately the same height — the transition will feel natural.

---

## 6. Touch Target Sizes

### Standards (verified sources)

| Standard | Minimum | Preferred |
|----------|---------|-----------|
| Apple HIG (iPad) | 44 × 44pt ≈ 44px CSS | — |
| Material Design 3 | 48 × 48dp | — |
| WCAG 2.1 AAA (2.5.5) | 44 × 44px | — |
| WCAG 2.2 AA (2.5.8) | 24 × 24px (with spacing) | 44 × 44px |

**Use 44px as the practical minimum for all interactive elements.**

**Sources:** https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/,
https://web.dev/articles/accessible-tap-targets

### Tailwind Class Cheatsheet

| Element | Current (likely) | Tablet fix |
|---------|-----------------|------------|
| Nav buttons (sidebar) | `py-2.5` (~42px) | `py-2.5 min-h-[44px]` — already close, verify |
| Table action buttons | `p-1.5` or `p-2` | `min-h-[44px] min-w-[44px] p-2.5` |
| Dropdown trigger buttons | `px-3 py-2` | `min-h-[44px] px-3 py-2` |
| Form inputs (select, input) | `py-2` | `min-h-[44px] py-2.5` |
| Icon-only buttons | `p-1` | `p-2.5 min-h-[44px] min-w-[44px]` |
| Modal close (X) buttons | `p-2` | `p-2.5 min-h-[44px] min-w-[44px]` |
| Top bar hamburger | n/a (new) | `min-h-[44px] min-w-[44px] p-2.5` |
| Table rows | variable | `h-11` (44px) via `py-2.5` on cells |

### Key insight on table rows

Table rows are interactive (clickable to expand/open modal) in several places. Ensure row cells use at
minimum `py-2.5` (10px top + 10px bottom + line height = ~44px total). Dense data tables can use `py-2`
(8px + 8px = ~40px) if the design requires it — just under the 44px threshold but acceptable for
professional analytics tools where power users are the target audience.

---

## 7. Landscape vs. Portrait Strategy

### Practical differences at tablet viewport widths

| Orientation | Width | Height | Sidebar |
|-------------|-------|--------|---------|
| iPad mini portrait | 768px | 1024px | Drawer (below lg:) |
| iPad mini landscape | 1024px | 768px | Fixed sidebar (at lg:) |
| iPad portrait | 820px | 1180px | Drawer (below lg:) |
| iPad landscape | 1180px | 820px | Fixed sidebar (at lg:) |
| iPad Pro 12.9" portrait | 1024px | 1366px | Fixed sidebar (at lg:) |
| iPad Pro 12.9" landscape | 1366px | 1024px | Fixed sidebar (at lg:) |

### Recommended approach: width-first, not orientation-first

Because `lg:` (1024px) maps cleanly to landscape tablet, using width breakpoints handles both
orientations automatically without any `orientation:` media queries.

The only scenario where this is imperfect: iPad Pro 12.9" portrait is 1024px wide — meaning it triggers
the `lg:` (desktop) layout, which means the sidebar stays fixed in portrait. This is actually desirable
for a large tablet — that extra width makes the fixed sidebar usable.

### Specific landscape considerations

In landscape (1024px+), the sidebar is fixed. Pages should use this additional width for:
- Charts: wider, can show more data points
- Tables: more columns visible, reduce need for column hiding
- Dashboard grid: switch from 2-col to 3-col or 4-col

```tsx
// Dashboard stat cards example
<div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
```

### Do not use `orientation:` media queries

Avoid:
```css
@media (orientation: portrait) { ... }  /* Don't do this */
```

Reason: These are viewport-based, not device-based. Resizing a browser window on desktop can trigger
portrait mode at narrow widths. Stick to width breakpoints. If you genuinely need portrait-only behavior
(e.g., rotating a chart), use a JavaScript approach via `window.screen.orientation` or detect via
`window.innerWidth < window.innerHeight`.

---

## 8. Existing Codebase — What Must Change

### App.tsx layout (line 424)

**Current:**
```tsx
<div className="flex h-screen bg-slate-50 overflow-hidden">
  <Sidebar />
  <main className="flex-1 overflow-y-auto no-scrollbar relative min-h-screen pb-24 md:pb-0">
    <div className="max-w-7xl mx-auto px-6 py-6">
```

**After:**
```tsx
<div className="flex h-screen bg-slate-50 overflow-hidden">
  <Sidebar />  {/* Handles its own mobile vs desktop rendering */}
  <div className="flex-1 flex flex-col overflow-hidden min-w-0">
    <TopBar />  {/* New — only renders below lg: */}
    <main className="flex-1 overflow-y-auto no-scrollbar relative">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4 lg:py-6">
```

Note: Add `min-w-0` to the flex-1 wrapper — this prevents flex children from overflowing their parent,
which is one of the most common tablet responsive bugs in flex layouts.

### Page-level padding

Reduce padding on tablet: `px-4 lg:px-6` and `py-4 lg:py-6` instead of flat `px-6 py-6`.

### Existing `md:pb-0` on main

The current `pb-24 md:pb-0` on the main element suggests an old mobile-bottom-nav consideration that
is no longer relevant. After adding the top bar, this can be removed or changed to `pb-6`.

---

## 9. Architecture Patterns — Do Not Hand-Roll

| Problem | Don't Build | Use Instead | Reason |
|---------|-------------|-------------|--------|
| Media query in JS | `window.innerWidth` checks on every render | `useMediaQuery` hook with `matchMedia` | matchMedia fires events; polling doesn't |
| Column visibility | Custom boolean state per column | TanStack Table `columnVisibility` state | Built-in row rendering, toggle APIs |
| Drawer focus trap | Manual focus management | `inert` attribute on main content OR Headless UI | Complex edge cases with nested modals |
| Sticky column z-index | Ad-hoc z-index values | Systematic z-index scale | Conflicts with modals at high z-index |

### Z-index reference (existing + recommended)

| Layer | z-index | Notes |
|-------|---------|-------|
| Sticky table columns | 10 | `z-10` |
| Sticky table headers | 20 | `z-20` |
| Sticky header + column intersection | 30 | `z-30` |
| Mobile drawer backdrop | 40 | `z-40` |
| Mobile drawer panel | 50 | `z-50` |
| Top bar | 30 | `z-30` (below drawer) |
| Modals | 600+ | Existing — keep as-is |

---

## 10. Common Pitfalls

### Pitfall 1: Sticky cells with transparent background
**What goes wrong:** Sticky column cells render with the scrollable content showing through them.
**Root cause:** `position: sticky` does not create a new stacking context or clip background. If `bg-*`
is missing or `bg-transparent`, the row behind scrolls through the stuck cell.
**Fix:** Every `sticky` cell must have an opaque `bg-white` or `bg-slate-50` (matching the row color).
**Warning signs:** Sticky column looks fine in Chromium, glitches in Safari.

### Pitfall 2: Flex children overflowing on tablet
**What goes wrong:** `flex-1` child div (main content area) wider than available space, causing
horizontal scroll on the page.
**Root cause:** Flex items have `min-width: auto` by default. Without `min-w-0`, a child can be wider
than its parent in a flex row.
**Fix:** Add `min-w-0` to any `flex-1` wrapper that contains a table or wide content.
**Warning signs:** Entire page scrolls horizontally; table extends behind sidebar on tablet.

### Pitfall 3: `isSidebarCollapsed` state conflicts with drawer
**What goes wrong:** When the sidebar is in drawer mode, `isSidebarCollapsed` state from AppStateContext
can be in any state, causing the drawer to render as collapsed (64px icon mode) instead of full-width.
**Fix:** In the mobile drawer branch of Sidebar.tsx, ignore `isSidebarCollapsed` entirely. Drawer always
renders full-width (w-64) regardless of the desktop collapsed state.

### Pitfall 4: Modals missing `p-4` → edge bleeding on small tablets
**What goes wrong:** On a 768px wide tablet, a `max-w-5xl` modal without the `p-0 lg:p-4` pattern renders
with overflow clipping or bleeds to screen edges.
**Fix:** Modal backdrop needs `p-0` on base, `lg:p-4` on desktop. Panel needs `h-full lg:h-auto`.

### Pitfall 5: Touch targets — invisible hit area deficiency
**What goes wrong:** Icon buttons with `p-1` or `p-1.5` have tiny hit areas (24-28px). On tablets,
users frequently miss-tap, especially on table row action icons.
**Fix:** All standalone icon buttons must use `min-h-[44px] min-w-[44px]`. Wrap icon in the button if
needed to reach 44px without changing visual icon size.

### Pitfall 6: `overflow-hidden` on root prevents sticky table headers from working
**What goes wrong:** `overflow: hidden` on an ancestor element clips `position: sticky` descendants,
preventing them from sticking.
**Root cause:** The `overflow-hidden` on the root `div` (App.tsx line 424) is for preventing page-level
scroll. The sticky elements inside the `<main>` (which has its own `overflow-y-auto`) should work
correctly, but if any intermediate wrapper has `overflow: hidden`, sticky breaks.
**Fix:** Keep `overflow-hidden` only on the outermost viewport container. Inner scrolling containers
that contain sticky elements should use `overflow-y-auto` without also having `overflow-x-hidden` unless
specifically needed (because `overflow-x: hidden` also breaks sticky in some browsers).

### Pitfall 7: Body scroll lock not applied when drawer is open
**What goes wrong:** When the mobile drawer is open on tablet, the main content area can still scroll
behind the overlay, causing a disorienting visual effect.
**Fix:** Apply `overflow-hidden` to `document.body` while the drawer is open:
```typescript
useEffect(() => {
  document.body.style.overflow = isMobileDrawerOpen ? 'hidden' : '';
  return () => { document.body.style.overflow = ''; };
}, [isMobileDrawerOpen]);
```

---

## Code Examples

### Complete useIsMobile hook

```typescript
// docs/hooks/useIsMobile.ts
import { useEffect, useState } from 'react';

const DESKTOP_BREAKPOINT = 1024; // lg: breakpoint — sidebar visible above this

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' ? window.innerWidth < DESKTOP_BREAKPOINT : false
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${DESKTOP_BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
```

### Responsive modal wrapper

```tsx
// Apply this pattern to modals larger than max-w-xl
// Backdrop:
<div className="fixed inset-0 z-[600] flex items-end lg:items-center justify-center
                bg-black/50 backdrop-blur-sm p-0 lg:p-4">
  {/* Panel: full-screen on tablet, constrained on desktop */}
  <div className="bg-white w-full h-[95dvh] lg:h-auto
                  rounded-t-2xl lg:rounded-xl
                  lg:max-w-2xl lg:max-h-[90vh]
                  overflow-hidden flex flex-col shadow-xl border border-slate-200">
```

Note: Using `items-end` + `rounded-t-2xl` + `h-[95dvh]` creates a bottom-sheet effect on tablet,
which is the most natural touch UX. `lg:items-center` + `lg:rounded-xl` returns to centered modal on desktop.
`dvh` (dynamic viewport height) accounts for iOS Safari's collapsing address bar — safer than `vh`.

### Responsive table container

```tsx
<div className="overflow-x-auto -mx-4 lg:mx-0 rounded-lg border border-slate-200">
  {/* -mx-4 on base lets the table break out to screen edges on tablet */}
  {/* lg:mx-0 restores normal margin on desktop */}
  <table className="min-w-full text-sm border-collapse">
    {/* ... */}
  </table>
</div>
```

### Column hide pattern (pure CSS, no TanStack needed)

```tsx
// In table header — priority columns
<th className="px-3 py-2.5 text-left sticky left-0 z-30 bg-slate-50">Athlete</th>  {/* Always */}
<th className="px-3 py-2.5 text-right">Total Dist.</th>                              {/* Always */}
<th className="hidden lg:table-cell px-3 py-2.5 text-right">Player Load</th>        {/* Desktop only */}
<th className="hidden xl:table-cell px-3 py-2.5 text-right">Accel Density</th>      {/* Wide desktop only */}
```

---

## Sources

### Primary (HIGH confidence — verified directly)
- **Tailwind CSS Responsive Design Docs** — https://tailwindcss.com/docs/responsive-design
  - Confirmed breakpoints: md=768px, lg=1024px
  - Confirmed mobile-first approach; custom `orientation:` breakpoints verified
- **TanStack Table Column Visibility Guide** — https://tanstack.com/table/v8/docs/guide/column-visibility
  - Confirmed `columnVisibility` state pattern, `initialState` vs managed state
- **shadcn/ui Sheet Component** — https://ui.shadcn.com/docs/components/sheet
  - Confirmed Sheet wraps Radix UI Dialog, `side="left"` for drawer
- **shadcn/ui Sidebar** — https://ui.shadcn.com/docs/components/sidebar
  - Confirmed `isMobile` prop, `openMobile` state, automatic Sheet on mobile

### Secondary (MEDIUM confidence — multiple sources agree)
- **Smashing Magazine: Touch Target Sizes** — https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/
  - 44px minimum confirmed; WCAG 2.1 AAA requirement
- **web.dev: Accessible Tap Targets** — https://web.dev/articles/accessible-tap-targets
  - 48px Google recommendation, 44px Apple/WCAG
- **LogRocket: Responsive Data Table UX** — https://blog.logrocket.com/improving-responsive-data-table-ux-css/
  - Sticky first column pattern confirmed
- **Appnroll: 5 Responsive Table Solutions** — https://medium.com/appnroll-publication/5-practical-solutions-to-make-responsive-data-tables-ff031c48b122
  - "Transformed" (card view) confirmed as wrong approach for analytics; horizontal scroll confirmed correct
- **Art of Styleframe: Dashboard Patterns 2026** — https://artofstyleframe.com/blog/dashboard-design-patterns-web-apps/
  - Confirmed horizontal scroll as correct strategy for tablet dashboard users

### Tertiary (informational reference)
- **Flowbite Modal Docs** — https://flowbite.com/docs/components/modal/
  - Modal responsive class pattern reference
- **DEV Community: Animated Drawer with React + Tailwind** — https://dev.to/morewings/lets-create-an-animated-drawer-using-react-and-tailwind-css-3ddp
  - Portal + backdrop + translate-x animation pattern

---

## Metadata

**Confidence breakdown:**
- Breakpoint strategy: HIGH — verified against official Tailwind docs
- Sidebar drawer pattern: HIGH — confirmed via shadcn/ui docs, multiple implementation articles
- Table patterns: HIGH — confirmed via TanStack docs, LogRocket, industry sources
- Modal patterns: MEDIUM — Flowbite + Tailwind docs; the bottom-sheet variant is an inference from patterns
- Touch targets: HIGH — confirmed via Smashing Magazine, web.dev, WCAG references
- Portrait vs landscape: HIGH — direct consequence of verified breakpoint values

**Research date:** 2026-04-21
**Valid until:** 2026-10-21 (Tailwind and React stable; 6-month estimate)
