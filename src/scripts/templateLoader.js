const parser = new DOMParser();
const templateCache = new Map();

function createTemplateFromBody(body) {
  const template = document.createElement("template");
  template.innerHTML = body.innerHTML;
  return { template, dataset: { ...body.dataset } };
}

export async function loadScreenTemplate(path) {
  if (!templateCache.has(path)) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Vorlage ${path} konnte nicht geladen werden (${response.status})`);
    }
    const html = await response.text();
    const documentFragment = parser.parseFromString(html, "text/html");
    const entry = createTemplateFromBody(documentFragment.body);
    templateCache.set(path, entry);
  }
  const { template, dataset } = templateCache.get(path);
  return { fragment: template.content.cloneNode(true), dataset };
}
