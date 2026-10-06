import React, { useEffect } from 'react';
import {
  Form,
  Input,
  Switch,
  Slider,
  Select,
  Button,
  Tabs,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FormField, DataSourceConfig } from '../../types/form';
import LinkageEditor from './LinkageEditor';

const { Option } = Select;
const { TabPane } = Tabs;

interface PropertyEditorProps {
  field: FormField | null;
  allFields: FormField[];
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
}

const OPTIONS_TYPES = ['select', 'radio', 'checkbox'];

const PropertyEditor: React.FC<PropertyEditorProps> = ({
  field,
  allFields,
  onUpdate,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (field) {
      form.setFieldsValue({
        label: field.label,
        name: field.name,
        placeholder: field.placeholder,
        required: field.required ?? false,
        span: field.span,
      });
    }
  }, [field, form]);

  if (!field) {
    return (
      <div className="lcf-prop-editor">
        <div className="lcf-prop-editor-empty">选择一个字段以编辑属性</div>
      </div>
    );
  }

  const handleValuesChange = (_: any, allValues: any) => {
    onUpdate(field.id, allValues);
  };

  const handleOptionsChange = (options: { label: string; value: string }[]) => {
    onUpdate(field.id, { options });
  };

  const handleDataSourceChange = (ds: Partial<DataSourceConfig>) => {
    onUpdate(field.id, {
      dataSource: { ...field.dataSource, ...ds } as DataSourceConfig,
    });
  };

  const handleLinkagesChange = (linkages: any[]) => {
    onUpdate(field.id, { linkages });
  };

  const allFieldNames = allFields.map(f => f.name);
  const showOptions = OPTIONS_TYPES.includes(field.type);

  return (
    <div className="lcf-prop-editor">
      <Tabs defaultActiveKey="basic" size="small">
        <TabPane tab="属性" key="basic">
          <Form
            form={form}
            layout="vertical"
            size="small"
            onValuesChange={handleValuesChange}
          >
            <div className="lcf-prop-editor-section">
              <div className="lcf-prop-editor-section-title">基本属性</div>

              <Form.Item
                label="标题"
                name="label"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="字段标题" />
              </Form.Item>

              <Form.Item
                label="字段名"
                name="name"
                rules={[{ required: true, message: '请输入字段名' }]}
              >
                <Input placeholder="fieldName" />
              </Form.Item>

              <Form.Item label="占位符" name="placeholder">
                <Input placeholder="placeholder" />
              </Form.Item>

              <Form.Item label="必填" name="required" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Form.Item label="栅格宽度 (24列)" name="span">
                <Slider min={6} max={24} step={2} marks={{ 6: '6', 12: '12', 18: '18', 24: '24' }} />
              </Form.Item>
            </div>
          </Form>

          {showOptions && (
            <div className="lcf-prop-editor-section">
              <div className="lcf-prop-editor-section-title">选项配置</div>
              <div className="lcf-options-editor">
                {(field.options || []).map((opt, idx) => (
                  <div key={idx} className="lcf-options-editor-item">
                    <Input
                      value={opt.label}
                      placeholder="显示文本"
                      onChange={e => {
                        const next = [...(field.options || [])];
                        next[idx] = { ...next[idx], label: e.target.value };
                        handleOptionsChange(next);
                      }}
                    />
                    <Input
                      value={opt.value}
                      placeholder="值"
                      onChange={e => {
                        const next = [...(field.options || [])];
                        next[idx] = { ...next[idx], value: e.target.value };
                        handleOptionsChange(next);
                      }}
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        const next = (field.options || []).filter(
                          (_, i) => i !== idx,
                        );
                        handleOptionsChange(next);
                      }}
                    />
                  </div>
                ))}
                <Button
                  type="dashed"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    const next = [
                      ...(field.options || []),
                      { label: '', value: '' },
                    ];
                    handleOptionsChange(next);
                  }}
                  block
                >
                  添加选项
                </Button>
              </div>
            </div>
          )}

          {showOptions && (
            <div className="lcf-prop-editor-section">
              <div className="lcf-prop-editor-section-title">数据源</div>
              <Form layout="vertical" size="small">
                <Form.Item label="类型">
                  <Select
                    value={field.dataSource?.type || 'static'}
                    onChange={val =>
                      handleDataSourceChange({ type: val as any })
                    }
                  >
                    <Option value="static">静态</Option>
                    <Option value="api">接口</Option>
                  </Select>
                </Form.Item>

                {field.dataSource?.type === 'api' && (
                  <>
                    <Form.Item label="URL">
                      <Input
                        value={field.dataSource?.url}
                        placeholder="https://api.example.com/data"
                        onChange={e =>
                          handleDataSourceChange({ url: e.target.value })
                        }
                      />
                    </Form.Item>
                    <Form.Item label="请求方法">
                      <Select
                        value={field.dataSource?.method || 'GET'}
                        onChange={val =>
                          handleDataSourceChange({ method: val })
                        }
                      >
                        <Option value="GET">GET</Option>
                        <Option value="POST">POST</Option>
                      </Select>
                    </Form.Item>
                    <Form.Item label="数据路径">
                      <Input
                        value={field.dataSource?.dataPath}
                        placeholder="data.list"
                        onChange={e =>
                          handleDataSourceChange({
                            dataPath: e.target.value,
                          })
                        }
                      />
                    </Form.Item>
                    <Form.Item label="标签字段">
                      <Input
                        value={field.dataSource?.labelField}
                        placeholder="label"
                        onChange={e =>
                          handleDataSourceChange({
                            labelField: e.target.value,
                          })
                        }
                      />
                    </Form.Item>
                    <Form.Item label="值字段">
                      <Input
                        value={field.dataSource?.valueField}
                        placeholder="value"
                        onChange={e =>
                          handleDataSourceChange({
                            valueField: e.target.value,
                          })
                        }
                      />
                    </Form.Item>
                  </>
                )}
              </Form>
            </div>
          )}
        </TabPane>

        <TabPane tab="联动" key="linkage">
          <LinkageEditor
            linkages={field.linkages || []}
            allFieldNames={allFieldNames}
            onChange={handleLinkagesChange}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default PropertyEditor;
