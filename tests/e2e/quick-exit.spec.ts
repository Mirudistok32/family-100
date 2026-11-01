import { expect, test } from '@playwright/test';

const BASE = '/family-100';
const HEAVY = `${BASE}/day/5/`;

test('быстрый выход уводит, а «назад» не возвращает на страницу', async ({ page }) => {
  await page.route('https://ya.ru/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Поиск</title>' }),
  );
  await page.goto(`${BASE}/`);
  await page.goto(HEAVY);
  await page.getByRole('link', { name: 'Быстрый выход' }).click();
  await expect(page).toHaveURL('https://ya.ru/');
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${BASE}/$`));
  await expect(page.locator('h1')).not.toContainText('Когда в семье беда');
});

test('быстрый выход идёт первым при обходе с клавиатуры и работает с Enter', async ({ page }) => {
  await page.route('https://ya.ru/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Поиск</title>' }),
  );
  await page.goto(HEAVY);
  await page.keyboard.press('Tab');
  const exit = page.getByRole('link', { name: 'Быстрый выход' });
  await expect(exit).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('https://ya.ru/');
});

test('без JavaScript быстрый выход остаётся обычной ссылкой', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(HEAVY);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toHaveAttribute(
    'href',
    'https://ya.ru/',
  );
  await context.close();
});

test('полоса безопасности видна при прокрутке и не ложится на обычные страницы', async ({
  page,
}) => {
  await page.goto(HEAVY);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeInViewport();
  await page.goto(`${BASE}/`);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toHaveCount(0);
});

test('на странице есть подсказка об истории браузера', async ({ page }) => {
  await page.goto(HEAVY);
  await expect(page.locator('main')).toContainText('в истории браузера страница останется');
});
