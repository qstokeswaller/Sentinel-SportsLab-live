// Skeleton primitives (Phase 2, 2026-07-12).
// Rule from Quintin: every page's skeleton must be REALISTIC — mirror the page's
// actual tiles/cards/sections (and subsections), never generic grey boxes.
// Compose these primitives per page into that page's real layout.
import React from 'react';

const pulse = 'animate-pulse bg-slate-200/70 dark:bg-[#1A2D48]';

/** Basic shimmering block — give it explicit w/h via className. */
export const SkBlock: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`${pulse} rounded-md ${className}`} />
);

/** A line of "text" — width varies to look natural. */
export const SkText: React.FC<{ w?: string; className?: string }> = ({ w = 'w-32', className = '' }) => (
    <div className={`${pulse} rounded h-3 ${w} ${className}`} />
);

/** Card shell that matches the platform card look, with custom skeleton innards. */
export const SkCard: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`bg-white dark:bg-[#132338] rounded-xl border border-slate-200 dark:border-[#243A58] p-4 ${className}`}>
        {children}
    </div>
);

/** Stat/KPI tile row — icon chip + label + big number, like the real KPI tiles. */
export const SkStatCards: React.FC<{ count?: number; className?: string }> = ({ count = 4, className = '' }) => (
    <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))` }}>
        {Array.from({ length: count }).map((_, i) => (
            <SkCard key={i}>
                <div className="flex items-center gap-2 mb-3">
                    <SkBlock className="w-8 h-8 rounded-lg" />
                    <SkText w="w-20" />
                </div>
                <SkBlock className="h-7 w-16 mb-1.5" />
                <SkText w="w-24" className="h-2.5" />
            </SkCard>
        ))}
    </div>
);

/** Table shape — header row + N data rows with per-column cells. */
export const SkTable: React.FC<{ rows?: number; cols?: number; className?: string }> = ({ rows = 6, cols = 5, className = '' }) => (
    <SkCard className={className}>
        <div className="flex gap-4 pb-3 border-b border-slate-100 dark:border-[#1A2D48] mb-3">
            {Array.from({ length: cols }).map((_, i) => <SkText key={i} w={i === 0 ? 'w-32' : 'w-16'} />)}
        </div>
        <div className="space-y-3">
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} className="flex items-center gap-4">
                    <div className="flex items-center gap-2 w-32 shrink-0">
                        <SkBlock className="w-7 h-7 rounded-full" />
                        <SkText w="w-20" />
                    </div>
                    {Array.from({ length: cols - 1 }).map((_, c) => <SkBlock key={c} className="h-5 w-16 rounded-full" />)}
                </div>
            ))}
        </div>
    </SkCard>
);

/** List of horizontal item cards (e.g. plans, templates, documents). */
export const SkListCards: React.FC<{ count?: number; className?: string }> = ({ count = 3, className = '' }) => (
    <div className={`space-y-3 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <SkCard key={i}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <SkBlock className="w-10 h-10 rounded-lg" />
                        <div className="space-y-2">
                            <SkText w="w-40" />
                            <SkText w="w-24" className="h-2.5" />
                        </div>
                    </div>
                    <SkBlock className="h-8 w-20 rounded-lg" />
                </div>
            </SkCard>
        ))}
    </div>
);

/** Grid of square-ish tiles (e.g. exercise library, protocol grid). */
export const SkTileGrid: React.FC<{ count?: number; className?: string }> = ({ count = 8, className = '' }) => (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <SkCard key={i}>
                <SkBlock className="h-24 w-full mb-3 rounded-lg" />
                <SkText w="w-3/4" className="mb-2" />
                <SkText w="w-1/2" className="h-2.5" />
            </SkCard>
        ))}
    </div>
);

/** Page header shape — title + subtitle + action button. */
export const SkPageHeader: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex items-center justify-between ${className}`}>
        <div className="space-y-2">
            <SkBlock className="h-7 w-48" />
            <SkText w="w-64" className="h-2.5" />
        </div>
        <SkBlock className="h-10 w-28 rounded-lg" />
    </div>
);

/** Tab strip shape. */
export const SkTabs: React.FC<{ count?: number; className?: string }> = ({ count = 4, className = '' }) => (
    <div className={`flex gap-2 ${className}`}>
        {Array.from({ length: count }).map((_, i) => <SkBlock key={i} className="h-9 w-24 rounded-lg" />)}
    </div>
);

/** Chart area — axis lines + bars silhouette. */
export const SkChart: React.FC<{ className?: string }> = ({ className = '' }) => (
    <SkCard className={className}>
        <SkText w="w-36" className="mb-4" />
        <div className="flex items-end gap-2 h-40">
            {[60, 80, 45, 90, 70, 55, 85, 65, 75, 50].map((h, i) => (
                <div key={i} className={`${pulse} rounded-t flex-1`} style={{ height: `${h}%` }} />
            ))}
        </div>
    </SkCard>
);
