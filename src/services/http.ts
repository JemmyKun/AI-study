import { DEFAULT_TIMEOUT } from '../config';

/** 统一的请求错误：组件只需处理 ApiError，不必关心底层是 fetch 还是超时 */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payload?: unknown;

  constructor(message: string, status: number, payload?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.code = code;
  }

  /** 网络层失败（未收到响应），如代理未启动、断网 */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined>;
  /** 外部取消信号（超时为内部独立信号，两者互不干扰） */
  signal?: AbortSignal;
  /** 超时时间，默认 DEFAULT_TIMEOUT；传 0 表示不限制 */
  timeout?: number;
}

function buildUrl(url: string, query?: RequestConfig['query']): string {
  if (!query) return url;
  const search = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined) return;
    search.append(key, String(value));
  });
  const qs = search.toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

/** 从响应体里尽量取出可读错误文案 */
async function readErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return `HTTP ${res.status}`;
    try {
      const data = JSON.parse(text) as { error?: { message?: string }; message?: string };
      return data.error?.message || data.message || `HTTP ${res.status}`;
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return `HTTP ${res.status}`;
  }
}

/**
 * 统一的 JSON 请求入口：
 * - 自动超时（默认 DEFAULT_TIMEOUT），且不会覆盖调用方传入的 signal
 * - 非 2xx 统一抛 ApiError，空响应返回 undefined
 * - 响应体不是 JSON 时给出明确错误，避免调用方拿到 undefined 还以为成功
 */
export async function request<T>(url: string, config: RequestConfig = {}): Promise<T> {
  const { method = 'GET', body, headers, query, signal, timeout = DEFAULT_TIMEOUT } = config;

  const controller = new AbortController();
  let timedOut = false;
  const timer =
    timeout > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeout)
      : null;

  const forwardAbort = () => controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  try {
    const res = await fetch(buildUrl(url, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new ApiError(await readErrorMessage(res), res.status);
    }

    const text = await res.text();
    if (!text) return undefined as T;

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError('响应不是合法 JSON', res.status, text.slice(0, 200));
    }
  } catch (err) {
    if (isAbortError(err)) {
      // 调用方主动取消：原样抛出，交由业务区分"停止生成"等场景
      if (signal?.aborted) throw err;
      throw new ApiError(timedOut ? `请求超时（${timeout}ms）` : '请求已取消', 0);
    }
    if (err instanceof ApiError) throw err;
    throw new ApiError(err instanceof Error ? err.message : '网络请求失败', 0);
  } finally {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

export const http = {
  get: <T>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'GET' }),
  post: <T>(url: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'POST', body }),
  put: <T>(url: string, body?: unknown, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'PUT', body }),
  delete: <T>(url: string, config?: Omit<RequestConfig, 'method' | 'body'>) =>
    request<T>(url, { ...config, method: 'DELETE' }),
};
