# 02 · 项目结构

## 1. 顶层结构

```
app-ts-01/
├─ docs/                 # 工程文档（唯一文档目录）
│  └─ archive/           # 历史记录，仅供追溯
├─ public/               # 静态资源与运行时配置 config.js
├─ scripts/              # 启动/停止等工程脚本
│  └─ temp/              # 临时排查脚本（不参与构建）
├─ server/               # 本地后端服务（Node，ESM）
│  ├─ copilotkit-server.mjs
│  └─ deepseek-proxy.mjs
├─ deploy/               # 部署配置（nginx.conf）
├─ src/                  # 前端源码
├─ craco.config.js       # CRA 配置覆盖（less / babel-import / devServer 代理）
├─ tsconfig.json
├─ .editorconfig         # 编辑器基础约定
└─ .env.example          # 环境变量样例（复制为 .env 后生效）
```

## 2. src 目录分层

```
src/
├─ app/                  # 应用装配：App.tsx（根组件）、AppProviders.tsx（Provider 集合）
├─ assets/               # 图片、字体等静态资源
├─ components/           # 与业务无关的通用组件（可跨页面复用）
│  ├─ form-renderer/     # Schema 驱动的表单渲染引擎
│  │                     # FormRenderer / GridRenderer / ListRenderer / FieldRenderer
│  │                     # useDataSource（数据源）、useLinkage（联动）
│  └─ RouteFallback/     # 路由懒加载占位
├─ config/               # 运行时配置唯一出口
│  ├─ env.ts             # 服务地址、应用元信息、环境开关、超时
│  ├─ theme.js           # 主题唯一来源（构建期 less 变量 + 运行期 UI 令牌）
│  └─ index.ts
├─ constants/            # 纯数据常量
│  ├─ routes.ts          # 路由路径
│  ├─ nav.ts             # 导航与菜单配置
│  └─ index.ts
├─ features/             # 业务能力模块（按领域聚合，不是按技术类型）
│  ├─ copilot/           # CopilotKit 桥接：前端工具、文案、模块注册
│  └─ form/              # 表单领域
│     ├─ registry/       # 组件注册表、联动注册表
│     │                  # defaultComponents.tsx 为副作用模块（导入即注册），不进桶文件
│     ├─ linkage-engine.ts
│     └─ schema-validator.ts
├─ hooks/                # 跨页面复用的通用 Hook（与业务无关）
│  └─ useTypewriter.ts   # 打字机效果（流式文案渲染）
├─ layouts/              # 布局与框架组件
│  ├─ AppLayout/         # 整体框架（导航 + 内容区）
│  ├─ AppNav/            # 顶部导航
│  └─ AssistantDock/     # 悬浮助手开关
├─ locales/              # 国际化
│  ├─ messages/          # zh-CN.ts（源字典）、en-US.ts（必须全量覆盖）
│  ├─ antd.ts            # 业务语言 → antd 语言包映射
│  ├─ dayjs.ts           # dayjs 全局语言同步（日期面板的月份/星期）
│  └─ index.tsx          # LocaleProvider、useLocale
├─ pages/                # 页面：一个路由一个目录，私有组件/hook/样式就近存放
│  ├─ home/              # 首页
│  ├─ form-builder/      # 表单设计器（调色板、画布、属性、联动、预览）
│  ├─ form-renderer/     # 表单渲染示例页
│  ├─ chat/              # CopilotKit 对话页
│  ├─ deepseek-chat/     # DeepSeek 流式对话页
│  ├─ settle-pool/       # 结算池列表与编辑
│  └─ not-found/         # 404 兜底页
├─ router/               # 路由
│  ├─ routes.tsx         # 集中式路由表（懒加载 + 元信息）
│  └─ AppRouter.tsx      # 路由出口
├─ services/             # 接口层
│  ├─ http.ts            # 统一请求封装（ApiError、超时、中止）
│  ├─ sse.ts             # SSE 流式解析
│  └─ deepseek.ts        # DeepSeek 业务接口
├─ styles/               # 全局样式与 less 变量
├─ types/                # 跨模块共享类型 + 第三方缺失声明（*.d.ts）
├─ utils/                # 通用工具（纯函数）
├─ index.tsx             # 应用入口
├─ setupTests.ts
└─ reportWebVitals.ts
```

## 3. 各层职责与约束

| 层 | 职责 | 允许依赖 | 禁止 |
| --- | --- | --- | --- |
| `app/` | 组合 Provider、挂载根组件 | `layouts`、`locales`、`config`、`router` | 写业务逻辑 |
| `layouts/` | 导航、路由出口、全局助手等框架能力 | `pages`、`features`、`constants`、`locales` | 写具体业务规则 |
| `pages/` | 一个路由对应一个目录，页面私有组件/hook/样式就近存放 | `components`、`features`、`hooks`、`services`、`constants` | 跨页面互相 import |
| `features/` | 按领域聚合的能力（注册表、引擎、桥接） | `types`、`utils` | 依赖 `pages` |
| `components/` | 无业务语义的可复用 UI | `types`、`utils`、`hooks` | 依赖 `pages`、`features` |
| `hooks/` | 跨页面复用的自定义 Hook | `types`、`utils` | 依赖 `pages`、`features`、`services` |
| `services/` | 接口访问与数据转换 | `config` | 直接操作 DOM / 引入组件 |
| `constants/` | 纯数据与常量 | `locales` 的类型 | 写副作用 |
| `config/` | 环境变量、运行时配置、主题的唯一出口 | — | 散落的 `process.env` |

## 4. 新代码放哪里

| 场景 | 位置 |
| --- | --- |
| 新增一个路由页面 | `src/pages/<模块名>/`（同步登记 `router/routes.tsx`、`constants/routes.ts`） |
| 页面内私有子组件 | 与页面同目录 |
| 被两个以上页面复用 | `src/components/` |
| 被两个以上页面复用的 Hook | `src/hooks/` |
| 某个业务领域的能力（规则引擎、注册表） | `src/features/<领域>/` |
| 新的后端接口调用 | `src/services/` |
| 新的路径/菜单项 | `src/constants/routes.ts`、`src/constants/nav.ts` |
| 新的文案 | `src/locales/messages/zh-CN.ts`（同步 `en-US.ts`） |
| 跨页面共享类型 | `src/types/` |

> 判断口诀：**能被别的页面复用就上提一层，只服务当前页面就留在页面目录内。**

## 5. 桶文件清单

提供 `index.ts` 的目录（跨层引用一律走桶文件）：

`components`、`features`、`hooks`、`layouts`、`config`、`constants`、`locales`、`router`、`services`、`types`、`utils`

不提供桶文件的目录：

- `pages/`：会把全部页面打进主包，破坏路由懒加载，请按需直接 import 具体页面；
- `app/`：根组件与 Provider 装配，无对外导出价值；
- `assets/`、`styles/`：非 JS 模块；
- `features/form/registry/defaultComponents.tsx`：副作用模块（导入即注册默认字段组件），由 `features/form/index.ts` 显式导入，避免"引用即注册"的隐式行为。
