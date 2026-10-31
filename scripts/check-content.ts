#!/usr/bin/env node
// Проверка контента курса: обязательные блоки, источники, уникальные id, ссылки на памятки, родовые формы,
// запрещённые слова. Входит в сборку и гейт. Правила — в src/domain/content-rules.ts.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

import { checkContent, type LessonInput, type MemoInput } from '../src/domain/content-rules.ts';

function read<T extends { file: string; body: string; data: unknown }>(dir: string): T[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const file = join(dir, name);
      const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(readFileSync(file, 'utf8'));
      if (!match) throw new Error(`${file}: нет блока frontmatter`);
      return { file, data: parse(match[1] ?? ''), body: match[2] ?? '' } as T;
    });
}

// Необязательный аргумент — другая папка контента, для тестов.
const root = process.argv[2] ?? 'src/content';
const lessons = read<LessonInput>(join(root, 'lessons'));
const memos = read<MemoInput>(join(root, 'memos'));
const errors = checkContent(lessons, memos);

for (const error of errors) console.error(error);
console.log(`Уроков: ${lessons.length}, памяток: ${memos.length}, ошибок: ${errors.length}`);
process.exit(errors.length ? 1 : 0);
