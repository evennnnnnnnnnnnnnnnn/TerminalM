import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['src/main/__tests__/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/main/**/*.js'],
      exclude: ['src/main/__tests__/**'],
    },
  },
});
