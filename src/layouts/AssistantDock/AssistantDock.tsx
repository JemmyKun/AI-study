import React from 'react';
import { Button, Tooltip } from 'antd';
import { CloseOutlined, RobotOutlined } from '@ant-design/icons';
import { useLocale } from '../../locales';

export interface AssistantDockProps {
  open: boolean;
  onToggle: () => void;
}

/** 右下角悬浮助手开关：全站统一入口，完整对话页会自动隐藏 */
const AssistantDock: React.FC<AssistantDockProps> = ({ open, onToggle }) => {
  const { t } = useLocale();
  const label = open ? t('assistant.close') : t('assistant.open');

  return (
    <Tooltip placement="left" title={label} mouseEnterDelay={0.2}>
      <Button
        type="primary"
        shape="circle"
        size="large"
        icon={open ? <CloseOutlined /> : <RobotOutlined />}
        onClick={onToggle}
        aria-label={label}
        style={{
          position: 'fixed',
          right: 24,
          bottom: 160,
          zIndex: 2000,
          width: 48,
          height: 48,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
        }}
      />
    </Tooltip>
  );
};

export default AssistantDock;
