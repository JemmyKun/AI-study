import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { FormField } from '../../types/form';
import { componentRegistry } from '../../registry/componentRegistry';

interface ComponentWrapperProps {
  field: FormField;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  children?: React.ReactNode;
}

const ComponentWrapper: React.FC<ComponentWrapperProps> = ({
  field,
  selected,
  onSelect,
  onRemove,
  onDuplicate,
  children,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const config = componentRegistry.get(field.type);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const classNames = [
    'lcf-field-wrapper',
    selected ? 'selected' : '',
    isDragging ? 'dragging' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(field.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(field.id);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDuplicate(field.id);
  };

  // List fields have special rendering
  if (field.type === 'list') {
    return (
      <div
        ref={setNodeRef}
        style={{ ...style, width: '100%' }}
        className={classNames}
        data-span={field.span}
        onClick={handleClick}
      >
        <div className="lcf-field-wrapper-actions">
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={handleDelete}
          />
          <Button
            type="primary"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleDuplicate}
          />
        </div>
        <div className="lcf-list-field">
          <div className="lcf-list-field-header">
            <span className="title">
              {config?.icon}
              {field.label}
            </span>
          </div>
          <div className="lcf-list-field-children" {...attributes} {...listeners}>
            {children ?? (
              <div className="lcf-list-field-empty">拖入子字段到此列表</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={classNames}
      data-span={field.span}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div className="lcf-field-wrapper-actions">
        <Button
          type="primary"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={handleDelete}
        />
        <Button
          type="primary"
          size="small"
          icon={<CopyOutlined />}
          onClick={handleDuplicate}
        />
      </div>
      <div className="lcf-field-wrapper-header">
        {config?.icon}
        <span>{field.label}</span>
        <span className="field-name">{field.name}</span>
      </div>
    </div>
  );
};

export default ComponentWrapper;
