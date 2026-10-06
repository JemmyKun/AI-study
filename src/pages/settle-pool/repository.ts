import { SettleOrder } from '../../types/settle-pool';
import { createSeedOrders } from './mockData';

/**
 * 结算池数据访问层（Repository）。
 *
 * 页面与 AI 工具只依赖这里定义的接口，不直接接触具体数据源：
 * - `createMemoryRepository`：纯内存，刷新即丢，适合单测与临时演示
 * - `createLocalStorageRepository`：落盘到 localStorage，刷新不丢
 *
 * 将来接真实后端时，只需再实现一个发 HTTP 请求的 repository（方法签名不变），
 * 在 index.ts 换掉默认导出即可，页面和 AI 工具零改动。
 *
 * 约定：
 * - 写操作（save/remove/reset）一律异步，模拟网络延迟，调用方需处理竞态
 * - `snapshot()` 是同步的，供 AI 工具统计、页签计数这类「读当前已知数据」场景使用
 */

/** 分页 + 筛选查询参数 */
export interface SettleOrderQuery {
  current: number;
  pageSize: number;
  /** 字段 → 关键字，空值表示不参与筛选 */
  filters: Record<string, string | undefined>;
  /** 页签状态：ALL 表示全部 */
  statusTab?: string;
}

export interface SettleOrderPage {
  list: SettleOrder[];
  total: number;
}

/** 新增或更新一条结算单；带 id 视为更新 */
export type SettleOrderDraft = Omit<SettleOrder, 'id'> & { id?: string };

export interface SettleOrderRepository {
  /** 数据源标识，便于调试与日志 */
  readonly kind: 'memory' | 'localStorage';
  query(params: SettleOrderQuery): Promise<SettleOrderPage>;
  getById(id: string): Promise<SettleOrder | null>;
  save(draft: SettleOrderDraft): Promise<SettleOrder>;
  /** 批量删除，返回实际删除条数 */
  remove(ids: string[]): Promise<number>;
  /** 同步快照（副本），用于统计类只读场景 */
  snapshot(): SettleOrder[];
  /** 生成下一个结算单编号 */
  nextSettleNo(): string;
  /** 恢复为初始种子数据（演示数据被改坏时可一键还原） */
  reset(): Promise<void>;
}

/** 模拟网络延迟默认值（毫秒） */
export const DEFAULT_LATENCY_MS = 300;

/** localStorage 存储键 */
export const SETTLE_STORAGE_KEY = 'lcf_settle_orders';

const delay = (ms: number) =>
  ms > 0 ? new Promise<void>(resolve => setTimeout(resolve, ms)) : Promise.resolve();

/**
 * 纯函数：单条结算单是否命中筛选条件。
 * 抽出来是为了能直接单测，不必构造整个 repository。
 */
export function matchesFilters(
  order: SettleOrder,
  filters: Record<string, string | undefined>,
): boolean {
  return Object.entries(filters).every(([key, value]) => {
    if (!value) return true;
    const v = value.trim().toLowerCase();
    if (!v) return true;
    const target = String((order as unknown as Record<string, unknown>)[key] ?? '');
    return target.toLowerCase().includes(v);
  });
}

/** 纯函数：关键字是否命中结算单的常用检索字段（AI 检索与人工筛选共用一套规则） */
export function matchesKeyword(order: SettleOrder, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return true;
  return [order.settleNo, order.tradeNature, order.localName, order.counterName, order.currency]
    .join(' ')
    .toLowerCase()
    .includes(kw);
}

interface RepositoryConfig {
  kind: 'memory' | 'localStorage';
  seed: SettleOrder[];
  latencyMs: number;
  /** 数据源变更后的落盘钩子，memory 实现传 undefined */
  persist?: (rows: SettleOrder[]) => void;
}

function createRepository(config: RepositoryConfig): SettleOrderRepository {
  const { kind, seed, latencyMs, persist } = config;
  let rows: SettleOrder[] = [...seed];

  /** 每次写操作后同步落盘，保证刷新不丢 */
  const commit = () => {
    persist?.(rows);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  return {
    kind,

    async query({ current, pageSize, filters, statusTab = 'ALL' }) {
      await delay(latencyMs);
      const matched = rows.filter(o => {
        if (statusTab !== 'ALL' && o.status !== statusTab) return false;
        return matchesFilters(o, filters);
      });
      const start = Math.max(0, (current - 1) * pageSize);
      return { list: matched.slice(start, start + pageSize), total: matched.length };
    },

    async getById(id) {
      await delay(latencyMs);
      return rows.find(o => o.id === id) ?? null;
    },

    async save(draft) {
      await delay(latencyMs);
      if (draft.id) {
        const idx = rows.findIndex(o => o.id === draft.id);
        if (idx >= 0) {
          const updated: SettleOrder = { ...rows[idx], ...draft } as SettleOrder;
          rows[idx] = updated;
          commit();
          return updated;
        }
      }
      const created: SettleOrder = { ...draft, id: `settle-${Date.now()}` } as SettleOrder;
      rows.unshift(created);
      commit();
      return created;
    },

    async remove(ids) {
      await delay(latencyMs);
      const target = new Set(ids);
      const before = rows.length;
      rows = rows.filter(o => !target.has(o.id));
      commit();
      return before - rows.length;
    },

    snapshot() {
      return [...rows];
    },

    nextSettleNo() {
      return `3526092${Math.floor(Math.random() * 10)}0000${pad(rows.length + 1)}`;
    },

    async reset() {
      await delay(latencyMs);
      rows = [...seed];
      commit();
    },
  };
}

/** 纯内存实现：进程内可见，刷新即丢 */
export function createMemoryRepository(options?: {
  seed?: SettleOrder[];
  latencyMs?: number;
}): SettleOrderRepository {
  return createRepository({
    kind: 'memory',
    seed: options?.seed ?? createSeedOrders(),
    latencyMs: options?.latencyMs ?? DEFAULT_LATENCY_MS,
  });
}

/** 读取本地存档；解析失败或环境不支持时返回 null，不影响启动 */
function readStorage(key: string): SettleOrder[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SettleOrder[]) : null;
  } catch {
    console.warn('[settle-pool] 本地存档读取失败，回退到种子数据');
    return null;
  }
}

/** localStorage 实现：改动落盘，刷新不丢 */
export function createLocalStorageRepository(options?: {
  storageKey?: string;
  seed?: SettleOrder[];
  latencyMs?: number;
}): SettleOrderRepository {
  const storageKey = options?.storageKey ?? SETTLE_STORAGE_KEY;
  const seed = options?.seed ?? createSeedOrders();

  const persist = (rows: SettleOrder[]) => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(rows));
    } catch {
      console.warn('[settle-pool] 本地存档写入失败，本次改动仅存在于内存');
    }
  };

  return createRepository({
    kind: 'localStorage',
    seed: readStorage(storageKey) ?? seed,
    latencyMs: options?.latencyMs ?? DEFAULT_LATENCY_MS,
    persist,
  });
}

/**
 * 全站默认使用的数据源。
 * 想切回内存模式（例如演示时希望每次刷新都是干净的 57 条），
 * 把这里改成 createMemoryRepository() 即可，其余代码无需改动。
 */
export const settleOrderRepository: SettleOrderRepository = createLocalStorageRepository();
