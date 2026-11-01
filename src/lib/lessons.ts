import { type CollectionEntry, getCollection } from 'astro:content';

import { isVisible } from '@/domain/visibility';

export type Lesson = CollectionEntry<'lessons'>;

export async function visibleLessons(): Promise<Lesson[]> {
  const all = await getCollection('lessons');
  return all
    .filter((lesson) => isVisible(lesson.data.draft, import.meta.env.MODE, import.meta.env.DEV))
    .sort((a, b) => a.data.day - b.data.day);
}
