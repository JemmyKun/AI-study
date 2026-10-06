import React from 'react';
import { ConfigProvider } from 'antd';
import { CopilotKitProvider } from '@copilotkit/react-core/v2';
import { API_BASE_URL, UI_TOKENS } from '../config';
import { LocaleProvider, ANTD_LOCALES, useLocale } from '../locales';

/**
 * antd 配置：组件内置文案跟随语言，尺寸取自主题令牌。
 * 主题色由 craco 的 less modifyVars 注入编译（见 src/config/theme.js）。
 */
const AntdBridge: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { locale } = useLocale();

  return (
    <ConfigProvider locale={ANTD_LOCALES[locale]} componentSize={UI_TOKENS.antdSize}>
      {children}
    </ConfigProvider>
  );
};

/**
 * 应用级 Provider 集合：语言环境 → antd 配置 → CopilotKit。
 * 新增全局能力（如消息总线、错误边界）统一挂在这里，不要散落到页面。
 */
const AppProviders: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <LocaleProvider>
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
  </LocaleProvider>
);

export default AppProviders;
