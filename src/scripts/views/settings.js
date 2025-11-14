export function renderSettings(root) {
  const form = root.querySelector("#settings-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const feedback = document.createElement("p");
    feedback.className = "form-feedback";
    feedback.textContent = "Einstellungen gespeichert (lokal).";
    form.appendChild(feedback);
    setTimeout(() => feedback.remove(), 3000);
  });
}
