// Экран завершения: показывает, что сделано. Только читает хранилище, ничего не пишет и никуда не отправляет.
import { CONSTITUTION_SECTIONS } from '@/data/constitution';
import { summarizeCourse, summaryFacts } from '@/domain/finish';
import { NOTES_KEY, parseNotes } from '@/domain/notes';
import { parseProgress, PROGRESS_KEY } from '@/domain/progress';
import { readItem } from '@/lib/storage';

const facts = summaryFacts(
  summarizeCourse(
    parseProgress(readItem(PROGRESS_KEY)),
    parseNotes(readItem(NOTES_KEY)),
    CONSTITUTION_SECTIONS.map((section) => section.noteId),
  ),
  CONSTITUTION_SECTIONS.length,
);

const list = document.querySelector<HTMLUListElement>('[data-finish-facts]');
if (list) {
  list.replaceChildren(
    ...facts.map((fact) => {
      const item = document.createElement('li');
      item.textContent = fact;
      return item;
    }),
  );
  list.hidden = facts.length === 0;
}

const empty = document.querySelector<HTMLElement>('[data-finish-empty]');
if (empty) empty.hidden = facts.length > 0;

for (const element of document.querySelectorAll<HTMLElement>('[data-js-off]')) {
  element.hidden = true;
}
