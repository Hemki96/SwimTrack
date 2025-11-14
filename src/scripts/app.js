import { loadScreenTemplate } from "./templateLoader.js";
import { navigate, onRouteChange, activeRoute } from "./router.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderTrainings } from "./views/trainings.js";
import { renderPerformance } from "./views/performance.js";
import { renderAthletes } from "./views/athletes.js";
import { renderTeams } from "./views/teams.js";
import { renderReports } from "./views/reports.js";
import { renderSettings } from "./views/settings.js";

const SCREEN_PATHS = {
  dashboard: "/screens/dashboard_für_trainer_innen/code.html",
  trainings: "/screens/trainingskalender_&_übersicht/code.html",
  performance: "/screens/leistungsdatenerfassung/code.html",
  athletes: "/screens/athletenprofil__trainingshistorie_&_entwicklung/code.html",
  teams: "/screens/mannschaftsverwaltung/code.html",
  reports: "/screens/auswertungen_–_athlet__individualreport/code.html",
  settings: "/screens/einstellungen_/_stammdaten/code.html",
};

const ROUTE_RENDERERS = {
  dashboard: renderDashboard,
  trainings: renderTrainings,
  performance: renderPerformance,
  athletes: renderAthletes,
  teams: renderTeams,
  reports: renderReports,
  settings: renderSettings,
};

const root = document.getElementById("app-root");

function highlightNavigation(container, route) {
  container.querySelectorAll("[data-route]").forEach((button) => {
    const isActive = button.dataset.route === route;
    button.classList.toggle("bg-primary/20", isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("text-text-dark-secondary", !isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function setupNavigation(container) {
  container.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.route));
  });
}

async function renderRoute(route) {
  const screenPath = SCREEN_PATHS[route];
  const render = ROUTE_RENDERERS[route];
  if (!screenPath || !render) {
    console.warn(`Unbekannte Route: ${route}`);
    return;
  }

  const { fragment, dataset } = await loadScreenTemplate(screenPath);
  root.innerHTML = "";
  root.appendChild(fragment);
  if (dataset.page) {
    document.body.dataset.page = dataset.page;
  }

  const screenRoot = root.querySelector("[data-screen-root]") || root;
  setupNavigation(screenRoot);
  highlightNavigation(screenRoot, route);

  const contentRoot = root.querySelector("[data-screen-content]") || root;
  await render(contentRoot, { route });
}

function bootstrap() {
  onRouteChange(renderRoute);
  renderRoute(activeRoute());
}

bootstrap();
