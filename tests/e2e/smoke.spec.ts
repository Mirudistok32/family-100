import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const HOME = '/family-100/';

test('главная открывается, язык и заголовок на месте', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto(HOME);

  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Семья на 100 лет');
  expect(errors).toEqual([]);
});

test('на главной нет нарушений axe и горизонтальной прокрутки', async ({ page }) => {
  await page.goto(HOME);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
