import { describe, expect, it } from 'vitest';

import { backupFileName, createBackup, formatBackupDate, parseBackup } from '@/domain/backup';
import { emptyNotes } from '@/domain/notes';
import { emptyProgress } from '@/domain/progress';

const NOW = new Date('2026-10-31T12:00:00.000Z');

describe('копия данных', () => {
  it('копия читается обратно без потерь', () => {
    const progress = { schemaVersion: 1 as const, checked: ['d1-self-1'] };
    const notes = { schemaVersion: 1 as const, fields: { 'd1-task-circle': 'Бабушка' }, keep: [] };
    const parsed = parseBackup(JSON.stringify(createBackup(progress, notes, NOW)));
    expect(parsed).toEqual({
      ok: true,
      backup: {
        format: 'family100-backup',
        version: 1,
        exportedAt: '2026-10-31T12:00:00.000Z',
        progress,
        notes,
      },
    });
  });

  it('имя файла содержит дату', () => {
    expect(backupFileName(NOW)).toBe('family-100-kopiya-2026-10-31.json');
  });

  it('файл не JSON и чужой JSON отклоняются', () => {
    expect(parseBackup('{нет')).toEqual({ ok: false, problem: 'not-json' });
    expect(parseBackup('[1,2]')).toEqual({ ok: false, problem: 'not-backup' });
    expect(parseBackup('null')).toEqual({ ok: false, problem: 'not-backup' });
    expect(parseBackup('{"format":"чужой","version":1}')).toEqual({
      ok: false,
      problem: 'not-backup',
    });
    expect(parseBackup('{"format":"family100-backup","version":"1"}')).toEqual({
      ok: false,
      problem: 'not-backup',
    });
  });

  it('копия новой версии не читается как своя', () => {
    expect(parseBackup('{"format":"family100-backup","version":2}')).toEqual({
      ok: false,
      problem: 'newer-version',
    });
  });

  it('содержимое файла проходит те же проверки, что и хранилище', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'family100-backup',
        version: 1,
        exportedAt: 'когда-то',
        progress: {
          schemaVersion: 1,
          checked: ['ok', 7],
          last: { id: 'day-1', title: 'x', path: 'javascript:alert(1)' },
        },
        notes: { schemaVersion: 1, fields: { ok: 'да', 'плохой id': 'нет' }, keep: [] },
      }),
    );
    if (!parsed.ok) throw new Error('файл должен разобраться');
    expect(parsed.backup.exportedAt).toBe('');
    expect(parsed.backup.progress).toEqual({ schemaVersion: 1, checked: ['ok'] });
    expect(parsed.backup.notes.fields).toEqual({ ok: 'да' });
  });

  it('без частей файла получаем пустые данные', () => {
    const parsed = parseBackup('{"format":"family100-backup","version":1}');
    if (!parsed.ok) throw new Error('файл должен разобраться');
    expect(parsed.backup.progress).toEqual(emptyProgress());
    expect(parsed.backup.notes).toEqual(emptyNotes());
  });

  it('дата в предпросмотре по-русски, пустая дата не ломает вывод', () => {
    expect(formatBackupDate('')).toBe('');
    expect(formatBackupDate('2026-10-31T12:00:00.000Z')).toContain('октября 2026');
  });

  it('старая копия читается с той же миграцией, а записи не теряются', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'family100-backup',
        version: 1,
        exportedAt: '2026-10-31T12:00:00.000Z',
        progress: { schemaVersion: 1, checked: ['d1-teen-1', 'd1-self-1'] },
        notes: {
          schemaVersion: 1,
          fields: { 'd5-abuse-task-adults': 'старая запись', 'd7-task-mission': 'миссия' },
          keep: [],
        },
      }),
    );
    expect(parsed.ok && parsed.backup.progress.checked).toEqual(['d1-self-1']);
    expect(parsed.ok && parsed.backup.notes.fields).toEqual({
      'd5-abuse-task-adults': 'старая запись',
      'd7-task-mission': 'миссия',
    });
  });
});
