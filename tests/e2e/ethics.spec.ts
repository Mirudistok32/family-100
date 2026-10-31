import { expect, test } from '@playwright/test';

const BASE = '/family-100';
const ETHICS = `${BASE}/ethics/`;
const FINISH = `${BASE}/finish/`;
const LESSONS = [
  '/day/1/',
  '/day/2/',
  '/day/3/',
  '/day/4/',
  '/day/5/addiction/',
  '/day/5/abuse/',
  '/day/5/distance/',
  '/day/5/first-generation/',
  '/day/6/people/',
  '/day/6/means/',
  '/day/7/',
];

test('из каждого урока есть ссылка на /ethics, и вопрос урока там есть', async ({ page }) => {
  const questions: string[] = [];
  for (const lesson of LESSONS) {
    await page.goto(`${BASE}${lesson}`);
    const question = await page.locator('.block--ethics strong').first().textContent();
    expect(question, lesson).toBeTruthy();
    questions.push(question ?? '');
    await expect(
      page.getByRole('link', { name: 'Вопросы этики всех дней' }),
      lesson,
    ).toHaveAttribute('href', ETHICS);
  }
  await page.goto(ETHICS);
  for (const question of questions) {
    await expect(page.getByRole('heading', { name: question, exact: true })).toBeVisible();
  }
});

test('у каждого вопроса мыслитель, минимум две позиции и путь в урок', async ({ page }) => {
  await page.goto(ETHICS);
  const items = page.locator('[data-ethics-item]');
  await expect(items).toHaveCount(LESSONS.length);
  for (const item of await items.all()) {
    await expect(item.getByText('Кто об этом думал:')).toBeVisible();
    expect(await item.locator('li').count()).toBeGreaterThanOrEqual(2);
    await expect(item.getByRole('link', { name: 'Подробнее в уроке' })).toBeVisible();
  }
});

test('ссылка ведёт к разделу этики в уроке', async ({ page }) => {
  await page.goto(ETHICS);
  await page
    .locator('[data-ethics-item="day-7"]')
    .getByRole('link', { name: 'Подробнее в уроке' })
    .click();
  await expect(page).toHaveURL(/\/day\/7\/#/);
  await expect(page.getByRole('heading', { name: 'Вопрос этики' })).toBeInViewport();
});

test('день с позициями без навязывания и граница о насилии', async ({ page }) => {
  await page.goto(ETHICS);
  await expect(page.locator('[data-ethics-item="day-1"]')).not.toContainText(
    'Здесь курс не предлагает выбирать',
  );
  await expect(page.locator('[data-ethics-item="day-5/abuse"]')).toContainText(
    'Насилие нельзя оправдать',
  );
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeVisible();
});

test('день 7 ведёт на экран завершения', async ({ page }) => {
  await page.goto(`${BASE}/day/7/`);
  await page.getByRole('link', { name: 'Что дальше' }).click();
  await expect(page).toHaveURL(new RegExp(`${FINISH}$`));
  await expect(page.getByRole('heading', { name: 'Семь дней позади', level: 1 })).toBeVisible();
});

test('экран без данных не упрекает, а что вернуть в календарь видно', async ({ page }) => {
  await page.goto(FINISH);
  await expect(page.locator('[data-finish-empty]')).toBeVisible();
  await expect(page.locator('[data-finish-facts]')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Через месяц' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Через год' })).toBeVisible();
  const main = (await page.locator('main').innerText()).toLowerCase();
  expect(main).not.toMatch(/подряд|стрик|%|не сделано|наверстать/);
});

test('экран показывает сделанное и не считает записи инструментов', async ({ page }) => {
  await page.goto(FINISH);
  await page.evaluate(() => {
    localStorage.setItem(
      'family100:progress:v1',
      JSON.stringify({ schemaVersion: 1, checked: ['d1-teen-1', 'd1-teen-2'] }),
    );
    localStorage.setItem(
      'family100:notes:v1',
      JSON.stringify({
        schemaVersion: 1,
        fields: {
          'd7-task-mission': 'Миссия',
          'constitution-values': 'Честность',
          'constitution-version': 'couple',
          'd6-means-task-audit': '{"audience":"teen","answers":{}}',
        },
        keep: [],
      }),
    );
  });
  const before = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  await page.reload();
  const facts = page.locator('[data-finish-facts]');
  await expect(facts).toContainText('Отмечено пунктов чек-листов: 2');
  await expect(facts).toContainText('Сделано записей: 2');
  await expect(facts).toContainText('Заполнено частей семейной конституции: 2 из 7');
  await expect(page.locator('[data-finish-empty]')).toBeHidden();
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).toBe(before);
});

test('без JavaScript текст экрана виден, а итог честно скрыт', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(FINISH);
  await expect(page.getByRole('heading', { name: 'Через год' })).toBeVisible();
  await expect(page.locator('[data-js-off]')).toBeVisible();
  await expect(page.locator('[data-finish-facts]')).toBeHidden();
  await context.close();
});

test('экран и страница этики не обращаются к чужим адресам', async ({ page }) => {
  const foreign: string[] = [];
  page.on('request', (request) => {
    if (!request.url().startsWith('http://localhost')) foreign.push(request.url());
  });
  await page.goto(ETHICS);
  await page.goto(FINISH);
  expect(foreign).toEqual([]);
});
