/** SSE（Server-Sent Events）流式读取：与具体业务无关，只负责把 data 行回调出去 */

export interface SseRequestConfig {
  method?: 'POST' | 'GET';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export type SseEventListener = (data: string) => void;

/**
 * 建立 SSE 连接并在每个事件上回调 data 内容（不含 "data:" 前缀）。
 * 约定：[DONE] 由业务层自行判断是否终止解析，这里照常透传。
 *
 * 注意：本函数不负责超时（流式响应时长不可预期），由调用方用 AbortSignal 控制。
 */
export async function streamSse(
  url: string,
  config: SseRequestConfig,
  onEvent: SseEventListener,
): Promise<void> {
  const { method = 'POST', body, headers, signal } = config;

  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'text/event-stream',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const text = await res.text();
      const data = JSON.parse(text) as { error?: { message?: string }; message?: string };
      detail = data?.error?.message || data?.message || detail;
    } catch {
      /* 非 JSON 错误响应时用默认文案 */
    }
    throw new Error(detail);
  }

  if (!res.body) throw new Error('浏览器不支持流式响应（response.body 为空）');

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    // SSE 以空行分隔事件；最后一个元素可能是半包，留到下轮拼接
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const dataLines = event
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trim());

      if (dataLines.length === 0) continue;
      onEvent(dataLines.join('\n'));
    }
  }
}
