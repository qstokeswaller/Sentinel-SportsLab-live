// @ts-nocheck
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
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-400' },
    sky:     { bg: 'bg-sky-100',     text: 'text-sky-700',     ring: 'ring-sky-400' },
    teal:    { bg: 'bg-teal-100',    text: 'text-teal-700',    ring: 'ring-teal-400' },
    amber:   { bg: 'bg-amber-100',   text: 'text-amber-700',   ring: 'ring-amber-400' },
    orange:  { bg: 'bg-orange-100',  text: 'text-orange-700',  ring: 'ring-orange-400' },
    red:     { bg: 'bg-red-100',     text: 'text-red-700',     ring: 'ring-red-400' },
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
