/**
 * Vercel Serverless Function — Polar Sync (Team Pro + Individual)
 *
 * POST /api/polar-sync
 * Body: { access_token: string, type: 'team_pro' | 'individual' }
 *
 * Routes to the correct Polar API based on connection type:
 * - team_pro:   Polar Team Pro API (GPS vests, multi-athlete sessions)
 * - individual: Polar AccessLink API (personal devices, single-user workouts)
 */

async function syncTeamPro(access_token) {
  const BASE = 'https://teampro.api.polar.com/v1';

  const teamsRes = await fetch(`${BASE}/teams`, {
    headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' },
  });

  if (teamsRes.status === 401) throw { status: 401, message: 'Polar token expired — please reconnect in Settings.' };
  if (!teamsRes.ok) throw { status: teamsRes.status, message: `Polar Team Pro API error ${teamsRes.status}` };

  const teamsData = await teamsRes.json();
  const teams = teamsData?.value ?? teamsData ?? [];

  if (!teams.length) return { sessions: [], message: 'No teams found in Polar Team Pro account.' };

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const allSessions = [];

  for (const team of teams) {
    const sessionsRes = await fetch(
      `${BASE}/teams/${team.id}/training-sessions?since=${since}`,
      { headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' } }
    );
    if (!sessionsRes.ok) continue;

    const sessionsData = await sessionsRes.json();
    const sessions = sessionsData?.value ?? sessionsData ?? [];

    for (const session of sessions) {
      const detailRes = await fetch(
        `${BASE}/teams/${team.id}/training-sessions/${session.id}`,
        { headers: { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' } }
      );

      const players = detailRes.ok
        ? ((await detailRes.json())?.players ?? [])
        : [];

      allSessions.push({
        source: 'polar_team_pro',
        teamName: team.name,
        session: {
          id: session.id,
          name: session.name ?? '',
          date: session.start ? session.start.split('T')[0] : '',
        },
        players: players.map(p => ({
          playerId:     p.player_id,
          playerName:   p.player_name ?? '',
          playerNumber: p.shirt_number ?? '',
          rawColumns: {
            'Session name':           session.name ?? '',
            'Duration':               p.duration_ms ? `${Math.round(p.duration_ms / 60000)} min` : '—',
            'Total distance [m]':     p.distance ?? '—',
            'Maximum speed [km/h]':   p.max_speed ?? '—',
            'Average speed [km/h]':   p.avg_speed ?? '—',
            'Sprints':                p.sprints ?? '—',
            'HR avg [bpm]':           p.heart_rate?.average ?? '—',
            'HR max [bpm]':           p.heart_rate?.maximum ?? '—',
            'Training load score':    p.training_load ?? '—',
            'Calories [kcal]':        p.calories ?? '—',
          },
        })),
      });
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
