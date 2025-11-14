import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { loadScreenTemplate } from '../../src/scripts/templateLoader.js';

const TEMPLATE_PATH = '/templates/dashboard.html';
const TEMPLATE_HTML = `
  <body data-view="dashboard">
    <section id="content">Dashboard</section>
  </body>
`;

describe('loadScreenTemplate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete global.fetch;
    vi.restoreAllMocks();
  });

  it('fetches and caches templates, returning cloned fragments', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      async text() {
        return TEMPLATE_HTML;
      },
    }));
    global.fetch = fetchMock;

    const first = await loadScreenTemplate(TEMPLATE_PATH);
    expect(first.dataset.view).toBe('dashboard');
    expect(first.fragment.querySelector('#content')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await loadScreenTemplate(TEMPLATE_PATH);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.fragment).not.toBe(first.fragment);
    expect(second.fragment.querySelector('#content')).not.toBeNull();
  });

  it('throws a descriptive error when the template cannot be loaded', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 404,
      async text() {
        return 'Missing';
      },
    }));
    global.fetch = fetchMock;

    await expect(loadScreenTemplate('/missing.html')).rejects.toThrow(/404/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
