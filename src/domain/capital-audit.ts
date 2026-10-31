// «Аудит капиталов»: подсчёт и формат ответов. Чистые функции без DOM и хранилища.
// Ответы лежат в записях заданий под постоянным id, поэтому сами попадают в копию данных.
// Описание формата — docs/save-format.md, изменение только с миграцией.

export const AUDIT_NOTE_ID = 'd6-means-task-audit';

export const CAPITALS = ['human', 'intellectual', 'social', 'financial'] as const;
export type Capital = (typeof CAPITALS)[number];

export const AUDIENCES = ['teen', 'couple'] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Ответ на утверждение: 0 — пока нет, 1 — отчасти, 2 — да. */
export const ANSWER_VALUES = [0, 1, 2] as const;
export type Answer = (typeof ANSWER_VALUES)[number];

const MAX_ANSWER = 2;

export type Level = 'empty' | 'start' | 'growing' | 'strong';

export interface AuditQuestion {
  id: string;
  audience: Audience;
  capital: Capital;
}

export interface Audit {
  audience?: Audience;
  answers: Record<string, Answer>;
}

export interface CapitalScore {
  capital: Capital;
  points: number;
  /** Сколько баллов можно набрать по всем вопросам капитала. */
  max: number;
  answered: number;
  total: number;
  level: Level;
}

export function emptyAudit(): Audit {
  return { answers: {} };
}

function isAnswer(value: unknown): value is Answer {
  return ANSWER_VALUES.some((allowed) => allowed === value);
}

/** Читает сохранённую строку. Содержимое недоверенное: всё незнакомое отбрасывается. */
export function parseAudit(raw: string, questions: readonly AuditQuestion[]): Audit {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyAudit();
  }
  if (typeof data !== 'object' || data === null) return emptyAudit();
  const { audience, answers } = data as Record<string, unknown>;
  const stored =
    typeof answers === 'object' && answers !== null && !Array.isArray(answers)
      ? (answers as Record<string, unknown>)
      : {};
  const entries = questions.flatMap(({ id }): [string, Answer][] => {
    const value = Object.hasOwn(stored, id) ? stored[id] : undefined;
    return isAnswer(value) ? [[id, value]] : [];
  });
  const audit: Audit = { answers: Object.fromEntries(entries) };
  const known = AUDIENCES.find((item) => item === audience);
  if (known) audit.audience = known;
  return audit;
}

/** Пустой аудит даёт пустую строку: такая запись убирается из хранилища и из копии. */
export function serializeAudit(audit: Audit): string {
  if (!audit.audience && Object.keys(audit.answers).length === 0) return '';
  return JSON.stringify(audit);
}

export function setAudience(audit: Audit, audience: Audience): Audit {
  return { ...audit, audience };
}

export function setAnswer(audit: Audit, questionId: string, answer: Answer): Audit {
  return { ...audit, answers: { ...audit.answers, [questionId]: answer } };
}

function levelOf(points: number, answered: number): Level {
  if (answered === 0) return 'empty';
  const share = points / (answered * MAX_ANSWER);
  if (share < 0.34) return 'start';
  return share < 0.8 ? 'growing' : 'strong';
}

/** Считает капиталы для выбранной аудитории. Уровень — по отвеченным вопросам, пропуск не считается нулём. */
export function scoreAudit(audit: Audit, questions: readonly AuditQuestion[]): CapitalScore[] {
  const { audience } = audit;
  if (!audience) return [];
  return CAPITALS.map((capital) => {
    const own = questions.filter((item) => item.audience === audience && item.capital === capital);
    const given = own.flatMap(({ id }) =>
      Object.hasOwn(audit.answers, id) ? [audit.answers[id] ?? 0] : [],
    );
    const points = given.reduce<number>((sum, value) => sum + value, 0);
    return {
      capital,
      points,
      max: own.length * MAX_ANSWER,
      answered: given.length,
      total: own.length,
      level: levelOf(points, given.length),
    };
  });
}

/**
 * С какого капитала начать: самая низкая доля среди отвеченных, не считая уже крепких.
 * При равенстве берём тот, что раньше в списке. Нет ответа, если отвечать не на что или всё крепко.
 */
export function pickFocus(scores: readonly CapitalScore[]): Capital | undefined {
  const share = ({ points, answered }: CapitalScore) => points / (answered * MAX_ANSWER);
  const candidates = scores.filter(({ level }) => level === 'start' || level === 'growing');
  return candidates.reduce<CapitalScore | undefined>(
    (lowest, score) => (lowest && share(lowest) <= share(score) ? lowest : score),
    undefined,
  )?.capital;
}
