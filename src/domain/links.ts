// Разбор внешних ссылок для scripts/check-links.ts: чистые функции без сети и файлов.

/** Адреса, которые в браузере не открывают: пространства имён SVG и локальный сервер. */
const NOT_PAGES = /^https?:\/\/(?:www\.w3\.org\/2000\/svg|localhost|127\.0\.0\.1)/;

export type LinkVerdict = 'ok' | 'blocked' | 'broken';

/** Обрезает адрес на первой закрывающей скобке без пары: так он заканчивается в Markdown. */
function cutAtUnmatchedParen(url: string): string {
  let depth = 0;
  for (let i = 0; i < url.length; i += 1) {
    if (url[i] === '(') depth += 1;
    if (url[i] === ')') {
      if (depth === 0) return url.slice(0, i);
      depth -= 1;
    }
  }
  return url;
}

/** Все внешние адреса из текста, без повторов и без знаков препинания в конце. */
export function extractUrls(text: string): string[] {
  const found = new Set<string>();
  for (const [token] of text.matchAll(/https?:\/\/[^\s\]<>"'`|]+/g)) {
    const url = cutAtUnmatchedParen(token).replace(/[.,;:!?»*]+$/, '');
    if (!NOT_PAGES.test(url)) found.add(url);
  }
  return [...found];
}

/**
 * Что значит код ответа. 401, 403, 406, 429 и 5xx сайты часто отдают скриптам и при живой странице:
 * такая ссылка не считается битой, но её надо открыть руками. Нет ответа (0) — проверять тоже руками:
 * битой ссылку делает только прямой ответ сайта «такой страницы нет».
 */
export function classifyStatus(status: number): LinkVerdict {
  if (status >= 200 && status < 400) return 'ok';
  if (status === 404 || status === 410) return 'broken';
  return 'blocked';
}

/**
 * Что значит отказ браузера. Чужой или просроченный сертификат и несуществующий домен читатель тоже не пройдёт:
 * это битая ссылка. Тайм-аут и обрыв связи бывают и у живых сайтов, такую ссылку надо открыть руками.
 */
export function classifyBrowserError(message: string): LinkVerdict {
  return /ERR_CERT_|ERR_SSL_|ERR_NAME_NOT_RESOLVED/.test(message) ? 'broken' : 'blocked';
}
