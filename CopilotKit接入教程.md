# Web 前端接入 CopilotKit 教程

> 以本仓库（Create React App + craco + React 18 + TypeScript）的真实接入过程为例，最终效果：页面右侧常驻中文 **AI 助手**，能感知各业务模块（低代码表单配置、资金结算……），读取模块实时数据、操作表单设计器、跳转页面。
> 适用版本：CopilotKit `1.76.x`（v2 API）。其他 React 项目（Vite / React Router / Remix）只需替换启动命令，接入代码完全一致。

---

## 1. 先搞清楚架构

CopilotKit 分三层，缺一不可：

```
浏览器                          你的服务器                     模型服务
┌──────────────────────┐        ┌───────────────────────┐     ┌──────────────┐
│ CopilotKitProvider   │  HTTP  │  Copilot Runtime      │     │ OpenAI /     │
│  + CopilotSidebar    │ ─────► │  (BuiltInAgent)       │ ──► │ DeepSeek /   │
│  + useFrontendTool   │ ◄───── │  /api/copilotkit      │     │ Anthropic... │
└──────────────────────┘  SSE   └───────────────────────┘     └──────────────┘
```

- **前端**：`@copilotkit/react-core/v2` 提供 Provider、聊天 UI、`useFrontendTool` 等 Hook。
- **Runtime**：`@copilotkit/runtime/v2`，负责接模型、跑 Agent、向浏览器转发事件流。
- **关键认知（SPA 最容易踩）**：
  - Next.js 可以把 Runtime 写成路由，`runtimeUrl="/api/copilotkit"` 同源相对路径即可；
  - **纯客户端 SPA（CRA/Vite）没有服务端**，Runtime 必须是一个**独立进程**，前端要写**绝对地址** `http://localhost:8200/api/copilotkit`，并且 Runtime 必须**开启 CORS**。

---

## 2. 环境准备

| 依赖 | 要求 |
| --- | --- |
| Node.js | ≥ 20.6（用到 `node --env-file` 加载 `.env`） |
| React | ≥ 18 |
| 模型密钥 | OpenAI / DeepSeek / Anthropic / Google 任一 |

---

## 3. 安装依赖

```bash
# 前端 + Runtime
npm install @copilotkit/react-core @copilotkit/runtime zod

# 可选：一条命令并行启动前端和 Runtime
npm install -D concurrently
```

### 3.1 新增依赖清单（含开源协议）

| 包名 | 版本 | 依赖类型 | 用途 | 开源协议 |
| --- | --- | --- | --- | --- |
| `@copilotkit/react-core` | 1.76.0 | dependencies | 前端 Provider、聊天 UI（`/v2`）、`useFrontendTool` 等 Hook | **MIT** |
| `@copilotkit/runtime` | 1.76.0 | dependencies | Runtime 服务端：`CopilotRuntime` / `BuiltInAgent` / Node 监听器 | **MIT** |
| `zod` | 3.25.76 | dependencies | 声明前端工具的参数结构（`useFrontendTool` 依赖） | **MIT** |
| `concurrently` | 10.0.5 | devDependencies | 一条命令并行启动前端与 Runtime | **MIT** |
| `@copilotkit/react-ui` | 1.76.0 | dependencies（可选） | v1 时代的聊天 UI 组件包；**v2 组件与样式都在 `react-core/v2` 中，本项目未使用**，可 `npm uninstall @copilotkit/react-ui` 移除 | **MIT** |

随安装带入的主要间接依赖（仅运行时使用，无需显式安装，协议均为 **MIT**）：

| 包 | 用途 |
| --- | --- |
| `@copilotkit/shared` | 前后端共享类型与工具 |
| `@ag-ui/core` | AG-UI 事件协议（Agent ↔ 前端的事件流标准） |
| `mermaid` | 助手消息中的流程图/图表渲染 |
| `@modelcontextprotocol/sdk`、`openai`、`ai` 等 | Runtime 侧 MCP 与模型调用 |

协议来源：各包 `package.json` 的 `license` 字段，可用下面的命令随时复核：

```bash
node -e "['@copilotkit/react-core','@copilotkit/react-ui','@copilotkit/runtime','zod','concurrently'].forEach(p=>{const j=require('./node_modules/'+p+'/package.json');console.log(p, j.version, j.license)})"
```

