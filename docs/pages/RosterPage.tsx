// @ts-nocheck
import React from 'react';
import { useAppState } from '../context/AppStateContext';
import { UserPlusIcon, ShieldIcon, ChevronRightIcon } from 'lucide-react';

export const RosterPage = () => {
    const {
        teams,
        setIsAddAthleteModalOpen,
        setNewAthleteName,
        setViewingPlayer,
    } = useAppState();

    return (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div
                            className="flex justify-between items-end bg-white p-8 rounded-[2.5rem] border border-indigo-100 shadow-sm relative overflow-hidden border-t-4 border-t-indigo-900">
                            <div className="space-y-2 relative z-10">
                                <h2 className="text-4xl font-black text-indigo-900 uppercase tracking-tighter leading-none">Athlete Roster
                                </h2>
                                <p className="text-indigo-400 text-sm italic leading-relaxed font-medium">Monitoring terminal for research
                                    subjects and high-performance units.</p>
                            </div>
                            <button onClick={() => { setIsAddAthleteModalOpen(true); setNewAthleteName(''); }} className="bg-indigo-600
            text-white px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg flex
            items-center gap-3 active:scale-95 transition-all z-10 hover:bg-indigo-700 shadow-indigo-100">
                                <UserPlusIcon size={18} /> Add Athlete
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.length > 0 ? teams.map(team => (
                                <div key={team.id}
                                    className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm hover:shadow-xl transition-all flex flex-col border-t-4 border-t-indigo-600 group">
                                    <div className="flex justify-between items-center mb-6 border-b border-indigo-50 pb-4">
                                        <div className="flex flex-col">
                                            <h4
                                                className="text-xl font-black text-indigo-900 tracking-tight leading-none group-hover:text-indigo-600 transition-colors">
                                                {team.name}</h4>
                                        </div>
                                        <ShieldIcon size={24} className="text-indigo-100 group-hover:text-indigo-400" />
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        {(team.players || []).length > 0 ? (team.players || []).map(player => (
                                            <div key={player.id}
                                                onClick={() => setViewingPlayer(player)}
                                                className="w-full flex items-center justify-between p-3 bg-indigo-50/50 rounded-xl hover:bg-indigo-100 transition-all shadow-sm cursor-pointer">
                                                <span className="text-sm font-extrabold truncate text-indigo-900">{player.name}</span>
                                                <ChevronRightIcon size={16} className="text-slate-400 shrink-0" />
                                            </div>
                                        )) : (
                                            <div
                                                className="p-4 text-center text-slate-300 text-[10px] font-black uppercase tracking-widest border border-dashed border-slate-200 rounded-xl">
                                                No Athletes Assigned</div>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                                    <div className="text-slate-300 text-xl font-black uppercase tracking-[0.2em]">Roster Initializing...</div>
                                    <div className="text-indigo-400 text-[10px] font-bold mt-2 uppercase tracking-widest">Checking Local
                                        Intelligence Database</div>
                                </div>
                            )}
                        </div>
                    </div>
    );
};
