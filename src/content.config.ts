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
    /** Постоянный id: `day-1`. Не меняется без миграции. */
    id: slug,
    day: z.number().int().min(1).max(7),
    title: z.string().min(1),
    goal: z.string().min(1),
    question: z.string().min(1),
    minutes: z.number().int().min(5).max(40),
    /** Черновик не попадает в публикацию. */
    draft: z.boolean().default(false),
    /** Чек-лист «Начинаю с себя». */
    self: z.array(checklistItem).min(1),
    /** Чек-лист «Делаем вместе». */
    together: z.array(checklistItem).min(1),
    task: z.object({
      id: slug,
      text: z.string().min(1),
      /** Инструмент задания. `capital-audit` хранит ответы в записях. */
      tool: z.enum(['capital-audit']).optional(),
      /** Ссылка под заданием. Адрес от корня сайта, подпапку добавляет шаблон. */
      link: z.object({ href: z.string().startsWith('/'), label: z.string().min(1) }).optional(),
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
    /** Кто думал о вопросе этики этого урока. Каждое имя должно быть в тексте раздела. */
    thinkers: z.array(z.string().min(1)).min(1),
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
  }),
});

export const collections = { lessons, memos };
