// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { DatabaseService } from '../../services/databaseService';
import type { TestDefinition } from '../../utils/testRegistry';
import { TestResultCard } from './TestResultCard';
import { ClockIcon, ChevronDownIcon, ChevronUpIcon, Trash2Icon } from 'lucide-react';
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
 */
export const TestHistoryPanel: React.FC<Props> = ({ test, athleteId, athleteName, athleteGender, refreshKey }) => {
    const { showToast } = useAppState();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [limit, setLimit] = useState(5);

    const loadResults = useCallback(async () => {
        if (!athleteId) { setResults([]); return; }
        setLoading(true);
        try {
            const data = await DatabaseService.fetchAssessmentsByAthlete(athleteId, test.id);
            setResults(data || []);
        } catch (err) {
            console.error('Load history error:', err);
            setResults([]);
        } finally {
            setLoading(false);
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

    if (!athleteId) return null;
    if (results.length === 0 && !loading) return null;

    const displayed = results.slice(0, limit);
    const hasMore = results.length > limit;

    return (
        <div className="space-y-3">
            {/* Header */}
            <button
                onClick={() => setExpanded(prev => !prev)}
                className="flex items-center justify-between w-full text-left"
            >
                <div className="flex items-center gap-2">
                    <ClockIcon size={14} className="text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-700">
                        History ({results.length})
                    </h3>
                </div>
                {expanded ? <ChevronUpIcon size={14} className="text-slate-400" /> : <ChevronDownIcon size={14} className="text-slate-400" />}
            </button>

            {expanded && (
                <>
                    {loading ? (
                        <div className="text-xs text-slate-400 py-4 text-center">Loading history...</div>
                    ) : (
                        <div className="space-y-2">
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
                            className="w-full text-xs text-indigo-500 hover:text-indigo-700 py-2 font-medium transition-colors"
                        >
                            Show more ({results.length - limit} remaining)
                        </button>
                    )}
                </>
            )}
        </div>
    );
};
