import { FormSchema, FormField, ValidationError } from '../../types/form';

// 需要 options 或 dataSource 的组件类型
const OPTION_TYPES = ['select', 'radio', 'checkbox'];

/**
 * 校验 FormSchema 完整性
 */
export function validateSchema(schema: FormSchema): ValidationError[] {
  const errors: ValidationError[] = [];
  const fieldNames = new Set<string>();
  const allFieldNames = collectAllFieldNames(schema.fields);

  // 校验表单标题
  if (!schema.title || schema.title.trim() === '') {
    errors.push({
      fieldId: '__form__',
      fieldLabel: '表单',
      message: '表单标题不能为空',
      severity: 'error',
    });
  }

  // 校验字段列表
  if (schema.fields.length === 0) {
    errors.push({
      fieldId: '__form__',
      fieldLabel: '表单',
      message: '表单至少需要一个字段',
      severity: 'warning',
    });
  }

  // 校验每个字段
  for (const field of schema.fields) {
    validateField(field, fieldNames, allFieldNames, errors);
  }

  return errors;
}

/**
 * 收集所有字段名（包括 list 子字段）
 */
function collectAllFieldNames(fields: FormField[]): Set<string> {
  const names = new Set<string>();
  for (const field of fields) {
    if (field.name) names.add(field.name);
    if (field.children) {
      for (const child of field.children) {
        if (child.name) names.add(child.name);
      }
    }
  }
  return names;
}

/**
 * 校验单个字段
 */
function validateField(
  field: FormField,
  fieldNames: Set<string>,
  allFieldNames: Set<string>,
  errors: ValidationError[]
): void {
  const fieldLabel = field.label || field.name || field.id;

  // label 必填
  if (!field.label || field.label.trim() === '') {
    errors.push({
      fieldId: field.id,
      fieldLabel,
      message: `字段「${fieldLabel}」的标签名称不能为空`,
      severity: 'error',
    });
  }

  // name 必填
  if (!field.name || field.name.trim() === '') {
    errors.push({
      fieldId: field.id,
      fieldLabel,
      message: `字段「${fieldLabel}」的字段名(name)不能为空`,
      severity: 'error',
    });
  }

  // name 唯一性
  if (field.name) {
    if (fieldNames.has(field.name)) {
      errors.push({
        fieldId: field.id,
        fieldLabel,
        message: `字段名「${field.name}」重复，请修改`,
        severity: 'error',
      });
    }
    fieldNames.add(field.name);
  }

  // 选项类组件必须有 options 或 dataSource
  if (OPTION_TYPES.includes(field.type)) {
    const hasOptions = field.options && field.options.length > 0;
    const hasDataSource = field.dataSource && field.dataSource.type === 'api' && field.dataSource.url;
    if (!hasOptions && !hasDataSource) {
      errors.push({
        fieldId: field.id,
        fieldLabel,
        message: `字段「${fieldLabel}」(${field.type})需要配置选项或数据源`,
        severity: 'warning',
      });
    }
  }

  // list 类型必须有 children
  if (field.type === 'list') {
    if (!field.children || field.children.length === 0) {
      errors.push({
        fieldId: field.id,
        fieldLabel,
        message: `列表字段「${fieldLabel}」至少需要一个子字段`,
        severity: 'error',
      });
    }
    // 校验子字段
    if (field.children) {
      const childNames = new Set<string>();
      for (const child of field.children) {
        validateField(child, childNames, allFieldNames, errors);
      }
    }
  }

  // 数据源 API 模式 url 必填
  if (field.dataSource?.type === 'api' && !field.dataSource?.url) {
    errors.push({
      fieldId: field.id,
      fieldLabel,
      message: `字段「${fieldLabel}」的数据源 API 地址不能为空`,
      severity: 'error',
    });
  }

  // 联动规则引用的 triggerField 必须存在
  if (field.linkages) {
    for (const linkage of field.linkages) {
      if (linkage.triggerField && !allFieldNames.has(linkage.triggerField)) {
        errors.push({
          fieldId: field.id,
          fieldLabel,
          message: `联动规则的触发字段「${linkage.triggerField}」不存在`,
          severity: 'error',
        });
      }
    }
  }
}
