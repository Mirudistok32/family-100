// Тексты «Аудита капиталов». Id вопросов постоянные: они лежат в записях и копиях пользователя.
// Суммы и имена аудит не спрашивает. Логика — src/domain/capital-audit.ts.
import type { Answer, Audience, AuditQuestion, Capital, Level } from '@/domain/capital-audit';

export interface AuditStatement extends AuditQuestion {
  text: string;
}

export const AUDIENCE_QUESTION = 'Кто проходит аудит?';

export const AUDIENCE_TITLES: Record<Audience, string> = {
  self: 'Начинаю с себя',
  couple: 'Мы вместе',
};

export const CAPITAL_TITLES: Record<Capital, string> = {
  human: 'Человеческий капитал: здоровье, характер, способности',
  intellectual: 'Интеллектуальный капитал: знания и навыки',
  social: 'Социальный капитал: связи и участие',
  financial: 'Финансовый капитал: деньги',
};

export const ANSWER_OPTIONS: readonly { value: Answer; label: string }[] = [
  { value: 0, label: 'Пока нет' },
  { value: 1, label: 'Отчасти' },
  { value: 2, label: 'Да' },
];

export const LEVEL_TITLES: Record<Level, string> = {
  empty: 'нет ответов',
  start: 'здесь можно начать',
  growing: 'уже растёт',
  strong: 'есть опора',
};

export const AUDIT_STATEMENTS: readonly AuditStatement[] = [
  {
    id: 'self-health',
    audience: 'self',
    capital: 'human',
    text: 'Я в основном высыпаюсь, двигаюсь и знаю, куда идти, если плохо себя чувствую.',
  },
  {
    id: 'self-promise',
    audience: 'self',
    capital: 'human',
    text: 'Обещания я обычно выполняю.',
  },
  {
    id: 'self-ability',
    audience: 'self',
    capital: 'human',
    text: 'Я знаю, что у меня получается, и занимаюсь этим.',
  },
  {
    id: 'self-learn',
    audience: 'self',
    capital: 'intellectual',
    text: 'Я продолжаю учиться тому, что мне правда интересно.',
  },
  {
    id: 'self-skill',
    audience: 'self',
    capital: 'intellectual',
    text: 'Я умею делать что-то руками или по дому: чинить, готовить, шить.',
  },
  {
    id: 'self-elders',
    audience: 'self',
    capital: 'intellectual',
    text: 'Есть кто-то старший, у кого можно спросить и чему-то научиться.',
  },
  {
    id: 'self-adult',
    audience: 'self',
    capital: 'social',
    text: 'Есть хотя бы один человек, к которому можно прийти с трудным вопросом.',
  },
  {
    id: 'self-friends',
    audience: 'self',
    capital: 'social',
    text: 'У меня есть друзья, с которыми можно говорить о важном.',
  },
  {
    id: 'self-community',
    audience: 'self',
    capital: 'social',
    text: 'Я участвую в чём-то кроме работы: клуб, команда, общее дело.',
  },
  {
    id: 'self-track',
    audience: 'self',
    capital: 'financial',
    text: 'Я знаю, на что уходят мои деньги, даже если их немного.',
  },
  {
    id: 'self-save',
    audience: 'self',
    capital: 'financial',
    text: 'Я откладываю хотя бы понемногу на что-то своё.',
  },
  {
    id: 'self-credit',
    audience: 'self',
    capital: 'financial',
    text: 'Я понимаю, что такое кредит и процент, и не занимаю, не подумав.',
  },
  {
    id: 'couple-health',
    audience: 'couple',
    capital: 'human',
    text: 'Мы оба заботимся о здоровье: сон, движение, врач вовремя.',
  },
  {
    id: 'couple-promise',
    audience: 'couple',
    capital: 'human',
    text: 'Мы выполняем то, что обещаем друг другу.',
  },
  {
    id: 'couple-ability',
    audience: 'couple',
    capital: 'human',
    text: 'Каждый из нас знает, что у него получается, и другой это поддерживает.',
  },
  {
    id: 'couple-learn',
    audience: 'couple',
    capital: 'intellectual',
    text: 'Каждый из нас продолжает чему-то учиться.',
  },
  {
    id: 'couple-share',
    audience: 'couple',
    capital: 'intellectual',
    text: 'Мы учим друг друга тому, что умеем.',
  },
  {
    id: 'couple-elders',
    audience: 'couple',
    capital: 'intellectual',
    text: 'Мы расспрашиваем старших и записываем то, что важно сохранить.',
  },
  {
    id: 'couple-friends',
    audience: 'couple',
    capital: 'social',
    text: 'У нас есть друзья, с которыми можно говорить о трудном.',
  },
  {
    id: 'couple-help',
    audience: 'couple',
    capital: 'social',
    text: 'Есть люди, к которым мы можем обратиться за помощью, и мы сами помогаем другим.',
  },
  {
    id: 'couple-community',
    audience: 'couple',
    capital: 'social',
    text: 'Мы участвуем в жизни вокруг: соседи, школа, общее дело.',
  },
  {
    id: 'couple-budget',
    audience: 'couple',
    capital: 'financial',
    text: 'Мы знаем свои доходы и расходы и честно говорим о них.',
  },
  {
    id: 'couple-cushion',
    audience: 'couple',
    capital: 'financial',
    text: 'У нас есть подушка: деньги на несколько месяцев обычной жизни.',
  },
  {
    id: 'couple-debt',
    audience: 'couple',
    capital: 'financial',
    text: 'Мы знаем все свои долги, и ни один не скрыт от другого.',
  },
];

export const AUDIT_STEPS: Record<Audience, Record<Capital, string>> = {
  self: {
    human: 'Выбери на неделю одну привычку: ложиться на полчаса раньше или каждый день гулять.',
    intellectual: 'Попроси человека рядом показать одно умение. Оно может быть совсем простым.',
    social:
      'Напиши человеку, с которым давно хочется поговорить, или загляни в клуб, который всё откладывается.',
    financial: 'Месяц записывай, на что уходят твои деньги, даже если их немного.',
  },
  couple: {
    human: 'Выберите на месяц одну общую привычку и поддерживайте друг друга, а не проверяйте.',
    intellectual: 'Научите друг друга одному умению в этом месяце.',
    social: 'Позовите кого-нибудь в гости или помогите соседу.',
    financial:
      'Сядьте на один вечер и запишите доходы, расходы и все долги. Потом начните откладывать любую посильную сумму.',
  },
};

export const AUDIT_ALL_STRONG =
  'Опора есть во всех четырёх капиталах. Подумай, кому рядом можно помочь: чему научить, с кем познакомить, кого поддержать.';
