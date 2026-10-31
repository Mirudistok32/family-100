// Записи заданий. Без DOM и хранилища. Ключ и формат постоянные: изменение только с миграцией (docs/save-format.md).
// Текст чувствительного поля сохраняется, только если его id есть в `keep`: согласие даётся на каждое поле отдельно.

export const NOTES_KEY = 'family100:notes:v1';

/** Предел длины одной записи. Он же стоит на поле ввода, поэтому обычный ввод его не достигает. */
export const MAX_NOTE_LENGTH = 10_000;

export interface Notes {
  schemaVersion: 1;
  fields: Record<string, string>;
  keep: string[];
}

export function emptyNotes(): Notes {
  return { schemaVersion: 1, fields: {}, keep: [] };
}

const ID = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;

/** Приводит недоверенное значение к формату: всё неверное отбрасывается. */
export function normalizeNotes(data: unknown): Notes {
  if (typeof data !== 'object' || data === null) return emptyNotes();
  const { schemaVersion, fields, keep } = data as Record<string, unknown>;
  if (schemaVersion !== 1) return emptyNotes();
  const entries =
    typeof fields === 'object' && fields !== null && !Array.isArray(fields)
      ? Object.entries(fields).filter(
          (entry): entry is [string, string] =>
            ID.test(entry[0]) &&
            typeof entry[1] === 'string' &&
            entry[1].length > 0 &&
            entry[1].length <= MAX_NOTE_LENGTH,
        )
      : [];
  const ids = Array.isArray(keep)
    ? keep.filter((id): id is string => typeof id === 'string' && ID.test(id))
    : [];
  return { schemaVersion: 1, fields: Object.fromEntries(entries), keep: [...new Set(ids)] };
}

/** Читает сохранённую строку. Содержимое хранилища недоверенное. */
export function parseNotes(raw: string | null): Notes {
  if (!raw) return emptyNotes();
  try {
    return normalizeNotes(JSON.parse(raw));
  } catch {
    return emptyNotes();
  }
}

export function getNote(notes: Notes, id: string): string {
  return Object.hasOwn(notes.fields, id) ? (notes.fields[id] ?? '') : '';
}

/** Пустой текст убирает запись, поэтому в хранилище и в копии нет пустых полей. */
export function setNote(notes: Notes, id: string, text: string): Notes {
  const fields = { ...notes.fields };
  if (text) fields[id] = text;
  else delete fields[id];
  return { ...notes, fields };
}

export function canKeep(notes: Notes, id: string): boolean {
  return notes.keep.includes(id);
}

/** Выключить сохранение значит сразу забыть уже сохранённый текст этого поля. */
export function setKeep(notes: Notes, id: string, on: boolean): Notes {
  const keep = notes.keep.filter((item) => item !== id);
  if (on) return { ...notes, keep: [...keep, id] };
  return setNote({ ...notes, keep }, id, '');
}

/** Убирает текст чувствительных полей без согласия. Нужно после импорта чужого или правленого файла. */
export function dropUnconsented(notes: Notes, sensitiveIds: readonly string[]): Notes {
  const allowed = new Set(notes.keep);
  return sensitiveIds
    .filter((id) => !allowed.has(id))
    .reduce((current, id) => setNote(current, id, ''), notes);
}

export function countNotes(notes: Notes): number {
  return Object.keys(notes.fields).length;
}
