import { api } from "../api.js";
import {
  getCached,
  setCached,
  invalidate,
  invalidateMatching,
  publish,
  subscribe,
} from "../state.js";

const SESSION_LIST_KEY = "sessions-all";
const SESSION_DETAIL_PREFIX = "session-";
const SESSION_LIST_TTL = 60 * 1000;
const SESSION_DETAIL_TTL = 60 * 1000;

let detachSessionsUpdated = null;

function ensureSessionInvalidationListener() {
  if (detachSessionsUpdated) {
    return;
  }
  detachSessionsUpdated = subscribe("sessions/updated", (event) => {
    invalidate(SESSION_LIST_KEY);
    if (event && typeof event.id === "number") {
      invalidate(`${SESSION_DETAIL_PREFIX}${event.id}`);
    } else {
      invalidateMatching(SESSION_DETAIL_PREFIX);
    }
  });
}

ensureSessionInvalidationListener();

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
  const cached = getCached(SESSION_LIST_KEY);
  if (cached) return cached;
  const sessions = await api.getSessions();
  return setCached(SESSION_LIST_KEY, sessions, { ttl: SESSION_LIST_TTL });
}

async function loadSessionDetail(id) {
  const cacheKey = `${SESSION_DETAIL_PREFIX}${id}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const detail = await api.getSession(id);
  return setCached(cacheKey, detail, { ttl: SESSION_DETAIL_TTL });
}

function sessionStatusTone(status) {
  const tones = {
    geplant: "bg-primary/10 text-primary",
    gestartet: "bg-warning/10 text-warning",
    abgeschlossen: "bg-success/10 text-success",
  };
  return tones[status] || "bg-card-light text-text-light-secondary dark:bg-card-dark dark:text-text-dark-secondary";
}

function createSessionButton(session) {
  const card = document.createElement("button");
  card.type = "button";
  card.className =
    "group w-full rounded-xl border border-border-light bg-card-light p-4 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card dark:border-border-dark dark:bg-card-dark";
  card.dataset.sessionId = session.id;
  card.innerHTML = `
    <div class="flex items-center justify-between">
      <p class="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">${session.title}</p>
      <span class="rounded-full px-3 py-1 text-xs font-medium ${sessionStatusTone(session.status)}">${STATUS_LABELS[session.status] || session.status}</span>
    </div>
    <p class="mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">${formatDateTime(session.session_date, session.start_time)}</p>
    <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${session.team_name}</p>
  `;
  return card;
}

function renderSessionCards(container, sessions, view = "list") {
  container.innerHTML = "";
  if (!sessions.length) {
    container.innerHTML =
      '<p class="rounded-xl border border-border-light bg-background-light p-4 text-sm text-text-light-secondary dark:border-border-dark dark:bg-background-dark dark:text-text-dark-secondary">Keine Trainingseinheiten gefunden.</p>';
    return;
  }

  if (view === "board") {
    const board = document.createElement("div");
    board.className = "grid gap-4 md:grid-cols-3";
    const columns = [
      { key: "geplant", label: "Geplant" },
      { key: "gestartet", label: "Gestartet" },
      { key: "abgeschlossen", label: "Abgeschlossen" },
    ];
    columns.forEach((column) => {
      const wrapper = document.createElement("section");
      wrapper.className = "flex flex-col gap-3 rounded-xl border border-border-light bg-background-light p-4 dark:border-border-dark dark:bg-background-dark";
      wrapper.innerHTML = `
        <header class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">${column.label}</h3>
          <span class="rounded-full bg-card-light px-3 py-1 text-xs text-text-light-secondary dark:bg-card-dark dark:text-text-dark-secondary">${sessions.filter((item) => item.status === column.key).length}</span>
        </header>
        <div class="space-y-3" data-column="${column.key}"></div>
      `;
      board.appendChild(wrapper);
    });
    sessions.forEach((session) => {
      const target = board.querySelector(`[data-column="${session.status}"]`);
      if (target) {
        target.appendChild(createSessionButton(session));
      }
    });
    container.appendChild(board);
    return;
  }

  sessions.forEach((session) => {
    container.appendChild(createSessionButton(session));
  });
}

function createSessionDialog(root, teams) {
  let dialog;
  let form;
  let submit;
  let feedback;
  let title;
  let currentHandler = null;

  function ensureDialog() {
    if (dialog && root.contains(dialog)) {
      return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.id = "session-editor-dialog";
    dialog.className =
      "dialog fixed inset-0 h-fit w-full max-w-2xl rounded-2xl border border-border-light bg-card-light/95 p-0 text-left shadow-card backdrop:bg-black/50 backdrop:backdrop-blur dark:border-border-dark dark:bg-card-dark/95";
    dialog.innerHTML = `
      <form id="session-editor-form" class="flex flex-col gap-6 p-6">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 data-element="session-dialog-title" class="text-xl font-semibold leading-tight">Trainingseinheit</h2>
            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">Rahmendaten festlegen und planen</p>
          </div>
          <button type="button" class="size-10 rounded-full bg-card-light text-text-light-secondary transition hover:bg-zinc-100 dark:bg-card-dark dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]" data-action="close-session-dialog">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div class="grid gap-4 md:grid-cols-2">
          <label class="flex flex-col gap-2 text-sm">
            <span>Team</span>
            <select name="team_id" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark"></select>
          </label>
          <label class="flex flex-col gap-2 text-sm md:col-span-1">
            <span>Titel</span>
            <input name="title" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Techniktraining" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Datum</span>
            <input name="session_date" type="date" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Startzeit</span>
            <input name="start_time" type="time" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Dauer (Minuten)</span>
            <input name="duration_minutes" type="number" min="0" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Status</span>
            <select name="status" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark">
              <option value="geplant">Geplant</option>
              <option value="gestartet">Gestartet</option>
              <option value="abgeschlossen">Abgeschlossen</option>
            </select>
          </label>
          <label class="flex flex-col gap-2 text-sm md:col-span-2">
            <span>Fokus</span>
            <input name="focus_area" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Starts &amp; Wenden" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Soll-Belastung (Meter)</span>
            <input name="load_target" type="number" min="0" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Ist-Belastung (Meter)</span>
            <input name="load_actual" type="number" min="0" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="Optional" />
          </label>
          <label class="flex flex-col gap-2 text-sm md:col-span-2">
            <span>Notizen</span>
            <textarea name="notes" rows="3" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="Schwerpunkte oder Hinweise"></textarea>
          </label>
        </div>
        <p data-element="session-dialog-feedback" class="text-xs text-text-light-secondary dark:text-text-dark-secondary"></p>
        <footer class="flex items-center justify-end gap-3">
          <button type="button" data-action="close-session-dialog" class="rounded-lg px-4 py-2 text-sm font-medium text-text-light-secondary transition hover:bg-zinc-100 dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]">Abbrechen</button>
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90">Speichern</button>
        </footer>
      </form>
    `;
    root.appendChild(dialog);
    form = dialog.querySelector("#session-editor-form");
    submit = form.querySelector('button[type="submit"]');
    feedback = form.querySelector('[data-element="session-dialog-feedback"]');
    title = form.querySelector('[data-element="session-dialog-title"]');
    dialog.querySelectorAll('[data-action="close-session-dialog"]').forEach((button) =>
      button.addEventListener("click", () => dialog.close())
    );
    dialog.addEventListener("close", () => {
      form.reset();
      currentHandler = null;
      if (feedback) {
        feedback.textContent = "";
        feedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
      }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!currentHandler) return;
      const payload = collectPayload();
      if (!payload) {
        return;
      }
      try {
        submit.disabled = true;
        submit.classList.add("opacity-75");
        setFeedback("Speichere...", "info");
        await currentHandler(payload);
        setFeedback("Gespeichert", "success");
        dialog.close();
      } catch (error) {
        console.error(error);
        setFeedback("Speichern fehlgeschlagen.", "error");
      } finally {
        submit.disabled = false;
        submit.classList.remove("opacity-75");
      }
    });
    return dialog;
  }

  function populateTeams(select, selectedId) {
    select.innerHTML = "";
    teams.forEach((team) => {
      const option = document.createElement("option");
      option.value = String(team.id);
      option.textContent = team.name;
      if (selectedId && Number(selectedId) === team.id) {
        option.selected = true;
      }
      select.appendChild(option);
    });
    if (!select.value && teams[0]) {
      select.value = String(teams[0].id);
    }
  }

  function setFeedback(message, tone) {
    if (!feedback) return;
    let toneClass = "text-text-light-secondary dark:text-text-dark-secondary";
    if (tone === "error") toneClass = "text-danger";
    if (tone === "success") toneClass = "text-success";
    feedback.textContent = message;
    feedback.className = `text-xs ${toneClass}`;
  }

  function setFormValues(initial = {}) {
    const select = form.querySelector('select[name="team_id"]');
    populateTeams(select, initial.team_id);
    form.querySelector('input[name="title"]').value = initial.title || "";
    form.querySelector('input[name="session_date"]').value = initial.session_date || "";
    form.querySelector('input[name="start_time"]').value = initial.start_time || "";
    form.querySelector('input[name="duration_minutes"]').value = initial.duration_minutes ?? "60";
    form.querySelector('select[name="status"]').value = initial.status || "geplant";
    form.querySelector('input[name="focus_area"]').value = initial.focus_area || "";
    form.querySelector('input[name="load_target"]').value = initial.load_target ?? "0";
    form.querySelector('input[name="load_actual"]').value = initial.load_actual ?? "";
    form.querySelector('textarea[name="notes"]').value = initial.notes || "";
    setFeedback("", "info");
  }

  function collectPayload() {
    const formData = new FormData(form);
    const teamId = Number(formData.get("team_id"));
    const titleValue = String(formData.get("title") || "").trim();
    const sessionDate = formData.get("session_date");
    const startTime = formData.get("start_time");
    const duration = Number(formData.get("duration_minutes"));
    const status = formData.get("status") || "geplant";
    const focus = String(formData.get("focus_area") || "").trim();
    const loadTarget = Number(formData.get("load_target"));
    const loadActualRaw = formData.get("load_actual");
    const notes = String(formData.get("notes") || "").trim();

    if (!teamId || !titleValue || !sessionDate || !startTime || Number.isNaN(duration) || Number.isNaN(loadTarget)) {
      setFeedback("Bitte alle Pflichtfelder ausfüllen.", "error");
      return null;
    }
    if (!focus) {
      setFeedback("Bitte einen Fokus hinterlegen.", "error");
      return null;
    }

    const payload = {
      team_id: teamId,
      title: titleValue,
      session_date: sessionDate,
      start_time: startTime,
      duration_minutes: duration,
      status,
      focus_area: focus,
      load_target: loadTarget,
      notes: notes || null,
    };
    if (loadActualRaw !== null && loadActualRaw !== "" && !Number.isNaN(Number(loadActualRaw))) {
      payload.load_actual = Number(loadActualRaw);
    } else {
      payload.load_actual = null;
    }
    return payload;
  }

  function open(options, handler) {
    const dlg = ensureDialog();
    currentHandler = handler;
    setFormValues(options.initialValues);
    if (title) {
      title.textContent = options.title;
    }
    if (submit) {
      submit.textContent = options.submitLabel;
    }
    dlg.showModal();
  }

  return {
    openCreate(onSubmit) {
      const today = new Date();
      open(
        {
          title: "Neue Trainingseinheit",
          submitLabel: "Erstellen",
          initialValues: {
            team_id: teams[0]?.id,
            title: "",
            session_date: today.toISOString().slice(0, 10),
            start_time: "17:00",
            duration_minutes: 60,
            status: "geplant",
            focus_area: "Allgemein",
            load_target: 3000,
            load_actual: "",
            notes: "",
          },
        },
        onSubmit
      );
    },
    openEdit(session, onSubmit) {
      open(
        {
          title: "Training bearbeiten",
          submitLabel: "Aktualisieren",
          initialValues: session,
        },
        onSubmit
      );
    },
    openDuplicate(session, onSubmit) {
      let nextDate = session.session_date;
      const parsed = new Date(session.session_date);
      if (!Number.isNaN(parsed.getTime())) {
        parsed.setDate(parsed.getDate() + 7);
        nextDate = parsed.toISOString().slice(0, 10);
      }
      open(
        {
          title: "Training duplizieren",
          submitLabel: "Duplizieren",
          initialValues: {
            ...session,
            title: `${session.title} (Kopie)`,
            session_date: nextDate,
            status: "geplant",
          },
        },
        onSubmit
      );
    },
  };
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
  const createButton = root.querySelector('[data-action="create-session"]');
  const duplicateButton = root.querySelector('[data-action="duplicate-session"]');
  const editButton = root.querySelector('[data-action="edit-session"]');
  const sessionDialog = createSessionDialog(root, teams);

  teamSelect.innerHTML = '<option value="all">Alle Mannschaften</option>';
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });

  viewSelect.innerHTML = "";
  [
    { value: "list", label: "Liste" },
    { value: "board", label: "Status-Board" },
  ].forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    viewSelect.appendChild(option);
  });

  const state = {
    team: "all",
    activeSession: sessions[0]?.id || null,
    view: viewSelect.value || "list",
  };

  let currentDetail = null;
  let updateActiveSession = null;

  renderSessionCards(calendar, sessions, state.view);

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
    renderSessionCards(calendar, filtered, state.view);
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

  async function reloadSessions(
    newActiveId,
    { refreshDetail: shouldRefresh = true, forceReload = false } = {}
  ) {
    if (forceReload) {
      invalidate(SESSION_LIST_KEY);
      invalidateMatching(SESSION_DETAIL_PREFIX);
    }
    sessions = await loadSessions();
    if (typeof newActiveId === "number") {
      state.activeSession = newActiveId;
    }
    applyFilters({ skipDetail: true });
    highlightActiveCard();
    if (state.activeSession && shouldRefresh) {
      await refreshDetail(state.activeSession);
    }
  }

  async function refreshDetail(sessionId) {
    if (!sessionId) return;
    const detail = await loadSessionDetail(sessionId);
    currentDetail = detail;
    async function handleSessionUpdate(payload) {
      await api.updateSession(sessionId, payload);
      publish("sessions/updated", { id: sessionId, action: "update" });
      await reloadSessions(sessionId);
    }
    updateActiveSession = handleSessionUpdate;

    renderSessionDetail(detailContainer, detail, handleSessionUpdate);
    renderAttendance(attendanceContainer, detail, async (entries) => {
      await api.saveAttendance(sessionId, entries);
      publish("sessions/updated", { id: sessionId, action: "attendance" });
      await reloadSessions(sessionId);
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

  viewSelect.addEventListener("change", (event) => {
    state.view = event.target.value || "list";
    applyFilters({ skipDetail: true });
    highlightActiveCard();
    if (state.activeSession) {
      refreshDetail(state.activeSession);
    }
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
        publish("sessions/updated", { id: state.activeSession, action: "notes" });
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

  if (createButton) {
    createButton.addEventListener("click", () => {
      sessionDialog.openCreate(async (payload) => {
        const created = await api.createSession(payload);
        const newId = created?.session?.id;
        publish("sessions/updated", { id: newId, action: "create" });
        await reloadSessions(newId ?? undefined);
      });
    });
  }

  if (editButton) {
    editButton.addEventListener("click", () => {
      if (!state.activeSession || !currentDetail) {
        if (notesFeedback) {
          notesFeedback.textContent = "Bitte zuerst eine Einheit auswählen.";
          notesFeedback.className = "text-xs text-warning";
          setTimeout(() => {
            notesFeedback.textContent = "";
            notesFeedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
          }, 3000);
        }
        return;
      }
      sessionDialog.openEdit(currentDetail.session, async (payload) => {
        if (updateActiveSession) {
          await updateActiveSession(payload);
        }
      });
    });
  }

  if (duplicateButton) {
    duplicateButton.addEventListener("click", () => {
      if (!state.activeSession || !currentDetail) {
        if (notesFeedback) {
          notesFeedback.textContent = "Bitte zuerst eine Einheit auswählen.";
          notesFeedback.className = "text-xs text-warning";
          setTimeout(() => {
            notesFeedback.textContent = "";
            notesFeedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
          }, 3000);
        }
        return;
      }
      sessionDialog.openDuplicate(currentDetail.session, async (payload) => {
        const duplicated = await api.duplicateSession(state.activeSession, payload);
        const newId = duplicated?.session?.id;
        publish("sessions/updated", { id: newId, action: "duplicate" });
        await reloadSessions(newId ?? undefined);
      });
    });
  }

  if (quickCaptureTrigger) {
    setupTrainingQuickCapture(root, quickCaptureTrigger, () => state.activeSession, async () => {
      await reloadSessions(state.activeSession, {
        refreshDetail: true,
      });
    });
  }
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
      publish("sessions/updated", { id: sessionId, action: "quick_capture" });
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
