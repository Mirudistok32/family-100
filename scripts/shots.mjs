#!/usr/bin/env node
// Снимки собранных страниц: 390 и 1280 px, светлая и тёмная темы. Кладёт в .shots/.
// Отмечает ошибки консоли и горизонтальную прокрутку. Запуск: npm run build && npm run shots [-- фильтр].
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { chromium } from '@playwright/test';

const PORT = 4331;
const BASE = `http://localhost:${PORT}/family-100`;
const filter = process.argv[2] ?? '';
const SIZES = [
  { width: 390, height: 844 },
  { width: 1280, height: 800 },
];
const THEMES = ['light', 'dark'];

function pages(dir = 'dist') {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return pages(path);
    if (name !== 'index.html') return [];
    return [`/${relative('dist', dir).replaceAll('\\', '/')}${dir === 'dist' ? '' : '/'}`];
  });
}

mkdirSync('.shots', { recursive: true });
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--ignore-lock'], {
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${BASE}/`)).ok) return;
    } catch {
      // Сервер ещё не поднялся.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('astro preview не ответил за 30 секунд');
}

const problems = [];
const browser = await chromium.launch({ channel: 'chrome' });
try {
  await waitForServer();
  const targets = pages().filter((path) => path.includes(filter));
  for (const path of targets) {
    for (const viewport of SIZES) {
      for (const colorScheme of THEMES) {
        const context = await browser.newContext({ viewport, colorScheme });
        const page = await context.newPage();
        page.on('console', (message) => {
          if (message.type() === 'error') problems.push(`${path}: ${message.text()}`);
        });
        page.on('pageerror', (error) => problems.push(`${path}: ${error.message}`));
        await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        if (overflow > 0)
          problems.push(`${path} ${viewport.width}px: прокрутка вбок на ${overflow}px`);
        const name = path.replaceAll('/', '_').replace(/^_|_$/g, '') || 'home';
        await page.screenshot({
          path: `.shots/${name}-${viewport.width}-${colorScheme}.png`,
          fullPage: true,
        });
        await context.close();
      }
    }
  }
  console.log(
    `Страниц: ${targets.length}, снимков: ${targets.length * SIZES.length * THEMES.length}`,
  );
} finally {
  await browser.close();
  server.kill();
}
for (const problem of problems) console.error(problem);
process.exit(problems.length ? 1 : 0);
