import { type CollectionEntry, getCollection } from 'astro:content';

import { pickVisibleMemos } from '@/domain/memos';
import { type Lesson, visibleLessons } from '@/lib/lessons';

export interface VisibleMemo {
  memo: CollectionEntry<'memos'>;
  lesson: Lesson;
}

/** Памятки опубликованных уроков по порядку дней. */
export async function visibleMemos(): Promise<VisibleMemo[]> {
  const memos = await getCollection('memos');
  const lessons = await visibleLessons();
  const picked = pickVisibleMemos(
    lessons.map((lesson) => ({
      memoId: lesson.data.memo.id,
      day: lesson.data.day,
      order: lesson.data.order,
      lesson,
    })),
    memos.map((memo) => memo.id),
  );
  return picked.flatMap(({ memoId, lesson }) => {
    const memo = memos.find((item) => item.id === memoId);
    return memo ? [{ memo, lesson }] : [];
  });
}
