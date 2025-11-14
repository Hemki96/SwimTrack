import { api } from "../api.js";
import {
  getCached,
  setCached,
  invalidate,
  invalidateMatching,
  publish,
  subscribe,
} from "../state.js";

const DASHBOARD_CACHE_PREFIX = "dashboard-data-";
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;
const TEAMS_CACHE_KEY = "teams-cache";
const TEAMS_CACHE_TTL = 10 * 60 * 1000;

let detachSessionsListener = null;
let detachTeamsListener = null;

function ensureDashboardSubscriptions() {
  if (!detachSessionsListener) {
    detachSessionsListener = subscribe("sessions/updated", () => {
      invalidateDashboardCache();
    });
  }
  if (!detachTeamsListener) {
    detachTeamsListener = subscribe("teams/updated", () => {
      invalidate(TEAMS_CACHE_KEY);
    });
  }
}

ensureDashboardSubscriptions();

const KPI_CONFIG = [
  {
    key: "attendance_rate",
    label: "Anwesenheit",
    format: (value) => `${Math.round((value || 0) * 100)}%`,
    tone: "text-primary",
  },
  {
    key: "completed_sessions",
    label: "Abgeschlossen",
    format: (value) => value ?? 0,
    tone: "text-success",
  },
  {
    key: "in_progress_sessions",
    label: "Gestartet",
    format: (value) => value ?? 0,
    tone: "text-warning",
  },
  {
    key: "planned_sessions",
    label: "Geplant",
    format: (value) => value ?? 0,
    tone: "text-text-light-secondary dark:text-text-dark-secondary",
  },
];

function formatDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function buildAlertItems(data) {
  const alerts = [];
  if ((data.dashboard?.missing_documentations || 0) > 0) {
    alerts.push({
      icon: "description",
      title: `${data.dashboard.missing_documentations} fehlende Dokumentationen`,
      tone: "text-danger",
      description: "Dokumentiere offene Einheiten für ein vollständiges Journal.",
    });
  }

  const attendanceRates = data.attendance
    .map(({ attendance }) => {
      const recorded = attendance.filter((item) =>
        typeof item.status === "string" && item.status.trim().length > 0
      );
      if (!recorded.length) {
        return null;
      }
      const present = recorded.filter((item) => item.status === "anwesend").length;
      return present / recorded.length;
    })
    .filter((rate) => rate !== null && Number.isFinite(rate));
  const averageRate = attendanceRates.length
    ? attendanceRates.reduce((sum, rate) => sum + rate, 0) / attendanceRates.length
    : 1;

  if (averageRate < 0.8) {
    alerts.push({
      icon: "trending_down",
      title: "Anwesenheit unter 80%",
      tone: "text-warning",
      description: "Überprüfe die Trainingsbelastung und motiviere dein Team.",
    });
  }

  if (!alerts.length) {
    alerts.push({
      icon: "verified",
      title: "Alles im grünen Bereich",
      tone: "text-success",
      description: "Keine dringenden Hinweise. Weiter so!",
    });
  }
  return alerts;
}

