import React, { useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';

interface InputBoxProps {
  onSend: (message: string) => void;
  /** 是否正在生成回答 */
  isRunning: boolean;
  onAbort: () => void;
  /** Runtime 未连接时禁用输入 */
  disabled?: boolean;
}

const InputBox: React.FC<InputBoxProps> = ({ onSend, isRunning, onAbort, disabled }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  useEffect(() => {
    adjustHeight();
  }, []);

  const resetInput = () => {
    if (textareaRef.current) {
      textareaRef.current.value = '';
      adjustHeight();
    }
  };

  const submit = () => {
    const value = textareaRef.current?.value.trim();
    if (!value || isRunning || disabled) return;
    onSend(value);
    resetInput();
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className={`input-box-container ${disabled ? 'is-disabled' : ''}`}>
      <div className="input-box-wrapper">
        <textarea
          ref={textareaRef}
          className="input-textarea"
          placeholder={
            disabled
              ? 'AI 服务未连接，请先启动 Runtime…'
              : '输入你的问题...（Enter 发送，Shift+Enter 换行）'
          }
          rows={1}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <div className="input-actions">
          {isRunning ? (
            <button className="btn-stop" onClick={onAbort} title="停止生成">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="3" width="10" height="10" rx="2" />
              </svg>
              <span>停止</span>
            </button>
          ) : (
            <button
              className="btn-send"
              onClick={submit}
              disabled={disabled}
              title={disabled ? 'AI 服务未连接' : '发送'}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <p className="input-footer-hint">由真实大模型生成，内容可能存在错误，仅供参考。</p>
    </div>
  );
};

export default InputBox;
