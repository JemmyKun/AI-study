/**
 * DeepSeek 代理联调脚本：绕过前端直接验证 health 与 SSE 流式对话
 *
 * 用法（在项目根目录执行）：
 *   node scripts/temp/_probe-deepseek.mjs                 # 使用默认问题
 *   node scripts/temp/_probe-deepseek.mjs 你好，讲个笑话   # 自定义问题
 *   MODEL=deepseek-reasoner node scripts/temp/_probe-deepseek.mjs 9.11 和 9.8 谁大
 *
 * 前置：后端已启动（npm run launch 或 npm run ai:proxy）
 */
const PORT = Number(process.env.DEEPSEEK_PROXY_PORT || 8300);
const HOST = process.env.DEEPSEEK_PROXY_HOST || '127.0.0.1';
const MODEL = process.env.MODEL || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const BASE = `http://${HOST}:${PORT}/api/deepseek`;
const QUESTION = process.argv[2] || '用一句话介绍你自己，并说明你能帮我做什么。';

async function checkHealth() {
  const res = await fetch(`${BASE}/health`);
  console.log('--- health ---');
  console.log(`HTTP ${res.status}`, await res.text());
}

async function chat() {
  console.log('\n--- chat (SSE) ---');
  console.log(`model=${MODEL} question=${QUESTION}`);

  const started = Date.now();
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: QUESTION }],
      model: MODEL,
      stream: true,
    }),
  });

  if (!res.ok) {
    console.log(`HTTP ${res.status}`, await res.text());
    process.exitCode = 1;
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let answer = '';
  let reasoning = '';
  let firstTokenAt = 0;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const line = event.split('\n').map(l => l.trim()).find(l => l.startsWith('data:'));
      if (!line) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const delta = JSON.parse(payload)?.choices?.[0]?.delta ?? {};
        if (typeof delta.content === 'string' && delta.content) {
          if (!firstTokenAt) firstTokenAt = Date.now();
          answer += delta.content;
          process.stdout.write(delta.content);
        }
        if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
          reasoning += delta.reasoning_content;
        }
      } catch {
        /* 忽略无法解析的行 */
      }
    }
  }

  console.log('\n--- result ---');
  console.log(`首字延迟: ${firstTokenAt ? firstTokenAt - started : '-'}ms, 总耗时: ${Date.now() - started}ms`);
  console.log(`正文长度: ${answer.length} 字符, 思维链长度: ${reasoning.length} 字符`);
}

checkHealth().then(chat).catch(err => {
  console.error('联调失败：', err.message);
  console.error('请确认后端已启动：npm run launch');
  process.exitCode = 1;
});
