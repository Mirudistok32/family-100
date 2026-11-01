// Оборачивает разделы урока в блоки: «История» — фотокарточка, «Как было у нас» — лента эпох,
// «Пример из жизни» — записка с подписью, что герои придуманы, «Советы» — нумерованный список.
// Так реальных людей и героев нельзя спутать, а автор пишет обычный Markdown.
const BLOCKS = new Map([
  ['История', { className: 'block block--history' }],
  [
    'Как было у нас',
    {
      className: 'block block--eras',
      caption: 'Многое из этого сегодня не повторишь. Берём мысль, а не форму.',
    },
  ],
  [
    'Пример из жизни',
    { className: 'block block--example', caption: 'Герои придуманы, ситуации типичные.' },
  ],
  ['Суть', { className: 'block block--essence' }],
  [
    'Советы',
    {
      className: 'block block--tips',
      caption: 'У каждого совета указано, откуда он. «Совет курса» значит, что он наш собственный.',
    },
  ],
  ['Вопрос этики', { className: 'block block--ethics' }],
]);

function textOf(node) {
  if (node.type === 'text') return node.value;
  return (node.children ?? []).map(textOf).join('');
}

export function rehypeLessonBlocks() {
  return (tree) => {
    const children = [];
    let current = null;
    for (const node of tree.children) {
      if (node.type === 'element' && node.tagName === 'h2') {
        const block = BLOCKS.get(textOf(node).trim());
        current = block
          ? {
              type: 'element',
              tagName: 'section',
              properties: { className: block.className.split(' ') },
              children: [node],
            }
          : null;
        if (current) {
          if (block.caption) {
            current.children.push({
              type: 'element',
              tagName: 'p',
              properties: { className: ['block__caption'] },
              children: [{ type: 'text', value: block.caption }],
            });
          }
          children.push(current);
          continue;
        }
      }
      if (current) current.children.push(node);
      else children.push(node);
    }
    tree.children = children;
  };
}
