import { fileURLToPath } from 'node:url';

import { configDefaults, defineConfig } from 'vitest/config';

// Юнит-тесты домена и хранилища. jsdom даёт localStorage и DOM.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
});
