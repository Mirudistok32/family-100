// «Мои записи»: копия данных файлом, импорт с предпросмотром и удаление всего. Файл только читается здесь же,
// на сервер ничего не уходит. Содержимое файла недоверенное: выводим только через textContent.
import { clearNoteFields, reloadNotes } from '@/client/notes';
import {
  type Backup,
  backupFileName,
  type BackupProblem,
  createBackup,
  formatBackupDate,
  MAX_BACKUP_BYTES,
  parseBackup,
} from '@/domain/backup';
import { countNotes, dropUnconsented, NOTES_KEY, parseNotes } from '@/domain/notes';
import { parseProgress, PROGRESS_KEY } from '@/domain/progress';
import { readItem, removeItem, writeItem } from '@/lib/storage';

const PROBLEMS: Record<BackupProblem | 'too-big' | 'unreadable', string> = {
  'not-json': 'Это не файл копии: внутри не JSON. Твои данные не изменились.',
  'not-backup': 'Это не копия данных этого курса. Твои данные не изменились.',
  'newer-version':
    'Копию сделала более новая версия курса. Обнови страницу и попробуй снова. Твои данные не изменились.',
  'too-big': 'Файл слишком большой для копии записей. Твои данные не изменились.',
  unreadable: 'Браузер не смог прочитать файл. Твои данные не изменились.',
};

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`На странице нет ${selector}`);
  return element;
}

const status = required<HTMLElement>('[data-data-status]');
const exportButton = required<HTMLButtonElement>('[data-export]');
const importInput = required<HTMLInputElement>('[data-import]');
const preview = required<HTMLElement>('[data-import-preview]');
const previewFacts = required<HTMLUListElement>('[data-import-facts]');
const applyButton = required<HTMLButtonElement>('[data-import-apply]');
const cancelButton = required<HTMLButtonElement>('[data-import-cancel]');
const eraseButton = required<HTMLButtonElement>('[data-erase]');
const eraseDialog = required<HTMLDialogElement>('[data-erase-dialog]');
const eraseConfirm = required<HTMLButtonElement>('[data-erase-confirm]');
const eraseCancel = required<HTMLButtonElement>('[data-erase-cancel]');

let pending: Backup | undefined;

function say(message: string, problem = false): void {
  status.textContent = message;
  status.classList.toggle('data-status--problem', problem);
}

function sensitiveIds(): string[] {
  return [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-sensitive]')]
    .map((field) => field.dataset['noteId'] ?? '')
    .filter(Boolean);
}

function labelFor(id: string): string {
  const field = document.querySelector<HTMLTextAreaElement>(
    `textarea[data-note-id="${CSS.escape(id)}"]`,
  );
  return field?.labels?.[0]?.textContent?.trim() ?? 'Запись из другой версии курса';
}

function hidePreview(): void {
  pending = undefined;
  preview.hidden = true;
  previewFacts.replaceChildren();
}

function fact(text: string): HTMLLIElement {
  const item = document.createElement('li');
  item.textContent = text;
  return item;
}

function showPreview(backup: Backup): void {
  pending = { ...backup, notes: dropUnconsented(backup.notes, sensitiveIds()) };
  const date = formatBackupDate(backup.exportedAt);
  const facts = [
    date ? `Копия сделана: ${date}` : 'Дата копии не указана',
    `Отмеченных пунктов: ${pending.progress.checked.length}`,
    `Записей: ${countNotes(pending.notes)}`,
    ...Object.keys(pending.notes.fields).map((id) => `Запись: ${labelFor(id)}`),
  ];
  previewFacts.replaceChildren(...facts.map(fact));
  preview.hidden = false;
  applyButton.focus();
}

exportButton.addEventListener('click', () => {
  const now = new Date();
  const backup = createBackup(
    parseProgress(readItem(PROGRESS_KEY)),
    parseNotes(readItem(NOTES_KEY)),
    now,
  );
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  say('Копия скачана. В файле твои записи открытым текстом: храни его там, где не увидят другие.');
});

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  importInput.value = '';
  hidePreview();
  if (!file) return;
  if (file.size > MAX_BACKUP_BYTES) {
    say(PROBLEMS['too-big'], true);
    return;
  }
  let raw: string;
  try {
    raw = await file.text();
  } catch {
    say(PROBLEMS.unreadable, true);
    return;
  }
  const parsed = parseBackup(raw);
  if (!parsed.ok) {
    say(PROBLEMS[parsed.problem], true);
    return;
  }
  say('');
  showPreview(parsed.backup);
});

applyButton.addEventListener('click', () => {
  if (!pending) return;
  const saved =
    writeItem(PROGRESS_KEY, JSON.stringify(pending.progress)) &&
    writeItem(NOTES_KEY, JSON.stringify(pending.notes));
  hidePreview();
  clearNoteFields();
  reloadNotes();
  say(
    saved
      ? 'Данные из копии восстановлены.'
      : 'Браузер не дал записать данные. Попробуй ещё раз или проверь настройки хранения сайтов.',
    !saved,
  );
  importInput.focus();
});

cancelButton.addEventListener('click', () => {
  hidePreview();
  say('Импорт отменён. Твои данные не изменились.');
  importInput.focus();
});

eraseButton.addEventListener('click', () => {
  eraseDialog.showModal();
});

eraseCancel.addEventListener('click', () => {
  eraseDialog.close();
});

eraseConfirm.addEventListener('click', () => {
  const erased = [removeItem(PROGRESS_KEY), removeItem(NOTES_KEY)].every(Boolean);
  eraseDialog.close();
  hidePreview();
  clearNoteFields();
  reloadNotes();
  say(
    erased
      ? 'Все отметки и записи стёрты из этого браузера.'
      : 'Браузер не дал стереть данные. Попробуй очистить данные сайта в настройках браузера.',
    !erased,
  );
});

for (const element of document.querySelectorAll<HTMLElement>('[data-needs-js]')) {
  element.hidden = false;
}
