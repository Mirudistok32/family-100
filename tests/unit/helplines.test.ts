import { describe, expect, it } from 'vitest';

import { HELPLINE_GROUPS, HELPLINES } from '@/data/helplines';
import { checkHelplines, normalizePhone } from '@/domain/helplines';

const TODAY = new Date('2026-11-01T00:00:00.000Z');
const VALID = {
  id: 'x',
  name: 'Служба',
  phones: [{ label: '8 800 2000 122', tel: '+78002000122' }],
  source: 'https://example.org/',
  checkedAt: '2026-10-31',
};

describe('контакты служб помощи', () => {
  it('реальные данные проходят проверку', () => {
    expect(checkHelplines(HELPLINES, TODAY)).toEqual([]);
  });

  it('обязательные службы на месте с точными номерами', () => {
    const tel = (id: string) => HELPLINES.find((item) => item.id === id)?.phones[0]?.tel;
    expect(tel('emergency-112')).toBe('112');
    expect(tel('children-helpline')).toBe('+78002000122');
    expect(tel('al-anon')).toBe('+79031747571');
  });

  it('в каждой группе есть служба, у каждой службы есть группа', () => {
    const groups = new Set<string>(HELPLINE_GROUPS.map((group) => group.id));
    for (const group of groups) {
      expect(HELPLINES.some((item) => item.group === group)).toBe(true);
    }
    expect(HELPLINES.every((item) => groups.has(item.group))).toBe(true);
  });
});

describe('checkHelplines', () => {
  it('«8 800» и «+7 800» считаются одним номером', () => {
    expect(normalizePhone('8 (800) 101-42-12')).toBe(normalizePhone('+78001014212'));
    expect(normalizePhone('112')).toBe('112');
  });

  it('ловит пропущенную цифру', () => {
    const errors = checkHelplines(
      [{ ...VALID, phones: [{ label: '8-800-200-122', tel: '+78002000122' }] }],
      TODAY,
    );
    expect(errors.join()).toContain('расходятся');
  });

  it('ловит источник без https и неверные даты', () => {
    expect(checkHelplines([{ ...VALID, source: 'http://x.ru' }], TODAY).join()).toContain('https');
    expect(checkHelplines([{ ...VALID, site: 'x.ru' }], TODAY).join()).toContain('https');
    expect(checkHelplines([{ ...VALID, checkedAt: '2026-13-40' }], TODAY).join()).toContain('дата');
    expect(checkHelplines([{ ...VALID, checkedAt: '2027-01-01' }], TODAY).join()).toContain(
      'будущем',
    );
  });

  it('ловит повтор id и контакт без телефона', () => {
    expect(checkHelplines([VALID, VALID], TODAY).join()).toContain('повтор');
    expect(checkHelplines([{ ...VALID, phones: [] }], TODAY).join()).toContain('нет телефона');
  });
});
