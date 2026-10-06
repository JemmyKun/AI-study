import type { MessageKey } from '../locales/messages/zh-CN';
import { ROUTES } from './routes';

/** 导航图标：只存标识，具体图标在 AppNav 内映射，常量层保持纯数据 */
export type NavIconKey = 'home' | 'builder' | 'renderer' | 'wallet' | 'chat' | 'robot';

/** 导航分组：业务菜单与 AI 助手在视觉上分离 */
export type NavGroup = 'business' | 'ai';

export interface NavItem {
  path: string;
  group: NavGroup;
  icon: NavIconKey;
  labelKey: MessageKey;
  hintKey?: MessageKey;
}

/** 全站导航的唯一配置源：新增页面只需在此追加 */
export const NAV_ITEMS: NavItem[] = [
  { path: ROUTES.HOME, group: 'business', icon: 'home', labelKey: 'nav.home' },
  { path: ROUTES.FORM_BUILDER, group: 'business', icon: 'builder', labelKey: 'nav.formBuilder' },
  { path: ROUTES.FORM_RENDERER, group: 'business', icon: 'renderer', labelKey: 'nav.formRenderer' },
  { path: ROUTES.SETTLE_POOL, group: 'business', icon: 'wallet', labelKey: 'nav.settlePool' },
  {
    path: ROUTES.CHAT,
    group: 'ai',
    icon: 'chat',
    labelKey: 'nav.chat',
    hintKey: 'nav.hint.chat',
  },
  {
    path: ROUTES.DEEPSEEK_CHAT,
    group: 'ai',
    icon: 'robot',
    labelKey: 'nav.deepseekChat',
    hintKey: 'nav.hint.deepseekChat',
  },
];

export const BUSINESS_NAV_ITEMS = NAV_ITEMS.filter(item => item.group === 'business');
export const AI_NAV_ITEMS = NAV_ITEMS.filter(item => item.group === 'ai');
