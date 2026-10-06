/**
 * 表单注册表。
 * 注意：defaultComponents 是副作用模块（导入即注册默认字段组件），
 * 不在桶文件里导出，由 features/form/index.ts 显式导入，避免"引用即注册"的隐式行为。
 */
export * from './types';
export { componentRegistry } from './componentRegistry';
export { linkageRegistry } from './linkageRegistry';
