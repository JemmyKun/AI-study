# 05 · 接口与服务

## 1. 分层

```
页面 / hook
   ↓  调用
services/deepseek.ts  （业务语义：健康检查、流式对话、delta 解析）
   ↓  复用
services/http.ts      （JSON 请求：超时、取消、错误收敛）
services/sse.ts       （SSE 流式：读取 data 行）
   ↓  使用
config/env.ts         （地址解析）
```

## 2. 地址解析（config/env.ts）

优先级：

1. `window.__DEEPSEEK_API_URL__` / `window.__COPILOT_RUNTIME_URL__`（`public/config.js`，部署后可改）；
2. `process.env.REACT_APP_*`（构建时注入）；
3. 同源相对路径（`/api/deepseek`、`/api/copilotkit`）。

组件里不要出现 `process.env` 或 `window.__XXX__`，一律从 `src/config` 取。

## 3. JSON 请求（services/http.ts）

```ts
import { http, ApiError } from '../../services';

try {
  const data = await http.get<HealthInfo>('/api/deepseek/health');
} catch (err) {
  if (err instanceof ApiError && err.isNetworkError) { /* 服务未启动 */ }
}
```

能力：

| 能力 | 说明 |
| --- | --- |
| 超时 | 默认 `DEFAULT_TIMEOUT`（30s），可逐次覆盖；超时抛 `ApiError(status=0)` |
| 取消 | 传入外部 `signal`，取消时原样抛出 `AbortError`，与超时区分 |
| 错误 | 非 2xx 统一 `ApiError`，优先读取 `{ error.message }` / `{ message }` |
| 空响应 | `204`/空体返回 `undefined`，不做 JSON 解析 |
| 查询参数 | `query` 对象自动拼到 URL，值为 `undefined` 时忽略 |

## 4. SSE 流式（services/sse.ts）

```ts
await streamSse(url, { method: 'POST', body, signal }, data => {
  // data 为单个事件的 data 内容（多行 data 已合并）
});
```

- 按空行切分事件，半包留到下轮拼接，避免中文被截断；
- 只做传输解析，`[DONE]` 与业务字段解析由上层 service 负责；
- 不设超时（流式时长不可预期），由调用方用 `AbortController` 控制。

## 5. DeepSeek 服务（services/deepseek.ts）

| 方法 | 说明 |
| --- | --- |
| `fetchHealth(signal?)` | 返回 `{ configured, model, allowedModels }`，用于状态灯与模型白名单 |
| `streamChat(params, onDelta, signal?)` | 流式对话，`onDelta({ content?, reasoning? })` 逐段回调 |

后端接口（`server/deepseek-proxy.mjs`）：

| 接口 | 方法 | 说明 |
| --- | --- | --- |
| `/api/deepseek/health` | GET | 密钥是否配置、默认模型、可用模型白名单 |
| `/api/deepseek/chat` | POST | SSE 流式对话；模型白名单与系统提示词在服务端校验注入 |

## 6. CopilotKit Runtime

- 服务：`server/copilotkit-server.mjs`，端口 8200；
- 前端通过 `CopilotKitProvider` 的 `runtimeUrl` 连接（来自 `config`）；
- 前端工具由 `features/copilot/AppCopilotBridge.tsx` 注册。

## 7. 新增一个接口的步骤

1. 在 `src/services/` 新建 `<domain>.ts`，定义入参/出参类型；
2. 复用 `http` 或 `streamSse`，不要自己 `fetch`；
3. 在 `src/services/index.ts` 桶文件导出；
4. 页面/hook 只调用 service，不感知 URL；
5. 若是新后端服务：在 `server/` 新建 `.mjs`，并在 `craco.config.js` 增加 devServer 代理前缀、
   在 `scripts/start.mjs` / `scripts/stop.mjs` 登记端口。
