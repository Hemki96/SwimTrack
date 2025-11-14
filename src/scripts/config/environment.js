/**
 * Global environment configuration values.
 */
export const API_BASE_URL =
  typeof window !== "undefined" && window.__SWIMTRACK_API__
    ? window.__SWIMTRACK_API__
    : "http://localhost:8000";

export const DEFAULT_REQUEST_TIMEOUT = 15_000;
