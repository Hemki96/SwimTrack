/**
 * Canonical event channel names used throughout the application. Centralizing
 * the strings reduces the likelihood of typos and makes refactors easier.
 */
export const Channels = Object.freeze({
  SESSIONS_UPDATED: "sessions/updated",
  TEAMS_UPDATED: "teams/updated",
  ATHLETES_UPDATED: "athletes/updated",
  METRICS_UPDATED: "metrics/updated",
});
