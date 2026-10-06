import React from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import dayjs from 'dayjs';
import zhCnLocale from 'dayjs/locale/zh-cn';
import { CopilotKitProvider } from '@copilotkit/react-core/v2';
import { ErrorBoundary } from '../components';
import { API_BASE_URL, UI_TOKENS } from '../config';

/**
 * 全局固定使用简体中文。
 * antd 组件内置文案与 dayjs 日期文案默认都是英文，这里在模块加载时设定一次；
 * 本项目不做多语言切换，因此没有语言状态与 Provider。
 */
dayjs.locale(zhCnLocale);

/**
 * antd 配置：组件内置文案固定中文，尺寸取自主题令牌。
 * 主题色由 craco 的 less modifyVars 注入编译（见 src/config/theme.js）。
 */
const AntdBridge: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ConfigProvider locale={zhCN} componentSize={UI_TOKENS.antdSize}>
    {children}
  </ConfigProvider>
);

/**
 * 应用级 Provider 集合：错误边界 → antd 配置 → CopilotKit。
 * 新增全局能力（如消息总线）统一挂在这里，不要散落到页面。
 *
 * ErrorBoundary 放在最外层：既兜住 Provider 层自身的渲染异常，
 * 也避免任一组件抛错导致整页白屏。
 */
const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    <AntdBridge>
      <CopilotKitProvider
        runtimeUrl={API_BASE_URL.copilotkit}
        // enableInspector={false}：关闭开发期 Inspector 弹层与悬浮按钮，避免遮挡页面。
        // 运行时已支持该 prop，但当前版本类型声明遗漏，这里用兼容写法传入。
        {...({ enableInspector: false } as { enableInspector?: boolean })}
      >
        {children}
      </CopilotKitProvider>
    </AntdBridge>
  </ErrorBoundary>
);

export default AppProviders;
