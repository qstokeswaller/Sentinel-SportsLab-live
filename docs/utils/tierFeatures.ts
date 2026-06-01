// Central tier-feature gating. Single source of truth for which subscription tier
// can access which platform capability. Used by Sidebar (lock icons), Router (route
// guards), and any in-page upsells.
//
// Tier ladder: basic ⊂ performance ⊂ elite (each higher tier inherits everything
// from the tier below). Add a new feature in two places: TIER_RANK and FEATURE_TIER.

export type Tier = 'basic' | 'performance' | 'elite';

export const TIER_RANK: Record<Tier, number> = {
    basic: 0,
    performance: 1,
    elite: 2,
};

export const TIER_LABEL: Record<Tier, string> = {
    basic: 'Basic',
    performance: 'Performance',
    elite: 'Elite',
};

// Feature keys correspond to sidebar nav ids + a few cross-cutting capabilities.
export type Feature =
    | 'dashboard'
    | 'roster'
    | 'workouts'
    | 'library'
    | 'testing'
    | 'calendar'
    | 'planner'          // periodization planner
    | 'wellness'         // wellness hub
    | 'conditioning'     // conditioning hub
    | 'injuries'         // injury tracking inside wellness
    | 'acwr'             // ACWR load monitoring
    | 'reporting'        // reporting hub (GPS Data + Insights)
    | 'gps'              // GPS Data import
    | 'analytics'        // analytics hub (5 terminals)
    | 'lab';             // performance lab modal

// Minimum tier required for each feature. Anything not in this map is treated as
// 'basic' (available to everyone). Keep this aligned with the pricing page.
export const FEATURE_TIER: Record<Feature, Tier> = {
    dashboard:     'basic',
    roster:        'basic',
    workouts:      'basic',
    library:       'basic',
    testing:       'basic',
    calendar:      'basic',
    planner:       'elite',          // periodization planner is Elite per pricing page
    wellness:      'performance',
    conditioning:  'performance',
    injuries:      'performance',
    acwr:          'elite',
    reporting:     'elite',
    gps:           'elite',
    analytics:     'elite',
    lab:           'elite',
};

/** Returns true when `userTier` meets or exceeds the requirement for `feature`. */
export function hasFeatureAccess(userTier: Tier | null | undefined, feature: Feature): boolean {
    if (!userTier) return false;
    const required = FEATURE_TIER[feature];
    return TIER_RANK[userTier] >= TIER_RANK[required];
}

/** Tier required to unlock the feature, for display in lock pills / upgrade modals. */
export function requiredTierFor(feature: Feature): Tier {
    return FEATURE_TIER[feature];
}
