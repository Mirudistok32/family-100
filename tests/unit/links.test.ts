import { describe, expect, it } from 'vitest';

import { classifyBrowserError, classifyStatus, extractUrls } from '@/domain/links';

describe('extractUrls', () => {
  it('находит адрес в Markdown, YAML и коде и не берёт скобку и знак препинания', () => {
    const text = [
      'См. [книгу](https://a.example/book), и https://b.example/page.',
      "url: 'https://c.example/x?y=1'",
      'url: https://d.example/z',
      '| [табл](https://e.example/t) | `https://f.example/code` |',
    ].join('\n');
    expect(extractUrls(text)).toEqual([
      'https://a.example/book',
      'https://b.example/page',
      'https://c.example/x?y=1',
      'https://d.example/z',
      'https://e.example/t',
      'https://f.example/code',
    ]);
  });

  it('оставляет парные скобки внутри адреса', () => {
    expect(extractUrls('[вики](https://w.example/Foo_(bar)), дальше')).toEqual([
      'https://w.example/Foo_(bar)',
    ]);
  });

  it('не повторяет адрес и пропускает то, что не страница', () => {
    const text =
      'https://a.example https://a.example http://www.w3.org/2000/svg http://localhost:4321/x';
    expect(extractUrls(text)).toEqual(['https://a.example']);
  });
});

describe('classifyBrowserError', () => {
  it('считает битой ссылку, которую браузер не откроет и читателю', () => {
    expect(
      classifyBrowserError('page.goto: net::ERR_CERT_AUTHORITY_INVALID at https://a.example'),
    ).toBe('broken');
    expect(
      classifyBrowserError('page.goto: net::ERR_SSL_PROTOCOL_ERROR at https://a.example'),
    ).toBe('broken');
    expect(classifyBrowserError('page.goto: net::ERR_NAME_NOT_RESOLVED at https://a.example')).toBe(
      'broken',
    );
  });

  it('тайм-аут и обрыв связи оставляет для проверки руками', () => {
    expect(classifyBrowserError('page.goto: Timeout 30000ms exceeded.')).toBe('blocked');
    expect(classifyBrowserError('page.goto: net::ERR_CONNECTION_RESET at https://a.example')).toBe(
      'blocked',
    );
  });
});

describe('classifyStatus', () => {
  it('считает битой только прямой ответ, что страницы нет', () => {
    expect(classifyStatus(200)).toBe('ok');
    expect(classifyStatus(301)).toBe('ok');
    expect(classifyStatus(404)).toBe('broken');
    expect(classifyStatus(410)).toBe('broken');
  });

  it('закрытые от скриптов и ошибки сервера оставляет для проверки руками', () => {
    for (const status of [0, 401, 403, 406, 429, 500, 503])
      expect(classifyStatus(status)).toBe('blocked');
  });
});
