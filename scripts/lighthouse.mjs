#!/usr/bin/env node
// Lighthouse по собранному сайту: `npm run build && npm run lighthouse [-- /путь/ /путь/]`.
// Поднимает `astro preview`, по каждой странице печатает оценки, отчёты кладёт в .lighthouse/.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';

const PORT = 4330;
const BASE = `http://localhost:${PORT}/family-100`;
const LIGHTHOUSE = 'lighthouse@13.6.0';
const paths = process.argv.slice(2);
const targets = paths.length ? paths : ['/'];

mkdirSync('.lighthouse', { recursive: true });
const server = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--ignore-lock'], {
  stdio: 'ignore',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/`);
      if (response.ok) return;
    } catch {
      // Сервер ещё не поднялся.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('astro preview не ответил за 30 секунд');
}

let failed = false;
try {
  await waitForServer();
  for (const [index, path] of targets.entries()) {
    const output = `.lighthouse/report-${index}.json`;
    const result = spawnSync(
      'npx',
      [
        '--yes',
        LIGHTHOUSE,
        `${BASE}${path}`,
        '--quiet',
        '--output=json',
        `--output-path=${output}`,
        '--chrome-flags=--headless=new',
      ],
      { stdio: 'inherit' },
    );
    if (result.status !== 0) {
      failed = true;
      continue;
    }
    const { categories } = JSON.parse(readFileSync(output, 'utf8'));
    const scores = Object.values(categories)
      .map(({ title, score }) => `${title} ${Math.round(score * 100)}`)
      .join(', ');
    console.log(`${path}: ${scores}`);
  }
} finally {
  server.kill();
}
process.exit(failed ? 1 : 0);
