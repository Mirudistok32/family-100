import { describe, expect, it } from 'vitest';

import {
  AGE_OPTIONS,
  AGE_QUESTION,
  CLIMATE_OPTIONS,
  CLIMATE_QUESTION,
  SIGN_OPTIONS,
  SIGNS_QUESTION,
  SITUATION_CARDS,
} from '@/data/my-situation';
import { findGenderedForm, findUnsafeWord } from '@/domain/content-rules';
import {
  AGES,
  asksForSigns,
  CARD_IDS,
  CHANGE_SIGNS,
  CLIMATES,
  pickCards,
  toAnswers,
} from '@/domain/situation';

describe('«Моя ситуация»: выбор карточек', () => {
  it('без ответа об обстановке ничего не советует', () => {
    expect(pickCards({ signs: [] })).toEqual([]);
    expect(pickCards({ age: 'adult', signs: [] })).toEqual([]);
    expect(pickCards({ age: 'teen', signs: [] })).toEqual([]);
  });

  it('при опасности первой идёт безопасность, даже если возраст не указан', () => {
    expect(pickCards({ climate: 'danger', signs: [] })).toEqual(['danger-now']);
    expect(pickCards({ age: 'teen', climate: 'danger', signs: [] })).toEqual([
      'danger-now',
      'teen-danger',
    ]);
    expect(pickCards({ age: 'adult', climate: 'danger', signs: [] })).toEqual([
      'danger-now',
      'adult-danger',
    ]);
  });

  it('при опасности нет ни лестницы, ни разговора о переменах', () => {
    const cards = pickCards({ age: 'adult', climate: 'danger', signs: CHANGE_SIGNS });
    expect(cards).not.toContain('adult-ladder');
    expect(cards).not.toContain('change-visible');
    expect(asksForSigns({ age: 'adult', climate: 'danger', signs: [] })).toBe(false);
  });

  it('подростку лестницу не показывает никогда', () => {
    for (const climate of CLIMATES) {
      const cards = pickCards({ age: 'teen', climate, signs: CHANGE_SIGNS });
      expect(cards).not.toContain('adult-ladder');
      expect(cards.filter((card) => card.startsWith('change-'))).toEqual([]);
    }
    expect(asksForSigns({ age: 'teen', climate: 'heavy', signs: [] })).toBe(false);
  });

  it('взрослому без опасности показывает лестницу и карточку по числу признаков', () => {
    const base = { age: 'adult', climate: 'heavy' } as const;
    expect(pickCards({ ...base, signs: [] })).toEqual(['adult-ladder', 'change-none']);
    expect(pickCards({ ...base, signs: ['admits'] })).toEqual(['adult-ladder', 'change-partial']);
    expect(pickCards({ ...base, signs: CHANGE_SIGNS })).toEqual(['adult-ladder', 'change-visible']);
    expect(asksForSigns({ ...base, signs: [] })).toBe(true);
  });

  it('если непонятно, как назвать, предлагает спросить службу', () => {
    expect(pickCards({ climate: 'unsure', signs: [] })).toEqual(['unsure']);
    expect(pickCards({ age: 'teen', climate: 'unsure', signs: [] })).toEqual([
      'unsure',
      'teen-path',
    ]);
  });

  it('незнакомые значения формы отбрасывает', () => {
    expect(toAnswers('child', 'calm', ['admits', 'x', 'admits'])).toEqual({ signs: ['admits'] });
    expect(toAnswers(null, null, [])).toEqual({ signs: [] });
    expect(toAnswers('teen', 'heavy', [])).toEqual({ age: 'teen', climate: 'heavy', signs: [] });
  });
});

describe('«Моя ситуация»: тексты', () => {
  const texts = [
    AGE_QUESTION,
    CLIMATE_QUESTION,
    SIGNS_QUESTION,
    ...AGE_OPTIONS.map((option) => option.label),
    ...CLIMATE_OPTIONS.map((option) => option.label),
    ...SIGN_OPTIONS.map((option) => option.label),
    ...CARD_IDS.flatMap((id) => [SITUATION_CARDS[id].title, ...SITUATION_CARDS[id].paragraphs]),
  ];

  it('без родовых форм про читателя и без запрещённых слов', () => {
    for (const text of texts) {
      expect(findGenderedForm(text), text).toBeUndefined();
      expect(findUnsafeWord(text), text).toBeUndefined();
    }
  });

  it('каждому значению соответствует вариант ответа', () => {
    expect(AGE_OPTIONS.map((option) => option.value)).toEqual([...AGES]);
    expect(CLIMATE_OPTIONS.map((option) => option.value)).toEqual([...CLIMATES]);
    expect(SIGN_OPTIONS.map((option) => option.value)).toEqual([...CHANGE_SIGNS]);
  });

  it('при опасности есть полиция и живой человек', () => {
    expect(SITUATION_CARDS['danger-now'].paragraphs.join(' ')).toContain('полицию');
    expect(SITUATION_CARDS['teen-danger'].paragraphs.join(' ')).toContain('взрослому');
    expect(SITUATION_CARDS['adult-danger'].paragraphs.join(' ')).toContain('специалистом');
  });
});
