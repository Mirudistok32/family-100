import { describe, expect, it } from 'vitest';

import config from '../../astro.config.mjs';

describe('astro.config', () => {
  it('публикуется в подпапку с завершающей косой чертой', () => {
    expect(config.base).toBe('/family-100');
    expect(config.trailingSlash).toBe('always');
    expect(config.output).toBe('static');
  });
});
