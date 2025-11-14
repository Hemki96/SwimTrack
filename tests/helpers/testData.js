const path = require('node:path');
const fs = require('node:fs');
const { resetDatabase, getDatabase } = require('../../backend/db');

function formatDate(offsetDays) {
  const reference = new Date();
  reference.setUTCHours(12, 0, 0, 0);
  const target = new Date(reference.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  return target.toISOString().slice(0, 10);
}

function ensureDirectoryFor(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildDataset() {
  return {
    teams: [
      {
        name: 'Wassertiger U16',
        short_name: 'WT-16',
        level: 'U16',
        coach: 'Coach Meyer',
        training_days: 'Mo, Mi, Fr',
        focus_theme: 'Ausdauer',
      },
      {
        name: 'Strömungselite U18',
        short_name: 'SE-18',
        level: 'U18',
        coach: 'Coach Rivera',
        training_days: 'Di, Do, Sa',
        focus_theme: 'Sprint',
      },
    ],
    athletes: [
      {
        first_name: 'Lena',
        last_name: 'Schmidt',
        birth_year: 2007,
        primary_stroke: 'Freistil',
        best_event: '100m Freistil',
        personal_best: 58.42,
        personal_best_unit: 's',
        focus_note: 'Taper Woche',
        team_index: 0,
      },
      {
        first_name: 'Sophie',
        last_name: 'Wagner',
        birth_year: 2006,
        primary_stroke: 'Rücken',
        best_event: '200m Rücken',
        personal_best: 132.15,
        personal_best_unit: 's',
        focus_note: 'Krafttraining intensivieren',
        team_index: 0,
      },
      {
        first_name: 'Jonas',
        last_name: 'Becker',
        birth_year: 2005,
        primary_stroke: 'Schmetterling',
        best_event: '100m Schmetterling',
        personal_best: 60.73,
        personal_best_unit: 's',
        focus_note: 'Sprintstarts verfeinern',
        team_index: 1,
      },
    ],
    sessions: [
      {
        team_index: 0,
        title: 'Grundlagenausdauer Block',
        session_date: formatDate(-12),
        start_time: '06:30',
        duration_minutes: 90,
        status: 'abgeschlossen',
        focus_area: 'Ausdauer',
        load_target: 180,
        load_actual: 175,
        notes: '',
      },
      {
        team_index: 0,
        title: 'Technik und Sprints',
        session_date: formatDate(-4),
        start_time: '07:00',
        duration_minutes: 75,
        status: 'abgeschlossen',
        focus_area: 'Technik',
        load_target: 160,
        load_actual: 162,
        notes: 'Videoanalyse inklusive',
      },
      {
        team_index: 1,
        title: 'Sprintstarts intensiv',
        session_date: formatDate(1),
        start_time: '17:30',
        duration_minutes: 80,
        status: 'gestartet',
        focus_area: 'Sprint',
        load_target: 210,
        load_actual: null,
        notes: 'Startphase im Fokus',
      },
      {
        team_index: 1,
        title: 'Regenerationseinheit',
        session_date: formatDate(8),
        start_time: '16:00',
        duration_minutes: 60,
        status: 'geplant',
        focus_area: 'Regeneration',
        load_target: 120,
        load_actual: null,
        notes: null,
      },
    ],
    attendance: [
      { session_index: 0, athlete_index: 0, status: 'anwesend', note: null },
      { session_index: 0, athlete_index: 1, status: 'anwesend', note: 'Top Tempo' },
      { session_index: 0, athlete_index: 2, status: 'abwesend', note: 'Erkältung' },
      { session_index: 1, athlete_index: 0, status: 'anwesend', note: null },
      { session_index: 1, athlete_index: 1, status: 'entschuldigt', note: 'Schulprojekt' },
      { session_index: 2, athlete_index: 0, status: 'anwesend', note: null },
      { session_index: 2, athlete_index: 2, status: 'anwesend', note: 'Neue PB im Start' },
    ],
    metrics: [
      { athlete_index: 0, metric_date: formatDate(-3), metric_type: 'Laktat', value: 3.4, unit: 'mmol/l' },
      { athlete_index: 1, metric_date: formatDate(-2), metric_type: '200m Freistil', value: 125.3, unit: 's' },
      { athlete_index: 2, metric_date: formatDate(-1), metric_type: 'VO2max', value: 59.1, unit: 'ml/kg/min' },
    ],
    reports: [
      {
        team_index: 0,
        title: 'Trainingsblock Frühling',
        period_start: formatDate(-28),
        period_end: formatDate(-1),
        status: 'erstellt',
        delivered_on: null,
      },
      {
        team_index: 1,
        title: 'Sprint Analyse',
        period_start: formatDate(-14),
        period_end: formatDate(-7),
        status: 'gesendet',
        delivered_on: formatDate(-5),
      },
    ],
    coach_note: {
      body: 'Bitte Fokus auf explosive Starts in der kommenden Woche!',
      updated_at: new Date().toISOString(),
    },
  };
}

function loadTestData(databasePath) {
  ensureDirectoryFor(databasePath);
  resetDatabase();
  const db = getDatabase();
  const dataset = buildDataset();

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
    const teamIds = dataset.teams.map((team) => insertTeam.run(team).lastInsertRowid);
    const athleteIds = dataset.athletes.map((athlete) =>
      insertAthlete.run({ ...athlete, team_id: teamIds[athlete.team_index] }).lastInsertRowid
    );
    const sessionIds = dataset.sessions.map((session) =>
      insertSession.run({ ...session, team_id: teamIds[session.team_index] }).lastInsertRowid
    );

    dataset.attendance.forEach((entry) => {
      insertAttendance.run({
        session_id: sessionIds[entry.session_index],
        athlete_id: athleteIds[entry.athlete_index],
        status: entry.status,
        note: entry.note ?? null,
      });
    });

    dataset.metrics.forEach((metric) => {
      insertMetric.run({
        athlete_id: athleteIds[metric.athlete_index],
        metric_date: metric.metric_date,
        metric_type: metric.metric_type,
        value: metric.value,
        unit: metric.unit,
      });
    });

    dataset.reports.forEach((report) => {
      insertReport.run({
        team_id: teamIds[report.team_index],
        title: report.title,
        period_start: report.period_start,
        period_end: report.period_end,
        status: report.status,
        delivered_on: report.delivered_on,
      });
    });

    if (dataset.coach_note) {
      insertCoachNote.run(dataset.coach_note);
    }

    dataset.team_ids = teamIds;
    dataset.athlete_ids = athleteIds;
    dataset.session_ids = sessionIds;
  });

  transaction();

  return dataset;
}

module.exports = {
  formatDate,
  buildDataset,
  loadTestData,
};
