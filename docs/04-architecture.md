# 04 · 架构说明

## 1. 整体链路

```
浏览器
  │  同源相对路径 /api/...
  ▼
CRA devServer 代理（开发）  /  Nginx 反代（生产）
  ├── /api/copilotkit  ──►  CopilotKit Runtime（8200）──► 模型服务
  └── /api/deepseek    ──►  DeepSeek 代理（8300）     ──► DeepSeek API
```

设计要点：

- **密钥不下发**：所有模型凭证只在 Node 侧读取，浏览器永远拿不到；
- **地址不硬编码**：前端只认同源相对路径，环境差异由代理层吸收；
- **部署免重打包**：`public/config.js` 里的运行时地址可随时改。

## 2. 应用装配层级

```
index.tsx
  └─ <StrictMode>
      └─ App  (src/app/App.tsx)
          └─ AppProviders              # LocaleProvider → ConfigProvider(antd) → CopilotKitProvider
              └─ BrowserRouter
                  └─ AppLayout         # 框架能力：导航、路由出口、全局 AI 助手
                      ├─ AppNav            # 顶部导航（菜单来自 constants/nav.ts）
                      ├─ AppCopilotBridge  # 注册前端工具，不渲染 UI
                      ├─ AppRouter         # 路由出口（懒加载 + Suspense）
                      ├─ CopilotSidebar    # 全局 AI 助手侧边栏
                      └─ AssistantDock     # 右下角悬浮开关（完整对话页自动隐藏）
```

装配原则：**Provider 集中在 `app/AppProviders.tsx`，框架能力集中在 `layouts/`，页面只写业务。**

## 3. 路由

- 路由表：`src/router/routes.tsx`，使用 `React.lazy` 按页面模块懒加载；
- 路径常量：`src/constants/routes.ts`，组件内禁止写死路径字符串；
- 动态路径用函数生成：`settlePoolEditPath(id)`；
- 404 由 `pages/not-found` 兜底（`path: '*'`）；
- 导航菜单：`src/constants/nav.ts`，业务与 AI 助手分组，选中态由当前路径推导（支持前缀匹配高亮父级）。

## 4. 两条 AI 链路

| 维度 | CopilotKit（`/chat` 与全局助手） | DeepSeek（`/ai-chat`） |
| --- | --- | --- |
| 目标 | 能读取并操作页面（前端工具） | 纯深度对话 |
| 前端 | `@copilotkit/react-core` v2 | 自研 `services/deepseek.ts` + SSE |
| 后端 | `server/copilotkit-server.mjs`（Runtime） | `server/deepseek-proxy.mjs`（转发 + 白名单） |
| 工具 | `useFrontendTool` 注册（模块感知、结算池、表单设计器） | 无 |
| 流式 | Runtime 内置 | `services/sse.ts` 手动解析 |

### 4.1 模块注册机制

- 业务页面通过 `features/copilot/moduleRegistry.ts` 注册自身（`id`、名称、摘要函数）；
- `AppCopilotBridge` 把注册表暴露成 `listModules` / `getModuleSummary` 等前端工具；
- 新增页面只要注册一次，助手即可感知，**无需改动助手逻辑**。

### 4.2 表单领域能力

- `features/form/registry`：字段组件注册表（设计器与渲染器共用）；
- `features/form/linkage-engine`：字段联动求值；
- `features/form/schema-validator`：Schema 校验；
- `components/form-renderer`：按 Schema 渲染，页面 `pages/form-renderer` 只做演示编排。

## 5. 关键设计决策

| 决策 | 原因 |
| --- | --- |
| 页面懒加载 | 首屏只加载首页代码，设计器/渲染器等重模块按需下载 |
| 请求统一走 services | 便于统一超时、取消、错误结构与后续替换传输层 |
| 文案统一进 locales | antd 组件文案与业务文案同步切换，避免中英混排 |
| 完整对话页隐藏全局助手 | 避免同一屏出现两套对话入口 |
| 通用 Hook 收进 `hooks/` | 与业务无关的通用逻辑（如打字机）单独成层，页面/组件按需复用 |
| 主题集中在 `config/theme.js` | 构建期 less 变量与运行期 UI 令牌同源，改主题只改一处 |
