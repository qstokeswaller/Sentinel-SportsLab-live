// @ts-nocheck
import React, { useState } from 'react';
import { useAppState } from '../context/AppStateContext';
import {
    UserPlusIcon, ShieldIcon, ChevronRightIcon, UsersIcon, PlusIcon,
    LayoutGridIcon, ListIcon, Trash2Icon, AlertTriangleIcon,
    ArrowLeftIcon, LayoutListIcon, ClipboardListIcon,
    ChevronDownIcon, ChevronUpIcon, FileSpreadsheetIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TrainingRegister from '../components/roster/TrainingRegister';
import { ConfirmDeleteModal } from '../components/ui/ConfirmDeleteModal';
import { ImportRosterModal } from '../components/roster/ImportRosterModal';

type ViewMode     = 'list' | 'grid';
type PlayerLayout = 'list' | 'cards';          // sub-toggle inside team drill-down
type TeamDetailTab = 'athletes' | 'register';

export const RosterPage = () => {
    const {
        teams,
        setIsAddAthleteModalOpen,
        setNewAthleteName,
        setAddAthleteMode,
        setViewingPlayer,
        handleDeleteAthlete,
        handleDeleteTeam,
        isLoading,
    } = useAppState();

    const [viewMode, setViewMode]           = useState<ViewMode>('list');
    const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
    const [playerLayout, setPlayerLayout]   = useState<PlayerLayout>('cards');
    // Start all teams collapsed — user expands the ones they want to see
    const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(() => new Set(teams.map(t => t.id)));
    const [teamDetailTab, setTeamDetailTab] = useState<TeamDetailTab>('athletes');
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'athlete' | 'team'; id: string; name: string } | null>(null);
    const [deleting, setDeleting]           = useState(false);
    const [showImport, setShowImport]       = useState(false);

    // Keep newly-loaded teams collapsed on first data load
    React.useEffect(() => {
        setCollapsedTeams(prev => {
            const next = new Set(prev);
            teams.forEach(t => { if (!next.has(t.id)) next.add(t.id); });
            return next;
        });
    }, [teams.map(t => t.id).join(',')]);

    const allAthletes = teams.flatMap(team =>
        [...(team.players || [])].sort((a, b) => a.name.localeCompare(b.name)).map(player => ({ ...player, teamName: team.name, teamId: team.id }))
    );

    const selectedTeam = teams.find(t => t.id === selectedTeamId) ?? null;

    const switchViewMode = (mode: ViewMode) => {
        setViewMode(mode);
        setSelectedTeamId(null); // always reset drill-down when toggling view
        setTeamDetailTab('athletes');
    };

    const handleConfirmDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            if (confirmDelete.type === 'athlete') await handleDeleteAthlete(confirmDelete.id);
            else await handleDeleteTeam(confirmDelete.id);
            // If the deleted team was selected, go back to teams grid
            if (confirmDelete.type === 'team' && confirmDelete.id === selectedTeamId) {
                setSelectedTeamId(null);
            }
            setConfirmDelete(null);
        } finally {
            setDeleting(false);
        }
    };

    // Delete modal uses the shared ConfirmDeleteModal component

    // ── View toggle pill (shared) ──────────────────────────────────────────
    const ViewToggle = () => (
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
            <button
                onClick={() => switchViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                title="List view"
            >
                <ListIcon size={15} />
            </button>
            <button
                onClick={() => switchViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                title="Grid view"
            >
                <LayoutGridIcon size={15} />
            </button>
        </div>
    );

    // ── LIST VIEW ──────────────────────────────────────────────────────────
    const renderListView = () => (
        <>
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Athlete Roster</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage athletes and squads across your organisation.</p>
                </div>
                <div data-tour="add-athlete" className="flex items-center gap-2">
                    <ViewToggle />
                    <Button variant="outline" onClick={() => setShowImport(true)}>
                        <FileSpreadsheetIcon size={14} /> Import CSV
                    </Button>
                    <button
                        onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                    >
                        <UserPlusIcon size={11} /> Add Athlete
                    </button>
                </div>
            </div>

            <div data-tour="team-list" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_120px] px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Athlete</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Team</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sport</span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</span>
                </div>

                {teams.length === 0 ? (
                    <div className="py-16 text-center">
                        <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                            <UserPlusIcon size={24} className="text-indigo-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-500">No teams yet</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Add Athlete" above to create your first team and start building your roster.</p>
                    </div>
                ) : teams.map((team, teamIdx) => {
                    const isCollapsed = collapsedTeams.has(team.id);
                    const toggleCollapse = () => setCollapsedTeams(prev => {
                        const next = new Set(prev);
                        if (next.has(team.id)) next.delete(team.id); else next.add(team.id);
                        return next;
                    });
                    return (
                    <div key={team.id}>
                        <div
                            className="px-4 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2 group/team cursor-pointer select-none"
                            onClick={toggleCollapse}
                        >
                            <button className="p-0.5 text-slate-400 transition-transform" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                                <ChevronDownIcon size={14} />
                            </button>
                            <ShieldIcon size={12} className="text-indigo-400" />
                            <span className="text-xs font-semibold text-slate-600">{team.name}</span>
                            <span className="text-xs text-slate-400">· {(team.players || []).length} athletes</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'team', id: team.id, name: team.name }); }}
                                className="ml-auto p-1 rounded text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-all opacity-0 group-hover/team:opacity-100"
                                title="Delete team"
                            >
                                <Trash2Icon size={12} />
                            </button>
                        </div>

                        {!isCollapsed && (
                            (team.players || []).length > 0 ? [...(team.players || [])].sort((a, b) => a.name.localeCompare(b.name)).map((player, playerIdx) => (
                                <div
                                    key={player.id}
                                    {...(playerIdx === 0 && teamIdx === 0 ? { 'data-tour': 'athlete-row' } : {})}
                                    className={`grid grid-cols-[2fr_1fr_1fr_120px] px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors group ${
                                        playerIdx < (team.players || []).length - 1 || teamIdx < teams.length - 1 ? 'border-b border-slate-100' : ''
                                    }`}
                                    onClick={() => setViewingPlayer(player)}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0">
                                            {player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{player.name}</span>
                                    </div>
                                    <span className="text-sm text-slate-500 truncate">{team.name}</span>
                                    <span className="text-sm text-slate-500 truncate">{player.sport || <span className="text-slate-300">—</span>}</span>
                                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setConfirmDelete({ type: 'athlete', id: player.id, name: player.name })}
                                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                            title="Delete athlete"
                                        >
                                            <Trash2Icon size={13} />
                                        </button>
                                        <span
                                            onClick={() => setViewingPlayer(player)}
                                            className="text-xs text-indigo-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            View <ChevronRightIcon size={12} />
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-4 py-4 text-sm text-slate-400 italic border-b border-slate-100">
                                    No athletes assigned to this team yet.
                                </div>
                            )
                        )}
                    </div>
                    );
                })}

                <div className="px-4 py-3 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{allAthletes.length} athletes across {teams.length} team{teams.length !== 1 ? 's' : ''}</span>
                    <button
                        onClick={() => { setAddAthleteMode('team'); setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                    >
                        <PlusIcon size={11} /> Add Team
                    </button>
                </div>
            </div>
        </>
    );

    // ── GRID: TEAMS OVERVIEW ───────────────────────────────────────────────
    const renderTeamsGrid = () => (
        <>
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Athlete Roster</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage athletes and squads across your organisation.</p>
                </div>
                <div data-tour="add-athlete" className="flex items-center gap-2">
                    <ViewToggle />
                    <button
                        onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                    >
                        <UserPlusIcon size={11} /> Add Athlete
                    </button>
                </div>
            </div>

            {/* Team cards grid */}
            {teams.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                        <UserPlusIcon size={24} className="text-indigo-300" />
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No teams yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click "Add Athlete" above to create your first team and start building your roster.</p>
                </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {teams.map(team => {
                    const players   = [...(team.players || [])].sort((a, b) => a.name.localeCompare(b.name));
                    const preview   = players.slice(0, 4);
                    const overflow  = players.length - 4;

                    return (
                        <div
                            key={team.id}
                            onClick={() => { setSelectedTeamId(team.id); setTeamDetailTab('athletes'); }}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            {/* Coloured top strip */}
                            <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-indigo-400" />

                            {/* Delete team */}
                            <button
                                onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'team', id: team.id, name: team.name }); }}
                                className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-200 hover:text-rose-400 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                title="Delete team"
                            >
                                <Trash2Icon size={13} />
                            </button>

                            <div className="p-5">
                                {/* Icon + name */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                                        <ShieldIcon size={18} className="text-indigo-500" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                            {team.name}
                                        </div>
                                        <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                                            {team.sport || 'Team'}
                                        </div>
                                    </div>
                                </div>

                                {/* Athlete count */}
                                <div className="flex items-center gap-1.5 mb-4">
                                    <UsersIcon size={12} className="text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-500">
                                        {players.length} athlete{players.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Avatar preview strip */}
                                {players.length > 0 ? (
                                    <div className="flex items-center">
                                        <div className="flex -space-x-2">
                                            {preview.map(p => (
                                                <div
                                                    key={p.id}
                                                    className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-indigo-600 text-[10px] font-bold shrink-0"
                                                    title={p.name}
                                                >
                                                    {p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                </div>
                                            ))}
                                        </div>
                                        {overflow > 0 && (
                                            <span className="ml-2 text-[10px] font-semibold text-slate-400">
                                                +{overflow} more
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-300 italic">No athletes yet</p>
                                )}

                                {/* CTA */}
                                <div className="mt-4 flex items-center justify-end text-[10px] font-bold text-indigo-400 group-hover:text-indigo-600 transition-colors uppercase tracking-wide gap-1">
                                    View Team <ChevronRightIcon size={12} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}

            <div className="text-xs text-slate-400">
                {allAthletes.length} athletes across {teams.length} team{teams.length !== 1 ? 's' : ''}
            </div>
        </>
    );

    // ── GRID: TEAM DETAIL (players) ────────────────────────────────────────
    const renderTeamDetail = () => {
        if (!selectedTeam) return null;
        const players = selectedTeam.players || [];

        return (
            <>
                {/* Detail header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedTeamId(null)}
                            className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeftIcon size={15} />
                            Teams
                        </button>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-2">
                            <ShieldIcon size={14} className="text-indigo-400" />
                            <h1 className="text-xl font-bold text-slate-900">{selectedTeam.name}</h1>
                            <span className="text-sm text-slate-400">· {players.length} athletes</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Player layout sub-toggle — only visible on Athletes tab */}
                        {teamDetailTab === 'athletes' && (
                            <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-0.5">
                                <button
                                    onClick={() => setPlayerLayout('list')}
                                    className={`p-1.5 rounded-md transition-all ${playerLayout === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                                    title="List"
                                >
                                    <LayoutListIcon size={14} />
                                </button>
                                <button
                                    onClick={() => setPlayerLayout('cards')}
                                    className={`p-1.5 rounded-md transition-all ${playerLayout === 'cards' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-700'}`}
                                    title="Cards"
                                >
                                    <LayoutGridIcon size={14} />
                                </button>
                            </div>
                        )}
                        {/* Main view toggle — stays here so user can jump back to list view */}
                        <ViewToggle />
                        <button
                            onClick={() => setConfirmDelete({ type: 'team', id: selectedTeam.id, name: selectedTeam.name })}
                            className="p-2 rounded-xl border border-slate-200 text-slate-300 hover:text-rose-400 hover:border-rose-100 hover:bg-rose-50 transition-all"
                            title="Delete team"
                        >
                            <Trash2Icon size={14} />
                        </button>
                        <button
                            onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                        >
                            <UserPlusIcon size={11} /> Add Athlete
                        </button>
                    </div>
                </div>

                {/* Athletes | Register tab bar */}
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                    <button
                        onClick={() => setTeamDetailTab('athletes')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            teamDetailTab === 'athletes'
                                ? 'bg-white shadow-sm text-slate-900'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <UsersIcon size={13} /> Athletes
                    </button>
                    <button
                        onClick={() => setTeamDetailTab('register')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                            teamDetailTab === 'register'
                                ? 'bg-white shadow-sm text-slate-900'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ClipboardListIcon size={13} /> Register
                    </button>
                </div>

                {/* Tab body: Register */}
                {teamDetailTab === 'register' ? (
                    <TrainingRegister team={selectedTeam} />
                ) : players.length === 0 ? (
                    <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                        <UsersIcon size={28} className="text-slate-300 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-400">No athletes in this team yet.</p>
                    </div>
                ) : playerLayout === 'cards' ? (
                    /* ── Cards layout ── */
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {players.map(player => (
                            <div
                                key={player.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col items-center gap-2 hover:shadow-md hover:border-indigo-200 transition-all group cursor-pointer relative"
                                onClick={() => setViewingPlayer(player)}
                            >
                                <button
                                    onClick={e => { e.stopPropagation(); setConfirmDelete({ type: 'athlete', id: player.id, name: player.name }); }}
                                    className="absolute top-2 right-2 p-1 rounded-lg text-slate-200 hover:text-rose-400 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete athlete"
                                >
                                    <Trash2Icon size={13} />
                                </button>

                                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-lg font-bold ring-2 ring-white shadow">
                                    {player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>

                                <div className="text-center min-w-0 w-full">
                                    <div className="text-sm font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{player.name}</div>
                                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide truncate mt-0.5">
                                        {player.sport || player.position || 'Athlete'}
                                    </div>
                                </div>

                                <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full mt-auto">
                                    View Profile
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    /* ── List layout ── */
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="grid grid-cols-[2fr_1fr_120px] px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Athlete</span>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sport</span>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right">Actions</span>
                        </div>
                        {players.map((player, idx) => (
                            <div
                                key={player.id}
                                className={`grid grid-cols-[2fr_1fr_120px] px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors group ${
                                    idx < players.length - 1 ? 'border-b border-slate-100' : ''
                                }`}
                                onClick={() => setViewingPlayer(player)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0">
                                        {player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{player.name}</span>
                                </div>
                                <span className="text-sm text-slate-500 truncate">{player.sport || <span className="text-slate-300">—</span>}</span>
                                <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => setConfirmDelete({ type: 'athlete', id: player.id, name: player.name })}
                                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete athlete"
                                    >
                                        <Trash2Icon size={13} />
                                    </button>
                                    <span
                                        onClick={() => setViewingPlayer(player)}
                                        className="text-xs text-indigo-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                    >
                                        View <ChevronRightIcon size={12} />
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        );
    };

    // ── Root render ───────────────────────────────────────────────────────
    if (teams.length === 0) {
        return (
            <div className="space-y-5 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Athlete Roster</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage athletes and squads across your organisation.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <ViewToggle />
                        <button
                            onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                        >
                            <UserPlusIcon size={11} /> Add Athlete
                        </button>
                    </div>
                </div>
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <UsersIcon size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">No teams yet</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Create a team and add your first athletes to get started.</p>
                    <button
                        onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 mx-auto"
                    >
                        <UserPlusIcon size={11} /> Add Athlete
                    </button>
                </div>
                <ConfirmDeleteModal
                    isOpen={!!confirmDelete}
                    title={`Delete ${confirmDelete?.type === 'athlete' ? 'Athlete' : 'Team'}`}
                    message={`Are you sure you want to delete "${confirmDelete?.name}"?`}
                    warning={confirmDelete?.type === 'team' ? 'Remove all athletes from this team first, or they may become unassigned.' : undefined}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setConfirmDelete(null)}
                    loading={deleting}
                />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-5 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-slate-900">Athlete Roster</h1>
                        <p className="text-sm text-slate-500 mt-0.5">Manage athletes and squads across your organisation.</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
                                <div className="space-y-1.5">
                                    <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                                    <div className="h-3 w-16 bg-slate-50 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(j => (
                                    <div key={j} className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col items-center py-6">
                    <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2" />
                    <span className="text-xs font-medium text-slate-400">Loading roster data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {viewMode === 'list'
                ? renderListView()
                : selectedTeamId
                    ? renderTeamDetail()
                    : renderTeamsGrid()
            }
            <ConfirmDeleteModal
                isOpen={!!confirmDelete}
                title={`Delete ${confirmDelete?.type === 'athlete' ? 'Athlete' : 'Team'}`}
                message={`Are you sure you want to delete "${confirmDelete?.name}"?`}
                warning={confirmDelete?.type === 'team' ? 'Remove all athletes from this team first, or they may become unassigned.' : undefined}
                onConfirm={handleConfirmDelete}
                onCancel={() => setConfirmDelete(null)}
                loading={deleting}
            />
            {showImport && <ImportRosterModal onClose={() => setShowImport(false)} />}
        </div>
    );
};
