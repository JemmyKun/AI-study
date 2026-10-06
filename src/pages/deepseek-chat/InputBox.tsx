import React from 'react';
import { ArrowUpOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons';
import { useLocale } from '../../locales';
import { MAX_IMAGES, MAX_IMAGE_SIZE, ModelOption, ServiceStatus } from './types';

/** 服务状态 → 输入框提示文案 */
const HINT_KEYS: Partial<Record<ServiceStatus, 'deepseek.input.hint.unconfigured' | 'deepseek.input.hint.offline'>> = {
  unconfigured: 'deepseek.input.hint.unconfigured',
  offline: 'deepseek.input.hint.offline',
};

/** 模型胶囊：value → 文案 key（对应参考稿的"深度思考"开关） */
const MODEL_PILL_KEYS = {
  'deepseek-chat': 'deepseek.pill.chat',
  'deepseek-reasoner': 'deepseek.pill.reasoner',
} as const;

interface Attachment {
  id: string;
  /** dataURL：不上传服务端，仅本地预览与随消息展示 */
  url: string;
  name: string;
}

interface InputBoxProps {
  onSend: (text: string, images?: string[]) => void;
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
  const { t } = useLocale();
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

  /** 读取图片文件为 dataURL 并加入附件列表（受数量与体积限制） */
  const addImages = (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'));
    if (!images.length) return;

    const room = MAX_IMAGES - attachments.length;
    if (room <= 0) {
      flash(t('deepseek.attach.limit', { max: String(MAX_IMAGES) }));
      return;
    }

    const withinRoom = images.slice(0, room);
    const oversize = withinRoom.some(f => f.size > MAX_IMAGE_SIZE);
    if (oversize) flash(t('deepseek.attach.tooLarge', { size: '5' }));
    if (images.length > room) flash(t('deepseek.attach.limit', { max: String(MAX_IMAGES) }));

    const picked = withinRoom.filter(f => f.size <= MAX_IMAGE_SIZE);
    picked.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev =>
          prev.length >= MAX_IMAGES
            ? prev
            : [...prev, { id: `${Date.now()}-${Math.random()}`, url: String(reader.result), name: f.name }],
        );
      };
      reader.readAsDataURL(f);
    });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData?.files;
    if (files?.length) {
      // 截图/复制图片粘贴时直接作为附件，避免插入无意义的文件名文本
      const hasImage = Array.from(files).some(f => f.type.startsWith('image/'));
      if (hasImage) {
        e.preventDefault();
        addImages(Array.from(files));
      }
    }
  };

  const submit = () => {
    const text = value.trim();
    if ((!text && !attachments.length) || isStreaming) return;
    onSend(text, attachments.map(a => a.url));
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

  const hint = t(HINT_KEYS[status] ?? 'deepseek.input.hint.normal');
  const canSend = !!value.trim() || attachments.length > 0;

  return (
    <div className="ds-footer">
      <div className="ds-input-card">
        {attachments.length > 0 && (
          <div className="ds-attach">
            {attachments.map(a => (
              <div key={a.id} className="ds-attach-item">
                <img src={a.url} alt={a.name} />
                <button
                  type="button"
                  className="ds-attach-remove"
                  title={t('deepseek.attach.remove')}
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
          placeholder={t('deepseek.input.placeholder')}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
        <div className="ds-input-bar">
          <div className="ds-input-bar-left">
            <button
              type="button"
              className="ds-attach-btn"
              title={t('deepseek.attach.add')}
              disabled={isStreaming || attachments.length >= MAX_IMAGES}
              onClick={() => fileRef.current?.click()}
            >
              <PlusOutlined />
            </button>
            <div className="ds-pills">
              {models.map(o => (
                <button
                  key={o.value}
                  type="button"
                  className={`ds-pill ${model === o.value ? 'is-active' : ''}`}
                  onClick={() => onModelChange(o.value)}
                  title={t(o.hintKey)}
                  disabled={isStreaming}
                >
                  {t(MODEL_PILL_KEYS[o.value as keyof typeof MODEL_PILL_KEYS] ?? o.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div className="ds-input-actions">
            {isStreaming ? (
              <button
                type="button"
                className="ds-round-btn ds-round-stop"
                onClick={onStop}
                title={t('deepseek.input.stopTip')}
              >
                <StopOutlined />
              </button>
            ) : (
              <button
                type="button"
                className="ds-round-btn ds-round-send"
                onClick={submit}
                disabled={!canSend}
                title={t('deepseek.input.send')}
              >
                <ArrowUpOutlined />
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={e => {
            addImages(Array.from(e.target.files ?? []));
            e.target.value = '';
          }}
        />
      </div>

      {notice && <p className="ds-hint ds-hint-warn">{notice}</p>}
      {attachments.length > 0 && !notice && <p className="ds-hint">{t('deepseek.attach.tip')}</p>}
      {!notice && attachments.length === 0 && <p className="ds-hint">{hint}</p>}
    </div>
  );
};

export default InputBox;
