// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════
// SmartTestImport — Auto-detects test type from CSV headers
//
// Flow:
//  1. User drops/selects a CSV file
//  2. Engine scores headers against ALL test definitions from testRegistry
//  3. Shows top matches with confidence + column mapping preview
//  4. User confirms test type → maps columns → imports via handleSaveMetric
// ═══════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
    FileDownIcon, SparklesIcon, CheckCircleIcon, XIcon,
    ChevronDownIcon, ChevronUpIcon, ArrowRightIcon, SearchIcon,
    AlertTriangleIcon, UploadIcon,
} from 'lucide-react';
import { ALL_TESTS, TEST_CATEGORIES, getTestById } from '../../utils/testRegistry';
import type { TestDefinition } from '../../utils/testRegistry';
import { processAthleteMatching } from '../../utils/athleteMatcher';
import UnmatchedAthleteResolver from '../ui/UnmatchedAthleteResolver';
import type { ResolvedEntry } from '../ui/UnmatchedAthleteResolver';

// ═══════════════════════════════════════════════════════════════════════
// Auto-detection engine
// ═══════════════════════════════════════════════════════════════════════

/** Build alias list for a test field key */
function getFieldAliases(key: string, label: string): string[] {
    const aliases = [key, label.toLowerCase()];
    // Add common variations
    const k = key.toLowerCase();
    aliases.push(k.replace(/_/g, ' '));
    aliases.push(k.replace(/_/g, ''));
    if (label) {
        aliases.push(label.toLowerCase().replace(/[^a-z0-9 ]/g, ''));
        // "Best Time" → "time", "Peak Force" → "peak force"
        const words = label.toLowerCase().split(/\s+/);
        if (words.length > 1) aliases.push(words[words.length - 1]); // last word
    }
    // Unit-stripped: "20m Time" → "20m time", "Jump Height (cm)" → "jump height"
    aliases.push(label.toLowerCase().replace(/\(.*?\)/g, '').trim());
    return [...new Set(aliases.filter(Boolean))];
}

/** Score a single CSV header against a field's aliases */
function scoreHeader(csvHeader: string, aliases: string[]): number {
    const h = csvHeader.toLowerCase().trim().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, ' ');
    for (const alias of aliases) {
        const a = alias.toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, ' ');
        if (h === a) return 1.0;
    }
    let best = 0;
    for (const alias of aliases) {
        const a = alias.toLowerCase().replace(/[^a-z0-9_ ]/g, '').replace(/\s+/g, ' ');
        if (h.includes(a) || a.includes(h)) {
            const score = Math.min(h.length, a.length) / Math.max(h.length, a.length);
            if (score > best) best = score;
        }
        // Word overlap
        const aWords = a.split(' ').filter(Boolean);
        const hWords = h.split(' ').filter(Boolean);
        if (aWords.length > 0) {
            let matched = 0;
            for (const aw of aWords) {
                if (hWords.some(hw => hw === aw || hw.includes(aw) || aw.includes(hw))) matched++;
            }
            const wordScore = matched / aWords.length;
            const penalty = aWords.length / Math.max(aWords.length, hWords.length);
            const adjusted = wordScore * (0.6 + 0.4 * penalty);
            if (adjusted > best) best = adjusted;
        }
    }
    return best;
}

/** Identity headers that indicate an athlete name column */
const ATHLETE_ALIASES = ['name', 'athlete', 'player', 'athlete_name', 'player_name', 'full name', 'surname', 'first name'];
const DATE_ALIASES = ['date', 'test_date', 'session_date', 'assessment_date', 'day'];

export interface TestDetectionResult {
    test: TestDefinition;
    score: number;
    fieldMatches: Record<string, { csvColumn: string; confidence: number }>;
    matchedFieldCount: number;
    totalFields: number;
}

