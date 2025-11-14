const THEME_STORAGE_KEY = "swimtrack-theme";
const MEDIA_QUERY = window.matchMedia("(prefers-color-scheme: dark)");
const toggleRegistry = new Set();
let followSystemPreference = true;

function isTheme(value) {
  return value === "light" || value === "dark";
}

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch (error) {
    console.warn("Theme konnte nicht aus dem Speicher gelesen werden", error);
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn("Theme konnte nicht im Speicher abgelegt werden", error);
  }
}

function prefersDarkMode() {
  return MEDIA_QUERY.matches;
}

function updateDocumentTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  if (document.body) {
    document.body.dataset.theme = theme;
  }
}

function updateToggleEntry(entry, theme) {
  const { button, icon, label } = entry;
  button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  button.dataset.theme = theme;
  if (icon) {
    icon.textContent = theme === "dark" ? "dark_mode" : "light_mode";
  }
  if (label) {
    label.textContent = theme === "dark" ? "Dunkelmodus" : "Hellmodus";
  }
  const description = theme === "dark" ? "Dunkelmodus aktiv" : "Hellmodus aktiv";
  button.setAttribute("aria-label", `${description} – Darstellung wechseln`);
}

function updateToggleButtons(theme) {
  Array.from(toggleRegistry).forEach((entry) => {
    if (!document.contains(entry.button)) {
      toggleRegistry.delete(entry);
      return;
    }
    updateToggleEntry(entry, theme);
  });
}

export function currentTheme() {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme, { persist = true, lockUserPreference = true } = {}) {
  if (!isTheme(theme)) {
    return;
  }

  updateDocumentTheme(theme);
  updateToggleButtons(theme);

  if (persist) {
    storeTheme(theme);
  }

  followSystemPreference = !lockUserPreference && !persist;
}

function handleSystemPreferenceChange(event) {
  if (!followSystemPreference) {
    return;
  }
  setTheme(event.matches ? "dark" : "light", { persist: false, lockUserPreference: false });
}

if (typeof MEDIA_QUERY.addEventListener === "function") {
  MEDIA_QUERY.addEventListener("change", handleSystemPreferenceChange);
} else if (typeof MEDIA_QUERY.addListener === "function") {
  MEDIA_QUERY.addListener(handleSystemPreferenceChange);
}

export function applySavedTheme() {
  const storedTheme = readStoredTheme();
  if (storedTheme) {
    followSystemPreference = false;
    setTheme(storedTheme, { persist: false, lockUserPreference: true });
    return;
  }

  followSystemPreference = true;
  const systemTheme = prefersDarkMode() ? "dark" : "light";
  setTheme(systemTheme, { persist: false, lockUserPreference: false });
}

export function setupThemeToggle(root) {
  const toggles = root.querySelectorAll("[data-theme-toggle]");
  if (!toggles.length) {
    return;
  }

  toggles.forEach((button) => {
    if (button.dataset.themeToggleBound === "true") {
      updateToggleEntry({
        button,
        icon: button.querySelector("[data-theme-toggle-icon]"),
        label: button.querySelector("[data-theme-toggle-label]"),
      }, currentTheme());
      return;
    }

    const entry = {
      button,
      icon: button.querySelector("[data-theme-toggle-icon]"),
      label: button.querySelector("[data-theme-toggle-label]"),
    };

    toggleRegistry.add(entry);
    button.dataset.themeToggleBound = "true";
    button.addEventListener("click", () => {
      const nextTheme = currentTheme() === "dark" ? "light" : "dark";
      followSystemPreference = false;
      setTheme(nextTheme, { persist: true, lockUserPreference: true });
    });

    updateToggleEntry(entry, currentTheme());
  });
}
