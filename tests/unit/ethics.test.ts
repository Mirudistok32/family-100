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

  it('пустой раздел не падает', () => {
    expect(parseEthics('')).toEqual({ question: '', positions: [] });
  });

  it('вопрос только на первой строке: жирное предложение ниже вопросом не считается', () => {
    expect(parseEthics('Сначала текст.\n\n**Жирная строка**').question).toBe('');
  });
});

describe('настоящие уроки', () => {
  const folder = join(process.cwd(), 'src/content/lessons');
  const files = readdirSync(folder).filter((file) => file.endsWith('.md'));

  it('все 7 уроков разбираются', () => {
    expect(files).toHaveLength(7);
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
});
