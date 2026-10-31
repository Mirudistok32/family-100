import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const BASE = '/family-100';
const PAGES = [
  `${BASE}/`,
  `${BASE}/about/`,
  `${BASE}/day/1/`,
  `${BASE}/day/2/`,
  `${BASE}/day/3/`,
  `${BASE}/day/4/`,
  `${BASE}/day/5/`,
  `${BASE}/day/5/addiction/`,
  `${BASE}/day/5/abuse/`,
  `${BASE}/day/5/distance/`,
  `${BASE}/day/5/first-generation/`,
  `${BASE}/day/6/`,
  `${BASE}/day/6/people/`,
  `${BASE}/day/6/means/`,
  `${BASE}/day/7/`,
  `${BASE}/my-family/`,
  `${BASE}/help/`,
  `${BASE}/ethics/`,
  `${BASE}/finish/`,
];

for (const path of PAGES) {
  test(`${path}: нет нарушений axe и прокрутки вбок`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('с клавиатуры: сначала ссылка «К содержанию», она переводит фокус на контент', async ({
  page,
}) => {
  await page.goto(`${BASE}/`);
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'К содержанию' });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
});

test('с клавиатуры можно перейти с главной на день 1', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await page.getByRole('link', { name: 'Зачем нужна семья' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`${BASE}/day/1/$`));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('весь текст урока виден без JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${BASE}/day/1/`);
  await expect(page.getByRole('heading', { name: 'История' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Пример из жизни' })).toBeVisible();
  await expect(page.getByText('Герои придуманы, ситуации типичные.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Мне 14–17' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Источники' })).toBeVisible();
  await context.close();
});

test('метаданные, Open Graph и JSON-LD Course на главной', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.png$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /mirudistok32\.github\.io\/family-100\/$/,
  );
  const raw = await page.locator('script[type="application/ld+json"]').textContent();
  const data = JSON.parse(raw ?? '{}');
  expect(data['@type']).toBe('Course');
  expect(data.inLanguage).toBe('ru');
});

test('robots.txt и sitemap отвечают и ведут на страницы курса', async ({ request }) => {
  const robots = await request.get(`${BASE}/robots.txt`);
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('/family-100/sitemap-index.xml');

  const index = await request.get(`${BASE}/sitemap-index.xml`);
  expect(index.ok()).toBe(true);
  const sitemap = await request.get(`${BASE}/sitemap-0.xml`);
  expect(await sitemap.text()).toContain('/family-100/day/1/');
});

test('перед ссылкой, перенесённой на новую строку, не пропадает пробел', async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.locator('main')).toContainText('Подробнее — на странице о курсе');
  await expect(page.locator('footer')).toContainText('не отправляются. О курсе и приватности');
});

test('картинка для соцсетей на месте', async ({ request }) => {
  const image = await request.get(`${BASE}/og.png`);
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
});

test('нет ошибок консоли на главной и уроке, CSP ничего не блокирует', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${BASE}/`);
  await page.goto(`${BASE}/day/1/`);
  await page.waitForLoadState('networkidle');
  expect(errors).toEqual([]);
});

test('внутренняя ссылка из текста урока ведёт на страницу в подпапке сайта', async ({ page }) => {
  await page.goto(`${BASE}/day/1/`);
  await page.locator('.block--essence').getByRole('link', { name: '«Помощь»' }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/help/$`));
});

test('часть о зависимости: быстрый выход, помощь, чужая вина и шаги для школьника', async ({
  page,
}) => {
  await page.goto(`${BASE}/day/5/addiction/`);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Предупреждение о теме' })).toBeVisible();
  const essence = page.locator('.block--essence');
  await expect(essence).toContainText('Если тебе 14–17');
  await expect(essence).toContainText('Если тебе уже есть 18');
  await expect(essence).toContainText('Это не диагноз');
  await expect(essence).toContainText('Не отбирай, не выливай и не прячь');
  await expect(page.getByRole('listitem').filter({ hasText: 'я не могу вылечить' })).toBeVisible();
  await essence.getByRole('link', { name: '«Помощь»' }).last().click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/help/#help-addiction$`));
});

test('часть о насилии: признаки без диагнозов и без отметок, ведут на помощь', async ({ page }) => {
  await page.goto(`${BASE}/day/5/abuse/`);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeVisible();
  const essence = page.locator('.block--essence');
  await expect(essence).toContainText('Что не норма');
  await expect(essence).toContainText('Это названия поступков, а не диагноз человеку');
  await expect(essence).not.toContainText(/абьюзер|психопат|тиран/i);
  await expect(essence.getByRole('checkbox')).toHaveCount(0);
  await expect(essence).toContainText('Если тебе уже есть 18: план безопасности');
  await expect(page.getByText('поэтому отмечать необязательно')).toBeVisible();
  await expect(page.getByText('уход бывает самым опасным моментом').first()).toBeVisible();
  await essence.getByRole('link', { name: '«Помощь»' }).last().click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/help/$`));
});

test('вход в день 5 предупреждает о теме и даёт выбрать часть', async ({ page }) => {
  await page.goto(`${BASE}/day/5/`);
  await expect(page.getByRole('link', { name: 'Быстрый выход' })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Предупреждение о теме' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Алкоголь и наркомания' })).toBeVisible();
});

test('день 4 отделяет ссору от насилия и ведёт к дню 5 и к помощи', async ({ page }) => {
  await page.goto(`${BASE}/day/4/`);
  const essence = page.locator('.block--essence');
  await expect(essence).toContainText('Сначала отличи ссору от насилия');
  await expect(essence).toContainText('В чужой зависимости и чужом насилии твоей вины нет');
  await expect(
    essence.locator('strong', { hasText: 'Твою будущую семью строишь ты' }),
  ).toBeVisible();
  await expect(essence.getByRole('link', { name: '«Помощь»' })).toBeVisible();
  await essence.getByRole('link', { name: 'день 5' }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/day/5/$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Когда в семье беда');
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: /Помощь|службы/ })
      .first(),
  ).toBeVisible();
});

test('день 3 называет предание преданием и ведёт от тревожных признаков к помощи', async ({
  page,
}) => {
  await page.goto(`${BASE}/day/3/`);
  await expect(page.getByText('предание, а не биография')).toBeVisible();
  const essence = page.locator('.block--essence');
  await expect(essence).toContainText('Тревожные признаки');
  await expect(essence).toContainText('В чужой зависимости и чужом насилии твоей вины нет');
  await expect(
    essence.locator('strong', { hasText: 'твою будущую семью строишь ты' }),
  ).toBeVisible();
  await essence.getByRole('link', { name: '«Помощь»' }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}/help/$`));
});

test('день 2 прямо говорит ребёнку из любой семьи, что свою семью строит он', async ({ page }) => {
  await page.goto(`${BASE}/day/2/`);
  const essence = page.locator('.block--essence');
  await expect(essence).toContainText('с тобой всё в порядке');
  await expect(
    essence.locator('strong', { hasText: 'твою будущую семью строишь ты' }),
  ).toBeVisible();
  for (const form of ['С одним родителем', 'С отчимом или мачехой', 'Приёмная', 'Без детей']) {
    await expect(essence).toContainText(form);
  }
  await expect(page.getByRole('link', { name: 'Памятки' })).toBeVisible();
});
