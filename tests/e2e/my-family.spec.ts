import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BASE = '/family-100';
const PAGE = `${BASE}/my-family/`;
const DAY = `${BASE}/day/1/`;
const NOTE = 'textarea[data-note-id="d1-task-circle"]';
const SECRET = 'textarea[data-note-id="d1-task-hard"]';
const KEEP = 'input[data-note-keep="d1-task-hard"]';
const NOTES_KEY = 'family100:notes:v1';

function backupFile(content: unknown): { name: string; mimeType: string; buffer: Buffer } {
  return {
    name: 'kopiya.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(content)),
  };
}

test('запись сохраняется и видна и на уроке, и в «Моих записях»', async ({ page }) => {
  await page.goto(DAY);
  await page.locator(NOTE).fill('Бабушка и брат');
  await page.reload();
  await expect(page.locator(NOTE)).toHaveValue('Бабушка и брат');
  await page.goto(PAGE);
  await expect(page.locator(NOTE)).toHaveValue('Бабушка и брат');
});

test('чувствительное поле по умолчанию не сохраняется', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator(KEEP)).not.toBeChecked();
  await page.locator(SECRET).fill('личная тайна');
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), NOTES_KEY);
  expect(stored ?? '').not.toContain('личная тайна');
  await page.reload();
  await expect(page.locator(SECRET)).toHaveValue('');
});

test('сохранение чувствительного поля включается явно и выключается со стиранием', async ({
  page,
}) => {
  await page.goto(PAGE);
  await page.locator(SECRET).fill('личная тайна');
  await page.locator(KEEP).check();
  await page.reload();
  await expect(page.locator(SECRET)).toHaveValue('личная тайна');
  await expect(page.locator(KEEP)).toBeChecked();

  await page.locator(KEEP).uncheck();
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), NOTES_KEY);
  expect(stored).not.toContain('личная тайна');
  await page.reload();
  await expect(page.locator(SECRET)).toHaveValue('');
  await expect(page.locator(KEEP)).not.toBeChecked();
});

test('экспорт отдаёт файл с записями и отметками', async ({ page }) => {
  await page.goto(DAY);
  await page.locator('input[data-item-id="d1-self-1"]').check();
  await page.locator(NOTE).fill('Бабушка');
  await page.goto(PAGE);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Скачать копию' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^family-100-kopiya-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const backup = JSON.parse(await readFile(path, 'utf8'));
  expect(backup.format).toBe('family100-backup');
  expect(backup.progress.checked).toContain('d1-self-1');
  expect(backup.notes.fields['d1-task-circle']).toBe('Бабушка');
});

test('импорт показывает предпросмотр и ничего не меняет до подтверждения', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator(NOTE).fill('старая запись');
  await page.locator('[data-import]').setInputFiles(
    backupFile({
      format: 'family100-backup',
      version: 1,
      exportedAt: '2026-10-01T10:00:00.000Z',
      progress: { schemaVersion: 1, checked: ['d1-self-1'] },
      notes: { schemaVersion: 1, fields: { 'd1-task-circle': 'новая запись' }, keep: [] },
    }),
  );
  const preview = page.locator('[data-import-preview]');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('Отмеченных пунктов: 1');
  await expect(preview).toContainText('Записей: 1');
  await expect(preview).toContainText('октября 2026');
  await expect(page.locator(NOTE)).toHaveValue('старая запись');

  await page.getByRole('button', { name: 'Отмена' }).first().click();
  await expect(preview).toBeHidden();
  await page.reload();
  await expect(page.locator(NOTE)).toHaveValue('старая запись');
});

test('импорт после подтверждения заменяет данные', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator(NOTE).fill('старая запись');
  await page.locator('[data-import]').setInputFiles(
    backupFile({
      format: 'family100-backup',
      version: 1,
      exportedAt: '2026-10-01T10:00:00.000Z',
      progress: { schemaVersion: 1, checked: ['d1-self-1'] },
      notes: { schemaVersion: 1, fields: { 'd1-task-circle': 'новая запись' }, keep: [] },
    }),
  );
  await page.getByRole('button', { name: 'Заменить мои данные' }).click();
  await expect(page.locator(NOTE)).toHaveValue('новая запись');
  await expect(page.locator('[data-data-status]')).toContainText('восстановлены');
  await page.goto(DAY);
  await expect(page.locator('input[data-item-id="d1-self-1"]')).toBeChecked();
  await expect(page.locator(NOTE)).toHaveValue('новая запись');
});

test('импорт не сохраняет чувствительное поле без согласия в файле', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator('[data-import]').setInputFiles(
    backupFile({
      format: 'family100-backup',
      version: 1,
      notes: { schemaVersion: 1, fields: { 'd1-task-hard': 'чужая тайна' }, keep: [] },
    }),
  );
  await page.getByRole('button', { name: 'Заменить мои данные' }).click();
  await expect(page.locator(SECRET)).toHaveValue('');
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), NOTES_KEY);
  expect(stored).not.toContain('чужая тайна');
});

