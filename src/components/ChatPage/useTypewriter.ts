import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTypewriterOptions {
  speed?: number;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayedText: string;
  isTyping: boolean;
  start: (text: string) => void;
  abort: () => void;
}

export function useTypewriter(
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { speed = 40, onComplete } = options;

  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);
  const textRef = useRef('');
  const abortedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const typeNext = useCallback(() => {
    if (abortedRef.current) return;

    if (indexRef.current < textRef.current.length) {
      indexRef.current += 1;
      setDisplayedText(textRef.current.slice(0, indexRef.current));

      // 根据字符类型动态调整速度：标点符号后稍作停顿
      const char = textRef.current[indexRef.current - 1];
      let delay = speed;
      if ('。！？\n'.includes(char)) {
        delay = speed * 3;
      } else if ('，、；：'.includes(char)) {
        delay = speed * 2;
      }

      timerRef.current = setTimeout(typeNext, delay);
    } else {
      setIsTyping(false);
      onCompleteRef.current?.();
    }
  }, [speed]);

  const start = useCallback(
    (text: string) => {
      clearTimer();
      textRef.current = text;
      indexRef.current = 0;
      abortedRef.current = false;
      setDisplayedText('');
      setIsTyping(true);

      timerRef.current = setTimeout(typeNext, speed);
    },
    [clearTimer, typeNext, speed]
  );

  const abort = useCallback(() => {
    abortedRef.current = true;
    clearTimer();
    // 立即显示完整文本
    setDisplayedText(textRef.current);
    setIsTyping(false);
  }, [clearTimer]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return { displayedText, isTyping, start, abort };
}
