// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DatabaseService } from '../../services/databaseService';
import type { TestDefinition } from '../../utils/testRegistry';
import { TestResultCard } from './TestResultCard';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import { useAppState } from '../../context/AppStateContext';

interface Props {
    test: TestDefinition;
    athleteId: string | null;
    athleteName?: string;
    athleteGender?: 'male' | 'female';
    refreshKey?: number; // increment to trigger reload
}

/**
 * Shows historical test results for a specific athlete + test.
 * Auto-loads when athleteId changes. Supports deletion.
 *
 * Loading UX is stale-while-revalidate: when athlete changes, the previously
 * rendered list stays visible (dimmed to 60% opacity + small pulse) while the
 * new data fetches. Avoids the jarring blank → "Loading..." → content flicker.
 * A request-id ref guards against late responses overwriting newer ones if the
 * user clicks through several athletes quickly.
 */
export const TestHistoryPanel: React.FC<Props> = ({ test, athleteId, athleteName, athleteGender, refreshKey }) => {
    const { showToast } = useAppState();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [limit, setLimit] = useState(5);
    const reqIdRef = useRef(0);

    const loadResults = useCallback(async () => {
        if (!athleteId) { setResults([]); return; }
        const myReq = ++reqIdRef.current;
        setLoading(true);
        try {
            const data = await DatabaseService.fetchAssessmentsByAthlete(athleteId, test.id);
            // Drop stale responses — user may have switched athletes mid-flight.
            if (myReq !== reqIdRef.current) return;
            setResults(data || []);
        } catch (err) {
            if (myReq !== reqIdRef.current) return;
            console.error('Load history error:', err);
            setResults([]);
        } finally {
            if (myReq === reqIdRef.current) setLoading(false);
        }
    }, [athleteId, test.id]);

    useEffect(() => { loadResults(); }, [loadResults, refreshKey]);

    const handleDelete = useCallback(async (id: string) => {
        try {
            await DatabaseService.deleteAssessment(id);
            setResults(prev => prev.filter(r => r.id !== id));
            showToast('Test result deleted', 'success');
        } catch (err) {
            console.error('Delete error:', err);
            showToast('Failed to delete result — please try again', 'error');
        }
    }, [showToast]);

    // Always rendered once an athlete is selected — the section stays put with a
    // friendly empty state when there's no history yet. This advertises the
    // feature ("history will appear here") and avoids the appearing/disappearing
    // shimmer that read as a bug.
    if (!athleteId) return null;

    const displayed = results.slice(0, limit);
    const hasMore = results.length > limit;

    const isWarmLoad = loading && results.length > 0;
    const isEmpty = !loading && results.length === 0;

    return (
        <div className="space-y-3">
            {/* Header */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center justify-between w-full text-left"
            >
                <div className="flex items-center gap-2">
                    <ClockIcon size={14} className="text-slate-400 dark:text-[#94A3B8]" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-[#CBD5E1]">
                        History ({results.length})
                    </h3>
                    {loading && (
                        <span
                            className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-300 animate-pulse"
                            aria-label="Loading"
                            title="Refreshing"
                        />
                    )}
                </div>
                {expanded ? <ChevronUpIcon size={14} className="text-slate-400 dark:text-[#94A3B8]" /> : <ChevronDownIcon size={14} className="text-slate-400 dark:text-[#94A3B8]" />}
            </button>

            {expanded && (
                <>
                    {isEmpty ? (
                        <div className="rounded-lg border border-dashed border-slate-200 dark:border-[#243A58] bg-slate-50/50 dark:bg-[#0F1C30]/50 p-5 text-center">
                            <ClockIcon size={18} className="mx-auto text-slate-300 dark:text-[#475569] mb-1.5" />
                            <p className="text-xs font-medium text-slate-500 dark:text-[#CBD5E1]">No history yet</p>
                            <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-1 leading-snug">
                                When you save your first {test.name} result for {athleteName || 'this athlete'},
                                it will appear here.
                            </p>
                        </div>
                    ) : (
                        <div
                            className={`space-y-2 transition-opacity duration-150 ${isWarmLoad ? 'opacity-60' : 'opacity-100'}`}
                        >
                            {displayed.map(record => (
                                <TestResultCard
                                    key={record.id}
                                    test={test}
                                    record={record}
                                    athleteName={athleteName}
                                    athleteGender={athleteGender}
                                    onDelete={handleDelete}
                                />
                            ))}
                        </div>
                    )}

                    {hasMore && (
                        <button
                            onClick={() => setLimit(prev => prev + 10)}
                            className="w-full text-xs text-indigo-500 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-200 py-2 font-medium transition-colors"
                        >
                            Show more ({results.length - limit} remaining)
                        </button>
                    )}
                </>
            )}
        </div>
    );
};
