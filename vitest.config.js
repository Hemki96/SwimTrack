import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: 'tests/frontend/setupTests.js',
    include: ['tests/frontend/**/*.test.js'],
    exclude: ['tests/backend/**', 'tests/api.test.js', 'tests/services.test.js'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
});
