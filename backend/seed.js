#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { DB_PATH, getDatabase, resetDatabase } = require('./db');

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    reset: args.has('--reset') || args.has('-r'),
    silent: args.has('--silent'),
    onlyIfEmpty: args.has('--only-if-empty'),
  };
}

function ensureIsoDate(value) {
  if (!value) {
    return new Date().toISOString();
  }
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return new Date().toISOString();
  }
  return new Date(timestamp).toISOString().replace('Z', '');
}

function seedDatabase(options = {}) {
  const { reset = false, onlyIfEmpty = false } = options;

  if (reset) {
    resetDatabase();
  } else {
    getDatabase();
  }

  const db = getDatabase();

  if (onlyIfEmpty) {
    try {
      const tableCount = db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='teams'").get();
      if (tableCount.count > 0) {
        const existing = db.prepare('SELECT COUNT(*) AS count FROM teams').get();
        if (existing.count > 0) {
          return { skipped: true, message: 'Database already contains demo data.' };
        }
      }
    } catch (error) {
      // Table might not exist yet; continue with seeding.
    }
  }

  const seedPath = path.join(__dirname, 'seed_data.json');
  const payload = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

  const insertTeam = db.prepare(`
    INSERT INTO teams (name, short_name, level, coach, training_days, focus_theme)
    VALUES (:name, :short_name, :level, :coach, :training_days, :focus_theme)
  `);
  const insertAthlete = db.prepare(`
    INSERT INTO athletes (
      first_name, last_name, birth_year, primary_stroke, best_event,
      personal_best, personal_best_unit, focus_note, team_id
    ) VALUES (
      :first_name, :last_name, :birth_year, :primary_stroke, :best_event,
      :personal_best, :personal_best_unit, :focus_note, :team_id
    )
  `);
  const insertSession = db.prepare(`
    INSERT INTO sessions (
      team_id, title, session_date, start_time, duration_minutes,
      status, focus_area, load_target, load_actual, notes
    ) VALUES (
      :team_id, :title, :session_date, :start_time, :duration_minutes,
      :status, :focus_area, :load_target, :load_actual, :notes
    )
  `);
  const insertAttendance = db.prepare(`
    INSERT INTO attendance (session_id, athlete_id, status, note)
    VALUES (:session_id, :athlete_id, :status, :note)
    ON CONFLICT(session_id, athlete_id) DO UPDATE SET
      status = excluded.status,
      note = excluded.note
  `);
  const insertMetric = db.prepare(`
    INSERT INTO metrics (athlete_id, metric_date, metric_type, value, unit)
    VALUES (:athlete_id, :metric_date, :metric_type, :value, :unit)
  `);
  const insertReport = db.prepare(`
    INSERT INTO reports (team_id, title, period_start, period_end, status, delivered_on)
    VALUES (:team_id, :title, :period_start, :period_end, :status, :delivered_on)
  `);
  const insertCoachNote = db.prepare(`
    INSERT INTO coach_notes (body, updated_at)
    VALUES (:body, :updated_at)
  `);

  const transaction = db.transaction(() => {
    const teamIds = payload.teams.map((team) => insertTeam.run(team).lastInsertRowid);

    const athleteIds = payload.athletes.map((item) => {
      const { team_index: teamIndex, ...rest } = item;
      return insertAthlete.run({ ...rest, team_id: teamIds[teamIndex] }).lastInsertRowid;
    });

    const sessionIds = payload.sessions.map((item) => {
      const { team_index: teamIndex, ...rest } = item;
      return insertSession.run({ ...rest, team_id: teamIds[teamIndex] }).lastInsertRowid;
    });

    payload.attendance.forEach((item) => {
      const { session_index: sessionIndex, athlete_index: athleteIndex, ...rest } = item;
      insertAttendance.run({
        session_id: sessionIds[sessionIndex],
        athlete_id: athleteIds[athleteIndex],
        status: rest.status || 'anwesend',
        note: rest.note || null,
      });
    });

    payload.metrics.forEach((item) => {
      const { athlete_index: athleteIndex, ...rest } = item;
      insertMetric.run({ ...rest, athlete_id: athleteIds[athleteIndex] });
    });

    payload.reports.forEach((item) => {
      const { team_index: teamIndex, ...rest } = item;
      insertReport.run({ ...rest, team_id: teamIds[teamIndex] });
    });

    if (payload.coach_notes) {
      insertCoachNote.run({
        body: payload.coach_notes.body,
        updated_at: ensureIsoDate(payload.coach_notes.updated_at),
      });
    }
  });

  transaction();

  return { seeded: true, message: `Database initialised at ${DB_PATH}` };
}

if (require.main === module) {
  const options = parseArgs(process.argv);
  const result = seedDatabase(options);
  if (!options.silent) {
    if (result.skipped) {
      console.log(result.message);
    } else {
      console.log(result.message);
    }
  }
}

module.exports = {
  seedDatabase,
};
