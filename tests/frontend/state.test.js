import { describe, it, beforeEach, expect } from 'vitest';
import {
  getCached,
  setCached,
  invalidate,
  invalidateMatching,
  clearCache,
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
});
