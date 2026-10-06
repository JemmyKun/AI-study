# 01 · 快速开始

## 1. 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 18（推荐 20+） | 后端脚本使用内置 `fetch` 与 `--env-file` |
| npm | ≥ 8 | 随 Node 安装 |

## 2. 安装依赖

```bash
npm install
```

## 3. 配置环境变量

复制模板后按需填写：

```bash
cp .env.example .env    # Windows: copy .env.example .env
```

关键项：

| 变量 | 用途 | 必填 |
| --- | --- | --- |
| `MODEL_API_KEY` / `DEEPSEEK_API_KEY` | 模型密钥（服务端持有，不会下发到浏览器） | DeepSeek 对话页必填其一 |
| `DEEPSEEK_BASE_URL` | 模型服务地址，默认 `https://api.deepseek.com` | 否 |
| `DEEPSEEK_MODEL` | 默认模型，默认 `deepseek-chat` | 否 |
| `DEEPSEEK_ALLOW_MODELS` | 前端可切换的模型白名单 | 否 |
| `DEEPSEEK_PROXY_PORT` | DeepSeek 代理端口，默认 `8300` | 否 |
| `COPILOT_RUNTIME_PORT` | CopilotKit Runtime 端口，默认 `8200` | 否 |

> 前端地址不需要写进 `.env`：`public/config.js` 里的 `window.__COPILOT_RUNTIME_URL__` /
> `window.__DEEPSEEK_API_URL__` 默认就是同源相对路径，部署后改这一个文件即可切换环境，
> 无需重新打包。

## 4. 一键启动 / 停止

```bash
npm run launch   # 同时拉起 前端 + CopilotKit Runtime + DeepSeek 代理
npm run stop     # 停止以上全部进程
```

启动后：

| 服务 | 地址 | 说明 |
| --- | --- | --- |
| 前端 | http://localhost:3000 | CRA devServer（craco） |
| CopilotKit Runtime | http://127.0.0.1:8200/api/copilotkit | `/chat` 页面使用 |
| DeepSeek 代理 | http://127.0.0.1:8300/api/deepseek | `/ai-chat` 页面使用 |

开发环境下前端通过 `craco.config.js` 的 devServer 代理访问后端，因此页面里只出现同源相对路径，
不存在跨域问题。

## 5. 单独启动（调试用）

```bash
npm start                # 只启动前端（3000）
npm run copilot:runtime  # 只启动 CopilotKit Runtime（8200）
npm run ai:proxy         # 只启动 DeepSeek 代理（8300）
```

## 6. 其他脚本

```bash
npm run build   # 生产构建，产物在 build/
npm test        # 运行测试
npx tsc --noEmit  # 类型检查
npx eslint src --ext .ts,.tsx  # 代码检查
```

## 7. 验证安装

1. 打开 http://localhost:3000 ，应看到首页与顶部导航；
2. 进入 `/ai-chat`，右上角状态灯显示「已就绪」表示密钥与代理正常；
3. 进入 `/chat`，右下角悬浮按钮可打开全局 AI 助手（该按钮在完整对话页会自动隐藏）；
4. 若状态灯显示「未连接」，检查 `.env` 是否配置密钥，并确认 `npm run launch` 已执行。
