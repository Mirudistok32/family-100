// Конструктор семейной конституции: собирает лист из полей на странице и печатает его.
// Лист строится из полей, а не из хранилища: чувствительный текст без согласия живёт только в поле, но на бумагу попасть должен.
// Текст выводим только через textContent. В сеть ничего не уходит.
import { NOTES_RELOADED, readToolNote, writeToolNote } from '@/client/notes';
import {
  CONSTITUTION_SECTIONS,
  DOCUMENT_EMPTY,
  DOCUMENT_LEADS,
  DOCUMENT_TITLES,
  DOCUMENT_TOO_LONG,
  PRINT_EMPTY,
} from '@/data/constitution';
import type { Audience } from '@/domain/capital-audit';
import {
  buildDocument,
  type ConstitutionDocument,
  fitsTwoSheets,
  parseVersion,
  VERSION_NOTE_ID,
} from '@/domain/constitution';

const root = document.querySelector<HTMLElement>('[data-constitution]');

function fieldText(noteId: string): string {
  const field = root?.querySelector<HTMLTextAreaElement>(
    `textarea[data-note-id="${CSS.escape(noteId)}"]`,
  );
  return field?.value ?? '';
}

function currentDocument(version: Audience): ConstitutionDocument {
  return buildDocument(CONSTITUTION_SECTIONS, fieldText, version);
}

function sectionElement(title: string, text: string): HTMLElement {
  const section = document.createElement('section');
  section.className = 'constitution-sheet__part';
  const heading = document.createElement('h4');
  heading.textContent = title;
  const body = document.createElement('p');
  body.className = 'constitution-sheet__text';
  body.textContent = text;
  section.append(heading, body);
  return section;
}

function emptyElement(): HTMLElement {
  const empty = document.createElement('p');
  empty.className = 'muted';
  empty.textContent = DOCUMENT_EMPTY;
  return empty;
}

if (root) {
  const status = root.querySelector<HTMLElement>('[data-constitution-status]');
  const title = root.querySelector<HTMLElement>('[data-constitution-title]');
  const lead = root.querySelector<HTMLElement>('[data-constitution-lead]');
  const body = root.querySelector<HTMLElement>('[data-constitution-body]');
  const printButton = root.querySelector<HTMLButtonElement>('[data-constitution-print]');
  const radios = [...root.querySelectorAll<HTMLInputElement>('input[name="constitution-version"]')];

  const render = (): void => {
    const version = parseVersion(readToolNote(VERSION_NOTE_ID));
    const sheet = currentDocument(version);
    for (const radio of radios) radio.checked = radio.value === version;
    for (const prompt of root.querySelectorAll<HTMLElement>('[data-constitution-for]')) {
      prompt.hidden = prompt.dataset['constitutionFor'] !== version;
    }
    if (title) title.textContent = DOCUMENT_TITLES[version];
    if (lead) lead.textContent = DOCUMENT_LEADS[version];
    body?.replaceChildren(
      ...(sheet.sections.length > 0
        ? sheet.sections.map((part) => sectionElement(part.title, part.text))
        : [emptyElement()]),
    );
    if (status) status.textContent = fitsTwoSheets(sheet) ? '' : DOCUMENT_TOO_LONG;
  };

  root.addEventListener('input', render);
  document.addEventListener(NOTES_RELOADED, render);

  for (const radio of radios) {
    radio.addEventListener('change', () => {
      writeToolNote(VERSION_NOTE_ID, radio.value);
      render();
    });
  }

  printButton?.addEventListener('click', () => {
    const sheet = currentDocument(parseVersion(readToolNote(VERSION_NOTE_ID)));
    if (sheet.sections.length === 0) {
      if (status) status.textContent = PRINT_EMPTY;
      return;
    }
    window.print();
  });

  render();
}
