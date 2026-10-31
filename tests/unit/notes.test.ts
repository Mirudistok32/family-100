import { describe, expect, it } from 'vitest';

import {
  canKeep,
  countNotes,
  dropUnconsented,
  emptyNotes,
  getNote,
  MAX_NOTE_LENGTH,
  parseNotes,
  setKeep,
  setNote,
} from '@/domain/notes';

describe('parseNotes', () => {
  it('пустое значение и не JSON дают пустые записи', () => {
    expect(parseNotes(null)).toEqual(emptyNotes());
    expect(parseNotes('{нет')).toEqual(emptyNotes());
    expect(parseNotes('[]')).toEqual(emptyNotes());
    expect(parseNotes('null')).toEqual(emptyNotes());
  });

  it('читает реальный пример формата v1', () => {
    const raw =
      '{"schemaVersion":1,"fields":{"d1-task-circle":"Бабушка","d1-task-hard":"Текст"},"keep":["d1-task-hard"]}';
    expect(parseNotes(raw)).toEqual({
      schemaVersion: 1,
      fields: { 'd1-task-circle': 'Бабушка', 'd1-task-hard': 'Текст' },
      keep: ['d1-task-hard'],
    });
  });

  it('чужая версия не читается как своя', () => {
    expect(parseNotes('{"schemaVersion":2,"fields":{"a":"б"},"keep":[]}')).toEqual(emptyNotes());
  });

  it('отбрасывает неверные id, не строки, пустой и слишком длинный текст', () => {
    const notes = parseNotes(
      JSON.stringify({
        schemaVersion: 1,
        fields: {
          ok: 'да',
          'Плохой id': 'нет',
          number: 5,
          empty: '',
          long: 'я'.repeat(MAX_NOTE_LENGTH + 1),
        },
        keep: ['ok', 'ok', 7, 'Плохой id'],
      }),
    );
    expect(notes.fields).toEqual({ ok: 'да' });
    expect(notes.keep).toEqual(['ok']);
  });

  it('поля-массив не превращаются в записи', () => {
    expect(parseNotes('{"schemaVersion":1,"fields":["а"],"keep":"ok"}')).toEqual(emptyNotes());
  });

  it('__proto__ в файле не меняет прототип объектов', () => {
    const notes = parseNotes('{"schemaVersion":1,"fields":{"__proto__":{"polluted":"да"}}}');
    expect(notes.fields).toEqual({});
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

describe('записи', () => {
  it('getNote не находит унаследованные свойства объекта', () => {
    expect(getNote(emptyNotes(), 'constructor')).toBe('');
  });

  it('setNote пишет текст, пустой текст убирает запись', () => {
    const notes = setNote(emptyNotes(), 'a', 'текст');
    expect(getNote(notes, 'a')).toBe('текст');
    expect(countNotes(notes)).toBe(1);
    expect(countNotes(setNote(notes, 'a', ''))).toBe(0);
  });

  it('setKeep включает согласие без дублей', () => {
    const notes = setKeep(setKeep(emptyNotes(), 'a', true), 'a', true);
    expect(notes.keep).toEqual(['a']);
    expect(canKeep(notes, 'a')).toBe(true);
  });

  it('выключение согласия сразу забывает текст поля', () => {
    const notes = setKeep(setNote(setKeep(emptyNotes(), 'a', true), 'a', 'тайна'), 'a', false);
    expect(canKeep(notes, 'a')).toBe(false);
    expect(getNote(notes, 'a')).toBe('');
    expect(JSON.stringify(notes)).not.toContain('тайна');
  });

  it('dropUnconsented убирает только чувствительные поля без согласия', () => {
    const notes = {
      schemaVersion: 1 as const,
      fields: { plain: 'п', secret: 'с', allowed: 'р' },
      keep: ['allowed'],
    };
    expect(dropUnconsented(notes, ['secret', 'allowed']).fields).toEqual({
      plain: 'п',
      allowed: 'р',
    });
  });
});
