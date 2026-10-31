// Проверка контактов служб помощи. Ошибка в номере здесь может стоить человеку помощи, поэтому номер
// сверяется сам с собой: подпись для человека и значение `tel:` должны давать одни и те же цифры.

export interface HelplineInput {
  id: string;
  name: string;
  phones: readonly { label: string; tel: string }[];
  site?: string;
  source: string;
  checkedAt: string;
}

/** Приводит номер к международной записи: «8 800…» и «+7 800…» дают одни и те же цифры. */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('8') ? `7${digits.slice(1)}` : digits;
}

function isHttps(url: string): boolean {
  return /^https:\/\/[^\s/]+/.test(url);
}

function isValidDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/** Возвращает список ошибок. Пустой список — контакты в порядке. */
export function checkHelplines(list: readonly HelplineInput[], today: Date): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const { id, name, phones, site, source, checkedAt } of list) {
    if (seen.has(id)) errors.push(`${id}: повтор id`);
    seen.add(id);
    if (!name.trim()) errors.push(`${id}: нет названия`);
    if (phones.length === 0) errors.push(`${id}: нет телефона`);
    for (const { label, tel } of phones) {
      if (!/^\+?\d+$/.test(tel)) errors.push(`${id}: неверный tel «${tel}»`);
      if (normalizePhone(label) !== normalizePhone(tel)) {
        errors.push(`${id}: цифры «${label}» и «${tel}» расходятся`);
      }
    }
    if (!isHttps(source)) errors.push(`${id}: источник должен быть https`);
    if (site !== undefined && !isHttps(site)) errors.push(`${id}: сайт должен быть https`);
    if (!isValidDay(checkedAt)) errors.push(`${id}: неверная дата проверки «${checkedAt}»`);
    else if (new Date(`${checkedAt}T00:00:00.000Z`) > today) {
      errors.push(`${id}: дата проверки в будущем`);
    }
  }
  return errors;
}
