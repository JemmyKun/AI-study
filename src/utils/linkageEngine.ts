import { FormSchema, FieldLinkageState, LinkageContext } from '../types/form';
import { linkageRegistry } from '../registry/linkageRegistry';

/**
 * 评估所有字段的联动状态
 * @param schema 表单 schema
 * @param currentValues 当前表单所有字段值
 * @param changedField 刚变化的字段名
 * @param changedValue 刚变化的字段值
 * @param formInstance antd Form 实例
 * @returns 每个字段的联动状态 map: { [fieldName]: FieldLinkageState }
 */
export function evaluateLinkages(
  schema: FormSchema,
  currentValues: Record<string, any>,
  changedField: string,
  changedValue: any,
  formInstance: any
): Record<string, FieldLinkageState> {
  const result: Record<string, FieldLinkageState> = {};

  // 遍历所有字段，找到 triggerField === changedField 的联动规则
  for (const field of schema.fields) {
    if (!field.linkages) continue;
    for (const rule of field.linkages) {
      if (rule.triggerField !== changedField) continue;

      const mode = rule.mode || 'rule';

      if (mode === 'rule') {
        // 规则模式：检查 conditions 是否满足
        const conditionsMet = checkConditions(rule.conditions || [], changedValue);
        if (conditionsMet && rule.actions) {
          for (const action of rule.actions) {
            if (!result[action.targetField]) {
              result[action.targetField] = {};
            }
            applyAction(result[action.targetField], action, formInstance);
          }
        }
      } else if (mode === 'handler') {
        // 处理器模式：从注册表获取处理器并执行
        if (rule.handlerId) {
          const handler = linkageRegistry.get(rule.handlerId);
          if (handler) {
            const ctx: LinkageContext = {
              triggerField: changedField,
              triggerValue: changedValue,
              formValues: currentValues,
              form: formInstance,
            };
            const handlerResult = handler.handler(ctx);
            // 合并处理器结果
            for (const [targetField, state] of Object.entries(handlerResult)) {
              if (!result[targetField]) {
                result[targetField] = {};
              }
              Object.assign(result[targetField], state);
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * 检查条件是否满足
 */
function checkConditions(
  conditions: { operator: string; value: any }[],
  actualValue: any
): boolean {
  if (conditions.length === 0) return true;
  return conditions.every(condition => {
    switch (condition.operator) {
      case 'eq': return actualValue === condition.value;
      case 'neq': return actualValue !== condition.value;
      case 'gt': return actualValue > condition.value;
      case 'lt': return actualValue < condition.value;
      case 'contains': return Array.isArray(actualValue) ? actualValue.includes(condition.value) : String(actualValue).includes(String(condition.value));
      case 'notContains': return Array.isArray(actualValue) ? !actualValue.includes(condition.value) : !String(actualValue).includes(String(condition.value));
      default: return false;
    }
  });
}

/**
 * 应用联动动作
 */
function applyAction(
  state: FieldLinkageState,
  action: { type: string; value?: any },
  formInstance: any
): void {
  switch (action.type) {
    case 'visible': state.visible = true; break;
    case 'hidden': state.visible = false; break;
    case 'disabled': state.disabled = true; break;
    case 'enabled': state.disabled = false; break;
    case 'required': state.required = true; break;
    case 'setValue':
      state.value = action.value;
      break;
    case 'setOptions':
      state.options = action.value;
      break;
  }
}
