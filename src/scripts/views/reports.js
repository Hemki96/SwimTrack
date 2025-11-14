import { api } from "../api.js";
import { loadScreenTemplate } from "../templateLoader.js";

const EXPORT_TEMPLATE_PATH = "/screens/datenexport_/_reports/code.html";
const DATASET_CATALOG = [
  {
    id: "sessions",
    label: "Trainingseinheiten",
    description: "Datum, Status, Fokus und Notizen pro Einheit",
  },
  {
    id: "attendance",
    label: "Anwesenheit",
    description: "Teilnahme je Athlet:in inklusive Status",
  },
  {
    id: "metrics",
    label: "Leistungsmetriken",
    description: "Messwerte mit Team- und Athletenzuordnung",
  },
];

const exportHistory = [];

function withinRange(dateValue, from, to) {
  if (!from && !to) return true;
  const time = new Date(dateValue).getTime();
  if (Number.isNaN(time)) return true;
  if (from && time < new Date(from).getTime()) return false;
  if (to && time > new Date(to).getTime()) return false;
  return true;
}

function renderReportBuilder(container, reports) {
  container.innerHTML = "";
  if (!reports.length) {
    container.innerHTML = '<p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">Noch keine Reports vorhanden.</p>';
    return;
  }
  const list = document.createElement("div");
  list.className = "grid gap-4 sm:grid-cols-2";
  reports.forEach((report) => {
    const card = document.createElement("article");
    card.className = "rounded-xl border border-border-light bg-card-light p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card dark:border-border-dark dark:bg-card-dark";
    card.innerHTML = `
      <h3 class="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">${report.title}</h3>
      <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">${report.team_name}</p>
      <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${report.period_start} – ${report.period_end}</p>
      <span class="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">${report.status}</span>
    `;
    list.appendChild(card);
  });
  container.appendChild(list);
}

function renderScheduledReports(container, reports) {
  container.innerHTML = "";
  if (!reports.length) {
    container.innerHTML = '<p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">Keine geplanten Reports.</p>';
    return;
  }
  const list = document.createElement("ul");
  list.className = "space-y-3";
  reports.forEach((report) => {
    const item = document.createElement("li");
    item.className = "flex items-center justify-between rounded-lg border border-border-light bg-background-light px-4 py-3 text-sm dark:border-border-dark dark:bg-background-dark";
    item.innerHTML = `
      <span class="font-medium text-text-light-primary dark:text-text-dark-primary">${report.title}</span>
      <span class="text-text-light-secondary dark:text-text-dark-secondary">${report.team_name} · ${report.status}</span>
      <span class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${report.delivered_on || "Ausstehend"}</span>
    `;
    list.appendChild(item);
  });
  container.appendChild(list);
}

async function buildDataset(datasetId, filters) {
  switch (datasetId) {
    case "sessions": {
      const sessions = await api.getSessions({ teamId: filters.teamId || undefined });
      const filteredSessions = sessions.filter((session) => withinRange(session.session_date, filters.from, filters.to));
      return {
        header: ["Datum", "Start", "Dauer", "Team", "Status", "Fokus", "Notiz"],
        rows: filteredSessions.map((session) => [
          session.session_date,
          session.start_time,
          `${session.duration_minutes} min`,
          session.team_name,
          session.status,
          session.focus_area || "—",
          session.notes || "—",
        ]),
      };
    }
    case "attendance": {
      const sessions = await api.getSessions({ teamId: filters.teamId || undefined });
      const attendanceRows = [];
      for (const session of sessions.slice(0, 10)) {
        if (!withinRange(session.session_date, filters.from, filters.to)) continue;
        const detail = await api.getSession(session.id);
        detail.attendance.forEach((entry) => {
          attendanceRows.push([
            session.session_date,
            session.title,
            `${entry.first_name} ${entry.last_name}`,
            entry.status,
            entry.note || "—",
          ]);
        });
      }
      return {
        header: ["Datum", "Einheit", "Athlet:in", "Status", "Notiz"],
        rows: attendanceRows,
      };
    }
    case "metrics": {
      const metrics = await api.getMetrics({ teamId: filters.teamId || undefined });
      const filteredMetrics = metrics.filter((metric) => withinRange(metric.metric_date, filters.from, filters.to));
      return {
        header: ["Datum", "Athlet", "Team", "Messung", "Wert"],
        rows: filteredMetrics.map((metric) => [
          metric.metric_date,
          `${metric.first_name} ${metric.last_name}`,
          metric.team_name,
          metric.metric_type,
          `${metric.value} ${metric.unit}`,
        ]),
      };
    }
    default:
      return { header: [], rows: [] };
  }
}

