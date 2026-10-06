import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Empty, message, PageHeader } from 'antd';
import { FormRenderer } from '../FormRenderer/FormRenderer';
import { FormSchema } from '../../types/form';

const STORAGE_KEY = 'lcf_form_schema';

const FormDemo: React.FC = () => {
  const [schema, setSchema] = useState<FormSchema | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: FormSchema = JSON.parse(raw);
        setSchema(parsed);
      }
    } catch (e) {
      console.error('Failed to parse schema from localStorage:', e);
    }
  }, []);

  const handleFinish = (values: Record<string, any>) => {
    message.success(`表单提交成功！数据：${JSON.stringify(values)}`);
    console.log('Form submitted:', values);
  };

  const handleReload = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: FormSchema = JSON.parse(raw);
        setSchema(parsed);
        message.info('已重新加载 Schema');
      } else {
        setSchema(null);
        message.warning('localStorage 中未找到 Schema');
      }
    } catch (e) {
      message.error('Schema 解析失败');
    }
  };

  return (
    <div className="lcf-form-demo">
      <div className="lcf-form-demo-header" style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
        <PageHeader
          title="表单渲染演示"
          subTitle="展示由设计器生成的 Schema 渲染效果"
          extra={[
            <Button key="reload" onClick={handleReload}>
              重新加载 Schema
            </Button>,
            <Link to="/builder" key="builder">
              <Button type="primary">返回设计器</Button>
            </Link>,
          ]}
        />
      </div>

      <div className="lcf-form-demo-content" style={{ padding: '24px 48px', maxWidth: 960, margin: '0 auto' }}>
        {schema ? (
          <>
            {schema.title && (
              <h2 className="lcf-form-demo-title" style={{ marginBottom: 24 }}>
                {schema.title}
              </h2>
            )}
            <FormRenderer
              schema={schema}
              initialValues={{}}
              onFinish={handleFinish}
              layout="horizontal"
            />
          </>
        ) : (
          <Empty
            description="尚未创建表单 Schema，请先在设计器中设计表单并保存"
            style={{ marginTop: 80 }}
          >
            <Link to="/builder">
              <Button type="primary" size="large">
                去设计器创建
              </Button>
            </Link>
          </Empty>
        )}
      </div>
    </div>
  );
};

export default FormDemo;
