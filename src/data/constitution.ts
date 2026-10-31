// Тексты конструктора семейной конституции. Id записей постоянные (docs/save-format.md).
import type { Audience } from '@/domain/capital-audit';
import type { ConstitutionSection } from '@/domain/constitution';

export const VERSION_QUESTION = 'Для кого этот текст?';

export const VERSION_TITLES: Record<Audience, string> = {
  teen: 'Мне 14–17: моя будущая семья',
  couple: 'Мы уже пара',
};

export const DOCUMENT_TITLES: Record<Audience, string> = {
  teen: 'Конституция моей будущей семьи',
  couple: 'Конституция нашей семьи',
};

export const DOCUMENT_LEADS: Record<Audience, string> = {
  teen: 'Это черновик на будущее. Он будет меняться, и это нормально.',
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
    noteId: 'd7-task-mission',
    label: 'Миссия',
    sensitive: false,
    titles: { teen: 'Какой будет моя семья', couple: 'Какие мы и зачем мы вместе' },
    prompts: {
      teen: 'Какой будет твоя семья и зачем она тебе? Одна-две фразы.',
      couple: 'Какие вы и зачем вы вместе? Одна-две фразы.',
    },
  },
  {
    noteId: 'constitution-values',
    label: 'Ценности',
    sensitive: false,
    titles: { teen: 'Что для меня важнее всего', couple: 'Что для нас важнее всего' },
    prompts: {
      teen: 'Что будет важнее всего в твоём доме? Хватит трёх-пяти слов или коротких фраз.',
      couple:
        'Что для вас важнее всего, даже когда трудно? Хватит трёх-пяти слов или коротких фраз.',
    },
  },
  {
    noteId: 'd5-first-generation-task-rules',
    label: 'Правила',
    sensitive: true,
    titles: { teen: 'Правила моего дома', couple: 'Правила нашего дома' },
    prompts: {
      teen: 'Какие правила будут в твоём доме? Три-пять коротких правил. Например: спорим без оскорблений.',
      couple:
        'Какие правила в вашем доме не нарушают? Три-пять коротких правил. Например: спорим без оскорблений.',
    },
  },
  {
    noteId: 'constitution-decisions',
    label: 'Решения',
    sensitive: false,
    titles: { teen: 'Как будем принимать решения', couple: 'Как мы принимаем решения' },
    prompts: {
      teen: 'Что в твоей семье каждый будет решать сам, а что только вместе? Что делать, если мнения разошлись?',
      couple:
        'Что каждый решает сам, а что только вместе? Что делаете, если мнения разошлись? Когда собираете семейный совет?',
    },
  },
  {
    noteId: 'constitution-money',
    label: 'Деньги',
    sensitive: false,
    titles: { teen: 'Деньги', couple: 'Деньги' },
    prompts: {
      teen: 'Как в твоей семье будут обращаться с деньгами? О чём договариваться заранее? Суммы писать не нужно.',
      couple:
        'Что у вас общее, а что у каждого своё? На что откладываете, какие траты обсуждаете заранее? Суммы писать не нужно.',
    },
  },
  {
    noteId: 'constitution-not-repeat',
    label: 'Что не повторяем',
    sensitive: true,
    titles: { teen: 'Что я не повторю', couple: 'Что мы не повторяем' },
    prompts: {
      teen: 'Что из того, что ты видишь вокруг, не возьмёшь в свою семью? Можно коротко и без подробностей.',
      couple: 'Что из своих семей вы решили не повторять? Можно коротко и без подробностей.',
    },
  },
  {
    noteId: 'd7-task-tradition',
    label: 'Традиции',
    sensitive: false,
    titles: { teen: 'Мои традиции', couple: 'Наши традиции' },
    prompts: {
      teen: 'Какую традицию возьмёшь с собой или заведёшь?',
      couple: 'Какую традицию вы сохраните или заведёте? Когда она бывает?',
    },
  },
];
