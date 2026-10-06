/**
 * 路由路径常量：页面跳转、导航、AI 工具枚举的唯一来源。
 * 禁止在组件里硬编码路径字符串。
 */
export const ROUTES = {
  HOME: '/',
  FORM_BUILDER: '/builder',
  FORM_RENDERER: '/renderer',
  CHAT: '/chat',
  DEEPSEEK_CHAT: '/ai-chat',
  SETTLE_POOL: '/settle-pool',
  SETTLE_POOL_NEW: '/settle-pool/new',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/** 动态路由：结算单编辑页 */
export const settlePoolEditPath = (id: string): string => `${ROUTES.SETTLE_POOL}/${id}/edit`;

/** 本身就是完整对话页的路由：隐藏全局悬浮助手，避免重复对话入口 */
export const FULL_PAGE_CHAT_ROUTES: string[] = [ROUTES.CHAT, ROUTES.DEEPSEEK_CHAT];

/** 允许 AI 助手跳转的白名单（对应 AppCopilotBridge 的 navigateTo 工具） */
export const AI_NAVIGABLE_ROUTES = [
  ROUTES.HOME,
  ROUTES.FORM_BUILDER,
  ROUTES.FORM_RENDERER,
  ROUTES.SETTLE_POOL,
  ROUTES.SETTLE_POOL_NEW,
  ROUTES.CHAT,
] as const;
