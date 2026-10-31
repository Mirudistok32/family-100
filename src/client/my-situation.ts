// «Моя ситуация»: показывает карточки по ответам. Ничего не пишет ни в хранилище, ни в сеть:
// ответы живут только в форме и стираются, когда человек уходит со страницы.
import { asksForSigns, pickCards, toAnswers } from '@/domain/situation';

const form = document.querySelector<HTMLFormElement>('[data-situation-form]');
const status = document.querySelector<HTMLElement>('[data-situation-status]');
const signs = document.querySelector<HTMLElement>('[data-situation-signs]');
const footer = document.querySelector<HTMLElement>('[data-situation-footer]');
const cards = [...document.querySelectorAll<HTMLElement>('[data-situation-card]')];

function render(current: HTMLFormElement): void {
  const data = new FormData(current);
  const answers = toAnswers(data.get('age'), data.get('climate'), data.getAll('signs'));
  const picked: readonly string[] = pickCards(answers);
  for (const card of cards) {
    card.hidden = !picked.includes(card.dataset['situationCard'] ?? '');
  }
  if (signs) signs.hidden = !asksForSigns(answers);
  if (footer) footer.hidden = picked.length === 0;
  if (status) {
    status.textContent =
      picked.length === 0
        ? 'Ответь на вопросы, и здесь появятся шаги.'
        : `Подходящих карточек ниже: ${picked.length}.`;
  }
}

if (form) {
  form.hidden = false;
  form.reset();
  render(form);
  form.addEventListener('change', () => {
    render(form);
  });
  // Событие reset приходит до очистки полей, поэтому показываем результат на следующем шаге.
  form.addEventListener('reset', () => {
    setTimeout(() => {
      render(form);
    });
  });
  // Страница может вернуться из кэша браузера кнопкой «назад»: ответов к этому моменту быть не должно.
  window.addEventListener('pagehide', () => {
    form.reset();
  });
  window.addEventListener('pageshow', () => {
    render(form);
  });
}
