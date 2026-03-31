// @ts-nocheck
import React, { useState, useMemo, useCallback } from 'react';
import { useAppState } from '../context/AppStateContext';
import { DatabaseService } from '../services/databaseService';
import {
    TEST_CATEGORIES, getTestsByCategory, getTestById,
} from '../utils/testRegistry';
import type { TestCategory, TestDefinition, CategoryInfo } from '../utils/testRegistry';
import { TestEntryForm } from '../components/testing/TestEntryForm';
import { TestHistoryPanel } from '../components/testing/TestHistoryPanel';
import { TeamBatchEntry } from '../components/testing/TeamBatchEntry';
import { HamstringReport } from '../components/testing/HamstringReport';
import { TrendChart } from '../components/testing/TrendChart';
import { TeamComparisonTable } from '../components/testing/TeamComparisonTable';
import { TestSessionExport } from '../components/testing/TestSessionExport';
import {
    ArrowLeftIcon, ActivityIcon, DumbbellIcon, ZapIcon, MoveIcon, HeartIcon,
    FlameIcon, RulerIcon, TrophyIcon, SearchIcon, UserIcon, UsersIcon,
    CalendarIcon, ChevronRightIcon, BarChart3Icon, DownloadIcon,
} from 'lucide-react';

// Map icon string names from testRegistry → actual icon components
const ICON_MAP: Record<string, React.FC<any>> = {
    Activity: ActivityIcon,
    Dumbbell: DumbbellIcon,
    Zap: ZapIcon,
    Move: MoveIcon,
    Heart: HeartIcon,
    Flame: FlameIcon,
    Ruler: RulerIcon,
    Trophy: TrophyIcon,
};

type HubView = 'categories' | 'compare' | 'export';

