import { useReducer, useCallback, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { FormSchema, FormField, ValidationError } from '../../types/form';
import { componentRegistry } from '../../features/form';

// schemaValidator.ts 将在 Task 3 中创建，暂时使用空实现
let validateSchemaUtil: (schema: FormSchema) => ValidationError[] = () => [];
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('../../features/form/schema-validator.ts');
  validateSchemaUtil = mod.validateSchema;
} catch {
  // 文件尚未创建，使用空实现
}

// ==================== State & Actions ====================

interface DesignerState {
  schema: FormSchema;
  selectedFieldId: string | null;
  history: FormSchema[];
  historyIndex: number;
}

type DesignerAction =
  | { type: 'addField'; field: FormField; index?: number }
  | { type: 'removeField'; fieldId: string }
  | { type: 'moveField'; fromIndex: number; toIndex: number }
  | { type: 'updateField'; fieldId: string; updates: Partial<FormField> }
  | { type: 'selectField'; fieldId: string | null }
  | { type: 'duplicateField'; fieldId: string }
  | { type: 'setSchema'; schema: FormSchema }
  | { type: 'updateTitle'; title: string }
  | { type: 'addListChild'; listFieldId: string; childField: FormField }
  | { type: 'removeListChild'; listFieldId: string; childFieldId: string }
  | { type: 'updateListChild'; listFieldId: string; childFieldId: string; updates: Partial<FormField> }
  | { type: 'undo' }
  | { type: 'redo' };

// ==================== Constants ====================

const MAX_HISTORY = 50;
const STORAGE_KEY = 'lcf_form_schema';

const initialSchema: FormSchema = {
  version: '1.0.0',
  title: '未命名表单',
  fields: [],
};

const initialState: DesignerState = {
  schema: initialSchema,
  selectedFieldId: null,
  history: [initialSchema],
  historyIndex: 0,
};

// ==================== Helpers ====================

/** 生成唯一 name，避免冲突 */
function generateUniqueName(baseName: string, existingNames: Set<string>): string {
  if (!existingNames.has(baseName)) return baseName;
  let i = 2;
  while (existingNames.has(`${baseName}_${i}`)) {
    i++;
  }
  return `${baseName}_${i}`;
}

/** 收集 schema 中所有字段的 name */
function collectFieldNames(schema: FormSchema): Set<string> {
  const names = new Set<string>();
  const walk = (fields: FormField[]) => {
    fields.forEach(f => {
      names.add(f.name);
      if (f.children) walk(f.children);
    });
  };
  walk(schema.fields);
  return names;
}

/** 将 schema 压入 history，截断 future */
function pushHistory(state: DesignerState, newSchema: FormSchema): Pick<DesignerState, 'schema' | 'history' | 'historyIndex'> {
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(newSchema);
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }
  return {
    schema: newSchema,
    history: newHistory,
    historyIndex: newHistory.length - 1,
  };
}

/** 更新 list 类型字段的 children */
function updateListChildren(
  fields: FormField[],
  listFieldId: string,
  updater: (children: FormField[]) => FormField[],
): FormField[] {
  return fields.map(f => {
    if (f.id === listFieldId) {
      return { ...f, children: updater(f.children || []) };
    }
    if (f.children) {
      return { ...f, children: updateListChildren(f.children, listFieldId, updater) };
    }
    return f;
  });
}

// ==================== Reducer ====================

