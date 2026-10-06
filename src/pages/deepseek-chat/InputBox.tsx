import React from 'react';
import { ArrowUpOutlined, PaperClipOutlined, StopOutlined } from '@ant-design/icons';
import { createId } from '../../utils';
import FileIcon from './FileIcon';
import {
  formatFileSize,
  isImage,
  isReadableText,
  kindOf,
  readFileAsDataUrl,
  readFileAsText,
} from './attachments';
import {
  Attachment,
  MAX_FILES,
  MAX_FILE_SIZE,
  MAX_PREVIEW_SIZE,
  ModelOption,
  ServiceStatus,
} from './types';

/** 服务状态 → 输入框提示文案 */
const HINTS: Partial<Record<ServiceStatus, string>> = {
  unconfigured: '后端尚未配置模型密钥，AI 无法回复',
  offline: '后端代理未启动，请先执行 npm run launch',
};
/** 服务正常时的默认提示 */
const DEFAULT_HINT = '内容由 DeepSeek 生成，可能存在错误，请酌情参考';

/** 模型胶囊文案（对应参考稿的"深度思考"开关）；未覆盖的模型回退用模型名 */
const MODEL_PILLS: Record<string, string> = {
  'deepseek-chat': 'V3 对话',
  'deepseek-reasoner': '深度思考',
};

interface InputBoxProps {
  onSend: (text: string, attachments?: Attachment[]) => void;
  /** 是否正在生成 */
  isStreaming: boolean;
  onStop: () => void;
  status: ServiceStatus;
  /** 可选模型（已按服务端白名单过滤） */
  models: ModelOption[];
  /** 当前模型与切换（胶囊按钮组，替代原下拉框） */
  model: string;
  onModelChange: (model: string) => void;
}

const InputBox: React.FC<InputBoxProps> = ({
  onSend,
  isStreaming,
  onStop,
  status,
  models,
  model,
  onModelChange,
}) => {
  const [value, setValue] = React.useState('');
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [notice, setNotice] = React.useState<string | null>(null);
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const noticeTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  React.useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    [],
  );

  const flash = (msg: string) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2600);
  };

  const append = (item: Attachment) =>
    setAttachments(prev => (prev.length >= MAX_FILES ? prev : [...prev, item]));

  const patch = (id: string, changes: Partial<Attachment>) =>
    setAttachments(prev => prev.map(a => (a.id === id ? { ...a, ...changes } : a)));

  /**
   * 单个文件入列：
   * - 图片读 dataURL 出缩略图
   * - 可读文本文件读内容（随后随消息一起送给模型）
   * - 其余文件只登记名称与体积，仅随消息展示
   */
  const ingest = (file: File) => {
    const id = createId('file');
    const base: Attachment = { id, name: file.name, size: file.size, mime: file.type || '' };

    if (isImage(base.mime, file.name)) {
      // 大图不转 dataURL，降级为文件卡片，避免内存被撑爆
      if (file.size > MAX_PREVIEW_SIZE) {
        append(base);
        return;
      }
      void readFileAsDataUrl(file)
        .then(previewUrl => append({ ...base, previewUrl }))
        .catch(() => append(base));
      return;
    }

    if (isReadableText(file)) {
      append({ ...base, reading: true });
      void readFileAsText(file)
        .then(({ text, truncated }) => patch(id, { text, truncated, reading: false }))
        .catch(() => patch(id, { reading: false }));
      return;
    }

    append(base);
  };

  /** 受数量与体积限制地加入一批文件 */
  const addFiles = (files: File[]) => {
    if (files.length === 0) return;

    const room = MAX_FILES - attachments.length;
    const limitTip = `最多 ${MAX_FILES} 个文件`;
    if (room <= 0) {
      flash(limitTip);
      return;
    }

    if (files.length > room) flash(limitTip);

    const picked = files.slice(0, room);
    if (picked.some(f => f.size > MAX_FILE_SIZE)) {
      flash(`单个文件不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    picked.filter(f => f.size <= MAX_FILE_SIZE).forEach(ingest);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length === 0) return;
    // 粘贴文件时阻止浏览器插入文件名等无意义文本
    e.preventDefault();
    addFiles(files);
  };

  /** 仍有文件在读取：发送前必须等它读完，否则内容会缺失 */
  const reading = attachments.some(a => a.reading);

  const submit = () => {
    const text = value.trim();
    if (reading || isStreaming) return;
    if (!text && attachments.length === 0) return;

    onSend(text, attachments.length ? attachments : undefined);
    setValue('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行；输入法组合期间不发送
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const hint = HINTS[status] ?? DEFAULT_HINT;
  const canSend = (!!value.trim() || attachments.length > 0) && !reading && !isStreaming;
  const uploadTip = `上传文件，支持各类文档和图片 最多 ${MAX_FILES} 个，每个 ${
    MAX_FILE_SIZE / 1024 / 1024
  }MB`;

  return (
    <div className="ds-footer">
      <div className="ds-input-card">
        {attachments.length > 0 && (
          <div className="ds-attach">
            {attachments.map(a => (
              <div
                key={a.id}
                className={`ds-attach-item ${a.previewUrl ? 'is-image' : 'is-file'}`}
              >
                {a.previewUrl ? (
                  <img src={a.previewUrl} alt={a.name} />
                ) : (
                  <span className="ds-file-card">
                    <span className="ds-file-icon">
                      <FileIcon kind={kindOf(a.mime, a.name)} />
                    </span>
                    <span className="ds-file-meta">
                      <span className="ds-file-name">{a.name}</span>
                      <span className="ds-file-sub">
                        {a.reading ? '读取中…' : formatFileSize(a.size)}
                      </span>
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  className="ds-attach-remove"
                  title="移除"
                  onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={ref}
          className="ds-textarea"
          rows={1}
          value={value}
          placeholder="给 DeepSeek 发送消息…"
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <div className="ds-input-bar">
          <div className="ds-input-bar-left">
            <div className="ds-pills">
              {models.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`ds-pill ${model === o.value ? 'is-active' : ''}`}
                  onClick={() => onModelChange(o.value)}
                  title={o.hint}
                  disabled={isStreaming}
                >
                  {MODEL_PILLS[o.value] ?? o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ds-input-actions">
            <button
              type="button"
              className="ds-attach-btn"
              title={uploadTip}
              aria-label="添加文件"
              disabled={isStreaming || attachments.length >= MAX_FILES}
              onClick={() => fileRef.current?.click()}
            >
              <PaperClipOutlined />
            </button>
            {isStreaming ? (
              <button
                type="button"
                className="ds-round-btn ds-round-stop"
                onClick={onStop}
                title="停止生成"
              >
                <StopOutlined />
              </button>
            ) : (
              <button
                type="button"
                className="ds-round-btn ds-round-send"
                onClick={submit}
                disabled={!canSend}
                title="发送"
              >
                <ArrowUpOutlined />
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={e => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>

      {notice && <p className="ds-hint ds-hint-warn">{notice}</p>}
      {!notice && attachments.length > 0 && (
        <p className="ds-hint">文本类文件会随消息发送给模型；图片与其他文件仅随消息展示</p>
      )}
      {!notice && attachments.length === 0 && <p className="ds-hint">{hint}</p>}
    </div>
  );
};

export default InputBox;
