import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defineCollection, reference } from 'astro:content';

const slug = z.string().regex(/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/);

const checklistItem = z.object({ id: slug, text: z.string().min(1) });

const lessons = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/lessons',
    generateId: ({ data }) => String(data['id']),
  }),
  schema: z.object({
    /** Постоянный id: `day-1` или `day-5/addiction`. Не меняется без миграции. */
    id: slug,
    day: z.number().int().min(1).max(7),
    /** Адрес части внутри дня: `addiction` для `/day/5/addiction/`. */
    part: slug.optional(),
    /** Порядок частей внутри дня. */
    order: z.number().int().min(1).default(1),
    title: z.string().min(1),
    goal: z.string().min(1),
    question: z.string().min(1),
    minutes: z.number().int().min(5).max(40),
    /** Тяжёлая тема: предупреждение, быстрый выход и блок помощи на странице. */
    heavy: z.boolean().default(false),
    /** Черновик не публикуется без проверки (пункт 5.4 плана). */
    draft: z.boolean().default(false),
    teen: z.array(checklistItem).min(1),
    couple: z.array(checklistItem).min(1),
    task: z.object({
      id: slug,
      text: z.string().min(1),
      fields: z
        .array(
          z.object({
            id: slug,
            label: z.string().min(1),
            sensitive: z.boolean().default(false),
          }),
        )
        .default([]),
    }),
    memo: reference('memos'),
    sources: z
      .array(z.object({ title: z.string().min(1), url: z.url({ protocol: /^https$/ }).optional() }))
      .min(1),
  }),
});

const memos = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/memos',
    generateId: ({ data }) => String(data['id']),
  }),
  schema: z.object({
    id: slug,
    title: z.string().min(1),
    day: z.number().int().min(1).max(7),
    order: z.number().int().min(1).default(1),
  }),
});

export const collections = { lessons, memos };
