import { api } from "../api.js";

function renderReportBuilder(container, reports) {
  container.innerHTML = `
    <p>Erstellen Sie Reports anhand von Zeitraum und Mannschaft. Wählen Sie einen bestehenden Report als Vorlage.</p>
    <div class="report-builder__grid">
      ${reports
        .map(
          (report) => `
            <article class="report-card">
              <h3>${report.title}</h3>
              <p>${report.team_name}</p>
              <p>${report.period_start} – ${report.period_end}</p>
              <span class="report-card__status">${report.status}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderScheduledReports(container, reports) {
  container.innerHTML = "";
  reports.forEach((report) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span class="report-list__title">${report.title}</span>
      <span class="report-list__meta">${report.team_name} · ${report.status}</span>
      <span class="report-list__date">${report.delivered_on || "Ausstehend"}</span>
    `;
    container.appendChild(item);
  });
}

export async function renderReports(root) {
  const builder = root.querySelector("#report-builder");
  const scheduled = root.querySelector("#scheduled-reports");
  const reports = await api.getReports();

  renderReportBuilder(builder, reports);
  renderScheduledReports(scheduled, reports);
}
