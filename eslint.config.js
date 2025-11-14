const nodeGlobals = {
  module: 'readonly',
  require: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  exports: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  global: 'readonly',
  console: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  AbortController: 'readonly',
  Intl: 'readonly',
  Response: 'readonly',
};

const browserGlobals = {
  window: 'readonly',
  document: 'readonly',
  DOMParser: 'readonly',
  navigator: 'readonly',
  fetch: 'readonly',
  console: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  localStorage: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  performance: 'readonly',
  AbortController: 'readonly',
  Intl: 'readonly',
  Response: 'readonly',
  global: 'readonly',
};

module.exports = [
  {
    ignores: ['node_modules/', 'coverage/', 'dist/', 'tests/tmp/'],
  },
  {
    files: ['backend/**/*.js', 'tests/api.test.js', 'tests/backend/**/*.js', 'tests/helpers/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },
  {
    files: ['tests/frontend/**/*.js', 'vitest.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      'no-undef': 'error',
    },
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-unused-vars': ['warn', { args: 'none', ignoreRestSiblings: true }],
      'no-undef': 'error',
    },
  },
];