### 3.2 开源协议与合规说明

- **CopilotKit 本体（`react-core` / `runtime` / `react-ui` / `shared`）为 MIT 协议**（仓库：<https://github.com/CopilotKit/CopilotKit>）。MIT 允许商用、修改、私有分发，唯一义务是**在分发时保留版权与许可声明**；软件按「原样」提供，不含任何担保。
- **间接依赖同样以各自 LICENSE 为准**（mermaid、`@ag-ui/core` 等主流依赖均为 MIT）。若要在产品中分发，建议用 `npm run build` 产物配合 `license-checker` 之类的工具生成完整的第三方许可清单。
- **开源 SDK ≠ 云服务**：CopilotKit 官方另有商业托管服务（CopilotKit Intelligence / Cloud，提供会话持久化、记忆、分析等）。本项目**未启用**，不需要任何平台 API Key；只有自托管 Runtime + 模型密钥。若将来启用，需遵循其商业条款。
- **遥测**：SDK 默认开启匿名遥测（启动日志中的 `telemetry enabled`）。可在 `.env` 或启动命令中关闭：

  ```ini
  COPILOTKIT_TELEMETRY_DISABLED=true
  ```

- **本项目自身**：`package.json` 为 `"private": true`，未声明 `license`。若日后要开源，自行添加 `"license": "MIT"` 并放置 `LICENSE` 文件即可，与使用 CopilotKit 无冲突。
- **版本选择提示**：1.68 之前的 v1 写法（`<CopilotKit>` + `useCopilotAction` / `useCopilotReadable`）已废弃，新项目请直接用 v2 API。

---

## 4. 配置环境变量 `.env`

```ini
# ============ 模型服务（DeepSeek，OpenAI 兼容）============
# 注意：地址末尾不要加 /v1，SDK 会自动拼接 /chat/completions
MODEL_BASE_URL=https://api.deepseek.com
MODEL_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
COPILOT_MODEL=openai/deepseek-chat

# 使用 OpenAI 官方时改为：
# MODEL_BASE_URL=https://api.openai.com/v1
# COPILOT_MODEL=openai/gpt-4.1-mini

# ============ Copilot Runtime ============
COPILOT_RUNTIME_PORT=8200

# ============ 前端 ============
REACT_APP_COPILOTKIT_RUNTIME_URL=http://localhost:8200/api/copilotkit
```

规则（CRA）：

- 只有 `REACT_APP_` 前缀的变量会被打进浏览器包 —— **模型密钥绝不能加这个前缀**，否则直接泄露。
- 无前缀变量（如 `MODEL_API_KEY`）供 Runtime 进程读取，CRA 不会暴露。
- 把 `.env` 加进 `.gitignore`，另存一份 `.env.example` 作为模板。

---

## 5. 编写 Runtime 服务

新建 `server/copilotkit-server.mjs`（`.mjs` 表示 ESM，Node 可直接运行，无需 tsx/打包）：

