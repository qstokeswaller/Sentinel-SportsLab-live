// @ts-nocheck
import React, { useState } from 'react';
import { Users as UsersIcon, User as UserIcon, X as XIcon } from 'lucide-react';
import { CustomSelect } from '../ui/CustomSelect';

/**
 * Assignee = { type: 'team' | 'individual', id: string }.
 *
 * Multi-select picker used by BOTH the Add Event modal and the dashboard inline
 * edit form, so the two stay in lock-step. An event can target several teams
 * and/or athletes; the chosen assignees render as removable chips. The mode
 * toggle only controls which list the "add" dropdown shows — selections of both
 * types accumulate into one unified list.
 */
export const AssigneePicker: React.FC<{
    value: { type: string; id: string }[];
    onChange: (next: { type: string; id: string }[]) => void;
    teams: any[];
    labelClassName?: string;
}> = ({ value = [], onChange, teams = [], labelClassName }) => {
    const [mode, setMode] = useState<'team' | 'individual'>('individual');
    const [teamFilter, setTeamFilter] = useState('');

    const has = (type: string, id: string) => value.some(a => a.type === type && a.id === id);
    const add = (type: string, id: string) => {
        if (!id || has(type, id)) return;
        onChange([...value, { type, id }]);
    };
    const remove = (type: string, id: string) =>
        onChange(value.filter(a => !(a.type === type && a.id === id)));

    // Resolve a display name for a chip.
    const nameFor = (a: { type: string; id: string }) => {
        if (a.type === 'team') return teams.find(t => t.id === a.id)?.name || 'Unknown team';
        const p = teams.flatMap(t => t.players || []).find(x => x.id === a.id);
        return p?.name || 'Unknown athlete';
    };

    const selectableTeams = (teams || [])
        .filter(t => t.id !== 't_private')
        .sort((a, b) => a.name.localeCompare(b.name));

    const groupsWithPlayers = (teams || [])
        .filter(t => (t.players || []).length > 0)
        .sort((a, b) => {
            if (a.id === 't_private') return 1;
            if (b.id === 't_private') return -1;
            return a.name.localeCompare(b.name);
        });

    const selectablePlayers = (teamFilter
        ? (teams || []).filter(t => t.id === teamFilter)
        : groupsWithPlayers
    ).flatMap(t => (t.players || []).map(p => ({ ...p, teamName: t.name })))
        .sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div>
            {/* Mode toggle — chooses which list the add-dropdown shows */}
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-[#243A58] w-fit mb-2">
                {(['individual', 'team'] as const).map(opt => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => { setMode(opt); setTeamFilter(''); }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all ${mode === opt ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-white dark:bg-[#1A2D48] text-slate-700 dark:text-[#CBD5E1] hover:bg-slate-50 dark:hover:bg-[#243A58]'}`}
                    >
                        {opt === 'team' ? <UsersIcon size={12} /> : <UserIcon size={12} />}
                        {opt === 'team' ? 'Teams' : 'Athletes'}
                    </button>
                ))}
            </div>

            {/* Add dropdown */}
            {mode === 'team' ? (
                <CustomSelect
                    value=""
                    onChange={e => add('team', e.target.value)}
                    variant="form"
                    placeholder="Add a team…"
                >
                    <option value="">Add a team…</option>
                    {selectableTeams.filter(t => !has('team', t.id)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </CustomSelect>
            ) : (
                <div className="flex flex-col gap-2">
                    <CustomSelect
                        value={teamFilter}
                        onChange={e => setTeamFilter(e.target.value)}
                        variant="form"
                        placeholder="All teams"
                    >
                        <option value="">All teams</option>
                        {groupsWithPlayers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </CustomSelect>
                    <CustomSelect
                        value=""
                        onChange={e => add('individual', e.target.value)}
                        variant="form"
                        placeholder="Add an athlete…"
                    >
                        <option value="">Add an athlete…</option>
                        {selectablePlayers.filter(p => !has('individual', p.id)).map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name}{!teamFilter && p.teamName ? ` — ${p.teamName}` : ''}
                            </option>
                        ))}
                    </CustomSelect>
                </div>
            )}

            {/* Selected chips */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2.5">
                    {value.map(a => (
                        <span
                            key={`${a.type}:${a.id}`}
                            className="inline-flex items-center gap-1.5 max-w-[220px] px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-600/80 border border-indigo-200 dark:border-indigo-800/50 rounded-lg text-xs font-medium text-indigo-700 dark:text-white"
                        >
                            {a.type === 'team' ? <UsersIcon size={11} className="shrink-0" /> : <UserIcon size={11} className="shrink-0" />}
                            <span className="truncate">{nameFor(a)}</span>
                            <button
                                type="button"
                                onClick={() => remove(a.type, a.id)}
                                className="shrink-0 text-indigo-400 dark:text-indigo-200 hover:text-rose-500 dark:hover:text-rose-300 transition-colors"
                                title="Remove"
                            >
                                <XIcon size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AssigneePicker;
