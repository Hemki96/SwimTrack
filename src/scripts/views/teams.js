import { api } from "../api.js";
import { publish } from "../state.js";
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

function createTeamFormDialog(root) {
  let dialog;
  let form;
  let feedback;

  function ensureDialog() {
    if (dialog && root.contains(dialog)) {
      return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.id = "team-create-dialog";
    dialog.className =
      "dialog fixed inset-0 h-fit w-full max-w-lg rounded-2xl border border-border-light bg-card-light/95 p-0 text-left shadow-card backdrop:bg-black/50 backdrop:backdrop-blur dark:border-border-dark dark:bg-card-dark/95";
    dialog.innerHTML = `
      <form id="team-create-form" class="flex flex-col gap-6 p-6">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold leading-tight">Neue Mannschaft</h2>
            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">Stammdaten für das Team erfassen</p>
          </div>
          <button type="button" class="size-10 rounded-full bg-card-light text-text-light-secondary transition hover:bg-zinc-100 dark:bg-card-dark dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]" data-action="close-team-dialog">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div class="grid gap-4">
          <label class="flex flex-col gap-2 text-sm">
            <span>Name</span>
            <input name="name" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Jugend A" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Kurzname</span>
            <input name="short_name" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. JA" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Leistungsstufe</span>
            <input name="level" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Landesliga" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Coach</span>
            <input name="coach" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Maria Beispiel" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Trainingstage</span>
            <input name="training_days" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Mo, Mi, Fr" />
          </label>
          <label class="flex flex-col gap-2 text-sm">
            <span>Fokus</span>
            <input name="focus_theme" type="text" required class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" placeholder="z. B. Technik &amp; Sprint" />
          </label>
        </div>
        <p id="team-create-feedback" class="text-xs text-text-light-secondary dark:text-text-dark-secondary"></p>
        <footer class="flex items-center justify-end gap-3">
          <button type="button" data-action="close-team-dialog" class="rounded-lg px-4 py-2 text-sm font-medium text-text-light-secondary transition hover:bg-zinc-100 dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]">Abbrechen</button>
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90">Team anlegen</button>
        </footer>
      </form>
    `;
    root.appendChild(dialog);
    form = dialog.querySelector("#team-create-form");
    feedback = dialog.querySelector("#team-create-feedback");
    dialog.querySelectorAll('[data-action="close-team-dialog"]').forEach((button) =>
      button.addEventListener("click", () => dialog.close())
    );
    dialog.addEventListener("close", () => {
      form.reset();
      if (feedback) {
        feedback.textContent = "";
        feedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
      }
    });
    return dialog;
  }

  return {
    open(onSubmit) {
      const dlg = ensureDialog();
      if (!form) return;
      form.onsubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const payload = {
          name: String(formData.get("name") || "").trim(),
          short_name: String(formData.get("short_name") || "").trim(),
          level: String(formData.get("level") || "").trim(),
          coach: String(formData.get("coach") || "").trim(),
          training_days: String(formData.get("training_days") || "").trim(),
          focus_theme: String(formData.get("focus_theme") || "").trim(),
        };
        if (Object.values(payload).some((value) => !value)) {
          feedback.textContent = "Bitte alle Felder ausfüllen.";
          feedback.className = "text-xs text-danger";
          return;
        }
        try {
          await onSubmit(payload);
          feedback.textContent = "Team erstellt.";
          feedback.className = "text-xs text-success";
          setTimeout(() => dlg.close(), 600);
        } catch (error) {
          console.error(error);
          feedback.textContent = "Speichern fehlgeschlagen.";
          feedback.className = "text-xs text-danger";
        }
      };
      dlg.showModal();
    },
  };
}

