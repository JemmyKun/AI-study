import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Select } from 'antd';
import {
  AppstoreOutlined,
  HomeOutlined,
  MessageOutlined,
  RobotOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { AI_NAV_ITEMS, BUSINESS_NAV_ITEMS, ROUTES, type NavIconKey } from '../../constants';
import { APP_INFO } from '../../config';
import { useLocale } from '../../locales';
import './AppNav.css';

const { Header } = Layout;

/** 图标映射：导航配置只存标识，图标集中在此，便于替换图标库 */
const NAV_ICONS: Record<NavIconKey, React.ReactNode> = {
  home: <HomeOutlined />,
  builder: <AppstoreOutlined />,
  renderer: <AppstoreOutlined />,
  wallet: <WalletOutlined />,
  chat: <MessageOutlined />,
  robot: <RobotOutlined />,
};

/** 顶部导航：菜单项来自 constants/nav.ts，选中态由路由推导 */
const AppNav: React.FC = () => {
  const { pathname } = useLocation();
  const { t, locale, setLocale, availableLocales } = useLocale();

  const selectedKeys = useMemo(() => {
    const exact = BUSINESS_NAV_ITEMS.find(item => item.path === pathname);
    if (exact) return [exact.path];
    // 次优先级：前缀匹配，便于子路由（如 /settle-pool/xxx/edit）高亮父级
    const prefix = BUSINESS_NAV_ITEMS.filter(item => item.path !== ROUTES.HOME).find(item =>
      pathname.startsWith(item.path),
    );
    return prefix ? [prefix.path] : [];
  }, [pathname]);

  const items = useMemo(
    () =>
      BUSINESS_NAV_ITEMS.map(item => ({
        key: item.path,
        icon: NAV_ICONS[item.icon],
        label: <Link to={item.path}>{t(item.labelKey)}</Link>,
      })),
    [t],
  );

  return (
    <Header className="app-nav">
      {/* logo 可点击，回到首页 */}
      <Link to={ROUTES.HOME} className="app-nav-logo" title={t('nav.home')}>
        <span className="app-nav-logo-mark">智</span>
        <span className="app-nav-logo-text">{APP_INFO.name}</span>
      </Link>

      <Menu
        className="app-nav-menu"
        theme="light"
        mode="horizontal"
        items={items}
        selectedKeys={selectedKeys}
      />

      {/* AI 助手独立导航区：与业务菜单视觉分离 */}
      <div className="app-nav-ai">
        <span className="app-nav-ai-label">{t('nav.group.ai')}</span>
        <div className="app-nav-ai-group">
          {AI_NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              title={item.hintKey ? t(item.hintKey) : undefined}
              className={`app-nav-ai-item ${pathname === item.path ? 'is-active' : ''}`}
            >
              {NAV_ICONS[item.icon]}
              <span className="app-nav-ai-text">{t(item.labelKey)}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 语言切换：业务文案与 antd 组件文案同步切换 */}
      <Select
        className="app-nav-locale"
        size="small"
        value={locale}
        onChange={setLocale}
        options={availableLocales.map(code => ({ value: code, label: t(`locale.${code}`) }))}
        dropdownMatchSelectWidth={false}
      />
    </Header>
  );
};

export default AppNav;
