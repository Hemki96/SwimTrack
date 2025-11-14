import { describe, it, beforeEach, expect, vi } from 'vitest';
import {
  getCached,
  setCached,
  invalidate,
  invalidateMatching,
  clearCache,
  remember,
  Channels,
} from '../../src/scripts/state.js';

describe('state cache helpers', () => {
  beforeEach(() => {
    clearCache();
  });

  it('stores and retrieves cached values', () => {
    expect(getCached('missing')).toBeUndefined();
    setCached('key', { value: 42 });
    expect(getCached('key')).toEqual({ value: 42 });
  });

  it('invalidates individual cache keys', () => {
    setCached('one', 1);
    setCached('two', 2);
    invalidate('one');
    expect(getCached('one')).toBeUndefined();
    expect(getCached('two')).toBe(2);
  });

  it('invalidates multiple keys at once', () => {
    setCached('a', 'x');
    setCached('b', 'y');
    invalidate(['a', 'b']);
    expect(getCached('a')).toBeUndefined();
    expect(getCached('b')).toBeUndefined();
  });

  it('invalidates entries matching a prefix', () => {
    setCached('team:1', {});
    setCached('team:2', {});
    setCached('athlete:1', {});
    invalidateMatching('team:');
    expect(getCached('team:1')).toBeUndefined();
    expect(getCached('team:2')).toBeUndefined();
    expect(getCached('athlete:1')).toEqual({});
  });

  it('memoizes async loaders via remember', async () => {
    const loader = vi.fn(async () => 'value');
    expect(await remember('remember:test', loader)).toBe('value');
    expect(loader).toHaveBeenCalledTimes(1);
    expect(await remember('remember:test', loader)).toBe('value');
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('expires remembered values after TTL', async () => {
    vi.useFakeTimers();
    try {
      let counter = 0;
      const loader = vi.fn(async () => {
        counter += 1;
        return counter;
      });
      expect(await remember('ttl:test', loader, { ttl: 1_000 })).toBe(1);
      expect(loader).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(500);
      expect(await remember('ttl:test', loader, { ttl: 1_000 })).toBe(1);
      expect(loader).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(600);
      expect(await remember('ttl:test', loader, { ttl: 1_000 })).toBe(2);
      expect(loader).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('exposes canonical channel names', () => {
    expect(Channels.SESSIONS_UPDATED).toBe('sessions/updated');
    expect(Channels.TEAMS_UPDATED).toBe('teams/updated');
  });
});