export const TestingHubPage: React.FC = () => {
    const {
        teams, showToast, isLoading,
    } = useAppState();

    // ─── Page-local state-based navigation ────────────────────────────
    const [activeCategory, setActiveCategory] = useState<TestCategory | null>(null);
    const [activeTestId, setActiveTestId] = useState<string | null>(null);
    const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
    const [testDate, setTestDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [entryMode, setEntryMode] = useState<'individual' | 'team'>('individual');
    const [historyRefresh, setHistoryRefresh] = useState(0);
    const [hubView, setHubView] = useState<HubView>('categories');

    // ─── Derived data ─────────────────────────────────────────────────
    const allAthletes = useMemo(
        () => teams.flatMap(t => t.players).sort((a, b) => a.name.localeCompare(b.name)),
        [teams]
    );

    const selectedAthlete = useMemo(
        () => allAthletes.find(a => a.id === selectedAthleteId),
        [allAthletes, selectedAthleteId]
    );

    const categoryTests = useMemo(
        () => activeCategory ? getTestsByCategory(activeCategory) : [],
        [activeCategory]
    );

    const activeTest = useMemo(
        () => activeTestId ? getTestById(activeTestId) : null,
        [activeTestId]
    );

    const activeCategoryInfo = useMemo(
        () => TEST_CATEGORIES.find(c => c.id === activeCategory) || null,
        [activeCategory]
    );

    const filteredTests = useMemo(() => {
        if (!searchQuery.trim()) return categoryTests;
        const q = searchQuery.toLowerCase();
        return categoryTests.filter(t =>
            t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
        );
    }, [categoryTests, searchQuery]);

    // ─── Handlers ─────────────────────────────────────────────────────

    const handleSave = useCallback(async (testId: string, metrics: Record<string, any>) => {
        if (!selectedAthleteId) return;
        try {
            await DatabaseService.logAssessment(testId, selectedAthleteId, metrics, testDate);
            setHistoryRefresh(prev => prev + 1);
            showToast?.('Assessment saved successfully', 'success');
        } catch (err: any) {
            console.error('Save assessment error:', err);
            showToast?.('Failed to save assessment', 'error');
        }
    }, [selectedAthleteId, testDate, showToast]);

    // ─── RENDER: Active test view (entry form or custom component) ────
    if (activeTest) {
        // Custom component tests (e.g. NordBord Hamstring)
        if (activeTest.customComponent) {
            return (
                <div className="space-y-5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => { setActiveTestId(null); setEntryMode('individual'); }}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                            >
                                <ArrowLeftIcon size={16} />
                            </button>
                            <div>
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Testing Hub</div>
                                <h2 className="text-base font-semibold text-slate-900">{activeTest.name}</h2>
                            </div>
                        </div>
                    </div>
                    <HamstringReport />
                </div>
            );
        }

        // Generic test entry form
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                {/* Header bar with Individual / Team toggle */}
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setActiveTestId(null); setEntryMode('individual'); }}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                        >
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
                                {activeCategoryInfo?.name || 'Testing Hub'}
                            </div>
                            <h2 className="text-base font-semibold text-slate-900">{activeTest.name}</h2>
                        </div>
                    </div>

                    {/* Individual / Team toggle */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                        {[
                            { key: 'individual', label: 'Individual', icon: UserIcon },
                            { key: 'team', label: 'Team', icon: UsersIcon },
                        ].map(m => (
                            <button
                                key={m.key}
                                onClick={() => setEntryMode(m.key as any)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                                    ${entryMode === m.key
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                <m.icon size={12} />
                                {m.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Entry mode content */}
                {entryMode === 'individual' ? (
                    <>
                        {/* Athlete + Date selection */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        <UserIcon size={12} className="inline mr-1" />Athlete
                                    </label>
                                    <select
                                        value={selectedAthleteId || ''}
                                        onChange={e => setSelectedAthleteId(e.target.value || null)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-white"
                                    >
                                        <option value="">— Select Athlete —</option>
                                        {allAthletes.map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        <CalendarIcon size={12} className="inline mr-1" />Date
                                    </label>
                                    <input
                                        type="date"
                                        value={testDate}
                                        onChange={e => setTestDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Equipment & Duration info */}
                            {(activeTest.equipmentRequired?.length || activeTest.estimatedDuration) && (
                                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
                                    {activeTest.equipmentRequired?.map(eq => (
                                        <span key={eq} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full uppercase tracking-wide">
                                            {eq}
                                        </span>
                                    ))}
                                    {activeTest.estimatedDuration && (
                                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-500 text-[10px] rounded-full uppercase tracking-wide">
                                            ~{activeTest.estimatedDuration}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Test entry form */}
                        <div className="bg-white border border-slate-200 rounded-xl p-5">
                            <TestEntryForm
                                test={activeTest}
                                athleteId={selectedAthleteId}
                                athleteGender={selectedAthlete?.gender}
                                onSave={handleSave}
                                date={testDate}
                            />
                        </div>

                        {/* Trend chart — shows how results change over time */}
                        <div className="relative">
                            {isLoading && selectedAthleteId && (
                                <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl">
                                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                    <span className="text-xs font-medium text-slate-400">Loading {selectedAthlete?.name || 'athlete'} test data...</span>
                                </div>
                            )}
                            <TrendChart
                                test={activeTest}
                                athleteId={selectedAthleteId}
                                athleteName={selectedAthlete?.name}
                                refreshKey={historyRefresh}
                            />
                        </div>

                        {/* History panel */}
                        <div className="relative">
                            {isLoading && selectedAthleteId && (
                                <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-3 rounded-xl">
                                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                                    <span className="text-xs font-medium text-slate-400">Loading assessment history...</span>
                                </div>
                            )}
                            <TestHistoryPanel
                                test={activeTest}
                                athleteId={selectedAthleteId}
                                athleteName={selectedAthlete?.name}
                                athleteGender={selectedAthlete?.gender}
                                refreshKey={historyRefresh}
                            />
                        </div>
                    </>
                ) : (
                    /* Team batch entry */
                    <TeamBatchEntry
                        test={activeTest}
                        date={testDate}
                        onDateChange={setTestDate}
                        onSaved={() => setHistoryRefresh(prev => prev + 1)}
                    />
                )}
            </div>
        );
    }

    // ─── RENDER: Category test list ───────────────────────────────────
    if (activeCategory && activeCategoryInfo) {
        const IconComponent = ICON_MAP[activeCategoryInfo.icon] || ActivityIcon;

        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { setActiveCategory(null); setSearchQuery(''); }}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                        >
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                <IconComponent size={18} />
                            </div>
                            <div>
                                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Testing Hub</div>
                                <h2 className="text-base font-semibold text-slate-900">{activeCategoryInfo.name}</h2>
                            </div>
                        </div>
                    </div>
                    <span className="text-xs text-slate-400">{categoryTests.length} tests</span>
                </div>

                {/* Search within category */}
                {categoryTests.length > 5 && (
                    <div className="relative">
                        <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search tests..."
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                        />
                    </div>
                )}

                {/* Test list */}
                <div className="space-y-2">
                    {filteredTests.map(test => (
                        <button
                            key={test.id}
                            onClick={() => setActiveTestId(test.id)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:shadow-sm hover:border-indigo-200 transition-all group flex items-center justify-between text-left"
                        >
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                    {test.name}
                                </h4>
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{test.description}</p>
                                {(test.equipmentRequired?.length || test.estimatedDuration) && (
                                    <div className="flex gap-1.5 mt-1.5">
                                        {test.equipmentRequired?.slice(0, 2).map(eq => (
                                            <span key={eq} className="px-1.5 py-0.5 bg-slate-50 text-slate-400 text-[9px] rounded uppercase tracking-wide">{eq}</span>
                                        ))}
                                        {test.estimatedDuration && (
                                            <span className="px-1.5 py-0.5 bg-indigo-50/50 text-indigo-400 text-[9px] rounded uppercase tracking-wide">~{test.estimatedDuration}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <ChevronRightIcon size={16} className="text-slate-300 group-hover:text-indigo-400 shrink-0 ml-3 transition-colors" />
                        </button>
                    ))}
                    {filteredTests.length === 0 && searchQuery && (
                        <div className="text-center py-8 text-sm text-slate-400">
                            No tests match "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ─── RENDER: Hub home ────────────────────────────────────────────

    // Team Comparison view
    if (hubView === 'compare') {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setHubView('categories')}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                        >
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Testing Hub</div>
                            <h2 className="text-base font-semibold text-slate-900">Team Comparison</h2>
                        </div>
                    </div>
                </div>
                <TeamComparisonTable />
            </div>
        );
    }

    // Export view
    if (hubView === 'export') {
        return (
            <div className="space-y-5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setHubView('categories')}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all"
                        >
                            <ArrowLeftIcon size={16} />
                        </button>
                        <div>
                            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Testing Hub</div>
                            <h2 className="text-base font-semibold text-slate-900">Export & Print</h2>
                        </div>
                    </div>
                </div>
                <TestSessionExport />
            </div>
        );
    }

    // Default: category cards + tools
    return (
        <div className="space-y-5 animate-in fade-in duration-300">
            <div className="bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-semibold text-slate-900">Testing Hub</h2>
                <p className="text-sm text-slate-500 mt-0.5">Sports science assessments, screening protocols & performance testing.</p>
            </div>

            {/* Quick tools row */}
            <div className="flex gap-3">
                <button
                    onClick={() => setHubView('compare')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                    <BarChart3Icon size={14} className="text-indigo-500" />
                    Team Comparison
                </button>
                <button
                    onClick={() => setHubView('export')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                    <DownloadIcon size={14} className="text-indigo-500" />
                    Export & Print
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-[150px] flex items-start gap-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-100 animate-pulse shrink-0" />
                                <div className="flex-1 space-y-2 py-1">
                                    <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                                    <div className="h-3 w-full bg-slate-50 rounded animate-pulse" />
                                    <div className="h-3 w-16 bg-slate-50 rounded animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col items-center py-4">
                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                        <span className="text-xs font-medium text-slate-400">Loading testing categories...</span>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {TEST_CATEGORIES.map(cat => {
                        const IconComponent = ICON_MAP[cat.icon] || ActivityIcon;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group flex flex-col text-left h-[150px]"
                            >
                                <div className="flex items-start gap-4 h-full">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-all shrink-0">
                                        <IconComponent size={20} />
                                    </div>
                                    <div className="flex flex-col justify-center h-full">
                                        <h3 className="text-base font-semibold text-slate-900 mb-1 leading-tight">{cat.name}</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">{cat.description}</p>
                                        <span className="text-[10px] text-slate-400 mt-1.5">{cat.testCount} tests</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
