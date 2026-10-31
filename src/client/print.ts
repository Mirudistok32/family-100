// Кнопка печати. Без JavaScript она скрыта: печатать можно через меню браузера.
for (const element of document.querySelectorAll<HTMLElement>('[data-needs-js]')) {
  element.hidden = false;
}

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-print]')) {
  button.addEventListener('click', () => {
    window.print();
  });
}
