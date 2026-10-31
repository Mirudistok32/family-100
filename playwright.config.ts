import { defineConfig, devices } from '@playwright/test';

// Сайт проверяется собранным, как на публикации: `astro preview` с подпапкой /family-100/.
// Перед запуском нужна сборка — `npm run check:full` делает её сама.
// `--ignore-lock`: иначе из-под агента Astro уводит preview в фон, и Playwright считает, что сервер упал.
const PORT = 4329;

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run preview -- --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}/family-100/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: 'chrome', viewport: { width: 390, height: 844 } },
    },
  ],
});
