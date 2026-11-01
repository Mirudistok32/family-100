import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BASE = '/family-100';
const PAGES = [
  `${BASE}/`,
  `${BASE}/about/`,
  `${BASE}/day/1/`,
  `${BASE}/day/2/`,
  `${BASE}/day/3/`,
  `${BASE}/day/4/`,
  `${BASE}/day/5/`,
  `${BASE}/day/6/`,
  `${BASE}/day/7/`,
  `${BASE}/my-family/`,
  `${BASE}/ethics/`,
  `${BASE}/finish/`,
];

for (const path of PAGES) {
  test(`${path}: нет нарушений axe и прокрутки вбок`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('с клавиатуры: сначала ссылка «К содержанию», она переводит фокус на контент', async ({
  page,
}) => {
  await page.goto(`${BASE}/`);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'К содержанию' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('с клавиатуры можно перейти с главной на день 1', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.getByRole('link', { name: 'Богатство семьи и горизонт 100 лет' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${BASE}/day/1/$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('весь текст урока виден без JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${BASE}/day/1/`);
  await expect(page.getByRole('heading', { name: 'История' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Пример из жизни' })).toBeVisible();
  await expect(page.getByText('Герои придуманы, ситуации типичные.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Начинаю с себя' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Источники' })).toBeVisible();
  await context.close();
});

test('метаданные, Open Graph и JSON-LD Course на главной', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.png$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /mirudistok32\.github\.io\/family-100\/$/,
  );
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw ?? '{}');
  expect(data['@type']).toBe('Course');
  expect(data.inLanguage).toBe('ru');
});

test('robots.txt и sitemap отвечают и ведут на страницы курса', async ({ request }) => {
  const robots = await request.get(`${BASE}/robots.txt`);
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('/family-100/sitemap-index.xml');

  const index = await request.get(`${BASE}/sitemap-index.xml`);
  expect(index.ok()).toBe(true);
  const sitemap = await request.get(`${BASE}/sitemap-0.xml`);
  expect(await sitemap.text()).toContain('/family-100/day/1/');
});

test('перед ссылкой, перенесённой на новую строку, не пропадает пробел', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('main')).toContainText('Подробнее — на странице о курсе');
  await expect(page.locator('footer')).toContainText('не отправляются. О курсе и приватности');
});

test('возрастной знак 16+ есть в подвале', async ({ page }) => {
  for (const path of [`${BASE}/`, `${BASE}/day/1/`, `${BASE}/about/`]) {
    await page.goto(path);
    await expect(page.locator('footer')).toContainText('16+');
  }
});

test('картинка для соцсетей на месте', async ({ request }) => {
  const image = await request.get(`${BASE}/og.png`);
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
});

test('нет ошибок консоли на главной и уроке, CSP ничего не блокирует', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${BASE}/`);
  await page.goto(`${BASE}/day/1/`);
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('внутренняя ссылка из текста урока ведёт на страницу в подпапке сайта', async ({ page }) => {
  await page.goto(`${BASE}/day/5/`);
  await page.getByRole('link', { name: 'первого дня' }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/day/1/$`));
});

test('дни идут по оглавлению книги: на главной видны части и все семь тем', async ({ page }) => {
  await page.goto(`${BASE}/`);
  const days = page.locator('.day-list');
  for (const text of [
    'философия',
    'семейные практики',
    'роли и ответственность',
    'Миссия семьи',
    'Ритуалы и традиции',
    'Баланс и отчёт семьи',
    'Семейный банк',
    'Роли и наставники',
    'Следующее поколение',
  ]) {
    await expect(days).toContainText(text);
  }
  await expect(page.locator('main')).toContainText('«Богатство семьи»');
});

test('день 1 говорит, что деньги служат людям, и что свою семью строишь ты', async ({ page }) => {
  await page.goto(`${BASE}/day/1/`);
  await expect(page.locator('.block--essence')).toContainText(
    'Богатство семьи — это прежде всего люди',
  );
  await expect(
    page.locator('.block--essence').locator('strong', { hasText: 'Твою семью строишь ты' }),
  ).toBeVisible();
});

test('день 3 называет предание преданием', async ({ page }) => {
  await page.goto(`${BASE}/day/3/`);
  await expect(page.getByText('Это предание, а не биография')).toBeVisible();
});

test('день 4 подключает аудит капиталов, а день 2 ведёт к конституции', async ({ page }) => {
  await page.goto(`${BASE}/day/4/`);
  await expect(page.locator('[data-audit]')).toBeVisible();
  await page.goto(`${BASE}/day/2/`);
  await page.getByRole('link', { name: 'Собрать семейную конституцию целиком' }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/my-family/#constitution$`));
});

test('день 6 перечисляет формы семьи без оценки и ведёт к памяткам', async ({ page }) => {
  await page.goto(`${BASE}/day/6/`);
  const essence = page.locator('.block--essence');
  for (const form of ['с одним родителем', 'с отчимом или мачехой', 'приёмная', 'без детей']) {
    await expect(essence).toContainText(form);
  }
  await expect(page.getByRole('link', { name: 'Памятки' })).toBeVisible();
});
