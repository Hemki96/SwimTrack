const API_BASE = window.__SWIMTRACK_API__ || "http://localhost:8000";
const DEFAULT_TIMEOUT = 15000;

export class DomainError extends Error {
  constructor(type, message, status, details) {
    super(message);
    this.name = "DomainError";
    this.type = type;
    this.status = typeof status === "number" ? status : null;
    this.details = details;
  }
}

const JSON_MIME = "application/json";

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasHeader(headers, name) {
  const target = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === target);
}

function classifyStatus(status) {
  if (status >= 500) return "server_error";
  switch (status) {
    case 400:
      return "bad_request";
    case 401:
      return "unauthorized";
    case 403:
      return "forbidden";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "validation_error";
    default:
      return status >= 400 ? "client_error" : "unknown_error";
  }
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function parseErrorBody(response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes(JSON_MIME)) {
    const data = await parseJsonSafe(response.clone());
    if (data !== null) {
      return data;
    }
  }
  try {
    return await response.text();
  } catch (error) {
    return null;
  }
}

function extractErrorMessage(payload, fallback) {
  if (!payload) {
    return fallback;
  }
  if (typeof payload === "string") {
    return payload.trim() || fallback;
  }
  if (typeof payload.detail === "string") {
    return payload.detail;
  }
  if (typeof payload.message === "string") {
    return payload.message;
  }
  if (Array.isArray(payload.errors)) {
    const first = payload.errors.find((item) => typeof item === "string");
    if (first) {
      return first;
    }
  }
  return fallback;
}

async function buildDomainError(response) {
  const body = await parseErrorBody(response);
  const status = response.status;
  const type = classifyStatus(status);
  const message = extractErrorMessage(body, `Anfrage fehlgeschlagen (${status})`);
  return new DomainError(type, message, status, body);
}

function defaultRetryEvaluator(error) {
  if (!(error instanceof DomainError)) {
    return false;
  }
  if (error.type === "timeout" || error.type === "network_error") {
    return true;
  }
  if (typeof error.status === "number") {
    return error.status >= 500 || error.status === 429;
  }
  return false;
}

function normalizeRetryOptions(retry) {
  if (retry == null) {
    return { retries: 0, retryDelay: 300, retryOn: defaultRetryEvaluator };
  }
  if (typeof retry === "number") {
    return { retries: Math.max(0, retry), retryDelay: 300, retryOn: defaultRetryEvaluator };
  }
  const {
    retries,
    attempts,
    delay,
    retryDelay,
    retryOn,
  } = retry;
  const limit = Number.isInteger(retries)
    ? retries
    : Number.isInteger(attempts)
    ? attempts
    : 0;
  let evaluator = retryOn;
  if (Array.isArray(retryOn)) {
    const allowed = retryOn.map((value) => Number(value)).filter((value) => Number.isInteger(value));
    evaluator = (error) =>
      error instanceof DomainError && typeof error.status === "number"
        ? allowed.includes(error.status)
        : false;
  }
  if (typeof evaluator !== "function") {
    evaluator = defaultRetryEvaluator;
  }
  const normalizedDelay =
    typeof delay === "number"
      ? Math.max(0, delay)
      : typeof retryDelay === "number"
      ? Math.max(0, retryDelay)
      : 300;
  return { retries: Math.max(0, limit), retryDelay: normalizedDelay, retryOn: evaluator };
}

function wait(ms) {
  return new Promise((resolve) => {
    if (ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });
}

async function performFetch(url, options, timeout) {
  const controller = new AbortController();
  const { signal: externalSignal, ...rest } = options;
  let timeoutId = null;
  let timedOut = false;

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort(externalSignal.reason);
    } else {
      const abortHandler = () => controller.abort(externalSignal.reason);
      externalSignal.addEventListener("abort", abortHandler, { once: true });
      controller.signal.addEventListener(
        "abort",
        () => externalSignal.removeEventListener("abort", abortHandler),
        { once: true }
      );
    }
  }

  if (typeof timeout === "number" && timeout > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } catch (error) {
    if (timedOut && error && typeof error === "object") {
      error.__swimtrackTimeout = true;
    } else if (error && typeof error === "object" && error.name === "AbortError" && externalSignal?.aborted) {
      error.__swimtrackAborted = true;
    }
    throw error;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function isJsonConvertible(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  return isPlainObject(value);
}

function prepareBody(method, body, json) {
  const verb = method.toUpperCase();
  if (verb === "GET" || verb === "HEAD") {
    return { body: undefined, isJson: false };
  }
  if (json !== undefined) {
    return { body: JSON.stringify(json), isJson: true };
  }
  if (body === undefined) {
    return { body: undefined, isJson: false };
  }
  if (isJsonConvertible(body)) {
    return { body: JSON.stringify(body), isJson: true };
  }
  return { body, isJson: false };
}

function toDomainError(error) {
  if (error instanceof DomainError) {
    return error;
  }
  if (error && typeof error === "object") {
    if (error.__swimtrackTimeout) {
      return new DomainError("timeout", "Die Anfrage hat das Zeitlimit überschritten.", null, {
        cause: error,
      });
    }
    if (error.__swimtrackAborted) {
      return new DomainError("aborted", "Die Anfrage wurde abgebrochen.", null, {
        cause: error,
      });
    }
  }
  if (error && error.name === "AbortError") {
    return new DomainError("aborted", "Die Anfrage wurde abgebrochen.", null, {
      cause: error,
    });
  }
  if (error && error.name === "TypeError") {
    return new DomainError("network_error", "Netzwerkfehler während der Anfrage.", null, {
      cause: error,
    });
  }
  const message = (error && error.message) || "Unbekannter Fehler";
  return new DomainError("unknown_error", message, null, { cause: error });
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null;
  }
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes(JSON_MIME)) {
    return response.json();
  }
  return response.text();
}

