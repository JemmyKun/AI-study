import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { InboxOutlined } from '@ant-design/icons';
import { FormField } from '../../types/form';
import ComponentWrapper from './ComponentWrapper';

interface DesignCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelect: (id: string | null) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  fields,
  selectedFieldId,
  onSelect,
  onRemove,
  onDuplicate,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: 'canvas' });

  const fieldIds = fields.map(f => f.id);

  const handleCanvasClick = () => {
    onSelect(null);
  };

  return (
    <div
      className={`lcf-canvas${isOver ? ' is-over' : ''}`}
      onClick={handleCanvasClick}
    >
      <div ref={setNodeRef} className="lcf-canvas-dropzone">
        {fields.length === 0 ? (
          <div className="lcf-canvas-empty">
            <InboxOutlined />
            <p>从左侧拖拽组件到此处</p>
            <span className="hint">或点击组件添加到表单</span>
          </div>
        ) : (
          <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
            <div className="lcf-canvas-fields">
              {fields.map(field => (
                <ComponentWrapper
                  key={field.id}
                  field={field}
                  selected={selectedFieldId === field.id}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onDuplicate={onDuplicate}
                >
                  {field.type === 'list' && field.children
                    ? field.children.map(child => (
                        <ComponentWrapper
                          key={child.id}
                          field={child}
                          selected={selectedFieldId === child.id}
                          onSelect={onSelect}
                          onRemove={(childId) => onRemove(childId)}
                          onDuplicate={onDuplicate}
                        />
                      ))
                    : undefined}
                </ComponentWrapper>
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
};

export default DesignCanvas;
