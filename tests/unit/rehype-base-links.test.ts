import { describe, expect, it } from 'vitest';

import { rehypeBaseLinks } from '@/lib/rehype-base-links.mjs';

function link(href: string) {
  return { type: 'element', tagName: 'a', properties: { href }, children: [] };
}

describe('rehypeBaseLinks', () => {
  it('добавляет подпапку только к внутренним ссылкам, в том числе вложенным', () => {
    const inner = link('/memos/');
    const external = link('https://example.org/');
    const protocolRelative = link('//example.org/');
    const anchor = link('#x');
    const tree = {
      type: 'root',
      children: [
        { type: 'element', tagName: 'p', children: [inner, external, protocolRelative, anchor] },
      ],
    };
    rehypeBaseLinks({ base: '/family-100' })(tree);
    expect(inner.properties.href).toBe('/family-100/memos/');
    expect(external.properties.href).toBe('https://example.org/');
    expect(protocolRelative.properties.href).toBe('//example.org/');
    expect(anchor.properties.href).toBe('#x');
  });
});