async function request(path, options = {}) {
  const {
    headers: customHeaders = {},
    body,
    json,
    method = "GET",
    timeout = DEFAULT_TIMEOUT,
    retry,
    signal,
    ...rest
  } = options;

  const { body: preparedBody, isJson } = prepareBody(method, body, json);
  const headers = { Accept: JSON_MIME, ...customHeaders };
  if (
    preparedBody !== undefined &&
    preparedBody !== null &&
    (isJson || json !== undefined) &&
    !hasHeader(headers, "content-type")
  ) {
    headers["Content-Type"] = JSON_MIME;
  }

  const retryOptions = normalizeRetryOptions(retry);
  const url = `${API_BASE}${path}`;

  for (let attempt = 0; attempt <= retryOptions.retries; attempt += 1) {
    try {
      const response = await performFetch(
        url,
        {
          method,
          body: preparedBody,
          headers,
          signal,
          ...rest,
        },
        timeout
      );

      if (!response.ok) {
        throw await buildDomainError(response);
      }

      return await parseResponseBody(response);
    } catch (error) {
      const domainError = toDomainError(error);
      const shouldRetry = attempt < retryOptions.retries && retryOptions.retryOn(domainError, attempt, options);
      if (!shouldRetry) {
        throw domainError;
      }
      const delay = typeof retryOptions.retryDelay === "function"
        ? retryOptions.retryDelay(attempt, domainError)
        : retryOptions.retryDelay;
      await wait(Number(delay) || 0);
    }
  }

  throw new DomainError("unknown_error", "Anfrage konnte nach mehreren Versuchen nicht abgeschlossen werden.");
}

export const api = {
  getDashboard(options = {}) {
    const params = new URLSearchParams();
    if (options.range) {
      params.set("range", options.range);
    }
    const query = params.toString();
    return request(`/dashboard${query ? `?${query}` : ""}`);
  },
  getTeams() {
    return request("/teams");
  },
  getTeam(id) {
    return request(`/teams/${id}`);
  },
  getAthletes() {
    return request("/athletes");
  },
  getAthlete(id) {
    return request(`/athletes/${id}`);
  },
  /**
   * Fetch training sessions.
   *
   * @param {Object} [filters]
   * @param {number} [filters.teamId] Limit to a specific team.
   * @param {string} [filters.status] Limit to a specific session status.
   * @param {boolean} [filters.includeAttendance] When true, each session includes an `attendance` array
   *   with `{ id, first_name, last_name, status, note }` entries for the team's athletes.
   */
  getSessions(filters = {}) {
    const params = new URLSearchParams();
    if (filters.teamId) params.set("team_id", filters.teamId);
    if (filters.status) params.set("status", filters.status);
    if (filters.includeAttendance) params.set("with_attendance", "1");
    const query = params.toString();
    return request(`/sessions${query ? `?${query}` : ""}`);
  },
  getSession(id) {
    return request(`/sessions/${id}`);
  },
  updateSession(id, payload) {
    return request(`/sessions/${id}`, {
      method: "PATCH",
      json: payload,
    });
  },
  createSession(payload) {
    return request("/sessions", {
      method: "POST",
      json: payload,
    });
  },
  duplicateSession(id, payload) {
    return request(`/sessions/${id}/duplicate`, {
      method: "POST",
      json: payload || {},
    });
  },
  saveAttendance(id, entries) {
    return request(`/sessions/${id}/attendance`, {
      method: "POST",
      json: entries,
    });
  },
  getReports() {
    return request("/reports");
  },
  getMetrics(filters = {}) {
    const params = new URLSearchParams();
    if (filters.teamId) params.set("team_id", filters.teamId);
    if (filters.metricType) params.set("metric_type", filters.metricType);
    const query = params.toString();
    return request(`/metrics${query ? `?${query}` : ""}`);
  },
  saveNote(body) {
    return request("/notes", {
      method: "POST",
      json: { body },
    });
  },
  createTeam(payload) {
    return request("/teams", {
      method: "POST",
      json: payload,
    });
  },
  updateTeam(id, payload) {
    return request(`/teams/${id}`, {
      method: "PATCH",
      json: payload,
    });
  },
};
