import { describe, expect, it } from 'vitest';

import { AUDIT_STATEMENTS, AUDIT_STEPS } from '@/data/capital-audit';
import {
  AUDIENCES,
  type Audit,
  type AuditQuestion,
  CAPITALS,
  emptyAudit,
  parseAudit,
  pickFocus,
  scoreAudit,
  serializeAudit,
  setAnswer,
  setAudience,
} from '@/domain/capital-audit';
import { normalizeNotes } from '@/domain/notes';

const QUESTIONS: AuditQuestion[] = [
  { id: 'a1', audience: 'self', capital: 'human' },
  { id: 'a2', audience: 'self', capital: 'human' },
  { id: 'b1', audience: 'self', capital: 'financial' },
  { id: 'c1', audience: 'couple', capital: 'human' },
];

function audit(answers: Audit['answers']): Audit {
  return { audience: 'self', answers };
}

function score(answers: Audit['answers'], capital = 'human') {
  return scoreAudit(audit(answers), QUESTIONS).find((item) => item.capital === capital);
}

describe('parseAudit', () => {
  it('миграция: старая аудитория и старые вопросы читаются как новые', () => {
    const questions: AuditQuestion[] = [
      { id: 'self-save', audience: 'self', capital: 'financial' },
    ];
    const raw = '{"audience":"teen","answers":{"teen-save":1,"teen-unknown":2}}';
    expect(parseAudit(raw, questions)).toEqual({ audience: 'self', answers: { 'self-save': 1 } });
  });

  it('миграция: настоящие вопросы teen-* находят пару среди новых', () => {
    const raw = '{"audience":"teen","answers":{"teen-track":2,"teen-adult":1,"teen-community":0}}';
    expect(parseAudit(raw, AUDIT_STATEMENTS).answers).toEqual({
      'self-track': 2,
      'self-adult': 1,
      'self-community': 0,
    });
  });

  it('возвращает сохранённое', () => {
    const saved = serializeAudit(audit({ a1: 2, b1: 0 }));
    expect(parseAudit(saved, QUESTIONS)).toEqual(audit({ a1: 2, b1: 0 }));
  });

  it('битая строка и не тот тип дают пустой аудит', () => {
    for (const raw of ['', 'не json', 'null', '[]', '5', '{"answers":[1]}']) {
      expect(parseAudit(raw, QUESTIONS)).toEqual(emptyAudit());
    }
  });

  it('отбрасывает незнакомые вопросы, аудиторию и неверные значения', () => {
    const raw = JSON.stringify({
      audience: 'admin',
      answers: { a1: 3, a2: '2', b1: 1.5, zzz: 2, c1: 1 },
    });
    expect(parseAudit(raw, QUESTIONS)).toEqual({ answers: { c1: 1 } });
  });

  it('__proto__ в файле не становится ответом и не портит прототип', () => {
    const parsed = parseAudit('{"answers":{"__proto__":{"a1":2},"a1":1}}', QUESTIONS);
    expect(parsed.answers).toEqual({ a1: 1 });
    expect(Object.getPrototypeOf(parsed.answers)).toBe(Object.prototype);
  });
});

describe('serializeAudit', () => {
  it('пустой аудит даёт пустую строку, такой записи нет в хранилище', () => {
    expect(serializeAudit(emptyAudit())).toBe('');
  });

  it('заполненный аудит проходит проверку записей и в ней не теряется', () => {
    const text = serializeAudit(setAnswer(setAudience(emptyAudit(), 'couple'), 'c1', 2));
    const notes = normalizeNotes({
      schemaVersion: 1,
      fields: { 'd6-means-task-audit': text },
      keep: [],
    });
    expect(notes.fields['d6-means-task-audit']).toBe(text);
  });
});

describe('setAnswer и setAudience', () => {
  it('не меняют исходный аудит', () => {
    const before = emptyAudit();
    setAnswer(before, 'a1', 2);
    setAudience(before, 'self');
    expect(before).toEqual(emptyAudit());
  });

  it('ответ на тот же вопрос заменяется', () => {
    expect(setAnswer(audit({ a1: 0 }), 'a1', 2).answers).toEqual({ a1: 2 });
  });
});

describe('scoreAudit', () => {
  it('без аудитории считать нечего', () => {
    expect(scoreAudit({ answers: { a1: 2 } }, QUESTIONS)).toEqual([]);
  });

  it('считает все капиталы в постоянном порядке', () => {
    expect(scoreAudit(audit({}), QUESTIONS).map((item) => item.capital)).toEqual([...CAPITALS]);
  });

  it('считает только вопросы выбранной аудитории', () => {
    expect(score({ a1: 2, c1: 2 })).toMatchObject({ points: 2, max: 4, answered: 1, total: 2 });
  });

  it('капитал без ответов не считается слабым', () => {
    expect(score({})?.level).toBe('empty');
  });

  it('пропуск не считается нулём: уровень идёт по отвеченным', () => {
    expect(score({ a1: 2 })?.level).toBe('strong');
  });

  it.each([
    [{ a1: 0, a2: 0 }, 'start'],
    [{ a1: 1, a2: 0 }, 'start'],
    [{ a1: 1, a2: 1 }, 'growing'],
    [{ a1: 2, a2: 1 }, 'growing'],
    [{ a1: 2, a2: 2 }, 'strong'],
  ] as const)('ответы %o дают уровень %s', (answers, level) => {
    expect(score(answers)?.level).toBe(level);
  });

  it('границы уровней на реальных вопросах: 2 из 6 ещё начало, 5 из 6 уже опора', () => {
    const [first, second, third] = AUDIT_STATEMENTS.filter(
      (item) => item.audience === 'self' && item.capital === 'human',
    ).map((item) => item.id);
    const human = (a: 0 | 1 | 2, b: 0 | 1 | 2, c: 0 | 1 | 2) =>
      scoreAudit(
        { audience: 'self', answers: { [first ?? '']: a, [second ?? '']: b, [third ?? '']: c } },
        AUDIT_STATEMENTS,
      )[0]?.level;
    expect(human(1, 1, 0)).toBe('start');
    expect(human(1, 1, 1)).toBe('growing');
    expect(human(2, 2, 0)).toBe('growing');
    expect(human(2, 2, 1)).toBe('strong');
  });
});

describe('pickFocus', () => {
  it('выбирает самую низкую долю', () => {
    expect(pickFocus(scoreAudit(audit({ a1: 1, a2: 1, b1: 0 }), QUESTIONS))).toBe('financial');
  });

  it('при равенстве берёт тот, что раньше в списке', () => {
    expect(pickFocus(scoreAudit(audit({ a1: 0, a2: 0, b1: 0 }), QUESTIONS))).toBe('human');
  });

  it('крепкие и пустые капиталы не предлагает', () => {
    expect(pickFocus(scoreAudit(audit({ a1: 2, a2: 2 }), QUESTIONS))).toBeUndefined();
    expect(pickFocus(scoreAudit(audit({}), QUESTIONS))).toBeUndefined();
    expect(pickFocus([])).toBeUndefined();
  });
});

describe('тексты аудита', () => {
  it('id вопросов уникальны', () => {
    const ids = AUDIT_STATEMENTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('у каждой аудитории по три вопроса на капитал и шаг на каждый капитал', () => {
    for (const audience of AUDIENCES) {
      for (const capital of CAPITALS) {
        const own = AUDIT_STATEMENTS.filter(
          (item) => item.audience === audience && item.capital === capital,
        );
        expect(own).toHaveLength(3);
        expect(AUDIT_STEPS[audience][capital]).not.toBe('');
      }
    }
  });
});
