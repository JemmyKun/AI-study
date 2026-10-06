/**
 * 首页冒烟检查：标题/系统名、卡片数量、溢出与报错，并截图
 *
 * 用法（项目根目录）：node scripts/temp/_home.mjs
 * 依赖：npm i --no-save playwright-core
 */
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const executablePath = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find(p => existsSync(p));

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => {
  if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 160)}`);
});

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

console.log('浏览器标题:', await page.title());
console.log('导航系统名:', (await page.textContent('.app-nav-logo'))?.trim());
console.log('Hero 标题:', (await page.textContent('.hp-title'))?.replace(/\s+/g, ' ').trim());
console.log('业务模块卡片:', await page.locator('.hp-section').nth(0).locator('.hp-card').count());
console.log('AI 助手卡片:', await page.locator('.hp-section').nth(1).locator('.hp-card').count());
console.log('统计指标:', (await page.$$eval('.hp-stat', els => els.map(e => e.innerText.replace(/\s+/g, ' ').trim()))).join(' | '));

const overflow = await page.evaluate(() => ({
  横向溢出: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  纵向可滚动: document.documentElement.scrollHeight > document.documentElement.clientHeight,
}));
console.log('溢出检查:', JSON.stringify(overflow));

// 点击第一张业务卡片，验证跳转
await page.locator('.hp-card').first().click();
await page.waitForURL('**/builder', { timeout: 10000 }).catch(() => console.log('(未跳转到 /builder)'));
console.log('点击业务卡片后:', page.url());

await page.goBack({ waitUntil: 'networkidle' });
await page.locator('.hp-card').nth(3).click();
await page.waitForURL('**/chat', { timeout: 10000 }).catch(() => console.log('(未跳转到 /chat)'));
console.log('点击 AI 卡片后:', page.url());

console.log('页面错误:', errors.length ? errors.slice(0, 5).join('\n') : '(无)');

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.screenshot({ path: join(here, '_home.png'), fullPage: true });
await browser.close();
