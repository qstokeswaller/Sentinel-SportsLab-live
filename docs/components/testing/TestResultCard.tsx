// @ts-nocheck
import React from 'react';
import { CalendarIcon, UserIcon, Trash2Icon } from 'lucide-react';
import type { TestDefinition } from '../../utils/testRegistry';
import { NormativeBar } from './NormativeBar';

interface Props {
  test: TestDefinition;
  record: any; // assessment row from DB
  athleteName?: string;
  athleteGender?: 'male' | 'female';
  onDelete?: (id: string) => void;
}

/**
 * Compact card showing one saved test result with key metrics + normative classification.
 */
export const TestResultCard: React.FC<Props> = ({ test, record, athleteName, athleteGender, onDelete }) => {
  const metrics = record.metrics || {};
  const date = record.date || metrics._date || '—';

  // Pick the first few non-internal fields to display
  const displayFields = test.fields
    .filter(f => f.key !== 'notes' && f.type !== 'text' && metrics[f.key] != null)
    .slice(0, 4);

  // Run calculations for display
  const calculated: Record<string, any> = {};
  if (test.calculations) {
    for (const calc of test.calculations) {
      calculated[calc.key] = calc.formula(metrics);
    }
  }
  const displayCalcs = (test.calculations || []).filter(c => calculated[c.key] != null).slice(0, 3);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 hover:shadow-sm transition-shadow">
      {/* Header: date + athlete */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><CalendarIcon size={12} />{date}</span>
          {athleteName && <span className="flex items-center gap-1"><UserIcon size={12} />{athleteName}</span>}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(record.id)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Trash2Icon size={14} />
          </button>
        )}
      </div>

      {/* Metric values */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {displayFields.map(f => (
          <div key={f.key} className="bg-slate-50 rounded-lg px-2.5 py-2">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide truncate">{f.label}</div>
            <div className="text-sm font-bold text-slate-800">
              {metrics[f.key]}
              {f.unit && <span className="text-[10px] text-slate-400 ml-0.5">{f.unit}</span>}
            </div>
          </div>
        ))}
        {displayCalcs.map(c => (
          <div key={c.key} className="bg-indigo-50 rounded-lg px-2.5 py-2">
            <div className="text-[10px] text-indigo-400 uppercase tracking-wide truncate">{c.label}</div>
            <div className="text-sm font-bold text-indigo-700">
              {calculated[c.key]}
              {c.unit && <span className="text-[10px] text-indigo-400 ml-0.5">{c.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Normative bar */}
      {test.norms && (
        <NormativeBar
          value={metrics[test.norms.primaryField] ?? calculated[test.norms.primaryField]}
          norms={test.norms}
          gender={athleteGender}
        />
      )}
    </div>
  );
};
