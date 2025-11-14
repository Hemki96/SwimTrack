const { before, after, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');

const TMP_DIR = path.join(__dirname, 'tmp');
const TEST_DB_PATH = path.join(TMP_DIR, 'swimtrack_test.db');
process.env.SWIMTRACK_DB_PATH = TEST_DB_PATH;

const { loadTestData } = require('./helpers/testData');

const PORT = 8123;
let serverProcess;
let dataset;

async function waitForServer(url, retries = 20) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        return true;
      }
    } catch (error) {
      // ignore - server might not be ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Server did not become ready in time');
}

function cleanupDatabase() {
  try {
    if (fs.existsSync(TMP_DIR)) {
      for (const entry of fs.readdirSync(TMP_DIR)) {
        if (entry.startsWith('swimtrack_test.db')) {
          fs.rmSync(path.join(TMP_DIR, entry), { force: true });
        }
      }
    }
  } catch (error) {
    // ignore cleanup errors
  }
}

before(async () => {
  cleanupDatabase();
  dataset = loadTestData(TEST_DB_PATH);
  serverProcess = spawn('node', ['backend/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(PORT), SWIMTRACK_DB_PATH: TEST_DB_PATH },
    stdio: 'inherit',
  });
  await waitForServer(`http://127.0.0.1:${PORT}/dashboard`);
});

after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
  cleanupDatabase();
});

function calculateRangeStart(days) {
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);
  const rangeStart = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return rangeStart.toISOString().slice(0, 10);
}

test('GET /dashboard returns range-aware KPIs with expected aggregates', async () => {
  const response = await fetch(`http://127.0.0.1:${PORT}/dashboard`);
  assert.equal(response.status, 200);
  const body = await response.json();

  const rangeStart = calculateRangeStart(-30);
  const inRangeSessions = dataset.sessions.filter((session) => session.session_date >= rangeStart);
  const totalSessions = inRangeSessions.length;
  const completedSessions = inRangeSessions.filter((session) => session.status === 'abgeschlossen').length;
  const inProgressSessions = inRangeSessions.filter((session) => session.status === 'gestartet').length;
  const plannedSessions = Math.max(totalSessions - completedSessions, 0);
  const totalLoadTarget = inRangeSessions.reduce((sum, session) => sum + (session.load_target || 0), 0);
  const totalLoadActual = inRangeSessions.reduce((sum, session) => sum + (session.load_actual || 0), 0);
  const missingDocs = inRangeSessions.filter(
    (session) => session.status === 'abgeschlossen' && (!session.notes || !session.notes.trim())
  ).length;

  const attendanceInRange = dataset.attendance.filter(
    (entry) => dataset.sessions[entry.session_index].session_date >= rangeStart
  );
  const attendedCount = attendanceInRange.filter((entry) => entry.status === 'anwesend').length;
  const totalAttendance = attendanceInRange.length || 1;
  const expectedAttendanceRate = Number((attendedCount / totalAttendance).toFixed(2));

  assert.equal(body.range_days, 30);
  assert.equal(body.completed_sessions, completedSessions);
  assert.equal(body.in_progress_sessions, inProgressSessions);
  assert.equal(body.planned_sessions, plannedSessions);
  assert.equal(body.total_load_target, totalLoadTarget);
  assert.equal(body.total_load_actual, totalLoadActual);
  assert.equal(body.missing_documentations, missingDocs);
  assert.equal(body.attendance_rate, expectedAttendanceRate);
  assert.ok(Array.isArray(body.upcoming_sessions));
  assert.ok(Array.isArray(body.focus_topics));
  assert.ok(Array.isArray(body.activities));
  assert.ok(body.upcoming_sessions.length >= 2, 'expected at least two upcoming sessions');
});

test('GET /dashboard rejects invalid range parameter', async () => {
  const response = await fetch(`http://127.0.0.1:${PORT}/dashboard?range=invalid`);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.detail, 'range muss eine positive Zahl sein');
});

test('POST /sessions creates a new training session with attendance scaffold', async () => {
  const payload = {
    team_id: dataset.team_ids[0],
    title: 'Belastungstest Mittelstrecke',
    session_date: calculateRangeStart(2),
    start_time: '15:00',
    duration_minutes: 85,
    status: 'geplant',
    focus_area: 'Ausdauer',
    load_target: 190,
    load_actual: 0,
    notes: 'Testserie mit Zwischenzeiten',
  };

  const response = await fetch(`http://127.0.0.1:${PORT}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.session);
  assert.ok(body.session.id > 0);
  assert.equal(body.session.title, payload.title);
  assert.equal(body.session.team_id, payload.team_id);
  assert.equal(body.attendance.length, dataset.athletes.filter((athlete) => athlete.team_index === 0).length);

  const fetched = await fetch(`http://127.0.0.1:${PORT}/sessions/${body.session.id}`);
  assert.equal(fetched.status, 200);
  const fetchedBody = await fetched.json();
  assert.equal(fetchedBody.session.title, payload.title);
});

test('POST /sessions/:sessionId/duplicate clones the base session with overrides', async () => {
  const baseSessionId = dataset.session_ids[1];
  const overrideDate = calculateRangeStart(4);
  const response = await fetch(`http://127.0.0.1:${PORT}/sessions/${baseSessionId}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_date: overrideDate, focus_area: 'Technik Vertiefung' }),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.session);
  assert.notEqual(body.session.id, baseSessionId);
  assert.equal(body.session.session_date, overrideDate);
  assert.equal(body.session.focus_area, 'Technik Vertiefung');
  assert.ok(body.session.title.includes('(Kopie)'));
});

test('POST /sessions/:sessionId/attendance persists statuses for every athlete entry', async () => {
  const targetSessionIndex = 2;
  const targetSessionId = dataset.session_ids[targetSessionIndex];
  const teamIndex = dataset.sessions[targetSessionIndex].team_index;
  const teamAthleteIds = dataset.athletes
    .map((athlete, index) => (athlete.team_index === teamIndex ? dataset.athlete_ids[index] : null))
    .filter((value) => value !== null);
  const attendancePayload = teamAthleteIds.map((athleteId, index) => ({
    athlete_id: athleteId,
    status: index % 2 === 0 ? 'anwesend' : 'abwesend',
    note: index % 2 === 0 ? 'Testlauf erfolgreich' : 'Individuelle Pause',
  }));

  const response = await fetch(`http://127.0.0.1:${PORT}/sessions/${targetSessionId}/attendance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attendancePayload),
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.session.id, targetSessionId);
  const recorded = body.attendance.filter((entry) => attendancePayload.some((item) => item.athlete_id === entry.id));
  assert.equal(recorded.length, attendancePayload.length);
  recorded.forEach((entry) => {
    const reference = attendancePayload.find((item) => item.athlete_id === entry.id);
    assert.equal(entry.status, reference.status);
    assert.equal(entry.note, reference.note);
  });
});

test('POST /teams creates a new team that is returned by GET /teams', async () => {
  const payload = {
    name: 'Nachwuchs Talente',
    short_name: 'NT-12',
    level: 'U12',
    coach: 'Coach Klein',
    training_days: 'Mi, Fr',
    focus_theme: 'Grundlagen',
  };

  const response = await fetch(`http://127.0.0.1:${PORT}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.ok(body.team);
  assert.equal(body.team.name, payload.name);
  assert.ok(body.team.id > 0);

  const listResponse = await fetch(`http://127.0.0.1:${PORT}/teams`);
  assert.equal(listResponse.status, 200);
  const teams = await listResponse.json();
  assert.ok(Array.isArray(teams));
  assert.ok(teams.some((team) => team.name === payload.name));
});