```js
import { createServer } from 'node:http';
import { BuiltInAgent, CopilotRuntime } from '@copilotkit/runtime/v2';
import { createCopilotNodeListener } from '@copilotkit/runtime/v2/node';

const port = Number(process.env.COPILOT_RUNTIME_PORT || 8200);
const model = process.env.COPILOT_MODEL || 'openai/deepseek-chat';

// 兼容通用命名：MODEL_API_KEY / MODEL_BASE_URL -> CopilotKit 读取的 OPENAI_*
if (process.env.MODEL_API_KEY) process.env.OPENAI_API_KEY = process.env.MODEL_API_KEY;
if (process.env.MODEL_BASE_URL) process.env.OPENAI_BASE_URL = process.env.MODEL_BASE_URL;

const runtime = new CopilotRuntime({
  agents: {
    // default 这个 key 会被前端自动选中，前端无需再配 agentId
    default: new BuiltInAgent({
      model,
      apiKey: process.env.OPENAI_API_KEY,
      prompt: [
        '你是「低代码表单配置系统」的内置智能助手。',
        '你可以查看当前表单结构、添加/删除字段、修改表单标题，并帮助用户跳转到对应页面。',
        '回答请使用中文，简洁明了。',
      ].join('\n'),
    }),
  },
});

const listener = createCopilotNodeListener({
  runtime,
  basePath: '/api/copilotkit',
  cors: true, // 前端与 Runtime 不同源，必须开启，否则预检失败
});

createServer(listener).listen(port, () => {
  console.log(`[copilot] Runtime 已启动: http://localhost:${port}/api/copilotkit`);
  console.log(`[copilot] 使用模型: ${model}`);
});
```

要点：

| 项 | 说明 |
| --- | --- |
| `BuiltInAgent` | CopilotKit 自带 Agent，直连模型；如果你已有 LangGraph / Mastra / ADK 等 Agent，用对应的 Agent 注册即可，不要用它 |
| `model` 格式 | `provider/model`，如 `openai/gpt-4.1-mini`、`openai/deepseek-chat`、`anthropic/claude-sonnet-4-6`、`google/gemini-2.5-flash` |
| 自定义接口地址 | OpenAI 系读 `OPENAI_BASE_URL`，Anthropic 读 `ANTHROPIC_BASE_URL`；因此 DeepSeek 配 `OPENAI_BASE_URL=https://api.deepseek.com` 即可 |
| `cors: true` | Node 监听器默认**关闭** CORS，SPA 必须显式打开（Express/Hono 适配器默认开启） |

在 `package.json` 加脚本：

```json
"scripts": {
  "start": "craco start",
  "copilot:runtime": "node --env-file=.env server/copilotkit-server.mjs",
  "dev": "concurrently -n web,runtime -c cyan,magenta \"npm run start\" \"npm run copilot:runtime\""
}
```

---

## 6. 前端接入（三步）

### 6.1 引入样式（入口文件一次即可）

`src/index.tsx`：

```tsx
import '@copilotkit/react-core/v2/styles.css';
```

样式是自包含的，不引会导致聊天界面无样式。

### 6.2 包裹 Provider

`src/App.tsx`：

```tsx
import { CopilotKitProvider, CopilotSidebar } from '@copilotkit/react-core/v2';

const COPILOT_RUNTIME_URL =
  process.env.REACT_APP_COPILOTKIT_RUNTIME_URL || 'http://localhost:8200/api/copilotkit';

function App() {
  return (
    <BrowserRouter>
      <CopilotKitProvider runtimeUrl={COPILOT_RUNTIME_URL}>
        {/* 你的路由 */}
        <Routes>...</Routes>

        <CopilotSidebar
          instructions="你是低代码表单配置系统的智能助手……请使用简体中文回答，简明扼要。"
          labels={COPILOT_LABELS}
        />
      </CopilotKitProvider>
    </BrowserRouter>
  );
}
```

- `runtimeUrl` 必须是**绝对地址**（SPA 场景）。
- `instructions` 是给模型的系统提示，决定它的人设与回答语言。
- Provider 要放在用到路由/聊天的作用域外层；若工具里要用 `useNavigate()`，Provider 必须在 `<BrowserRouter>` 内部。

### 6.3 选一种聊天布局

三个组件参数基本相同，换组件名即可：

| 组件 | 形态 |
| --- | --- |
| `<CopilotSidebar />` | 右侧可折叠侧边栏（本仓库选用） |
| `<CopilotPopup />` | 右下角浮窗 |
| `<CopilotChat />` | 整块聊天区，需父容器有高度 |

### 6.4 界面汉化

v2 用 `labels` 定制文案（v1 的 `labels: { title, initial }` 已不适用）。新建 `src/copilot/labels.ts`：

