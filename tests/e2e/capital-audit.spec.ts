import { readFile, writeFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const PAGE = '/family-100/day/4/';
const RECORDS = '/family-100/my-family/';
const AUDIT_ID = 'd6-means-task-audit';
const STEP = 'textarea[data-note-id="d6-means-task-step"]';

function answer(page: Page, id: string, value: 0 | 1 | 2) {
  return page.locator(`input[name="${id}"][value="${value}"]`);
}

async function savedAudit(page: Page): Promise<string | undefined> {
  return page.evaluate((id) => {
    const raw = localStorage.getItem('family100:notes:v1');
    return raw ? (JSON.parse(raw).fields[id] as string | undefined) : undefined;
  }, AUDIT_ID);
}

test('вопросы появляются после выбора аудитории, результат считается сразу', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator('[data-audit-set="self"]')).toBeHidden();
  await expect(page.locator('[data-audit-result]')).toBeHidden();

  await page.getByRole('radio', { name: 'Начинаю с себя' }).check();
  await expect(page.locator('[data-audit-set="self"]')).toBeVisible();
  await expect(page.locator('[data-audit-set="couple"]')).toBeHidden();

  await answer(page, 'self-track', 0).check();
  await answer(page, 'self-save', 0).check();
  await answer(page, 'self-health', 2).check();

  await expect(page.locator('[data-audit-status]')).toContainText('Отмечено 3 из 12');
  await expect(page.locator('[data-audit-score="financial"] [data-audit-value]')).toHaveText(
    '0 из 6: здесь можно начать',
  );
  await expect(page.locator('[data-audit-score="human"] [data-audit-value]')).toHaveText(
    '2 из 6: есть опора',
  );
  await expect(page.locator('[data-audit-score="social"] [data-audit-value]')).toHaveText(
    'нет ответов',
  );
  const step = page.locator('[data-audit-step="financial"][data-audit-step-for="self"]');
  await expect(step).toBeVisible();
  await expect(step).toContainText('даже если их немного');
  await expect(page.locator('[data-audit-step]:visible')).toHaveCount(1);
});

test('ответы переживают перезагрузку и не мешают обычным записям', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByRole('radio', { name: 'Мы вместе' }).check();
  await answer(page, 'couple-cushion', 1).check();
  await page.locator(STEP).fill('Записать долги');
  await answer(page, 'couple-debt', 2).check();

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Мы вместе' })).toBeChecked();
  await expect(answer(page, 'couple-cushion', 1)).toBeChecked();
  await expect(answer(page, 'couple-debt', 2)).toBeChecked();
  await expect(page.locator(STEP)).toHaveValue('Записать долги');
  await expect(page.locator('[data-audit-status]')).toContainText('Отмечено 2 из 12');
});

test('в хранилище только баллы, суммы и текст ответов туда не попадают', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByRole('radio', { name: 'Начинаю с себя' }).check();
  await answer(page, 'self-save', 1).check();
  await expect
    .poll(() => savedAudit(page))
    .toBe(JSON.stringify({ answers: { 'self-save': 1 }, audience: 'self' }));
});

test('аудит попадает в копию данных и возвращается из неё', async ({ page }, testInfo) => {
  await page.goto(PAGE);
  await page.getByRole('radio', { name: 'Начинаю с себя' }).check();
  await answer(page, 'self-friends', 2).check();

  await page.goto(RECORDS);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Скачать копию' }).click(),
  ]);
  const text = await readFile(await download.path(), 'utf8');
  expect(JSON.parse(JSON.parse(text).notes.fields[AUDIT_ID]).answers).toEqual({
    'self-friends': 2,
  });

  await page.goto(PAGE);
  await page.getByRole('button', { name: 'Очистить ответы' }).click();
  await expect.poll(() => savedAudit(page)).toBeUndefined();
  await expect(answer(page, 'self-friends', 2)).not.toBeChecked();

  await page.goto(RECORDS);
  const file = testInfo.outputPath('kopiya.json');
  await writeFile(file, text);
  await page.locator('input[type="file"]').setInputFiles(file);
  await page.getByRole('button', { name: /Заменить/ }).click();

  await page.goto(PAGE);
  await expect(answer(page, 'self-friends', 2)).toBeChecked();
});

test('очистка убирает ответы, а другая вкладка подхватывает их', async ({ page, context }) => {
  await page.goto(PAGE);
  const other = await context.newPage();
  await other.goto(PAGE);

  await page.getByRole('radio', { name: 'Начинаю с себя' }).check();
  await answer(page, 'self-learn', 1).check();
  await expect(answer(other, 'self-learn', 1)).toBeChecked();

  await page.getByRole('button', { name: 'Очистить ответы' }).click();
  await expect(page.locator('[data-audit-result]')).toBeHidden();
  await expect(page.getByRole('radio', { name: 'Начинаю с себя' })).not.toBeChecked();
  await expect(other.locator('[data-audit-set="self"]')).toBeHidden();
});

test('если всё крепко, вместо шага предлагается помочь другим', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByRole('radio', { name: 'Начинаю с себя' }).check();
  for (const id of await page
    .locator('[data-audit-set="self"] input[value="2"]')
    .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).name))) {
    await answer(page, id, 2).check();
  }
  await expect(page.locator('[data-audit-status]')).toContainText('Отмечено 12 из 12');
  await expect(page.locator('[data-audit-step="all-strong"]')).toBeVisible();
  await expect(page.locator('[data-audit-step]:visible')).toHaveCount(1);
});

test('аудит не ходит в сеть, форма и результат без нарушений axe', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://localhost')) foreign.push(request.url());
  });
  await page.goto(PAGE);
  await page.getByRole('radio', { name: 'Начинаю с себя' }).check();
  await answer(page, 'self-track', 1).check();
  await expect(page.locator('[data-audit-result]')).toBeVisible();
  expect(foreign).toEqual([]);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('без JavaScript видны все вопросы и все шаги', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.locator('[data-audit-set="self"]')).toBeVisible();
  await expect(page.locator('[data-audit-set="couple"]')).toBeVisible();
  await expect(
    page.locator('[data-audit-step="financial"][data-audit-step-for="couple"]'),
  ).toBeVisible();
  await expect(page.locator('[data-audit-summary]')).toBeHidden();
  await expect(page.locator('[data-audit] [data-js-off]')).toBeVisible();
  await context.close();
});

test('из аудита в дне 4 можно перейти к деньгам в дне 5', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByRole('link', { name: 'дне 5' }).click();
  await expect(page).toHaveURL(/\/day\/5\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Семейный банк');
});
