#!/usr/bin/env node
// Проверка внешних ссылок курса: уроки, памятки, страницы, данные и docs/sources.md. Нужна сеть, поэтому в гейт
// не входит: `npm run check:links`. Сначала обычный запрос, а что не открылось — ещё раз в настоящем браузере.
// Выход с ошибкой, если страницы нет или браузер её не откроет. Закрытые от скриптов выводятся списком.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { chromium } from '@playwright/test';

import {
  classifyBrowserError,
  classifyStatus,
  extractUrls,
  type LinkVerdict,
} from '../src/domain/links.ts';

const SOURCES = ['src', 'docs/sources.md'];
const TEXT_FILE = /\.(?:md|astro|ts)$/;
const FETCH_TIMEOUT = 20_000;
const BROWSER_TIMEOUT = 30_000;
const PARALLEL = 8;
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

interface Result {
  url: string;
  verdict: LinkVerdict;
  note: string;
}

function walk(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => walk(join(path, name)));
}

async function viaFetch(url: string): Promise<Result> {
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'ru,en;q=0.8' },
    });
    await response.body?.cancel();
    return { url, verdict: classifyStatus(response.status), note: String(response.status) };
  } catch (error) {
    const cause = error instanceof Error ? (error.cause ?? error) : error;
    return { url, verdict: 'blocked', note: String(cause).slice(0, 100) };
  }
}

/** Пускает задачи по очереди в несколько потоков и собирает результаты в исходном порядке. */
async function inParallel<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index] as T);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function recheckInBrowser(failed: Result[]): Promise<Result[]> {
  if (!failed.length) return [];
  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: 'ru-RU' });
  const results = await inParallel(failed, 3, async ({ url, note }): Promise<Result> => {
    const page = await context.newPage();
    try {
      const response = await page.goto(url, {
        timeout: BROWSER_TIMEOUT,
        waitUntil: 'domcontentloaded',
      });
      const status = response?.status() ?? 0;
      return { url, verdict: classifyStatus(status), note: `браузер ${status}, запрос ${note}` };
    } catch (error) {
      const message = error instanceof Error ? (error.message.split('\n')[0] ?? '') : '';
      return {
        url,
        verdict: classifyBrowserError(message),
        note: `браузер: ${message.slice(0, 80)}; запрос ${note}`,
      };
    } finally {
      await page.close();
    }
  });
  await browser.close();
  return results;
}

const where = new Map<string, string[]>();
for (const file of SOURCES.flatMap(walk).filter((path) => TEXT_FILE.test(path))) {
  for (const url of extractUrls(readFileSync(file, 'utf8'))) {
    where.set(url, [...(where.get(url) ?? []), file]);
  }
}

const first = await inParallel([...where.keys()], PARALLEL, viaFetch);
const passed = first.filter((result) => result.verdict === 'ok');
const final = [
  ...passed,
  ...(await recheckInBrowser(first.filter((result) => result.verdict !== 'ok'))),
];

for (const verdict of ['blocked', 'broken'] as const) {
  const list = final.filter((result) => result.verdict === verdict);
  if (list.length)
    console.log(
      verdict === 'broken' ? '\nБитые:' : '\nПроверить руками (сайт не ответил скрипту):',
    );
  for (const { url, note } of list) {
    console.log(`  ${url}\n    ${note}\n    ${(where.get(url) ?? []).join(', ')}`);
  }
}

const count = (verdict: LinkVerdict): number =>
  final.filter((result) => result.verdict === verdict).length;
console.log(
  `\nСсылок: ${final.length}, рабочих: ${count('ok')}, закрытых: ${count('blocked')}, битых: ${count('broken')}`,
);
process.exit(count('broken') ? 1 : 0);