async function loadDashboardData(range = 30) {
  const cacheKey = `${DASHBOARD_CACHE_PREFIX}${range}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const [dashboard, sessions] = await Promise.all([
    api.getDashboard({ range }),
    api.getSessions({ includeAttendance: true }),
  ]);
  const effectiveRange = dashboard?.range_days ?? range;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(start.getDate() - Math.max(0, effectiveRange - 1));
  const sessionsInRange = sessions.filter((session) => {
    if (!session.session_date) return false;
    const sessionDate = new Date(`${session.session_date}T00:00:00`);
    if (Number.isNaN(sessionDate.getTime())) {
      return false;
    }
    return sessionDate >= start && sessionDate <= now;
  });
  const enriched = {
    dashboard,
    sessions,
    sessions_in_range: sessionsInRange,
    attendance: sessionsInRange
      .map((session) => ({
        session,
        attendance: Array.isArray(session.attendance) ? session.attendance : [],
      }))
      .filter((entry) =>
        Array.isArray(entry.attendance) &&
        entry.attendance.some(
          (item) => typeof item.status === "string" && item.status.trim().length > 0
        )
      ),
  };
  return setCached(cacheKey, enriched, { ttl: DASHBOARD_CACHE_TTL });
}

function renderKpis(container, data) {
  container.innerHTML = "";
  KPI_CONFIG.forEach((item) => {
    const wrapper = document.createElement("div");
    wrapper.className = "rounded-xl border border-border-light bg-card-light p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card dark:border-border-dark dark:bg-card-dark";
    wrapper.innerHTML = `
      <p class="text-xs font-semibold uppercase tracking-wide text-text-light-secondary dark:text-text-dark-secondary">${item.label}</p>
      <p class="mt-4 text-3xl font-semibold ${item.tone}">${item.format(data[item.key])}</p>
    `;
    container.appendChild(wrapper);
  });
}

function sessionStatusPill(status) {
  const tones = {
    geplant: "bg-primary/10 text-primary",
    gestartet: "bg-warning/10 text-warning",
    abgeschlossen: "bg-success/10 text-success",
  };
  return tones[status] || "bg-card-light text-text-light-secondary dark:bg-card-dark dark:text-text-dark-secondary";
}

function renderUpcoming(container, sessions) {
  container.innerHTML = "";
  if (!sessions.length) {
    container.innerHTML = '<p class="rounded-lg bg-background-light p-4 text-sm text-text-light-secondary dark:bg-background-dark dark:text-text-dark-secondary">Keine Trainingseinheiten im ausgewählten Zeitraum.</p>';
    return;
  }
  sessions.forEach((session) => {
    const card = document.createElement("article");
    card.className = "rounded-xl border border-border-light bg-background-light p-4 dark:border-border-dark dark:bg-background-dark";
    card.innerHTML = `
      <div class="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-5 lg:items-center">
        <div class="font-semibold text-text-light-primary dark:text-text-dark-primary">${session.title}</div>
        <div class="text-text-light-secondary dark:text-text-dark-secondary">${formatDate(session.session_date)} · ${session.start_time?.slice(0, 5) || "—"}</div>
        <div class="hidden text-text-light-secondary dark:text-text-dark-secondary sm:block">${session.location || "Noch nicht definiert"}</div>
        <div class="hidden text-text-light-secondary dark:text-text-dark-secondary lg:block">${session.coach || session.team_name}</div>
        <div class="flex items-center gap-2">
          <span class="rounded-full px-3 py-1 text-xs font-medium ${sessionStatusPill(session.status)}">${session.status}</span>
          <span class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${session.focus_area || "kein Fokus"}</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderAlerts(container, data) {
  container.innerHTML = "";
  const alerts = buildAlertItems(data);
  alerts.forEach((alert) => {
    const item = document.createElement("article");
    item.className = `flex items-start gap-3 rounded-xl border border-border-light bg-background-light p-4 text-sm dark:border-border-dark dark:bg-background-dark ${alert.tone}`;
    item.innerHTML = `
      <span class="material-symbols-outlined mt-0.5 text-lg">${alert.icon}</span>
      <div>
        <p class="font-semibold">${alert.title}</p>
        <p class="text-text-light-secondary dark:text-text-dark-secondary">${alert.description}</p>
      </div>
    `;
    container.appendChild(item);
  });
}

function renderLoadChart(container, dashboard) {
  const max = Math.max(dashboard.total_load_target || 0, dashboard.total_load_actual || 0, 1);
  const variants = [
    {
      label: "Soll",
      value: dashboard.total_load_target || 0,
      tone: "bg-primary",
    },
    {
      label: "Ist",
      value: dashboard.total_load_actual || 0,
      tone: "bg-success",
    },
  ];
  container.innerHTML = variants
    .map(
      (variant) => `
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <span>${variant.label}</span>
            <span>${variant.value} m</span>
          </div>
          <div class="h-3 rounded-full bg-border-light/40 dark:bg-border-dark/40">
            <div class="h-3 rounded-full ${variant.tone}" style="width:${Math.round((variant.value / max) * 100)}%"></div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderAttendance(container, attendance) {
  if (!attendance.length) {
    container.innerHTML =
      '<p class="rounded-lg border border-border-light bg-background-light p-4 text-sm text-text-light-secondary dark:border-border-dark dark:bg-background-dark dark:text-text-dark-secondary">Keine Anwesenheitsdaten im gewählten Zeitraum.</p>';
    return;
  }
  container.innerHTML = attendance
    .map(({ session, attendance: entries }) => {
      const recorded = entries.filter(
        (item) => typeof item.status === "string" && item.status.trim().length > 0
      );
      if (!recorded.length) {
        return "";
      }
      const present = recorded.filter((item) => item.status === "anwesend").length;
      const rate = Math.round((present / recorded.length) * 100);
      return `
        <div class="flex items-center justify-between rounded-lg border border-border-light bg-background-light px-4 py-3 text-sm dark:border-border-dark dark:bg-background-dark">
          <div>
            <p class="font-semibold text-text-light-primary dark:text-text-dark-primary">${session.title}</p>
            <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${formatDate(session.session_date)}</p>
          </div>
          <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">${rate}%</span>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");
}

function renderFocus(container, topics) {
  container.innerHTML = "";
  topics.forEach((topic) => {
    const label = topic.focus_area || "Allgemein";
    const chip = document.createElement("span");
    chip.className = "rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary";
    chip.textContent = `${label} (${topic.count})`;
    container.appendChild(chip);
  });
}

function renderActivity(container, activities) {
  container.innerHTML = "";
  activities.forEach((activity) => {
    const entry = document.createElement("article");
    entry.className = "rounded-xl border border-border-light bg-background-light px-4 py-3 text-sm shadow-sm dark:border-border-dark dark:bg-background-dark";
    entry.innerHTML = `
      <div class="flex items-center justify-between">
        <p class="font-semibold text-text-light-primary dark:text-text-dark-primary">${activity.title}</p>
        <span class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${formatDate(activity.date)}</span>
      </div>
      <p class="mt-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">${activity.status}</p>
    `;
    container.appendChild(entry);
  });
}

function createActivityLogController(root) {
  let dialog;
  let list;
  let currentActivities = [];

  function ensureDialog() {
    if (dialog && root.contains(dialog)) {
      return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.id = "dashboard-activity-log";
    dialog.className =
      "dialog fixed inset-0 h-fit w-full max-w-2xl rounded-2xl border border-border-light bg-card-light/95 p-0 text-left shadow-card backdrop:bg-black/50 backdrop:backdrop-blur dark:border-border-dark dark:bg-card-dark/95";
    dialog.innerHTML = `
      <form method="dialog" class="flex flex-col gap-6 p-6">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold leading-tight">Aktivitätsverlauf</h2>
            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">Letzte Updates aus Trainings &amp; Messungen</p>
          </div>
          <button type="button" class="size-10 rounded-full bg-card-light text-text-light-secondary transition hover:bg-zinc-100 dark:bg-card-dark dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]" data-action="close-activity-log">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div id="activity-log-list" class="max-h-[24rem] overflow-y-auto space-y-3"></div>
        <footer class="flex items-center justify-end">
          <button type="button" data-action="close-activity-log" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90">Schließen</button>
        </footer>
      </form>
    `;
    root.appendChild(dialog);
    list = dialog.querySelector("#activity-log-list");
    dialog.querySelectorAll('[data-action="close-activity-log"]').forEach((button) =>
      button.addEventListener("click", () => dialog.close())
    );
    return dialog;
  }

  function renderList() {
    if (!list) return;
    if (!currentActivities.length) {
      list.innerHTML =
        '<p class="rounded-xl border border-border-light bg-background-light p-4 text-sm text-text-light-secondary dark:border-border-dark dark:bg-background-dark dark:text-text-dark-secondary">Keine Aktivitäten im gewählten Zeitraum.</p>';
      return;
    }
    list.innerHTML = currentActivities
      .map(
        (activity) => `
          <article class="rounded-xl border border-border-light bg-background-light px-4 py-3 text-sm shadow-sm dark:border-border-dark dark:bg-background-dark">
            <div class="flex items-center justify-between">
              <p class="font-semibold text-text-light-primary dark:text-text-dark-primary">${activity.title}</p>
              <span class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${formatDate(activity.date)}</span>
            </div>
            <p class="mt-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">${activity.status}</p>
          </article>
        `
      )
      .join("");
  }

  return {
    setActivities(activities = []) {
      currentActivities = Array.isArray(activities) ? activities : [];
      if (list) {
        renderList();
      }
    },
    open() {
      const dlg = ensureDialog();
      renderList();
      dlg.showModal();
    },
  };
}

function filterSessions(sessions, filters) {
  return sessions.filter((session) => {
    const teamMatch = filters.team === "all" || String(session.team_id || session.teamId) === filters.team;
    const statusMatch = filters.status === "all" || session.status === filters.status;
    return teamMatch && statusMatch;
  });
}

function renderCoachNoteSection(root, dashboard) {
  const noteField = root.querySelector("#coach-note-field");
  const notePreview = root.querySelector("#coach-note-preview");
  const noteMeta = root.querySelector("#coach-note-updated");
  if (!noteField || !notePreview || !noteMeta) {
    return;
  }

  const note = dashboard?.coach_note;
  noteField.value = note?.body || "";
  notePreview.textContent = note?.body || "Noch keine Trainer:innennotiz hinterlegt.";
  if (note?.updated_at) {
    const date = new Date(note.updated_at);
    noteMeta.textContent = `Aktualisiert am ${date.toLocaleString("de-DE")}`;
  } else {
    noteMeta.textContent = "Noch keine Notiz gespeichert";
  }
}

async function setupQuickCapture(root, refresh) {
  const trigger = root.querySelector('[data-action="open-quick-capture"]');
  const dialog = root.querySelector("#quick-capture-dialog");
  const form = root.querySelector("#quick-capture-form");
  if (!trigger || !dialog || !form) return;

  const closeButtons = form.querySelectorAll('[data-action="close-quick-capture"]');

  async function populateSessions() {
    const sessions = await api.getSessions();
    const select = form.querySelector("select[name='session']");
    select.innerHTML = "";
    sessions.forEach((session) => {
      const option = document.createElement("option");
      option.value = session.id;
      option.textContent = `${session.session_date} · ${session.title}`;
      select.appendChild(option);
    });
  }

  trigger.addEventListener("click", async () => {
    await populateSessions();
    dialog.showModal();
  });

  closeButtons.forEach((button) => button.addEventListener("click", () => dialog.close()));

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const sessionId = Number(formData.get("session"));
    const status = formData.get("status");
    const focus = formData.get("focus");
    const note = formData.get("note");
    await api.updateSession(sessionId, {
      status,
      focus_area: focus || undefined,
      notes: note || undefined,
    });
    dialog.close();
    form.reset();
    publish("sessions/updated", { id: sessionId, action: "quick_capture" });
    await refresh();
  });
}

