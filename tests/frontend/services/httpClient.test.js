import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createHttpClient,
  DomainError,
} from '../../../src/scripts/services/httpClient.js';
import { createApi } from '../../../src/scripts/services/api/index.js';

describe('http client', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('performs JSON requests relative to the configured base URL', async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      expect(url).toBe('https://api.example.com/teams');
      expect(options.method).toBe('POST');
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.body).toBe(JSON.stringify({ name: 'Team' }));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const result = await client.request('/teams', {
      method: 'POST',
      json: { name: 'Team' },
    });
    expect(result).toEqual({ ok: true });
  });

  it('wraps failed requests in a DomainError with the correct metadata', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ detail: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    await expect(client.request('/missing')).rejects.toMatchObject({
      type: 'not_found',
      status: 404,
      message: 'Not found',
    });
  });

  it('omits bodies for GET requests even when JSON payload is provided', async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      expect(options.method).toBe('GET');
      expect(options.body).toBeUndefined();
      expect(options.headers['Content-Type']).toBeUndefined();
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const result = await client.request('/teams', {
      json: { ignored: true },
    });
    expect(result).toEqual({ ok: true });
  });

  it('stringifies plain object bodies and preserves explicit headers', async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      expect(options.body).toBe(JSON.stringify({ key: 'value' }));
      expect(options.headers['Content-Type']).toBe('application/custom');
      return new Response('ok', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    });

    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const result = await client.request('/custom', {
      method: 'PUT',
      body: { key: 'value' },
      headers: {
        'Content-Type': 'application/custom',
      },
    });
    expect(result).toBe('ok');
  });

  it('parses empty responses as null', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const result = await client.request('/no-content');
    expect(result).toBeNull();
  });

  it('wraps AbortErrors from external signals as DomainError', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetchImpl = vi.fn(
      () =>
        new Promise((resolve, reject) => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          setTimeout(() => reject(error), 0);
        })
    );

    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const pending = client.request('/abort', { signal: controller.signal });
    const expectation = expect(pending).rejects.toMatchObject({ type: 'aborted' });
    controller.abort();
    await vi.runAllTimersAsync();
    await expectation;
  });

  it('converts timeouts into DomainError with timeout type', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(
      (url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => {
            const error = new Error('timeout');
            error.name = 'AbortError';
            reject(error);
          });
        })
    );

    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl, timeout: 1000 });
    const pending = client.request('/timeout');
    const expectation = expect(pending).rejects.toMatchObject({ type: 'timeout' });
    await vi.advanceTimersByTimeAsync(1000);
    await expectation;
  });

  it('retries failed requests according to retry options', async () => {
    const responses = [
      new Response('error', { status: 500 }),
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    ];
    const fetchImpl = vi.fn(async () => {
      const response = responses.shift();
      if (!response) {
        throw new Error('unexpected call');
      }
      return response;
    });

    const retryOn = vi.fn(() => true);
    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    const promise = client.request('/retry', {
      retry: { retries: 1, retryDelay: 0, retryOn },
    });
    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(retryOn).toHaveBeenCalledWith(expect.any(DomainError), 0, expect.objectContaining({ retry: expect.any(Object) }));
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('propagates network failures as DomainError instances', async () => {
    const networkError = new TypeError('network down');
    const fetchImpl = vi.fn(async () => {
      throw networkError;
    });

    const client = createHttpClient({ baseUrl: 'https://api.example.com', fetchImpl });
    await expect(client.request('/network')).rejects.toBeInstanceOf(DomainError);
    await expect(client.request('/network')).rejects.toMatchObject({ type: 'network_error' });
  });
});

describe('api endpoint map', () => {
  it('delegates calls to the provided request implementation', async () => {
    const request = vi.fn().mockResolvedValue({});
    const api = createApi({ request });

    await api.getTeams();
    expect(request).toHaveBeenCalledWith('/teams');

    await api.createSession({ title: 'Swim' });
    expect(request).toHaveBeenCalledWith('/sessions', {
      method: 'POST',
      json: { title: 'Swim' },
    });
  });

  it('applies query parameters for optional dashboard range', async () => {
    const request = vi.fn().mockResolvedValue({});
    const api = createApi({ request });

    await api.getDashboard({ range: '7d' });
    expect(request).toHaveBeenCalledWith('/dashboard?range=7d');
  });

  it('serializes session filters into query parameters', async () => {
    const request = vi.fn().mockResolvedValue({});
    const api = createApi({ request });

    await api.getSessions({ teamId: 4, status: 'draft', includeAttendance: true });
    expect(request).toHaveBeenCalledWith('/sessions?team_id=4&status=draft&with_attendance=1');
  });

  it('serializes metric filters into query parameters', async () => {
    const request = vi.fn().mockResolvedValue({});
    const api = createApi({ request });

    await api.getMetrics({ teamId: 9, metricType: 'pace' });
    expect(request).toHaveBeenCalledWith('/metrics?team_id=9&metric_type=pace');
  });
});
