import React from 'react';
import { Modal, Tabs, message } from 'antd';
import { FormSchema } from '../../types/form';
import { FormRenderer } from '../../components/form-renderer/FormRenderer';

const { TabPane } = Tabs;

interface PreviewModalProps {
  visible: boolean;
  schema: FormSchema;
  onClose: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({ visible, schema, onClose }) => {
  const handleFinish = (values: Record<string, any>) => {
    message.success(`预览提交成功！数据：${JSON.stringify(values)}`);
  };

  return (
    <Modal
      title="表单预览"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      className="lcf-preview-modal"
      destroyOnClose
    >
      <Tabs defaultActiveKey="render" className="lcf-preview-tabs">
        <TabPane tab="渲染预览" key="render">
          <div className="lcf-preview-render" style={{ padding: '16px 0', maxHeight: 520, overflowY: 'auto' }}>
            <FormRenderer
              schema={schema}
              onFinish={handleFinish}
              layout="vertical"
            />
          </div>
        </TabPane>
        <TabPane tab="JSON Schema" key="json">
          <pre className="lcf-preview-json" style={{ maxHeight: 520, overflowY: 'auto', background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
            {JSON.stringify(schema, null, 2)}
          </pre>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default PreviewModal;
