import { describe, it, expect } from 'vitest';
import {
  CachePolicies,
  getCacheTtl,
} from '../../../src/scripts/config/cachePolicies.js';

describe('cache policy configuration', () => {
  it('provides frozen cache policy metadata', () => {
    expect(CachePolicies.DASHBOARD).toMatchObject({ key: 'dashboard', ttl: 5 * 60 * 1000 });
    expect(Object.isFrozen(CachePolicies)).toBe(true);
  });

  it('resolves TTLs from objects or numbers with sensible fallbacks', () => {
    expect(getCacheTtl(CachePolicies.SESSIONS_COLLECTION)).toBe(60 * 1000);
    expect(getCacheTtl(42)).toBe(42);
    expect(getCacheTtl(null, 1234)).toBe(1234);
    expect(getCacheTtl({ ttl: 99 })).toBe(99);
  });
});
