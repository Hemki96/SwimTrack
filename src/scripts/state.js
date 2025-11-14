const cache = new Map();

export function getCached(key) {
  return cache.get(key);
}

export function setCached(key, value) {
  cache.set(key, value);
  return value;
}

export function invalidate(key) {
  if (Array.isArray(key)) {
    key.forEach((item) => cache.delete(item));
  } else {
    cache.delete(key);
  }
}

export function clearCache() {
  cache.clear();
}

export function invalidateMatching(prefix) {
  for (const key of cache.keys()) {
    if (String(key).startsWith(prefix)) {
      cache.delete(key);
    }
  }
}
