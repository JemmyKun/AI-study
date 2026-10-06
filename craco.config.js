const CracoLessPlugin = require('craco-less');
const { ANTD_LESS_VARS } = require('./src/config/theme');

module.exports = {

  // 开发环境把 /api/copilotkit 代理到本地 Runtime，
  // 这样前端开发和生产都使用同源相对地址，无需 CORS、无需硬编码端口
  devServer: {
    proxy: {
      '/api/copilotkit': {
        target: `http://127.0.0.1:${process.env.COPILOT_RUNTIME_PORT || 8200}`,
        changeOrigin: true,
      },
      // DeepSeek 独立代理（/ai-chat 页面使用）
      '/api/deepseek': {
        target: `http://127.0.0.1:${process.env.DEEPSEEK_PROXY_PORT || 8300}`,
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      plugin: CracoLessPlugin,
      options: {
        lessLoaderOptions: {
          lessOptions: {
            javascriptEnabled: true,
            // antd v4 主题定制：唯一来源是 src/config/theme.js，改主题只改那里
            modifyVars: ANTD_LESS_VARS,
          },
        },
      },
    },
  ],
  babel: {
    plugins: [
      ['import', { libraryName: 'antd', libraryDirectory: 'es', style: true }, 'antd'],
    ],
  },
};
