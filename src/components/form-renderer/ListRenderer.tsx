import React from 'react';
import { Form, Button, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { FormField } from '../../types/form';
import { FieldRenderer } from './FieldRenderer';

interface ListRendererProps {
  field: FormField;
  readOnly?: boolean;
}

export const ListRenderer: React.FC<ListRendererProps> = ({ field, readOnly }) => {
  const { children = [], listConfig } = field;
  const min = listConfig?.min ?? 0;
  const max = listConfig?.max ?? Infinity;
  const addText = listConfig?.addText || '添加一项';

  return (
    <div className="lcf-list-renderer">
      <Form.List name={field.name}>
        {(fields, { add, remove }) => (
          <>
            {fields.map(({ key, name, fieldKey, ...restField }) => (
              <div className="lcf-list-item" key={key}>
                <Row gutter={[16, 16]} align="middle">
                  {children.map((childField) => (
                    <Col key={childField.id} span={childField.span || 8}>
                      <FieldRenderer
                        field={{
                          ...childField,
                          name: [name, childField.name] as any,
                        }}
                        readOnly={readOnly}
                      />
                    </Col>
                  ))}
                  {!readOnly && (
                    <Col flex="none">
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                        disabled={fields.length <= min}
                      />
                    </Col>
                  )}
                </Row>
              </div>
            ))}
            {!readOnly && (
              <Button
                className="lcf-list-add-btn"
                type="dashed"
                onClick={() => add()}
                block
                icon={<PlusOutlined />}
                disabled={fields.length >= max}
              >
                {addText}
              </Button>
            )}
          </>
        )}
      </Form.List>
    </div>
  );
};
