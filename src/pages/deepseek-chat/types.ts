import type { MessageKey } from '../../locales/messages/zh-CN';

/** 页面内的消息角色（服务端另有 system，由服务端注入，前端不可见） */
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** deepseek-reasoner 的思考过程（reasoning_content），可有可无 */
  reasoning?: string;
  /** 思考用时（毫秒）：首个正文 token 到达时间与消息创建时间之差 */
  thoughtMs?: number;
  createdAt: number;
  /** 本条回复生成失败 */
  failed?: boolean;
  /** 随消息发送的图片（dataURL，仅本地展示，不参与模型输入） */
  images?: string[];
}

/** 附件限制：DeepSeek 为纯文本模型，图片只作本地展示，数量与体积都要克制 */
export const MAX_IMAGES = 4;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

/** 模型选项：文案走国际化字典，这里只存 key */
export interface ModelOption {
  value: string;
  labelKey: MessageKey;
  hintKey: MessageKey;
}

/** 可选模型；实际可用清单以服务端 health 返回为准 */
export const MODEL_OPTIONS: ModelOption[] = [
  { value: 'deepseek-chat', labelKey: 'deepseek.model.chat', hintKey: 'deepseek.model.chatHint' },
  {
    value: 'deepseek-reasoner',
    labelKey: 'deepseek.model.reasoner',
    hintKey: 'deepseek.model.reasonerHint',
  },
];

export const DEFAULT_MODEL = MODEL_OPTIONS[0].value;
