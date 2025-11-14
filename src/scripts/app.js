import { api } from "./api.js";
import { navigate, onRouteChange, activeRoute } from "./router.js";
import { renderDashboard, invalidateDashboardCache, primeTeamsCache } from "./views/dashboard.js";
import { renderTrainings, invalidateSessionsCache } from "./views/trainings.js";
import { renderPerformance } from "./views/performance.js";
import { renderAthletes } from "./views/athletes.js";
import { renderTeams } from "./views/teams.js";
import { renderReports } from "./views/reports.js";
import { renderSettings } from "./views/settings.js";

const viewRenderers = {
  dashboard: renderDashboard,
  trainings: renderTrainings,
  performance: renderPerformance,
  athletes: renderAthletes,
  teams: renderTeams,
  reports: renderReports,
  settings: renderSettings,
};

async function loadTemplate(route) {
  const template = document.getElementById(`${route}-template`);
  if (!template) return null;
  const content = document.getElementById("content");
  content.innerHTML = "";
  const clone = template.content.cloneNode(true);
  content.appendChild(clone);
  return content;
}

async function renderRoute(route) {
  const container = await loadTemplate(route);
  if (!container) return;
  await viewRenderers[route](container);
  highlightNavigation(route);
}

function highlightNavigation(route) {
  document
    .querySelectorAll(".nav-button")
    .forEach((button) => button.classList.toggle("nav-button--active", button.dataset.target === route));
}

async function handleRouteChange(route) {
  await renderRoute(route);
}

function setupNavigation() {
  document.querySelectorAll(".nav-button").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.target));
  });
  onRouteChange(handleRouteChange);
}

async function setupSidebarData() {
  const teams = await api.getTeams();
  primeTeamsCache(teams);
}

function setupQuickCapture() {
  const button = document.getElementById("quick-capture");
  const dialog = document.getElementById("quick-capture-dialog");
  const form = document.getElementById("quick-capture-form");
  if (!button || !dialog || !form) return;

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

  button.addEventListener("click", async () => {
    await populateSessions();
    dialog.showModal();
  });

  form.querySelector(".dialog__close").addEventListener("click", () => dialog.close());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const sessionId = Number(formData.get("session"));
    const status = formData.get("status");
    const focus = formData.get("focus");
    const note = formData.get("note");
    try {
      await api.updateSession(sessionId, {
        status,
        focus_area: focus || undefined,
        notes: note || undefined,
      });
      dialog.close();
      form.reset();
      invalidateSessionsCache();
      invalidateDashboardCache();
      await renderRoute(activeRoute());
    } catch (error) {
      const feedback = form.querySelector(".dialog__footer");
      const message = document.createElement("p");
      message.className = "form-feedback form-feedback--error";
      message.textContent = "Speichern fehlgeschlagen.";
      feedback.appendChild(message);
      setTimeout(() => message.remove(), 3000);
    }
  });
}

function setupNotes() {
  const button = document.getElementById("save-notes");
  const textarea = document.getElementById("coach-notes");
  const feedback = document.getElementById("save-feedback");
  if (!button || !textarea) return;

  button.addEventListener("click", async () => {
    if (!textarea.value.trim()) {
      feedback.textContent = "Bitte eine Notiz eingeben.";
      feedback.classList.add("form-feedback--error");
      return;
    }
    try {
      const note = await api.saveNote(textarea.value.trim());
      feedback.textContent = `Gespeichert am ${new Date(note.updated_at).toLocaleString("de-DE")}`;
      feedback.classList.remove("form-feedback--error");
      invalidateDashboardCache();
    } catch (error) {
      feedback.textContent = "Speichern nicht möglich.";
      feedback.classList.add("form-feedback--error");
    }
  });
}

async function bootstrap() {
  setupNavigation();
  setupQuickCapture();
  setupNotes();
  await setupSidebarData();
  await renderRoute(activeRoute());
}

bootstrap();
