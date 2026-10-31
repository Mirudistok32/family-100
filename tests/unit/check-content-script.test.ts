import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

const run = (...args: string[]) =>
  spawnSync('node', ['scripts/check-content.ts', ...args], { encoding: 'utf8' });

describe('scripts/check-content.ts', () => {
  it('контент проекта проходит', () => {
    expect(run().status).toBe(0);
  });

  it('день без источника завершает скрипт с ошибкой', () => {
    const result = run('tests/fixtures/no-source');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('нет источников');
  });

  it('повтор id завершает скрипт с ошибкой', () => {
    const result = run('tests/fixtures/duplicate-id');
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('повтор id');
  });
});
