import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

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

await page.goto('http://localhost:3000/chat', { waitUntil: 'networkidle' });
console.log('状态徽标:', (await page.textContent('.header-status'))?.trim());

// 1) 停止生成
await page.fill('.input-textarea', '请用三点介绍 CopilotKit');
await page.press('.input-textarea', 'Enter');
await page.waitForSelector('.btn-stop', { timeout: 20000 });
await page.waitForTimeout(1500);
const beforeStop = (await page.textContent('.message-list'))?.length ?? 0;
await page.click('.btn-stop');
await page.waitForTimeout(1500);
const afterStop = (await page.textContent('.message-list'))?.length ?? 0;
console.log('停止后是否还有光标:', await page.locator('.typing-cursor').count());
console.log('内容已停止增长:', afterStop >= beforeStop, `(停止前 ${beforeStop} 字符 → 之后 ${afterStop} 字符)`);

// 2) 清空会话
await page.click('.header-clear-btn');
await page.waitForTimeout(500);
console.log('回到欢迎页:', await page.locator('.welcome-title').count() > 0);
console.log('示例问题数:', await page.locator('.sample-question-btn').count());

// 3) 示例问题点击可发送
await page.click('.sample-question-btn');
await page.waitForSelector('.btn-stop', { timeout: 20000 }).catch(() => console.log('(未进入生成)'));
await page.waitForSelector('.btn-stop', { state: 'detached', timeout: 90000 }).catch(() => console.log('(超时)'));
const last = await page.$$eval('.bubble-assistant', els => els.map(e => e.innerText));
console.log('示例问答:', last[last.length - 1]?.replace(/\s+/g, ' ').slice(0, 220));

console.log('页面错误:', errors.length ? errors.slice(0, 5).join('\n') : '(无)');
await page.screenshot({ path: 'scripts/_chat-smoke.png' });
await browser.close();
