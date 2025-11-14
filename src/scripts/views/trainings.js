import { api } from "../api.js";
import { getCached, setCached, invalidate, invalidateMatching } from "../state.js";

const STATUS_LABELS = {
  geplant: "Geplant",
  gestartet: "Gestartet",
  abgeschlossen: "Abgeschlossen",
};

function formatDateTime(dateValue, timeValue) {
  const date = new Date(`${dateValue}T${timeValue || "00:00"}`);
  return `${date.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })} · ${date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
}

async function loadSessions() {
  const cached = getCached("sessions-all");
  if (cached) return cached;
  const sessions = await api.getSessions();
  return setCached("sessions-all", sessions);
}

async function loadSessionDetail(id) {
  const cacheKey = `session-${id}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const detail = await api.getSession(id);
  return setCached(cacheKey, detail);
}

function renderSessionCards(container, sessions) {
  container.innerHTML = "";
  if (!sessions.length) {
    container.innerHTML = '<p class="empty-state">Keine Trainingseinheiten gefunden.</p>';
    return;
  }
  sessions.forEach((session) => {
    const card = document.createElement("button");
    card.className = "calendar-card";
    card.dataset.sessionId = session.id;
    card.innerHTML = `
      <span class="calendar-card__title">${session.title}</span>
      <span class="calendar-card__meta">${formatDateTime(session.session_date, session.start_time)}</span>
      <span class="calendar-card__team">${session.team_name}</span>
      <span class="calendar-card__status status-${session.status}">${STATUS_LABELS[session.status] || session.status}</span>
    `;
    container.appendChild(card);
  });
}

function buildAttendanceRow(entry) {
  const row = document.createElement("div");
  row.className = "attendance-row";
  row.innerHTML = `
    <div class="attendance-row__name">${entry.first_name} ${entry.last_name}</div>
    <div class="attendance-row__status">
      <select name="status-${entry.id}" data-athlete="${entry.id}" class="select">
        <option value="anwesend" ${entry.status === "anwesend" ? "selected" : ""}>Anwesend</option>
        <option value="entschuldigt" ${entry.status === "entschuldigt" ? "selected" : ""}>Entschuldigt</option>
        <option value="abwesend" ${entry.status === "abwesend" ? "selected" : ""}>Abwesend</option>
      </select>
    </div>
    <div class="attendance-row__note">
      <input type="text" class="input" name="note-${entry.id}" value="${entry.note || ""}" placeholder="Notiz" />
    </div>
  `;
  return row;
}

function renderAttendance(container, detail, onSave) {
  container.innerHTML = "";
  const form = document.createElement("form");
  form.className = "attendance-form";

  detail.attendance.forEach((entry) => {
    form.appendChild(buildAttendanceRow(entry));
  });

  const actions = document.createElement("div");
  actions.className = "attendance-actions";
  const button = document.createElement("button");
  button.type = "submit";
  button.className = "button button--primary";
  button.textContent = "Anwesenheit speichern";
  actions.appendChild(button);
  form.appendChild(actions);

  const feedback = document.createElement("p");
  feedback.className = "form-feedback";
  form.appendChild(feedback);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const entries = detail.attendance.map((entry) => ({
      athlete_id: entry.id,
      status: formData.get(`status-${entry.id}`),
      note: formData.get(`note-${entry.id}`) || null,
    }));
    try {
      await onSave(entries);
      feedback.textContent = "Erfolgreich gespeichert.";
      feedback.classList.remove("form-feedback--error");
      setTimeout(() => (feedback.textContent = ""), 3000);
    } catch (error) {
      feedback.textContent = "Speichern fehlgeschlagen.";
      feedback.classList.add("form-feedback--error");
    }
  });

  container.appendChild(form);
}

function renderSessionDetail(container, detail) {
  const { session } = detail;
  container.innerHTML = `
    <dl class="session-meta">
      <div><dt>Mannschaft</dt><dd>${session.team_name}</dd></div>
      <div><dt>Datum</dt><dd>${formatDateTime(session.session_date, session.start_time)}</dd></div>
      <div><dt>Dauer</dt><dd>${session.duration_minutes} Minuten</dd></div>
      <div><dt>Status</dt><dd>${STATUS_LABELS[session.status] || session.status}</dd></div>
      <div><dt>Fokus</dt><dd>${session.focus_area}</dd></div>
      <div><dt>Notizen</dt><dd>${session.notes || "—"}</dd></div>
    </dl>
  `;
}

export async function renderTrainings(root) {
  const [sessions, teams] = await Promise.all([loadSessions(), api.getTeams()]);
  const calendar = root.querySelector("#calendar");
  const detailContainer = root.querySelector("#session-detail");
  const attendanceContainer = root.querySelector("#session-attendance");
  const teamSelect = root.querySelector("#calendar-team-filter");
  const viewSelect = root.querySelector("#calendar-view");

  teamSelect.innerHTML = '<option value="all">Alle Mannschaften</option>';
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });

  renderSessionCards(calendar, sessions);

  let currentFilter = {
    team: "all",
  };
  let activeSession = sessions[0]?.id || null;

  async function refreshDetail(sessionId) {
    if (!sessionId) return;
    const detail = await loadSessionDetail(sessionId);
    renderSessionDetail(detailContainer, detail);
    renderAttendance(attendanceContainer, detail, async (entries) => {
      await api.saveAttendance(sessionId, entries);
      invalidate(`session-${sessionId}`);
      await refreshDetail(sessionId);
    });
  }

  calendar.addEventListener("click", (event) => {
    const target = event.target.closest(".calendar-card");
    if (!target) return;
    const { sessionId } = target.dataset;
    activeSession = Number(sessionId);
    calendar.querySelectorAll(".calendar-card").forEach((card) => card.classList.remove("calendar-card--active"));
    target.classList.add("calendar-card--active");
    refreshDetail(activeSession);
  });

  teamSelect.addEventListener("change", (event) => {
    currentFilter.team = event.target.value;
    const filtered = sessions.filter((session) => {
      if (currentFilter.team === "all") return true;
      return String(session.team_id || session.teamId) === currentFilter.team;
    });
    renderSessionCards(calendar, filtered);
    activeSession = filtered[0]?.id || null;
    if (activeSession) {
      calendar.querySelector(".calendar-card")?.classList.add("calendar-card--active");
      refreshDetail(activeSession);
    } else {
      detailContainer.innerHTML = "";
      attendanceContainer.innerHTML = "";
    }
  });

  viewSelect.addEventListener("change", () => {
    // placeholder - future calendar modes
  });

  if (activeSession) {
    const firstCard = calendar.querySelector(`.calendar-card[data-session-id='${activeSession}']`) || calendar.querySelector(".calendar-card");
    firstCard?.classList.add("calendar-card--active");
    refreshDetail(activeSession);
  }
}

export function invalidateSessionsCache() {
  invalidate("sessions-all");
  invalidateMatching("session-");
}
