const { beforeEach, afterEach, test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const TMP_DIR = path.join(__dirname, 'tmp');
const TEST_DB_PATH = path.join(TMP_DIR, 'swimtrack_service_tests.db');
process.env.SWIMTRACK_DB_PATH = TEST_DB_PATH;

const { loadTestData } = require('./helpers/testData');
const { closeDatabase } = require('../backend/db');
const dashboardService = require('../backend/services/dashboard');
const teamsService = require('../backend/services/teams');

let dataset;

function cleanupDatabase() {
  closeDatabase();
  if (fs.existsSync(TMP_DIR)) {
    for (const entry of fs.readdirSync(TMP_DIR)) {
      if (entry.startsWith(path.basename(TEST_DB_PATH))) {
        fs.rmSync(path.join(TMP_DIR, entry), { force: true });
      }
    }
  }
}

function calculateRangeStart(days) {
  const base = new Date();
  base.setUTCHours(12, 0, 0, 0);
  const rangeStart = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
  return rangeStart.toISOString().slice(0, 10);
}

beforeEach(() => {
  cleanupDatabase();
  dataset = loadTestData(TEST_DB_PATH);
});

afterEach(() => {
  cleanupDatabase();
});

test('dashboard service calculates KPI aggregates without HTTP layer', () => {
  const summary = dashboardService.getDashboardOverview({ rangeDays: 30 });

  const rangeStart = calculateRangeStart(-30);
  const inRangeSessions = dataset.sessions.filter((session) => session.session_date >= rangeStart);
  const totalSessions = inRangeSessions.length;
  const completedSessions = inRangeSessions.filter((session) => session.status === 'abgeschlossen').length;
  const inProgressSessions = inRangeSessions.filter((session) => session.status === 'gestartet').length;
  const plannedSessions = Math.max(totalSessions - completedSessions, 0);
  const totalLoadTarget = inRangeSessions.reduce((sum, session) => sum + (session.load_target || 0), 0);
  const totalLoadActual = inRangeSessions.reduce((sum, session) => sum + (session.load_actual || 0), 0);
  const missingDocs = inRangeSessions.filter(
    (session) => session.status === 'abgeschlossen' && (!session.notes || !session.notes.trim()),
  ).length;

  const attendanceInRange = dataset.attendance.filter(
    (entry) => dataset.sessions[entry.session_index].session_date >= rangeStart,
  );
  const attendedCount = attendanceInRange.filter((entry) => entry.status === 'anwesend').length;
  const totalAttendance = attendanceInRange.length || 1;
  const expectedAttendanceRate = Number((attendedCount / totalAttendance).toFixed(2));

  assert.equal(summary.range_days, 30);
  assert.equal(summary.completed_sessions, completedSessions);
  assert.equal(summary.in_progress_sessions, inProgressSessions);
  assert.equal(summary.planned_sessions, plannedSessions);
  assert.equal(summary.total_load_target, totalLoadTarget);
  assert.equal(summary.total_load_actual, totalLoadActual);
  assert.equal(summary.missing_documentations, missingDocs);
  assert.equal(summary.attendance_rate, expectedAttendanceRate);
  assert.ok(Array.isArray(summary.upcoming_sessions));
  assert.ok(Array.isArray(summary.focus_topics));
  assert.ok(Array.isArray(summary.activities));
});

test('teams service reports dependency counts before deletion', () => {
  const teamId = dataset.team_ids[0];
  const result = teamsService.deleteTeam(teamId, { force: false });

  const expectedDependencies = {
    athlete_count: dataset.athletes.filter((athlete) => athlete.team_index === 0).length,
    session_count: dataset.sessions.filter((session) => session.team_index === 0).length,
    report_count: dataset.reports.filter((report) => report.team_index === 0).length,
  };

  assert.equal(result.found, true);
  assert.equal(result.deleted, false);
  assert.deepEqual(result.dependencies, expectedDependencies);
  assert.ok(teamsService.getTeam(teamId));
});

test('teams service can force deletion with cascading cleanup', () => {
  const teamId = dataset.team_ids[0];
  const result = teamsService.deleteTeam(teamId, { force: true });

  assert.equal(result.found, true);
  assert.equal(result.deleted, true);
  assert.ok(result.dependencies);
  assert.equal(teamsService.getTeam(teamId), null);
});
