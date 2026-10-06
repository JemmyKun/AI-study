# /chat 页面：模拟对话 → 真实大模型对话 改造说明

> 记录本次改造的设计思路与关键实现点，便于后续维护与二次扩展。

---

## 一、改造背景

改造前 `/chat` 是一个纯前端假象：

- 回复内容来自 `src/utils/mockResponses.ts`（已删除）的固定语料
- 打字机效果来自 `src/hooks/useTypewriter.ts` 的定时器
- 没有任何网络请求，也无法感知业务模块数据

改造目标：**让 `/chat` 成为真正的能力入口**——既能自由问答，又能通过前端工具查询/操作页面上的业务模块（表单设计器、结算池），且与侧边栏 `CopilotSidebar` 共用同一套 Agent 能力。

---

## 二、整体架构

```
┌──────────────── 浏览器 ────────────────┐
│  CopilotKitProvider(runtimeUrl)        │  ① 握手 /info
│      ├── AppCopilotBridge（注册前端工具）│
│      ├── CopilotSidebar（非 /chat 页）  │
│      └── ChatPage                      │
│            └── useAgentChat            │  ② SSE 流式 run
└───────────────┬────────────────────────┘
                │ /api/copilotkit（同源相对路径）
    dev: CRA devServer proxy  |  prod: Nginx 反代
                │
┌───────────────▼────────────────────────┐
│ CopilotKit Runtime（Node, 127.0.0.1:8200）
│   CopilotRuntime + BuiltInAgent(model)  │  ③ 调用 OpenAI 兼容接口
└───────────────┬────────────────────────┘
                ▼
        模型服务（DeepSeek / OpenAI）
```

要点：**前端只认一个相对地址 `/api/copilotkit`**，开发和生产的差异全部由代理层吸收，前端代码里没有任何硬编码域名或端口。

---

## 三、涉及文件

| 文件 | 变更 | 作用 |
|---|---|---|
| `server/copilotkit-server.mjs` | 新增 | 独立 Runtime 服务 |
| `src/app/App.tsx` | 修改 | Provider 的 runtimeUrl 解析（三级优先级） |
| `craco.config.js` | 修改 | 开发代理 `/api/copilotkit → 127.0.0.1:8200` |
| `src/types/copilotkit-headless.d.ts` | 新增 | headless 子路径的类型声明（见 §4.3） |
| `src/pages/chat/useAgentChat.ts` | 新增 | 核心：Agent 驱动 hook |
| `src/pages/chat/ChatPage.tsx` | 修改 | 改用 `useAgentChat` |
| `src/pages/chat/MessageList.tsx` | 修改 | 增加 连接告警 / 错误条 / 思考气泡 |
| `src/pages/chat/InputBox.tsx` | 修改 | 增加 发送/停止切换、未连接禁用 |
| `src/features/copilot/AppCopilotBridge.tsx` | 已有 | 前端工具注册（副作用即能力，无需改动） |
| `.env.example` | 修改 | 密钥与环境说明 |
| `package.json` | 修改 | `launch` / `stop` / `copilot:runtime` 脚本 |

---

## 四、关键技术点

### 4.1 Runtime 侧：一行代码 = 一个 Agent

```ts
const runtime = new CopilotRuntime({
  agents: { default: new BuiltInAgent({ model, apiKey, prompt }) },
});
createServer(createCopilotNodeListener({ runtime, basePath: '/api/copilotkit', cors }))
  .listen(port, host);
```

- 用的是 v2 API：`@copilotkit/runtime/v2` + `@copilotkit/runtime/v2/node`
- 模型用 OpenAI 兼容格式，DeepSeek 只需改 `MODEL_BASE_URL` / `COPILOT_MODEL`
- 环境变量做了通用名兼容：`MODEL_API_KEY → OPENAI_API_KEY`、`MODEL_BASE_URL → OPENAI_BASE_URL`
- **默认 `127.0.0.1` + 关闭 CORS**：生产只暴露给本机反代；确需跨域时用 `COPILOT_CORS_ORIGIN` 显式开启白名单，不默认开放

