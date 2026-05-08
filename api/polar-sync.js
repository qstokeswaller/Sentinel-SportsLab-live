/**
 * Vercel Serverless Function — Polar Sync (Team Pro + Individual)
 *
 * POST /api/polar-sync
 * Body: { access_token: string, type: 'team_pro' | 'individual' }
 *
 * Team Pro flow:
 *   1. GET /v1/teams — list teams
 *   2. GET /v1/teams/{id} — team detail including players list
 *   3. GET /v1/teams/{id}/training_sessions — sessions in last 90 days
 *   4. GET /v1/teams/training_sessions/{id} — per-player breakdown for each session
 *
 * Individual flow:
 *   GET /v3/exercises on AccessLink — recent exercise summaries
 */

async function syncTeamPro(access_token) {
  const BASE = 'https://teampro.api.polar.com/v1';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' };

  // 1. Get teams
  const teamsRes = await fetch(`${BASE}/teams`, { headers });
  if (teamsRes.status === 401) throw { status: 401, message: 'Polar token expired — please reconnect in Settings.' };
  if (!teamsRes.ok) throw { status: teamsRes.status, message: `Polar Team Pro API error ${teamsRes.status}` };

  const teamsData = await teamsRes.json();
  // Handle both paginated ({ items: [] }) and direct array responses
  const teams = teamsData?.items ?? teamsData?.data ?? (Array.isArray(teamsData) ? teamsData : []);

  if (!teams.length) return { sessions: [], message: 'No teams found in Polar Team Pro account.' };

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const allSessions = [];

  for (const team of teams) {
    // 2. Get team detail — includes players array
    const teamDetailRes = await fetch(`${BASE}/teams/${team.id}`, { headers });
    const teamDetail = teamDetailRes.ok ? await teamDetailRes.json() : null;
    const teamPlayers = teamDetail?.players ?? [];

    // 3. Get team training sessions (last 90 days)
    const sessionsRes = await fetch(
      `${BASE}/teams/${team.id}/training_sessions?since=${since}&per_page=100`,
      { headers }
    );
    if (!sessionsRes.ok) continue;

    const sessionsData = await sessionsRes.json();
    const sessions = sessionsData?.items ?? sessionsData?.data ?? (Array.isArray(sessionsData) ? sessionsData : []);

    for (const session of sessions) {
      // 4. Get session detail — may include per-player breakdown
      const detailRes = await fetch(`${BASE}/teams/training_sessions/${session.id}`, { headers });
      const detail = detailRes.ok ? await detailRes.json() : null;

      // Per-player data may be under players, player_sessions, or athletes
      const playerSessions = detail?.players ?? detail?.player_sessions ?? detail?.athletes ?? [];

      if (playerSessions.length > 0) {
        // Per-player data available — use it directly
        allSessions.push({
          source: 'polar_team_pro',
          teamName: team.name,
          session: {
            id: session.id,
            name: session.name ?? '',
            date: (session.start_time ?? session.start ?? '').split('T')[0],
          },
          players: playerSessions.map(p => {
            // Try to match back to the team players list for name/number
            const rosterPlayer = teamPlayers.find(pl => pl.player_id === (p.player_id ?? p.id));
            const firstName = p.first_name ?? rosterPlayer?.first_name ?? '';
            const lastName  = p.last_name  ?? rosterPlayer?.last_name  ?? '';
            return {
              playerId:     p.player_id ?? p.id ?? '',
              playerName:   p.player_name ?? `${firstName} ${lastName}`.trim() || `Player ${p.player_id ?? p.id}`,
              playerNumber: p.player_number ?? p.shirt_number ?? rosterPlayer?.player_number ?? '',
              rawColumns: {
                'Session name':         session.name ?? '',
                'Duration':             p.duration    ? `${Math.round(p.duration / 60)} min`    : p.duration_ms ? `${Math.round(p.duration_ms / 60000)} min` : '—',
                'Total distance [m]':   p.distance    ?? '—',
                'Maximum speed [km/h]': p.max_speed   ?? '—',
                'Average speed [km/h]': p.avg_speed   ?? '—',
                'Sprints':              p.sprint_counter ?? p.sprints ?? '—',
                'HR avg [bpm]':         p.heart_rate?.average ?? p.avg_heart_rate ?? '—',
                'HR max [bpm]':         p.heart_rate?.maximum ?? p.max_heart_rate ?? '—',
                'Training load score':  p.training_load ?? '—',
                'Calories [kcal]':      p.calories ?? '—',
              },
            };
          }),
        });
      } else if (teamPlayers.length > 0) {
        // No per-player breakdown — use team-level metrics shared across all players
        const metrics = detail ?? session;
        allSessions.push({
          source: 'polar_team_pro',
          teamName: team.name,
          session: {
            id: session.id,
            name: session.name ?? '',
            date: (session.start_time ?? session.start ?? '').split('T')[0],
          },
          players: teamPlayers.map(player => ({
            playerId:     player.player_id,
            playerName:   `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || `Player ${player.player_id}`,
            playerNumber: player.player_number ?? '',
            rawColumns: {
              'Session name':         session.name ?? '',
              'Duration':             metrics.duration ? `${Math.round(metrics.duration / 60)} min` : '—',
              'Total distance [m]':   metrics.distance    ?? '—',
              'Maximum speed [km/h]': metrics.max_speed   ?? '—',
              'Average speed [km/h]': metrics.avg_speed   ?? '—',
              'Sprints':              metrics.sprint_counter ?? '—',
              'HR avg [bpm]':         metrics.heart_rate?.average ?? '—',
              'HR max [bpm]':         metrics.heart_rate?.maximum ?? '—',
              'Training load score':  metrics.training_load ?? '—',
              'Calories [kcal]':      metrics.calories ?? '—',
            },
          })),
        });
      } else {
        // No players at all — push session-level record
        const metrics = detail ?? session;
        allSessions.push({
          source: 'polar_team_pro',
          teamName: team.name,
          session: {
            id: session.id,
            name: session.name ?? '',
            date: (session.start_time ?? session.start ?? '').split('T')[0],
          },
          players: [{
            playerId:     'team',
            playerName:   team.name,
            playerNumber: '',
            rawColumns: {
              'Session name':         session.name ?? '',
              'Duration':             metrics.duration ? `${Math.round(metrics.duration / 60)} min` : '—',
              'Total distance [m]':   metrics.distance    ?? '—',
              'Maximum speed [km/h]': metrics.max_speed   ?? '—',
              'Sprints':              metrics.sprint_counter ?? '—',
              'HR avg [bpm]':         metrics.heart_rate?.average ?? '—',
              'Training load score':  metrics.training_load ?? '—',
            },
          }],
        });
      }
    }
  }

  return { sessions: allSessions };
}

async function syncIndividual(access_token) {
  const exercisesRes = await fetch('https://www.polaraccesslink.com/v3/exercises', {
    headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' },
  });

  if (exercisesRes.status === 401) throw { status: 401, message: 'Polar token expired — please reconnect in Settings.' };
  if (exercisesRes.status === 204) return { sessions: [], message: 'No new exercises found.' };
  if (!exercisesRes.ok) throw { status: exercisesRes.status, message: `Polar API error ${exercisesRes.status}` };

  const data = await exercisesRes.json();
  const exercises = Array.isArray(data) ? data : (data?.data ?? []);

  const sessions = exercises.map(ex => ({
    source: 'polar_individual',
    session: {
      id: `polar_${ex.id}`,
      name: ex.sport ?? 'Workout',
      date: ex.start_time ? ex.start_time.split('T')[0] : '',
    },
    players: [{
      playerId:     'self',
      playerName:   '',
      playerNumber: '',
      rawColumns: {
        'Duration':             ex.duration ? `${Math.round(ex.duration / 60)} min` : '—',
        'Total distance [m]':   ex.distance ?? '—',
        'HR avg [bpm]':         ex.heart_rate?.average ?? '—',
        'HR max [bpm]':         ex.heart_rate?.maximum ?? '—',
        'Calories [kcal]':      ex.calories ?? '—',
        'Sport':                ex.sport ?? '—',
        'Training load score':  ex.training_load?.score ?? '—',
        'Cardio load':          ex.cardio_load?.strain_index ?? '—',
      },
    }],
  }));

  return { sessions };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { access_token, type = 'team_pro' } = req.body;
  if (!access_token) return res.status(400).json({ error: 'Missing access_token' });

  try {
    const result = type === 'individual'
      ? await syncIndividual(access_token)
      : await syncTeamPro(access_token);

    return res.status(200).json(result);
  } catch (err) {
    console.error('Polar sync error:', err);
    const status = err?.status || 500;
    return res.status(status).json({ error: err?.message || 'Internal server error' });
  }
}
