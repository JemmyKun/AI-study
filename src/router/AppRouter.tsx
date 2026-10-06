import React, { Suspense } from 'react';
import { useLocation, useRoutes } from 'react-router-dom';
import { ErrorBoundary } from '../components';
import RouteFallback from '../components/RouteFallback/RouteFallback';
import { APP_ROUTES } from './routes';

/**
 * 路由出口：懒加载页面的统一 fallback + 页面级错误边界。
 * resetKeys 传 pathname，切换路由即自动清除错误态，导航与 AI 助手不受影响。
 */
const AppRouter: React.FC = () => {
  const element = useRoutes(APP_ROUTES);
  const { pathname } = useLocation();

  return (
    <ErrorBoundary resetKeys={[pathname]}>
      <Suspense fallback={<RouteFallback />}>{element}</Suspense>
    </ErrorBoundary>
  );
};

export default AppRouter;
