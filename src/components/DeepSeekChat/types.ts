/** 页面内的消息角色（服务端另有 system，由服务端注入，前端不可见） */
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** deepseek-reasoner 的思考过程（reasoning_content），可有可无 */
  reasoning?: string;
  createdAt: number;
  /** 本条回复生成失败 */
  failed?: boolean;
}

/** 发给服务端的消息体，只保留必要字段 */
export interface ApiMessage {
  role: ChatRole;
  content: string;
}

/** 服务可用性：checking 首次探测中，ready 可用，unconfigured 缺密钥，offline 代理未启动 */
export type ServiceStatus = 'checking' | 'ready' | 'unconfigured' | 'offline';

export interface HealthInfo {
  configured: boolean;
  model: string;
  allowedModels: string[];
}

export interface ModelOption {
  value: string;
  label: string;
  hint: string;
}

/** 可选模型；实际可用清单以服务端 health 返回为准 */
export const MODEL_OPTIONS: ModelOption[] = [
  { value: 'deepseek-chat', label: 'DeepSeek V3', hint: '通用对话，响应快' },
  { value: 'deepseek-reasoner', label: 'DeepSeek R1', hint: '深度推理，带思维链' },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].value;
