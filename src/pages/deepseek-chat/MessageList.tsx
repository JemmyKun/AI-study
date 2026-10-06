import React, { useEffect, useRef } from 'react';
import { DownOutlined } from '@ant-design/icons';
import { useLocale } from '../../locales';
import MessageItem from './MessageItem';
import { ChatMessage, ServiceStatus } from './types';

/** 服务提示条：错误 / 未配置 / 未连接（空状态与对话态共用） */
export const ChatNotice: React.FC<{
  status: ServiceStatus;
  error: string | null;
  onDismissError: () => void;
  onRetryStatus: () => void;
}> = ({ status, error, onDismissError, onRetryStatus }) => {
  const { t } = useLocale();

  if (error) {
    return (
      <div className="ds-notice ds-notice-error">
        <span className="ds-notice-icon">⚠</span>
        <span className="ds-notice-text">{error}</span>
        <button
          type="button"
          className="ds-notice-close"
          onClick={onDismissError}
          title={t('deepseek.notice.close')}
        >
          ×
        </button>
      </div>
    );
  }
  if (status === 'unconfigured') {
    return (
      <div className="ds-notice ds-notice-warn">
        <span className="ds-notice-icon">🔑</span>
        <span className="ds-notice-text">{t('deepseek.notice.unconfigured')}</span>
      </div>
    );
  }
  if (status === 'offline') {
    return (
      <div className="ds-notice ds-notice-warn">
        <span className="ds-notice-icon">🔌</span>
        <span className="ds-notice-text">{t('deepseek.notice.offline')}</span>
        <button type="button" className="ds-notice-link" onClick={onRetryStatus}>
          {t('common.retry')}
        </button>
      </div>
    );
  }
  return null;
};

interface MessageListProps {
  messages: ChatMessage[];
  /** 正在流式输出的消息 id */
  streamingId: string | null;
  /** 已发出请求但还没收到第一个字 */
  thinking: boolean;
  /** 是否允许对最后一条回复重新生成 */
  canRegenerate: boolean;
  onRegenerate: () => void;
  /** 滚动容器是否贴近底部：贴近时才自动跟随新内容，回看历史不被打断 */
  atBottom: boolean;
  onScrollToBottom: () => void;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  streamingId,
  thinking,
  canRegenerate,
  onRegenerate,
  atBottom,
  onScrollToBottom,
}) => {
  const { t } = useLocale();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!atBottom) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, streamingId, thinking, atBottom]);

  return (
    <div className="ds-list">
      {messages.map(m => (
        <MessageItem
          key={m.id}
          message={m}
          isStreaming={m.id === streamingId}
          canRegenerate={canRegenerate && m.id === messages[messages.length - 1]?.id}
          onRegenerate={onRegenerate}
        />
      ))}
      {thinking && (
        <div className="ds-msg ds-msg-ai">
          <div className="ds-thinking">
            <span />
            <span />
            <span />
          </div>
        </div>
      )}
      {/* 离开底部时显示"回到底部"悬浮按钮：sticky 定位不占布局空间 */}
      {!atBottom && (
        <div className="ds-to-bottom-wrap">
          <button
            type="button"
            className="ds-to-bottom"
            onClick={onScrollToBottom}
            title={t('deepseek.toBottom')}
          >
            <DownOutlined />
          </button>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
};

export default MessageList;
