import React from 'react';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { useDeepSeekChat } from './useDeepSeekChat';
import { MODEL_OPTIONS } from './types';
import './DeepSeekChat.css';

const DeepSeekChat: React.FC = () => {
  const {
    messages,
    isStreaming,
    status,
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

  // 最后一条助手消息 + 尚未吐字 => 显示思考气泡
  const lastAssistantId = [...messages].reverse().find(m => m.role === 'assistant')?.id ?? null;
  const lastAssistant = messages.find(m => m.id === lastAssistantId);
  const streaming = isStreaming ? lastAssistantId : null;
  const thinking = isStreaming && !!lastAssistant && !lastAssistant.content && !lastAssistant.reasoning;
  const canRegenerate =
    !isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'assistant';

  const statusText =
    status === 'ready'
      ? '已就绪'
      : status === 'checking'
      ? '检测中…'
      : status === 'unconfigured'
      ? '未配置密钥'
      : '未连接';

  // 模型选项以服务端白名单为准，防止本地常量与服务端不一致
  const options = MODEL_OPTIONS.filter(
    o => !health?.allowedModels?.length || health.allowedModels.includes(o.value),
  );

  return (
    <div className="ds-page">
      <header className="ds-header">
        <div className="ds-header-left">
          <div className="ds-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-4.5 0-8 2.6-8 6.4 0 4.2 3.6 6.4 6.2 8.3C11.4 17.8 12 18.6 12 20c0-1.4.6-2.2 1.8-3.3 2.6-1.9 6.2-4.1 6.2-8.3C20 4.6 16.5 2 12 2z" />
            </svg>
          </div>
          <h1 className="ds-title">DeepSeek 对话</h1>
          <span className="ds-subtitle">直连模型 · 无 CopilotKit 依赖</span>
        </div>

        <div className="ds-header-right">
          <span className={`ds-status ds-status-${status}`} title={`服务状态：${statusText}`}>
            <span className="ds-dot" />
            {statusText}
          </span>
          <select
            className="ds-model-select"
            value={model}
            onChange={e => setModel(e.target.value)}
            title="选择模型"
          >
            {options.map(o => (
              <option key={o.value} value={o.value}>
                {o.label} · {o.hint}
              </option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              type="button"
              className="ds-header-btn"
              onClick={regenerate}
              disabled={!canRegenerate}
              title="重新生成最后一条回复"
            >
              重新生成
            </button>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              className="ds-header-btn"
              onClick={clear}
              disabled={isStreaming}
              title="清空会话"
            >
              清空会话
            </button>
          )}
        </div>
      </header>

      <main className="ds-main">
        <MessageList
          messages={messages}
          streamingId={streaming}
          thinking={thinking}
          status={status}
          error={error}
          onDismissError={dismissError}
          onRetryStatus={refreshStatus}
          onSampleClick={send}
          disabled={isStreaming}
        />
      </main>

      <InputBox
        onSend={send}
        isStreaming={isStreaming}
        onStop={stop}
        onClear={clear}
        canClear={messages.length > 0}
        status={status}
      />
    </div>
  );
};

export default DeepSeekChat;