async function setupFilters(root, data) {
  const teamSelect = root.querySelector("#dashboard-team-filter");
  const statusSelect = root.querySelector("#dashboard-status-filter");
  const upcomingContainer = root.querySelector("#dashboard-upcoming");

  const teams = await api.getTeams();
  teamSelect.innerHTML = '<option value="all">Alle</option>';
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = team.short_name || team.name;
    teamSelect.appendChild(option);
  });

  let sessions = data.sessions;
  const filterState = {
    team: "all",
    status: "all",
  };

  function applyFilters() {
    const filtered = filterSessions(sessions, filterState).slice(0, 6);
    renderUpcoming(upcomingContainer, filtered);
  }

  teamSelect.addEventListener("change", (event) => {
    filterState.team = event.target.value;
    applyFilters();
  });

  statusSelect.addEventListener("change", (event) => {
    filterState.status = event.target.value;
    applyFilters();
  });

  applyFilters();

  return {
    updateData(newData) {
      sessions = newData.sessions;
      applyFilters();
    },
  };
}

function refreshHeading(root) {
  const heading = root.querySelector("#dashboard-heading");
  const date = root.querySelector("#dashboard-date");
  if (heading) heading.textContent = "Heute im Überblick";
  if (date) {
    const now = new Date();
    date.textContent = now.toLocaleDateString("de-DE", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
}

export async function renderDashboard(root) {
  const kpiContainer = root.querySelector("#dashboard-kpis");
  const loadContainer = root.querySelector("#dashboard-load-chart");
  const attendanceContainer = root.querySelector("#dashboard-attendance");
  const focusContainer = root.querySelector("#dashboard-focus");
  const activityContainer = root.querySelector("#dashboard-activity");
  const alertsContainer = root.querySelector("#dashboard-alerts");
  const noteForm = root.querySelector("#coach-note-form");
  const noteFeedback = root.querySelector("#coach-note-feedback");
  const noteField = root.querySelector("#coach-note-field");
  const timeframeButtons = Array.from(root.querySelectorAll('[data-timeframe]'));
  const kpiDescription = root.querySelector('[data-element="kpi-description"]');
  const refreshAlertsButton = root.querySelector('[data-action="refresh-alerts"]');
  const activityTrigger = root.querySelector('[data-action="open-activity-log"]');
  const activityLog = createActivityLogController(root);

  let filterController;
  let currentRange = Number(
    timeframeButtons.find((button) => button.classList.contains("bg-primary"))?.dataset.timeframe
  );
  if (!Number.isFinite(currentRange)) {
    currentRange = 30;
  }

  function updateTimeframeButtons(range) {
    timeframeButtons.forEach((button) => {
      const value = Number(button.dataset.timeframe);
      const isActive = value === range;
      button.classList.toggle("bg-primary", isActive);
      button.classList.toggle("text-white", isActive);
      button.classList.toggle("shadow-card", isActive);
      button.classList.toggle("bg-primary/10", !isActive);
      button.classList.toggle("text-primary", !isActive);
      button.classList.toggle("font-semibold", isActive);
      button.classList.toggle("font-medium", !isActive);
    });
  }

  function applyData(data) {
    renderKpis(kpiContainer, data.dashboard);
    renderLoadChart(loadContainer, data.dashboard);
    renderAttendance(attendanceContainer, data.attendance);
    renderFocus(focusContainer, data.dashboard.focus_topics || []);
    renderActivity(activityContainer, data.dashboard.activities || []);
    renderAlerts(alertsContainer, data);
    renderCoachNoteSection(root, data.dashboard);
    activityLog.setActivities(data.dashboard.activities || []);
    if (kpiDescription) {
      const range = data.dashboard.range_days ?? currentRange;
      kpiDescription.textContent = `Kennzahlen der letzten ${range} Tage`;
    }
  }

  async function refreshDashboard({ range = currentRange, invalidateCache = false } = {}) {
    if (invalidateCache) {
      invalidateDashboardCache();
    }
    const refreshed = await loadDashboardData(range);
    currentRange = refreshed.dashboard.range_days ?? range;
    updateTimeframeButtons(currentRange);
    applyData(refreshed);
    if (filterController) {
      filterController.updateData(refreshed);
    }
    return refreshed;
  }

  refreshHeading(root);
  const data = await loadDashboardData(currentRange);
  currentRange = data.dashboard.range_days ?? currentRange;
  updateTimeframeButtons(currentRange);
  applyData(data);
  filterController = await setupFilters(root, data);

  timeframeButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const range = Number(button.dataset.timeframe);
      if (!Number.isFinite(range)) {
        return;
      }
      try {
        if (range === currentRange) {
          await refreshDashboard({ invalidateCache: true });
        } else {
          await refreshDashboard({ range });
        }
      } catch (error) {
        console.error(error);
      }
    });
  });

  if (refreshAlertsButton) {
    refreshAlertsButton.addEventListener("click", async () => {
      const originalText = refreshAlertsButton.textContent;
      refreshAlertsButton.disabled = true;
      refreshAlertsButton.textContent = "Aktualisiert...";
      try {
        await refreshDashboard({ invalidateCache: true });
        refreshAlertsButton.textContent = "Aktualisiert";
        setTimeout(() => {
          refreshAlertsButton.textContent = originalText;
        }, 2000);
      } catch (error) {
        console.error(error);
        refreshAlertsButton.textContent = "Fehler";
        setTimeout(() => {
          refreshAlertsButton.textContent = originalText;
        }, 2000);
      } finally {
        refreshAlertsButton.disabled = false;
      }
    });
  }

  if (activityTrigger) {
    activityTrigger.addEventListener("click", () => activityLog.open());
  }

  if (noteForm && noteField && noteFeedback) {
    noteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const noteText = noteField.value.trim();
      if (!noteText) {
        noteFeedback.textContent = "Bitte eine Notiz eingeben.";
        noteFeedback.className = "text-xs text-danger";
        return;
      }
      try {
        await api.saveNote(noteText);
        noteFeedback.textContent = "Notiz gespeichert.";
        noteFeedback.className = "text-xs text-success";
        await refreshDashboard({ invalidateCache: true });
      } catch (error) {
        console.error(error);
        noteFeedback.textContent = "Speichern fehlgeschlagen.";
        noteFeedback.className = "text-xs text-danger";
      }
      setTimeout(() => {
        noteFeedback.textContent = "";
        noteFeedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
      }, 3000);
    });
  }

  await setupQuickCapture(root, () => refreshDashboard({ invalidateCache: true }));
}

export function primeTeamsCache(teams) {
  setCached(TEAMS_CACHE_KEY, teams, { ttl: TEAMS_CACHE_TTL });
}

export function invalidateDashboardCache() {
  invalidateMatching(DASHBOARD_CACHE_PREFIX);
}
