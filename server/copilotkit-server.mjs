/**
 * CopilotKit Runtime（独立 Node 服务）
 *
 * 生产推荐部署方式：同域 + 反向代理
 *   浏览器 --> Nginx(80/443) --> 静态资源 build/
 *                             --> /api/copilotkit --> 本服务(127.0.0.1:8200)
 * 这种模式下前端使用同源相对地址 /api/copilotkit，无需 CORS、无需硬编码域名。
 *
 * 启动：npm run copilot:runtime
 * 环境变量见 .env.example
 */
import { createServer } from 'node:http';
import { BuiltInAgent, CopilotRuntime } from '@copilotkit/runtime/v2';
import { createCopilotNodeListener } from '@copilotkit/runtime/v2/node';

const port = Number(process.env.COPILOT_RUNTIME_PORT || 8200);
/**
 * 监听地址：
 * - 生产默认 127.0.0.1，只暴露给本机反代，禁止公网直连 8200
 * - 需要容器/多机访问时用 COPILOT_RUNTIME_HOST=0.0.0.0 覆盖
 */
const host = process.env.COPILOT_RUNTIME_HOST || '127.0.0.1';
const model = process.env.COPILOT_MODEL || 'openai/deepseek-chat';

// 兼容通用命名：MODEL_API_KEY / MODEL_BASE_URL -> CopilotKit 读取的 OPENAI_*
if (process.env.MODEL_API_KEY) process.env.OPENAI_API_KEY = process.env.MODEL_API_KEY;
if (process.env.MODEL_BASE_URL) process.env.OPENAI_BASE_URL = process.env.MODEL_BASE_URL;

/**
 * CORS 配置（默认关闭，走反代时不需要跨域）：
 * - 不配置：不开启 CORS（推荐，同域反代场景）
 * - COPILOT_CORS_ORIGIN=* ：允许任意来源
 * - COPILOT_CORS_ORIGIN=https://a.com,https://b.com ：白名单
 */
function resolveCors() {
  const raw = (process.env.COPILOT_CORS_ORIGIN || '').trim();
  if (!raw) return false;
  if (raw === '*') return true;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

const runtime = new CopilotRuntime({
  agents: {
    default: new BuiltInAgent({
      model,
      apiKey: process.env.OPENAI_API_KEY,
      prompt: [
        '你是本系统的通用 AI 助手。',
        '系统由多个业务模块组成（例如低代码表单配置、结算池等）。',
        '你可以用 listModules 查看当前已打开的模块，用 getModuleSummary 获取模块实时数据；对表单设计器模块，你还可以增删字段、修改标题。',
        '回答请使用中文，简洁明了。',
      ].join('\n'),
    }),
  },
});

const cors = resolveCors();

const listener = createCopilotNodeListener({
  runtime,
  basePath: '/api/copilotkit',
  cors,
});

createServer(listener).listen(port, host, () => {
  console.log(`[copilot] Runtime 已启动: http://${host}:${port}/api/copilotkit`);
  console.log(`[copilot] 使用模型: ${model}`);
  console.log(`[copilot] 接口地址: ${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}`);
  console.log(`[copilot] CORS: ${cors === false ? '关闭（同域反代模式）' : String(cors)}`);
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[copilot] 警告：未检测到 MODEL_API_KEY，请在环境变量中配置后再对话。');
  }
});
