import { useCallback, useEffect, useReducer, useState } from 'react';
// 说明：CRA 的 moduleResolution 为 node10，读不到包的 exports 子路径类型，
// 因此由 src/types/copilotkit-headless.d.ts 提供该模块的类型声明。
import {
  useAgent,
  useCopilotKit,
  UseAgentUpdate,
} from '@copilotkit/react-core/v2/headless';
import { Message } from './MessageItem';

/**
 * AG-UI 消息的宽松描述：这里不直接依赖 @ag-ui/core 的类型，
 * 避免跨版本类型不一致带来的编译问题。
 */
type ToolCallPart = { id?: string; function?: { name?: string } };
type ContentPart = { type?: string; text?: unknown };
interface RawMessage {
  id?: string;
  role?: string;
  content?: unknown;
  toolCalls?: ToolCallPart[];
}

/** content 既可能是纯字符串，也可能是分片数组（多模态输入） */
function textFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as Array<string | ContentPart>)
      .map(part => {
        if (typeof part === 'string') return part;
        if (part && part.type === 'text') return String(part.text ?? '');
        return '';
      })
      .join('');
  }
  return '';
}

/** 把 AG-UI 原始消息映射成页面 UI 使用的消息结构 */
function mapMessages(raw: readonly RawMessage[]): Message[] {
  const list: Message[] = [];
  raw.forEach((m, i) => {
    if (m.role === 'user') {
      const text = textFromContent(m.content);
      if (text.trim()) list.push({ id: m.id || `user-${i}`, role: 'user', content: text });
      return;
    }
    if (m.role === 'assistant') {
      const text = textFromContent(m.content);
      // 过滤协议内置工具（如 AGUISendStateSnapshot），只展示业务工具
      const tools = (m.toolCalls || [])
        .map(t => t?.function?.name)
        .filter((n): n is string => !!n && !n.startsWith('AGUI'));
      if (text.trim()) {
        list.push({ id: m.id || `assistant-${i}`, role: 'assistant', content: text });
      } else if (tools.length) {
        list.push({
          id: m.id || `assistant-${i}`,
          role: 'assistant',
          content: `> 正在调用工具：\`${tools.join('`、`')}\``,
        });
      }
    }
    // system / developer / tool 结果消息不直接展示
  });
  return list;
}

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  if (/api key|401|unauthorized|MODEL_API_KEY/i.test(raw)) {
    return '模型密钥无效或未配置，请在 .env 中填写 MODEL_API_KEY 后重启 Runtime（npm run launch）。';
  }
  if (/ECONNREFUSED|Failed to fetch|fetch failed|NetworkError|network/i.test(raw)) {
    return '无法连接 AI 服务，请确认 Runtime 已启动（npm run launch）并检查网络。';
  }
  return raw ? `生成失败：${raw}` : '生成失败，请重试。';
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * 真实 AI 对话：直接驱动 CopilotKit 的 Agent（走后端 Runtime），
 * 支持流式输出、停止生成、清空会话，并自带错误提示。
 */
export function useAgentChat() {
  const { agent, isReady } = useAgent({
    updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged],
  });
  const { copilotkit } = useCopilotKit();
  const runtimeStatus = copilotkit.runtimeConnectionStatus;
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const [error, setError] = useState<string | null>(null);

  // 兜底刷新：确保流式 token、运行状态变化都能触发重渲染
  useEffect(() => {
    const sub = agent.subscribe({
      onEvent: () => forceRender(),
      onRunFinalized: () => forceRender(),
      onRunFailed: ({ error: err }: { error: Error }) => {
        setError(friendlyError(err));
        forceRender();
      },
    });
    return () => sub.unsubscribe();
  }, [agent]);

  const messages = mapMessages((agent.messages ?? []) as readonly RawMessage[]);
  const isRunning = !!agent.isRunning;

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || agent.isRunning) return;
      setError(null);
      agent.addMessage({ id: newId(), role: 'user', content });
      forceRender();
      try {
        // 通过 core 发起：自动带上前端工具并处理工具回包
        await copilotkit.runAgent({ agent });
      } catch (err) {
        setError(friendlyError(err));
      } finally {
        forceRender();
      }
    },
    [agent, copilotkit],
  );

  const stop = useCallback(() => {
    try {
      agent.abortRun();
    } finally {
      forceRender();
    }
  }, [agent]);

  const clear = useCallback(() => {
    agent.setMessages([]);
    setError(null);
    forceRender();
  }, [agent]);

  return {
    messages,
    isRunning,
    /** Runtime 握手是否完成：connecting 时也可发送（会自动等待），error 时禁用输入 */
    runtimeStatus,
    isConnected: runtimeStatus === 'connected' || runtimeStatus === 'connecting',
    isReady,
    error,
    dismissError: () => setError(null),
    send,
    stop,
    clear,
  };
}
