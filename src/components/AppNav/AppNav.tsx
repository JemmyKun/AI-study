import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { AppstoreOutlined, HomeOutlined, MessageOutlined, RobotOutlined, WalletOutlined } from '@ant-design/icons';
import './AppNav.css';

const { Header } = Layout;

/** 导航项配置：新增页面只需在此追加 */
const NAV_ITEMS = [
  { key: '/', label: '首页', icon: <HomeOutlined /> },
  { key: '/builder', label: '表单设计器', icon: <AppstoreOutlined /> },
  { key: '/renderer', label: '表单渲染演示', icon: <AppstoreOutlined /> },
  { key: '/settle-pool', label: '结算池', icon: <WalletOutlined /> },
  { key: '/chat', label: 'AI 问答', icon: <MessageOutlined /> },
  { key: '/ai-chat', label: 'DeepSeek 对话', icon: <RobotOutlined /> },
];

const AppNav: React.FC = () => {
  const { pathname } = useLocation();

  const selectedKeys = useMemo(() => {
    // 优先精确匹配，其次匹配前缀（便于后续子路由高亮）
    const exact = NAV_ITEMS.find((i) => i.key === pathname);
    if (exact) return [exact.key];
    const prefix = NAV_ITEMS.filter((i) => i.key !== '/').find((i) => pathname.startsWith(i.key));
    return prefix ? [prefix.key] : [];
  }, [pathname]);

  const items = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        key: item.key,
        icon: item.icon,
        label: <Link to={item.key}>{item.label}</Link>,
      })),
    [],
  );

  return (
    <Header className="app-nav">
      <div className="app-nav-logo">
        <span className="app-nav-logo-mark">LC</span>
        低代码业务平台
      </div>
      <Menu
        className="app-nav-menu"
        theme="light"
        mode="horizontal"
        items={items}
        selectedKeys={selectedKeys}
      />
    </Header>
  );
};

export default AppNav;
