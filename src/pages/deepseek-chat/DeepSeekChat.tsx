import React, { useRef, useState } from 'react';
import { MessageOutlined } from '@ant-design/icons';
import InputBox from './InputBox';
import MessageList, { ChatNotice } from './MessageList';
import { Attachment, MODEL_OPTIONS } from './types';
import { useDeepSeekChat } from './useDeepSeekChat';
import './DeepSeekChat.css';

/** 空状态快捷问题 */
const SAMPLE_QUESTIONS = [
  '用一句话解释什么是 HTTP 缓存',
  '帮我写一个 TypeScript 防抖函数，并说明用法',
  '把下面这段需求拆成任务清单：搭建一个报表导出功能',
  '介绍一下 React 的并发渲染',
];

const DeepSeekChat: React.FC = () => {
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

  // 标题圆形滤镜：只写 CSS 变量，避免每次 mousemove 都触发 React 重渲染
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lensRef = useRef<HTMLSpanElement>(null);

  const handleTitleMove = (e: React.MouseEvent<HTMLHeadingElement>) => {
    const title = titleRef.current;
    const lens = lensRef.current;
    if (!title || !lens) return;
    const rect = title.getBoundingClientRect();
    lens.style.setProperty('--lens-x', `${e.clientX - rect.left}px`);
    lens.style.setProperty('--lens-y', `${e.clientY - rect.top}px`);
  };

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
  const handleSend = (text: string, attachments?: Attachment[]) => {
    setAtBottom(true);
    send(text, attachments);
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
          <p className="ds-announce">
            全新升级：支持流式输出与 R1 深度思考（思维链），欢迎体验并反馈 →
          </p>
          <h1
            className="ds-hero-title"
            ref={titleRef}
            onMouseEnter={handleTitleMove}
            onMouseMove={handleTitleMove}
          >
            探索未至之境
            {/* 圆形滤镜：整圆跟随指针，圆内反色突出当前汉字（纯装饰，对读屏隐藏） */}
            <span className="ds-hero-magnifier" ref={lensRef} aria-hidden>
              <span className="ds-hero-lens-text">探索未至之境</span>
            </span>
          </h1>
          <InputBox {...inputProps} />
          <div className="ds-quick">
            {SAMPLE_QUESTIONS.map(question => (
              <button
                key={question}
                type="button"
                className="ds-quick-pill"
                disabled={isStreaming}
                onClick={() => send(question)}
              >
                <MessageOutlined className="ds-quick-icon" />
                {question}
              </button>
            ))}
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
            <nav className="ds-outline" aria-label="提问记录">
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
              title={`服务状态：${statusText}`}
            >
              <span className="ds-dot" />
              {statusText}
            </span>
            <button
              type="button"
              className="ds-tool-btn"
              onClick={clear}
              disabled={isStreaming}
              title="清空全部对话内容"
            >
              清空会话
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
