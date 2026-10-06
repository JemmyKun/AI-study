import { SettleChannel, SettleOrder, SettleStatus } from '../../types/settle-pool';

const rand = (seed: number) => {
  // 简单可复现的伪随机
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

const settleTypes = ['F1-境外-支付', 'F2-境内-收款', 'F3-境外-退款'];
const tradeNatures = [
  '货款', '服务费', '市场推广费', '模具开发费', '保险赔付', '国际运费',
  '劳务费', '技术咨询费', '设备采购款', '样品费', '关税', '仓储费',
];
const currencies = [
  'HKD-港元', 'USD-美元', 'EUR-欧元', 'SGD-新加坡元', 'THB-泰铢',
  'GBP-英镑', 'JPY-日元', 'IDR-印度尼西亚卢比', 'KRW-韩元', 'AUD-澳元',
];
const localAccounts = [
  { no: 'B3T1012345678', name: 'GT国贸控股(香港)' },
  { no: 'B3T10880000001234', name: 'GT国贸控股(香港)' },
  { no: 'B3T10880000012324', name: 'GT国贸( shield子公司)' },
  { no: 'HU417116301111110...', name: 'HU-匈牙利副国' },
  { no: 'DE125001000001234...', name: 'GT国贸柏林分公司' },
  { no: 'GB72HBUK4012345612...', name: 'GT英国有限公司' },
  { no: '75101234567', name: '兴业' },
  { no: 'G874BUK40123456...', name: 'GT英国有限公司' },
];
const counterparties = [
  { no: 'DE67730040000561574...', name: 'Rhein Automotive Teile G...' },
  { no: 'DE0727040406451574...', name: 'Rhein Automotive Teile G...' },
  { no: '100938201573', name: 'Greenwich Components Inc.' },
  { no: '121311530', name: 'Orchard Materials Trading ...' },
  { no: '1117509042', name: 'Merlion Logistics Pte Ltd.' },
  { no: '932258440425', name: 'Moserbaer India Ltd.' },
  { no: '928409616664', name: 'PT Cahaya Komputer Utama...' },
  { no: '3107134011800', name: 'PT Sinar Elektronik' },
  { no: '6823670184679', name: 'Nordeste Embalagens S.A.' },
  { no: 'HU62116301111110...', name: 'Budapest Trade Kft.' },
];
const channels: SettleChannel[] = ['SWIFT', '银企直连'];
const statuses: SettleStatus[] = [
  SettleStatus.PendingSplit,
  SettleStatus.ToBeSettled,
  SettleStatus.PendingSplit,
  SettleStatus.ResidualPayFailed,
  SettleStatus.PendingSplit,
  SettleStatus.ToBeSettled,
];

const pad = (n: number, len: number) => String(n).padStart(len, '0');

export const MOCK_SETTLE_ORDERS: SettleOrder[] = Array.from({ length: 57 }, (_, i) => {
  const seed = i + 1;
  const r = (k: number) => rand(seed * 31 + k);
  const local = localAccounts[Math.floor(r(1) * localAccounts.length)];
  const counter = counterparties[Math.floor(r(2) * counterparties.length)];
  const day = 20 + Math.floor(r(3) * 10);
  const status = statuses[Math.floor(r(4) * statuses.length)];
  const amount =
    Math.round((r(5) * 8000000 + 800) * 100) / 100;

  return {
    id: `settle-${seed}`,
    settleNo: `3526092${pad(seed % 10, 1)}0000${pad(seed, 2)}`,
    settleType: settleTypes[Math.floor(r(6) * settleTypes.length)],
    tradeNature: tradeNatures[Math.floor(r(7) * tradeNatures.length)],
    amount,
    currency: currencies[Math.floor(r(8) * currencies.length)],
    status,
    localAccountNo: local.no,
    localAccountName: local.name,
    localName: local.name,
    counterAccountNo: counter.no,
    counterName: counter.name,
    channel: channels[Math.floor(r(9) * channels.length)],
    createdAt: `2026-09-${pad(day, 2)} 1${Math.floor(r(10) * 9)}:${pad(
      Math.floor(r(11) * 60),
      2,
    )}:00`,
  };
});

/** 按 id 查询单条（新增/编辑页回显用） */
export function getSettleOrderById(id: string): SettleOrder | null {
  return MOCK_SETTLE_ORDERS.find((o) => o.id === id) ?? null;
}

/** 新增或更新一条结算单 */
export function saveSettleOrder(values: Omit<SettleOrder, 'id'> & { id?: string }): SettleOrder {
  if (values.id) {
    const idx = MOCK_SETTLE_ORDERS.findIndex((o) => o.id === values.id);
    if (idx >= 0) {
      const updated: SettleOrder = { ...MOCK_SETTLE_ORDERS[idx], ...values } as SettleOrder;
      MOCK_SETTLE_ORDERS[idx] = updated;
      return updated;
    }
  }
  const created: SettleOrder = {
    ...values,
    id: `settle-${Date.now()}`,
  } as SettleOrder;
  MOCK_SETTLE_ORDERS.unshift(created);
  return created;
}

/** 生成一个新的结算单编号 */
export function generateSettleNo(): string {
  return `3526092${Math.floor(Math.random() * 10)}0000${String(
    MOCK_SETTLE_ORDERS.length + 1,
  ).padStart(2, '0')}`;
}

/** 当前时间 YYYY-MM-DD HH:mm:ss */
export function nowString(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}:${p(d.getSeconds())}`;
}

/** 模拟后端分页 + 筛选 */
export function querySettleOrders(params: {
  current: number;
  pageSize: number;
  filters: Record<string, string | undefined>;
  /** 页签状态：ALL 表示全部 */
  statusTab?: string;
}): { list: SettleOrder[]; total: number } {
  const { current, pageSize, filters, statusTab = 'ALL' } = params;
  const list = MOCK_SETTLE_ORDERS.filter((o) => {
    if (statusTab !== 'ALL' && o.status !== statusTab) return false;
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      const v = value.trim().toLowerCase();
      if (!v) return true;
      const target = String((o as unknown as Record<string, unknown>)[key] ?? '');
      return target.toLowerCase().includes(v);
    });
  });
  const total = list.length;
  const start = (current - 1) * pageSize;
  return { list: list.slice(start, start + pageSize), total };
}
