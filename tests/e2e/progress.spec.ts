import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BASE = '/family-100';
const DAY = `${BASE}/day/1/`;

test('отметка переживает перезагрузку', async ({ page }) => {
  await page.goto(DAY);
  const box = page.locator('input[data-item-id="d1-teen-1"]');
  await box.check();
  await page.reload();
  await expect(box).toBeChecked();
  await box.uncheck();
  await page.reload();
  await expect(box).not.toBeChecked();
});

test('чек-лист отмечается с клавиатуры', async ({ page }) => {
  await page.goto(DAY);
  const box = page.locator('input[data-item-id="d1-teen-1"]');
  await box.focus();
  await page.keyboard.press('Space');
  await expect(box).toBeChecked();
});

test('главная предлагает продолжить и показывает счётчик', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-resume]')).toBeHidden();

  await page.goto(DAY);
  await page.locator('input[data-item-id="d1-teen-1"]').check();
  await page.goto(`${BASE}/`);

  const resume = page.locator('[data-resume]');
  await expect(resume).toBeVisible();
  await expect(resume.getByRole('link')).toHaveAttribute('href', DAY);
  await expect(page.locator('[data-day="1"] [data-progress-items]')).toContainText('Отмечено 1 из');

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('другая вкладка подхватывает отметку', async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto(DAY);
  await second.goto(DAY);
  await first.locator('input[data-item-id="d1-teen-1"]').check();
  await expect(second.locator('input[data-item-id="d1-teen-1"]')).toBeChecked();
});

test('ошибка записи показывает сообщение и не снимает отметку', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
  });
  await page.goto(DAY);
  const box = page.locator('input[data-item-id="d1-teen-1"]');
  await box.check();
  await expect(box).toBeChecked();
  await expect(page.locator('[data-save-problem]')).toBeVisible();
});

test('испорченное хранилище не ломает страницу и не становится разметкой', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'family100:progress:v1',
      JSON.stringify({
        schemaVersion: 1,
        checked: ['d1-teen-1'],
        last: { id: 'day-1', title: '<img src=x onerror=alert(1)>', path: 'javascript:alert(1)' },
      }),
    );
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${BASE}/`);
  await expect(page.locator('[data-resume]')).toBeHidden();
  await expect(page.locator('main img')).toHaveCount(0);
  expect(errors).toEqual([]);
});
