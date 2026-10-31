// «Моя ситуация»: какие карточки показать по ответам. Чистые функции без хранения и сети.

export const AGES = ['teen', 'adult'] as const;
export type Age = (typeof AGES)[number];

export const CLIMATES = ['danger', 'heavy', 'unsure'] as const;
export type Climate = (typeof CLIMATES)[number];

export const CHANGE_SIGNS = ['admits', 'help', 'lasting', 'respects'] as const;
export type ChangeSign = (typeof CHANGE_SIGNS)[number];

export const CARD_IDS = [
  'danger-now',
  'teen-danger',
  'adult-danger',
  'unsure',
  'teen-path',
  'adult-ladder',
  'change-none',
  'change-partial',
  'change-visible',
] as const;
export type CardId = (typeof CARD_IDS)[number];

export interface SituationAnswers {
  age?: Age;
  climate?: Climate;
  signs: readonly ChangeSign[];
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return allowed.find((item) => item === value);
}

/** Собирает ответы из значений формы. Всё незнакомое отбрасывается. */
export function toAnswers(
  age: unknown,
  climate: unknown,
  signs: readonly unknown[],
): SituationAnswers {
  const known = CHANGE_SIGNS.filter((sign) => signs.includes(sign));
  const answers: SituationAnswers = { signs: known };
  const parsedAge = oneOf(AGES, age);
  const parsedClimate = oneOf(CLIMATES, climate);
  if (parsedAge) answers.age = parsedAge;
  if (parsedClimate) answers.climate = parsedClimate;
  return answers;
}

/** Признаки перемен имеют смысл только для взрослого и только там, где нет опасности. */
export function asksForSigns({ age, climate }: SituationAnswers): boolean {
  return age === 'adult' && climate !== undefined && climate !== 'danger';
}

function changeCard(signs: readonly ChangeSign[]): CardId {
  if (signs.length === 0) return 'change-none';
  return signs.length === CHANGE_SIGNS.length ? 'change-visible' : 'change-partial';
}

/**
 * Безопасность важнее всего: при опасности нет ни лестницы, ни разговора о переменах,
 * сколько бы признаков ни было отмечено. Лестницы нет и у подростка.
 */
export function pickCards(answers: SituationAnswers): CardId[] {
  const { age, climate, signs } = answers;
  if (!climate) return [];
  if (climate === 'danger') {
    if (age === 'teen') return ['danger-now', 'teen-danger'];
    if (age === 'adult') return ['danger-now', 'adult-danger'];
    return ['danger-now'];
  }
  const cards: CardId[] = climate === 'unsure' ? ['unsure'] : [];
  if (age === 'teen') cards.push('teen-path');
  if (age === 'adult') cards.push('adult-ladder', changeCard(signs));
  return cards;
}
