import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CopilotSidebar } from '@copilotkit/react-core/v2';
import { FULL_PAGE_CHAT_ROUTES } from '../../constants';
import AppCopilotBridge from '../../features/copilot/AppCopilotBridge';
import { COPILOT_INSTRUCTIONS, COPILOT_LABELS } from '../../features/copilot/labels';
import '../../features/copilot/copilot-sidebar.css';
import { AppRouter } from '../../router';
import AppNav from '../AppNav/AppNav';
import AssistantDock from '../AssistantDock/AssistantDock';

/** 传入空组件即可隐藏 CopilotSidebar 自带的悬浮按钮，改用我们自己的开关 */
const NoToggleButton: React.FC = () => null;

/** AI 助手侧边栏宽度（默认 480 偏窄，消息与输入框都显局促） */
const ASSISTANT_SIDEBAR_WIDTH = 560;

/**
 * 全站布局：导航 + 路由出口 + 全局 AI 助手。
 * 页面自身只关心业务内容，导航与助手这类横切能力集中在这里。
 */
const AppLayout: React.FC = () => {
  const { pathname } = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);

  // 完整对话页自带会话区，隐藏悬浮开关并收起侧边栏，避免两套对话并存
  const hideAssistant = FULL_PAGE_CHAT_ROUTES.includes(pathname);

  useEffect(() => {
    if (hideAssistant) setAssistantOpen(false);
  }, [hideAssistant]);

  return (
    <>
      <AppNav />
      <AppCopilotBridge />
      <AppRouter />
      <CopilotSidebar
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        toggleButton={NoToggleButton}
        width={ASSISTANT_SIDEBAR_WIDTH}
        instructions={COPILOT_INSTRUCTIONS}
        labels={COPILOT_LABELS}
      />
      {!hideAssistant && (
        <AssistantDock open={assistantOpen} onToggle={() => setAssistantOpen(v => !v)} />
      )}
    </>
  );
};

export default AppLayout;
