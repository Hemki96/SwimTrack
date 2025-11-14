import { afterEach } from 'vitest';

afterEach(() => {
  if (typeof global.fetch === 'function' && 'mockClear' in global.fetch) {
    global.fetch.mockClear();
  }
});
