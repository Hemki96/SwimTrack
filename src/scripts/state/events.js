const channels = new Map();

function ensureChannel(channel) {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  return channels.get(channel);
}

export function publish(channel, payload) {
  const listeners = channels.get(channel);
  if (!listeners || listeners.size === 0) {
    return;
  }
  for (const entry of Array.from(listeners)) {
    try {
      entry.handler(payload);
    } catch (error) {
      // Surface listener errors without interrupting other listeners.
      console.error(`State subscriber for "${channel}" failed`, error);
    }
    if (entry.once) {
      listeners.delete(entry);
    }
  }
  if (listeners.size === 0) {
    channels.delete(channel);
  }
}

export function subscribe(channel, handler, options = {}) {
  if (typeof handler !== "function") {
    throw new TypeError("Expected handler to be a function");
  }
  const listeners = ensureChannel(channel);
  const entry = { handler, once: Boolean(options.once) };
  listeners.add(entry);
  return () => {
    listeners.delete(entry);
    if (listeners.size === 0) {
      channels.delete(channel);
    }
  };
}

export function once(channel, handler) {
  return subscribe(channel, handler, { once: true });
}

export function resetChannels() {
  channels.clear();
}
