const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Адрес страницы с учётом подпапки сайта. Путь начинается и заканчивается косой чертой. */
export function href(path: string): string {
  return `${base}${path}`;
}

export function lessonHref(day: number): string {
  return href(`/day/${day}/`);
}
