import { api } from "../api.js";
import { primeTeamsCache } from "./dashboard.js";

function renderTeamCards(container, teams) {
  container.innerHTML = "";
  teams.forEach((team) => {
    const card = document.createElement("article");
    card.className = "team-card";
    card.dataset.teamId = team.id;
    card.innerHTML = `
      <header>
        <h3>${team.name}</h3>
        <span class="team-card__badge">${team.level}</span>
      </header>
      <p>${team.focus_theme}</p>
      <dl>
        <div><dt>Coach</dt><dd>${team.coach}</dd></div>
        <div><dt>Trainingstage</dt><dd>${team.training_days}</dd></div>
        <div><dt>Athleten</dt><dd>${team.athlete_count}</dd></div>
        <div><dt>Nächste Session</dt><dd>${team.upcoming_session || "Keine geplant"}</dd></div>
      </dl>
    `;
    container.appendChild(card);
  });
}

function renderStaffList(container, teams) {
  container.innerHTML = "";
  const list = document.createElement("ul");
  list.className = "staff-list__items";
  teams.forEach((team) => {
    const item = document.createElement("li");
    item.innerHTML = `
      <span>${team.coach}</span>
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
