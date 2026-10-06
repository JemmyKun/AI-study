# 部署指引

本项目接入 CopilotKit 后，部署形态从「纯静态 SPA」变为「**静态 SPA + 常驻 Node 服务（CopilotKit Runtime）**」。

- 前端：`npm run build` → `build/`，照旧托管到 Nginx / OSS / CDN
- Runtime：`server/copilotkit-server.mjs`，当成普通 Node 服务常驻运行（PM2 / systemd / Docker）
- 密钥：`MODEL_API_KEY` 等只存在于服务端环境变量，**绝不能**加 `REACT_APP_` 前缀（会被打进前端包）

---

## 一、推荐架构：同域 + 反向代理

```
浏览器 ──► Nginx(:80/:443)
             ├── /                → /var/www/app-ts-01/build（静态资源）
             └── /api/copilotkit  → 127.0.0.1:8200（CopilotKit Runtime）
```

优点：无跨域、无硬编码域名、同一份构建产物可部署到多环境（改 `config.js` 即可）。

另一种可选架构（Runtime 独立域名，如 `https://copilot.example.com`）：前端构建时注入
`REACT_APP_COPILOTKIT_RUNTIME_URL`，服务端配置 `COPILOT_CORS_ORIGIN` 白名单；
缺点是换环境必须重新打包。

---

## 二、构建前端

```bash
npm ci
npm run build          # 产物在 build/
```

前端 Runtime 地址解析优先级（`src/App.tsx`）：

1. `window.__COPILOT_RUNTIME_URL__`（来自 `public/config.js`，**部署后可直接改，无需重新打包**）
2. `REACT_APP_COPILOTKIT_RUNTIME_URL`（构建时注入，一般不用）
3. `/api/copilotkit`（默认，同源相对路径）

`public/config.js` 会被原样拷贝到 `build/config.js`：

```js
window.__COPILOT_RUNTIME_URL__ = '/api/copilotkit';
```

> 开发环境由 CRA devServer 将 `/api/copilotkit` 代理到 `127.0.0.1:8200`（见 `craco.config.js`），
> 因此开发与生产使用同一个地址，无需区分。

---

## 三、部署 Runtime 服务

### 1. 安装依赖

```bash
npm ci --omit=dev      # @copilotkit/runtime 在 dependencies 中，会被安装
```

### 2. 环境变量

```bash
mkdir -p /etc/app-ts-01
cat > /etc/app-ts-01/copilot.env <<'EOF'
MODEL_BASE_URL=https://api.deepseek.com
MODEL_API_KEY=sk-xxxxxx
COPILOT_MODEL=openai/deepseek-chat
COPILOT_RUNTIME_PORT=8200
COPILOT_RUNTIME_HOST=127.0.0.1
EOF
chmod 600 /etc/app-ts-01/copilot.env
```

### 3. PM2 守护（推荐）

```bash
pm2 start server/copilotkit-server.mjs \
  --name copilot-runtime \
  --env-file /etc/app-ts-01/copilot.env

pm2 save
pm2 startup          # 按输出的提示执行，实现开机自启
pm2 logs copilot-runtime
```

### 4. Docker（可选）

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server ./server
ENV COPILOT_RUNTIME_HOST=0.0.0.0
EXPOSE 8200
CMD ["node", "server/copilotkit-server.mjs"]
```

容器场景需把监听地址改为 `0.0.0.0`，并由容器网络/网关限制访问来源。

---

## 四、Nginx 配置

配置文件：`deploy/nginx.conf`

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/app-ts-01.conf
# 修改 server_name 与 root 后：
sudo ln -s /etc/nginx/sites-available/app-ts-01.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

关键片段（**不要删 `proxy_buffering off`**，否则 SSE 流式回答会被缓冲成一次性返回）：

```nginx
location / {
    try_files $uri $uri/ /index.html;        # SPA 路由兜底
}

location = /config.js {
    add_header Cache-Control "no-store";     # 便于部署后改地址即时生效
}

