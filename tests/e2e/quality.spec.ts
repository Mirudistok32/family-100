import { readdirSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { findBannedTopic } from '../../src/domain/content-rules.ts';

// Аудит качества (пункт 5.2) по всем собранным страницам. Список берём из dist,
// поэтому новая страница не выпадет из проверки. Перед запуском нужна сборка.
const ROUTES = readdirSync('dist', { recursive: true, encoding: 'utf8' })
  .filter((file) => file.endsWith('index.html'))
  .map((file) => `/family-100/${file.replace(/index\.html$/, '')}`)
  .sort();

// Страницы с разными видами управления: меню, формы, инструменты, раскрывающиеся блоки.
const KEYBOARD_ROUTES = [
  '/family-100/',
  '/family-100/day/1/',
  '/family-100/day/4/',
  '/family-100/day/5/',
  '/family-100/my-family/',
  '/family-100/memos/',
  '/family-100/ethics/',
  '/family-100/finish/',
];

test('список страниц собран из dist', () => {
  expect(ROUTES.length).toBeGreaterThanOrEqual(20);
});

for (const route of ROUTES) {
  test(`${route}: нет нарушений axe в светлой и тёмной теме`, async ({ page }) => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto(route);
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations, `тема ${colorScheme}`).toEqual([]);
    }
  });

  test(`${route}: один h1, заголовки без пропуска уровней, есть main`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'структура не зависит от размера экрана');
    await page.goto(route);
    const levels = await page
      .locator('h1, h2, h3, h4, h5, h6')
      .evaluateAll((items) =>
        items
          .filter((item) => (item as HTMLElement).checkVisibility())
          .map((item) => Number(item.tagName[1])),
      );
    expect(levels[0]).toBe(1);
    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    const jumps = levels.filter(
      (level, index) => index > 0 && level - (levels[index - 1] ?? 0) > 1,
    );
    expect(jumps, `уровни: ${levels.join(' ')}`).toEqual([]);
    await expect(page.locator('main')).toHaveCount(1);
  });

  test(`${route}: при масштабе 200 % и 400 % нет прокрутки вбок`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'масштаб считаем от экрана 1280×800');
    await page.goto(route);
    for (const viewport of [
      { width: 640, height: 400 },
      { width: 320, height: 256 },
    ]) {
      await page.setViewportSize(viewport);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `ширина ${viewport.width}`).toBeLessThanOrEqual(0);
    }
  });
}

for (const route of KEYBOARD_ROUTES) {
  test(`${route}: Tab проходит все элементы, фокус не застревает и виден`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'клавиатура проверяется на большом экране');
    await page.goto(route);
    const total = await page.evaluate(() => {
      const items = [
        ...document.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, summary, [tabindex]',
        ),
      ].filter(
        (item) =>
          item.tabIndex >= 0 &&
          !item.matches(':disabled') &&
          item.checkVisibility({ visibilityProperty: true }),
      );
      // Группу радиокнопок Tab проходит за один шаг.
      const groups = new Set<string>();
      return items.filter((item) => {
        if (!(item instanceof HTMLInputElement) || item.type !== 'radio') return true;
        if (groups.has(item.name)) return false;
        groups.add(item.name);
        return true;
      }).length;
    });
    expect(total).toBeGreaterThan(0);

    for (let step = 0; step < total; step += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const item = document.activeElement as HTMLElement;
        const style = getComputedStyle(item);
        const key = `${item.tagName}|${item.id}|${item.getAttribute('href') ?? ''}|${item.textContent?.slice(0, 40) ?? ''}`;
        const ring =
          (style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0) ||
          style.boxShadow !== 'none';
        // Отметка на самом элементе: второй заход на него значит, что фокус пошёл по кругу.
        const seenIndex = Number(item.dataset.qaSeen ?? 0);
        item.dataset.qaSeen = String(seenIndex + 1);
        return { key, ring, isBody: item === document.body, repeat: seenIndex > 0 };
      });
      expect(focus.isBody, `шаг ${step}: фокус потерян`).toBe(false);
      expect(focus.repeat, `шаг ${step}: фокус вернулся на ${focus.key}`).toBe(false);
      expect(focus.ring, `шаг ${step}: не виден фокус на ${focus.key}`).toBe(true);
    }
  });
}

for (const route of ROUTES) {
  test(`${route}: нет тем, которых в курсе быть не должно`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'текст не зависит от размера экрана');
    await page.goto(route);
    const text = await page.locator('body').innerText();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(findBannedTopic(`${text}\n${description ?? ''}`)).toBeUndefined();
  });

  test(`${route}: в тексте нет двойной точки и двойной запятой`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'текст не зависит от размера экрана');
    await page.goto(route);
    const text = await page.locator('main').innerText();
    // Многоточие разрешено, поэтому ищем ровно две точки подряд.
    expect(text.match(/(?<!\.)\.\.(?!\.)|,,/g)).toBeNull();
  });
}

test('экранный чтец различает переключатели сохранения', async ({ page }) => {
  await page.goto('/family-100/my-family/');
  const names = await page
    .locator('input[data-note-keep]')
    .evaluateAll((items) => items.map((item) => item.getAttribute('aria-label') ?? ''));
  expect(names.length).toBeGreaterThan(1);
  expect(new Set(names).size).toBe(names.length);
  // Видимая подпись остаётся в начале имени: голосовое управление находит её по этим словам.
  for (const name of names) expect(name.startsWith('Сохранять эту запись: ')).toBe(true);
});

test('урок печатается без меню и тёмного фона', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'печать не зависит от размера экрана');
  await page.emulateMedia({ colorScheme: 'dark', media: 'print' });
  await page.goto('/family-100/day/1/');
  await expect(page.locator('.site-header, header').first()).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(['rgb(255, 255, 255)', 'rgba(0, 0, 0, 0)']).toContain(background);
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
  expect(pdf.length).toBeGreaterThan(1000);
});
