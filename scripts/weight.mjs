#!/usr/bin/env node
// Вес сборки: страницы и то, что они тянут. Запускать после `npm run build`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = 'dist';

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} КБ`;
const totals = new Map();
const pages = [];

for (const file of walk(ROOT)) {
  const data = readFileSync(file);
  const ext = extname(file) || '(без расширения)';
  const entry = totals.get(ext) ?? { count: 0, size: 0, gzip: 0 };
  entry.count += 1;
  entry.size += data.length;
  entry.gzip += gzipSync(data).length;
  totals.set(ext, entry);
  if (ext === '.html') pages.push({ file: relative(ROOT, file), size: data.length });
}

console.log('По типам:');
for (const [ext, { count, size, gzip }] of [...totals].sort((a, b) => b[1].size - a[1].size)) {
  console.log(`  ${ext}: ${count} шт., ${kb(size)}, gzip ${kb(gzip)}`);
}
console.log('Самые тяжёлые страницы:');
for (const { file, size } of pages.sort((a, b) => b.size - a.size).slice(0, 10)) {
  console.log(`  ${file}: ${kb(size)}`);
}
