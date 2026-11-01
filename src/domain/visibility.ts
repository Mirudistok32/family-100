/**
 * Черновики видны при разработке и в проверочной сборке (`astro build --mode drafts`), но не в публикации.
 */
export function isVisible(draft: boolean, mode: string, dev: boolean): boolean {
  return !draft || dev || mode === 'drafts';
}
