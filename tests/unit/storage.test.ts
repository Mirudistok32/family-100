import { afterEach, describe, expect, it, vi } from 'vitest';

import { readItem, removeItem, writeItem } from '@/lib/storage';

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('storage', () => {
  it('пишет и читает', () => {
    expect(writeItem('family100:test', 'x')).toBe(true);
    expect(readItem('family100:test')).toBe('x');
    expect(removeItem('family100:test')).toBe(true);
    expect(readItem('family100:test')).toBeNull();
  });

  it('пустое хранилище даёт null', () => {
    expect(readItem('family100:нет')).toBeNull();
  });

  it('ошибка хранилища не выходит наружу', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(writeItem('family100:test', 'x')).toBe(false);
    expect(readItem('family100:test')).toBeNull();
    expect(removeItem('family100:test')).toBe(false);
  });
});
