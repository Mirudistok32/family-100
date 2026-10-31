/**
 * Черновики видны при разработке и в проверочной сборке (`astro build --mode drafts`), но не в публикации.
 * День 5 остаётся черновиком до проверки специалистом (пункт 5.4 плана).
 */
export function isVisible(draft: boolean, mode: string, dev: boolean): boolean {
  return !draft || dev || mode === 'drafts';
}
