import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: 'tests/frontend/setupTests.js',
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
