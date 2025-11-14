import { api } from "../api.js";
import { primeTeamsCache } from "./dashboard.js";

function renderTeamCards(container, teams) {
  container.innerHTML = "";
  teams.forEach((team) => {
    const card = document.createElement("article");
    card.className = "rounded-xl border border-border-light bg-card-light p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-card dark:border-border-dark dark:bg-card-dark";
    card.dataset.teamId = team.id;
    card.innerHTML = `
      <header class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">${team.name}</h3>
        <span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">${team.level}</span>
      </header>
      <p class="mt-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">${team.focus_theme}</p>
      <dl class="mt-4 grid gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
        <div class="flex items-center justify-between"><dt>Coach</dt><dd class="font-medium text-text-light-primary dark:text-text-dark-primary">${team.coach}</dd></div>
        <div class="flex items-center justify-between"><dt>Trainingstage</dt><dd>${team.training_days}</dd></div>
        <div class="flex items-center justify-between"><dt>Athleten</dt><dd>${team.athlete_count}</dd></div>
        <div class="flex items-center justify-between"><dt>Nächste Session</dt><dd>${team.upcoming_session || "Keine geplant"}</dd></div>
      </dl>
    `;
    container.appendChild(card);
  });
}

function renderStaffList(container, teams) {
  container.innerHTML = "";
  const list = document.createElement("ul");
  list.className = "space-y-2";
  teams.forEach((team) => {
    const item = document.createElement("li");
    item.className = "flex items-center justify-between rounded-lg border border-border-light bg-background-light px-4 py-3 text-sm text-text-light-secondary dark:border-border-dark dark:bg-background-dark dark:text-text-dark-secondary";
    item.innerHTML = `
      <span class="font-medium text-text-light-primary dark:text-text-dark-primary">${team.coach}</span>
      <span>${team.name}</span>
    `;
    list.appendChild(item);
  });
  container.appendChild(list);
}

export async function renderTeams(root) {
  const teamGrid = root.querySelector("#team-grid");
  const staffList = root.querySelector("#staff-list");
  const teams = await api.getTeams();

  primeTeamsCache(teams);
  renderTeamCards(teamGrid, teams);
  renderStaffList(staffList, teams);
}
