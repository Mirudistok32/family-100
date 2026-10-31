#!/usr/bin/env node
// Рисует картинку для соцсетей public/og.png (1200×630). Запускать вручную, когда меняется оформление.
import { readFileSync } from 'node:fs';

import { chromium } from '@playwright/test';

const font = (path) => readFileSync(`node_modules/${path}`).toString('base64');
const literata = font('@fontsource-variable/literata/files/literata-cyrillic-wght-normal.woff2');
const caveat = font('@fontsource-variable/caveat/files/caveat-cyrillic-wght-normal.woff2');

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:L;src:url(data:font/woff2;base64,${literata});font-weight:200 900}
@font-face{font-family:C;src:url(data:font/woff2;base64,${caveat});font-weight:400 700}
body{margin:0;width:1200px;height:630px;background:#f5eddc;color:#2a1f16;font-family:L;display:grid;place-items:center}
.card{width:1040px;height:470px;box-sizing:border-box;background:#fffdf7;border:1px solid #dccfb6;box-shadow:0 4px 18px rgb(70 45 20/.2);padding:64px 72px;position:relative}
.card:before,.card:after{content:'';position:absolute;width:44px;height:44px;border:3px solid #8d7a63}
.card:before{top:18px;left:18px;border-right:0;border-bottom:0}.card:after{right:18px;bottom:18px;border-left:0;border-top:0}
.h{font-family:C;font-size:50px;font-weight:600;color:#8c3a22;margin:0 0 8px}
h1{font-size:96px;line-height:1.05;font-weight:600;margin:0 0 28px}
p{font-size:36px;line-height:1.35;margin:0;color:#5c4a39}
</style><div class="card"><div class="h">семь дней, один альбом</div><h1>Семья на 100 лет</h1><p>Зачем нужна семья, как её создать и как растить её силу</p></div>`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'public/og.png' });
await browser.close();
