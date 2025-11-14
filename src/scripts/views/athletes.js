import { api } from "../api.js";
import { getCached, setCached, invalidate } from "../state.js";

function formatMetric(metric) {
  return `${metric.value} ${metric.unit}`;
}

async function loadAthletes() {
  const cached = getCached("athletes-list");
  if (cached) return cached;
  const athletes = await api.getAthletes();
  return setCached("athletes-list", athletes);
}

async function loadAthleteDetail(id) {
  const key = `athlete-${id}`;
  const cached = getCached(key);
  if (cached) return cached;
  const detail = await api.getAthlete(id);
  return setCached(key, detail);
}

function createListItem(athlete) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "flex w-full flex-col gap-1 rounded-xl border border-transparent px-4 py-3 text-left transition hover:bg-primary/10";
  item.dataset.athleteId = athlete.id;
  item.innerHTML = `
    <span class="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">${athlete.first_name} ${athlete.last_name}</span>
    <span class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${athlete.team_name} · ${athlete.primary_stroke}</span>
    <span class="text-xs font-medium text-primary">${athlete.last_metric ? `${athlete.last_metric_value} ${athlete.last_metric_unit}` : "Keine Messung"}</span>
  `;
  return item;
}

function renderList(container, athletes, activeId) {
  container.innerHTML = "";
  if (!athletes.length) {
    container.innerHTML = '<p class="p-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">Keine Athlet:innen gefunden.</p>';
    return;
  }
  athletes.forEach((athlete) => {
    const item = createListItem(athlete);
    if (activeId && Number(activeId) === athlete.id) {
      item.classList.add("border-primary", "bg-primary/10");
    }
    container.appendChild(item);
  });
}

function renderProfile(container, detail) {
  const { athlete, metrics, attendance_history: attendance } = detail;
  container.innerHTML = `
    <div class="rounded-xl border border-border-light bg-background-light p-6 dark:border-border-dark dark:bg-background-dark">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">${athlete.first_name} ${athlete.last_name}</h2>
          <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">${athlete.team_name} · Jahrgang ${athlete.birth_year}</p>
        </div>
        <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">${athlete.primary_stroke}</span>
      </div>
      <section class="mt-6 space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-text-light-secondary dark:text-text-dark-secondary">Schwerpunkte</h3>
        <p class="text-sm text-text-light-primary dark:text-text-dark-primary">${athlete.focus_note || "Keine Notiz hinterlegt."}</p>
      </section>
      <section class="mt-6 space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-text-light-secondary dark:text-text-dark-secondary">Leistungsentwicklung</h3>
        <div class="grid gap-3 md:grid-cols-2">
          ${metrics
            .map(
              (metric) => `
                <article class="rounded-xl border border-border-light bg-card-light p-4 text-sm shadow-sm dark:border-border-dark dark:bg-card-dark">
                  <p class="font-semibold text-text-light-primary dark:text-text-dark-primary">${metric.metric_type}</p>
                  <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${metric.metric_date}</p>
                  <p class="mt-2 text-base font-semibold text-primary">${formatMetric(metric)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
      <section class="mt-6 space-y-3">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-text-light-secondary dark:text-text-dark-secondary">Letzte Anwesenheiten</h3>
        <ul class="space-y-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          ${attendance
            .map(
              (item) => `
                <li class="flex items-center justify-between rounded-lg border border-border-light bg-card-light px-4 py-2 dark:border-border-dark dark:bg-card-dark">
                  <span>${item.session_date} · ${item.title}</span>
                  <span class="text-xs font-semibold ${item.status === "anwesend" ? "text-success" : "text-warning"}">${item.status}</span>
                </li>
              `
            )
            .join("")}
        </ul>
      </section>
    </div>
  `;
}

function downloadAthleteProfile(detail) {
  if (!detail) return;
  const { athlete, metrics, attendance_history: attendance } = detail;
  const lines = [];
  lines.push("Profil");
  lines.push(`Name;${athlete.first_name} ${athlete.last_name}`);
  lines.push(`Team;${athlete.team_name}`);
  lines.push(`Jahrgang;${athlete.birth_year}`);
  lines.push(`Schwerpunkt;${athlete.focus_note || "-"}`);
  lines.push("");
  lines.push("Leistungsmetriken");
  lines.push("Datum;Messung;Wert");
  metrics.forEach((metric) => {
    lines.push(`${metric.metric_date};${metric.metric_type};${metric.value} ${metric.unit}`);
  });
  lines.push("");
  lines.push("Anwesenheit");
  lines.push("Datum;Session;Status");
  attendance.forEach((entry) => {
    lines.push(`${entry.session_date};${entry.title};${entry.status}`);
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  const filename = `swimtrack-${athlete.last_name}-${athlete.first_name}.csv`.toLowerCase();
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function renderAthletes(root) {
  const listContainer = root.querySelector("#athlete-list");
  const searchInput = root.querySelector("#athlete-search");
  const profileContainer = root.querySelector("#athlete-profile");
  const exportButton = root.querySelector('[data-action="export-athlete"]');
  const athletes = await loadAthletes();

  let activeId = athletes[0]?.id || null;
  let activeDetail = null;
  renderList(listContainer, athletes, activeId);

  async function showProfile(id) {
    if (!id) {
      profileContainer.innerHTML = "";
      activeDetail = null;
      return;
    }
    const detail = await loadAthleteDetail(id);
     activeDetail = detail;
    renderProfile(profileContainer, detail);
    renderList(listContainer, athletes, id);
  }

  listContainer.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-athlete-id]");
    if (!button) return;
    activeId = Number(button.dataset.athleteId);
    showProfile(activeId);
  });

  searchInput.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    const filtered = athletes.filter((athlete) =>
      `${athlete.first_name} ${athlete.last_name}`.toLowerCase().includes(query)
    );
    renderList(listContainer, filtered, activeId);
  });

  if (activeId) {
    await showProfile(activeId);
  }

  if (exportButton) {
    exportButton.addEventListener("click", () => {
      if (!activeDetail) return;
      downloadAthleteProfile(activeDetail);
    });
  }
}

export function invalidateAthletesCache() {
  invalidate("athletes-list");
}
