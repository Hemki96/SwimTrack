import { API_BASE_URL } from "../../config/environment.js";
import { createHttpClient } from "../httpClient.js";

function createEndpointMap(request) {
  return {
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
}

export function createApi(options = {}) {
  const client =
    typeof options.request === "function" ? options : createHttpClient(options);
  const request = client.request ?? client;
  return createEndpointMap(request);
}

export const api = createApi({ baseUrl: API_BASE_URL });
