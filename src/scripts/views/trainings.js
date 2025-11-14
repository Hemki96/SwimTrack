import { api } from "../api.js";
import { getCached, setCached, invalidate } from "../state.js";

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

function sessionStatusTone(status) {
  const tones = {
    geplant: "bg-primary/10 text-primary",
    gestartet: "bg-warning/10 text-warning",
    abgeschlossen: "bg-success/10 text-success",
  };
  return tones[status] || "bg-card-light text-text-light-secondary dark:bg-card-dark dark:text-text-dark-secondary";
}

function renderSessionCards(container, sessions) {
  container.innerHTML = "";
  if (!sessions.length) {
    container.innerHTML = '<p class="rounded-xl border border-border-light bg-background-light p-4 text-sm text-text-light-secondary dark:border-border-dark dark:bg-background-dark dark:text-text-dark-secondary">Keine Trainingseinheiten gefunden.</p>';
    return;
  }
  sessions.forEach((session) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "group w-full rounded-xl border border-border-light bg-card-light p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card dark:border-border-dark dark:bg-card-dark";
    card.dataset.sessionId = session.id;
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <p class="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">${session.title}</p>
        <span class="rounded-full px-3 py-1 text-xs font-medium ${sessionStatusTone(session.status)}">${STATUS_LABELS[session.status] || session.status}</span>
      </div>
      <p class="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">${formatDateTime(session.session_date, session.start_time)}</p>
      <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${session.team_name}</p>
    `;
    container.appendChild(card);
  });
}

function buildAttendanceRow(entry) {
  const row = document.createElement("div");
  row.className = "grid gap-3 rounded-xl border border-border-light bg-background-light p-3 md:grid-cols-[1.2fr_1fr_1fr] dark:border-border-dark dark:bg-background-dark";
  row.innerHTML = `
    <div>
      <p class="font-medium text-text-light-primary dark:text-text-dark-primary">${entry.first_name} ${entry.last_name}</p>
      <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${entry.club || entry.team_name || "Individuell"}</p>
    </div>
    <div>
      <label class="flex flex-col gap-1 text-sm">
        <span>Status</span>
        <select name="status-${entry.id}" data-athlete="${entry.id}" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark">
          <option value="anwesend" ${entry.status === "anwesend" ? "selected" : ""}>Anwesend</option>
          <option value="entschuldigt" ${entry.status === "entschuldigt" ? "selected" : ""}>Entschuldigt</option>
          <option value="abwesend" ${entry.status === "abwesend" ? "selected" : ""}>Abwesend</option>
        </select>
      </label>
    </div>
    <div>
      <label class="flex flex-col gap-1 text-sm">
        <span>Notiz</span>
        <input type="text" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" name="note-${entry.id}" value="${entry.note || ""}" placeholder="Optional" />
      </label>
    </div>
  `;
  return row;
}

function renderAttendance(container, detail, onSave) {
  container.innerHTML = "";
  const form = document.createElement("form");
  form.className = "space-y-4";

  detail.attendance.forEach((entry) => {
    form.appendChild(buildAttendanceRow(entry));
  });

  const actions = document.createElement("div");
  actions.className = "flex items-center justify-between gap-3";
  actions.innerHTML = `
    <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">Änderungen werden lokal gespeichert.</p>
    <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90">Anwesenheit speichern</button>
  `;
  form.appendChild(actions);

  const feedback = document.createElement("p");
  feedback.className = "text-sm";
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
      feedback.textContent = "Anwesenheit gespeichert.";
      feedback.className = "text-sm text-success";
      setTimeout(() => (feedback.textContent = ""), 3000);
    } catch (error) {
      feedback.textContent = "Speichern fehlgeschlagen.";
      feedback.className = "text-sm text-danger";
    }
  });

  container.appendChild(form);
}

function renderSessionDetail(container, detail, onUpdate) {
  const { session } = detail;
  container.innerHTML = `
    <dl class="grid gap-4 text-sm">
      <div>
        <dt class="text-text-light-secondary dark:text-text-dark-secondary">Mannschaft</dt>
        <dd class="font-medium text-text-light-primary dark:text-text-dark-primary">${session.team_name}</dd>
      </div>
      <div>
        <dt class="text-text-light-secondary dark:text-text-dark-secondary">Datum</dt>
        <dd class="font-medium text-text-light-primary dark:text-text-dark-primary">${formatDateTime(session.session_date, session.start_time)}</dd>
      </div>
      <div>
        <dt class="text-text-light-secondary dark:text-text-dark-secondary">Dauer</dt>
        <dd class="font-medium text-text-light-primary dark:text-text-dark-primary">${session.duration_minutes} Minuten</dd>
      </div>
    </dl>
    <form id="session-update-form" class="mt-6 grid gap-4 rounded-xl border border-border-light bg-background-light p-4 text-sm dark:border-border-dark dark:bg-background-dark">
      <div class="grid gap-2 md:grid-cols-2">
        <label class="flex flex-col gap-1">
          <span class="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Status</span>
          <select name="status" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark">
            <option value="geplant" ${session.status === "geplant" ? "selected" : ""}>Geplant</option>
            <option value="gestartet" ${session.status === "gestartet" ? "selected" : ""}>Gestartet</option>
            <option value="abgeschlossen" ${session.status === "abgeschlossen" ? "selected" : ""}>Abgeschlossen</option>
          </select>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Fokus</span>
          <input type="text" name="focus" value="${session.focus_area || ""}" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Technik" />
        </label>
      </div>
      <label class="flex flex-col gap-1">
        <span class="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">Ist-Belastung (Meter)</span>
        <input type="number" name="load_actual" value="${session.load_actual ?? ""}" min="0" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="Optional" />
      </label>
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p id="session-update-feedback" class="text-xs text-text-light-secondary dark:text-text-dark-secondary">Status zuletzt aktualisiert: ${session.updated_at ? new Date(session.updated_at).toLocaleString("de-DE") : "—"}</p>
        <div class="flex items-center gap-2">
          <button type="reset" class="rounded-lg bg-card-light px-4 py-2 text-sm font-medium text-text-light-secondary ring-1 ring-border-light transition-colors hover:bg-zinc-50 dark:bg-card-dark dark:text-text-dark-secondary dark:ring-border-dark dark:hover:bg-[#2a3f53]">Zurücksetzen</button>
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90">Aktualisieren</button>
        </div>
      </div>
    </form>
  `;

  const form = container.querySelector("#session-update-form");
  const feedback = container.querySelector("#session-update-feedback");
  if (!form || !onUpdate) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      status: formData.get("status"),
      focus_area: formData.get("focus") || null,
    };
    const loadActual = formData.get("load_actual");
    if (loadActual !== null && loadActual !== "") {
      payload.load_actual = Number(loadActual);
    } else {
      payload.load_actual = null;
    }
    try {
      await onUpdate(payload);
      if (feedback) {
        feedback.textContent = "Training aktualisiert.";
        feedback.className = "text-xs text-success";
      }
    } catch (error) {
      console.error(error);
      if (feedback) {
        feedback.textContent = "Aktualisierung fehlgeschlagen.";
        feedback.className = "text-xs text-danger";
      }
    }
    if (feedback) {
      setTimeout(() => {
        feedback.textContent = "";
        feedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
      }, 3000);
    }
  });
}

export async function renderTrainings(root) {
  let sessions = await loadSessions();
  const teams = await api.getTeams();
  const calendar = root.querySelector("#calendar");
  const detailContainer = root.querySelector("#session-detail");
  const attendanceContainer = root.querySelector("#session-attendance");
  const teamSelect = root.querySelector("#calendar-team-filter");
  const viewSelect = root.querySelector("#calendar-view");
  const notesField = root.querySelector("#session-notes");
  const notesFeedback = root.querySelector("#session-notes-feedback");
  const notesButton = root.querySelector('[data-action="save-session-note"]');
  const quickCaptureTrigger = root.querySelector('[data-action="toggle-attendance-mode"]');

  teamSelect.innerHTML = '<option value="all">Alle Mannschaften</option>';
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });

  renderSessionCards(calendar, sessions);

  const state = {
    team: "all",
    activeSession: sessions[0]?.id || null,
  };

  function highlightActiveCard() {
    calendar.querySelectorAll("button[data-session-id]").forEach((button) => {
      const isActive = Number(button.dataset.sessionId) === state.activeSession;
      button.classList.toggle("border-primary", isActive);
      button.classList.toggle("shadow-card", isActive);
    });
  }

  function applyFilters(options = {}) {
    const filtered = sessions.filter((session) => {
      if (state.team === "all") return true;
      return String(session.team_id || session.teamId) === state.team;
    });
    renderSessionCards(calendar, filtered);
    bindCalendarClicks(filtered);
    if (!filtered.length) {
      detailContainer.innerHTML = "";
      attendanceContainer.innerHTML = "";
      state.activeSession = null;
      return;
    }
    if (!filtered.some((session) => session.id === state.activeSession)) {
      state.activeSession = filtered[0]?.id || null;
    }
    highlightActiveCard();
    if (state.activeSession && !options.skipDetail) {
      refreshDetail(state.activeSession);
    }
  }

  async function refreshDetail(sessionId) {
    if (!sessionId) return;
    const detail = await loadSessionDetail(sessionId);
    async function handleSessionUpdate(payload) {
      await api.updateSession(sessionId, payload);
      invalidate(`session-${sessionId}`);
      invalidate("dashboard-data");
      invalidateSessionsCache();
      sessions = await loadSessions();
      applyFilters({ skipDetail: true });
      highlightActiveCard();
      await refreshDetail(sessionId);
    }

    renderSessionDetail(detailContainer, detail, handleSessionUpdate);
    renderAttendance(attendanceContainer, detail, async (entries) => {
      await api.saveAttendance(sessionId, entries);
      invalidate(`session-${sessionId}`);
      invalidate("dashboard-data");
      invalidateSessionsCache();
      sessions = await loadSessions();
      applyFilters({ skipDetail: true });
      highlightActiveCard();
      await refreshDetail(sessionId);
    });
    if (notesField && notesFeedback) {
      notesField.value = detail.session.notes || "";
      notesFeedback.textContent = detail.session.notes ? "Letzte Notiz gespeichert." : "Keine Notiz gespeichert";
    }
  }

  function bindCalendarClicks(currentSessions) {
    calendar.querySelectorAll("button[data-session-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const sessionId = Number(button.dataset.sessionId);
        state.activeSession = sessionId;
        selectSession(sessionId);
      });
    });
  }

  function selectSession(sessionId) {
    state.activeSession = sessionId;
    highlightActiveCard();
    refreshDetail(sessionId);
  }

  bindCalendarClicks(sessions);
  if (state.activeSession) {
    selectSession(state.activeSession);
  }

  teamSelect.addEventListener("change", (event) => {
    state.team = event.target.value;
    applyFilters();
  });

  viewSelect.addEventListener("change", () => {
    // Platzhalter für zukünftige Kalender-Ansichten
  });

  if (notesField && notesFeedback) {
    notesField.addEventListener("input", () => {
      notesFeedback.textContent = "Entwurf wird lokal gehalten";
    });
  }

  if (notesButton && notesField && notesFeedback) {
    notesButton.addEventListener("click", async () => {
      if (!state.activeSession) {
        notesFeedback.textContent = "Bitte zuerst eine Einheit auswählen.";
        notesFeedback.className = "text-xs text-warning";
        return;
      }
      try {
        await api.updateSession(state.activeSession, { notes: notesField.value.trim() || null });
        invalidate(`session-${state.activeSession}`);
        invalidate("dashboard-data");
        notesFeedback.textContent = "Notiz gespeichert.";
        notesFeedback.className = "text-xs text-success";
        await refreshDetail(state.activeSession);
      } catch (error) {
        console.error(error);
        notesFeedback.textContent = "Speichern fehlgeschlagen.";
        notesFeedback.className = "text-xs text-danger";
      }
      setTimeout(() => {
        notesFeedback.textContent = "";
        notesFeedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
      }, 3000);
    });
  }

  if (quickCaptureTrigger) {
    setupTrainingQuickCapture(root, quickCaptureTrigger, () => state.activeSession, async () => {
      invalidateSessionsCache();
      invalidate("dashboard-data");
      sessions = await loadSessions();
      applyFilters({ skipDetail: true });
      highlightActiveCard();
      if (state.activeSession) {
        await refreshDetail(state.activeSession);
      }
    });
  }
}

export function invalidateSessionsCache() {
  invalidate("sessions-all");
}

function setupTrainingQuickCapture(root, trigger, getActiveSessionId, onSaved) {
  let dialog;

  function ensureDialog() {
    if (dialog && root.contains(dialog)) {
      return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.id = "training-quick-capture";
    dialog.className =
      "dialog fixed inset-0 h-fit w-full max-w-xl rounded-2xl border border-border-light bg-card-light/95 p-0 text-left shadow-card backdrop:bg-black/50 backdrop:backdrop-blur dark:border-border-dark dark:bg-card-dark/95";
    dialog.innerHTML = `
      <form id="training-quick-capture-form" class="flex flex-col gap-6 p-6">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold leading-tight">Schnellerfassung</h2>
            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">Training kurzerhand dokumentieren</p>
          </div>
          <button type="button" class="size-10 rounded-full bg-card-light text-text-light-secondary transition hover:bg-zinc-100 dark:bg-card-dark dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]" data-action="close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div class="flex flex-col gap-4">
          <label class="flex flex-col gap-2 text-sm">
            <span class="font-medium">Trainingseinheit</span>
            <select name="session" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark"></select>
          </label>
          <fieldset class="flex flex-col gap-2 text-sm">
            <legend class="font-medium">Status</legend>
            <div class="flex flex-wrap gap-3" role="radiogroup">
              <label class="flex items-center gap-2">
                <input type="radio" name="status" value="geplant" checked />
                <span>Geplant</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="radio" name="status" value="gestartet" />
                <span>Gestartet</span>
              </label>
              <label class="flex items-center gap-2">
                <input type="radio" name="status" value="abgeschlossen" />
                <span>Abgeschlossen</span>
              </label>
            </div>
          </fieldset>
          <label class="flex flex-col gap-2 text-sm">
            <span class="font-medium">Fokus</span>
            <input name="focus" type="text" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Technik, Ausdauer" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span class="font-medium">Bemerkung</span>
            <textarea name="note" rows="3" class="resize-none rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="Optional"></textarea>
          </label>
        </div>
        <footer class="flex items-center justify-end gap-3">
          <button type="button" data-action="close" class="rounded-lg px-4 py-2 text-sm font-medium text-text-light-secondary transition hover:bg-zinc-100 dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]">Abbrechen</button>
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90">Speichern</button>
        </footer>
      </form>
    `;
    root.appendChild(dialog);

    const closeButtons = dialog.querySelectorAll('[data-action="close"]');
    closeButtons.forEach((button) => button.addEventListener("click", () => dialog.close()));

    const form = dialog.querySelector("#training-quick-capture-form");
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
      if (typeof onSaved === "function") {
        await onSaved();
      }
    });

    return dialog;
  }

  async function populateSessions(select) {
    const allSessions = await loadSessions();
    select.innerHTML = "";
    allSessions.slice(0, 20).forEach((session) => {
      const option = document.createElement("option");
      option.value = session.id;
      option.textContent = `${session.session_date} · ${session.title}`;
      select.appendChild(option);
    });
  }

  trigger.addEventListener("click", async () => {
    const dlg = ensureDialog();
    const form = dlg.querySelector("#training-quick-capture-form");
    const select = form.querySelector("select[name='session']");
    await populateSessions(select);
    const active = getActiveSessionId();
    if (active) {
      select.value = String(active);
    }
    dlg.showModal();
  });
}
