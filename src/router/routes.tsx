import React, { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import { ROUTES } from '../constants';

/**
 * 路由表：全站页面映射的唯一来源（导航菜单见 constants/nav.ts）。
 * 页面统一按需加载，首屏只下载首页所需代码。
 */

const HomePage = lazy(() => import('../pages/home'));
const FormBuilder = lazy(() => import('../pages/form-builder'));
const FormRendererDemo = lazy(() => import('../pages/form-renderer'));
const ChatPage = lazy(() => import('../pages/chat'));
const DeepSeekChat = lazy(() => import('../pages/deepseek-chat'));
const SettlePool = lazy(() => import('../pages/settle-pool'));
const SettleOrderEdit = lazy(() => import('../pages/settle-pool/SettleOrderEdit'));
const NotFoundPage = lazy(() => import('../pages/not-found'));

export const APP_ROUTES: RouteObject[] = [
  { path: ROUTES.HOME, element: <HomePage /> },
  { path: ROUTES.FORM_BUILDER, element: <FormBuilder /> },
  { path: ROUTES.FORM_RENDERER, element: <FormRendererDemo /> },
  { path: ROUTES.CHAT, element: <ChatPage /> },
  { path: ROUTES.DEEPSEEK_CHAT, element: <DeepSeekChat /> },
  { path: ROUTES.SETTLE_POOL, element: <SettlePool /> },
  { path: ROUTES.SETTLE_POOL_NEW, element: <SettleOrderEdit /> },
  { path: `${ROUTES.SETTLE_POOL}/:id/edit`, element: <SettleOrderEdit /> },
  { path: '*', element: <NotFoundPage /> },
];
