/** 支持的语言；新增语言需同步 locales/messages 与 locales/antd.ts */
export type LocaleCode = 'zh-CN' | 'en-US';

/** 文案插值变量 */
export type MessageVars = Record<string, string | number>;

/** 翻译函数：key 来自 zh-CN 字典（源语言），保证类型安全 */
export type Translate = (key: MessageKeyLike, vars?: MessageVars) => string;

/**
 * 由 zh-CN 字典推导出的 key 联合类型。
 * 这里用 string 兜底，避免字典与调用点在重构期互相阻塞；
 * 字典定义在 ./messages/zh-CN，调用点建议只使用它已声明的 key。
 */
export type MessageKeyLike = string;

export interface LocaleContextValue {
  locale: LocaleCode;
  setLocale: (next: LocaleCode) => void;
  t: Translate;
  availableLocales: LocaleCode[];
}
