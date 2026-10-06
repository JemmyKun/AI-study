/**
 * 通用「业务模块上下文」注册表。
 *
 * 每个业务页面（表单配置、资金结算……）挂载时调用 registerModule 登记自己，
 * 卸载时执行返回的清理函数。AI 助手通过 listModules / getModuleSummary
 * 感知当前可用的模块与其实时状态。
 */
export interface ModuleContext {
  /** 模块唯一标识，如 'form-builder'、'settlement' */
  id: string;
  /** 模块名称（给模型和用户看），如「资金结算」 */
  name: string;
  /** 一句话描述模块是干什么的、助手能对它做什么 */
  description?: string;
  /**
   * 返回模块当前状态的摘要（给模型看）。
   * 建议返回可 JSON 化的简洁对象，不要返回组件实例、函数等。
   */
  getSummary: () => Record<string, unknown> | string | null;
}

const modules = new Map<string, ModuleContext>();

/** 注册模块，返回注销函数（页面 useEffect cleanup 使用） */
export function registerModule(module: ModuleContext): () => void {
  modules.set(module.id, module);
  return () => {
    if (modules.get(module.id) === module) modules.delete(module.id);
  };
}

export function unregisterModule(id: string): void {
  modules.delete(id);
}

export function listModules(): ModuleContext[] {
  return Array.from(modules.values());
}

export function getModule(id: string): ModuleContext | undefined {
  return modules.get(id);
}
