import { expect, type Page, test } from '@playwright/test';

const BASE = '/family-100';
const PAGE = `${BASE}/day/5/first-generation/`;
const RECORDS = `${BASE}/my-family/`;
const RULES = 'textarea[data-note-id="d5-first-generation-task-rules"]';
const KEEP = 'input[data-note-keep="d5-first-generation-task-rules"]';
const NOTES_KEY = 'family100:notes:v1';
const SHEET = '[data-constitution-sheet]';
const TEXT = 'В моём доме не бьют.';

async function savedNotes(page: Page): Promise<string> {
  return page.evaluate((key) => localStorage.getItem(key) ?? '', NOTES_KEY);
}

test('правила без согласия не сохраняются и до записей не доходят', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator(RULES).fill(TEXT);
  await page.locator(RULES).blur();
  expect(await savedNotes(page)).not.toContain(TEXT);
  await page.goto(RECORDS);
  await expect(page.locator(RULES)).toHaveValue('');
  await expect(page.locator(SHEET)).not.toContainText(TEXT);
});

test('правила с согласием доходят до конституции и остаются там', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator(KEEP).check();
  await page.locator(RULES).fill(TEXT);
  await expect.poll(() => savedNotes(page)).toContain(TEXT);

  await page.goto(RECORDS);
  await expect(page.locator(RULES)).toHaveValue(TEXT);
  await expect(page.locator(KEEP)).toBeChecked();
  await expect(page.locator(SHEET)).toContainText(TEXT);
  await page.reload();
  await expect(page.locator(RULES)).toHaveValue(TEXT);
  await expect(page.locator(SHEET)).toContainText(TEXT);

  // Согласие общее с днём 5: выключили здесь, и правил больше нет в хранилище.
  await page.locator(KEEP).uncheck();
  await expect.poll(() => savedNotes(page)).not.toContain(TEXT);
  await page.goto(PAGE);
  await expect(page.locator(RULES)).toHaveValue('');
  await expect(page.locator(KEEP)).not.toBeChecked();
});

test('часть говорит, что повторение не приговор, и ведёт к помощи', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeVisible();
  await expect(page.locator('.block--history')).toContainText('Большинство не повторяет');
  const essence = page.locator('.block--essence');
  await expect(essence).toContainText('Это выбор и работа, а не только решение');
  await expect(essence).toContainText('Если тебе 14–17');
  await expect(essence).toContainText('Твою будущую семью строишь ты');
  await expect(page.locator('.block--ethics')).toContainText('не значит, что страдать полезно');
  await expect(page.getByRole('heading', { name: 'Я начинаю новую линию' })).toBeVisible();
});
