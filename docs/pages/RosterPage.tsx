// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import { UserPlusIcon, ShieldIcon, ChevronRightIcon, UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const RosterPage = () => {
    const {
        teams,
        setIsAddAthleteModalOpen,
        setNewAthleteName,
        setViewingPlayer,
    } = useAppState();

    const allAthletes = teams.flatMap(team =>
        (team.players || []).map(player => ({ ...player, teamName: team.name, teamId: team.id }))
    );

    return (
        <div className="space-y-5 animate-in fade-in duration-500">

            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Athlete Roster</h1>
                    <p className="text-sm text-slate-500 mt-0.5">Manage athletes and squads across your organisation.</p>
                </div>
                <Button onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}>
                    <UserPlusIcon size={14} /> Add Athlete
                </Button>
            </div>

            {/* Roster Table */}
            {teams.length > 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[2fr_1fr_1fr_80px] px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Athlete</span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Team</span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Sport</span>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide text-right">Profile</span>
                    </div>

                    {/* Team sections */}
                    {teams.map((team, teamIdx) => (
                        <div key={team.id}>
                            {/* Team section divider */}
                            <div className="px-4 py-2 bg-slate-50/60 border-b border-slate-100 flex items-center gap-2">
                                <ShieldIcon size={12} className="text-indigo-400" />
                                <span className="text-xs font-semibold text-slate-600">{team.name}</span>
                                <span className="text-xs text-slate-400">· {(team.players || []).length} athletes</span>
                            </div>

                            {/* Athletes */}
                            {(team.players || []).length > 0 ? (team.players || []).map((player, playerIdx) => (
                                <div
                                    key={player.id}
                                    onClick={() => setViewingPlayer(player)}
                                    className={`grid grid-cols-[2fr_1fr_1fr_80px] px-4 py-3 items-center cursor-pointer hover:bg-slate-50 transition-colors group ${
                                        playerIdx < (team.players || []).length - 1 || teamIdx < teams.length - 1 ? 'border-b border-slate-100' : ''
                                    }`}
                                >
                                    {/* Name + avatar */}
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-semibold shrink-0">
                                            {player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <span className="text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{player.name}</span>
                                    </div>

                                    {/* Team */}
                                    <span className="text-sm text-slate-500 truncate">{team.name}</span>

                                    {/* Sport */}
                                    <span className="text-sm text-slate-500 truncate">{player.sport || <span className="text-slate-300">—</span>}</span>

                                    {/* Action */}
                                    <div className="flex justify-end">
                                        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            View <ChevronRightIcon size={12} />
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="px-4 py-4 text-sm text-slate-400 italic border-b border-slate-100">
                                    No athletes assigned to this team yet.
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Footer summary */}
                    <div className="px-4 py-3 bg-slate-50/40 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400">{allAthletes.length} athletes across {teams.length} team{teams.length !== 1 ? 's' : ''}</span>
                        <button
                            onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }}
                            className="text-xs text-indigo-600 font-medium hover:text-indigo-700 transition-colors flex items-center gap-1"
                        >
                            <UserPlusIcon size={12} /> Add team
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
                    <UsersIcon size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-500">No teams yet</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Create a team and add your first athletes to get started.</p>
                    <Button onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }} size="sm">
                        <UserPlusIcon size={13} /> Add Athlete
                    </Button>
                </div>
            )}
        </div>
    );
};
