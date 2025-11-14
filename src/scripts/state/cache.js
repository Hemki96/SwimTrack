const store = new Map();

function now() {
  return Date.now();
}

function toEntry(value, options = {}) {
  const { ttl } = options;
  const expiresAt = typeof ttl === "number" && ttl > 0 ? now() + ttl : null;
  return { value, expiresAt };
}

function isExpired(entry) {
  return entry.expiresAt !== null && entry.expiresAt <= now();
}

function readEntry(key) {
  const entry = store.get(key);
  if (!entry) {
    return undefined;
  }
  if (isExpired(entry)) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function getCached(key) {
  return readEntry(key);
}

export function setCached(key, value, options = {}) {
  store.set(key, toEntry(value, options));
  return value;
}

export async function remember(key, loader, options = {}) {
  const cached = getCached(key);
  if (cached !== undefined) {
    return cached;
  }
  const value = await loader();
  return setCached(key, value, options);
}

function invalidateKey(key) {
  store.delete(key);
}

export function invalidate(key) {
  if (Array.isArray(key)) {
    key.forEach((item) => invalidateKey(item));
    return;
  }
  invalidateKey(key);
}

export function invalidateMatching(prefix) {
  const stringPrefix = String(prefix);
  for (const key of Array.from(store.keys())) {
    if (String(key).startsWith(stringPrefix)) {
      store.delete(key);
    }
  }
}

export function clearCache() {
  store.clear();
}

export function size() {
  return store.size;
}
