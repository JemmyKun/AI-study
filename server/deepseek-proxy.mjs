/**
 * DeepSeek 代理服务（独立 Node 服务，不依赖 CopilotKit）
 *
 * 为什么需要它：
 * 1. DeepSeek 的接口不支持浏览器跨域（无 CORS 头）
 * 2. API Key 绝不能下发到前端，必须由服务端持有
 * 因此前端统一请求同源的 /api/deepseek/*，由本服务转发到 DeepSeek。
 *
 * 端点：
 *   GET  /api/deepseek/health   健康检查（是否已配置密钥、当前模型）
 *   POST /api/deepseek/chat     对话，默认 SSE 流式，原样透传上游格式
 *
 * 部署（与 Runtime 同理，推荐同域反代）：
 *   浏览器 --> Nginx --> /api/deepseek --> 本服务(127.0.0.1:8300)
 *
 * 启动：npm run ai:proxy
 * 环境变量见 .env.example
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.DEEPSEEK_PROXY_PORT || 8300);
/** 默认只监听本机，需要容器/多机访问时用 DEEPSEEK_PROXY_HOST=0.0.0.0 覆盖 */
const HOST = process.env.DEEPSEEK_PROXY_HOST || '127.0.0.1';

/** 接口地址，末尾不要带 /v1，这里会自动拼接 /chat/completions */
const BASE_URL = (
  process.env.DEEPSEEK_BASE_URL ||
  process.env.MODEL_BASE_URL ||
  'https://api.deepseek.com'
).replace(/\/+$/, '');

/** 密钥优先级：DEEPSEEK_API_KEY > MODEL_API_KEY（复用项目已有的通用变量名） */
const API_KEY = process.env.DEEPSEEK_API_KEY || process.env.MODEL_API_KEY || '';
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

/** 模型白名单：前端只能从这里选，避免被当成免费算力代理 */
const ALLOWED_MODELS = (
  process.env.DEEPSEEK_ALLOW_MODELS || 'deepseek-chat,deepseek-reasoner'
)
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const SYSTEM_PROMPT =
  process.env.DEEPSEEK_SYSTEM_PROMPT ||
  '你是一个乐于助人的 AI 助手。请使用简体中文回答，表达简洁清晰，必要时使用 Markdown 排版。' +
  '当用户需要图表、柱状图、饼图、示意图或任何可视化时，直接输出完整的内联 SVG 代码' +
  '（<svg xmlns="http://www.w3.org/2000/svg" width="…" height="…" viewBox="…">…</svg>），' +
  '数据标签用 <text> 排版、配色鲜明；不要只输出字符画，也不要建议用户改用外部工具，' +
  '前端会把 SVG 直接渲染为图片。';

/** 请求体上限：512KB，防止被灌入超大历史 */
const MAX_BODY = 512 * 1024;
/** 单次请求最多携带的历史消息条数，超出只保留最近的 */
const MAX_HISTORY = 50;

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function log(color, tag, msg) {
  process.stdout.write(`${color}[${tag}]${RESET} ${msg}\n`);
}

