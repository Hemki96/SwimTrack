export function renderSettings(root) {
  const form = root.querySelector("#settings-form");
  if (!form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const feedback = document.createElement("p");
    feedback.className = "col-span-2 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-success";
    feedback.textContent = "Einstellungen gespeichert (lokal).";
    form.appendChild(feedback);
    setTimeout(() => feedback.remove(), 3000);
  });
}