### 4.2 前端地址：三级解析，部署免重打包

`App.tsx`：

```
window.__COPILOT_RUNTIME_URL__  (public/config.js，部署后可改)
  ↓ 未设置
process.env.REACT_APP_COPILOTKIT_RUNTIME_URL  (构建时注入)
  ↓ 未设置
'/api/copilotkit'  (同源相对路径，推荐)
```

配合 `craco.config.js` 的 devServer 代理，本地开发无需 CORS、无需任何特殊配置；上线后要换环境，只改 `public/config.js` 一行，不用重新 build。

### 4.3 headless 入口 + 手写类型声明（踩坑点）

`@copilotkit/react-core` 用 `exports` map 暴露子路径 `@copilotkit/react-core/v2/headless`，而本项目是 CRA + `moduleResolution: "node"`(node10)，**TS 无法解析 exports 子路径**，会报"找不到模块声明"。

解决：新增 `src/types/copilotkit-headless.d.ts`，只对实际用到的 API（`useAgent` / `useCopilotKit` / `UseAgentUpdate`）做最小化声明。运行时 import 的仍是同一个包内模块，与 `CopilotKitProvider` 共享同一份 Context，**不是 mock、不是替身**。

### 4.4 `useAgentChat`：本次改造的核心

```ts
const { agent, isReady } = useAgent({ updates: [UseAgentUpdate.OnMessagesChanged, UseAgentUpdate.OnRunStatusChanged] });
const { copilotkit } = useCopilotKit();
```

**① 为什么要额外 `forceRender`**

`updates` 只保证"消息列表引用变化"和"运行状态变化"触发重渲染，但流式吐字过程中 `agent.messages` 的最后一条是**原地修改 content**（引用未变），React 察觉不到。因此额外订阅并在事件回调里 `forceRender()`：

```ts
const [, forceRender] = useReducer((x: number) => x + 1, 0);
agent.subscribe({
  onEvent: () => forceRender(),
  onRunFinalized: () => forceRender(),
  onRunFailed: ({ error }) => { setError(friendlyError(error)); forceRender(); },
});
```

**② 为什么用 `copilotkit.runAgent` 而不是 `agent.runAgent`**

调用 `copilotkit.runAgent({ agent })` 会把本页通过 `AppCopilotBridge` 注册的前端工具一起带上，并自动处理工具回包；直接用 `agent.runAgent()` 只有纯文本对话，工具调用会失效。这是"能操作页面"的关键。

**③ 消息映射 `mapMessages`**

把 AG-UI 原始消息收敛成 UI 结构 `Message{id,role,content}` 时处理了三件事：

- `content` 可能是字符串，也可能是多模态分片数组 → `textFromContent()` 统一取文本
- 只有 `toolCalls` 没有文本的轮次，转成 `> 正在调用工具：\`xxx\`` 的提示消息，避免"空气泡"
- 过滤协议内置工具（名称以 `AGUI` 开头，如 `AGUISendStateSnapshot`），只展示业务工具
- `system` / `developer` / `tool` 结果不上屏

**④ 停止与清空**

```ts
agent.abortRun();     // 中止当前 run，已输出内容保留
agent.setMessages([]); // 清空会话，回到示例问题页
```

两者都在 `finally` 里补一次 `forceRender()`，避免 UI 停在旧状态。

**⑤ 错误友好化**

`friendlyError()` 把底层报错翻译成人话：

- 含 `api key / 401 / MODEL_API_KEY` → 提示检查密钥并重启 Runtime
- 含 `ECONNREFUSED / fetch failed` → 提示 Runtime 未启动

### 4.5 连接状态来自 Core，而不是自己 ping

```ts
const runtimeStatus = copilotkit.runtimeConnectionStatus; // disconnected|connecting|connected|error
```

用它驱动三处 UI：头部状态灯、`runtimeStatus === 'error'` 时禁用输入框并显示 placeholder 提示、`connected === false` 时在消息区显示"尚未连接 AI 服务"告警条。

