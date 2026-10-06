/**
 * 运行时配置：所有外部地址、环境开关的唯一出口。
 *
 * 解析优先级（与后端部署约定保持一致）：
 * 1. window.__XXX__（public/config.js，部署后可改，无需重新打包）
 * 2. process.env.REACT_APP_XXX（构建时注入）
 * 3. 同源相对路径（开发走 devServer 代理，生产走 Nginx 反代）
 *
 * 组件内禁止再写 process.env 或读取 window.__XXX__，统一从这里取。
 */

type RuntimeKey = keyof Pick<Window, '__COPILOT_RUNTIME_URL__' | '__DEEPSEEK_API_URL__'>;

function resolveApiBase(key: RuntimeKey, envKey: string, fallback: string): string {
  const fromConfig = typeof window !== 'undefined' ? window[key] : undefined;
  if (fromConfig) return fromConfig.replace(/\/+$/, '');

  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/+$/, '');

  return fallback;
}

/** 各后端服务的基址（不带结尾斜杠） */
export const API_BASE_URL = {
  /** CopilotKit Runtime */
  copilotkit: resolveApiBase(
    '__COPILOT_RUNTIME_URL__',
    'REACT_APP_COPILOTKIT_RUNTIME_URL',
    '/api/copilotkit',
  ),
  /** DeepSeek 本地代理 */
  deepseek: resolveApiBase('__DEEPSEEK_API_URL__', 'REACT_APP_DEEPSEEK_API_URL', '/api/deepseek'),
} as const;

/** 应用元信息 */
export const APP_INFO = {
  name: '智枢 · 智能业务平台',
  shortName: '智枢',
} as const;

/** 是否开发环境 */
export const IS_DEV = process.env.NODE_ENV === 'development';

/** 默认请求超时（毫秒） */
export const DEFAULT_TIMEOUT = 30_000;
