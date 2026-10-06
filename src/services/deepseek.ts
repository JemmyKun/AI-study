import { API_BASE_URL } from '../config';
import { request } from './http';
import { streamSse } from './sse';

/** DeepSeek 代理服务的接口封装：页面与 hook 不直接拼 URL、不直接 fetch */

export interface DeepSeekHealth {
  configured: boolean;
  model: string;
  allowedModels: string[];
}

export interface ChatStreamDelta {
  content?: string;
  reasoning?: string;
}

export interface ChatStreamParams {
  messages: { role: 'user' | 'assistant'; content: string }[];
  model: string;
}

const BASE_URL = API_BASE_URL.deepseek;

export const deepseekApi = {
  /** 服务健康检查：返回密钥是否配置与可用模型白名单 */
  fetchHealth(signal?: AbortSignal): Promise<DeepSeekHealth> {
    return request<DeepSeekHealth>(`${BASE_URL}/health`, {
      method: 'GET',
      signal,
      timeout: 8000,
    }).then(data => ({ ...data, allowedModels: data.allowedModels ?? [] }));
  },

  /**
   * 流式对话：每个 token 通过 onDelta 回调上抛，调用方自行做渲染节流。
   * [DONE] 事件由本层消费，不回调给上层。
   */
  async streamChat(
    params: ChatStreamParams,
    onDelta: (delta: ChatStreamDelta) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    await streamSse(
      `${BASE_URL}/chat`,
      { method: 'POST', body: { ...params, stream: true }, signal },
      data => {
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data) as {
            choices?: { delta?: { content?: string; reasoning_content?: string } }[];
          };
          const delta = json.choices?.[0]?.delta ?? {};
          const payload: ChatStreamDelta = {};
          if (typeof delta.content === 'string' && delta.content) payload.content = delta.content;
          if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
            payload.reasoning = delta.reasoning_content;
          }
          if (payload.content || payload.reasoning) onDelta(payload);
        } catch {
          // 单行解析失败不影响整体流式结果
        }
      },
    );
  },
};
