// Поля заданий: сохранение записей и явное согласие для чувствительных полей. Работает на уроке и в «Моих записях».
// Текст чувствительного поля без согласия живёт только в поле на странице и в хранилище не попадает.
import {
  canKeep,
  getNote,
  type Notes,
  NOTES_KEY,
  parseNotes,
  setKeep,
  setNote,
} from '@/domain/notes';
import { readItem, writeItem } from '@/lib/storage';

let notes: Notes = parseNotes(readItem(NOTES_KEY));

function fields(): HTMLTextAreaElement[] {
  return [...document.querySelectorAll<HTMLTextAreaElement>('textarea[data-note-id]')];
}

function isSensitive(field: HTMLTextAreaElement): boolean {
  return field.dataset['sensitive'] !== undefined;
}

function save(): void {
  const saved = writeItem(NOTES_KEY, JSON.stringify(notes));
  for (const element of document.querySelectorAll<HTMLElement>('[data-notes-problem]')) {
    element.hidden = saved;
  }
}

/** Показывает сохранённое. Поле, в котором сейчас печатают, и несохраняемый ввод не трогаем. */
export function renderNotes(): void {
  for (const field of fields()) {
    const id = field.dataset['noteId'] ?? '';
    const consented = canKeep(notes, id);
    const keep = document.querySelector<HTMLInputElement>(
      `input[data-note-keep="${CSS.escape(id)}"]`,
    );
    if (keep) keep.checked = consented;
    if (isSensitive(field) && !consented) continue;
    if (document.activeElement !== field) field.value = getNote(notes, id);
  }
}

/** Событие на `document`: записи перечитаны, и то, что из них собрано на странице, пора обновить. */
export const NOTES_RELOADED = 'family100:notes-reloaded';

/** Перечитывает хранилище: после импорта, удаления или записи из другой вкладки. */
export function reloadNotes(): void {
  notes = parseNotes(readItem(NOTES_KEY));
  renderNotes();
  document.dispatchEvent(new Event(NOTES_RELOADED));
}

/** Запись инструмента на странице. Идёт через ту же копию записей, иначе поля затёрли бы её своим сохранением. */
export function readToolNote(id: string): string {
  return getNote(notes, id);
}

export function writeToolNote(id: string, text: string): void {
  notes = setNote(notes, id, text);
  save();
}

/** Очищает поля на странице, в том числе несохраняемый ввод. Для «стереть всё». */
export function clearNoteFields(): void {
  for (const field of fields()) field.value = '';
}

document.addEventListener('input', (event) => {
  const field = event.target;
  if (!(field instanceof HTMLTextAreaElement) || !field.dataset['noteId']) return;
  const id = field.dataset['noteId'];
  if (isSensitive(field) && !canKeep(notes, id)) return;
  notes = setNote(notes, id, field.value);
  save();
});

document.addEventListener('change', (event) => {
  const keep = event.target;
  if (!(keep instanceof HTMLInputElement) || !keep.dataset['noteKeep']) return;
  const id = keep.dataset['noteKeep'];
  notes = setKeep(notes, id, keep.checked);
  if (keep.checked) {
    const field = document.querySelector<HTMLTextAreaElement>(
      `textarea[data-note-id="${CSS.escape(id)}"]`,
    );
    if (field) notes = setNote(notes, id, field.value);
  }
  save();
});

// Другая вкладка изменила записи. При одновременной правке побеждает последняя запись.
window.addEventListener('storage', (event) => {
  if (event.key !== NOTES_KEY && event.key !== null) return;
  reloadNotes();
});

// Сообщение «без JavaScript не сохраняется» видно по умолчанию: оно нужно и при сбое загрузки скрипта.
for (const element of document.querySelectorAll<HTMLElement>('[data-js-off]')) {
  element.hidden = true;
}

renderNotes();
