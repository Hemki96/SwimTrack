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
    container.innerHTML = '<p class="empty-state">Keine Messwerte vorhanden.</p>';
    return;
  }
  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Datum</th>
        <th>Athlet:in</th>
        <th>Team</th>
        <th>Messung</th>
        <th>Wert</th>
      </tr>
    </thead>
    <tbody>
      ${metrics
        .map(
          (metric) => `
            <tr>
              <td>${metric.metric_date}</td>
              <td>${metric.first_name} ${metric.last_name}</td>
              <td>${metric.team_name}</td>
              <td>${metric.metric_type}</td>
              <td>${metric.value} ${metric.unit}</td>
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
    container.innerHTML = '<p class="empty-state">Bitte Messwerte auswählen.</p>';
    return;
  }
  const grouped = metrics.reduce((acc, metric) => {
    const key = `${metric.first_name} ${metric.last_name}`;
    acc[key] = acc[key] || [];
    acc[key].push(metric);
    return acc;
  }, {});

  const entries = Object.entries(grouped);
  const wrapper = document.createElement("div");
  wrapper.className = "trend-list";
  entries.forEach(([athlete, values]) => {
    const sorted = values.slice(0, 6);
    const item = document.createElement("div");
    item.className = "trend-list__item";
    item.innerHTML = `
      <h4>${athlete}</h4>
      <ul>${sorted
        .map((value) => `<li>${value.metric_date}: ${value.value} ${value.unit}</li>`)
        .join("")}</ul>
    `;
    wrapper.appendChild(item);
  });
  container.appendChild(wrapper);
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
  updateMetricTypes(typeSelect, currentMetrics);
  renderTable(tableContainer, currentMetrics);
  renderTrend(trendContainer, currentMetrics);

  async function refreshMetrics() {
    const teamId = currentTeam === "all" || currentTeam === null ? null : Number(currentTeam);
    const metricType = currentType === "all" || currentType === null ? null : currentType;
    currentMetrics = await loadMetrics(teamId, metricType);
    renderTable(tableContainer, currentMetrics);
    renderTrend(trendContainer, currentMetrics);
  }

  teamSelect.addEventListener("change", async (event) => {
    currentTeam = event.target.value;
    currentType = null;
    typeSelect.value = "all";
    currentMetrics = await loadMetrics(currentTeam === "all" ? null : Number(currentTeam), null);
    updateMetricTypes(typeSelect, currentMetrics);
    renderTable(tableContainer, currentMetrics);
    renderTrend(trendContainer, currentMetrics);
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
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "swimtrack-metriken.csv";
    link.click();
    URL.revokeObjectURL(url);
  });
}
