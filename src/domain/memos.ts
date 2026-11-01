// Какие памятки показывать. Без astro:content, чтобы правило было покрыто тестами.

/**
 * Показываем только памятки опубликованных уроков. Иначе памятка дня-черновика попала бы на страницу
 * `/memos` и в публикацию раньше самого дня.
 */
export function pickVisibleMemos<T>(
  lessons: readonly { memoId: string; day: number; order: number; lesson: T }[],
  memoIds: readonly string[],
): { memoId: string; day: number; lesson: T }[] {
  const known = new Set(memoIds);
  const seen = new Set<string>();
  return [...lessons]
    .sort((a, b) => a.day - b.day || a.order - b.order)
    .filter(({ memoId }) => {
      if (!known.has(memoId) || seen.has(memoId)) return false;
      seen.add(memoId);
      return true;
    })
    .map(({ memoId, day, lesson }) => ({ memoId, day, lesson }));
}
