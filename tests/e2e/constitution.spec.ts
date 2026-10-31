import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const BASE = '/family-100';
const RECORDS = `${BASE}/my-family/`;
const DAY_7 = `${BASE}/day/7/`;
const NOTES_KEY = 'family100:notes:v1';
const SHEET = '[data-constitution-sheet]';

const OPEN_NOTES = [
  'd7-task-mission',
  'constitution-values',
  'constitution-decisions',
  'constitution-money',
  'd7-task-tradition',
];
const SENSITIVE_NOTES = ['d5-first-generation-task-rules', 'constitution-not-repeat'];
const ALL_NOTES = [...OPEN_NOTES, ...SENSITIVE_NOTES];

function field(page: Page, id: string) {
  return page.locator(`textarea[data-note-id="${id}"]`);
}

function keep(page: Page, id: string) {
  return page.locator(`input[data-note-keep="${id}"]`);
}

async function savedNotes(page: Page): Promise<string> {
  return page.evaluate((key) => localStorage.getItem(key) ?? '', NOTES_KEY);
}

/** Заполняет все части: у чувствительных сначала включает сохранение. */
async function fillAll(page: Page, textOf: (id: string) => string): Promise<void> {
  for (const id of SENSITIVE_NOTES) await keep(page, id).check();
  for (const id of ALL_NOTES) await field(page, id).fill(textOf(id));
}

/** Страницы PDF считаем по объектам `/Type /Page` (а `/Pages` — это их каталог). */
async function pdfPages(page: Page): Promise<number> {
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: false });
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
}

test('форма переживает перезагрузку и даёт документ на одном-двух листах A4', async ({ page }) => {
  await page.goto(RECORDS);
  await page.getByRole('radio', { name: 'Мы уже пара' }).check();
  await fillAll(page, (id) => `Запись части ${id}: говорим прямо и без оскорблений.`);
  await expect.poll(() => savedNotes(page)).toContain('constitution-not-repeat');

  await page.reload();

  await expect(page.getByRole('radio', { name: 'Мы уже пара' })).toBeChecked();
  const sheet = page.locator(SHEET);
  await expect(sheet.getByRole('heading', { name: 'Конституция нашей семьи' })).toBeVisible();
  for (const id of ALL_NOTES) await expect(sheet).toContainText(`Запись части ${id}`);
  await expect(sheet.getByRole('heading', { name: 'Что мы не повторяем' })).toBeVisible();

  const pages = await pdfPages(page);
  expect(pages).toBeGreaterThanOrEqual(1);
  expect(pages).toBeLessThanOrEqual(2);

  await page.emulateMedia({ media: 'print' });
  await expect(sheet).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Мои записи' })).toBeHidden();
  await expect(field(page, 'constitution-values')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Копия данных' })).toBeHidden();
});

test('версия меняет вопросы и заголовки, а текст не трогает', async ({ page }) => {
  await page.goto(RECORDS);
  const prompts = page.locator('#prompt-constitution-values');
  await expect(prompts.getByText('в твоём доме')).toBeVisible();
  await expect(prompts.getByText('Что для вас важнее')).toBeHidden();
  await field(page, 'constitution-values').fill('Честность');
  const sheet = page.locator(SHEET);
  await expect(sheet.getByRole('heading', { name: 'Что для меня важнее всего' })).toBeVisible();
  await expect(
    sheet.getByRole('heading', { name: 'Конституция моей будущей семьи' }),
  ).toBeVisible();

  await page.getByRole('radio', { name: 'Мы уже пара' }).check();
  await expect(prompts.getByText('Что для вас важнее')).toBeVisible();
  await expect(prompts.getByText('в твоём доме')).toBeHidden();
  await expect(sheet.getByRole('heading', { name: 'Что для нас важнее всего' })).toBeVisible();
  await expect(field(page, 'constitution-values')).toHaveValue('Честность');
});

test('миссия и традиция общие с днём 7', async ({ page }) => {
  await page.goto(DAY_7);
  await field(page, 'd7-task-mission').fill('Мы дом, куда хочется вернуться.');
  await field(page, 'd7-task-tradition').fill('Пельмени в первое воскресенье.');
  await expect.poll(() => savedNotes(page)).toContain('Пельмени');

  await page.getByRole('link', { name: 'Собрать семейную конституцию целиком' }).click();
  await expect(page).toHaveURL(/\/my-family\/#constitution$/);
  await expect(page.getByRole('heading', { name: 'Семейная конституция' })).toBeInViewport();
  const sheet = page.locator(SHEET);
  await expect(sheet).toContainText('Мы дом, куда хочется вернуться.');
  await expect(sheet).toContainText('Пельмени в первое воскресенье.');

  await field(page, 'd7-task-mission').fill('Мы дом и команда.');
  await expect.poll(() => savedNotes(page)).toContain('Мы дом и команда.');
  await page.goto(DAY_7);
  await expect(field(page, 'd7-task-mission')).toHaveValue('Мы дом и команда.');
});

test('чувствительная часть без согласия идёт на лист, но не в хранилище', async ({ page }) => {
  const secret = 'Не повторю крики по вечерам.';
  await page.goto(RECORDS);
  await field(page, 'constitution-not-repeat').fill(secret);
  await field(page, 'constitution-values').fill('Честность');
  await expect.poll(() => savedNotes(page)).toContain('Честность');

  await expect(page.locator(SHEET)).toContainText(secret);
  expect(await savedNotes(page)).not.toContain(secret);

  await page.reload();
  await expect(field(page, 'constitution-not-repeat')).toHaveValue('');
  await expect(page.locator(SHEET)).not.toContainText(secret);
});

test('выключение сохранения стирает часть из хранилища', async ({ page }) => {
  const secret = 'Не повторю крики по вечерам.';
  await page.goto(RECORDS);
  await keep(page, 'constitution-not-repeat').check();
  await field(page, 'constitution-not-repeat').fill(secret);
  await expect.poll(() => savedNotes(page)).toContain(secret);

  await keep(page, 'constitution-not-repeat').uncheck();
  await expect.poll(() => savedNotes(page)).not.toContain(secret);
});

test('текст на листе остаётся текстом', async ({ page }) => {
  const dangerous = '<img src=x onerror="window.__xss = 1"><b>жирно</b>';
  await page.goto(RECORDS);
  await field(page, 'constitution-values').fill(dangerous);
  const sheet = page.locator(SHEET);
  await expect(sheet).toContainText(dangerous);
  await expect(sheet.locator('img, b')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { __xss?: number }).__xss),
  ).toBeUndefined();
});