注意：`connecting` 状态**允许发送**（Core 会自动等待握手完成后再发起 run），只有 `error` 才真正禁用。

### 4.6 UI 层保留并复用

流式期间由 `ChatPage.tsx` 计算 `streamingId`（最后一条 assistant 消息的 id）传给 `MessageItem` 显示 `|` 光标；尚未吐出第一个字之前由 `MessageList` 渲染三点 thinking 气泡。渲染仍走 `react-markdown` + `react-syntax-highlighter`，保留代码块高亮与复制能力——**只是数据源从 mock 换成了真实流式消息**。

---

## 五、一次问答的完整时序

1. 用户输入 → `send(text)`
2. `agent.addMessage({role:'user'})` → 立即上屏（乐观 UI）
3. `copilotkit.runAgent({ agent })` → POST `/api/copilotkit/agent/default/run`
4. Runtime 的 `BuiltInAgent` 携带前端工具描述请求模型
5. 模型流式返回 token / 或发起工具调用
6. 工具调用回到浏览器由 `AppCopilotBridge` 的 handler 执行（如读表单结构、统计结算池），结果回传模型
7. SSE 持续推送 → `agent.messages` 原地更新 → `onEvent → forceRender` → 页面上看到逐字输出
8. `onRunFinalized` 结束，`isRunning = false`，光标消失

---

## 六、验证方式

日常使用：

```bash
npm run launch   # 拉起 前端:3000 + Runtime:8200，自动开浏览器
npm run stop     # 停止
```

调试脚本（统一放在 `scripts/temp/`，在项目根目录执行）：

| 脚本 | 用途 |
|---|---|
| `scripts/temp/_probe.mjs` | 绕过前端直连 Runtime：`/info` 握手 + `/agent/default/run` 的 SSE 原始输出 |
| `scripts/temp/_e2e.mjs` | Playwright 端到端：打开 `/chat`、发消息、验证停止/清空/示例问答（需 `npm i --no-save playwright-core`） |
| `scripts/temp/_chk.mjs` | 查看 `node_modules` 内类型/实现的探查脚本 |
| `scripts/temp/_probe-deepseek.mjs` | DeepSeek 代理联调：health + 流式对话（见「DeepSeek 独立对话页」说明） |
| `scripts/temp/_e2e-deepseek.mjs` | `/ai-chat` 页面端到端冒烟 + AI 导航切换验证 |
| `scripts/temp/_diag.mjs` | 布局诊断：打印两页的滚动溢出与各分区尺寸并截图 |

正式的构建/运维脚本仍在 `scripts/` 根目录（`start.mjs`、`stop.mjs`）。

排障顺序建议：**先看 Runtime 日志是否存在 8200 的 LISTEN → 再 curl `/info` → 再跑 `_probe.mjs` → 最后才是看前端页面**。绝大多数"没反应"问题出在没有配置 `MODEL_API_KEY`。

---

## 七、旧文件去向

| 原文件 | 现状 |
|---|---|
| `src/utils/mockResponses.ts` | 旧模拟语料，无任何引用，已删除 |
| `src/components/ChatPage/useTypewriter.ts` | 打字机 hook，真实流式后不再是会话链路的一部分，但作为通用能力保留，迁至 `src/hooks/useTypewriter.ts`，需要时从 `src/hooks` 引入 |

---

## 八、后续可扩展方向

1. **多 Agent**：Runtime 侧 `agents` 里注册多个 agent（如 `chat` / `sql` / `ops`），前端 `useAgent({ agentId })` 切换
2. **会话持久化**：目前 `agent.setMessages([])` 即丢弃，可把 `agent.messages` 落 localStorage 或后端做历史会话
3. **工具可视化**：把 toolCalls 渲染成卡片（当前只显示一行 markdown 引用）
4. **鉴权**：在 devServer proxy / Nginx 层加 token 校验，Runtime 从请求头解析用户身份后注入 prompt
