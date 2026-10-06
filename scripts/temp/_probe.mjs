const base = 'http://127.0.0.1:8200/api/copilotkit';

const body = {
  threadId: 'smoke-thread',
  runId: 'smoke-run',
  messages: [{ id: 'm1', role: 'user', content: '你好，请用一句话介绍你自己。' }],
  tools: [],
  context: [],
  state: {},
  forwardedProps: {},
};

const res = await fetch(`${base}/agent/default/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
  body: JSON.stringify(body),
});

console.log('status', res.status, res.headers.get('content-type'));

const ct = res.headers.get('content-type') || '';
let assistantText = '';
const events = [];

if (ct.includes('text/event-stream') && res.body) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const chunks = buf.split('\n\n');
    buf = chunks.pop() ?? '';
    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find(l => l.startsWith('data:'));
      if (!dataLine) continue;
      try {
        const ev = JSON.parse(dataLine.slice(5).trim());
        if (ev.type === 'TEXT_MESSAGE_CONTENT') assistantText += ev.delta ?? '';
        events.push(`${ev.type}${ev.type === 'TOOL_CALL_START' ? ':' + (ev.toolCallName ?? '') : ''}`);
      } catch {
        /* ignore */
      }
    }
  }
} else {
  console.log('非 SSE 响应：', (await res.text()).slice(0, 400));
}

console.log('事件序列:', [...new Set(events)].join(' -> '));
console.log('流式回复:', assistantText || '(空)');
