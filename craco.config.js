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
  jest: {
    // 用 configure 保证与 CRA 默认配置合并，而不是整体覆盖
    configure: jestConfig => {
      jestConfig.moduleNameMapper = {
        ...jestConfig.moduleNameMapper,
        // react-router v7 的内部依赖写成 exports 子路径（react-router/dom），
        // 而 CRA 自带的 jest 走 node10 解析规则、读不到 exports 字段。
        // 不映射的话，任何牵涉路由的测试都会报 Cannot find module 'react-router/dom'。
        '^react-router/dom$': '<rootDir>/node_modules/react-router/dist/development/dom-export.js',
        // babel-plugin-import 让业务代码直接引用 antd/es/*（按需加载 + less 源码），
        // 但 jest 默认不转换 node_modules，这些未编译的 ESM 会报 SyntaxError。
        // antd v4 同时发布 CJS 的 lib/，映射到它即可，无需放开 transformIgnorePatterns。
        '^antd/es/(.*)$': '<rootDir>/node_modules/antd/lib/$1',
        '^rc-([^/]+)/es/(.*)$': '<rootDir>/node_modules/rc-$1/lib/$2',
      };
      // antd 生态（@ant-design/*、rc-*）的部分产物是未编译 ESM，
      // 默认「不转换 node_modules」会让它们报 SyntaxError，
      // 这里只放行这一类包，其余 node_modules 仍然跳过转换以保住速度。
      jestConfig.transformIgnorePatterns = [
        '[/\\\\]node_modules[/\\\\](?!(@ant-design|rc-[^/]+)[/\\\\]).+\\.(js|mjs|jsx|ts|tsx)$',
        '^.+\\.module\\.(css|sass|scss)$',
      ];
      return jestConfig;
    },
  },
};
