import { api } from "../api.js";
import { getCached, setCached } from "../state.js";

function cacheKey(teamId, metricType) {
  return `metrics-${teamId || "all"}-${metricType || "all"}`;
}

async function loadMetrics(teamId, metricType) {
  const key = cacheKey(teamId, metricType);
  const cached = getCached(key);
  if (cached) return cached;
  const metrics = await api.getMetrics({ teamId, metricType });
  return setCached(key, metrics);
}

function renderTable(container, metrics) {
  container.innerHTML = "";
  if (!metrics.length) {
    container.innerHTML = '<p class="p-6 text-sm text-text-light-secondary dark:text-text-dark-secondary">Keine Messwerte vorhanden.</p>';
    return;
  }
  const table = document.createElement("table");
  table.className = "w-full table-fixed border-collapse text-left text-sm";
  table.innerHTML = `
    <thead>
      <tr class="bg-background-light/60 text-xs uppercase tracking-wide text-text-light-secondary dark:bg-background-dark/60 dark:text-text-dark-secondary">
        <th class="px-4 py-3">Datum</th>
        <th class="px-4 py-3">Athlet:in</th>
        <th class="px-4 py-3">Team</th>
        <th class="px-4 py-3">Messung</th>
        <th class="px-4 py-3">Wert</th>
      </tr>
    </thead>
    <tbody>
      ${metrics
        .map(
          (metric, index) => `
            <tr class="${index % 2 === 0 ? "bg-card-light" : "bg-background-light"} dark:${index % 2 === 0 ? "bg-card-dark" : "bg-background-dark"}">
              <td class="px-4 py-3 text-text-light-primary dark:text-text-dark-primary">${metric.metric_date}</td>
              <td class="px-4 py-3 text-text-light-primary dark:text-text-dark-primary">${metric.first_name} ${metric.last_name}</td>
              <td class="px-4 py-3 text-text-light-secondary dark:text-text-dark-secondary">${metric.team_name}</td>
              <td class="px-4 py-3 text-text-light-secondary dark:text-text-dark-secondary">${metric.metric_type}</td>
              <td class="px-4 py-3 text-text-light-primary dark:text-text-dark-primary">${metric.value} ${metric.unit}</td>
            </tr>
          `
        )
        .join("")}
    </tbody>
  `;
  container.appendChild(table);
}

function renderTrend(container, metrics) {
  container.innerHTML = "";
  if (!metrics.length) {
    container.innerHTML = '<p class="rounded-xl border border-border-light bg-background-light p-4 text-sm text-text-light-secondary dark:border-border-dark dark:bg-background-dark dark:text-text-dark-secondary">Bitte Messwerte auswählen.</p>';
    return;
  }
  const grouped = metrics.reduce((acc, metric) => {
    const key = `${metric.first_name} ${metric.last_name}`;
    acc[key] = acc[key] || [];
    acc[key].push(metric);
    return acc;
  }, {});

  Object.entries(grouped).forEach(([athlete, values]) => {
    const sorted = values.slice(0, 6);
    const card = document.createElement("article");
    card.className = "rounded-xl border border-border-light bg-background-light p-4 shadow-sm dark:border-border-dark dark:bg-background-dark";
    card.innerHTML = `
      <h3 class="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">${athlete}</h3>
      <ul class="mt-3 space-y-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
        ${sorted
          .map((value) => `<li class="flex items-center justify-between"><span>${value.metric_date}</span><span>${value.value} ${value.unit}</span></li>`)
          .join("")}
      </ul>
    `;
    container.appendChild(card);
  });
}

function filterPersonalBests(athletes, teamId) {
  const target = teamId && teamId !== "all" ? Number(teamId) : null;
  return athletes
    .filter((athlete) => athlete.personal_best !== null)
    .filter((athlete) => (target === null ? true : athlete.team_id === target))
    .sort((a, b) => (a.personal_best || Infinity) - (b.personal_best || Infinity));
}

