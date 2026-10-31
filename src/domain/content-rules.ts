// Правила контента курса: чистые функции без файловой системы. Их запускает scripts/check-content.ts,
// а покрывают тесты tests/unit/content-rules.test.ts.

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface TaskField {
  id: string;
  label: string;
  sensitive?: boolean;
}

export interface LessonInput {
  file: string;
  body: string;
  data: {
    id?: string;
    day?: number;
    title?: string;
    goal?: string;
    question?: string;
    minutes?: number;
    teen?: ChecklistItem[];
    couple?: ChecklistItem[];
    task?: { id?: string; text?: string; fields?: TaskField[] };
    memo?: string;
    sources?: { title?: string; url?: string }[];
  };
}

export interface MemoInput {
  file: string;
  body: string;
  data: { id?: string; title?: string; day?: number };
}

export const REQUIRED_SECTIONS = ['История', 'Пример из жизни', 'Суть', 'Вопрос этики'] as const;

/** Разделы, где речь о реальных людях и героях: у них род есть, проверка рода к ним не относится. */
const SECTIONS_WITH_CHARACTERS = new Set<string>(['История', 'Пример из жизни']);

// Родовые формы про читателя. Прошедшее время после «ты», краткие прилагательные, «(а)».
const GENDERED_FORMS: RegExp[] = [
  /(?<![а-яё])ты\s+(?:не\s+|уже\s+|тоже\s+|сам\s+|сама\s+)?[а-яё]+(?:л|ла|лся|лась)(?![а-яё])/iu,
  /(?<![а-яё])ты\s+(?:не\s+|уже\s+)?(?:готов|готова|должен|должна|уверен|уверена|рад|рада|виноват|виновата|один|одна|сам|сама|обязан|обязана|способен|способна|счастлив|счастлива|нужен|нужна|прав|права|свободен|свободна|одинок|одинока)(?![а-яё])/iu,
  /[а-яё]+\((?:а|ла|ая|на)\)/iu,
];

// Правила безопасности из docs/editorial.md: без названий веществ и доз, без способов.
const UNSAFE_WORDS: RegExp[] = [
  /(?<![а-яё])(?:героин|кокаин|метадон|мефедрон|амфетамин|марихуан|гашиш|спайс|лсд|экстази|барбитурат)[а-яё]*/iu,
  /(?<![а-яё])доз(?:а|у|ы|е|ой|ами|ах)?(?![а-яё])/iu,
  /(?<![а-яё])(?:повеситься|повесился|повесилась|вскрыть вены|передозировк[а-яё]*)(?![а-яё])/iu,
];

export interface Section {
  title: string;
  text: string;
}

/** Делит Markdown по заголовкам второго уровня. Текст до первого заголовка — раздел с пустым названием. */
export function splitSections(body: string): Section[] {
  const sections: Section[] = [{ title: '', text: '' }];
  for (const line of body.split('\n')) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) sections.push({ title: match[1] ?? '', text: '' });
    else {
      const current = sections.at(-1);
      if (current) current.text += `${line}\n`;
    }
  }
  return sections;
}

export function findGenderedForm(text: string): string | undefined {
  for (const pattern of GENDERED_FORMS) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return undefined;
}

export function findUnsafeWord(text: string): string | undefined {
  for (const pattern of UNSAFE_WORDS) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return undefined;
}

function readerFacingTexts(lesson: LessonInput): string[] {
  const { goal, question, teen, couple, task } = lesson.data;
  return [
    goal ?? '',
    question ?? '',
    ...(teen ?? []).map((item) => item.text),
    ...(couple ?? []).map((item) => item.text),
    task?.text ?? '',
    ...(task?.fields ?? []).map((field) => field.label),
    ...splitSections(lesson.body)
      .filter((section) => !SECTIONS_WITH_CHARACTERS.has(section.title))
      .map((section) => section.text),
  ];
}

/** Возвращает список ошибок. Пустой список — контент в порядке. */
export function checkContent(lessons: LessonInput[], memos: MemoInput[]): string[] {
  const errors: string[] = [];
  const seenIds = new Map<string, string>();

  const claim = (id: string | undefined, kind: string, file: string) => {
    if (!id) {
      errors.push(`${file}: нет id у «${kind}»`);
      return;
    }
    const earlier = seenIds.get(id);
    if (earlier) errors.push(`${file}: повтор id «${id}» (${kind}), уже есть в ${earlier}`);
    else seenIds.set(id, file);
  };

  for (const memo of memos) {
    claim(memo.data.id, 'памятка', memo.file);
    if (!memo.data.title) errors.push(`${memo.file}: у памятки нет названия`);
    if (!memo.body.trim()) errors.push(`${memo.file}: пустая памятка`);
    const gendered = findGenderedForm(memo.body);
    if (gendered) errors.push(`${memo.file}: родовая форма про читателя: «${gendered}»`);
    const unsafe = findUnsafeWord(memo.body);
    if (unsafe) errors.push(`${memo.file}: запрещённое слово: «${unsafe}»`);
  }
  const memoIds = new Set(memos.map((memo) => memo.data.id));

  for (const lesson of lessons) {
    const { file, data, body } = lesson;
    claim(data.id, 'урок', file);
    for (const field of ['title', 'goal', 'question'] as const) {
      if (!data[field]?.trim()) errors.push(`${file}: нет поля ${field}`);
    }
    if (!data.day || data.day < 1 || data.day > 7)
      errors.push(`${file}: день должен быть от 1 до 7`);

    const titles = new Set(splitSections(body).map((section) => section.title));
    for (const required of REQUIRED_SECTIONS) {
      if (!titles.has(required)) errors.push(`${file}: нет раздела «${required}»`);
    }

    if (!data.sources?.length) errors.push(`${file}: нет источников`);
    for (const source of data.sources ?? []) {
      if (!source.title?.trim()) errors.push(`${file}: у источника нет названия`);
      if (source.url && !/^https:\/\//.test(source.url)) {
        errors.push(`${file}: ссылка источника должна быть https: ${source.url}`);
      }
    }

    for (const [list, name] of [
      [data.teen, 'чек-лист «Мне 14–17»'],
      [data.couple, 'чек-лист «Мы уже пара»'],
    ] as const) {
      if (!list?.length) errors.push(`${file}: пустой ${name}`);
      for (const item of list ?? []) claim(item.id, name, file);
    }

    if (!data.task?.text?.trim()) errors.push(`${file}: нет задания`);
    claim(data.task?.id, 'задание', file);
    for (const field of data.task?.fields ?? []) claim(field.id, 'поле задания', file);

    if (!data.memo) errors.push(`${file}: нет ссылки на памятку`);
    else if (!memoIds.has(data.memo)) errors.push(`${file}: нет памятки «${data.memo}»`);

    for (const text of readerFacingTexts(lesson)) {
      const gendered = findGenderedForm(text);
      if (gendered) errors.push(`${file}: родовая форма про читателя: «${gendered}»`);
    }
    const unsafe = findUnsafeWord(`${JSON.stringify(data)}\n${body}`);
    if (unsafe) errors.push(`${file}: запрещённое слово: «${unsafe}»`);
  }

  return errors;
}
