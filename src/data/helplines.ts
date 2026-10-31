// Единственный источник контактов служб помощи. В уроках и на страницах контакты берём только отсюда.
// Номер переписываем дословно с сайта службы в поле `source`, дату проверки ставим в `checkedAt`.
// Перед добавлением сверяем организацию с реестром иностранных агентов Минюста (docs/sources.md).

export type HelplineGroup = 'danger' | 'teen' | 'violence' | 'addiction' | 'support';

export interface HelplinePhone {
  /** Как номер написан для человека. */
  label: string;
  /** Значение для ссылки `tel:`. Цифры должны совпадать с `label`, это проверяет тест. */
  tel: string;
}

export interface Helpline {
  id: string;
  group: HelplineGroup;
  name: string;
  /** Кому и с чем помогает. */
  who: string;
  phones: HelplinePhone[];
  hours: string;
  /** Сайт службы для читателя. Его нет у 112. */
  site?: string;
  /** Страница, где проверен номер. */
  source: string;
  /** Дата проверки, ГГГГ-ММ-ДД. */
  checkedAt: string;
}

export const HELPLINE_GROUPS: readonly { id: HelplineGroup; title: string; intro: string }[] = [
  {
    id: 'danger',
    title: 'Если опасно прямо сейчас',
    intro: 'Первым делом уйди в безопасное место, если это возможно, и позвони.',
  },
  {
    id: 'teen',
    title: 'Если тебе нет 18',
    intro:
      'Расскажи взрослому, которому доверяешь: родственнику, учителю, школьному психологу, врачу. Если первый взрослый не поверил, скажи другому. Можно начать со звонка: там выслушают и помогут понять, что делать дальше.',
  },
  {
    id: 'violence',
    title: 'Если дома насилие',
    intro:
      'Уход бывает самым опасным моментом, поэтому готовить его лучше вместе со специалистом. Позвонить можно ещё до любых решений.',
  },
  {
    id: 'addiction',
    title: 'Если в семье пьют или употребляют наркотики',
    intro: 'Помощь нужна и самому человеку, и тем, кто живёт рядом с ним.',
  },
  {
    id: 'support',
    title: 'Если просто очень тяжело',
    intro: 'Не нужно ждать, пока станет совсем плохо. Звонить можно и с таким вопросом.',
  },
];

const CHECKED = '2026-10-31';

export const HELPLINES: readonly Helpline[] = [
  {
    id: 'emergency-112',
    group: 'danger',
    name: 'Единый номер экстренных служб',
    who: 'Полиция, скорая и другие экстренные службы. Звонок бесплатный, даже если на счету минус.',
    phones: [{ label: '112', tel: '112' }],
    hours: 'Круглосуточно',
    source: 'https://55.mchs.gov.ru/deyatelnost/press-centr/novosti/5278034',
    checkedAt: CHECKED,
  },
  {
    id: 'children-helpline',
    group: 'teen',
    name: 'Детский телефон доверия',
    who: 'Для детей, подростков и родителей. Бесплатно и анонимно: номер не определяется, имя можно не называть.',
    phones: [
      { label: '8 800 2000 122', tel: '+78002000122' },
      { label: '124', tel: '124' },
    ],
    hours: 'В большинстве регионов круглосуточно. Короткий номер 124 только с мобильного',
    site: 'https://telefon-doveria.ru/',
    source: 'https://fond-detyam.ru/detskiy-telefon-doveriya/',
    checkedAt: CHECKED,
  },
  {
    id: 'sisters',
    group: 'violence',
    name: 'Центр «Сёстры»',
    who: 'Для тех, кто пережил сексуальное насилие, и для их близких. Вся помощь бесплатна. Есть кризисная почта online@sisters-help.ru.',
    phones: [{ label: '+7 (499) 901-02-01', tel: '+74999010201' }],
    hours: 'Понедельник — суббота, 10:00–20:00 по Москве',
    site: 'https://sisters-help.ru/',
    source: 'https://sisters-help.ru/',
    checkedAt: CHECKED,
  },
  {
    id: 'ina-crisis-center',
    group: 'violence',
    name: 'Кризисный центр для женщин «ИНА»',
    who: 'Телефон доверия центра в Петербурге. По будням и воскресеньям консультирует психолог, по субботам юрист.',
    phones: [{ label: '+7 (812) 327-30-00', tel: '+78123273000' }],
    hours: 'Каждый день, 11:00–18:00 по Москве',
    site: 'https://crisiscenter.ru/',
    source: 'https://crisiscenter.ru/',
    checkedAt: CHECKED,
  },
  {
    id: 'al-anon',
    group: 'addiction',
    name: 'Ал-Анон и Алатин',
    who: 'Группы для родных и друзей людей, которые пьют. Алатин — для подростков. На сайте есть поиск собраний по городам.',
    phones: [{ label: '+7 (903) 174-75-71', tel: '+79031747571' }],
    hours: '10:00–20:00 по Москве',
    site: 'https://al-anon.org.ru/alatin/',
    source: 'https://al-anon.org.ru/kontakty/',
    checkedAt: CHECKED,
  },
  {
    id: 'narcotics-anonymous',
    group: 'addiction',
    name: 'Анонимные Наркоманы',
    who: 'Сообщество для людей с зависимостью, которые хотят прекратить употребление. Это взаимопомощь, она не заменяет врача.',
    phones: [{ label: '8 (800) 101-42-12', tel: '+78001014212' }],
    hours: 'Круглосуточно, бесплатно по России',
    site: 'https://na-russia.org/',
    source: 'https://na-russia.org/',
    checkedAt: CHECKED,
  },
  {
    id: 'emercom-psychologists',
    group: 'support',
    name: 'Психологи МЧС России',
    who: 'Экстренная психологическая помощь. Номер московский, звонок идёт по обычному тарифу.',
    phones: [{ label: '+7 (495) 989-50-50', tel: '+74959895050' }],
    hours: 'Часы на сайте не указаны',
    site: 'https://psi.mchs.gov.ru/',
    source: 'https://psi.mchs.gov.ru/',
    checkedAt: CHECKED,
  },
];

/** Нейтральный сайт для кнопки «Быстрый выход». */
export const QUICK_EXIT_URL = 'https://ya.ru/';