test('файл не той формы отклоняется, разметка из файла не выполняется', async ({ page }) => {
  await page.goto(PAGE);
  await page.locator(NOTE).fill('старая запись');
  await page
    .locator('[data-import]')
    .setInputFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{нет') });
  await expect(page.locator('[data-data-status]')).toContainText('не файл копии');
  await expect(page.locator('[data-import-preview]')).toBeHidden();

  await page.locator('[data-import]').setInputFiles(
    backupFile({
      format: 'family100-backup',
      version: 1,
      notes: {
        schemaVersion: 1,
        fields: { '<img src=x onerror=alert(1)>': 'x', 'unknown-field': '<img src=x>' },
        keep: [],
      },
    }),
  );
  await expect(page.locator('[data-import-preview]')).toContainText('Записей: 1');
  await expect(page.locator('[data-import-preview] img')).toHaveCount(0);
  await expect(page.locator(NOTE)).toHaveValue('старая запись');
});

test('«стереть всё» просит подтверждение и удаляет данные', async ({ page }) => {
  await page.goto(DAY);
  await page.locator('input[data-item-id="d1-self-1"]').check();
  await page.goto(PAGE);
  await page.locator(NOTE).fill('запись');
  await page.locator(SECRET).fill('несохранённая тайна');

  const erase = page.getByRole('button', { name: 'Стереть всё' });
  await erase.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Отмена' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(NOTE)).toHaveValue('запись');
  await expect(erase).toBeFocused();

  await erase.click();
  await dialog.getByRole('button', { name: 'Да, стереть' }).click();
  await expect(page.locator('[data-data-status]')).toContainText('стёрты');
  await expect(page.locator(NOTE)).toHaveValue('');
  await expect(page.locator(SECRET)).toHaveValue('');
  const keys = await page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) => key.startsWith('family100:')),
  );
  expect(keys).toEqual([]);

  await page.goto(DAY);
  await expect(page.locator('input[data-item-id="d1-self-1"]')).not.toBeChecked();
});

test('записи не уходят в сеть, запросов на чужие адреса нет', async ({ page, baseURL }) => {
  const requests: { url: string; method: string; body: string }[] = [];
  page.on('request', (request) => {
    requests.push({
      url: request.url(),
      method: request.method(),
      body: request.postData() ?? '',
    });
  });
  await page.goto(PAGE);
  await page.locator(NOTE).fill('МАРКЕР-ЗАПИСИ');
  await page.locator(SECRET).fill('МАРКЕР-ТАЙНЫ');
  await page.locator(KEEP).check();
  await page.getByRole('button', { name: 'Скачать копию' }).click();
  await page.reload();
  await page.waitForLoadState('networkidle');

  const origin = new URL(baseURL ?? '').origin;
  for (const { url, method, body } of requests) {
    if (url.startsWith('blob:')) continue;
    expect(new URL(url).origin).toBe(origin);
    expect(method).toBe('GET');
    expect(body).toBe('');
    expect(decodeURIComponent(url)).not.toContain('МАРКЕР');
  }
});

test('другая вкладка подхватывает запись и не трогает несохраняемый ввод', async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto(PAGE);
  await second.goto(PAGE);
  await second.locator(SECRET).fill('несохранённый ввод');
  await first.locator(NOTE).fill('из первой вкладки');
  await expect(second.locator(NOTE)).toHaveValue('из первой вкладки');
  await expect(second.locator(SECRET)).toHaveValue('несохранённый ввод');
});

test('ошибка записи показывает сообщение, текст остаётся в поле', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new Error('QuotaExceededError');
    };
  });
  await page.goto(PAGE);
  await page.locator(NOTE).fill('запись');
  await expect(page.locator('[data-notes-problem]').first()).toBeVisible();
  await expect(page.locator(NOTE)).toHaveValue('запись');
});

test('страница и диалог без нарушений axe, текст о хранении виден без JavaScript', async ({
  page,
  browser,
}) => {
  await page.goto(PAGE);
  await expect(page.getByText('Без JavaScript записи не сохраняются')).toBeHidden();
  await page.locator(SECRET).fill('текст');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole('button', { name: 'Стереть всё' }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto(PAGE);
  await expect(noJs.getByText('Записи и отметки лежат только в этом браузере')).toBeVisible();
  await expect(noJs.getByText('Без JavaScript записи не сохраняются')).toBeVisible();
  await expect(noJs.getByRole('button', { name: 'Скачать копию' })).toBeHidden();
  await context.close();
});
