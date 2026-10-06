/**
 * 运行时配置（不参与打包，部署后可直接改这个文件，无需重新构建）
 *
 * 默认走同源相对路径 /api/copilotkit：
 * - 开发环境：由 CRA devServer 代理到 127.0.0.1:8200（见 craco.config.js）
 * - 生产环境：由 Nginx 反向代理到 Runtime 服务（见 deploy/nginx.conf）
 *
 * 若 Runtime 独立部署在别的域名，改成绝对地址即可，
 * 同时需要在服务端配置 COPILOT_CORS_ORIGIN 允许该站点跨域。
 */
window.__COPILOT_RUNTIME_URL__ = '/api/copilotkit';

/**
 * DeepSeek 对话页（/ai-chat）的接口地址，规则同上：
 * - 开发环境：CRA devServer 代理到 127.0.0.1:8300
 * - 生产环境：Nginx 反代到 DeepSeek 代理服务
 * 跨域独立部署时改成绝对地址，并在服务端配置 DEEPSEEK_CORS_ORIGIN。
 */
window.__DEEPSEEK_API_URL__ = '/api/deepseek';
