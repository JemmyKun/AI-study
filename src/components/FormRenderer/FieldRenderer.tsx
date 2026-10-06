import React from 'react';
import { Alert } from 'antd';
import { FormField, FieldLinkageState } from '../../types/form';
import { componentRegistry } from '../../registry/componentRegistry';
import { useDataSource } from './useDataSource';
import { ListRenderer } from './ListRenderer';

interface FieldRendererProps {
  field: FormField;
  linkageState?: FieldLinkageState;
  readOnly?: boolean;
}

export const FieldRenderer: React.FC<FieldRendererProps> = ({ field, linkageState, readOnly }) => {
  // 动态数据源（Hooks 必须在所有 early return 之前调用）
  const { options: dynamicOptions } = useDataSource(field.dataSource);

  // 联动控制 visible
  if (linkageState?.visible === false) {
    return null;
  }

  // list 类型委托 ListRenderer
  if (field.type === 'list') {
    return <ListRenderer field={field} readOnly={readOnly} />;
  }

  // 从注册表获取组件
  const config = componentRegistry.get(field.type);
  if (!config) {
    return (
      <Alert
        type="warning"
        message={`未注册的组件类型: ${field.type}`}
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  }

  const Component = config.component;

  // 合并选项：动态数据源优先，回退到静态 options
  const mergedOptions = dynamicOptions.length > 0
    ? dynamicOptions
    : (linkageState?.options || field.options);

  // 联动控制 disabled
  const isDisabled = readOnly || linkageState?.disabled === true;

  // 透传 props
  const componentProps: Record<string, any> = {
    placeholder: field.placeholder,
    disabled: isDisabled,
    ...config.defaultProps,
  };

  // 有 options 的组件（Select / Radio / Checkbox）
  if (mergedOptions) {
    componentProps.options = mergedOptions;
  }

  return (
    <div className="lcf-field-renderer">
      <Component {...componentProps} />
    </div>
  );
};