```ts
export const COPILOT_LABELS: Record<string, string> = {
  chatInputPlaceholder: '输入消息…',
  chatInputToolbarStartTranscribeButtonLabel: '语音输入',
  chatInputToolbarAddButtonLabel: '添加附件',
  chatInputToolbarToolsButtonLabel: '工具',
  assistantMessageToolbarCopyCodeLabel: '复制代码',
  assistantMessageToolbarCopyCodeCopiedLabel: '已复制',
  assistantMessageToolbarCopyMessageLabel: '复制',
  assistantMessageToolbarThumbsUpLabel: '回答不错',
  assistantMessageToolbarThumbsDownLabel: '回答不好',
  assistantMessageToolbarReadAloudLabel: '朗读',
  assistantMessageToolbarRegenerateLabel: '重新生成',
  userMessageToolbarCopyMessageLabel: '复制',
  userMessageToolbarEditMessageLabel: '编辑',
  chatDisclaimerText: 'AI 生成内容可能存在错误，请核实重要信息。',
  chatToggleOpenLabel: '打开对话',
  chatToggleCloseLabel: '关闭对话',
  modalHeaderTitle: 'Copilot 智能助手',
  welcomeMessageText: '我是表单配置助手，有什么可以帮您？',
  // 还有 assistantMessageToolbarInspector* 一组检查器文案，见仓库文件
};
```

未配置的字段会回退英文；字段全集可从 `node_modules/@copilotkit/react-core/dist/copilotkit-LD7Gp2aV.mjs` 里的 `CopilotChatDefaultLabels` 查看。

### 6.5 显示 / 隐藏开关（受控模式 + 自定义悬浮按钮）

`CopilotSidebar` 支持受控开关：把 `open` 交给外部 state，用 `onOpenChange` 同步内部触发的变化。

```tsx
/** 传入空组件即可隐藏侧边栏自带的悬浮按钮，改用我们自己的开关 */
const NoToggleButton: React.FC = () => null;

function App() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  // ...
  <CopilotSidebar
    open={copilotOpen}
    onOpenChange={setCopilotOpen}
    toggleButton={NoToggleButton}
    instructions="..."
    labels={COPILOT_LABELS}
  />

  {/* 自定义开关：右下角悬浮按钮，图标随状态切换 */}
  <Button
    type="primary"
    shape="circle"
    size="large"
    icon={copilotOpen ? <CloseOutlined /> : <RobotOutlined />}
    onClick={() => setCopilotOpen(v => !v)}
    title={copilotOpen ? '隐藏 AI 助手' : '显示 AI 助手'}
    // 固定高度，始终位于助手输入框上方
    style={{ position: 'fixed', right: 24, bottom: 160, zIndex: 2000, width: 48, height: 48 }}
  />
}
```

要点：

| 项 | 说明 |
| --- | --- |
| `open` / `onOpenChange` | 受控模式；不传则由组件自己管理（用 `defaultOpen` 设初始状态） |
| `toggleButton` | 只接受组件/字符串/props 对象，**不支持 `false`**；隐藏自带按钮要传一个返回 `null` 的组件 |
| 空组件定义在**组件外部** | 避免每次渲染生成新的组件类型导致重复挂载 |
| `zIndex` | 侧边栏打开时按钮仍要可点，给它更高的层级（如 2000） |
| 想省事 | 直接用 `<CopilotPopup />`，它自带右下角悬浮开合按钮；或保留 Sidebar 自带按钮（删掉 `toggleButton`） |

---

## 7. 深度集成：让助手操作你的应用（前端工具）

`useFrontendTool` 注册的函数会在**浏览器里执行**，因此能直接读写 React 状态、调用路由。

### 7.1 一个最小工具

```tsx
import { z } from 'zod';
import { useFrontendTool } from '@copilotkit/react-core/v2';

useFrontendTool({
  name: 'updateFormTitle',
  description: '修改当前表单的标题',
  parameters: z.object({
    title: z.string().describe('新的表单标题'),
  }),
  handler: async ({ title }) => {
    bridge.updateTitle(title);
    return `表单标题已更新为：${title}`;   // 返回值会回传给模型
  },
});
```

- `name`/`description`/`parameters` 是给模型看的，写清楚它才会正确调用；
- `handler` 的返回值作为工具结果进入对话上下文；
- 工具应在 **Provider 内部**的组件里注册。

### 7.2 页面状态如何暴露给工具（桥接模式）

页面内状态（如本仓库 `useDesigner` 的 schema）在 Provider 层拿不到，用一个模块级单例做桥接：

```ts
// src/copilot/formDesignerBridge.ts
export interface FormDesignerBridge {
  getSchema: () => FormSchema | null;
  addField: (type: string) => void;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  updateTitle: (title: string) => void;
}

let bridge: FormDesignerBridge | null = null;
export const setFormDesignerBridge = (next: FormDesignerBridge | null) => { bridge = next; };
export const getFormDesignerBridge = () => bridge;
```

