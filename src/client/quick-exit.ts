// «Быстрый выход»: заменяем запись истории, чтобы кнопка «назад» не вернула на эту страницу.
// Без JavaScript остаётся обычная ссылка: она тоже уводит, но страница останется в истории.
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-quick-exit]')) {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.replace(link.href);
  });
}
