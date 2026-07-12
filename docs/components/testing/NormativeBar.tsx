import React from 'react';
import type { NormativeConfig } from '../../utils/testRegistry';
import { getNormBands } from '../../utils/testRegistry';

interface Props {
  value: number | null | undefined;
  norms: NormativeConfig;
  gender?: 'male' | 'female';
  age?: number;
}

/**
 * Visual bar showing where a value falls within normative bands.
 * Each band = colored segment; a marker shows the athlete's result.
 * Supports age-specific norms when age is provided.
 */
export const NormativeBar: React.FC<Props> = ({ value, norms, gender, age }) => {
  const bands = getNormBands(norms, gender, age);

  if (!bands.length) return null;

  // Find which band the value falls in
  const matchedBand = value != null
    ? bands.find(b => {
        const aboveMin = b.min == null || value >= b.min;
        const belowMax = b.max == null || value < b.max;
        return aboveMin && belowMax;
      })
    : null;

  const COLORS: Record<string, { bg: string; text: string; ring: string }> = {
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-400 dark:ring-emerald-300' },
    sky:     { bg: 'bg-sky-50 dark:bg-sky-500/15 border border-sky-200 dark:border-sky-500/30',                 text: 'text-sky-700 dark:text-sky-300',         ring: 'ring-sky-400 dark:ring-sky-300' },
    teal:    { bg: 'bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/30',             text: 'text-teal-700 dark:text-teal-300',       ring: 'ring-teal-400 dark:ring-teal-300' },
    amber:   { bg: 'bg-amber-50 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30',         text: 'text-amber-700 dark:text-amber-300',     ring: 'ring-amber-400 dark:ring-amber-300' },
    orange:  { bg: 'bg-orange-50 dark:bg-orange-500/15 border border-orange-200 dark:border-orange-500/30',     text: 'text-orange-700 dark:text-orange-300',   ring: 'ring-orange-400 dark:ring-orange-300' },
    red:     { bg: 'bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30',             text: 'text-rose-700 dark:text-rose-300',       ring: 'ring-rose-400 dark:ring-rose-300' },
  };

  return (
    <div className="space-y-2">
      {/* Band labels */}
      <div className="flex gap-1.5 flex-wrap">
        {bands.map((band, i) => {
          const c = COLORS[band.color] || COLORS.amber;
          const isMatched = matchedBand === band;
          return (
            <span
              key={i}
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
                ${c.bg} ${c.text}
                ${isMatched ? `ring-2 ${c.ring} shadow-sm` : 'opacity-50'}
              `}
            >
              {band.label}
              {band.min != null && band.max != null && ` (${band.min}–${band.max})`}
              {band.min != null && band.max == null && ` (≥${band.min})`}
              {band.min == null && band.max != null && ` (<${band.max})`}
            </span>
          );
        })}
      </div>

      {/* Classification result */}
      {matchedBand && value != null && (
        <div className={`text-xs font-medium ${(COLORS[matchedBand.color] || COLORS.amber).text}`}>
          Result: {value} → {matchedBand.label}
        </div>
      )}
    </div>
  );
};
