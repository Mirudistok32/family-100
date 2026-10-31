// Итог курса: только то, что сделано. Без процентов, дат, серий и списка пропущенного.
import { AUDIT_NOTE_ID } from '@/domain/capital-audit';
import { VERSION_NOTE_ID } from '@/domain/constitution';
import { getNote, type Notes } from '@/domain/notes';
import type { Progress } from '@/domain/progress';

/** Записи инструментов человек не писал сам, поэтому записями их не считаем. */
const TOOL_NOTE_IDS: readonly string[] = [AUDIT_NOTE_ID, VERSION_NOTE_ID];

export interface CourseSummary {
  checked: number;
  notes: number;
  constitutionParts: number;
}

export function summarizeCourse(
  progress: Progress,
  notes: Notes,
  constitutionIds: readonly string[],
): CourseSummary {
  return {
    checked: progress.checked.length,
    notes: Object.keys(notes.fields).filter((id) => !TOOL_NOTE_IDS.includes(id)).length,
    constitutionParts: constitutionIds.filter((id) => getNote(notes, id)).length,
  };
}

/** Строки для показа. Нули не показываем: экран не напоминает о том, чего нет. */
export function summaryFacts(summary: CourseSummary, constitutionTotal: number): string[] {
  const { checked, notes, constitutionParts } = summary;
  return [
    ...(checked > 0 ? [`Отмечено пунктов чек-листов: ${checked}`] : []),
    ...(notes > 0 ? [`Сделано записей: ${notes}`] : []),
    ...(constitutionParts > 0
      ? [`Заполнено частей семейной конституции: ${constitutionParts} из ${constitutionTotal}`]
      : []),
  ];
}