页面挂载时注册、卸载时注销（用 ref 持有最新状态，避免 effect 反复触发）：

```tsx
// src/components/FormBuilder/FormBuilder.tsx
const designerRef = useRef(designer);
designerRef.current = designer;

useEffect(() => {
  setFormDesignerBridge({
    getSchema: () => designerRef.current.schema,
    addField: type => designerRef.current.addField(type),
    removeField: id => designerRef.current.removeField(id),
    updateField: (id, updates) => designerRef.current.updateField(id, updates),
    updateTitle: title => designerRef.current.updateTitle(title),
  });
  return () => setFormDesignerBridge(null);
}, []);
```

集中注册所有工具的组件 `src/copilot/AppCopilotBridge.tsx`（放在 Provider 内、返回 `null`）：

```tsx
const AppCopilotBridge: React.FC = () => {
  const navigate = useNavigate();

  useFrontendTool({ name: 'listFieldTypes', parameters: z.object({}), /* 列出可用字段类型 */ });
  useFrontendTool({ name: 'getFormSchema',  parameters: z.object({}), /* 读取当前表单结构 */ });
  useFrontendTool({ name: 'addFormField',   parameters: z.object({ type: z.string() }), /* 添加字段 */ });
  useFrontendTool({ name: 'removeFormField',parameters: z.object({ name: z.string() }), /* 删除字段 */ });
  useFrontendTool({ name: 'updateFormTitle',parameters: z.object({ title: z.string() }), /* 改标题 */ });
  useFrontendTool({
    name: 'navigateTo',
    parameters: z.object({ path: z.enum(['/', '/builder', '/renderer', '/chat']) }),
    handler: async ({ path }) => { navigate(path); return `已跳转到：${path}`; },
  });

  return null;
};
```

之后就可以直接用自然语言驱动应用：

> 「帮我看看现在表单有哪些字段」→ 调 `getFormSchema`
> 「加一个下拉选择字段」→ 调 `listFieldTypes` 再 `addFormField`
> 「把标题改成员工入职登记，然后去渲染页看看」→ `updateFormTitle` + `navigateTo`

### 7.3 执行链路：一句话是怎么变成页面变化的

以「加一个下拉选择字段」为例，完整链路（AG-UI 事件流）：

```
用户: "加一个下拉选择字段"
  │
  ├─① 浏览器 ──► Runtime：把"消息 + 已注册的前端工具清单(name/description/参数 JSON Schema)"发出去
  │
  ├─② Runtime(BuiltInAgent) ──► 模型：系统提示 + 工具定义 + 用户消息
  │
  ├─③ 模型决定调用工具：listFieldTypes()
  │     事件流 ToolCallStart → ToolCallArgs → ToolCallEnd 经 SSE 回到浏览器
  │
  ├─④ 浏览器执行 handler（在用户浏览器里跑！）
  │     componentRegistry.getAll() → 返回 [{"type":"select","label":"下拉选择"}, ...]
  │     结果作为 tool result 发回 Runtime → 模型
  │
  ├─⑤ 模型再调用：addFormField({ type: "select" })
  │     浏览器 handler → bridge.addField('select') → useDesigner 的 dispatch
  │     → React 状态更新 → 画布立刻多出一个字段（普通 React 渲染，无刷新）
  │
  └─⑥ 模型收到 "已添加字段：select"，生成中文回复 → RUN_FINISHED → 界面显示
```

三个必须理解的点：

1. **handler 运行在浏览器里**，所以它能直接读写 React 状态、调用 `navigate()`、访问 `localStorage` —— 这正是"操作前端页面"的本质。Runtime 和模型都不执行你的业务代码。
2. **工具是模型唯一能碰到的"手"**。模型不会自己去改 DOM，它只能调用你注册的工具；没注册的能力它做不到。
3. **工具返回值会进入模型上下文**，所以返回值要写成模型能读懂的内容（本项目统一返回中文字符串或简洁 JSON）。

### 7.4 模型是怎么"知道"页面信息的

**重要认知：模型看不到你的 DOM、截图或内存变量。** 它能看到的信息只有四个来源：

