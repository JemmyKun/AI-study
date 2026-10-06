/**
 * /ai-chat 页面端到端冒烟：发一条真实问题，验证流式输出与页面无报错
 *
 * 用法（在项目根目录执行）：node scripts/temp/_e2e-deepseek.mjs
 * 前置：npm run launch（3000/8200/8300 均在监听）
 * 依赖：npm i --no-save playwright-core
 */
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => {
  if (m.type() === 'error') errors.push(`console: ${m.text().slice(0, 200)}`);
});

await page.goto('http://localhost:3000/ai-chat', { waitUntil: 'networkidle' });
// 健康检查是挂载后的异步请求，等它落地再读状态
await page
  .waitForFunction(
    () => document.querySelector('.ds-status')?.textContent?.trim() !== '检测中…',
    { timeout: 8000 },
  )
  .catch(() => console.log('(健康检查未在 8s 内返回)'));
console.log('服务状态:', (await page.textContent('.ds-status'))?.trim());

// 1) 发送一条真实问题
await page.fill('.ds-textarea', '用一句话解释什么是 SSE');
await page.press('.ds-textarea', 'Enter');

// 2) 等待进入流式，再等待结束（停止按钮消失）
await page.waitForSelector('.ds-btn-stop', { timeout: 20000 }).catch(() => console.log('(未进入生成状态)'));
await page.waitForSelector('.ds-btn-stop', { state: 'detached', timeout: 90000 }).catch(() => console.log('(生成未在 90s 内结束)'));

const answers = await page.$$eval('.ds-bubble-ai', els => els.map(e => e.innerText));
const reply = answers[answers.length - 1]?.replace(/\s+/g, ' ').trim();
console.log('助手回复:', reply ? reply.slice(0, 200) : '(空！未出结果)');
console.log('用户气泡数:', await page.locator('.ds-bubble-user').count());
console.log('失败标记:', await page.locator('.ds-failed').count());

// 3) 清空回到欢迎页
await page.click('.ds-tool-btn:has-text("清空会话")').catch(() => {});
await page.waitForTimeout(600);
console.log('回到欢迎页:', (await page.locator('.ds-welcome-title').count()) > 0);

console.log('页面错误:', errors.length ? errors.slice(0, 5).join('\n') : '(无)');
await page.screenshot({ path: join(here, '_deepseek-smoke.png') });

// 4) AI 独立导航区：高亮是否正确、能否切换到 /chat
const navItems = await page.$$eval('.app-nav-ai-item', els =>
  els.map(e => ({ text: e.innerText.trim(), active: e.classList.contains('is-active') })),
);
console.log('AI 导航项:', JSON.stringify(navItems, null, 0));

await page.locator('.app-nav-ai-item').first().click();
await page.waitForURL('**/chat', { timeout: 10000 }).catch(() => console.log('(未跳转到 /chat)'));
console.log('切换后地址:', page.url());
const activeAfter = await page.$$eval('.app-nav-ai-item.is-active', els => els.map(e => e.innerText.trim()));
console.log('切换后高亮项:', activeAfter.join(' / ') || '(无)');

await browser.close();
