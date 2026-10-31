import { expect, test } from '@playwright/test';

const BASE = '/family-100';
const HELP = `${BASE}/help/`;

test('у каждого контакта есть номер, источник и дата проверки', async ({ page }) => {
  await page.goto(HELP);
  const cards = page.locator('[data-helpline]');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(5);
  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    await expect(card.locator('a[href^="tel:"]').first()).toBeVisible();
    await expect(card.locator('a[data-helpline-source]')).toHaveAttribute('href', /^https:\/\//);
    await expect(card.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/);
  }
  await expect(page.locator('[data-helpline="children-helpline"]')).toContainText('8 800 2000 122');
  await expect(page.getByText('Быстрый выход', { exact: false }).first()).toBeVisible();
});

test('быстрый выход уводит, а «назад» не возвращает на страницу', async ({ page }) => {
  await page.route('https://ya.ru/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Поиск</title>' }),
  );
  await page.goto(`${BASE}/`);
  await page.goto(HELP);
  await page.getByRole('link', { name: 'Быстрый выход' }).click();
  await expect(page).toHaveURL('https://ya.ru/');
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${BASE}/$`));
  await expect(page.locator('h1')).not.toHaveText('Помощь');
});

test('быстрый выход идёт первым при обходе с клавиатуры и работает с Enter', async ({ page }) => {
  await page.route('https://ya.ru/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Поиск</title>' }),
  );
  await page.goto(HELP);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Нужна помощь' })).toBeFocused();
  await page.keyboard.press('Tab');
  const exit = page.getByRole('link', { name: 'Быстрый выход' });
  await expect(exit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('https://ya.ru/');
});

test('без JavaScript быстрый выход остаётся обычной ссылкой', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(HELP);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toHaveAttribute(
    'href',
    'https://ya.ru/',
  );
  await context.close();
});

test('полоса безопасности видна при прокрутке и не ложится на обычные страницы', async ({
  page,
}) => {
  await page.goto(HELP);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeInViewport();
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toHaveCount(0);
});

test('ссылка на помощь есть на каждой странице', async ({ page }) => {
  for (const path of [
    `${BASE}/`,
    `${BASE}/about/`,
    `${BASE}/day/1/`,
    `${BASE}/memos/`,
    `${BASE}/my-family/`,
  ]) {
    await page.goto(path);
    await expect(page.locator(`header a[href="${HELP}"]`), path).toBeVisible();
    await expect(page.locator(`footer a[href="${HELP}"]`), path).toBeVisible();
  }
});

test('на странице есть подсказка об истории браузера', async ({ page }) => {
  await page.goto(HELP);
  await expect(page.locator('main')).toContainText('в истории браузера страница останется');
});
