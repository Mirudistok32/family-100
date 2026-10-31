// «Аудит капиталов»: показывает и сохраняет ответы. Считает src/domain/capital-audit.ts, в сеть ничего не уходит.
// Запись идёт через client/notes.ts: у него своя копия записей, и отдельная запись в хранилище она бы затёрла.
import { readToolNote, writeToolNote } from '@/client/notes';
import { AUDIT_STATEMENTS, LEVEL_TITLES } from '@/data/capital-audit';
import {
  ANSWER_VALUES,
  AUDIENCES,
  type Audit,
  AUDIT_NOTE_ID,
  type CapitalScore,
  parseAudit,
  pickFocus,
  scoreAudit,
  serializeAudit,
  setAnswer,
  setAudience,
} from '@/domain/capital-audit';

const root = document.querySelector<HTMLElement>('[data-audit]');

function load(): Audit {
  return parseAudit(readToolNote(AUDIT_NOTE_ID), AUDIT_STATEMENTS);
}

function renderForm(form: HTMLFormElement, audit: Audit): void {
  for (const input of form.querySelectorAll<HTMLInputElement>('input[name="audience"]')) {
    input.checked = input.value === audit.audience;
  }
  for (const { id } of AUDIT_STATEMENTS) {
    for (const input of form.querySelectorAll<HTMLInputElement>(`input[name="${id}"]`)) {
      input.checked = Object.hasOwn(audit.answers, id) && Number(input.value) === audit.answers[id];
    }
  }
  for (const set of form.querySelectorAll<HTMLElement>('[data-audit-set]')) {
    set.hidden = set.dataset['auditSet'] !== audit.audience;
  }
}

function renderScore(element: HTMLElement, score: CapitalScore): void {
  const meter = element.querySelector('meter');
  if (meter) {
    meter.max = score.max;
    meter.value = score.points;
  }
  const value = element.querySelector<HTMLElement>('[data-audit-value]');
  if (value) {
    value.textContent =
      score.answered === 0
        ? LEVEL_TITLES.empty
        : `${score.points} из ${score.max}: ${LEVEL_TITLES[score.level]}`;
  }
}

function render(result: HTMLElement, form: HTMLFormElement): void {
  const audit = load();
  renderForm(form, audit);
  const scores = scoreAudit(audit, AUDIT_STATEMENTS);
  const answered = scores.reduce((sum, score) => sum + score.answered, 0);
  const total = scores.reduce((sum, score) => sum + score.total, 0);
  result.hidden = answered === 0;

  for (const element of result.querySelectorAll<HTMLElement>('[data-audit-score]')) {
    const score = scores.find((item) => item.capital === element.dataset['auditScore']);
    if (score) renderScore(element, score);
  }

  const focus = pickFocus(scores);
  for (const step of result.querySelectorAll<HTMLElement>('[data-audit-step]')) {
    const { auditStep, auditStepFor } = step.dataset;
    step.hidden =
      auditStep === 'all-strong'
        ? answered < total || focus !== undefined
        : auditStep !== focus || auditStepFor !== audit.audience;
  }

  const status = root?.querySelector<HTMLElement>('[data-audit-status]');
  if (status) {
    status.textContent = audit.audience
      ? `Отмечено ${answered} из ${total}. Ответы сохраняются в этом браузере.`
      : 'Выбери, кто проходит аудит.';
  }
}

function start(element: HTMLElement): void {
  const form = element.querySelector<HTMLFormElement>('[data-audit-form]');
  const result = element.querySelector<HTMLElement>('[data-audit-result]');
  if (!form || !result) return;

  // Без JavaScript итогов нет, поэтому блок появляется только здесь.
  const summary = element.querySelector<HTMLElement>('[data-audit-summary]');
  if (summary) summary.hidden = false;

  form.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const audience = AUDIENCES.find((item) => item === input.value);
    let audit = load();
    if (input.name === 'audience') {
      if (audience) audit = setAudience(audit, audience);
    } else {
      const answer = ANSWER_VALUES.find((value) => value === Number(input.value));
      if (answer === undefined) return;
      audit = setAnswer(audit, input.name, answer);
    }
    writeToolNote(AUDIT_NOTE_ID, serializeAudit(audit));
    render(result, form);
  });

  form.addEventListener('reset', (event) => {
    event.preventDefault();
    writeToolNote(AUDIT_NOTE_ID, '');
    render(result, form);
  });

  // Другая вкладка изменила записи: слушатель client/notes.ts уже перечитал хранилище.
  window.addEventListener('storage', () => {
    render(result, form);
  });

  render(result, form);
}

if (root) start(root);
