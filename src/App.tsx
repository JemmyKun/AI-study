import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import { RobotOutlined, CloseOutlined } from '@ant-design/icons';
import { CopilotKitProvider, CopilotSidebar } from '@copilotkit/react-core/v2';
import './registry/defaultComponents';
import FormBuilder from './components/FormBuilder/FormBuilder';
import FormDemo from './components/FormDemo/FormDemo';
import ChatPage from './components/ChatPage/ChatPage';
import DeepSeekChat from './components/DeepSeekChat/DeepSeekChat';
import SettlePool from './components/SettlePool/SettlePool';
import SettleOrderEdit from './components/SettlePool/SettleOrderEdit';
import AppCopilotBridge from './copilot/AppCopilotBridge';
import AppNav from './components/AppNav/AppNav';
import { COPILOT_LABELS } from './copilot/labels';

/**
 * Runtime 地址解析优先级：
 * 1. window.__COPILOT_RUNTIME_URL__（public/config.js，部署后可改，无需重新打包）
 * 2. REACT_APP_COPILOTKIT_RUNTIME_URL（构建时注入）
 * 3. 同源相对路径 /api/copilotkit（推荐：开发走 devServer 代理，生产走 Nginx 反代）
 */
const COPILOT_RUNTIME_URL =
  (window as unknown as { __COPILOT_RUNTIME_URL__?: string }).__COPILOT_RUNTIME_URL__ ||
  process.env.REACT_APP_COPILOTKIT_RUNTIME_URL ||
  '/api/copilotkit';

const HomePage: React.FC = () => (
  <div style={{ padding: 40, textAlign: 'center' }}>
    <h1>低代码表单配置系统</h1>
    <div style={{ marginTop: 40, display: 'flex', gap: 20, justifyContent: 'center' }}>
      <Link to="/builder" style={{ padding: '12px 24px', border: '1px solid #1890ff', borderRadius: 4, color: '#1890ff', textDecoration: 'none' }}>
        表单设计器
      </Link>
      <Link to="/renderer" style={{ padding: '12px 24px', border: '1px solid #52c41a', borderRadius: 4, color: '#52c41a', textDecoration: 'none' }}>
        表单渲染演示
      </Link>
      <Link to="/settle-pool" style={{ padding: '12px 24px', border: '1px solid #fa8c16', borderRadius: 4, color: '#fa8c16', textDecoration: 'none' }}>
        结算池
      </Link>
      <Link to="/chat" style={{ padding: '12px 24px', border: '1px solid #999', borderRadius: 4, color: '#999', textDecoration: 'none' }}>
        AI 问答
      </Link>
    </div>
  </div>
);

/** 传入空组件即可隐藏 CopilotSidebar 自带的悬浮按钮，改用我们自己的开关 */
const NoToggleButton: React.FC = () => null;

function AppShell() {
  const { pathname } = useLocation();
  const [copilotOpen, setCopilotOpen] = useState(false);
  // /chat 本身就是完整对话页，避免侧边栏与页面重复对话，隐藏悬浮开关并收起侧边栏
  const hideAssistantToggle = pathname === '/chat';

  useEffect(() => {
    if (hideAssistantToggle) setCopilotOpen(false);
  }, [hideAssistantToggle]);

  return (
    <>
      <AppNav />
      <CopilotKitProvider runtimeUrl={COPILOT_RUNTIME_URL}>
        <AppCopilotBridge />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/builder" element={<FormBuilder />} />
          <Route path="/renderer" element={<FormDemo />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/ai-chat" element={<DeepSeekChat />} />
          <Route path="/settle-pool" element={<SettlePool />} />
          <Route path="/settle-pool/new" element={<SettleOrderEdit />} />
          <Route path="/settle-pool/:id/edit" element={<SettleOrderEdit />} />
        </Routes>
        <CopilotSidebar
          open={copilotOpen}
          onOpenChange={setCopilotOpen}
          toggleButton={NoToggleButton}
          instructions="你是本系统的通用 AI 助手。系统由多个业务模块组成（例如低代码表单配置、结算池等），可以用 listModules 查看当前已打开的模块，用 getModuleSummary 获取模块实时数据（结算池模块 id 为 settle-pool）。结算池相关能力：getSettlePoolStats 统计各状态数量与金额、searchSettleOrders 按状态和关键字检索结算单、openSettleOrderEdit 打开编辑页；表单设计器可增删字段、修改标题；还可以用 navigateTo 跳转页面。请使用简体中文回答，简明扼要。"
          labels={COPILOT_LABELS}
        />

        {/* 自定义开关按钮：右下角悬浮，随时隐藏/显示 AI 助手 */}
        {!hideAssistantToggle && (
          <Tooltip
            placement="left"
            title={copilotOpen ? '隐藏 AI 助手' : '打开 AI 助手'}
            mouseEnterDelay={0.2}
          >
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={copilotOpen ? <CloseOutlined /> : <RobotOutlined />}
              onClick={() => setCopilotOpen(v => !v)}
              aria-label={copilotOpen ? '隐藏 AI 助手' : '打开 AI 助手'}
              style={{
                position: 'fixed',
                right: 24,
                // 固定高度，始终位于助手输入框上方
                bottom: 160,
                zIndex: 2000,
                width: 48,
                height: 48,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
              }}
            />
          </Tooltip>
        )}
      </CopilotKitProvider>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
