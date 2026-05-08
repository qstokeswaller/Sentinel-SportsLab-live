/**
 * Vercel Serverless Function — Polar Sync (Team Pro + Individual)
 *
 * POST /api/polar-sync
 * Body: { access_token: string, type: 'team_pro' | 'individual' }
 *
 * Team Pro flow (per docs at polar.com/teampro-api):
 *   1. GET /v1/teams                                                  — list teams (data[])
 *   2. GET /v1/teams/{id}                                             — team detail + players[]
 *   3. GET /v1/teams/{id}/training_sessions                           — sessions last 30 days
 *   4. GET /v1/teams/training_sessions/{id}                           — participants[]
 *   5. GET /v1/training_sessions/{player_session_id}/session_summary  — full per-player metrics
 *
 * All available Polar fields (zones, load, HR, RR, energy substrate, etc.) are
 * captured via flattenPolarSummary() so trainers can map any column they need.
 *
 * Rate limit: burst of 100 requests, then 1 req/sec.
 * Player summary calls are capped at 80 (overhead ~15 = 95 total, under burst).
 *
 * Individual flow:
 *   GET /v3/exercises on AccessLink + flattenAccessLinkExercise()
 */

// ─── Flatten helpers ──────────────────────────────────────────────────────────

/**
 * Converts a Polar session_summary JSON into a flat rawColumns object.
 * All numeric values are stored as numbers so charts and ACWR can parseFloat them.
 * Column names match the aliases in GpsColumnMapper so fuzzy auto-mapping works.
 */
function flattenPolarSummary(summary, sessionName) {
  const c = {};

  if (sessionName) c['Session name'] = sessionName;

  // Core metrics
  if (summary.duration       != null) c['Duration [min]']         = Math.round(summary.duration / 60 * 10) / 10;
  if (summary.distance       != null) c['Total distance [m]']     = summary.distance;
  if (summary.max_speed      != null) c['Maximum speed [km/h]']   = summary.max_speed;
  if (summary.avg_speed      != null) c['Average speed [km/h]']   = summary.avg_speed;
  if (summary.sprint_counter != null) c['Sprints']                = summary.sprint_counter;

  // Calories (Polar field name is kilocalories)
  const kcal = summary.kilocalories ?? summary.calories;
  if (kcal != null) c['Calories [kcal]'] = kcal;

  // Load metrics
  if (summary.training_load != null) c['Training load score'] = summary.training_load;
  if (summary.cardio_load   != null) c['Cardio load']         = summary.cardio_load;
  if (summary.muscle_load   != null) c['Muscle load']         = summary.muscle_load;
  if (summary.recovery_time != null) c['Recovery time [h]']   = summary.recovery_time;

  // Heart rate — may be nested object or flat fields
  const hrAvg = summary.heart_rate?.average ?? summary.avg_heart_rate;
  const hrMax = summary.heart_rate?.maximum ?? summary.max_heart_rate;
  const hrMin = summary.heart_rate?.minimum ?? summary.min_heart_rate;
  if (hrAvg != null) c['HR avg [bpm]'] = hrAvg;
  if (hrMax != null) c['HR max [bpm]'] = hrMax;
  if (hrMin != null) c['HR min [bpm]'] = hrMin;

  // Speed zones — distance in each zone
  const speedZones = summary.speed_zones ?? summary.speedZones ?? [];
  speedZones.forEach((zone, i) => {
    const dist = zone.distance ?? zone.in_zone ?? zone.value;
    if (dist != null) c[`Speed zone ${i + 1} [m]`] = dist;
  });

  // HR zones — time in each zone (seconds)
  const hrZones = summary.heart_rate_zones ?? summary.hr_zones ?? summary.heartRateZones ?? [];
  hrZones.forEach((zone, i) => {
    const secs = zone.duration ?? zone.in_zone ?? zone.seconds;
    if (secs != null) c[`HR zone ${i + 1} time [s]`] = secs;
  });

  // RR intervals / HRV
  const rr = summary.rr_intervals ?? summary.rr;
  if (rr) {
    if (rr.average != null) c['RR avg [ms]'] = rr.average;
    if (rr.minimum != null) c['RR min [ms]'] = rr.minimum;
    if (rr.maximum != null) c['RR max [ms]'] = rr.maximum;
  }

  // Acceleration zones (effort count per zone)
  const accelZones = summary.acceleration_zones ?? summary.accel_zones ?? [];
  accelZones.forEach((zone, i) => {
    const count = zone.count ?? zone.efforts;
    if (count != null) c[`Accel zone ${i + 1} [count]`] = count;
  });

  // Energy substrate
  if (summary.fat_percentage  != null) c['Fat [%]']  = summary.fat_percentage;
  if (summary.carb_percentage != null) c['Carbs [%]'] = summary.carb_percentage;

  return c;
}