function designerReducer(state: DesignerState, action: DesignerAction): DesignerState {
  switch (action.type) {
    case 'addField': {
      const newFields = [...state.schema.fields];
      if (action.index !== undefined && action.index >= 0 && action.index <= newFields.length) {
        newFields.splice(action.index, 0, action.field);
      } else {
        newFields.push(action.field);
      }
      const newSchema = { ...state.schema, fields: newFields };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'removeField': {
      const newSchema = {
        ...state.schema,
        fields: state.schema.fields.filter(f => f.id !== action.fieldId),
      };
      const selectedFieldId = state.selectedFieldId === action.fieldId ? null : state.selectedFieldId;
      return { ...state, ...pushHistory(state, newSchema), selectedFieldId };
    }

    case 'moveField': {
      const newFields = [...state.schema.fields];
      const [moved] = newFields.splice(action.fromIndex, 1);
      newFields.splice(action.toIndex, 0, moved);
      const newSchema = { ...state.schema, fields: newFields };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'updateField': {
      const newSchema = {
        ...state.schema,
        fields: state.schema.fields.map(f =>
          f.id === action.fieldId ? { ...f, ...action.updates } : f,
        ),
      };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'selectField': {
      return { ...state, selectedFieldId: action.fieldId };
    }

    case 'duplicateField': {
      const source = state.schema.fields.find(f => f.id === action.fieldId);
      if (!source) return state;
      const existingNames = collectFieldNames(state.schema);
      const baseName = source.name + '_copy';
      const newName = generateUniqueName(baseName, existingNames);
      const newField: FormField = {
        ...source,
        id: nanoid(),
        name: newName,
        label: source.label + ' (副本)',
      };
      const sourceIndex = state.schema.fields.indexOf(source);
      const newFields = [...state.schema.fields];
      newFields.splice(sourceIndex + 1, 0, newField);
      const newSchema = { ...state.schema, fields: newFields };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'setSchema': {
      return {
        ...state,
        schema: action.schema,
        selectedFieldId: null,
        history: [action.schema],
        historyIndex: 0,
      };
    }

    case 'updateTitle': {
      const newSchema = { ...state.schema, title: action.title };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'addListChild': {
      const newSchema = {
        ...state.schema,
        fields: updateListChildren(state.schema.fields, action.listFieldId, children => [
          ...children,
          action.childField,
        ]),
      };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'removeListChild': {
      const newSchema = {
        ...state.schema,
        fields: updateListChildren(state.schema.fields, action.listFieldId, children =>
          children.filter(c => c.id !== action.childFieldId),
        ),
      };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'updateListChild': {
      const newSchema = {
        ...state.schema,
        fields: updateListChildren(state.schema.fields, action.listFieldId, children =>
          children.map(c =>
            c.id === action.childFieldId ? { ...c, ...action.updates } : c,
          ),
        ),
      };
      return { ...state, ...pushHistory(state, newSchema) };
    }

    case 'undo': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        schema: state.history[newIndex],
        historyIndex: newIndex,
        selectedFieldId: null,
      };
    }

    case 'redo': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        schema: state.history[newIndex],
        historyIndex: newIndex,
        selectedFieldId: null,
      };
    }

    default:
      return state;
  }
}

// ==================== Hook ====================

export interface UseDesignerReturn {
  schema: FormSchema;
  selectedFieldId: string | null;
  selectedField: FormField | null;
  canUndo: boolean;
  canRedo: boolean;
  errors: ValidationError[];
  addField: (type: string, index?: number) => void;
  removeField: (fieldId: string) => void;
  moveField: (fromIndex: number, toIndex: number) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  selectField: (fieldId: string | null) => void;
  duplicateField: (fieldId: string) => void;
  addListChild: (listFieldId: string, childField: FormField) => void;
  removeListChild: (listFieldId: string, childFieldId: string) => void;
  updateListChild: (listFieldId: string, childFieldId: string, updates: Partial<FormField>) => void;
  updateTitle: (title: string) => void;
  undo: () => void;
  redo: () => void;
  saveToLocalStorage: () => boolean;
  loadFromLocalStorage: () => void;
  exportToJson: () => void;
  importFromJson: (file: File) => void;
  validateSchema: () => ValidationError[];
}

export function useDesigner(): UseDesignerReturn {
  const [state, dispatch] = useReducer(designerReducer, initialState);
  const errorsRef = useRef<ValidationError[]>([]);

  // 计算 selectedField
  const selectedField = state.selectedFieldId
    ? state.schema.fields.find(f => f.id === state.selectedFieldId) ?? null
    : null;

  // ---- Actions ----

  const addField = useCallback((type: string, index?: number) => {
    const config = componentRegistry.get(type);
    const id = nanoid();
    const name = `field_${id.slice(0, 6)}`;
    const baseProps = config?.defaultProps ?? {};
    const field: FormField = {
      ...baseProps,
      id,
      type,
      name,
      label: baseProps.label ?? config?.label ?? type,
      span: baseProps.span ?? 12,
      required: baseProps.required ?? false,
    };
    dispatch({ type: 'addField', field, index });
  }, []);

  const removeField = useCallback((fieldId: string) => {
    dispatch({ type: 'removeField', fieldId });
  }, []);

  const moveField = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'moveField', fromIndex, toIndex });
  }, []);

  const updateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    dispatch({ type: 'updateField', fieldId, updates });
  }, []);

  const selectField = useCallback((fieldId: string | null) => {
    dispatch({ type: 'selectField', fieldId });
  }, []);

  const duplicateField = useCallback((fieldId: string) => {
    dispatch({ type: 'duplicateField', fieldId });
  }, []);

  const addListChild = useCallback((listFieldId: string, childField: FormField) => {
    dispatch({ type: 'addListChild', listFieldId, childField });
  }, []);

  const removeListChild = useCallback((listFieldId: string, childFieldId: string) => {
    dispatch({ type: 'removeListChild', listFieldId, childFieldId });
  }, []);

  const updateListChild = useCallback(
    (listFieldId: string, childFieldId: string, updates: Partial<FormField>) => {
      dispatch({ type: 'updateListChild', listFieldId, childFieldId, updates });
    },
    [],
  );

  const updateTitle = useCallback((title: string) => {
    dispatch({ type: 'updateTitle', title });
  }, []);

  const undo = useCallback(() => {
    dispatch({ type: 'undo' });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: 'redo' });
  }, []);

  // ---- Save / Load ----

  const saveToLocalStorage = useCallback((): boolean => {
    if (errorsRef.current.length > 0) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.schema));
      return true;
    } catch {
      return false;
    }
  }, [state.schema]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const schema: FormSchema = JSON.parse(raw);
        dispatch({ type: 'setSchema', schema });
      }
    } catch {
      // 解析失败时忽略
    }
  }, []);

  const exportToJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state.schema, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.schema.title || 'form-schema'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.schema]);

  const importFromJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const schema: FormSchema = JSON.parse(e.target?.result as string);
        dispatch({ type: 'setSchema', schema });
      } catch {
        // 解析失败时忽略
      }
    };
    reader.readAsText(file);
  }, []);

  // ---- Validate ----

  const validateSchema = useCallback((): ValidationError[] => {
    const errors = validateSchemaUtil(state.schema);
    errorsRef.current = errors;
    return errors;
  }, [state.schema]);

  // ---- Keyboard shortcuts ----

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  return {
    schema: state.schema,
    selectedFieldId: state.selectedFieldId,
    selectedField,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    errors: errorsRef.current,
    addField,
    removeField,
    moveField,
    updateField,
    selectField,
    duplicateField,
    addListChild,
    removeListChild,
    updateListChild,
    updateTitle,
    undo,
    redo,
    saveToLocalStorage,
    loadFromLocalStorage,
    exportToJson,
    importFromJson,
    validateSchema,
  };
}
