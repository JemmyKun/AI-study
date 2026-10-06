import React from 'react';
import { BrowserRouter } from 'react-router-dom';
// 副作用导入：启动阶段注册默认字段组件，设计器与渲染器都依赖这张注册表
import '../features/form/registry/defaultComponents';
import AppLayout from '../layouts/AppLayout/AppLayout';
import AppProviders from './AppProviders';

/**
 * 应用根组件：只负责装配，不含业务逻辑。
 * 层级：AppProviders（语言/antd/CopilotKit） → BrowserRouter → AppLayout（导航+路由+助手）
 */
const App: React.FC = () => (
  <AppProviders>
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  </AppProviders>
);

export default App;
