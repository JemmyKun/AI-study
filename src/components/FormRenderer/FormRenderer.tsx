import React from 'react';
import { Form, Button, Empty } from 'antd';
import { FormRendererProps } from '../../types/form';
import { useLinkage } from './useLinkage';
import { GridRenderer } from './GridRenderer';
import './FormRenderer.less';

export const FormRenderer: React.FC<FormRendererProps> = ({
  schema,
  initialValues,
  onFinish,
  onValuesChange,
  readOnly = false,
  layout = 'horizontal',
}) => {
  const [form] = Form.useForm();
  const { linkageStates, handleValuesChange } = useLinkage(schema, form);

  const handleFormValuesChange = (changedValues: Record<string, any>, allValues: Record<string, any>) => {
    handleValuesChange(changedValues, allValues);
    onValuesChange?.(changedValues, allValues);
  };

  const handleFinish = (values: Record<string, any>) => {
    onFinish?.(values);
  };

  const hasFields = schema.fields && schema.fields.length > 0;

  return (
    <div className="lcf-form-renderer">
      <Form
        form={form}
        layout={layout}
        initialValues={initialValues}
        onFinish={handleFinish}
        onValuesChange={handleFormValuesChange}
        labelCol={schema.labelCol ? { span: schema.labelCol } : undefined}
        wrapperCol={schema.wrapperCol ? { span: schema.wrapperCol } : undefined}
      >
        {hasFields ? (
          <>
            <GridRenderer
              fields={schema.fields}
              linkageStates={linkageStates}
              readOnly={readOnly}
            />
            {!readOnly && (
              <Form.Item className="lcf-form-submit" wrapperCol={{ offset: schema.labelCol || 0 }}>
                <Button type="primary" htmlType="submit">
                  提交
                </Button>
              </Form.Item>
            )}
          </>
        ) : (
          <Empty description="暂无表单字段" />
        )}
      </Form>
    </div>
  );
};
