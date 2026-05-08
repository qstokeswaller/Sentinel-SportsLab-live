/**
 * Vercel Serverless Function — Polar Sync (Team Pro + Individual)
 *
 * POST /api/polar-sync
 * Body: { access_token: string, type: 'team_pro' | 'individual' }
 *
 * Team Pro flow (per docs at polar.com/teampro-api):
 *   1. GET /v1/teams                                           — list teams (paginated, data[])
 *   2. GET /v1/teams/{id}                                      — team detail including players[]
 *   3. GET /v1/teams/{id}/training_sessions                    — sessions last 7 days (data[])
 *   4. GET /v1/teams/training_sessions/{id}                    — team aggregate + participants[]
 *   5. GET /v1/training_sessions/{player_session_id}/session_summary — per-player metrics
 *
 * Rate limit: burst of 100 requests, then 1 req/sec.
 * We stay within the 100-call burst by limiting to 7 days and capping player
 * summary calls to 80 total (overhead ~15 calls + 80 = 95, under burst).
 *
 * Individual flow:
 *   GET /v3/exercises on AccessLink — recent exercise summaries
 */

async function syncTeamPro(access_token) {
  const BASE = 'https://teampro.api.polar.com/v1';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' };

  const polarFetch = async (url) => {
    const res = await fetch(url, { headers });
    if (res.status === 401) throw { status: 401, message: 'Polar token expired — please reconnect in Settings.' };
    if (res.status === 429) throw { status: 429, message: 'Polar API rate limit reached — try again in a moment.' };
    return res;
  };

  // 1. Get teams — response: { data: [...], page: {...} }
  const teamsRes = await polarFetch(`${BASE}/teams?per_page=100`);
  if (!teamsRes.ok) throw { status: teamsRes.status, message: `Polar Team Pro API error ${teamsRes.status}` };

  const teamsData = await teamsRes.json();
  const teams = teamsData?.data ?? (Array.isArray(teamsData) ? teamsData : []);

  if (!teams.length) return { sessions: [], message: 'No teams found in Polar Team Pro account.' };

  // Last 7 days — keeps total API calls well within the burst bucket of 100
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const allSessions = [];
  let playerSummaryCalls = 0;
  const PLAYER_SUMMARY_CAP = 80; // stay under 100-call burst (overhead ~15 calls + up to 80 player summaries)

  for (const team of teams) {
    // 2. Get team detail — includes players[] with player_id, player_number, first_name, last_name
    const teamDetailRes = await polarFetch(`${BASE}/teams/${team.id}`);
    const teamDetail = teamDetailRes.ok ? await teamDetailRes.json() : null;
    const teamPlayers = teamDetail?.players ?? [];

    // 3. Get team training sessions (last 7 days)
    // Response: { data: [...], page: {...} }
    // Session fields: id, name, type, start_time, record_start_time, distance, kilocalories
    const sessionsRes = await polarFetch(`${BASE}/teams/${team.id}/training_sessions?since=${since}&per_page=100`);
    if (!sessionsRes.ok) continue;

    const sessionsData = await sessionsRes.json();
    const sessions = sessionsData?.data ?? (Array.isArray(sessionsData) ? sessionsData : []);

    for (const session of sessions) {
      // 4. Get session detail — returns team-level aggregates + participants[] with player_session_id
      const detailRes = await polarFetch(`${BASE}/teams/training_sessions/${session.id}`);
      const detail = detailRes.ok ? await detailRes.json() : null;

      // participants[] each has: player_id, player_session_id
      const participants = detail?.participants ?? [];

      // 5. Fetch per-player session_summary for each participant (within call budget)
      const playerData = [];
      for (const participant of participants) {
        if (!participant.player_session_id) continue;
        if (playerSummaryCalls >= PLAYER_SUMMARY_CAP) break;

        const summaryRes = await polarFetch(
          `${BASE}/training_sessions/${participant.player_session_id}/session_summary`
        );
        playerSummaryCalls++;

        if (!summaryRes.ok) continue;
        const summary = await summaryRes.json();

        const rosterPlayer = teamPlayers.find(pl => pl.player_id === participant.player_id);
        playerData.push({
          playerId:     participant.player_id ?? '',
          playerName:   rosterPlayer
            ? `${rosterPlayer.first_name ?? ''} ${rosterPlayer.last_name ?? ''}`.trim()
            : `Player ${participant.player_id}`,
          playerNumber: String(rosterPlayer?.player_number ?? ''),
          rawColumns: {
            'Session name':         session.name ?? '',
            'Duration':             summary.duration    ? `${Math.round(summary.duration / 60)} min` : '—',
            'Total distance [m]':   summary.distance    ?? '—',
            'Maximum speed [km/h]': summary.max_speed   ?? '—',
            'Average speed [km/h]': summary.avg_speed   ?? '—',
            'Sprints':              summary.sprint_counter ?? '—',
            'HR avg [bpm]':         summary.heart_rate?.average ?? summary.avg_heart_rate ?? '—',
            'HR max [bpm]':         summary.heart_rate?.maximum ?? summary.max_heart_rate ?? '—',
            'Training load score':  summary.training_load ?? '—',
            'Calories [kcal]':      summary.kilocalories ?? summary.calories ?? '—',
          },
        });
      }

      const sessionDate = (session.start_time ?? session.record_start_time ?? '').split('T')[0];

      if (playerData.length > 0) {
        allSessions.push({
          source:   'polar_team_pro',
          teamName: team.name,
          session:  { id: session.id, name: session.name ?? '', date: sessionDate },
          players:  playerData,
        });
      } else {
        // No per-player data (cap hit or no participants) — use team-level aggregates
        const metrics = detail ?? session;
        const fallbackPlayers = teamPlayers.length > 0
          ? teamPlayers.map(player => ({
              playerId:     player.player_id,
              playerName:   `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || `Player ${player.player_id}`,
              playerNumber: String(player.player_number ?? ''),
              rawColumns: {
                'Session name':         session.name ?? '',
                'Duration':             metrics.duration     ? `${Math.round(metrics.duration / 60)} min` : '—',
                'Total distance [m]':   metrics.distance     ?? '—',
                'Maximum speed [km/h]': metrics.max_speed    ?? '—',
                'Average speed [km/h]': metrics.avg_speed    ?? '—',
                'Sprints':              metrics.sprint_counter ?? '—',
                'HR avg [bpm]':         metrics.heart_rate?.average ?? '—',
                'HR max [bpm]':         metrics.heart_rate?.maximum ?? '—',
                'Training load score':  metrics.training_load ?? '—',
                'Calories [kcal]':      metrics.kilocalories ?? metrics.calories ?? '—',
              },
            }))
          : [{
              playerId:     'team',
              playerName:   team.name,
              playerNumber: '',
              rawColumns: {
                'Session name':         session.name ?? '',
                'Duration':             metrics.duration     ? `${Math.round(metrics.duration / 60)} min` : '—',
                'Total distance [m]':   metrics.distance     ?? '—',
                'Maximum speed [km/h]': metrics.max_speed    ?? '—',
                'Sprints':              metrics.sprint_counter ?? '—',
                'HR avg [bpm]':         metrics.heart_rate?.average ?? '—',
                'Training load score':  metrics.training_load ?? '—',
                'Calories [kcal]':      metrics.kilocalories ?? '—',
              },
            }];

        allSessions.push({
          source:   'polar_team_pro',
          teamName: team.name,
          session:  { id: session.id, name: session.name ?? '', date: sessionDate },
          players:  fallbackPlayers,
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
  if (exercisesRes.status === 429) throw { status: 429, message: 'Polar API rate limit reached — try again in a moment.' };
  if (exercisesRes.status === 204) return { sessions: [], message: 'No new exercises found.' };
  if (!exercisesRes.ok) throw { status: exercisesRes.status, message: `Polar API error ${exercisesRes.status}` };

  const data = await exercisesRes.json();
  const exercises = Array.isArray(data) ? data : (data?.data ?? []);

  const sessions = exercises.map(ex => ({
    source: 'polar_individual',
    session: {
      id:   `polar_${ex.id}`,
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
        'Calories [kcal]':      ex.kilocalories ?? ex.calories ?? '—',
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
