import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChatMessage } from './types';

interface MessageItemProps {
  message: ChatMessage;
  /** 正在流式输出：显示闪烁光标 */
  isStreaming?: boolean;
}

function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || '')?.[1];
  const code = String(children).replace(/\n$/, '');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement('textarea');
      area.value = code;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="ds-code">
      <div className="ds-code-bar">
        <span className="ds-code-lang">{lang || 'code'}</span>
        <button type="button" className="ds-code-copy" onClick={copy}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={lang || 'text'}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, padding: '12px 16px', fontSize: '0.875rem' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/** R1 模型的思维链，默认折叠，避免抢占正文视线 */
function ReasoningBlock({ text, active }: { text: string; active: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`ds-reasoning ${open || active ? 'is-open' : ''}`}>
      <button type="button" className="ds-reasoning-head" onClick={() => setOpen(v => !v)}>
        <span className="ds-reasoning-arrow">{open || active ? '▾' : '▸'}</span>
        {active ? '正在思考…' : '思考过程'}
      </button>
      {(open || active) && <pre className="ds-reasoning-body">{text}</pre>}
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isStreaming }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 剪贴板不可用，忽略 */
    }
  };

  return (
    <div className={`ds-msg ${isUser ? 'ds-msg-user' : 'ds-msg-ai'}`}>
      <div className="ds-avatar">{isUser ? '你' : 'AI'}</div>
      <div className="ds-bubble-col">
        <div className={`ds-bubble ${isUser ? 'ds-bubble-user' : 'ds-bubble-ai'}`}>
          {message.reasoning && (
            <ReasoningBlock text={message.reasoning} active={!!isStreaming && !message.content} />
          )}

          {isUser ? (
            <p className="ds-text">{message.content}</p>
          ) : (
            <div className="ds-md">
              <ReactMarkdown
                components={{
                  code({ className, children, ...rest }) {
                    const hasLang = /language-(\w+)/.exec(className || '');
                    return hasLang ? (
                      <CodeBlock className={className}>{children}</CodeBlock>
                    ) : (
                      <code className={className} {...rest}>{children}</code>
                    );
                  },
                  pre({ children }) {
                    return <>{children}</>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="ds-cursor" />}
            </div>
          )}

          {message.failed && (
            <p className="ds-failed">生成失败，请检查后端代理与密钥配置后重试。</p>
          )}
        </div>

        <div className="ds-meta">
          {!isUser && !isStreaming && message.content && (
            <button type="button" className="ds-meta-btn" onClick={copyAll}>
              {copied ? '已复制' : '复制'}
            </button>
          )}
          {!isStreaming && <span className="ds-time">{formatTime(message.createdAt)}</span>}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