| 来源 | 由谁提供 | 本工程的位置 |
| --- | --- | --- |
| `instructions`（系统提示） | 你写死或动态拼 | `src/App.tsx` 的 `<CopilotSidebar instructions=...>` |
| 工具的 `name` / `description` | 你注册时写 | `src/copilot/AppCopilotBridge.tsx` |
| 工具的返回值 | handler 执行结果 | 同上 |
| 用户消息 | 用户输入 | — |

因此，本工程让模型知道"低代码表单配置"信息，靠的是**两个显式出口 + 一个桥接**：

```
FormBuilder(页面)                    CopilotKit(助手)
┌────────────────────────┐          ┌────────────────────────────┐
│ useDesigner()          │          │ useFrontendTool({           │
│  schema / addField ... │─注册──►  │   name:'getFormSchema',     │
└───────────┬────────────┘          │   handler: () =>            │
            │  setFormDesignerBridge│     bridge.getSchema() ...}) │
            ▼                       └────────────────────────────┘
   src/copilot/formDesignerBridge.ts   （模块级单例，页面卸载即注销）
```

- `getFormSchema`：返回当前表单的标题与字段摘要（`id/name/label/type/required`），做了裁剪，不把组件实例、校验规则等无关内容塞给模型。
- `listFieldTypes`：从 `componentRegistry` 读可用组件类型，保证模型拿到合法的 `type`（避免瞎猜类型导致添加失败）。
- 二者都通过 `getFormDesignerBridge()` 拿到页面里那份**活的**状态，所以读到的永远是最新值。

**两个实用增强（可选）**

1. **让写操作顺带返回最新状态**，省掉一次往返调用：

```tsx
handler: async ({ type }) => {
  bridge.addField(type);
  const latest = bridge.getSchema();
  return `已添加字段：${type}；当前表单共 ${latest?.fields.length ?? 0} 个字段：` +
         JSON.stringify(latest?.fields.map(f => ({ name: f.name, label: f.label, type: f.type })));
},
```

2. **把状态摘要放进 `instructions`**（模型每次请求都能看到，无需先调工具）：在桥接里加一个订阅，页面状态变化时通知 `App` 更新 state，再把摘要拼进 `instructions`。

```tsx
<CopilotSidebar
  instructions={`你是表单配置助手。当前表单标题：${title}；字段：${fieldSummary}。请用中文回答。`}
/>
```

注意：本工程的默认做法是"模型按需调 `getFormSchema`"，简单且无需全局状态改造；上面两种增强适合表单很大、希望少一次往返时用。

### 7.5 扩展一个新工具（以"设置字段必填"为例）

1. **确保页面能力已在桥接中**（`updateField` 已有，无需改 `formDesignerBridge.ts`）。
2. **在 `AppCopilotBridge.tsx` 注册工具**，描述写清楚、参数用 zod 声明：

```tsx
useFrontendTool({
  name: 'setFieldRequired',
  description: '把某个字段设为必填/非必填，name 为字段的 name（可通过 getFormSchema 获取）',
  parameters: z.object({
    name: z.string().describe('字段的 name'),
    required: z.boolean().describe('true 为必填，false 为非必填'),
  }),
  handler: async ({ name, required }) => {
    const bridge = getFormDesignerBridge();
    if (!bridge) return '当前不在表单设计器页面，无法修改字段。';
    const schema = bridge.getSchema();
    const target = schema?.fields.find(f => f.name === name);
    if (!target) return `未找到 name 为 ${name} 的字段。`;
    bridge.updateField(target.id, { required });
    return `已将字段 ${name} 设为${required ? '必填' : '非必填'}`;
  },
});
```

3. 无需改动 Runtime，刷新页面即可生效。

### 7.6 调试与边界

- **看不到工具调用？** 本地开发点开右下角 CopilotKit **Inspector → Agents → AG-UI Events**，能看到 ToolCall / ToolResult 事件流。
- **模型不调工具？** 通常是 `description` 写得含糊，或 `name` 与意图不匹配；把描述写成"什么时候该用它"。
- **安全边界**：模型只能调用注册过的工具，参数受 zod 校验；涉及删除、提交等危险操作时，可加 Human-in-the-loop（让工具先弹窗确认再执行）。
- **状态一致性**：模型上下文里的表单快照可能过期，需要最新数据时让它重新调 `getFormSchema`，或按 7.4 的增强把最新摘要放进返回值。

