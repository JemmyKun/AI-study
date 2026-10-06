import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppNav from '../AppNav';

/** AppNav 依赖 useLocation 与 Link，必须包在 Router 内 */
function renderNav() {
  return render(
    <MemoryRouter>
      <AppNav />
    </MemoryRouter>,
  );
}

describe('AppNav', () => {
  it('渲染业务导航项', () => {
    renderNav();
    // logo 的 title 与菜单项都取用 nav.home，用 getAllByText 兼容多处出现
    expect(screen.getAllByText('首页').length).toBeGreaterThan(0);
    expect(screen.getByText('表单设计器')).toBeInTheDocument();
    expect(screen.getByText('资金结算池')).toBeInTheDocument();
  });

  it('渲染 AI 入口：助手与 DeepSeek 对话', () => {
    renderNav();
    expect(screen.getByText('AI 助手')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek 对话')).toBeInTheDocument();
  });

  it('AI 入口指向正确路由', () => {
    renderNav();
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    expect(links.some(a => a.getAttribute('href') === '/ai-chat')).toBe(true);
    expect(links.some(a => a.getAttribute('href') === '/chat')).toBe(true);
  });
});
