/** 页面内的消息角色（服务端另有 system，由服务端注入，前端不可见） */
export type ChatRole = 'user' | 'assistant';

/**
 * 随消息发送的附件（图片、文档统一模型）。
 * 只有带 text 的附件会被拼进模型输入；图片与二进制文件仅本地展示。
 */
export interface Attachment {
  id: string;
  name: string;
  /** 字节 */
  size: number;
  /** 浏览器给的 MIME，可能为空串 */
  mime: string;
  /** 图片：dataURL 缩略图；其他文件为空 */
  previewUrl?: string;
  /** 可读文本文件的内容（超长已截断）；非文本文件为空 */
  text?: string;
  /** 内容被截断，模型看到的不是全文 */
  truncated?: boolean;
  /** 正在读取内容：读取完成前不允许发送 */
  reading?: boolean;
}

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
  /** 随消息发送的附件 */
  attachments?: Attachment[];
}

/** 附件数量与体积上限 */
export const MAX_FILES = 50;
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * 超过此体积的图片不再生成 dataURL 缩略图：
 * 预览图会常驻内存并随历史消息反复渲染，大图直接转 base64 会拖垮页面，
 * 这类图片降级为文件卡片展示。
 */
export const MAX_PREVIEW_SIZE = 10 * 1024 * 1024;

/**
 * 只有体积在此以内的文件才会尝试按文本读取，
 * 避免把上百 MB 的文件一次性读进内存（超出则降级为"仅展示"）。
 */
export const MAX_TEXT_FILE_SIZE = 2 * 1024 * 1024;
/** 单个文件注入模型的字符上限 */
export const MAX_TEXT_CHARS = 30_000;
/** 单条消息注入模型的文本总字符上限（防止 50 个文件撑爆上下文） */
export const MAX_TOTAL_TEXT_CHARS = 120_000;

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
