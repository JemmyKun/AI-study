import React from 'react';
import { Button, Result, Typography } from 'antd';
import './ErrorBoundary.css';

/**
 * 全局错误边界。
 *
 * 用途：任一组件在渲染期抛错时，用可读的兜底页替代整页白屏。
 * 挂在两个位置：
 * - AppProviders 内：兜住 Provider 层与整棵树，避免白屏
 * - 路由出口外：单页崩溃时导航仍可用，切换路由会自动重置
 */

export interface ErrorBoundaryProps {
  children?: React.ReactNode;
  /**
   * 这些值变化时自动清除错误态（通常传路由 pathname），
   * 否则用户跳转后仍会看到上一个页面的错误页。
   */
  resetKeys?: unknown[];
  /** 自定义兜底 UI；不传则用默认错误页 */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** 错误上报钩子：接监控/日志时传入 */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

const { Paragraph, Text } = Typography;

/** 默认兜底页：给出错误信息与两个恢复入口 */
const DefaultErrorFallback: React.FC<{ error: Error; onReset: () => void }> = ({
  error,
  onReset,
}) => {
  return (
    <div className="app-error-fallback">
      <Result
        status="error"
        title="页面出错了"
        subTitle="当前页面渲染失败，其余功能不受影响。可以重试或刷新页面。"
        extra={[
          <Button type="primary" key="retry" onClick={onReset}>
            重试
          </Button>,
          <Button key="reload" onClick={() => window.location.reload()}>
            刷新页面
          </Button>,
        ]}
      >
        <Paragraph type="secondary">
          <Text code>{error.message || String(error)}</Text>
        </Paragraph>
      </Result>
    </div>
  );
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // 学习工程暂不上报，至少保证控制台有完整堆栈
    console.error('[ErrorBoundary] 渲染异常：', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    const next = this.props.resetKeys ?? [];
    const before = prev.resetKeys ?? [];
    const changed =
      next.length !== before.length || next.some((key, i) => key !== before[i]);
    if (changed && this.state.error) this.reset();
  }

  reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return <DefaultErrorFallback error={error} onReset={this.reset} />;
  }
}

export default ErrorBoundary;
