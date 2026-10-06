import { FormField, FormSchema } from '../types/form';

/**
 * 把表单设计器的能力暴露给 CopilotKit 前端工具。
 * 设计器挂载时注册，卸载时注销，工具据此读写当前画布状态。
 */
export interface FormDesignerBridge {
  getSchema: () => FormSchema | null;
  addField: (type: string) => void;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  updateTitle: (title: string) => void;
}

let bridge: FormDesignerBridge | null = null;

export function setFormDesignerBridge(next: FormDesignerBridge | null): void {
  bridge = next;
}

export function getFormDesignerBridge(): FormDesignerBridge | null {
  return bridge;
}
