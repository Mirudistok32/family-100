import { describe, expect, it } from 'vitest';

import { isVisible } from '@/domain/visibility';

describe('isVisible', () => {
  it('обычный урок виден всегда', () => {
    expect(isVisible(false, 'production', false)).toBe(true);
  });

  it('черновик не попадает в публикацию', () => {
    expect(isVisible(true, 'production', false)).toBe(false);
  });

  it('черновик виден при разработке и в проверочной сборке', () => {
    expect(isVisible(true, 'development', true)).toBe(true);
    expect(isVisible(true, 'drafts', false)).toBe(true);
  });
});
