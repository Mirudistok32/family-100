import { describe, expect, it } from 'vitest';

import {
  checkContent,
  findGenderedForm,
  findUnsafeWord,
  type LessonInput,
  type MemoInput,
  splitSections,
} from '@/domain/content-rules';

const memo = (over: Partial<MemoInput['data']> = {}): MemoInput => ({
  file: 'memo.md',
  body: 'Текст памятки.',
  data: { id: 'memo-1', title: 'Памятка', day: 1, ...over },
});

const BODY = [
  '## История',
  'Текст.',
  '## Пример из жизни',
  'Текст.',
  '## Суть',
  'Текст.',
  '## Вопрос этики',
  '**Вопрос?**',
  'Об этом думал Аристотель.',
  '- **Да.** Потому что.',
  '- **Нет.** Потому что.',
].join('\n');

const lesson = (over: Partial<LessonInput['data']> = {}, body = BODY): LessonInput => ({
  file: 'day.md',
  body,
  data: {
    id: 'day-1',
    day: 1,
    title: 'День',
    goal: 'Цель',
    question: 'Вопрос?',
    minutes: 25,
    teen: [{ id: 't-1', text: 'Пункт' }],
    couple: [{ id: 'c-1', text: 'Пункт' }],
    task: { id: 'task-1', text: 'Задание', fields: [{ id: 'f-1', label: 'Поле' }] },
    thinkers: ['Аристотель'],
    memo: 'memo-1',
    sources: [{ title: 'Книга', url: 'https://example.org/' }],
    ...over,
  },
});

describe('checkContent', () => {
  it('хороший день проходит', () => {
    expect(checkContent([lesson()], [memo()])).toEqual([]);
  });

  it('день без источника не проходит', () => {
    expect(checkContent([lesson({ sources: [] })], [memo()])).toContain('day.md: нет источников');
  });

  it('повтор id урока не проходит', () => {
    const errors = checkContent(
      [
        lesson(),
        lesson({
          teen: [{ id: 't-2', text: 'Пункт' }],
          couple: [{ id: 'c-2', text: 'Пункт' }],
          task: { id: 'task-2', text: 'Задание' },
        }),
      ],
      [memo()],
    );
    expect(errors).toEqual(['day.md: повтор id «day-1» (урок), уже есть в day.md']);
  });

  it('повтор id пункта чек-листа между днями не проходит', () => {
    const second = lesson({
      id: 'day-2',
      couple: [{ id: 'c-2', text: 'Пункт' }],
      task: { id: 'task-2', text: 'Задание' },
    });
    expect(checkContent([lesson(), second], [memo()]).join()).toContain('повтор id «t-1»');
  });

  it('раздел этики без вопроса жирным не проходит', () => {
    const body = BODY.replace('**Вопрос?**', 'Вопрос?');
    expect(checkContent([lesson({}, body)], [memo()]).join()).toContain('вопроса жирным');
  });

  it('раздел этики с одной позицией не проходит', () => {
    const body = BODY.replace('- **Нет.** Потому что.\n', '').replace('- **Нет.** Потому что.', '');
    expect(checkContent([lesson({}, body)], [memo()]).join()).toContain('меньше двух позиций');
  });

  it('без мыслителя и с мыслителем не из текста не проходит', () => {
    expect(checkContent([lesson({ thinkers: [] })], [memo()]).join()).toContain('не указан');
    expect(checkContent([lesson({ thinkers: ['Кант'] })], [memo()]).join()).toContain(
      'не упомянут',
    );
  });

  it('нет обязательного раздела', () => {
    const errors = checkContent([lesson({}, '## История\nТекст.')], [memo()]);
    expect(errors).toContain('day.md: нет раздела «Суть»');
  });

  it('ссылка на несуществующую памятку', () => {
    expect(checkContent([lesson({ memo: 'nope' })], [memo()])).toContain(
      'day.md: нет памятки «nope»',
    );
  });

  it('родовая форма про читателя в чек-листе', () => {
    const errors = checkContent(
      [lesson({ teen: [{ id: 't-1', text: 'Ты готов поговорить' }] })],
      [memo()],
    );
    expect(errors.join()).toContain('родовая форма');
  });

  it('у героев в примере род можно', () => {
    const body = BODY.replace(
      '## Пример из жизни\nТекст.',
      '## Пример из жизни\nТы сказал ему правду.',
    );
    expect(checkContent([lesson({}, body)], [memo()])).toEqual([]);
  });

  it('в «Сути» родовая форма не проходит', () => {
    const body = BODY.replace('## Суть\nТекст.', '## Суть\nТы сделал первый шаг.');
    expect(checkContent([lesson({}, body)], [memo()]).join()).toContain('родовая форма');
  });

  it('название вещества не проходит нигде, даже в примере', () => {
    const body = BODY.replace(
      '## Пример из жизни\nТекст.',
      '## Пример из жизни\nОн принимал героин.',
    );
    expect(checkContent([lesson({}, body)], [memo()]).join()).toContain('запрещённое слово');
  });

  it('источник без https не проходит', () => {
    const errors = checkContent(
      [lesson({ sources: [{ title: 'К', url: 'http://a.b/' }] })],
      [memo()],
    );
    expect(errors.join()).toContain('должна быть https');
  });

  it('пустая памятка не проходит', () => {
    expect(checkContent([lesson()], [{ ...memo(), body: '  ' }])).toContain(
      'memo.md: пустая памятка',
    );
  });
});

describe('findGenderedForm', () => {
  it.each(['ты сделал', 'Ты не готова', 'ты уже решила', 'сделал(а)', 'ты сам', 'ты виноват'])(
    'находит «%s»',
    (text) => {
      expect(findGenderedForm(text)).toBeDefined();
    },
  );

  it.each(['ты решаешь', 'ты можешь', 'у тебя получилось', 'есть готовность', 'твоей вины нет'])(
    'пропускает «%s»',
    (text) => {
      expect(findGenderedForm(text)).toBeUndefined();
    },
  );
});

describe('findUnsafeWord', () => {
  it.each(['передозировка', 'какая доза', 'кокаин'])('находит «%s»', (text) => {
    expect(findUnsafeWord(text)).toBeDefined();
  });

  it.each(['дозвониться', 'алкоголь', 'наркомания', 'зависимость'])('пропускает «%s»', (text) => {
    expect(findUnsafeWord(text)).toBeUndefined();
  });
});

describe('splitSections', () => {
  it('делит по заголовкам второго уровня', () => {
    const sections = splitSections('до\n## А\nтекст а\n### Подзаголовок\n## Б\nтекст б');
    expect(sections.map((section) => section.title)).toEqual(['', 'А', 'Б']);
    expect(sections[1]?.text).toContain('### Подзаголовок');
  });
});
