// 2026-07-12). Typing is Phase 5 work; this step is pure movement.
// Team + athlete handlers (add/update/delete team & athlete, open profile).
// NOTE: receives initData as a dep — the hook call in the provider sits AFTER
// initData's declaration (TDZ-safe placement).
import { DatabaseService } from '../../services/databaseService';

export const useTeamHandlers = ({
    addAthleteMode,
    athletes,
    initData,
    newAthleteName,
    newAthleteProfile,
    newAthleteTeam,
    newTeamName,
    setAddAthleteMode,
    setIsAddAthleteModalOpen,
    setIsAddTeamModalOpen,
    setNewAthleteName,
    setNewAthleteProfile,
    setNewTeamName,
    setTeams,
    setViewingPlayer,
    showToast,
    teams,
}: any) => {
    const handleOpenPlayerProfile = (name) => {
        const player = teams.flatMap(t => t.players).find(p => p.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(p.name.toLowerCase()));
        if (player) {
            setViewingPlayer(player);
        }
    };

    const handleAddAthlete = async (keepOpen = false) => {
        if (!newAthleteName.trim()) return false;
        try {
            if (addAthleteMode === 'athlete') {
                const resolvedTeamId = newAthleteTeam && newAthleteTeam !== 'All' && newAthleteTeam !== 't_private' ? newAthleteTeam : null;
                const newAthlete = await DatabaseService.createAthlete({
                    name: newAthleteName,
                    team_id: resolvedTeamId,
                    age: newAthleteProfile.age ? parseInt(newAthleteProfile.age) : undefined,
                    gender: newAthleteProfile.gender || undefined,
                    height_cm: newAthleteProfile.height_cm ? parseFloat(newAthleteProfile.height_cm) : undefined,
                    weight_kg: newAthleteProfile.weight_kg ? parseFloat(newAthleteProfile.weight_kg) : undefined,
                    sport: newAthleteProfile.sport || undefined,
                    position: newAthleteProfile.position || undefined,
                    goals: newAthleteProfile.goals || undefined,
                    notes: newAthleteProfile.notes || undefined,
                    image_url: newAthleteProfile.image_url || undefined,
                });
                // Optimistically add to local state — no full reload, no loading flash
                if (newAthlete) {
                    const athleteRecord = { ...newAthlete, performanceMetrics: [], performanceHistory: [] };
                    setTeams(prev => prev.map(t => {
                        if (t.id === resolvedTeamId) {
                            const players = [...(t.players || []), athleteRecord]
                                .sort((a, b) => a.name.localeCompare(b.name));
                            return { ...t, players };
                        }
                        return t;
                    }));
                }
                showToast(`${newAthleteName} added to roster`, 'success');
            } else {
                const createdTeam = await DatabaseService.createTeam(newAthleteName, 'Football');
                showToast(`Team "${newAthleteName}" created`, 'success');
                if (createdTeam) setTeams(prev => [...prev, { ...createdTeam, players: [] }]);
            }
            if (!keepOpen) setIsAddAthleteModalOpen(false);
            setNewAthleteName('');
            setNewAthleteProfile({ age: '', gender: 'Male', height_cm: '', weight_kg: '', sport: '', position: '', goals: '', notes: '', image_url: '' });
            return true;
        } catch (err) {
            console.error("Error adding athlete/team:", err);
            showToast('Failed to add athlete — please try again', 'error');
            return false;
        }
    };

    const handleAddTeam = async () => {
        if (!newTeamName.trim()) return;
        try {
            const createdTeam = await DatabaseService.createTeam(newTeamName, 'Football');
            if (createdTeam) setTeams(prev => [...prev, { ...createdTeam, players: [] }]);
            showToast(`Team "${newTeamName}" created`, 'success');
            setIsAddTeamModalOpen(false);
            setNewTeamName('');
            setAddAthleteMode('athlete'); // auto-switch back so user can add athlete to new team
        } catch (err) {
            console.error("Error adding team:", err);
            const msg = err instanceof Error ? err.message : String(err);
            showToast(`Failed to add team: ${msg}`, 'error');
        }
    };

    const handleUpdateAthlete = async (athleteId: string, updates: Record<string, any>) => {
        // Optimistic local update
        setTeams(prev => prev.map(t => ({
            ...t,
            players: (t.players || []).map(p => p.id === athleteId ? { ...p, ...updates } : p),
        })));
        setViewingPlayer(prev => (prev && prev.id === athleteId) ? { ...prev, ...updates } : prev);
        try {
            const updated = await DatabaseService.updateAthlete(athleteId, updates);
            return updated;
        } catch (err) {
            console.error('Error updating athlete:', err);
            showToast('Failed to update athlete — please try again', 'error');
            initData();
            throw err;
        }
    };

    const handleDeleteAthlete = async (athleteId: string) => {
        // Capture name before removing from state for the toast message
        const deletedName = teams.flatMap(t => t.players || []).find(p => p.id === athleteId)?.name;
        // Optimistically remove from local state immediately — no loading flash
        setTeams(prev => prev.map(t => ({
            ...t,
            players: (t.players || []).filter(p => p.id !== athleteId),
        })));
        try {
            await DatabaseService.deleteAthlete(athleteId);
            showToast(deletedName ? `${deletedName} removed from roster` : 'Athlete removed', 'success');
        } catch (err) {
            console.error("Error deleting athlete:", err);
            // Roll back the optimistic removal by reloading
            initData();
            showToast('Failed to delete athlete — please try again', 'error');
        }
    };

    const handleDeleteTeam = async (teamId: string) => {
        try {
            await DatabaseService.deleteTeam(teamId);
            setTeams(prev => prev.filter(t => t.id !== teamId));
        } catch (err) {
            console.error("Error deleting team:", err);
            showToast("Failed to delete team. Make sure all athletes are removed first.", 'error');
        }
    };

    return {
        handleOpenPlayerProfile,
        handleAddAthlete,
        handleAddTeam,
        handleUpdateAthlete,
        handleDeleteAthlete,
        handleDeleteTeam,
    };
};

export default useTeamHandlers;
