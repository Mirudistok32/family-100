/**
 * Черновики видны при разработке и в проверочной сборке (`astro build --mode drafts`), но не в публикации.
 * День 5 остаётся черновиком до проверки специалистом (пункт 5.4 плана).
 */
export function isVisible(draft: boolean, mode: string, dev: boolean): boolean {
  return !draft || dev || mode === 'drafts';
}

/**
 * Тяжёлые дни без опубликованных уроков. На них ведут ссылки из других дней, поэтому адрес должен отвечать страницей, а не 404.
 * Когда день проходит проверку и публикуется, он выпадает из этого списка сам.
 */
export function daysAwaitingReview(
  days: readonly { day: number; heavy?: boolean }[],
  published: readonly number[],
): number[] {
  return days.filter(({ day, heavy }) => heavy && !published.includes(day)).map(({ day }) => day);
}
