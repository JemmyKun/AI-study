import React, { useEffect, useRef } from 'react';
import MessageItem, { Message } from './MessageItem';

interface MessageListProps {
  messages: Message[];
  isTypingId: string | null;
}

const SAMPLE_QUESTIONS = [
  '结算池里现在有多少条待结算单？',
  '帮我统计各状态结算单的数量和金额',
  '列出金额最高的 5 条已结算待分设的结算单',
  '打开表单设计器，新增一个手机号字段',
];

interface MessageListWithSamplesProps extends MessageListProps {
  onSampleClick?: (question: string) => void;
  /** 已发出请求、但还没有收到第一个字（工具/模型准备中） */
  thinking?: boolean;
  /** Runtime 是否已连接 */
  connected?: boolean;
  /** 生成过程中的错误提示 */
  error?: string | null;
  onDismissError?: () => void;
  /** 生成中：禁用示例问题点击 */
  disabled?: boolean;
}

const MessageList: React.FC<MessageListWithSamplesProps> = ({
  messages,
  isTypingId,
  onSampleClick,
  thinking,
  connected,
  error,
  onDismissError,
  disabled,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTypingId, thinking]);

  const renderNotice = () => {
    if (error) {
      return (
        <div className="chat-notice notice-error">
          <span className="notice-icon">⚠️</span>
          <span className="notice-text">{error}</span>
          <button className="notice-close" onClick={onDismissError} title="关闭">
            ×
          </button>
        </div>
      );
    }
    if (!connected) {
      return (
        <div className="chat-notice notice-warn">
          <span className="notice-icon">🔌</span>
          <span className="notice-text">
            尚未连接 AI 服务，请先启动本地 Runtime（npm run launch）。
          </span>
        </div>
      );
    }
    return null;
  };

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <div className="welcome-container">
          <div className="welcome-icon">✨</div>
          <h2 className="welcome-title">你好，我是 AI 助手</h2>
          <p className="welcome-subtitle">
            我已接入本系统的后台模型，可以回答问题，也能直接查询和操作业务模块：
          </p>
          <div className="sample-questions">
            {SAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                className="sample-question-btn"
                disabled={disabled}
                onClick={() => onSampleClick?.(q)}
              >
                <span className="sample-icon">💡</span>
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {renderNotice()}
      {messages.map((msg) => (
        <MessageItem
          key={msg.id}
          message={msg}
          isTyping={msg.id === isTypingId}
        />
      ))}
      {thinking && (
        <div className="message-item message-assistant">
          <div className="message-avatar">
            <div className="avatar avatar-ai">AI</div>
          </div>
          <div className="message-bubble bubble-assistant">
            <div className="thinking-dots">
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
