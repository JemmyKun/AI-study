# 03 · 开发规范

## 1. 命名规范

| 对象 | 规则 | 示例 |
| --- | --- | --- |
| 目录（页面 / 领域 / 工具） | kebab-case | `pages/settle-pool/`、`features/form/` |
| 目录（组件） | PascalCase | `components/RouteFallback/` |
| 组件文件 | PascalCase，与组件同名 | `MessageItem.tsx` |
| Hook 文件 | camelCase，以 `use` 开头 | `useDeepSeekChat.ts` |
| 普通 TS 文件 | kebab-case | `linkage-engine.ts`、`schema-validator.ts` |
| 样式文件 | 与组件同名 | `ChatPage.css`、`FormBuilder.less` |
| 类型文件 | kebab-case | `settle-pool.ts` |
| 常量 | UPPER_SNAKE（值）/ PascalCase（类型） | `ROUTES`、`NavItem` |
| 组件 Props 接口 | `XxxProps` | `InputBoxProps` |

## 2. 组件规范

- 统一函数组件 + 显式类型：`const Xxx: React.FC<XxxProps> = ({ ... }) => ...`；
- 默认导出组件，目录内提供 `index.ts` 桶文件；
- 一个文件一个组件；组件私有的子组件放在同目录或同文件下方，不外泄；
- props 必须声明接口，禁止 `any` 泛滥（第三方实例可用 `unknown` + 断言收敛）；
- 组件不做数据请求的具体实现，请求统一走 `services/`，由页面或 hook 编排。

## 3. 状态与副作用

- 页面级状态封装在页面目录的 `useXxx.ts` hook 里，组件保持"薄"；
- `setState` 的 updater 必须是纯函数，禁止在 updater 内发起副作用（StrictMode 下会执行两次）；
- 需要同步读取最新 state 时用 ref，而不是在 updater 里做副作用；
- 卸载时必须中止进行中的请求（`AbortController`），并用 `aliveRef` 避免卸载后 setState；
- 流式渲染要做节流（如 `requestAnimationFrame`），不要每个 token 触发一次更新。

## 4. 请求与数据

- 组件内禁止直接 `fetch`，统一用 `src/services/`；
- 地址一律来自 `src/config/`，禁止硬编码域名与端口；
- 错误统一收敛为 `ApiError`，展示层只负责翻译成用户文案；
- 流式接口用 `services/sse.ts`，业务解析放在对应的 service 里。

## 5. import 约定

- 同目录用 `./Xxx`，跨目录用相对路径，目录过深时优先调整目录而不是堆 `../`；
- 跨层引用优先走桶文件（`import { ROUTES } from '../../constants'`）；
- 桶文件约定：`components`、`features`、`hooks`、`layouts`、`constants`、`config`、`router`、`services`、`types`、`utils` 均提供 `index.ts`；
  `pages/` 不提供桶文件（会把全部页面拉进主包，破坏路由懒加载），按需直接 import 具体页面；
  副作用模块（如 `features/form/registry/defaultComponents`）不进桶文件，避免"引用即注册"的隐式行为；
- 禁止反向依赖：低层（`components`/`utils`/`types`）不得 import 高层（`pages`/`layouts`）；
- 禁止在业务代码里直接 `require` 或动态拼接模块路径。

## 6. 样式约定

- 全局样式只在 `src/styles/global.css`；
- 组件/页面样式与组件同名、同目录，类名带前缀避免冲突（如 `ds-`、`hp-`、`app-nav-`）；
- 需要 less 变量时统一放 `src/styles/variables.less`；
- antd 主题的唯一来源是 `src/config/theme.js`：构建期由 `craco.config.js` 的 `modifyVars` 注入，运行期通过 `UI_TOKENS` 读取（如 `componentSize`）；
  改主题只改这一个文件，不要在组件里覆盖全局变量、也不要在 craco 里另写一份。

## 7. 文案约定

- 本项目固定使用简体中文，不做多语言切换，文案直接写在组件里，不额外抽字典；
- antd 组件文案与 dayjs 日期文案在 `src/app/AppProviders.tsx` 一次性设定为中文（antd 默认是英文）；
- 面向模型的文案（如 CopilotKit 工具 `description`）同样固定中文，见 `src/features/copilot/labels.ts`。

## 8. 代码提交前检查

```bash
npx tsc --noEmit                    # 类型必须零错误
npm run lint                        # 不允许新增 error/warning（npm run lint:fix 可自动修复）
npm run build                       # 构建通过
```

lint 规则在 `package.json` 的 `eslintConfig` 中维护，当前启用：
`import/order`、`no-console`（仅允许 `warn`/`error`）、`no-nested-ternary`、
`no-else-return`、`eqeqeq`、`prefer-const`、`no-var`。
多层三元请改为查表或提前 return，不要靠 `eslint-disable` 绕过。