### 7.7 通用化：接入更多业务模块（以「资金结算」为例）

助手不应该是某个页面的专用工具。本工程的通用化机制：

```
业务页面（挂载时）                        AI 助手（全局，Provider 内）
┌──────────────────────────────┐        ┌─────────────────────────────────┐
│ FormBuilder    ─registerModule─►  │  listModules      → 列出已打开的模块  │
│ SettlementPage ─registerModule─►  │  getModuleSummary → 读模块实时摘要    │
│ （moduleRegistry 单例）        │        │  + 模块自己的 useFrontendTool        │
└──────────────────────────────┘        └─────────────────────────────────┘
```

- **全局通用工具**（`src/copilot/AppCopilotBridge.tsx` 注册一次）：`listModules`、`getModuleSummary`、`navigateTo`。
- **模块注册表**（`src/copilot/moduleRegistry.ts`）：页面挂载时 `registerModule({ id, name, description, getSummary })`，卸载时自动注销，助手于是"知道"当前有哪些模块、每个模块里是什么数据。
- **模块专属工具**：直接写在模块页面组件里（`useFrontendTool` 遵守 React hooks 规则，页面卸载即自动注销）。

新增一个「资金结算」模块只需两步：

```tsx
// 资金结算页面组件内
import { z } from 'zod';
import { useFrontendTool } from '@copilotkit/react-core/v2';
import { registerModule } from '../../copilot/moduleRegistry';

const SettlementPage: React.FC = () => {
  const [records, setRecords] = useState<SettlementRecord[]>([]); // 结算单列表
  const [filters, setFilters] = useState<SettlementFilters>({});  // 筛选条件

  // ① 登记模块上下文：助手通过 listModules / getModuleSummary 即可感知本模块
  useEffect(() => {
    return registerModule({
      id: 'settlement',
      name: '资金结算',
      description: '跨境收付款结算单：查询、筛选、统计（结算单号/结算类型/金额/币种/状态/对手方等）',
      getSummary: () => ({
        total: records.length,
        byStatus: countBy(records, 'status'),    // { 已付款: 5, 待付款: 3, 付款失败: 1 }
        byCurrency: countBy(records, 'currency'),
        filters,                                  // 当前筛选条件
      }),
    });
  }, [records, filters]); // 数据变化时刷新摘要

  // ② 页面专属工具：助手可直接按条件查询明细
  useFrontendTool({
    name: 'querySettlements',
    description: '按条件查询资金结算单列表，返回前 20 条',
    parameters: z.object({
      status: z.string().optional().describe('结算状态，如 待付款、已付款、付款失败'),
      currency: z.string().optional().describe('币种，如 HKD、USD'),
      keyword: z.string().optional().describe('按结算单号/本方账号/对手方名称模糊匹配'),
    }),
    handler: async (cond) => {
      const rows = applyFilters(records, cond);
      return JSON.stringify({ total: rows.length, rows: rows.slice(0, 20) });
    },
  });

  // ……页面原有逻辑
};
```

之后用户可以直接问：「资金结算里还有多少笔待付款？」「查一下这周 HKD 的付款失败单子」，模型会先 `getModuleSummary('settlement')` 看统计，再用 `querySettlements` 查明细。

实践要点：

- `getSummary` 返回**统计摘要**而不是全量数据，明细通过带条件的查询工具按需获取，且要**截断返回**（如前 20 条），防止撑爆模型上下文。
- 写操作（如「把这笔单子标记为已付款」）同样加 `useFrontendTool`，建议配合 Human-in-the-loop 让用户确认。
- 模块未打开时注册表里就没有它，助手会如实回答「未找到模块」——这正是预期行为，避免模型对不存在的数据编造。

---

## 8. CRA / TypeScript 项目的坑位与解法

