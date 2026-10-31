// Семейная конституция: сборка документа из записей. Без DOM и хранилища.
// Своего ключа нет: части лежат в записях заданий, часть из них общая с днями 5 и 7 (docs/save-format.md).
import { type Audience, AUDIENCES } from '@/domain/capital-audit';

/** Выбранная версия лежит в записях под этим постоянным id, значение — `teen` или `couple`. */
export const VERSION_NOTE_ID = 'constitution-version';

export const DEFAULT_VERSION: Audience = 'teen';

export interface ConstitutionSection {
  /** Постоянный id записи. Менять нельзя: это данные пользователя. */
  noteId: string;
  label: string;
  sensitive: boolean;
  /** Заголовок части в документе. */
  titles: Record<Audience, string>;
  /** Вопрос над полем. */
  prompts: Record<Audience, string>;
}

export interface ConstitutionDocument {
  sections: { noteId: string; title: string; text: string }[];
}

/** Содержимое записи недоверенное: всё, кроме известной версии, считаем версией по умолчанию. */
export function parseVersion(raw: string): Audience {
  return AUDIENCES.find((version) => version === raw) ?? DEFAULT_VERSION;
}

/** В документ идут только заполненные части, в порядке формы. */
export function buildDocument(
  sections: readonly ConstitutionSection[],
  textOf: (noteId: string) => string,
  version: Audience,
): ConstitutionDocument {
  return {
    sections: sections.flatMap(({ noteId, titles }) => {
      const text = textOf(noteId).trim();
      return text ? [{ noteId, title: titles[version], text }] : [];
    }),
  };
}

/** Знаков в строке с запасом: на листе A4 при 12 pt их около 80. */
const CHARS_PER_LINE = 72;

/** Строк текста на двух листах, когда заполнены все части. Предел проверяет e2e по настоящему PDF. */
export const MAX_DOCUMENT_LINES = 56;

/** Оценка высоты текста: короткие строки с переносом занимают место так же, как длинные. */
export function documentLines(document: ConstitutionDocument): number {
  return document.sections
    .flatMap(({ text }) => text.split('\n'))
    .reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / CHARS_PER_LINE)), 0);
}

export function fitsTwoSheets(document: ConstitutionDocument): boolean {
  return documentLines(document) <= MAX_DOCUMENT_LINES;
}