test('длинный текст: на пределе два листа, за пределом предупреждение', async ({ page }) => {
  // 56 строк текста на все части: по 8 строк на каждую из 7 частей, каждая во всю ширину.
  const fullLine = 'слово '.repeat(12).trim();
  const eightLines = Array(8).fill(fullLine).join('\n');
  await page.goto(RECORDS);
  await fillAll(page, () => eightLines);
  const status = page.locator('[data-constitution-status]');
  await expect(status).toBeEmpty();
  expect(await pdfPages(page)).toBeLessThanOrEqual(2);

  await field(page, 'constitution-money').fill(`${eightLines}\n${fullLine}`);
  await expect(status).toContainText('больше, чем на два листа');
  await field(page, 'constitution-money').fill(eightLines);
  await expect(status).toBeEmpty();
});

test('кнопка печатает, а пустой лист не печатает и говорит почему', async ({ page }) => {
  await page.addInitScript(() => {
    const counter = window as unknown as { __prints: number };
    counter.__prints = 0;
    window.print = () => {
      counter.__prints += 1;
    };
  });
  const prints = () => page.evaluate(() => (window as unknown as { __prints: number }).__prints);
  const button = page.getByRole('button', { name: 'Распечатать или сохранить в PDF' });

  await page.goto(RECORDS);
  await expect(page.locator(SHEET)).toContainText('Пока здесь пусто');
  await button.click();
  expect(await prints()).toBe(0);
  await expect(page.locator('[data-constitution-status]')).toContainText('Печатать пока нечего');

  await field(page, 'constitution-values').fill('Честность');
  await expect(page.locator('[data-constitution-status]')).toBeEmpty();
  await button.click();
  expect(await prints()).toBe(1);
});

test('стереть всё очищает лист и возвращает версию по умолчанию', async ({ page }) => {
  await page.goto(RECORDS);
  await page.getByRole('radio', { name: 'Мы уже пара' }).check();
  await field(page, 'constitution-values').fill('Честность');
  await expect(page.locator(SHEET)).toContainText('Честность');

  await page.locator('[data-erase]').click();
  await page.locator('[data-erase-confirm]').click();
  await expect(page.locator(SHEET)).toContainText('Пока здесь пусто');
  await expect(page.locator(SHEET)).not.toContainText('Честность');
  await expect(page.getByRole('radio', { name: 'Мне 14–17: моя будущая семья' })).toBeChecked();
});

test('поле каждой части есть на странице один раз, а день 7 ссылается на конструктор', async ({
  page,
}) => {
  await page.goto(RECORDS);
  for (const id of ALL_NOTES) await expect(field(page, id)).toHaveCount(1);
  await expect(field(page, 'd7-task-story')).toHaveCount(1);
  await expect(
    page
      .locator('section.note-group', { hasText: 'День 7' })
      .getByRole('link', { name: 'семейной конституции' }),
  ).toBeVisible();
});

test('без JavaScript форма видна, а лист и печать скрыты', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(RECORDS);
  await expect(field(page, 'constitution-values')).toBeVisible();
  await expect(page.locator('#prompt-constitution-values').getByText('в твоём доме')).toBeVisible();
  await expect(page.locator('#prompt-constitution-values').getByText('Что для вас')).toBeVisible();
  await expect(page.locator(SHEET)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Распечатать или сохранить в PDF' })).toBeHidden();
  await context.close();
});

test('заполненная страница проходит axe, лист не даёт горизонтальной прокрутки', async ({
  page,
}) => {
  await page.goto(RECORDS);
  await fillAll(page, () => 'оченьдлинноесловобезпробелов'.repeat(12));
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.map((violation) => violation.id)).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