location /api/copilotkit/ {
    proxy_pass http://127.0.0.1:8200/api/copilotkit/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Connection '';
    chunked_transfer_encoding on;
    proxy_buffering off;          # 流式输出必需
    proxy_cache off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

---

## 五、监听地址与部署形态（重要）

Runtime 默认监听 `127.0.0.1:8200`，含义是「**只接受本机的连接**」。
外网用户访问的是 Nginx，由 Nginx 在本机回环地址上转发给 Runtime：

```
用户浏览器 ──(公网)──► Nginx :443
                          │
                          └──(本机 127.0.0.1:8200)──► Runtime
```

因此 8200 **不需要、也不应该**对外开放；只要 Nginx 与 Runtime 在同一台机器，保持默认值即可。

### 不同部署形态怎么设 `COPILOT_RUNTIME_HOST`

| 部署形态 | 反代与 Runtime 位置 | `COPILOT_RUNTIME_HOST` | 说明 |
|---|---|---|---|
| 传统云主机（推荐） | 同机 | `127.0.0.1`（默认） | 最安全，8200 完全不暴露 |
| Docker Compose | 同网络不同容器 | `0.0.0.0` | 容器内 127.0.0.1 只有自己可见，必须改；用服务名 `copilot-runtime:8200` 反代，**不要**把 8200 映射到宿主 |
| Kubernetes | Pod + Service/Ingress | `0.0.0.0` | 由 Service/Ingress 暴露，Pod 内不要绑回环 |
| Nginx 与 Runtime 分机 | 不同机器 | 内网 IP 或 `0.0.0.0` | 同时用安全组/防火墙只放行 Nginx 那台机器的 IP |

### Docker Compose 示例

```yaml
services:
  copilot-runtime:
    image: node:20-alpine
    working_dir: /app
    command: node server/copilotkit-server.mjs
    environment:
      COPILOT_RUNTIME_HOST: 0.0.0.0      # 容器内必须改为 0.0.0.0
      COPILOT_RUNTIME_PORT: 8200
      MODEL_BASE_URL: https://api.deepseek.com
      MODEL_API_KEY: ${MODEL_API_KEY}
      COPILOT_MODEL: openai/deepseek-chat
    volumes:
      - ./server:/app/server
    # 注意：不写 ports，8200 只在 compose 网络内可达
    networks: [app-net]

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./build:/usr/share/nginx/html:ro
      - ./deploy/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on: [copilot-runtime]
    networks: [app-net]

networks:
  app-net:
```

对应 Nginx 的 `proxy_pass` 改为容器服务名：

```nginx
location /api/copilotkit/ {
    proxy_pass http://copilot-runtime:8200/api/copilotkit/;
    ...
}
```

### 自检

```bash
# 云主机：应看到 127.0.0.1:8200（而不是 0.0.0.0:8200）
ss -lntp | grep 8200

# 本机可通（来自 Runtime 的 400 表示路由命中）
curl -X POST http://127.0.0.1:8200/api/copilotkit/agent/default/run -d '{}'

# 公网直连应失败（说明端口没暴露，符合预期）
curl -m 3 http://服务器公网IP:8200/api/copilotkit     # 连接超时/拒绝
```

---

## 六、环境变量一览

| 变量 | 作用 | 默认值 | 说明 |
|---|---|---|---|
| `MODEL_BASE_URL` | 模型接口地址 | - | OpenAI 兼容地址，末尾不要加 `/v1` |
| `MODEL_API_KEY` | 模型密钥 | - | **仅服务端**，不可加 `REACT_APP_` 前缀 |
| `COPILOT_MODEL` | 模型名 | `openai/deepseek-chat` | 如 `openai/gpt-4.1-mini` |
| `COPILOT_RUNTIME_PORT` | Runtime 端口 | `8200` | 只给本机反代访问 |
| `COPILOT_RUNTIME_HOST` | 监听地址 | `127.0.0.1` | 容器/多机改为 `0.0.0.0` |
| `COPILOT_CORS_ORIGIN` | CORS 白名单 | 空（关闭） | `*` 或 `https://a.com,https://b.com` |
| `REACT_APP_COPILOTKIT_RUNTIME_URL` | 前端地址（构建期） | 空 | 推荐留空，用 `config.js` |

模板见 `.env.example`。

---

## 七、安全清单

- [ ] `MODEL_API_KEY` 只在服务器环境变量/PM2 env，未提交到仓库（`.env` 已在 `.gitignore`）
- [ ] Runtime 只监听 `127.0.0.1`，防火墙未对外暴露 8200
- [ ] CORS 关闭或使用域名白名单，**不要**在生产用 `*`
- [ ] 站点启用 HTTPS（`X-Forwarded-Proto` 已透传）
- [ ] Nginx 保留 `proxy_buffering off`，保证流式输出

---

## 八、上线自检

```bash
# 1. 前端可访问
curl -I https://app.example.com/                      # 200

# 2. 运行时配置可读
curl https://app.example.com/config.js                # 含 __COPILOT_RUNTIME_URL__

# 3. Runtime 经反代可达（400/401 表示路由命中，404 表示路径未转发）
curl -X POST https://app.example.com/api/copilotkit/agent/default/run \
     -H 'Content-Type: application/json' -d '{}'

# 4. Runtime 进程存活
pm2 status copilot-runtime
```

---

## 九、常见问题

| 现象 | 原因 / 处理 |
|---|---|
| 回答一次性出现、没有打字机效果 | 反代层缓冲未关：`proxy_buffering off` |
| 前端 404 `/api/copilotkit` | Nginx location 未配置，或 Runtime 未启动（`pm2 status`） |
| 前端报 CORS 错误 | 前端用了跨域绝对地址；改回 `/api/copilotkit` 或配置 `COPILOT_CORS_ORIGIN` 白名单 |
| 502 Bad Gateway | Runtime 进程挂了，或 `COPILOT_RUNTIME_HOST`/端口与 Nginx 不一致 |
| 改了地址不生效 | 浏览器缓存 `config.js`；Nginx 已对该文件设 `no-store`，强刷即可 |
| 模型报鉴权失败 | 服务端 `MODEL_API_KEY` / `MODEL_BASE_URL` 未注入（PM2 需 `--env-file`） |
| 开发环境接口不通 | 未启动 `npm run dev`（它同时拉起前端与 Runtime），或 8200 被占用 |
