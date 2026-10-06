# deploy 目录

存放部署相关的配置文件，完整部署指引见项目根目录 **[DEPLOY.md](../DEPLOY.md)**。

| 文件 | 用途 |
|---|---|
| `nginx.conf` | Nginx 示例：托管 SPA 静态资源 + 反代 `/api/copilotkit` 到 Runtime（含 SSE 所需的 `proxy_buffering off`） |

## 最快上线三步

```bash
# 1. 构建前端
npm ci && npm run build

# 2. 启动 Runtime（PM2 守护）
pm2 start server/copilotkit-server.mjs --name copilot-runtime --env-file /etc/app-ts-01/copilot.env
pm2 save

# 3. 配置 Nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/app-ts-01.conf
sudo ln -s /etc/nginx/sites-available/app-ts-01.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

部署后若要更换 Runtime 地址，直接修改 `build/config.js` 中的
`window.__COPILOT_RUNTIME_URL__` 即可，无需重新打包。
