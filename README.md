# 智枢 · 智能业务平台

低代码表单 + 资金结算 + AI 助手的一体化前端工程。基于 Create React App（craco）与 antd v4，
内置两套 AI 能力：**CopilotKit Agent（可操作页面）** 与 **DeepSeek 对话（流式 + 思维链）**。

## 特性

- 低代码表单：拖拽设计器 + Schema 驱动渲染 + 字段联动与校验
- 资金结算池：状态流转、金额统计、结算单录入
- AI 助手：CopilotKit 前端工具可读取并操作业务模块；DeepSeek 直连模型流式对话
- 工程规范：分层目录、集中路由、统一请求封装、国际化、一键启停脚本

## 快速开始

```bash
npm install
cp .env.example .env      # 填写模型密钥（DEEPSEEK_API_KEY 或 MODEL_API_KEY）
npm run launch            # 前端 3000 + Runtime 8200 + DeepSeek 代理 8300
```

打开 http://localhost:3000 ，停止服务执行 `npm run stop`。
详见 [docs/01-快速开始](./docs/01-getting-started.md)。

## 目录速览

```
src/
├─ app/         应用装配与全局 Provider
├─ pages/       页面（一个目录一个路由）
├─ layouts/     导航、路由出口、全局 AI 助手
├─ features/    业务领域能力（copilot、form）
├─ components/  通用组件（form-renderer 等）
├─ hooks/       跨页面复用的通用 Hook
├─ services/    接口层（http / sse / deepseek）
├─ constants/   路由与导航常量
├─ config/      运行时配置出口（含主题唯一来源 theme.js）
├─ locales/     国际化（业务文案 + antd/dayjs 语言）
├─ router/      路由表
├─ styles/      全局样式与变量
└─ types/ utils/ 共享类型与工具
```

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run launch` | 一键启动前端 + Runtime + DeepSeek 代理 |
| `npm run stop` | 停止全部服务 |
| `npm start` | 仅启动前端 |
| `npm run build` | 生产构建到 `build/` |
| `npm test` | 运行测试 |

## 技术栈

React 18 · TypeScript · CRA + craco · antd 4 · React Router 7 · CopilotKit · Less

## 文档

- [文档索引](./docs/README.md)
- [项目结构](./docs/02-project-structure.md)
- [开发规范](./docs/03-conventions.md)
- [架构说明](./docs/04-architecture.md)
- [接口与服务](./docs/05-api-services.md)
- [国际化](./docs/06-i18n.md)
- [部署](./docs/07-deploy.md)
