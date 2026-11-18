import { defineConfig } from 'vitest/config';

// base './' keeps asset paths relative so the build works at
// https://<user>.github.io/<repo>/ without hard-coding the repo name.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