function createStaffDialog(root) {
  let dialog;
  let form;
  let feedback;

  function ensureDialog() {
    if (dialog && root.contains(dialog)) {
      return dialog;
    }
    dialog = document.createElement("dialog");
    dialog.id = "team-staff-dialog";
    dialog.className =
      "dialog fixed inset-0 h-fit w-full max-w-3xl rounded-2xl border border-border-light bg-card-light/95 p-0 text-left shadow-card backdrop:bg-black/50 backdrop:backdrop-blur dark:border-border-dark dark:bg-card-dark/95";
    dialog.innerHTML = `
      <form id="team-staff-form" class="flex flex-col gap-6 p-6">
        <header class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold leading-tight">Staff-Zuordnungen</h2>
            <p class="text-sm text-text-light-secondary dark:text-text-dark-secondary">Coaches und Trainingstage anpassen</p>
          </div>
          <button type="button" class="size-10 rounded-full bg-card-light text-text-light-secondary transition hover:bg-zinc-100 dark:bg-card-dark dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]" data-action="close-staff-dialog">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>
        <div id="team-staff-entries" class="grid gap-4"></div>
        <p id="team-staff-feedback" class="text-xs text-text-light-secondary dark:text-text-dark-secondary"></p>
        <footer class="flex items-center justify-end gap-3">
          <button type="button" data-action="close-staff-dialog" class="rounded-lg px-4 py-2 text-sm font-medium text-text-light-secondary transition hover:bg-zinc-100 dark:text-text-dark-secondary dark:hover:bg-[#2a3f53]">Abbrechen</button>
          <button type="submit" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-card transition hover:-translate-y-0.5 hover:bg-primary/90">Änderungen speichern</button>
        </footer>
      </form>
    `;
    root.appendChild(dialog);
    form = dialog.querySelector("#team-staff-form");
    feedback = dialog.querySelector("#team-staff-feedback");
    dialog.querySelectorAll('[data-action="close-staff-dialog"]').forEach((button) =>
      button.addEventListener("click", () => dialog.close())
    );
    dialog.addEventListener("close", () => {
      if (feedback) {
        feedback.textContent = "";
        feedback.className = "text-xs text-text-light-secondary dark:text-text-dark-secondary";
      }
    });
    return dialog;
  }

  function populateEntries(teams) {
    const container = form.querySelector("#team-staff-entries");
    container.innerHTML = "";
    teams.forEach((team) => {
      const block = document.createElement("section");
      block.className = "rounded-xl border border-border-light bg-background-light p-4 dark:border-border-dark dark:bg-background-dark";
      block.innerHTML = `
        <h3 class="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">${team.name}</h3>
        <div class="mt-3 grid gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1 text-sm">
            <span>Coach</span>
            <input name="coach-${team.id}" type="text" value="${team.coach}" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" />
          </label>
          <label class="flex flex-col gap-1 text-sm">
            <span>Trainingstage</span>
            <input name="days-${team.id}" type="text" value="${team.training_days}" class="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm dark:border-border-dark" />
          </label>
        </div>
      `;
      container.appendChild(block);
    });
  }

  return {
    open(teams, onSubmit) {
      const dlg = ensureDialog();
      if (!form) return;
      populateEntries(teams);
      form.onsubmit = async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const updates = teams.map((team) => ({
          id: team.id,
          coach: String(formData.get(`coach-${team.id}`) || "").trim(),
          training_days: String(formData.get(`days-${team.id}`) || "").trim(),
        }));
        try {
          await onSubmit(updates);
          feedback.textContent = "Zuordnungen aktualisiert.";
          feedback.className = "text-xs text-success";
          setTimeout(() => dlg.close(), 600);
        } catch (error) {
          console.error(error);
          feedback.textContent = "Aktualisierung fehlgeschlagen.";
          feedback.className = "text-xs text-danger";
        }
      };
      dlg.showModal();
    },
  };
}

export async function renderTeams(root) {
  const teamGrid = root.querySelector("#team-grid");
  const staffList = root.querySelector("#staff-list");
  const createButton = root.querySelector('[data-action="create-team"]');
  const staffButton = root.querySelector('[data-action="manage-staff"]');
  const teamFormDialog = createTeamFormDialog(root);
  const staffDialog = createStaffDialog(root);

  let teamList = await api.getTeams();

  function refreshTeamsDisplay() {
    primeTeamsCache(teamList);
    renderTeamCards(teamGrid, teamList);
    renderStaffList(staffList, teamList);
  }

  refreshTeamsDisplay();

  if (createButton) {
    createButton.addEventListener("click", () => {
      teamFormDialog.open(async (payload) => {
        await api.createTeam(payload);
        publish("teams/updated", { action: "create" });
        teamList = await api.getTeams();
        refreshTeamsDisplay();
      });
    });
  }

  if (staffButton) {
    staffButton.addEventListener("click", () => {
      staffDialog.open(teamList, async (updates) => {
        await Promise.all(
          updates.map((entry) =>
            api.updateTeam(entry.id, {
              coach: entry.coach,
              training_days: entry.training_days,
            })
          )
        );
        publish("teams/updated", { action: "update" });
        teamList = await api.getTeams();
        refreshTeamsDisplay();
      });
    });
  }
}
