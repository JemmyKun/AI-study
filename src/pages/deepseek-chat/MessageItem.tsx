import React, { useState } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  CheckOutlined,
  CopyOutlined,
  DislikeOutlined,
  LikeOutlined,
  LoadingOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import FileIcon from './FileIcon';
import { formatFileSize, kindOf } from './attachments';
import { ChatMessage } from './types';

/**
 * HTML 白名单：允许模型输出内联 SVG（柱状图等）被正常渲染，
 * 其余 HTML 标签与脚本属性仍会被 rehype-sanitize 过滤，防 XSS。
 */
const SVG_TAGS = [
  'svg', 'g', 'defs', 'symbol', 'use', 'marker', 'title',
  'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
  'text', 'tspan',
];

const svgSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), ...SVG_TAGS],
  attributes: {
    ...defaultSchema.attributes,
    // 常用绘图/定位属性按标签放行
    svg: ['xmlns', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'version'],
    g: ['transform', 'fill', 'stroke', 'stroke-width', 'opacity', 'font-family', 'font-size', 'text-anchor'],
    text: ['x', 'y', 'fill', 'font-size', 'font-weight', 'font-family', 'text-anchor', 'transform', 'dominant-baseline'],
    tspan: ['x', 'y', 'dx', 'dy', 'fill', 'font-size'],
    rect: ['x', 'y', 'width', 'height', 'rx', 'ry', 'fill', 'stroke', 'stroke-width', 'opacity', 'transform'],
    circle: ['cx', 'cy', 'r', 'fill', 'stroke', 'stroke-width', 'opacity'],
    ellipse: ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke', 'stroke-width'],
    line: ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity', 'transform'],
    path: ['d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'transform'],
    polyline: ['points', 'fill', 'stroke', 'stroke-width'],
    polygon: ['points', 'fill', 'stroke', 'stroke-width'],
  },
};

/**
 * 把内容里的内联 SVG 整块提取为 data-URI 图片。
 * 直接交给 markdown 解析时，图表内部的换行/缩进/标签常被误判成代码或纯文本；
 * 转成 <img> 后完全绕过解析干扰，且 img 中的 SVG 天然沙箱化（脚本不执行）。
 * 流式输出未闭合时先按当前内容截断渲染，闭合后即为完整图。
 */
function extractSvgToImages(content: string): string {
  return content.replace(/<svg[\s\S]*?(?:<\/svg>|$)/gi, svg => {
    const encoded = encodeURIComponent(svg);
    return `\n\n![chart](data:image/svg+xml;charset=utf-8,${encoded})\n\n`;
  });
}

/**
 * URL 过滤：默认只放行 http/https 等协议，会把 SVG 图表的 data:image URI 清掉；
 * 这里额外放行图片类 data-URI（img 内 SVG 沙箱化，安全），其余仍走默认白名单。
 */
const urlTransform = (url: string) =>
  /^data:image\//i.test(url) ? url : defaultUrlTransform(url);

