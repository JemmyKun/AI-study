import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  Button,
  message,
  Modal,
  List,
  Tag,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  UndoOutlined,
  RedoOutlined,
  ImportOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { ValidationError } from '../../types/form';
import { setFormDesignerBridge } from '../../features/copilot/formDesignerBridge';
import { registerModule } from '../../features/copilot/moduleRegistry';
import { useDesigner } from './useDesigner';
import ComponentPalette from './ComponentPalette';
import DesignCanvas from './DesignCanvas';
import PropertyEditor from './PropertyEditor';
import PreviewModal from './PreviewModal';
import './FormBuilder.less';

const FormBuilder: React.FC = () => {
  const designer = useDesigner();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 把设计器能力暴露给 CopilotKit 前端工具（用 ref 持有最新状态，避免重复注册）
  const designerRef = useRef(designer);
  designerRef.current = designer;

  useEffect(() => {
    setFormDesignerBridge({
      getSchema: () => designerRef.current.schema,
      addField: type => designerRef.current.addField(type),
      removeField: fieldId => designerRef.current.removeField(fieldId),
      updateField: (fieldId, updates) => designerRef.current.updateField(fieldId, updates),
      updateTitle: title => designerRef.current.updateTitle(title),
    });
    // 同时登记为业务模块，让 AI 助手能感知本页面
    const unregister = registerModule({
      id: 'form-builder',
      name: '低代码表单配置',
      description: '表单设计器：查看/新增/删除表单字段、修改表单标题',
      getSummary: () => ({
        title: designerRef.current.schema.title,
        fieldCount: designerRef.current.schema.fields.length,
        fields: designerRef.current.schema.fields.map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: !!f.required,
        })),
      }),
    });
    return () => {
      unregister();
      setFormDesignerBridge(null);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeData = active.data.current;

    // From palette → canvas: add new field
    if (activeData?.fromPalette) {
      const type = activeData.type as string;
      if (over.id === 'canvas') {
        designer.addField(type);
      } else {
        // Dropped on a specific field, insert at that index
        const overIndex = designer.schema.fields.findIndex(
          f => f.id === over.id,
        );
        if (overIndex >= 0) {
          designer.addField(type, overIndex);
        } else {
          designer.addField(type);
        }
      }
      return;
    }

    // Sorting within canvas
    if (over.id !== active.id) {
      const oldIndex = designer.schema.fields.findIndex(
        f => f.id === active.id,
      );
      const newIndex = designer.schema.fields.findIndex(
        f => f.id === over.id,
      );
      if (oldIndex >= 0 && newIndex >= 0) {
        designer.moveField(oldIndex, newIndex);
      }
    }
  };

  const handleSave = () => {
    const validationErrors = designer.validateSchema();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setErrorModalVisible(true);
      return;
    }
    const ok = designer.saveToLocalStorage();
    if (ok) {
      message.success('保存成功');
    } else {
      message.error('保存失败');
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      designer.importFromJson(file);
      message.success('导入成功');
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="lcf-form-builder">
      {/* Toolbar */}
      <div className="lcf-toolbar">
        <div className="lcf-toolbar-left">
          <input
            className="lcf-toolbar-title"
            value={designer.schema.title}
            onChange={e => designer.updateTitle(e.target.value)}
            placeholder="表单标题"
          />
        </div>
        <div className="lcf-toolbar-center">
          <Button
            icon={<UndoOutlined />}
            disabled={!designer.canUndo}
            onClick={designer.undo}
            size="small"
          >
            撤销
          </Button>
          <Button
            icon={<RedoOutlined />}
            disabled={!designer.canRedo}
            onClick={designer.redo}
            size="small"
          >
            重做
          </Button>
        </div>
        <div className="lcf-toolbar-right">
          <Button
            icon={<ImportOutlined />}
            onClick={handleImport}
            size="small"
          >
            导入
          </Button>
          <Button
            icon={<ExportOutlined />}
            onClick={designer.exportToJson}
            size="small"
          >
            导出
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setPreviewVisible(true)}
            size="small"
          >
            预览
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            size="small"
          >
            保存
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Builder body */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="lcf-builder-body">
          <ComponentPalette />
          <DesignCanvas
            fields={designer.schema.fields}
            selectedFieldId={designer.selectedFieldId}
            onSelect={designer.selectField}
            onRemove={designer.removeField}
            onDuplicate={designer.duplicateField}
          />
          <PropertyEditor
            field={designer.selectedField}
            allFields={designer.schema.fields}
            onUpdate={designer.updateField}
          />
        </div>

        <DragOverlay>
          {activeId ? (
            <div className="lcf-drag-overlay">
              <div className="lcf-palette-item">拖拽中...</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Preview Modal */}
      <PreviewModal
        visible={previewVisible}
        schema={designer.schema}
        onClose={() => setPreviewVisible(false)}
      />

      {/* Error Modal */}
      <Modal
        title="验证错误"
        open={errorModalVisible}
        onCancel={() => setErrorModalVisible(false)}
        footer={null}
      >
        <div className="lcf-error-list">
          <List
            size="small"
            dataSource={errors}
            renderItem={(err, idx) => (
              <List.Item key={idx}>
                <Tag
                  color={err.severity === 'error' ? 'error' : 'warning'}
                  className={`severity-${err.severity}`}
                >
                  {err.severity === 'error' ? '错误' : '警告'}
                </Tag>
                <span>
                  <strong>{err.fieldLabel}</strong>: {err.message}
                </span>
              </List.Item>
            )}
          />
        </div>
      </Modal>
    </div>
  );
};

export default FormBuilder;