function downloadData(dataset, format) {
  if (!dataset.rows.length) return;
  if (format === "json") {
    const blob = new Blob([JSON.stringify(dataset.rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "swimtrack-export.json";
    link.click();
    URL.revokeObjectURL(url);
    return;
  }
  const csv = [dataset.header, ...dataset.rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"));
  const blob = new Blob([csv.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = format === "xlsx" ? "swimtrack-export.xlsx" : "swimtrack-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function updateExportHistory(container, entry) {
  exportHistory.unshift(entry);
  container.innerHTML = exportHistory
    .slice(0, 6)
    .map(
      (item) => `
        <li class="flex items-center justify-between rounded-lg border border-border-light bg-background-light px-4 py-2 text-sm dark:border-border-dark dark:bg-background-dark">
          <span>${item.label}</span>
          <span class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${item.timestamp}</span>
        </li>
      `
    )
    .join("");
}

function renderDatasetOptions(container) {
  container.innerHTML = DATASET_CATALOG.map(
    (dataset, index) => `
      <label class="flex cursor-pointer flex-col gap-2 rounded-xl border border-border-light bg-card-light p-4 text-sm shadow-sm hover:border-primary dark:border-border-dark dark:bg-card-dark">
        <div class="flex items-center gap-2">
          <input type="radio" name="dataset" value="${dataset.id}" ${index === 0 ? "checked" : ""} />
          <span class="font-semibold text-text-light-primary dark:text-text-dark-primary">${dataset.label}</span>
        </div>
        <p class="text-xs text-text-light-secondary dark:text-text-dark-secondary">${dataset.description}</p>
      </label>
    `
  ).join("");
}

async function setupExportSection(container) {
  const { fragment } = await loadScreenTemplate(EXPORT_TEMPLATE_PATH);
  container.innerHTML = "";
  container.appendChild(fragment);

  const datasetsContainer = container.querySelector("#export-datasets");
  const teamSelect = container.querySelector("#export-team");
  const historyContainer = container.querySelector("#export-history");
  const exportButton = container.querySelector('[data-action="export-start"]');
  const refreshButton = container.querySelector('[data-action="refresh-exports"]');

  renderDatasetOptions(datasetsContainer);

  const teams = await api.getTeams();
  teamSelect.innerHTML = '<option value="all">Alle Teams</option>';
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });

  exportButton.addEventListener("click", async () => {
    const form = container.querySelector("#export-form");
    const formData = new FormData(form);
    const datasetId = formData.get("dataset") || DATASET_CATALOG[0].id;
    const format = formData.get("format") || "csv";
    const filters = {
      teamId: formData.get("team") === "all" ? null : Number(formData.get("team")),
      from: formData.get("from"),
      to: formData.get("to"),
    };
    const dataset = await buildDataset(datasetId, filters);
    downloadData(dataset, format);
    updateExportHistory(historyContainer, {
      label: `${DATASET_CATALOG.find((item) => item.id === datasetId)?.label || datasetId} (${format.toUpperCase()})`,
      timestamp: new Date().toLocaleString("de-DE"),
    });
  });

  refreshButton.addEventListener("click", () => {
    updateExportHistory(historyContainer, {
      label: "Verlauf aktualisiert",
      timestamp: new Date().toLocaleString("de-DE"),
    });
  });
}

function setupTabs(root, exportLoader) {
  const overviewSection = root.querySelector("#reports-overview");
  const exportSection = root.querySelector("#reports-export");
  const buttons = root.querySelectorAll("[data-tab]");
  let exportLoaded = false;

  function switchTab(target) {
    buttons.forEach((button) => {
      const isActive = button.dataset.tab === target;
      button.classList.toggle("bg-primary", isActive);
      button.classList.toggle("text-white", isActive);
      button.classList.toggle("bg-card-light", !isActive);
      button.classList.toggle("ring-border-light", !isActive);
    });
    if (target === "overview") {
      overviewSection.classList.remove("hidden");
      exportSection.classList.add("hidden");
    } else {
      overviewSection.classList.add("hidden");
      exportSection.classList.remove("hidden");
      if (!exportLoaded) {
        exportLoader().then(() => {
          exportLoaded = true;
        });
      }
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  switchTab("overview");
}

export async function renderReports(root) {
  const builder = root.querySelector("#report-builder");
  const scheduled = root.querySelector("#scheduled-reports");
  const exportContainer = root.querySelector("#reports-export");
  const reports = await api.getReports();

  renderReportBuilder(builder, reports);
  renderScheduledReports(scheduled, reports);

  setupTabs(root, async () => {
    await setupExportSection(exportContainer);
  });
}
