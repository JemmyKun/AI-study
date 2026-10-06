import React from 'react';
import { ServiceStatus } from './types';

interface InputBoxProps {
  onSend: (text: string) => void;
  /** 是否正在生成 */
  isStreaming: boolean;
  onStop: () => void;
  onClear: () => void;
  canClear: boolean;
  status: ServiceStatus;
}

const InputBox: React.FC<InputBoxProps> = ({
  onSend,
  isStreaming,
  onStop,
  onClear,
  canClear,
  status,
}) => {
  const [value, setValue] = React.useState('');
  const ref = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || isStreaming) return;
    onSend(text);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter 发送，Shift+Enter 换行；输入法组合期间不发送
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="ds-footer">
      <div className="ds-input-wrap">
        <textarea
          ref={ref}
          className="ds-textarea"
          rows={1}
          value={value}
          placeholder="给 DeepSeek 发送消息…（Enter 发送，Shift+Enter 换行）"
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="ds-input-actions">
          {canClear && !isStreaming && (
            <button type="button" className="ds-btn ds-btn-ghost" onClick={onClear} title="清空会话">
              清空
            </button>
          )}
          {isStreaming ? (
            <button type="button" className="ds-btn ds-btn-stop" onClick={onStop} title="停止生成">
              <span className="ds-stop-icon" />
              停止
            </button>
          ) : (
            <button
              type="button"
              className="ds-btn ds-btn-send"
              onClick={submit}
              disabled={!value.trim()}
              title="发送"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="ds-hint">
        {status === 'unconfigured'
          ? '后端尚未配置模型密钥，AI 无法回复'
          : status === 'offline'
          ? '后端代理未启动，请先执行 npm run launch'
          : '内容由 DeepSeek 生成，可能存在错误，请酌情参考'}
      </p>
    </div>
  );
};

export default InputBox;
