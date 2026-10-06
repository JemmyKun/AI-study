/** 表单引擎对外能力：注册表、联动、校验 */
// 副作用导入：保证任何使用本模块的页面都已注册默认字段组件
import './registry/defaultComponents';

export { componentRegistry } from './registry/componentRegistry';
export { linkageRegistry } from './registry/linkageRegistry';
export * from './registry/types';
export * from './linkage-engine';
export * from './schema-validator';
