const API_BASE = window.__SWIMTRACK_API__ || "http://localhost:8000";

async function request(path, options = {}) {
  const {
    headers: customHeaders = {},
    body,
    method = "GET",
    ...rest
  } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    body,
    headers: {
      ...(method !== "GET" || body != null
        ? { "Content-Type": "application/json" }
        : {}),
      ...customHeaders,
    },
    ...rest,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
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
      body: JSON.stringify(payload),
    });
  },
  createSession(payload) {
    return request("/sessions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  duplicateSession(id, payload) {
    return request(`/sessions/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },
  saveAttendance(id, entries) {
    return request(`/sessions/${id}/attendance`, {
      method: "POST",
      body: JSON.stringify(entries),
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
      body: JSON.stringify({ body }),
    });
  },
  createTeam(payload) {
    return request("/teams", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateTeam(id, payload) {
    return request(`/teams/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },
};
