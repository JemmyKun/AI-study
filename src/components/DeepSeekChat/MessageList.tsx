import React, { useEffect, useRef } from 'react';
import MessageItem from './MessageItem';
import { ChatMessage, ServiceStatus } from './types';

const SAMPLES = [
  '用一句话解释什么是 HTTP 缓存',
  '帮我写一个 TypeScript 防抖函数，并说明用法',
  '把下面这段需求拆成任务清单：搭建一个报表导出功能',
  '介绍一下 React 的并发渲染',
];

interface MessageListProps {
  messages: ChatMessage[];
  /** 正在流式输出的消息 id */
  streamingId: string | null;
  /** 已发出请求但还没收到第一个字 */
  thinking: boolean;
  status: ServiceStatus;
  error: string | null;
  onDismissError: () => void;
  onRetryStatus: () => void;
  onSampleClick: (question: string) => void;
  disabled: boolean;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingId,
  thinking,
  status,
  error,
  onDismissError,
  onRetryStatus,
  onSampleClick,
  disabled,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingId, thinking]);

  const notice = () => {
    if (error) {
      return (
        <div className="ds-notice ds-notice-error">
          <span>⚠️</span>
          <span className="ds-notice-text">{error}</span>
          <button type="button" className="ds-notice-close" onClick={onDismissError} title="关闭">
            ×
          </button>
        </div>
      );
    }
    if (status === 'unconfigured') {
      return (
        <div className="ds-notice ds-notice-warn">
          <span>🔑</span>
          <span className="ds-notice-text">
            后端未检测到模型密钥，请在 .env 中配置 DEEPSEEK_API_KEY 后重启（npm run launch）。
          </span>
        </div>
      );
    }
    if (status === 'offline') {
      return (
        <div className="ds-notice ds-notice-warn">
          <span>🔌</span>
          <span className="ds-notice-text">后端代理未连接，请启动服务后</span>
          <button type="button" className="ds-notice-link" onClick={onRetryStatus}>
            重试
          </button>
        </div>
      );
    }
    return null;
  };

  if (messages.length === 0) {
    return (
      <div className="ds-list ds-list-empty">
        {notice()}
        <div className="ds-welcome">
          <div className="ds-welcome-mark">DS</div>
          <h2 className="ds-welcome-title">你好，我是 DeepSeek 助手</h2>
          <p className="ds-welcome-sub">本页面直连 DeepSeek 模型（经本地代理转发），支持流式输出与思维链展示。</p>
          <div className="ds-samples">
            {SAMPLES.map(q => (
              <button
                key={q}
                type="button"
                className="ds-sample"
                disabled={disabled}
                onClick={() => onSampleClick(q)}
              >
                <span className="ds-sample-icon">💬</span>
                {q}
              </button>
            ))}
          </div>
        </div>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="ds-list">
      {notice()}
      {messages.map(m => (
        <MessageItem key={m.id} message={m} isStreaming={m.id === streamingId} />
      ))}
      {thinking && (
        <div className="ds-msg ds-msg-ai">
          <div className="ds-avatar">AI</div>
          <div className="ds-bubble-col">
            <div className="ds-bubble ds-bubble-ai ds-thinking">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
