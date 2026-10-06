import zhCN from 'antd/es/locale/zh_CN';
import enUS from 'antd/es/locale/en_US';
import type { LocaleCode } from './types';

/**
 * antd 组件内置文案与业务语言保持一致（分页、日期、空状态、校验提示等）。
 * 新增语言时同步这里即可，组件层无需改动。
 */
export const ANTD_LOCALES: Record<LocaleCode, typeof zhCN> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};
