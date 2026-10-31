import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import { rehypeBaseLinks } from './src/lib/rehype-base-links.mjs';
import { rehypeLessonBlocks } from './src/lib/rehype-lesson-blocks.mjs';

const BASE = '/family-100';

// Адрес публикации задан сразу: все ссылки и e2e-проверки с первого дня идут через подпапку,
// как на GitHub Pages. Публикация — только по отдельной просьбе (пункт 5.5 плана).
export default defineConfig({
  site: 'https://mirudistok32.github.io',
  base: BASE,
  trailingSlash: 'always',
  output: 'static',
  // Сжатие убирает пробел, если Prettier перенёс ссылку на новую строку: «Подробнее —на странице».
  compressHTML: false,
  build: { format: 'directory' },
  integrations: [sitemap()],
  markdown: {
    processor: unified({ rehypePlugins: [rehypeLessonBlocks, [rehypeBaseLinks, { base: BASE }]] }),
  },
  // На GitHub Pages нельзя задать заголовки, поэтому CSP приходит в теге meta с хешами скриптов и стилей.
  security: { csp: true },
});
