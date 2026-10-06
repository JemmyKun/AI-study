import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { enUS, zhCN } from './messages';
import type { LocaleCode, LocaleContextValue, MessageVars } from './types';
import { applyDayjsLocale } from './dayjs';

export type { LocaleCode, MessageVars, LocaleContextValue, Translate } from './types';
export type { MessageKey } from './messages';
export { ANTD_LOCALES } from './antd';
export { applyDayjsLocale } from './dayjs';

const DICTIONARIES: Record<LocaleCode, Record<string, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

export const AVAILABLE_LOCALES: LocaleCode[] = ['zh-CN', 'en-US'];

const STORAGE_KEY = 'app.locale';
const DEFAULT_LOCALE: LocaleCode = 'zh-CN';

/** 读取持久化语言，非法值回落默认语言 */
function readStoredLocale(): LocaleCode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && AVAILABLE_LOCALES.includes(stored as LocaleCode)) {
      return stored as LocaleCode;
    }
  } catch {
    /* 隐私模式下 localStorage 可能不可用，忽略即可 */
  }
  return DEFAULT_LOCALE;
}

/** 简单插值：把 {name} 替换为 vars.name */
function interpolate(template: string, vars?: MessageVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (raw, key: string) =>
    key in vars ? String(vars[key]) : raw,
  );
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * 语言环境的唯一提供者：业务文案 + antd 组件文案由它统一驱动。
 * 组件内通过 useLocale() 获取 t，不要再自己判断语言。
 */
export const LocaleProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  // 首屏渲染前先同步日期库语言，避免日期面板出现中英混排
  const [locale, setLocaleState] = useState<LocaleCode>(() => {
    const initial = readStoredLocale();
    applyDayjsLocale(initial);
    return initial;
  });

  // 切换语言时同步日期库语言（ConfigProvider 只管组件文案，管不到 dayjs）
  useEffect(() => {
    applyDayjsLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: LocaleCode) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 忽略持久化失败，内存中已切换 */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = DICTIONARIES[locale];
    return {
      locale,
      setLocale,
      availableLocales: AVAILABLE_LOCALES,
      t: (key, vars) => interpolate(dict[key] ?? DICTIONARIES[DEFAULT_LOCALE][key] ?? key, vars),
    };
  }, [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

/** 获取语言与翻译函数 */
export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale 必须在 <LocaleProvider> 内部使用');
  return ctx;
}
