import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface MessageItemProps {
  message: Message;
  isTyping?: boolean;
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = React.useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const code = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{match ? match[1] : 'code'}</span>
        <button className="code-block-copy" onClick={handleCopy}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match ? match[1] : 'text'}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          padding: '12px 16px',
          fontSize: '0.875rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isTyping }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`message-item ${isUser ? 'message-user' : 'message-assistant'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="avatar avatar-user">你</div>
        ) : (
          <div className="avatar avatar-ai">AI</div>
        )}
      </div>
      <div className={`message-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
        {isUser ? (
          <p className="message-text">{message.content}</p>
        ) : (
          <div className="message-markdown">
            <ReactMarkdown
              components={{
                code({ className, children, ...rest }) {
                  const hasLang = /language-(\w+)/.exec(className || '');
                  if (hasLang) {
                    return (
                      <CodeBlock className={className}>
                        {children}
                      </CodeBlock>
                    );
                  }
                  return (
                    <code className={className} {...rest}>
                      {children}
                    </code>
                  );
                },
                pre({ children }) {
                  return <>{children}</>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isTyping && <span className="typing-cursor">|</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