/**
 * Converts a Polar AccessLink exercise object into a flat rawColumns object.
 */
function flattenAccessLinkExercise(ex) {
  const c = {};

  if (ex.sport) c['Session name'] = ex.sport;
  if (ex.duration != null)  c['Duration [min]']       = Math.round(ex.duration / 60 * 10) / 10;
  if (ex.distance != null)  c['Total distance [m]']   = ex.distance;
  if (ex.sport)             c['Sport']                = ex.sport;

  const kcal = ex.kilocalories ?? ex.calories;
  if (kcal != null) c['Calories [kcal]'] = kcal;

  const hrAvg = ex.heart_rate?.average ?? ex.avg_heart_rate;
  const hrMax = ex.heart_rate?.maximum ?? ex.max_heart_rate;
  if (hrAvg != null) c['HR avg [bpm]'] = hrAvg;
  if (hrMax != null) c['HR max [bpm]'] = hrMax;

  // Training load — may be nested object or scalar
  const tl = typeof ex.training_load === 'object' ? ex.training_load?.score : ex.training_load;
  if (tl != null) c['Training load score'] = tl;

  // Cardio load
  const cl = typeof ex.cardio_load === 'object' ? ex.cardio_load?.strain_index : ex.cardio_load;
  if (cl != null) c['Cardio load'] = cl;

  if (ex.fat_percentage  != null) c['Fat [%]']  = ex.fat_percentage;
  if (ex.carb_percentage != null) c['Carbs [%]'] = ex.carb_percentage;
  if (ex.recovery_time   != null) c['Recovery time [h]'] = ex.recovery_time;

  return c;
}

// ─── Team Pro sync ────────────────────────────────────────────────────────────

async function syncTeamPro(access_token) {
  const BASE = 'https://teampro.api.polar.com/v1';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Accept': 'application/json' };

  const polarFetch = async (url) => {
    const res = await fetch(url, { headers });
    if (res.status === 401) throw { status: 401, message: 'Polar token expired — please reconnect in Settings.' };
    if (res.status === 429) throw { status: 429, message: 'Polar API rate limit reached — try again in a moment.' };
    return res;
  };

  // 1. Get teams
  const teamsRes = await polarFetch(`${BASE}/teams?per_page=100`);
  if (!teamsRes.ok) throw { status: teamsRes.status, message: `Polar Team Pro API error ${teamsRes.status}` };

  const teamsData = await teamsRes.json();
  const teams = teamsData?.data ?? (Array.isArray(teamsData) ? teamsData : []);
  if (!teams.length) return { sessions: [], message: 'No teams found in Polar Team Pro account.' };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const allSessions = [];
  let playerSummaryCalls = 0;
  const PLAYER_SUMMARY_CAP = 80;

  for (const team of teams) {
    // 2. Team detail — includes players[]
    const teamDetailRes = await polarFetch(`${BASE}/teams/${team.id}`);
    const teamDetail = teamDetailRes.ok ? await teamDetailRes.json() : null;
    const teamPlayers = teamDetail?.players ?? [];

    // 3. Training sessions last 30 days
    const sessionsRes = await polarFetch(`${BASE}/teams/${team.id}/training_sessions?since=${since}&per_page=100`);
    if (!sessionsRes.ok) continue;

    const sessionsData = await sessionsRes.json();
    const sessions = sessionsData?.data ?? (Array.isArray(sessionsData) ? sessionsData : []);

    for (const session of sessions) {
      // 4. Session detail — team aggregates + participants[] with player_session_id
      const detailRes = await polarFetch(`${BASE}/teams/training_sessions/${session.id}`);
      const detail = detailRes.ok ? await detailRes.json() : null;
      const participants = detail?.participants ?? [];

      // 5. Per-player session_summary — full metrics flattened
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
          rawColumns:   flattenPolarSummary(summary, session.name),
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
        // Fallback: team-level aggregates spread across roster (or a single team record)
        const metrics = detail ?? session;
        const fallbackColumns = flattenPolarSummary(metrics, session.name);
        const fallbackPlayers = teamPlayers.length > 0
          ? teamPlayers.map(player => ({
              playerId:     player.player_id,
              playerName:   `${player.first_name ?? ''} ${player.last_name ?? ''}`.trim() || `Player ${player.player_id}`,
              playerNumber: String(player.player_number ?? ''),
              rawColumns:   fallbackColumns,
            }))
          : [{ playerId: 'team', playerName: team.name, playerNumber: '', rawColumns: fallbackColumns }];

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

// ─── Individual (AccessLink) sync ────────────────────────────────────────────

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
      rawColumns:   flattenAccessLinkExercise(ex),
    }],
  }));

  return { sessions };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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
