import { describe, expect, it } from 'vitest';

import { daysAwaitingReview, isVisible } from '@/domain/visibility';

describe('isVisible', () => {
  it('обычный урок виден всегда', () => {
    expect(isVisible(false, 'production', false)).toBe(true);
  });

  it('черновик не попадает в публикацию', () => {
    expect(isVisible(true, 'production', false)).toBe(false);
  });

  it('черновик виден при разработке и в проверочной сборке', () => {
    expect(isVisible(true, 'development', true)).toBe(true);
    expect(isVisible(true, 'drafts', false)).toBe(true);
  });
});

describe('daysAwaitingReview', () => {
  const days = [{ day: 4 }, { day: 5, heavy: true }, { day: 6 }];

  it('тяжёлый день без опубликованных уроков ждёт проверки', () => {
    expect(daysAwaitingReview(days, [4])).toEqual([5]);
  });

  it('опубликованный тяжёлый день заглушки не получает', () => {
    expect(daysAwaitingReview(days, [4, 5])).toEqual([]);
  });

  it('обычный день без уроков заглушки не получает', () => {
    expect(daysAwaitingReview(days, [5])).toEqual([]);
  });
});
