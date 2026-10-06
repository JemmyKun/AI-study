import React, { Suspense } from 'react';
import { useRoutes } from 'react-router-dom';
import RouteFallback from '../components/RouteFallback/RouteFallback';
import { APP_ROUTES } from './routes';

/** 路由出口：懒加载页面的统一 fallback */
const AppRouter: React.FC = () => {
  const element = useRoutes(APP_ROUTES);
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
};

export default AppRouter;
