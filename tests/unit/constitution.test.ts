import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CONSTITUTION_SECTIONS,
  DOCUMENT_LEADS,
  DOCUMENT_TITLES,
  VERSION_TITLES,
} from '@/data/constitution';
import { AUDIENCES } from '@/domain/capital-audit';
import {
  buildDocument,
  type ConstitutionDocument,
  type ConstitutionSection,
  DEFAULT_VERSION,
  documentLines,
  fitsTwoSheets,
  MAX_DOCUMENT_LINES,
  parseVersion,
} from '@/domain/constitution';

const SECTIONS: ConstitutionSection[] = [
  {
    noteId: 'a',
    label: 'А',
    sensitive: false,
    titles: { self: 'Моё А', couple: 'Наше А' },
    prompts: { self: 'а?', couple: 'а?' },
  },
  {
    noteId: 'b',
    label: 'Б',
    sensitive: true,
    titles: { self: 'Моё Б', couple: 'Наше Б' },
    prompts: { self: 'б?', couple: 'б?' },
  },
];

function sheet(text: string): ConstitutionDocument {
  return { sections: [{ noteId: 'a', title: 'А', text }] };
}

describe('версия', () => {
  it('читает известные значения', () => {
    expect(parseVersion('self')).toBe('self');
    expect(parseVersion('teen')).toBe('self');
    expect(parseVersion('couple')).toBe('couple');
  });

  it('незнакомое значение и пустая запись дают версию по умолчанию', () => {
    expect(parseVersion('')).toBe(DEFAULT_VERSION);
    expect(parseVersion('<script>')).toBe(DEFAULT_VERSION);
    expect(parseVersion('__proto__')).toBe(DEFAULT_VERSION);
  });
});

describe('сборка документа', () => {
  it('берёт заголовки своей версии и сохраняет порядок формы', () => {
    const texts: Record<string, string> = { b: 'два', a: 'один' };
    const { sections } = buildDocument(SECTIONS, (id) => texts[id] ?? '', 'couple');
    expect(sections).toEqual([
      { noteId: 'a', title: 'Наше А', text: 'один' },
      { noteId: 'b', title: 'Наше Б', text: 'два' },
    ]);
  });

  it('пропускает пустые части и части из одних пробелов', () => {
    const texts: Record<string, string> = { a: ' \n ', b: '  текст  ' };
    const { sections } = buildDocument(SECTIONS, (id) => texts[id] ?? '', 'self');
    expect(sections).toEqual([{ noteId: 'b', title: 'Моё Б', text: 'текст' }]);
  });
});

describe('оценка длины', () => {
  it('считает длинную строку за несколько строк листа', () => {
    expect(documentLines(sheet('я'))).toBe(1);
    expect(documentLines(sheet('я'.repeat(73)))).toBe(2);
  });

  it('считает пустые строки и короткие переносы', () => {
    expect(documentLines(sheet('а\n\nб'))).toBe(3);
  });

  it('предел двух листов', () => {
    expect(fitsTwoSheets(sheet(Array(MAX_DOCUMENT_LINES).fill('я').join('\n')))).toBe(true);
    expect(
      fitsTwoSheets(
        sheet(
          Array(MAX_DOCUMENT_LINES + 1)
            .fill('я')
            .join('\n'),
        ),
      ),
    ).toBe(false);
  });
});

describe('данные конструктора', () => {
  it('у каждой части свой id и тексты обеих версий', () => {
    const ids = CONSTITUTION_SECTIONS.map((section) => section.noteId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const section of CONSTITUTION_SECTIONS) {
      for (const version of AUDIENCES) {
        expect(section.titles[version], section.noteId).not.toBe('');
        expect(section.prompts[version], section.noteId).not.toBe('');
      }
    }
    for (const version of AUDIENCES) {
      expect(DOCUMENT_TITLES[version]).not.toBe('');
      expect(DOCUMENT_LEADS[version]).not.toBe('');
      expect(VERSION_TITLES[version]).not.toBe('');
    }
  });

  it('есть все части из плана', () => {
    expect(CONSTITUTION_SECTIONS.map((section) => section.label)).toEqual([
      'Миссия',
      'Ценности',
      'Правила',
      'Решения',
      'Деньги',
      'Что не повторяем',
      'Традиции',
    ]);
  });

  it('общие записи есть в уроках с тем же признаком чувствительности', async () => {
    const shared: [string, string, boolean][] = [
      ['d7-task-mission', 'day-2.md', false],
      ['d7-task-tradition', 'day-3.md', false],
    ];
    for (const [noteId, file, sensitive] of shared) {
      const source = await readFile(join(process.cwd(), `src/content/lessons/${file}`), 'utf8');
      expect(source, noteId).toContain(`- id: ${noteId}\n`);
      // Описание поля заканчивается на следующем поле или на следующем ключе верхнего уровня.
      const block = source.split(`- id: ${noteId}\n`)[1]?.split(/\n\s*- id:|\n[a-z]/)[0] ?? '';
      expect(block.includes('sensitive: true'), noteId).toBe(sensitive);
      expect(CONSTITUTION_SECTIONS.find((section) => section.noteId === noteId)?.sensitive).toBe(
        sensitive,
      );
    }
  });

  it('собственные записи конструктора не пересекаются с уроками', async () => {
    const own = CONSTITUTION_SECTIONS.map((section) => section.noteId).filter((id) =>
      id.startsWith('constitution-'),
    );
    expect(own).toHaveLength(4);
    const lesson = await readFile(join(process.cwd(), 'src/content/lessons/day-7.md'), 'utf8');
    for (const id of own) expect(lesson).not.toContain(id);
  });
});
