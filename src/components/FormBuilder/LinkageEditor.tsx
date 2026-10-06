import React from 'react';
import { Form, Select, Input, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { LinkageRule } from '../../types/form';
import { linkageRegistry } from '../../registry/linkageRegistry';

const { Option } = Select;

interface LinkageEditorProps {
  linkages: LinkageRule[];
  allFieldNames: string[];
  onChange: (linkages: LinkageRule[]) => void;
}

const OPERATOR_LABELS: Record<string, string> = {
  eq: '等于',
  neq: '不等于',
  gt: '大于',
  lt: '小于',
  contains: '包含',
  notContains: '不包含',
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  visible: '显示',
  hidden: '隐藏',
  disabled: '禁用',
  enabled: '启用',
  required: '设为必填',
  setValue: '设值',
  setOptions: '设选项',
};

const LinkageEditor: React.FC<LinkageEditorProps> = ({
  linkages,
  allFieldNames,
  onChange,
}) => {
  const handlers = linkageRegistry.getAll();

  const updateLinkage = (index: number, updates: Partial<LinkageRule>) => {
    const next = [...linkages];
    next[index] = { ...next[index], ...updates };
    onChange(next);
  };

  const addLinkage = () => {
    onChange([
      ...linkages,
      { triggerField: '', mode: 'rule', conditions: [], actions: [] },
    ]);
  };

  const removeLinkage = (index: number) => {
    onChange(linkages.filter((_, i) => i !== index));
  };

  const addCondition = (index: number) => {
    const linkage = linkages[index];
    updateLinkage(index, {
      conditions: [
        ...(linkage.conditions || []),
        { operator: 'eq', value: '' },
      ],
    });
  };

  const updateCondition = (
    linkageIndex: number,
    condIndex: number,
    updates: Partial<{ operator: any; value: any }>,
  ) => {
    const linkage = linkages[linkageIndex];
    const conditions = [...(linkage.conditions || [])];
    conditions[condIndex] = { ...conditions[condIndex], ...updates };
    updateLinkage(linkageIndex, { conditions });
  };

  const removeCondition = (linkageIndex: number, condIndex: number) => {
    const linkage = linkages[linkageIndex];
    updateLinkage(linkageIndex, {
      conditions: (linkage.conditions || []).filter((_, i) => i !== condIndex),
    });
  };

  const addAction = (index: number) => {
    const linkage = linkages[index];
    updateLinkage(index, {
      actions: [
        ...(linkage.actions || []),
        { targetField: '', type: 'visible' },
      ],
    });
  };

  const updateAction = (
    linkageIndex: number,
    actionIndex: number,
    updates: Partial<{ targetField: string; type: any; value: any }>,
  ) => {
    const linkage = linkages[linkageIndex];
    const actions = [...(linkage.actions || [])];
    actions[actionIndex] = { ...actions[actionIndex], ...updates };
    updateLinkage(linkageIndex, { actions });
  };

  const removeAction = (linkageIndex: number, actionIndex: number) => {
    const linkage = linkages[linkageIndex];
    updateLinkage(linkageIndex, {
      actions: (linkage.actions || []).filter((_, i) => i !== actionIndex),
    });
  };

  return (
    <div className="lcf-linkage-editor">
      {linkages.map((linkage, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            padding: 12,
            marginBottom: 12,
          }}
        >
          <Form layout="vertical" size="small">
            <Form.Item label="触发字段">
              <Select
                value={linkage.triggerField || undefined}
                placeholder="选择触发字段"
                onChange={val => updateLinkage(i, { triggerField: val })}
              >
                {allFieldNames.map(name => (
                  <Option key={name} value={name}>
                    {name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="模式" className="lcf-linkage-editor-mode-select">
              <Select
                value={linkage.mode || 'rule'}
                onChange={val => updateLinkage(i, { mode: val })}
              >
                <Option value="rule">规则模式</Option>
                <Option value="handler">处理器模式</Option>
              </Select>
            </Form.Item>

            {linkage.mode === 'handler' ? (
              <Form.Item label="处理器">
                <Select
                  value={linkage.handlerId || undefined}
                  placeholder="选择处理器"
                  onChange={val => updateLinkage(i, { handlerId: val })}
                >
                  {handlers.map(h => (
                    <Option key={h.id} value={h.id}>
                      {h.label}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            ) : (
              <>
                <div className="lcf-prop-editor-section">
                  <div className="lcf-prop-editor-section-title">条件</div>
                  {(linkage.conditions || []).map((cond, ci) => (
                    <div key={ci} className="lcf-linkage-editor-condition">
                      <Select
                        value={cond.operator}
                        style={{ width: 100 }}
                        onChange={op =>
                          updateCondition(i, ci, { operator: op as any })
                        }
                      >
                        {Object.entries(OPERATOR_LABELS).map(([k, v]) => (
                          <Option key={k} value={k}>
                            {v}
                          </Option>
                        ))}
                      </Select>
                      <Input
                        value={cond.value}
                        placeholder="值"
                        style={{ width: 80 }}
                        onChange={e =>
                          updateCondition(i, ci, { value: e.target.value })
                        }
                      />
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeCondition(i, ci)}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addCondition(i)}
                  >
                    添加条件
                  </Button>
                </div>

                <div className="lcf-prop-editor-section">
                  <div className="lcf-prop-editor-section-title">动作</div>
                  {(linkage.actions || []).map((act, ai) => (
                    <div key={ai} className="lcf-linkage-editor-action">
                      <Select
                        value={act.targetField || undefined}
                        placeholder="目标字段"
                        style={{ width: 100 }}
                        onChange={val =>
                          updateAction(i, ai, { targetField: val })
                        }
                      >
                        {allFieldNames.map(name => (
                          <Option key={name} value={name}>
                            {name}
                          </Option>
                        ))}
                      </Select>
                      <Select
                        value={act.type}
                        style={{ width: 80 }}
                        onChange={val =>
                          updateAction(i, ai, { type: val as any })
                        }
                      >
                        {Object.entries(ACTION_TYPE_LABELS).map(([k, v]) => (
                          <Option key={k} value={k}>
                            {v}
                          </Option>
                        ))}
                      </Select>
                      {(act.type === 'setValue' || act.type === 'setOptions') && (
                        <Input
                          value={act.value}
                          placeholder="值"
                          style={{ width: 80 }}
                          onChange={e =>
                            updateAction(i, ai, { value: e.target.value })
                          }
                        />
                      )}
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => removeAction(i, ai)}
                      />
                    </div>
                  ))}
                  <Button
                    type="dashed"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addAction(i)}
                  >
                    添加动作
                  </Button>
                </div>
              </>
            )}
          </Form>

          <Space style={{ marginTop: 8 }}>
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => removeLinkage(i)}
            >
              删除规则
            </Button>
          </Space>
        </div>
      ))}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addLinkage}
        block
      >
        添加联动规则
      </Button>
    </div>
  );
};

export default LinkageEditor;
