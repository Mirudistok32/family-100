import { defineConfig } from 'astro/config';

// Адрес публикации задан сразу: все ссылки и e2e-проверки с первого дня идут через подпапку,
// как на GitHub Pages. Публикация — только по отдельной просьбе (пункт 5.5 плана).
export default defineConfig({
  site: 'https://mirudistok32.github.io',
  base: '/family-100',
  trailingSlash: 'always',
  output: 'static',
  build: { format: 'directory' },
});
