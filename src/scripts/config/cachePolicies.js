/**
 * Central cache policy configuration. Individual modules reference these keys to
 * keep time-to-live (TTL) values consistent across the application.
 */
export const CachePolicies = Object.freeze({
  DASHBOARD: { key: "dashboard", ttl: 5 * 60 * 1000 },
  DASHBOARD_TEAMS: { key: "dashboard-teams", ttl: 10 * 60 * 1000 },
  SESSIONS_COLLECTION: { key: "sessions", ttl: 60 * 1000 },
  SESSION_DETAIL: { key: "session-detail", ttl: 60 * 1000 },
  METRICS: { key: "metrics", ttl: 2 * 60 * 1000 },
  ATHLETES: { key: "athletes", ttl: 5 * 60 * 1000 },
  REPORTS: { key: "reports", ttl: 5 * 60 * 1000 },
});

/**
 * Retrieve the TTL (in milliseconds) for a specific cache policy. Falls back to
 * the provided default when the policy is unknown.
 */
export function getCacheTtl(policy, fallback = null) {
  if (!policy) {
    return fallback;
  }
  if (typeof policy === "number") {
    return policy;
  }
  if (typeof policy === "object" && typeof policy.ttl === "number") {
    return policy.ttl;
  }
  return fallback;
}
