import { expect, type Page, test } from '@playwright/test';

const PAGE = '/family-100/day/5/distance/';

function card(page: Page, id: string) {
  return page.locator(`[data-situation-card="${id}"]`);
}

async function storageDump(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
}

test('подросток в опасности видит полицию и взрослого, но не лестницу', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByRole('radio', { name: 'Ещё нет 18' }).check();
  await expect(page.getByRole('status')).toContainText('Ответь на вопросы');
  await page.getByRole('radio', { name: 'Бывает страшно или опасно' }).check();
  await expect(card(page, 'danger-now')).toBeVisible();
  await expect(card(page, 'danger-now')).toContainText('полицию');
  await expect(card(page, 'teen-danger')).toBeVisible();
  await expect(card(page, 'adult-ladder')).toBeHidden();
  await expect(page.getByRole('status')).toContainText('Подходящих карточек ниже: 2');
});

test('взрослому вопрос о поступках появляется только без опасности', async ({ page }) => {
  await page.goto(PAGE);
  const sign = page.getByRole('checkbox', { name: 'Принимает моё «нет»' });
  await page.getByRole('radio', { name: '18 и больше' }).check();
  await expect(sign).toBeHidden();
  await page.getByRole('radio', { name: 'Не опасно, но очень тяжело' }).check();
  await expect(sign).toBeVisible();
  await expect(card(page, 'adult-ladder')).toBeVisible();
  await expect(card(page, 'change-none')).toBeVisible();
  await sign.check();
  await expect(card(page, 'change-partial')).toBeVisible();
  await expect(card(page, 'change-none')).toBeHidden();
  await page.getByRole('radio', { name: 'Бывает страшно или опасно' }).check();
  await expect(sign).toBeHidden();
  await expect(card(page, 'adult-danger')).toBeVisible();
  await expect(card(page, 'adult-ladder')).toBeHidden();
  await expect(card(page, 'change-partial')).toBeHidden();
});

test('ответы никуда не уходят и не остаются', async ({ page }) => {
  await page.goto(PAGE);
  await page.waitForLoadState('networkidle');
  const before = await storageDump(page);
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  await page.getByRole('radio', { name: '18 и больше' }).check();
  await page.getByRole('radio', { name: 'Не опасно, но очень тяжело' }).check();
  await page.getByRole('checkbox', { name: 'Принимает моё «нет»' }).check();
  await expect(card(page, 'change-partial')).toBeVisible();

  expect(await storageDump(page)).toBe(before);
  expect(requests).toEqual([]);

  await page.reload();
  await expect(page.getByRole('radio', { name: '18 и больше' })).not.toBeChecked();
  await expect(card(page, 'adult-ladder')).toBeHidden();
});

test('после ухода и кнопки «назад» ответов нет, кнопка очистки тоже работает', async ({ page }) => {
  await page.goto(PAGE);
  await page.getByRole('radio', { name: '18 и больше' }).check();
  await page.getByRole('radio', { name: 'Не знаю, как это назвать' }).check();
  await expect(card(page, 'unsure')).toBeVisible();

  await page.getByRole('button', { name: 'Очистить ответы' }).click();
  await expect(page.getByRole('radio', { name: '18 и больше' })).not.toBeChecked();
  await expect(card(page, 'unsure')).toBeHidden();
  await expect(page.locator('[data-situation-footer]')).toBeHidden();

  await page.getByRole('radio', { name: 'Ещё нет 18' }).check();
  await page.goto('/family-100/about/');
  await page.goBack();
  await expect(page.getByRole('radio', { name: 'Ещё нет 18' })).not.toBeChecked();
});

test('поля задания по умолчанию не сохраняются', async ({ page }) => {
  await page.goto(PAGE);
  const before = await storageDump(page);
  const field = page.getByRole('textbox', { name: 'Какой один шаг мне по силам' });
  await field.fill('Позвонить');
  await field.blur();
  expect(await storageDump(page)).toBe(before);
});

test('без JavaScript вопросов нет, а все варианты видны текстом', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(PAGE);
  await expect(page.locator('[data-situation-form]')).toBeHidden();
  await expect(page.getByText('показаны все варианты')).toBeVisible();
  await expect(card(page, 'danger-now')).toBeVisible();
  await expect(card(page, 'teen-path')).toBeVisible();
  await expect(card(page, 'adult-ladder')).toBeVisible();
  await context.close();
});

test('часть даёт школьнику отдельный путь и называет позицию автора', async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeVisible();
  const essence = page.locator('.block--essence');
  await expect(essence).toContainText('Если тебе 14–17: другой путь');
  await expect(essence).toContainText('Не убегай из дома');
  await expect(essence).toContainText('Если тебе уже есть 18: лестница дистанции');
  await expect(essence).toContainText('Позиция автора курса');
  await expect(essence).toContainText('Это авторская ценность, а не научный вывод');
  await expect(essence).toContainText('Уважение и дистанция не противоположны');
  await expect(page.locator('.block--ethics')).toContainText('насилие терпеть никто не обязан');
});