interface MessageItemProps {
  message: ChatMessage;
  /** 正在流式输出：显示闪烁光标 */
  isStreaming?: boolean;
  /** 仅最后一条助手消息允许重新生成 */
  canRegenerate?: boolean;
  onRegenerate?: () => void;
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
          {copied ? '已复制' : '复制'}
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

/** R1 模型的思维链：思考中显示用时跳动，完成后默认折叠 */
function ReasoningBlock({ text, active, thoughtMs }: { text: string; active: boolean; thoughtMs?: number }) {
  const [open, setOpen] = useState(false);
  const seconds = Math.max(1, Math.round((thoughtMs ?? 0) / 1000));

  return (
    <div className={`ds-reasoning ${open || active ? 'is-open' : ''}`}>
      <button type="button" className="ds-reasoning-head" onClick={() => setOpen(v => !v)}>
        {active ? <LoadingOutlined spin /> : <CheckOutlined />}
        {active ? '正在思考…' : `已思考（用时 ${seconds} 秒）`}
        <span className={`ds-reasoning-arrow ${open ? 'is-open' : ''}`}>▾</span>
      </button>
      {(open || active) && <pre className="ds-reasoning-body">{text}</pre>}
    </div>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/** 剪贴板降级写入 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      return true;
    } catch {
      return false;
    }
  }
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isStreaming,
  canRegenerate,
  onRegenerate,
}) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const copyAll = async () => {
    if (await writeClipboard(message.content)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isUser) {
    // 参考稿：用户消息右侧浅色气泡，无头像，悬停显示复制
    return (
      // 锚点 id：右侧提问记录点击定位用
      <div id={`ds-msg-${message.id}`} className="ds-msg ds-msg-user">
        <div className="ds-user-col">
          <button
            type="button"
            className="ds-user-copy"
            onClick={copyAll}
            title="复制全文"
          >
            {copied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
          <div className="ds-bubble ds-bubble-user">
            {message.content && <p className="ds-text">{message.content}</p>}
            {message.attachments && message.attachments.length > 0 && (
              <div className="ds-msg-attach">
                {message.attachments.map((a, i) => {
                  // 图片出缩略图（可点击放大），其余类型出文件卡片
                  const url = a.previewUrl ?? '';
                  return url ? (
                    <img
                      key={a.id}
                      src={url}
                      alt={`附件 ${i + 1}`}
                      onClick={() => setPreview(url)}
                    />
                  ) : (
                    <span key={a.id} className="ds-file-chip" title={a.name}>
                      <FileIcon kind={kindOf(a.mime, a.name)} />
                      <span className="ds-file-name">{a.name}</span>
                      <span className="ds-file-size">{formatFileSize(a.size)}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 点击缩略图放大查看 */}
        {preview && (
          <div className="ds-lightbox" onClick={() => setPreview(null)} title="点击关闭预览">
            <img src={preview} alt="preview" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="ds-msg ds-msg-ai">
      {message.reasoning && (
        <ReasoningBlock
          text={message.reasoning}
          active={!!isStreaming && !message.content}
          thoughtMs={message.thoughtMs}
        />
      )}

      <div className="ds-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw, [rehypeSanitize, svgSchema]]}
          urlTransform={urlTransform}
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
          {extractSvgToImages(message.content)}
        </ReactMarkdown>
        {isStreaming && <span className="ds-cursor" />}
      </div>

      {message.failed && (
        <p className="ds-failed">生成失败，请检查后端代理与密钥配置后重试。</p>
      )}

      {!isStreaming && message.content && (
        <div className="ds-actions">
          <button
            type="button"
            className={`ds-action-btn ${copied ? 'is-done' : ''}`}
            onClick={copyAll}
            title="复制全文"
          >
            {copied ? <CheckOutlined /> : <CopyOutlined />}
          </button>
          {canRegenerate && onRegenerate && (
            <button
              type="button"
              className="ds-action-btn"
              onClick={onRegenerate}
              title="重新生成最后一条回复"
            >
              <RedoOutlined />
            </button>
          )}
          <button
            type="button"
            className={`ds-action-btn ${vote === 'up' ? 'is-active' : ''}`}
            onClick={() => setVote(v => (v === 'up' ? null : 'up'))}
            title="赞"
          >
            <LikeOutlined />
          </button>
          <button
            type="button"
            className={`ds-action-btn ${vote === 'down' ? 'is-active' : ''}`}
            onClick={() => setVote(v => (v === 'down' ? null : 'down'))}
            title="踩"
          >
            <DislikeOutlined />
          </button>
          <span className="ds-time">{formatTime(message.createdAt)}</span>
        </div>
      )}
    </div>
  );
};

/**
 * 流式输出期间父组件每收到一帧都会重渲染，
 * memo 让「内容没变的消息」直接跳过重渲染——Markdown 解析 + 代码高亮的开销不小。
 * 生效前提：onRegenerate 由 useCallback 保证引用稳定，
 * 且 messages 更新时只有被改动的那条是新对象（useDeepSeekChat 就是这么更新的）。
 */
export default React.memo(MessageItem);
