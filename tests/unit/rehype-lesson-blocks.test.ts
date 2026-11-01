import { describe, expect, it } from 'vitest';

import { rehypeLessonBlocks } from '@/lib/rehype-lesson-blocks.mjs';

const element = (tagName: string, text: string) => ({
  type: 'element',
  tagName,
  properties: {},
  children: [{ type: 'text', value: text }],
});

describe('rehypeLessonBlocks', () => {
  it('оборачивает разделы и подписывает пример с героями', () => {
    const tree = {
      type: 'root',
      children: [
        element('h2', 'История'),
        element('p', 'Текст истории'),
        element('h2', 'Пример из жизни'),
        element('p', 'Текст примера'),
      ],
    };

    rehypeLessonBlocks()(tree);

    const [history, example] = tree.children as unknown as {
      properties: { className: string[] };
      children: { tagName: string; children: { value: string }[] }[];
    }[];
    expect(tree.children).toHaveLength(2);
    expect(history?.properties.className).toContain('block--history');
    expect(history?.children).toHaveLength(2);
    expect(example?.properties.className).toContain('block--example');
    expect(example?.children[1]?.children[0]?.value).toBe('Герои придуманы, ситуации типичные.');
  });

  it('выделяет ленту эпох и советы и подписывает их', () => {
    const tree = {
      type: 'root',
      children: [
        element('h2', 'Как было у нас'),
        element('p', 'Текст'),
        element('h2', 'Советы'),
        element('p', 'Текст'),
      ],
    };

    rehypeLessonBlocks()(tree);

    const [eras, tips] = tree.children as unknown as {
      properties: { className: string[] };
      children: { properties: { className?: string[] } }[];
    }[];
    expect(eras?.properties.className).toContain('block--eras');
    expect(tips?.properties.className).toContain('block--tips');
    expect(eras?.children[1]?.properties.className).toContain('block__caption');
    expect(tips?.children[1]?.properties.className).toContain('block__caption');
  });

  it('не трогает обычные заголовки', () => {
    const tree = { type: 'root', children: [element('h2', 'Другое'), element('p', 'Текст')] };

    rehypeLessonBlocks()(tree);

    expect(tree.children.map((node) => node.tagName)).toEqual(['h2', 'p']);
  });
});
