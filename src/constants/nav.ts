import { ROUTES } from './routes';

/** 导航图标：只存标识，具体图标在 AppNav 内映射，常量层保持纯数据 */
export type NavIconKey = 'home' | 'builder' | 'renderer' | 'wallet' | 'chat' | 'robot';

/** 导航分组：业务菜单与 AI 助手在视觉上分离 */
export type NavGroup = 'business' | 'ai';

export interface NavItem {
  path: string;
  group: NavGroup;
  icon: NavIconKey;
  label: string;
  /** 鼠标悬停时的补充说明 */
  hint?: string;
}

/** 全站导航的唯一配置源：新增页面只需在此追加 */
export const NAV_ITEMS: NavItem[] = [
  { path: ROUTES.HOME, group: 'business', icon: 'home', label: '首页' },
  { path: ROUTES.FORM_BUILDER, group: 'business', icon: 'builder', label: '表单设计器' },
  { path: ROUTES.FORM_RENDERER, group: 'business', icon: 'renderer', label: '表单渲染演示' },
  { path: ROUTES.SETTLE_POOL, group: 'business', icon: 'wallet', label: '资金结算池' },
  {
    path: ROUTES.CHAT,
    group: 'ai',
    icon: 'chat',
    label: 'AI 助手',
    hint: 'CopilotKit Agent，可操作业务模块',
  },
  {
    path: ROUTES.DEEPSEEK_CHAT,
    group: 'ai',
    icon: 'robot',
    label: 'DeepSeek 对话',
    hint: '直连 DeepSeek 模型，纯对话',
  },
];

export const BUSINESS_NAV_ITEMS = NAV_ITEMS.filter(item => item.group === 'business');
export const AI_NAV_ITEMS = NAV_ITEMS.filter(item => item.group === 'ai');
