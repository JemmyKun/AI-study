import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ApiMessage,
  ChatMessage,
  DEFAULT_MODEL,
  HealthInfo,
  ServiceStatus,
} from './types';

/**
 * 接口基址解析：
 * 1. public/config.js 的 window.__DEEPSEEK_API_URL__（部署后可改，无需重新打包）
 * 2. 构建时注入的 REACT_APP_DEEPSEEK_API_URL
 * 3. 同源相对路径 /api/deepseek（开发走 devServer 代理，生产走 Nginx 反代）
 */
const BASE_URL =
  (window as unknown as { __DEEPSEEK_API_URL__?: string }).__DEEPSEEK_API_URL__ ||
  process.env.REACT_APP_DEEPSEEK_API_URL ||
  '/api/deepseek';

const CHAT_URL = `${BASE_URL}/chat`;
const HEALTH_URL = `${BASE_URL}/health`;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** 把 UI 消息压缩成发给模型的上下文：丢弃空内容与失败回复 */
function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
  return messages
    .filter(m => !m.failed && m.content.trim())
    .map(m => ({ role: m.role, content: m.content }));
}

function friendlyError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/api key|401|403|密钥|key/i.test(raw)) {
    return '模型密钥无效或未配置，请在 .env 中填写 DEEPSEEK_API_KEY 后重启服务。';
  }
  if (/Failed to fetch|fetch failed|NetworkError|ECONNREFUSED|network/i.test(raw)) {
    return '无法连接后端代理，请确认已启动服务（npm run launch）。';
  }
  return raw || fallback;
}

/**
 * DeepSeek 对话驱动：
 * - fetch + ReadableStream 手动解析 SSE（不引入 SDK，保持依赖精简）
 * - 支持流式打字、停止生成、清空会话、模型切换、服务健康检查
 * - 用 requestAnimationFrame 合并渲染，避免每个 token 都触发一次 React 更新
 */
export function useDeepSeekChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setStreaming] = useState(false);
  const [status, setStatus] = useState<ServiceStatus>('checking');
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_MODEL);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const aliveRef = useRef(true);
  /** 供 send/regenerate 同步读取最新消息：setState 的 updater 必须保持纯函数 */
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 卸载时中止进行中的流式请求，避免在已卸载组件上 setState
  useEffect(
    () => () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    },
    [],
  );

  /** 健康检查：决定状态灯与是否需要提示配置密钥 */
  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(HEALTH_URL, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`health ${res.status}`);
      const data = (await res.json()) as HealthInfo & { allowedModels?: string[] };
      if (!aliveRef.current) return;
      setHealth({
        configured: !!data.configured,
        model: data.model || DEFAULT_MODEL,
        allowedModels: data.allowedModels || [],
      });
      setStatus(data.configured ? 'ready' : 'unconfigured');
    } catch {
      if (aliveRef.current) setStatus('offline');
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  /** 把当前累积内容写入指定消息 */
  const commit = useCallback(
    (id: string, content: string, reasoning: string, failed = false) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === id
            ? { ...m, content, reasoning: reasoning || undefined, failed: failed || undefined }
            : m,
        ),
      );
    },
    [],
  );

  const runStream = useCallback(
    async (history: ApiMessage[], assistantId: string, targetModel: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setError(null);

      let content = '';
      let reasoning = '';
      let frame: number | null = null;

      /** 攒够一帧再渲染，兼顾流畅与性能 */
      const schedule = () => {
        if (frame != null) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          if (aliveRef.current) commit(assistantId, content, reasoning);
        });
      };

      try {
        const res = await fetch(CHAT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: history, model: targetModel, stream: true }),
          signal: controller.signal,
        });

        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try {
            const data = await res.json();
            detail = data?.error?.message || detail;
          } catch {
            /* 非 JSON 响应时用默认文案 */
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
            const line = event
              .split('\n')
              .map(l => l.trim())
              .find(l => l.startsWith('data:'));
            if (!line) continue;

            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;

            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta ?? {};
              if (typeof delta.content === 'string' && delta.content) {
                content += delta.content;
              }
              if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
                reasoning += delta.reasoning_content;
              }
            } catch {
              // 单行解析失败不影响整体，忽略即可
            }
          }
          schedule();
        }
      } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError';
        if (aborted) {
          // 用户主动停止：已生成的内容保留
          if (content.trim() === '' && reasoning.trim() === '') {
            commit(assistantId, '', '', true);
          }
        } else {
          setError(friendlyError(err, '生成失败，请重试。'));
          commit(assistantId, content, reasoning, content.trim() === '');
        }
      } finally {
        if (frame != null) cancelAnimationFrame(frame);
        if (aliveRef.current) {
          commit(assistantId, content, reasoning, content.trim() === '' && reasoning.trim() === '');
          setStreaming(false);
        }
        abortRef.current = null;
      }
    },
    [commit],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || isStreaming) return;

      const userMsg: ChatMessage = {
        id: newId(),
        role: 'user',
        content,
        createdAt: Date.now(),
      };
      const assistantId = newId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      setError(null);
      const history = toApiMessages([...messagesRef.current, userMsg]);
      setMessages(prev => [...prev, userMsg, assistantMsg]);
      void runStream(history, assistantId, model);
    },
    [isStreaming, model, runStream],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
  }, []);

  /** 重新生成：丢弃最后一条助手回复并重发上一条用户消息 */
  const regenerate = useCallback(() => {
    if (isStreaming) return;
    const prev = messagesRef.current;
    const lastUserIndex = [...prev].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;

    const userIndex = prev.length - 1 - lastUserIndex;
    const history = toApiMessages(prev.slice(0, userIndex + 1));
    const assistantId = newId();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    setError(null);
    setMessages([...prev.slice(0, userIndex + 1), assistantMsg]);
    void runStream(history, assistantId, model);
  }, [isStreaming, model, runStream]);

  return {
    messages,
    isStreaming,
    status,
    health,
    model,
    setModel,
    error,
    dismissError: () => setError(null),
    refreshStatus,
    send,
    stop,
    clear,
    regenerate,
  };
}
