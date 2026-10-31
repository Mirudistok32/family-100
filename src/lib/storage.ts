// Единственное место работы с localStorage. В приватном режиме хранилища может не быть, поэтому ошибки
// не выходят наружу: чтение даёт null, запись возвращает false, а ввод остаётся в памяти страницы.

export function readItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key: string): boolean {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}
