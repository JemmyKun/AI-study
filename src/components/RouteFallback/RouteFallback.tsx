import React from 'react';
import { Spin } from 'antd';

/** 页面懒加载占位：全屏居中，避免加载瞬间布局跳动 */
const RouteFallback: React.FC = () => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <Spin tip="加载中…" />
    </div>
  );
};

export default RouteFallback;
