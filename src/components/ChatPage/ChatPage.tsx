import React from 'react';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { useAgentChat } from './useAgentChat';
import './ChatPage.css';

const ChatPage: React.FC = () => {
  const {
    messages,
    isRunning,
    runtimeStatus,
    error,
    dismissError,
    send,
    stop,
    clear,
  } = useAgentChat();

  // 生成中：给最后一条助手消息加光标
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
  const streamingId = isRunning && lastAssistant ? lastAssistant.id : null;

  const statusText =
    runtimeStatus === 'connected'
      ? 'Runtime 已连接'
      : runtimeStatus === 'error'
      ? '连接异常'
      : '连接中…';

  return (
    <div className="chat-page">
      {/* 顶部标题栏 */}
      <header className="chat-header">
        <div className="header-left">
          <div className="header-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="header-title">AI 问答</h1>
        </div>
        <div className="header-right">
          <span
            className={`header-status ${
              runtimeStatus === 'connected' ? 'status-online' : 'status-offline'
            }`}
            title={statusText}
          >
            <span className="status-dot" />
            {statusText}
          </span>
          {messages.length > 0 && (
            <button
              className="header-clear-btn"
              onClick={clear}
              disabled={isRunning}
              title="清空当前会话"
            >
              清空会话
            </button>
          )}
          <span className="header-model-badge">CopilotKit Agent</span>
        </div>
      </header>

      {/* 消息列表 */}
      <main className="chat-main">
        <MessageList
          messages={messages}
          isTypingId={streamingId}
          thinking={isRunning && !lastAssistant}
          onSampleClick={send}
          connected={runtimeStatus !== 'error' && runtimeStatus !== 'disconnected'}
          error={error}
          onDismissError={dismissError}
          disabled={isRunning}
        />
      </main>

      {/* 底部输入区 */}
      <footer className="chat-footer">
        <InputBox
          onSend={send}
          isRunning={isRunning}
          onAbort={stop}
          disabled={runtimeStatus === 'error'}
        />
      </footer>
    </div>
  );
};

export default ChatPage;
