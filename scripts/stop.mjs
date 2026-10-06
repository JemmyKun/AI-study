/**
 * 一键停止脚本：结束 前端(3000) + CopilotKit Runtime(8200) + DeepSeek 代理(8300) 及其子进程树
 *
 * 用法：
 *   npm run stop        # 跨平台推荐
 *   stop.bat            # Windows 双击
 *   node scripts/stop.mjs
 *
 * 处理方式：
 * 1. 按端口找到监听进程并 kill（Windows 用 netstat + taskkill /T /F，Unix 用 lsof + kill）
 * 2. Windows 额外按命令行关键字兜底清理（craco / copilotkit-server / start.mjs 包装进程）
 */
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);

const WEB_PORT = Number(process.env.PORT || 3000);
const RUNTIME_PORT = Number(process.env.COPILOT_RUNTIME_PORT || 8200);
const PROXY_PORT = Number(process.env.DEEPSEEK_PROXY_PORT || 8300);
const isWin = process.platform === 'win32';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

/** 查询占用指定端口的进程 PID */
function pidsByPort(port) {
  const pids = new Set();
  if (isWin) {
    let out = '';
    try {
      out = execSync('netstat -ano -p tcp', { encoding: 'utf8', windowsHide: true });
    } catch {
      return [];
    }
    out.split(/\r?\n/).forEach(line => {
      // TCP    127.0.0.1:3000    0.0.0.0:0    LISTENING    12345
      const m = line.trim().match(/^TCP\s+(\S+):(\d+)\s+(\S+)\s+LISTENING\s+(\d+)\s*$/i);
      if (m && Number(m[2]) === port) pids.add(m[4]);
    });
    return [...pids];
  }

  try {
    const out = execSync(`lsof -ti tcp:${port}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    out.split(/\s+/).filter(Boolean).forEach(p => pids.add(p));
  } catch {
    /* 端口空闲时 lsof 返回非 0，忽略 */
  }
  return [...pids];
}

function killPid(pid) {
  if (isWin) {
    spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    try {
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      /* 进程可能已退出 */
    }
  }
}

/** Windows 兜底：按命令行关键字清理 node/craco 包装进程 */
function killByCommandLine(keyword) {
  if (!isWin) return;
  const ps = [
    'Get-CimInstance Win32_Process',
    `-Filter "Name='node.exe' or Name='cmd.exe' or Name='powershell.exe'"`,
    '| Where-Object { $_.CommandLine -like ' +
      `'%${keyword}%' }`,
    '| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }',
  ].join(' ');
  spawnSync('powershell', ['-NoProfile', '-Command', ps], {
    stdio: 'ignore',
    windowsHide: true,
  });
}

function stopPort(port, label) {
  const pids = pidsByPort(port);
  if (pids.length === 0) {
    console.log(`${YELLOW}${label}(${port})：未在运行${RESET}`);
    return false;
  }
  pids.forEach(killPid);
  console.log(`${GREEN}${label}(${port})：已结束 PID ${pids.join(', ')}${RESET}`);
  return true;
}

function isPortFree(port) {
  return pidsByPort(port).length === 0;
}

async function main() {
  console.log(`${CYAN}== 停止开发服务 ==${RESET}\n`);

  stopPort(WEB_PORT, '前端');
  stopPort(RUNTIME_PORT, 'Runtime');
  stopPort(PROXY_PORT, 'DeepSeek代理');

  if (isWin) {
    // 清理 npx / cmd 包装进程与启动器自身
    ['craco', 'copilotkit-server', 'deepseek-proxy', 'scripts/start.mjs'].forEach(killByCommandLine);
  }

  // 等待端口释放
  const deadline = Date.now() + 5000;
  while (
    Date.now() < deadline &&
    !(isPortFree(WEB_PORT) && isPortFree(RUNTIME_PORT) && isPortFree(PROXY_PORT))
  ) {
    await new Promise(r => setTimeout(r, 300));
  }

  const webFree = isPortFree(WEB_PORT);
  const runtimeFree = isPortFree(RUNTIME_PORT);
  const proxyFree = isPortFree(PROXY_PORT);
  if (webFree && runtimeFree && proxyFree) {
    console.log(`\n${GREEN}所有服务已停止。${RESET}`);
  } else {
    if (!webFree) console.log(`\n${YELLOW}端口 ${WEB_PORT} 仍被占用，请手动结束对应进程。${RESET}`);
    if (!runtimeFree)
      console.log(`${YELLOW}端口 ${RUNTIME_PORT} 仍被占用，请手动结束对应进程。${RESET}`);
    if (!proxyFree)
      console.log(`${YELLOW}端口 ${PROXY_PORT} 仍被占用，请手动结束对应进程。${RESET}`);
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error(`停止失败：${err.message}`);
  process.exit(1);
});
