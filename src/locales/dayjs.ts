import dayjs from 'dayjs';
import enLocale from 'dayjs/locale/en';
import zhCnLocale from 'dayjs/locale/zh-cn';
import type { LocaleCode } from './types';

/** 业务语言码 → dayjs 语言包对象 */
const DAYJS_LOCALES: Record<LocaleCode, typeof zhCnLocale> = {
  'zh-CN': zhCnLocale,
  'en-US': enLocale,
};

/**
 * 同步 dayjs 全局语言。
 *
 * 两个关键点：
 * 1. antd 日期控件的月份、星期、周起始取自 dayjs 的全局 locale，
 *    与 ConfigProvider 的 locale 是两套配置，只配后者会出现中英混排；
 * 2. 这里传入的是语言包对象而不是字符串，dayjs.locale(obj) 会同时完成「注册 + 切换全局」，
 *    避免 `import 'dayjs/locale/zh-cn'` 这类副作用导入被 tree-shaking 移除。
 */
export function applyDayjsLocale(locale: LocaleCode): void {
  dayjs.locale(DAYJS_LOCALES[locale]);
}

export default dayjs;