/** Score all tests against CSV headers, return sorted by best match */
export function detectTestType(csvHeaders: string[]): TestDetectionResult[] {
    const results: TestDetectionResult[] = [];

    for (const test of ALL_TESTS) {
        if (test.customComponent) continue; // Skip custom components like HamstringReport
        const fields = test.fields || [];
        if (fields.length === 0) continue;

        const fieldMatches: Record<string, { csvColumn: string; confidence: number }> = {};
        const usedHeaders = new Set<string>();

        // Try to match each test field to a CSV header
        for (const field of fields) {
            const aliases = getFieldAliases(field.key, field.label);
            let bestMatch = { header: '', score: 0 };

            for (const header of csvHeaders) {
                if (usedHeaders.has(header)) continue;
                const s = scoreHeader(header, aliases);
                if (s > bestMatch.score) bestMatch = { header, score: s };
            }

            if (bestMatch.score >= 0.4 && bestMatch.header) {
                fieldMatches[field.key] = { csvColumn: bestMatch.header, confidence: bestMatch.score };
                usedHeaders.add(bestMatch.header);
            }
        }

        const matchedFieldCount = Object.keys(fieldMatches).length;
        const requiredFields = fields.filter(f => f.required);
        const requiredMatched = requiredFields.filter(f => fieldMatches[f.key]);

        // Score: weighted combo of total field coverage + required field coverage
        const coverageScore = fields.length > 0 ? matchedFieldCount / fields.length : 0;
        const requiredScore = requiredFields.length > 0 ? requiredMatched.length / requiredFields.length : 1;
        const overallScore = (coverageScore * 0.4) + (requiredScore * 0.6);

        if (matchedFieldCount >= 1 && overallScore > 0.2) {
            results.push({
                test,
                score: overallScore,
                fieldMatches,
                matchedFieldCount,
                totalFields: fields.length,
            });
        }
    }

    return results.sort((a, b) => b.score - a.score);
}

// ═══════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════

interface SmartTestImportProps {
    allAthletes: { id: string; name: string }[];
    teams: { id: string; name: string; players?: any[] }[];
    handleSaveMetric: (athleteId: string, data: any) => Promise<void>;
    showToast?: (msg: string, type?: string) => void;
}

