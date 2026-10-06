import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, deepseekApi } from '../../services';
import { createId } from '../../utils';
import { composeAttachmentText } from './attachments';
import { ApiMessage, Attachment, ChatMessage, DEFAULT_MODEL, HealthInfo, ServiceStatus } from './types';

/**
 * 单条消息真正发给模型的内容：正文 + 可读文本附件的内容。
 * 只挂了图片/二进制而没打字时，至少把文件名告诉模型，避免发出空 content。
 */
function buildApiContent(m: ChatMessage): string {
  const text = m.content.trim();
  const injected = composeAttachmentText(m.attachments ?? []);
  if (text || injected) return text + injected;

  const names = (m.attachments ?? []).map(a => a.name);
  return names.length ? `（用户上传了文件：${names.join('、')}）` : '';
}

/** 把 UI 消息压缩成发给模型的上下文：丢弃失败回复与空内容 */
function toApiMessages(messages: ChatMessage[]): ApiMessage[] {
  return messages
    .filter(m => !m.failed)
    .map(m => ({ role: m.role, content: buildApiContent(m) }))
    .filter(m => m.content.trim());
}

/** 把底层错误翻译成用户能看懂的提示 */
function friendlyError(err: unknown): string {
  const offline = '无法连接后端代理，请确认已启动服务（npm run launch）。';
  if (err instanceof ApiError && err.isNetworkError) return offline;

  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/api key|401|403|密钥|key/i.test(raw)) {
    return '模型密钥无效或未配置，请在 .env 中填写 DEEPSEEK_API_KEY 后重启服务。';
  }
  if (/Failed to fetch|fetch failed|NetworkError|ECONNREFUSED|network|超时/i.test(raw)) {
    return offline;
  }
  return raw || '生成失败，请重试。';
}

/** 状态灯文案 */
const STATUS_TEXT: Record<ServiceStatus, string> = {
  checking: '检测中…',
  ready: '已就绪',
  unconfigured: '未配置密钥',
  offline: '未连接',
};

/**
 * DeepSeek 对话驱动：
 * - 通过 services 层访问后端（页面不直接 fetch，不感知地址拼接）
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

  // 注意：React.StrictMode 下会 mount → 模拟卸载 → 再次 mount，
  // 因此必须在每次 mount 时把 aliveRef 恢复为 true，否则所有内容更新都会被跳过。
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  /** 健康检查：决定状态灯与是否需要提示配置密钥 */
  const refreshStatus = useCallback(async () => {
    try {
      const data = await deepseekApi.fetchHealth();
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
    (id: string, content: string, reasoning: string, failed = false, thoughtMs?: number) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === id
            ? {
                ...m,
                content,
                reasoning: reasoning || undefined,
                failed: failed || undefined,
                thoughtMs,
              }
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
      let thoughtMs: number | undefined;
      const startedAt = Date.now();
      let frame: number | null = null;

      /** 攒够一帧再渲染，兼顾流畅与性能 */
      const schedule = () => {
        if (frame != null) return;
        frame = requestAnimationFrame(() => {
          frame = null;
          if (aliveRef.current) commit(assistantId, content, reasoning, false, thoughtMs);
        });
      };

      try {
        await deepseekApi.streamChat(
          { messages: history, model: targetModel },
          delta => {
            if (delta.content) {
              // 首个正文 token 到达即视为思考结束，记下思考用时
              if (thoughtMs === undefined) thoughtMs = Date.now() - startedAt;
              content += delta.content;
            }
            if (delta.reasoning) reasoning += delta.reasoning;
            schedule();
          },
          controller.signal,
        );
      } catch (err) {
        const aborted = err instanceof Error && err.name === 'AbortError';
        if (aborted) {
          // 用户主动停止：已生成的内容保留
          if (content.trim() === '' && reasoning.trim() === '') {
            commit(assistantId, '', '', true);
          }
        } else {
          setError(friendlyError(err));
          commit(assistantId, content, reasoning, content.trim() === '', thoughtMs);
        }
      } finally {
        if (frame != null) cancelAnimationFrame(frame);
        if (aliveRef.current) {
          commit(
            assistantId,
            content,
            reasoning,
            content.trim() === '' && reasoning.trim() === '',
            thoughtMs,
          );
        }
        // 无论成功/失败/卸载都要复位，避免输入框卡在"停止"
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [commit],
  );

  const send = useCallback(
    (text: string, attachments?: Attachment[]) => {
      const content = text.trim();
      if ((!content && !attachments?.length) || isStreaming) return;

      const userMsg: ChatMessage = {
        id: createId('user'),
        role: 'user',
        content,
        attachments: attachments?.length ? attachments : undefined,
        createdAt: Date.now(),
      };
      const assistantId = createId('assistant');
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
    const assistantId = createId('assistant');
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

  const statusText = STATUS_TEXT[status];

  return {
    messages,
    isStreaming,
    status,
    statusText,
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
