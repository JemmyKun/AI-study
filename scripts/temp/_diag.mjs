/** 临时诊断：检查 AI 页面的滚动与头部布局 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 截图输出到脚本同级目录（scripts/temp），与运行目录无关
const here = dirname(fileURLToPath(import.meta.url));

const executablePath = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find(p => existsSync(p));

const browser = await chromium.launch({ executablePath, headless: true });

for (const url of ['http://localhost:3000/ai-chat', 'http://localhost:3000/chat']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const info = await page.evaluate(() => {
    const rect = s => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), height: Math.round(r.height) };
    };
    return {
      vertical: {
        scrollH: document.documentElement.scrollHeight,
        clientH: document.documentElement.clientHeight,
        溢出: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      },
      horizontal:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyMargin: getComputedStyle(document.body).margin,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      appNav: rect('.app-nav'),
      pageRoot: rect('.ds-page') || rect('.chat-page'),
      pageHeader: rect('.ds-header') || rect('.chat-header'),
      main: rect('.ds-main') || rect('.chat-main'),
      footer: rect('.ds-footer') || rect('.chat-footer'),
    };
  });

  console.log(`=== ${url} ===`);
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: join(here, `_diag-${url.split('/').pop()}.png`) });
  await page.close();
}

await browser.close();
