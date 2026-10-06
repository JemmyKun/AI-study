import React from 'react';
import { Row, Col } from 'antd';
import { FormField, FieldLinkageState } from '../../types/form';
import { FieldRenderer } from './FieldRenderer';

interface GridRendererProps {
  fields: FormField[];
  linkageStates?: Record<string, FieldLinkageState>;
  readOnly?: boolean;
}

export const GridRenderer: React.FC<GridRendererProps> = ({ fields, linkageStates, readOnly }) => {
  // 按 span 累加，超过 24 换行
  const rows: FormField[][] = [];
  let currentRow: FormField[] = [];
  let currentSpan = 0;

  fields.forEach((field) => {
    const span = field.span || 24;
    if (currentSpan + span > 24 && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
      currentSpan = 0;
    }
    currentRow.push(field);
    currentSpan += span;
  });

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return (
    <div className="lcf-grid-renderer">
      {rows.map((row, rowIndex) => (
        <Row key={rowIndex} gutter={[16, 16]}>
          {row.map((field) => (
            <Col key={field.id} span={field.span || 24}>
              <FieldRenderer
                field={field}
                linkageState={linkageStates?.[field.name]}
                readOnly={readOnly}
              />
            </Col>
          ))}
        </Row>
      ))}
    </div>
  );
};
