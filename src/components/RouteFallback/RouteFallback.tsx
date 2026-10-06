import React from 'react';
import { Spin } from 'antd';
import { useLocale } from '../../locales';

/** 页面懒加载占位：全屏居中，避免加载瞬间布局跳动 */
const RouteFallback: React.FC = () => {
  const { t } = useLocale();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <Spin tip={t('common.loading')} />
    </div>
  );
};

export default RouteFallback;
