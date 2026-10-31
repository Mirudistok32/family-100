// Прогресс курса: отмеченные пункты чек-листов и последний открытый урок. Без DOM и хранилища.
// Ключ и формат постоянные: изменение только с миграцией (docs/save-format.md). Стриков здесь нет намеренно.

export const PROGRESS_KEY = 'family100:progress:v1';

export interface LastLesson {
  id: string;
  title: string;
  path: string;
}

export interface Progress {
  schemaVersion: 1;
  checked: string[];
  last?: LastLesson;
}

export function emptyProgress(): Progress {
  return { schemaVersion: 1, checked: [] };
}

const ID = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
const MAX_TITLE = 200;

/** Внутренний адрес: только путь сайта, без чужого домена и `javascript:`. Значение пришло из хранилища. */
export function isSafePath(path: unknown): path is string {
  return typeof path === 'string' && /^\/(?!\/)[a-z0-9\-/]*$/i.test(path);
}

function parseLast(value: unknown): LastLesson | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const { id, title, path } = value as Record<string, unknown>;
  if (typeof id !== 'string' || !ID.test(id)) return undefined;
  if (typeof title !== 'string' || !title || title.length > MAX_TITLE) return undefined;
  if (!isSafePath(path)) return undefined;
  return { id, title, path };
}

/** Читает сохранённую строку. Содержимое хранилища недоверенное: всё неверное отбрасывается. */
export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (typeof data !== 'object' || data === null) return emptyProgress();
  const { schemaVersion, checked, last } = data as Record<string, unknown>;
  if (schemaVersion !== 1) return emptyProgress();
  const ids = Array.isArray(checked)
    ? checked.filter((id): id is string => typeof id === 'string' && ID.test(id))
    : [];
  const progress: Progress = { schemaVersion: 1, checked: [...new Set(ids)] };
  const parsedLast = parseLast(last);
  if (parsedLast) progress.last = parsedLast;
  return progress;
}

export function setChecked(progress: Progress, id: string, on: boolean): Progress {
  const without = progress.checked.filter((item) => item !== id);
  return { ...progress, checked: on ? [...without, id] : without };
}

export function setLast(progress: Progress, last: LastLesson): Progress {
  return { ...progress, last };
}

export function countChecked(progress: Progress, ids: readonly string[]): number {
  const checked = new Set(progress.checked);
  return ids.filter((id) => checked.has(id)).length;
}
