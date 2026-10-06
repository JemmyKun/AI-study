/**
 * 全局类型声明：只放跨模块共享的运行时契约（window 注入、静态资源模块等）。
 * 业务类型请放在对应的 types 模块内，不要堆到这里。
 */

/** public/config.js 注入的运行时配置：部署后可直接改文件切换环境，无需重新打包 */
interface RuntimeConfig {
  /** CopilotKit Runtime 地址，默认 /api/copilotkit */
  __COPILOT_RUNTIME_URL__?: string;
  /** DeepSeek 代理地址，默认 /api/deepseek */
  __DEEPSEEK_API_URL__?: string;
}

declare global {
  interface Window extends RuntimeConfig {}
}

export {};
