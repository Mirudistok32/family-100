import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { splitSections } from '@/domain/content-rules';
import { ETHICS_SECTION, parseEthics } from '@/domain/ethics';

const SECTION = [
  '',
  '**Хватит ли друзей?**',
  '',
  'Философ писал об этом. **Жирное слово в начале** тоже бывает.',
  '',
  '- **Да.** Друзей выбирают сами, см. [день 2](/day/2/).',
  '- **Нет.** Семья *даёт* иное.',
  '',
  'Здесь автор не навязывает ответ, кроме одного случая. **Насилие оправдать нельзя.**',
].join('\n');

describe('разбор раздела этики', () => {
  it('находит вопрос и позиции без разметки', () => {
    const { question, positions } = parseEthics(SECTION);
    expect(question).toBe('Хватит ли друзей?');
    expect(positions).toEqual([
      { title: 'Да.', text: 'Друзей выбирают сами, см. день 2.' },
      { title: 'Нет.', text: 'Семья даёт иное.' },
    ]);
  });

  it('границей считает первое жирное место вне списка и вопроса', () => {
    expect(parseEthics(SECTION).limit).toBe('Жирное слово в начале');
    expect(parseEthics('**Вопрос?**\n\nБез границы.\n\n- **А.** б').limit).toBeUndefined();
  });

  it('граница из конца фразы начинается с большой буквы', () => {
    expect(parseEthics('**Вопрос?**\n\nКроме одного: **насилие терпеть нельзя.**').limit).toBe(
      'Насилие терпеть нельзя.',
    );
  });

  it('пустой раздел не падает', () => {
    expect(parseEthics('')).toEqual({ question: '', positions: [], limit: undefined });
  });

  it('вопрос только на первой строке: жирное предложение ниже вопросом не считается', () => {
    expect(parseEthics('Сначала текст.\n\n**Жирная строка**').question).toBe('');
  });
});

describe('настоящие уроки', () => {
  const folder = join(process.cwd(), 'src/content/lessons');
  const files = readdirSync(folder).filter((file) => file.endsWith('.md'));

  it('все 11 уроков разбираются', () => {
    expect(files).toHaveLength(11);
    for (const file of files) {
      const section = splitSections(readFileSync(join(folder, file), 'utf8')).find(
        (item) => item.title === ETHICS_SECTION,
      );
      const { question, positions } = parseEthics(section?.text ?? '');
      expect(question.endsWith('?'), file).toBe(true);
      expect(positions.length, file).toBeGreaterThanOrEqual(2);
      for (const position of positions) {
        expect(position.text, file).not.toMatch(/[*\]]/);
      }
    }
  });

  it('граница дня о насилии — про насилие', () => {
    const section = splitSections(readFileSync(join(folder, 'day-5-abuse.md'), 'utf8')).find(
      (item) => item.title === ETHICS_SECTION,
    );
    expect(parseEthics(section?.text ?? '').limit).toContain('Насилие');
  });
});
