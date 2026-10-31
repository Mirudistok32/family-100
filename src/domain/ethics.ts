// Вопрос этики урока: разбор раздела Markdown на вопрос, позиции и границу. Без DOM.
// Текст живёт только в уроке: страница /ethics его не переписывает, поэтому они не разойдутся.

export const ETHICS_SECTION = 'Вопрос этики';

export interface EthicsPosition {
  title: string;
  text: string;
}

export interface EthicsSummary {
  question: string;
  positions: EthicsPosition[];
  /** То, что курс не предлагает выбирать: например, что насилие оправдать нельзя. Есть не у всех дней. */
  limit: string | undefined;
}

/** Оставляет текст Markdown без разметки: страница выводит его как обычный текст. */
function plain(markdown: string): string {
  return markdown
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replaceAll('*', '')
    .trim();
}

/** Первая строка раздела — вопрос жирным, позиции — пункты списка с жирным началом. */
export function parseEthics(section: string): EthicsSummary {
  const lines = section
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const question = /^\*\*(.+)\*\*$/.exec(lines[0] ?? '')?.[1] ?? '';
  const positions = lines.flatMap((line) => {
    const match = /^- \*\*(.+?)\*\*\s*(.*)$/.exec(line);
    return match ? [{ title: plain(match[1] ?? ''), text: plain(match[2] ?? '') }] : [];
  });
  const limit = lines
    .slice(1)
    .filter((line) => !line.startsWith('- '))
    .map((line) => /\*\*(.+?)\*\*/.exec(line)?.[1])
    .find(Boolean);
  // В уроке граница бывает концом фразы, а на странице она стоит отдельным предложением.
  return { question, positions, limit: limit && limit.charAt(0).toUpperCase() + limit.slice(1) };
}
