import { describe, expect, it } from 'vitest';

import { summarizeCourse, summaryFacts } from '@/domain/finish';
import type { Notes } from '@/domain/notes';
import type { Progress } from '@/domain/progress';

const progress = (checked: string[]): Progress => ({ schemaVersion: 1, checked });
const notes = (fields: Record<string, string>): Notes => ({ schemaVersion: 1, fields, keep: [] });

describe('итог курса', () => {
  it('считает отметки, записи и части конституции', () => {
    const summary = summarizeCourse(
      progress(['a', 'b']),
      notes({ 'd1-task': 'текст', 'd7-task-mission': 'миссия' }),
      ['d7-task-mission', 'constitution-values'],
    );
    expect(summary).toEqual({ checked: 2, notes: 2, constitutionParts: 1 });
  });

  it('записи инструментов записями не считает', () => {
    const summary = summarizeCourse(
      progress([]),
      notes({ 'constitution-version': 'couple', 'd6-means-task-audit': '{}' }),
      [],
    );
    expect(summary.notes).toBe(0);
  });

  it('нули не показывает', () => {
    expect(summaryFacts({ checked: 0, notes: 0, constitutionParts: 0 }, 7)).toEqual([]);
    expect(summaryFacts({ checked: 3, notes: 0, constitutionParts: 0 }, 7)).toEqual([
      'Отмечено пунктов чек-листов: 3',
    ]);
  });

  it('показывает всё, что есть, без процентов и дат', () => {
    const facts = summaryFacts({ checked: 1, notes: 2, constitutionParts: 3 }, 7);
    expect(facts).toEqual([
      'Отмечено пунктов чек-листов: 1',
      'Сделано записей: 2',
      'Заполнено частей семейной конституции: 3 из 7',
    ]);
    expect(facts.join(' ')).not.toMatch(/%|серия|пропущ/);
  });
});
