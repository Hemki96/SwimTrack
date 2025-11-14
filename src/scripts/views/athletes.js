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

function renderList(container, athletes) {
  container.innerHTML = "";
  athletes.forEach((athlete) => {
    const item = document.createElement("button");
    item.className = "athlete-item";
    item.dataset.athleteId = athlete.id;
    item.innerHTML = `
      <span class="athlete-item__name">${athlete.first_name} ${athlete.last_name}</span>
      <span class="athlete-item__meta">${athlete.team_name} · ${athlete.primary_stroke}</span>
      <span class="athlete-item__metric">${athlete.last_metric ? `${athlete.last_metric_value} ${athlete.last_metric_unit}` : "Keine Messung"}</span>
    `;
    container.appendChild(item);
  });
}

function renderProfile(container, detail) {
  const { athlete, metrics, attendance_history: attendance } = detail;
  container.innerHTML = `
    <header class="athlete-profile__header">
      <h2>${athlete.first_name} ${athlete.last_name}</h2>
      <p>${athlete.team_name} · Jahrgang ${athlete.birth_year}</p>
    </header>
    <section class="athlete-profile__section">
      <h3>Schwerpunkte</h3>
      <p>${athlete.focus_note || "Keine Notiz hinterlegt."}</p>
    </section>
    <section class="athlete-profile__section">
      <h3>Leistungsentwicklung</h3>
      <ul class="metric-list">
        ${metrics
          .map(
            (metric) => `
              <li>
                <span>${metric.metric_date}</span>
                <span>${metric.metric_type}</span>
                <span>${formatMetric(metric)}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
    <section class="athlete-profile__section">
      <h3>Letzte Anwesenheiten</h3>
      <ul class="attendance-history">
        ${attendance
          .map(
            (item) => `
              <li>
                <span>${item.session_date}</span>
                <span>${item.title}</span>
                <span>${item.status}</span>
              </li>
            `
          )
          .join("")}
      </ul>
    </section>
  `;
}

export async function renderAthletes(root) {
  const listContainer = root.querySelector("#athlete-list");
  const searchInput = root.querySelector("#athlete-search");
  const profileContainer = root.querySelector("#athlete-profile");
  const athletes = await loadAthletes();

  renderList(listContainer, athletes);
  let activeId = athletes[0]?.id || null;

  async function showProfile(id) {
    if (!id) {
      profileContainer.innerHTML = "";
      return;
    }
    const detail = await loadAthleteDetail(id);
    renderProfile(profileContainer, detail);
    listContainer
      .querySelectorAll(".athlete-item")
      .forEach((item) => item.classList.toggle("athlete-item--active", Number(item.dataset.athleteId) === id));
  }

  listContainer.addEventListener("click", (event) => {
    const button = event.target.closest(".athlete-item");
    if (!button) return;
    activeId = Number(button.dataset.athleteId);
    showProfile(activeId);
  });

  searchInput.addEventListener("input", (event) => {
    const query = event.target.value.toLowerCase();
    const filtered = athletes.filter((athlete) =>
      `${athlete.first_name} ${athlete.last_name}`.toLowerCase().includes(query)
    );
    renderList(listContainer, filtered);
  });

  if (activeId) {
    await showProfile(activeId);
    listContainer.querySelector(`.athlete-item[data-athlete-id='${activeId}']`)?.classList.add("athlete-item--active");
  }
}

export function invalidateAthletesCache() {
  invalidate("athletes-list");
}
