// Тексты конструктора семейной конституции. Id записей постоянные (docs/save-format.md).
import type { Audience } from '@/domain/capital-audit';
import type { ConstitutionSection } from '@/domain/constitution';

export const VERSION_QUESTION = 'Для кого этот текст?';

export const VERSION_TITLES: Record<Audience, string> = {
  self: 'Начинаю с себя: моя семья',
  couple: 'Мы вместе',
};

export const DOCUMENT_TITLES: Record<Audience, string> = {
  self: 'Конституция моей семьи',
  couple: 'Конституция нашей семьи',
};

export const DOCUMENT_LEADS: Record<Audience, string> = {
  self: 'Это черновик на будущее. Он будет меняться, и это нормально.',
  couple:
    'Это не закон и не брачный договор, а наша общая договорённость. Раз в год мы её перечитываем и меняем, если надо.',
};

export const DOCUMENT_EMPTY =
  'Пока здесь пусто. Заполни хотя бы одну часть, и она появится на листе.';

export const DOCUMENT_TOO_LONG =
  'Текста уже больше, чем на два листа: при печати страниц будет больше. Можно оставить так или сократить.';

export const PRINT_EMPTY = 'Печатать пока нечего. Сначала заполни хотя бы одну часть.';

export const CONSTITUTION_SECTIONS: readonly ConstitutionSection[] = [
  {
    noteId: 'd7-task-mission', // Записывается в дне 2. Id постоянный, день в нём исторический.
    label: 'Миссия',
    sensitive: false,
    titles: { self: 'Какой будет моя семья', couple: 'Какие мы и зачем мы вместе' },
    prompts: {
      self: 'Какой будет твоя семья и зачем она тебе? Одна-две фразы.',
      couple: 'Какие вы и зачем вы вместе? Одна-две фразы.',
    },
  },
  {
    noteId: 'constitution-values',
    label: 'Ценности',
    sensitive: false,
    titles: { self: 'Что для меня важнее всего', couple: 'Что для нас важнее всего' },
    prompts: {
      self: 'Что будет важнее всего в твоём доме? Хватит трёх-пяти слов или коротких фраз.',
      couple:
        'Что для вас важнее всего, даже когда трудно? Хватит трёх-пяти слов или коротких фраз.',
    },
  },
  {
    noteId: 'd5-first-generation-task-rules', // Id постоянный: под ним лежат уже написанные правила.
    label: 'Правила',
    sensitive: false,
    titles: { self: 'Правила моего дома', couple: 'Правила нашего дома' },
    prompts: {
      self: 'Какие правила будут в твоём доме? Три-пять коротких правил. Например: спорим без оскорблений.',
      couple:
        'Какие правила в вашем доме не нарушают? Три-пять коротких правил. Например: спорим без оскорблений.',
    },
  },
  {
    noteId: 'constitution-decisions',
    label: 'Решения',
    sensitive: false,
    titles: { self: 'Как будем принимать решения', couple: 'Как мы принимаем решения' },
    prompts: {
      self: 'Что в твоей семье каждый будет решать сам, а что только вместе? Что делать, если мнения разошлись?',
      couple:
        'Что каждый решает сам, а что только вместе? Что делаете, если мнения разошлись? Когда собираете семейный совет?',
    },
  },
  {
    noteId: 'constitution-money',
    label: 'Деньги',
    sensitive: false,
    titles: { self: 'Деньги', couple: 'Деньги' },
    prompts: {
      self: 'Как в твоей семье будут обращаться с деньгами? О чём договариваться заранее? Суммы писать не нужно.',
      couple:
        'Что у вас общее, а что у каждого своё? На что откладываете, какие траты обсуждаете заранее? Суммы писать не нужно.',
    },
  },
  {
    noteId: 'constitution-not-repeat',
    label: 'Что не повторяем',
    sensitive: true,
    titles: { self: 'Что я не повторю', couple: 'Что мы не повторяем' },
    prompts: {
      self: 'Что из того, что видишь вокруг, не возьмёшь в свою семью? Можно коротко и без подробностей.',
      couple: 'Что из своих семей вы решили не повторять? Можно коротко и без подробностей.',
    },
  },
  {
    noteId: 'd7-task-tradition', // Записывается в дне 3.
    label: 'Традиции',
    sensitive: false,
    titles: { self: 'Мои традиции', couple: 'Наши традиции' },
    prompts: {
      self: 'Какую традицию возьмёшь с собой или заведёшь?',
      couple: 'Какую традицию вы сохраните или заведёте? Когда она бывает?',
    },
  },
];
