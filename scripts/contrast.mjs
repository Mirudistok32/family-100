#!/usr/bin/env node
// Контраст токенов из src/styles/tokens.css в обеих темах: текст 4,5:1 (WCAG AA), элементы интерфейса 3:1.
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');

const tokens = (block) =>
  Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(([, name, hex]) => [name, hex]),
  );

const light = tokens(css.match(/^:root\s*\{([\s\S]*?)^\}/m)?.[1] ?? '');
const dark = tokens(
  css.match(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}/)?.[1] ?? '',
);

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const SURFACES = [
  'paper',
  'paper-raised',
  'photo-edge',
  'note',
  'accent-soft',
  'green-soft',
  'danger-soft',
];
const TEXT = 4.5;
const UI = 3;
const PAIRS = [
  ...SURFACES.map((bg) => ['ink', bg, TEXT]),
  ...SURFACES.map((bg) => ['ink-soft', bg, TEXT]),
  ...SURFACES.map((bg) => ['accent', bg, TEXT]),
  ['accent-ink', 'accent', TEXT],
  ['green', 'paper', TEXT],
  ['green', 'paper-raised', TEXT],
  ['green', 'green-soft', TEXT],
  ['danger', 'paper', TEXT],
  ['danger', 'paper-raised', TEXT],
  ['danger', 'danger-soft', TEXT],
  ['rule', 'paper', UI],
  ['rule', 'paper-raised', UI],
  ['rule', 'note', UI],
];

let failed = 0;
for (const [theme, values] of [
  ['светлая', light],
  ['тёмная', dark],
]) {
  let lowest = Infinity;
  for (const [fg, bg, min] of PAIRS) {
    if (!values[fg] || !values[bg]) {
      console.error(`${theme}: нет токена --${values[fg] ? bg : fg}`);
      failed += 1;
      continue;
    }
    const value = ratio(values[fg], values[bg]);
    lowest = Math.min(lowest, value / min);
    if (value < min) {
      console.error(`${theme}: ${fg} на ${bg} = ${value.toFixed(2)} (нужно ${min})`);
      failed += 1;
    }
  }
  console.log(`${theme}: ${PAIRS.length} пар, самый малый запас ${lowest.toFixed(2)}×`);
}
process.exit(failed ? 1 : 0);