| 现象 | 原因 | 解法 |
| --- | --- | --- |
| TS 报「找不到模块 `@copilotkit/react-core/v2`」 | CRA 强制 `moduleResolution: "node"`（node10），不认包 `exports` 子路径 | 手写声明文件（见下），webpack 5 原生支持 exports，运行时不受影响 |
| `tsc` 报 `@types/d3-dispatch` 语法错误（TS1139） | CopilotKit → streamdown → mermaid → `@types/d3-*`，新语法 TS 4.9 解析不了 | `tsconfig.json` 限定 `"types": ["node","jest","react","react-dom"]` |
| 聊天界面能渲染但一直不回复 | Runtime 未开 CORS，预检被拦 | `createCopilotNodeListener({ cors: true })` |
| 请求 404 | `runtimeUrl` 写成了相对路径 | SPA 必须写全 `http://localhost:8200/api/copilotkit` |
| 一堆 `Failed to parse source map` 警告 | 依赖未发布 sourcemap | 无害，可忽略 |
| 界面是英文 | v1 的 `labels` 字段已变更 | 用 v2 的 `modalHeaderTitle` / `welcomeMessageText` 等字段 |

类型声明补丁 `src/types/copilotkit-v2.d.ts`：

```ts
declare module '@copilotkit/react-core/v2' {
  import type { FC, ReactNode } from 'react';

  export const CopilotKitProvider: FC<{
    runtimeUrl?: string; agentId?: string; headers?: Record<string, string>; children?: ReactNode;
  }>;
  export const CopilotSidebar: FC<{
    instructions?: string; defaultOpen?: boolean; labels?: Record<string, string>; children?: ReactNode;
  }>;
  export const CopilotPopup: FC<{ instructions?: string; labels?: Record<string, string> }>;
  export function useFrontendTool<TArgs = any>(config: {
    name: string; description?: string; parameters?: any;
    handler: (args: TArgs) => any | Promise<any>; render?: any;
  }): void;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly REACT_APP_COPILOTKIT_RUNTIME_URL?: string;
  }
}
```

（Vite / Next.js 项目若使用 `moduleResolution: "bundler"`，可直接享受真实类型，无需此补丁。）

---

## 9. 启动与验证

```bash
npm run dev              # 同时启动前端(3000) 与 Runtime(8200)
# 或分两个终端
npm start                # 前端
npm run copilot:runtime  # Runtime
```

验收清单：

1. Runtime 就绪：`curl http://localhost:8200/api/copilotkit/info`，返回 JSON 且 `agents` 中含 `default`。
2. 前端打开 `http://localhost:3000`，右下角/右侧出现中文助手入口。
3. 发一条消息，模型流式返回中文；再试一句「添加一个输入框字段」，画布应实时新增字段。
4. 用错模型密钥时先看 Runtime 终端日志：会打印所用模型与接口地址。

---

## 10. 本仓库相关文件

```
server/copilotkit-server.mjs          Runtime 服务（模型、Agent、CORS）
src/index.tsx                         引入 v2 样式
src/App.tsx                           CopilotKitProvider + CopilotSidebar（通用 AI 助手）
src/copilot/labels.ts                 界面中文文案
src/copilot/AppCopilotBridge.tsx      通用工具（listModules/getModuleSummary/navigateTo）+ 表单工具
src/copilot/moduleRegistry.ts         业务模块注册表（页面挂载登记、卸载注销）
src/copilot/formDesignerBridge.ts     表单设计器状态桥接单例
src/types/copilotkit-v2.d.ts          CRA 的 v2 子路径类型补丁
.env / .env.example                   模型密钥与 Runtime 地址
tsconfig.json                         types 白名单（规避 d3 类型报错）
```

---

## 11. 进阶方向

- **Generative UI**：让助手输出结构化内容并渲染成你自己的组件。
- **Human-in-the-loop**：关键操作（如删除字段）先弹窗让用户确认再执行。
- **Headless UI**：不用内置聊天界面，用 `useAgent` 自己做对话 UI。
- **接入自有 Agent**：把 `BuiltInAgent` 换成 LangGraph / Mastra / Pydantic AI 等 Agent 注册进 `agents`。
- **CopilotKit Intelligence**：托管会话历史、用户记忆与分析。
- **生产部署**：Runtime 独立部署，前端用环境变量指向线上地址；按来源配置 CORS，不要长期 `origin: *`。
