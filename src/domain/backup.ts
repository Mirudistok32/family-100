// Копия данных пользователя: файл JSON, который он хранит сам. Без DOM. Формат — docs/save-format.md.
import { emptyNotes, normalizeNotes, type Notes } from '@/domain/notes';
import { emptyProgress, normalizeProgress, type Progress } from '@/domain/progress';

export const BACKUP_FORMAT = 'family100-backup';
export const MAX_BACKUP_BYTES = 1_000_000;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  progress: Progress;
  notes: Notes;
}

export type BackupProblem = 'not-json' | 'not-backup' | 'newer-version';

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; problem: BackupProblem };

export function createBackup(progress: Progress, notes: Notes, now: Date): Backup {
  return { format: BACKUP_FORMAT, version: 1, exportedAt: now.toISOString(), progress, notes };
}

export function backupFileName(now: Date): string {
  return `family-100-kopiya-${now.toISOString().slice(0, 10)}.json`;
}

/** Разбирает файл пользователя. Файл недоверенный: всё неверное внутри отбрасывается. */
export function parseBackup(raw: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, problem: 'not-json' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, problem: 'not-backup' };
  const { format, version, exportedAt, progress, notes } = data as Record<string, unknown>;
  if (format !== BACKUP_FORMAT) return { ok: false, problem: 'not-backup' };
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, problem: 'not-backup' };
  }
  if (version > 1) return { ok: false, problem: 'newer-version' };
  return {
    ok: true,
    backup: {
      format: BACKUP_FORMAT,
      version: 1,
      exportedAt: isValidDate(exportedAt) ? exportedAt : '',
      progress: progress === undefined ? emptyProgress() : normalizeProgress(progress),
      notes: notes === undefined ? emptyNotes() : normalizeNotes(notes),
    },
  };
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

/** Дата копии для предпросмотра. Пустая строка, если в файле её нет. */
export function formatBackupDate(exportedAt: string): string {
  if (!exportedAt) return '';
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'short' }).format(
    new Date(exportedAt),
  );
}
