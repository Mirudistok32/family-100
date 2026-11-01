import { describe, expect, it } from 'vitest';

import { pickVisibleMemos } from '@/domain/memos';

describe('pickVisibleMemos', () => {
  it('памятка без опубликованного урока не попадает в список', () => {
    const picked = pickVisibleMemos(
      [{ memoId: 'public', day: 1, lesson: 'день 1' }],
      ['public', 'draft-day-5'],
    );
    expect(picked.map((item) => item.memoId)).toEqual(['public']);
  });

  it('порядок по дням, повтор памятки показан один раз', () => {
    const picked = pickVisibleMemos(
      [
        { memoId: 'c', day: 6, lesson: 'x' },
        { memoId: 'b', day: 5, lesson: 'x' },
        { memoId: 'a', day: 4, lesson: 'x' },
        { memoId: 'b', day: 7, lesson: 'x' },
      ],
      ['a', 'b', 'c'],
    );
    expect(picked.map((item) => item.memoId)).toEqual(['a', 'b', 'c']);
  });

  it('ссылка на несуществующую памятку не ломает список', () => {
    expect(pickVisibleMemos([{ memoId: 'нет', day: 1, lesson: 'x' }], [])).toEqual([]);
  });
});
