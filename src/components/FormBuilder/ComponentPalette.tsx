import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { componentRegistry } from '../../registry/componentRegistry';
import { ComponentConfig } from '../../registry/types';

const CATEGORY_LABELS: Record<string, string> = {
  basic: '基础',
  select: '选择',
  date: '日期',
  layout: '布局',
  custom: '自定义',
};

interface PaletteItemProps {
  config: ComponentConfig;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ config }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${config.type}`,
    data: { type: config.type, fromPalette: true },
  });

  return (
    <div
      ref={setNodeRef}
      className={`lcf-palette-item${isDragging ? ' dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};

const ComponentPalette: React.FC = () => {
  const categories = componentRegistry.getByCategory();

  const orderedCategories = ['basic', 'select', 'date', 'layout', 'custom'];

  return (
    <div className="lcf-palette">
      {orderedCategories.map(cat => {
        const items = categories.get(cat);
        if (!items || items.length === 0) return null;
        return (
          <div key={cat} className="lcf-palette-category">
            <div className="lcf-palette-category-title">
              {CATEGORY_LABELS[cat] ?? cat}
            </div>
            <div className="lcf-palette-category-list">
              {items.map(config => (
                <PaletteItem key={config.type} config={config} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ComponentPalette;
