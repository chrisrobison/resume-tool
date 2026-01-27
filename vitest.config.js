import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',

    // Setup files to run before tests
    setupFiles: ['./tests/setup.js'],

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        'cypress/',
        'dist/',
        '*.config.js',
        'workers/',
        'server/',
        'scripts/',
        'extension/',
        'android/',
        'ios/',
        'site/',
        'docs/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData.js',
        'tests/**',
        'test-*.js',
        'test-*.html'
      ],
      include: [
        'js/**/*.js',
        'components/**/*.js'
      ],
      // Target >70% coverage on priority modules
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70
    },

    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
    ],

    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'cypress',
      'tests/debug-*.html',
      'tests/demo-*.html',
      'tests/test-*.html',
      'tests/verify-*.html'
    ],

    // Test timeout
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Watch mode
    watch: false,

    // Reporter
    reporter: ['verbose', 'json', 'html'],

    // Output files
    outputFile: {
      json: './tests/reports/test-results.json',
      html: './tests/reports/test-results.html'
    },

    // Mock reset
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,

    // Parallel execution (Vitest 4+)
    pool: 'threads',
    poolMatchGlobs: [
      ['**/*.test.js', 'threads']
    ]
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './js'),
      '@components': resolve(__dirname, './components'),
      '@tests': resolve(__dirname, './tests'),
      '@workers': resolve(__dirname, './workers')
    }
  },

  // Define global constants for tests
  define: {
    'import.meta.vitest': 'undefined'
  }
});