const SmartTestImport: React.FC<SmartTestImportProps> = ({ allAthletes, teams, handleSaveMetric, showToast }) => {
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
    const [detectionResults, setDetectionResults] = useState<TestDetectionResult[]>([]);
    const [selectedTest, setSelectedTest] = useState<TestDetectionResult | null>(null);
    const [step, setStep] = useState<'upload' | 'detect' | 'confirm' | 'done'>('upload');
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<string | null>(null);

    // Column mapping state (editable by user)
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [athleteColumn, setAthleteColumn] = useState('');
    const [dateColumn, setDateColumn] = useState('');

    // Unmatched athlete resolver
    const [showResolver, setShowResolver] = useState(false);
    const [pendingUnmatched, setPendingUnmatched] = useState<{ csvName: string; rowCount: number }[]>([]);
    const [pendingMatchedRows, setPendingMatchedRows] = useState<any[]>([]);
    const [pendingUnmatchedRows, setPendingUnmatchedRows] = useState<any[]>([]);

    // ── Step 1: Parse CSV file ──
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = (evt.target?.result as string).trim();
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { showToast?.('CSV file is empty or has no data rows'); return; }
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = lines.slice(1).map(line => {
                const cols = line.split(',').map(c => c.trim());
                const obj: Record<string, string> = {};
                headers.forEach((h, i) => { obj[h] = cols[i] || ''; });
                return obj;
            });
            setCsvHeaders(headers);
            setCsvRows(rows);

            // Auto-detect test type
            const results = detectTestType(headers);
            setDetectionResults(results);

            // Auto-detect athlete and date columns
            const athCol = headers.find(h => ATHLETE_ALIASES.some(a => h.toLowerCase().includes(a)));
            const dtCol = headers.find(h => DATE_ALIASES.some(a => h.toLowerCase().includes(a)));
            setAthleteColumn(athCol || '');
            setDateColumn(dtCol || '');

            if (results.length > 0) {
                // Pre-select the best match
                const best = results[0];
                setSelectedTest(best);
                const m: Record<string, string> = {};
                for (const [fieldId, { csvColumn }] of Object.entries(best.fieldMatches)) {
                    m[fieldId] = csvColumn;
                }
                setMapping(m);
            }

            setStep('detect');
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // ── Select a different test type ──
    const handleSelectTest = (result: TestDetectionResult) => {
        setSelectedTest(result);
        const m: Record<string, string> = {};
        for (const [fieldId, { csvColumn }] of Object.entries(result.fieldMatches)) {
            m[fieldId] = csvColumn;
        }
        setMapping(m);
    };

    // ── Step 3: Check for unmatched athletes, then import ──
    const handleConfirmImport = async () => {
        if (!selectedTest || !athleteColumn) return;

        // Split rows into matched and unmatched
        const { matchedRows, unmatchedNames, unmatchedRows } = processAthleteMatching(
            csvRows,
            allAthletes,
            (row) => row[athleteColumn] || ''
        );

        setPendingMatchedRows(matchedRows);
        setPendingUnmatchedRows(unmatchedRows);

        if (unmatchedNames.length > 0) {
            // Show resolver for unmatched names
            setPendingUnmatched(unmatchedNames);
            setShowResolver(true);
        } else {
            // All matched — import directly
            await doImport(matchedRows, []);
        }
    };

    // Called after resolver resolves unmatched names
    const handleResolverConfirm = async (resolved: ResolvedEntry[]) => {
        setShowResolver(false);

        // Build a name → athleteId map from resolved entries
        const resolvedMap = new Map<string, string>();
        for (const r of resolved) {
            if (r.action === 'assign' && r.athleteId) {
                resolvedMap.set(r.csvName.toLowerCase(), r.athleteId);
            }
            // 'add' action: in a full implementation we'd create the athlete first
            // For now, skip 'add' — user can add them to roster first then re-import
        }

        // Convert resolved unmatched rows into matched rows
        const newlyMatched = pendingUnmatchedRows
            .filter(row => resolvedMap.has((row._csvName || '').toLowerCase()))
            .map(row => ({
                ...row,
                _athleteId: resolvedMap.get((row._csvName || '').toLowerCase()),
                _athleteName: row._csvName,
            }));

        await doImport([...pendingMatchedRows, ...newlyMatched], resolved.filter(r => r.action === 'skip'));
    };

    // Actual import logic
    const doImport = async (rows: any[], skipped: ResolvedEntry[]) => {
        if (!selectedTest) return;
        setImporting(true);
        let saved = 0, failed = 0;

        for (const row of rows) {
            const athleteId = row._athleteId;
            if (!athleteId) { failed++; continue; }

            const date = dateColumn ? row[dateColumn] : new Date().toISOString().split('T')[0];

            const metrics: Record<string, any> = {};
            for (const field of selectedTest.test.fields) {
                const csvCol = mapping[field.key];
                if (!csvCol || !row[csvCol]) continue;
                const raw = row[csvCol].trim();
                if (field.type === 'number' || field.type === 'time_seconds' || field.type === 'number_pair') {
                    metrics[field.key] = parseFloat(raw) || 0;
                } else {
                    metrics[field.key] = raw;
                }
            }

            if (selectedTest.test.calculations) {
                for (const calc of selectedTest.test.calculations) {
                    const result = calc.formula(metrics);
                    if (result != null) metrics[calc.key] = result;
                }
            }

            try {
                await handleSaveMetric(athleteId, { type: selectedTest.test.id, ...metrics, date });
                saved++;
            } catch (err) { failed++; }
        }

        setImporting(false);
        const skipCount = skipped.length;
        setImportResult(`Imported ${saved} records${failed > 0 ? `, ${failed} failed` : ''}${skipCount > 0 ? `, ${skipCount} skipped` : ''}`);
        setStep('done');
        showToast?.(`Imported ${saved} ${selectedTest.test.shortName || selectedTest.test.name} records`);
    };

    const reset = () => {
        setCsvHeaders([]);
        setCsvRows([]);
        setDetectionResults([]);
        setSelectedTest(null);
        setMapping({});
        setAthleteColumn('');
        setDateColumn('');
        setStep('upload');
        setImportResult(null);
    };

    const categoryName = (catId: string) => TEST_CATEGORIES.find(c => c.id === catId)?.name || catId;

    // ══════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════

    // ── Upload step ──
    if (step === 'upload') {
        return (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 text-center hover:bg-slate-100 hover:border-indigo-300 transition-all cursor-pointer relative">
                    <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <SparklesIcon size={24} />
                        </div>
                        <div>
                            <span className="text-sm font-semibold text-slate-600 block">Smart CSV Import</span>
                            <span className="text-xs text-slate-400">Drop a CSV file — we'll detect the test type automatically</span>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 space-y-2">
                    <p className="font-semibold text-slate-600">How it works</p>
                    <p>Upload any test data CSV. The system reads the column headers, matches them against all {ALL_TESTS.length} supported test types, and suggests the best match. You confirm, adjust if needed, and import.</p>
                    <p className="text-slate-400">Supports: sprint times, jump tests, force plate data, 1RM records, agility tests, body composition, and more.</p>
                </div>
            </div>
        );
    }

    // ── Detection step ──
    if (step === 'detect') {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 relative">
                <UnmatchedAthleteResolver
                    isOpen={showResolver}
                    onClose={() => setShowResolver(false)}
                    onConfirm={handleResolverConfirm}
                    unmatchedNames={pendingUnmatched}
                    allAthletes={allAthletes}
                    teams={teams}
                />
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <SparklesIcon size={16} className="text-indigo-500" />
                        <span className="text-sm font-semibold text-slate-800">
                            {detectionResults.length > 0
                                ? `Detected ${detectionResults.length} possible test type${detectionResults.length > 1 ? 's' : ''}`
                                : 'No matching test types found'}
                        </span>
                    </div>
                    <button onClick={reset} className="text-xs text-slate-400 hover:text-slate-600">Upload different file</button>
                </div>

                {/* Detection results */}
                {detectionResults.length > 0 ? (
                    <div className="space-y-2">
                        {detectionResults.slice(0, 5).map((result, i) => {
                            const isSelected = selectedTest?.test.id === result.test.id;
                            const confidence = Math.round(result.score * 100);
                            return (
                                <button
                                    key={result.test.id}
                                    onClick={() => handleSelectTest(result)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        isSelected
                                            ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                {isSelected && <CheckCircleIcon size={14} className="text-indigo-600 shrink-0" />}
                                                <span className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-800'}`}>
                                                    {result.test.name}
                                                </span>
                                                {i === 0 && <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">BEST MATCH</span>}
                                            </div>
                                            <span className="text-[10px] text-slate-400">{categoryName(result.test.category)}</span>
                                        </div>
                                        <div className="text-right shrink-0 ml-3">
                                            <div className={`text-sm font-bold ${confidence >= 70 ? 'text-emerald-600' : confidence >= 40 ? 'text-amber-600' : 'text-slate-400'}`}>
                                                {confidence}%
                                            </div>
                                            <div className="text-[10px] text-slate-400">{result.matchedFieldCount}/{result.totalFields} fields</div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="p-6 bg-slate-50 rounded-xl text-center">
                        <AlertTriangleIcon size={24} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Could not match CSV headers to any test type.</p>
                        <p className="text-xs text-slate-400 mt-1">Check your CSV has appropriate column headers.</p>
                    </div>
                )}

                {/* Identity column mapping */}
                {selectedTest && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold text-slate-600">Identity Columns</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-medium text-slate-500 block mb-1">Athlete Name Column *</label>
                                <select value={athleteColumn} onChange={e => setAthleteColumn(e.target.value)}
                                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                                    <option value="">— Select —</option>
                                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-medium text-slate-500 block mb-1">Date Column</label>
                                <select value={dateColumn} onChange={e => setDateColumn(e.target.value)}
                                    className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white">
                                    <option value="">— Today's date —</option>
                                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Field mapping preview */}
                {selectedTest && (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                        <p className="text-xs font-semibold text-slate-600">Column Mapping</p>
                        {selectedTest.test.fields.map(field => {
                            const mapped = mapping[field.key];
                            return (
                                <div key={field.key} className="flex items-center gap-2 py-1">
                                    <span className={`text-xs flex-1 ${mapped ? 'text-slate-700' : 'text-slate-300'}`}>
                                        {field.label}
                                        {field.required && <span className="text-rose-400 ml-0.5">*</span>}
                                        {field.unit && <span className="text-slate-300 ml-1">({field.unit})</span>}
                                    </span>
                                    <ArrowRightIcon size={10} className="text-slate-300 shrink-0" />
                                    <select
                                        value={mapped || ''}
                                        onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                                        className={`w-36 text-xs border rounded-lg px-2 py-1 ${mapped ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-400'}`}
                                    >
                                        <option value="">— Skip —</option>
                                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Data preview */}
                {selectedTest && csvRows.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 text-[10px] font-semibold text-slate-500">
                            Preview ({Math.min(3, csvRows.length)} of {csvRows.length} rows)
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="border-b border-slate-100">
                                        {athleteColumn && <th className="px-3 py-1.5 text-left text-slate-400 font-medium">Athlete</th>}
                                        {selectedTest.test.fields.filter(f => mapping[f.key]).map(f => (
                                            <th key={f.key} className="px-3 py-1.5 text-left text-slate-400 font-medium">{f.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvRows.slice(0, 3).map((row, i) => (
                                        <tr key={i} className="border-b border-slate-50">
                                            {athleteColumn && <td className="px-3 py-1.5 text-slate-700 font-medium">{row[athleteColumn] || '—'}</td>}
                                            {selectedTest.test.fields.filter(f => mapping[f.key]).map(f => (
                                                <td key={f.key} className="px-3 py-1.5 text-slate-600">{row[mapping[f.key]] || '—'}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Confirm button */}
                {selectedTest && (
                    <button
                        onClick={handleConfirmImport}
                        disabled={!athleteColumn || importing}
                        className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                            athleteColumn
                                ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        }`}
                    >
                        {importing
                            ? 'Importing...'
                            : `Import ${csvRows.length} rows as ${selectedTest.test.shortName || selectedTest.test.name}`
                        }
                    </button>
                )}
            </div>
        );
    }

    // ── Done step ──
    if (step === 'done') {
        return (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                    <CheckCircleIcon size={32} className="mx-auto text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">{importResult}</p>
                    <p className="text-xs text-emerald-600">
                        Data saved to {selectedTest?.test.name} in the Testing Hub.
                    </p>
                </div>
                <button onClick={reset}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition-all">
                    Import Another File
                </button>
            </div>
        );
    }

    return null;
};

export default SmartTestImport;
