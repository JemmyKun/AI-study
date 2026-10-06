import React from 'react';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useFrontendTool } from '@copilotkit/react-core/v2';
import { AI_NAVIGABLE_ROUTES, settlePoolEditPath } from '../../constants';
import { matchesKeyword, settleOrderRepository } from '../../pages/settle-pool/repository';
import { componentRegistry } from '../form';
import { getFormDesignerBridge } from './formDesignerBridge';
import { getModule, listModules } from './moduleRegistry';

/** 简化 schema，避免把组件实例等无关信息塞给模型 */
function summarizeSchema(schema: { title: string; fields: any[] }) {
  return {
    title: schema.title,
    fields: schema.fields.map(f => ({
      id: f.id,
      name: f.name,
      label: f.label,
      type: f.type,
      required: !!f.required,
    })),
  };
}

/**
 * AI 助手与前端页面的桥接层（通用）：
 * - 通用模块工具：listModules / getModuleSummary，任何业务页面注册后即自动可感知
 * - 表单模块工具：读取/操作表单设计器
 * 组件本身不渲染任何内容。
 */
const AppCopilotBridge: React.FC = () => {
  const navigate = useNavigate();

  // ==================== 通用：模块感知 ====================

  useFrontendTool({
    name: 'listModules',
    description: '列出当前已打开、可供助手查看和操作的业务模块（如低代码表单配置、资金结算）',
    parameters: z.object({}),
    handler: () => {
      const mods = listModules();
      if (mods.length === 0) return '当前没有已挂载的业务模块页面。';
      return JSON.stringify(
        mods.map(m => ({ id: m.id, name: m.name, description: m.description ?? '' })),
      );
    },
  });

  useFrontendTool({
    name: 'getModuleSummary',
    description: '获取某个业务模块的实时状态摘要，moduleId 来自 listModules 的返回值',
    parameters: z.object({
      moduleId: z.string().describe('模块 id，例如 form-builder、settlement'),
    }),
    handler: async ({ moduleId }) => {
      const mod = getModule(moduleId);
      if (!mod) return `未找到模块：${moduleId}，请先调用 listModules 获取可用模块。`;
      return JSON.stringify({ module: mod.name, summary: mod.getSummary() });
    },
  });

  useFrontendTool({
    name: 'navigateTo',
    description: '跳转到指定页面',
    parameters: z.object({
      path: z
        .enum(AI_NAVIGABLE_ROUTES)
        .describe(
          '目标路由：/ 首页，/builder 表单设计器，/renderer 表单渲染演示，/settle-pool 结算池，/settle-pool/new 新增结算单，/chat AI 助手',
        ),
    }),
    handler: async ({ path }) => {
      navigate(path);
      return `已跳转到：${path}`;
    },
  });

  // ==================== 结算池模块（settle-pool） ====================

  useFrontendTool({
    name: 'getSettlePoolStats',
    description: '统计结算池中各状态（待结算/已结算待分设/付残失败）的结算单数量与总金额',
    parameters: z.object({}),
    handler: () => {
      const all = settleOrderRepository.snapshot();
      const stats: Record<string, { count: number; amount: number }> = {};
      let amount = 0;
      all.forEach(o => {
        const s = stats[o.status] ?? { count: 0, amount: 0 };
        s.count += 1;
        s.amount += o.amount;
        stats[o.status] = s;
        amount += o.amount;
      });
      const total = all.length;
      return JSON.stringify({
        total,
        totalAmount: Number(amount.toFixed(2)),
        byStatus: Object.fromEntries(
          Object.entries(stats).map(([k, v]) => [k, { ...v, amount: Number(v.amount.toFixed(2)) }]),
        ),
      });
    },
  });

  useFrontendTool({
    name: 'searchSettleOrders',
    description:
      '按状态和关键字检索结算单，返回结算单编号、金额、币种、状态、对手方户名等摘要信息',
    parameters: z.object({
      status: z
        .enum(['ALL', '待结算', '已结算待分设', '付残失败'])
        .optional()
        .describe('结算状态，不传或 ALL 表示全部'),
      keyword: z
        .string()
        .optional()
        .describe('关键字，匹配结算单编号、交易性质、本方/对手方户名等字段'),
      limit: z.number().int().min(1).max(50).optional().describe('返回条数，默认 10'),
    }),
    handler: async ({ status = 'ALL', keyword, limit = 10 }) => {
      const matched = settleOrderRepository.snapshot().filter(o => {
        if (status !== 'ALL' && o.status !== status) return false;
        return matchesKeyword(o, keyword ?? '');
      });
      return JSON.stringify({
        total: matched.length,
        orders: matched.slice(0, limit).map(o => ({
          id: o.id,
          settleNo: o.settleNo,
          settleType: o.settleType,
          tradeNature: o.tradeNature,
          amount: o.amount,
          currency: o.currency,
          status: o.status,
          localName: o.localName,
          counterName: o.counterName,
          channel: o.channel,
          createdAt: o.createdAt,
        })),
      });
    },
  });

  useFrontendTool({
    name: 'openSettleOrderEdit',
    description: '打开某条结算单的编辑页（结算池页面内可查看列表后按 id 打开）',
    parameters: z.object({
      id: z.string().describe('结算单 id，来自 searchSettleOrders 返回值'),
    }),
    handler: async ({ id }) => {
      // 用同步快照：工具只做存在性校验，不必等 repository 的模拟延迟
      const order = settleOrderRepository.snapshot().find(o => o.id === id) ?? null;
      if (!order) return `未找到 id 为 ${id} 的结算单，请先调用 searchSettleOrders。`;
      navigate(settlePoolEditPath(id));
      return `已打开结算单 ${order.settleNo} 的编辑页。`;
    },
  });

  // ==================== 表单模块（form-builder） ====================

  useFrontendTool({
    name: 'listFieldTypes',
    description: '列出表单设计器支持的所有字段组件类型，添加字段前请先调用它确认合法的 type',
    parameters: z.object({}),
    handler: () => {
      const types = componentRegistry
        .getAll()
        .map(c => ({ type: c.type, label: c.label, category: c.category }));
      return JSON.stringify(types);
    },
  });

  useFrontendTool({
    name: 'getFormSchema',
    description: '读取表单设计器中当前的表单结构（标题与字段列表）',
    parameters: z.object({}),
    handler: () => {
      const bridge = getFormDesignerBridge();
      if (!bridge) return '当前不在表单设计器页面，无法读取表单结构。';
      const schema = bridge.getSchema();
      if (!schema) return '表单设计器尚未初始化。';
      return JSON.stringify(summarizeSchema(schema));
    },
  });

  useFrontendTool({
    name: 'addFormField',
    description: '在表单设计器中添加一个字段，type 必须来自 listFieldTypes 的返回值',
    parameters: z.object({
      type: z.string().describe('字段组件类型，例如 input、select'),
    }),
    handler: async ({ type }) => {
      const bridge = getFormDesignerBridge();
      if (!bridge) return '当前不在表单设计器页面，无法添加字段。';
      if (!componentRegistry.get(type)) {
        return `不支持的字段类型：${type}，请先调用 listFieldTypes 获取合法类型。`;
      }
      bridge.addField(type);
      const latest = bridge.getSchema();
      return `已添加字段：${type}；当前表单共 ${latest?.fields.length ?? 0} 个字段`;
    },
  });

  useFrontendTool({
    name: 'removeFormField',
    description: '按字段 name 删除表单设计器中的字段',
    parameters: z.object({
      name: z.string().describe('要删除字段的 name'),
    }),
    handler: async ({ name }) => {
      const bridge = getFormDesignerBridge();
      if (!bridge) return '当前不在表单设计器页面，无法删除字段。';
      const schema = bridge.getSchema();
      const target = schema?.fields.find(f => f.name === name);
      if (!target) return `未找到 name 为 ${name} 的字段。`;
      bridge.removeField(target.id);
      return `已删除字段：${name}`;
    },
  });

  useFrontendTool({
    name: 'updateFormTitle',
    description: '修改当前表单的标题',
    parameters: z.object({
      title: z.string().describe('新的表单标题'),
    }),
    handler: async ({ title }) => {
      const bridge = getFormDesignerBridge();
      if (!bridge) return '当前不在表单设计器页面，无法修改标题。';
      bridge.updateTitle(title);
      return `表单标题已更新为：${title}`;
    },
  });

  return null;
};

export default AppCopilotBridge;