/** CORS：默认关闭（同域反代），显式配置才开启 */
function resolveCors() {
  const raw = (process.env.DEEPSEEK_CORS_ORIGIN || process.env.COPILOT_CORS_ORIGIN || '').trim();
  if (!raw) return false;
  if (raw === '*') return true;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

const CORS = resolveCors();

function applyCors(req, res) {
  if (!CORS) return true;
  const origin = req.headers.origin;
  const allowed = CORS === true ? origin : CORS.includes(origin) ? origin : null;
  if (!allowed) return true; // 不在白名单：不写入 CORS 头，由浏览器自行拦截
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return false; // 预检请求到此结束
  }
  return true;
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/** 只允许 OpenAI 标准角色的纯文本消息，过滤掉潜在风险字段 */
function normalizeMessages(input) {
  if (!Array.isArray(input)) return null;
  const list = input
    .filter(m => m && (m.role === 'user' || m.role === 'assistant' || m.role === 'system'))
    .filter(m => typeof m.content === 'string' && m.content.trim())
    .map(m => ({
      role: m.role,
      content: String(m.content).slice(0, 32_000),
    }));
  if (list.length === 0) return null;
  return list.slice(-MAX_HISTORY);
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** 从上游错误响应里提取可读信息 */
function extractUpstreamError(text) {
  try {
    const parsed = JSON.parse(text);
    return parsed?.error?.message || parsed?.message || text;
  } catch {
    return text || '上游无响应';
  }
}

async function handleChat(req, res) {
  if (!API_KEY) {
    return json(res, 500, {
      error: { message: '服务端未配置模型密钥，请在 .env 中填写 DEEPSEEK_API_KEY 后重启（npm run launch）。' },
    });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (err) {
    return json(res, 400, { error: { message: `请求体解析失败：${err.message}` } });
  }

  const messages = normalizeMessages(payload?.messages);
  if (!messages) {
    return json(res, 400, { error: { message: 'messages 不能为空，且内容需为非空字符串。' } });
  }

  const requestedModel = String(payload?.model || DEFAULT_MODEL);
  if (!ALLOWED_MODELS.includes(requestedModel)) {
    return json(res, 400, {
      error: { message: `不支持的模型：${requestedModel}，可选：${ALLOWED_MODELS.join('、')}` },
    });
  }

  const stream = payload?.stream !== false;
  const requestBody = {
    model: requestedModel,
    // 系统提示词由服务端注入，前端无法篡改
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    stream,
    temperature: clampNumber(payload?.temperature, 0, 2, 1.0),
    top_p: clampNumber(payload?.top_p, 0, 1, 1.0),
    max_tokens: clampNumber(payload?.max_tokens ?? 4096, 1, 8192, 4096),
  };

  // 客户端断开时中止上游请求，避免浪费 token
  const controller = new AbortController();
  let clientGone = false;
  req.on('aborted', () => {
    clientGone = true;
    controller.abort();
  });
  res.on('close', () => {
    clientGone = true;
    controller.abort();
  });

  const startedAt = Date.now();
  let upstream;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = err?.name === 'AbortError';
    if (!aborted) log(RED, 'deepseek', `请求失败：${err.message}`);
    if (clientGone || aborted) return;
    return json(res, 502, { error: { message: `无法连接模型服务：${err.message}` } });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => '');
    const message = extractUpstreamError(text);
    log(RED, 'deepseek', `上游返回 ${upstream.status}：${message}`);
    return json(res, upstream.status >= 500 ? 502 : upstream.status, {
      error: { message: `模型服务返回错误（${upstream.status}）：${message}` },
    });
  }

  if (!stream) {
    const text = await upstream.text();
    json(res, 200, JSON.parse(text));
    return;
  }

  // 流式：把上游 SSE 原样回吐（格式与 OpenAI/DeepSeek 完全一致，方便后续换服务商）
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // 关闭 Nginx 缓冲，保证前端能逐字收到
    'X-Accel-Buffering': 'no',
  });

  const reader = upstream.body?.getReader();
  if (!reader) {
    res.end();
    log(YELLOW, 'deepseek', `完成（无响应体） ${Date.now() - startedAt}ms`);
    return;
  }

  const decoder = new TextDecoder();
  let chunks = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks += 1;
      if (clientGone) break;
      res.write(decoder.decode(value, { stream: true }));
    }
  } catch (err) {
    log(RED, 'deepseek', `流读取中断：${err.message}`);
  } finally {
    try {
      reader.cancel();
    } catch {
      /* 已关闭 */
    }
    if (!clientGone) {
      res.write(decoder.decode());
      res.end();
    }
    log(CYAN, 'deepseek', `${requestedModel} 完成 chunks=${chunks} 耗时 ${Date.now() - startedAt}ms`);
  }
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (!applyCors(req, res)) return; // 预检已处理

  if (pathname === '/api/deepseek/health') {
    return json(res, 200, {
      ok: true,
      configured: !!API_KEY,
      baseUrl: BASE_URL,
      model: DEFAULT_MODEL,
      allowedModels: ALLOWED_MODELS,
    });
  }

  if (pathname === '/api/deepseek/chat') {
    if (req.method !== 'POST') {
      return json(res, 405, { error: { message: '仅支持 POST' } });
    }
    handleChat(req, res).catch(err => {
      log(RED, 'deepseek', `处理异常：${err.message}`);
      if (!res.writableEnded) json(res, 500, { error: { message: err.message } });
    });
    return;
  }

  json(res, 404, { error: { message: `Not Found: ${pathname}` } });
});

server.listen(PORT, HOST, () => {
  log(GREEN, 'deepseek', `代理已启动: http://${HOST}:${PORT}/api/deepseek`);
  log(GREEN, 'deepseek', `上游地址: ${BASE_URL}`);
  log(GREEN, 'deepseek', `模型白名单: ${ALLOWED_MODELS.join(', ')}`);
  log(GREEN, 'deepseek', `CORS: ${CORS === false ? '关闭（同域反代模式）' : String(CORS)}`);
  if (!API_KEY) {
    log(YELLOW, 'deepseek', '警告：未检测到 DEEPSEEK_API_KEY / MODEL_API_KEY，请在 .env 中配置后再使用。');
  }
});
