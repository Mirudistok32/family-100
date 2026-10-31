import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const BASE = '/family-100';
const LIST = `${BASE}/memos/`;

/** Страницы PDF считаем по объектам `/Type /Page` (а `/Pages` — это их каталог). */
function pageCount(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
}

async function pdfOf(page: Page): Promise<Buffer> {
  return page.pdf({ preferCSSPageSize: true, printBackground: false });
}

async function memoLinks(page: Page): Promise<string[]> {
  await page.goto(LIST);
  const links = page.getByRole('link', { name: 'Только этот лист' });
  const hrefs = await links.evaluateAll((items) =>
    items.map((item) => item.getAttribute('href') ?? ''),
  );
  expect(hrefs.length).toBeGreaterThan(0);
  return hrefs;
}

test('каждая памятка занимает один лист A4', async ({ page }) => {
  for (const link of await memoLinks(page)) {
    await page.goto(link);
    expect(pageCount(await pdfOf(page)), link).toBe(1);
  }
});

test('общий список печатается по листу на памятку, пустых листов нет', async ({ page }) => {
  await page.goto(LIST);
  const sheets = await page.locator('[data-memo]').count();
  expect(pageCount(await pdfOf(page))).toBe(sheets);
});

test('при печати нет шапки и цвета, текст читается в тёмной теме', async ({ page }) => {
  const [first] = await memoLinks(page);
  await page.goto(first ?? LIST);
  await page.emulateMedia({ colorScheme: 'dark', media: 'print' });
  await expect(page.locator('.site-header')).toBeHidden();
  await expect(page.locator('.site-footer')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Распечатать' })).toBeHidden();
  const sheet = page.locator('[data-memo]');
  await expect(sheet).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(sheet).toHaveCSS('color', 'rgb(0, 0, 0)');
  const size = await sheet.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(size).toBeGreaterThanOrEqual(14);
});

test('кнопка вызывает печать', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { printed: number }).printed = 0;
    window.print = () => {
      (window as unknown as { printed: number }).printed += 1;
    };
  });
  await page.goto(LIST);
  await page.getByRole('button', { name: 'Распечатать все' }).click();
  expect(await page.evaluate(() => (window as unknown as { printed: number }).printed)).toBe(1);
});

test('из урока можно перейти к памятке, страницы без нарушений axe и прокрутки', async ({
  page,
}) => {
  await page.goto(`${BASE}/day/1/`);
  await page.getByRole('link', { name: 'Распечатать памятку' }).click();
  await expect(page.locator('[data-memo]')).toBeVisible();
  for (const path of [page.url(), LIST]) {
    await page.goto(path);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
});
