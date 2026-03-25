// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { SaveIcon, CalculatorIcon, InfoIcon } from 'lucide-react';
import type { TestDefinition, TestField } from '../../utils/testRegistry';
import { NormativeBar } from './NormativeBar';

interface Props {
  test: TestDefinition;
  athleteId: string | null;
  athleteGender?: 'male' | 'female';
  onSave: (testId: string, metrics: Record<string, any>) => Promise<void>;
  date?: string;
}

export const TestEntryForm: React.FC<Props> = ({ test, athleteId, athleteGender, onSave, date }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setValue = (key: string, val: any) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  // Run calculations
  const calculated = useMemo(() => {
    if (!test.calculations?.length) return {};
    const result: Record<string, any> = {};
    for (const calc of test.calculations) {
      result[calc.key] = calc.formula(values);
    }
    return result;
  }, [values, test.calculations]);

  // Merge values + calculated for norms lookup
  const allValues = useMemo(() => ({ ...values, ...calculated }), [values, calculated]);

  const handleSave = async () => {
    if (!athleteId) return;
    setSaving(true);
    try {
      await onSave(test.id, { ...values, ...calculated, _date: date });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const requiredFieldsFilled = test.fields
    .filter(f => f.required)
    .every(f => values[f.key] != null && values[f.key] !== '');

  return (
    <div className="space-y-5">
      {/* Form fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {test.fields.map(field => (
          <FieldRenderer
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => setValue(field.key, v)}
          />
        ))}
      </div>

      {/* Calculated metrics */}
      {test.calculations && test.calculations.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <CalculatorIcon size={14} />
            Calculated Metrics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {test.calculations.map(calc => (
              <div key={calc.key} className="bg-white rounded-lg border border-slate-100 p-3">
                <div className="text-[10px] text-slate-400 uppercase tracking-wide">{calc.label}</div>
                <div className="text-lg font-bold text-slate-900">
                  {calculated[calc.key] != null ? calculated[calc.key] : '—'}
                  {calc.unit && calculated[calc.key] != null && (
                    <span className="text-xs text-slate-400 ml-1">{calc.unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normative comparison */}
      {test.norms && (
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Normative Classification
          </div>
          <NormativeBar
            value={allValues[test.norms.primaryField]}
            norms={test.norms}
            gender={athleteGender}
          />
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!athleteId || !requiredFieldsFilled || saving}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
            ${saved
              ? 'bg-emerald-500 text-white'
              : !athleteId || !requiredFieldsFilled
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
            }`}
        >
          <SaveIcon size={16} />
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Assessment'}
        </button>
        {!athleteId && (
          <span className="text-xs text-slate-400">Select an athlete first</span>
        )}
      </div>
    </div>
  );
};

// ─── Individual field renderers ──────────────────────────────────

interface FieldProps {
  field: TestField;
  value: any;
  onChange: (value: any) => void;
}

const FieldRenderer: React.FC<FieldProps> = ({ field, value, onChange }) => {
  const label = (
    <label className="block text-xs font-medium text-slate-600 mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-0.5">*</span>}
      {field.unit && <span className="text-slate-400 ml-1">({field.unit})</span>}
    </label>
  );

  switch (field.type) {
    case 'number':
    case 'time_seconds':
      return (
        <div>
          {label}
          <input
            type="number"
            value={value ?? ''}
            onChange={e => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
            min={field.min}
            max={field.max}
            step={field.step || (field.type === 'time_seconds' ? 0.01 : 1)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
          />
          {field.helpText && <p className="text-[10px] text-slate-400 mt-1">{field.helpText}</p>}
        </div>
      );

    case 'select':
      return (
        <div>
          {label}
          <select
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-white"
          >
            <option value="">— Select —</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );

    case 'score_pills':
      return (
        <div>
          {label}
          <div className="flex gap-2 mt-1">
            {(field.pillValues || []).map(pv => (
              <button
                key={pv}
                onClick={() => onChange(pv)}
                className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-all
                  ${value === pv
                    ? pv === 0 ? 'bg-red-500 text-white border-red-500'
                    : pv === 3 ? 'bg-emerald-500 text-white border-emerald-500'
                    : 'bg-indigo-500 text-white border-indigo-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
              >
                {pv}
              </button>
            ))}
          </div>
          {field.helpText && <p className="text-[10px] text-slate-400 mt-1">{field.helpText}</p>}
        </div>
      );

    case 'pass_fail':
      return (
        <div>
          {label}
          <div className="flex gap-2 mt-1">
            {['Pass', 'Fail'].map(opt => (
              <button
                key={opt}
                onClick={() => onChange(opt === 'Pass')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border-2 transition-all
                  ${(opt === 'Pass' && value === true) || (opt === 'Fail' && value === false)
                    ? opt === 'Pass'
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );

    case 'text':
      return (
        <div className="sm:col-span-2">
          {label}
          <textarea
            value={value ?? ''}
            onChange={e => onChange(e.target.value || null)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all resize-none"
          />
        </div>
      );

    default:
      return (
        <div>
          {label}
          <input
            type="text"
            value={value ?? ''}
            onChange={e => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
          />
        </div>
      );
  }
};
