/**
 * 一键启动脚本：同时拉起 前端(3000) + CopilotKit Runtime(8200) + DeepSeek 代理(8300)
 *
 * 用法：
 *   npm run launch        # 跨平台推荐
 *   start.bat             # Windows 双击
 *   node scripts/start.mjs
 *
 * 特性：
 * - 自动检查 node_modules、生成缺失的 .env
 * - 自行解析 .env 注入 Runtime 环境变量（不依赖 Node --env-file，兼容旧版本）
 * - 端口占用检测，避免启动出两个实例
 * - 统一前缀日志，Ctrl+C 同时结束所有子进程
 * - 前端就绪后自动打开浏览器
 */
import { spawn } from 'node:child_process';
import { existsSync, copyFileSync, readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const WEB_PORT = Number(process.env.PORT || 3000);
const RUNTIME_PORT = Number(process.env.COPILOT_RUNTIME_PORT || 8200);
const PROXY_PORT = Number(process.env.DEEPSEEK_PROXY_PORT || 8300);
const OPEN_BROWSER = process.env.OPEN_BROWSER !== 'false';

const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const children = [];
let shuttingDown = false;

/** 简易 .env 解析，避免依赖 Node 20+ 的 --env-file */
function loadEnvFile(file) {
  const env = {};
  if (!existsSync(file)) return env;
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    });
  return env;
}

/** 端口是否已被占用 */
function isPortBusy(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = busy => {
      socket.destroy();
      resolve(busy);
    };
    socket.setTimeout(800);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function prefixLog(prefix, color, data) {
  String(data)
    .split(/\r?\n/)
    .forEach(line => {
      if (line.trim()) process.stdout.write(`${color}[${prefix}]${RESET} ${line}\n`);
    });
}

function run(name, color, command, args, env) {
  // 不使用 shell，避免 Windows 下 "C:\Program Files\..." 这类路径被拼接解析出错
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env },
  });
  child.stdout.on('data', d => prefixLog(name, color, d));
  child.stderr.on('data', d => prefixLog(name, color, d));
  child.on('exit', code => {
    if (shuttingDown) return;
    prefixLog(name, color, `${YELLOW}进程退出，code=${code}${RESET}`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach(c => {
    if (!c.killed) c.kill('SIGTERM');
  });
  setTimeout(() => {
    children.forEach(c => {
      if (!c.killed) c.kill('SIGKILL');
    });
    process.exit(code);
  }, 800);
}

function openBrowser(url) {
  const cmd =
    process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  import('node:child_process').then(({ exec }) =>
    exec(cmd, () => {
      /* 打开失败忽略 */
    }),
  );
}

async function main() {
  console.log(`${CYAN}== 低代码业务平台 启动器 ==${RESET}\n`);

  // 1. 依赖检查
  if (!existsSync(join(root, 'node_modules'))) {
    console.log(`${RED}未检测到 node_modules，请先执行：npm install${RESET}`);
    process.exit(1);
  }

  // 2. 环境变量文件
  if (!existsSync(join(root, '.env'))) {
    const example = join(root, '.env.example');
    if (existsSync(example)) {
      copyFileSync(example, join(root, '.env'));
      console.log(`${YELLOW}已根据 .env.example 生成 .env，请填写 MODEL_API_KEY 后重启。${RESET}`);
    } else {
      console.log(`${YELLOW}未找到 .env，将使用默认配置（未配置模型密钥时 AI 助手不可用）。${RESET}`);
    }
  }

  // 3. 端口检查
  if (await isPortBusy(WEB_PORT)) {
    console.log(`${RED}端口 ${WEB_PORT} 已被占用，请先结束占用进程再启动。${RESET}`);
    process.exit(1);
  }
  if (await isPortBusy(RUNTIME_PORT)) {
    console.log(`${RED}端口 ${RUNTIME_PORT} 已被占用（Runtime 可能已在运行），请先结束该进程。${RESET}`);
    process.exit(1);
  }
  if (await isPortBusy(PROXY_PORT)) {
    console.log(`${RED}端口 ${PROXY_PORT} 已被占用（DeepSeek 代理可能已在运行），请先结束该进程。${RESET}`);
    process.exit(1);
  }

  const envFromFile = loadEnvFile(join(root, '.env'));
  if (!envFromFile.MODEL_API_KEY) {
    console.log(`${YELLOW}提示：.env 中未配置 MODEL_API_KEY，前端可正常访问，但 AI 助手无法回复。${RESET}\n`);
  }

  const runtimeEnv = {
    ...envFromFile,
    COPILOT_RUNTIME_PORT: String(RUNTIME_PORT),
    COPILOT_RUNTIME_HOST: envFromFile.COPILOT_RUNTIME_HOST || '127.0.0.1',
  };
  const proxyEnv = {
    ...envFromFile,
    DEEPSEEK_PROXY_PORT: String(PROXY_PORT),
    DEEPSEEK_PROXY_HOST: envFromFile.DEEPSEEK_PROXY_HOST || '127.0.0.1',
  };

  console.log(`${CYAN}前端     : http://localhost:${WEB_PORT}${RESET}`);
  console.log(`${MAGENTA}Runtime  : http://127.0.0.1:${RUNTIME_PORT}/api/copilotkit${RESET}`);
  console.log(`${YELLOW}DeepSeek : http://127.0.0.1:${PROXY_PORT}/api/deepseek${RESET}\n`);

  // 4. 启动 Runtime（注入 .env 变量，兼容低版本 Node）
  run('runtime', MAGENTA, process.execPath, [
    join(root, 'server', 'copilotkit-server.mjs'),
  ], runtimeEnv);

  // 5. 启动 DeepSeek 代理（/ai-chat 页面使用）
  run('deepseek', YELLOW, process.execPath, [
    join(root, 'server', 'deepseek-proxy.mjs'),
  ], proxyEnv);

  // 6. 启动前端（Windows 下 npx 是 .cmd，需经 cmd /c 调用）
  const isWin = process.platform === 'win32';
  run(
    'web',
    CYAN,
    isWin ? 'cmd' : 'npx',
    isWin ? ['/c', 'npx', 'craco', 'start'] : ['craco', 'start'],
    { PORT: String(WEB_PORT), BROWSER: 'none' },
  );

  if (OPEN_BROWSER) {
    setTimeout(() => openBrowser(`http://localhost:${WEB_PORT}`), 9000);
  }

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main().catch(err => {
  console.error(`${RED}启动失败：${err.message}${RESET}`);
  process.exit(1);
});
