// Внутренние ссылки в Markdown пишем от корня сайта: `/help/`. Плагин добавляет подпапку публикации,
// чтобы текст урока не зависел от адреса сайта. Внешние ссылки и якоря не меняются.
export function rehypeBaseLinks({ base = '' } = {}) {
  const visit = (node) => {
    const target = node.properties?.href;
    if (node.tagName === 'a' && typeof target === 'string' && /^\/(?!\/)/.test(target)) {
      node.properties.href = `${base}${target}`;
    }
    (node.children ?? []).forEach(visit);
  };
  return visit;
}
