// Отметки чек-листов, «продолжить там, где остановились» и счётчики на главной.
import {
  countChecked,
  parseProgress,
  type Progress,
  PROGRESS_KEY,
  setChecked,
  setLast,
} from '@/domain/progress';
import { readItem, writeItem } from '@/lib/storage';

let progress: Progress = parseProgress(readItem(PROGRESS_KEY));

function showSaveProblem(visible: boolean): void {
  for (const element of document.querySelectorAll<HTMLElement>('[data-save-problem]')) {
    element.hidden = !visible;
  }
}

function save(): void {
  showSaveProblem(!writeItem(PROGRESS_KEY, JSON.stringify(progress)));
}

function render(): void {
  const checked = new Set(progress.checked);
  for (const box of document.querySelectorAll<HTMLInputElement>('input[data-item-id]')) {
    box.checked = checked.has(box.dataset['itemId'] ?? '');
  }

  for (const counter of document.querySelectorAll<HTMLElement>('[data-progress-items]')) {
    const ids = (counter.dataset['progressItems'] ?? '').split(' ').filter(Boolean);
    const done = countChecked(progress, ids);
    counter.textContent = `Отмечено ${done} из ${ids.length}`;
    counter.hidden = done === 0;
  }

  const resume = document.querySelector<HTMLElement>('[data-resume]');
  const link = resume?.querySelector<HTMLAnchorElement>('a');
  if (resume && link && progress.last) {
    link.href = progress.last.path;
    // Только textContent: значение пришло из хранилища и не должно стать разметкой.
    link.textContent = progress.last.title;
    resume.hidden = false;
  }
}

document.addEventListener('change', (event) => {
  const box = event.target;
  if (!(box instanceof HTMLInputElement) || !box.dataset['itemId']) return;
  progress = setChecked(progress, box.dataset['itemId'], box.checked);
  save();
  render();
});

// Другая вкладка изменила отметки. При одновременной правке побеждает последняя запись.
window.addEventListener('storage', (event) => {
  if (event.key !== PROGRESS_KEY && event.key !== null) return;
  progress = parseProgress(readItem(PROGRESS_KEY));
  render();
});

const lesson = document.querySelector<HTMLElement>('[data-lesson-id]');
if (lesson?.dataset['lessonId'] && lesson.dataset['lessonTitle']) {
  progress = setLast(progress, {
    id: lesson.dataset['lessonId'],
    title: lesson.dataset['lessonTitle'],
    path: window.location.pathname,
  });
  save();
}

render();