function renderPersonalBests(container, athletes) {
  if (!container) return;
  container.innerHTML = "";
  if (!athletes.length) {
    container.innerHTML = '<p class="rounded-xl border border-border-light bg-background-light p-4 text-sm text-text-light-secondary dark:border-border-dark dark:bg-background-dark dark:text-text-dark-secondary">Keine persönlichen Bestzeiten hinterlegt.</p>';
    return;
  }
  const list = document.createElement("ul");
  list.className = "grid gap-3 sm:grid-cols-2";
  athletes.slice(0, 8).forEach((athlete) => {
    const item = document.createElement("li");
    item.className = "rounded-xl border border-border-light bg-card-light p-4 text-sm shadow-sm dark:border-border-dark dark:bg-card-dark";
    item.innerHTML = `
      <p class="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">${athlete.first_name} ${athlete.last_name}</p>
      <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${athlete.team_name} · ${athlete.best_event}</p>
      <p class="mt-2 text-sm font-semibold text-primary">${athlete.personal_best} ${athlete.personal_best_unit || ""}</p>
    `;
    list.appendChild(item);
  });
  container.appendChild(list);
}

function updateMetricTypes(select, metrics) {
  const types = Array.from(new Set(metrics.map((metric) => metric.metric_type)));
  select.innerHTML = '<option value="all">Alle Messarten</option>';
  types.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    select.appendChild(option);
  });
}

export async function renderPerformance(root) {
  const teamSelect = root.querySelector("#metric-team-select");
  const typeSelect = root.querySelector("#metric-type-select");
  const tableContainer = root.querySelector("#performance-table");
  const trendContainer = root.querySelector("#performance-trend");
  const exportButton = root.querySelector("#export-performance");
  const bestsContainer = root.querySelector("#performance-bests");
  const bestsExport = root.querySelector('[data-action="export-bests"]');

  const teams = await api.getTeams();
  teamSelect.innerHTML = '<option value="all">Alle Mannschaften</option>';
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });

  let currentTeam = null;
  let currentType = null;
  let currentMetrics = await loadMetrics(null, null);
  const athletes = await api.getAthletes();
  let currentBests = filterPersonalBests(athletes, null);
  updateMetricTypes(typeSelect, currentMetrics);
  renderTable(tableContainer, currentMetrics);
  renderTrend(trendContainer, currentMetrics);
  renderPersonalBests(bestsContainer, currentBests);

  async function refreshMetrics() {
    const teamId = currentTeam === "all" || currentTeam === null ? null : Number(currentTeam);
    const metricType = currentType === "all" || currentType === null ? null : currentType;
    currentMetrics = await loadMetrics(teamId, metricType);
    renderTable(tableContainer, currentMetrics);
    renderTrend(trendContainer, currentMetrics);
    currentBests = filterPersonalBests(athletes, teamId === null ? null : teamId);
    renderPersonalBests(bestsContainer, currentBests);
  }

  teamSelect.addEventListener("change", async (event) => {
    currentTeam = event.target.value;
    currentType = null;
    typeSelect.value = "all";
    currentMetrics = await loadMetrics(currentTeam === "all" ? null : Number(currentTeam), null);
    updateMetricTypes(typeSelect, currentMetrics);
    renderTable(tableContainer, currentMetrics);
    renderTrend(trendContainer, currentMetrics);
    currentBests = filterPersonalBests(athletes, currentTeam);
    renderPersonalBests(bestsContainer, currentBests);
  });

  typeSelect.addEventListener("change", async (event) => {
    currentType = event.target.value;
    await refreshMetrics();
  });

  exportButton.addEventListener("click", () => {
    if (!currentMetrics.length) return;
    const header = ["Datum", "Athlet", "Team", "Messung", "Wert"];
    const rows = currentMetrics.map((metric) => [
      metric.metric_date,
      `${metric.first_name} ${metric.last_name}`,
      metric.team_name,
      metric.metric_type,
      `${metric.value} ${metric.unit}`,
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(";"));
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "swimtrack-metriken.csv";
    link.click();
    URL.revokeObjectURL(url);
  });

  if (bestsExport) {
    bestsExport.addEventListener("click", () => {
      if (!currentBests.length) return;
      const header = ["Athlet", "Team", "Disziplin", "Bestzeit"];
      const rows = currentBests.map((athlete) => [
        `${athlete.first_name} ${athlete.last_name}`,
        athlete.team_name,
        athlete.best_event,
        `${athlete.personal_best} ${athlete.personal_best_unit || ""}`.trim(),
      ]);
      const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"));
      const blob = new Blob([csv.join("\n")], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "swimtrack-bestzeiten.csv";
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}
