// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { SaveIcon, CalculatorIcon, InfoIcon, PaperclipIcon, FileTextIcon, XIcon } from 'lucide-react';
import type { TestDefinition, TestField } from '../../utils/testRegistry';
import { NormativeBar } from './NormativeBar';
import { supabase } from '../../lib/supabase';

interface Props {
  test: TestDefinition;
  athleteId: string | null;
  athleteGender?: 'male' | 'female';
  onSave: (testId: string, metrics: Record<string, any>) => Promise<void>;
  date?: string;
}

export const TestEntryForm: React.FC<Props> = ({ test, athleteId, athleteGender, onSave, date }) => {
  const [values, setValues] = useState<Record<string, any>>({});
  const [vbtValues, setVbtValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'standard' | 'vbt'>('standard');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const hasVbt = !!(test.vbtFields && test.vbtFields.length > 0);

  const setValue = (key: string, val: any) => {
    setValues(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  const setVbtValue = (key: string, val: any) => {
    setVbtValues(prev => ({ ...prev, [key]: val }));
    setSaved(false);
  };

  // Run calculations for standard fields
  const calculated = useMemo(() => {
    if (!test.calculations?.length) return {};
    const result: Record<string, any> = {};
    for (const calc of test.calculations) {
      result[calc.key] = calc.formula(values);
    }
    return result;
  }, [values, test.calculations]);

  // Run VBT calculations
  const vbtCalculated = useMemo(() => {
    if (!test.vbtCalculations?.length) return {};
    const result: Record<string, any> = {};
    for (const calc of test.vbtCalculations) {
      result[calc.key] = calc.formula(vbtValues);
    }
    return result;
  }, [vbtValues, test.vbtCalculations]);

  // Merge values + calculated for norms lookup
  const allValues = useMemo(() => ({ ...values, ...calculated }), [values, calculated]);

  const handleSave = async () => {
    if (!athleteId) return;
    setSaving(true);
    try {
      let attachmentUrl = null;

      // Upload attachment if present
      if (attachedFile) {
        const ext = attachedFile.name.split('.').pop() || 'pdf';
        const path = `${athleteId}/${test.id}_${date || new Date().toISOString().split('T')[0]}_${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('assessment-attachments')
          .upload(path, attachedFile, { contentType: attachedFile.type, upsert: true });
        if (uploadError) {
          console.warn('Attachment upload failed:', uploadError.message);
          // Save the assessment data anyway, just without the attachment
        } else {
          attachmentUrl = path; // Store the storage path — access via signed URL when viewing
        }
      }

      if (activeTab === 'vbt') {
        await onSave(test.id, { ...vbtValues, ...vbtCalculated, _vbt: true, _date: date, ...(attachmentUrl ? { attachmentUrl } : {}) });
      } else {
        await onSave(test.id, { ...values, ...calculated, _date: date, ...(attachmentUrl ? { attachmentUrl } : {}) });
      }
      setSaved(true);
      setAttachedFile(null);
    } finally {
      setSaving(false);
    }
  };

  const requiredFieldsFilled = activeTab === 'vbt'
    ? (test.vbtFields || []).filter(f => f.required).every(f => vbtValues[f.key] != null && vbtValues[f.key] !== '')
    : test.fields.filter(f => f.required).every(f => values[f.key] != null && values[f.key] !== '');

  return (
    <div className="space-y-5">
      {/* VBT Tab Toggle (only for barbell tests with VBT support) */}
      {hasVbt && (
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('standard')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${activeTab === 'standard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            1RM Test
          </button>
          <button
            onClick={() => setActiveTab('vbt')}
            className={`px-4 py-2 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'vbt' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            VBT Tracking
          </button>
        </div>
      )}

      {/* Standard form fields */}
      {activeTab === 'standard' && (
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
      )}

      {/* VBT form fields */}
      {activeTab === 'vbt' && hasVbt && (
        <div className="space-y-4">
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide mb-1">Velocity-Based Training</div>
            <p className="text-xs text-indigo-500/70">Enter the bar velocity from your encoder or sensor. The system will estimate intensity and 1RM from the load-velocity relationship.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(test.vbtFields || []).map(field => (
              <FieldRenderer
                key={field.key}
                field={field}
                value={vbtValues[field.key]}
                onChange={(v) => setVbtValue(field.key, v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* VBT calculated metrics */}
      {activeTab === 'vbt' && test.vbtCalculations && test.vbtCalculations.length > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
            <CalculatorIcon size={14} />
            VBT Metrics
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {test.vbtCalculations.map(calc => {
              const val = vbtCalculated[calc.key];
              const isZone = calc.key === 'vbt_zone';
              const zoneColor = isZone ? (
                val === 'Speed-Strength' ? 'text-sky-600' :
                val === 'Power' ? 'text-indigo-600' :
                val === 'Strength-Speed' ? 'text-amber-600' :
                val === 'Max Strength' ? 'text-orange-600' :
                val === 'Near 1RM' ? 'text-rose-600' : 'text-slate-900'
              ) : 'text-slate-900';
              return (
                <div key={calc.key} className="bg-white rounded-lg border border-indigo-100 p-3">
                  <div className="text-[10px] text-indigo-400 uppercase tracking-wide">{calc.label}</div>
                  <div className={`text-lg font-bold ${zoneColor}`}>
                    {val != null ? val : '—'}
                    {calc.unit && val != null && !isZone && (
                      <span className="text-xs text-indigo-300 ml-1">{calc.unit}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Standard calculated metrics */}
      {activeTab === 'standard' && test.calculations && test.calculations.length > 0 && (
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

      {/* Normative comparison (standard tab only) */}
      {activeTab === 'standard' && test.norms && (
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

      {/* Attachment upload (PDF / document) */}
      <div className="flex items-center gap-3">
        {attachedFile ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
            <FileTextIcon size={14} className="text-indigo-500 shrink-0" />
            <span className="text-xs font-medium text-indigo-700 truncate max-w-[200px]">{attachedFile.name}</span>
            <span className="text-[10px] text-indigo-400">{(attachedFile.size / 1024).toFixed(0)}KB</span>
            <button onClick={() => setAttachedFile(null)} className="p-0.5 text-indigo-300 hover:text-rose-500 transition-colors">
              <XIcon size={12} />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all cursor-pointer">
            <PaperclipIcon size={13} />
            Attach Report (PDF)
            <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => { if (e.target.files?.[0]) setAttachedFile(e.target.files[0]); e.target.value = ''; }} className="hidden" />
          </label>
        )}
      </div>

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
