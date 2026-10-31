# Журнал плана

_Одна запись на пункт. Агент дописывает в конец и не перечитывает журнал целиком._

### 0.1. Каркас и базовая линия — 2026-10-31

- Каркас Astro 7.4.4 + TS 6.0.3 strictest, ESLint 10, Prettier, Vitest 5, Playwright 1.64 с axe; git, README, docs/architecture.md, docs/decisions.md
- Проверка: check:full зелёный: 1 юнит-тест, 4 e2e (desktop+mobile); Lighthouse заглушки 100/100/100/100; вес: HTML 0,6 КБ, SVG 0,4 КБ, JS и CSS нет; Node 26.1.0
- Время: 6 мин
- Базовая линия для 5.2: Performance 100, Accessibility 100, Best Practices 100, SEO 100; `dist` — 1 КБ.
- Astro из-под агента уводит `astro preview` в фон, и Playwright видит «сервер упал»; лечится флагом `--ignore-lock`.
- `npm audit` по продакшен-зависимостям чистый. В dev-цепочке ESLint есть умеренное предупреждение про `minimatch`; `audit fix --force` предлагает откат `eslint-plugin-astro` до 0.9, поэтому оставлено как есть.
- `eslint-plugin-astro` объявляет Node ≥ 26.3, здесь 26.1 — только предупреждение, линтер работает.

### 0.2. Редакционные правила — 2026-10-31

- docs/editorial.md: позиция, обращение без рода, простой язык, факты, герои, этика, безопасные тексты о насилии и зависимостях, школьник и взрослый, записи
- Проверка: check:full зелёный; AGENTS.md уже ссылается на docs/editorial.md
- Время: 1 мин
