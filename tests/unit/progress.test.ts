import { describe, expect, it } from 'vitest';

import {
  countChecked,
  emptyProgress,
  isSafePath,
  parseProgress,
  setChecked,
  setLast,
} from '@/domain/progress';

describe('parseProgress', () => {
  it('пустое хранилище даёт пустой прогресс', () => {
    expect(parseProgress(null)).toEqual(emptyProgress());
  });

  it.each(['не json', '[]', '42', 'null', '{"schemaVersion":2,"checked":["a"]}', '{}'])(
    'испорченное значение %s не роняет чтение',
    (raw) => {
      expect(parseProgress(raw)).toEqual(emptyProgress());
    },
  );

  it('читает сохранённое обратно', () => {
    const progress = setLast(setChecked(emptyProgress(), 'd1-self-1', true), {
      id: 'day-1',
      title: 'Богатство семьи и горизонт 100 лет',
      path: '/family-100/day/1/',
    });
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });

  it('миграция: старые пункты и старый последний урок не остаются, новые не трогаются', () => {
    const raw =
      '{"schemaVersion":1,"checked":["d1-teen-1","d1-couple-2","d5-first-generation-teen-1","d6-people-couple-3","d1-self-1","d7-together-2"],"last":{"id":"day-5/abuse","title":"Абьюз","path":"/family-100/day/5/abuse/"}}';
    const progress = parseProgress(raw);
    expect(progress.checked).toEqual(['d1-self-1', 'd7-together-2']);
    expect(progress.last).toBeUndefined();
  });

  it('миграция: последний урок с названием прежней программы отбрасывается', () => {
    const raw =
      '{"schemaVersion":1,"checked":[],"last":{"id":"day-4","title":"Как жить вместе","path":"/family-100/day/4/"}}';
    expect(parseProgress(raw).last).toBeUndefined();
  });

  it('отбрасывает чужие значения в checked и повторы', () => {
    const raw = JSON.stringify({ schemaVersion: 1, checked: ['ok-1', 'ok-1', 5, '<script>'] });
    expect(parseProgress(raw).checked).toEqual(['ok-1']);
  });

  it.each(['javascript:alert(1)', 'https://evil.example/', '//evil.example/', 'day/1'])(
    'не принимает адрес %s как последний урок',
    (path) => {
      const raw = JSON.stringify({
        schemaVersion: 1,
        checked: [],
        last: { id: 'day-1', title: 'Т', path },
      });
      expect(parseProgress(raw).last).toBeUndefined();
    },
  );

  it('неверный id или длинное название не проходят', () => {
    const last = (over: object) =>
      JSON.stringify({
        schemaVersion: 1,
        checked: [],
        last: { id: 'day-1', title: 'Т', path: '/a/', ...over },
      });
    expect(parseProgress(last({ id: '<b>' })).last).toBeUndefined();
    expect(parseProgress(last({ title: 'я'.repeat(201) })).last).toBeUndefined();
    expect(parseProgress(last({ title: '' })).last).toBeUndefined();
  });
});

describe('setChecked', () => {
  it('отмечает и снимает отметку, повтор ничего не дублирует', () => {
    const once = setChecked(emptyProgress(), 'a', true);
    expect(setChecked(once, 'a', true).checked).toEqual(['a']);
    expect(setChecked(once, 'a', false).checked).toEqual([]);
  });

  it('не меняет исходный объект', () => {
    const initial = emptyProgress();
    setChecked(initial, 'a', true);
    expect(initial.checked).toEqual([]);
  });
});

describe('countChecked', () => {
  it('считает только пункты этого дня', () => {
    const progress = setChecked(setChecked(emptyProgress(), 'a', true), 'z', true);
    expect(countChecked(progress, ['a', 'b'])).toBe(1);
  });
});

describe('isSafePath', () => {
  it('принимает внутренний путь', () => {
    expect(isSafePath('/family-100/day/5/abuse/')).toBe(true);
  });
});
