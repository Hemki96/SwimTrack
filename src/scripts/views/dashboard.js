import { api } from "../api.js";
import { getCached, setCached, invalidate } from "../state.js";

const KPI_CONFIG = [
  {
    key: "attendance_rate",
    label: "Anwesenheit",
    format: (value) => `${Math.round(value * 100)}%`,
  },
  {
    key: "completed_sessions",
    label: "Abgeschlossene Einheiten",
    format: (value) => value,
  },
  {
    key: "in_progress_sessions",
    label: "Gestartet",
    format: (value) => value,
  },
  {
    key: "planned_sessions",
    label: "Geplant",
    format: (value) => value,
  },
];

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

async function loadDashboardData() {
  const cached = getCached("dashboard-data");
  if (cached) return cached;

  const [dashboard, sessions] = await Promise.all([
    api.getDashboard(),
    api.getSessions(),
  ]);

  const recentSessions = sessions.slice(0, 5);
  const attendanceDetails = await Promise.all(
    recentSessions.map((session) => api.getSession(session.id))
  );

  const enriched = {
    dashboard,
    sessions,
    attendance: attendanceDetails.map((entry) => ({
      session: entry.session,
      attendance: entry.attendance,
    })),
  };
  return setCached("dashboard-data", enriched);
}

function renderKpis(container, data) {
  container.innerHTML = "";
  KPI_CONFIG.forEach((item) => {
    const value = data[item.key];
    const element = document.createElement("div");
    element.className = "kpi-card";
    element.innerHTML = `
      <span class="kpi-card__label">${item.label}</span>
      <span class="kpi-card__value">${item.format(value)}</span>
    `;
    container.appendChild(element);
  });
}

function renderLoadChart(container, dashboard) {
  const max = Math.max(dashboard.total_load_target || 0, dashboard.total_load_actual || 0, 1);
  const targetWidth = Math.round(((dashboard.total_load_target || 0) / max) * 100);
  const actualWidth = Math.round(((dashboard.total_load_actual || 0) / max) * 100);
  container.innerHTML = `
    <div class="chart-bar">
      <div class="chart-bar__label">Soll</div>
      <div class="chart-bar__track">
        <div class="chart-bar__fill chart-bar__fill--target" style="width:${targetWidth}%"></div>
      </div>
      <div class="chart-bar__value">${dashboard.total_load_target || 0} m</div>
    </div>
    <div class="chart-bar">
      <div class="chart-bar__label">Ist</div>
      <div class="chart-bar__track">
        <div class="chart-bar__fill chart-bar__fill--actual" style="width:${actualWidth}%"></div>
      </div>
      <div class="chart-bar__value">${dashboard.total_load_actual || 0} m</div>
    </div>
  `;
}

function renderAttendanceChart(container, attendance) {
  container.innerHTML = "";
  const list = document.createElement("ul");
  list.className = "attendance-spark";
  attendance.forEach(({ session, attendance: entries }) => {
    const total = entries.length || 1;
    const present = entries.filter((item) => item.status === "anwesend").length;
    const rate = Math.round((present / total) * 100);
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="attendance-spark__label">${formatDate(session.session_date)}</span>
      <div class="attendance-spark__bar">
        <div class="attendance-spark__fill" style="width:${rate}%"></div>
      </div>
      <span class="attendance-spark__value">${rate}%</span>
    `;
    list.appendChild(item);
  });
  container.appendChild(list);
}

function renderFocusCloud(container, topics) {
  container.innerHTML = "";
  topics.forEach((topic) => {
    const span = document.createElement("span");
    span.className = "focus-chip";
    span.textContent = `${topic.focus_area} (${topic.count})`;
    container.appendChild(span);
  });
}

function renderActivities(container, activities) {
  container.innerHTML = "";
  activities.forEach((activity) => {
    const li = document.createElement("li");
    li.className = "activity-item";
    li.innerHTML = `
      <span class="activity-item__title">${activity.title}</span>
      <span class="activity-item__meta">${formatDate(activity.date)} · ${activity.status}</span>
    `;
    container.appendChild(li);
  });
}

function renderSidebar(data) {
  const upcoming = document.getElementById("upcoming-sessions");
  const teamFilters = document.getElementById("team-filters");
  const focusFilters = document.getElementById("focus-filters");
  const notesField = document.getElementById("coach-notes");
  const noteFeedback = document.getElementById("save-feedback");
  if (upcoming) {
    upcoming.innerHTML = "";
    data.dashboard.upcoming_sessions.forEach((session) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span class="sidebar-list__title">${session.title}</span>
        <span class="sidebar-list__subtitle">${formatDate(session.session_date)} · ${session.focus_area}</span>
      `;
      upcoming.appendChild(li);
    });
  }
  if (teamFilters) {
    teamFilters.innerHTML = "";
    const teams = getCached("teams-cache");
    if (teams) {
      teams.forEach((team) => {
        const button = document.createElement("button");
        button.className = "chip";
        button.textContent = team.short_name;
        button.dataset.teamId = team.id;
        teamFilters.appendChild(button);
      });
    }
  }
  if (focusFilters) {
    focusFilters.innerHTML = "";
    data.dashboard.focus_topics.forEach((topic) => {
      const button = document.createElement("button");
      button.className = "chip chip--outline";
      button.textContent = topic.focus_area;
      focusFilters.appendChild(button);
    });
  }
  if (notesField) {
    const note = data.dashboard.coach_note;
    notesField.value = note ? note.body : "";
    if (note && noteFeedback) {
      noteFeedback.textContent = `Letzte Aktualisierung ${formatDate(note.updated_at)}`;
    }
  }
}

export async function renderDashboard(root) {
  const data = await loadDashboardData();
  const kpiContainer = root.querySelector("#kpi-grid");
  const loadChart = root.querySelector("#load-chart");
  const attendanceChart = root.querySelector("#attendance-chart");
  const focusCloud = root.querySelector("#focus-cloud");
  const activityFeed = root.querySelector("#activity-feed");

  renderKpis(kpiContainer, data.dashboard);
  renderLoadChart(loadChart, data.dashboard);
  renderAttendanceChart(attendanceChart, data.attendance);
  renderFocusCloud(focusCloud, data.dashboard.focus_topics);
  renderActivities(activityFeed, data.dashboard.activities);
  renderSidebar(data);
}

export function primeTeamsCache(teams) {
  setCached("teams-cache", teams);
}

export function invalidateDashboardCache() {
  invalidate("dashboard-data");
}
