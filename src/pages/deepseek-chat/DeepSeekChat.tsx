import React, { useRef, useState } from 'react';
import { MessageOutlined } from '@ant-design/icons';
import { useLocale } from '../../locales';
import type { MessageKey } from '../../locales/messages/zh-CN';
import InputBox from './InputBox';
import MessageList, { ChatNotice } from './MessageList';
import { MODEL_OPTIONS } from './types';
import { useDeepSeekChat } from './useDeepSeekChat';
import './DeepSeekChat.css';

/** 空状态快捷问题：只存文案 key，展示时按语言渲染 */
const SAMPLE_KEYS: MessageKey[] = [
  'deepseek.sample.1',
  'deepseek.sample.2',
  'deepseek.sample.3',
  'deepseek.sample.4',
];

const DeepSeekChat: React.FC = () => {
  const { t } = useLocale();
  const {
    messages,
    isStreaming,
    status,
    statusText,
    health,
    model,
    setModel,
    error,
    dismissError,
    refreshStatus,
    send,
    stop,
    clear,
    regenerate,
  } = useDeepSeekChat();

  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id ?? null;
  const lastAssistant = messages.find(m => m.id === lastAssistantId);
  const streaming = isStreaming ? lastAssistantId : null;
  const thinking = isStreaming && !!lastAssistant && !lastAssistant.content && !lastAssistant.reasoning;
  const canRegenerate =
    !isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant';
  const isEmpty = messages.length === 0;

  // 滚动容器：判断是否贴近底部（自动跟随）、回到底部、当前所在提问（锚点高亮）
  const scrollRef = useRef<HTMLElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  const handleListScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);

    // 当前视口顶部落在哪个提问之后，该提问锚点高亮
    const containerTop = el.getBoundingClientRect().top;
    let current: string | null = null;
    for (const q of messages) {
      if (q.role !== 'user') continue;
      const node = document.getElementById(`ds-msg-${q.id}`);
      if (node && node.getBoundingClientRect().top - containerTop <= 140) current = q.id;
    }
    setActiveQuestionId(current);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  // 右侧提问记录：所有用户提问，点击滚动定位到对应消息
  const questions = messages.filter(m => m.role === 'user');
  const locateQuestion = (id: string) => {
    document.getElementById(`ds-msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // 模型选项以服务端白名单为准，防止本地常量与服务端不一致
  const models = MODEL_OPTIONS.filter(
    o => !health?.allowedModels?.length || health.allowedModels.includes(o.value),
  );

  /** 新提问：无论此前是否回看历史，都强制跟随到最新内容 */
  const handleSend = (text: string, images?: string[]) => {
    setAtBottom(true);
    send(text, images);
  };

  const inputProps = {
    onSend: handleSend,
    isStreaming,
    onStop: stop,
    status,
    models,
    model,
    onModelChange: setModel,
  };

  return (
    <div className="ds-page">
      {isEmpty ? (
        // 参考稿首页式布局：公告条 + 大标题 + 居中输入卡片 + 快捷入口
        <div className="ds-hero">
          <ChatNotice
            status={status}
            error={error}
            onDismissError={dismissError}
            onRetryStatus={refreshStatus}
          />
          <p className="ds-announce">{t('deepseek.announce')}</p>
          <h1 className="ds-hero-title">{t('deepseek.hero.title')}</h1>
          <InputBox {...inputProps} />
          <div className="ds-quick">
            {SAMPLE_KEYS.map(key => {
              const question = t(key);
              return (
                <button
                  key={key}
                  type="button"
                  className="ds-quick-pill"
                  disabled={isStreaming}
                  onClick={() => send(question)}
                >
                  <MessageOutlined className="ds-quick-icon" />
                  {question}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <main className="ds-main" ref={scrollRef} onScroll={handleListScroll}>
            <MessageList
              messages={messages}
              streamingId={streaming}
              thinking={thinking}
              canRegenerate={canRegenerate}
              onRegenerate={regenerate}
              atBottom={atBottom}
              onScrollToBottom={scrollToBottom}
            />
          </main>

          {/* 右侧提问记录：悬浮胶囊，点击定位到提问位置 */}
          {questions.length > 0 && (
            <nav className="ds-outline" aria-label={t('deepseek.outline')}>
              {questions.map(q => (
                <button
                  key={q.id}
                  type="button"
                  className={`ds-outline-item ${q.id === activeQuestionId ? 'is-active' : ''}`}
                  title={q.content}
                  onClick={() => locateQuestion(q.id)}
                >
                  <span className="ds-outline-text">{q.content}</span>
                  <span className="ds-outline-dot" aria-hidden />
                </button>
              ))}
            </nav>
          )}

          {/* 会话控件下沉到输入区上方：状态灯 + 清空；重新生成在消息操作行 */}
          <div className="ds-toolbar">
            <span
              className={`ds-status ds-status-${status}`}
              title={t('deepseek.statusTip', { status: statusText })}
            >
              <span className="ds-dot" />
              {statusText}
            </span>
            <button
              type="button"
              className="ds-tool-btn"
              onClick={clear}
              disabled={isStreaming}
              title={t('deepseek.clearTip')}
            >
              {t('deepseek.clear')}
            </button>
          </div>

          <ChatNotice
            status={status}
            error={error}
            onDismissError={dismissError}
            onRetryStatus={refreshStatus}
          />

          <InputBox {...inputProps} />
        </>
      )}
    </div>
  );
};

export default DeepSeekChat;
