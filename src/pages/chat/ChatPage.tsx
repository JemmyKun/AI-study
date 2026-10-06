import React from 'react';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { useAgentChat } from './useAgentChat';
import './ChatPage.css';

/** Runtime 连接状态文案 */
const STATUS_TEXT: Record<string, string> = {
  connected: 'Runtime 已连接',
  error: '连接异常',
};

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

  const statusText = STATUS_TEXT[runtimeStatus] ?? '连接中…';

  return (
    <div className="chat-page">
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

      {/* 会话工具条：控件下沉到输入区上方，顶部导航只保留 AppNav 一条 */}
      <div className="chat-toolbar">
        <span
          className={`header-status ${
            runtimeStatus === 'connected' ? 'status-online' : 'status-offline'
          }`}
          title={statusText}
        >
          <span className="status-dot" />
          {statusText}
        </span>
        <span className="header-model-badge">CopilotKit Agent</span>
        {messages.length > 0 && (
          <button className="header-clear-btn" onClick={clear} disabled={isRunning} title="清空当前会话">
            清空会话
          </button>
        )}
      </div>

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
